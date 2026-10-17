// SD6-1 / SD6-2 / SD6-3 (QA Saves, build m3-rc1-pre+5d636d8).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, serialize, validate, loadSafe, CORRUPT_INDEX_KEY } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
import { mem } from './helpers';
const T = 1.8e12;
describe('SD6-2: savedAt NaN acts like a missing savedAt', () => {
  for (const tok of ['NaN', '-Infinity', 'Infinity']) it(`savedAt ${tok}: progress kept, savedAt=now, no recovery, no corrupt copy, no offline reward`, () => {
    const raw = serialize({ ...initialState(b, 1), coinsCents: 123456, farmLevel: 4 }, T - 3600_000).replace(/"savedAt":\d+/, `"savedAt":${tok}`);
    expect(validate(raw, b).ok).toBe(true);
    const kv = mem(); kv.setItem(SAVE_KEY, raw);
    const g = new Game(b, kv, () => T, undefined, 'test');
    expect(g.recovery).toBeNull(); expect(g.recoveryOutcome).toBeNull(); expect(g.offline?.eggs ?? 0).toBe(0);
    expect(g.state.farmLevel).toBe(4); expect(g.state.coinsCents).toBe(123456);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).savedAt).toBe(T); expect(kv.getItem(CORRUPT_INDEX_KEY)).toBeNull();
    const g2 = new Game(b, kv, () => T + 10_000, undefined, 'test'); expect(g2.offline?.eggs ?? 0).toBe(0); expect(g2.recovery).toBeNull();
  });
  it('a string savedAt and a NaN inside state stay on the corrupt path', () => {
    const base = serialize(initialState(b, 1), T);
    expect(validate(base.replace(/"savedAt":\d+/, '"savedAt":"yesterday"'), b).ok).toBe(false);
    expect(validate(base.replace('"coinsCents":0', '"coinsCents":NaN'), b).ok).toBe(false);
  });
});
describe('SD6-3: v5 -> v6 migration', () => {
  it('m2-rc1-v5-40min.json migrates losslessly (coins to the cent, levels, workers)', () => {
    const raw = readFileSync(new URL('./fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8'); const d = JSON.parse(raw);
    const kv = mem(); kv.setItem(SAVE_KEY, raw); const r = loadSafe(kv, b, T);
    expect(r.recovery).toBeNull(); const s = r.file!.state;
    expect(s.coinsCents).toBe(d.state.coinsCents); expect(s.farmLevel).toBe(d.state.farmLevel); expect(s.collectionLevel).toBe(d.state.collectionLevel);
    expect(Object.keys(s.workers)).toEqual(Object.keys(d.state.workers)); expect(s.wageFracCents).toEqual({});
  });
  it('a fraction a v5 save already carries is kept (valid [0,1) numbers only)', () => {
    const v5 = JSON.parse(readFileSync(new URL('./fixtures/saves/m2-rc1-v5-40min.json', import.meta.url), 'utf8'));
    v5.state.wageFracCents = { market_hand: 0.9166, coop_hand: 7, hawker: 'x' }; delete v5.sum;
    const kv = mem(); kv.setItem(SAVE_KEY, JSON.stringify(v5)); expect(loadSafe(kv, b, T).file!.state.wageFracCents).toEqual({ market_hand: 0.9166 });
  });
});
describe('SD6-1 + AC14b ruling (a): no-storage notice is always raised, deferred only while the recovery dialog is open', () => {
  it('main.ts raises NO_STORAGE_TEXT on refusal; the notice queue shows it when the dialog closes', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/addEventListener\(RECOVERY_CLOSED, \(\) => notices\.dialogClosed\(\)\)/);
    expect(src).toMatch(/lease\.storageBlocked\)[\s\S]{0,300}saveNotice\(NO_STORAGE_TEXT\)/);
    expect(src).toMatch(/if \(g\.storageFailed\) saveNotice\(NO_STORAGE_TEXT\)/);
  });
});
