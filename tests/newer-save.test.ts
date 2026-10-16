// M4-safety: a save from a newer build (version > SAVE_VERSION) is refused untouched.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { loadSafe, save, serialize, newerSaveVersion, SAVE_KEY, BAK_KEY, SAVE_VERSION, CORRUPT_PREFIX } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
const kvm = () => { const m = new Map<string, string>(); const writes: string[] = [];
  return { m, writes, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { writes.push('rm:' + k); m.delete(k); }, setItem: (k: string, v: string) => { writes.push(k); m.set(k, v); } }; };
const m4 = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 5, state: { coinsCents: 123, futureField: { x: 1 } } });
const older = () => serialize({ ...initialState(b), coinsCents: 42 }, 1000);
const saveKeys = (w: string[]) => w.filter(k => k.replace('rm:', '').startsWith('eggfarm.save'));
describe('newer-version save (M4) is refused, never touched', () => {
  it('newerSaveVersion', () => { expect(newerSaveVersion(m4)).toBe(SAVE_VERSION + 1); expect(newerSaveVersion(older())).toBeNull(); expect(newerSaveVersion('{bad')).toBeNull(); expect(newerSaveVersion(null)).toBeNull(); });
  it('loadSafe: no file, no recovery, newer=version; no write/remove of save, .bak or corrupt keys', () => {
    const k = kvm(); k.m.set(SAVE_KEY, m4); k.m.set(BAK_KEY, older());
    const r = loadSafe(k, b, 9e12); expect(r).toEqual({ file: null, recovery: null, newer: SAVE_VERSION + 1 });
    expect(k.writes).toEqual([]); expect(k.m.get(SAVE_KEY)).toBe(m4); expect([...k.m.keys()].some(x => x.startsWith(CORRUPT_PREFIX))).toBe(false);
  });
  it('Game: refuses, read-only, constructor/save()/endSession() never write the save or .bak', () => {
    const k = kvm(); const bak = older(); k.m.set(SAVE_KEY, m4); k.m.set(BAK_KEY, bak);
    const g = new Game(b, k, () => 9e12); expect(g.newerSave).toBe(SAVE_VERSION + 1); expect(g.isNewGame).toBe(false); expect(g.recovery).toBeNull();
    g.save(); g.dispatch({ type: 'collect' } as any); g.frame(); g.endSession();
    expect(saveKeys(k.writes)).toEqual([]); expect(k.m.get(SAVE_KEY)).toBe(m4); expect(k.m.get(BAK_KEY)).toBe(bak);
  });
  it('IndexedDB reconcile never replaces a newer localStorage save (nor writes when IndexedDB holds the newer one)', () => {
    const k = kvm(); k.m.set(SAVE_KEY, m4); reconcile(k, older(), b); expect(k.writes).toEqual([]); expect(k.m.get(SAVE_KEY)).toBe(m4);
    const k2 = kvm(); const o = older(); k2.m.set(SAVE_KEY, o); reconcile(k2, m4, b); expect(k2.writes).toEqual([]); expect(k2.m.get(SAVE_KEY)).toBe(o);
  });
  it('a newer .bak is never overwritten by .bak rotation', () => {
    const k = kvm(); k.m.set(SAVE_KEY, older()); k.m.set(BAK_KEY, m4);
    save(k, { ...initialState(b), coinsCents: 1 }, 2000, b, true); expect(k.m.get(BAK_KEY)).toBe(m4);
  });
});
import { readFileSync } from 'node:fs';
describe('fixture corrupt-version-99.json (was case F) is now refused untouched', () => {
  it('no preserve copy, no fresh start, save bytes unchanged', () => {
    const raw = readFileSync(new URL('./fixtures/saves/corrupt-version-99.json', import.meta.url), 'utf8');
    const k = kvm(); k.m.set(SAVE_KEY, raw); expect(loadSafe(k, b, 1).newer).toBe(99); expect(k.writes).toEqual([]); expect(k.m.get(SAVE_KEY)).toBe(raw);
  });
});
