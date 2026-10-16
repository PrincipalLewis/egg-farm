// M4A-26: debug h± / v± clamp to the track cap (F + cap_over_farm) and maxLevel. Values come from balance.json.
import { describe, it, expect } from 'vitest';
import { balance as live } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { hensCap, eggValueCap } from '../src/config/formulas';
import { debugTrackStep } from '../src/debug/panel';
const b = { ...live, m4: { ...live.m4!, enabled: 1 } } as typeof live;
describe('M4A-26 debug track steps', () => {
  it('never below 0', () => {
    const s = initialState(b, 1);
    expect(debugTrackStep({ ...s, hensLevel: 0 }, b, 'hens', -1)).toBe(0);
    expect(debugTrackStep({ ...s, eggValueLevel: 0 }, b, 'eggValue', -1)).toBe(0);
  });
  it('stops at the cap for the current Farm level', () => {
    const F = 5, s = { ...initialState(b, 1), farmLevel: F };
    const hc = hensCap(F, b), vc = eggValueCap(F, b);
    expect(debugTrackStep({ ...s, hensLevel: hc - 1 }, b, 'hens', 1)).toBe(hc);
    expect(debugTrackStep({ ...s, hensLevel: hc }, b, 'hens', 1)).toBe(hc);
    expect(debugTrackStep({ ...s, eggValueLevel: vc }, b, 'eggValue', 1)).toBe(vc);
  });
  it('stops at maxLevel', () => {
    const s = { ...initialState(b, 1), farmLevel: b.maxLevel, hensLevel: b.maxLevel, eggValueLevel: b.maxLevel };
    expect(debugTrackStep(s, b, 'hens', 1)).toBe(b.maxLevel);
    expect(debugTrackStep(s, b, 'eggValue', 1)).toBe(b.maxLevel);
  });
  it('a grandfathered over-cap level is kept on +1 and steps down on −1', () => {
    const s = { ...initialState(b, 1), farmLevel: 0 }, V = eggValueCap(0, b) + 4;
    expect(debugTrackStep({ ...s, eggValueLevel: V }, b, 'eggValue', 1)).toBe(V);
    expect(debugTrackStep({ ...s, eggValueLevel: V }, b, 'eggValue', -1)).toBe(V - 1);
  });
});
