// v5 #1 golden Game wiring (Features): pagehide / takeover / reset seams, the spawn driver (UI-measured valid spot ids, R14/R15),
// the attended egg tap, and Game's per-session collectible_id (Architect contracts arch-golden-slice2-contracts-20261105 #1/#3/#5;
// Saves-confirmed endSession order streakPeak -> goldenUnload('reload') + emit -> session_end -> save -> flush(true)).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { nextRand, type GameState } from '../src/sim/state';
import { validSpotIds, type SpotCentre, type SpotZone } from '../src/ui/golden-spots';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
type B = typeof b;
const flags = (f: Record<string, number>, bb: B = ON) => ({ ...bb, m4: { ...bb.m4!, flags: { ...bb.m4!.flags, ...f } } }) as B;
const G = flags({ golden: 1, streak: 0, broody: 0, abilities: 0 }), OFF = flags({ golden: 0, streak: 0, broody: 0, abilities: 0 });
const tc = G.m4!.tc!, T0 = Date.UTC(2026, 10, 5, 20);
function setup(bb: B = G, st: Partial<GameState> = {}, attended = true) {
  const kv = mem(); let t = T0; const clock = { get t() { return t; }, set t(v) { t = v; } };
  const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' }); const evs: any[] = []; g.on(e => evs.push(e));
  g.state = { ...g.state, farmLevel: 10, collectionLevel: 5, coinsCents: 1_000_000, ...st } as GameState;
  let probeCalls = 0, spots: readonly string[] = ['S2', 'S5']; let att = attended;
  g.setAttendedProbe(() => att); g.setSpotProbe(() => { probeCalls++; return spots; });
  const ctl = { setSpots(s: readonly string[]) { spots = s; }, get calls() { return probeCalls; }, setAttended(a: boolean) { att = a; } };
  /** n frames of ms each (focus min(ms, 1 s) while attended). */
  const frames = (n: number, ms = 100) => { for (let i = 0; i < n; i++) { clock.t += ms; g.frame(); } };
  return { kv, g, clock, evs, ctl, frames };
}
const gold = (evs: any[]) => evs.filter(e => /^collectible_|^frenzy_/.test(e.type));
const tel = (g: Game) => g.telemetry.events().filter((e: any) => /^collectible_|^frenzy_|^session_end$|^save_reset$/.test(e.type)).map((e: any) => e.type);
const withNextU = (s: GameState, lo: number, hi: number): GameState => { for (let x = 1; ; x++) { const [, u] = nextRand(x); if (u >= lo && u < hi) return { ...s, evRngState: x }; } };
const graceFrames = Math.ceil(tc.spawn_grace_ms / 100) + 1;

describe('golden Game: spawn driver (R14/R15, sizing §12.2)', () => {
  it('flag off: the spot probe is never read; tap / layout / frames change nothing golden', () => {
    const { g, evs, ctl, frames } = setup(OFF, { nextSpawnRemainingS: 0 }); frames(50); g.layoutChanged(); g.tapGolden();
    expect(ctl.calls).toBe(0); expect(gold(evs)).toEqual([]); expect(g.state.goldenEgg).toBeUndefined();
  });
  it('due + attended: Game measures the valid spot ids once and dispatches spawnGolden; collectible_id 1', () => {
    const { g, evs, ctl, frames } = setup(G, { nextSpawnRemainingS: 2 }); frames(19); expect(ctl.calls).toBe(0);
    frames(2); expect(ctl.calls).toBe(1); expect(['S2', 'S5']).toContain(g.state.goldenEgg!.slotId);
    expect(gold(evs)).toEqual([expect.objectContaining({ type: 'collectible_spawned', skin: 'golden_egg', collectible_id: 1, slot_id: g.state.goldenEgg!.slotId })]);
    frames(10); expect(ctl.calls).toBe(1); // one egg on screen: no more measuring (R4)
  });
  it('not attended (menu / sheet): no focus, no measuring, no spawn', () => {
    const { g, ctl, frames } = setup(G, { nextSpawnRemainingS: 0 }, false); frames(30); expect(ctl.calls).toBe(0); expect(g.state.goldenEgg).toBeUndefined();
  });
  it('R15: an empty list defers; re-measured after 500 ms of focus, not before; a layout change re-measures at once', () => {
    const { g, evs, ctl, frames } = setup(G, { nextSpawnRemainingS: 0 }); ctl.setSpots([]); frames(1); expect(ctl.calls).toBe(1);
    frames(4); expect(ctl.calls).toBe(1); frames(2); expect(ctl.calls).toBe(2); expect(g.state.goldenEgg).toBeUndefined();
    ctl.setSpots(['S7']); g.layoutChanged(); expect(ctl.calls).toBe(3); expect(g.state.goldenEgg!.slotId).toBe('S7');
    expect(gold(evs)[0].deferred_ms).toBeGreaterThanOrEqual(500);
  });
  it('layoutChanged while not due, while unattended or with an egg on screen: no measuring', () => {
    const a = setup(G, { nextSpawnRemainingS: 30 }); a.g.layoutChanged(); expect(a.ctl.calls).toBe(0);
    const c = setup(G, { nextSpawnRemainingS: 0 }, false); c.g.layoutChanged(); expect(c.ctl.calls).toBe(0);
    const e = setup(G, { nextSpawnRemainingS: 0, goldenEgg: { ageS: 1, slotId: 'S1', intervalS: 45 } }); e.g.layoutChanged(); expect(e.ctl.calls).toBe(0);
  });
});

describe('golden Game: tap + collectible_id (R6, R19/R20, §8)', () => {
  it('tap under a menu does nothing (R6); attended after the grace: one reward, same collectible_id; the next egg is id 2', () => {
    const { g, evs, ctl, frames } = setup(G, { nextSpawnRemainingS: 0 }); frames(1); frames(graceFrames);
    ctl.setAttended(false); const c0 = g.state.coinsCents; g.tapGolden(); expect(g.state.goldenEgg).toBeDefined(); expect(g.state.coinsCents).toBe(c0);
    ctl.setAttended(true); g.state = withNextU(g.state, 0, 0.4); g.tapGolden(); g.tapGolden();
    const got = gold(evs).filter(e => e.type === 'collectible_collected'); expect(got).toHaveLength(1); expect(got[0]).toMatchObject({ collectible_id: 1, reward_type: 'cash' });
    g.state = { ...g.state, nextSpawnRemainingS: 0, goldenPending: undefined }; frames(1);
    expect(gold(evs).filter(e => e.type === 'collectible_spawned').map(e => e.collectible_id)).toEqual([1, 2]);
  });
  it('a Frenzy roll: frenzy_started and the later frenzy_ended{timeout} carry the collectible_id of the egg that started it', () => {
    const { g, evs, frames } = setup(G, { nextSpawnRemainingS: 0 }); frames(1); frames(graceFrames);
    g.state = withNextU(g.state, 0.5, 0.7); g.tapGolden(); frames(Math.round(tc.frenzy_s * 10) + 5);
    const f = gold(evs).filter(e => e.type.startsWith('frenzy_')); expect(f.map(e => [e.type, e.collectible_id])).toEqual([['frenzy_started', 1], ['frenzy_ended', 1]]);
    expect(f[1].reason).toBe('timeout');
    const t = g.telemetry.events().filter((e: any) => e.type === 'frenzy_ended'); expect(t[0]).toMatchObject({ collectible_id: 1 });
  });
  it('an egg of unknown origin (restored state) forwards with no collectible_id', () => {
    const { g, evs } = setup(G, { goldenEgg: { ageS: 5, slotId: 'S1', intervalS: 45 } }); g.state = withNextU(g.state, 0, 0.4); g.tapGolden();
    expect('collectible_id' in gold(evs)[0]).toBe(false);
  });
});

describe('golden Game: pagehide / takeover / reset seams (R10b, R10c, A24-1)', () => {
  it('endSession: collectible_expired{reload} with its id BEFORE session_end; the save holds the fresh gap and no egg', () => {
    const { g, kv, frames } = setup(G, { nextSpawnRemainingS: 0 }); frames(1); g.endSession();
    expect(tel(g)).toEqual(['collectible_spawned', 'collectible_expired', 'session_end']);
    expect(g.telemetry.events().find((e: any) => e.type === 'collectible_expired')).toMatchObject({ reason: 'reload', collectible_id: 1 });
    const st = JSON.parse(kv.getItem(SAVE_KEY)!).state; expect('goldenEgg' in st || 'goldenPending' in st).toBe(false);
    expect(st.nextSpawnRemainingS).toBeGreaterThanOrEqual(tc.egg_gap_min_s);
  });
  it('endSession with no egg / flag off: only session_end (byte-identical save path)', () => {
    const a = setup(G, { nextSpawnRemainingS: 30 }, false); a.g.endSession(); expect(tel(a.g)).toEqual(['session_end']);
    const o = setup(OFF); o.g.endSession(); expect(tel(o.g)).toEqual(['session_end']);
  });
  it('takeover (deactivate): collectible_expired{takeover} before freezing; Frenzy time kept for the new tab', () => {
    const { g, evs, frames } = setup(G, { nextSpawnRemainingS: 0, frenzyRemainingS: 12 }); frames(1); g.deactivate();
    expect(gold(evs).at(-1)).toMatchObject({ type: 'collectible_expired', reason: 'takeover', collectible_id: 1 });
    expect(g.inactive).toBe(true); expect(g.state.goldenEgg).toBeUndefined(); expect(g.state.frenzyRemainingS).toBeCloseTo(12, 0);
  });
  it('beginReset: expired{reset} + frenzy_ended{reset} (run stats) then save_reset; nothing saved afterwards', () => {
    const { g, kv, evs, frames } = setup(G, { nextSpawnRemainingS: 0 }); frames(1); frames(graceFrames);
    g.state = withNextU(g.state, 0.5, 0.7); g.tapGolden(); g.state = { ...g.state, nextSpawnRemainingS: 0, goldenPending: undefined }; frames(1);
    const before = kv.getItem(SAVE_KEY); g.beginReset();
    const t = tel(g); expect(t.slice(-3)).toEqual(['collectible_expired', 'frenzy_ended', 'save_reset']);
    expect(gold(evs).at(-1)).toMatchObject({ type: 'frenzy_ended', reason: 'reset', collectible_id: 1 }); expect(gold(evs).at(-2)).toMatchObject({ reason: 'reset', collectible_id: 2 });
    expect(g.resetting).toBe(true); g.endSession(); expect(kv.getItem(SAVE_KEY)).toBe(before);
  });
  it('beginReset flag off: just resetting + save_reset (same as the old inline path)', () => {
    const { g } = setup(OFF); g.beginReset(); expect(g.resetting).toBe(true); expect(tel(g)).toEqual(['save_reset']);
  });
});

describe('golden UI helper: validSpotIds (R14 rect test; geometry from the caller)', () => {
  const spots: SpotCentre[] = [{ id: 'S1', x: 50, y: 50 }, { id: 'S2', x: 200, y: 50 }, { id: 'S3', x: 50, y: 200 }];
  it('a spot is valid iff its hit box grown by the zone clearance overlaps no zone; order follows the spot list', () => {
    const z: SpotZone[] = [{ rect: { left: 100, top: 0, right: 160, bottom: 100 }, clearance: 16 }];
    expect(validSpotIds(spots, z, 56)).toEqual(['S1', 'S3']); // S1 box 22..78 + 16 = 94 < 100; S2 box 172 - 16 = 156 < 160 -> overlaps
  });
  it('clearance per zone (16 default zones, 0 for the pill); touching edges is not an overlap', () => {
    const near: SpotZone[] = [{ rect: { left: 172, top: 0, right: 230, bottom: 100 }, clearance: 0 }];
    expect(validSpotIds([spots[1]], near, 56)).toEqual([]);
    expect(validSpotIds([{ id: 'S9', x: 144, y: 50 }], near, 56)).toEqual(['S9']); // box right edge 172 == zone left
    expect(validSpotIds([{ id: 'S9', x: 144, y: 50 }], [{ ...near[0], clearance: 1 }], 56)).toEqual([]);
  });
  it('no zones -> every spot; no spots -> [] (R15 defer)', () => { expect(validSpotIds(spots, [], 56)).toEqual(['S1', 'S2', 'S3']); expect(validSpotIds([], [], 56)).toEqual([]); });
});
