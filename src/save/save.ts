import type { Balance } from '../config/balance';
import { GameState, initialState, coopTier } from '../sim/state';
import { m4On } from '../config/formulas';
import { migrateStoredTracksV7 } from '../sim/migrate-v7';
export const SAVE_KEY = 'eggfarm.save';
export const SAVE_VERSION = 6;
export interface SaveFile { version: number; savedAt: number; state: GameState;
  /** Set by migrate() when the interim track migration applies to this save (M4 on, no tracksV7 marker). `state` is
   *  then the migrated preview; Game runs `v6State` under flag-off rules until the backup commits (m4-design §3c). */
  tracksMigrated?: true; v6State?: GameState; /** keys of the stored v6 state (what a pending session may write) */ v6Keys?: string[];
  /** Set by validate() with tracksMigrated: the validated raw bytes of the copy loaded (M4-17), i.e. the backup payload. */
  preTracksRaw?: string; }
/** ADR M4-11 name; m4-design §3c record `{"migrationId","raw"}` (M4-15). Committed when its id = live state.v6BackupId. */
export const V6_BACKUP_KEY = 'eggfarm.save.v6_backup';
export interface V6BackupRecord { migrationId: string; raw: string }
export const MIGRATION_ID_HEX = 16;
export function newMigrationId(rnd: (n: number) => Uint8Array = n => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(rnd(MIGRATION_ID_HEX / 2), x => x.toString(16).padStart(2, '0')).join('');
}
export const encodeBackup = (r: V6BackupRecord) => JSON.stringify({ migrationId: r.migrationId, raw: r.raw });
/** Parse a stored record; anything else (old raw-string format from 677317d, junk) is null = leftover. */
export function decodeBackup(text: unknown): V6BackupRecord | null {
  if (typeof text !== 'string') return null; let d: any; try { d = JSON.parse(text); } catch { return null; }
  return d && typeof d === 'object' && typeof d.migrationId === 'string' && d.migrationId.length === MIGRATION_ID_HEX && typeof d.raw === 'string' ? { migrationId: d.migrationId, raw: d.raw } : null;
}
/** quota_headroom (spec v1.10 + HoE): free localStorage >= max(lsHeadroomFactor x (save + backup), save + backup + lsHeadroomMarginBytes). */
export const headroomNeed = (saveBytes: number, backupBytes: number, s: { lsHeadroomFactor: number; lsHeadroomMarginBytes: number }) => Math.max(s.lsHeadroomFactor * (saveBytes + backupBytes), saveBytes + backupBytes + s.lsHeadroomMarginBytes);
export const HEADROOM_PROBE_KEY = 'eggfarm.save.headroom_probe';
/** M4-16 attempt counter: deferrals only; removed on commit; cleared by Reset. attempt_count >= STUCK_ATTEMPTS => stuck_on_v6. */
export const MIGRATION_ATTEMPTS_KEY = 'eggfarm.save.migration_attempts';
/** @deprecated use balance.save.migrationAttemptsCap (Head of QA: config constant). */
export const STUCK_ATTEMPTS = 3;
/** Probe `bytes` of free localStorage under the scratch key, removed at once. true = it fits. */
export function probeHeadroom(kv: KV, bytes: number): boolean {
  try { kv.setItem(HEADROOM_PROBE_KEY, 'x'.repeat(Math.max(0, Math.ceil(bytes)))); return true; } catch { return false; }
  finally { try { kv.removeItem?.(HEADROOM_PROBE_KEY); } catch { /* best effort */ } }
}
/** HoE correction: a main save's write sequence; missing / invalid reads as 0. */
export const saveSeqOf = (raw: unknown): number => { if (typeof raw !== 'string') return 0; try { const n = JSON.parse(raw)?.saveSeq; return Number.isSafeInteger(n) && n > 0 ? n : 0; } catch { return 0; } };
/** M4-19 rank of a stored copy: [version, committed (tracksV7 + v6BackupId) ? 1 : 0, saveSeq]; savedAt is the caller's tie-break. */
export function rankOf(raw: unknown): [number, number, number] {
  if (typeof raw !== 'string') return [-1, 0, 0]; let d: any; try { d = JSON.parse(raw); } catch { return [-1, 0, 0]; }
  const v = Number.isInteger(d?.version) ? d.version : -1, st = d?.state;
  return [v, st && st.tracksV7 === 1 && typeof st.v6BackupId === 'string' && st.v6BackupId !== '' ? 1 : 0, saveSeqOf(raw)];
}
/** M4-19 (HoE correction): > 0 when a outranks b by version, then committed migrationId, then saveSeq, then savedAt. */
export function rankCompare(a: unknown, b: unknown, now = Date.now()): number {
  const [va, ca, qa] = rankOf(a), [vb, cb, qb] = rankOf(b); if (va !== vb) return va - vb; if (ca !== cb) return ca - cb; if (qa !== qb) return qa - qb;
  const t = (x: unknown) => { try { return savedAtRank(JSON.parse(x as string).savedAt, now); } catch { return -Infinity; } };
  const ta = t(a), tb = t(b); return ta === tb ? 0 : ta > tb ? 1 : -1;
}
/** M4-18/M4-21: the write version for the session (m4Active). M4-A's interim marker path writes v6 either way. */
export const writeVersion = (_m4Active: boolean) => SAVE_VERSION;
/** M4-21 dedicated commit write (not Game.save): .bak rotation of the current valid main, then main; read back.
 *  localStorage only (M4-24), no IndexedDB fallback. Returns the committed raw, or null on any failure. */
export function commitWrite(kv: KV, state: GameState, now: number, b: Balance): string | null {
  try {
    if (newerStoredVersion(kv) !== null) return null;
    const cur = kv.getItem(SAVE_KEY); if (cur && validate(cur, b).ok) kv.setItem(BAK_KEY, cur);
    const raw = serialize(state, now, saveSeqOf(cur) + 1); kv.setItem(SAVE_KEY, raw); return kv.getItem(SAVE_KEY) === raw ? raw : null;
  } catch { return null; }
}
/** Telemetry `path` for the interim marker migration (vs. the S-4 v7 path later). */
export const TRACKS_MARKER_PATH = 'tracksV7_marker';
/** M4-15: a stored record is committed only when its id equals the live save's v6BackupId. */
export const isCommittedBackup = (text: unknown, liveId: string | undefined) => { const r = decodeBackup(text); return !!r && !!liveId && r.migrationId === liveId; };
/** M4-17 restore source: LS record, else IDB record; only a committed record whose raw passes validation (checksum, ranges). */
export function committedBackupRaw(lsText: unknown, idbText: unknown, liveId: string | undefined, b: Balance): string | null {
  for (const t of [lsText, idbText]) { const r = decodeBackup(t); if (r && liveId && r.migrationId === liveId && validate(r.raw, b).ok) return r.raw; }
  return null;
}
/** migrations[n] upgrades a version-n save to n+1 */
const migrations: Record<number, (d: any) => any> = {
  // v1 stored coins as float dollars; v2 stores integer cents.
  1: (d) => { const { coins = 0, ...rest } = d.state ?? {}; return { ...d, version: 2, state: { ...rest, coinsCents: Math.round(coins * 100) } }; },
  // v3 adds Customer.filled (partial service).
  2: (d) => ({ ...d, version: 3, state: { ...d.state, customers: (d.state?.customers ?? []).map((c: any) => ({ filled: 0, ...c })) } }),
  // v4 adds celebratedTier; existing saves count their current tier as celebrated (no replay).
  3: (d) => ({ ...d, version: 4, state: { ...d.state, celebratedTier: coopTier(d.state?.farmLevel ?? 0) } }),
  // v5 (M2): no workers hired, no Grader tier, Manage ready.
  4: (d) => ({ ...d, version: 5, state: { ...d.state, workers: {}, graderTier: 0, manageCdS: 0, coopFullS: 0 } }),
  // v6 (S2-8): exact wages carry the leftover fraction of a cent; older saves start with nothing owed.
  5: (d) => ({ ...d, version: 6, state: { ...d.state, wageFracCents: {} } }),
};
/** M4-safety: the save version when a stored save is from a NEWER build (version > SAVE_VERSION), else null.
 *  Such a save is never migrated, preserved, overwritten or cleared by this build (and neither is .bak / IndexedDB). */
export function newerSaveVersion(raw: string | null | undefined): number | null {
  if (!raw) return null; let d: any; try { d = JSON.parse(raw); } catch { return null; }
  return d && typeof d === 'object' && Number.isInteger(d.version) && d.version > SAVE_VERSION ? d.version : null; // (f)3: non-integer -> corrupt path
}
/** M4A-31(b) / B1: the highest newer-build version found in ANY stored copy (localStorage main, .bak, IndexedDB main), else null.
 *  Must run before anything writes; a non-null result means refuse and write nothing anywhere. */
export function newerStoredVersion(kv: Pick<KV, 'getItem'>, idbRaw: string | null = null): number | null {
  let v: number | null = null;
  for (const raw of [kv.getItem(SAVE_KEY), kv.getItem(BAK_KEY), idbRaw]) { const n = newerSaveVersion(raw); if (n !== null && (v === null || n > v)) v = n; }
  return v;
}
export function migrate(d: any, b: Balance): SaveFile {
  if (!d || typeof d.version !== 'number' || d.version > SAVE_VERSION) throw new Error('bad save');
  while (d.version < SAVE_VERSION) { const m = migrations[d.version]; if (!m) throw new Error(`no migration from v${d.version}`); d = m(d); }
  let state: GameState = { ...initialState(b), ...d.state };
  // M4-A (M4A-27..29): with the flag on, a pre-M4 farm (any version, no tracksV7 marker) is price-matched once:
  // H = F, lowest V with price >= v6, milestones seeded silently. SAVE_VERSION stays 6 so main can still read the save.
  const tracks = m4On(b) && !state.tracksV7;
  if (!tracks) return { version: d.version, savedAt: d.savedAt, state };
  // l30plus-saves M2: a Farm level above this build's max is price-matched at the effective (capped) level; the stored
  // level is kept as saved so a rollback + forward never loses it (migrateTracksV7 itself is unchanged).
  return { version: d.version, savedAt: d.savedAt, state: { ...migrateStoredTracksV7(state, b).state, tracksV7: 1 }, tracksMigrated: true, v6State: state, v6Keys: Object.keys(d.state ?? {}) };
}
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void; }
/** Settings > Reset save: the progress save and its .bak (the IndexedDB copy is cleared by Game.clearMirror). eggfarm.install_id and eggfarm.telemetry are kept (M3-AC7 / PT1-2).
 *  Arch m2/m1 (pr63-reset-at, HoQA item 5): Reset's record of already surfaced corrupt copies is NOT a localStorage key and not
 *  here: IdbMirror.clear() writes it as IDB_RESET_KEY ('reset.surfaced') in the IndexedDB store, in the same transaction that
 *  deletes main, and it must outlive the save. Any future 'clear all keys' / export-by-prefix in that store must skip it. */
export const RESET_KEYS = ['eggfarm.save', 'eggfarm.save.bak', 'eggfarm.save.v6_backup', 'eggfarm.save.migration_attempts', 'eggfarm.save.headroom_probe'] as const; // N3: probe key too // review m4: Reset clears the v6 backup too (V6_BACKUP_KEY) // QA BUG-4: .bak too, so reset progress can't come back
export const UI_KEY = 'eggfarm.ui';
/** UI flags that survive a reset / fresh-start fallback: player prefs (+ install-level AC14g session count and tip state). */
export function keepPrefsOnly(f: any): Record<string, unknown> {
  const o: Record<string, unknown> = { sfx: f?.sfx ?? true, reducedMotion: !!f?.reducedMotion };
  if (typeof f?.sessions === 'number') o.sessions = f.sessions;
  if (f?.iosHomeShown) o.iosHomeShown = true;
  return o;
}
/** Clear the save; keep telemetry + install_id; keep sfx/reducedMotion, drop FTUE/progress UI flags (PT1-2). */
export function resetProgress(kv: KV) {
  for (const k of RESET_KEYS) kv.removeItem?.(k);
  try {
    const raw = kv.getItem(UI_KEY); if (raw == null) return;
    kv.setItem(UI_KEY, JSON.stringify(keepPrefsOnly(JSON.parse(raw))));
  } catch { kv.removeItem?.(UI_KEY); }
}
export const BAK_KEY = 'eggfarm.save.bak';
export const CORRUPT_PREFIX = 'eggfarm.save.corrupt.';
/** Index of preserved corrupt copies (oldest first); KV has no key enumeration. */
export const CORRUPT_INDEX_KEY = 'eggfarm.save.corrupt.index';
export const CORRUPT_KEEP = 3;
/** FNV-1a 32-bit over the JSON of the state: catches truncation/bit rot, not tampering. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
/** Serialise a save; `sum` covers the state JSON. */
export function serialize(state: GameState, now: number, saveSeq?: number): string {
  const st = JSON.stringify(state);
  return `{"version":${SAVE_VERSION},"savedAt":${now},${saveSeq ? `"saveSeq":${saveSeq},` : ''}"sum":"${checksum(st)}","state":${st}}`;
}
/** Balances of an M4 build whose session runs with the switch off until the migration commits (game.ts tracksOff). */
const M4_BUILD_OFF = new WeakSet<object>();
export const markM4BuildOff = <T extends object>(b: T): T => { M4_BUILD_OFF.add(b); return b; };
/** ADR M4-19 saveSeq rides only on M4-build saves (flag on, an M4 build with the switch off pre-migration, or a marked tracksV7
 *  farm); a flag-off build's pre-M4 saves keep main's bytes (HoE flag-off rule, golden f90d1678 storage pins). */
/** CCR B1 (#12 hadSeq rule): once the previous copy carries a saveSeq, every later save carries it forward (+1) on any
 *  build, so a flag-off save never ranks below an older M4-build-off copy (the IndexedDB mirror would refuse it and
 *  reconcile would restore the stale copy). A previous copy without saveSeq keeps main's bytes. */
export const m4SaveSeq = (state: GameState, b: Balance | undefined, prev: unknown): number | undefined => {
  const hadSeq = saveSeqOf(prev) > 0;
  return hadSeq || (b && (m4On(b) || M4_BUILD_OFF.has(b))) || (state as { tracksV7?: unknown }).tracksV7 ? saveSeqOf(prev) + 1 : undefined;
};
/** HoE flag-off rule: with M4 off, an unmarked (pre-M4) farm is saved in main's shape (no M4 track fields). A marked
 *  (tracksV7) save keeps them, so a flag-off build never drops a migrated farm's tracks (downgrade). */
export function flagOffShape(state: GameState, b: Balance): GameState {
  if (m4On(b) || (state as { tracksV7?: unknown }).tracksV7) return state;
  const { hensLevel, eggValueLevel, celebratedMilestones, ...v6 } = state; void hensLevel; void eggValueLevel; void celebratedMilestones;
  return v6 as GameState;
}
/**
 * Write the save. With `rotate`, the current main save is first copied into `.bak`, but only if it is itself valid
 * (QA case 2: a fresh-start save never rotates until the caller allows it, and a bad main never overwrites `.bak`).
 */
export function save(kv: KV, state: GameState, now = Date.now(), b?: Balance, rotate = false): string {
  if (b) state = flagOffShape(state, b);
  let prev: string | null = null; try { prev = kv.getItem(SAVE_KEY); } catch { /* blocked: the write below throws */ }
  const raw = serialize(state, now, m4SaveSeq(state, b, prev)); // HoE correction: saveSeq on main (missing = 0)
  // BUG-2: never write over a newer-build save in main or .bak (callers check first; this is the last line of defence).
  const nv = newerStoredVersion(kv); if (nv !== null) throw new NewerSaveError(nv);
  if (rotate && b) {
    const cur = kv.getItem(SAVE_KEY);
    if (cur && validate(cur, b).ok && newerSaveVersion(kv.getItem(BAK_KEY)) === null) { try { kv.setItem(BAK_KEY, cur); } catch { /* full: keep old .bak */ } }
  }
  kv.setItem(SAVE_KEY, raw);
  return raw;
}
/** Thrown by save() when a newer-build copy is in main or .bak: nothing was written. */
export class NewerSaveError extends Error { constructor(readonly version: number) { super(`newer save v${version}`); this.name = 'NewerSaveError'; } }
/** Product rule: savedAt must be a finite number > 0 and not before 2020-01-01 (else 0 offline + re-stamp). */
export const MIN_SAVED_AT = Date.UTC(2020, 0, 1);
/** `now` is the load clock: the pre-2020 floor applies only when the clock itself is past it (a device clock stuck before
 *  2020, or a unit-test clock, can't judge "implausibly old"). validate(raw, b, now) applies the same rule when given a clock (default 0: finite and > 0 only); pickNewest/reconcile pass the real clock. */
export const validSavedAt = (t: unknown, now = Infinity): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0 && (now < MIN_SAVED_AT || t >= MIN_SAVED_AT) && !(now > 0 && Number.isFinite(now) && t > now); // Product 15:15: future = invalid too
/** v4 / Reviewer N2: clock skew tolerated before a savedAt counts as "in the future" when ranking copies. */
export const SAVED_AT_SKEW_MS = 2 * 60_000;
/** Rank of a copy's savedAt for newest-copy picks: any savedAt invalid for offline earnings (missing, null, <= 0, pre-2020
 *  when the clock is past 2020, or more than SAVED_AT_SKEW_MS in the future) is the OLDEST (-Infinity). */
export const savedAtRank = (t: unknown, now = Date.now()): number => validSavedAt(t, now + SAVED_AT_SKEW_MS) ? t : -Infinity;
export function load(kv: KV, b: Balance): SaveFile | null {
  const raw = kv.getItem(SAVE_KEY); if (!raw) return null;
  const v = validate(raw, b); return v.ok ? v.file : null;
}
export type CorruptReason = 'missing' | 'empty' | 'parse' | 'wrong_type' | 'version' | 'missing_state' | 'checksum' | 'invalid_state';
const NUM_FIELDS = ['coinsCents', 'coop', 'basket'] as const;
/** l30plus-saves m1 (+ CCR #47 m1): a level is a finite non-negative number (floored) or a whole-number string ('12' -> 12;
 *  '2.5', '-1', '' and other strings are rejected). null, negatives, NaN, Infinity, booleans, arrays and objects are
 *  rejected (null): validate() returns invalid_state, so the load takes the corrupt path and recovers from .bak/IDB instead
 *  of loading 0 and saving it over main. A level ABOVE this build's maxLevel is valid and kept as stored (M2): every sim
 *  and pricing use site clamps it (formulas clampL / the track cost clamp), so it is never reset and survives re-saves. */
export const LEVEL_FIELDS = ['farmLevel', 'collectionLevel', 'hensLevel', 'eggValueLevel'] as const;
export const sanitizeLevel = (v: unknown): number | null =>
  typeof v === 'number' ? (Number.isFinite(v) && v >= 0 ? Math.floor(v) : null) : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;
/** Sanitizes the level fields present in `st` in place; false if any is invalid (caller rejects the save). */
const sanitizeLevels = (st: any): boolean => { for (const k of LEVEL_FIELDS) if (k in st) { const n = sanitizeLevel(st[k]); if (n === null) return false; st[k] = n; } return true; };
/** Parse + checksum (when present; pre-rc0 saves have none) + state validation + migration. */
export function validate(raw: string, b: Balance, now = 0): { ok: true; file: SaveFile } | { ok: false; reason: CorruptReason } {
  if (!raw.trim()) return { ok: false, reason: 'empty' };
  let d: any; try { d = JSON.parse(raw); } catch { return { ok: false, reason: 'parse' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.version !== 'number' || (d.savedAt !== undefined && d.savedAt !== null && typeof d.savedAt !== 'number')) return { ok: false, reason: 'wrong_type' };
  if (d.version > SAVE_VERSION || d.version < 1 || !Number.isInteger(d.version)) return { ok: false, reason: 'version' };
  if (d.state === undefined || d.state === null) return { ok: false, reason: 'missing_state' };
  if (typeof d.state !== 'object' || Array.isArray(d.state)) return { ok: false, reason: 'wrong_type' };
  if (d.sum !== undefined && d.sum !== checksum(JSON.stringify(d.state))) return { ok: false, reason: 'checksum' };
  { const st = { ...d.state }; if (!sanitizeLevels(st)) return { ok: false, reason: 'invalid_state' }; d = { ...d, state: st }; }
  let f: SaveFile; try { f = migrate(d, b); } catch { return { ok: false, reason: 'version' }; }
  if (f.tracksMigrated) f.preTracksRaw = raw; // n1: only validate() knows the raw bytes; migrate() just flags it
  const s: any = f.state;
  for (const k of NUM_FIELDS) if (typeof s[k] !== 'number' || !Number.isFinite(s[k]) || s[k] < 0) return { ok: false, reason: 'invalid_state' };
  if (!sanitizeLevels(s)) return { ok: false, reason: 'invalid_state' }; // CCR #47 m2: v6State is d.state, already sanitized above
  if (!Array.isArray(s.customers) || !s.workers || typeof s.workers !== 'object') return { ok: false, reason: 'invalid_state' };
  // BUG-6 / QA BUG-1+5: a missing, null, non-finite or <= 0 savedAt becomes NaN (Game grants 0 offline and re-stamps now).
  // The pre-2020 floor and the future check need a clock: they apply only when the caller passes `now` (pickNewest passes
  // now + SAVED_AT_SKEW_MS; Game re-checks with its own clock). With the default now = 0 neither applies.
  // (A string savedAt stays on the corrupt path above: wrong_type.)
  if (!validSavedAt(f.savedAt, now)) f.savedAt = NaN;
  return { ok: true, file: f };
}
/** M41-7 (spec v0.3.3 CSR-10): where a recovery restored from ('none' = fresh, 'deferred' = CSR-13 defer). */
export type RecoverySource = 'bak' | 'idb' | 'v6_backup' | 'none' | 'deferred';
export interface Tried { source: 'bak' | 'idb' | 'v6_backup'; result: 'valid' | 'invalid' | 'absent' | 'unavailable'; reason?: string }
export interface Recovery {
  /** R restored, F fresh, Q fresh + corrupt copy failed (storage), D deferred (CSR-13: IndexedDB unknown, nothing written). */
  case: 'R' | 'F' | 'Q' | 'D'; reason: CorruptReason; had_backup: boolean; restored_from_backup: boolean; copy_failed: boolean;
  /** Raw bytes of the bad main save, kept in memory for "Export old save" (QA case 3). */
  raw: string;
  /** v2.2 'Can't save': storage refused but the farm loaded; Export takes the CURRENT farm from `live`. */
  cantSave?: true; live?: () => string;
  /** M41-7 (engineering/reviews/m41-7-copy-interface.md §1): additive; all optional so older call sites keep compiling. */
  source?: RecoverySource; store?: 'ls' | 'idb'; tried?: Tried[]; prevLevel?: number; restoredLevel?: number; restoredSavedAt?: number;
  restored_version?: number; migrated?: boolean;
}
const isQuota = (e: unknown) => e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota/i.test(e.message));
/** Preserve raw bytes under eggfarm.save.corrupt.<ts>, keep the last CORRUPT_KEEP. One attempt, never retried. */
export function preserveCorrupt(kv: KV, raw: string, ts: number): boolean {
  let idx: string[] = [];
  try { const j = JSON.parse(kv.getItem(CORRUPT_INDEX_KEY) ?? '[]'); if (Array.isArray(j)) idx = j.filter(x => typeof x === 'string'); } catch { /* rebuild */ }
  let key = `${CORRUPT_PREFIX}${ts}`; for (let n = 1; idx.includes(key); n++) key = `${CORRUPT_PREFIX}${ts}-${n}`;
  try { kv.setItem(key, raw); } catch (e) { if (isQuota(e)) return false; return false; }
  idx.push(key);
  while (idx.length > CORRUPT_KEEP) { const old = idx.shift()!; kv.removeItem?.(old); }
  try { kv.setItem(CORRUPT_INDEX_KEY, JSON.stringify(idx)); } catch { /* copy kept; index best effort */ }
  return true;
}
/**
 * rc0 hardened load (engineering/m3-rc0-save-hardening.md). Never touches eggfarm.install_id.
 * - no main save: restore a valid .bak (case R, reason 'missing'), else new game.
 * - main valid: load it.
 * - main bad: preserve it; restore from a valid .bak (case R), else start fresh (F; Q when the copy failed).
 *   A bad .bak is preserved as well (QA case 1).
 */
/** Product 15:15: the single recovery outcome the AC14b dialog (art-ux/save-recovery-dialog.md v2.1) attaches to. M41-7: + 'deferred' (M4). */
export type RecoveryOutcome = 'restored' | 'fresh' | 'storage' | 'deferred' | null;
export const recoveryOutcome = (r: Recovery | null): RecoveryOutcome => !r ? null : r.case === 'D' ? 'deferred' : r.restored_from_backup ? 'restored' : r.case === 'Q' ? 'storage' : 'fresh';
/** v4 f6 + AC14b v2.1: the lease write was refused (storage full) and the loader found nothing to recover. Route it
 *  through the dialog as outcome 'storage' with the v2.2 'Can't save' copy; Export takes the current farm. */
export function storageBlockedRecovery(kv: KV): Recovery {
  let raw = ''; try { raw = kv.getItem(SAVE_KEY) ?? ''; } catch { /* blocked */ }
  return { case: 'Q', reason: 'missing', had_backup: false, restored_from_backup: false, copy_failed: false, raw, cantSave: true };
}
/** M41-7 boot IndexedDB input (spec v0.3.3 §1 "IDB tier status"): 'ok' = open + both reads definite; 'absent' = no global /
 *  SecurityError / private mode; 'unknown' = blocked / timeout / read error. `raw` is the value at save/main as read (a
 *  string, null = no copy, or any non-string value: corrupt, reason wrong_type, CSR-AC-IDB1 IDB1-2). */
export type IdbStatus = 'ok' | 'absent' | 'unknown';
export interface IdbInput { status: IdbStatus; raw: unknown; reason?: string }
/** Newest valid copy (moved from idb-mirror.ts so loadSafe owns it; re-exported there). Ties and an invalid/missing IndexedDB
 *  copy keep localStorage. */
export function pickNewest(lsRaw: string | null, idbRaw: string | null, b: Balance, now = Date.now()): 'ls' | 'idb' {
  if (idbRaw === null || idbRaw === lsRaw) return 'ls';
  const iv = validate(idbRaw, b); if (!iv.ok) return 'ls';
  if (lsRaw === null) return 'idb';
  const lv = validate(lsRaw, b); if (!lv.ok) return 'idb';
  // v4 (QA e3, Reviewer N2): a savedAt invalid for offline earnings (missing, null, <= 0, pre-2020, or in the future beyond
  // SAVED_AT_SKEW_MS) is the OLDEST copy and never beats a valid one; both invalid -> tie -> localStorage.
  // M4-19: version, then committed (tracksV7 + v6BackupId), then savedAt as the tie-break only.
  const c = rankCompare(idbRaw, lsRaw, now); if (c !== 0) return c > 0 ? 'idb' : 'ls';
  return savedAtRank(iv.file.savedAt, now) > savedAtRank(lv.file.savedAt, now) ? 'idb' : 'ls';
}
/** CSR-9a: a farmLevel read from raw bytes only when it is a finite integer >= 0 (no coercion; above maxLevel accepted). */
const strictLevel = (raw: string | null | undefined): number | undefined => {
  if (!raw) return undefined; try { const v = JSON.parse(raw)?.state?.farmLevel; return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : undefined; } catch { return undefined; }
};
const storedVersion = (raw: string): number | undefined => { try { const v = JSON.parse(raw)?.version; return typeof v === 'number' ? v : undefined; } catch { return undefined; } };
/** CSR-7 / G6: preserve each corrupt copy once, per boot (`seen`) and across boots (any entry already in the LS index). */
function preserveOnce(kv: KV, raw: string, ts: number, seen: Set<string>): boolean {
  if (seen.has(raw)) return true;
  let idx: unknown = []; try { idx = JSON.parse(kv.getItem(CORRUPT_INDEX_KEY) ?? '[]'); } catch { /* preserveCorrupt rebuilds */ }
  if (Array.isArray(idx) && idx.some(k => typeof k === 'string' && kv.getItem(k) === raw)) { seen.add(raw); return true; }
  const ok = preserveCorrupt(kv, raw, ts); if (ok) seen.add(raw); return ok;
}
export interface LoadResult {
  file: SaveFile | null; recovery: Recovery | null; outcome: RecoveryOutcome; newer?: number;
  /** G7 / D-HOP-35: the non-corrupt stale-LS case: a newer valid IndexedDB copy was written into main (save_restore {source:'idb'}). */
  staleRestore?: boolean;
  /** CSR-13: restored from .bak while IndexedDB is unknown: the session must not write the mirror (Game sets mirror = null). */
  mirrorOff?: boolean;
}
/**
 * M41-7 single owner of the load order (spec v0.3.3 FROZEN, OQ-7 / CSR-1..16, CSR-AC-IDB1). Runs inside `new Game`, after the
 * lease claim and the owns() check (main.ts, CSR-8). Never touches eggfarm.install_id.
 * 0. Any newer-build copy (main, .bak, IndexedDB) refuses the load before any write (M4A-31(b)).
 * 1. Not corrupt: a valid (or missing) main loses to a newer valid IndexedDB copy -> that copy is written into main
 *    (`reconcile`, the stale-LS case, save_restore); a valid main loads.
 * 2. Trigger (CSR-1): main present and invalid; or main missing and .bak invalid; or (CSR-AC-IDB1 case i) no main, no .bak and
 *    the IndexedDB copy invalid. Corrupt main/.bak bytes are preserved once (CSR-7); the IndexedDB copy is preserved IN
 *    IndexedDB by main.ts before Game (bootPreserveIdb, IDB1-5), never in localStorage.
 * 3. Tier A: valid .bak / IndexedDB (both valid: rankCompare, tie -> .bak). 4. IndexedDB unknown -> defer (CSR-13, case D).
 * 5. Tier B: v6_backup record -> decodeBackup -> validate (normal migration path). 6. Tier C: fresh (F, or Q if the copy failed).
 * `idb` may be a legacy raw string/null (newer check only, no IndexedDB tier): pre-M41-7 call sites and tests.
 */
/** D-HOP-2026-10-22-04 (the one switch for HoP's (4)/(d) call): with no LS main, whenever .bak is the copy chosen (alone, by
 *  winning rankCompare, or on a tie with a valid IndexedDB copy), show the M1 Restored dialog (dd223f5 case R). false = silent. */
export const NO_MAIN_BAK_DIALOG = true;
export function loadSafe(kv: KV, b: Balance, now = Date.now(), idb: IdbInput | string | null = null, idbCopyFailed = false): LoadResult {
  const r = loadSafeInner(kv, b, now, idb, idbCopyFailed); return { ...r, outcome: recoveryOutcome(r.recovery) };
}
function loadSafeInner(kv: KV, b: Balance, now: number, idbArg: IdbInput | string | null, idbCopyFailed: boolean): Omit<LoadResult, 'outcome'> {
  const idb: IdbInput = idbArg !== null && typeof idbArg === 'object' ? idbArg : { status: 'absent', raw: null, reason: 'legacy' };
  const legacy = idbArg === null || typeof idbArg !== 'object';
  const idbStr = legacy ? (idbArg as string | null) : typeof idb.raw === 'string' ? idb.raw : null;
  // B1/m2: any newer copy (main, .bak or IndexedDB) refuses the load before any write, including corrupt-copy preservation.
  const newer = newerStoredVersion(kv, idbStr); if (newer !== null) return { file: null, recovery: null, newer };
  let raw = kv.getItem(SAVE_KEY);
  let staleRestore = false;
  // 1. Stale-LS reconcile (non-corrupt only; reconcile() itself refuses a corrupt main, CSR-3).
  // D-HOP-2026-10-22-01(d) as amended by -04: no main + valid .bak + valid IndexedDB -> CSR-2 tier A (rankCompare, tie -> .bak).
  // IndexedDB picked: silent stale restore (save_restore once); .bak picked: the case R branch below (NO_MAIN_BAK_DIALOG).
  // Missing main + invalid .bak stays a CSR-1 recovery (M1), not stale (G7).
  const noMainIdbWins = (bk: string | null) => bk === null ? pickNewest(null, idbStr, b, now) === 'idb'
    : validate(bk, b).ok && validate(idbStr!, b).ok && rankCompare(idbStr, bk, now) > 0;
  if (!legacy && idbStr !== null && (raw === null ? noMainIdbWins(kv.getItem(BAK_KEY)) : validate(raw, b).ok && pickNewest(raw, idbStr, b, now) === 'idb')) {
    try { kv.setItem(SAVE_KEY, idbStr); raw = idbStr; staleRestore = true; } catch { /* quota: localStorage as-is (rc1 behaviour) */ }
  }
  const mainV = raw !== null ? validate(raw, b) : null;
  if (mainV?.ok) return { file: mainV.file, recovery: null, staleRestore };
  const bakRaw = kv.getItem(BAK_KEY), had_backup = bakRaw !== null;
  const bv = bakRaw !== null ? validate(bakRaw, b) : null;
  // IndexedDB tier classification (spec §1).
  let idbT: Tried, idbFile: SaveFile | null = null;
  if (legacy || idb.status === 'absent') idbT = { source: 'idb', result: 'absent', ...(legacy ? {} : idb.reason ? { reason: idb.reason } : {}) };
  else if (idb.status === 'unknown') idbT = { source: 'idb', result: 'unavailable', reason: idb.reason ?? 'idb_read_error' };
  else if (idb.raw === null || idb.raw === undefined) idbT = { source: 'idb', result: 'absent' };
  else if (typeof idb.raw !== 'string') idbT = { source: 'idb', result: 'invalid', reason: 'wrong_type' };
  else if (raw !== null && idb.raw === raw) idbT = { source: 'idb', result: 'invalid', reason: (mainV as { reason: string }).reason }; // CSR-3: identical bytes
  else { const iv = validate(idb.raw, b); if (iv.ok) { idbT = { source: 'idb', result: 'valid' }; idbFile = iv.file; } else idbT = { source: 'idb', result: 'invalid', reason: iv.reason }; }
  // 2. Trigger.
  let reason: CorruptReason, store: 'ls' | 'idb' = 'ls';
  if (raw !== null) reason = (mainV as { ok: false; reason: CorruptReason }).reason;
  else if (bakRaw !== null) {
    // QA BUG-3: main missing but .bak exists: restore it like case R, never start fresh over a valid .bak.
    if (bv!.ok) return !NO_MAIN_BAK_DIALOG ? { file: bv!.file, recovery: null } : { file: bv!.file, recovery: { case: 'R', reason: 'missing', had_backup: true, restored_from_backup: true, copy_failed: false, raw: '', source: 'bak', store: 'ls', tried: [{ source: 'bak', result: 'valid' }, idbT], restored_version: storedVersion(bakRaw), migrated: !!bv!.file.tracksMigrated, ...restoredMeta(bv!.file, now) } };
    reason = (bv as { reason: CorruptReason }).reason;
  } else if (idbT.result === 'invalid') { reason = idbT.reason as CorruptReason; store = 'idb'; } // CSR-AC-IDB1 case (i)
  // Nothing stored. D-HOP-2026-10-22-01 (c): with IndexedDB unknown this is a fresh farm (CSR-1, no dialog) and the session
  // never writes the mirror (a hidden IndexedDB farm is the M4.2 gap), so Game sets mirror = null.
  else return { file: null, recovery: null, ...(idbT.result === 'unavailable' ? { mirrorOff: true } : {}) };
  const seen = new Set<string>();
  const copied = raw !== null ? preserveOnce(kv, raw, now, seen) : bakRaw !== null ? true : !idbCopyFailed;
  const bakT: Tried = bakRaw === null ? { source: 'bak', result: 'absent' } : bv!.ok ? { source: 'bak', result: 'valid' } : { source: 'bak', result: 'invalid', reason: (bv as { reason: string }).reason };
  let bakCopyOk = true;
  if (bakRaw !== null && !bv!.ok) bakCopyOk = preserveOnce(kv, bakRaw, now + 1, seen); // QA case 1
  const tried: Tried[] = [bakT, idbT];
  const prevLevel = strictLevel(raw) ?? strictLevel(bakRaw);
  const base = { reason, had_backup, raw: raw ?? (bakRaw ?? (typeof idb.raw === 'string' ? idb.raw : idb.raw != null ? safeText(idb.raw) : '')), store, tried, ...(prevLevel !== undefined ? { prevLevel } : {}) };
  const copyFailed = raw !== null ? !copied : bakRaw !== null ? !bakCopyOk : idbCopyFailed;
  const restore = (file: SaveFile, source: RecoverySource, srcRaw: string, extra: object = {}) => ({ file, recovery: { ...base, case: 'R' as const, restored_from_backup: true, copy_failed: copyFailed, source, restored_version: storedVersion(srcRaw), migrated: !!file.tracksMigrated, ...restoredMeta(file, now) }, ...extra });
  // 3. Tier A.
  if (bv?.ok && idbFile) return rankCompare(idb.raw, bakRaw, now) > 0 ? restore(idbFile, 'idb', idb.raw as string) : restore(bv.file, 'bak', bakRaw!);
  if (bv?.ok) return restore(bv.file, 'bak', bakRaw!, idbT.result === 'unavailable' ? { mirrorOff: true } : {});
  if (idbFile) return restore(idbFile, 'idb', idb.raw as string);
  // 4. CSR-13 defer: IndexedDB unknown and no valid .bak: no v6_backup / fresh commit, no save write.
  if (idbT.result === 'unavailable') return { file: null, recovery: { ...base, case: 'D', restored_from_backup: false, copy_failed: copyFailed, source: 'deferred' } };
  // 5. Tier B: v6_backup (CSR-4/5): never deleted, edited or copied to corrupt.* here.
  const rec = kv.getItem(V6_BACKUP_KEY);
  if (rec === null) tried.push({ source: 'v6_backup', result: 'absent' });
  else {
    const d = decodeBackup(rec);
    if (!d) tried.push({ source: 'v6_backup', result: 'invalid', reason: 'parse' });
    else { const v6 = validate(d.raw, b); if (v6.ok) { tried.push({ source: 'v6_backup', result: 'valid' }); return restore(v6.file, 'v6_backup', d.raw); } tried.push({ source: 'v6_backup', result: 'invalid', reason: v6.reason }); }
  }
  // 6. Tier C: fresh (CSR-6), never silent.
  return { file: null, recovery: { ...base, case: raw !== null ? (copied ? 'F' : 'Q') : bakRaw !== null ? (bakCopyOk ? 'F' : 'Q') : 'F', restored_from_backup: false, copy_failed: copyFailed, source: 'none' } };
}
const restoredMeta = (f: SaveFile, now: number) => {
  const lvl = (f.v6State ?? f.state).farmLevel, at = f.savedAt;
  return { ...(typeof lvl === 'number' ? { restoredLevel: lvl } : {}), ...(validSavedAt(at, now) ? { restoredSavedAt: at } : {}) };
};
const safeText = (v: unknown): string => { try { return JSON.stringify(v) ?? String(v); } catch { return String(v); } };

/** AC14d: the second tab reads the save but every write is dropped (also the load-time save and .bak rotation). */
export const readOnlyKV = (kv: KV): KV => ({ getItem: k => kv.getItem(k), setItem: () => {}, removeItem: () => {} });
