// HoE/v5-worker-paused (Saves #132, stacked on #119): the worker_paused emitter in sim/pause.ts pauseWorker (pause spec v1.3.18 §12;
// exclusive emission v1.3.11, D-PMW-2026-10-30-10, D-HOE-20261030-17/-18; G0-API §2 / §9). worker_resumed{cause}, Manage-resume and
// needManage skipping paused workers are #119's (tests/v5-workers-drift-d1d2.test.ts); not repeated here.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { pauseWorker } from '../src/sim/pause';
import { pauseToggleFields } from '../src/sim/pause-events';
import { EVENT_SCHEMA, validateEvent } from '../src/telemetry/schema';
import type { SimEvent } from '../src/sim/events';

type B = typeof b;
const withFlags = (f: Record<string, number>): B => ({ ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, ...f } } }) as B;
const P = withFlags({ pause: 1 });
const P_ABIL = withFlags({ pause: 1, abilities: 1 });
const P_RC2 = withFlags({ pause: 1, rc2Refill: 1 });
const OFF = b;
const farm = (extra: Partial<GameState> = {}, bb = P): GameState => ({
  ...initialState(bb, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, coinsCents: 1e9, graderTier: 3, ...extra,
});
const W = (energy = 80, extra: object = {}) => ({ energy, cdS: 1.5, ...extra });
const paused = (evs: SimEvent[]) => evs.filter(e => e.type === 'worker_paused');
const resumed = (evs: SimEvent[]) => evs.filter(e => (e as { type: string }).type === 'worker_resumed');

describe('[PAU-AC13][RF-AC12][§12] worker_paused fires exactly once per Pause transition (pause = 1, rc2Refill = 0)', () => {
  it('[PAU-AC13][§12] one event with exactly the §12 fields, sampled from the pre-pause state; the state equals the sink-less transition', () => {
    const s = farm({ workers: { coop_hand: W(25.6), market_hand: W(80) } });
    const ev: SimEvent[] = [];
    const n = pauseWorker(s, 'coop_hand', P, ev);
    expect(n).toEqual(pauseWorker(s, 'coop_hand', P)); // the sink changes events only, never the state
    expect(n.workers.coop_hand!.paused).toBe(true);
    expect(ev).toEqual([{ type: 'worker_paused', worker: 'coop_hand', farm: 12, energy_pct: 26, mood: 'tired', unpaid: false, ability_active: false, golden_on_screen: false, frenzy_active: false }]);
    const { type, ...fields } = ev[0] as Extract<SimEvent, { type: 'worker_paused' }>;
    expect(Object.keys(fields).sort()).toEqual(Object.keys(EVENT_SCHEMA.worker_paused.fields).sort());
    expect(validateEvent({ type, ts: 1_761_830_000_000, sid: 'a1b2c3', fgMs: 100, ...fields })).toEqual([]);
  });
  it('[PAU-AC13] a second Pause on an already paused worker is a no-op: same object, 0 events (exactly once per transition)', () => {
    const ev: SimEvent[] = [];
    const s1 = pauseWorker(farm({ workers: { hawker: W(60) } }), 'hawker', P, ev);
    const s2 = pauseWorker(s1, 'hawker', P, ev);
    expect(s2).toBe(s1); expect(paused(ev)).toHaveLength(1); expect(resumed(ev)).toHaveLength(0);
  });
  it('[PAU-AC13][§12] mood / unpaid / golden_on_screen / frenzy_active / ability_active come from the pre-pause state', () => {
    const ev: SimEvent[] = [];
    const s = farm({ workers: { market_hand: W(0, { unpaid: true }), grader: W(0) }, goldenEgg: { ageS: 1, slotId: 'S1', intervalS: 60 } as GameState['goldenEgg'], frenzyRemainingS: 4,
      abilities: { market_hand: { activeS: 5 } } }, P_ABIL);
    pauseWorker(s, 'market_hand', P_ABIL, ev);
    pauseWorker(s, 'grader', P_ABIL, ev);
    expect(ev).toEqual([
      { type: 'worker_paused', worker: 'market_hand', farm: 12, energy_pct: 0, mood: 'unpaid', unpaid: true, ability_active: true, golden_on_screen: true, frenzy_active: true },
      { type: 'worker_paused', worker: 'grader', farm: 12, energy_pct: 0, mood: 'asleep', unpaid: false, ability_active: false, golden_on_screen: true, frenzy_active: true },
    ]);
  });
  it('[§12] energy_pct is an integer 0..100 (rounded, clamped)', () => {
    const ev: SimEvent[] = [];
    pauseWorker(farm({ workers: { hawker: W(99.6) } }), 'hawker', P, ev);
    pauseWorker(farm({ workers: { hawker: W(100.4) } }), 'hawker', P, ev);
    expect(ev.map(e => (e as { energy_pct: number }).energy_pct)).toEqual([100, 100]);
  });
  it('[§12][G0 §2] pauseToggleFields is the one pre-pause sampler (shared with rest_toggled{on:true} at rc2Refill = 1)', () => {
    const s = farm({ workers: { hawker: W(50) } });
    expect(pauseToggleFields(s, 'hawker', P)).toEqual({ farm: 12, mood: 'working', unpaid: false, ability_active: false, golden_on_screen: false, frenzy_active: false });
  });
});

describe('[AC-P1][AC-P2][E13] no worker_paused and no state change when Pause does not apply', () => {
  it('[AC-P1][E13] pause = 0: same object, 0 events, even with a stray paused:true', () => {
    for (const ws of [{ hawker: W(50) }, { hawker: W(50, { paused: true }) }]) {
      const s = farm({ workers: ws }, OFF); const ev: SimEvent[] = [];
      expect(pauseWorker(s, 'hawker', OFF, ev)).toBe(s); expect(ev).toEqual([]);
    }
  });
  it('[AC-P2] below tc_pause_unlock_farm, or not hired: same object, 0 events', () => {
    const ev: SimEvent[] = [];
    const low = farm({ farmLevel: 9, workers: { hawker: W(50) } });
    expect(pauseWorker(low, 'hawker', P, ev)).toBe(low);
    const none = farm({ workers: {} });
    expect(pauseWorker(none, 'hawker', P, ev)).toBe(none);
    expect(ev).toEqual([]);
  });
  it('[PAU-AC13][RF-AC12][TEL-AC14] rc2Refill = 1: the pause still applies, but 0 worker_paused (exclusive emission: rest_toggled only)', () => {
    const s = farm({ workers: { hawker: W(50) } }, P_RC2); const ev: SimEvent[] = [];
    const n = pauseWorker(s, 'hawker', P_RC2, ev);
    expect(n).toEqual(pauseWorker(s, 'hawker', P_RC2, [])); expect(n.workers.hawker!.paused).toBe(true);
    expect(ev).toEqual([]);
  });
  it('[AC-P1] no sink: the transition is the same as with a sink and nothing throws', () => {
    const s = farm({ workers: { hawker: W(50) } });
    expect(pauseWorker(s, 'hawker', P)).toEqual(pauseWorker(s, 'hawker', P, []));
  });
});
