// @vitest-environment jsdom
// QA-PRERUN-1 (UI QA 76390f2 pre-run, HoQ QA-D-1030-PRERUN-TRIAGE; qa/m3-recheck/prerun-76390f2-bugs/bug-csr-wk375-gotit-focus.md):
// WebKit 375, Upgrades > Farm, refund card: Tab moved focus out of the card into the sheet, the sheet scrolled, every slot was blocked,
// the card went data-place=none = visibility:hidden, and a visibility:hidden Got it can't take focus again (Tab, Shift+Tab or .focus()).
// Fix: 'none' = opacity 0 + no hit area (still focusable); keyboard focus inside the card keeps it painted ('focus'); pointer-time
// focus is handed out before a card is kept out of the way. Browser check: scripts/v5-qa-prerun-1-gotit-focus.mjs.
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { showTracksExplainer, placeCard, keyboardInput, EXP_MS } from '../src/ui/tracks-explainer';
const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = ''; document.dispatchEvent(new Event('pointerdown')); });
const rect = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top, toJSON() {} }) as DOMRect;
const game = (refund = 123_450) => ({ state: { ...initialState(on), seenTracksExplainer: false } as any, balance: on, save() {}, migrationRefundCents: refund });
/** The 360x640 Upgrades > Farm sheet of m41-9-ux-ccr-m1.test.ts (refund card 206 tall). scroll 0: the card has a clear slot;
 *  scroll 200: Buys at 232-280 and 435-483 leave no 206 px gap -> 'none' (the CCR repro geometry). */
function sheet() {
  document.body.innerHTML = '<div class="hud"></div><section id="p-upgrades" class="sheet"><header></header><div class="body" style="overflow:auto"><div class="tabs"><button data-tab="farm" class="active">Farm</button></div>' +
    '<div id="uRow"><button class="btn buy" id="b0">Buy</button><button class="btn buy" id="b1">Buy</button><button class="btn buy" id="b2">Buy</button></div></div></section>' +
    '<nav class="actions"><button data-nav="upgrades">Upgrades</button></nav><button id="collect">Collect</button>';
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(640); vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(360);
  const geo = { scroll: 0 };
  const R = (e: Element): DOMRect | null => {
    const s = geo.scroll;
    if (e.matches('.tracks-exp')) return rect(32, 72, 296, 206);
    if (e.matches('.hud')) return rect(0, 0, 360, 56);
    if (e.matches('#p-upgrades')) return rect(0, 160, 360, 480);
    if (e.matches('#p-upgrades .body')) return rect(0, 218, 360, 422);
    if (e.matches('.tabs')) return rect(16, 234 - s, 328, 44);
    if (e.matches('nav.actions')) return rect(0, 576, 360, 64);
    if (e.matches('#collect')) return rect(8, 504, 328, 64);
    const i = ['b0', 'b1', 'b2'].indexOf(e.id); if (i >= 0) return rect(102, [432, 635, 893][i] - s, 224, 48);
    return null;
  };
  const orig = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) { return R(this) ?? orig.call(this); });
  return geo;
}
const card = () => document.querySelector<HTMLElement>('.tracks-exp')!;
const ok = () => document.querySelector<HTMLButtonElement>('.tracks-exp-ok')!;
const frame = () => vi.advanceTimersByTime(20);
const key = (k = 'Tab', shiftKey = false) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true }));
const pointer = () => document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
const scrollTo = (geo: { scroll: number }, s: number) => { geo.scroll = s; document.querySelector('#p-upgrades .body')!.dispatchEvent(new Event('scroll')); frame(); };

describe('QA-PRERUN-1 Got it keyboard focus (WebKit 375 exp-sheet-farm-refund)', () => {
  it('QA-PRERUN-1 css: [data-place=none] is opacity 0 (beats the expin/expfade animation) + no hit area, never visibility:hidden (keeps Got it focusable)', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toMatch(/\.tracks-exp\[data-place=none\]\{opacity:0!important;pointer-events:none\}/);
    expect(css).not.toMatch(/\.tracks-exp\[data-place=[a-z]+\]\{[^}]*visibility:hidden/);
  });
  it('QA-PRERUN-1 placeCard: no clear slot + keyboard focus inside -> focus (painted at main placement), without -> none', () => {
    const geo = sheet(); geo.scroll = 200; const el = document.createElement('div'); el.className = 'tracks-exp'; document.body.append(el);
    expect(placeCard(el)).toBe('none'); expect(el.dataset.place).toBe('none');
    expect(placeCard(el, document, true)).toBe('focus'); expect(el.dataset.place).toBe('focus'); expect(el.style.top).toBe('');
    geo.scroll = 0; expect(placeCard(el, document, true)).not.toMatch(/^(none|focus)$/); // a clear slot still wins
  });
  it('QA-PRERUN-1 repro order: Tab out (sheet scrolls, card kept out of the way), then Shift+Tab back into the card -> painted at once, Got it focused', () => {
    vi.useFakeTimers(); const geo = sheet(); showTracksExplainer(game() as any); frame();
    expect(document.activeElement).toBe(ok()); expect(card().dataset.place).not.toBe('none');
    key('Tab'); (document.getElementById('b1') as HTMLButtonElement).focus(); scrollTo(geo, 200); // focus left the card: kept out of the way
    expect(card().dataset.place).toBe('none'); expect(card().contains(document.activeElement)).toBe(false);
    key('Tab', true); ok().focus(); // the 'none' card stays in the tab order (was visibility:hidden: unfocusable)
    expect(document.activeElement).toBe(ok()); expect(card().dataset.place).toBe('focus'); // focusin re-places synchronously: no frame with a hidden focused Got it
    frame(); expect(card().dataset.place).toBe('focus');
  });
  it('QA-PRERUN-1 never hidden while focused: keyboard focus on Got it, sheet scrolled to a no-slot position -> focus (not none); focus leaves -> none', () => {
    vi.useFakeTimers(); const geo = sheet(); showTracksExplainer(game() as any); frame(); key('Tab', true); ok().focus();
    scrollTo(geo, 200); expect(document.activeElement).toBe(ok()); expect(card().dataset.place).toBe('focus');
    (document.getElementById('collect') as HTMLButtonElement).focus(); frame(); expect(card().dataset.place).toBe('none');
  });
  it('QA-PRERUN-1 pointer users keep the M41-9 rule: show-time focus + no slot -> none, and focus is handed to the active tab first (no hidden focused element)', () => {
    vi.useFakeTimers(); const geo = sheet(); pointer(); showTracksExplainer(game() as any); frame(); expect(document.activeElement).toBe(ok());
    scrollTo(geo, 200); expect(card().dataset.place).toBe('none'); expect(document.activeElement).toBe(document.querySelector('[data-tab=farm]'));
    scrollTo(geo, 0); expect(card().dataset.place).not.toBe('none');
  });
  it('QA-PRERUN-1 a pointer press after keyboard use drops the keyboard hold on the next re-place (card off the Buys again)', () => {
    vi.useFakeTimers(); const geo = sheet(); showTracksExplainer(game() as any); frame(); key('Tab', true); ok().focus(); scrollTo(geo, 200);
    expect(card().dataset.place).toBe('focus'); pointer(); scrollTo(geo, 204); expect(card().dataset.place).toBe('none'); expect(card().contains(document.activeElement)).toBe(false);
  });
  it('QA-PRERUN-1 input modality is tracked per document from module load: keydown -> keyboard, pointer/mouse/touch press -> pointer', () => {
    pointer(); expect(keyboardInput()).toBe(false); key('a'); expect(keyboardInput()).toBe(true);
    document.dispatchEvent(new Event('mousedown')); expect(keyboardInput()).toBe(false); key('Tab'); document.dispatchEvent(new Event('touchstart')); expect(keyboardInput()).toBe(false);
  });
  it('QA-PRERUN-1 a card that opens after keyboard use with no clear slot keeps Got it focused and painted (WebKit repro: card re-shown at scroll 271)', () => {
    vi.useFakeTimers(); const geo = sheet(); geo.scroll = 200; key('Tab'); showTracksExplainer(game() as any);
    expect(document.activeElement).toBe(ok()); expect(card().dataset.place).toBe('focus');
  });
  it('QA-PRERUN-1 8 s auto-close unchanged (EXP_MS 8000), also while keyboard focus holds the card painted', () => {
    expect(EXP_MS).toBe(8000);
    vi.useFakeTimers(); const geo = sheet(); showTracksExplainer(game() as any); key('Tab', true); ok().focus(); scrollTo(geo, 200);
    vi.advanceTimersByTime(EXP_MS - 21); expect(document.querySelector('.tracks-exp')).not.toBeNull();
    vi.advanceTimersByTime(1); expect(document.querySelector('.tracks-exp')).toBeNull();
  });
  it('QA-PRERUN-1 off(): the focus/modality listeners go with the card (no re-place after close)', () => {
    vi.useFakeTimers(); const geo = sheet(); const el = showTracksExplainer(game() as any)!; frame(); const before = el.dataset.place; key('Escape');
    expect(el.isConnected).toBe(false); scrollTo(geo, 200); key('Tab'); pointer(); el.dispatchEvent(new FocusEvent('focusin')); frame();
    expect(el.dataset.place).toBe(before);
  });
});
