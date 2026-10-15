import type { Balance } from '../config/balance';
import { GameState, initialState, coopTier } from '../sim/state';
export const SAVE_KEY = 'eggfarm.save';
export const SAVE_VERSION = 5;
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
};
export function migrate(d: any, b: Balance): SaveFile {
  if (!d || typeof d.version !== 'number' || d.version > SAVE_VERSION) throw new Error('bad save');
  while (d.version < SAVE_VERSION) { const m = migrations[d.version]; if (!m) throw new Error(`no migration from v${d.version}`); d = m(d); }
  return { version: d.version, savedAt: d.savedAt, state: { ...initialState(b), ...d.state } };
}
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem?(k: string): void; }
/** Settings > Reset save: progress, telemetry and UI flags. eggfarm.install_id is deliberately kept (M3-AC7). */
export const RESET_KEYS = [SAVE_KEY, 'eggfarm.telemetry', 'eggfarm.ui'] as const;
export function resetProgress(kv: KV) { for (const k of RESET_KEYS) kv.removeItem?.(k); }
export function save(kv: KV, state: GameState, now = Date.now()) {
  const f: SaveFile = { version: SAVE_VERSION, savedAt: now, state };
  kv.setItem(SAVE_KEY, JSON.stringify(f));
}
export function load(kv: KV, b: Balance): SaveFile | null {
  const raw = kv.getItem(SAVE_KEY); if (!raw) return null;
  try { return migrate(JSON.parse(raw), b); } catch { return null; }
}
