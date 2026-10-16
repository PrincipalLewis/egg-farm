import { m4On } from './config/formulas';
import type { Balance } from './config/balance';
import { GameState, initialState } from './sim/state';
import { coopCap } from './sim/tracks';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import type { SimEvent } from './sim/events';
import { save, serialize, loadSafe, validSavedAt, newerStoredVersion, newerSaveVersion, NewerSaveError, KV, type Recovery, V6_BACKUP_KEY, encodeBackup, decodeBackup, newMigrationId, idbAbortReason, TRACKS_MARKER_PATH } from './save/save';
import { IdbMirror, type IdbFactory } from './save/idb-mirror';
import { migrateTracksV7 } from './sim/migrate-v7';
import { Telemetry, installId } from './telemetry/telemetry';
export type GameEvent = SimEvent | { type: 'coop_full'; phase: 'start' | 'end' } | { type: 'offline_grant'; eggs: number; awayS: number };
/** Glue between sim, storage and telemetry; UI only talks to this. */
/** The same balance with the M4 flag off: a pending or aborted track migration runs the session as plain v6 (M4-14). */
export const tracksOff = (b: Balance): Balance => (b.m4 ? { ...b, m4: { ...b.m4, enabled: 0 } } : b);
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
    // m4-design §3c (ADR M4-14..17): an unmarked v6 farm with M4 on boots as plain v6 under flag-off rules. The
    // backup + in-session commit run later in startTracksMigration(); nothing about backups is touched on load (N2).
    // Accepted risk (review m3): a farm that loses its marker is migrated again with a fresh backup (overwrites).
    if (f?.tracksMigrated && f.v6State && f.preTracksRaw && r.newer === undefined) {
      this.tracksPending = { raw: f.preTracksRaw, on: b, v6Keys: f.v6Keys ?? Object.keys(f.v6State) };
      f.state = f.v6State; b = this.b = tracksOff(b);
    }
    if (r.recovery) {
      const { reason, had_backup, restored_from_backup, copy_failed } = r.recovery;
      this.telemetry.track('save_corrupt', { reason, had_backup, restored_from_backup, build, ...(copy_failed ? { copy_failed: true } : {}) });
      this.telemetry.flush(true);
      if (!restored_from_backup) this.bakAllowed = false;
    }
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
  /** Pending interim migration (unmarked v6, M4 on): the validated raw bytes loaded (M4-17), the flag-on balance, and the
   *  v6 state keys (only those are written while pending, so no track levels reach the v6 save). null once committed. */
  private tracksPending: { raw: string; on: Balance; v6Keys: string[] } | null = null;
  /** Set when this session's migration was aborted (M4-12/M4-16); the session stays flag-off v6 (M4-14). */
  tracksMigrationAborted: string | null = null;
  /** UI hook: the migration committed in-session; M4 rules/UI are live from now on. */
  onTracksCommitted: (() => void) | null = null;
  /** The balance this session runs on right now (flag off until the migration commits); the UI reads it live. */
  get balance(): Balance { return this.b; }
  get tracksMigrationPending() { return this.tracksPending !== null; }
  private persisted(): GameState {
    const p = this.tracksPending; if (!p) return this.state;
    const o: any = {}; for (const k of p.v6Keys) if (k in this.state) o[k] = (this.state as any)[k]; return o;
  }
  private abortTracks(store: 'ls' | 'idb', reason: string): 'aborted' {
    this.tracksPending = null; this.tracksMigrationAborted = reason; // M4-14: flag-off for the rest of the session
    this.telemetry.track('save_migration_aborted', { store, reason, path: TRACKS_MARKER_PATH }); this.telemetry.flush(true);
    return 'aborted';
  }
  private canCommit() { return !this.resetting && !this.readOnly && !this.inactive && !(this.canWrite && !this.canWrite()) && !this.newerGuard(); }
  /** m4-design §3c interim path (F-0), called by boot after the lease claim (m1). Order:
   *  1. IndexedDB: own open (mirror timeout); 'absent' (no indexedDB / private-mode or security error) => localStorage
   *     only; timeout / other error / failed read of main => abort, no write anywhere (ruling N1). A newer save in IDB =>
   *     refuse as usual.
   *  2. localStorage record {migrationId, raw}: overwrites a leftover (only here, N2); read back, migrationId must match
   *     (readback_mismatch). 3. IndexedDB put + read-back; failure => abort, our own records removed (M4-13).
   *  4. Commit at once: migrate the LIVE v6 state, tracksV7 + v6BackupId (N3), save, flag-on rules from now.
   *  `newId` is injectable for goldens (N7; default from save/). */
  async startTracksMigration(idbFactory: IdbFactory | undefined, newId: () => string = newMigrationId): Promise<'none' | 'committed' | 'aborted'> {
    const p = this.tracksPending; if (!p || !this.canCommit()) return 'none';
    const o = await IdbMirror.openForBackup(idbFactory);
    if (o.open === 'timeout' || o.open === 'error') return this.abortTracks('idb', idbAbortReason(o.open));
    if (o.mirror) {
      const main = await o.mirror.readMainForBackup();
      if (main === undefined) return this.abortTracks('idb', idbAbortReason('read_error'));
      const nv = newerSaveVersion(main); if (nv !== null) { this.tracksPending = null; this.refuseNewer(nv); return 'none'; }
    }
    if (this.tracksPending !== p || !this.canCommit()) return 'none';
    const id = newId(), rec = encodeBackup({ migrationId: id, raw: p.raw });
    try { this.kv.setItem(V6_BACKUP_KEY, rec); } catch (e) { return this.abortTracks('ls', (e as Error)?.name || 'write_failed'); }
    const back = decodeBackup(this.kv.getItem(V6_BACKUP_KEY));
    if (!back || back.migrationId !== id || back.raw !== p.raw) return this.abortTracks('ls', 'readback_mismatch');
    if (o.mirror && !(await o.mirror.putV6Backup(rec))) {
      try { if (this.kv.getItem(V6_BACKUP_KEY) === rec) this.kv.removeItem?.(V6_BACKUP_KEY); } catch { /* best effort */ }
      void o.mirror.deleteV6Backup(); return this.abortTracks('idb', 'write_failed');
    }
    if (this.tracksPending !== p || !this.canCommit()) return 'none'; // record stays a leftover; the next migration overwrites it
    const m = migrateTracksV7(this.state, p.on);
    this.state = { ...m.state, tracksV7: 1, v6BackupId: id }; this.b = p.on; this.tracksPending = null;
    this.save();
    this.telemetry.track('save_migrated', { from: 6, to: 6, migration: TRACKS_MARKER_PATH, refund_cents: 0, farm_level: this.state.farmLevel, idb: o.mirror ? 'ok' : 'absent' });
    this.telemetry.flush(true); this.onTracksCommitted?.();
    return 'committed';
  }
  save() {
    if (this.resetting || this.readOnly || this.inactive || this.held()) return;
    if (this.canWrite && !this.canWrite()) { this.telemetry.track('tab_guard_blocked_write'); this.deactivate(); return; }
    if (this.newerGuard()) return;
    const t = this.now();
    try { const raw = save(this.kv, this.persisted(), t, this.b, this.bakAllowed); this.mirror?.write(raw); }
    catch (e) {
      if (e instanceof NewerSaveError) { this.refuseNewer(e.version); return; } /* localStorage failed: the IndexedDB copy still gets this save */
      if (this.mirror) try { this.mirror.write(serialize(this.persisted(), t)); } catch { /* mirror never throws */ } /* keep playing, retry next autosave; warn once */
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
  /** Dev only. Goes through the same load-time backup gate as any save (review n2): the v6 backup is written (or the
   *  migration aborted) in the constructor, before any save, so a backdated write can never skip it. */
  debugBackdateSave(ms: number) { this.save(); if (this.readOnly) return; const raw = save(this.kv, this.persisted(), this.now() - ms); this.mirror?.write(raw); this.resetting = true; }
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
