// M4A-29..33 (l30plus-saves 'v6->v7 migration marker'): the v6->v7 step is the persisted tracksV7 marker (SAVE_VERSION
// stays 6). It applies once; a marked save reloads unchanged; flag-off/rollback builds keep marker, tracks and unknown
// fields (e.g. seenTracksExplainer); a version-7 file is refused. Level tolerance (M2): fixture 732e70e and an L31+ save
// load on a 30-cap build, effective level capped, stored level kept through save/reload.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance as live, type Balance } from '../src/config/balance';
import { validate, save, serialize, SAVE_KEY, SAVE_VERSION } from '../src/save/save';
import { Game } from '../src/game';
import { initialState } from '../src/sim/state';
import { prodEggsPerSec, salePriceCents } from '../src/sim/tracks';
import { mem } from './helpers';
const raw = readFileSync(new URL('./fixtures/saves/m4-pre-v7-F30-C30.json', import.meta.url), 'utf8');
const on = { ...live, m4: { ...live.m4!, enabled: 1 } } as Balance;
const off = { ...live, m4: { ...live.m4!, enabled: 0 } } as Balance;
const cap30 = (e: 0 | 1) => ({ ...live, maxLevel: 30, m4: { ...live.m4!, enabled: e } }) as Balance;
const T = Date.UTC(2026, 9, 19, 3);

describe('v6->v7 marker (tracksV7) runs once', () => {
  it('migrates once; a marked reload is not re-migrated; save/reload is idempotent', () => {
    expect(SAVE_VERSION).toBe(6);
    const a = validate(raw, on); expect(a.ok).toBe(true); if (!a.ok) return;
    expect(a.file.tracksMigrated).toBe(true); expect(a.file.state.tracksV7).toBe(1);
    const st = { ...a.file.state, v6BackupId: 'mig-1', seenTracksExplainer: true } as any;
    const kv = mem(); expect(JSON.parse(save(kv, st, T, on)).version).toBe(6);
    const b = validate(kv.getItem(SAVE_KEY)!, on); expect(b.ok).toBe(true); if (!b.ok) return;
    expect(b.file.tracksMigrated).toBeUndefined();
    expect([b.file.state.hensLevel, b.file.state.eggValueLevel]).toEqual([st.hensLevel, st.eggValueLevel]);
    expect((b.file.state as any).seenTracksExplainer).toBe(true);
    const c = validate(save(kv, b.file.state, T + 1000, on), on); expect(c.ok).toBe(true); if (!c.ok) return;
    expect(c.file.tracksMigrated).toBeFalsy(); expect(c.file.state).toEqual(b.file.state);
  });
  it('flag-off build loads a marked save and keeps marker, tracks and unknown fields on re-save', () => {
    const a = validate(raw, on); if (!a.ok) throw new Error('fixture');
    const kv = mem(); save(kv, { ...a.file.state, v6BackupId: 'mig-1', seenTracksExplainer: true } as any, T, on);
    const b = validate(kv.getItem(SAVE_KEY)!, off); expect(b.ok).toBe(true); if (!b.ok) return;
    const r = JSON.parse(save(mem(), b.file.state, T, off)).state;
    expect(r.tracksV7).toBe(1); expect(r.hensLevel).toBe(a.file.state.hensLevel); expect(r.seenTracksExplainer).toBe(true);
  });
  it('a version-7 file is refused by this build (reason: version)', () => {
    const d = JSON.parse(raw); d.version = 7; delete d.sum; const v = validate(JSON.stringify(d), on);
    expect(v.ok).toBe(false); if (!v.ok) expect(v.reason).toBe('version');
  });
});

describe('level tolerance on a pre-M4 (30-cap) build', () => {
  for (const e of [0, 1] as const) it(`M4 ${e ? 'on' : 'off'}: fixture 732e70e loads with no corrupt rejection`, () => {
    const kv = mem(); kv.setItem(SAVE_KEY, raw); const g = new Game(cap30(e), kv, () => T + 3_600_000, 1);
    expect(g.isNewGame).toBe(false); expect(g.recovery).toBeFalsy(); expect(g.state.farmLevel).toBe(30); expect(g.state.collectionLevel).toBe(30);
  });
  it('marked L31+ save F35 H35 V40 C35: loads, effective level capped, stored levels kept through save/reload', () => {
    const b = cap30(1);
    const st = { ...initialState(b, 1), farmLevel: 35, collectionLevel: 35, hensLevel: 35, eggValueLevel: 40, tracksV7: 1 as const, v6BackupId: '0123456789abcdef' };
    const kv = mem(); kv.setItem(SAVE_KEY, serialize(st, T)); expect(validate(kv.getItem(SAVE_KEY)!, b).ok).toBe(true);
    const g = new Game(b, kv, () => T + 3_600_000, 1); expect(g.recovery).toBeFalsy();
    const at30 = { ...g.state, farmLevel: 30, collectionLevel: 30, hensLevel: 30, eggValueLevel: 30 };
    expect(prodEggsPerSec(g.state, b)).toBe(prodEggsPerSec(at30, b)); expect(salePriceCents(g.state, b)).toBe(salePriceCents(at30, b));
    g.save(); const s = JSON.parse(kv.getItem(SAVE_KEY)!).state;
    expect([s.farmLevel, s.collectionLevel, s.hensLevel, s.eggValueLevel, s.tracksV7]).toEqual([35, 35, 35, 40, 1]);
    const g2 = new Game(b, kv, () => T + 7_200_000, 1);
    expect([g2.state.farmLevel, g2.state.hensLevel, g2.state.eggValueLevel]).toEqual([35, 35, 40]);
  });
});
