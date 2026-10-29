// v5 F1c (engineering/m5.0-sizing.md §1 F1(c)): timed-effects registry feeding saleMultipliers() and prodEggsPerSec(),
// with `by` attribution (Rush = Market Hand sales only) and suspension on ticks without focus (D-C3, golden R23).
import { describe, it, expect, afterEach } from 'vitest';
import { balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply, sellTo } from '../src/sim/actions';
import { saleMultipliers, saleValueCents, sellAllPreview } from '../src/sim/payout';
import { prodEggsPerSec, salePriceCents } from '../src/sim/tracks';
import { graderMult } from '../src/sim/workers';
import { SALE_EFFECTS, LAY_EFFECTS, saleEffectFactors, layFactor, type SaleEffect, type LayEffect } from '../src/sim/effects';

const B = (flags?: Partial<Record<M5Flag, number>>, enabled = 1) => ({ ...balance, m4: { ...balance.m4!, enabled, ...(flags ? { flags } : {}) } });
// Fixture effects (values are test inputs, not tunables): a Frenzy-like x2 on all sales, a Rush-like x1.15 on Market Hand sales,
// a streak-like (1 + 0.28), and a Sweep-like x1.15 on laying.
const frenzy: SaleEffect = { id: 'frenzy', flag: 'golden', factor: () => 2 };
const rush: SaleEffect = { id: 'rush', flag: 'abilities', factor: (_s, _b, c) => (c.by === 'market_hand' ? 1.15 : 1) };
const streak: SaleEffect = { id: 'streak', flag: 'streak', factor: () => 1.28 };
const sweep: LayEffect = { id: 'sweep', flag: 'abilities', factor: () => 1.15 };
afterEach(() => { SALE_EFFECTS.length = 0; LAY_EFFECTS.length = 0; });
const farm = (b: any): GameState => ({ ...initialState(b, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, graderTier: 2, basket: 500, coinsCents: 0,
  workers: { grader: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } }, customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }] });

describe('F1c registry composition', () => {
  it('empty registry: saleMultipliers is exactly [grader] (pre-F1c behaviour)', () => {
    const b = B({ golden: 1, streak: 1, abilities: 1 }), s = farm(b);
    expect(saleMultipliers(s, b)).toEqual([graderMult(s.workers, s.graderTier, b)]);
    expect(prodEggsPerSec(s, b, { suspended: false })).toBe(prodEggsPerSec(s, b));
  });
  it('factors multiply with the Grader and round once (golden X7 example shape)', () => {
    SALE_EFFECTS.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s = farm(b);
    const g = graderMult(s.workers, s.graderTier, b), base = salePriceCents(s, b);
    expect(saleMultipliers(s, b)).toEqual([g, 2, 1.28]);
    expect(saleValueCents(s, 10, b)).toBe(Math.round(10 * base * g * 2 * 1.28));
    expect(saleEffectFactors(s, b)).toEqual([{ id: 'frenzy', factor: 2 }, { id: 'streak', factor: 1.28 }]);
  });
  it('an entry whose flag is off (or m4.enabled off) is never consulted', () => {
    let called = 0; SALE_EFFECTS.push({ id: 'x', flag: 'golden', factor: () => { called++; return 2; } });
    for (const b of [B(), B({ streak: 1 }), B({ golden: 1 }, 0)]) expect(saleMultipliers(farm(b), b)).toHaveLength(1);
    expect(called).toBe(0);
  });
  it('by attribution: Rush applies to Market Hand sales only; Frenzy to both', () => {
    SALE_EFFECTS.push(frenzy, rush); const b = B({ golden: 1, abilities: 1 }), s = farm(b), g = graderMult(s.workers, s.graderTier, b);
    expect(saleMultipliers(s, b, { by: 'player' })).toEqual([g, 2]);
    expect(saleMultipliers(s, b, { by: 'market_hand' })).toEqual([g, 2, 1.15]);
    const base = salePriceCents(s, b), k = Math.min(10, s.basket);
    expect(sellTo(s, 1, b, undefined, 'player').coinsCents).toBe(Math.round(k * base * g * 2));
    expect(sellTo(s, 1, b, undefined, 'market_hand').coinsCents).toBe(Math.round(k * base * g * 2 * 1.15));
  });
  it('suspended (no focus): every timed effect counts as 1, Grader stays', () => {
    SALE_EFFECTS.push(frenzy, rush); LAY_EFFECTS.push(sweep); const b = B({ golden: 1, abilities: 1 }), s = farm(b);
    expect(saleMultipliers(s, b, { by: 'market_hand', suspended: true })).toEqual([graderMult(s.workers, s.graderTier, b)]);
    expect(sellTo(s, 1, b, undefined, 'market_hand', true).coinsCents).toBe(sellTo(farm(B()), 1, B(), undefined, 'market_hand').coinsCents);
    expect(layFactor(s, b, { suspended: true })).toBe(1);
  });
  it('preview == credit: Sell all preview equals the sellAll action with live effects', () => {
    SALE_EFFECTS.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s = farm(b);
    expect(apply(s, { type: 'sellAll' }, b).coinsCents - s.coinsCents).toBe(sellAllPreview(s, b).cents);
  });
});

describe('F1c laying (prodEggsPerSec)', () => {
  it('Sweep-like factor applies only with a live ctx: offline / income / golden E (no ctx) see the base rate', () => {
    LAY_EFFECTS.push(sweep); const b = B({ abilities: 1 }), s = farm(b), base = prodEggsPerSec(s, b);
    expect(prodEggsPerSec(s, b, { suspended: false })).toBeCloseTo(base * 1.15, 12);
    expect(prodEggsPerSec(s, b, { suspended: true })).toBe(base);
    expect(prodEggsPerSec(s, b)).toBe(base);
  });
  it('tick: laying uplift only on focus ticks, still capped by the coop', () => {
    LAY_EFFECTS.push(sweep); const b = B({ abilities: 1 }), s0 = { ...farm(b), coop: 0, workers: {} };
    const on = step(s0, 0.1, b, undefined, { focus: true }), off = step(s0, 0.1, b, undefined, { focus: false });
    expect(on.coop).toBeCloseTo(off.coop * 1.15, 9);
    const full = step({ ...s0, coop: 1e9 }, 0.1, b, undefined, { focus: true });
    expect(full.coop).toBe(step({ ...s0, coop: 1e9 }, 0.1, B(), undefined).coop);
  });
  it('tick: worker sales get effects on focus ticks and none on suspended ticks', () => {
    SALE_EFFECTS.push(frenzy); const b = B({ golden: 1 });
    const s0 = { ...farm(b), coinsCents: 1_000_000, workers: { market_hand: { energy: 100, cdS: 0 } } };
    const ev1: any[] = [], ev2: any[] = [];
    step(s0, 0.1, b, ev1, { focus: true }); step(s0, 0.1, b, ev2, { focus: false });
    const v = (ev: any[]) => ev.find(e => e.type === 'sell' && e.by === 'market_hand')?.value;
    expect(v(ev1)).toBeGreaterThan(0); expect(v(ev1)).toBe(Math.round(v(ev2) * 2));
  });
});

describe('F1c flags off = byte-identical', () => {
  it('a registry entry whose flag is off changes nothing over 10 min of play', () => {
    SALE_EFFECTS.push(frenzy, rush, streak); LAY_EFFECTS.push(sweep);
    const run = (b: any) => { let s: any = { ...initialState(b, 11), coinsCents: 5_000_000 }; const ev: any[] = [];
      for (let i = 0; i < 6000; i++) { s = step(s, 0.1, b, ev, { focus: true }); if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev); if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev); if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev); if (i === 400) s = apply(s, { type: 'hire', worker: 'market_hand' }, b, ev); }
      return JSON.stringify([s, ev]); };
    const withFx = run(B()); SALE_EFFECTS.length = 0; LAY_EFFECTS.length = 0;
    expect(withFx).toBe(run(B()));
  });
});

// D-HOP-2026-10-29-06 rulings on the F1c open questions.
import { Game } from '../src/game';
import { mem } from './helpers';
import { goldenEEggsPerSec } from '../src/sim/tracks';
describe('Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended', () => {
  const sale = (attended: boolean, viaGame: boolean) => {
    SALE_EFFECTS.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s0 = farm(b), ev: any[] = [];
    if (!viaGame) { apply(s0, { type: 'sell', customerId: 1 }, b, ev, attended); }
    else {
      const g = new Game(b as any, mem(), () => Date.UTC(2026, 9, 29, 12), 3); g.state = { ...s0 };
      g.setAttendedProbe(() => attended); g.dispatch({ type: 'sell', customerId: 1 });
      return { value: g.state.coinsCents - s0.coinsCents, s0, b };
    }
    return { value: ev.find(e => e.type === 'sell')!.value, s0, b };
  };
  for (const viaGame of [false, true]) it(`attended=true: Frenzy and streak apply; attended=false: suspended (${viaGame ? 'Game.dispatch + probe' : 'apply'})`, () => {
    const on = sale(true, viaGame); SALE_EFFECTS.length = 0; const off = sale(false, viaGame);
    const k = 10, g = graderMult(on.s0.workers, on.s0.graderTier, on.b), base = salePriceCents(on.s0, on.b);
    expect(on.value).toBe(Math.round(k * base * g * 2 * 1.28));
    expect(off.value).toBe(Math.round(k * base * g));
    expect(on.value).toBe(saleValueCents(on.s0, k, on.b)); // the sheet preview (default ctx, attended) == credit
  });
  it('sellAll follows the same rule; default (no attended arg) is attended', () => {
    SALE_EFFECTS.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s0 = farm(b);
    const a = apply(s0, { type: 'sellAll' }, b), t = apply(s0, { type: 'sellAll' }, b, undefined, true), f = apply(s0, { type: 'sellAll' }, b, undefined, false);
    expect(a.coinsCents).toBe(t.coinsCents); expect(t.coinsCents).toBe(sellAllPreview(s0, b).cents); expect(f.coinsCents).toBeLessThan(t.coinsCents);
  });
});
describe('Q-F1c-2 (D-HOP-2026-10-29-06): Sweep is excluded from golden E', () => {
  it('goldenEEggsPerSec is the base prodEggsPerSec (no ctx) even with a live Sweep', () => {
    LAY_EFFECTS.push(sweep); const b = B({ abilities: 1 }), s = farm(b);
    expect(goldenEEggsPerSec(s, b)).toBe(prodEggsPerSec(s, b));
    expect(prodEggsPerSec(s, b, { suspended: false })).toBeGreaterThan(goldenEEggsPerSec(s, b));
    LAY_EFFECTS.length = 0; expect(goldenEEggsPerSec(s, b)).toBe(prodEggsPerSec(s, b, { suspended: false }));
  });
});
