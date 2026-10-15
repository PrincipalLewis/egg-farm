import { describe, it, expect, vi } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Telemetry, TELEMETRY_KEY } from '../src/telemetry/telemetry';
import { Game } from '../src/game';
import { save, SAVE_KEY } from '../src/save/save';
import { initialState, eggPriceCents } from '../src/sim/state';
import { mem, expOffline } from './helpers';
const clock = () => { const c = { t: 1_000_000 }; return { c, now: () => c.t }; };
describe('telemetry', () => {
  it('events carry ts + sessionMs', () => {
    const { c, now } = clock(); const t = new Telemetry(mem(), b.telemetry, now); c.t += 1500; t.track('x');
    expect(t.events()[0]).toMatchObject({ type: 'x', ts: 1_001_500, sessionMs: 1500 });
  });
  it('ring buffer capped at ring_size', () => {
    const t = new Telemetry(mem(), { ...b.telemetry, ring_size: 5000 }, () => 0);
    for (let i = 0; i < 6000; i++) t.track('e', { i }); expect(t.events()).toHaveLength(5000); expect(t.events()[0].i).toBe(1000);
  });
  it('taps batched per second with count + eggs; no storage write per tap', () => {
    const { c, now } = clock(); const kv = mem(); const spy = vi.spyOn(kv, 'setItem'); const t = new Telemetry(kv, b.telemetry, now);
    for (let i = 0; i < 8; i++) { t.tap(5); c.t += 100; } c.t += 300; t.tap(3);
    expect(spy).not.toHaveBeenCalled();
    t.flush(true); expect(spy).toHaveBeenCalledTimes(1);
    expect(t.events().filter(e => e.type === 'tap').map(e => [e.count, e.eggs])).toEqual([[8, 40], [1, 3]]);
  });
  it('flush writes only when dirty; persisted buffer reloads', () => {
    const kv = mem(); const t = new Telemetry(kv, b.telemetry, () => 0); t.flush(); expect(t.writes).toBe(0);
    t.track('a'); t.flush(); t.flush(); expect(t.writes).toBe(1);
    expect(new Telemetry(kv, b.telemetry, () => 0).events().map(e => e.type)).toEqual(['a']);
  });
  it('export JSON round-trips', () => {
    const t = new Telemetry(mem(), b.telemetry, () => 5); t.onboardingStep(1, 'collect'); t.onboardingSkip(2);
    const j = JSON.parse(t.exportJSON()); expect(j.events.map((e: any) => e.type)).toEqual(['onboarding_step', 'onboarding_skip']);
  });
  it('game emits session, sell, customer, upgrade, offline_grant, coop_full events', () => {
    const kv = mem(); save(kv, { ...initialState(b, 3), coinsCents: 1000 }, 0);
    const { c, now } = clock(); c.t = 120_000; const g = new Game(b, kv, now);
    g.dispatch({ type: 'dismissOffline' }); g.state = { ...g.state, basket: Math.max(g.state.basket, 60) };
    g.dispatch({ type: 'buyCollection' });
    c.t += 10_000; g.frame(); // first customer
    g.dispatch({ type: 'sellAll' });
    c.t += 50_000; g.frame(); // coop fills (50)
    g.dispatch({ type: 'collect' }); g.frame();
    g.endSession();
    const ev = JSON.parse(kv.getItem(TELEMETRY_KEY)!) as any[]; const types = ev.map(e => e.type);
    for (const t of ['session_start', 'offline_grant', 'upgrade', 'customer_arrive', 'sell', 'customer_served', 'coop_full', 'tap', 'session_end']) expect(types).toContain(t);
    expect(ev.find(e => e.type === 'upgrade')).toMatchObject({ upgrade: 'collection', newLevel: 1, cost: 1000, coinsBefore: 1000 });
    expect(ev.find(e => e.type === 'offline_grant')).toMatchObject({ secondsAway: 120, eggs: expOffline(120) });
    expect(ev.filter(e => e.type === 'coop_full').map(e => e.phase)).toEqual(['start', 'end']);
    expect(ev.find(e => e.type === 'sell')!.price).toBe(eggPriceCents(0, 1, b));
    expect(kv.getItem(SAVE_KEY)).not.toBeNull();
  });
});
