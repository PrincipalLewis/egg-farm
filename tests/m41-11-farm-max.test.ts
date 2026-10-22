// @vitest-environment jsdom
// m4a-spec v1.24 §19 D-HOP-40 + §18 F4-19: the `Max for this farm` row (B1-7 bound, B1-9 row, B1-10 / F4-19 never a target).
// Test balances only (farm max != track max): the shipped config (maxLevel 30, no farmMaxLevel) never reaches this state.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import * as tracks from '../src/sim/tracks';
import { trackUnlockFarm, unlockFarmMax, trackFarmMaxed, highlightPick, TRACK_FARM_MAX_TEXT } from '../src/ui/tracks-ui';
import { options, bestBuy } from '../src/econ/best-buy';
import { candidates, selectGoal } from '../src/ui/next-goal';
import { DualPicker } from '../src/ui/pick-hysteresis';
import { Game } from '../src/game';
import { mem } from './helpers';

// Passthrough spy on the game's own lock rule: proves the label calls sim/tracks.ts trackLock and never looks past farm max.
vi.mock('../src/sim/tracks', async orig => { const m = await orig<typeof import('../src/sim/tracks')>(); return { ...m, trackLock: vi.fn(m.trackLock) }; });

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const withCap = (b: Balance, c: number) => ({ ...b, m4: { ...b.m4!, hens: { ...b.m4!.hens, capOverFarm: c }, eggValue: { ...b.m4!.eggValue, capOverFarm: c } } }) as Balance;
const b16b = withCap({ ...on, maxLevel: 55, farmMaxLevel: 50 } as Balance, 3);
/** Render-safe test balance on the shipped 30-level tables: farm max 20, offset 3 -> cap(20) = 23, so L23..29 is Max for this farm. */
const f20 = { ...on, farmMaxLevel: 20 } as Balance;
const st = (b: Balance, F: number, H: number, V: number, coins = 0) => ({ ...initialState(b), farmLevel: F, hensLevel: H, eggValueLevel: V, coinsCents: coins });

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });

describe('B1-7 bound (spy on the game lock rule)', () => {
  it.each(['hens', 'eggValue'] as const)('%s: the search calls sim trackLock only for F < F\' <= farm max', t => {
    const spy = vi.mocked(tracks.trackLock);
    for (const [F, L] of [[10, 52], [40, 53], [0, 54], [49, 54], [50, 53]] as const) {
      spy.mockClear();
      const s = st(b16b, F, t === 'hens' ? L : 0, t === 'eggValue' ? L : 0);
      const need = trackUnlockFarm(s, t, b16b);
      const seen = spy.mock.calls.map(c => c[0].farmLevel);
      expect(seen.length, `F${F}/L${L}: one call per F' in (F, 50]`).toBe(need === null ? 50 - F : need - F);
      for (const f of seen) { expect(f).toBeGreaterThan(F); expect(f).toBeLessThanOrEqual(unlockFarmMax(b16b)); }
      if (F === 50) expect(need, 'at farm max nothing is searched: Max for this farm').toBeNull();
    }
  });
});

describe('B1-10 / F4-19: best_roi, the ★ and the strip never target a Max-for-this-farm row', () => {
  it('grid over F0..20 and Egg value / Hens L23..29 on the farm-max-20 balance, broke and rich', () => {
    let n = 0;
    for (let F = 0; F <= 20; F++) for (let L = 23; L < 30; L++) for (const coins of [0, 1e13]) for (const t of ['hens', 'eggValue'] as const) {
      const s = st(f20, F, t === 'hens' ? L : Math.min(F + 3, 29) - 1, t === 'eggValue' ? L : Math.min(F + 3, 29) - 1, coins);
      expect(trackFarmMaxed(s, t, f20), `F${F}/${t}${L}`).toBe(true);
      const key = t === 'hens' ? 'HENS' : 'VALUE';
      expect(options(s, f20).map(o => o.key)).not.toContain(key);
      expect(candidates(s, f20).map(c => c.key)).not.toContain(key);
      expect(bestBuy(s, f20)?.key).not.toBe(key);
      expect(selectGoal(s, f20, 100).key).not.toBe(key);
      const p = new DualPicker().tick(s, f20, 0);
      expect(p.highlight?.key).not.toBe(key); expect(p.hint?.key).not.toBe(key);
      expect(highlightPick(s, f20)?.row).not.toBe(t);
      n++;
    }
    expect(n).toBe(21 * 7 * 2 * 2);
  });
  it('a save where the Max-for-this-farm row would be the cheapest buy: the pick is another row, never it', () => {
    // farm max 3, offset 3 -> cap(3) = 6: Egg value L6 at F0 can never be bought on this farm, and it is cheaper than Farm.
    const f3 = { ...on, farmMaxLevel: 3 } as Balance, s = st(f3, 0, 1, 6, 1e9);
    expect(trackFarmMaxed(s, 'eggValue', f3)).toBe(true);
    const valueCost = tracks.trackCost(6, 'eggValue', f3) * 100, offered = options(s, f3);
    expect(offered.some(o => o.key === 'FARM')).toBe(true);
    const cheapestOther = Math.min(...offered.map(o => Math.round(o.cost * 100)));
    expect(valueCost).toBeLessThan(cheapestOther * 100); // sanity: the row is not excluded for being expensive
    expect(bestBuy(s, f3)?.key).not.toBe('VALUE');
    expect(selectGoal(s, f3, 100).key).not.toBe('VALUE');
    expect(new DualPicker().tick(s, f3, 0).highlight?.key).not.toBe('VALUE');
  });
});

describe('B1-9 / B1-8 rendered Max-for-this-farm row', () => {
  const mount = async (b: Balance, patch: object) => {
    const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
    g.state = { ...g.state, ...patch, tracksV7: 1 } as any;
    const { mountApp } = await import('../src/ui/app');
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    document.getElementById('modal-layer')?.classList.remove('open');
    ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render();
    return { g, ui };
  };
  const check = (t: 'hens' | 'eggValue', L: number) => {
    const row = document.querySelector<HTMLElement>(`.up.track[data-track=${t}]`)!;
    expect(row, 'track row rendered').toBeTruthy();
    const pill = row.querySelector<HTMLElement>('.maxed.farm-max');
    expect(pill?.textContent).toBe(TRACK_FARM_MAX_TEXT);
    expect(row.querySelector('.lock'), 'no lock glyph (.lock::before)').toBeNull();
    expect(row.querySelector('button'), 'no Buy button').toBeNull();
    expect(row.querySelector('.affordable, .num, .eta')).toBeNull();
    expect(row.classList.contains('best')).toBe(false);
    const name = t === 'hens' ? 'Hens' : 'Egg value';
    expect(row.getAttribute('aria-label')).toBe(`${name}, level ${L}. Max for this farm.`);
    expect(row.getAttribute('role')).toBe('group');
    expect(row.textContent).not.toMatch(/Needs Farm/);
  };
  it.each(['hens', 'eggValue'] as const)('%s L25 at F15 (farm max 20): muted MAX pill, no glyph/button/cost; buying Farm up to farm max never turns it into a Buy row', async t => {
    const L = 25, other = t === 'hens' ? 'eggValueLevel' : 'hensLevel', lv = t === 'hens' ? 'hensLevel' : 'eggValueLevel';
    const { g, ui } = await mount(f20, { farmLevel: 15, [lv]: L, [other]: 10, coinsCents: 1e13 });
    check(t, L);
    for (let F = 16; F <= unlockFarmMax(f20); F++) { g.state = { ...g.state, farmLevel: F } as any; ui.render(); check(t, L); }
  });
  it('a normal capped row next to it keeps the lock label (B1-1 unchanged)', async () => {
    await mount(f20, { farmLevel: 15, eggValueLevel: 25, hensLevel: 18, coinsCents: 0 });
    const lock = document.querySelector<HTMLElement>('.up.track[data-track=hens] .lock');
    expect(lock?.textContent).toBe('Needs Farm L16');
    expect(lock?.getAttribute('aria-label')).toBe('Hens, level 18, locked. Needs Farm level 16.');
  });
});
