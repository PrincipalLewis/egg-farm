// M41-2: milestoneHint hides at the TRACK's own max (trackMaxLevel), not the Farm max (balance.maxLevel).
import { describe, it, expect } from 'vitest';
import { balance as live, type Balance } from '../src/config/balance';
import { milestoneHint } from '../src/ui/tracks-ui';
import { trackMaxLevel } from '../src/config/formulas';
const m4 = live.m4!;
const ext = (c: number[], n: number) => [...c, ...Array.from({ length: n }, (_, i) => c[c.length - 1] + 1 + i)];
// Farm max 50, tracks to 55; a Hens milestone at 53 and a grade at 54 (above the Farm max)
const b = { ...live, maxLevel: 50, m4: { ...m4, enabled: 1,
  hens: { ...m4.hens, costs: ext(m4.hens.costs, 25) }, eggValue: { ...m4.eggValue, costs: ext(m4.eggValue.costs, 25) },
  milestones: { ...m4.milestones, hens: [...m4.milestones.hens, { level: 53, coopMult: 2, offlineMult: 2 }], grades: [...m4.milestones.grades, { level: 54, mult: 3, minFarm: 0 }] } } } as unknown as Balance;
describe('milestoneHint uses the track max', () => {
  it('fixture: Farm max 50, track max 55', () => { expect(b.maxLevel).toBe(50); expect(trackMaxLevel('hens', b)).toBe(55); expect(trackMaxLevel('eggValue', b)).toBe(55); });
  it('hint shows above the Farm max (L50, L51) and hides only at the track max (55)', () => {
    expect(milestoneHint('hens', 50, 50, b)).toMatch(/^Next at L53/); expect(milestoneHint('hens', 51, 50, b)).toMatch(/^Next at L53/);
    expect(milestoneHint('eggValue', 50, 50, b)).not.toBeNull();
    expect(milestoneHint('hens', 55, 50, b)).toBeNull(); expect(milestoneHint('eggValue', 55, 50, b)).toBeNull();
  });
  it("main's data (track max = Farm max = 30): hides at 30 as before", () => {
    expect(trackMaxLevel('hens', live)).toBe(live.maxLevel); expect(milestoneHint('hens', live.maxLevel, live.maxLevel, live)).toBeNull();
  });
});
