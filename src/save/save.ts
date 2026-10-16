import type { Balance } from '../config/balance';
import { GameState, initialState, coopTier } from '../sim/state';
export const SAVE_KEY = 'eggfarm.save';
export const SAVE_VERSION = 6;
export interface SaveFile { version: number; savedAt: number; state: GameState; }
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
  return { version: d.version, savedAt: d.savedAt, state: { ...initialState(b), ...d.state } };
}
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void; }
/** Settings > Reset save: the progress save and its .bak (the IndexedDB copy is cleared by Game.clearMirror). eggfarm.install_id and eggfarm.telemetry are kept (M3-AC7 / PT1-2). */
export const RESET_KEYS = ['eggfarm.save', 'eggfarm.save.bak'] as const; // QA BUG-4: .bak too, so reset progress can't come back
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
export function serialize(state: GameState, now: number): string {
  const st = JSON.stringify(state);
  return `{"version":${SAVE_VERSION},"savedAt":${now},"sum":"${checksum(st)}","state":${st}}`;
}
/**
 * Write the save. With `rotate`, the current main save is first copied into `.bak`, but only if it is itself valid
 * (QA case 2: a fresh-start save never rotates until the caller allows it, and a bad main never overwrites `.bak`).
 */
export function save(kv: KV, state: GameState, now = Date.now(), b?: Balance, rotate = false): string {
  const raw = serialize(state, now);
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
 *  2020, or a unit-test clock, can't judge "implausibly old"). validate() (no clock) checks finite and > 0. */
export const validSavedAt = (t: unknown, now = Infinity): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0 && (now < MIN_SAVED_AT || t >= MIN_SAVED_AT) && !(now > 0 && Number.isFinite(now) && t > now); // Product 15:15: future = invalid too
export function load(kv: KV, b: Balance): SaveFile | null {
  const raw = kv.getItem(SAVE_KEY); if (!raw) return null;
  const v = validate(raw, b); return v.ok ? v.file : null;
}
export type CorruptReason = 'missing' | 'empty' | 'parse' | 'wrong_type' | 'version' | 'missing_state' | 'checksum' | 'invalid_state';
const NUM_FIELDS = ['coinsCents', 'coop', 'basket', 'collectionLevel', 'farmLevel'] as const;
/** Parse + checksum (when present; pre-rc0 saves have none) + state validation + migration. */
export function validate(raw: string, b: Balance): { ok: true; file: SaveFile } | { ok: false; reason: CorruptReason } {
  if (!raw.trim()) return { ok: false, reason: 'empty' };
  let d: any; try { d = JSON.parse(raw); } catch { return { ok: false, reason: 'parse' }; }
  if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.version !== 'number' || (d.savedAt !== undefined && d.savedAt !== null && typeof d.savedAt !== 'number')) return { ok: false, reason: 'wrong_type' };
  if (d.version > SAVE_VERSION || d.version < 1 || !Number.isInteger(d.version)) return { ok: false, reason: 'version' };
  if (d.state === undefined || d.state === null) return { ok: false, reason: 'missing_state' };
  if (typeof d.state !== 'object' || Array.isArray(d.state)) return { ok: false, reason: 'wrong_type' };
  if (d.sum !== undefined && d.sum !== checksum(JSON.stringify(d.state))) return { ok: false, reason: 'checksum' };
  let f: SaveFile; try { f = migrate(d, b); } catch { return { ok: false, reason: 'version' }; }
  const s: any = f.state;
  for (const k of NUM_FIELDS) if (typeof s[k] !== 'number' || !Number.isFinite(s[k]) || s[k] < 0) return { ok: false, reason: 'invalid_state' };
  if (!Number.isInteger(s.farmLevel) || !Number.isInteger(s.collectionLevel) || s.farmLevel > b.maxLevel || s.collectionLevel > b.maxLevel) return { ok: false, reason: 'invalid_state' };
  if (!Array.isArray(s.customers) || !s.workers || typeof s.workers !== 'object') return { ok: false, reason: 'invalid_state' };
  // BUG-6 / QA BUG-1+5: a missing, null, non-finite, <= 0 or pre-2020 savedAt is NaN. Game grants 0 offline and re-stamps now.
  // (A string savedAt stays on the corrupt path above: wrong_type.)
  if (!validSavedAt(f.savedAt, 0)) f.savedAt = NaN;
  return { ok: true, file: f };
}
export interface Recovery {
  case: 'R' | 'F' | 'Q'; reason: CorruptReason; had_backup: boolean; restored_from_backup: boolean; copy_failed: boolean;
  /** Raw bytes of the bad main save, kept in memory for "Export old save" (QA case 3). */
  raw: string;
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
/** Product 15:15: the single recovery outcome the AC14b dialog (art-ux/save-recovery-dialog.md v2.1) attaches to. */
export type RecoveryOutcome = 'restored' | 'fresh' | 'storage' | null;
export const recoveryOutcome = (r: Recovery | null): RecoveryOutcome => !r ? null : r.restored_from_backup ? 'restored' : r.case === 'Q' ? 'storage' : 'fresh';
export function loadSafe(kv: KV, b: Balance, now = Date.now(), idbRaw: string | null = null): { file: SaveFile | null; recovery: Recovery | null; outcome: RecoveryOutcome; newer?: number } {
  const r = loadSafeInner(kv, b, now, idbRaw); return { ...r, outcome: recoveryOutcome(r.recovery) };
}
function loadSafeInner(kv: KV, b: Balance, now: number, idbRaw: string | null): { file: SaveFile | null; recovery: Recovery | null; newer?: number } {
  // B1/m2: any newer copy (main, .bak or IndexedDB) refuses the load before any write, including corrupt-copy preservation.
  const newer = newerStoredVersion(kv, idbRaw); if (newer !== null) return { file: null, recovery: null, newer };
  const raw = kv.getItem(SAVE_KEY);
  if (raw === null) {
    // QA BUG-3: main missing (localStorage and IndexedDB; reconcile ran first) but .bak exists: restore it like case R,
    // never start fresh over a valid .bak. A bad .bak is preserved, then a fresh start (it never rotates over the copy).
    const bakRaw = kv.getItem(BAK_KEY); if (bakRaw === null) return { file: null, recovery: null };
    const bv = validate(bakRaw, b);
    if (bv.ok) return { file: bv.file, recovery: { case: 'R', reason: 'missing', had_backup: true, restored_from_backup: true, copy_failed: false, raw: '' } };
    // SD4-3 / Code Reviewer N5: a bad .bak with no main is still a recovery -> 'fresh' (or 'storage' if the copy failed), never silent.
    const bakCopied = preserveCorrupt(kv, bakRaw, now + 1);
    return { file: null, recovery: { case: bakCopied ? 'F' : 'Q', reason: bv.reason, had_backup: true, restored_from_backup: false, copy_failed: !bakCopied, raw: bakRaw } };
  }
  const v = validate(raw, b);
  if (v.ok) return { file: v.file, recovery: null };
  const copied = preserveCorrupt(kv, raw, now);
  const bakRaw = kv.getItem(BAK_KEY), had_backup = bakRaw !== null;
  const bv = bakRaw !== null ? validate(bakRaw, b) : null;
  if (bv?.ok) return { file: bv.file, recovery: { case: 'R', reason: v.reason, had_backup, restored_from_backup: true, copy_failed: !copied, raw } };
  if (bakRaw !== null) preserveCorrupt(kv, bakRaw, now + 1);
  return { file: null, recovery: { case: copied ? 'F' : 'Q', reason: v.reason, had_backup, restored_from_backup: false, copy_failed: !copied, raw } };
}

/** AC14d: the second tab reads the save but every write is dropped (also the load-time save and .bak rotation). */
export const readOnlyKV = (kv: KV): KV => ({ getItem: k => kv.getItem(k), setItem: () => {}, removeItem: () => {} });
