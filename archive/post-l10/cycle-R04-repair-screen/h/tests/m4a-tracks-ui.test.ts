import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { balancedStripText, balancedSegments, milestoneToast, trackLockText, trackGoalLabel } from '../src/ui/tracks-ui';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const st = (F: number, H: number, V: number) => ({ ...initialState(on), farmLevel: F, hensLevel: H, eggValueLevel: V });
describe('M4-A track copy (art-ux/m4-tracks-copy.md)', () => {
  it('Balanced strip strings', () => {
    expect(balancedStripText(st(3, 2, 1), on)).toBe('Balanced farm 0/5 · next +10% at all ≥ 5');
    expect(balancedStripText(st(12, 10, 11), on)).toBe('Balanced farm 2/5 · next +20% at all ≥ 15');
    expect(balancedStripText(st(30, 28, 25), on)).toBe('Balanced farm 5/5 · +30%');
    expect(balancedStripText(st(12, 10, 11), on, true)).toBe('Balanced farm 2 of 5. Weakest: Hens, level 10 of 15.');
    // v1.1 top tier: no Weakest clause; y comes from the top balanced_mult (templated, not hard-coded)
    expect(balancedStripText(st(30, 30, 30), on, true)).toBe('Balanced farm 5 of 5. Top tier, +30% income.');
    const alt: Balance = { ...on, m4: { ...on.m4!, milestones: { ...on.m4!.milestones, balanced: on.m4!.milestones.balanced.map((t, i, a) => i === a.length - 1 ? { ...t, mult: 1.4 } : t) } } };
    expect(balancedStripText(st(30, 30, 30), alt, true)).toBe('Balanced farm 5 of 5. Top tier, +40% income.');
  });
  it('lock and milestone toasts', () => {
    expect(trackLockText(7)).toBe('Needs Farm L8');
    expect(milestoneToast('hens:10', on)).toBe('Hens L10: bigger coop · offline ×1.25');
    expect(milestoneToast('grade:20', on)).toBe('Egg value L20: Jumbo ×1.5');
    expect(milestoneToast('balanced:2', on)).toBe('Balanced farm 2/5: +15% income');
  });
  it('toasts read mult from balance; all three Hens milestones', () => {
    for (const m of on.m4!.milestones.hens) expect(milestoneToast(`hens:${m.level}`, on)).toBe(`Hens L${m.level}: bigger coop · offline ×${m.offlineMult}`);
    expect(milestoneToast('grade:5', on)).toBe('Egg value L5: Grade A ×1.1');
  });
  it('M4A-19 one segment per track, fill min(L,N)/N, weakest marked (ties all)', () => {
    const g = balancedSegments(st(12, 10, 11), on);
    expect(g.map(x => x.track)).toEqual(['Hens', 'Egg value', 'Farm']);
    expect(g.map(x => x.fill)).toEqual([10 / 15, 11 / 15, 12 / 15]); expect(g.map(x => x.weakest)).toEqual([true, false, false]);
    expect(balancedSegments(st(4, 4, 9), on).map(x => x.weakest)).toEqual([true, false, true]);
    expect(balancedSegments(st(30, 28, 25), on).every(x => x.fill === 1 && !x.weakest)).toBe(true);
  });
  it('M4A-22 next-goal labels', () => {
    expect(trackGoalLabel('hens', 10, 9, on)).toBe('Hens L10: bigger coop'); expect(trackGoalLabel('hens', 11, 9, on)).toBe('Hens L11');
    expect(trackGoalLabel('eggValue', 10, 9, on)).toBe('Egg value L10: Large');
    expect(trackGoalLabel('eggValue', 20, 14, on)).toBe('Egg value L20'); expect(trackGoalLabel('eggValue', 20, 15, on)).toBe('Egg value L20: Jumbo');
  });
});
import { vi } from 'vitest';
import { highlightRow, highlightPick, milestoneHint, MILESTONE_HINT_WINDOW } from '../src/ui/tracks-ui';
import { candidates, selectGoal, GOAL_ORDER } from '../src/ui/next-goal';
import { bestPaybackAmong, paybackOf, BUY_ORDER } from '../src/econ/best-buy';
import { fmtAffordableIn } from '../src/ui/format';
describe('M4A-18 highlight = best payback (HoP 15:29) + next-goal', () => {
  const c = (F: number, H: number, V: number, coins: number) => ({ ...st(F, H, V), coinsCents: coins });
  const ROWS = ['FARM', 'HENS', 'VALUE'] as const, RK = { FARM: 'farm', HENS: 'hens', VALUE: 'eggValue' } as const;
  it('highlights the best-payback AFFORDABLE row; none affordable => no highlight, pick carries the best-payback row', () => {
    expect(highlightRow(c(0, 0, 0, 0), on)).toBeNull();
    const p0 = highlightPick(c(0, 0, 0, 0), on)!;
    expect(p0.affordable).toBe(false);
    expect(p0.row).toBe(RK[bestPaybackAmong(c(0, 0, 0, 0), on, [...ROWS])!.key as keyof typeof RK]);
    for (const [F, H, V] of [[5, 5, 5], [10, 12, 9], [12, 10, 14], [20, 20, 20]]) {
      const s = c(F, H, V, 1e12), pb = ROWS.map(k => paybackOf(s, on, k)), best = Math.min(...pb);
      expect(paybackOf(s, on, ROW_OF(highlightRow(s, on)!))).toBe(best);
    }
  });
  const ROW_OF = (r: string) => (r === 'farm' ? 'FARM' : r === 'hens' ? 'HENS' : 'VALUE');
  it('only affordable rows compete: when just one row is affordable it wins even with a worse payback', () => {
    const s0 = c(5, 5, 5, 0), cheapest = Math.min(on.m4!.hens.costs[5], on.m4!.eggValue.costs[5]);
    const p = highlightPick({ ...s0, coinsCents: cheapest * 100 }, on)!;
    expect(p.affordable).toBe(true); expect(p.costCents).toBe(cheapest * 100);
  });
  it('deterministic tie-breaks: equal payback => lower cost, then BUY_ORDER (Farm > Hens > Egg value)', () => {
    expect(BUY_ORDER.slice(0, 3)).toEqual(['FARM', 'HENS', 'VALUE']);
    const s = c(0, 3, 3, 1e12); // Hens + Egg value capped at F+3 => only Farm offered
    expect(highlightRow(s, on)).toBe('farm');
    expect(highlightPick(c(30, 30, 30, 1e12), on)).toBeNull(); // all MAX
    const a = highlightPick(c(7, 6, 8, 1e12), on), z = highlightPick(c(7, 6, 8, 1e12), on); expect(a).toEqual(z);
  });
  it('ETA copy when nothing is affordable (fmtAffordableIn)', () => {
    expect(fmtAffordableIn(null)).toBe('Affordable in —'); expect(fmtAffordableIn(5)).toBe('Affordable in a moment'); expect(fmtAffordableIn(75)).toBe('Affordable in ~1:15');
  });
  it('next-goal: GOAL_ORDER; HENS/VALUE only with the flag on, never capped/MAX; flag on uses the same best-payback pick', () => {
    expect(GOAL_ORDER.slice(0, 4)).toEqual(['FARM', 'HENS', 'VALUE', 'COLL']);
    expect(candidates(st(0, 0, 0), { ...balance, m4: { ...balance.m4!, enabled: 0 } }).map(x => x.key)).not.toContain('HENS'); // forced flag off (M4 ships on, D-CEO-20261019-01)
    expect(candidates(st(0, 0, 0), on).map(x => x.key)).toEqual(expect.arrayContaining(['HENS', 'VALUE']));
    expect(candidates(st(0, 3, 3), on).map(x => x.key)).not.toContain('HENS');
    expect(candidates(st(30, 30, 30), on).map(x => x.key).filter(k => k === 'HENS' || k === 'VALUE')).toEqual([]);
    const s = { ...st(10, 10, 10), collectionLevel: 30, coinsCents: 0 };
    const g = selectGoal(s, on, 100), want = bestPaybackAmong(s, on, candidates(s, on).map(x => x.key))!;
    expect(g.key).toBe(want.key); expect(g.state).toBe('waiting');
  });
});
describe('m4-tracks-copy v1.1 milestone hint', () => {
  const H = on.m4!.milestones.hens, G = on.m4!.milestones.grades;
  it('shown only within 5 levels of the next milestone (Hens)', () => {
    const n = H[0].level;
    expect(milestoneHint('hens', n - MILESTONE_HINT_WINDOW - 1, 0, on)).toBeNull();
    expect(milestoneHint('hens', n - MILESTONE_HINT_WINDOW, 0, on)).toBe(`Next at L${n}: bigger coop · offline ×${H[0].offlineMult}`);
    expect(milestoneHint('hens', n - 1, 0, on)).toBe(`Next at L${n}: bigger coop · offline ×${H[0].offlineMult}`);
  });
  it('hidden at the milestone level itself and at MAX', () => {
    for (const m of H) expect(milestoneHint('hens', m.level, 30, on)).toBeNull();
    expect(milestoneHint('hens', on.maxLevel, 30, on)).toBeNull(); expect(milestoneHint('eggValue', on.maxLevel, 30, on)).toBeNull();
    expect(milestoneHint('eggValue', G[0].level, 30, on)).toBeNull();
  });
  it('Egg value grades: window and copy from balance', () => {
    expect(milestoneHint('eggValue', 0, 0, on)).toBe(`Next at L${G[0].level}: Grade A ×${G[0].mult}`);
    expect(milestoneHint('eggValue', G[1].level - 1, 0, on)).toBe(`Next at L${G[1].level}: Large ×${G[1].mult}`);
    expect(milestoneHint('eggValue', G[1].level + 1, 0, on)).toBeNull(); // L11: next is L20, 9 levels away
    expect(milestoneHint('eggValue', G[2].level - 2, 15, on)).toBe(`Next at L${G[2].level}: Jumbo ×${G[2].mult}`);
  });
});
