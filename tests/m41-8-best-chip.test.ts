// @vitest-environment jsdom
// M41-8 F3 = UX-M4 ★ Best buy chip (art-ux/m4.1-ui-minors.md) + F4-13 (strip ★ and row chip from one source) + F4 markup.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
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
/** The spoken B3 sentence: F4 targets carry it as the aria-describedby description (m4a-spec v1.25 F4-14a), others as aria-label. */
const goalAriaText = () => { const b = document.querySelector<HTMLElement>('#goal')!, d = b.getAttribute('aria-describedby');
  return b.getAttribute('aria-label') ?? (d ? document.getElementById(d)!.textContent! : ''); };
/** Accessible name from content (accname: no aria-label/labelledby on #goal → subtree text minus aria-hidden; img alt=""). */
const nameFromContent = (n: Node): string => [...n.childNodes].map(c => c.nodeType === 3 ? c.textContent! : (c as Element).getAttribute?.('aria-hidden') === 'true' ? '' : (c as Element).tagName === 'IMG' ? (c as HTMLImageElement).alt : nameFromContent(c)).join('');
const KEY_OF_TRACK: Record<string, string> = { Hens: 'HENS', 'Egg value': 'VALUE', Collection: 'COLL' };
/** Key the strip's ★ marks (from its description), or null. */
const stripStarKey = () => { const m = goalAriaText().match(/^Next goal: best buy, (Hens|Egg value|Collection) level/); return m ? KEY_OF_TRACK[m[1]] : null; };
const chipKey = () => document.querySelector<HTMLElement>('.best-chip')?.dataset.bestBuy ?? null;

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
      const after = document.querySelector<HTMLElement>('.best-chip')?.dataset.bestBuy ?? null;
      // CCR n1: the chip sits on the FRESH pick for the post-purchase state (purchases re-pick at once, no hysteresis hold).
      const want = bestBuyMark(new DualPicker().tick(g.state, on, 0).hint);
      expect(after).toBe(want);
      if (before !== after) { expect(after).not.toBe('HENS'); return; } // moved
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
    expect(lbl.querySelector(".ng-tail > .ng-lv")).not.toBeNull(); // F4-14a: level + suffix inline in one flex item
    const sfx = lbl.querySelector('.ng-sfx')?.textContent;
    if (sfx) expect(sfx).toMatch(/^(: .+|\u00A0·\u00A0\+(<1|\d+)% income)$/);
    expect(goalAriaText()).toMatch(/^Next goal: best buy, Egg value level \d+(, .+)?\. /);
    expect(goalAriaText()).not.toMatch(/…|★|Value level/);
  });
});

describe('F4-14a label-in-name (m4a-spec v1.25): name = visible text, F4-14 sentence + status = description', () => {
  it.each(['HENS', 'VALUE', 'COLL'] as const)('%s target: no aria-label; name from content = visible text minus ★ / …; describedby = sentence + status', async key => {
    await mount(stateFor(key), TAB[key]);
    const b = document.querySelector<HTMLElement>('#goal')!, lbl = strip(), st = b.querySelector('.goal-status')!.textContent!;
    expect(b.hasAttribute('aria-label')).toBe(false);
    expect(b.getAttribute('aria-describedby')).toBe('goalDesc');
    const name = nameFromContent(b), visible = lbl.textContent!.replace(/^★ /, '').replace('…', '');
    expect(name).toBe(visible + st);
    expect(name).not.toMatch(/[…★]/);
    const desc = document.getElementById('goalDesc')!.textContent!;
    expect(desc).toMatch(/^Next goal: best buy, (Hens|Egg value|Collection) level \d+(, .+)?\. (Ready now|Ready in about .+|Sell eggs to earn coins)\.$/);
    expect(desc).not.toMatch(/[…★]|Value level|Coll\./);
  });
  it('a JS-truncated name keeps its `…` out of the name (aria-hidden) and the ★ span is aria-hidden', async () => {
    const { goalLabelParts, goalLabelHtml } = await import('../src/ui/goal-label');
    const p = goalLabelParts({ track: 'Supercalifragilistic', n: 30, star: true, suffix: { kind: 'pct', x: 12 } });
    const d = document.createElement('div'); d.innerHTML = goalLabelHtml(p);
    expect(d.textContent).toBe(p.text); expect(nameFromContent(d)).toBe(p.accName);
    expect(p.accName).toBe('Supercal\u00A0L30\u00A0·\u00A0+12% income');
  });
  it('a non-F4 target (FARM) keeps the aria-label and no description', async () => {
    await mount(stateFor('FARM'), 'farm');
    const b = document.querySelector<HTMLElement>('#goal')!;
    expect(b.getAttribute('aria-label')).toMatch(/^Next goal: Farm L\d+/); expect(b.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('same-frame agreement: strip ★ and chip from ONE render (CCR #62 m1 + m2)', () => {
  /** A state whose shared pick is HENS, with its cost (coins 1e13 for the search). */
  function hensPick() {
    for (let F = 3; F < 28; F++) for (const dH of [-3, 0, 2]) {
      const c = { ...initialState(on, 1), farmLevel: F, hensLevel: Math.max(0, F + dH), eggValueLevel: F, collectionLevel: F, coinsCents: 1e13, tracksV7: 1 as const };
      const h = new DualPicker().tick(c, on, 0).hint; if (h?.key === 'HENS') return { s: c, cost: h.costCents };
    }
    throw new Error('no HENS pick');
  }
  afterEach(() => { vi.restoreAllMocks(); });
  it('m1 (CCR repro /tmp/ccr-stale.test.ts.keep): coins cross the cost without a purchase → chip and strip ★ agree 100 ms later, in that same render', async () => {
    const { s, cost } = hensPick();
    let t = 1000; vi.spyOn(performance, 'now').mockImplementation(() => t);
    const { g, ui } = await mount({ ...s, coinsCents: cost - 1 }, 'farm');
    t += 2000; ui.render();
    expect(chipKey()).toBeNull(); expect(stripStarKey()).toBeNull();
    g.state = { ...g.state, coinsCents: cost + 1 } as any; t += 100; ui.render(); // one render, inside the 1 Hz window
    expect(chipKey()).toBe('HENS');
    expect(stripStarKey()).toBe('HENS');
    expect(strip().querySelector('.ng-star')?.textContent ?? '★ ').toBe('★ ');
    g.state = { ...g.state, coinsCents: cost - 1 } as any; t += 100; ui.render(); // and back (spend elsewhere / wage)
    expect(chipKey()).toBeNull(); expect(stripStarKey()).toBeNull();
  });
  it('m2: after an offline grant and after each buy, ONE render() leaves chip and strip ★ on the same key (fails if the strip is drawn after the rows)', async () => {
    const { s, cost } = hensPick();
    let t = 1000; vi.spyOn(performance, 'now').mockImplementation(() => t);
    const { g, ui } = await mount({ ...s, coinsCents: cost - 1 }, 'farm');
    expect(chipKey()).toBeNull();
    g.state = { ...g.state, coinsCents: 1e13 } as any; t += 3000; ui.render(); // offline grant: a single frame
    expect(chipKey()).not.toBeNull(); expect(chipKey()).toBe(stripStarKey());
    let moved = false;
    for (let i = 0; i < 12 && !moved; i++) {
      const before = chipKey();
      g.dispatch({ type: 'buyTrack', track: 'hens' } as any); t += 50; ui.render(); // single render after the buy
      expect(chipKey()).toBe(bestBuyMark(new DualPicker().tick(g.state, on, 0).hint));
      if (['HENS', 'VALUE', 'COLL'].includes(chipKey() ?? '')) expect(stripStarKey()).toBe(chipKey());
      moved = chipKey() !== before;
    }
    expect(moved).toBe(true);
  });
});
