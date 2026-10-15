import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, farmCost, collectionCost } from '../src/sim/state';
import { hireCostCents, graderTierCostCents } from '../src/sim/workers';
import { selectGoal, candidates, GoalHold, farmLabel } from '../src/ui/next-goal';
const st = (o: any = {}) => ({ ...initialState(b, 1), ...o });
const fc = (F: number) => farmCost(F, b) * 100, cc = (C: number) => collectionCost(C, b) * 100;
describe('next-goal selection (AC5)', () => {
  it('start state: Collection L1, no income -> dash (QA note 1)', () => {
    const g = selectGoal(st(), b, 0);
    expect(g).toMatchObject({ key: 'COLL', state: 'noincome', status: '—', tab: 'collection' });
    expect(g.label).toMatch(/^Collection L1: \+\d+\/tap$/);
    expect(selectGoal(st(), b, 100).state).toBe('waiting');
  });
  it('Ready picks the cheapest affordable; coins = cost counts', () => {
    const s = st({ farmLevel: 3, collectionLevel: 2, coinsCents: hireCostCents('market_hand', b) });
    const aff = candidates(s, b).filter(c => c.costCents <= s.coinsCents).sort((a, z) => a.costCents - z.costCents)[0];
    const g = selectGoal(s, b, 0); expect(g.state).toBe('ready'); expect(g.status).toBe('Ready!'); expect(g.key).toBe(aff.key);
  });
  it('Waiting picks the cheapest overall with a countdown', () => {
    const s = st({ farmLevel: 5, collectionLevel: 5, coinsCents: 0 });
    const min = Math.min(...candidates(s, b).map(c => c.costCents));
    const g = selectGoal(s, b, 100); expect(g.state).toBe('waiting'); expect(g.costCents).toBe(min); expect(g.status).toMatch(/^~/);
  });
  it('hired workers never appear; Grader appears as W4 at its tier level', () => {
    const s = st({ farmLevel: 18, workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } } });
    const keys = candidates(s, b).map(c => c.key); expect(keys).toEqual(['FARM', 'COLL', 'W4']);
    expect(candidates(s, b).find(c => c.key === 'W4')!.costCents).toBe(graderTierCostCents(0, b));
    expect(candidates(st({ farmLevel: 2 }), b).map(c => c.key)).toEqual(['FARM', 'COLL']);
  });
  it('tie-break FARM > COLL > W1 when costs are equal (crafted balance)', () => {
    const bb: any = { ...b, collection: { ...b.collection, baseCost: b.farm.baseCost, costGrowth: b.farm.costGrowth } };
    const s = st({ farmLevel: 0, collectionLevel: 0 });
    expect(selectGoal(s, bb, 1).key).toBe('FARM');
    expect(selectGoal({ ...s, coinsCents: 1e9 }, bb, 1).key).toBe('FARM');
    const bw: any = { ...b, workers: { ...b.workers, market_hand: { ...b.workers.market_hand, hire_cost: collectionCost(4, b) } } };
    expect(selectGoal(st({ farmLevel: 30, collectionLevel: 4 }), bw, 1).key).toBe('COLL');
    expect(selectGoal(st({ farmLevel: 30, collectionLevel: 30 }), bw, 1).key).toBe('W1');
  });
  it('Farm suffixes: unlock > new coop > Grader tier', () => {
    expect(farmLabel(2, b)).toBe('Farm L3: unlock Market Hand'); expect(farmLabel(6, b)).toBe('Farm L7: unlock Coop Hand');
    expect(farmLabel(4, b)).toBe('Farm L5: new coop'); expect(farmLabel(17, b)).toBe('Farm L18: Grader tier 1'); expect(farmLabel(10, b)).toBe('Farm L11');
    expect(farmLabel(2, b).length).toBeLessThanOrEqual(27);
  });
  it('Done when nothing is left', () => {
    const ws = Object.fromEntries(['market_hand', 'coop_hand', 'hawker', 'grader'].map(k => [k, { energy: 100, cdS: 0 }]));
    expect(selectGoal(st({ farmLevel: 30, collectionLevel: 30, workers: ws, graderTier: b.workers.grader.tiers.length }), b, 0)).toMatchObject({ state: 'done', label: 'All upgrades done!', key: null });
  });
});
describe('next-goal anti-flicker hold', () => {
  const s0 = st({ coinsCents: cc(0) - 1 }), s1 = st({ coinsCents: cc(0) });
  it('Ready<->Waiting applies only after 2 consecutive ticks', () => {
    const h = new GoalHold(2); expect(h.tick(selectGoal(s0, b, 10)).state).toBe('waiting');
    expect(h.tick(selectGoal(s1, b, 10)).state).toBe('waiting'); // 1st tick: held
    expect(h.tick(selectGoal(s0, b, 10)).state).toBe('waiting'); // back: pending reset
    expect(h.tick(selectGoal(s1, b, 10)).state).toBe('waiting');
    expect(h.tick(selectGoal(s1, b, 10)).state).toBe('ready'); // held 2 ticks
  });
  it('a purchase updates immediately', () => {
    const h = new GoalHold(2); h.tick(selectGoal(s1, b, 10));
    expect(h.tick(selectGoal(st({ collectionLevel: 1, coinsCents: 0 }), b, 10), true).label).toMatch(/^Collection L2/);
  });
  it('countdown text on the same target updates every tick', () => {
    const h = new GoalHold(2); const a = h.tick(selectGoal(s0, b, 1)); const z = h.tick(selectGoal(st({ coinsCents: 0 }), b, 1));
    expect(z.status).not.toBe(a.status); void fc;
  });
});
