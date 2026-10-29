// v5 F2 Game wiring: settleHiddenPeriod (>= 60 s / < 60 s, idempotent per period), the visible-throttled >= 60 s frame
// path (§9.1a), the reload path (AB-1), and flag-off byte identity of the stored save.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { accountHiddenPeriod } from '../src/save/hidden-time';
import { SAVE_KEY } from '../src/save/save';
import { mem } from './helpers';
import { TELEMETRY_KEY } from '../src/telemetry/telemetry';
import { ON } from './v5-f2-helpers';
const T0 = Date.UTC(2026, 9, 29, 12), tc = b.m4!.tc!;
function setup(bb = ON) {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' }); const evs: any[] = []; g.on(e => evs.push(e));
  g.state = { ...g.state, farmLevel: 12, evRngState: 99, nextSpawnRemainingS: 50, frenzyRemainingS: 11, broodyNestCents: 700, broodyHenIdx: 2,
    goldenEgg: { ageS: 12, slotId: 'S3', intervalS: 150 }, streakS: 0.27, streakHoldS: 2, abilities: { market_hand: { readyAt: T0 + 200_000, activeS: 10 } } };
  return { kv, g, clock, evs };
}
const types = (evs: any[]) => evs.map(e => e.type).filter(t => ['ability_ended', 'collectible_expired'].includes(t));
describe('F2 settleHiddenPeriod', () => {
  it('hidden >= 60 s (exactly 60.0 s): offline path once per period; a replay changes nothing', () => {
    const { g, clock, evs } = setup(); const s = clock.t; g.onHidden(s); clock.t += 60_000; g.frame();
    expect(g.onShown(clock.t)).toBeGreaterThanOrEqual(0);
    expect(types(evs)).toEqual(['ability_ended', 'collectible_expired']);
    const st: any = g.state; expect(st.goldenEgg).toBeUndefined(); expect(st.streakS).toBe(0); expect(st.abilities.market_hand).toEqual({ readyAt: T0 + 200_000 });
    expect(st).toMatchObject({ frenzyRemainingS: 11, broodyNestCents: 700, broodyHenIdx: 2 }); expect(st.nextSpawnRemainingS).toBeGreaterThanOrEqual(tc.egg_gap_min_s);
    const after = JSON.stringify(g.state); expect(accountHiddenPeriod(g, { startAt: s, endAt: clock.t + 1 })).toBeNull(); expect(g.onShown(clock.t)).toBe(0);
    expect(JSON.stringify(g.state)).toBe(after); expect(types(evs)).toHaveLength(2);
  });
  it('the save written by the offline path keeps readyAt (epoch, wall clock), never the egg or the streak', () => {
    const { g, kv, clock } = setup(); g.onHidden(clock.t); clock.t += 600_000; g.onShown(clock.t);
    const st = JSON.parse(kv.getItem(SAVE_KEY)!).state;
    expect(st.abilities).toEqual({ market_hand: { readyAt: T0 + 200_000 } }); // the cooldown ran out during the gap: ready on any read for (const k of ['goldenEgg', 'streakS', 'streakHoldS']) expect(k in st).toBe(false);
  });
  it('hidden < 60 s: online path; egg, streak, Frenzy and the call are exactly as at the hide (R7, R10, AB-10; s = the ruled cap 0.27, since K18 clamps anything above it)', () => {
    const { g, clock, evs } = setup(); g.onHidden(clock.t); clock.t += 5_000; g.onShown(clock.t);
    expect(types(evs)).toEqual([]); expect(g.state).toMatchObject({ streakS: 0.27, streakHoldS: 2, frenzyRemainingS: 11, goldenEgg: { ageS: 12 }, abilities: { market_hand: { readyAt: T0 + 200_000, activeS: 10 } } });
  });
  it('clock went back while hidden (mode none): no M5 change', () => {
    const { g, clock, evs } = setup(); g.onHidden(clock.t); clock.t -= 3_600_000; g.onShown(clock.t); expect(types(evs)).toEqual([]); expect((g.state as any).goldenEgg).toBeDefined();
  });
});
describe('F2 visible-throttled frame gap >= 60 s (§9.1a)', () => {
  it('M5 systems take the offline path at the gap start; the legacy 60 s catch-up is unchanged', () => {
    const { g, clock, evs } = setup(); clock.t += 600_000; g.frame();
    expect(types(evs)).toEqual(['ability_ended', 'collectible_expired']); expect((g.state as any).abilities.market_hand).toEqual({ readyAt: T0 + 200_000 }); expect((g.state as any).streakS).toBe(0);
    const ref = setup(b); ref.clock.t += 600_000; ref.g.frame(); expect(g.state.coop).toBe(ref.g.state.coop); expect(g.state.coinsCents).toBe(ref.g.state.coinsCents);
  });
  it('a 59 s frame is not the offline path', () => { const { g, clock, evs } = setup(); clock.t += 59_000; g.frame(); expect(types(evs)).toEqual([]); });
});
describe('F2 reload (AB-1) and flag-off identity', () => {
  it('a call running at save time ends once on load with offline; readyAt kept (wall clock) and clamped to [now, now + cd]', () => {
    const { g, kv, clock } = setup(); g.save(); clock.t += 30_000;
    const ended = () => { const t = kv.getItem(TELEMETRY_KEY) ?? ''; return [...t.matchAll(/\{[^{}]*"type":"ability_ended"[^{}]*\}/g)].map(m => m[0]); };
    const g2 = new Game(ON, kv, () => clock.t, 7); g2.telemetry.flush(true);
    expect((g2.state as any).abilities.market_hand).toEqual({ readyAt: T0 + 200_000 }); expect((g2.state as any).goldenEgg).toBeUndefined();
    expect(ended()).toHaveLength(1); expect(ended()[0]).toContain(`"effect_s":${tc.ability_s - 10}`); expect(ended()[0]).toContain('"cause":"offline"');
    const g3 = new Game(ON, kv, () => clock.t, 7); g3.telemetry.flush(true); expect((g3.state as any).abilities.market_hand.activeS).toBeUndefined(); expect(ended()).toHaveLength(1);
  });
  it('flags off: an M5 save loads, plays and re-saves with every M5 field byte-for-byte untouched', () => {
    const { kv, g } = setup(); g.save(); const raw = kv.getItem(SAVE_KEY)!; const m5 = JSON.parse(raw).state;
    const off = new Game(b, kv, () => T0, 7); off.onHidden(T0); off.onShown(T0 + 600_000); const back = JSON.parse(kv.getItem(SAVE_KEY)!).state;
    for (const k of ['abilities', 'nextSpawnRemainingS', 'frenzyRemainingS', 'evRngState', 'broodyNestCents', 'broodyHenIdx']) expect(back[k]).toEqual(m5[k]);
  });
});
