import { describe, it, expect } from 'vitest';
import { navUpgradesTab, changedLine, fxOrNoChange } from '../src/ui/upgrade-card';
import { balance as b } from '../src/config/balance';
import * as S from '../src/sim/state';
const arrow = (a: string, z: string) => `${a} → ${z}`;
describe('UC24 nav Upgrades tab', () => {
  it('opens the hinted tab when a hint is shown', () => { expect(navUpgradesTab({ key: 'COLL', state: 'saving', tab: 'collection' }, 'workers')).toBe('collection'); expect(navUpgradesTab({ key: 'W2', state: 'ready', tab: 'workers' }, 'farm')).toBe('workers'); });
  it('falls back to the last-used tab with no hint', () => { expect(navUpgradesTab(null, 'farm')).toBe('farm'); expect(navUpgradesTab({ key: null, state: 'done', tab: 'workers' }, 'collection')).toBe('collection'); });
});
describe('UC26 unchanged before→after lines', () => {
  it('Farm L17: no "Customer demand" line when the range does not change', () => {
    const a = S.demandRange(17, b).join('–'), z = S.demandRange(18, b).join('–');
    expect(changedLine('Customer demand ', a, z, false, arrow)).toBe(a === z ? null : `Customer demand ${a} → ${z}`);
    expect(changedLine('Customer demand ', '31–61', '31–61', false, arrow)).toBeNull();
    expect(changedLine('Hens ', '35', '40', false, arrow)).toBe('Hens 35 → 40');
  });
  it('max level keeps the current-value line', () => { expect(changedLine('Hens ', '99', '99', true, a => a)).toBe('Hens 99'); });
  it('all equal → "No stat change"', () => { expect(fxOrNoChange([null, null])).toEqual(['No stat change']); expect(fxOrNoChange([null, 'Hens 1 → 2'])).toEqual(['Hens 1 → 2']); });
});
