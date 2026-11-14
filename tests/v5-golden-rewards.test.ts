// v5 Wave A #1 (slice 1): golden-egg reward math + Frenzy sim (product/collection/m5-golden-egg-spec.md v1.3.2 §3.5 R22/R23/X7,
// §4 #2-#3; GE-AC7, GE-AC8, GE-AC9, GE-AC9b, GE-AC10, GE-AC10b sim part, R23 reset-not-stack). Pure sim only: no spawn/lifetime,
// no tap action, no events/telemetry, no UI (those wait for the spawn-input ruling, see PR body).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { balance as b, validateBalance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { saleValueCents, saleMultipliers } from '../src/sim/payout';
import { graderMult } from '../src/sim/workers';
import { priceDollars } from '../src/econ/income';
import { goldenEEggsPerSec, salePriceCents } from '../src/sim/tracks';
import { ensureEvRng, evDraw } from '../src/sim/rng';
import { goldenOn, cashBp, eggsBp, baseScaled, rewardCents, GOLDEN_MATH, rollReward, grantGolden, frenzyFactor } from '../src/sim/golden';
import { ON } from './v5-f2-helpers';
type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const withTc = (t: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, tc: { ...bb.m4!.tc!, ...t } } }) as B;
const G = flags({ golden: 1, streak: 1 }), OFF = flags({ golden: 0 }), tc = G.m4!.tc!, DT = 1 / G.tickHz, PER_S = Math.round(G.tickHz);
const working = { energy: 100, cdS: 0 };
const farm = (extra: Partial<GameState> = {}): GameState => ({ ...initialState(G, 9), farmLevel: 10, collectionLevel: 8, hensLevel: 10, eggValueLevel: 10,
  coinsCents: 50_000_000, coop: 30, basket: 0, graderTier: 1, workers: { grader: { ...working } }, ...extra });
const big = (x: number, bp: number) => Number((BigInt(x) * BigInt(bp) + 500000n) / 1000000n); // the HoE BigInt reference
afterEach(() => vi.restoreAllMocks());

describe('#1 golden rewards: integer money (§4 #2-#3, GE-AC9b)', () => {
  it('cashBp / eggsBp = Math.round(seconds x 10000): 45 -> 450000, 60 -> 600000; fixture 59.5 -> 595000', () => {
    expect([cashBp(G), eggsBp(G), eggsBp(withTc({ egg_eggs_s: 59.5 }, G))]).toEqual([450_000, 600_000, 595_000]);
  });
  it('GE-AC9b cash .5 edges: 128250 -> 57713, 128249 -> 57712, 10 -> 5', () => {
    expect([128_250, 128_249, 10].map(x => rewardCents(x, 450_000))).toEqual([57_713, 57_712, 5]);
  });
  it('GE-AC9b eggs_cash: fixture 59.5 s: 100 -> 60, 99 -> 59; CSV 60 s: 128250 -> 76950', () => {
    expect([rewardCents(100, 595_000), rewardCents(99, 595_000), rewardCents(128_250, 600_000)]).toEqual([60, 59, 76_950]);
  });
  it('GE-AC9b guard: cash switch at 20,015,998,342, eggs_cash at 15,011,998,757; disagreeing value; 1e12', () => {
    expect([20_015_998_342, 20_015_998_343, 20_015_998_344].map(x => rewardCents(x, 450_000))).toEqual([9_007_199_254, 9_007_199_254, 9_007_199_255]);
    expect([15_011_998_757, 15_011_998_758].map(x => rewardCents(x, 600_000))).toEqual([9_007_199_254, 9_007_199_255]);
    expect(rewardCents(3_313_552_582_910, 450_000)).toBe(1_491_098_662_310);
    expect([rewardCents(1e12, 450_000), rewardCents(1e12, 600_000)]).toEqual([450_000_000_000, 600_000_000_000]);
    for (const [x, bp] of [[20_015_998_343, 450_000], [3_313_552_582_910, 450_000], [15_011_998_758, 600_000], [1e12, 600_000], [128_250, 450_000]])
      expect(rewardCents(x, bp)).toBe(big(x, bp));
  });
  it('GE-AC9b spy: the BigInt path runs exactly above the switch (cash and eggs_cash)', () => {
    const n = vi.spyOn(GOLDEN_MATH, 'num'), g = vi.spyOn(GOLDEN_MATH, 'big');
    rewardCents(20_015_998_342, 450_000); expect([n.mock.calls.length, g.mock.calls.length]).toEqual([1, 0]);
    rewardCents(20_015_998_343, 450_000); expect([n.mock.calls.length, g.mock.calls.length]).toEqual([1, 1]);
    rewardCents(15_011_998_757, 600_000); expect([n.mock.calls.length, g.mock.calls.length]).toEqual([2, 1]);
    rewardCents(15_011_998_758, 600_000); expect([n.mock.calls.length, g.mock.calls.length]).toEqual([2, 2]);
  });
  it('rewardCents of 0 / negative input is 0', () => { expect([rewardCents(0, 450_000), rewardCents(-5, 450_000), rewardCents(100, 0)]).toEqual([0, 0, 0]); });
});

describe('#1 golden rewards: baseScaled and grants (GE-AC8, GE-AC9)', () => {
  it('GE-AC8: baseScaled = Math.round(E x P_cents x 100) from goldenEEggsPerSec and priceDollars (Grader in, streak and Frenzy out)', () => {
    const s = farm(), E = goldenEEggsPerSec(s, G), P = priceDollars(s, G);
    expect(baseScaled(s, G)).toBe(Math.round(E * (P * 100) * 100));
    expect(baseScaled({ ...s, streakS: 0.28, frenzyRemainingS: 20 }, G)).toBe(baseScaled(s, G));
  });
  it('GE-AC8: E = 9.5, P = $1.35 -> 57,713 cents of cash', () => { expect(rewardCents(Math.round(9.5 * (1.35 * 100) * 100), cashBp(G))).toBe(57_713); });
  it('GE-AC8: cash grant adds exactly rewardCents(baseScaled, cashBp) to coins; nothing else changes', () => {
    const s = farm(), o = grantGolden(s, 'cash', G);
    expect(o).toEqual({ ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, G), 450_000) });
  });
  it('GE-AC9: F = 19 eggs: Basket += floor(60 x E), coop unchanged, coop cap ignored', () => {
    const s = farm({ farmLevel: 19, basket: 5, coop: 1e6 }), E = goldenEEggsPerSec(s, G), o = grantGolden(s, 'eggs', G);
    expect(o).toEqual({ ...s, basket: 5 + Math.floor(60 * E) });
  });
  it('GE-AC9: F = 20 eggs_cash: coins += rewardCents(baseScaled, 600000), Basket unchanged', () => {
    const s = farm({ farmLevel: 20, basket: 5 }), o = grantGolden(s, 'eggs_cash', G);
    expect(o).toEqual({ ...s, coinsCents: s.coinsCents + rewardCents(baseScaled(s, G), 600_000) });
  });
  it('frenzy grant sets frenzyRemainingS = tc_frenzy_s; a second one resets to 30, never stacks (R23)', () => {
    expect(grantGolden(farm(), 'frenzy', G).frenzyRemainingS).toBe(tc.frenzy_s);
    expect(grantGolden(farm({ frenzyRemainingS: 12 }), 'frenzy', G).frenzyRemainingS).toBe(30);
  });
  it('flag off: grantGolden is the identity', () => {
    const s = farm(); for (const t of ['cash', 'frenzy', 'eggs', 'eggs_cash'] as const) expect(grantGolden(s, t, OFF)).toBe(s);
    expect(goldenOn(OFF)).toBe(false); expect(goldenOn(G)).toBe(true); expect(goldenOn(b)).toBe(false);
  });
});

describe('#1 golden rewards: the roll (GE-AC7)', () => {
  it('u in [0, w_cash) -> cash, [w_cash, w_cash + w_frenzy) -> frenzy, rest -> eggs (F < 20) / eggs_cash (F >= 20)', () => {
    const wc = tc.egg_w_cash, wf = wc + tc.egg_w_frenzy;
    expect([0, wc - 1e-9, wc, wf - 1e-9, wf, 0.999999].map(u => rollReward(u, 19, G))).toEqual(['cash', 'cash', 'frenzy', 'frenzy', 'eggs', 'eggs']);
    expect(rollReward(0.9, 20, G)).toBe('eggs_cash'); expect(rollReward(0.9, tc.egg_eggs_as_cash_from_farm - 1, G)).toBe('eggs');
  });
  it('10,000 seeded evRng rolls: 45/35/20 within 1.5 pp; changed weights change the shares', () => {
    const shares = (bb: B) => { let s = ensureEvRng(initialState(bb, 7)); const n: Record<string, number> = { cash: 0, frenzy: 0, eggs: 0 };
      for (let i = 0; i < 10_000; i++) { let u: number; [s, u] = evDraw(s); n[rollReward(u, 10, bb)]++; } return n; };
    const a = shares(G); expect(Math.abs(a.cash / 1e4 - 0.45)).toBeLessThan(0.015); expect(Math.abs(a.frenzy / 1e4 - 0.35)).toBeLessThan(0.015);
    expect(Math.abs(a.eggs / 1e4 - 0.2)).toBeLessThan(0.015);
    const c = shares(withTc({ egg_w_cash: 0.2, egg_w_frenzy: 0.2, egg_w_eggs: 0.6 }, G)); expect(Math.abs(c.eggs / 1e4 - 0.6)).toBeLessThan(0.015);
  });
});

describe('#1 Frenzy (R22/R23/X7, GE-AC10, GE-AC10b sim part)', () => {
  it('GE-AC10/X7: a live Frenzy multiplies every sale (player and Market Hand) by tc_frenzy_price_mult with the streak; rounded once', () => {
    const s = farm({ frenzyRemainingS: 20, streakS: 0.28 }), unit = salePriceCents(s, G), g = graderMult(s.workers, s.graderTier, G);
    expect(frenzyFactor(s, G)).toBe(tc.frenzy_price_mult);
    for (const by of ['player', 'market_hand'] as const) expect(saleValueCents(s, 10, G, { by })).toBe(Math.round(10 * unit * g * 1.28 * 2));
    expect(saleMultipliers(s, G)).toEqual([g, 1.28, 2]);
  });
  it('GE-AC10b: a suspended sale (menu / hide) pays 1x: no Frenzy, no streak', () => {
    const s = farm({ frenzyRemainingS: 20, streakS: 0.28 });
    expect(saleValueCents(s, 10, G, { by: 'market_hand', suspended: true })).toBe(saleValueCents({ ...s, frenzyRemainingS: undefined, streakS: 0 }, 10, G, { by: 'market_hand' }));
  });
  it('golden off or no Frenzy: factor 1', () => {
    const s = farm({ frenzyRemainingS: 20 });
    expect(saleValueCents(s, 10, OFF, { by: 'player' })).toBe(saleValueCents({ ...s, frenzyRemainingS: undefined }, 10, OFF, { by: 'player' }));
    expect(frenzyFactor(farm(), G)).toBe(1); expect(frenzyFactor(farm({ frenzyRemainingS: 0 }), G)).toBe(1);
  });
  it('R23: counts down on the focus clock only; frozen on unfocused ticks; ends (field absent) after 30.0 s of focus +- 1 tick', () => {
    let s = grantGolden(farm(), 'frenzy', G);
    for (let i = 0; i < 40 * PER_S; i++) s = step(s, DT, G, undefined, { focus: false });
    expect(s.frenzyRemainingS).toBe(30);
    for (let i = 0; i < 10 * PER_S; i++) s = step(s, DT, G, undefined, { focus: true });
    expect(s.frenzyRemainingS).toBeCloseTo(20, 9);
    let t = 0; while (s.frenzyRemainingS !== undefined && t < 40 * PER_S) { s = step(s, DT, G, undefined, { focus: true }); t++; }
    expect(Math.abs(t - 20 * PER_S)).toBeLessThanOrEqual(1); expect('frenzyRemainingS' in s).toBe(false);
  });
  it('flag off: a stray frenzyRemainingS never ticks or pays', () => {
    let s = farm({ frenzyRemainingS: 20 }); for (let i = 0; i < 5 * PER_S; i++) s = step(s, DT, OFF, undefined, { focus: true });
    expect(s.frenzyRemainingS).toBe(20);
  });
});

describe('#1 golden rewards: validateBalance (GE-AC26 / D-HOP-2026-11-05-11)', () => {
  it('tc_frenzy_all_sales must be 1 (0 is invalid, no alternate branch)', () => {
    expect(() => validateBalance(withTc({ frenzy_all_sales: 0 }, G))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(withTc({ frenzy_all_sales: 0 }, OFF))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(withTc({ frenzy_all_sales: 2 }, G))).toThrow(/frenzy_all_sales/);
    expect(() => validateBalance(G)).not.toThrow();
    expect(() => validateBalance(withTc({ frenzy_all_sales: 1 }, G))).not.toThrow();
  });
});
