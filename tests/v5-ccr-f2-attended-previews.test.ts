// @vitest-environment jsdom
// CCR rcv5-vs-main-1a61b36 F-2 (D-HOE-20261030-08; must land before the streak flag flips). Two gaps, one PR:
//  (1) the Market previews (order-card Sell buttons, Sell all) used saleValueCents/sellAllPreview's default PLAYER_SALE ctx while
//      Game.dispatch credits with playerSaleCtx(attendedNow()): preview != credit whenever the player is not attended;
//  (2) Game.setAttendedProbe was never called, so attendedNow() was always false (player sales suspended, no focus time).
// Fix: previews take game.playerSaleCtx(); mountApp wires the probe: visible && focused && !dialogOpen(), where dialogOpen() =
// a DIALOG_SEL modal (settings/welcome/confirm, recovery, rotate prompt, alertdialog), the tracks explainer, or the Upgrades sheet.
// The Market sheet is a play surface and never counts as a dialog (Q-F1c-1, D-HOP-2026-10-29-06; API sheet L79; F6 design).
// ACs (V5SCAP): CCR-F2-1 previews use playerSaleCtx (preview == credit through Game, attended and not);
// CCR-F2-2 setAttendedProbe installed by mountApp (live read; attended => uplift credited);
// CCR-F2-3 probe excludes open dialogs (modal, explainer, Upgrades sheet, rotate/alertdialog), Market sheet stays attended.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { saleValueCents, sellAllPreview } from '../src/sim/payout';
import { salePriceCents } from '../src/sim/tracks';
import { graderMult } from '../src/sim/workers';
import { SALE_EFFECTS, PLAYER_SALE, playerSaleCtx, type SaleEffect } from '../src/sim/effects';
import { sellAllLabel, orderView } from '../src/ui/orders';
import { fmtCountFloor, fmtMoneyFloor } from '../src/ui/format';
import { pageAttended, dialogOpenNow, wireAttended, type AttendedDoc } from '../src/ui/attended-probe';
import { Game } from '../src/game';
import { mem } from './helpers';

const B = (flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as Balance;
// Fixture effects (test inputs, not tunables), same shapes as tests/v5-f1c-effects.test.ts: Frenzy-like x2, streak-like x1.28.
const frenzy: SaleEffect = { id: 'frenzy', flag: 'golden', factor: () => 2 };
const streak: SaleEffect = { id: 'streak', flag: 'streak', factor: () => 1.28 };
const farm = (b: Balance): GameState => ({ ...initialState(b, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, graderTier: 2, basket: 500, coinsCents: 0,
  workers: { grader: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } },
  customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }, { id: 2, demand: 7, filled: 0, waitedS: 0 }] });

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).animate ??= () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} });
});
afterEach(() => { SALE_EFFECTS.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks(); });
/** Drive the real jsdom document: visibilityState getter + hasFocus(). */
const setDoc = (vis: DocumentVisibilityState, focus: boolean) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(vis);
  vi.spyOn(document, 'hasFocus').mockReturnValue(focus);
};
const tick = () => new Promise(r => setTimeout(r, 30));
/** The real mountApp with golden+streak on and the fixture effects registered, Market sheet open. */
async function mountMarket(flags: Partial<Record<M5Flag, number>> = { golden: 1, streak: 1 }) {
  SALE_EFFECTS.push(frenzy, streak);
  const b = B(flags), s0 = farm(b);
  const g = new Game(b as any, mem() as any, () => Date.UTC(2026, 9, 30, 12), 3, 'test');
  g.state = { ...s0 };
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('market'); ui.render(); await tick(); ui.render(); await tick(); ui.render();
  return { g, b, s0, ui };
}
const sellRow = (id: number) => { const bt = document.querySelector<HTMLButtonElement>(`#mRows button[data-id="${id}"]`);
  expect(bt, `no sell button for order ${id}; #mRows = ${document.getElementById('mRows')?.innerHTML.slice(0, 400)}`).toBeTruthy(); return bt!; };
const sellAllText = () => document.querySelector<HTMLButtonElement>('#sellAll')!.textContent;

describe('CCR-F2-1: Market previews use Game.playerSaleCtx() (preview == credit through Game.dispatch)', () => {
  for (const [label, vis, focus, attended] of [['attended (visible+focused)', 'visible', true, true], ['not attended (blurred)', 'visible', false, false], ['not attended (hidden)', 'hidden', true, false]] as const) {
    it(`CCR-F2-1 sale preview uses playerSaleCtx: Sell all label == sellAll credit, ${label}`, async () => {
      setDoc(vis, focus);
      const { g, b, s0, ui } = await mountMarket();
      const ctx = playerSaleCtx(attended); expect(g.playerSaleCtx()).toEqual(ctx);
      const pv = sellAllPreview(s0, b, ctx);
      expect(sellAllText()).toBe(sellAllLabel(pv.eggs, pv.cents, fmtCountFloor, fmtMoneyFloor));
      document.querySelector<HTMLButtonElement>('#sellAll')!.click(); ui.render();
      expect(g.state.coinsCents - s0.coinsCents).toBe(pv.cents); // preview == credit, to the cent
      const base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b), m = attended ? 2 * 1.28 : 1;
      expect(pv.cents).toBe(Math.round(10 * base * gm * m) + Math.round(7 * base * gm * m));
    });
    it(`CCR-F2-1 sale preview uses playerSaleCtx: order-card Sell button == sell credit, ${label}`, async () => {
      setDoc(vis, focus);
      const { g, b, s0 } = await mountMarket();
      const ctx = playerSaleCtx(attended), unit = (k: number) => saleValueCents(s0, k, b, ctx);
      const c = s0.customers[0], bt = sellRow(c.id);
      expect(bt.getAttribute('aria-label')).toBe(orderView(c, Math.floor(s0.basket), unit).buttonAria);
      bt.click();
      expect(g.state.coinsCents - s0.coinsCents).toBe(unit(c.demand));
    });
  }
  it('CCR-F2-1 sale preview uses playerSaleCtx: attended and suspended previews differ with a live effect (the gap F-2 closes)', async () => {
    setDoc('visible', false);
    const { b, s0 } = await mountMarket();
    expect(sellAllPreview(s0, b, playerSaleCtx(false)).cents).toBeLessThan(sellAllPreview(s0, b, PLAYER_SALE).cents);
    const pv = sellAllPreview(s0, b, PLAYER_SALE); // the old default ctx must NOT be what the label shows while not attended
    expect(sellAllText()).not.toBe(sellAllLabel(pv.eggs, pv.cents, fmtCountFloor, fmtMoneyFloor));
  });
});

describe('CCR-F2-2: mountApp installs Game.setAttendedProbe', () => {
  it('CCR-F2-2 setAttendedProbe installed: mountApp calls it once with a live probe', async () => {
    const spy = vi.spyOn(Game.prototype, 'setAttendedProbe');
    setDoc('visible', true);
    const { g } = await mountMarket();
    expect(spy).toHaveBeenCalledTimes(1);
    const probe = spy.mock.calls[0][0];
    expect(probe()).toBe(true); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    vi.spyOn(document, 'hasFocus').mockReturnValue(false); expect(probe()).toBe(false); expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false));
    vi.spyOn(document, 'hasFocus').mockReturnValue(true); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); expect(probe()).toBe(false);
  });
  it('CCR-F2-2 setAttendedProbe installed: attended sell from the open Market sheet keeps Frenzy/streak (not suspended)', async () => {
    setDoc('visible', true);
    const { g, b, s0 } = await mountMarket();
    sellRow(1).click();
    const base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b);
    expect(g.state.coinsCents - s0.coinsCents).toBe(Math.round(10 * base * gm * 2 * 1.28));
  });
  it('CCR-F2-2 setAttendedProbe installed: with every M5 flag off the probe is never read and credits are the flags-off credits', async () => {
    setDoc('visible', true);
    const { g, b, s0 } = await mountMarket({ golden: 0, streak: 0 });
    const hf = vi.spyOn(document, 'hasFocus');
    sellRow(1).click(); g.frame();
    expect(hf).not.toHaveBeenCalled(); // CCR N-1 #79: no DOM query per frame/dispatch while flags are off
    expect(g.state.coinsCents - s0.coinsCents).toBe(Math.round(10 * salePriceCents(s0, b) * graderMult(s0.workers, s0.graderTier, b)));
  });
});

describe('CCR-F2-3: the attended probe excludes open dialogs; the Market sheet is a play surface', () => {
  const doc = (vis: DocumentVisibilityState, focus: boolean, sel: string[] = []): AttendedDoc =>
    ({ visibilityState: vis, hasFocus: () => focus, querySelector: (q: string) => sel.some(s => q.split(',').map(x => x.trim()).includes(s)) ? ({} as Element) : null } as any);
  it('CCR-F2-3 pageAttended: true iff visible && focused', () => {
    expect(pageAttended(doc('visible', true))).toBe(true);
    expect(pageAttended(doc('visible', false))).toBe(false);
    expect(pageAttended(doc('hidden', true))).toBe(false);
  });
  it('CCR-F2-3 dialogOpenNow: Upgrades sheet counts, Market sheet and no sheet do not', () => {
    expect(dialogOpenNow('upgrades', doc('visible', true))).toBe(true);
    expect(dialogOpenNow('market', doc('visible', true))).toBe(false);
    expect(dialogOpenNow(null, doc('visible', true))).toBe(false);
  });
  it('CCR-F2-3 wireAttended: probe = visible && focused && !dialogOpen, read live on every call', () => {
    let probe: (() => boolean) | null = null; let sheet: 'market' | 'upgrades' | null = 'market'; let d = doc('visible', true);
    const live: AttendedDoc = { get visibilityState() { return d.visibilityState; }, hasFocus: () => d.hasFocus(), querySelector: (q: string) => d.querySelector(q) } as any;
    wireAttended({ setAttendedProbe: fn => { probe = fn; } }, () => sheet, live);
    expect(probe!()).toBe(true);
    sheet = 'upgrades'; expect(probe!()).toBe(false);
    sheet = null; expect(probe!()).toBe(true);
    d = doc('visible', true, ['#modal-layer.open']); expect(probe!()).toBe(false);
    d = doc('visible', true, ['.tracks-exp']); expect(probe!()).toBe(false);
    d = doc('visible', false); expect(probe!()).toBe(false);
  });
  it('CCR-F2-3 mounted: settings modal open => not attended; closed again => attended', async () => {
    setDoc('visible', true);
    const { g } = await mountMarket();
    expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    document.querySelector<HTMLButtonElement>('#settings')!.click();
    expect(document.getElementById('modal-layer')!.classList.contains('open')).toBe(true);
    expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('modal-layer')!.classList.contains('open')).toBe(false);
    expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
  });
  it('CCR-F2-3 mounted: Upgrades sheet open => not attended; Market sheet open => attended', async () => {
    setDoc('visible', true);
    const { g, ui } = await mountMarket();
    expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    ui.openPanel('upgrades'); expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false));
    ui.openPanel(null); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    ui.openPanel('market'); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
  });
  it('CCR-F2-3 mounted: tracks explainer / rotate prompt / alertdialog in the DOM => not attended', async () => {
    setDoc('visible', true);
    const { g } = await mountMarket();
    for (const html of ['<div class="tracks-exp"></div>', '<div id="rotate-prompt"></div>', '<div role="alertdialog"></div>', '<div class="recovery-layer"></div>']) {
      const host = document.createElement('div'); host.innerHTML = html; document.body.appendChild(host);
      expect(g.playerSaleCtx(), html).toEqual(playerSaleCtx(false));
      host.remove(); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    }
  });
});
