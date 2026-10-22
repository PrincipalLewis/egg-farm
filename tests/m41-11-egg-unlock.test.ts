// @vitest-environment jsdom
// M41-11 (M4B-1): on migrated pre-M4 saves the locked Egg value row (text + aria) must name the REAL unlock Farm level,
// derived from the data (eggValueCap = min(maxLevel, F + balance.m4.eggValue.capOverFarm)), not F+1.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { migrateTracksV7 } from '../src/sim/migrate-v7';
import { trackLock } from '../src/sim/tracks';
import { trackUnlockFarm, trackLockText, unlockFarmMax, trackFarmMaxed, TRACK_FARM_MAX_TEXT, trackFarmMaxAria } from '../src/ui/tracks-ui';
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

// m4a-spec v1.24 §19 (D-HOP-32 bound + D-HOP-40 `Max for this farm`): N = the first F' in (F, farmMax] at which the game's
// own trackLock (sim/tracks.ts) allows the buy; no qualifying F' -> null = `Max for this farm`, never F+1, never farmMax.
const capOf = (t: 'hens' | 'eggValue') => t === 'hens' ? hensCap : eggValueCap;
const at = (b: Balance, F: number, t: 'hens' | 'eggValue', L: number) =>
  ({ ...initialState(b), farmLevel: F, hensLevel: t === 'hens' ? L : 0, eggValueLevel: t === 'eggValue' ? L : 0 });
/** Brute force from the game rule alone: smallest F' in (F, farmMax] where trackLock lets the real buy happen, else null. */
const firstAllowed = (s: ReturnType<typeof at>, t: 'hens' | 'eggValue', b: Balance) => {
  for (let f = s.farmLevel + 1; f <= unlockFarmMax(b); f++) if (trackLock({ ...s, farmLevel: f }, t, b) === null) return f;
  return null;
};
/** Test balances with farm max != track max (L30+ shape). Not shipped data (shipped: maxLevel 30, no farmMaxLevel). */
const withCap = (b: Balance, c: number) => ({ ...b, m4: { ...b.m4!, hens: { ...b.m4!.hens, capOverFarm: c }, eggValue: { ...b.m4!.eggValue, capOverFarm: c } } }) as Balance;
const b16 = withCap({ ...on, maxLevel: 55, farmMaxLevel: 50 } as Balance, 4);  // B1-6: cap(F') = min(55, F'+4)
const b16b = withCap({ ...on, maxLevel: 55, farmMaxLevel: 50 } as Balance, 3); // B1-6b: offset-3 test balance
describe('M41-11 §19: unlock search bounded by the farm max level; no qualifier = Max for this farm', () => {
  it('shipped config (30): farm max = maxLevel = 30 when balance has no farmMaxLevel', () => {
    expect((on as { farmMaxLevel?: number }).farmMaxLevel).toBeUndefined();
    expect(unlockFarmMax(on)).toBe(on.maxLevel);
    expect(on.maxLevel).toBe(30);
  });
  it('test balance: farm max is read from balance (50), not the track max (55)', () => {
    expect(unlockFarmMax(b16b)).toBe(50);
    expect(b16b.maxLevel).toBe(55);
  });
  it.each(['hens', 'eggValue'] as const)('B1-1 / B1-4 shipped config, %s: F10 at cap -> L11; F26 at L29 -> L27; L30 = MAX', t => {
    const c = on.m4![t].capOverFarm;
    expect(trackLock(at(on, 10, t, 10 + c), t, on)).toBe('cap');
    expect(trackUnlockFarm(at(on, 10, t, 10 + c), t, on)).toBe(11);
    expect(trackLockText(trackUnlockFarm(at(on, 10, t, 10 + c), t, on)!)).toBe('Needs Farm L11');
    expect(trackLock(at(on, 26, t, 29), t, on)).toBe('cap');
    expect(trackUnlockFarm(at(on, 26, t, 29), t, on)).toBe(27);
    expect(trackLock(at(on, 29, t, on.maxLevel), t, on)).toBe('max');
  });
  it.each(['hens', 'eggValue'] as const)('shipped config property, %s: every capped F/L names the first Farm level the game allows; Max for this farm never appears', t => {
    let n = 0;
    for (let F = 0; F < on.maxLevel; F++) for (let L = capOf(t)(F, on); L < on.maxLevel; L++) {
      const s = at(on, F, t, L); expect(trackLock(s, t, on)).toBe('cap');
      const need = trackUnlockFarm(s, t, on);
      expect(need, `F${F}/L${L}`).toBe(firstAllowed(s, t, on));
      expect(need, `F${F}/L${L}`).not.toBeNull();
      expect(trackLock({ ...s, farmLevel: need! }, t, on), `F${F}/L${L} at F${need}`).toBeNull();
      if (need! - 1 > F) expect(trackLock({ ...s, farmLevel: need! - 1 }, t, on)).toBe('cap');
      n++;
    }
    expect(n).toBeGreaterThan(50);
  });
  it.each(['hens', 'eggValue'] as const)('B1-5 data-driven, %s: N follows the balance offset (offset 5: F10/L15 -> L11, F10/L17 -> L13)', t => {
    const b5 = withCap(on, 5);
    expect(trackUnlockFarm(at(b5, 10, t, 15), t, b5)).toBe(11);
    expect(trackUnlockFarm(at(b5, 10, t, 17), t, b5)).toBe(13);
  });
  it.each(['hens', 'eggValue'] as const)('B1-6 balance (cap = min(55, F+4), farm max 50), %s: L53 below F50 -> Needs Farm L50; L54 -> Max for this farm at any F; L55 MAX', t => {
    expect(capOf(t)(49, b16)).toBe(53); expect(capOf(t)(50, b16)).toBe(54);
    for (let F = 0; F < 50; F++) {
      const s = at(b16, F, t, 53); expect(trackLock(s, t, b16)).toBe('cap');
      expect(trackUnlockFarm(s, t, b16), `F${F}/L53`).toBe(50);
    }
    for (let F = 0; F <= 50; F++) {
      const s = at(b16, F, t, 54); expect(trackLock(s, t, b16)).toBe('cap');
      expect(trackUnlockFarm(s, t, b16), `F${F}/L54`).toBeNull();
      expect(trackFarmMaxed(s, t, b16)).toBe(true);
      expect(trackLock(at(b16, F, t, 55), t, b16)).toBe('max');
    }
  });
  it.each(['hens', 'eggValue'] as const)('B1-6b offset-3 test balance, %s: L52 below F50 -> Needs Farm L50; L53/L54 -> Max for this farm (incl. F50); L55 MAX', t => {
    expect(capOf(t)(50, b16b)).toBe(53);
    for (let F = 0; F < 50; F++) {
      const s = at(b16b, F, t, 52); expect(trackLock(s, t, b16b)).toBe('cap');
      expect(trackUnlockFarm(s, t, b16b), `F${F}/L52`).toBe(50);
      expect(trackLockText(trackUnlockFarm(s, t, b16b)!)).toBe('Needs Farm L50');
    }
    for (let F = 0; F <= 50; F++) for (const L of [53, 54]) {
      const s = at(b16b, F, t, L); expect(trackLock(s, t, b16b), `F${F}/L${L}`).toBe('cap');
      expect(trackUnlockFarm(s, t, b16b), `F${F}/L${L}`).toBeNull();
      expect(trackFarmMaxed(s, t, b16b)).toBe(true);
    }
    expect(trackLock(at(b16b, 50, t, 55), t, b16b)).toBe('max');
    expect(trackFarmMaxed(at(b16b, 50, t, 55), t, b16b)).toBe(false);
  });
  it.each(['hens', 'eggValue'] as const)('B1-7 property on both test balances, %s: N == first F the game allows, never > farm max, never F+1 unless F+1 is that level', t => {
    for (const b of [b16, b16b]) for (let F = 0; F <= 50; F++) for (let L = capOf(t)(F, b); L < b.maxLevel; L++) {
      const s = at(b, F, t, L), need = trackUnlockFarm(s, t, b);
      expect(need, `F${F}/L${L}`).toBe(firstAllowed(s, t, b));
      if (need !== null) { expect(need).toBeGreaterThan(F); expect(need).toBeLessThanOrEqual(unlockFarmMax(b)); }
    }
  });
  it('copy: Max for this farm text and aria (§19)', () => {
    expect(TRACK_FARM_MAX_TEXT).toBe('Max for this farm');
    expect(trackFarmMaxAria('Egg value', 53)).toBe('Egg value, level 53. Max for this farm.');
    expect(trackFarmMaxAria('Hens', 54)).toBe('Hens, level 54. Max for this farm.');
  });
});
