// GATE 4 final (PR #49): sanitizeLevel (7ab3d3d). Whole-number strings coerce; null/negative/NaN/junk -> invalid_state ->
// corrupt path restores .bak (no loss, no reset); missing .bak -> record what happens. M4 on (live), marked + unmarked saves.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game } from '../src/game';
import { SAVE_KEY, BAK_KEY, serialize, validate, CORRUPT_INDEX_KEY } from '../src/save/save';
import { initialState } from '../src/sim/state';
const mem = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as any; };
const T = Date.UTC(2026, 9, 19, 3); const out: any = {};
const good = { ...initialState(b, 1), coinsCents: 7_777_777, basket: 55, farmLevel: 18, collectionLevel: 12, hensLevel: 18, eggValueLevel: 11, tracksV7: 1 as const, v6BackupId: '00112233aabbccdd' };
const raw = (patch: any, t = T - 20_000) => serialize({ ...good, ...patch } as any, t, 5);
describe('sanitizeLevel', () => {
  for (const [k, v, want] of [['farmLevel', '12', 12], ['collectionLevel', '7', 7], ['hensLevel', '0', 0], ['eggValueLevel', '30', 30], ['farmLevel', 12.9, 12]] as const)
    it(`coerce ${k}=${JSON.stringify(v)} -> ${want}, no loss, re-save writes a number`, () => {
      const kv = mem({ [SAVE_KEY]: raw({ [k]: v }) }); const g = new Game(b, kv, () => T, 1, 'qa'); const s: any = g.state;
      expect(g.recovery).toBeNull(); expect(s[k]).toBe(want); expect(s.coinsCents).toBe(good.coinsCents); expect(s.v6BackupId).toBe(good.v6BackupId);
      g.save(); expect(JSON.parse(kv.getItem(SAVE_KEY)).state[k]).toBe(want);
    });
  for (const [k, v] of [['farmLevel', null], ['farmLevel', -1], ['hensLevel', 'NaN'], ['eggValueLevel', 'abc'], ['collectionLevel', '2.5'], ['farmLevel', ''], ['hensLevel', -3], ['farmLevel', true], ['eggValueLevel', '-1']] as const)
    it(`reject ${k}=${JSON.stringify(v)}: invalid_state; with .bak -> restored, no reset; corrupt copy kept`, () => {
      const bad = raw({ [k]: v }), bak = raw({}, T - 60_000); expect(validate(bad, b)).toMatchObject({ ok: false, reason: 'invalid_state' });
      const kv = mem({ [SAVE_KEY]: bad, [BAK_KEY]: bak }); const g = new Game(b, kv, () => T, 1, 'qa'); const s: any = g.state;
      out[`bak ${k}=${JSON.stringify(v)}`] = { recovery: g.recovery && { case: g.recovery.case, reason: g.recovery.reason, restored: g.recovery.restored_from_backup }, isNewGame: g.isNewGame, F: s.farmLevel, H: s.hensLevel, coins: s.coinsCents, corrupt: kv.getItem(CORRUPT_INDEX_KEY) };
      expect(g.isNewGame).toBe(false); expect(g.recovery).toMatchObject({ reason: 'invalid_state', restored_from_backup: true });
      expect([s.farmLevel, s.collectionLevel, s.hensLevel, s.eggValueLevel, s.coinsCents, s.v6BackupId]).toEqual([18, 12, 18, 11, good.coinsCents, good.v6BackupId]);
      expect(JSON.parse(kv.getItem(CORRUPT_INDEX_KEY) ?? '[]').length).toBeGreaterThan(0); // the bad main is preserved, never overwritten silently
    });
  it('reject with NO .bak: record outcome (graceful = no crash, bad bytes preserved, recovery surfaced)', () => {
    const bad = raw({ farmLevel: 'abc' }); const kv = mem({ [SAVE_KEY]: bad }); let err: unknown = null; let g: any = null;
    try { g = new Game(b, kv, () => T, 1, 'qa'); } catch (e) { err = String(e); }
    const idx = JSON.parse(kv.getItem(CORRUPT_INDEX_KEY) ?? '[]');
    out.noBak = { crash: err, isNewGame: g?.isNewGame, recovery: g?.recovery && { case: g.recovery.case, reason: g.recovery.reason, had_backup: g.recovery.had_backup, restored: g.recovery.restored_from_backup }, outcome: g?.recoveryOutcome, coins: g?.state.coinsCents, F: g?.state.farmLevel, corruptKeys: idx, corruptPreserved: idx.some((k: string) => kv.getItem(k) === bad) };
    expect(err).toBeNull(); expect(out.noBak.corruptPreserved).toBe(true); expect(g.recovery).not.toBeNull();
  });
  it('report', () => console.log('QA_SANITIZE ' + JSON.stringify(out)));
});
