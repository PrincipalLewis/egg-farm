// Regressions for qa/claude-qa/save-durability-2959ba0.md: BUG-1..5 + Code Reviewer minors (idb-mirror.ts:55 reconcile).
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { serialize, validate, loadSafe, preserveCorrupt, resetProgress, SAVE_KEY, BAK_KEY, MIN_SAVED_AT } from '../src/save/save';
import { pickNewest, IdbMirror } from '../src/save/idb-mirror';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
const kvm = () => { const m = new Map<string, string>(); const writes: string[] = [];
  return { m, writes, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { m.delete(k); }, setItem: (k: string, v: string) => { writes.push(k); m.set(k, v); } }; };
const st = (p = {}) => ({ ...initialState(b, 1), coop: 0, basket: 0, ...p });
const NOW = 1.8e12;
const withSavedAt = (v: string) => serialize(st({ basket: 15 }), 1).replace('"savedAt":1,', `"savedAt":${v},`);
const v7 = JSON.stringify({ version: 7, savedAt: NOW, state: { coinsCents: 1 } });

describe('BUG-1/BUG-5: invalid savedAt (<= 0, pre-2020, null) -> 0 offline, re-stamped now, loaded (not corrupt)', () => {
  for (const v of ['0', '-5000000000000', String(MIN_SAVED_AT - 1), '1000', 'null']) {
    it(`savedAt ${v}`, () => {
      const k = kvm(); k.m.set(SAVE_KEY, withSavedAt(v)); let t = NOW;
      const g = new Game(b, k, () => t);
      expect(g.offline.eggs).toBe(0); expect(g.state.pendingOfflineEggs).toBe(0); expect(g.recovery).toBeNull();
      expect(g.state.basket).toBe(15); expect(JSON.parse(k.m.get(SAVE_KEY)!).savedAt).toBe(t);
      t += 30_000; expect(new Game(b, k, () => t).offline.eggs).toBe(0);
    });
  }
  it('string savedAt stays on the corrupt path (wrong_type)', () => {
    const r = validate(withSavedAt('"abc"'), b); expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toBe('wrong_type');
  });
  it('a 2h-old valid savedAt still pays; exactly 2020-01-01 is valid; a future one clamps to 0', () => {
    const k = kvm(); k.m.set(SAVE_KEY, serialize(st(), NOW - 7_200_000)); expect(new Game(b, k, () => NOW).offline.eggs).toBeGreaterThan(0);
    const k1 = kvm(); k1.m.set(SAVE_KEY, serialize(st(), MIN_SAVED_AT)); expect(new Game(b, k1, () => MIN_SAVED_AT + 3_600_000).offline.eggs).toBeGreaterThan(0);
    const k2 = kvm(); k2.m.set(SAVE_KEY, serialize(st(), NOW + 1e9)); expect(new Game(b, k2, () => NOW).offline.eggs).toBe(0);
  });
  it('future savedAt is invalid (Product 15:15): 0 offline, loaded, re-stamped now; reload 30 min later pays a normal grant from now', () => {
    const k = kvm(); k.m.set(SAVE_KEY, serialize(st({ basket: 15 }), NOW + 3_600_000)); const g = new Game(b, k, () => NOW);
    expect(g.offline.eggs).toBe(0); expect(g.recovery).toBeNull(); expect(g.state.basket).toBe(15); expect(JSON.parse(k.m.get(SAVE_KEY)!).savedAt).toBe(NOW);
  });
});

describe('BUG-2: a live tab re-checks for a newer save before every write', () => {
  for (const where of [SAVE_KEY, BAK_KEY]) it(`newer copy appears in ${where}: autosave/pagehide write nothing, onNewerSave fires once`, () => {
    const k = kvm(); k.m.set(SAVE_KEY, serialize(st(), NOW)); let t = NOW; const g = new Game(b, k, () => t);
    const seen: number[] = []; g.onNewerSave = v => seen.push(v);
    const before = k.m.get(SAVE_KEY), bak = k.m.get(BAK_KEY);
    k.m.set(where, v7); t += 5000; const w0 = k.writes.length;
    g.save(); g.endSession(); g.flushForHandover(); g.dispatch({ type: 'collect' } as any); g.save();
    expect(k.writes.slice(w0).filter(x => x.startsWith('eggfarm.save'))).toEqual([]);
    expect(k.m.get(where)).toBe(v7); if (where === BAK_KEY) expect(k.m.get(SAVE_KEY)).toBe(before); else expect(k.m.get(BAK_KEY)).toBe(bak);
    expect(seen).toEqual([7]); expect(g.readOnly && g.inactive).toBe(true); expect(g.newerSave).toBe(7);
  });
  it('newer copy only in IndexedDB: the mirror write checks in its transaction, never puts, and stops the Game', async () => {
    const data = new Map<string, unknown>(); const later = (f: () => void) => setTimeout(f, 0);
    const db: any = { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction() { const t: any = {}; t.objectStore = () => ({
      get: (key: string) => { const r: any = {}; later(() => { r.result = data.get(key); r.onsuccess?.(); later(() => t.oncomplete?.()); }); return r; },
      put: (v: unknown, key: string) => { data.set(key, v); return {}; }, delete: (key: string) => { data.delete(key); return {}; } }); return t; } };
    const m = (await IdbMirror.open({ open: () => { const r: any = {}; later(() => { r.result = db; r.onsuccess?.(); }); return r; } } as any))!;
    const k = kvm(); k.m.set(SAVE_KEY, serialize(st(), NOW)); const g = new Game(b, k, () => NOW, undefined, 'dev', m, null);
    await new Promise(r => setTimeout(r, 10)); expect(typeof data.get('main')).toBe('string'); // normal mirror write
    const seen: number[] = []; g.onNewerSave = v => seen.push(v);
    data.set('main', v7); g.save(); await new Promise(r => setTimeout(r, 10));
    expect(data.get('main')).toBe(v7); expect(seen).toEqual([7]); expect(g.readOnly).toBe(true);
    const w0 = k.writes.length; g.save(); g.endSession(); expect(k.writes.length).toBe(w0);
  });
});

describe('BUG-3: main missing everywhere, valid .bak -> restore from .bak (never a fresh game over it)', () => {
  it('restores .bak as case R reason missing; .bak survives the next saves', () => {
    const k = kvm(); const bak = serialize(st({ basket: 15 }), NOW - 10_000); k.m.set(BAK_KEY, bak);
    const g = new Game(b, k, () => NOW);
    expect(g.isNewGame).toBe(false); expect(g.state.basket).toBe(15);
    expect(g.recovery).toMatchObject({ case: 'R', reason: 'missing', restored_from_backup: true });
    expect(validate(k.m.get(SAVE_KEY)!, b).ok).toBe(true); expect(k.m.get(BAK_KEY)).toBe(bak);
    g.save(); expect(validate(k.m.get(BAK_KEY)!, b).ok && (validate(k.m.get(BAK_KEY)!, b) as any).file.state.basket).toBe(15);
  });
  it('invalid .bak with no main: preserved, fresh start', () => {
    const k = kvm(); k.m.set(BAK_KEY, '{"version":6,"sav'); const r = loadSafe(k, b, NOW);
    expect(r.file).toBeNull(); expect([...k.m.keys()].some(x => x.startsWith('eggfarm.save.corrupt.'))).toBe(true);
  });
});

describe('BUG-4: Reset clears .bak', () => {
  it('resetProgress removes main and .bak; a reload is a new game', () => {
    const k = kvm(); k.m.set(SAVE_KEY, serialize(st({ basket: 15 }), NOW)); k.m.set(BAK_KEY, serialize(st({ basket: 9 }), NOW - 5000));
    resetProgress(k); expect(k.m.has(SAVE_KEY)).toBe(false); expect(k.m.has(BAK_KEY)).toBe(false);
    expect(new Game(b, k, () => NOW).isNewGame).toBe(true);
  });
});

describe('Review minor idb-mirror.ts:55: missing/invalid savedAt is the oldest copy', () => {
  const valid = serialize(st({ farmLevel: 3 }), NOW);
  for (const v of ['null', '0', '-1']) {
    const bad = serialize(st({ farmLevel: 9 }), 1).replace('"savedAt":1,', `"savedAt":${v},`);
    it(`ls savedAt ${v} vs valid IndexedDB -> idb; reverse -> ls`, () => { expect(pickNewest(bad, valid, b, NOW)).toBe('idb'); expect(pickNewest(valid, bad, b, NOW)).toBe('ls'); });
  }
  it('missing savedAt in localStorage loses to a valid IndexedDB copy', () => {
    const d = JSON.parse(serialize(st({ farmLevel: 9 }), 1)); delete d.savedAt; expect(pickNewest(JSON.stringify(d), valid, b, NOW)).toBe('idb');
  });
});

describe('Product 15:15: single recovery outcome from the loader', () => {
  it("main missing + valid .bak -> 'restored'", () => {
    const k = kvm(); k.m.set(BAK_KEY, serialize(st({ basket: 15 }), NOW)); expect(loadSafe(k, b, NOW).outcome).toBe('restored');
    const k2 = kvm(); k2.m.set(BAK_KEY, serialize(st({ basket: 15 }), NOW)); expect(new Game(b, k2, () => NOW).recoveryOutcome).toBe('restored');
  });
  it("corrupt main + valid .bak -> 'restored'; corrupt main, no .bak -> 'fresh'; copy failed -> 'storage'; normal / none -> null", () => {
    const k = kvm(); k.m.set(SAVE_KEY, '{"trunc'); k.m.set(BAK_KEY, serialize(st(), NOW)); expect(loadSafe(k, b, NOW).outcome).toBe('restored');
    const k2 = kvm(); k2.m.set(SAVE_KEY, '{"trunc'); expect(loadSafe(k2, b, NOW).outcome).toBe('fresh');
    const k3: any = kvm(); k3.m.set(SAVE_KEY, '{"trunc'); const set = k3.setItem; k3.setItem = (key: string, v: string) => { if (key.startsWith('eggfarm.save.corrupt.')) { const e = new Error('q'); e.name = 'QuotaExceededError'; throw e; } set(key, v); };
    expect(loadSafe(k3, b, NOW).outcome).toBe('storage');
    const k4 = kvm(); k4.m.set(SAVE_KEY, serialize(st(), NOW)); expect(loadSafe(k4, b, NOW).outcome).toBeNull(); expect(loadSafe(kvm(), b, NOW).outcome).toBeNull();
    void preserveCorrupt;
  });
});
