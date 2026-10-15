import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { mood, isYawning, showManageAll, graderMult } from '../src/sim/workers';
import { workersHtml, manageAllHtml } from '../src/ui/workers-ui';
import type { SimEvent } from '../src/sim/events';
const E = b.workers.energy;
const run = (s: GameState, secs: number, ev?: SimEvent[]) => { for (let i = 0; i < Math.round(secs * b.tickHz); i++) s = step(s, 1 / b.tickHz, b, ev); return s; };
const base = (o: Partial<GameState> = {}): GameState => ({ ...initialState(b, 3), farmLevel: 10, collectionLevel: 3, nextCustomerInS: 1e9, ...o });
const wk = (energy: number, unpaid = false) => ({ energy, cdS: 0, ...(unpaid ? { unpaid } : {}) });
describe('M2 Workers v1.1 (m2-proposal §8 items 15-16, §10)', () => {
  it('yawn cue at <= yawn_at_pct (40), still Working above tired threshold; not at 0 or Unpaid', () => {
    expect(E.yawn_at_pct).toBe(40);
    expect(isYawning(wk(41), b)).toBe(false); expect(isYawning(wk(40), b)).toBe(true);
    expect(mood(wk(35), b)).toBe('working'); expect(isYawning(wk(0), b)).toBe(false); expect(isYawning(wk(30, true), b)).toBe(false);
    const html = workersHtml(base({ workers: { hawker: wk(39) } }), b);
    expect(html).toContain('overlay-yawn.svg'); expect(html).toContain('wk working yawn');
    expect(workersHtml(base({ workers: { hawker: wk(60) } }), b)).not.toContain('overlay-yawn');
  });
  it('Manage all shown only with >= manage_all_min_workers hired; refills all, one shared cooldown', () => {
    const two = base({ workers: { hawker: wk(20), grader: wk(50) }, graderTier: 1 });
    expect(showManageAll(two.workers, b)).toBe(false); expect(manageAllHtml(two, b)).toBe('');
    expect(apply(two, { type: 'manageAll' }, b)).toBe(two);
    const three = base({ workers: { hawker: wk(20), grader: wk(50), market_hand: wk(100) }, graderTier: 1 });
    expect(manageAllHtml(three, b)).toContain('(2 need it)');
    const ev: SimEvent[] = []; const m = apply(three, { type: 'manageAll' }, b, ev);
    expect([m.workers.hawker!.energy, m.workers.grader!.energy, m.workers.market_hand!.energy]).toEqual([100, 100, 100]);
    expect(m.manageCdS).toBe(E.manage_cooldown_s);
    expect(ev.filter(e => e.type === 'worker_manage_all')).toHaveLength(1); // one tap = one Manage action (AC-W5)
    const tired = { ...m, workers: { ...m.workers, hawker: wk(10) } };
    expect(apply(tired, { type: 'manage', worker: 'hawker' }, b)).toBe(tired); // individual Manage shares the cooldown
    const single = apply({ ...three, manageCdS: 0 }, { type: 'manage', worker: 'hawker' }, b);
    expect(apply(single, { type: 'manageAll' }, b)).toBe(single); // and vice versa
    expect(manageAllHtml(single, b)).toMatch(/0:30.*|aria-disabled="true"/);
  });
  it('ruling 4: Manage all disabled ("All rested") when everyone is at 100%, starts no cooldown', () => {
    const full = base({ workers: { hawker: wk(100), grader: wk(100), market_hand: wk(100) }, graderTier: 1 });
    expect(apply(full, { type: 'manageAll' }, b)).toBe(full);
    expect(manageAllHtml(full, b)).toContain('All rested'); expect(manageAllHtml(full, b)).toContain('aria-disabled="true"');
  });
  it('wage short -> Unpaid: no charge, no action, acts as Asleep, no drain (ruling 1)', () => {
    const ev: SimEvent[] = [];
    let s = run(base({ coinsCents: 1, basket: 100, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }], workers: { market_hand: wk(80) } }), 0.1, ev);
    expect(s.workers.market_hand!.unpaid).toBe(true); expect(mood(s.workers.market_hand, b)).toBe('unpaid');
    expect(s.coinsCents).toBe(1); expect(ev.some(e => e.type === 'sell')).toBe(false);
    const e0 = s.workers.market_hand!.energy; s = run(s, 60); expect(s.workers.market_hand!.energy).toBe(e0); expect(s.basket).toBe(100);
    expect(graderMult({ grader: wk(80, true) }, 2, b)).toBeCloseTo(1 + b.workers.grader.asleep_bonus_share, 12);
    expect(workersHtml(s, b)).toContain('Unpaid');
  });
  it('ruling 2: Manage / Manage all refill an Unpaid worker; it stays Unpaid', () => {
    const s = base({ workers: { market_hand: wk(50, true), hawker: wk(50), grader: wk(50) }, graderTier: 1 });
    const m1 = apply(s, { type: 'manage', worker: 'market_hand' }, b);
    expect(m1.workers.market_hand).toEqual({ energy: 100, cdS: 0, unpaid: true });
    const m2 = apply(s, { type: 'manageAll' }, b); expect(m2.workers.market_hand!.unpaid).toBe(true); expect(m2.workers.market_hand!.energy).toBe(100);
  });
  it('ruling 3: buying a Grader tier does not refill energy', () => {
    const s = base({ farmLevel: 19, coinsCents: 1e9, workers: { grader: wk(42) }, graderTier: 1 });
    const t = apply(s, { type: 'buyGraderTier' }, b); expect(t.graderTier).toBe(2); expect(t.workers.grader!.energy).toBe(42);
  });
  // F10: W1 = $2.50/min, W2 = $5.00/min (QA example, §8 item 16)
  const resume = (coins: number, w1Unpaid = true) => run(base({ coinsCents: coins, workers: { market_hand: wk(90, w1Unpaid), coop_hand: wk(90, true) } }), 0.1);
  it('ruling 5 + R9: resume W1 then W2, reserving 1 min for already-paid and earlier-resumed workers', () => {
    let s = resume(600); expect(s.workers.market_hand!.unpaid).toBe(false); expect(s.workers.coop_hand!.unpaid).toBe(true);
    s = resume(749); expect(s.workers.coop_hand!.unpaid).toBe(true);
    s = resume(750); expect(s.workers.market_hand!.unpaid).toBe(false); expect(s.workers.coop_hand!.unpaid).toBe(false);
    expect(resume(749, false).workers.coop_hand!.unpaid).toBe(true); // W1 Working: W2 needs $7.50
    expect(resume(750, false).workers.coop_hand!.unpaid).toBe(false);
    expect(resume(249).workers.market_hand!.unpaid).toBe(true); // W1 needs $2.50
  });
});
