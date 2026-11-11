// QA (not committed): acdbedc M4-state saves F1-F5 -> 90a9c84 (M4 ON natively) load/migrate, writable, round-trip.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, saveSeqOf } from '../src/save/save';
import { m4On } from '../src/config/formulas';
import { m4OfflineEggs } from '../src/sim/offline';
import { offlineMult } from '../src/sim/tracks';
const D = '/workspace/egg-farm-studio/qa/m3-recheck/m4-downgrade-fixtures';
const mem = (init: Record<string, string>) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const AWAY = 3600_000, CORE = ['coinsCents', 'farmLevel', 'collectionLevel', 'graderTier', 'celebratedTier'] as const, M4 = ['hensLevel', 'eggValueLevel', 'tracksV7', 'v6BackupId', 'celebratedMilestones'] as const;
const R: any[] = [];
describe('acdbedc M4 saves -> 90a9c84 M4 on', () => {
  it('build is M4 on', () => expect(m4On(b)).toBe(true));
  for (const id of ['F1-tracks', 'F2-highlight', 'F3-offline-pending', 'F4-L30max', 'F5-preM4']) it(id, async () => {
    const fx = JSON.parse(readFileSync(`${D}/${id}.json`, 'utf8')), s0 = fx.state, kv = mem(fx.ls);
    let t = fx.savedAt + AWAY; const errs: unknown[] = [];
    const g = new Game(b, kv, () => t, 1, 'qa-90a9c84', null, fx.idb);
    expect(g.recovery).toBeNull(); expect((g as any).newerSave ?? null).toBeNull(); expect((g as any).readOnly).toBeFalsy();
    const st = g.state as any;
    for (const k of CORE) expect(st[k], k).toEqual(s0[k]);
    expect(st.workers).toEqual(s0.workers);
    expect(st.basket, 'basket = old basket + settled pending').toBe(s0.basket + s0.pendingOfflineEggs);
    expect(st.coop).toBe(s0.coop);
    const pre = id === 'F5-preM4';
    if (!pre) for (const k of M4) expect(st[k], k).toEqual(s0[k]);
    const expGrant = pre ? null : m4OfflineEggs(AWAY / 1000, s0.hensLevel, b, offlineMult(s0, b));
    if (!pre) expect(st.pendingOfflineEggs, 'grant at M4 rate, once').toBe(expGrant);
    const raw1 = kv.getItem(SAVE_KEY)!; expect(saveSeqOf(raw1)).toBeGreaterThan(fx.saveSeq);
    let mig: string | null = null;
    if (pre) { expect(g.tracksMigrationPending).toBe(true); mig = await g.startTracksMigration(); expect(mig).toBe('committed'); expect((g.state as any).tracksV7).toBe(1); }
    t += 5_000; g.save(); const raw2 = kv.getItem(SAVE_KEY)!; expect(saveSeqOf(raw2)).toBeGreaterThan(saveSeqOf(raw1));
    const j2 = JSON.parse(raw2).state;
    // reload in same build (5 s later: < 60 s, no new grant), state must equal what was written
    t += 5_000; const g2 = new Game(b, kv, () => t, 1, 'qa-90a9c84', null, raw2);
    expect(g2.recovery).toBeNull(); expect(g2.tracksMigrationPending).toBe(false);
    const s2 = g2.state as any;
    for (const k of [...CORE, ...M4]) expect(s2[k], 'rt ' + k).toEqual(j2[k]);
    expect(s2.basket, 'rt basket (pending settled once, no 2nd grant)').toBe(j2.basket + j2.pendingOfflineEggs); expect(s2.pendingOfflineEggs).toBe(0);
    g2.save(); expect(saveSeqOf(kv.getItem(SAVE_KEY))).toBeGreaterThan(saveSeqOf(raw2));
    R.push({ id, seq: [fx.saveSeq, saveSeqOf(raw1), saveSeqOf(raw2), saveSeqOf(kv.getItem(SAVE_KEY))], coins: [s0.coinsCents, s2.coinsCents], basket: [s0.basket, s0.pendingOfflineEggs, st.basket, s2.basket], grant: [expGrant, st.pendingOfflineEggs], levels: [s2.farmLevel, s2.hensLevel, s2.eggValueLevel], tracksV7: s2.tracksV7, mig, errs });
  });
  it('report', () => { console.log('QA_RESULTS ' + JSON.stringify(R)); });
});
