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
import { highlightRow, HighlightHold } from '../src/ui/tracks-ui';
import { candidates, selectGoal, GOAL_ORDER } from '../src/ui/next-goal';
describe('M4A-18 highlight + M4A-22/23 next-goal', () => {
  const c = (F: number, H: number, V: number, coins: number) => ({ ...st(F, H, V), coinsCents: coins });
  it('cheapest affordable row, ties H > V > F, none if none affordable', () => {
    expect(highlightRow(c(0, 0, 0, 0), on)).toBeNull();
    expect(highlightRow(c(0, 0, 0, on.m4!.hens.costs[0] * 100), on)).toBe('hens');
    expect(highlightRow(c(0, 3, 0, 1e9), on)).toBe('eggValue'); // Hens capped at F+3
    expect(highlightRow(c(0, 3, 3, 1e9), on)).toBe('farm');
    const tie = { ...on, m4: { ...on.m4!, eggValue: { ...on.m4!.eggValue, costs: on.m4!.hens.costs } } };
    expect(highlightRow(c(0, 0, 0, 1e9), tie)).toBe('hens');
  });
  it('anti-flicker: oscillation faster than 2 ticks never flips; sustained flips on the 2nd tick; purchase applies at once', () => {
    const h = new HighlightHold(2); expect(h.tick('hens')).toBe('hens');
    for (let i = 0; i < 6; i++) { expect(h.tick(i % 2 ? 'hens' : null)).toBe('hens'); }
    expect(h.tick('farm')).toBe('hens'); expect(h.tick('farm')).toBe('farm');
    expect(h.tick('eggValue', true)).toBe('eggValue');
  });
  it('GOAL_ORDER; HENS/VALUE only with the flag on, never capped/MAX', () => {
    expect(GOAL_ORDER.slice(0, 4)).toEqual(['FARM', 'HENS', 'VALUE', 'COLL']);
    expect(candidates(st(0, 0, 0), balance).map(x => x.key)).not.toContain('HENS');
    expect(candidates(st(0, 0, 0), on).map(x => x.key)).toEqual(expect.arrayContaining(['HENS', 'VALUE']));
    expect(candidates(st(0, 3, 3), on).map(x => x.key)).not.toContain('HENS');
    expect(candidates(st(30, 30, 30), on).map(x => x.key).filter(k => k === 'HENS' || k === 'VALUE')).toEqual([]);
    const g = selectGoal({ ...st(0, 0, 0), collectionLevel: 30, coinsCents: on.m4!.hens.costs[0] * 100 }, on, 0);
    expect(g).toMatchObject({ key: 'HENS', tab: 'farm', label: 'Hens L1' });
  });
});
