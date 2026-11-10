// spec v1.14 M4A-4: with M4 on, the offline grant reads the rate and the 2h cap from economy.csv (balance.m4.offline via sync-economy).
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { applyOffline, m4OfflineEggs, offlineEggs } from '../src/sim/offline';
import { initialState } from '../src/sim/state';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
/** Explicit forced-flag-off build (M4 ships ON since D-CEO-20261019-01 / rc 90a9c84). */
const off: Balance = { ...balance, m4: { ...balance.m4!, enabled: 0 } };
const st = (H: number, F = 0) => ({ ...initialState(on), farmLevel: F, hensLevel: H, collectionLevel: 0 });
describe('M4A-4 offline grant from data', () => {
  it('table mirrors economy.csv L0 (0.38 eggs/s, 2700 max)', () => { expect(on.m4!.offline!.eggsPerSec[0]).toBe(0.38); expect(on.m4!.offline!.maxEggs2h[0]).toBe(2700); });
  it('H0, 1h away => 1,368 (floor(3600 x 0.38)), not 1,350 (unrounded 0.375 x eps)', () => {
    expect(applyOffline(st(0), 3600_000, on).eggs).toBe(1368); expect(m4OfflineEggs(3600, 0, on)).toBe(1368);
  });
  it('L0 2h cap: 2h (and 5h) away => 2,700 from offline_max_eggs_2h', () => {
    expect(applyOffline(st(0), 7200_000, on).eggs).toBe(2700); expect(applyOffline(st(0), 5 * 3600_000, on).eggs).toBe(2700);
  });
  it('< offlineMinSeconds => 0; flag off unchanged (AC11 formula)', () => {
    expect(applyOffline(st(0), 59_000, on).eggs).toBe(0);
    expect(applyOffline({ ...st(0), farmLevel: 0 }, 3600_000, off).eggs).toBe(offlineEggs(3600, 0, off));
  });
  it('the row read is the Hens level (H1 => CSV L1 0.5/s, 3600 cap)', () => { expect(m4OfflineEggs(3600, 1, on)).toBe(1800); expect(m4OfflineEggs(7200, 1, on)).toBe(3600); });
});
import { Game } from '../src/game';
import { serialize, SAVE_KEY } from '../src/save/save';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
describe('M4A-4 post-migration boot grant (one function, HoE 23:10)', () => {
  const T0 = 1760000000000;
  const kv = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } }; };
  it('a committed (migrated) H0 farm away 1h gets the CSV grant 1,368 at boot; 2h+ gets the CSV cap 2,700', () => {
    for (const [away, want] of [[3600_000, 1368], [3 * 3600_000, 2700]] as const) {
      const s = { ...migrateTracksV7({ ...initialState(on), farmLevel: 0, collectionLevel: 0 }, on).state, tracksV7: 1 as const, v6BackupId: 'a1b2c3d4e5f60718' };
      const k = kv(); k.setItem(SAVE_KEY, serialize(s, T0 - away));
      const g = new Game(on, k as any, () => T0, undefined, 'dev', null, null, { idbBoot: 'ok' });
      expect(g.tracksMigrationPending).toBe(false); expect(g.state.hensLevel).toBe(0);
      expect(g.offline?.eggs).toBe(want); expect(g.offline?.eggs).toBe(m4OfflineEggs(away / 1000, 0, on));
    }
  });
});
