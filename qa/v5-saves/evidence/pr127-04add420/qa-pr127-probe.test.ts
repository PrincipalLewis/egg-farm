/**
 * QA probe — TASK HoQA/PR127-BAR @ 04add420 (Saves QA, scratch only; not product code).
 * Asserts SPEC values (m5.1-breeds-spec ea922eb8 §8 L692-700, BR-AC27 L930-938; errata 5e12a591 #15-18).
 * A failing probe = a spec miss at tip. Diagnostics printed with prefix QA-PROBE.
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../wt/src/config/balance';
import { Game } from '../wt/src/game';
import { initialState, type GameState } from '../wt/src/sim/state';
import { step } from '../wt/src/sim/tick';
import { startHatch, placeBreed } from '../wt/src/sim/breeds-hatch';
import { isFlockComplete, breedsLoadout, type BreedsSave } from '../wt/src/sim/breeds';
import { serialize, SAVE_KEY } from '../wt/src/save/save';
import { validateEvent } from '../wt/src/telemetry/schema';
import { BREED_IDS } from '../wt/src/config/breeds';
import type { SimEvent } from '../wt/src/sim/events';
import { mem } from '../wt/tests/helpers';

const T0 = Date.UTC(2026, 10, 10, 12);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const OFF = b;
const BT = ['hatch_started', 'breed_revealed', 'breed_slotted', 'flock_complete'];
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 0x9e3779b9,
  freeHatchUsed: 0, flockCompleteLogged: 0, ...o });
const st = (o: Partial<BreedsSave> = {}, F = 20, coins = 0): GameState => ({ ...initialState(b, 7), farmLevel: F, coinsCents: coins, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o) });
const boot = (bb: typeof b, kv: ReturnType<typeof mem>, t: number) => new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
const ENV = { ts: 1_762_772_400_000, sid: 'a1b2c3', fgMs: 0 };
const END = { reason: 'unload', fg_ms: 600_000, taps_total: 300, taps_moved_eggs: 280, eggs_collected_manual: 900, coop_full_ms: 12_000, eggs_lost_while_full: 33.5, managed: true, farm_level: 12, collection_level: 5 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEv = any;
const log = (...a: unknown[]) => console.log('QA-PROBE', ...a);

/** A Game whose clock the probe drives; frames in <= stepMs pieces (online play). */
class Clock { t: number; g: Game; constructor(public kv: ReturnType<typeof mem>, public bb: typeof b, t: number, s?: GameState) {
  this.t = t; this.g = boot(bb, kv, t); (this.g as AnyEv).now = () => this.t; if (s) this.g.state = s; }
  run(ms: number, stepMs = 1000) { let left = ms; while (left > 0) { const d = Math.min(stepMs, left); this.t += d; this.g.frame(); left -= d; } }
  reload(gapMs: number) { this.g.endSession(); this.t += gapMs; const g = boot(this.bb, this.kv, this.t); (g as AnyEv).now = () => this.t; this.g = g; }
}

describe('P1 BR-AC27 scripted session (Game, F20, slots 0/1 full, slot 2 empty, freeHatchUsed 0)', () => {
  it('counts, payloads, coalescing, offline reveal, reload, session_end, schema', () => {
    const kv = mem();
    const s0 = st({ owned: { brahma: { stars: 0 }, rhode_island_red: { stars: 0 }, cochin: { stars: 0 }, cream_legbar: { stars: 0 } }, slots: ['brahma', 'rhode_island_red', null] }, 20, 0);
    const c = new Clock(kv, BR, T0, s0);
    // 1. free hatch, revealed online -> auto-slots into slot 2
    c.g.dispatch({ type: 'hatch' }); c.run(61_000);
    const freeId = c.g.state.breeds!.slots[2]; log('free hatch breed / slot2', freeId);
    // 2. failed press (coins < cost)
    c.g.state = { ...c.g.state, coinsCents: 0 }; c.g.dispatch({ type: 'hatch' }); log('after failed press incubator', c.g.state.breeds!.incubator);
    // 3. paid hatch revealed online (no empty slot)
    c.g.state = { ...c.g.state, coinsCents: 1e12 }; c.g.dispatch({ type: 'hatch' }); c.run(61_000);
    // 4. third (paid) hatch; reload mid-incubation (20 s in, 30 s gap < 60 s); then a 10-min offline gap completes it
    c.g.dispatch({ type: 'hatch' }); c.run(20_000); c.reload(30_000);
    log('after mid-incubation reload remainingMs', c.g.state.breeds!.incubator?.remainingMs);
    c.reload(600_000);
    log('after 10-min gap incubator', c.g.state.breeds!.incubator, 'slots', c.g.state.breeds!.slots);
    c.run(2_000);
    // 5. manual place into slot 0, 6. move slot 2 -> slot 1, 7. same-slot no-op, 8. 5 swaps of slot 0 within 0.9 s
    c.g.dispatch({ type: 'placeBreed', slot: 0, id: 'cochin' }); c.run(2_000);
    c.g.dispatch({ type: 'placeBreed', slot: 1, id: freeId! }); c.run(2_000);
    c.g.dispatch({ type: 'placeBreed', slot: 0, id: 'cochin' }); c.run(2_000);
    const sw = ['cream_legbar', 'cochin', 'cream_legbar', 'rhode_island_red', 'cream_legbar'];
    sw.forEach((id, i) => { c.g.dispatch({ type: 'placeBreed', slot: 0, id }); if (i < 4) c.run(200, 200); });
    c.run(3_000);
    const endState = c.g.state; c.g.endSession();
    const evs: AnyEv[] = c.g.telemetry.events();
    const br = evs.filter(e => BT.includes(e.type));
    log('breed events', JSON.stringify(br.map(({ ts, sessionMs, ...r }) => r)));
    const hs = br.filter(e => e.type === 'hatch_started'), rv = br.filter(e => e.type === 'breed_revealed'), sl = br.filter(e => e.type === 'breed_slotted');
    expect(hs).toHaveLength(3);
    for (const e of hs) { expect('track' in e || 'cost_cents' in e).toBe(false); expect(typeof e.cost).toBe('number'); expect(typeof e.coinsBefore).toBe('number'); }
    expect(hs[0].free).toBe(true); expect(hs[0].cost).toBe(0);
    expect(evs.filter(e => e.type === 'upgrade')).toHaveLength(0);
    expect(rv).toHaveLength(3); expect(rv.map(e => e.offline)).toEqual([false, false, true]);
    expect(rv.map(e => e.breed_id)).toEqual(hs.map(e => e.breed_id));
    expect(rv.map(e => e.wait_ms)).toEqual([60_000, 60_000, 60_000]);
    expect(sl.map(e => [e.cause, e.count])).toEqual([['auto_reveal', 1], ['manual', 1], ['move', 1], ['manual', 5]]);
    expect(sl[3].prev_breed_id).toBe('cochin'); expect(sl[3].breed_id).toBe('cream_legbar'); expect(sl[3].slot).toBe(0);
    expect(sl[2]).toMatchObject({ slot: 1, prev_slot: 2, breed_id: freeId });
    expect(sl.reduce((a, e) => a + e.count, 0)).toBe(8);
    // offline reveal emitted in the grant step: before the first post-reload frame events; check order vs offline_grant
    const iOffRv = evs.findIndex(e => e.type === 'breed_revealed' && e.offline), iGrant = evs.findIndex(e => e.type === 'offline_grant');
    log('index offline breed_revealed', iOffRv, 'offline_grant', iGrant);
    // session_end
    const se = evs.filter(e => e.type === 'session_end');
    log('session_end breed fields', JSON.stringify(se.map(e => Object.fromEntries(Object.entries(e).filter(([k]) => k.startsWith('breed'))))));
    expect(se.reduce((a, e) => a + e.breed_spend_cents, 0)).toBe(hs.reduce((a, e) => a + e.cost, 0));
    // per-session: hatches/spend match hatch_started between session_end boundaries
    let prev = -1; for (const e of se) { const i = evs.indexOf(e); const seg = evs.slice(prev + 1, i).filter(x => x.type === 'hatch_started');
      expect(e.breed_hatches).toBe(seg.length); expect(e.breed_spend_cents).toBe(seg.reduce((a: number, x: AnyEv) => a + x.cost, 0)); prev = i; }
    for (const e of se) for (const k of ['breed_present_eggs', 'breed_away_eggs', 'breed_broody_cents']) expect(Number.isInteger(e[k])).toBe(true);
    expect(se[se.length - 1].breed_loadout_end).toBe(breedsLoadout(endState.breeds as BreedsSave, true));
    // schema T-AC9
    for (const e of br) { const { ts, sessionMs, ...r } = e; expect(validateEvent({ ...ENV, ...r }), e.type).toEqual([]); }
    for (const e of se) { const { type, ts, sessionMs, ...r } = e; expect(validateEvent({ ...ENV, type: 'session_end', ...END, ...r })).toEqual([]); }
  });
  it('control: swaps of one slot at sim 0.0 s and 1.0 s give 2 events', () => {
    const ev: SimEvent[] = []; let s = st({ owned: { leghorn: { stars: 0 }, sussex: { stars: 0 } } });
    s = placeBreed(s, BR, 0, 'leghorn'); for (let i = 0; i < 10; i++) s = step(s, 0.1, BR, ev); s = placeBreed(s, BR, 0, 'sussex'); for (let i = 0; i < 10; i++) s = step(s, 0.1, BR, ev);
    expect(ev.filter(e => e.type === 'breed_slotted').map((e: AnyEv) => e.count)).toEqual([1, 1]);
  });
});

describe('P2 flock_complete once per save, also after 2 reloads', () => {
  it('tick path completion then 2 reloads: exactly 1 in the exported ring, flockCompleteLogged 1', () => {
    const owned = Object.fromEntries(BREED_IDS.map(id => [id, { stars: 2 }])); owned.leghorn = { stars: 1 };
    const kv = mem(); const c = new Clock(kv, BR, T0, st({ owned, freeHatchUsed: 1, hatches: 23, incubator: { breed: 'leghorn', remainingMs: 500, costCents: 1 } }, 30, 0));
    c.run(2_000); c.reload(5_000); c.run(2_000); c.reload(700_000); c.run(2_000); c.g.endSession();
    const fc = c.g.telemetry.events().filter((e: AnyEv) => e.type === 'flock_complete');
    log('flock_complete', JSON.stringify(fc));
    expect(fc).toHaveLength(1); expect(c.g.state.breeds!.flockCompleteLogged).toBe(1);
    const { ts, sessionMs, ...r } = fc[0] as AnyEv; expect(validateEvent({ ...ENV, ...r })).toEqual([]);
  });
  it('pinned-store growth: fresh F30 to full flock: hatch_started <= 25 (24), flock_complete = 1', () => {
    let s = st({}, 30, 1e15); const ev: SimEvent[] = []; let guard = 0;
    while (!isFlockComplete(s.breeds as BreedsSave, BR) && guard++ < 60) { s = startHatch({ ...s, coinsCents: 1e15 }, BR, ev); for (let i = 0; i < 601; i++) s = step(s, 0.1, BR, ev); }
    const n = ev.filter(e => e.type === 'hatch_started').length, f = ev.filter(e => e.type === 'flock_complete').length;
    log('full flock hatch_started', n, 'flock_complete', f, JSON.stringify(ev.filter(e => e.type === 'flock_complete')));
    expect(n).toBeLessThanOrEqual(25); expect(f).toBe(1);
    // further presses emit nothing
    const ev2: SimEvent[] = []; startHatch({ ...s, coinsCents: 1e15 }, BR, ev2); expect(ev2).toEqual([]);
  });
});

describe('P3 hidden-tab paths (no duplicates)', () => {
  it('hidden 30 s (< 60 s, provisional sim kept): reveal during hidden -> exactly 1 breed_revealed, offline false', () => {
    const c = new Clock(mem(), BR, T0, st({ freeHatchUsed: 1, hatches: 1, incubator: { breed: 'brahma', remainingMs: 10_000, costCents: 1 } }, 14));
    c.g.onHidden(c.t); for (let i = 0; i < 30; i++) { c.t += 1000; c.g.frame(); } c.g.onShown(c.t); c.run(2_000);
    const rv = c.g.telemetry.events().filter((e: AnyEv) => e.type === 'breed_revealed'); log('hidden30 revealed', JSON.stringify(rv));
    expect(rv).toHaveLength(1); expect((rv[0] as AnyEv).offline).toBe(false);
  });
  it('open breed_slotted window, hidden 120 s (provisional dropped, grant step): exactly 1 breed_slotted', () => {
    const c = new Clock(mem(), BR, T0, st({ owned: { leghorn: { stars: 0 } } }, 20));
    c.g.dispatch({ type: 'placeBreed', slot: 0, id: 'leghorn' }); c.g.onHidden(c.t); for (let i = 0; i < 30; i++) { c.t += 1000; c.g.frame(); } c.t += 90_000; c.g.onShown(c.t); c.run(3_000);
    const sl = c.g.telemetry.events().filter((e: AnyEv) => e.type === 'breed_slotted'); log('hidden120 slotted', JSON.stringify(sl));
    expect(sl).toHaveLength(1);
  });
});

describe('P4 flag off (BR-AC27 last bullets / BR-AC53 flag-off bullet)', () => {
  it('0 breed events, no breed keys and no present_* keys on session_end', () => {
    const kv = mem(); const c = new Clock(kv, OFF, T0, st({ owned: { leghorn: { stars: 0 } } }, 20, 1e12));
    c.g.dispatch({ type: 'hatch' }); c.g.dispatch({ type: 'placeBreed', slot: 0, id: 'leghorn' }); c.run(65_000); c.reload(600_000); c.run(2_000); c.g.endSession();
    const evs: AnyEv[] = c.g.telemetry.events();
    expect(evs.filter(e => BT.includes(e.type))).toHaveLength(0);
    for (const e of evs.filter(e => e.type === 'session_end')) expect(Object.keys(e).filter(k => k.startsWith('breed') || k.startsWith('present_'))).toEqual([]);
  });
});
