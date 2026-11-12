// M5.1 breeds §8 telemetry emitters (HoE/breeds-telemetry-emitters, drift-audit row 34). Spec rev 3.8.9 ea922eb8 §8 L689-698;
// telemetry errata rev 15 5e12a591 #15-18 (L74-77); schema rows src/telemetry/schema.ts hatch_started / breed_revealed /
// breed_slotted / flock_complete + session_end breed_*. Every emitted event is checked with validateEvent (schema of record).
// Owned by Saves (#125, breeds-sim-prB-traits): session_end present_active_s / present_lost_count, offline_grant.away_bp (merged in beside these).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { applyOffline } from '../src/sim/offline';
import { serialize, SAVE_KEY } from '../src/save/save';
import { m5Persist } from '../src/save/m5-fields';
import { BREED_IDS, ROSTER, type BreedId } from '../src/config/breeds';
import { breedsOffline, sanitizeBreedsOnLoad, revealHatch, breedsLoadout, type BreedsSave } from '../src/sim/breeds';
import { startHatch, hatchCostCents, placeBreed, breedsTick } from '../src/sim/breeds-hatch';
import { sessionEndBreedsFields } from '../src/telemetry/breeds-session';
import { validateEvent, EVENT_SCHEMA, isPinned } from '../src/telemetry/schema';
import { isPinned as legacyIsPinned } from '../src/telemetry/telemetry';
import type { SimEvent } from '../src/sim/events';
import { mem } from './helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b; // flag on (ships at 1; default 0 in this data)
const OFF = b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 0, flockCompleteLogged: 0, ...o });
const st = (o: Partial<BreedsSave> = {}, F = 12, coins = 0): GameState => ({ ...initialState(b, 7), farmLevel: F, coinsCents: coins, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o) });
const maxed = (ids: readonly string[]) => Object.fromEntries(ids.map(id => [id, { stars: 2 }]));
const ENV = { ts: 1_762_772_400_000, sid: 'a1b2c3', fgMs: 0 };
const valid = (e: object) => validateEvent({ ...ENV, ...(e as { type: string }) });
const ticks = (s: GameState, n: number, ev?: SimEvent[], bb = BR) => { for (let i = 0; i < n; i++) s = step(s, 0.1, bb, ev); return s; };
const BREEDS_TYPES = ['hatch_started', 'breed_revealed', 'breed_slotted', 'flock_complete'];
const only = (ev: readonly { type: string }[], t: string) => ev.filter(e => e.type === t) as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
const boot = (bb: typeof b, kv: ReturnType<typeof mem>, t: number) => new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
const saved = (s: GameState, at: number) => { const kv = mem(); kv.setItem(SAVE_KEY, serialize(s, at, 5)); return kv; };
const END = { reason: 'unload', fg_ms: 600_000, taps_total: 300, taps_moved_eggs: 280, eggs_collected_manual: 900, coop_full_ms: 12_000, eggs_lost_while_full: 33.5, managed: true, farm_level: 12, collection_level: 5 };

describe('§8 hatch_started (errata #15): only a press that starts a hatch, cents, never track/cost_cents, not an upgrade', () => {
  it('free first hatch via apply(hatch): exactly 1 event, every field per the schema, cost 0, free true', () => {
    const s0 = st({}, 10, 12_345), ev: SimEvent[] = [], s = apply(s0, { type: 'hatch' }, BR, ev);
    expect(ev).toEqual([{ type: 'hatch_started', breed_id: s.breeds!.incubator!.breed, rarity: 'Common', cost: 0, coinsBefore: 12_345, pity_before: 0, free: true, farm_level: 10 }]);
    expect(valid(ev[0])).toEqual([]); expect('track' in ev[0] || 'cost_cents' in ev[0]).toBe(false);
  });
  it('paid hatch: cost = the charged cents (hatchCostCents), coinsBefore = coins before the charge, pity_before = pity before the roll', () => {
    const s0 = st({ freeHatchUsed: 1, pity: 3 }, 16, 1e12), cost = hatchCostCents(s0, BR), ev: SimEvent[] = [], s = apply(s0, { type: 'hatch' }, BR, ev);
    const id = s.breeds!.incubator!.breed as BreedId;
    expect(ev).toEqual([{ type: 'hatch_started', breed_id: id, rarity: ({ C: 'Common', R: 'Rare', E: 'Epic', L: 'Legendary' } as const)[ROSTER[id][0]], cost, coinsBefore: 1e12, pity_before: 3, free: false, farm_level: 16 }]);
    expect(s.coinsCents).toBe(1e12 - cost); expect(s.breeds!.incubator!.costCents).toBe(cost); expect(valid(ev[0])).toEqual([]);
  });
  it('a failed or unaffordable press emits nothing (BR-R7 / E1 / E4 / E5): poor, busy incubator, below unlock, flock complete, flag off', () => {
    const paid = st({ freeHatchUsed: 1 }, 16, 0);
    const cases: [GameState, typeof b][] = [[{ ...paid, coinsCents: hatchCostCents(paid, BR) - 1 }, BR], [st({ incubator: { breed: 'leghorn', remainingMs: 5_000, costCents: 0 } }, 12, 1e12), BR],
      [st({}, 9, 1e12), BR], [st({ owned: maxed(BREED_IDS), freeHatchUsed: 1 }, 30, 1e12), BR], [st({}, 12, 1e12), OFF]];
    for (const [s, bb] of cases) { const ev: SimEvent[] = []; expect(apply(s, { type: 'hatch' }, bb, ev)).toBe(s); expect(ev).toEqual([]); }
  });
  it('never an upgrade: Game.dispatch(hatch) logs hatch_started (pinned), no upgrade event; isUpgrade(hatch) stays false', () => {
    const g = boot(BR, mem(), T0); g.state = st({}, 10, 0); g.dispatch({ type: 'hatch' });
    const evs = g.telemetry.events(); expect(only(evs, 'hatch_started')).toHaveLength(1); expect(only(evs, 'upgrade')).toHaveLength(0);
    expect(legacyIsPinned('hatch_started')).toBe(true); expect(legacyIsPinned('flock_complete')).toBe(true);
    expect(isPinned({ type: 'hatch_started' })).toBe(true); expect(legacyIsPinned('breed_revealed') || legacyIsPinned('breed_slotted')).toBe(false);
  });
});

describe('§8 breed_revealed (errata #16): exactly once per hatch, at completion inside revealHatch', () => {
  it('tick path: one event on the completing tick (600 x 100 ms), wait_ms 60,000 sim ms, offline false; nothing before or after', () => {
    let s = startHatch(st({}, 10), BR); const id = s.breeds!.incubator!.breed as BreedId, ev: SimEvent[] = [];
    s = ticks(s, 599, ev); expect(only(ev, 'breed_revealed')).toEqual([]);
    s = ticks(s, 1, ev); expect(only(ev, 'breed_revealed')).toEqual([{ type: 'breed_revealed', breed_id: id, rarity: 'Common', dupe: false, stars_after: 0, offline: false, wait_ms: 60_000 }]);
    expect(valid(only(ev, 'breed_revealed')[0])).toEqual([]);
    ticks(s, 50, ev); expect(only(ev, 'breed_revealed')).toHaveLength(1);
  });
  it('duplicate: dupe true, stars_after = the new star count (capped at bc_star_cap)', () => {
    const ev: SimEvent[] = []; ticks(st({ owned: { sussex: { stars: 1 } }, incubator: { breed: 'sussex', remainingMs: 100, costCents: 1 } }, 12), 1, ev);
    expect(only(ev, 'breed_revealed')).toEqual([{ type: 'breed_revealed', breed_id: 'sussex', rarity: 'Common', dupe: true, stars_after: 2, offline: false, wait_ms: 60_000 }]);
  });
  it('offline path (applyOffline): offline true, wait_ms = ticks so far + the offline decrement capped at what was left', () => {
    const ev: SimEvent[] = [], r = applyOffline(st({ incubator: { breed: 'brahma', remainingMs: 40_000, costCents: 1 } }, 14), 600_000, BR, ev);
    expect(r.reveal).toBe('brahma');
    expect(only(ev, 'breed_revealed')).toEqual([{ type: 'breed_revealed', breed_id: 'brahma', rarity: 'Rare', dupe: false, stars_after: 0, offline: true, wait_ms: 60_000 }]);
    expect(valid(only(ev, 'breed_revealed')[0])).toEqual([]);
  });
  it('Game reload: mid-incubation (gap < remaining) emits nothing; a reload past completion emits exactly one offline:true, a second reload none', () => {
    // remainingMs is clamped to bc_hatch_time_s on load and any gap >= offlineMinSeconds (60 s) completes it, so "mid-incubation" = a < 60 s gap
    const kv = saved(st({ incubator: { breed: 'brahma', remainingMs: 50_000, costCents: 1 } }, 14), T0);
    const g1 = boot(BR, kv, T0 + 30_000); expect(only(g1.telemetry.events(), 'breed_revealed')).toEqual([]); expect(g1.state.breeds!.incubator!.remainingMs).toBe(50_000);
    const g2 = boot(BR, kv, T0 + 30_000 + 1_000_000); expect(only(g2.telemetry.events(), 'breed_revealed').map(e => [e.breed_id, e.offline, e.wait_ms])).toEqual([['brahma', true, 60_000]]);
    const g3 = boot(BR, kv, T0 + 30_000 + 1_000_000 + 5_000_000);
    expect(only(g3.telemetry.events(), 'breed_revealed')).toHaveLength(1); // the stored ring still has g2's one; no new emit
  });
  it('hidden >= 60 s (provisional sim dropped, grant step pays it): exactly one breed_revealed, offline true', () => {
    const g = boot(BR, mem(), T0); g.state = st({ incubator: { breed: 'brahma', remainingMs: 40_000, costCents: 1 } }, 14);
    let t = T0; (g as any).now = () => t; g.onHidden(T0); t = T0 + 30_000; g.frame(); t = T0 + 120_000; g.onShown(t);
    expect(only(g.telemetry.events(), 'breed_revealed').map(e => e.offline)).toEqual([true]);
  });
});

describe('§8 breed_slotted (errata #17): 1 event per slot per 1,000 ms window; move = 1; no-op = 0; sanitise = 0', () => {
  const owned = { leghorn: { stars: 0 }, sussex: { stars: 0 }, orpington: { stars: 1 } };
  it('manual place: nothing until the window closes (10 ticks), then 1 event with the schema fields; loadout counts settling breeds', () => {
    const ev: SimEvent[] = []; let s = placeBreed(st({ owned }, 20), BR, 0, 'leghorn');
    s = ticks(s, 9, ev); expect(only(ev, 'breed_slotted')).toEqual([]);
    s = ticks(s, 1, ev);
    expect(only(ev, 'breed_slotted')).toEqual([{ type: 'breed_slotted', slot: 0, prev_slot: null, breed_id: 'leghorn', prev_breed_id: null, cause: 'manual', loadout: 'P1A0B0', settling: 1, count: 1 }]);
    expect(valid(only(ev, 'breed_slotted')[0])).toEqual([]); ticks(s, 30, ev); expect(only(ev, 'breed_slotted')).toHaveLength(1);
  });
  it('a move between slots is ONE event, cause move, slot = destination, prev_slot = source; settle carried (settling 0)', () => {
    const ev: SimEvent[] = []; const s = placeBreed(st({ owned, slots: ['leghorn', null, null] }, 20), BR, 2, 'leghorn'); ticks(s, 10, ev);
    expect(only(ev, 'breed_slotted')).toEqual([{ type: 'breed_slotted', slot: 2, prev_slot: 0, breed_id: 'leghorn', prev_breed_id: null, cause: 'move', loadout: 'P1A0B0', settling: 0, count: 1 }]);
  });
  it('no-op: the same breed into the same slot, or empty over empty, emits 0 (and opens no window)', () => {
    const s0 = st({ owned, slots: ['leghorn', null, null] }, 20), ev: SimEvent[] = [];
    expect(placeBreed(s0, BR, 0, 'leghorn')).toBe(s0); const s1 = placeBreed(s0, BR, 1, null); expect(s1.breedsTel).toBeUndefined();
    ticks(s1, 20, ev); expect(only(ev, 'breed_slotted')).toEqual([]);
  });
  it('coalesced: 3 changes to one slot inside 1,000 ms -> 1 event, count 3; prev_* from before the FIRST change, the rest from the last', () => {
    const ev: SimEvent[] = []; let s = st({ owned, slots: ['orpington', null, null] }, 20);
    s = placeBreed(s, BR, 0, 'leghorn'); s = ticks(s, 3, ev); s = placeBreed(s, BR, 0, null); s = ticks(s, 3, ev); s = placeBreed(s, BR, 0, 'sussex');
    s = ticks(s, 3, ev); expect(only(ev, 'breed_slotted')).toEqual([]); // window opened at the first change: 9 ticks so far
    s = ticks(s, 1, ev);
    expect(only(ev, 'breed_slotted')).toEqual([{ type: 'breed_slotted', slot: 0, prev_slot: null, breed_id: 'sussex', prev_breed_id: 'orpington', cause: 'manual', loadout: 'P0A1B0', settling: 1, count: 3 }]);
    s = placeBreed(s, BR, 0, 'leghorn'); ticks(s, 10, ev); // a change after the window closed opens a new one
    expect(only(ev, 'breed_slotted').map(e => [e.count, e.breed_id, e.prev_breed_id])).toEqual([[3, 'sussex', 'orpington'], [1, 'leghorn', 'sussex']]);
  });
  it('windows are per slot: changes to two slots in the same second give 2 events (slot order on the same closing tick)', () => {
    const ev: SimEvent[] = []; let s = st({ owned }, 20); s = placeBreed(placeBreed(s, BR, 1, 'sussex'), BR, 0, 'leghorn'); ticks(s, 10, ev);
    expect(only(ev, 'breed_slotted').map(e => [e.slot, e.breed_id, e.loadout])).toEqual([[0, 'leghorn', 'P1A1B0'], [1, 'sussex', 'P0A1B0']]); // loadout = at that slot's last change
  });
  it('auto-slot on reveal: cause auto_reveal, emitted when its window closes (tick path)', () => {
    const ev: SimEvent[] = []; let s = st({ incubator: { breed: 'leghorn', remainingMs: 100, costCents: 0 }, freeHatchUsed: 1, hatches: 1 }, 12);
    s = ticks(s, 1, ev); expect(only(ev, 'breed_slotted')).toEqual([]); ticks(s, 10, ev);
    expect(only(ev, 'breed_slotted')).toEqual([{ type: 'breed_slotted', slot: 0, prev_slot: null, breed_id: 'leghorn', prev_breed_id: null, cause: 'auto_reveal', loadout: 'P1A0B0', settling: 1, count: 1 }]);
    expect(ev.map(e => e.type).filter(t => BREEDS_TYPES.includes(t))).toEqual(['breed_revealed', 'breed_slotted']);
  });
  it('auto-slot in the offline grant: breed_revealed{offline} then breed_slotted{auto_reveal} in the same step (the away ms closes the window)', () => {
    const ev: SimEvent[] = []; breedsOffline(st({ incubator: { breed: 'brahma', remainingMs: 40_000, costCents: 1 } }, 14), 120_000, BR, ev);
    expect(ev.map(e => e.type)).toEqual(['breed_revealed', 'breed_slotted']); expect((ev[1] as any).cause).toBe('auto_reveal'); expect(valid(ev[1])).toEqual([]);
  });
  it('sanitise-on-load emits 0 breed_slotted (save_migrated covers it)', () => {
    const ev: SimEvent[] = []; sanitizeBreedsOnLoad(st({ owned, slots: ['leghorn', 'leghorn', 'sussex'] }, 12), BR, ev);
    expect(ev.map(e => e.type)).toEqual(['save_migrated']);
  });
  it('session_end flushes an open window first (pagehide); the window state is session-only (never saved)', () => {
    const kv = mem(), g = boot(BR, kv, T0); g.state = st({ owned }, 20); g.dispatch({ type: 'placeBreed', slot: 0, id: 'leghorn' });
    expect(g.state.breedsTel!.win[0]).not.toBeNull(); expect('breedsTel' in (m5Persist(g.state) as GameState)).toBe(false);
    g.endSession(); const types = g.telemetry.events().map(e => e.type);
    expect(types.indexOf('breed_slotted')).toBeGreaterThan(-1); expect(types.indexOf('breed_slotted')).toBeLessThan(types.lastIndexOf('session_end'));
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).state.breedsTel).toBeUndefined();
  });
});

describe('§8 flock_complete (errata #18): once per save via breeds.flockCompleteLogged', () => {
  const almost = { ...maxed(BREED_IDS.filter(id => id !== 'cream_legbar')), cream_legbar: { stars: 1 } };
  it('tick path: emitted on the completing reveal; flockCompleteLogged 0 -> 1; elapsed = floor(sinceUnlockMs / 1000); sinceUnlockMs frozen after', () => {
    const ev: SimEvent[] = []; let s = st({ owned: almost, incubator: { breed: 'cream_legbar', remainingMs: 100, costCents: 1 }, hatches: 24, freeHatchUsed: 1, sinceUnlockMs: 123_456 }, 24);
    s = ticks(s, 1, ev);
    expect(only(ev, 'flock_complete')).toEqual([{ type: 'flock_complete', hatches: 24, farm_level: 24, elapsed_since_unlock_s: 123, backfilled: false }]);
    expect(valid(only(ev, 'flock_complete')[0])).toEqual([]); expect(s.breeds!.flockCompleteLogged).toBe(1);
    s = ticks(s, 100, ev); expect(s.breeds!.sinceUnlockMs).toBe(123_456); expect(only(ev, 'flock_complete')).toHaveLength(1);
  });
  it('backfilled = sinceUnlockBackfilled === 1 (HoQA N3)', () => {
    const ev: SimEvent[] = []; ticks(st({ owned: almost, incubator: { breed: 'cream_legbar', remainingMs: 100, costCents: 1 }, hatches: 24, sinceUnlockBackfilled: 1 }, 24), 1, ev);
    expect(only(ev, 'flock_complete').map(e => [e.backfilled, e.elapsed_since_unlock_s])).toEqual([[true, 0]]);
  });
  it('offline path: elapsed counts the away ms up to completion only, then freezes (no full-gap add)', () => {
    const ev: SimEvent[] = [], r = breedsOffline(st({ owned: almost, incubator: { breed: 'cream_legbar', remainingMs: 40_000, costCents: 1 }, hatches: 24, sinceUnlockMs: 10_000 }, 24), 600_000, BR, ev);
    expect(only(ev, 'flock_complete')).toEqual([{ type: 'flock_complete', hatches: 24, farm_level: 24, elapsed_since_unlock_s: 50, backfilled: false }]);
    expect(r.state.breeds!.sinceUnlockMs).toBe(50_000); expect(r.state.breeds!.flockCompleteLogged).toBe(1);
  });
  it('never re-emits: an already-logged save reloads with 0 events; revealHatch on a logged flock emits breed_revealed only', () => {
    const kv = saved(st({ owned: maxed(BREED_IDS), flockCompleteLogged: 1, hatches: 24, freeHatchUsed: 1 }, 24), T0);
    expect(only(boot(BR, kv, T0 + 3_600_000).telemetry.events(), 'flock_complete')).toEqual([]);
    const ev: SimEvent[] = []; revealHatch(fresh({ owned: almost, flockCompleteLogged: 1, incubator: { breed: 'cream_legbar', remainingMs: 0, costCents: 1 }, hatches: 24 }), BR, 3, { ev, farm: 24 });
    expect(ev.map(e => e.type)).toEqual(['breed_revealed']);
  });
});

describe('§8 session_end breeds fields (L698): flag on all present, flag off all absent; beside Saves-owned present_*', () => {
  const OWN = ['breed_hatches', 'breed_spend_cents', 'breed_present_eggs', 'breed_away_eggs', 'breed_broody_cents', 'breeds_owned', 'breed_slots_used', 'breed_loadout_end', 'breed_family_s'];
  it('Game session: hatches / spend (= Σ hatch_started.cost), owned, slots used, settled-only loadout, family seconds; schema-valid', () => {
    const g = boot(BR, mem(), T0); let t = T0; (g as any).now = () => t;
    g.state = st({ owned: { sussex: { stars: 0 }, orpington: { stars: 0 }, leghorn: { stars: 0 } }, slots: ['sussex', 'orpington', null], settleMs: [0, 150_000, 0], freeHatchUsed: 1 }, 20, 1e12);
    const cost = hatchCostCents(g.state, BR); g.dispatch({ type: 'hatch' });
    t += 2_000; g.frame(); t += 500; g.frame();
    g.endSession(); const e = g.telemetry.events().filter(x => x.type === 'session_end').pop()!;
    const hs = only(g.telemetry.events(), 'hatch_started'); expect(hs.map(x => x.cost)).toEqual([cost]);
    expect(Object.fromEntries(OWN.map(k => [k, (e as any)[k]]))).toEqual({ breed_hatches: 1, breed_spend_cents: cost, breed_present_eggs: 0, breed_away_eggs: 0, breed_broody_cents: 0,
      breeds_owned: 3, breed_slots_used: 2, breed_loadout_end: 'P0A1B0', breed_family_s: { P: 0, A: 2.5, B: 0 } });
    const { type: _t, ts: _ts, sessionMs: _m, ...rest } = e as any;
    expect(validateEvent({ ...ENV, type: 'session_end', ...END, ...rest })).toEqual([]);
    // After the #125 merge (restack): Saves' present_* sit beside the breed_* fields in the same session_end (schema-valid above).
    for (const k of ['present_active_s', 'present_lost_count']) expect(k in e).toBe(true);
  });
  it('flag on, no breeds blob yet: zeros and P0A0B0 (present, not absent); every value matches its schema FieldSpec', () => {
    const f = sessionEndBreedsFields(initialState(b, 7), BR); expect(Object.keys(f).sort()).toEqual([...OWN].sort());
    expect(f).toMatchObject({ breed_hatches: 0, breed_loadout_end: 'P0A0B0', breed_family_s: { P: 0, A: 0, B: 0 } });
    for (const k of OWN) expect(EVENT_SCHEMA.session_end.fields[k], k).toBeDefined();
  });
  it('per session: counters are session-only (a reload starts at 0)', () => {
    const kv = mem(), g = boot(BR, kv, T0); g.state = st({}, 10, 0); g.dispatch({ type: 'hatch' }); g.save();
    const g2 = boot(BR, kv, T0 + 1_000); expect(sessionEndBreedsFields(g2.state, BR)).toMatchObject({ breed_hatches: 0, breed_spend_cents: 0 });
  });
  it('flag off: session_end carries no breed field (absent, not 0) and the payload is exactly the pre-breeds one', () => {
    const g = boot(OFF, mem(), T0); g.state = st({ owned: { leghorn: { stars: 0 } } }, 12, 1e12); g.dispatch({ type: 'hatch' }); g.endSession();
    const e = g.telemetry.events().filter(x => x.type === 'session_end').pop()!;
    // #123 ST-AC20: session_end always carries base farm_level / taps_total / taps_moved_eggs. Breed fields stay absent.
    expect(Object.keys(e).sort()).toEqual(['farm_level', 'sessionMs', 'taps_moved_eggs', 'taps_total', 'ts', 'type']);
    expect(OWN.every(k => !(k in e))).toBe(true);
    expect(sessionEndBreedsFields(g.state, OFF)).toEqual({});
  });
});

describe('flag off / flag on with no hatch: nothing new', () => {
  it('flag off: hatch, placeBreed, 2,000 ticks, an offline grant and endSession emit no breeds event and create no breedsTel', () => {
    const g = boot(OFF, mem(), T0); let t = T0; (g as any).now = () => t;
    g.state = st({ owned: { leghorn: { stars: 0 } }, incubator: { breed: 'brahma', remainingMs: 100, costCents: 1 } }, 20, 1e12);
    g.dispatch({ type: 'hatch' }); g.dispatch({ type: 'placeBreed', slot: 0, id: 'leghorn' }); for (let i = 0; i < 20; i++) { t += 1_000; g.frame(); }
    g.onHidden(t); t += 300_000; g.onShown(t); g.endSession();
    expect(g.telemetry.events().filter(e => BREEDS_TYPES.includes(e.type))).toEqual([]); expect(g.state.breedsTel).toBeUndefined();
    const ev: SimEvent[] = []; const s = st({ incubator: { breed: 'brahma', remainingMs: 100, costCents: 1 } }, 20);
    expect(breedsTick(s, 0.1, OFF, undefined, ev)).toBe(s); expect(breedsOffline(s, 600_000, OFF, ev).state).toBe(s); expect(ev).toEqual([]);
  });
  it('flag on, no hatch: 1,000 ticks emit nothing and never create breedsTel (flag-on/no-hatch == flag-off, §7)', () => {
    const ev: SimEvent[] = [], s = ticks({ ...initialState(b, 7), farmLevel: 12 }, 1000, ev);
    expect(ev.filter(e => BREEDS_TYPES.includes(e.type))).toEqual([]); expect(s.breedsTel).toBeUndefined();
  });
  it('loadout helper: P/A/B family counts, settledOnly skips settling slots', () => {
    expect(breedsLoadout({ slots: ['leghorn', 'brahma', 'cochin'], settleMs: [0, 5, 0] })).toBe('P1A1B1');
    expect(breedsLoadout({ slots: ['leghorn', 'brahma', 'cochin'], settleMs: [0, 5, 0] }, true)).toBe('P1A0B1');
  });
});
