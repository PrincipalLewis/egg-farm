// @vitest-environment jsdom
// M41-11 (M4B-1): on migrated pre-M4 saves the locked Egg value row (text + aria) must name the REAL unlock Farm level,
// derived from the data (eggValueCap = min(maxLevel, F + balance.m4.eggValue.capOverFarm)), not F+1.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { trackLock } from '../src/sim/tracks';
import { trackUnlockFarm, trackLockText, unlockFarmMax } from '../src/ui/tracks-ui';
import { hensCap, eggValueCap } from '../src/config/formulas';
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

// D-HOP-32 (m4a-spec §19 / OQ-B1-1): the search runs to the FARM max level from balance and falls back to farmMax, never F+1.
const capOf = (t: 'hens' | 'eggValue') => t === 'hens' ? hensCap : eggValueCap;
const at = (b: Balance, F: number, t: 'hens' | 'eggValue', L: number) =>
  ({ ...initialState(b), farmLevel: F, hensLevel: t === 'hens' ? L : 0, eggValueLevel: t === 'eggValue' ? L : 0 });
describe('M41-11 / D-HOP-32: unlock search bounded by the farm max level, fallback farmMax', () => {
  // L30+ shape: farm max 50 (balance.farmMaxLevel, CSV farm_max_level) differs from the track max 55 (balance.maxLevel).
  const l30 = { ...on, maxLevel: 55, farmMaxLevel: 50 } as Balance;
  it('current config (30): farm max = maxLevel = 30 when balance has no farmMaxLevel', () => {
    expect((on as { farmMaxLevel?: number }).farmMaxLevel).toBeUndefined();
    expect(unlockFarmMax(on)).toBe(on.maxLevel);
    expect(on.maxLevel).toBe(30);
  });
  it('L30+ config: farm max is read from balance (50), not the track max (55)', () => {
    expect(unlockFarmMax(l30)).toBe(50);
    expect(l30.maxLevel).toBe(55);
  });
  it.each(['hens', 'eggValue'] as const)('current config (30), %s: B1-1 F10 at cap -> L11; B1-4 F26 at L29 -> L27; L30 = MAX', t => {
    const c = on.m4![t].capOverFarm;
    expect(trackLock(at(on, 10, t, 10 + c), t, on)).toBe('cap');
    expect(trackUnlockFarm(at(on, 10, t, 10 + c), t, on)).toBe(11);
    expect(trackLock(at(on, 26, t, 29), t, on)).toBe('cap');
    expect(trackUnlockFarm(at(on, 26, t, 29), t, on)).toBe(27);
    expect(trackLock(at(on, 29, t, on.maxLevel), t, on)).toBe('max');
  });
  it.each(['hens', 'eggValue'] as const)('B1-6 current config (30), %s: a qualifying Farm level always exists (fallback never reached)', t => {
    const farmMax = unlockFarmMax(on);
    for (let F = 0; F < on.maxLevel; F++) for (let L = capOf(t)(F, on); L < on.maxLevel; L++) {
      const s = at(on, F, t, L); expect(trackLock(s, t, on)).toBe('cap');
      const need = trackUnlockFarm(s, t, on);
      expect(need, `F${F}/L${L}`).toBeGreaterThan(F);
      expect(need, `F${F}/L${L}`).toBeLessThanOrEqual(farmMax);
      expect(capOf(t)(need, on), `F${F}/L${L} cap at F${need}`).toBeGreaterThan(L);
    }
  });
  it.each(['hens', 'eggValue'] as const)('L30+ (farm max 50, track max 55), %s: in-range unlocks are still the first lifting level', t => {
    const c = l30.m4![t].capOverFarm;
    expect(trackUnlockFarm(at(l30, 10, t, 10 + c), t, l30)).toBe(11);
    expect(trackUnlockFarm(at(l30, 46, t, 46 + c), t, l30)).toBe(47);
    // the last Farm level that can lift the lock is farm max itself: cap(50) = 50 + c > 50 + c - 1
    expect(trackUnlockFarm(at(l30, 40, t, 50 + c - 1), t, l30)).toBe(50);
  });
  it.each(['hens', 'eggValue'] as const)('L30+, %s: a track above cap(farmMax-1) that no Farm level <= 50 can unlock shows L{farmMax} (not F+1, not 51..55)', t => {
    const c = l30.m4![t].capOverFarm, farmMax = unlockFarmMax(l30);
    for (let L = Math.max(capOf(t)(farmMax, l30), capOf(t)(farmMax - 1, l30) + 1); L < l30.maxLevel; L++) for (const F of [40, farmMax - 1]) {
      const s = at(l30, F, t, L);
      expect(trackLock(s, t, l30), `F${F}/L${L}`).toBe('cap');
      expect(capOf(t)(farmMax, l30), 'no Farm level within range lifts it').toBeLessThanOrEqual(L);
      expect(trackUnlockFarm(s, t, l30), `F${F}/L${L}`).toBe(farmMax);
      expect(trackLockText(trackUnlockFarm(s, t, l30))).toBe(`Needs Farm L${farmMax}`);
    }
    expect(c).toBeGreaterThan(0);
  });
  it.each(['hens', 'eggValue'] as const)('L30+, %s: a track at its max (55) is MAX, never a lock label', t => {
    expect(trackLock(at(l30, 50, t, l30.maxLevel), t, l30)).toBe('max');
    expect(trackLock(at(l30, 40, t, l30.maxLevel), t, l30)).toBe('max');
  });
});

