// QA l30fix C2: L29/L30 saves made on main 8e6d53e load under C2 (L30 row 330194/74005/133856).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { load, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { farmCost, collectionCost } from '../src/config/formulas';
import { apply } from '../src/sim/actions';
import { mem } from './helpers';
const dir = '/workspace/egg-farm-studio/qa/scratch/l30fix-C2/saves/';
const C2 = Object.fromEntries(readFileSync('/workspace/egg-farm-studio/qa/scratch/l30fix-C2/C2_comb_L30b59_hv35.csv', 'utf8').trim().split(/\r?\n/).map((l, i, a) => { const h = a[0].split(','); const c = l.split(','); return [c[0], Object.fromEntries(h.map((k, j) => [k, c[j]]))]; }).slice(1));
describe('C2 save compat', () => {
  it('balance costTable matches C2 farm_cost L0-30', () => { for (let L = 0; L <= 30; L++) expect((b.farm as any).costTable[L], `L${L}`).toBe(Number(C2[L].farm_cost)); expect(b.maxLevel).toBe(30); });
  for (const L of [29, 30]) it(`main L${L} save loads under C2`, () => {
    const raw = readFileSync(dir + `main-L${L}.json`, 'utf8'), d = JSON.parse(raw);
    const kv = mem(); kv.setItem(SAVE_KEY, raw); let s: any; expect(() => { s = load(kv, b); }).not.toThrow();
    expect(s).not.toBeNull(); expect(s.version).toBe(SAVE_VERSION);
    expect(s.state.farmLevel).toBe(L); expect(s.state.collectionLevel).toBe(L); expect(s.state.coinsCents).toBe(d.state.coinsCents);
    const fc = farmCost(L, b), cc = collectionCost(L, b);
    console.log(`L${L}: farmCost(L)=${fc} (C2 csv ${C2[L].farm_cost}) collectionCost=${cc} (C2 csv ${C2[L].collection_cost})`);
    expect(fc).toBe(Number(C2[L].farm_cost)); expect(cc).toBe(Number(C2[L].collection_cost));
    const after = apply(s.state, { type: 'buyFarm' }, b);
    if (L === 29) { expect(after.farmLevel).toBe(30); expect(s.state.coinsCents - after.coinsCents).toBe(323719 * 100); }
    else { expect(after).toBe(s.state); } // L30 = maxLevel: no further farm buy, L30 cost is never charged
  });
});
