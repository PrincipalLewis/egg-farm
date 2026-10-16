// M4A-20: Farm tab / Upgrades badge = any Farm-tab row affordable (Farm, Hens, Egg value); flag off never.
import { describe, it, expect } from 'vitest';
import { balance as live } from '../src/config/balance';
import { initialState, farmCost } from '../src/sim/state';
import { trackCost } from '../src/sim/tracks';
import { hensCap } from '../src/config/formulas';
import { farmRowAffordable } from '../src/ui/tracks-ui';
const on = { ...live, m4: { ...live.m4!, enabled: 1 } } as typeof live, off = { ...live, m4: { ...live.m4!, enabled: 0 } } as typeof live;
const st = (p = {}) => ({ ...initialState(on, 1), tracksV7: 1 as const, ...p });
describe('M4A-20 farm badge rule', () => {
  it('flag off: never (the Farm tab badge element is not even created)', () => expect(farmRowAffordable(st({ coinsCents: 1e12 }), off)).toBe(false));
  it('no coins: hidden', () => expect(farmRowAffordable(st({ coinsCents: 0 }), on)).toBe(false));
  it('only the cheapest of the three rows affordable -> shown (each row counts)', () => {
    const F = 5, H = 3, V = 2, s = st({ farmLevel: F, hensLevel: H, eggValueLevel: V });
    for (const c of [farmCost(F, on) * 100, trackCost(H, 'hens', on) * 100, trackCost(V, 'eggValue', on) * 100]) {
      expect(farmRowAffordable({ ...s, coinsCents: c }, on)).toBe(true);
    }
    const min = Math.min(farmCost(F, on), trackCost(H, 'hens', on), trackCost(V, 'eggValue', on)) * 100;
    expect(farmRowAffordable({ ...s, coinsCents: min - 1 }, on)).toBe(false);
  });
  it('capped / MAX rows never count', () => {
    const F = on.maxLevel, s = st({ farmLevel: F, hensLevel: on.maxLevel, eggValueLevel: on.maxLevel, coinsCents: 1e12 });
    expect(farmRowAffordable(s, on)).toBe(false);
    const F2 = 4, capped = st({ farmLevel: F2, hensLevel: hensCap(F2, on), eggValueLevel: hensCap(F2, on), coinsCents: farmCost(F2, on) * 100 - 1 });
    expect(farmRowAffordable(capped, on)).toBe(false);
  });
});
