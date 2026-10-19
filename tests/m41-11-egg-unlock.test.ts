// @vitest-environment jsdom
// M41-11 (M4B-1): on migrated pre-M4 saves the locked Egg value row (text + aria) must name the REAL unlock Farm level,
// derived from the data (eggValueCap = min(maxLevel, F + balance.m4.eggValue.capOverFarm)), not F+1.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { trackLock } from '../src/sim/tracks';
import { trackUnlockFarm, trackLockText } from '../src/ui/tracks-ui';
import { Game } from '../src/game';
import { mem } from './helpers';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const migrated = (F: number, C: number) => migrateTracksV7({ ...initialState(on), farmLevel: F, collectionLevel: C }, on).state;
const COMBOS: [number, number][] = [[5, 15], [0, 10], [2, 20], [5, 5], [8, 25], [10, 30], [15, 30], [20, 30], [1, 1], [12, 0]];
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });

describe('M41-11 real unlock level for capped tracks', () => {
  it('F5/C15 migrated: Egg value is capped and unlocks at Farm L7 (not L6)', () => {
    const s = migrated(5, 15);
    expect(trackLock(s, 'eggValue', on)).toBe('cap');
    expect(trackUnlockFarm(s, 'eggValue', on)).toBe(7);
    expect(trackLockText(trackUnlockFarm(s, 'eggValue', on)!)).toBe('Needs Farm L7');
  });
  it.each(COMBOS)('F%i/C%i migrated: the named Farm level is exactly the first one that lifts the lock', (F, C) => {
    const s = migrated(F, C);
    for (const t of ['hens', 'eggValue'] as const) {
      if (trackLock(s, t, on) !== 'cap') continue;
      const need = trackUnlockFarm(s, t, on)!;
      expect(need).toBeGreaterThan(F);
      expect(trackLock({ ...s, farmLevel: need }, t, on), `${t} at F${need}`).toBeNull();
      if (need - 1 > F) expect(trackLock({ ...s, farmLevel: need - 1 }, t, on), `${t} at F${need - 1}`).toBe('cap');
    }
  });
  it('follows balance data: a different capOverFarm moves the unlock level (no constant)', () => {
    const s = migrated(5, 15), V = s.eggValueLevel;
    const cap5: Balance = { ...on, m4: { ...on.m4!, eggValue: { ...on.m4!.eggValue, capOverFarm: 5 } } };
    expect(trackUnlockFarm(s, 'eggValue', cap5)).toBe(Math.max(6, V - 5 + 1));
    expect(trackUnlockFarm(s, 'eggValue', on)).toBe(Math.max(6, V - on.m4!.eggValue.capOverFarm + 1));
  });
  it.each([[5, 15], [2, 20], [8, 25]])('rendered row F%i/C%i: lock text and aria name the real unlock level', async (F, C) => {
    const s = migrated(F, C); expect(trackLock(s, 'eggValue', on)).toBe('cap');
    const need = trackUnlockFarm(s, 'eggValue', on)!;
    const g = new Game(on, mem() as any, () => 1760000000000, 1, 'test');
    g.state = { ...g.state, ...s, tracksV7: 1 } as any;
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, on, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    document.getElementById('modal-layer')?.classList.remove('open');
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render();
    const lock = document.querySelector<HTMLElement>('.up.track[data-track=eggValue] .lock');
    expect(lock, 'locked Egg value row rendered').toBeTruthy();
    expect(lock!.textContent).toBe(`Needs Farm L${need}`);
    expect(lock!.getAttribute('aria-label')).toBe(`Egg value, level ${s.eggValueLevel}, locked. Needs Farm level ${need}.`);
    expect(need).not.toBe(F + 1); // these combos are the M4B-1 cases where F+1 was wrong
  });
});
