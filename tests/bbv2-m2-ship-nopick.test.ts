// M2 flip prerequisite: ENFORCE v1.0.4 ship-config no affordable suppressed ★ (D-HOP-2026-11-05-14; Card #12 9f900304).
// After L30 ship: empty BBv2 set → no-pick strip / BR-BB4. DECISIVE zg-off mark-null net preserved. Flags-0 unchanged.
import { describe, it, expect } from 'vitest';
import { bal, fx, ALLW, OFF } from './bbv2-fixtures';
import { meaningfulKeys, options, bbv2Mark, rankable, isMeaningful } from '../src/econ/best-buy';
import { isZeroGain, zeroGainInputs } from '../src/ui/zero-gain';
import { DualPicker } from '../src/ui/pick-hysteresis';
import { selectGoal } from '../src/ui/next-goal';
import { appPicker } from './bbv2-sim';

const SHIP = bal(1, { zeroGainUi: 1 });
const DEC = bal(1, { zeroGainUi: 0 }); // DECISIVE
const W = { energy: 100, cdS: 0 };

describe('M2 ship no-pick after L30 (D-HOP-14 / v1.0.4 §2.7 §4.1)', () => {
  it('post-L30 all-zero-gain (FX-L30 shape): ship hint null + no-pick strip; decisive mark-null COLL without ★', () => {
    const s = fx(30, 30, 30, 22, { ...ALLW, coinsCents: 1e12 });
    expect(meaningfulKeys(s, SHIP).size).toBe(0);
    expect(options(s, SHIP).map(o => o.key)).toEqual(['COLL']);
    expect(isZeroGain(s, SHIP, 'COLL')).toBe(true);

    const ship = appPicker(SHIP).tick(s, SHIP, 0);
    expect(ship.hint).toBeNull();
    expect(bbv2Mark(ship.hint, s, SHIP)).toBeNull();
    const g = selectGoal(s, SHIP, 100, ship.hint?.key as any, null);
    expect(g.key).toBeNull(); // no-pick strip (BR-BB4 when breeds on is separate UI)

    const dec = appPicker(DEC).tick(s, DEC, 0); // zg0 → DualPicker stock
    expect(dec.hint?.key).toBe('COLL');
    expect(bbv2Mark(dec.hint, s, DEC)).toBeNull(); // allowed mark-null net
  });

  it('post-L30 capacity-only HENS milestone (dCap>0, gain<=0): not ZG, not meaningful; ship never ★s it; breeds off/on', () => {
    // Collect-bound F30 H29 C5 ALLW: HENS capacity-only; COLL is the meaningful ★ under ship.
    const base = fx(30, 29, 30, 5, { ...ALLW, coinsCents: 1e12 });
    const zi = zeroGainInputs(base, SHIP, 'HENS')!;
    expect(zi.dCap).toBeGreaterThan(0);
    expect(zi.incAfter - zi.incBefore).toBeLessThanOrEqual(0);
    expect(isZeroGain(base, SHIP, 'HENS')).toBe(false);
    expect(isMeaningful(base, SHIP, 'HENS')).toBe(false);

    for (const breeds of [0, 1] as const) {
      const b = { ...SHIP, m4: { ...SHIP.m4!, flags: { ...SHIP.m4!.flags, breeds } } } as typeof SHIP;
      const s = breeds ? { ...base, breeds: { owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0], hatches: 0, pity: 0, rng: 1, freeHatchUsed: 1, flockCompleteLogged: 0 } } as any : base;
      const ship = appPicker(b).tick(s, b, 0);
      expect(bbv2Mark(ship.hint, s, b)).not.toBe('HENS');
      expect(ship.hint?.key === 'HENS' && ship.hint.affordable && bbv2Mark(ship.hint, s, b) === null).toBe(false);
      // When COLL is meaningful, ship ★s COLL; when BBv2 set empty, no-pick (covered above).
      if (meaningfulKeys(s, b).size === 0) {
        expect(ship.hint).toBeNull();
        expect(selectGoal(s, b, 100, undefined, null).key).toBeNull();
      } else {
        expect(ship.hint && meaningfulKeys(s, b).has(ship.hint.key)).toBe(true);
      }
    }
  });

  it('rankable: ship empty BBv2 set → []; decisive empty → all keys (mark-null net)', () => {
    const s = fx(30, 30, 30, 22, { ...ALLW, coinsCents: 1e12 });
    const keys = options(s, SHIP).map(o => o.key);
    expect(rankable(s, SHIP, keys)).toEqual([]);
    expect(rankable(s, DEC, keys)).toEqual(keys);
  });

  it('flags-0: rankable identity and DualPicker / selectGoal unchanged vs pre-BBv2 absent key', () => {
    const s = fx(17, 19, 18, 10, { workers: { market_hand: W, coop_hand: W, hawker: W } as any, coinsCents: 3e5 });
    const keys = options(s, OFF).map(o => o.key);
    expect(rankable(s, OFF, keys)).toEqual(keys);
    const { bestBuyV2: _x, ...noKey } = OFF.m4!.flags as any;
    const ABSENT = { ...OFF, m4: { ...OFF.m4!, flags: noKey } } as any;
    expect(new DualPicker().tick(s, OFF, 0)).toEqual(new DualPicker().tick(s, ABSENT, 0));
    expect(selectGoal(s, OFF, 100)).toEqual(selectGoal(s, ABSENT, 100));
  });
});
