// v5 telemetry subset (HoE/tel-st-ac19-20): errata v5 rev. 15 5e12a591 (V-2b tap / session_end / offline_grant rows, V-3 pinned set),
// streak spec v1.3.3 b315dea1 §8 L288 + §8.1 (ST-AC19 / ST-AC20), m5.0-sizing L382 (empty_credited rule), breeds rev 3.8.9 §8 L699.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { Telemetry, TELEMETRY_KEY, AWAY_BP_NONE, ringPinned, type TEvent as RingEvent } from '../src/telemetry/telemetry';
import { validateEvent, type TEvent } from '../src/telemetry/schema';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';

type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const CREDIT = flags({ streak: 1, tapCoins: 1 }), OFF = b;
const working = { energy: 100, cdS: 0 };
const T0 = Date.UTC(2026, 10, 10, 9);
function game(bb: B, extra: Record<string, unknown> = {}) {
  const kv = mem(); let t = T0; const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  g.state = { ...g.state, farmLevel: 10, collectionLevel: 3, coop: 0, ...extra } as typeof g.state;
  const adv = (ms: number) => { t += ms; };
  /** One credited tap, then 1.1 s of sim so the next tap can be credited again (tc_tap_credit_min_s), coop re-emptied. The first credited
   *  tap starts the streak, and streak_started closes the open tap window (telemetry-spec L29 "closed by any other event"), so the
   *  ST-AC19 window is measured on a running streak. Clears the ring so assertions see only the taps under test. */
  const prime = () => { const coop = g.state.coop; g.dispatch({ type: 'collect' }); adv(1100); g.frame(); g.state = { ...g.state, coop };
    g.telemetry.flush(true); (g.telemetry as unknown as { buf: unknown[]; ses: Record<string, unknown> }).buf.length = 0; };
  return { kv, g, adv, prime };
}
const evs = (g: Game, type: string) => g.telemetry.events().filter(e => e.type === type);
const end = (g: Game) => { g.endSession(); return evs(g, 'session_end').at(-1)!; };
const sum = (xs: readonly RingEvent[], k: string) => xs.reduce((a, e) => a + (e[k] as number), 0);
const V5_END = ['taps_total', 'taps_moved_eggs', 'empty_credited', 'coop_hand', 'farm_level', 'credited_taps', 'tap_bonus_cents'];
const schemaErrs = (e: RingEvent, keys: readonly string[]) => { const { ts, sessionMs: _s, ...rest } = e;
  return validateEvent({ ...rest, ts, sid: 'a1b2c3', fgMs: 0 } as TEvent).filter(m => keys.some(k => m.startsWith(`${e.type}.${k}:`))); };

describe('[ST-AC19] tap {count, credited, empty_credited, bonus_cents} (streak §8 L288, errata rev. 15 V-2b)', () => {
  it('[ST-AC19] 50 taps in 1 s at F >= 8, Coop Hand hired, empty coop: one tap event count 50, credited 1, empty_credited 1, bonus_cents = the bonus paid', () => {
    const { g, prime } = game(CREDIT, { workers: { coop_hand: { ...working } } }); prime();
    const ses0 = { ...(g.telemetry as any).ses }; const coins0 = g.state.coinsCents;
    for (let i = 0; i < 50; i++) g.dispatch({ type: 'collect' });
    const bonus = g.state.coinsCents - coins0; const e = end(g); const taps = evs(g, 'tap');
    expect(taps).toHaveLength(1);
    expect(taps[0]).toMatchObject({ count: 50, eggs: 0, credited: 1, empty_credited: 1, bonus_cents: bonus });
    // [T-sub] session_end.credited_taps / tap_bonus_cents equal the sum over tap events
    expect((e.credited_taps as number) - ses0.credited_taps).toBe(sum(taps, 'credited')); expect((e.tap_bonus_cents as number) - ses0.tap_bonus_cents).toBe(sum(taps, 'bonus_cents'));
    expect(e).toMatchObject({ taps_total: 51, taps_moved_eggs: 0, empty_credited: 2, coop_hand: true, farm_level: 10 });
  });
  it('[ST-AC19] empty_credited needs all three: credited, 0 eggs moved, Coop Hand hired at tap time (m5.0-sizing L382)', () => {
    const t = new Telemetry(mem(), { ...b.telemetry, tap_batch_ms: 1000 }, () => 0);
    t.tap(0, { credited: true, coopHand: false }); // no Coop Hand
    t.tap(3, { credited: true, coopHand: true }); // moved eggs
    t.tap(0, { credited: false, coopHand: true }); // not credited
    t.tap(0, { credited: true, bonus_cents: 7, coopHand: true }); // counts
    t.flush(true);
    expect(t.events().filter(e => e.type === 'tap').map(({ count, eggs, credited, empty_credited, bonus_cents }) => ({ count, eggs, credited, empty_credited, bonus_cents })))
      .toEqual([{ count: 4, eggs: 3, credited: 3, empty_credited: 1, bonus_cents: 7 }]);
  });
  it('[ST-AC19] tapCoins off: bonus_cents is 0 and credited counts every credited tap', () => {
    const { g, adv } = game(flags({ streak: 1, tapCoins: 0 }), { workers: { coop_hand: { ...working } } });
    for (let i = 0; i < 3; i++) { g.dispatch({ type: 'collect' }); adv(1100); g.frame(); g.state = { ...g.state, coop: 0 }; }
    const e = end(g), taps = evs(g, 'tap'); // the first tap's window is closed by streak_started; all three still sum
    expect(sum(taps, 'credited')).toBe(3); expect(sum(taps, 'bonus_cents')).toBe(0); expect(e).toMatchObject({ credited_taps: 3, tap_bonus_cents: 0, empty_credited: 3 });
  });
  it('[ST-AC19] open tap window in the console snapshot carries the same credit fields', () => {
    const { g, prime } = game(CREDIT, { workers: { coop_hand: { ...working } } }); prime(); g.dispatch({ type: 'collect' });
    const open = JSON.parse(g.telemetry.snapshotJSON()).events.find((e: any) => e.type === 'tap' && e.open);
    expect(open).toMatchObject({ count: 1, credited: 1, empty_credited: 1, open: true });
  });
  it('[ST-AC19] the tap credit fields pass the schema (count, credited, empty_credited, bonus_cents)', () => {
    const { g } = game(CREDIT, { workers: { coop_hand: { ...working } } }); g.dispatch({ type: 'collect' }); g.telemetry.flush(true);
    expect(schemaErrs(evs(g, 'tap')[0], ['count', 'eggs', 'credited', 'empty_credited', 'bonus_cents'])).toEqual([]);
  });
});

describe('[ST-AC20] session_end v5 fields (streak §8.1, errata rev. 15 V-2b "+ §8.1")', () => {
  it('[ST-AC20] mid-session hire: 600 taps, Coop Hand after 200 -> taps_total 600, taps_moved_eggs 200, empty_credited 200, coop_hand, share 0.667', () => {
    let now = 0; const t = new Telemetry(mem(), b.telemetry, () => now);
    let hired = false; t.sessionEndContext = () => ({ farm_level: 12, coop_hand: hired, credit: true });
    // before the hire: 200 taps, 100 credited, 50 of them moved 0 eggs; 150 taps moved eggs
    for (let i = 0; i < 200; i++) { now += 10; t.tap(i < 150 ? 1 : 0, { credited: i >= 100, coopHand: false }); }
    hired = true;
    // after: 400 taps, 250 credited, 200 of those moved 0 eggs; 50 taps moved eggs (all credited)
    for (let i = 0; i < 400; i++) { now += 10; t.tap(i < 50 ? 1 : 0, { credited: i < 250, coopHand: true }); }
    t.track('session_end'); const e = t.events().find(x => x.type === 'session_end')!;
    expect(e).toMatchObject({ taps_total: 600, taps_moved_eggs: 200, empty_credited: 200, coop_hand: true, farm_level: 12, credited_taps: 350 });
    const share = ((e.taps_moved_eggs as number) + (e.empty_credited as number)) / (e.taps_total as number);
    expect(share).toBeCloseTo(0.667, 3);
  });
  it('[ST-AC20] a pre-hire empty credited tap never counts; coop_hand is true once a Coop Hand is hired (Game)', () => {
    const { g, adv } = game(CREDIT);
    g.dispatch({ type: 'collect' }); adv(1100); g.frame();
    g.state = { ...g.state, coop: 0, workers: { coop_hand: { ...working } } };
    g.dispatch({ type: 'collect' });
    expect(end(g)).toMatchObject({ taps_total: 2, taps_moved_eggs: 0, credited_taps: 2, empty_credited: 1, coop_hand: true });
  });
  it('[ST-AC20] taps_moved_eggs counts taps that moved >= 1 egg; farm_level is read at emit; no Coop Hand -> coop_hand false', () => {
    const { g } = game(CREDIT, { coop: 10000 });
    for (let i = 0; i < 4; i++) g.dispatch({ type: 'collect' });
    g.state = { ...g.state, farmLevel: 11 };
    expect(end(g)).toMatchObject({ taps_total: 4, taps_moved_eggs: 4, empty_credited: 0, coop_hand: false, farm_level: 11 });
  });
  it('[ST-AC20] the v5 session_end fields pass the schema', () => {
    const { g } = game(CREDIT, { workers: { coop_hand: { ...working } } }); g.dispatch({ type: 'collect' });
    expect(schemaErrs(end(g), V5_END)).toEqual([]);
  });
  it('Saves-owned session_end paused_* fields are not emitted by this subset', () => {
    const { g } = game(flags({ streak: 1, pause: 1 })); const e = end(g);
    expect(e).not.toHaveProperty('paused_worker_s'); expect(e).not.toHaveProperty('all_paused_s');
  });
});

describe('flag-off: credit fields absent, legacy shape kept (errata V-2b "flag-gated fields absent with their flag off")', () => {
  it('tap stays {count, eggs}; session_end carries only the base taps_total / taps_moved_eggs / farm_level', () => {
    const { g } = game(OFF, { coop: 10000 });
    for (let i = 0; i < 3; i++) g.dispatch({ type: 'collect' });
    const e = end(g);
    const tap = evs(g, 'tap')[0]; expect(Object.keys(tap).sort()).toEqual(['count', 'eggs', 'sessionMs', 'ts', 'type']);
    for (const k of ['credited_taps', 'tap_bonus_cents', 'empty_credited', 'coop_hand']) expect(e, k).not.toHaveProperty(k);
    expect(e).toMatchObject({ taps_total: 3, taps_moved_eggs: 3, farm_level: 10 });
  });
});

describe('offline_grant v5 field away_bp (errata rev. 15 V-2b, breeds §8 L699)', () => {
  const grant = (bb: B) => {
    const kv = mem(); let t = T0; const g0 = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g0.state = { ...g0.state, farmLevel: 12, hensLevel: 5 } as typeof g0.state; g0.save();
    t += 3_600_000; const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    return evs(g, 'offline_grant');
  };
  it('breeds on: away_bp present, int >= 0, 0 while BR-R13 applies no Away bp', () => {
    const [e] = grant(flags({ breeds: 1 })); expect(e).toBeDefined(); expect(e.away_bp).toBe(AWAY_BP_NONE);
    expect(schemaErrs(e, ['secondsAway', 'eggs', 'away_bp'])).toEqual([]);
  });
  it('breeds off: away_bp absent', () => { const [e] = grant(OFF); expect(e).toBeDefined(); expect(e).not.toHaveProperty('away_bp'); });
});

describe('[ST-AC19/20] the ring trims by the pinned set of errata rev. 15 V-3 (event-based isPinned)', () => {
  it('V-3 types, coop_full end and tip_shown{clock_wage} survive a flood; coop_full start, other tip_shown and tap are trimmed', () => {
    const t = new Telemetry(mem(), { ...b.telemetry, ring_size: 20 }, () => 0);
    t.track('ability_used', { worker: 'hawker' }); t.track('worker_paused', { worker: 'coop_hand' }); t.track('hatch_started', {});
    t.track('coop_full', { phase: 'end', durationMs: 5 }); t.track('coop_full', { phase: 'start' });
    t.track('tip_shown', { id: 'clock_wage' }); t.track('tip_shown', { id: 'other' });
    for (let i = 0; i < 500; i++) t.track('sell', { i });
    const types = t.events().map(e => `${e.type}:${e.phase ?? e.id ?? ''}`);
    for (const k of ['ability_used:', 'worker_paused:', 'hatch_started:', 'coop_full:end', 'tip_shown:clock_wage']) expect(types, k).toContain(k);
    for (const k of ['coop_full:start', 'tip_shown:other']) expect(types, k).not.toContain(k);
    expect(t.events().filter(e => !ringPinned(e))).toHaveLength(20);
  });
  it('a stored legacy:true event keeps its old type-based pin (no pin lost on the swap)', () => {
    const kv = mem(); kv.setItem(TELEMETRY_KEY, JSON.stringify([{ type: 'onboarding_legacy_step', ts: 1, sessionMs: 0 }, { type: 'sell', ts: 1, sessionMs: 0 }]));
    const t = new Telemetry(kv, { ...b.telemetry, ring_size: 5 }, () => 0); for (let i = 0; i < 50; i++) t.track('sell', { i });
    expect(t.events().some(e => e.type === 'onboarding_legacy_step' && e.legacy === true)).toBe(true);
  });
});
