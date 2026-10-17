import { describe, it, expect } from 'vitest';
import { fmtGoalEta, fmtTimeToAfford } from '../src/ui/format';

describe('review 5d8a058 #2: hour-boundary rounding carries minutes into hours', () => {
  it('fmtGoalEta never prints 60m', () => {
    for (let h = 1; h <= 3; h++) for (let s = h * 3600 + 3570; s < h * 3600 + 3600; s++) { expect(fmtGoalEta(s)).toBe(`~${h + 1}h`); }
    expect(fmtGoalEta(7170)).toBe('~2h'); expect(fmtGoalEta(3600 + 29 * 60)).toBe('~1h 29m');
  });
  it('fmtTimeToAfford never prints 60 min', () => {
    expect(fmtTimeToAfford(3599)).toBe('~1 h'); expect(fmtTimeToAfford(7170)).toBe('~2 h');
    for (let s = 3570; s < 3600; s++) expect(fmtTimeToAfford(s + 3600)).not.toMatch(/60 min/);
  });
});
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { selectGoal, GoalHysteresis, goalAria, goalButtonAria, type Goal } from '../src/ui/next-goal';

const st = (o: any = {}) => ({ ...initialState(b, 1), ...o });
const refillGoal = (key: any): Goal => ({ ...selectGoal(st({ coinsCents: 0 }), b), key, state: 'refill', payback: 0, label: 'Refill', status: '' } as Goal);

describe('review 5d8a058 #3/#16: goal aria', () => {
  it('refill aria names the worker, never the W key', () => {
    for (const [k, n] of [['W1', 'Market Hand'], ['W2', 'Coop Hand'], ['W3', 'Hawker'], ['W4', 'Grader']]) {
      const a = goalAria(refillGoal(k)); expect(a).toContain(n); expect(a).not.toMatch(/\bW\d\b/);
    }
  });
  it('button aria-label starts with the visible text and says the goal name once', () => {
    const g = selectGoal(st({ coinsCents: 0 }), b); const vis = `${g.label} ${g.status}`.trim();
    const a = goalButtonAria(vis, g); expect(a.startsWith(vis)).toBe(true);
    const name = g.label.replace(/^★\s*/, '').split(/[·:,]/)[0].trim(); expect(a.split(name).length - 1).toBe(1);
  });
});
describe('review 5d8a058 #4: shown Refill never re-derives as "All upgrades done!"', () => {
  it('due tick with a different pick replaces the refill goal', () => {
    const h = new GoalHysteresis(5000); const s = st({ coinsCents: 1e6, workers: { market_hand: { energy: 100, cdS: 0 } } });
    h.tick(s, b, 0); (h as any).shown = refillGoal('W1');
    const g = h.tick(s, b, 6000);
    expect(g.state).not.toBe('done'); expect(g.label).not.toMatch(/All upgrades done/); expect(g.key).toBe(selectGoal(s, b).key);
  });
});
import { incomePerSec } from '../src/econ/income';
import { rateView, headerRateText } from '../src/ui/s2-economy-ui';
import { workerBannerText, workersHtml, manageCaption } from '../src/ui/workers-ui';
import { mood } from '../src/sim/workers';

describe('PM Workers ruling (a): header shows the real rate; banners name the role and its real effect', () => {
  const ws = (o: any) => ({ market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, ...o });
  const S = (workers: any) => st({ farmLevel: 30, collectionLevel: 20, coinsCents: 1e9, celebratedTier: 3, graderTier: 1, workers });
  it('asleep Hawker and asleep Grader: rate > 0, not red, no "stopped"', () => {
    const s = S(ws({ hawker: { energy: 0, cdS: 0 }, grader: { energy: 0, cdS: 0 } }));
    expect(mood(s.workers.hawker, b)).toBe('asleep'); expect(mood(s.workers.grader, b)).toBe('asleep');
    const cps = incomePerSec(s, b) * 100; expect(cps).toBeGreaterThan(0);
    const v = rateView(cps, { stopped: cps <= 0 }); expect(v.sign).toBe('pos'); expect(headerRateText(v)).not.toMatch(/⚠|▼/); expect(v.aria).not.toMatch(/stopped/);
    expect(workerBannerText('hawker', 'asleep', s, b)).toBe('💤 Hawker asleep: sales slowed');
    expect(workerBannerText('grader', 'asleep', s, b)).toBe(`💤 Asleep, bonus down to ${Math.round(b.workers.grader.asleep_bonus_share * 100)}%`);
    expect(workersHtml(s, b)).not.toMatch(/production stopped/);
  });
  it('asleep Coop Hand: collecting slowed; unpaid follows the same rule', () => {
    const s = S(ws({ coop_hand: { energy: 0, cdS: 0 } }));
    expect(incomePerSec(s, b)).toBeGreaterThan(0); expect(workerBannerText('coop_hand', 'asleep', s, b)).toBe('💤 Coop Hand asleep: collecting slowed');
    const u = S(ws({ market_hand: { energy: 50, cdS: 0, unpaid: true } }));
    expect(incomePerSec(u, b)).toBeGreaterThan(0); expect(workerBannerText('market_hand', 'unpaid', u, b)).toBe('⚠ Market Hand unpaid: sales slowed');
  });
  it('"stopped" only at a true zero (live net rate <= 0, i.e. wages >= sales)', () => {
    const bw = { ...b, workers: { ...b.workers, coop_hand: { ...b.workers.coop_hand, wage_per_farm_per_min: 1e6 } } } as any;
    const s = st({ farmLevel: 1, coinsCents: 0, workers: { market_hand: { energy: 0, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 } } });
    expect(incomePerSec(s, bw)).toBeLessThanOrEqual(0);
    expect(workerBannerText('market_hand', 'asleep', s, bw)).toBe('💤 Asleep, production stopped');
    expect(workerBannerText('market_hand', 'asleep', s, b)).toBe('💤 Market Hand asleep: sales slowed');
    const v = rateView(incomePerSec(s, bw) * 100, { stopped: true }); expect(v.sign).toBe('neg'); expect(v.aria).toContain('production stopped');
  });
  it('review #8: copy numbers come from balance', () => {
    const b2 = { ...b, workers: { ...b.workers, energy: { ...b.workers.energy, manage_prompt_threshold: 0.5 }, grader: { ...b.workers.grader, asleep_bonus_share: 0.2 } } } as any;
    expect(manageCaption({ energy: 90, cdS: 0 } as any, 0, b2)).toBe('Rested, refill below 50%');
    expect(workerBannerText('grader', 'asleep', S(ws({})), b2)).toContain('20%');
  });
});
