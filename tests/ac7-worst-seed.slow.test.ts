// SLOW: variance-bot AC7 worst-seed guards (HoP 23:15/23:19; product/ac7-qa-threshold-changes.md row 'L18-25 worst step';
// Economy definitions, decisions.md:242). Bounds: data/pacing-targets.json. Run with `npm run test:slow`.
//  - L18-25 window (HoP 02:05, decisions.md): per seed, the slowest level L18..L25 (time on level n = reach(n+1) - reach(n)).
//    Variance workers bot: P95 across 100 seeds <= l18_25_step_p95_max_s_variance, worst seed <= l18_25_step_worst_max_s.
//    Fixed (deterministic) workers bot: every seed's slowest level <= l18_25_step_p95_max_s. Both hard. The run horizon is
//    extended past fx.T (60 min) to HORIZON_S for this check only, so that L25 is completed (L26 reached).
//  - Warn only: workers variance P95 time-to-L20 > ac7_w_t20_p95_warn_s (R-AC7-W-ZERO-MARGIN, product/m4-risk-list.md).
//  - Same CSV-sha switch as the AC7 band: F1 86f0e80e = hard assert; 57d964d5 (pre-F1 main) = skipped, because the guard is
//    defined on F1 only (Economy) and pre-F1 workers is known not to reach L25 in a comparable time; any other sha fails.
//  - NOT here: step-ratio and purchase-gap guards. They are L30+ only (HoP 23:30) and fail by design on L0-29; no L30+ bot /
//    late_curve suite exists in this repo, so they live as pure helpers (tests/pacing-guards.ts), unit-tested on synthetic
//    traces and unwired. The official L30+ gate is QA's pinned Python late_curve.py ab928dc96d1c on b59c4e0d.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { VAR_DEFAULT } from './seller-variance';
import { loadTargets, l18to25Guard, l18to25FixedGuard, t20P95Warning, quantile } from './pacing-guards';
const F1_CSV = '86f0e80e', MAIN_PRE_F1_CSV = '57d964d5';
// Same seeds as the AC7 band suite (tests/fixtures/seller_variance.json, 1..100; CCR m2).
const fx = JSON.parse(readFileSync(new URL('./fixtures/seller_variance.json', import.meta.url), 'utf8')) as { seeds: number[] };
const SEEDS = fx.seeds, HORIZON_S = 2 * 3600;
const csvSha = createHash('sha256').update(readFileSync(new URL('../data/economy.csv', import.meta.url))).digest('hex').slice(0, 8);
const t = loadTargets();
const known = csvSha === F1_CSV || csvSha === MAIN_PRE_F1_CSV;
describe(`AC7 worst-seed guards, workers variance bot (data/economy.csv ${csvSha})`, () => {
  it('economy CSV sha is known (else: update this suite)', () => { if (!known) throw new Error(`unknown economy CSV ${csvSha}: update AC7 worst-seed guards`); });
  it.skipIf(csvSha !== F1_CSV)('F1 variance bot: L18-25 slowest-level P95/worst within bounds; P95 time-to-L20 warn', () => {
    const reaches = SEEDS.map(s => runM2(b, s, { model: 'seller15', T: HORIZON_S, variance: VAR_DEFAULT }).reach);
    const g = l18to25Guard(reaches, t), w = t20P95Warning(reaches, t), t20 = reaches.map(r => r.get(20) ?? Infinity);
    console.log(`variance L18-25 slowest level P95 ${g.p95.toFixed(1)}s (<= ${t.l18_25_step_p95_max_s_variance}) worst ${g.worst.toFixed(1)}s (<= ${t.l18_25_step_worst_max_s}); t20 P5/P50/P95/worst ${[.05, .5, .95].map(p => quantile(t20, p).toFixed(0)).join('/')}/${Math.max(...t20).toFixed(0)}s (warn P95 > ${t.ac7_w_t20_p95_warn_s})`);
    if (w.warning) console.warn(w.warning);
    expect(g.failures).toEqual([]);
  }, 600_000);
  it.skipIf(csvSha !== F1_CSV)('F1 fixed bot: every seed\'s slowest L18-25 level <= l18_25_step_p95_max_s', () => {
    const reaches = SEEDS.map(s => runM2(b, s, { model: 'seller15', T: HORIZON_S }).reach);
    const g = l18to25FixedGuard(reaches, t);
    console.log(`fixed L18-25 slowest level P95 ${g.p95.toFixed(1)}s worst ${g.worst.toFixed(1)}s (<= ${t.l18_25_step_p95_max_s})`);
    expect(g.failures).toEqual([]);
  }, 600_000);
});
