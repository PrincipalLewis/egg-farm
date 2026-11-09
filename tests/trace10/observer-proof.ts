// trace10 observer proof (design §11; EC-2 "traced vs untraced -> identical reach maps, buy order, RNG consumption").
// P1 untraced vs traced-full: canonical equality of the ENTIRE run() return (reach, final incl. engine rng cursor, ...).
// P2 traced-full vs traced-minimal: identical buy sequence [i, pick, rowPaid], runner draws (measured 0) and final V cursor.
// P3 hook-mutation robustness: the full observer plus hooks that mutate/freeze their clones and log junk on V.trace -> P1 equal.
// P4 (informational) reach maps vs scratch baseline raws, reported as a harness-of-record finding (R-1), never an observer FAIL.
import { existsSync, readFileSync } from 'node:fs';
import type { Balance } from '../../src/config/balance';
import type { GameState } from '../../src/sim/state';
import { run, PROFS, M5X_STACKS, type RunOpts } from '../bot-m5';
import type { SellerVariance } from '../seller-variance';
import { TraceWriter } from './writer';
import { SeedObserver } from './observer';
import { varianceCursor, type PyCursor } from './rngcursor';
import { canon, sha256 } from './encode';

const K = M5X_STACKS.none;
const rowAfter = (pick: string, s: GameState) => pick === 'f' ? s.farmLevel - 1 : pick === 'c' ? s.collectionLevel - 1 : pick === 'hens' ? s.hensLevel - 1
  : pick === 'eggValue' ? s.eggValueLevel - 1 : pick === 'W4' ? s.graderTier - 1 : 0;
export interface ProofRow { seed: number; profile: string; P1: boolean; P2: boolean; P3: boolean; untraced_sha256: string; traced_sha256: string; mutated_sha256: string;
  buys_full: number; buys_minimal: number; buy_order_equal: boolean; runner_full: number; runner_minimal: number; v_full: PyCursor | null; v_minimal: PyCursor | null;
  engine_rng_end_untraced: number; engine_rng_end_traced: number; observer_invalid: string[] }
export function proveSeed(bal: Balance, seed: number, profile: string, T = 4000): ProofRow {
  const P = PROFS[profile], n = Math.round(T * bal.tickHz);
  const plain = run(bal, seed, P, K, T);
  const full = new SeedObserver(new TraceWriter(), seed, bal); const traced = run(bal, seed, P, K, T, full.hooks); const fr = full.finish(n);
  // minimal: buy markers + V handle + runner counter only
  const mb: [number, string, number][] = []; let mr = 0, mV: SellerVariance | null = null;
  const minimal: RunOpts = { onObserve: (_k, a, t, s) => { if (a.startsWith('buy:')) mb.push([Math.round(t * 10), a.slice(4), rowAfter(a.slice(4), s)]); }, onVariance: V => { mV = V; }, onRunnerDraw: n2 => { mr = n2; } };
  run(bal, seed, P, K, T, minimal); const vMin = mV ? varianceCursor(mV) : null;
  // P3: full observer + hostile hooks
  const ob3 = new SeedObserver(new TraceWriter(), seed, bal), junk: unknown[] = [];
  const hostile: RunOpts = { ...ob3.hooks,
    onTick: (ph, i, t, s) => { ob3.hooks.onTick(ph, i, t, s); (s as any).coinsCents = -1; s.customers.length = 0; (s as any).workers = {}; Object.freeze(s); },
    onObserve: (k, a, t, s) => { ob3.hooks.onObserve(k, a, t, s); (s as any).farmLevel = 99; Object.freeze(s); },
    onVariance: V => { ob3.hooks.onVariance(V); const tr = V.trace; V.trace = (k, v) => { tr?.(k, v); junk.push([k, v, 'junk']); }; } };
  const mutated = run(bal, seed, P, K, T, hostile); ob3.finish(n);
  const hu = sha256(canon(plain)), ht = sha256(canon(traced)), hm = sha256(canon(mutated));
  const buyEq = canon(fr.buys) === canon(mb);
  return { seed, profile, P1: hu === ht, P2: buyEq && fr.runnerDraws === 0 && mr === 0 && canon(fr.vEnd) === canon(vMin), P3: hm === hu, untraced_sha256: hu, traced_sha256: ht, mutated_sha256: hm,
    buys_full: fr.buys.length, buys_minimal: mb.length, buy_order_equal: buyEq, runner_full: fr.runnerDraws, runner_minimal: mr, v_full: fr.vEnd, v_minimal: vMin,
    engine_rng_end_untraced: plain.final.rng, engine_rng_end_traced: traced.final.rng, observer_invalid: fr.invalid };
}
/** P4: informational reach cross-check vs scratch raws (pl.ts). Missing raws -> UNAVAILABLE (reported, not a failure). */
export function p4Reach(rawPath: string, reachBySeed: Record<number, Record<string, number>>): { status: 'UNAVAILABLE' | 'MATCH' | 'MISMATCH' | 'UNREADABLE'; detail: unknown } {
  if (!existsSync(rawPath)) return { status: 'UNAVAILABLE', detail: `${rawPath} not on disk` };
  try {
    const raw = JSON.parse(readFileSync(rawPath, 'utf8')); const rows: any[] = Array.isArray(raw) ? raw : raw.rows ?? raw.seeds ?? [];
    const mism: unknown[] = [];
    for (const [seed, reach] of Object.entries(reachBySeed)) {
      const r = rows.find(x => x?.seed === +seed); if (!r?.reach) { mism.push({ seed, why: 'seed/reach absent in raw' }); continue; }
      for (let L = 0; L <= 10; L++) if ((r.reach[L] ?? r.reach[String(L)] ?? null) !== (reach[String(L)] ?? null)) mism.push({ seed, L, raw: r.reach[L] ?? r.reach[String(L)] ?? null, traced: reach[String(L)] ?? null });
    }
    return { status: mism.length ? 'MISMATCH' : 'MATCH', detail: mism.slice(0, 50) };
  } catch (e) { return { status: 'UNREADABLE', detail: String(e) }; }
}
