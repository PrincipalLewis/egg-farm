import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { TapFx, Throttle } from '../src/ui/fx';
import { fmtMoney, fmtCount, fmtAway, fmtTimeToAfford, IncomeRate } from '../src/ui/format';
const clock = () => { const c = { t: 0 }; return { c, now: () => c.t }; };
describe('tap combine + flying eggs (config feel tunables)', () => {
  const cfg = { ...b.feel, flightMs: b.feel.egg_flight_ms };
  it('config values', () => { expect(b.feel.tap_combine_window_ms).toBe(250); expect(b.feel.max_flying_eggs).toBe(5); });
  it('taps within the window combine into one floater total', () => {
    const { c, now } = clock(); const fx = new TapFx(cfg, now);
    expect(fx.tap(5)).toMatchObject({ combine: false, floaterTotal: 5 });
    c.t += b.feel.tap_combine_window_ms; expect(fx.tap(5)).toMatchObject({ combine: true, floaterTotal: 10 });
    c.t += b.feel.tap_combine_window_ms + 1; expect(fx.tap(3)).toMatchObject({ combine: false, floaterTotal: 3 });
  });
  it('never more than max_flying_eggs live flyers; budget frees after flight', () => {
    const { c, now } = clock(); const fx = new TapFx(cfg, now);
    expect(fx.tap(20).flyers).toBe(b.feel.max_flying_eggs);
    c.t += 50; expect(fx.tap(20).flyers).toBe(0);
    c.t += cfg.flightMs + 40 * b.feel.max_flying_eggs; expect(fx.tap(2).flyers).toBe(2);
    expect(fx.liveFlyers()).toBeLessThanOrEqual(b.feel.max_flying_eggs);
  });
  it('empty coop tap: no flyers, no merge', () => { const fx = new TapFx(cfg, () => 0); expect(fx.tap(0)).toEqual({ combine: false, floaterTotal: 0, flyers: 0 }); });
});
describe('queue full cue throttle', () => {
  it('at most once per queue_full_cue_min_gap_ms (3s)', () => {
    const { c, now } = clock(); const t = new Throttle(b.feel.queue_full_cue_min_gap_ms, now);
    expect(b.feel.queue_full_cue_min_gap_ms).toBe(3000);
    expect(t.ready()).toBe(true); c.t += 2999; expect(t.ready()).toBe(false); c.t += 1; expect(t.ready()).toBe(true);
  });
});
describe('formatters', () => {
  it('money: 2 dp under 1K, K/M above', () => { expect(fmtMoney(1240)).toBe('$12.40'); expect(fmtMoney(123450)).toBe('$1,234.50'); expect(fmtMoney(1_234_500)).toBe('$12.3K'); expect(fmtMoney(0)).toBe('$0.00'); });
  it('counts', () => { expect(fmtCount(35.9)).toBe('35'); expect(fmtCount(9999)).toBe('9,999'); expect(fmtCount(12_345)).toBe('12.3K'); expect(fmtCount(2_500_000)).toBe('2.5M'); });
  it('away', () => { expect(fmtAway(4320, 7200)).toBe('1h 12m'); expect(fmtAway(7200, 7200)).toBe('2h+'); expect(fmtAway(90, 7200)).toBe('1m'); });
  it('F7 time to afford', () => {
    expect(fmtTimeToAfford(null)).toBe('—'); expect(fmtTimeToAfford(44.2)).toBe('~45 s'); expect(fmtTimeToAfford(65)).toBe('~1 min 5 s');
    expect(fmtTimeToAfford(120)).toBe('~2 min'); expect(fmtTimeToAfford(25 * 60 + 40)).toBe('~26 min'); expect(fmtTimeToAfford(3900)).toBe('~1 h 5 min');
  });
  it('rolling 60s income', () => {
    const r = new IncomeRate(60_000); expect(r.secondsToAfford(0, 100)).toBeNull();
    r.add(0, 600); expect(r.centsPerSec(1000)).toBe(10); expect(r.secondsToAfford(1000, 100)).toBe(10); expect(r.centsPerSec(61_000)).toBe(0);
  });
});
