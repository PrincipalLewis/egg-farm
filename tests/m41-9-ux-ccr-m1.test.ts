// @vitest-environment jsdom
// CCR delta review on #65 @7779088 (reviews/pr65-delta-7779088.md): M1 (the fallback placement is clear-checked too: Art ruling (1)
// "never over a visible Buy / Collect"; no exemption), n1 (surviving mutants), n2 (off() removes every listener), n3 (Collect counts
// only when a tap at its centre lands on it).
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { fmtMoney, fmtMoneyShort } from '../src/ui/format';
import { showTracksExplainer, placeExplainer, placeCard, buyRects, collectRect, blockRects, EXP_POP_MS } from '../src/ui/tracks-explainer';
import { toastSafeBottom, trackToastSafe, TOAST_GAP } from '../src/ui/toast-safe';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.documentElement.className = ''; document.documentElement.removeAttribute('style'); });
type Box = { left: number; right: number; top: number; bottom: number };
const meets = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const rect = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON() {} }) as DOMRect;
const set = (sel: string, r: DOMRect) => { (document.querySelector(sel) as any).getBoundingClientRect = () => r; };
const game = (refund = 0) => ({ state: { ...initialState(on), seenTracksExplainer: false } as any, balance: on, save() {}, migrationRefundCents: refund });

/** The live 360x640 Upgrades sheet (Chromium @7779088): HUD 0-56, sheet 160-640, header 162-218, scroll body 218-640 (tabs 234-278 at
 *  scrollTop 0), nav 576-640 under the sheet; Farm Buys at 432 / 635 / 893 (48 tall, x 102-326) at scrollTop 0. */
function farmSheet(scroll: number, cardH: number, W = 360, H = 640, sheetTop = 160) {
  document.body.innerHTML = '<div class="hud"></div><section id="p-upgrades" class="sheet"><header></header><div class="body" style="overflow:auto"><div class="tabs"></div>' +
    '<div id="uRow"><button class="btn buy" id="b0"></button><button class="btn buy" id="b1"></button><button class="btn buy" id="b2"></button></div></div></section>' +
    '<nav class="actions"></nav><button id="collect"></button><div class="tracks-exp"></div>';
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(H); vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(W);
  const bodyTop = sheetTop + 58, d = bodyTop - 218;
  set('.hud', rect(0, 0, W, 56)); set('#p-upgrades', rect(0, sheetTop, W, H - sheetTop)); set('.body', rect(0, bodyTop, W, H - bodyTop));
  set('.tabs', rect(16, 234 + d - scroll, W - 32, 44)); set('nav.actions', rect(0, H - 64, W, 64)); set('#collect', rect(8, H - 136, W - 32, 64));
  [432, 635, 893].forEach((t, i) => set(`#b${i}`, rect(102, t + d - scroll, W - 136, 48)));
  const el = document.querySelector<HTMLElement>('.tracks-exp')!, cl = (W - Math.min(296, W - 32)) / 2;
  el.getBoundingClientRect = () => rect(cl, 72, Math.min(296, W - 32), cardH); Object.defineProperty(el, 'offsetHeight', { value: cardH });
  return el;
}
const cardBox = (el: HTMLElement, W: number, h: number) => { const top = el.style.top ? parseFloat(el.style.top) : 72, w = Math.min(296, W - 32), l = (W - w) / 2; return { left: l, right: l + w, top, bottom: top + h }; };

describe('CCR M1: the scrolled sheet (no fallback exemption)', () => {
  it('CCR repro: Farm, refund line (card 206), sheet scrolled 200 px at 360x640: the Buy at 232-280 is never under the card', () => {
    const el = farmSheet(200, 206); placeCard(el);
    const b = buyRects(); expect(b[0]).toEqual({ left: 102, right: 326, top: 232, bottom: 280 });
    expect(el.dataset.place).not.toBe('default'); // was default (72-278) over the Buy
    if (el.dataset.place !== 'none') b.forEach(r => expect(meets(cardBox(el, 360, 206), r)).toBe(false));
    expect(el.dataset.place).toBe('none'); // 232-280 + 435-483 visible, 206 px fits no gap -> kept out of the way
    expect(el.style.top).toBe('');
  });
  it('same scroll, plain card (154): main placement 72-226 is clear of the Buy at 232 and is kept', () => {
    const el = farmSheet(200, 154); placeCard(el); expect(el.dataset.place).toBe('default');
  });
  it('375x667 repro (Buy 239-287): never under the card', () => {
    const el = farmSheet(200, 206, 375, 667, 167); placeCard(el);
    const b = buyRects(); expect(b[0].top).toBe(239);
    if (el.dataset.place !== 'none') b.forEach(r => expect(meets(cardBox(el, 375, 206), r)).toBe(false));
    expect(el.dataset.place).not.toBe('default');
  });
  it('sweep: every scrollTop 0..359 at 360/375/390, card 154 and 206: the placed card never meets a visible Buy; every state is named', () => {
    const seen = new Set<string>();
    for (const [W, H, st] of [[360, 640, 160], [375, 667, 167], [390, 844, 211]]) for (const h of [154, 206]) for (let s = 0; s <= 359; s++) {
      const el = farmSheet(s, h, W, H, st); placeCard(el); const place = el.dataset.place!; seen.add(place);
      expect(['default', 'above', 'inside', 'band', 'below', 'nav', 'none']).toContain(place);
      if (place !== 'none') buyRects().forEach(r => expect(meets(cardBox(el, W, h), r), `${W} h${h} s${s} ${place}`).toBe(false));
    }
    expect(seen.has('none')).toBe(true); expect(seen.has('default')).toBe(true);
  });
  it('none: hidden via [data-place=none] (visibility:hidden: no paint, no hit area); no fade copy on dismiss; the pop still plays', () => {
    expect(readFileSync('src/ui/styles.css', 'utf8')).toMatch(/\.tracks-exp\[data-place=none\]\{visibility:hidden\}/);
    vi.useFakeTimers(); document.body.innerHTML = '<nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect">Collect</button>';
    const el = showTracksExplainer(game(12_345) as any)!; el.dataset.place = 'none';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('.tracks-exp-out')).toBeNull(); expect(document.querySelectorAll('.exp-pop').length).toBe(1);
  });
});

describe('CCR n1: placement mutants', () => {
  const card = { left: 32, right: 328, height: 150 };
  it('above is clear-checked too (a Buy above the sheet, e.g. a docked row, blocks it)', () => {
    const p = placeExplainer(card, { top: 400, left: 0, right: 360 }, { bottom: 452 }, 64, 72, [{ left: 40, right: 120, top: 300, bottom: 340 }]);
    expect(p.place).not.toBe('above'); expect(meets({ ...card, top: p.top, bottom: p.top + 150 }, { left: 40, right: 120, top: 300, bottom: 340 })).toBe(false);
  });
  it('every Buy is checked, not just the first', () => {
    const buys = [{ left: 248, right: 336, top: 900, bottom: 944 }, { left: 248, right: 336, top: 230, bottom: 274 }];
    const p = placeExplainer(card, { top: 160, left: 0, right: 360 }, { bottom: 212 }, 64, 72, buys);
    expect(p.place).not.toBe('inside'); buys.forEach(b => expect(meets({ ...card, top: p.top, bottom: p.top + 150 }, b)).toBe(false));
  });
  it('candidate order: above, inside, default (72), band, below the last Buy, above the nav; none when nothing is clear', () => {
    const S = { top: 160, left: 0, right: 360 }, T = { bottom: 212 }, E = { vh: 640, bodyTop: 218, navTop: 576 }, B = (t: number) => ({ left: 102, right: 326, top: t, bottom: t + 48 });
    expect(placeExplainer(card, S, T, 64, 72, [B(600)], E)).toEqual({ place: 'inside', top: 226 });
    expect(placeExplainer(card, S, T, 64, 72, [B(230)], E)).toEqual({ place: 'default', top: 72 });
    expect(placeExplainer(card, S, T, 64, 72, [B(218)], E)).toEqual({ place: 'band', top: 64 }); // 72-222 meets 218; 64-214 clear
    expect(placeExplainer(card, S, T, 64, 72, [B(150), B(230)], E)).toEqual({ place: 'below', top: 286 });
    expect(placeExplainer(card, S, T, 64, 72, [B(150), B(230), B(570)], E)).toEqual({ place: 'nav', top: 418 }); // below (626) doesn't fit: 418-568
    expect(placeExplainer(card, S, T, 64, 72, [B(150), B(230), B(400), B(570)], E)).toEqual({ place: 'none', top: 72 });
  });
  it('slots must fit the viewport (no slot below the fold)', () => {
    const p = placeExplainer(card, { top: 160, left: 0, right: 360 }, { bottom: 212 }, 64, 72, [{ left: 102, right: 326, top: 150, bottom: 260 }], { vh: 400 });
    expect(p.place).toBe('none');
  });
  it('buyRects: clipped to the scroll container and the viewport; fully clipped / off-screen / zero-size Buys are dropped', () => {
    const el = farmSheet(200, 206); void el;
    expect(buyRects()).toEqual([{ left: 102, right: 326, top: 232, bottom: 280 }, { left: 102, right: 326, top: 435, bottom: 483 }]); // b2 at 693 is below 640
    set('#b0', rect(102, 190, 224, 48)); // half under the sheet header: only 218-238 is hittable
    expect(buyRects()[0]).toEqual({ left: 102, right: 326, top: 218, bottom: 238 });
    set('#b0', rect(102, 150, 224, 48)); expect(buyRects().length).toBe(1); // entirely above the scroll container
    set('#b1', rect(0, 0, 0, 0)); expect(buyRects().length).toBe(0);
    document.body.insertAdjacentHTML('beforeend', '<button class="btn buy" id="bx"></button>'); set('#bx', rect(10, 600, 100, 80)); // not in a scroll container
    expect(buyRects()).toEqual([{ left: 10, right: 110, top: 600, bottom: 640 }]); // clipped to the viewport (640)
  });
});

describe('CCR n3: Collect counts only when a tap at its centre lands on it', () => {
  const page = () => { document.body.innerHTML = '<button id="collect"><span>Collect</span></button><div class="tracks-exp"></div><div class="sheet"></div>';
    set('#collect', rect(8, 504, 320, 64)); vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(640); vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360); };
  it('hittable (or only under the card): counted; covered by the sheet: not counted', () => {
    page(); const c = document.getElementById('collect')!, card = document.querySelector('.tracks-exp')!, sheet = document.querySelector('.sheet')!;
    const efp = vi.fn(); (document as any).elementsFromPoint = efp;
    efp.mockReturnValue([c.firstElementChild, c, document.body]); expect(collectRect()).toMatchObject({ top: 504, bottom: 568 });
    efp.mockReturnValue([card, c, document.body]); expect(blockRects()).toEqual([expect.objectContaining({ top: 504, bottom: 568 })]);
    expect(efp).toHaveBeenLastCalledWith(168, 536);
    efp.mockReturnValue([sheet, c, document.body]); expect(collectRect()).toBeNull(); expect(blockRects()).toEqual([]);
    delete (document as any).elementsFromPoint;
  });
  it('placeExplainer keeps the card off a hittable Collect', () => {
    const p = placeExplainer({ left: 32, right: 328, height: 150 }, null, null, 64, 72, [{ left: 8, right: 328, top: 100, bottom: 164 }], { vh: 640 });
    expect(meets({ left: 32, right: 328, top: p.top, bottom: p.top + 150 }, { left: 8, right: 328, top: 100, bottom: 164 })).toBe(false);
  });
});

describe('CCR n2: off() removes every listener the card added', () => {
  it('each addEventListener(type, fn, capture) made by showTracksExplainer has a matching removeEventListener on close', () => {
    for (const how of ['esc', 'timeout'] as const) {
      vi.useFakeTimers(); document.body.innerHTML = '<nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect">Collect</button>';
      const cap = (o: any) => typeof o === 'boolean' ? o : !!o?.capture, adds: any[] = [], rems: any[] = [];
      for (const t of [document, window] as EventTarget[]) {
        const a = t.addEventListener.bind(t), r = t.removeEventListener.bind(t);
        vi.spyOn(t, 'addEventListener').mockImplementation((ty: string, fn: any, o?: any) => { adds.push([t, ty, fn, cap(o)]); a(ty, fn, o); });
        vi.spyOn(t, 'removeEventListener').mockImplementation((ty: string, fn: any, o?: any) => { rems.push([t, ty, fn, cap(o)]); r(ty, fn, o); });
      }
      showTracksExplainer(game() as any);
      const mine = adds.filter(([, ty]) => ['click', 'keydown', 'scroll', 'resize', 'transitionend'].includes(ty));
      expect(mine.length).toBe(6);
      if (how === 'esc') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); else vi.advanceTimersByTime(8000);
      for (const [t, ty, fn, c] of mine) expect(rems.some(([t2, ty2, fn2, c2]) => t2 === t && ty2 === ty && fn2 === fn && c2 === c), `${ty} capture=${c}`).toBe(true);
      vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = '';
    }
  });
});

describe('CCR n1: toast-safe and pop mutants', () => {
  it('GOAL_COVER_MAX_W is 390: 390 anchors on Collect (may cover the strip), 391 and 412 clear the goal strip', () => {
    const collect = { top: 700, height: 64 }, goal = { top: 650, height: 40 };
    expect(toastSafeBottom(collect, 844, 64, goal, 390)).toBe(844 - 700 + TOAST_GAP);
    expect(toastSafeBottom(collect, 844, 64, goal, 391)).toBe(844 - 650 + TOAST_GAP);
    expect(toastSafeBottom(collect, 915, 64, goal, 412)).toBe(915 - 650 + TOAST_GAP);
  });
  it('trackToastSafe passes the real viewport width and re-measures when #goal resizes', () => {
    document.body.innerHTML = '<nav class="actions"></nav><div id="goal"></div><button id="collect"></button>';
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(412); vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(915);
    const collect = document.getElementById('collect')!, goal = document.getElementById('goal')!;
    collect.getBoundingClientRect = () => rect(8, 771, 396, 64); let gt = 723; goal.getBoundingClientRect = () => rect(8, gt, 396, 40);
    (document.querySelector('nav.actions') as any).getBoundingClientRect = () => rect(0, 851, 412, 64);
    const observed: Element[] = []; let cb: (() => void) | null = null;
    (window as any).ResizeObserver = class { constructor(f: () => void) { cb = f; } observe(e: Element) { observed.push(e); } disconnect() {} };
    trackToastSafe(collect);
    expect(document.documentElement.style.getPropertyValue('--toast-safe-b')).toBe(`${915 - 723 + TOAST_GAP}px`); // goal-anchored: width 412 > 390
    expect(observed).toContain(goal); expect(observed).toContain(collect);
    gt = 700; cb!(); expect(document.documentElement.style.getPropertyValue('--toast-safe-b')).toBe(`${915 - 700 + TOAST_GAP}px`);
    delete (window as any).ResizeObserver;
  });
  it('refund pop uses the compact amount (fmtMoneyShort), not the full one', () => {
    vi.useFakeTimers(); const cents = 123_456_789; expect(fmtMoneyShort(cents)).not.toBe(fmtMoney(cents));
    document.body.innerHTML = '<div class="hud"><div class="pill coins"><span id="coins">$1</span></div></div><nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect">Collect</button>';
    showTracksExplainer(game(cents) as any); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(document.querySelector('.exp-pop')!.textContent).toBe(`+${fmtMoneyShort(cents)}`); vi.advanceTimersByTime(EXP_POP_MS + 50);
  });
});
