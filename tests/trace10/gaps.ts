// EC-1 legacy gap export, Option A (design §12; contract EC-1). Explicit measured zero != omission.
// Gap = a run of integer seconds with nothing affordable (harness bot-m5.ts L191-192: inR = F in [10, max), aff = !inR ||
// candidates().some(affordable)), keyed by the Farm level at which the run starts. L in 11..29 is fully observed iff reach(L)
// and reach(L+1) exist within T and no gap that started at L is still open at T; then value = max gap started at L, or 0.
export interface AffSample { t: number; F: number; aff: boolean }
export interface GapRow { seed: number; observed: Record<string, number>; unobserved: Record<string, 'unreached' | 'window_incomplete'> }
export const EC1_SCHEMA = 'EC-1-optionA-v1';
export const EC1_LEVELS = Array.from({ length: 19 }, (_, k) => 11 + k);
export interface GapCalc { closed: { L: number; len: number }[]; open: { L: number; len: number } | null }
/** Replays the L192 state machine over the samples (same arithmetic: len = t - start; open at T: T - start). */
export function gapRuns(samples: readonly AffSample[], T: number): GapCalc {
  let start: number | null = null, L0 = 0; const closed: GapCalc['closed'] = [];
  for (const x of samples) {
    if (!x.aff) { if (start === null) { start = x.t; L0 = x.F; } }
    else if (start !== null) { closed.push({ L: L0, len: x.t - start }); start = null; }
  }
  return { closed, open: start === null ? null : { L: L0, len: T - start } };
}
/** One seed's EC-1 row + the longestNoAff cross-check value (max over every closed and open gap, all levels). */
export function gapRow(seed: number, samples: readonly AffSample[], reach: ReadonlyMap<number, number>, T: number): { row: GapRow; maxGap: number } {
  const g = gapRuns(samples, T), observed: GapRow['observed'] = {}, unobserved: GapRow['unobserved'] = {};
  for (const L of EC1_LEVELS) {
    const inWin = reach.has(L) && reach.has(L + 1) && reach.get(L)! <= T && reach.get(L + 1)! <= T;
    if (!reach.has(L) || !reach.has(L + 1)) { unobserved[String(L)] = 'unreached'; continue; }
    if (!inWin || (g.open && g.open.L === L)) { unobserved[String(L)] = 'window_incomplete'; continue; }
    observed[String(L)] = g.closed.filter(x => x.L === L).reduce((m, x) => Math.max(m, x.len), 0);
  }
  const maxGap = Math.max(0, ...g.closed.map(x => x.len), ...(g.open ? [g.open.len] : []));
  return { row: { seed, observed, unobserved }, maxGap };
}
/** Consumer stub (bandguard-style): a required cell is PASS-eligible only with a present finite number; never subset-PASS. */
export function consumeCell(row: unknown, L: number): 'PASS_ELIGIBLE' | 'FAIL' | 'UNASSESSED' {
  const r = row as Partial<GapRow> | null; const obs = r?.observed;
  if (!obs || typeof obs !== 'object' || Array.isArray(obs) || !Object.keys(obs).length) return 'UNASSESSED';
  if (!Object.prototype.hasOwnProperty.call(obs, String(L))) return r?.unobserved && String(L) in r.unobserved ? 'UNASSESSED' : 'FAIL';
  const v = (obs as Record<string, unknown>)[String(L)];
  return typeof v === 'number' && Number.isFinite(v) ? 'PASS_ELIGIBLE' : 'FAIL';
}
