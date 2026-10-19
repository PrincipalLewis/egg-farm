// l30plus-saves M2 + m1 (HoE approved): levels above this build's maxLevel load as stored (no corrupt path, no reset) and
// survive re-saves; the sim and pricing use the capped value. Garbage levels sanitize to finite integers; never NaN.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as shipped, type Balance } from '../src/config/balance';
import { SAVE_KEY, BAK_KEY, CORRUPT_INDEX_KEY, SAVE_VERSION, serialize, validate, load, sanitizeLevel } from '../src/save/save';
import { Game } from '../src/game';
import { initialState } from '../src/sim/state';
import { prodEggsPerSec, salePriceCents, coopCap, trackLock } from '../src/sim/tracks';
import { farmCost } from '../src/sim/state';
import { applyOffline } from '../src/sim/offline';
import { mem } from './helpers';
const cap30 = (on: 0 | 1) => ({ ...shipped, maxLevel: 30, m4: { ...shipped.m4!, enabled: on } }) as Balance;
const T = Date.UTC(2026, 9, 19, 3), ID = '0123456789abcdef';
const fx = (n: string) => readFileSync(new URL(`./fixtures/saves/${n}`, import.meta.url), 'utf8');
const finite = (s: any, b: Balance) => [prodEggsPerSec(s, b), salePriceCents(s, b), coopCap(s, b), farmCost(s.farmLevel, b), applyOffline(s, 3_600_000, b).eggs].every(Number.isFinite);
const boot = (raw: string, b: Balance, now = T + 3_600_000) => { const kv = mem(); kv.setItem(SAVE_KEY, raw); const g = new Game(b, kv, () => now, 1); return { kv, g }; };
const noCorrupt = (kv: ReturnType<typeof mem>) => { expect([...kv.m.keys()].filter(k => k.startsWith('eggfarm.save.corrupt'))).toEqual([]); expect(kv.getItem(CORRUPT_INDEX_KEY)).toBeNull(); };

describe('M2: levels above maxLevel (L31+ / L50+ save on a 30-cap build)', () => {
  for (const on of [0, 1] as const) for (const [F, H, V, C] of [[31, 33, 32, 31], [50, 55, 52, 50]]) {
    it(`M4 ${on ? 'on' : 'off'}: F${F} H${H} V${V} C${C} loads, sim capped, original kept across save round-trips`, () => {
      const b = cap30(on);
      const st = { ...initialState(b, 1), farmLevel: F, collectionLevel: C, hensLevel: H, eggValueLevel: V, coinsCents: 5_000, ...(on ? { tracksV7: 1 as const, v6BackupId: ID } : {}) };
      const raw = serialize(st, T); const r = validate(raw, b); expect(r.ok).toBe(true);
      const { kv, g } = boot(raw, b);
      expect(g.isNewGame).toBe(false); expect(g.recovery).toBeFalsy(); noCorrupt(kv);
      // M4 off keeps the flag-off (main) save shape: track fields are not part of it (flagOffShape), Farm/Collection are kept.
      const lv = (x: any) => on ? [x.farmLevel, x.collectionLevel, x.hensLevel, x.eggValueLevel] : [x.farmLevel, x.collectionLevel], want = on ? [F, C, H, V] : [F, C];
      expect(lv(g.state)).toEqual(want);
      // effective value is the capped one: identical economy to the same farm at 30
      const at30 = { ...g.state, farmLevel: 30, collectionLevel: 30, hensLevel: 30, eggValueLevel: 30 };
      expect(prodEggsPerSec(g.state, b)).toBe(prodEggsPerSec(at30, b)); expect(salePriceCents(g.state, b)).toBe(salePriceCents(at30, b));
      expect(coopCap(g.state, b)).toBe(coopCap(at30, b)); expect(finite(g.state, b)).toBe(true); expect(Number.isFinite(g.state.pendingOfflineEggs)).toBe(true);
      // buying is refused at the cap (no spend, no level change)
      const c0 = g.state.coinsCents; g.dispatch({ type: 'buyFarm' }); g.dispatch({ type: 'buyCollection' } as any);
      expect([g.state.farmLevel, g.state.collectionLevel, g.state.coinsCents]).toEqual([F, C, c0]);
      if (on) expect(trackLock(g.state, 'hens', b)).toBe('max');
      // round trip: the saved bytes keep the original levels; reload on the 30-cap build and on an uncapped one
      g.save(); const s1 = JSON.parse(kv.getItem(SAVE_KEY)!).state;
      expect(lv(s1)).toEqual(want);
      const g2 = new Game(b, kv, () => T + 7_200_000, 1); expect(g2.state.farmLevel).toBe(F); noCorrupt(kv);
      const wide = { ...b, maxLevel: 60 } as Balance; expect(load(kv, wide)!.state.farmLevel).toBe(F);
    });
  }
  it('M4 on, unmarked v6 farm at F45 on a 30-cap build: migrates at the effective level, no NaN, farm level kept', () => {
    const b = cap30(1); const raw = serialize({ ...initialState(cap30(0), 1), farmLevel: 45, collectionLevel: 40, coinsCents: 1_000 } as any, T);
    const r = validate(raw, b); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.file.tracksMigrated).toBe(true); expect(r.file.state.farmLevel).toBe(45); expect(r.file.state.hensLevel).toBe(30);
    expect(Number.isFinite(r.file.state.coinsCents)).toBe(true); expect(r.file.v6State!.farmLevel).toBe(45); expect(finite(r.file.state, b)).toBe(true);
    const { kv, g } = boot(raw, b); expect(g.isNewGame).toBe(false); noCorrupt(kv); expect(g.state.farmLevel).toBe(45);
  });
});

describe('m1: garbage levels sanitize to finite integers (never NaN)', () => {
  it('sanitizeLevel', () => {
    expect([2.9, 7, 0, -3, NaN, Infinity, -Infinity, '5', null, undefined, {}, true].map(sanitizeLevel)).toEqual([2, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
  const bad: unknown[] = [2.5, -3, 'x', '12', null, 1e999, -1e999, true, [], {}];
  for (const on of [0, 1] as const) for (const v of bad) it(`M4 ${on ? 'on' : 'off'}: every level = ${JSON.stringify(v)}`, () => {
    const b = cap30(on);
    const st: any = { ...initialState(b, 1), coinsCents: 900, ...(on ? { tracksV7: 1, v6BackupId: ID } : {}) };
    for (const k of ['farmLevel', 'collectionLevel', 'hensLevel', 'eggValueLevel']) st[k] = v;
    const raw = JSON.stringify({ version: SAVE_VERSION, savedAt: T, state: st }); // no checksum: a hand-edited save
    const r = validate(raw, b); expect(r.ok).toBe(true); if (!r.ok) return;
    const want = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    for (const k of ['farmLevel', 'collectionLevel', 'hensLevel', 'eggValueLevel'] as const) expect(r.file.state[k], k).toBe(want);
    expect(finite(r.file.state, b)).toBe(true);
    const { kv, g } = boot(raw, b); noCorrupt(kv); expect(finite(g.state, b)).toBe(true);
    expect(Number.isFinite(g.state.pendingOfflineEggs) && Number.isFinite(g.state.coinsCents)).toBe(true);
  });
  it('M4 on: missing track fields on a marked save default to 0', () => {
    const b = cap30(1); const st: any = { ...initialState(b, 1), tracksV7: 1, v6BackupId: ID }; delete st.hensLevel; delete st.eggValueLevel;
    const r = validate(JSON.stringify({ version: 6, savedAt: T, state: st }), b); expect(r.ok).toBe(true);
    if (r.ok) { expect([r.file.state.hensLevel, r.file.state.eggValueLevel]).toEqual([0, 0]); expect(finite(r.file.state, b)).toBe(true); }
  });
});

describe('old v4/v5 and v6 saves still load lossless', () => {
  for (const n of ['m1-rc2-v4-12min.json', 'm2-rc1-v5-12min.json', 'm2-rc1-v5-40min.json', 'm2-rc1-v5-40min-edge.json']) for (const on of [0, 1] as const) {
    it(`${n} (and its v6 re-save), M4 ${on ? 'on' : 'off'}`, () => {
      const b = { ...shipped, m4: { ...shipped.m4!, enabled: on } } as Balance, offB = { ...shipped, m4: { ...shipped.m4!, enabled: 0 } } as Balance;
      const v5 = fx(n), first = validate(v5, offB); expect(first.ok).toBe(true); if (!first.ok) return;
      for (const raw of [v5, serialize(first.file.state, T)]) {
        const orig = JSON.parse(raw).state, r = validate(raw, b); expect(r.ok).toBe(true); if (!r.ok) continue;
        const base: any = r.file.tracksMigrated ? r.file.v6State : r.file.state;
        for (const k of Object.keys(orig)) { expect(base, k).toHaveProperty(k); if (typeof orig[k] !== 'object') expect(base[k], k).toEqual(orig[k]); }
        expect(finite(r.file.state, b)).toBe(true);
      }
    });
  }
});
