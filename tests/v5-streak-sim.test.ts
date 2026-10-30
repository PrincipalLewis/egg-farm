// v5 #2 Collect Streak sim (product/collection/m5-streak-tap-coins-spec.md v1.3.2 sha1 acb4cdbb §3; plan qa/m5/test-plan-streak-tap-coins.md
// v0.8 sha256 403c2c46, frozen on spec v1.3.1 895ca903; sizing §2 #2/§9.5, D-HOP-08 #2). The G3 tc columns are not in the CSV yet
// (Economy row 4): tests add them with the v5 cap of record 0.28 (D-HOP-2026-10-29-08 (1)); 0.27 only with Breeds on.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step, advance } from '../src/sim/tick';
import { saleMultipliers, saleValueCents } from '../src/sim/payout';
import { salePriceCents } from '../src/sim/tracks';
import { streakOn, streakTier, streakTick } from '../src/sim/streak';
import { m5Offline, m5Persist } from '../src/save/m5-fields';
import { Game } from '../src/game';
import { mem } from './helpers';
import { TELEMETRY_KEY } from '../src/telemetry/telemetry';
import { ON } from './v5-f2-helpers';
import { validateBalance } from '../src/config/balance';
import { tcNum, M5_TC_KEYS } from '../src/config/formulas';
import { drawGap } from '../src/save/m5-fields';
const SB = ON;
const OFF = { ...SB, m4: { ...SB.m4!, flags: { ...SB.m4!.flags, streak: 0 } } } as typeof b;
const tc = SB.m4!.tc!, CAP = tc.streak_cap, STEP = tc.streak_per_tap, DT = 1 / SB.tickHz;
const F = { focus: true }, U = { focus: false };
const base = (bb = SB, extra: Partial<GameState> = {}): GameState => ({ ...initialState(bb, 3), farmLevel: 8, collectionLevel: 4, coop: 50, ...extra });
const tap = (s: GameState, bb = SB) => { const ev: any[] = []; return { s: apply(s, { type: 'collect' }, bb, ev), ev }; };
const run = (s: GameState, n: number, c?: { focus: boolean }, bb = SB, ev: any[] = []) => { for (let i = 0; i < n; i++) s = step(s, DT, bb, ev, c); return s; };
/** n credited taps, one per credit window (unfocused ticks between, so no hold/decay). */
function build(n: number, s = base()) { const ev: any[] = []; for (let i = 0; i < n; i++) { s = apply(s, { type: 'collect' }, SB, ev); s = run(s, Math.round(tc.tap_credit_min_s / DT), U); } return { s, ev }; }
const strip = (s: any) => { const { customers, ...r } = s; return r; };
describe('#2 streak: credited taps (R1-R5, R13a)', () => {
  it('ST-AC2: a Collect at F >= unlock credits +per_tap, restarts the hold, starts the window and emits streak_started once', () => {
    const r = tap(base()); expect(r.s.streakS).toBeCloseTo(STEP, 12); expect(r.s.streakHoldS).toBe(tc.streak_hold_s); expect(r.s.tapCreditCdS).toBe(tc.tap_credit_min_s);
    expect(r.ev).toEqual([{ type: 'collect', eggs: expect.any(Number), credited: true }, { type: 'streak_started', farm_level: 8, collection_level: 4 }]);
    const r2 = tap(r.s); expect(r2.s.streakS).toBe(r.s.streakS); expect(r2.ev).toEqual([{ type: 'collect', eggs: expect.any(Number), credited: false }]);
  });
  it('ST-AC16c, ST-AC3, ST-AC4: the window is sim time, hidden ticks included (R2/K1/K19); credited even when the coop is empty (K2)', () => {
    let s = tap(base()).s; s = run(s, Math.round(tc.tap_credit_min_s / DT) - 1, U); expect(tap(s).ev[0].credited).toBe(false);
    s = run(s, 1, U); const r = tap({ ...s, coop: 0 }); expect(r.ev[0]).toEqual({ type: 'collect', eggs: 0, credited: true }); expect(r.s.streakS).toBeCloseTo(2 * STEP, 12);
  });
  it('ST-AC1, ST-AC29: below the unlock farm or with the flag off: no credit and the rc1 collect event', () => {
    expect(tap(base(SB, { farmLevel: 7 })).ev[0].credited).toBe(false);
    const r = tap(base(OFF), OFF); expect(r.ev).toEqual([{ type: 'collect', eggs: expect.any(Number) }]); expect(r.s.streakS).toBeUndefined();
    expect(streakOn(OFF)).toBe(false); expect(streakOn(SB)).toBe(true);
  });
  it('ST-AC29: flag default 0 = off: the shipping balance, an absent streak key and streak: 0 are all off', () => {
    const { streak: _x, ...rest } = SB.m4!.flags as any;
    expect(streakOn(b)).toBe(false); expect(streakOn({ ...SB, m4: { ...SB.m4!, flags: rest } } as typeof b)).toBe(false); expect(streakOn(OFF)).toBe(false);
  });
  it('K4/K18: caps at tc_streak_cap exactly (K4), and K18 clamps a lowered cap on the next tick with no event', () => {
    const { s } = build(40); expect(s.streakS).toBe(CAP); expect(s.streakRun!.creditedTaps).toBe(40);
    const ev: any[] = []; const t = streakTick({ ...s, streakS: 0.4 }, DT, 0, SB, ev); expect(t.streakS).toBe(CAP); expect(ev).toEqual([]);
  });
  it('ST-AC11: §3.3 tiers T_k = round_to_step(cap x k/4) from config: cap of record 0.28 and 0.40; Breeds on (cap 0.27); max_tier', () => {
    expect([0.06, 0.07, 0.13, 0.14, 0.2, 0.21, 0.27, 0.28].map(v => streakTier(v, SB))).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
    const breeds = { ...SB, m4: { ...SB.m4!, flags: { ...SB.m4!.flags, breeds: 1 }, tc: { ...tc, streak_cap: 0.27 } } } as typeof b;
    expect([0.06, 0.07, 0.13, 0.14, 0.2, 0.26, 0.27].map(v => streakTier(v, breeds))).toEqual([0, 1, 1, 2, 3, 3, 4]);
    const c40 = { ...SB, m4: { ...SB.m4!, tc: { ...tc, streak_cap: 0.4 } } } as typeof b;
    expect([0.09, 0.1, 0.2, 0.3, 0.39, 0.4].map(v => streakTier(v, c40))).toEqual([0, 1, 2, 3, 3, 4]);
  });
  it('ST-AC14: a Coop Hand collect and the welcome-back Collect are never credited (R3)', () => {
    const hired = base(SB, { workers: { coop_hand: { energy: 100, cdS: 0 } } as any, coinsCents: 1e6, pendingOfflineEggs: 5 }), ev: any[] = [];
    const w = run(hired, 30, F, SB, ev); expect(ev.some(e => e.type === 'worker_collect')).toBe(true); expect(w.streakS).toBeUndefined();
    const o = apply(hired, { type: 'collectOffline' }, SB, ev); expect(o.streakS).toBeUndefined(); expect(o.tapCreditCdS).toBeUndefined();
  });
});
describe('#2 streak: hold and decay on the focus clock (R6/R7/R12, D-C3)', () => {
  it('ST-AC5: K5 stop at the cap of record 0.28: hold 3 s, -0.03/s, 0 at 12.33 +-0.1 s, one streak_peak{value:0.28, reason:"decay", max_tier:4}', () => {
    expect(CAP).toBe(0.28); const { s: s0 } = build(28); const ev: any[] = []; let s = run(s0, 30, F, SB, ev); expect(s.streakS).toBe(CAP); expect(s.streakHoldS).toBeCloseTo(0, 9);
    s = run(s, 93, F, SB, ev); expect(s.streakS).toBeGreaterThan(0); s = run(s, 1, F, SB, ev);
    expect(s.streakS).toBe(0); expect(s.streakRun).toBeUndefined(); const p = ev.filter(e => e.type === 'streak_peak');
    expect(p).toEqual([{ type: 'streak_peak', value: 0.28, duration_s: expect.any(Number), credited_taps: 28, time_at_cap_s: 3, extra_coins: 0, frenzy_overlap_s: 0, reason: 'decay', max_tier: 4 }]);
    expect(Math.abs(p[0].duration_s - 12.33)).toBeLessThanOrEqual(0.1);
  });
  it('ST-AC13, ST-AC6: K10/R12 unfocused ticks freeze s and the hold; a credited tap during decay stops it and restarts the hold (R7)', () => {
    let s = build(10).s; s = run(s, 100, U); expect(s.streakS).toBeCloseTo(0.1, 12); expect(s.streakHoldS).toBe(tc.streak_hold_s);
    s = run(s, 40, F); expect(s.streakS).toBeCloseTo(0.1 - tc.streak_decay_per_s * 1, 9); s = tap(s).s; expect(s.streakS).toBeCloseTo(0.08, 9); expect(s.streakHoldS).toBe(tc.streak_hold_s);
  });
  it('ST-AC13: D-C3 (R12) only the first ceil(focusMs/tick) ticks of a frame carry focus', () => {
    const s = { ...base(), streakS: 0.1, streakHoldS: 0 }; const r = advance(s, 1000, 0, SB, undefined, { focusMs: 250 });
    expect(r.state.streakS).toBeCloseTo(0.1 - tc.streak_decay_per_s * 0.3, 12);
  });
});
describe('#2 streak: the (1 + s) sale factor (R8/R9/R12)', () => {
  const sell = (bb = SB, x: Partial<GameState> = {}) => ({ ...base(bb), basket: 10, customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }], ...x });
  it('ST-AC7: player sale and preview get (1 + s); extra_coins accrues the streak share only', () => {
    const s = sell(SB, { streakS: 0.2 }); expect(saleMultipliers(s, SB)).toEqual([1, 1.2]); const v = saleValueCents(s, 5, SB);
    const o = apply(s, { type: 'sell', customerId: 1 }, SB); expect(o.coinsCents).toBe(v); expect(o.streakRun!.extraCents).toBe(v - saleValueCents({ ...s, streakS: 0 }, 5, SB));
  });
  // Plan ST-AC7 cases on this base: x in {0.01, 0.14, 0.28} x Grader {none, tier 3}; value = round(k x price x g x (1 + x)), rounded once.
  const G3T = b.workers.grader.tiers[2].mult, GR = { grader: { energy: 100, cdS: 0 } };
  const cases = [0.01, 0.14, 0.28].flatMap(x => [[x, 0], [x, 3]] as const);
  const two = (x: number, gt: number, w: any = {}) => sell(SB, { streakS: x, streakHoldS: tc.streak_hold_s, graderTier: gt, coinsCents: 1e6, workers: { ...(gt ? GR : {}), ...w },
    customers: [{ id: 1, demand: 5, filled: 0, waitedS: 0 }, { id: 2, demand: 3, filled: 0, waitedS: 0 }] });
  const want = (s: GameState, k: number, x: number, gt: number) => Math.round(k * salePriceCents(s, SB) * (gt ? G3T : 1) * (1 + x));
  it('ST-AC7: player Sell and Sell all at x 0.01/0.14/0.28, Grader none/tier 3: (1 + s) on every sale, rounded once per sale', () => {
    for (const [x, gt] of cases) {
      const s = two(x, gt), one = apply(s, { type: 'sell', customerId: 1 }, SB); expect(one.coinsCents - s.coinsCents).toBe(want(s, 5, x, gt));
      const all = apply(s, { type: 'sellAll' }, SB); expect(all.coinsCents - s.coinsCents).toBe(want(s, 5, x, gt) + want(s, 3, x, gt));
      expect(all.streakRun!.extraCents).toBe(want(s, 5, x, gt) + want(s, 3, x, gt) - want(s, 5, 0, gt) - want(s, 3, 0, gt));
    }
  });
  it('ST-AC7, ST-AC13: Market Hand sales on a focus tick get (1 + s); on an unfocused tick 1x (R8/R12)', () => {
    for (const [x, gt] of cases) for (const c of [F, U]) {
      const ev: any[] = []; step(two(x, gt, { market_hand: { energy: 100, cdS: 0 } }), DT, SB, ev, c);
      const v = ev.filter(e => e.type === 'sell' && e.by === 'market_hand').map(e => e.value), s = two(x, gt);
      expect(v).toEqual([want(s, 5, c.focus ? x : 0, gt), want(s, 3, c.focus ? x : 0, gt)]);
    }
  });
  it('ST-AC13, ST-AC29: suspended (unfocused tick) and flag off: no factor; a worker sale under a menu is 1x (K10)', () => {
    expect(saleMultipliers(sell(SB, { streakS: 0.2 }), SB, { by: 'market_hand', suspended: true })).toEqual([1]);
    expect(saleMultipliers(sell(OFF, { streakS: 0.2 }), OFF)).toEqual([1]);
  });
  it('ST-AC29: flag off: step with or without a clock is identical, and no streak fields appear', () => {
    let a = sell(OFF), c = sell(OFF); for (let i = 0; i < 50; i++) { a = step(a, DT, OFF); c = step(c, DT, OFF, undefined, F); } expect(c).toEqual(a);
    expect(Object.keys(strip(tap(sell(OFF), OFF).s)).some(k => k.startsWith('streak') || k === 'tapCreditCdS')).toBe(false);
  });
});
describe('#2 streak: offline / reload (R10/R11, D-HOP-08 #2)', () => {
  it('ST-AC12: a >= 60 s gap: streak_peak{reason:"offline"} with the run stats, s = 0, run dropped; nothing at s = 0', () => {
    const { s } = build(5); const ev: any[] = []; const o = m5Offline(s, SB, ev);
    expect(ev).toEqual([{ type: 'streak_peak', value: 0.05, duration_s: 0, credited_taps: 5, time_at_cap_s: 0, extra_coins: 0, frenzy_overlap_s: 0, reason: 'offline', max_tier: 0 }]);
    expect(o).toMatchObject({ streakS: 0, streakHoldS: 0 }); expect(o.streakRun).toBeUndefined();
    const ev2: any[] = []; m5Offline(o, SB, ev2); expect(ev2).toEqual([]);
  });
  it('ST-AC12: the run stats are session only (never saved)', () => { expect(m5Persist(build(3).s)).not.toHaveProperty('streakRun'); });
  function game() {
    const kv = mem(); let t = Date.UTC(2026, 9, 29, 12); const g = new Game(SB, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = { ...g.state, farmLevel: 8, coop: 50 }; return { kv, g, now: () => t, adv: (ms: number) => { t += ms; } };
  }
  it('ST-AC12a, ST-AC12, ST-AC13: Game: attended frames decay, unattended frames and a 5 s hide freeze (K8); pagehide sends streak_peak{reason:"reload"}', () => {
    const { kv, g, now, adv } = game(); g.frame(); g.dispatch({ type: 'collect' }); expect(g.state.streakS).toBeCloseTo(STEP, 12);
    adv(5000); g.frame(); expect(g.state.streakS).toBeCloseTo(STEP, 12);
    g.onHidden(now()); adv(5000); g.frame(); g.onShown(now()); expect(g.state.streakS).toBeCloseTo(STEP, 12);
    g.setAttendedProbe(() => true); for (let i = 0; i < 3; i++) { adv(1000); g.frame(); } expect(g.state.streakHoldS).toBeCloseTo(0, 9);
    adv(100); g.frame(); expect(g.state.streakS).toBeCloseTo(STEP - tc.streak_decay_per_s * 0.1, 9);
    g.endSession(); expect(kv.getItem(TELEMETRY_KEY)).toMatch(/"reason":"reload"[^{}]*"type":"streak_peak"|"type":"streak_peak"[^{}]*"reason":"reload"/);
  });
});
describe('a missing tc_* tunable is caught, never read as 0 (HoE/Architect follow-up on F2)', () => {
  const drop = (k: string) => { const t: any = { ...SB.m4!.tc }; delete t[k]; return { ...SB, m4: { ...SB.m4!, tc: t } } as typeof b; };
  it('ST-AC18: tcNum throws on a missing or non-finite key', () => {
    expect(tcNum(SB, 'streak_cap')).toBe(0.28); expect(() => tcNum(drop('streak_cap'), 'streak_cap')).toThrow(/tc_streak_cap/);
    expect(() => tcNum({ ...SB, m4: { ...SB.m4!, tc: { ...SB.m4!.tc, streak_cap: NaN } } } as typeof b, 'streak_cap')).toThrow(/tc_streak_cap/);
  });
  it('ST-AC18: validateBalance rejects a flag that is on without every tc key it reads; off flags need nothing', () => {
    expect(() => validateBalance(SB, false)).not.toThrow(); expect(() => validateBalance(b, false)).not.toThrow();
    for (const [f, keys] of Object.entries(M5_TC_KEYS)) for (const k of keys) {
      const bad = drop(k); if (!(SB.m4!.flags as any)[f]) continue;
      expect(() => validateBalance(bad, false)).toThrow(new RegExp(`tc_${k}`));
      expect(() => validateBalance({ ...bad, m4: { ...bad.m4!, flags: { ...bad.m4!.flags, [f]: 0 } } } as typeof b, false)).not.toThrow();
    }
  });
  it('ST-AC18 [QA pr87-694468e M1]: the 7 streak tc keys are pinned here (spec §5 / G3), not derived from src M5_TC_KEYS', () => {
    const STREAK_TC = ['streak_unlock_farm', 'streak_per_tap', 'tap_credit_min_s', 'streak_hold_s', 'streak_decay_per_s', 'streak_cap', 'streak_tier_count'];
    expect([...M5_TC_KEYS.streak].sort()).toEqual([...STREAK_TC].sort());
    for (const k of STREAK_TC) expect(() => validateBalance(drop(k), false), k).toThrow(new RegExp(`tc_${k}`));
  });
  it('ST-AC18: the F2 readers throw instead of defaulting (drawGap without tc_egg_gap_min_s)', () => {
    expect(() => drawGap(base(), drop('egg_gap_min_s'))).toThrow(/tc_egg_gap_min_s/);
  });
});
