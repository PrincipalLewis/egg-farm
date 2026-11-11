// @vitest-environment jsdom
// M41-6 QEL-7 (qe-late-e spec v0.3 c6a37023): default save() writes byte-identical localStorage + IndexedDB-mirror payloads
// to dd223f5 on existing save/durability fixtures, and after a successful save the IDB main == LS eggfarm.save bytes.
// Run as tests/qel7-save-bytes.qa.test.ts in BOTH worktrees (candidate + dd223f5) with QEL7_OUT=<json>; compare the JSONs.
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { balance as live } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY } from '../src/save/save';
import { reconcile } from '../src/save/idb-mirror';
const Q = '/workspace/egg-farm-studio/qa';
const sha = (s: string | null) => s === null ? null : createHash('sha256').update(s).digest('hex');
const rawLs = (raw: string) => ({ [SAVE_KEY]: raw.trim() });
const FIX: Record<string, { ls: Record<string, string>; idb: string | null }> = {};
const j = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const exp1 = j(`${Q}/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json`); FIX['EXP1+idb'] = { ls: exp1.ls, idb: exp1.idb.main }; FIX['EXP1-lsonly'] = { ls: exp1.ls, idb: null };
const m1 = j(`${Q}/m3-recheck/gate4-fixtures/M1-midgame-L18-dd52bfd.json`); FIX['M1-midgame-L18'] = { ls: m1.ls, idb: null };
FIX['pre-v7-F30-C30'] = { ls: rawLs(readFileSync(`${Q}/m3-recheck/gate4-fixtures/pre-v7-F30-C30-732e70e.json`, 'utf8')), idb: null };
for (const f of ['m1-rc2-v4-12min', 'm2-rc1-v5-12min', 'm2-rc1-v5-40min', 'm2-rc1-v5-40min-edge']) FIX[f] = { ls: rawLs(readFileSync(`${Q}/m3-fixtures/saves/${f}.json`, 'utf8')), idb: null };
FIX['fresh'] = { ls: {}, idb: null };
const ON = structuredClone(live); ON.m4!.enabled = 1; const OFF = structuredClone(live); OFF.m4!.enabled = 0;
const kvOf = (init: Record<string, string>) => { const m = new Map(Object.entries(init)); const ctl = { fail: false };
  return { m, ctl, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { if (ctl.fail && k.startsWith('eggfarm.save')) { const e: any = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); }, removeItem: (k: string) => void m.delete(k) } as any; };
const saveKeys = (kv: any) => Object.fromEntries([...kv.m.keys()].filter((k: string) => k.startsWith('eggfarm.save')).sort().map((k: string) => [k, sha(kv.m.get(k))]));
const out: any = {};
describe('QEL-7 default save() payload bytes', () => {
  for (const [name, fx] of Object.entries(FIX)) for (const [mode, b] of [['on', ON], ['off', OFF]] as const) it(`${name} m4=${mode}`, () => {
    const base = fx.ls[SAVE_KEY] ? JSON.parse(fx.ls[SAVE_KEY]).savedAt : 1792371600000; let t = (Number.isFinite(base) ? base : 1792371600000) + 5_000;
    const kv = kvOf(fx.ls); const writes: string[] = []; const mirror = { write: (r: string) => { writes.push(r); }, clear: async () => {}, newer: null, onNewer: null } as any;
    if (fx.idb !== null) reconcile(kv, fx.idb, b, t);
    const g = new Game(b, kv, () => t, 1, 'qa', mirror, fx.idb, { idbBoot: 'ok', newId: () => 'qa-fixed-migration-id' });
    const r: any = { load: { ls: saveKeys(kv), mirror: writes.map(sha) } };
    const ok1 = writes.length === 0 || writes.at(-1) === kv.getItem(SAVE_KEY);
    t += 1000; g.save(); r.save = { ls: saveKeys(kv), mirrorLast: sha(writes.at(-1) ?? null), n: writes.length, idbEqLs: writes.at(-1) === kv.getItem(SAVE_KEY) };
    t += 1000; const n = writes.length; kv.ctl.fail = true; g.save(); kv.ctl.fail = false;
    r.lsFail = { ls: saveKeys(kv), mirrorFallback: writes.length === n + 1 ? sha(writes.at(-1)!) : `count+${writes.length - n}`, storageFailed: g.storageFailed };
    out[`${name}|m4=${mode}`] = r;
    r.pending = !!g.tracksMigrationPending;
    if (!g.readOnly && !g.tracksMigrationPending) { expect(r.save.idbEqLs, 'IDB main == LS eggfarm.save after a successful default save').toBe(true); expect(ok1).toBe(true); expect(writes.length).toBe(n + 1); }
    else if (g.tracksMigrationPending) expect(writes.length, 'M4-24: no IDB writes while the migration is pending').toBe(0);
  });
  it('write output', () => { writeFileSync(process.env.QEL7_OUT ?? '/tmp/qel7.json', JSON.stringify(out, null, 1)); expect(Object.keys(out).length).toBe(Object.keys(FIX).length * 2); });
});
