// M4-safety: a save from a newer build (version > SAVE_VERSION) is refused untouched.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { loadSafe, save, serialize, newerSaveVersion, newerStoredVersion, validate, SAVE_KEY, BAK_KEY, SAVE_VERSION, CORRUPT_PREFIX } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
import { NEWER_SAVE_STRINGS } from '../src/ui/save-recovery';
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

describe('review 8669522 fixes', () => {
  const v7 = JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 9, state: { coinsCents: 777 } });
  it('B1: newerStoredVersion sees main, .bak and the IndexedDB copy', () => {
    const k = kvm(); expect(newerStoredVersion(k)).toBeNull(); expect(newerStoredVersion(k, v7)).toBe(SAVE_VERSION + 1);
    k.m.set(BAK_KEY, v7); expect(newerStoredVersion(k)).toBe(SAVE_VERSION + 1);
  });
  it('B1: v7 only in IndexedDB, localStorage holds valid v6 -> loadSafe refuses, Game writes nothing, mirror never written', () => {
    const k = kvm(); const o = older(); k.m.set(SAVE_KEY, o);
    expect(loadSafe(k, b, 9e12, v7).newer).toBe(SAVE_VERSION + 1);
    expect(reconcile(k, v7, b)).toBe('ls');
    const idbWrites: string[] = []; const mirror = { write: (r: string) => { idbWrites.push(r); }, clear: async () => {} };
    const g = new Game(b, k, () => 9e12, undefined, 'test', mirror, v7);
    expect(g.newerSave).toBe(SAVE_VERSION + 1); g.save(); g.dispatch({ type: 'collect' } as any); g.frame(); g.endSession(); g.flushForHandover();
    expect(saveKeys(k.writes)).toEqual([]); expect(idbWrites).toEqual([]); expect(k.m.get(SAVE_KEY)).toBe(o);
  });
  it('B1: v7 only in IndexedDB, no localStorage save -> refused, no new game, nothing written', () => {
    const k = kvm(); const idbWrites: string[] = []; const mirror = { write: (r: string) => { idbWrites.push(r); }, clear: async () => {} };
    const g = new Game(b, k, () => 9e12, undefined, 'test', mirror, v7); g.save(); g.endSession();
    expect(g.newerSave).toBe(SAVE_VERSION + 1); expect(g.isNewGame).toBe(false); expect(saveKeys(k.writes)).toEqual([]); expect(idbWrites).toEqual([]);
  });
  it('B1: reconcile writes nothing when .bak is newer', () => {
    const k = kvm(); k.m.set(BAK_KEY, v7); expect(reconcile(k, older(), b)).toBe('ls'); expect(k.writes).toEqual([]);
  });
  it('m1: non-integer versions are not "newer"; they go down the corrupt path', () => {
    for (const v of [6.5, 7.5, SAVE_VERSION + 0.1]) {
      const raw = JSON.stringify({ version: v, savedAt: 1, state: { coinsCents: 1 } });
      expect(newerSaveVersion(raw)).toBeNull(); expect(validate(raw, b)).toEqual({ ok: false, reason: 'version' });
      const k = kvm(); k.m.set(SAVE_KEY, raw); const r = loadSafe(k, b, 1); expect(r.newer).toBeUndefined(); expect(r.recovery?.reason).toBe('version');
    }
  });
  it('m2: corrupt main + newer .bak -> refuse (no fresh start, no corrupt copies)', () => {
    const k = kvm(); k.m.set(SAVE_KEY, '{garbage'); k.m.set(BAK_KEY, v7);
    const r = loadSafe(k, b, 1); expect(r).toEqual({ file: null, recovery: null, newer: SAVE_VERSION + 1 }); expect(k.writes).toEqual([]);
    const g = new Game(b, k, () => 9e12); g.save(); expect(g.newerSave).toBe(SAVE_VERSION + 1); expect(saveKeys(k.writes)).toEqual([]);
  });
  it('m3: refusal copy is exactly M4A-31(b), Try again kept', () => {
    expect(NEWER_SAVE_STRINGS.title).toBe('This save is from a newer version of Egg Farm. Open the newer build to keep playing.'); expect(NEWER_SAVE_STRINGS.retry).toBe('Try again');
  });
  it('M1: main.ts runs the newer-save check before requestFlush / claim', () => {
    const src = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); const boot = src.slice(src.indexOf('async function boot'));
    const chk = boot.indexOf('newerStoredVersion('), ret = boot.indexOf('refuseNewer(preNewer'); expect(chk).toBeGreaterThan(0);
    expect(ret).toBeLessThan(boot.indexOf('new TabLease')); expect(ret).toBeLessThan(boot.indexOf('requestFlush(')); expect(ret).toBeLessThan(boot.indexOf('.claim('));
  });
});
