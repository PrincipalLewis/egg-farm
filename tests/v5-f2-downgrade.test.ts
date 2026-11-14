// v5 F2 downgrade check (m5.0-sizing.md §1 F2, §6 risk 4, §9.5): a build WITHOUT the M5 code (run against tag m4.1-5d9efa6 and
// base 22eac98 by the F2 gate) loads an M5 save from LS main, .bak or IndexedDB without throwing, ignores the unknown fields,
// and writes them back unchanged (migrate spreads state, serialize writes the whole state). Uses only APIs present at 5d9efa6.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, SAVE_VERSION } from '../src/save/save';
import { mem } from './helpers';
const RAW = readFileSync(new URL('./fixtures/v5-f2/m5-save.json', import.meta.url), 'utf8').trim();
const M5_KEYS = ['abilities', 'nextSpawnRemainingS', 'frenzyRemainingS', 'evRngState', 'broodyNestCents', 'broodyHenIdx'];
const T = JSON.parse(RAW).savedAt + 30_000;
const pick = (st: any) => Object.fromEntries(M5_KEYS.map(k => [k, st[k]]));
describe.each([
  ['ls', (kv: any) => kv.setItem(SAVE_KEY, RAW), {}],
  ['bak', (kv: any) => kv.setItem(BAK_KEY, RAW), {}],
  ['idb', () => {}, { idbBoot: 'ok' }],
] as const)('downgrade: an M5 save in %s on a build without M5 code', (store, put, opts) => {
  it('loads (no throw, no recovery reset), keeps the farm, ignores the M5 fields and writes them back unchanged', () => {
    expect(SAVE_VERSION).toBe(6); const kv = mem(); put(kv); const want = pick(JSON.parse(RAW).state);
    const g = new Game(b, kv, () => T, 7, 'dev', null, store === 'idb' ? RAW : null, opts as any);
    expect(g.state.farmLevel).toBe(JSON.parse(RAW).state.farmLevel); expect(g.state.coinsCents).toBe(JSON.parse(RAW).state.coinsCents);
    expect(pick(g.state)).toEqual(want); expect(g.recovery?.restored_from_backup ?? true).toBe(true);
    for (let i = 0; i < 50; i++) g.debugAdvance(100); g.save();
    expect(pick(JSON.parse(kv.getItem(SAVE_KEY)!).state)).toEqual(want);
  });
});
