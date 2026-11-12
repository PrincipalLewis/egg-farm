// v5 #5 Broody nest SIM (product/collection/m5-broody-hen-spec.md v1.3.3 sha1 4441a1d9; gate card #8 product/m5-gate-acs.md
// e485f762 L179-205: BRO-AC1..7). Pure sim + Game wiring; no UI. The UI passes the eligible drawn yard slot ids (R4, sizing §12.2),
// the sim draws an index into them from brRng (D-C4). Accrual: R7 scaled cents x bp, ms remainder, floor at payout, BigInt guard;
// share = broodyBpEff (breeds BR-R14, imported read-only).
import { describe, it, expect, vi } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { apply } from '../src/sim/actions';
import { step } from '../src/sim/tick';
import { applyOffline } from '../src/sim/offline';
import { m5Offline, m5Persist, m5Load } from '../src/save/m5-fields';
import { serialize } from '../src/save/save';
import { refCents } from '../src/sim/income-ref';
import { BROODY_MATH, BROODY_RECHECK_MS, accrueNest, broodyTick, broodyCheckDue, broodyView, broodyOn, capScaledOf, type NestAcc } from '../src/sim/broody';
import { TIMER_SYSTEMS } from '../src/sim/timers';
import { Game } from '../src/game';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const withTc = (t: Record<string, number>, bb: B) => ({ ...bb, m4: { ...bb.m4!, tc: { ...bb.m4!.tc!, ...t } } }) as B;
const BRO = flags({ broody: 1, golden: 0, streak: 0, tapCoins: 0, abilities: 0 }), OFF = flags({ broody: 0, golden: 0, streak: 0, tapCoins: 0, abilities: 0 });
const DT = 1 / BRO.tickHz, TICK_MS = 1000 / BRO.tickHz, PER_S = Math.round(BRO.tickHz);
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HANDS = { coop_hand: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } };
const farm = (extra: Partial<GameState> = {}, bb: B = BRO): GameState => ({ ...initialState(bb, 9), farmLevel: 10, collectionLevel: 8, hensLevel: 10, eggValueLevel: 10,
  coinsCents: 50_000_000, coop: 12, basket: 0, workers: { ...HANDS }, ...extra });
const BKEYS = ['broodyNestCents', 'broodyHenIdx', 'broodyRun', 'brRngState', 'broodyNestScaled'];
const hasBroody = (s: GameState) => BKEYS.some(k => k in s);
const broodyEv = (ev: any[]) => ev.filter(e => e.skin === 'broody_hen');
const run = (s: GameState, n: number, bb: B = BRO, ev?: any[], focus = true) => { for (let i = 0; i < n; i++) s = step(s, DT, bb, ev, { focus, focusFtMs: focus ? TICK_MS : 0 }); return s; };
/** n focus ticks of broodyTick alone with refCents held at `ref` (R7 isolated from the live I_ref). */
const tickRef = (s: GameState, n: number, ref: number, bb: B = BRO, ev?: any[], focus = true) => { for (let i = 0; i < n; i++) s = broodyTick(s, focus ? DT : 0, focus ? TICK_MS : 0, bb, ev, ref); return s; };
const unlocked = (extra: Partial<GameState> = {}, slots = [0, 5, 8], bb: B = BRO) => apply(tickRef(farm(extra, bb), 1, 1650, bb, undefined, false), { type: 'broodySlots', slots }, bb);
const big = (n: NestAcc) => BigInt(n.cents) * 10000n + BigInt(n.sub);

describe('BRO-AC1 (BH-AC25) flag 0: no hen, no accrual, fields byte-unchanged, no broody_hen events', () => {
  for (const [name, bb] of [['m4.flags.broody = 0', OFF], ['m4.enabled = false', { ...BRO, m4: { ...BRO.m4!, enabled: 0 } } as B]] as const) {
    it(name, () => {
      const ev: any[] = []; const s = run(farm({}, bb), 600 * PER_S, bb, ev);
      expect(hasBroody(s)).toBe(false); expect(broodyEv(ev)).toEqual([]); expect(broodyOn(bb)).toBe(false); expect(broodyView(s, bb)).toBeNull();
      const s0 = farm({ broodyNestCents: 700, broodyHenIdx: 2 }, bb);
      expect(apply(s0, { type: 'broodySlots', slots: ALL }, bb)).toBe(s0); expect(apply(s0, { type: 'tapBroody', slots: ALL }, bb)).toBe(s0);
      const s1 = run(s0, 60 * PER_S, bb);
      expect(serialize(m5Persist(s1, bb), 0)).toContain('"broodyNestCents":700'); expect(s1.broodyNestCents).toBe(700); expect(s1.broodyHenIdx).toBe(2); expect('broodyRun' in s1).toBe(false);
    });
  }
});

describe('BRO-AC3 (BH-AC1/2) unlock at the first Coop Hand hire; brRng slot pick', () => {
  it('flag on, no Coop Hand: 30 focus min, no hen, no nest, no event', () => {
    const ev: any[] = []; const s = run(farm({ workers: { market_hand: { energy: 100, cdS: 0 } } }), 1800 * PER_S, BRO, ev);
    expect(hasBroody(s)).toBe(false); expect(broodyEv(ev)).toEqual([]); expect(broodyView(s, BRO)).toBeNull();
  });
  it('hire -> within 1 tick: unlocked, nest 0, check due; the UI slot list marks exactly one eligible slot brooding', () => {
    const s0 = farm({ workers: { market_hand: { energy: 100, cdS: 0 } }, coinsCents: 50_000_000 });
    const h = apply(s0, { type: 'hire', worker: 'coop_hand' }, BRO); expect(h.workers.coop_hand).toBeDefined();
    const t = run(h, 1); expect(t.broodyNestCents).toBe(0); expect(broodyCheckDue(t, BRO)).toBe(true);
    expect(broodyView(t, BRO)).toMatchObject({ state: 'hidden', slot: null, nestCents: 0 }); // no slot marked until the UI measures (R5)
    const m = apply(t, { type: 'broodySlots', slots: [0, 5, 8] }, BRO);
    expect([0, 5, 8]).toContain(m.broodyHenIdx); expect(broodyView(m, BRO)).toMatchObject({ state: 'brooding', slot: m.broodyHenIdx, nestCents: 0, tappable: false });
    expect(m.evRngState).toBe(t.evRngState); // brRng never advances evRngState (Q4 rule 1)
  });
  it('an already-hired save loaded for the first time: same (nest 0); a valid saved index is kept, not re-picked (R4/R6)', () => {
    const t = run(farm({ broodyHenIdx: 8 }), 1); expect(t.broodyNestCents).toBe(0);
    expect(apply(t, { type: 'broodySlots', slots: [0, 5, 8] }, BRO).broodyHenIdx).toBe(8);
    const bad = apply(run(farm({ broodyHenIdx: 3 }), 1), { type: 'broodySlots', slots: [0, 5] }, BRO); expect([0, 5]).toContain(bad.broodyHenIdx); // not eligible -> re-pick
  });
  it('R5: an empty slot list marks nothing and nothing is tappable; the nest keeps filling and is never lowered', () => {
    let s = apply(tickRef(farm(), 1, 1650), { type: 'broodySlots', slots: [] }, BRO); expect(broodyView(s, BRO)!.slot).toBeNull();
    s = tickRef(s, 800, 1650); expect(s.broodyNestCents).toBeGreaterThan(6000); expect(broodyView(s, BRO)).toMatchObject({ state: 'hidden', tappable: false });
    const coins = s.coinsCents; expect(apply(s, { type: 'tapBroody', slots: [] }, BRO).coinsCents).toBe(coins);
    const ev: any[] = []; const m = apply(s, { type: 'broodySlots', slots: [5] }, BRO, ev); expect(broodyView(m, BRO)).toMatchObject({ state: 'ready', slot: 5, tappable: true });
    expect(broodyEv(ev)).toEqual([expect.objectContaining({ type: 'collectible_spawned', slot_id: 'Y5', restored: false })]); expect(ev[0].deferred_ms).toBeGreaterThan(0);
  });
  it('R4: the check re-runs every 500 focus ms (and at once on a layout change)', () => {
    const m = unlocked(); expect(broodyCheckDue(m, BRO)).toBe(false); expect(broodyCheckDue(m, BRO, true)).toBe(true);
    const n = BROODY_RECHECK_MS / TICK_MS; expect(broodyCheckDue(tickRef(m, n - 1, 1650), BRO)).toBe(false); expect(broodyCheckDue(tickRef(m, n, 1650), BRO)).toBe(true);
  });
});

describe('BRO-AC4 (BH-AC3/4) R7 accrual, cap, ready threshold, tap', () => {
  it('I_ref $16.50/s for 150 focus s: 12,375c exactly; ready from 75.000 s (6,187.5c, pays $61.87); full at 150 s, then no growth', () => {
    const m = unlocked();
    const a = tickRef(m, 749, 1650); expect(broodyView(a, BRO)!.state).toBe('brooding');
    const ev: any[] = []; const r = tickRef(a, 1, 1650, BRO, ev); expect(broodyView(r, BRO)!.state).toBe('ready'); expect(r.broodyNestCents).toBe(6187);
    expect(broodyEv(ev)).toEqual([expect.objectContaining({ type: 'collectible_spawned', interval_s: 75, deferred_ms: 0, restored: false, slot_id: `Y${m.broodyHenIdx}` })]);
    const paid = apply(r, { type: 'tapBroody', slots: [0, 5, 8] }, BRO); expect(paid.coinsCents - r.coinsCents).toBe(6187);
    const f = tickRef(m, 1500, 1650); expect(f.broodyNestCents).toBe(12375); expect(broodyView(f, BRO)!.state).toBe('full');
    expect(tickRef(f, 300, 1650).broodyNestCents).toBe(12375);
  });
  it('BH-AC4: a tap pays floor(nest) once, the nest is 0, a different eligible slot becomes broody, collectible_collected once', () => {
    const f = tickRef(unlocked(), 1500, 1650), ev: any[] = [];
    const t = apply(f, { type: 'tapBroody', slots: [0, 5, 8] }, BRO, ev);
    expect(t.coinsCents - f.coinsCents).toBe(12375); expect(t.broodyNestCents).toBe(0); expect(t.broodyHenIdx).not.toBe(f.broodyHenIdx); expect([0, 5, 8]).toContain(t.broodyHenIdx);
    expect(broodyEv(ev)).toEqual([{ type: 'collectible_collected', skin: 'broody_hen', reaction_ms: 75_000, in_warning: false, reward_type: 'broody_cash', reward_value: 12375,
      reward_duration_s: 0, farm_level: 10, nest_fill_share: 1 }]);
    const again: any[] = []; expect(apply(t, { type: 'tapBroody', slots: [0, 5, 8] }, BRO, again).coinsCents).toBe(t.coinsCents); expect(again).toEqual([]); // BH-AC6 one payout
    expect(broodyView(t, BRO)!.state).toBe('brooding'); expect(tickRef(t, 1, 1650).broodyRun!.sub + tickRef(t, 1, 1650).broodyNestCents! * 10000).toBe(82_500); // accrual continues at once
  });
  it('BH-AC5: a brooding hen pays nothing and fires nothing; the tap is never a credited Collect (R13)', () => {
    const m = tickRef(unlocked(), 100, 1650), ev: any[] = []; const t = apply(m, { type: 'tapBroody', slots: [0, 5, 8] }, BRO, ev);
    expect(t).toBe(m); expect(ev).toEqual([]);
  });
  it('one sole eligible slot: the hen stays there after a payout (exclude the current only if another is eligible)', () => {
    const f = tickRef(unlocked({}, [5]), 1500, 1650); expect(apply(f, { type: 'tapBroody', slots: [5] }, BRO).broodyHenIdx).toBe(5);
  });
  it('accrual uses broodyBpEff (breeds BR-R14): Cochin at the 2000 bp clamp fills at 600 bp, cap = refCents x 600 x 150', () => {
    const BR = flags({ breeds: 1 }, BRO), s = unlocked({ breeds: { owned: { cochin: { stars: 2 } }, slots: ['cochin', null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0 } as any }, [0, 5, 8], BR);
    const f = tickRef(s, 1600, 1650, BR); expect(f.broodyNestCents).toBe(1650 * 600 * 150 / 10000);
  });
  it('R8: the nest is never lowered when I_ref falls; it stays full (BH-AC12); I_ss = 0 keeps a $60 nest and it is ready (B2c)', () => {
    const f = tickRef(unlocked({ broodyNestCents: 10000 }), 10, 500); expect(f.broodyNestCents).toBe(10000); expect(broodyView(f, BRO)!.state).toBe('full');
    const z = tickRef(unlocked({ broodyNestCents: 6000 }), 300, 0); expect(z.broodyNestCents).toBe(6000); expect(broodyView(z, BRO)!.state).toBe('ready');
    const zero = tickRef(unlocked(), 300, 0); expect(broodyView(zero, BRO)!.state).toBe('brooding'); // a $0 nest is never ready (R14)
  });
  it('R8a: ready is sticky within the session even if the cap rises past the nest', () => {
    const r = tickRef(unlocked(), 760, 1650); expect(broodyView(r, BRO)!.state).toBe('ready');
    expect(broodyView(tickRef(r, 5, 99_999), BRO)!.state).toBe('ready');
  });
  it('the live path: step() accrues on focus ticks from the shared I_ref (income-ref on with broody), never on unfocused ticks', () => {
    const m = apply(run(farm(), 1), { type: 'broodySlots', slots: [0, 5] }, BRO); expect(refCents(m, BRO)).toBeGreaterThan(0);
    const u = run(m, 100, BRO, undefined, false); expect(u.broodyNestCents).toBe(m.broodyNestCents);
    const f = run(m, 100); expect(f.broodyNestCents).toBeGreaterThan(0);
  });
});

describe('BH-AC3b / BR-AC14 scaled accrual and the BigInt guard (pure step)', () => {
  const z: NestAcc = { cents: 0, sub: 0, msRem: 0 };
  it('(a) refCents 1650, bp 500, 2,273 frames of 1 ms from 60,000,000: 61,875,225, msRem 0, ready, pays 6,187c', () => {
    let n: NestAcc = { cents: 6000, sub: 0, msRem: 0 }; for (let i = 0; i < 2273; i++) n = accrueNest(n, 1650, 500, 1, 150);
    expect(big(n)).toBe(61_875_225n); expect(n.msRem).toBe(0); expect(n.cents).toBe(6187);
    expect(big(n) * 10000n >= 5000n * capScaledOf(1650, 500, 150)).toBe(true);
  });
  it('(b) refCents 1e12 for 150 focus s: capScaled 7.5e16 (> 2^53, BigInt path), full, pays 7,500,000,000,000c', () => {
    let n = z; for (let i = 0; i < 150; i++) n = accrueNest(n, 1e12, 500, 1000, 150);
    expect(capScaledOf(1e12, 500, 150)).toBe(75_000_000_000_000_000n); expect(big(n)).toBe(75_000_000_000_000_000n); expect(n.cents).toBe(7_500_000_000_000);
  });
  it('(c) refCents 18,014,398,509,472, one 1,000 ms frame: 9,007,199,254,736,000, pays 900,719,925,473c', () => {
    const n = accrueNest(z, 18_014_398_509_472, 500, 1000, 150); expect(big(n)).toBe(9_007_199_254_736_000n); expect(n.cents).toBe(900_719_925_473);
  });
  it('(d) paths disagree: refCents 7,474,818,205,800 pays 373,740,910,290c (the BigInt reference)', () => {
    expect(accrueNest(z, 7_474_818_205_800, 500, 1000, 150).cents).toBe(373_740_910_290);
  });
  it('spy: BigInt exactly when an operand or product exceeds MAX_SAFE_INTEGER (bp 500 boundary 18,014,398,509; BR-AC14 bp 600 boundary 15,011,998,757)', () => {
    const num = vi.spyOn(BROODY_MATH, 'num'), bg = vi.spyOn(BROODY_MATH, 'big');
    const path = (ref: number, bp: number) => { num.mockClear(); bg.mockClear(); accrueNest(z, ref, bp, 1000, 150); return [num.mock.calls.length, bg.mock.calls.length]; };
    expect(path(18_014_398_509, 500)).toEqual([1, 0]); expect(path(18_014_398_510, 500)).toEqual([0, 1]);
    expect(path(15_011_998_757, 600)).toEqual([1, 0]); expect(path(15_011_998_758, 600)).toEqual([0, 1]);
    for (const ref of [15_011_998_757, 15_011_998_758]) { // BR-AC14: the payout equals the BigInt reference on both sides
      const want = (BigInt(ref) * 600n * 1000n / 1000n) / 10000n; expect(BigInt(accrueNest(z, ref, 600, 1000, 150).cents)).toBe(want); }
    num.mockRestore(); bg.mockRestore();
  });
});

describe('BRO-AC5 (BH-AC9/10) menu freeze; workers never empty the nest', () => {
  it('a menu open 60 s (no focus): no growth, the hen is frozen and untappable (Game refuses unattended taps)', () => {
    const r = tickRef(unlocked(), 760, 1650), m = tickRef(r, 600, 1650, BRO, undefined, false);
    expect(m.broodyNestCents).toBe(r.broodyNestCents); expect(broodyView(m, BRO, true)).toMatchObject({ state: 'frozen', tappable: false });
    expect(apply(m, { type: 'tapBroody', slots: [0, 5, 8] }, BRO, undefined, false)).toBe(m); // apply(attended = false)
  });
  for (const [mood, w] of [['working', { energy: 100, cdS: 0 }], ['tired', { energy: 30, cdS: 0 }], ['asleep', { energy: 0, cdS: 0 }], ['unpaid', { energy: 50, cdS: 0, unpaid: true }]] as const) {
    it(`Coop Hand ${mood} for 10 min with no tap: the nest never goes down`, () => {
      let s = apply(run(farm({ workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: w } }), 1), { type: 'broodySlots', slots: [0] }, BRO), prev = 0;
      for (let i = 0; i < 600 * PER_S; i++) { s = run(s, 1); expect(s.broodyNestCents!).toBeGreaterThanOrEqual(prev); prev = s.broodyNestCents!; }
    });
  }
});

describe('BRO-AC7 (BH-AC15) brRng isolation and reproducibility', () => {
  const FAST = withTc({ broody_ready_share: 0.01 }, flags({ broody: 1, golden: 1 }, BRO)), NOB = flags({ broody: 0 }, FAST);
  const play = (bb: B, payouts: number) => {
    let s = farm({}, bb); const slots: number[] = [], arrivals: string[] = [], ev: any[] = [], gold: string[] = []; let ticks = 0;
    while (slots.length < payouts && ticks < 200_000) {
      ev.length = 0; s = step(s, DT, bb, ev, { focus: true, focusFtMs: TICK_MS }); ticks++;
      for (const e of ev) if (e.type === 'customer_arrive') arrivals.push(`${e.id}:${e.N}`);
      gold.push(`${s.evRngState}:${s.nextSpawnRemainingS}`);
      if (broodyCheckDue(s, bb)) s = apply(s, { type: 'broodySlots', slots: ALL }, bb);
      const v = broodyView(s, bb); if (v?.tappable) { s = apply(s, { type: 'tapBroody', slots: ALL }, bb); slots.push(s.broodyHenIdx!); }
    }
    return { slots, arrivals, gold, ticks };
  };
  it('200 payouts on a fixed seed: the slot sequence is reproducible and never repeats the previous slot; customers and golden identical with the hen off', () => {
    const a = play(FAST, 200), c = play(FAST, 200); expect(a.slots).toHaveLength(200); expect(c.slots).toEqual(a.slots);
    for (let i = 1; i < a.slots.length; i++) expect(a.slots[i]).not.toBe(a.slots[i - 1]);
    let s = farm({}, NOB); const arr: string[] = [], gold: string[] = [], ev: any[] = [];
    for (let i = 0; i < a.ticks; i++) { ev.length = 0; s = step(s, DT, NOB, ev, { focus: true, focusFtMs: TICK_MS }); for (const e of ev) if (e.type === 'customer_arrive') arr.push(`${e.id}:${e.N}`); gold.push(`${s.evRngState}:${s.nextSpawnRemainingS}`); }
    expect(arr).toEqual(a.arrivals); expect(gold).toEqual(a.gold);
  });
});

describe('R9 offline / hidden / reload; save fields (R20, BH-AC7/8/23)', () => {
  it('hidden 40 s (unfocused sim) and an offline gap (m5Offline + applyOffline, 10 min / 2 h): the nest and the hen are kept, no accrual', () => {
    const r = tickRef(unlocked({ broodyNestCents: 7000 }), 3, 1650);
    expect(run(r, 400, BRO, undefined, false).broodyNestCents).toBe(r.broodyNestCents);
    for (const gap of [600_000, 7_200_000]) { const o = applyOffline(m5Offline(r, BRO, []), gap, BRO).state;
      for (const k of ['broodyNestCents', 'broodyHenIdx', 'broodyRun']) expect((o as any)[k], k).toEqual((r as any)[k]); }
  });
  it('save: broodyNestCents + broodyHenIdx persist, the session run is stripped; reload with $70 at I_ss $16.50 is ready (restored:true, interval_s 0)', () => {
    const r = tickRef(unlocked({ broodyNestCents: 7000 }), 3, 1650), p = m5Persist(r, BRO);
    expect(p.broodyNestCents).toBe(r.broodyNestCents); expect(p.broodyHenIdx).toBe(r.broodyHenIdx); expect('broodyRun' in p).toBe(false);
    const ev: any[] = []; const l = apply(tickRef(m5Load({ ...p, broodyNestCents: 7000 }, BRO, 0, []), 1, 1650, BRO, ev, false), { type: 'broodySlots', slots: [0, 5, 8] }, BRO, ev);
    expect(l.broodyHenIdx).toBe(r.broodyHenIdx); expect(broodyView(l, BRO)!.state).toBe('ready');
    expect(broodyEv(ev)).toEqual([expect.objectContaining({ type: 'collectible_spawned', restored: true, interval_s: 0 })]);
    expect(apply(l, { type: 'tapBroody', slots: [0, 5, 8] }, BRO).coinsCents - l.coinsCents).toBe(7000);
  });
  it('BH-AC7 b: a saved $60 nest is brooding and turns ready after 2.3 +/- 0.1 focus s', () => {
    let s = apply(tickRef(farm({ broodyNestCents: 6000 }), 1, 1650, BRO, undefined, false), { type: 'broodySlots', slots: [0] }, BRO), n = 0;
    while (broodyView(s, BRO)!.state === 'brooding') { s = tickRef(s, 1, 1650); n++; } expect(Math.abs(n * TICK_MS - 2273)).toBeLessThanOrEqual(100);
  });
  it('BH-AC8: sanitised fields on load (-5 / NaN / 1e20 -> 0 / 0 / 1e15; index 99 re-picked)', () => {
    const L = (v: unknown) => m5Load({ ...farm(), broodyNestCents: v as number }, BRO, 0, []).broodyNestCents ?? 0;
    expect([L(-5), L(NaN), L(1e20)]).toEqual([0, 0, 1e15]);
    const s = apply(tickRef(m5Load({ ...farm(), broodyHenIdx: 99 }, BRO, 0, []), 1, 1650, BRO, undefined, false), { type: 'broodySlots', slots: [5] }, BRO); expect(s.broodyHenIdx).toBe(5);
  });
  it('BH-AC23: fields present but no Coop Hand: no hen and the fields are untouched', () => {
    const s = run(farm({ workers: {}, broodyNestCents: 6000, broodyHenIdx: 2 }), 300);
    expect(s.broodyNestCents).toBe(6000); expect(s.broodyHenIdx).toBe(2); expect(broodyView(s, BRO)).toBeNull(); expect('broodyRun' in s).toBe(false);
  });
});

describe('Game wiring: yard probe driver, attended tap, collectible_id, session_end broody_cents / broody_collects, reset', () => {
  const T0 = Date.UTC(2026, 10, 10, 4);
  function setup(bb: B = BRO, st: Partial<GameState> = {}) {
    const kv = mem(); let t = T0; const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = { ...g.state, ...farm(st, bb), rng: g.state.rng } as GameState; let att = true, slots: number[] = [0, 5]; let calls = 0;
    g.setAttendedProbe(() => att); g.setYardProbe(() => { calls++; return slots; });
    return { g, frames: (n: number, ms = 100) => { for (let i = 0; i < n; i++) { t += ms; g.frame(); } }, ctl: { setAtt(a: boolean) { att = a; }, get calls() { return calls; } } };
  }
  it('flag off: the yard probe is never read; tapBroody does nothing', () => {
    const { g, frames, ctl } = setup(OFF); frames(30); g.tapBroody(); g.broodyLayoutChanged(); expect(ctl.calls).toBe(0); expect(hasBroody(g.state)).toBe(false); expect(g.broodyView()).toBeNull();
  });
  it('flag on: unlock -> probe -> marked; ready -> collectible_spawned{broody_hen} with collectible_id; tap -> collected; session_end carries the totals', () => {
    const { g, frames } = setup(withTc({ broody_ready_share: 0.01 }, BRO)); frames(2); expect([0, 5]).toContain(g.state.broodyHenIdx);
    let n = 0; while (!g.broodyView()?.tappable && n++ < 3000) frames(1);
    const before = g.state.coinsCents, nest = g.state.broodyNestCents!; g.tapBroody(); expect(g.state.coinsCents - before).toBe(nest);
    const tel = g.telemetry.events().filter((e: any) => e.skin === 'broody_hen'); expect(tel.map((e: any) => e.type)).toEqual(['collectible_spawned', 'collectible_collected']);
    expect(tel[0].collectible_id).toBe(tel[1].collectible_id);
    g.endSession(); const se = g.telemetry.events().filter((e: any) => e.type === 'session_end').pop() as any; expect(se.broody_cents).toBe(nest); expect(se.broody_collects).toBe(1);
  });
  it('a menu open: no tap goes through', () => {
    const { g, frames, ctl } = setup(withTc({ broody_ready_share: 0.01 }, BRO)); frames(2); let n = 0; while (!g.broodyView()?.tappable && n++ < 3000) frames(1);
    ctl.setAtt(false); const c = g.state.coinsCents; g.tapBroody(); expect(g.state.coinsCents).toBe(c); expect(g.broodyView()!.state).toBe('frozen');
  });
  it('R20a reset: collectible_expired{broody_hen, reset} once when the hen was unlocked', () => {
    const { g, frames } = setup(); frames(2); g.beginReset();
    expect(g.telemetry.events().filter((e: any) => e.type === 'collectible_expired' && e.skin === 'broody_hen').map((e: any) => e.reason)).toEqual(['reset']);
  });
});

describe('TIMER_SYSTEMS order (Architect #134 Major: broody after incomeRef, abilities last)', () => {
  it('is [seedEvRng, streak, breeds, incomeRef, broody, frenzy, golden, abilities]', () => {
    expect(TIMER_SYSTEMS.map(s => s.name)).toEqual(['seedEvRng', 'streak', 'breeds', 'incomeRef', 'broody', 'frenzy', 'golden', 'abilities']);
  });
});
