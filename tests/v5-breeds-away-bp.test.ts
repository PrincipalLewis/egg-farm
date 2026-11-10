/**
 * M5.1 breeds PR-B commit 3: offline_grant.away_bp (errata V-2b / PMC: always when breeds on, incl. eggs=0).
 */
import { describe, it, expect } from 'vitest';
import { balance as b } from '../src/config/balance';
import { offlineGrantV5 } from '../src/telemetry/v5-fields';
import { Game } from '../src/game';
import { initialState, type GameState } from '../src/sim/state';
import { type BreedsSave } from '../src/sim/breeds';
import { mem } from './helpers';
import { SAVE_KEY, serialize } from '../src/save/save';

const BR = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, breeds: 1 } } } as typeof b;
const fresh = (o: Partial<BreedsSave> = {}): BreedsSave => ({
  owned: {}, slots: [null, null, null], incubator: null, settleMs: [0, 0, 0],
  hatches: 0, pity: 0, rng: 0x9e3779b9, freeHatchUsed: 0, flockCompleteLogged: 0, ...o,
});
const st = (o: Partial<BreedsSave> = {}, F = 12, H = 12): GameState => ({
  ...initialState(b, 7), farmLevel: F, hensLevel: H, tracksV7: 1 as const, v6BackupId: '0123456789abcdef', breeds: fresh(o),
});

describe('offlineGrantV5 / away_bp', () => {
  it('flag-off: absent; breeds-on: away_bp present (0 if none)', () => {
    expect(offlineGrantV5(b)).toEqual({});
    expect(offlineGrantV5(BR, 0)).toEqual({ away_bp: 0 });
    expect(offlineGrantV5(BR, 1500)).toEqual({ away_bp: 1500 });
  });

  it('grantOffline emits away_bp when breeds on even if eggs=0', () => {
    const kv = mem();
    const T0 = Date.UTC(2026, 10, 10, 1);
    // Save with Sussex, then reload after a short gap that yields 0 eggs (< offlineMin) — still call grantOffline via constructor path only for >= min.
    // Use a gap that is >= offlineMin but craft hens so... easier: spy grantOffline via Game with applyOffline eggs=0 by gap just under producing eggs? 
    // offlineMinSeconds is typically 60; eggs can be 0 if rate*away floors to 0 at low levels — use gap = offlineMinSeconds exactly at H=0 may still grant.
    // Direct: construct Game, replace telemetry, call private grantOffline via any cast with state that has Away and a tiny away that still passes min.
    const g = new Game(BR, kv, () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const tracks: any[] = [];
    (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
    // Force eggs=0 path: call grantOffline with gap below offlineMinSeconds → eggs 0, but breeds on → still emit
    const eggs = (g as any).grantOffline(BR.offline.offlineMinSeconds * 1000 - 1);
    expect(eggs).toBe(0);
    const og = tracks.find(t => t.type === 'offline_grant');
    expect(og).toBeTruthy();
    expect(og.fields.eggs).toBe(0);
    expect(og.fields.away_bp).toBe(1500);
  });

  it('grantOffline with eggs>0 includes real away_bp', () => {
    const kv = mem();
    const T0 = Date.UTC(2026, 10, 10, 2);
    const g = new Game(BR, kv, () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st({ owned: { sussex: { stars: 0 } }, slots: ['sussex', null, null], settleMs: [0, 0, 0] }, 12, 12);
    const tracks: any[] = [];
    (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
    const eggs = (g as any).grantOffline(3600_000);
    expect(eggs).toBeGreaterThan(0);
    const og = tracks.find(t => t.type === 'offline_grant');
    expect(og.fields.away_bp).toBe(1500);
    expect(og.fields.eggs).toBe(eggs);
  });

  it('flag-off: no away_bp and no emit on eggs=0', () => {
    const kv = mem();
    const T0 = Date.UTC(2026, 10, 10, 3);
    const g = new Game(b, kv, () => T0, 7, 'dev', null, null, { newId: () => '0123456789abcdef' });
    g.state = st({}, 12, 12);
    const tracks: any[] = [];
    (g as any).telemetry.track = (type: string, fields?: object) => { tracks.push({ type, fields }); };
    (g as any).grantOffline(BR.offline.offlineMinSeconds * 1000 - 1);
    expect(tracks.filter(t => t.type === 'offline_grant')).toEqual([]);
  });
});
