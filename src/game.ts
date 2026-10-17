import type { Balance } from './config/balance';
import { GameState, initialState, coopCapacity } from './sim/state';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import { accountHiddenPeriod, type HiddenSettlement } from './save/hidden-time';
import type { SimEvent } from './sim/events';
import { save, serialize, loadSafe, validSavedAt, newerStoredVersion, NewerSaveError, KV, type Recovery } from './save/save';
import { Telemetry, installId } from './telemetry/telemetry';
export type GameEvent = SimEvent | { type: 'coop_full'; phase: 'start' | 'end' } | { type: 'offline_grant'; eggs: number; awayS: number };
/** Glue between sim, storage and telemetry; UI only talks to this. */
export class Game {
  state: GameState; accMs = 0; lastFrameAt: number; offline = { eggs: 0, awayS: 0 };
  /** Set during "Reset save" so pagehide doesn't write the old state back. */
  resetting = false;
  /** True when no save existed at load (drives onboarding). */
  isNewGame = false;
  /** What this load read from the save (QA: TG-2 'Play here shows exactly the other tab's money'). */
  loaded: { coinsCents: number; farmLevel: number; collectionLevel: number; savedAt: number } | null = null;
  /** rc0 AC14b: set when the stored save could not be opened (drives the recovery dialog). */
  recovery: Recovery | null = null;
  /** Single loader outcome for the AC14b dialog: 'restored' | 'fresh' | 'storage' | null. */
  recoveryOutcome: import('./save/save').RecoveryOutcome = null;
  /** QA case 2: after a fresh start, `.bak` rotation waits for a valid save + progress (1 purchase or 60 s played). */
  private bakAllowed = true; private playedMs = 0;
  installId = ''; telemetry: Telemetry; private coopFullSince: number | null = null;
  private listeners: ((e: GameEvent) => void)[] = [];
  /** Subscribe to sim/game events (UI feedback, sfx). Returns unsubscribe. */
  on(fn: (e: GameEvent) => void) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(f => f !== fn); }; }
  private notify(e: GameEvent) { for (const f of this.listeners) f(e); }
  /** D2: durable mirror of every save (IndexedDB, durability 'strict'); none in tests, second tabs or without IndexedDB. */
  mirror: { write(raw: string): unknown; clear(): Promise<void>; newer?: number | null; onNewer?: ((v: number) => void) | null } | null;
  constructor(private b: Balance, private kv: KV, private now = () => Date.now(), seed?: number, public build = 'dev', mirror: Game['mirror'] = null, idbRaw: string | null = null) {
    this.mirror = mirror;
    this.telemetry = new Telemetry(kv, b.telemetry, now);
    this.installId = installId(kv);
    this.telemetry.track('session_start', { install_id: this.installId, build });
    const r = loadSafe(kv, b, now(), idbRaw); const f = r.file;
    if (f && !validSavedAt(f.savedAt, now())) f.savedAt = NaN; // QA BUG-1: <= 0 / pre-2020 savedAt -> 0 offline, re-stamped below
    this.recovery = r.recovery; this.recoveryOutcome = r.outcome; this.isNewGame = !f;
    // M4-safety: a save from a newer build is refused untouched; this Game never writes (no new game autosaves over it).
    if (r.newer !== undefined) { this.newerSave = r.newer; this.readOnly = true; this.isNewGame = false; this.mirror = null; this.telemetry.track('save_newer_version', { version: r.newer, build }); }
    else if (this.mirror) this.mirror.onNewer = v => this.refuseNewer(v);
    if (r.recovery) {
      const { reason, had_backup, restored_from_backup, copy_failed } = r.recovery;
      this.telemetry.track('save_corrupt', { reason, had_backup, restored_from_backup, build, ...(copy_failed ? { copy_failed: true } : {}) });
      this.telemetry.flush(true);
      if (!restored_from_backup) this.bakAllowed = false;
    }
    this.state = f ? f.state : initialState(b, seed ?? ((now() & 0xffffffff) >>> 0));
    this.loaded = f ? { coinsCents: f.state.coinsCents, farmLevel: f.state.farmLevel, collectionLevel: f.state.collectionLevel, savedAt: Number.isFinite(f.savedAt) ? f.savedAt : now() } : null;
    if (f) {
      // A pending grant left by the previous load (tab closed with the modal open) counts as granted: settle it first,
      // so each load produces at most one new grant.
      if (this.state.pendingOfflineEggs > 0) this.state = { ...this.state, basket: this.state.basket + this.state.pendingOfflineEggs, pendingOfflineEggs: 0 }; // settle only; no MK-22 arrival (no modal closed)
      // BUG-6: no / invalid savedAt -> 0 offline; the save() below stamps now, so a reload never pays out again.
      if (Number.isFinite(f.savedAt)) this.grantOffline(now() - f.savedAt); else this.telemetry.track('save_savedat_invalid', {}); // one absence = last save -> this load, if >= 60 s
    }
    this.lastFrameAt = now();
    if (!this.readOnly) this.save(); // never on a refused newer save (M4A-31(f)6); persist pending offline eggs + new timestamp so the grant never repeats for one absence
  }
  private grantOffline(gapMs: number) {
    const r = applyOffline(this.state, gapMs, this.b); this.state = r.state;
    if (r.eggs > 0) { this.offline = { eggs: r.eggs, awayS: r.awayS }; this.telemetry.track('offline_grant', { secondsAway: r.awayS, eggs: r.eggs }); }
    return r.eggs;
  }
  private emit(evs: SimEvent[]) {
    for (const e of evs) {
      this.notify(e);
      if (e.type === 'collect') this.telemetry.tap(e.eggs);
      else if (e.type === 'wage') this.telemetry.sum(`wage_${e.worker}_cents`, e.cents);
      else if (e.type === 'worker_collect') this.telemetry.sum('coop_hand_eggs', e.eggs);
      else if (e.type === 'sell' && e.by === 'market_hand') { this.telemetry.sum('market_hand_eggs', e.k); this.telemetry.sum('market_hand_cents', e.value); }
      else { const { type, ...rest } = e; this.telemetry.track(type, rest); }
    }
  }
  private checkCoopFull() {
    const full = this.state.coop >= coopCapacity(this.state.farmLevel, this.b);
    if (full && this.coopFullSince === null) { this.coopFullSince = this.now(); this.telemetry.track('coop_full', { phase: 'start' }); this.notify({ type: 'coop_full', phase: 'start' }); }
    else if (!full && this.coopFullSince !== null) { this.telemetry.track('coop_full', { phase: 'end', durationMs: this.now() - this.coopFullSince }); this.coopFullSince = null; this.notify({ type: 'coop_full', phase: 'end' }); }
  }
  /** AC14c: set once when a save write throws (QuotaExceededError / Safari private mode); the UI warns once. */
  storageFailed = false; onStorageFail: (() => void) | null = null;
  /** AC14d: a second tab is read-only and never writes the save. */
  readOnly = false;
  /** Version of a refused newer-build save (M4-safety), else null. */
  newerSave: number | null = null;
  /** Single-tab guard: checked before EVERY save (purchase, autosave, pagehide, load-time). False -> write skipped. */
  canWrite: (() => boolean) | null = null;
  /** Single-tab guard: another tab owns the save; sim and saving stop until "Play here" reloads. */
  inactive = false;
  /** Called once when the guard first blocks a write. */
  onInactive: (() => void) | null = null;
  /** Stop sim + saving (another tab took the save). */
  deactivate() { if (this.inactive) return; this.inactive = true; this.onInactive?.(); }
  /** Hand-over hold (another tab asked us to flush): no sim, no saves until the claim arrives or the hold expires. */
  holdUntil = 0;
  private held() { return this.now() < this.holdUntil; }
  /** Save now, then hold for `ms` so the state the new tab loads is exactly ours. */
  flushForHandover(ms = 3000) { if (this.inactive) return; this.holdUntil = 0; this.save(); this.holdUntil = this.now() + ms; }
  save() {
    if (this.resetting || this.readOnly || this.inactive || this.held()) return;
    if (this.canWrite && !this.canWrite()) { this.telemetry.track('tab_guard_blocked_write'); this.deactivate(); return; }
    if (this.newerGuard()) return;
    // S2: while hidden, persist the state as of the hide, stamped at the hide, so a tab killed while hidden reloads exactly
    // like one closed at the hide (C-AC36); the provisional hidden sim is never saved.
    const t = this.hidden ? this.hidden.at : this.now(), st = this.hidden ? this.hidden.state : this.state;
    try { const raw = save(this.kv, st, t, this.b, this.bakAllowed); this.mirror?.write(raw); }
    catch (e) {
      if (e instanceof NewerSaveError) { this.refuseNewer(e.version); return; } /* localStorage failed: the IndexedDB copy still gets this save */
      if (this.mirror) try { this.mirror.write(serialize(st, t)); } catch { /* mirror never throws */ } /* keep playing, retry next autosave; warn once */
      if (!this.storageFailed) { this.storageFailed = true; this.telemetry.track('save_failed', { reason: (e as Error)?.name || 'error' }); this.onStorageFail?.(); } }
    this.telemetry.flush();
  }
  /** QA BUG-2: called when a newer-build save shows up while this tab is live (main, .bak or IndexedDB). */
  onNewerSave: ((version: number) => void) | null = null;
  /** BUG-2: re-check every copy right before a write. localStorage main + .bak synchronously; IndexedDB via the mirror's
   *  cached result (its last read, or the in-transaction check of every write, which never puts over a newer copy). */
  private newerGuard(): boolean {
    let v: number | null = null; try { v = newerStoredVersion(this.kv); } catch { /* storage blocked: write fails below */ }
    if (v === null && this.mirror?.newer != null) v = this.mirror.newer;
    if (v === null) return false;
    this.refuseNewer(v); return true;
  }
  /** Stop all writes for good (sim too), drop the mirror and hand control to main.ts (release lease, .newer-save layer). */
  private refuseNewer(v: number) {
    if (this.newerSave !== null && this.readOnly) return;
    this.newerSave = v; this.readOnly = true; this.inactive = true; this.mirror = null;
    this.telemetry.track('save_newer_version', { version: v, build: this.build, live: true });
    this.onNewerSave?.(v);
  }
  endSession() {
    if (this.resetting || this.inactive || this.held()) return; this.telemetry.track('session_end'); this.save(); this.telemetry.flush(true); }
  dispatch(a: Action) {
    if (this.inactive || this.held()) return;
    const ev: SimEvent[] = []; this.state = apply(this.state, a, this.b, ev); this.emit(ev); this.checkCoopFull();
    if (!this.bakAllowed && ev.some(e => e.type === 'upgrade' || e.type === 'worker_hire' || e.type === 'grader_tier')) this.allowBackup();
    if (isUpgrade(a) || a.type === 'collectOffline' || a.type === 'dismissOffline' || a.type === 'markCelebrated') this.save();
  }
  /**
   * Wall-clock driven (robust to rAF/timer throttling). Hidden/background tabs use the same rule on the next frame:
   *  - gap < offlineMinSeconds (60 s): simulate the whole gap online (coop cap applies, customers arrive/leave).
   *  - gap >= 60 s (hidden/throttled tab): simulate the FIRST 60 s online (coop cap applies, customers arrive/leave),
   *    then freeze for the rest (visible but throttled). A HIDDEN page (onHidden/onShown) instead gets a cumulative
   *    budget of offline.hiddenSimMaxSeconds, and a hide >= offlineMinSeconds is paid on return via the offline grant.
   *  - negative gap: nothing.
   *  Closed/unloaded game: last save -> next load >= 60 s goes through the offline grant (AC11), in the constructor.
   * See engineering/sim-rules.md.
   */
  /** Debug/QA: simulate `ms` of online play immediately (same tick path as frame()). */
  debugAdvance(ms: number) {
    const ev: SimEvent[] = []; const r = advance(this.state, ms, this.accMs, this.b, ev);
    this.state = r.state; this.accMs = r.accMs; this.emit(ev); this.checkCoopFull();
  }
  /** Debug/QA: write the save as if it was made `ms` ago, and stop further saves (caller reloads). */
  debugBackdateSave(ms: number) { this.save(); if (this.readOnly) return; const raw = save(this.kv, this.state, this.now() - ms); this.mirror?.write(raw); this.resetting = true; }
  /** Reset save: drop the IndexedDB copy too (resolves when committed, or after 1 s), then the caller reloads. */
  clearMirror(): Promise<void> { return this.mirror ? Promise.race([this.mirror.clear(), new Promise<void>(r => setTimeout(r, 1000))]) : Promise.resolve(); }
  /** Progress made after a fresh start: the next save (main is valid by then) may rotate into `.bak`. */
  private allowBackup() { this.bakAllowed = true; }
  get backupAllowed() { return this.bakAllowed; }
  /** S2 hidden tab: state + accMs at the hide, online ms simulated since, and the events of that provisional sim. */
  private hidden: { at: number; periodId: number; state: GameState; accMs: number; simMs: number; ev: SimEvent[] } | null = null;
  /** Monotonic counter for hidden periods (B1: never key idempotency by startAt ms). */
  private nextHiddenPeriodId = 1;
  get isHidden() { return this.hidden !== null; }
  /** Page hidden (platform/visibility). Frames keep coming at the throttled rate but simulate at most
   *  offline.hiddenSimMaxSeconds in TOTAL, then the sim freezes until onShown. */
  onHidden(at = this.now()) {
    if (this.hidden) return;
    this.frame(); // bring the sim up to the hide
    this.hidden = { at, periodId: this.nextHiddenPeriodId++, state: this.state, accMs: this.accMs, simMs: 0, ev: [] };
  }
  /** Page shown again after `span`. Hidden >= offlineMinSeconds: drop the provisional hidden sim and pay the whole
   *  absence through the normal offline grant, exactly as a close at the hide + reload now would (C-AC36): pending
   *  settled first, same applyOffline clamp/cap, same validSavedAt clock-tamper rule. Shorter (or clock went back):
   *  keep the <= 60 s of online sim (M1: also credit uncovered gap with no frames, up to the 60 s budget).
   *  Returns the eggs granted (caller shows the welcome popup). */
  onShown(at = this.now()): number {
    const h = this.hidden; if (!h) return 0;
    return accountHiddenPeriod(this, { startAt: h.at, endAt: at })?.eggsGranted ?? 0;
  }
  /** Start of the open hidden period, or null when visible. */
  get hiddenSince(): number | null { return this.hidden?.at ?? null; }
  /** Open hidden period token for save/hidden-time.ts (at + monotonic periodId). */
  get openHiddenPeriod(): { at: number; periodId: number } | null {
    return this.hidden ? { at: this.hidden.at, periodId: this.hidden.periodId } : null;
  }
  /** @internal Only save/hidden-time.ts calls this (via accountHiddenPeriod, which guarantees once per period). */
  settleHiddenPeriod(at: number): HiddenSettlement {
    const h = this.hidden; if (!h) return { mode: 'none', simulatedMs: 0, grantedMs: 0, eggs: 0, coins: 0, capped: false };
    this.hidden = null; this.lastFrameAt = at;
    const gap = at - h.at, budgetMs = this.b.offline.hiddenSimMaxSeconds * 1000;
    if (this.inactive || this.readOnly || !validSavedAt(h.at, at)) {
      this.emit(h.ev); this.checkCoopFull(); return { mode: 'none', simulatedMs: h.simMs, grantedMs: 0, eggs: 0, coins: this.state.coinsCents - h.state.coinsCents, capped: false };
    }
    if (gap < this.b.offline.offlineMinSeconds * 1000) {
      // M1: credit (show - hide) - already simulated, capped so total simMs <= budget (60 s).
      const uncover = Math.max(0, Math.min(gap, budgetMs) - h.simMs);
      if (uncover > 0) {
        h.simMs += uncover;
        const r = advance(this.state, uncover, this.accMs, this.b, h.ev);
        this.state = r.state; this.accMs = r.accMs;
        if (!this.bakAllowed) { this.playedMs += uncover; if (this.playedMs >= 60_000) this.allowBackup(); }
      }
      this.emit(h.ev); this.checkCoopFull();
      // n2: capped when the 60 s budget limited credit (gap > budget); false while budget == offlineMin and gap < offlineMin.
      return { mode: 'online', simulatedMs: h.simMs, grantedMs: h.simMs, eggs: 0, coins: this.state.coinsCents - h.state.coinsCents, capped: gap > budgetMs };
    }
    this.state = h.state; this.accMs = 0;
    if (this.state.pendingOfflineEggs > 0) this.state = { ...this.state, basket: this.state.basket + this.state.pendingOfflineEggs, pendingOfflineEggs: 0 };
    const eggs = this.grantOffline(gap);
    if (eggs > 0) this.notify({ type: 'offline_grant', eggs, awayS: this.offline.awayS });
    this.checkCoopFull(); this.save();
    const capS = this.b.offline.offlineCapSeconds;
    return { mode: 'offline-grant', simulatedMs: 0, grantedMs: Math.min(gap, capS * 1000), eggs, coins: 0, capped: gap > capS * 1000 };
  }
  frame() {
    if (this.inactive || this.held()) { this.lastFrameAt = this.now(); return; }
    const t = this.now(); let gap = t - this.lastFrameAt; this.lastFrameAt = t;
    const maxMs = this.b.offline.offlineMinSeconds * 1000;
    const h = this.hidden;
    if (h) { // S2: cumulative hidden budget, then freeze; events held until we know the sim is kept (onShown)
      const step = Math.max(0, Math.min(gap, maxMs, this.b.offline.hiddenSimMaxSeconds * 1000 - h.simMs));
      if (step > 0) {
        h.simMs += step; const r = advance(this.state, step, gap >= maxMs ? 0 : this.accMs, this.b, h.ev); this.state = r.state; this.accMs = gap >= maxMs ? 0 : r.accMs;
        // m2: kept hidden play counts toward the .bak 60 s enable, same as visible play.
        if (!this.bakAllowed) { this.playedMs += step; if (this.playedMs >= 60_000) this.allowBackup(); }
      }
      this.telemetry.poll(); return;
    }
    if (gap > 0) {
      if (!this.bakAllowed) { this.playedMs += Math.min(gap, maxMs); if (this.playedMs >= 60_000) this.allowBackup(); }
      const ev: SimEvent[] = []; const r = advance(this.state, Math.min(gap, maxMs), gap >= maxMs ? 0 : this.accMs, this.b, ev);
      this.state = r.state; this.accMs = gap >= maxMs ? 0 : r.accMs; this.emit(ev);
    }
    this.checkCoopFull(); this.telemetry.poll();
  }
}
