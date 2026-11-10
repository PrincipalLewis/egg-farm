// BUG-6 (qa/claude-qa/rc1-pt1-pass1.md): a save with no / non-finite savedAt granted the full offline cap on every reload.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { serialize, validate, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { initialState } from '../src/sim/state';
import { Game } from '../src/game';
const kvm = () => { const m = new Map<string, string>(); const writes: string[] = [];
  return { m, writes, getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => { m.delete(k); }, setItem: (k: string, v: string) => { writes.push(k); m.set(k, v); } }; };
const base = () => JSON.parse(serialize({ ...initialState(b), coop: 0, basket: 0 }, 1));
describe('BUG-6 missing / invalid savedAt', () => {
  for (const [name, mk] of [['missing', (d: any) => { delete d.savedAt; return JSON.stringify(d); }],
    ['Infinity (1e999)', (d: any) => JSON.stringify(d).replace('"savedAt":1', '"savedAt":1e999')]] as const) {
    it(`${name}: 0 offline, savedAt stamped now and written at once; reload also 0 offline`, () => {
      const k = kvm(); k.m.set(SAVE_KEY, mk(base())); let t = 1.8e12;
      const g1 = new Game(b, k, () => t); expect(g1.offline.eggs).toBe(0);
      expect(k.writes).toContain(SAVE_KEY); expect(JSON.parse(k.m.get(SAVE_KEY)!).savedAt).toBe(t);
      t += 30_000; const g2 = new Game(b, k, () => t); expect(g2.offline.eggs).toBe(0); expect(JSON.parse(k.m.get(SAVE_KEY)!).savedAt).toBe(t);
    });
  }
  it('valid savedAt still grants offline; future savedAt still clamps to 0', () => {
    const k = kvm(); k.m.set(SAVE_KEY, serialize({ ...initialState(b), coop: 0, basket: 0 }, 1.8e12 - 3600_000));
    expect(new Game(b, k, () => 1.8e12).offline.eggs).toBeGreaterThan(0);
    const k2 = kvm(); k2.m.set(SAVE_KEY, serialize({ ...initialState(b), coop: 0, basket: 0 }, 1.9e12));
    expect(new Game(b, k2, () => 1.8e12).offline.eggs).toBe(0);
  });
  it('a string savedAt stays on the corrupt path (wrong_type)', () => {
    const d = base(); d.savedAt = 'yesterday'; expect(validate(JSON.stringify(d), b)).toEqual({ ok: false, reason: 'wrong_type' });
  });
  it('a refused newer save without savedAt still gets no writes', () => {
    const k = kvm(); k.m.set(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, state: {} }));
    const g = new Game(b, k, () => 1.8e12); expect(g.newerSave).toBe(SAVE_VERSION + 1); g.save(); g.endSession();
    expect(k.writes.filter(x => x.startsWith('eggfarm.save'))).toEqual([]);
  });
});
