// M4-AC-EXP1 save side: seenTracksExplainer is an optional v6 field (absent = false, SAVE_VERSION 6); old saves load;
// the v6->v7 tracks migration keeps it; M4-off resaves keep it; the checksum covers it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live, type Balance } from '../src/config/balance';
import { validate, save, serialize, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { initialState } from '../src/sim/state';
const fx = (n: string) => readFileSync(new URL(`./fixtures/saves/${n}`, import.meta.url), 'utf8');
const on = { ...live, m4: { ...live.m4!, enabled: 1 } } as Balance, off = { ...live, m4: { ...live.m4!, enabled: 0 } } as Balance;
const mem = () => { const m = new Map<string,string>(); return { getItem:(k:string)=>m.get(k)??null, setItem:(k:string,v:string)=>{m.set(k,v)}, removeItem:(k:string)=>{m.delete(k)} }; };
const T = Date.UTC(2026,9,19,3);
describe('seenTracksExplainer save side (M4-AC-EXP1, l30plus-saves PR #46 check)', () => {
  it('SAVE_VERSION 6; default absent/false', () => { expect(SAVE_VERSION).toBe(6); expect(initialState(on,1).seenTracksExplainer).toBeFalsy(); });
  for (const n of ['m1-rc2-v4-12min.json','m2-rc1-v5-12min.json','m2-rc1-v5-40min.json','m2-rc1-v5-40min-edge.json','m4-pre-v7-F30-C30.json'])
    for (const b of [on, off]) it(`old save ${n} loads (m4 ${b.m4!.enabled}), flag falsy`, () => { const v = validate(fx(n), b); expect(v.ok).toBe(true); if (v.ok) expect(v.file.state.seenTracksExplainer).toBeFalsy(); });
  it('migration keeps flag; round-trip keeps it; checksum covers it', () => {
    const d = JSON.parse(fx('m4-pre-v7-F30-C30.json')); const st = { ...d.state, seenTracksExplainer: true };
    const r = serialize(st, T); const v = validate(r, on); expect(v.ok && v.file.tracksMigrated).toBe(true);
    if (!v.ok) return; expect(v.file.state.seenTracksExplainer).toBe(true); expect((v.file.v6State as any).seenTracksExplainer).toBe(true);
    for (const b of [on, off]) { const kv = mem(); save(kv, { ...v.file.state, v6BackupId: 'x' }, T, b); const w = validate(kv.getItem(SAVE_KEY)!, b); expect(w.ok && w.file.state.seenTracksExplainer).toBe(true); }
    const unmarkedOff = mem(); save(unmarkedOff, st, T, off); expect(JSON.parse(unmarkedOff.getItem(SAVE_KEY)!).state.seenTracksExplainer).toBe(true);
    const tampered = r.replace('"seenTracksExplainer":true', '"seenTracksExplainer":false'); expect(tampered).not.toBe(r);
    const t = validate(tampered, on); expect(t.ok).toBe(false); if (!t.ok) expect(t.reason).toBe('checksum');
  });
});
