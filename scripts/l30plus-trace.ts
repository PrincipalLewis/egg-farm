// Play-equivalence trace for the L30+ harness (scripts/measure-l30plus.ts, HoE 2026-10-19). Pure functions; unit-tested in
// tests/l30plus-trace.test.ts. A trace is the bot's purchases in order, each with its tick, kind/row and a state snapshot.
import { createHash } from 'node:crypto';
import type { GameState } from '../src/sim/state';
/** One purchase: tick index, sim time, kind (f/c/hens/eggValue/W1..W4/hire:<w>/grader), the row bought (level BEFORE the buy,
 *  i.e. the cost row paid) and the state right after it. */
export interface TraceEvent { i: number; t: number; kind: string; row: number; coins: number; F: number; C: number; H: number; V: number; workers: string; grader: number; coop: number; basket: number }
const rowOf = (kind: string, s: GameState) => kind === 'f' ? s.farmLevel - 1 : kind === 'c' ? s.collectionLevel - 1 : kind === 'hens' ? s.hensLevel - 1 : kind === 'eggValue' ? s.eggValueLevel - 1 : kind === 'grader' || kind === 'W4' ? s.graderTier - 1 : 0;
export const snap = (i: number, t: number, kind: string, s: GameState): TraceEvent => ({
  i, t, kind, row: rowOf(kind, s), coins: s.coinsCents, F: s.farmLevel, C: s.collectionLevel, H: s.hensLevel, V: s.eggValueLevel,
  workers: Object.keys(s.workers).sort().join('+'), grader: s.graderTier, coop: s.coop, basket: s.basket,
});
/** Canonical one-line key (field order fixed; numbers via JSON so -0/float noise is visible). */
export const eventKey = (e: TraceEvent) => [e.i, e.t, e.kind, e.row, e.coins, e.F, e.C, e.H, e.V, e.workers, e.grader, e.coop, e.basket].map(x => JSON.stringify(x)).join('|');
/** First tick at which the trace reaches Farm level `L` (the purchase that made F = L), or Infinity. */
export const firstTickAt = (tr: TraceEvent[], L: number) => { const e = tr.find(x => x.F >= L); return e ? e.i : Infinity; };
/** Events strictly before tick `until` (the F31 purchase itself is excluded: main's CSV has no row to buy it). */
export const prefix = (tr: TraceEvent[], until: number) => tr.filter(e => e.i < until);
export const traceHash = (tr: TraceEvent[]) => { const h = createHash('sha256'); for (const e of tr) h.update(eventKey(e) + '\n'); return h.digest('hex'); };
export interface SeedCompare { seed: number; until: number; events: number; hash: string; baseHash: string; match: boolean; firstDiff?: { index: number; tick: number | null; cand: string | null; main: string | null } }
/** Compare one seed: candidate trace vs main-CSV trace, both cut before the candidate's first F31 tick (whole run if never). */
export function compareSeed(seed: number, cand: TraceEvent[], main: TraceEvent[], L = 31): SeedCompare {
  const until = firstTickAt(cand, L), a = prefix(cand, until), m = prefix(main, until);
  const hash = traceHash(a), baseHash = traceHash(m), r: SeedCompare = { seed, until: Number.isFinite(until) ? until : -1, events: a.length, hash, baseHash, match: hash === baseHash };
  if (!r.match) for (let k = 0; k < Math.max(a.length, m.length); k++) {
    const x = a[k] ? eventKey(a[k]) : null, y = m[k] ? eventKey(m[k]) : null;
    if (x !== y) { r.firstDiff = { index: k, tick: Math.min(a[k]?.i ?? Infinity, m[k]?.i ?? Infinity), cand: x, main: y }; break; }
  }
  return r;
}
export interface Equivalence { verdict: 'PASS' | 'FAIL'; seeds: number; mismatches: number; firstFail?: SeedCompare }
export const summarize = (rs: SeedCompare[]): Equivalence => { const bad = rs.filter(r => !r.match); return { verdict: bad.length ? 'FAIL' : 'PASS', seeds: rs.length, mismatches: bad.length, ...(bad.length ? { firstFail: bad[0] } : {}) }; };
/** First-buy report: for each Collection row, the lowest Farm level at which any seed first buys it (row = collectionLevel before the
 *  buy), and how many seeds buy it before reaching Farm `L`. */
export function firstBuys(traces: TraceEvent[][], rowsWanted: number[], L = 31) {
  return rowsWanted.map(row => {
    let earliestF = Infinity, earliestSeedIdx = -1, beforeL = 0;
    traces.forEach((tr, k) => { const e = tr.find(x => x.kind === 'c' && x.row === row); if (!e) return; if (e.F < earliestF) { earliestF = e.F; earliestSeedIdx = k; } if (e.F < L) beforeL++; });
    return { row, earliestFarm: Number.isFinite(earliestF) ? earliestF : null, earliestSeedIdx, seedsBuyingBeforeF31: beforeL, seeds: traces.length };
  });
}
