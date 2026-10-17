// CCR B1 (PR #31 @ 7621153): an M4 build running with the switch off writes saveSeq; a later flag-off build must carry it
// forward (#12 hadSeq rule), else the IndexedDB mirror keeps the stale copy and reconcile restores it on reload.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { SAVE_KEY, save, saveSeqOf, rankCompare, markM4BuildOff, serialize, validate } from '../src/save/save';
import { pickNewest, reconcile } from '../src/save/idb-mirror';
import { m4On } from '../src/config/formulas';
import { initialState } from '../src/sim/state';
import { mem } from './helpers';
const st = (patch = {}) => ({ ...initialState(b, 1), ...patch });
const T0 = Date.UTC(2026, 9, 1), STALE_SEQ = 5;
describe('B1: saveSeq carries forward from an M4-build-off copy into flag-off saves', () => {
  it('M4-build-off save seq 5 -> flag-off save -> reload: the newest copy wins', () => {
    expect(m4On(b)).toBe(false);
    const offBuild = markM4BuildOff(structuredClone(b));
    const kv = mem();
    // M4 build, switch off: seed the previous copy at seq STALE_SEQ - 1 so this save writes STALE_SEQ.
    kv.setItem(SAVE_KEY, serialize(st({ coinsCents: 100 }), T0 - 1, STALE_SEQ - 1));
    const m4Raw = save(kv, st({ coinsCents: 100 }), T0, offBuild);
    expect(saveSeqOf(m4Raw)).toBe(STALE_SEQ);
    const idb = m4Raw; // mirror holds the M4-build-off copy
    // Flag-off build, newer session.
    const offRaw = save(kv, st({ coinsCents: 999 }), T0 + 60_000, b);
    expect(saveSeqOf(offRaw)).toBe(STALE_SEQ + 1);
    expect(rankCompare(idb, offRaw, T0 + 120_000)).toBeLessThan(0); // mirror would accept the newer copy
    // Reload: reconcile must keep the newer localStorage copy even if the mirror still holds the stale one.
    expect(pickNewest(kv.getItem(SAVE_KEY), idb, b, T0 + 120_000)).toBe('ls');
    expect(reconcile(kv, idb, b, T0 + 120_000)).toBe('ls');
    const v = validate(kv.getItem(SAVE_KEY)!, b); expect(v.ok && v.file.state.coinsCents).toBe(999);
  });
  it('flag-off save with no prior saveSeq keeps main bytes (no saveSeq)', () => {
    const kv = mem();
    expect(saveSeqOf(save(kv, st(), T0, b))).toBe(0);
    expect(save(kv, st(), T0 + 1, b)).not.toContain('saveSeq');
  });
});
