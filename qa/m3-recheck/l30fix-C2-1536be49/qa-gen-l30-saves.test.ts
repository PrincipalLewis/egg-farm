import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize } from '../src/save/save';
import { farmCost, collectionCost } from '../src/config/formulas';
const out = '/workspace/egg-farm-studio/qa/scratch/l30fix-C2/saves/';
it('gen L29/L30 saves on main', () => {
  const info: any = {};
  for (const L of [29, 30]) {
    const s = { ...initialState(b), farmLevel: L, collectionLevel: L, coinsCents: 123456789 };
    writeFileSync(out + `main-L${L}.json`, serialize(s as any, 1760680000000));
    info[L] = { farmCostAtLevel: farmCost(L, b), collCost: collectionCost(L, b), maxLevel: b.maxLevel, costTable30: (b.farm as any).costTable?.[30] };
  }
  writeFileSync(out + 'main-costs.json', JSON.stringify(info, null, 1));
});
