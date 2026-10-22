// @vitest-environment jsdom
// Art rulings on #65 (M41-9, 22 Oct): (1) the explainer card never overlaps a visible Buy hit area (fallback: main's placement
// over the tab row); (2) the moved notice may cover the goal strip only at widths <= 390; (3) the refund pop plays at the coin
// pill on dismiss (m4-tracks-explainer.md:21), reduced motion = no pop + instant balance; CCR nits (bounded re-placement);
// Designer n1 (bottom-nav ring inset). Pop-on-dismiss, double pop and Designer M-1 are in m41-9-ux-minors.test.ts.
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { fmtMoney } from '../src/ui/format';
import { showTracksExplainer, placeExplainer, placeCard } from '../src/ui/tracks-explainer';
import { toastSafeBottom, GOAL_COVER_MAX_W, TOAST_GAP } from '../src/ui/toast-safe';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
let rmMatches = false;
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduced-motion') ? rmMatches : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.className = ''; rmMatches = false; });
type Box = { left: number; right: number; top: number; bottom: number };
const meets = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const rect = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON() {} }) as DOMRect;

describe('Art (1): the card never overlaps a visible Buy', () => {
  const card = { left: 16, right: 344, height: 150 };
  it('phone (360x640: sheet top 160, tabs end 212, first Buy right under them): main placement (top 72, over the tab row)', () => {
    const buys = [{ left: 248, right: 336, top: 228, bottom: 272 }, { left: 248, right: 336, top: 300, bottom: 344 }];
    const p = placeExplainer(card, { top: 160, left: 0, right: 360 }, { bottom: 212 }, 64, 72, buys);
    expect(p).toEqual({ place: 'default', top: 72 });
    buys.forEach(b => expect(meets({ ...card, top: p.top, bottom: p.top + card.height }, b)).toBe(false));
  });
  it('tall sheet with room above: above; inside is used only when it is clear of every Buy', () => {
    expect(placeExplainer(card, { top: 400, left: 0, right: 360 }, { bottom: 452 }, 64, 72, [{ left: 248, right: 336, top: 468, bottom: 512 }])).toEqual({ place: 'above', top: 242 });
    expect(placeExplainer(card, { top: 160, left: 0, right: 360 }, { bottom: 212 }, 64, 72, [{ left: 248, right: 336, top: 600, bottom: 644 }])).toEqual({ place: 'inside', top: 220 });
  });
  it('property (CCR M1: no exemption): whatever is chosen, including main placement, no Buy rect intersects the card; nothing clear -> none', () => {
    let n = 0, none = 0;
    for (let sheetTop = 100; sheetTop <= 700; sheetTop += 20) for (let rowGap = -300; rowGap <= 400; rowGap += 20) for (const h of [120, 150, 190, 206]) {
      const tabsB = sheetTop + 52, c = { left: 16, right: 344, height: h }, vh = sheetTop + 480;
      const buys = [0, 72, 144, 216].map(k => ({ left: 248, right: 336, top: tabsB + 16 + rowGap + k, bottom: tabsB + 60 + rowGap + k }))
        .map(b => ({ ...b, top: Math.max(b.top, sheetTop + 56) })).filter(b => b.bottom > b.top); // clipped to the scroll container
      const p = placeExplainer(c, { top: sheetTop, left: 0, right: 360 }, { bottom: tabsB + rowGap }, 64, 72, buys, { vh, bodyTop: sheetTop + 56 });
      if (p.place === 'none') { none++; continue; }
      const box = { ...c, top: p.top, bottom: p.top + h };
      buys.forEach(b => expect(meets(box, b)).toBe(false)); n++;
    }
    expect(n).toBeGreaterThan(500); expect(none).toBeGreaterThan(0);
  });
  it('placeCard feeds the visible .btn.buy rects (hidden / zero-size / off-screen ones are ignored)', () => {
    document.body.innerHTML = '<div class="hud"></div><section id="p-upgrades"><div class="tabs"></div><button class="btn buy" id="b1"></button><button class="btn buy" id="b0"></button></section><div class="tracks-exp"></div>';
    const set = (sel: string, r: DOMRect) => { (document.querySelector(sel) as any).getBoundingClientRect = () => r; };
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(640);
    set('.hud', rect(0, 0, 360, 56)); set('#p-upgrades', rect(0, 160, 360, 480)); set('.tabs', rect(0, 160, 360, 52)); set('#b0', rect(0, 0, 0, 0));
    const el = document.querySelector<HTMLElement>('.tracks-exp')!; el.getBoundingClientRect = () => rect(16, 72, 328, 150); Object.defineProperty(el, 'offsetHeight', { value: 150 });
    set('#b1', rect(248, 228, 88, 44)); placeCard(el); expect(el.dataset.place).toBe('default'); expect(el.style.top).toBe('');
    set('#b1', rect(248, 700, 88, 44)); placeCard(el); expect(el.dataset.place).toBe('inside'); expect(el.style.top).toBe('220px'); // Buy below the fold
  });
});

describe('CCR nit: bounded re-placement (no per-frame loop)', () => {
  it('while up, the card is measured only on resize / scroll / transitionend / click (coalesced per frame), never in an idle rAF loop; all listeners go on close', () => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = []; window.requestAnimationFrame = ((cb: FrameRequestCallback) => { frames.push(cb); return frames.length; }) as any;
    document.body.innerHTML = '<nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect">Collect</button>';
    const g = { state: { ...initialState(on), seenTracksExplainer: false } as any, balance: on, save() {}, migrationRefundCents: 0 };
    const el = showTracksExplainer(g as any)!; const spy = vi.spyOn(el, 'getBoundingClientRect');
    expect(frames.length).toBe(0); vi.advanceTimersByTime(3000); expect(frames.length).toBe(0); // idle: nothing scheduled
    window.dispatchEvent(new Event('resize')); window.dispatchEvent(new Event('resize')); document.dispatchEvent(new Event('scroll'));
    expect(frames.length).toBe(1); frames.shift()!(0); expect(spy).toHaveBeenCalledTimes(1); expect(frames.length).toBe(0); // one measure, no re-arm
    document.dispatchEvent(new Event('transitionend')); expect(frames.length).toBe(1); frames.shift()!(0);
    document.querySelector('#collect')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); vi.advanceTimersByTime(1); expect(frames.length).toBe(1); frames.shift()!(0);
    expect(spy).toHaveBeenCalledTimes(3);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    window.dispatchEvent(new Event('resize')); document.dispatchEvent(new Event('scroll')); document.dispatchEvent(new Event('transitionend'));
    document.querySelector('#collect')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); vi.advanceTimersByTime(10);
    expect(frames.length).toBe(0); expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('Art (2): notice vs the goal strip', () => {
  const vps: [number, number][] = [[360, 640], [375, 667], [390, 844], [412, 915], [430, 932], [768, 1024], [1024, 768], [1280, 800]];
  it(`<= ${GOAL_COVER_MAX_W}: anchored on Collect (may cover the strip); wider: its bottom clears the goal strip (rect intersection) and Collect`, () => {
    for (const [w, h] of vps) {
      const collect = { top: h - 64 - 88, height: 64 }, goal = { top: collect.top - 48, height: 40 };
      const b = toastSafeBottom(collect, h, 64, goal, w), notice = { left: 0, right: w, top: h - b - 44, bottom: h - b };
      const g = { left: 0, right: w, top: goal.top, bottom: goal.top + goal.height }, c = { left: 0, right: w, top: collect.top, bottom: collect.top + 64 };
      expect(meets(notice, c)).toBe(false);
      if (w <= GOAL_COVER_MAX_W) expect(b).toBe(h - collect.top + TOAST_GAP); else { expect(meets(notice, g)).toBe(false); expect(b).toBe(h - goal.top + TOAST_GAP); }
    }
  });
  it('no goal strip (hidden / not rendered): Collect anchor at every width', () => {
    expect(toastSafeBottom({ top: 600, height: 64 }, 800, 64, null, 1280)).toBe(208);
    expect(toastSafeBottom({ top: 600, height: 64 }, 800, 64, { top: 0, height: 0 }, 1280)).toBe(208);
  });
  it('app wiring: trackToastSafe observes #goal', () => {
    expect(readFileSync('src/ui/toast-safe.ts', 'utf8')).toMatch(/getElementById\('goal'\)/);
  });
});

describe('Art (3): reduced motion = no pop, balance updates instantly', () => {
  it('the HUD balance shows the refunded total on the same render, with no pop on show or on dismiss', async () => {
    vi.useFakeTimers(); rmMatches = true;
    const { Game } = await import('../src/game'); const { mem } = await import('./helpers'); const { mountApp } = await import('../src/ui/app');
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
    const g = new Game(on, mem() as any, () => 1760000000000, undefined, 'dev', null, null, { idbBoot: 'absent' } as any);
    document.body.innerHTML = '<div id="app"></div>';
    const ui = mountApp(document.getElementById('app')!, g, on, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
    g.state = { ...g.state, coinsCents: 500, seenTracksExplainer: false } as any; ui.render();
    g.migrationRefundCents = 123_450; g.state = { ...g.state, coinsCents: 500 + 123_450 } as any; g.onTracksCommitted?.(); ui.render();
    expect(document.querySelector('.tracks-exp')).not.toBeNull();
    expect(document.getElementById('coins')!.textContent).toBe(fmtMoney(500 + 123_450));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('.exp-pop,.exp-coin,.tracks-exp-out')).toBeNull();
    expect(document.getElementById('coins')!.textContent).toBe(fmtMoney(500 + 123_450));
    expect(readFileSync('src/ui/app.ts', 'utf8')).toMatch(/setText\(coinsEl, fmtMoney\(s\.coinsCents\)\)/); // no tween on the counter
  });
});

describe('Designer n1: bottom-nav focus ring inset', () => {
  it('nav.actions ring uses a negative outline-offset (one line)', () => {
    expect(readFileSync('src/ui/styles.css', 'utf8')).toMatch(/nav\.actions button:focus-visible,nav\.actions button\.kbd-focus\{outline-offset:-3px\}/);
  });
});
