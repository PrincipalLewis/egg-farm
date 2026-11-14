// v5 streak UI, pure view model (product/collection/m5-streak-tap-coins-spec.md v1.3.3 b315dea1 §3.3/§3.5, ST-AC9/10/11/21/24/25;
// art-ux/m5-combo-tiers.md v0.3 ed4ded1d §0/§1/§2/§6, CT-AC1/2/5/11/15). Oracles are cap-relative: every number is read from config
// (ST-AC28), run at the v5 cap 0.27, the shipped balance.json cap and 0.40 (ST-AC11).
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { tcNum } from '../src/config/formulas';
import { streakTier } from '../src/sim/streak';
import { streakParams, tierThresholds, pctFloor, meterView, pillCopy, tierAria, StreakTiers, LiveThrottle, streakUiOn, tapCoinUiOn, coolCueMinTier } from '../src/ui/streak-view';

const withTc = (tc: Record<string, number>, flags: Record<string, number> = {}, enabled = 1): Balance =>
  ({ ...balance, m4: { ...balance.m4!, enabled, flags: { ...balance.m4!.flags, ...flags }, tc: { ...balance.m4!.tc, ...tc } } }) as Balance;
const B27 = withTc({ streak_cap: 0.27 }), B40 = withTc({ streak_cap: 0.40 }), BCFG = balance;

describe('flags (R13a, ST-AC29)', () => {
  it('both default off on the shipped balance', () => { expect(streakUiOn(balance)).toBe(false); expect(tapCoinUiOn(balance)).toBe(false); });
  it('each flag alone; m4.enabled required', () => {
    expect(streakUiOn(withTc({}, { streak: 1 }))).toBe(true); expect(tapCoinUiOn(withTc({}, { streak: 1 }))).toBe(false);
    expect(tapCoinUiOn(withTc({}, { tapCoins: 1 }))).toBe(true); expect(streakUiOn(withTc({}, { tapCoins: 1 }))).toBe(false);
    expect(streakUiOn(withTc({}, { streak: 1, tapCoins: 1 }, 0))).toBe(false); expect(tapCoinUiOn(withTc({}, { streak: 1, tapCoins: 1 }, 0))).toBe(false);
  });
});

describe('thresholds (§3.3, ST-AC11)', () => {
  it('cap 0.27 -> 0.07/0.14/0.20/0.27', () => expect(tierThresholds(streakParams(B27))).toEqual([0.07, 0.14, 0.2, 0.27]));
  it('cap 0.40 -> 0.10/0.20/0.30/0.40', () => expect(tierThresholds(streakParams(B40))).toEqual([0.1, 0.2, 0.3, 0.4]));
  it('follows the shipped config cap with no code change', () => {
    const p = streakParams(BCFG), T = tierThresholds(p);
    expect(T).toHaveLength(tcNum(BCFG, 'streak_tier_count')); expect(T[T.length - 1]).toBeCloseTo(tcNum(BCFG, 'streak_cap'), 9);
  });
  it('pctFloor survives float noise (0.29 -> 29, 0.07 -> 7, 0.187 -> 18)', () => {
    expect(pctFloor(0.29)).toBe(29); expect(pctFloor(0.07)).toBe(7); expect(pctFloor(0.187)).toBe(18); expect(pctFloor(0.57)).toBe(57);
  });
});

describe('meter view (§0, ST-AC21/24/25, CT-AC1/2)', () => {
  it('s = 0: hidden (row reserved by CSS), no lit ticks', () => {
    const v = meterView(0, 0, B27); expect(v.shown).toBe(false); expect(v.lit).toEqual([false, false, false, false]); expect(v.scale).toBe(0);
  });
  it('ST-AC21: s = 0.187 at cap 0.27 -> 69.26%, "+18% price", tier 2', () => {
    const v = meterView(0.187, 2, B27);
    expect(v.scale).toBeCloseTo(0.6926, 4); expect(v.label).toBe('+18% price'); expect(v.tier).toBe(2); expect(v.lit).toEqual([true, true, false, false]);
    expect(v.max).toBe(false); expect(v.cooling).toBe(false);
    expect(v.valueNow).toBe(18); expect(v.valueMax).toBe(27); expect(v.valueText).toBe('Streak +18% price, tier 2 of 4');
  });
  it('cap: gold, "MAX +27%", 4 lit ticks, valuetext "Streak max, +27% price"', () => {
    const v = meterView(0.27, 3, B27);
    expect(v.max).toBe(true); expect(v.label).toBe('MAX +27%'); expect(v.lit).toEqual([true, true, true, true]); expect(v.scale).toBe(1);
    expect(v.valueText).toBe('Streak max, +27% price');
  });
  it('decay start at the cap: not MAX any more, "+27% price, cooling"', () => {
    const v = meterView(0.27, 0, B27); expect(v.max).toBe(false); expect(v.label).toBe('+27% price'); expect(v.valueText).toBe('Streak +27% price, tier 4 of 4, cooling');
  });
  it('cap 0.40 (ST-AC11): MAX +40% and the bar maps 0..0.40', () => {
    expect(meterView(0.4, 3, B40).label).toBe('MAX +40%'); expect(meterView(0.2, 3, B40).scale).toBeCloseTo(0.5, 9);
  });
  it('cooling once the hold is spent (ST-AC25), valuetext gains ", cooling"', () => {
    const v = meterView(0.15, 0, B27); expect(v.cooling).toBe(true); expect(v.valueText).toBe('Streak +15% price, tier 2 of 4, cooling');
  });
  it('lit <=> s >= T_k at every step (CT-AC1)', () => {
    const T = tierThresholds(streakParams(B27));
    for (let i = 1; i <= 27; i++) { const s = Math.round(i) / 100, v = meterView(s, 1, B27); expect(v.lit).toEqual(T.map(t => s >= t - 1e-9)); }
  });
  it('reduced motion: fill in whole-percent steps (ST-AC24)', () => {
    expect(meterView(0.187, 1, B27, { rm: true }).scale).toBeCloseTo(18 / 27, 9);
  });
});

describe('copy (§3.3 table, combo-tiers §6)', () => {
  it('cap 0.27 pill copy', () => {
    expect([1, 2, 3, 4].map(k => pillCopy(k, B27))).toEqual(['Warm streak! +7% price', 'Hot streak! +14% price', 'On fire! +20% price', 'MAX +27%!']);
  });
  it('cap 0.40 pill copy (CT-AC7)', () => {
    expect([1, 2, 3, 4].map(k => pillCopy(k, B40))).toEqual(['Warm streak! +10% price', 'Hot streak! +20% price', 'On fire! +30% price', 'MAX +40%!']);
  });
  it('aria announcements', () => {
    expect([1, 2, 3, 4].map(k => tierAria(k, B27))).toEqual(['Warm streak, +7% price', 'Hot streak, +14% price', 'On fire, +20% price', 'Streak max, +27% price']);
  });
});

describe('tier-up hysteresis (§3.3, ST-AC9/10, CT-AC5/11)', () => {
  it('ST-AC9: a 0 -> cap climb gives exactly 4 tier-ups at 7/14/20/27', () => {
    const t = new StreakTiers(), ups: [number, number][] = [];
    for (let i = 1; i <= 27; i++) { const s = i / 100, r = t.update(s, false, B27); if (r.tierUp) ups.push([r.tierUp, i]); }
    expect(ups).toEqual([[1, 7], [2, 14], [3, 20], [4, 27]]);
  });
  it('K4: staying at the cap never re-fires tier 4', () => {
    const t = new StreakTiers(); for (let i = 1; i <= 27; i++) t.update(i / 100, false, B27);
    for (let i = 0; i < 20; i++) expect(t.update(0.27, false, B27).tierUp).toBeUndefined();
  });
  it('ST-AC10: oscillating 0.19 <-> 0.20 pops tier 3 once; again only after s < 0.14 and a re-cross', () => {
    const t = new StreakTiers(); let n3 = 0; const step = (s: number) => { if (t.update(s, false, B27).tierUp === 3) n3++; };
    for (let i = 1; i <= 20; i++) step(i / 100);
    for (let j = 0; j < 10; j++) { step(0.19); step(0.2); }
    expect(n3).toBe(1);
    step(0.15); step(0.2); expect(n3).toBe(1); // 0.15 is not below T2 = 0.14
    step(0.13); for (let i = 14; i <= 20; i++) step(i / 100); expect(n3).toBe(2);
  });
  it('K18: lowering the cap below s never pops (clamp)', () => {
    const t = new StreakTiers(); for (let i = 1; i <= 30; i++) t.update(i / 100, false, B40);
    expect(t.update(0.27, false, B27).tierUp).toBeUndefined();
  });
  it('a reset to 0 (reload/offline) is silent and re-arms every tier', () => {
    const t = new StreakTiers(); for (let i = 1; i <= 27; i++) t.update(i / 100, false, B27);
    const r = t.update(0, false, B27); expect(r.tierUp).toBeUndefined(); expect(r.coolStart).toBeUndefined();
    expect(t.update(0.07, false, B27).tierUp).toBe(1);
  });
  it('cooling start fires once per run, only if tier >= 2 was reached', () => {
    const a = new StreakTiers(); for (let i = 1; i <= 10; i++) a.update(i / 100, false, B27);
    expect(a.update(0.1, true, B27).coolStart).toBeUndefined();
    const b = new StreakTiers(); for (let i = 1; i <= 15; i++) b.update(i / 100, false, B27);
    expect(b.update(0.15, true, B27).coolStart).toBe(true); expect(b.update(0.14, true, B27).coolStart).toBeUndefined();
    b.update(0.15, false, B27); expect(b.update(0.15, true, B27).coolStart).toBe(true); // a tap re-heated it, then a new cooling start
  });
  it("config [QA-D-1113-STAC18-8]: the cool-cue tier is tcNum(b,'streak_cool_cue_min_tier') (#143 = 2), not a constant; missing throws", () => {
    expect(tcNum(BCFG, 'streak_cool_cue_min_tier')).toBe(2); expect(coolCueMinTier(BCFG)).toBe(2); expect(coolCueMinTier(B27)).toBe(2);
    const B3 = withTc({ streak_cap: 0.27, streak_cool_cue_min_tier: 3 });
    const two = new StreakTiers(); for (let i = 1; i <= 15; i++) two.update(i / 100, false, B3);
    expect(streakTier(0.15, B3)).toBe(2); expect(two.update(0.15, true, B3).coolStart).toBeUndefined(); // tier 2 no longer enough at 3
    const three = new StreakTiers(); for (let i = 1; i <= 22; i++) three.update(i / 100, false, B3);
    expect(streakTier(0.22, B3)).toBe(3); expect(three.update(0.22, true, B3).coolStart).toBe(true);
    const tc: any = { ...BCFG.m4!.tc }; delete tc.streak_cool_cue_min_tier; const miss = { ...BCFG, m4: { ...BCFG.m4!, tc } } as Balance;
    expect(() => coolCueMinTier(miss)).toThrow(/tc_streak_cool_cue_min_tier/);
  });
});

describe('LiveThrottle (combo-tiers §6: >= 2 s, latest wins; R16 coin region <= 1/s)', () => {
  it('first message is immediate, later ones wait for the gap, latest wins', () => {
    const l = new LiveThrottle(2000);
    expect(l.push('a', 0)).toBe('a'); expect(l.push('b', 500)).toBeNull(); expect(l.push('c', 900)).toBeNull();
    expect(l.poll(1999)).toBeNull(); expect(l.poll(2000)).toBe('c'); expect(l.poll(5000)).toBeNull();
  });
  it('holds while frozen and drops the pending text on clear()', () => {
    const l = new LiveThrottle(2000); l.push('a', 0); l.push('b', 100);
    expect(l.poll(3000, true)).toBeNull(); l.clear(); expect(l.poll(4000)).toBeNull();
  });
});

describe('StreakTiers fromTap = false (resync / remount)', () => {
  it('a rise seen outside a credited tap never pops, but still disarms the crossed tiers', () => {
    const t = new StreakTiers(); t.update(0, false, B27);
    expect(t.update(0.2, false, B27, false).tierUp).toBeUndefined();
    expect(t.update(0.21, false, B27).tierUp).toBeUndefined();
  });
});
