import { m4On } from './config/formulas';
import type { Balance } from './config/balance';
import { GameState, initialState } from './sim/state';
import { coopCap } from './sim/tracks';
import { advance } from './sim/tick';
import { apply, Action, isUpgrade } from './sim/actions';
import { applyOffline } from './sim/offline';
import { accountHiddenPeriod, type HiddenSettlement } from './save/hidden-time';
import { m5Load, m5Offline, m5ShortGap } from './save/m5-fields';
import type { SimEvent } from './sim/events';
import { focusFrameMs } from './sim/clock';
import { anyM5FlagOn } from './sim/timers';
import { save, serialize, flagOffShape, m4SaveSeq, markM4BuildOff, loadSafe, validSavedAt, newerStoredVersion, NewerSaveError, KV, type Recovery, V6_BACKUP_KEY, encodeBackup, decodeBackup, newMigrationId, TRACKS_MARKER_PATH, isCommittedBackup, probeHeadroom, rankCompare, commitWrite, MIGRATION_ATTEMPTS_KEY, SAVE_KEY, BAK_KEY, HEADROOM_PROBE_KEY, headroomNeed, saveSeqOf } from './save/save';
import type { IdbBoot } from './save/idb-mirror';
import { TELEMETRY_KEY } from './telemetry/telemetry';
import { migrateStoredTracksV7 } from './sim/migrate-v7';
import { Telemetry, installId } from './telemetry/telemetry';
export type GameEvent = SimEvent | { type: 'coop_full'; phase: 'start' | 'end' } | { type: 'offline_grant'; eggs: number; awayS: number };
/** Glue between sim, storage and telemetry; UI only talks to this. */
/** The same balance with the M4 flag off: a pending or aborted track migration runs the session as plain v6 (M4-14). */
export const tracksOff = (b: Balance): Balance => (b.m4 ? markM4BuildOff({ ...b, m4: { ...b.m4, enabled: 0 } }) : b);
export interface GameOpts {
  /** M4-20: outcome of boot's IndexedDB open + read ('unknown' defers the migration; default 'absent' = no IndexedDB). */
  idbBoot?: IdbBoot; idbAbsentReason?: string;
  /** M41-7 CSR-AC-IDB1 (IDB1-3/5): result of main.ts's bootPreserveIdb before this Game ('failed' => main.ts passes no mirror). */
  idbCopy?: 'none' | 'copied' | 'failed';
  /** N7: migrationId source (save/newMigrationId), injectable for goldens. */
  newId?: () => string;
}
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
  constructor(private b: Balance, private kv: KV, private now = () => Date.now(), seed?: number, public build = 'dev', mirror: Game['mirror'] = null, idbRaw: unknown = null, private opts: GameOpts = {}) {
    this.mirror = mirror;
    this.telemetry = new Telemetry(kv, b.telemetry, now);
    this.installId = installId(kv);
    this.telemetry.track('session_start', { install_id: this.installId, build });
    // M41-7 (spec v0.3.3, OQ-7): loadSafe is the single owner of the order. With opts.idbBoot (main.ts) the IndexedDB value is a
    // tier (CSR-2/3/13, CSR-AC-IDB1) and the stale-LS reconcile runs inside it; without it (tests, refused-newer) the legacy
    // raw is only used for the newer-build check.
    const idbIn = opts.idbBoot ? { status: opts.idbBoot, raw: idbRaw, reason: opts.idbAbsentReason } : (typeof idbRaw === 'string' ? idbRaw : null);
    const r = loadSafe(kv, b, now(), idbIn, opts.idbCopy === 'failed'); const f = r.file;
    if (f && !validSavedAt(f.savedAt, now())) f.savedAt = NaN; // QA BUG-1: <= 0 / pre-2020 savedAt -> 0 offline, re-stamped below
    this.recovery = r.recovery; this.recoveryOutcome = r.outcome; this.isNewGame = !f;
    // M4-safety: a save from a newer build is refused untouched; this Game never writes (no new game autosaves over it).
    if (r.newer !== undefined) { this.newerSave = r.newer; this.readOnly = true; this.isNewGame = false; this.mirror = null; this.telemetry.track('save_newer_version', { version: r.newer, build }); }
    else if (r.recovery?.case === 'D') { this.readOnly = true; this.isNewGame = false; this.mirror = null; } // CSR-13 defer: no save write of any kind
    else if (this.mirror) this.mirror.onNewer = v => this.refuseNewer(v);
    if (r.mirrorOff) this.mirror = null; // CSR-13: .bak restored while IndexedDB unknown: the session never writes the mirror
    if (r.staleRestore) this.telemetry.track('save_restore', { source: 'idb' }); // G7 / D-HOP-35 / IDB1-7: name unchanged (main.ts:109 before M41-7)
    // m4-design §3c (ADR M4-14..17): an unmarked v6 farm with M4 on boots as plain v6 under flag-off rules. The
    // backup + in-session commit run later in startTracksMigration(); nothing about backups is touched on load (N2).
    // Accepted risk (review m3): a farm that loses its marker is migrated again with a fresh backup (overwrites).
    if (f?.tracksMigrated && f.v6State && f.preTracksRaw && r.newer === undefined) {
      this.tracksPending = { raw: f.preTracksRaw, on: b, v6Keys: f.v6Keys ?? Object.keys(f.v6State) };
      f.state = f.v6State; b = this.b = tracksOff(b);
      // M4-24 / M4-20: IndexedDB gets no writes until the commit is confirmed (deferral sessions never write it).
      this.pausedMirror = this.mirror; this.mirror = null;
    }
    if (r.recovery) {
      const { reason, had_backup, restored_from_backup, copy_failed, source, store, tried, restored_version, migrated } = r.recovery;
      // CSR-10 + IDB1-6: recovered_from, required store, tried; restored_version / migrated on restores only.
      this.telemetry.track('save_corrupt', { reason, had_backup, restored_from_backup, build, ...(copy_failed ? { copy_failed: true } : {}),
        recovered_from: source ?? (restored_from_backup ? 'bak' : 'none'), store: store ?? 'ls', tried: tried ?? [],
        ...(restored_version !== undefined ? { restored_version } : {}), migrated: !!migrated });
      this.telemetry.flush(true);
      if (!restored_from_backup) this.bakAllowed = false;
    }
    this.state = f ? f.state : initialState(b, seed ?? ((now() & 0xffffffff) >>> 0));
    // M4-22: a fresh farm on an M4 build (incl. corrupt-v7 recovery) is committed at creation: marker + a new
    // migrationId, no backup, never touches an existing v6_backup.
    if (!f && m4On(b)) this.state = { ...this.state, tracksV7: 1, v6BackupId: (opts.newId ?? newMigrationId)() };
    this.loaded = f ? { coinsCents: f.state.coinsCents, farmLevel: f.state.farmLevel, collectionLevel: f.state.collectionLevel, savedAt: Number.isFinite(f.savedAt) ? f.savedAt : now() } : null;
    if (f) { const ev: SimEvent[] = []; this.state = m5Load(this.state, b, now(), ev); this.emit(ev); } // v5 F2: a reload is a >= 60 s gap (AB-1)
    if (f) {
      // A pending grant left by the previous load (tab closed with the modal open) counts as granted: settle it first,
      // so each load produces at most one new grant.
      if (this.state.pendingOfflineEggs > 0) this.state = { ...this.state, basket: this.state.basket + this.state.pendingOfflineEggs, pendingOfflineEggs: 0 }; // settle only; no MK-22 arrival (no modal closed)
      // BUG-6: no / invalid savedAt -> 0 offline; the save() below stamps now, so a reload never pays out again.
      if (Number.isFinite(f.savedAt)) this.grantOffline(now() - f.savedAt); else this.telemetry.track('save_savedat_invalid', {}); // one absence = last save -> this load, if >= 60 s
    }
    this.lastFrameAt = now();
    // N3 (doc v0.3.2): drop a headroom probe left by a crash mid-check (never on a refused newer save: nothing is touched).
    if (!this.readOnly) try { if (kv.getItem(HEADROOM_PROBE_KEY) !== null) kv.removeItem?.(HEADROOM_PROBE_KEY); } catch { /* best effort */ }
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
  deactivate() { if (this.inactive) return; this.inactive = true; this.endHiddenOnFreeze(); this.onInactive?.(); }
  /** CCR m1: a tab frozen (tab guard / newer save) while hidden ends its hidden period now (mode 'none'), so it can never stay open. */
  private endHiddenOnFreeze() { if (this.hidden) this.onShown(this.now()); }
  /** Hand-over hold (another tab asked us to flush): no sim, no saves until the claim arrives or the hold expires. */
  holdUntil = 0;
  private held() { return this.now() < this.holdUntil; }
  /** Saves m1: save() would persist right now (not read-only/resetting/inactive/held, lease owned). */
  /** M41-6: the same guards as save(), in the same order, side-effect free: newer-save check without refuseNewer() (a throw
   *  from blocked storage counts as "no newer", as in newerGuard), and visible only: while hidden save() persists the hide
   *  snapshot, so a change made to this.state now would not reach storage. */
  get canPersist() {
    if (this.resetting || this.readOnly || this.inactive || this.held() || this.newerSave !== null || this.hidden) return false;
    if (this.canWrite && !this.canWrite()) return false;
    let v: number | null = null; try { v = newerStoredVersion(this.kv); } catch { /* blocked: save() would still try */ }
    return v === null && this.mirror?.newer == null;
  }
  /** Save now, then hold for `ms` so the state the new tab loads is exactly ours. */
  flushForHandover(ms = 3000) { if (this.inactive) return; this.holdUntil = 0; this.save(); this.holdUntil = this.now() + ms; }
  /** Pending interim migration (unmarked v6, M4 on): the validated raw bytes loaded (M4-17), the flag-on balance, and the
   *  v6 state keys (only those are written while pending, so no track levels reach the v6 save). null once committed. */
  private tracksPending: { raw: string; on: Balance; v6Keys: string[] } | null = null;
  /** Set when this session's migration was aborted (M4-12/M4-16); the session stays flag-off v6 (M4-14). */
  tracksMigrationAborted: string | null = null;
  /** UI hook: the migration committed in-session; M4 rules/UI are live from now on. */
  onTracksCommitted: (() => void) | null = null;
  /** M4A-29/33: refund of this session's committed migration (cents); 0 unless a level was clamped. */
  migrationRefundCents = 0;
  /** The balance this session runs on right now (flag off until the migration commits); the UI reads it live. */
  get balance(): Balance { return this.b; }
  get tracksMigrationPending() { return this.tracksPending !== null; }
  /** D-HOP-2026-10-19-13: a committed migration (marker + a v6_backup whose migrationId is state.v6BackupId); fresh farms have no backup. */
  get tracksMigratedWithBackup() { let r: string | null = null; try { r = this.kv.getItem(V6_BACKUP_KEY); } catch { /* none */ } return this.state.tracksV7 === 1 && isCommittedBackup(r, this.state.v6BackupId); }
  private persisted(st: GameState = this.state): GameState {
    const p = this.tracksPending;
    if (!p) {
      return flagOffShape(st, this.b); // HoE flag-off rule (save.ts)
    }
    const o: any = {}; for (const k of p.v6Keys) if (k in st) o[k] = (st as any)[k]; return o;
  }
  private pausedMirror: Game['mirror'] = null;
  /** migrationId of this session's aborted attempt (N2 quota cleanup scope). */
  private abortedMigrationId: string | null = null;
  private mirrorResumeOnSave = false;
  /** The raw this Game last wrote to localStorage main (M4-20 change detection), or the boot bytes before any write. */
  private lastMainRaw: string | null = null;
  /** Head of QA (2): plain integer, capped at balance.save.migrationAttemptsCap; anything that isn't an integer is reset to 0. */
  private attempts(): number {
    try { const r = this.kv.getItem(MIGRATION_ATTEMPTS_KEY); if (r === null) return 0;
      if (!/^\d+$/.test(r)) { this.kv.setItem(MIGRATION_ATTEMPTS_KEY, '0'); return 0; }
      return Math.min(Number(r), this.tracksCap()); } catch { return 0; } }
  private tracksCap() { return (this.tracksPending?.on ?? this.b).save.migrationAttemptsCap; }
  /** Deferral (M4-16/M4-20/M4-24): stay v6 under flag-off rules, attempt counter +1, retry next load. */
  private deferTracks(store: 'ls' | 'idb', reason: string): 'deferred' {
    const n = Math.min(this.attempts() + 1, this.tracksCap()); try { this.kv.setItem(MIGRATION_ATTEMPTS_KEY, String(n)); } catch { /* counter is best effort */ }
    this.endTracks(store, reason, n); return 'deferred';
  }
  /** Abort (M4-12): the counter is reported unchanged; my own LS record (if written) is removed (M4-13 under §3d). */
  private abortTracks(store: 'ls' | 'idb', reason: string, myRecord?: string, idbUnknown = false): 'aborted' {
    if (myRecord) { this.abortedMigrationId = decodeBackup(myRecord)?.migrationId ?? null; try { if (this.kv.getItem(V6_BACKUP_KEY) === myRecord) this.kv.removeItem?.(V6_BACKUP_KEY); } catch { /* best effort */ } }
    this.endTracks(store, reason, this.attempts(), idbUnknown); return 'aborted';
  }
  private endTracks(store: 'ls' | 'idb', reason: string, n: number, idbUnknown = store === 'idb' && this.opts.idbBoot === 'unknown') {
    this.tracksPending = null; this.tracksMigrationAborted = reason; // M4-14: flag-off v6 for the rest of the session
    // N6 (doc v0.3.2): the mirror resumes after any abort/deferral except an IndexedDB-unknown deferral (boot read not definite).
    // HoE correction: it resumes on the NEXT normal save (save() below), not here.
    this.mirrorResumeOnSave = !idbUnknown;
    this.telemetry.track('save_migration_aborted', { store, reason, path: TRACKS_MARKER_PATH, attempt_count: n, ...(n >= this.tracksCap() ? { stuck_on_v6: true } : {}) });
    this.telemetry.flush(true);
  }
  private canCommit() { return !this.resetting && !this.readOnly && !this.inactive && !this.held() && !(this.canWrite && !this.canWrite()) && !this.newerGuard(); }
  /** m4-design §3c/§3d (ADR M4-14..24), interim marker path; called by boot after the lease claim (m1). localStorage only.
   *  0. boot IndexedDB read must be definite (M4-20): 'unknown' => defer (idb_timeout|idb_read_error|idb_blocked);
   *     'absent' (no_global|security) => save_backup_idb_unavailable, proceed on localStorage.
   *  1. LS main re-read: must still be what this session last wrote (or the boot bytes) => else defer ls_main_changed.
   *  2. Headroom (spec v1.10 + HoE): trial write of max(factor x (save+backup), save+backup+margin) to the probe key, removed at once => else defer quota_headroom.
   *  3. LS backup record {migrationId, raw} (overwrites an orphan, only here: N2); read back, id must match (readback_mismatch).
   *  4. IDB main re-read (read-only): outranks the boot copy (M4-19) or the read fails => abort idb_main_changed.
   *  5. Guards, then the dedicated commitWrite (M4-21; no Game.save, no IDB fallback) of the migrated LIVE state with
   *     tracksV7 + v6BackupId (N3) => else abort commit_write_failed (old main kept, v6/flag-off).
   *  6. Read-back: main byte-equal + backup id matches => only then the mirror resumes (M4-24 (3)), counter removed,
   *     m4Active, save_migrated {from:6,to:6,migration:'tracksV7_marker'}. */
  async startTracksMigration(): Promise<'none' | 'committed' | 'aborted' | 'deferred'> {
    const p = this.tracksPending; if (!p || !this.canCommit()) return 'none';
    const boot = this.opts.idbBoot ?? 'absent', idb = this.pausedMirror as (Game['mirror'] & { readStrict?(ms?: number): Promise<string | null | undefined> }) | null;
    if (boot === 'unknown') return this.deferTracks('idb', this.opts.idbAbsentReason ?? 'idb_read_error');
    if (boot === 'absent') this.telemetry.track('save_backup_idb_unavailable', { reason: this.opts.idbAbsentReason ?? 'no_global', path: TRACKS_MARKER_PATH });
    const lsMain = this.kv.getItem(SAVE_KEY);
    if (lsMain !== (this.lastMainRaw ?? p.raw)) return this.deferTracks('ls', 'ls_main_changed');
    const id = (this.opts.newId ?? newMigrationId)(), rec = encodeBackup({ migrationId: id, raw: p.raw });
    const live = { ...migrateStoredTracksV7(this.state, p.on).state, tracksV7: 1 as const, v6BackupId: id };
    const need = headroomNeed(serialize(live, this.now(), saveSeqOf(lsMain) + 1).length, rec.length, p.on.save); // spec v1.10 + HoE
    if (!probeHeadroom(this.kv, need)) return this.deferTracks('ls', 'quota_headroom');
    try { this.kv.setItem(V6_BACKUP_KEY, rec); } catch (e) { return this.abortTracks('ls', (e as Error)?.name === 'QuotaExceededError' ? 'quota' : 'error', rec); }
    const back = decodeBackup(this.kv.getItem(V6_BACKUP_KEY));
    if (!back || back.migrationId !== id || back.raw !== p.raw) return this.abortTracks('ls', 'readback_mismatch', rec);
    if (idb?.readStrict) {
      const now = await idb.readStrict();
      if (now === undefined) return this.abortTracks('idb', 'idb_main_changed', rec, true); // failed re-read = IDB unknown: mirror stays off (N6)
      if ((now !== null && rankCompare(now, p.raw) > 0 && now !== this.kv.getItem(SAVE_KEY))) return this.abortTracks('idb', 'idb_main_changed', rec);
    }
    if (this.tracksPending !== p || !this.canCommit() || this.kv.getItem(SAVE_KEY) !== lsMain) return this.abortTracks('ls', 'commit_write_failed', rec);
    const migrated = { ...migrateStoredTracksV7(this.state, p.on).state, tracksV7: 1 as const, v6BackupId: id };
    // Head of QA (1): read v6_backup back right before the marker/v7 write; its migrationId must be state.v6BackupId.
    let pre: string | undefined; try { pre = decodeBackup(this.kv.getItem(V6_BACKUP_KEY))?.migrationId; } catch { pre = undefined; }
    if (pre !== migrated.v6BackupId) return this.abortTracks('ls', 'readback_mismatch', rec);
    const raw = commitWrite(this.kv, migrated, this.now(), p.on);
    const confirmed = raw !== null && this.kv.getItem(SAVE_KEY) === raw && decodeBackup(this.kv.getItem(V6_BACKUP_KEY))?.migrationId === id;
    if (!confirmed) return this.abortTracks('ls', 'commit_write_failed', rec);
    this.migrationRefundCents = migrateStoredTracksV7(this.state, p.on).migrationRefundCents; // M4A-33 refund line (0 for current data)
    this.state = migrated; this.b = p.on; this.tracksPending = null; this.lastMainRaw = raw;
    try { this.kv.removeItem?.(MIGRATION_ATTEMPTS_KEY); } catch { /* best effort */ }
    this.mirror = this.pausedMirror; this.pausedMirror = null; this.mirror?.write(raw); // M4-24 (3): only after the read-back
    this.telemetry.track('save_migrated', { from: 6, to: 6, migration: TRACKS_MARKER_PATH, refund_cents: 0, farm_level: migrated.farmLevel, backup_stores: ['ls'] });
    this.telemetry.flush(true); this.onTracksCommitted?.();
    return 'committed';
  }
  /** M4-23: after an abort, a normal save that hits quota first removes the leftover (uncommitted) LS backup record, then
   *  retries once. A committed record is never removed. */
  private saveWithQuotaRetry(t: number, st: GameState = this.state): string {
    try { return save(this.kv, this.persisted(st), t, this.b, this.bakAllowed); }
    catch (e) {
      if (e instanceof NewerSaveError || (e as Error)?.name !== 'QuotaExceededError') throw e;
      // N2 (doc v0.3.2): remove ONLY the record of this session's aborted migrationId, never the one main's v6BackupId points to.
      const rec = this.kv.getItem(V6_BACKUP_KEY), id = rec === null ? undefined : decodeBackup(rec)?.migrationId;
      // N2 (HoE): never the only pre-M4 backup: only while main itself is still the unmigrated v6 (else fail visibly below).
      if (!id || id !== this.abortedMigrationId || this.state.tracksV7 === 1 || id === this.state.v6BackupId || isCommittedBackup(rec!, this.state.v6BackupId)) throw e;
      this.kv.removeItem?.(V6_BACKUP_KEY); return save(this.kv, this.persisted(st), t, this.b, this.bakAllowed);
    }
  }
  /** M41-6: opting out of the mirror fallback skips the IndexedDB write when the localStorage write throws (default: the mirror
   *  is the fallback when localStorage is full, SD design). For one-off writes whose failure the caller reverts (explainer flag). */
  save({ mirrorOnFail: mirrorFallback = true }: { mirrorOnFail?: boolean } = {}) {
    if (this.resetting || this.readOnly || this.inactive || this.held()) return;
    if (this.canWrite && !this.canWrite()) { this.telemetry.track('tab_guard_blocked_write'); this.deactivate(); return; }
    if (this.newerGuard()) return;
    // S2 (#25): while hidden, persist the state as of the hide, stamped at the hide (C-AC36); the provisional hidden sim is never saved.
    const t = this.hidden ? this.hidden.at : this.now(), base = this.hidden ? this.hidden.state : this.state;
    if (this.mirrorResumeOnSave) { this.mirrorResumeOnSave = false; this.mirror = this.pausedMirror; this.pausedMirror = null; } // N6
    try { const raw = this.saveWithQuotaRetry(t, base); this.lastMainRaw = raw; this.mirror?.write(raw); }
    catch (e) {
      if (e instanceof NewerSaveError) { this.refuseNewer(e.version); return; } /* localStorage failed: the IndexedDB copy still gets this save */
      if (this.mirror && mirrorFallback) try { let q: string | null = null; try { q = this.kv.getItem(SAVE_KEY); } catch { /* blocked */ } const st = this.persisted(base); this.mirror.write(serialize(st, t, m4SaveSeq(st, this.b, q))); } catch { /* mirror never throws */ } /* keep playing, retry next autosave; warn once */
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
    this.newerSave = v; this.readOnly = true; this.inactive = true; this.mirror = null; this.endHiddenOnFreeze();
    this.telemetry.track('save_newer_version', { version: v, build: this.build, live: true });
    this.onNewerSave?.(v);
  }
  endSession() {
    if (this.resetting || this.inactive || this.held()) return; this.telemetry.track('session_end'); this.save(); this.telemetry.flush(true); }
  dispatch(a: Action) {
    if (this.inactive || this.held()) return;
    const ev: SimEvent[] = []; this.state = apply(this.state, a, this.b, ev, this.attendedNow()); this.emit(ev); this.checkCoopFull(); // Q-F1c-1 (D-HOP-2026-10-29-06)
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
  /** Dev only. Goes through the same load-time backup gate as any save (review n2): the v6 backup is written (or the
   *  migration aborted) in the constructor, before any save, so a backdated write can never skip it. */
  debugBackdateSave(ms: number) { this.save(); if (this.readOnly) return; const raw = save(this.kv, this.persisted(), this.now() - ms); this.mirror?.write(raw); this.resetting = true; }
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
      this.state = m5ShortGap(this.state, this.b); // v5 F2
      this.emit(h.ev); this.checkCoopFull();
      // n2: capped when the 60 s budget limited credit (gap > budget); false while budget == offlineMin and gap < offlineMin.
      return { mode: 'online', simulatedMs: h.simMs, grantedMs: h.simMs, eggs: 0, coins: this.state.coinsCents - h.state.coinsCents, capped: gap > budgetMs };
    }
    this.state = h.state; this.accMs = 0;
    if (this.state.pendingOfflineEggs > 0) this.state = { ...this.state, basket: this.state.basket + this.state.pendingOfflineEggs, pendingOfflineEggs: 0 };
    { const ev: SimEvent[] = []; this.state = m5Offline(this.state, this.b, ev); this.emit(ev); } // v5 F2, before grantOffline (§9.5 #3)
    const eggs = this.grantOffline(gap);
    if (eggs > 0) this.notify({ type: 'offline_grant', eggs, awayS: this.offline.awayS });
    this.checkCoopFull(); this.save();
    const capS = this.b.offline.offlineCapSeconds;
    return { mode: 'offline-grant', simulatedMs: 0, grantedMs: Math.min(gap, capS * 1000), eggs, coins: 0, capped: gap > capS * 1000 };
  }
  /** v5 F1b: is the player attending (no menu/sheet/modal/explainer/onboarding/coach open)? Set by the UI (F6 dialogOpen()).
   *  Default false: no focus time accrues, so M5 timers stay frozen until the UI wires it. Visibility is handled by frame()
   *  itself (hidden frames never pass focus). Only read while an M5 flag is on (frame() skips it with every flag off). */
  private attendedProbe: () => boolean = () => false;
  setAttendedProbe(fn: () => boolean) { this.attendedProbe = fn; }
  /** The one attended read (frame focus + player-sale suspension, Q-F1c-1 D-HOP-2026-10-29-06): live game and the UI probe says attended. */
  /** CCR N-1 #79: with every M5 flag off the probe is never read (no per-frame / per-dispatch DOM query); attended = false
   *  then, which changes nothing: no timed effect is live, so suspension has nothing to suspend (goldens byte-identical). */
  private attendedNow() { return !this.readOnly && anyM5FlagOn(this.b) && this.attendedProbe(); }
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
      // v5 F1b: focus (attended) ms for this frame, min(gap, 1.0 s); 0 for a gap >= 60 s (§9.1a) or when not attended.
      const focusMs = focusFrameMs(gap, this.attendedNow(), this.b.offline.offlineMinSeconds);
      const ev: SimEvent[] = []; if (gap >= maxMs) this.state = m5Offline(this.state, this.b, ev); // v5 F2 §9.1a: M5 timed systems take the offline path
      const r = advance(this.state, Math.min(gap, maxMs), gap >= maxMs ? 0 : this.accMs, this.b, ev, { focusMs, nowMs: t });
      this.state = r.state; this.accMs = gap >= maxMs ? 0 : r.accMs; this.emit(ev);
    }
    this.checkCoopFull(); this.telemetry.poll();
  }
}
