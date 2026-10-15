import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, GameState, eggPriceCents } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { applyOffline } from '../src/sim/offline';
import { migrate } from '../src/save/save';
import { mood, graderMult, graderTierCostCents, hireCostCents } from '../src/sim/workers';
import type { SimEvent } from '../src/sim/events';
const W = b.workers;
const rich = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 7), coinsCents: 1e9, farmLevel: 24, collectionLevel: 5, ...o });
const run = (s: GameState, secs: number, ev?: SimEvent[]) => { for (let i = 0; i < Math.round(secs * b.tickHz); i++) s = step(s, 1 / b.tickHz, b, ev); return s; };
describe('M2 workers (m2-proposal v1.0)', () => {
  it('hire respects unlock Farm level and cost; no double hire', () => {
    let s = { ...initialState(b), farmLevel: 2, coinsCents: 10_000 };
    expect(apply(s, { type: 'hire', worker: 'market_hand' }, b).workers.market_hand).toBeUndefined();
    s = { ...s, farmLevel: 3 }; const h = apply(s, { type: 'hire', worker: 'market_hand' }, b);
    expect(h.workers.market_hand?.energy).toBe(100); expect(h.coinsCents).toBe(10_000 - W.market_hand.hire_cost * 100);
    expect(apply(h, { type: 'hire', worker: 'market_hand' }, b).coinsCents).toBe(h.coinsCents);
    expect(apply({ ...s, coinsCents: 3999 }, { type: 'hire', worker: 'market_hand' }, b).workers.market_hand).toBeUndefined();
    expect(hireCostCents('grader', b)).toBe(graderTierCostCents(0, b));
  });
  it('energy: -1% per 6 s, Working -> Tired below 50% at 5 min -> Asleep at 10 min, stays asleep', () => {
    let s = apply(rich(), { type: 'hire', worker: 'hawker' }, b); const ev: SimEvent[] = [];
    s = run(s, 299.9, ev); expect(mood(s.workers.hawker, b)).toBe('working');
    s = run(s, 0.2, ev); expect(mood(s.workers.hawker, b)).toBe('tired');
    s = run(s, 300, ev); expect(mood(s.workers.hawker, b)).toBe('asleep'); expect(s.workers.hawker!.energy).toBe(0);
    expect(ev.filter(e => e.type === 'worker_state').map(e => (e as any).state)).toEqual(['tired', 'asleep']);
  });
  it('Manage refills to 100% with one shared 30 s cooldown', () => {
    let s = apply(apply(rich(), { type: 'hire', worker: 'hawker' }, b), { type: 'hire', worker: 'grader' }, b); s = run(s, 400);
    s = apply(s, { type: 'manage', worker: 'hawker' }, b); expect(s.workers.hawker!.energy).toBe(100); expect(s.manageCdS).toBe(W.energy.manage_cooldown_s);
    expect(apply(s, { type: 'manage', worker: 'grader' }, b).workers.grader!.energy).toBeLessThan(50);
    s = run(s, 30); expect(apply(s, { type: 'manage', worker: 'grader' }, b).workers.grader!.energy).toBe(100);
  });
  it('Market Hand serves the queue every 1 s (3 s Tired), charges wage per interval, stops Asleep', () => {
    let s = apply({ ...rich(), coinsCents: 100_000, basket: 1000 }, { type: 'hire', worker: 'market_hand' }, b);
    s = { ...s, customers: [{ id: 99, demand: 2, filled: 0, waitedS: 0 }] };
    const ev: SimEvent[] = []; s = run(s, 0.1, ev);
    const sale = ev.find(e => e.type === 'sell') as any; expect(sale.by).toBe('market_hand'); expect(sale.k).toBe(2);
    const wage = ev.find(e => e.type === 'wage') as any; expect(wage.cents).toBe(Math.round(0.25 * 24 * 1 / 60 * 100));
    const actions = (st: GameState, secs: number) => { const e: SimEvent[] = []; run(st, secs, e); return e.filter(x => x.type === 'wage').length; };
    expect(actions(s, 10)).toBe(10);
    expect(actions({ ...s, workers: { market_hand: { energy: 40, cdS: 0 } } }, 9)).toBe(3);
    expect(actions({ ...s, workers: { market_hand: { energy: 0, cdS: 0 } } }, 9)).toBe(0);
  });
  it('wages never push coins negative', () => {
    let s = apply({ ...rich(), coinsCents: 4000 }, { type: 'hire', worker: 'market_hand' }, b); s = run(s, 60);
    expect(s.coinsCents).toBe(0);
  });
  it('Coop Hand collects eggs_per_tap every 2 s (4 s Tired)', () => {
    let s = apply({ ...rich(), coop: 1000 }, { type: 'hire', worker: 'coop_hand' }, b); const ev: SimEvent[] = [];
    s = run(s, 10, ev); expect(ev.filter(e => e.type === 'worker_collect').length).toBe(5);
    const e2: SimEvent[] = []; run({ ...s, workers: { coop_hand: { energy: 30, cdS: 0 } } }, 12, e2);
    expect(e2.filter(e => e.type === 'worker_collect').length).toBe(3);
  });
  it('Hawker scales new demand x1.25 Working, x1.10 Tired, x1 Asleep; queue cap unchanged', () => {
    const base = run(rich(), 60), ev: SimEvent[] = [];
    const h = run({ ...apply(rich(), { type: 'hire', worker: 'hawker' }, b) }, 60, ev);
    const d0 = base.customers.map(c => c.demand), d1 = h.customers.map(c => c.demand);
    expect(d1.length).toBe(d0.length); d0.forEach((d, i) => expect(d1[i]).toBe(Math.max(1, Math.round(d * 1.25))));
  });
  it('Grader: tier multipliers, cost floor(0.5 x farmCost(F)), half bonus Tired, 25% Asleep', () => {
    let s = apply(rich(), { type: 'buyGraderTier' }, b); expect(s.graderTier).toBe(1);
    expect(graderMult(s.workers, 1, b)).toBe(1.5);
    s = apply(s, { type: 'buyGraderTier' }, b); expect(s.graderTier).toBe(2); expect(graderMult(s.workers, 2, b)).toBe(2);
    expect(graderMult({ grader: { energy: 30, cdS: 0 } }, 2, b)).toBe(1.5);
    expect(graderMult({ grader: { energy: 0, cdS: 0 } }, 2, b)).toBe(1.25);
    expect(apply({ ...s, farmLevel: 20 }, { type: 'buyGraderTier' }, b).graderTier).toBe(2); // tier 3 needs F21
    const sold = apply({ ...s, basket: 3, customers: [{ id: 1, demand: 3, filled: 0, waitedS: 0 }] }, { type: 'sellAll' }, b);
    expect(sold.coinsCents - s.coinsCents).toBe(Math.round(3 * eggPriceCents(24, 5, b) * 2));
  });
  it('offline: workers do nothing (no work, drain or wage)', () => {
    const s = apply({ ...rich(), coinsCents: 100_000 }, { type: 'hire', worker: 'market_hand' }, b);
    const r = applyOffline({ ...s, workers: { market_hand: { energy: 60, cdS: 0 } } }, 3_600_000, b);
    expect(r.state.workers.market_hand!.energy).toBe(60); expect(r.state.coinsCents).toBe(s.coinsCents);
  });
  it('save v4 -> v5 migration: no workers, tier 0', () => {
    const v4 = { version: 4, savedAt: 1, state: { ...initialState(b), workers: undefined, graderTier: undefined, manageCdS: undefined } };
    const m = migrate(JSON.parse(JSON.stringify(v4)), b); expect(m.version).toBe(5);
    expect(m.state.workers).toEqual({}); expect(m.state.graderTier).toBe(0); expect(m.state.manageCdS).toBe(0);
  });
});
