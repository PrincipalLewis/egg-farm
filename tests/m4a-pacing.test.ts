// M4-A pacing in the REAL game sim (step/apply, 10 Hz, deterministic), flag on. Diagnostic companions to the Python
// gates (TR-5 M4A-35, M4A-37 run in product/farm/m4/tr5_run.py; not re-implemented here). Gating here:
//  - determinism: same seed => identical trace (10 Hz);
//  - M4A-40 shape: Farm-only falls >= 3 Farm levels behind follow-the-highlight at 30:00;
//  - M4A-18 follow-the-highlight never has a gap > 3.0 min between purchases in the first 30 min.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import { initialState, collectionCost, eggsPerTap, eggsPerSec, type GameState } from '../src/sim/state';
import { step } from '../src/sim/tick';
import { apply } from '../src/sim/actions';
import { highlightRow } from '../src/ui/tracks-ui';
import { trackLock, trackCost, trackLevel } from '../src/sim/tracks';
import { median } from './bot';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
type Bot = 'highlight' | 'farmOnly';
/** Collection by the M4A-39 tap rule: eggs/tap < eggs/s and Collection <= 50% of the cheapest open track. */
function collOk(s: GameState, b: Balance) {
  const open = [s.farmLevel < b.maxLevel ? 0 : null, trackLock(s, 'hens', b) ? null : trackCost(trackLevel(s, 'hens'), 'hens', b), trackLock(s, 'eggValue', b) ? null : trackCost(trackLevel(s, 'eggValue'), 'eggValue', b)];
  const cheapest = Math.min(...open.filter((x): x is number => x !== null && x > 0));
  return s.collectionLevel < b.maxLevel && eggsPerTap(s.collectionLevel, b) < eggsPerSec(s.hensLevel, b) && collectionCost(s.collectionLevel, b) <= 0.5 * cheapest && s.coinsCents >= collectionCost(s.collectionLevel, b) * 100;
}
export function runM4(b: Balance, seed: number, bot: Bot, T = 1800, sellEvery = 15) {
  let s = initialState(b, seed); const dt = 1 / b.tickHz, n = Math.round(T * b.tickHz), buys: number[] = [];
  let tapT = 1, sellT = sellEvery;
  for (let i = 1; i <= n; i++) {
    const t = Math.round(i * dt * 10) / 10; s = step(s, dt, b);
    if (t >= tapT) { tapT += 1; s = apply(s, { type: 'collect' }, b); }
    if (t >= sellT) {
      sellT += sellEvery; s = apply(s, { type: 'sellAll' }, b);
      for (let g = 0; g < 50; g++) {
        const before = s;
        if (collOk(s, b)) s = apply(s, { type: 'buyCollection' }, b);
        else if (bot === 'farmOnly') s = apply(s, { type: 'buyFarm' }, b);
        else { const r = highlightRow(s, b); if (!r) break; s = apply(s, r === 'farm' ? { type: 'buyFarm' } : { type: 'buyTrack', track: r }, b); }
        if (s === before) break; buys.push(t);
      }
    }
  }
  const gaps = buys.map((x, i) => x - (buys[i - 1] ?? 0));
  return { s, buys, worstGapS: Math.max(...gaps) };
}
describe('M4-A pacing (game sim, flag on)', () => {
  const seeds = Array.from({ length: 10 }, (_, i) => i + 1);
  const hl = seeds.map(x => runM4(on, x, 'highlight')), fo = seeds.map(x => runM4(on, x, 'farmOnly'));
  it('deterministic at 10 Hz', () => { expect(on.tickHz).toBe(10); expect(runM4(on, 3, 'highlight')).toEqual(hl[2]); });
  it('M4A-40 shape: Farm-only median Farm level at 30:00 <= follow-the-highlight median - 3', () => {
    expect(median(fo.map(r => r.s.farmLevel))).toBeLessThanOrEqual(median(hl.map(r => r.s.farmLevel)) - 3);
  });
  it('follow-the-highlight: worst purchase gap <= 3.0 min', () => { for (const r of hl) expect(r.worstGapS).toBeLessThanOrEqual(180); });
  it('report (diagnostic, not gating: in-game farm_cost is main\'s, not the F1 + M3 taper table TR-5 uses)', () => {
    console.log('M4A-PACING', JSON.stringify({ highlightF30: hl.map(r => r.s.farmLevel), H: hl.map(r => r.s.hensLevel), V: hl.map(r => r.s.eggValueLevel), farmOnlyF30: fo.map(r => r.s.farmLevel), worstGapS: hl.map(r => r.worstGapS) }));
  });
}, 120_000);
