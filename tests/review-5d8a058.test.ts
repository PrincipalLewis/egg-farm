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
