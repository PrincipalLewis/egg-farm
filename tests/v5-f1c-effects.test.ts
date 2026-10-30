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
import { SALE_EFFECTS, LAY_EFFECTS, saleEffectFactors, layFactor, playerSaleCtx, type SaleEffect, type LayEffect } from '../src/sim/effects';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const B = (flags?: Partial<Record<M5Flag, number>>, enabled = 1) => ({ ...balance, m4: { ...balance.m4!, enabled, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as typeof balance;
// Fixture effects (values are test inputs, not tunables): a Frenzy-like x2 on all sales, a Rush-like x1.15 on Market Hand sales,
// a streak-like (1 + 0.28), and a Sweep-like x1.15 on laying.
const frenzy: SaleEffect = { id: 'frenzy', flag: 'golden', factor: () => 2 };
const rush: SaleEffect = { id: 'rush', flag: 'abilities', factor: (_s, _b, c) => (c.by === 'market_hand' ? 1.15 : 1) };
const streak: SaleEffect = { id: 'streak', flag: 'streak', factor: () => 1.28 };
const sweep: LayEffect = { id: 'sweep', flag: 'abilities', factor: () => 1.15 };
const SALE = SALE_EFFECTS as SaleEffect[], LAY = LAY_EFFECTS as LayEffect[]; // test-only fixture seam (registries are readonly in src)
afterEach(() => { SALE.length = 0; LAY.length = 0; });
const farm = (b: any): GameState => ({ ...initialState(b, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, graderTier: 2, basket: 500, coinsCents: 0,
  workers: { grader: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } }, customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }] });

describe('F1c registry composition', () => {
  it('[F1(c)] empty registry: saleMultipliers is exactly [grader] (pre-F1c behaviour)', () => {
    const b = B({ golden: 1, streak: 1, abilities: 1 }), s = farm(b);
    expect(saleMultipliers(s, b)).toEqual([graderMult(s.workers, s.graderTier, b)]);
    expect(prodEggsPerSec(s, b, { suspended: false })).toBe(prodEggsPerSec(s, b));
  });
  it('[F1(c)][X7] factors multiply with the Grader and round once (golden X7 example shape)', () => {
    SALE.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s = farm(b);
    const g = graderMult(s.workers, s.graderTier, b), base = salePriceCents(s, b);
    expect(saleMultipliers(s, b)).toEqual([g, 2, 1.28]);
    expect(saleValueCents(s, 10, b)).toBe(Math.round(10 * base * g * 2 * 1.28));
    expect(saleEffectFactors(s, b)).toEqual([{ id: 'frenzy', factor: 2 }, { id: 'streak', factor: 1.28 }]);
  });
  it('[F1(c)][D-C1] an entry whose flag is off (or m4.enabled off) is never consulted', () => {
    let called = 0; SALE.push({ id: 'x', flag: 'golden', factor: () => { called++; return 2; } });
    for (const b of [B(), B({ streak: 1 }), B({ golden: 1 }, 0)]) expect(saleMultipliers(farm(b), b)).toHaveLength(1);
    expect(called).toBe(0);
  });
  it('[F1(c)] by attribution: Rush applies to Market Hand sales only; Frenzy to both', () => {
    SALE.push(frenzy, rush); const b = B({ golden: 1, abilities: 1 }), s = farm(b), g = graderMult(s.workers, s.graderTier, b);
    expect(saleMultipliers(s, b, { by: 'player' })).toEqual([g, 2]);
    expect(saleMultipliers(s, b, { by: 'market_hand' })).toEqual([g, 2, 1.15]);
    const base = salePriceCents(s, b), k = Math.min(10, s.basket);
    expect(sellTo(s, 1, b, undefined, 'player').coinsCents).toBe(Math.round(k * base * g * 2));
    expect(sellTo(s, 1, b, undefined, 'market_hand').coinsCents).toBe(Math.round(k * base * g * 2 * 1.15));
  });
  it('[F1(c)][D-C3] suspended (no focus): every timed effect counts as 1, Grader stays', () => {
    SALE.push(frenzy, rush); LAY.push(sweep); const b = B({ golden: 1, abilities: 1 }), s = farm(b);
    expect(saleMultipliers(s, b, { by: 'market_hand', suspended: true })).toEqual([graderMult(s.workers, s.graderTier, b)]);
    expect(sellTo(s, 1, b, undefined, 'market_hand', true).coinsCents).toBe(sellTo(farm(B()), 1, B(), undefined, 'market_hand').coinsCents);
    expect(layFactor(s, b, { suspended: true })).toBe(1);
  });
  it('[F1(c)][CCR-80-m1] preview == credit: Sell all preview equals the sellAll action with live effects', () => {
    SALE.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s = farm(b);
    expect(apply(s, { type: 'sellAll' }, b).coinsCents - s.coinsCents).toBe(sellAllPreview(s, b).cents);
  });
});

describe('F1c laying (prodEggsPerSec)', () => {
  it('[F1(c)] helper: prodEggsPerSec applies a Sweep-like factor only with a live ctx; with no ctx it returns the base rate (callers: see [§9.5-e3])', () => {
    LAY.push(sweep); const b = B({ abilities: 1 }), s = farm(b), base = prodEggsPerSec(s, b);
    expect(prodEggsPerSec(s, b, { suspended: false })).toBeCloseTo(base * 1.15, 12);
    expect(prodEggsPerSec(s, b, { suspended: true })).toBe(base);
    expect(prodEggsPerSec(s, b)).toBe(base);
  });
  it('[F1(c)][D-C3] tick: laying uplift only on focus ticks, still capped by the coop', () => {
    LAY.push(sweep); const b = B({ abilities: 1 }), s0 = { ...farm(b), coop: 0, workers: {} };
    const on = step(s0, 0.1, b, undefined, { focus: true }), off = step(s0, 0.1, b, undefined, { focus: false });
    expect(on.coop).toBeCloseTo(off.coop * 1.15, 9);
    const full = step({ ...s0, coop: 1e9 }, 0.1, b, undefined, { focus: true });
    expect(full.coop).toBe(step({ ...s0, coop: 1e9 }, 0.1, B(), undefined).coop);
  });
  it('[F1(c)][D-C3] tick: worker sales get effects on focus ticks and none on suspended ticks', () => {
    SALE.push(frenzy); const b = B({ golden: 1 });
    const s0 = { ...farm(b), coinsCents: 1_000_000, workers: { market_hand: { energy: 100, cdS: 0 } } };
    const ev1: any[] = [], ev2: any[] = [];
    step(s0, 0.1, b, ev1, { focus: true }); step(s0, 0.1, b, ev2, { focus: false });
    const v = (ev: any[]) => ev.find(e => e.type === 'sell' && e.by === 'market_hand')?.value;
    expect(v(ev1)).toBeGreaterThan(0); expect(v(ev1)).toBe(Math.round(v(ev2) * 2));
  });
});

describe('F1c flags off = byte-identical', () => {
  it('[F1(c)][AC-M5A-16] a registry entry whose flag is off changes nothing over 10 min of play', () => {
    SALE.push(frenzy, rush, streak); LAY.push(sweep);
    const run = (b: any) => { let s: any = { ...initialState(b, 11), coinsCents: 5_000_000 }; const ev: any[] = [];
      for (let i = 0; i < 6000; i++) { s = step(s, 0.1, b, ev, { focus: true }); if (i % 3 === 0) s = apply(s, { type: 'collect' }, b, ev); if (i % 50 === 0) s = apply(s, { type: 'sellAll' }, b, ev); if (i % 97 === 0) s = apply(s, { type: 'buyFarm' }, b, ev); if (i === 400) s = apply(s, { type: 'hire', worker: 'market_hand' }, b, ev); }
      return JSON.stringify([s, ev]); };
    const withFx = run(B()); SALE.length = 0; LAY.length = 0;
    expect(withFx).toBe(run(B()));
  });
});

// D-HOP-2026-10-29-06 rulings on the F1c open questions.
import { Game } from '../src/game';
import { mem } from './helpers';
import { goldenEEggsPerSec } from '../src/sim/tracks';
describe('Q-F1c-1 (D-HOP-2026-10-29-06): the Market sheet is a play surface; a player sale is suspended only when not attended', () => {
  const sale = (attended: boolean, viaGame: boolean) => {
    SALE.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s0 = farm(b), ev: any[] = [];
    if (!viaGame) { apply(s0, { type: 'sell', customerId: 1 }, b, ev, attended); }
    else {
      const g = new Game(b as any, mem(), () => Date.UTC(2026, 9, 29, 12), 3); g.state = { ...s0 };
      g.setAttendedProbe(() => attended); g.dispatch({ type: 'sell', customerId: 1 });
      return { value: g.state.coinsCents - s0.coinsCents, s0, b };
    }
    return { value: ev.find(e => e.type === 'sell')!.value, s0, b };
  };
  for (const viaGame of [false, true]) it(`[Q-F1c-1] attended=true: Frenzy and streak apply; attended=false: suspended (${viaGame ? 'Game.dispatch + probe' : 'apply'})`, () => {
    const on = sale(true, viaGame); SALE.length = 0; const off = sale(false, viaGame);
    const k = 10, g = graderMult(on.s0.workers, on.s0.graderTier, on.b), base = salePriceCents(on.s0, on.b);
    expect(on.value).toBe(Math.round(k * base * g * 2 * 1.28));
    expect(off.value).toBe(Math.round(k * base * g));
    expect(on.value).toBe(saleValueCents(on.s0, k, on.b)); // the sheet preview (default ctx, attended) == credit
  });
  it('[Q-F1c-1] sellAll follows the same rule; default (no attended arg) is attended', () => {
    SALE.push(frenzy, streak); const b = B({ golden: 1, streak: 1 }), s0 = farm(b);
    const a = apply(s0, { type: 'sellAll' }, b), t = apply(s0, { type: 'sellAll' }, b, undefined, true), f = apply(s0, { type: 'sellAll' }, b, undefined, false);
    expect(a.coinsCents).toBe(t.coinsCents); expect(t.coinsCents).toBe(sellAllPreview(s0, b).cents); expect(f.coinsCents).toBeLessThan(t.coinsCents);
  });
  for (const viaGame of [false, true]) for (const attended of [true, false]) it(`[CCR-80-m1][Q-F1c-1] x2 test effect, attended=${attended}: Sell all and order-card previews == credit (${viaGame ? 'Game.playerSaleCtx + dispatch' : 'playerSaleCtx + apply'})`, () => {
    SALE.push(frenzy); const b = B({ golden: 1 }), s0: GameState = { ...farm(b), customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }, { id: 2, demand: 7, filled: 3, waitedS: 0 }] };
    let ctx, credit: number;
    if (viaGame) {
      const g = new Game(b as any, mem(), () => Date.UTC(2026, 9, 29, 12), 3); g.state = { ...s0 }; g.setAttendedProbe(() => attended);
      ctx = g.playerSaleCtx(); g.dispatch({ type: 'sellAll' }); credit = g.state.coinsCents - s0.coinsCents;
    } else { ctx = playerSaleCtx(attended); credit = apply(s0, { type: 'sellAll' }, b, undefined, attended).coinsCents - s0.coinsCents; }
    const g = graderMult(s0.workers, s0.graderTier, b), base = salePriceCents(s0, b);
    expect(sellAllPreview(s0, b, ctx).cents).toBe(credit);
    expect(saleValueCents(s0, 10, b, ctx) + saleValueCents(s0, 4, b, ctx)).toBe(credit); // order-card unit previews, same ctx
    expect(credit).toBe(Math.round(10 * base * g * (attended ? 2 : 1)) + Math.round(4 * base * g * (attended ? 2 : 1)));
  });
});
describe('F1c registries are readonly in src (CCR nit #80)', () => {
  it('[F1(c)][CCR-80-N] no src file mutates or casts away SALE_EFFECTS / LAY_EFFECTS (push/splice/pop/shift/unshift/length =/index assign/as)', () => {
    const files = readdirSync('src', { recursive: true }).map(String).filter(f => f.endsWith('.ts'));
    const bad = /\b(SALE_EFFECTS|LAY_EFFECTS)\s*(\s+as\s|\)\s*\.\s*(push|splice)|\.\s*(push|splice|pop|shift|unshift|sort|reverse|fill|copyWithin)\s*\(|\.\s*length\s*=[^=]|\[[^\]]*\]\s*=[^=])/;
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(bad.test(readFileSync(join('src', f), 'utf8')), f).toBe(false);
  });
});
describe('Q-F1c-2 (D-HOP-2026-10-29-06): Sweep is excluded from golden E', () => {
  it('[Q-F1c-2][GE-AC8] goldenEEggsPerSec is the base prodEggsPerSec (no ctx) even with a live Sweep', () => {
    LAY.push(sweep); const b = B({ abilities: 1 }), s = farm(b);
    expect(goldenEEggsPerSec(s, b)).toBe(prodEggsPerSec(s, b));
    expect(prodEggsPerSec(s, b, { suspended: false })).toBeGreaterThan(goldenEEggsPerSec(s, b));
    LAY.length = 0; expect(goldenEEggsPerSec(s, b)).toBe(prodEggsPerSec(s, b, { suspended: false }));
  });
});

// Saves QA V5SCAP gaps 2/3 on #80.
import { advance } from '../src/sim/tick';
import { focusFrameMs } from '../src/sim/clock';
import { applyOffline } from '../src/sim/offline';
import { incomePerSec } from '../src/econ/income';
describe('F1c D-C3 through advance(): a long frame buys at most 1.0 s of uplift', () => {
  const mhExtra = (ms: number, focusMs?: number) => {
    const b = B({ golden: 1 }), s0: GameState = { ...farm(b), basket: 1_000_000, coinsCents: 1_000_000, workers: { market_hand: { energy: 100, cdS: 0 } },
      customers: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, demand: 20, filled: 0, waitedS: 0 })) };
    const run = (fx: boolean) => { SALE.length = 0; if (fx) SALE.push(frenzy); const ev: any[] = [];
      advance(s0, ms, 0, b, ev, focusMs === undefined ? undefined : { focusMs, nowMs: 1 });
      return { cents: ev.filter(e => e.type === 'sell' && e.by === 'market_hand').reduce((a, e) => a + e.value, 0), n: ev.filter(e => e.type === 'sell' && e.by === 'market_hand').length }; };
    const on = run(true), off = run(false); return { extra: on.cents - off.cents, sales: off.n, base: off.cents };
  };
  it('[D-C3][R23 partial] one 59 s frame (focusMs 1000) with a x2 fixture effect and Market Hand sales pays at most the uplift of 1.0 s (10 focus ticks)', () => {
    const one = mhExtra(1_000, 1_000), long = mhExtra(59_000, focusFrameMs(59_000, true, 60));
    expect(long.sales).toBeGreaterThan(2 * one.sales); expect(long.base).toBeGreaterThan(2 * one.base); // Market Hand keeps selling after the first 1.0 s
    expect(long.extra).toBeLessThan(long.base / 2); // every-tick focus would pay ~x2 on the whole frame (extra ~ base)
    expect(one.extra).toBeGreaterThan(0); expect(Math.abs(one.extra - one.base)).toBeLessThanOrEqual(one.sales); // x2 on every focus tick of a 1 s frame (1 cent rounding per sale)
    expect(long.extra).toBeGreaterThan(0); expect(long.extra).toBeLessThanOrEqual(one.extra);
  });
});
describe('F1c §9.5 edge 3 / R24: offline grant and income preview never see a live lay effect (callers, not the helper)', () => {
  const tiny: LayEffect = { id: 'sweep-tiny', flag: 'abilities', factor: () => 0.01 }; // test input: makes laying the binding term
  it('[§9.5-e3][R24 partial] applyOffline and incomePerSec are identical with a live x0.01 lay effect registered', () => {
    // both offline paths: the shipped M4 offline model, and the legacy prodEggsPerSec path (m4.offline absent; test input)
    const b = B({ abilities: 1 }), legacy = { ...b, m4: { ...b.m4!, offline: undefined } } as unknown as typeof b;
    for (const bb of [b, legacy]) {
      LAY.length = 0; const s = { ...farm(bb), coop: 0, basket: 0 };
      const off0 = applyOffline(s, 3_600_000, bb), inc0 = incomePerSec(s, bb);
      expect(off0.eggs).toBeGreaterThan(0); expect(inc0).not.toBe(0);
      LAY.push(tiny);
      expect(prodEggsPerSec(s, bb, { suspended: false })).toBeLessThan(prodEggsPerSec(s, bb)); // the effect IS live for a live ctx
      expect(JSON.stringify(applyOffline(s, 3_600_000, bb))).toBe(JSON.stringify(off0)); expect(incomePerSec(s, bb)).toBe(inc0);
    }
  });
});
