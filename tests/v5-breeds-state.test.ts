// M5.1 breeds PR A (state, save/load, migration, offline). Every test carries its BR-AC id (QA-D-1029-V5SCAP).
// Spec rev 3.8.6 13d5255e; tick semantics engineering/reviews/v5-breeds-tick-semantics.md.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { initialState, mixSeed, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { applyOffline } from '../src/sim/offline';
import { serialize, SAVE_KEY, BAK_KEY, SAVE_VERSION } from '../src/save/save';
import { IdbMirror, IDB_KEY } from '../src/save/idb-mirror';
import { BREEDS_RNG_SALT } from '../src/config/breeds';
import { ensureBreeds, type BreedsSave } from '../src/sim/breeds';
import { fakeIdb } from './fake-idb';
import { mem } from './helpers';
import { TELEMETRY_KEY } from '../src/telemetry/telemetry';
const T0 = Date.UTC(2026, 9, 30, 12);
const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b; // flag on (default 0 in shipping)
const br = (o: Partial<BreedsSave> = {}): BreedsSave => ({ owned: { leghorn: { stars: 1 } }, slots: ['leghorn', null, null], incubator: { breed: 'brahma', remainingMs: 40_000, costCents: 50_000 },
  settleMs: [120_000, 0, 0], hatches: 3, pity: 2, rng: 0x1234567, freeHatchUsed: 1, flockCompleteLogged: 0, sinceUnlockMs: 5_000, ...o });
// tracksV7 + v6BackupId: a committed M4 save, so the session runs with m4 on (game.ts tracksOff otherwise; same as the F2 fixture)
const base = (F = 12): GameState => ({ ...initialState(b, 7), farmLevel: F, tracksV7: 1 as const, v6BackupId: '0123456789abcdef' });
const st = (o: Partial<BreedsSave> = {}, F = 12): GameState => ({ ...base(F), breeds: br(o) });
const boot = (bb: typeof b, kv: ReturnType<typeof mem>, t: number) => { const g = new Game(bb, kv, () => t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' }); const evs: any[] = []; g.on(e => evs.push(e)); return { g, evs }; };
const saved = (s: GameState, at: number) => { const kv = mem(); kv.setItem(SAVE_KEY, serialize(s, at, 5)); return kv; };
const stored = (kv: ReturnType<typeof mem>) => JSON.parse(kv.getItem(SAVE_KEY)!).state;
/** Load-time events go to telemetry (listeners attach after the constructor): the breeds_sanitise records in the stored log. */
const migrated = (kv: ReturnType<typeof mem>) => [...(kv.getItem(TELEMETRY_KEY) ?? '').matchAll(/\{[^{}]*"type":"save_migrated"[^{}]*\}/g)].map(m => JSON.parse(m[0])).filter(e => e.migration === 'breeds_sanitise');

describe('BR-AC2e / Q2: breeds is created at the end of the first flag-on tick, never by a flag-off build', () => {
  it('[BR-AC2e] F12, no breeds key, first flag-on tick: §6 shape, sinceUnlockBackfilled 1, sinceUnlockMs absent (= 0)', () => {
    const s = step({ ...initialState(b, 7), farmLevel: 12 }, 0.1, BR);
    expect(s.breeds).toEqual({ owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], flockCompleteLogged: 0, hatches: 0, pity: 0,
      rng: mixSeed((initialState(b, 7).rng ^ BREEDS_RNG_SALT) >>> 0), freeHatchUsed: 0, sinceUnlockBackfilled: 1 });
  });
  it('[BR-AC2e] created below F10: no sinceUnlockBackfilled key', () => {
    expect('sinceUnlockBackfilled' in step({ ...initialState(b, 7), farmLevel: 9 }, 0.1, BR).breeds!).toBe(false);
  });
  it('[BR-AC2 §6 Separate rng] Q1 salt 0x62726473; state.rng never advanced by creation; an existing breeds is never re-created', () => {
    expect(BREEDS_RNG_SALT).toBe(0x62726473);
    const s0 = { ...initialState(b, 7), farmLevel: 12 }, s1 = ensureBreeds(s0, BR); expect(s1.rng).toBe(s0.rng);
    const s2 = st({ rng: 42 }); expect(ensureBreeds(s2, BR)).toBe(s2);
  });
  it('[BR-AC1] flags off: 600 ticks + save never write a breeds key (D-HOE-20261030-10)', () => {
    const kv = mem(); const { g } = boot(b, kv, T0); g.state = { ...g.state, farmLevel: 12 };
    let s = g.state; for (let i = 0; i < 600; i++) s = step(s, 0.1, b); g.state = s; g.save();
    expect('breeds' in s).toBe(false); expect('breeds' in stored(kv)).toBe(false);
  });
});

describe('BR-AC1 / BR-AC1b: save round-trip and old -> new -> old across the three stores', () => {
  it('[BR-AC1] flag off with breeds data: loaded, 10-min offline, re-saved byte-identical breeds; remainingMs not decremented (E11)', () => {
    const s = st(), kv = saved(s, T0); const { g } = boot(b, kv, T0 + 600_000);
    expect(g.state.breeds).toEqual(s.breeds); expect(JSON.stringify(stored(kv).breeds)).toBe(JSON.stringify(s.breeds)); expect(g.pendingReveal).toBeNull();
  });
  it('[BR-AC1] flag on: a clean breeds save round-trips unchanged (30 s reload gap < 60 s: no offline settle)', () => {
    const s = st(), kv = saved(s, T0); const { g } = boot(BR, kv, T0 + 30_000);
    expect(stored(kv).breeds).toEqual(s.breeds); expect(g.state.breeds).toEqual(s.breeds); expect(migrated(kv)).toEqual([]);
  });
  const flush = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0)); };
  it.each(['ls', 'bak', 'idb'] as const)('[BR-AC1b] old -> new -> old starting in %s: breeds bytes survive, SAVE_VERSION stays, M4.1 is not read-only', async store => {
    const s = st(), raw = serialize(s, T0, 5), kv = mem(), f = fakeIdb(), mirror = new IdbMirror(f.db);
    if (store === 'ls') kv.setItem(SAVE_KEY, raw); else if (store === 'bak') kv.setItem(BAK_KEY, raw); else f.data.set(IDB_KEY, raw);
    const go = (bb: typeof b, t: number) => new Game(bb, kv, () => t, 7, 'dev', mirror, store === 'idb' ? f.data.get(IDB_KEY) ?? null : null, store === 'idb' ? { idbBoot: 'ok' } : {});
    const o1 = go(b, T0 + 30_000); expect(o1.readOnly).toBe(false); await flush();
    expect(JSON.stringify(stored(kv).breeds)).toBe(JSON.stringify(s.breeds)); expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    const n = go(BR, T0 + 60_000); await flush(); expect(stored(kv).breeds).toEqual(s.breeds); // 30 s gap: nothing settles
    const o2 = go(b, T0 + 90_000); o2.save(); await flush(); expect(o2.readOnly).toBe(false);
    expect(JSON.stringify(stored(kv).breeds)).toBe(JSON.stringify(n.state.breeds)); expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
  });
});

describe('BR-R18 offline settle (BR-AC25, BR-AC25b, BR-AC2c) and BR-R9 no re-roll', () => {
  it('[BR-AC25] remainingMs 40,000 + 10-min reload gap: reveal in applyOffline, pendingReveal = the breed rolled at start, rng untouched', () => {
    const s = st(), kv = saved(s, T0); const { g } = boot(BR, kv, T0 + 600_000);
    expect(g.pendingReveal).toBe('brahma'); expect(g.state.breeds!.incubator).toBeNull(); expect(g.state.breeds!.owned.brahma).toEqual({ stars: 0 });
    expect(g.state.breeds!.rng).toBe(s.breeds!.rng); expect(g.state.breeds!.hatches).toBe(3); expect(g.state.breeds!.slots).toEqual(['leghorn', null, null]); // F12: 1 slot open, full
  });
  it('[BR-AC25] hidden >= 60 s path settles too (via grantOffline); the auto-slot gets a full settle when a slot is open', () => {
    const kv = mem(); const { g } = boot(BR, kv, T0); g.state = st({ slots: [null, null, null] }, 14);
    g.onHidden(T0); expect(g.onShown(T0 + 120_000)).toBeGreaterThanOrEqual(0);
    expect(g.pendingReveal).toBe('brahma'); expect(g.state.breeds!.slots).toEqual(['brahma', null, null]); expect(g.state.breeds!.settleMs).toEqual([300_000, 0, 0]);
  });
  it('[BR-AC25b] 50 s gap (< 60 s): no catch-up, 40,000 remain; exactly 60 s: 0 remain and revealed', () => {
    expect(applyOffline(st(), 50_000, BR).state.breeds!.incubator!.remainingMs).toBe(40_000);
    const r = applyOffline(st({ incubator: { breed: 'brahma', remainingMs: 60_000, costCents: 1 } }), 60_000, BR); expect(r.reveal).toBe('brahma');
    expect(applyOffline(st(), 59_999, BR).reveal).toBeNull();
  });
  it('[BR-AC25 / BR-R18 cap] a 3 h gap adds exactly offlineCapSeconds (7,200 s) to sinceUnlockMs; settleMs does not run offline (BR-R4)', () => {
    const r = applyOffline(st(), 3 * 3_600_000, BR).state.breeds!;
    expect(r.sinceUnlockMs).toBe(5_000 + b.offline.offlineCapSeconds * 1000); expect(r.settleMs).toEqual([120_000, 0, 0]);
  });
  it('[BR-AC25 / BR-R18 once per gap] reload after a 20-min gap, then immediate reloads: sinceUnlockMs grows once', () => {
    const kv = saved(st({ incubator: null }), T0); boot(BR, kv, T0 + 1_200_000); const a = stored(kv).breeds.sinceUnlockMs;
    expect(a).toBe(5_000 + 1_200_000); boot(BR, kv, T0 + 1_200_000); boot(BR, kv, T0 + 1_210_000); expect(stored(kv).breeds.sinceUnlockMs).toBe(a);
  });
  it('[BR-AC25 / BR-R18 tamper] future savedAt: no catch-up', () => {
    const kv = saved(st(), T0 + 3_600_000); const { g } = boot(BR, kv, T0); expect(g.state.breeds!.incubator!.remainingMs).toBe(40_000); expect(g.pendingReveal).toBeNull();
  });
  it('[BR-AC2c] no sinceUnlockMs loads with no save_migrated; frozen once flock_complete is logged (1 h offline adds nothing)', () => {
    const { sinceUnlockMs: _x, ...noSince } = br({ incubator: null }); const kv = saved({ ...base(), breeds: noSince }, T0);
    boot(BR, kv, T0 + 30_000); expect(migrated(kv)).toEqual([]); expect('sinceUnlockMs' in stored(kv).breeds).toBe(false);
    expect(applyOffline(st({ flockCompleteLogged: 1, sinceUnlockMs: 77 }), 3_600_000, BR).state.breeds!.sinceUnlockMs).toBe(77);
  });
  it('[BR-AC25 / BR-R9] reload never re-rolls: five reloads mid-incubation keep breed, rng, hatches and pity', () => {
    const s = st({ incubator: { breed: 'cochin', remainingMs: 60_000, costCents: 9 } }); const kv = saved(s, T0);
    for (let i = 1; i <= 5; i++) { const { g } = boot(BR, kv, T0 + i * 10_000);
      expect(g.state.breeds!.incubator!.breed).toBe('cochin'); expect(g.state.breeds!).toMatchObject({ rng: s.breeds!.rng, hatches: 3, pity: 2 }); }
  });
});

describe('BR-AC26 / E10-E12 load sanitising (flag on only)', () => {
  it('[BR-AC26] stars 5, duplicate slot, unknown "silkie": stars 2, slots [leghorn, null, null], silkie kept, one save_migrated', () => {
    const kv = saved(st({ owned: { leghorn: { stars: 5 }, silkie: { stars: 1 } } as any, slots: ['leghorn', 'leghorn', null] }), T0);
    const { g } = boot(BR, kv, T0 + 30_000); const x = g.state.breeds!;
    expect(x.owned).toEqual({ leghorn: { stars: 2 }, silkie: { stars: 1 } }); expect(x.slots).toEqual(['leghorn', null, null]);
    expect(migrated(kv)).toHaveLength(1); expect(migrated(kv)[0]).toMatchObject({ migration: 'breeds_sanitise', from: 6, to: 6 });
  });
  it('[BR-AC26 E12] unknown incubator breed is dropped and its costCents refunded; remainingMs clamped to [0, 60,000]', () => {
    const s = st({ incubator: { breed: 'silkie', remainingMs: 5, costCents: 12_345 } }), kv = saved(s, T0); const { g } = boot(BR, kv, T0 + 30_000);
    expect(g.state.breeds!.incubator).toBeNull(); expect(g.state.coinsCents).toBe(s.coinsCents + 12_345);
    const k2 = saved(st({ incubator: { breed: 'brahma', remainingMs: 9e9, costCents: 1 } }), T0); expect(boot(BR, k2, T0 + 30_000).g.state.breeds!.incubator!.remainingMs).toBe(60_000);
  });
  it('[BR-AC26 E12] slot past the unlocked count is nulled; bad flockCompleteLogged / sinceUnlockBackfilled / sinceUnlockMs repaired', () => {
    const kv = saved(st({ slots: ['leghorn', 'sussex', null], flockCompleteLogged: 7 as any, sinceUnlockBackfilled: 3 as any, sinceUnlockMs: -4 }), T0);
    const x = boot(BR, kv, T0 + 30_000).g.state.breeds!;
    expect(x.slots).toEqual(['leghorn', null, null]); expect(x).toMatchObject({ flockCompleteLogged: 0, sinceUnlockBackfilled: 1, sinceUnlockMs: 0 });
  });
  it('[BR-AC1 / E11] flag off: the same corrupt save is left untouched (no sanitise, no event)', () => {
    const s = st({ owned: { leghorn: { stars: 5 } }, slots: ['leghorn', 'leghorn', null] }), kv = saved(s, T0); const { g } = boot(b, kv, T0 + 30_000);
    expect(g.state.breeds).toEqual(s.breeds); expect(stored(kv).breeds).toEqual(s.breeds); expect(migrated(kv)).toEqual([]);
  });
});
