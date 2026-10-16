import { m4On } from './config/formulas';
import type { Balance } from './config/balance';
import { GameState, initialState } from './sim/state';
import { coopCap } from './sim/tracks';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import type { SimEvent } from './sim/events';
import { save, serialize, loadSafe, writeV6Backup, validSavedAt, newerStoredVersion, NewerSaveError, KV, type Recovery } from './save/save';
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
    // Interim track migration (ADR M4-8/M4-10/M4-11, m4-design §3 9.1): the raw pre-migration bytes go to v6_backup
    // exactly once, before the first save writes the migrated state over main (localStorage first; IDB best effort).
    // If the localStorage write fails: keep playing on the migrated in-memory state, never commit it to main, and retry
    // the backup at every save point; the first success commits. (Can't-save dialog/toast for this case: S-3.)
    if (f?.preTracksRaw !== undefined && r.newer === undefined) { this.pendingV6Backup = f.preTracksRaw; this.tryV6Backup(); }
    this.state = f ? f.state : initialState(b, seed ?? ((now() & 0xffffffff) >>> 0));
    if (!f && m4On(b)) this.state = { ...this.state, tracksV7: 1 }; // new M4 farm: tracks start at 0, never re-migrated
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
    const full = this.state.coop >= coopCap(this.state, this.b);
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
  /** Raw v6 bytes still to back up before the migrated state may be committed (null = nothing pending). */
  private pendingV6Backup: string | null = null;
  private v6BackupFailReported = false;
  private tryV6Backup(): boolean {
    const raw = this.pendingV6Backup; if (raw === null) return true;
    if (writeV6Backup(this.kv, raw) === 'failed') {
      if (!this.v6BackupFailReported) { this.v6BackupFailReported = true; this.telemetry.track('save_migration_aborted', { reason: 'backup_failed' }); }
      return false;
    }
    this.pendingV6Backup = null; void (this.mirror as { writeV6Backup?(r: string): Promise<boolean> } | null)?.writeV6Backup?.(raw);
    return true;
  }
  save() {
    if (this.resetting || this.readOnly || this.inactive || this.held()) return;
    if (!this.tryV6Backup()) return; // never commit the migrated farm over main while its v6 backup is missing
    if (this.canWrite && !this.canWrite()) { this.telemetry.track('tab_guard_blocked_write'); this.deactivate(); return; }
    if (this.newerGuard()) return;
    const t = this.now();
    try { const raw = save(this.kv, this.state, t, this.b, this.bakAllowed); this.mirror?.write(raw); }
    catch (e) {
      if (e instanceof NewerSaveError) { this.refuseNewer(e.version); return; } /* localStorage failed: the IndexedDB copy still gets this save */
      if (this.mirror) try { this.mirror.write(serialize(this.state, t)); } catch { /* mirror never throws */ } /* keep playing, retry next autosave; warn once */
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
   *    then freeze for the rest. No in-session offline grant.
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
  frame() {
    if (this.inactive || this.held()) { this.lastFrameAt = this.now(); return; }
    const t = this.now(), gap = t - this.lastFrameAt; this.lastFrameAt = t;
    const maxMs = this.b.offline.offlineMinSeconds * 1000;
    if (gap > 0) {
      if (!this.bakAllowed) { this.playedMs += Math.min(gap, maxMs); if (this.playedMs >= 60_000) this.allowBackup(); }
      const ev: SimEvent[] = []; const r = advance(this.state, Math.min(gap, maxMs), gap >= maxMs ? 0 : this.accMs, this.b, ev);
      this.state = r.state; this.accMs = gap >= maxMs ? 0 : r.accMs; this.emit(ev);
    }
    this.checkCoopFull(); this.telemetry.poll();
  }
}
