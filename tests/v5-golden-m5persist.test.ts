// Architect B (arch-golden-slice2-contracts-20261105 addendum 21:29 CET): m5Persist draws one R3 gap on a
// detached copy when the golden flag is on and an egg is on screen. SAVE_VERSION stays 6. A (endSession /
// live goldenUnload) is out of scope; Features owns that compose order.
import { describe, it, expect } from 'vitest';
import { balance as shipping } from '../src/config/balance';
import { initialState, nextRand, type GameState } from '../src/sim/state';
import { ensureEvRng } from '../src/sim/rng';
import { m5Load, m5Persist } from '../src/save/m5-fields';
import { SAVE_VERSION, serialize, save, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { ON } from './v5-f2-helpers';
const NOW = Date.UTC(2026, 10, 5, 21, 29);
const tc = ON.m4!.tc!;
const OFF = { ...ON, m4: { ...ON.m4!, flags: { ...ON.m4!.flags, golden: 0 } } } as typeof ON;
const egg = { ageS: 9, slotId: 'S3', intervalS: 150 };
const live = (extra: Partial<GameState> = {}): GameState => ({ ...initialState(shipping, 7), farmLevel: 12, evRngState: 123456789, nextSpawnRemainingS: 0, frenzyRemainingS: 12, ...extra });
const gapOf = (seed: number) => { const [x, u] = nextRand(seed); return { x, gap: tc.egg_gap_min_s + u * (tc.egg_gap_max_s - tc.egg_gap_min_s) }; };

describe('Architect B m5Persist (golden egg on screen)', () => {
  it('T1: egg on screen draws one gap on a copy; live egg, evRng and countdown stay put', () => {
    const s = live({ goldenEgg: egg, goldenPending: { intervalS: 150, deferS: 1, recheckS: 0 }, frenzyRun: { extraCents: 4, eggsSold: 1, byPlayer: 1, byWorkers: 0 } });
    const before = JSON.stringify(s), eggRef = s.goldenEgg;
    const p: any = m5Persist(s, ON);
    const { x, gap } = gapOf(123456789);
    expect(p).not.toBe(s);
    expect('goldenEgg' in p).toBe(false);
    expect('goldenPending' in p).toBe(false);
    expect('frenzyRun' in p).toBe(false);
    expect(p.nextSpawnRemainingS).toBe(gap);
    expect(p.nextSpawnRemainingS).toBeGreaterThanOrEqual(tc.egg_gap_min_s);
    expect(p.nextSpawnRemainingS).toBeLessThanOrEqual(tc.egg_gap_max_s);
    expect(p.nextSpawnRemainingS).not.toBe(0);
    expect(p.evRngState).toBe(x);
    expect(p.frenzyRemainingS).toBe(12);
    expect(s.goldenEgg).toBe(eggRef);
    expect(s.evRngState).toBe(123456789);
    expect(s.nextSpawnRemainingS).toBe(0);
    expect(JSON.stringify(s)).toBe(before);
    expect(SAVE_VERSION).toBe(6);
  });

  it('T1 edge: no evRngState yet seeds once from state.rng and advances that seed; live rng is not the draw stream', () => {
    const s = live({ goldenEgg: egg }); delete (s as { evRngState?: number }).evRngState;
    const rng = s.rng, before = JSON.stringify(s);
    const p = m5Persist(s, ON);
    const seeded = ensureEvRng({ ...s }).evRngState!;
    expect(p.evRngState).toBe(nextRand(seeded)[0]);
    expect(p.nextSpawnRemainingS).toBeGreaterThanOrEqual(tc.egg_gap_min_s);
    expect(s.rng).toBe(rng);
    expect(s.evRngState).toBeUndefined();
    expect(JSON.stringify(s)).toBe(before);
  });

  it('T2: m5Persist(s0, b) twice is bit-identical JSON, and so is serialize/save of that same live input', () => {
    const s = live({ goldenEgg: egg });
    const a = JSON.stringify(m5Persist(s, ON)), c = JSON.stringify(m5Persist(s, ON));
    expect(a).toBe(c);
    const st = JSON.parse(a);
    expect(st.goldenEgg).toBeUndefined();
    expect(st.evRngState).toBe(gapOf(123456789).x);
    expect(st.nextSpawnRemainingS).toBe(gapOf(123456789).gap);
    expect(serialize(s, NOW, 3, ON)).toBe(serialize(s, NOW, 3, ON));
    const disk = JSON.parse(serialize(s, NOW, 3, ON));
    expect(disk.version).toBe(6);
    expect(disk.state.goldenEgg).toBeUndefined();
    expect(disk.state.evRngState).toBe(st.evRngState);
    expect(disk.state.nextSpawnRemainingS).toBe(st.nextSpawnRemainingS);
    const k1 = mem(), k2 = mem();
    expect(save(k1, s, NOW, ON)).toBe(save(k2, s, NOW, ON));
    expect(JSON.parse(k1.getItem(SAVE_KEY)!).state).toEqual(st);
    expect(s.goldenEgg).toEqual(egg);
    expect(s.evRngState).toBe(123456789);
  });

  it('T3: no egg leaves evRngState and nextSpawnRemainingS exactly as strip-only, including spawn-due 0', () => {
    const due = live({ streakS: 0.28, streakHoldS: 2 });
    const mid = live({ nextSpawnRemainingS: 50, streakS: 0.1 });
    for (const s of [due, mid]) {
      const strip = m5Persist(s), p = m5Persist(s, ON);
      expect(p.evRngState).toBe(s.evRngState);
      expect(p.nextSpawnRemainingS).toBe(s.nextSpawnRemainingS);
      expect(p.evRngState).toBe(strip.evRngState);
      expect(p.nextSpawnRemainingS).toBe(strip.nextSpawnRemainingS);
      expect(JSON.stringify(p)).toBe(JSON.stringify(strip));
    }
    expect(due.nextSpawnRemainingS).toBe(0);
  });

  it('flag off, or no balance: an on-screen egg is stripped and the countdown/rng are not redrawn', () => {
    const s = live({ goldenEgg: egg, streakS: 0.2 });
    for (const p of [m5Persist(s, OFF), m5Persist(s, shipping), m5Persist(s)]) {
      expect('goldenEgg' in p).toBe(false);
      expect(p.evRngState).toBe(123456789);
      expect(p.nextSpawnRemainingS).toBe(0);
    }
    expect(s.goldenEgg).toEqual(egg);
    const plain = live();
    expect(m5Persist(plain, ON)).toBe(plain);
  });

  it('M1: debugBackdateSave writes the backdated copy with the live balance, so an on-screen egg is drawn there too', () => {
    const kv = mem(); const g = new Game(ON, kv, () => NOW);
    g.state = live({ goldenEgg: egg }); const before = JSON.stringify(g.state);
    g.debugBackdateSave(60_000);
    const disk = JSON.parse(kv.getItem(SAVE_KEY)!), { x, gap } = gapOf(123456789);
    expect(disk.savedAt).toBe(NOW - 60_000);
    expect(disk.state.goldenEgg).toBeUndefined();
    expect(disk.state.evRngState).toBe(x);
    expect(disk.state.nextSpawnRemainingS).toBe(gap);
    expect(JSON.stringify(g.state)).toBe(before);
  });

  it('load does not rewrite a stored spawn-due 0 (no egg on disk)', () => {
    const ev: any[] = [];
    const s = m5Load(live(), ON, NOW, ev);
    expect(s.nextSpawnRemainingS).toBe(0);
    expect(s.evRngState).toBe(123456789);
    expect(ev).toEqual([]);
  });
});
