// QA (#25 x #31 forward merge): save() while hidden must persist the hide-time snapshot, stamped at the hide, on every
// write path #31 adds: saveWithQuotaRetry (plain and N2 quota-retry) and the IndexedDB mirror fallback. Never the live state.
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { Game, tracksOff } from '../src/game';
import { SAVE_KEY, V6_BACKUP_KEY, encodeBackup } from '../src/save/save';
import { mem } from './helpers';
const T0 = Date.UTC(2026, 9, 17, 8), HIDE = T0 + 5_000, SAVE_AT = HIDE + 30_000;
function setup(mirror: any = null, bal = b) {
  const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
  let t = T0; const g = new Game(bal, kv, () => t, 7, 'dev', mirror);
  g.state = { ...g.state, farmLevel: 15, coop: 51, coinsCents: 12_345 };
  g.save(); t = HIDE; g.onHidden(HIDE);
  // live state moves on while hidden (provisional sim / any mutation): must never reach storage
  g.state = { ...g.state, coinsCents: 99_999, basket: 777 };
  t = SAVE_AT;
  return { kv, g };
}
const body = (raw: string) => JSON.parse(raw) as { savedAt: number; state: { coinsCents: number; basket: number } };
const isSnapshot = (raw: string) => { const p = body(raw); expect(p.savedAt).toBe(HIDE); expect(p.state.coinsCents).toBe(12_345); expect(p.state.basket).not.toBe(777); };
const mirrorSpy = () => { const w: string[] = []; return { w, m: { write: (r: string) => { w.push(r); } } }; };

describe('save() while hidden persists the hide snapshot on every path', () => {
  it('saveWithQuotaRetry, first try: localStorage + mirror get the snapshot stamped at the hide', () => {
    const { w, m } = mirrorSpy(); const { kv, g } = setup(m); w.length = 0;
    g.save();
    isSnapshot(kv.getItem(SAVE_KEY)); expect(w).toHaveLength(1); isSnapshot(w[0]); expect(g.storageFailed).toBe(false);
  });
  it('saveWithQuotaRetry, N2 quota retry (own aborted v6 record removed, then retried): retry writes the snapshot', () => {
    // N2 only exists on an unmigrated v6 session after an aborted tracks migration (M4 runs under flag-off rules); with M4 on a
    // fresh farm is committed v7 at creation (M4-22), where N2 must refuse, so run this path on the aborted-session balance.
    const { w, m } = mirrorSpy(); const { kv, g } = setup(m, tracksOff(b)); w.length = 0;
    const ID = 'a1b2c3d4e5f60718'; (g as any).abortedMigrationId = ID; kv.setItem(V6_BACKUP_KEY, encodeBackup({ migrationId: ID, raw: 'old' }));
    const set = kv.setItem.bind(kv); let throws = 0;
    kv.setItem = (k: string, v: string) => { if (k === SAVE_KEY && kv.m.has(V6_BACKUP_KEY)) { throws++; throw new DOMException('full', 'QuotaExceededError'); } set(k, v); };
    g.save();
    expect(throws).toBe(1); expect(kv.getItem(V6_BACKUP_KEY)).toBeNull(); // the retry path really ran
    isSnapshot(kv.getItem(SAVE_KEY)); expect(w).toHaveLength(1); isSnapshot(w[0]); expect(g.storageFailed).toBe(false);
  });
  it('mirror fallback (localStorage write fails): the IndexedDB copy is the snapshot, not the live state', () => {
    const { w, m } = mirrorSpy(); const { kv, g } = setup(m); w.length = 0; const before = kv.getItem(SAVE_KEY);
    const set = kv.setItem.bind(kv); kv.setItem = (k: string, v: string) => { if (k.startsWith(SAVE_KEY)) throw new DOMException('blocked', 'SecurityError'); set(k, v); };
    g.save();
    expect(g.storageFailed).toBe(true); expect(kv.getItem(SAVE_KEY)).toBe(before);
    expect(w).toHaveLength(1); isSnapshot(w[0]);
  });
  it('control: after show, save() writes the live state at the current time', () => {
    const { kv, g } = setup(); g.onShown(SAVE_AT); g.save();
    expect(body(kv.getItem(SAVE_KEY)).savedAt).toBe(SAVE_AT);
  });
});
