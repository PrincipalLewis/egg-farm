/**
 * QA probe — TASK HoQA/PR125-DELTA @ 2b760d1c (Saves QA scratch).
 * F7: Game.frame at 30/60/144 fps and uneven gaps × 60 s attended.
 * focusMs must be 60,000 within one tick (100 ms). Also records present_active_s and Present eggs
 * for row 32 elements 1.1 / 1.6 / 1.11 and PMC (a) at real frame rates.
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../wt/src/config/balance';
import { initialState, type GameState } from '../wt/src/sim/state';
import { type BreedsSave } from '../wt/src/sim/breeds';
import { sessionEndPresentFields, presentBp } from '../wt/src/sim/breeds-traits';
import { prodEggsPerSec } from '../wt/src/sim/tracks';
import { BP_ONE } from '../wt/src/config/breeds';
import { Game } from '../wt/src/game';
import { mem } from '../wt/tests/helpers';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1, golden: 0, streak: 0, tapCoins: 0, abilities: 0, broody: 0 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});
const leg = (): Partial<BreedsSave> => ({ owned: { leghorn: { stars: 0 } }, slots: ['leghorn', null, null], settleMs: [0, 0, 0] });
const log = (...a: unknown[]) => console.log('QA-F7', ...a);

/** Integer-ms rAF gaps summing exactly to seconds*1000, average 1000/fps. */
function gapsForFps(fps: number, seconds: number): number[] {
  const n = Math.round(seconds * fps), total = seconds * 1000, base = Math.floor(1000 / fps);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < extra ? base + 1 : base));
}
/** Uneven integer gaps (10–41 ms) summing to exactly 60,000. */
function unevenGaps60s(): number[] {
  const pattern = [10, 16, 20, 7, 24, 33, 15, 8, 41, 12];
  const gaps: number[] = [];
  let s = 0, i = 0;
  while (s < 60_000) {
    const g = pattern[i % pattern.length];
    const next = s + g > 60_000 ? 60_000 - s : g;
    gaps.push(next); s += next; i++;
  }
  return gaps;
}

function runFrames(gaps: number[]) {
  const c = { t: Date.UTC(2026, 10, 10, 12) };
  const g = new Game(BR, mem(), () => c.t, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  g.setAttendedProbe(() => true);
  // Quiet coop/customers so Present eggs are measurable; coop stays under cap.
  g.state = { ...st(leg(), 12), hensLevel: 12, workers: {}, customers: [], nextCustomerInS: 1e9, coop: 0 };
  const startCoop = g.state.coop;
  const prod = prodEggsPerSec(g.state, BR);
  const bp = presentBp(g.state, BR);
  const wallMs = gaps.reduce((a, x) => a + x, 0);
  for (const gap of gaps) { c.t += gap; g.frame(); }
  const fields = sessionEndPresentFields(g.state, BR);
  const baseFill = prod * (wallMs / 1000);
  const presentEggs = g.state.coop - startCoop - baseFill;
  const wantEggs = prod * (wallMs / 1000) * bp / BP_ONE;
  return {
    focusMs: g.state.breedsCalm?.focusMs ?? 0,
    activeMs: g.state.breedsCalm?.activeMs ?? 0,
    present_active_s: fields.present_active_s,
    present_lost_count: fields.present_lost_count,
    presentEggs, wantEggs, bp, prod, wallMs, coop: g.state.coop,
  };
}

describe('QA F7 Game.frame Σ fT = Σ F (30/60/144 fps + uneven, 60 s attended)', () => {
  const cases: { tag: string; gaps: number[] }[] = [
    { tag: '30fps', gaps: gapsForFps(30, 60) },
    { tag: '60fps', gaps: gapsForFps(60, 60) },
    { tag: '144fps', gaps: gapsForFps(144, 60) },
    { tag: 'uneven', gaps: unevenGaps60s() },
  ];
  for (const { tag, gaps } of cases) {
    it(`${tag} × 60 s attended: focusMs = 60,000 ± 100; present_active_s = 60 ± 0.1; Present eggs match prod×60×bp/10000`, () => {
      const r = runFrames(gaps);
      log(tag, JSON.stringify(r), 'nGaps', gaps.length);
      expect(r.wallMs).toBe(60_000);
      expect(r.coop).toBeLessThan(800);
      expect(Math.abs(r.focusMs - 60_000)).toBeLessThanOrEqual(100);
      expect(r.activeMs).toBe(r.focusMs);
      expect(r.present_active_s).toBeDefined();
      expect(Math.abs(r.present_active_s! - 60)).toBeLessThanOrEqual(0.1);
      expect(r.presentEggs).toBeCloseTo(r.wantEggs, 6);
      expect(r.bp).toBeGreaterThan(0);
    });
  }
});
