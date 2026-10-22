// @vitest-environment jsdom
// M41-9 Art Minors (art-ux/m4.1-ui-minors.md): UX-M1 focus ring hand-off, UX-M2 notice above Collect, UX-M3 card clear of the
// sheet's tab row, UX-M5 close fade + refund pop. (UX-M4 Best buy chip is PR #62.)
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { showTracksExplainer, placeExplainer, explainerOpen, EXP_OUT_MS, EXP_POP_MS, EXP_CLOSED, EXP_BURST } from '../src/ui/tracks-explainer';
import { toastSafeBottom, TOAST_GAP } from '../src/ui/toast-safe';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const css = readFileSync('src/ui/styles.css', 'utf8');
let rmMatches = false;
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduced-motion') ? rmMatches : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
});
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; document.documentElement.className = ''; rmMatches = false; });
const game = (refund = 0) => ({ state: { ...initialState(on), seenTracksExplainer: false } as any, balance: on, save() {}, migrationRefundCents: refund });
const page = () => { document.body.innerHTML = '<nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect" class="btn xl">Collect</button>'; };
const pageHud = () => { page(); document.body.insertAdjacentHTML('afterbegin', '<div class="hud"><div class="pill coins"><span id="coins">$1</span></div></div>');
  const pill = document.querySelector('.pill.coins')!; (pill as any).getBoundingClientRect = () => ({ left: 100, right: 200, top: 8, bottom: 40, width: 100, height: 32, x: 100, y: 8 }); };
const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('UX-M1: focus ring after Esc / Got it (WebKit .kbd-focus fallback)', () => {
  it('Esc: focus goes to the bottom-nav Upgrades and it is marked .kbd-focus', () => {
    page(); showTracksExplainer(game() as any); key('Escape');
    const t = document.querySelector<HTMLElement>('[data-nav=upgrades]')!;
    expect(document.activeElement).toBe(t); expect(t.classList.contains('kbd-focus')).toBe(true);
  });
  it('Got it by keyboard (Space -> click with detail 0, or Enter): same target, marked .kbd-focus; cleared on blur and on the next pointer press', () => {
    page(); const el = showTracksExplainer(game() as any)!; (el.querySelector('.tracks-exp-ok') as HTMLButtonElement).click(); // el.click(): detail 0
    const t = document.querySelector<HTMLElement>('[data-nav=upgrades]')!;
    expect(document.activeElement).toBe(t); expect(t.classList.contains('kbd-focus')).toBe(true);
    t.blur(); expect(t.classList.contains('kbd-focus')).toBe(false);
    page(); const el2 = showTracksExplainer(game() as any)!; (el2.querySelector('.tracks-exp-ok') as HTMLButtonElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const t2 = document.querySelector<HTMLElement>('[data-nav=upgrades]')!; expect(document.activeElement).toBe(t2); expect(t2.classList.contains('kbd-focus')).toBe(true);
    document.dispatchEvent(new Event('pointerdown')); expect(t2.classList.contains('kbd-focus')).toBe(false);
  });
  it('Designer M-1: Got it by pointer (click / touch tap, detail >= 1): focus hands off, but NO forced .kbd-focus ring', () => {
    for (const init of [{ detail: 1 }, { detail: 1, pointerType: 'touch' }]) {
      page(); const el = showTracksExplainer(game() as any)!;
      el.querySelector('.tracks-exp-ok')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
      const t = document.querySelector<HTMLElement>('[data-nav=upgrades]')!;
      expect(explainerOpen()).toBe(false); expect(document.activeElement).toBe(t); expect(document.querySelector('.kbd-focus')).toBeNull();
    }
  });
  it('card-body tap and the 8 s timeout do not force the ring (pointer / no user action)', () => {
    vi.useFakeTimers(); page(); showTracksExplainer(game() as any); vi.advanceTimersByTime(8000);
    expect(document.querySelector('.kbd-focus')).toBeNull();
    page(); const el = showTracksExplainer(game() as any)!; el.querySelector('h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.kbd-focus')).toBeNull();
  });
  it('CSS: 3px #2B79A8 ring on :focus-visible targets and on .kbd-focus', () => {
    expect(css).toMatch(/--c-focus:#2B79A8/);
    expect(css).toMatch(/nav\.actions button:focus-visible,\[data-tab\]:focus-visible,#collect:focus-visible,\.kbd-focus\{outline:3px solid var\(--c-focus\);outline-offset:2px\}/);
  });
});

describe('UX-M2: bottom notice anchored above Collect', () => {
  it('offset = viewport - Collect top + 8 (nav + Collect + 8 on mobile), never under the old nav + 8 anchor', () => {
    // 360x640: nav 64, Collect 64 tall directly above it -> top 512 -> 136 = 64 + 64 + 8
    expect(toastSafeBottom({ top: 640 - 64 - 64, height: 64 }, 640, 64)).toBe(64 + 64 + TOAST_GAP);
    expect(toastSafeBottom(null, 640, 64)).toBe(72);
    expect(toastSafeBottom({ top: 700, height: 0 }, 640, 64)).toBe(72);
    expect(toastSafeBottom({ top: 630, height: 56 }, 640, 64)).toBe(72);
  });
  it('a notice ending at that offset never overlaps Collect (property over 360..1280 x 560..1000)', () => {
    for (let h = 560; h <= 1000; h += 40) for (const ch of [48, 56, 64, 72]) {
      const top = h - 64 - ch - 6, b = toastSafeBottom({ top, height: ch }, h, 64), noticeBottomY = h - b;
      expect(noticeBottomY).toBeLessThanOrEqual(top - TOAST_GAP);
    }
  });
  it('CSS: .save-warn uses --toast-safe-b; app.ts keeps it current', () => {
    expect(css).toMatch(/\.save-warn\{[^}]*bottom:var\(--toast-safe-b,calc\(var\(--nav-h\) \+ 8px\)\)/);
    expect(readFileSync('src/ui/app.ts', 'utf8')).toMatch(/trackToastSafe\(collectBtn\)/);
  });
});

describe('UX-M3: card docks clear of the open sheet tab row', () => {
  const card = { left: 32, right: 328, height: 160 };
  it('sheet closed: default top 72', () => expect(placeExplainer(card, null, null, 64)).toEqual({ place: 'default', top: 72 }));
  it('room above the sheet: top = sheet top - card height - 8', () =>
    expect(placeExplainer(card, { top: 400, left: 0, right: 360 }, { bottom: 470 }, 64)).toEqual({ place: 'above', top: 232 }));
  it('no room (360x640, sheet top 160): inside the sheet, 8px below the tabs', () =>
    expect(placeExplainer(card, { top: 160, left: 0, right: 360 }, { bottom: 266 }, 64)).toEqual({ place: 'inside', top: 274 }));
  it('docked panel beside the card (no shared columns): default', () =>
    expect(placeExplainer({ left: 492, right: 788, height: 160 }, { top: 56, left: 800, right: 1280 }, { bottom: 160 }, 64).place).toBe('default'));
  it('property: the card never intersects the tab row band', () => {
    for (let sheetTop = 60; sheetTop <= 900; sheetTop += 7) for (const ch of [140, 160, 200]) {
      const tabsTop = sheetTop + 56 + 16, tabsBottom = tabsTop + 44, r = placeExplainer({ ...card, height: ch }, { top: sheetTop, left: 0, right: 360 }, { bottom: tabsBottom }, 64);
      expect(r.top + ch <= tabsTop || r.top >= tabsBottom).toBe(true);
    }
  });
});

describe('UX-M5: close fade and refund pop', () => {
  it('close: card leaves at once (explainerOpen false, EXP_CLOSED fired), an inert aria-hidden copy fades 150 ms then goes', () => {
    vi.useFakeTimers(); page(); let closed = 0; document.addEventListener(EXP_CLOSED, () => closed++);
    showTracksExplainer(game() as any); key('Escape');
    expect(explainerOpen()).toBe(false); expect(closed).toBe(1);
    const ghost = document.querySelector('.tracks-exp-out')!; expect(ghost).not.toBeNull();
    expect(ghost.getAttribute('aria-hidden')).toBe('true'); expect(ghost.hasAttribute('inert')).toBe(true); expect(ghost.querySelector('[id]')).toBeNull(); expect(ghost.getAttribute('role')).toBeNull();
    vi.advanceTimersByTime(EXP_OUT_MS + 30); expect(document.querySelector('.tracks-exp-out')).toBeNull();
    expect(css).toMatch(/\.tracks-exp-out\{pointer-events:none;animation:expout 150ms ease-in forwards\}/);
    expect(css).toMatch(/@keyframes expout\{from\{opacity:1;transform:translateX\(-50%\) translateY\(0\)\}to\{opacity:0;transform:translateX\(-50%\) translateY\(4px\)\}\}/);
  });
  it('Art (3): refund > 0 -> NO pop while the card is up; on dismiss a number pop (+$ compact, coin icon) and a coin burst at the coin pill, aria-hidden, gone after 800 ms', () => {
    vi.useFakeTimers(); pageHud(); showTracksExplainer(game(12_345) as any);
    expect(document.querySelector('.exp-pop,.exp-coin')).toBeNull(); vi.advanceTimersByTime(2000); expect(document.querySelector('.exp-pop,.exp-coin')).toBeNull();
    expect(document.querySelector('.tracks-exp-refund')!.textContent).toMatch(/We refunded \+\$123\.45 for your old upgrades\./);
    key('Escape');
    const pop = document.querySelector<HTMLElement>('.exp-pop')!; expect(pop.textContent).toBe('+$123.45'); expect(pop.getAttribute('aria-hidden')).toBe('true');
    expect(pop.querySelector('img')!.getAttribute('src')).toMatch(/icon-coin\.svg$/);
    expect(pop.style.left).toBe('150px'); expect(pop.style.top).toBe(`${40 + 30}px`); // coin pill (100..200 x 8..40): centred, rises onto it
    const coins = document.querySelectorAll<HTMLElement>('.exp-coin'); expect(coins.length).toBe(EXP_BURST); coins.forEach(c => { expect(c.getAttribute('aria-hidden')).toBe('true'); expect(c.style.left).toBe('150px'); });
    vi.advanceTimersByTime(EXP_POP_MS + 50); expect(document.querySelector('.exp-pop,.exp-coin')).toBeNull();
    pageHud(); showTracksExplainer(game(0) as any); key('Escape'); expect(document.querySelector('.exp-pop,.exp-coin')).toBeNull(); // M4-A: refund is 0
  });
  it('Art (3): every dismissal path pops once (Got it, card tap, Esc, 8 s timeout); never twice (CCR nit: double pop)', () => {
    vi.useFakeTimers();
    for (const how of ['ok', 'card', 'esc', 'timeout'] as const) {
      pageHud(); const el = showTracksExplainer(game(12_345) as any)!;
      if (how === 'ok') (el.querySelector('.tracks-exp-ok') as HTMLButtonElement).click(); else if (how === 'card') el.querySelector('h2')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      else if (how === 'esc') key('Escape'); else vi.advanceTimersByTime(8000);
      expect(document.querySelectorAll('.exp-pop').length).toBe(1);
      key('Escape'); vi.advanceTimersByTime(8000); el.querySelector('.tracks-exp-ok')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); // the timer, a 2nd Esc, a stale click
      expect(document.querySelectorAll('.exp-pop').length).toBeLessThanOrEqual(1); // the first has expired (800 ms) or is the only one
      vi.advanceTimersByTime(EXP_POP_MS + 50); document.body.innerHTML = '';
    }
  });
  it('reduced motion (system or in-game flag): no fade copy, no pop (instant)', () => {
    for (const via of ['system', 'flag']) {
      page(); if (via === 'system') rmMatches = true; else document.documentElement.classList.add('reduced-motion');
      showTracksExplainer(game(12_345) as any); expect(document.querySelector('.exp-pop,.exp-coin')).toBeNull();
      key('Escape'); expect(document.querySelector('.tracks-exp-out,.exp-pop,.exp-coin')).toBeNull(); expect(explainerOpen()).toBe(false); // no pop on dismiss either
      rmMatches = false; document.documentElement.className = '';
    }
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.tracks-exp-out,\.exp-pop,\.exp-coin\{display:none\}\}/);
  });
  it('pop styling per number-pop-spec (Coin Gold, 2px Soil Brown stroke, 26px, 800 ms)', () => {
    expect(css).toMatch(/\.exp-pop\{[^}]*font:700 26px var\(--f-display\);[^}]*color:#E8B020;-webkit-text-stroke:2px #3E2C23;paint-order:stroke fill;[^}]*animation:exppop 800ms forwards\}/);
  });
});
