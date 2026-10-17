// M4-A flag ON: old saves (v6 from main, and v1..v5) migrate without loss (M4A-27..29 wired into save.migrate).
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { validate, serialize, checksum, SAVE_VERSION } from '../src/save/save';
import { eggPriceCents } from '../src/config/formulas';
import { salePriceCents, prodEggsPerSec } from '../src/sim/tracks';
import { eggsPerSec } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
/** A main (pre-M4) v6 state: no hensLevel / eggValueLevel / celebratedMilestones / tracksV7. */
const mainState = (F: number, C: number) => { const { hensLevel, eggValueLevel, celebratedMilestones, tracksV7, ...r } = { ...initialState(balance), farmLevel: F, collectionLevel: C, coinsCents: 987654, coop: 7, basket: 3 } as any; void hensLevel; void eggValueLevel; void celebratedMilestones; void tracksV7; return r; };
const v6raw = (F: number, C: number) => { const st = JSON.stringify(mainState(F, C)); return `{"version":6,"savedAt":1760000000000,"sum":"${checksum(st)}","state":${st}}`; };
describe('M4 on: old saves migrate without loss', () => {
  it('SAVE_VERSION stays 6 (main can still read)', () => expect(SAVE_VERSION).toBe(6));
  for (const [F, C] of [[0, 0], [10, 7], [15, 12], [20, 17], [30, 30], [3, 10]]) it(`v6 main save F${F}/C${C}`, () => {
    const r = validate(v6raw(F, C), on); expect(r.ok).toBe(true); if (!r.ok) return;
    const s = r.file.state;
    expect([s.farmLevel, s.collectionLevel, s.coinsCents, s.coop, s.basket]).toEqual([F, C, 987654, 7, 3]);
    expect(s.hensLevel).toBe(F); expect(s.tracksV7).toBe(1);
    expect(salePriceCents(s, on)).toBeGreaterThanOrEqual(eggPriceCents(F, C, on));
    expect(prodEggsPerSec(s, on)).toBe(eggsPerSec(F, on));
    // round trip: a migrated save is never migrated again
    const again = validate(serialize(s, 1760000001000), on); expect(again.ok && again.file.state).toEqual(s);
  });
  it('v1 (float coins) .. v5 saves chain through v6 and then the track migration', () => {
    for (let v = 1; v <= 5; v++) {
      const st: any = { ...mainState(10, 7) }; if (v === 1) { delete st.coinsCents; st.coins = 9876.54; }
      const r = validate(JSON.stringify({ version: v, savedAt: 1760000000000, state: st }), on);
      expect(r.ok).toBe(true); if (!r.ok) continue;
      expect(r.file.state.coinsCents).toBe(987654); expect(r.file.state.farmLevel).toBe(10); expect(r.file.state.hensLevel).toBe(10);
      expect(r.file.state.eggValueLevel).toBe(7);
    }
  });
  it('a game started with M4 on is marked and never re-migrated (H/V kept on reload)', () => {
    const g = new Game(on, mem() as any); expect(g.state.tracksV7).toBe(1);
    const s = { ...g.state, farmLevel: 5, hensLevel: 2, eggValueLevel: 1 };
    const r = validate(serialize(s, 1760000000000), on); expect(r.ok && [r.file.state.hensLevel, r.file.state.eggValueLevel]).toEqual([2, 1]);
  });
  it('flag off: v6 loads unchanged (no tracks, no marker)', () => {
    const r = validate(v6raw(10, 7), balance); expect(r.ok && r.file.state.tracksV7).toBeUndefined();
    expect(r.ok && r.file.state.hensLevel).toBe(0);
  });
});
