// @vitest-environment jsdom
// M41-8 F3 = UX-M4 ★ Best buy chip (art-ux/m4.1-ui-minors.md) + F4-13 (strip ★ and row chip from one source) + F4 markup.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { DualPicker } from '../src/ui/pick-hysteresis';
import { bestBuyMark } from '../src/ui/goal-label';
import { trackLock } from '../src/sim/tracks';
import { Game } from '../src/game';
import { mem } from './helpers';

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });
const TAB = { HENS: 'farm', VALUE: 'farm', FARM: 'farm', COLL: 'collection' } as const;
type K = keyof typeof TAB;
/** First grid state (shipped data, rich) whose shared best_roi pick is `key`. */
function stateFor(key: K) {
  for (let F = 1; F < 28; F++) for (const dH of [-3, 0, 2, 3]) for (const dV of [-3, 0, 2, 3]) for (const dC of [-6, -3, 0, 3]) {
    const s = { ...initialState(on, 1), farmLevel: F, hensLevel: Math.max(0, F + dH), eggValueLevel: Math.max(0, F + dV), collectionLevel: Math.max(0, Math.min(29, F + dC)), coinsCents: 1e13, tracksV7: 1 as const };
    const h = new DualPicker().tick(s, on, 0).hint; if (h?.key === key && h.affordable) return s;
  }
  throw new Error(`no grid state picks ${key}`);
}
async function mount(state: object, tab: string) {
  const g = new Game(on, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, ...state } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, on, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('upgrades'); (document.querySelector(`[data-tab=${tab}]`) as HTMLElement).click(); ui.render(); ui.render();
  return { g, ui };
}
const strip = () => document.querySelector<HTMLElement>('#goal .goal-label')!;
const goalAriaText = () => document.querySelector<HTMLElement>('#goal')!.getAttribute('aria-label')!;

describe('UX-M4 chip and the strip ★ agree (F4-13)', () => {
  it.each(['HENS', 'VALUE', 'COLL', 'FARM'] as const)('pick %s: chip on exactly that row; strip ★ (if its template has one) on the same target', async key => {
    const s = stateFor(key);
    expect(bestBuyMark(new DualPicker().tick(s, on, 0).hint)).toBe(key);
    await mount(s, TAB[key]);
    const chips = document.querySelectorAll<HTMLElement>('.best-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].dataset.bestBuy).toBe(key);
    expect(chips[0].textContent).toBe('★ Best buy');
    expect(chips[0].querySelector('[aria-hidden=true]')?.textContent).toBe('★');
    if (key === 'FARM') { expect(strip().classList.contains('ng')).toBe(false); return; } // FARM label unchanged (m3 §2)
    expect(strip().classList.contains('ng')).toBe(true);
    expect(goalAriaText().startsWith('Next goal: best buy, ')).toBe(true);
    const star = strip().querySelector('.ng-star');
    if (star) expect(star.textContent).toBe('★ ');
    expect(strip().textContent!.length).toBeLessThanOrEqual(27);
  });
  it('nothing affordable: no chip anywhere and no ★ / "best buy" on the strip', async () => {
    const s = { ...stateFor('HENS'), coinsCents: 0 };
    await mount(s, 'farm');
    expect(document.querySelectorAll('.best-chip').length).toBe(0);
    expect(strip().querySelector('.ng-star')).toBeNull();
    expect(goalAriaText()).not.toMatch(/best buy/);
  });
  it('a capped row never carries the chip', async () => {
    const s = { ...initialState(on, 1), farmLevel: 10, hensLevel: 13, eggValueLevel: 13, collectionLevel: 3, coinsCents: 1e13, tracksV7: 1 as const };
    expect(trackLock(s, 'hens', on)).toBe('cap'); expect(trackLock(s, 'eggValue', on)).toBe('cap');
    await mount(s, 'farm');
    expect(document.querySelector('.up.track .best-chip')).toBeNull();
  });
  it('the chip moves on purchase (one row at a time)', async () => {
    const s = stateFor('HENS'); const { g, ui } = await mount(s, 'farm');
    expect(document.querySelector('.best-chip')!.closest('[data-track]')!.getAttribute('data-track')).toBe('hens');
    for (let i = 0; i < 12; i++) {
      const before = document.querySelector<HTMLElement>('.best-chip')?.dataset.bestBuy;
      (document.querySelector<HTMLElement>(`.up.track[data-track=hens] button.buy`) ?? document.querySelector<HTMLElement>('button.buy'))?.click(); ui.render(); ui.render();
      expect(document.querySelectorAll('.best-chip').length).toBeLessThanOrEqual(1);
      const after = document.querySelector<HTMLElement>('.best-chip')?.dataset.bestBuy;
      const want = bestBuyMark(new DualPicker().tick(g.state, on, 0).hint);
      if (after && want && ['HENS', 'VALUE', 'FARM'].includes(want)) expect(['HENS', 'VALUE', 'FARM']).toContain(after);
      if (before !== after) return; // moved
    }
    throw new Error('chip never moved after 12 Hens buys');
  });
});

describe('F4 markup (art file): spans, NBSP, aria untruncated', () => {
  it('Hens / Egg value target renders .ng-name / .ng-lv / .ng-sfx with NBSP and an aria with "level" and "percent"', async () => {
    const s = stateFor('VALUE'); await mount(s, 'farm');
    const lbl = strip();
    expect(lbl.querySelector('.ng-name')!.textContent).toMatch(/^(Egg value|Value|.*…)$/);
    expect(lbl.querySelector('.ng-lv')!.textContent).toMatch(/^\u00A0L\d+$/);
    const sfx = lbl.querySelector('.ng-sfx')?.textContent;
    if (sfx) expect(sfx).toMatch(/^(: .+|\u00A0·\u00A0\+(<1|\d+)% income)$/);
    expect(goalAriaText()).toMatch(/^Next goal: best buy, Egg value level \d+(, .+)?\. /);
    expect(goalAriaText()).not.toMatch(/…|★|Value level/);
  });
});
