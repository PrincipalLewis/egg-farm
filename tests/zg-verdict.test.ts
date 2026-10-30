// M5.1 zero-gain UI: verdict seam, exemptions, capacity partial gain, purity/determinism, picker filter, parity with optionGain.
// Spec product/collection/m5.1-zero-gain-purchase-ui.md v0.3.7 (sha1 f86de04e) §5.2/§5.2a/§5.6/§9; flag m4.flags.zeroGainUi.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState, type GameState } from '../src/sim/state';
import { options, optionGain, type BuyKey } from '../src/econ/best-buy';
import { incomePerSec } from '../src/econ/income';
import { trackCoopCapacity } from '../src/config/formulas';
import { allScorer, defaultScorer, DualPicker, PickHysteresis } from '../src/ui/pick-hysteresis';
import { zeroGainVerdict, isZeroGain, zeroGainInputs, zgFiltered, zeroGainUiOn, ZG_KEYS } from '../src/ui/zero-gain';
import { zgOn, FX, zgTrace } from './zg-fixtures';


const gain = (s: GameState, k: BuyKey) => optionGain(s, zgOn, k)?.gain;

describe('ZG-AC1 [unit] verdict seam zeroGainVerdict(incBefore, incAfter, dCap)', () => {
  it.each([
    [100, 100, 0, true], [100, 100 - 1e-6, 0, true], [100, 100 + 1e-12, 0, false], [1e15, 1e15 + 0.125, 0, false],
    [100, 100, 1, false], [100, 101, 0, false],
  ])('(%s, %s, %s) -> %s (dev assert on)', (a, z, c, want) => expect(zeroGainVerdict(a, z, c, true)).toBe(want));
  it('NaN in either income: dev assert throws; assert-free build returns false', () => {
    expect(() => zeroGainVerdict(NaN, 100, 0, true)).toThrow(/not finite/);
    expect(() => zeroGainVerdict(100, NaN, 0, true)).toThrow(/not finite/);
    expect(zeroGainVerdict(NaN, 100, 0, false)).toBe(false); expect(zeroGainVerdict(100, NaN, 0, false)).toBe(false);
  });
  it('±Infinity or |x| > 2^53: dev assert throws', () => {
    for (const x of [Infinity, -Infinity, 2 ** 53 + 2, -(2 ** 53) - 2]) {
      expect(() => zeroGainVerdict(x, 100, 0, true)).toThrow(); expect(() => zeroGainVerdict(100, x, 0, true)).toThrow();
    }
    expect(() => zeroGainVerdict(2 ** 53, 2 ** 53, 0, true)).not.toThrow();
  });
  it('isZeroGain === zeroGainVerdict(incomePerSec(s), incomePerSec(after), Δcap) for every key in every fixture', () => {
    for (const [name, mk] of Object.entries(FX)) {
      const s = mk();
      for (const o of options(s, zgOn)) {
        const exp = ZG_KEYS.includes(o.key) && zeroGainVerdict(incomePerSec(s, zgOn, { assumeWorking: true }), incomePerSec(o.after, zgOn, { assumeWorking: true }),
          trackCoopCapacity(o.after.farmLevel, o.after.hensLevel, zgOn) - trackCoopCapacity(s.farmLevel, s.hensLevel, zgOn), true);
        expect(isZeroGain(s, zgOn, o.key), `${name} ${o.key}`).toBe(exp);
      }
    }
  });
  it('flag read: zeroGainUi needs m4.enabled; shipped balance.json has it 0', () => {
    expect(zeroGainUiOn(balance)).toBe(false); expect(zeroGainUiOn(zgOn)).toBe(true);
    expect(zeroGainUiOn({ ...zgOn, m4: { ...zgOn.m4!, enabled: 0 } })).toBe(false);
  });
});

describe('ZG-AC2 [unit] exempt: FARM and W1–W4 are never ZG', () => {
  it('FX-FARM0: FARM gain <= 0 (precondition) and FARM is not ZG', () => {
    const s = FX.FARM0(); expect(gain(s, 'FARM')!).toBeLessThanOrEqual(0); expect(isZeroGain(s, zgOn, 'FARM')).toBe(false);
  });
  it('FX-FLIP: W1 (Market Hand) offered with gain < 0 (precondition) and not ZG; every W key and FARM exempt', () => {
    const s = FX.FLIP(); expect(gain(s, 'W1')!).toBeLessThan(0);
    for (const k of ['FARM', 'W1', 'W2', 'W3', 'W4'] as BuyKey[]) expect(isZeroGain(s, zgOn, k), k).toBe(false);
  });
  it('a key that is not offered is never ZG (E9)', () => {
    const s = FX.L30(); expect(options(s, zgOn).map(o => o.key)).toEqual(['COLL']);
    for (const k of ['FARM', 'HENS', 'VALUE'] as BuyKey[]) expect(isZeroGain(s, zgOn, k)).toBe(false);
  });
});

describe('ZG-AC3 [unit] capacity partial gain (FX-H20, collect-bound)', () => {
  it('HENS gain <= 0 with Δcap > 0 and COLL gain > 0 (preconditions) -> HENS not ZG', () => {
    const s = FX.H20(); const i = zeroGainInputs(s, zgOn, 'HENS')!;
    expect(gain(s, 'HENS')!).toBeLessThanOrEqual(0); expect(i.dCap).toBeGreaterThan(0); expect(gain(s, 'COLL')!).toBeGreaterThan(0);
    expect(isZeroGain(s, zgOn, 'HENS')).toBe(false);
  });
  it('flag on: HENS is in the filtered scorer rows with the same payback as the stock scorer', () => {
    const s = FX.H20(); const stock = allScorer(s, zgOn).find(r => r.key === 'HENS')!, f = zgFiltered(allScorer)(s, zgOn).find(r => r.key === 'HENS')!;
    expect(f).toEqual(stock);
  });
});

describe('ZG-AC8 [unit] re-evaluation in FX-FLIP', () => {
  it('before: COLL not ZG, HENS ZG; after one COLL buy: COLL ZG, HENS not', () => {
    const s = FX.FLIP();
    expect(isZeroGain(s, zgOn, 'COLL')).toBe(false); expect(isZeroGain(s, zgOn, 'HENS')).toBe(true);
    const a = { ...s, collectionLevel: 1 };
    expect(isZeroGain(a, zgOn, 'COLL')).toBe(true); expect(isZeroGain(a, zgOn, 'HENS')).toBe(false);
    const keys = (st: GameState) => zgFiltered(allScorer)(st, zgOn).map(r => r.key);
    expect(keys(s)).toContain('COLL'); expect(keys(s)).not.toContain('HENS');
    expect(keys(a)).not.toContain('COLL'); expect(keys(a)).toContain('HENS');
  });
});

describe('ZG-AC7 [property] determinism, breed-neutrality, purity', () => {
  const base: GameState[] = [...Object.values(FX).map(f => f())];
  // every 50th post-step state of a seller15 seed-1..3 trace (bounded here; the full 12,000 s x seeds 1–20 run is QA's P2)
  for (const seed of [1, 2, 3]) { let i = 0; zgTrace(zgOn, seed, 3000, st => { if (++i % 50 === 0 && base.length < 400) base.push(st); }); }
  let r = 12345; const rnd = () => (r = (r * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  it('20 perturbations of coins / moods / energy / time / rng / settle stamps leave isZeroGain unchanged; s deep-equal after', () => {
    for (const s0 of base) {
      const want = ZG_KEYS.map(k => isZeroGain(s0, zgOn, k));
      for (let p = 0; p < 20; p++) {
        const ws = Object.fromEntries(Object.entries(s0.workers).map(([k, w]) => [k, { ...w!, energy: Math.round(rnd() * 100) }]));
        const s = { ...s0, coinsCents: Math.floor(rnd() * 1e12), workers: ws, rngState: Math.floor(rnd() * 2 ** 31), t: rnd() * 1e5 } as any;
        const snap = structuredClone(s);
        expect(ZG_KEYS.map(k => isZeroGain(s, zgOn, k))).toEqual(want);
        expect(s).toEqual(snap);
      }
    }
  });
});

describe('ZG-AC16/17/17b [unit] ★ filtered before the pick', () => {
  it('FX-L30 (all ZG): both filtered picks are null (stock hint picks COLL)', () => {
    const s = FX.L30(); expect(options(s, zgOn).map(o => o.key)).toEqual(['COLL']); expect(gain(s, 'COLL')!).toBeLessThanOrEqual(0);
    expect(new DualPicker().tick(s, zgOn, 0).hint?.key).toBe('COLL');
    const p = new DualPicker(zgFiltered(defaultScorer), zgFiltered(allScorer)).tick(s, zgOn, 0);
    expect(p.highlight).toBeNull(); expect(p.hint).toBeNull();
  });
  it('FX-L30u (E18): only affordable row COLL is ZG; hint = unaffordable FARM, not affordable (so bestBuyMark null)', () => {
    const s = FX.L30u(); expect(options(s, zgOn).map(o => o.key).sort()).toEqual(['COLL', 'FARM']);
    expect(isZeroGain(s, zgOn, 'COLL')).toBe(true);
    const h = new DualPicker(zgFiltered(defaultScorer), zgFiltered(allScorer)).tick(s, zgOn, 0).hint!;
    expect(h.key).toBe('FARM'); expect(h.affordable).toBe(false);
  });
  it('E17: a held pick K that turns ZG leaves at the next tick, with no 2 s hold', () => {
    const s = FX.FLIP(); let zg = new Set<BuyKey>();
    const ph = new PickHysteresis(zgFiltered(allScorer, (_s, _b, k) => zg.has(k)));
    const k = ph.tick(s, zgOn, 0)!.key; expect(ph.tick(s, zgOn, 500)!.key).toBe(k);
    zg = new Set([k]); const nx = ph.tick({ ...s, coinsCents: s.coinsCents - 1 }, zgOn, 600);
    expect(nx?.key ?? null).not.toBe(k);
  });
});

describe('ZG-AC20 [sim] parity with the Best buy verdict (bounded trace; full seeds 1–200 x 12,000 s is QA P2)', () => {
  it('isZeroGain === optionGain.gain <= 0 for every offered COLL/HENS/VALUE, except HENS milestone steps with Δcap > 0', () => {
    const counts: Record<string, number> = { COLL: 0, HENS: 0, VALUE: 0, capEx: 0 };
    for (const seed of [1, 2]) zgTrace(zgOn, seed, 3000, (s: GameState) => {
      for (const k of ZG_KEYS) { const g = optionGain(s, zgOn, k); if (!g) continue;
        const zg = isZeroGain(s, zgOn, k), cap = zeroGainInputs(s, zgOn, k)!.dCap > 0;
        if (k === 'HENS' && cap && g.gain <= 0) { expect(zg).toBe(false); counts.capEx++; } else expect(zg, `${k} seed ${seed}`).toBe(g.gain <= 0);
        if (zg) counts[k]++; } });
    expect(counts.COLL).toBeGreaterThan(0);
  });
});
