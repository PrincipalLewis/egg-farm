/** QA probe 2 — TASK HoQA/PR125-REBAR @ eb92b375 (Saves QA scratch). Asserts SPEC values; failing = spec miss at tip. */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../wt/src/config/balance';
import { initialState, type GameState } from '../wt/src/sim/state';
import { advance } from '../wt/src/sim/tick';
import { type BreedsSave } from '../wt/src/sim/breeds';
import { sessionEndPresentFields } from '../wt/src/sim/breeds-traits';
import { Game } from '../wt/src/game';
import { mem } from '../wt/tests/helpers';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});
const leg = (): Partial<BreedsSave> => ({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0] });
const sus = (): Partial<BreedsSave> => ({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] });
const log = (...a: unknown[]) => console.log('QA-PROBE2', ...a);
const mkGame = (bal: typeof b, T0: number) => {
  const g = new Game(bal, mem(), () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  const tracks: any[] = []; (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
  return { g, tracks };
};

describe('Q5 F5 boundary (BR-R18 / PMC)', () => {
  const B0 = { ...BR, m4: { ...BR.m4!, offline: { ...BR.m4!.offline!, eggsPerSec: BR.m4!.offline!.eggsPerSec.map(() => 0) } } } as typeof b;
  for (const [gap, want] of [[2_000, 0], [59_000, 0], [59_999, 0], [60_000, 1], [61_000, 1]] as const) {
    it(`gap ${gap} ms, eggs forced 0, Sussex settled -> ${want} offline_grant (away_bp 1500 when emitted)`, () => {
      const { g, tracks } = mkGame(B0, Date.UTC(2026, 10, 10, 7));
      g.state = st(sus());
      const eggs = (g as any).grantOffline(gap);
      const og = tracks.filter(t => t.type === 'offline_grant'); log('Q5', gap, 'eggs', eggs, JSON.stringify(og));
      expect(eggs).toBe(0); expect(og.length).toBe(want);
      if (want) expect(og[0].fields.away_bp).toBe(1500);
    });
  }
  it('gap 60,000 ms real balance (eggs>0) emits with away_bp 1500; flag-off 59,999 emits nothing', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 8)); g.state = st(sus());
    const eggs = (g as any).grantOffline(60_000);
    const og = tracks.filter(t => t.type === 'offline_grant'); log('Q5 real 60s eggs', eggs, JSON.stringify(og));
    expect(og.length).toBe(1); expect(og[0].fields.away_bp).toBe(1500);
    const off = mkGame(b, Date.UTC(2026, 10, 10, 9)); off.g.state = st({});
    (off.g as any).grantOffline(59_999); expect(off.tracks.filter(t => t.type === 'offline_grant')).toEqual([]);
  });
});

/** Game.frame passes focusMs = min(gap,1000) per animation frame (game.ts:488-490), with accMs carried. */
function frames(fps: number, seconds: number) {
  let s = st(leg()), acc = 0; const dt = 1000 / fps; const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) { const r = advance(s, dt, acc, BR, undefined, { focusMs: dt }); s = r.state; acc = r.accMs; }
  return { focusMs: s.breedsCalm?.focusMs ?? 0, activeMs: s.breedsCalm?.activeMs ?? 0, coop: s.coop, f: sessionEndPresentFields(s, BR) };
}
describe('Q7 BR-R12b(b) Σ fT = F at real frame rates (focusMs = cumulative focus advance)', () => {
  for (const fps of [1, 10, 20, 30, 60, 144]) {
    it(`${fps} fps x 60 s attended: breedsCalm.focusMs ~= 60,000 (Σ fT = Σ F, tolerance 1 tick)`, () => {
      const r = frames(fps, 60); log('Q7', fps, 'fps', JSON.stringify(r));
      expect(Math.abs(r.focusMs - 60_000)).toBeLessThanOrEqual(100);
    });
  }
});
