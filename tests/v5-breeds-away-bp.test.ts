/**
 * M5.1 breeds PR-B commit 3: offline_grant.away_bp (errata V-2b / PMC).
 * F3: away_bp = bp applied to the grant (pre-applyOffline). F5/BR-R18: emit only when gap >= offlineMinSeconds.
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { offlineGrantV5 } from '../src/telemetry/v5-fields';
import { Game } from '../src/game';
import { initialState, type GameState } from '../src/sim/state';
import { type BreedsSave } from '../src/sim/breeds';
import { awayBp } from '../src/sim/breeds-traits';
import { m4OfflineEggs } from '../src/sim/offline';
import { offlineMult } from '../src/sim/tracks';
import { mem } from './helpers';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});
const mkGame = (bal: typeof b, T0: number) => {
  const g = new Game(bal, mem(), () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
  const tracks: any[] = [];
  (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
  return { g, tracks };
};

describe('offlineGrantV5 / away_bp', () => {
  it('flag-off: absent; breeds-on: away_bp present (0 if none)', () => {
    expect(offlineGrantV5(b)).toEqual({});
    expect(offlineGrantV5(BR, 0)).toEqual({ away_bp: 0 });
    expect(offlineGrantV5(BR, 1500)).toEqual({ away_bp: 1500 });
  });

  it('[F5][BR-R18] gap 59.999 s: NO offline_grant (even with breeds on / Away slotted)', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 1));
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const eggs = (g as any).grantOffline(BR.offline.offlineMinSeconds * 1000 - 1); // 59_999 ms
    expect(eggs).toBe(0);
    expect(tracks.filter(t => t.type === 'offline_grant')).toEqual([]);
  });

  it('[F5][BR-R18][BR-R13] gap exactly 60.0 s, eggs=0: emits offline_grant with real away_bp', () => {
    // Force eggs=0 while still offline-eligible: zero Hens offline rate.
    const B0 = { ...BR, m4: { ...BR.m4!, offline: { ...BR.m4!.offline!, eggsPerSec: BR.m4!.offline!.eggsPerSec.map(() => 0) } } } as typeof b;
    const { g, tracks } = mkGame(B0, Date.UTC(2026, 10, 10, 2));
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const eggs = (g as any).grantOffline(BR.offline.offlineMinSeconds * 1000); // exactly 60_000
    expect(eggs).toBe(0);
    const og = tracks.find(t => t.type === 'offline_grant');
    expect(og).toBeTruthy();
    expect(og.fields.eggs).toBe(0);
    expect(og.fields.away_bp).toBe(1500); // Sussex 0★ Away BR-R13
  });

  it('[F5][BR-R18] gap >= 60 s with eggs>0 includes real away_bp', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 3));
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const eggs = (g as any).grantOffline(3600_000);
    expect(eggs).toBeGreaterThan(0);
    const og = tracks.find(t => t.type === 'offline_grant');
    expect(og.fields.away_bp).toBe(1500);
    expect(og.fields.eggs).toBe(eggs);
  });

  it('[F3] away_bp reported equals the bp applied (dupe Sussex hatch completes during absence)', () => {
    const { g, tracks } = mkGame(BR, Date.UTC(2026, 10, 10, 4));
    const s0 = st({
      owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0],
      incubator: { breed: 'sussex', remainingMs: 1000, costCents: 0 },
    });
    g.state = s0;
    const applied = awayBp(s0, BR);
    expect(applied).toBe(1500);
    const eggs = (g as any).grantOffline(3_600_000);
    const og = tracks.find(t => t.type === 'offline_grant');
    expect(og.fields.away_bp).toBe(applied);
    expect(eggs).toBe(m4OfflineEggs(3600, s0.hensLevel, BR, offlineMult(s0, BR), applied));
    // Post-grant bp rose (dupe hatch star-up); reported must stay at the applied value.
    expect(awayBp(g.state, BR)).toBeGreaterThan(applied);
    expect(og.fields.away_bp).not.toBe(awayBp(g.state, BR));
  });

  it('flag-off: no away_bp and no emit on eggs=0 (sub-60 or otherwise)', () => {
    const { g, tracks } = mkGame(b, Date.UTC(2026, 10, 10, 5));
    g.state = st({}, 12, 12);
    (g as any).grantOffline(BR.offline.offlineMinSeconds * 1000 - 1);
    expect(tracks.filter(t => t.type === 'offline_grant')).toEqual([]);
  });
});
