// M41-6: save round-trip and v4/v5/v6 migration through the changed save path (Game.save({ mirrorOnFail })).
// SAVE_VERSION stays 6. Existing fixtures are read only.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live, type Balance } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, SAVE_VERSION, validate } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';

const FX = (n: string) => readFileSync(`${process.cwd()}/tests/fixtures/saves/${n}`, 'utf8').trim();
const ON: Balance = { ...live, m4: { ...live.m4!, enabled: 1 } }, OFF: Balance = { ...live, m4: { ...live.m4!, enabled: 0 } };
const kvOf = (raw: string) => { const m = new Map([[SAVE_KEY, raw]]); const ctl = { fail: false };
  return { m, ctl, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { if (ctl.fail && k.startsWith('eggfarm.save')) throw new DOMException('quota', 'QuotaExceededError'); m.set(k, v); }, removeItem: (k: string) => void m.delete(k) } as any; };
const mirrorOf = () => { const w: string[] = []; return { w, mirror: { write: (r: string) => { w.push(r); }, clear: async () => {}, newer: null, onNewer: null } as any }; };
const CASES = [['v4', 'm1-rc2-v4-12min.json'], ['v5', 'm2-rc1-v5-12min.json'], ['v6', 'm4-pre-v7-F30-C30.json']] as const;
// M4 on: an unmarked v4/v5 save boots pending (mirror paused, M4-24); commit the in-session migration first, as the app does.
const commit = async (g: Game) => { if (g.tracksMigrationPending) expect(await g.startTracksMigration()).toBe('committed'); expect(g.tracksMigrationPending).toBeFalsy(); };
const pick = (s: any) => ({ coins: s.coinsCents, F: s.farmLevel, C: s.collectionLevel });

it('SAVE_VERSION stays 6', () => { expect(SAVE_VERSION).toBe(6); });
for (const [b, bn] of [[ON, 'M4 on'], [OFF, 'M4 off']] as const) for (const [ver, file] of CASES) describe(`${ver} save, ${bn}`, () => {
  const raw = FX(file), T = JSON.parse(raw).savedAt + 30_000;
  it('migrates on load; save() and save({ mirrorOnFail: false }) write a valid v6 that round-trips', async () => {
    expect(JSON.parse(raw).version).toBe(ver === 'v4' ? 4 : ver === 'v5' ? 5 : 6);
    const kv = kvOf(raw); const { w, mirror } = mirrorOf(); const g = new Game(b, kv, () => T, 1, 'test', mirror, null); await commit(g);
    expect(g.isNewGame).toBe(false); expect(g.recovery ?? null).toBeNull(); const want = pick(g.state);
    for (const opts of [undefined, { mirrorOnFail: false }, { mirrorOnFail: true }]) {
      const n = w.length; g.save(opts as any); const out = kv.getItem(SAVE_KEY)!;
      expect(JSON.parse(out).version).toBe(6); expect(validate(out, b).ok).toBe(true);
      expect(w.length).toBe(n + 1); expect(w.at(-1)).toBe(out); // success: mirror always gets the same bytes
    }
    const g2 = new Game(b, kv, () => T + 1000, 1, 'test'); expect(pick(g2.state)).toEqual(want); expect(g2.isNewGame).toBe(false);
    expect([...kv.m.keys()].filter((k: string) => k.startsWith('eggfarm.save.corrupt'))).toEqual([]);
  });
  it('localStorage full: default save() mirrors a valid v6 that reconcile restores; mirrorOnFail:false writes nothing', async () => {
    const kv = kvOf(raw); const { w, mirror } = mirrorOf(); const g = new Game(b, kv, () => T, 1, 'test', mirror, null); await commit(g); const want = pick(g.state);
    const lsBefore = kv.getItem(SAVE_KEY); kv.ctl.fail = true;
    const n = w.length; g.save({ mirrorOnFail: false }); expect(w.length).toBe(n); expect(kv.getItem(SAVE_KEY)).toBe(lsBefore); expect(g.storageFailed).toBe(true);
    g.save(); expect(w.length).toBe(n + 1); const m = w.at(-1)!;
    expect(JSON.parse(m).version).toBe(6); expect(validate(m, b).ok).toBe(true);
    // the tab dies; the next boot finds the original (pre-session) localStorage copy and the mirror: the mirror wins
    const kv2 = kvOf(raw); expect(reconcile(kv2, m, b, T + 1000)).toBe('idb');
    const g2 = new Game(b, kv2, () => T + 1000, 1, 'test', mirrorOf().mirror, m); expect(pick(g2.state)).toEqual(want); expect(g2.recovery ?? null).toBeNull();
  });
});
