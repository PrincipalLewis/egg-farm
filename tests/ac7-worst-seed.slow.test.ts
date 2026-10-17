// SLOW: variance-bot AC7 worst-seed guards (HoP 23:15/23:19; product/ac7-qa-threshold-changes.md row 'L18-25 worst step';
// Economy definitions, decisions.md:242). Bounds: data/pacing-targets.json. Run with `npm run test:slow`.
//  - L18-25 window, workers (m2) variance bot: time spent on each level L18..L25, every (seed, level) is one
//    step sample; P95 over the 800 samples and worst sample are gated (per-seed-max P95 is logged only). The run horizon
//    is extended past fx.T for this check only (L25 must be completed, i.e. L26 reached), up to HORIZON_S.
//  - Warn only: workers P5 time-to-L20 > ac7_w_p5_t20_warn_s (R-AC7-W-ZERO-MARGIN, product/m4-risk-list.md).
//  - Same CSV-sha switch as the AC7 band: F1 86f0e80e = hard assert; 57d964d5 (pre-F1 main) = skipped, because the guard is
//    defined on F1 only (Economy) and pre-F1 workers is known not to reach L25 in a comparable time; any other sha fails.
//  - NOT here: step-ratio and purchase-gap guards. They are L30+ only (HoP 23:30) and fail by design on L0-29; no L30+ bot /
//    late_curve suite exists in this repo yet, so they live as pure helpers (tests/pacing-guards.ts) with synthetic unit tests.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as b } from '../src/config/balance';
import { runM2 } from './bot-m2';
import { VAR_DEFAULT } from './seller-variance';
import { loadTargets, l18to25Guard, p5T20Warning, quantile } from './pacing-guards';
const F1_CSV = '86f0e80e', MAIN_PRE_F1_CSV = '57d964d5';
const SEEDS = Array.from({ length: 100 }, (_, i) => i), HORIZON_S = 2 * 3600;
const csvSha = createHash('sha256').update(readFileSync(new URL('../data/economy.csv', import.meta.url))).digest('hex').slice(0, 8);
const t = loadTargets();
const known = csvSha === F1_CSV || csvSha === MAIN_PRE_F1_CSV;
describe(`AC7 worst-seed guards, workers variance bot (data/economy.csv ${csvSha})`, () => {
  it('economy CSV sha is known (else: update this suite)', () => { if (!known) throw new Error(`unknown economy CSV ${csvSha}: update AC7 worst-seed guards`); });
  it.skipIf(csvSha !== F1_CSV)('F1: L18-25 time on level P95/worst within bounds; P5 time-to-L20 warn', () => {
    const reaches = SEEDS.map(s => runM2(b, s, { model: 'seller15', T: HORIZON_S, variance: VAR_DEFAULT }).reach);
    const g = l18to25Guard(reaches, t), w = p5T20Warning(reaches, t);
    const t20 = reaches.map(r => r.get(20) ?? Infinity);
    console.log(`L18-25 time-on-level P95 ${g.p95.toFixed(1)}s worst ${g.worst.toFixed(1)}s, per-seed-max P95 ${g.perSeedMaxP95.toFixed(1)}s (info)`); console.log(`L18-25 P95 ${g.p95}s worst ${g.worst}s (bounds ${t.l18_25_step_p95_max_s}/${t.l18_25_step_worst_max_s}); workers t20 P5/P50/P95/worst ${[.05, .5, .95].map(p => quantile(t20, p)).join('/')}/${Math.max(...t20)}s (warn ${t.ac7_w_p5_t20_warn_s}s)`);
    if (w.warning) console.warn(w.warning);
    expect(g.failures).toEqual([]);
  }, 600_000);
});
