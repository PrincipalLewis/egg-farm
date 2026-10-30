// @vitest-environment jsdom
// CCR rcv5-vs-main-1a61b36 F-2 (D-HOE-20261030-08, reworked on F6 per D-HOE-20261030-15; must land before the streak flag flips):
//  (1) the Market previews (order-card Sell buttons, Sell all) used saleValueCents/sellAllPreview's default PLAYER_SALE ctx while
//      Game.dispatch credits with playerSaleCtx(attendedNow()): preview != credit whenever the player is not attended;
//  (2) Game.setAttendedProbe must be installed by the UI, ONCE: F6's overlay.wireAttended is the single probe,
//      visible && focused && !dialogOpen(), dialogOpen = DIALOG_SEL modal (settings/welcome/confirm, recovery, rotate prompt,
//      alertdialog) | tracks explainer | Upgrades sheet. The Market sheet is a play surface (Q-F1c-1, D-HOP-2026-10-29-06).
// ACs (V5SCAP): CCR-F2-1 previews use playerSaleCtx (preview == credit through Game); CCR-F2-2 one probe installed by mountApp;
// CCR-F2-3 probe excludes open dialogs, Market sheet attended; CCR-F2-4 no second probe in src.
// Menu-freeze ACs this probe serves (focus time = 0 while a menu/modal is open, so M5 timers freeze): ST-AC13 (streak decay/hold),
// GE-AC19 (golden egg life), BH-AC9 (Broody nest growth); GE-AC20 (docked/phone Market sheet keeps the focus clock).
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { balance, type Balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { saleValueCents, sellAllPreview } from '../src/sim/payout';
import { salePriceCents } from '../src/sim/tracks';
import { graderMult } from '../src/sim/workers';
import { SALE_EFFECTS, PLAYER_SALE, playerSaleCtx, type SaleEffect } from '../src/sim/effects';
import { sellAllLabel, orderView } from '../src/ui/orders';
import { fmtCountFloor, fmtMoneyFloor } from '../src/ui/format';
import { attendedProbe, makeDialogOpen, wireAttended, registerSheet, clearSheets, anySheetOpen, type AttendedDoc } from '../src/ui/overlay';
import { showTracksExplainer, EXP_OUT_MS } from '../src/ui/tracks-explainer';
import { Game } from '../src/game';
import { mem } from './helpers';

// Records each sim tick's focus seconds at the stepTimers() seam (same seam as tests/v5-f1b-focus-wiring.test.ts); behaviour unchanged.
const rec = vi.hoisted(() => ({ f: [] as number[] }));
vi.mock('../src/sim/timers', async (orig) => {
  const m = await orig<typeof import('../src/sim/timers')>(); const c = await import('../src/sim/clock');
  return { ...m, stepTimers: (...a: Parameters<typeof m.stepTimers>) => { rec.f.push(c.tickFocusS(a[1], a[3])); return m.stepTimers(...a); } };
});
const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);

const B = (flags?: Partial<Record<M5Flag, number>>) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, ...(flags ? { flags: { ...(balance.m4 as any).flags, ...flags } } : {}) } }) as Balance;
// Fixture effects (test inputs, not tunables), same shapes as tests/v5-f1c-effects.test.ts: Frenzy-like x2, streak-like x1.28.
const frenzy: SaleEffect = { id: 'frenzy', flag: 'golden', factor: () => 2 };
const streak: SaleEffect = { id: 'streak', flag: 'streak', factor: () => 1.28 };
const SALE = SALE_EFFECTS as SaleEffect[]; // test-only fixture seam, as tests/v5-f1c-effects.test.ts (registries are readonly in src)
const farm = (b: Balance): GameState => ({ ...initialState(b, 3), farmLevel: 12, hensLevel: 12, eggValueLevel: 12, graderTier: 2, basket: 500, coinsCents: 0,
  workers: { grader: { energy: 100, cdS: 0 }, market_hand: { energy: 100, cdS: 0 } },
  customers: [{ id: 1, demand: 10, filled: 0, waitedS: 0 }, { id: 2, demand: 7, filled: 0, waitedS: 0 }] });

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
  (Element.prototype as any).animate ??= () => ({ finished: Promise.resolve(), cancel() {}, onfinish: null, addEventListener() {} });
});
beforeEach(() => { rec.f.length = 0; });
afterEach(() => { clearSheets(); SALE.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks(); delete (window as any).eggfarmQa; });
const setDoc = (vis: DocumentVisibilityState, focus: boolean) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(vis);
  vi.spyOn(document, 'hasFocus').mockReturnValue(focus);
};
const tick = () => new Promise(r => setTimeout(r, 30));
/** The real mountApp with golden+streak on and the fixture effects registered, Market sheet open. */
async function mountMarket(flags: Partial<Record<M5Flag, number>> = { golden: 1, streak: 1 }) {
  SALE.push(frenzy, streak);
  const b = B(flags), s0 = farm(b), clock = { t: Date.UTC(2026, 9, 30, 12) };
  const g = new Game(b as any, mem() as any, () => clock.t, 3, 'test');
  g.state = { ...s0 };
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('market'); ui.render(); await tick(); ui.render(); await tick(); ui.render();
  return { g, b, s0, ui, clock };
}
const sellRow = (id: number) => { const bt = document.querySelector<HTMLButtonElement>(`#mRows button[data-id="${id}"]`);
  expect(bt, `no sell button for order ${id}; #mRows = ${document.getElementById('mRows')?.innerHTML.slice(0, 400)}`).toBeTruthy(); return bt!; };
/** Shows the real tracks explainer card (one-time coach card) for a farm that has not seen it. */
const showExp = (b: Balance) => showTracksExplainer({ state: { ...initialState(b, 1), seenTracksExplainer: false }, balance: b, save() {}, canPersist: true } as any, document)!;
const sellAllText = () => document.querySelector<HTMLButtonElement>('#sellAll')!.textContent;
/** Focus seconds the sim got over n frames of 500 ms (each frame's focus is min(gap, 1 s) when attended, else 0). */
const focusOver = (g: Game, clock: { t: number }, n = 10) => { rec.f.length = 0; for (let i = 0; i < n; i++) { clock.t += 500; g.frame(); } return sum(rec.f); };

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

describe('CCR-F2-2: mountApp installs exactly one attended probe (overlay.wireAttended)', () => {
  it('CCR-F2-2 setAttendedProbe installed: mountApp calls it exactly once with a live probe', async () => {
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

describe('CCR-F2-3: the probe excludes open dialogs; the Market sheet is a play surface', () => {
  const doc = (vis: DocumentVisibilityState, focus: boolean, sel: string[] = []) =>
    ({ visibilityState: vis, hasFocus: () => focus, querySelector: (q: string) => sel.some(s => q.split(',').map(x => x.trim()).includes(s)) ? ({} as Element) : null }) as any;
  it('CCR-F2-3 attendedProbe: true iff visible && focused', () => {
    expect(attendedProbe(doc('visible', true))).toBe(true);
    expect(attendedProbe(doc('visible', false))).toBe(false);
    expect(attendedProbe(doc('hidden', true))).toBe(false);
  });
  it('CCR-F2-3 dialogOpen: DIALOG_SEL modal or any registered sheet until closeComplete; nothing else', () => {
    const dlg = makeDialogOpen({ doc: doc('visible', true) }), up = registerSheet('upgrades');
    expect(dlg()).toBe(false); up.opened(); expect(dlg()).toBe(true); up.closeComplete(); expect(dlg()).toBe(false);
    expect(makeDialogOpen({ doc: doc('visible', true, ['#modal-layer.open']) })()).toBe(true);
    expect(makeDialogOpen({ doc: doc('visible', true, ['.tracks-exp']) })()).toBe(false); // a bare .tracks-exp node is not the registered explainer
  });
  it('CCR-F2-3 wireAttended: probe = visible && focused && !dialogOpen, read live on every call', () => {
    let probe: (() => boolean) | null = null; let d = doc('visible', true); const up = registerSheet('upgrades');
    const live = { get visibilityState() { return d.visibilityState; }, hasFocus: () => d.hasFocus(), querySelector: (q: string) => d.querySelector(q) } as any;
    wireAttended({ setAttendedProbe: fn => { probe = fn; } }, makeDialogOpen({ doc: live }), live as AttendedDoc);
    expect(probe!()).toBe(true);
    up.opened(); expect(probe!()).toBe(false);
    up.closeComplete(); expect(probe!()).toBe(true);
    d = doc('visible', true, ['#modal-layer.open']); expect(probe!()).toBe(false);
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
    ui.openPanel('upgrades'); expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false));
    ui.openPanel(null); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    ui.openPanel('market'); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
  });
  it('CCR-F2-3 mounted: tracks explainer (registered sheet) => not attended from show, still while its close fade runs, attended after closeComplete', async () => {
    setDoc('visible', true);
    const { g, b } = await mountMarket();
    const el = showExp(b); expect(el).toBeTruthy();
    expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false));
    el.querySelector('button')!.click(); expect(document.querySelector('.tracks-exp')).toBeNull(); // the card left the DOM at once
    expect(g.playerSaleCtx()).toEqual(playerSaleCtx(false)); // still closing (fade copy on screen): counts as open
    await new Promise(r => setTimeout(r, EXP_OUT_MS + 60));
    expect(anySheetOpen()).toBe(false); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
  });
  it('CCR-F2-3 mounted: rotate prompt / alertdialog / recovery in the DOM (DIALOG_SEL) => not attended', async () => {
    setDoc('visible', true);
    const { g } = await mountMarket();
    for (const html of ['<div id="rotate-prompt"></div>', '<div role="alertdialog"></div>', '<div class="recovery-layer"></div>']) {
      const host = document.createElement('div'); host.innerHTML = html; document.body.appendChild(host);
      expect(g.playerSaleCtx(), html).toEqual(playerSaleCtx(false));
      host.remove(); expect(g.playerSaleCtx()).toEqual(PLAYER_SALE);
    }
  });
});

describe('ST-AC13 / GE-AC19 / BH-AC9: menus freeze the focus clock through the one probe (GE-AC20: Market sheet keeps it)', () => {
  it('ST-AC13 GE-AC19 BH-AC9 focus time accrues with the Market sheet open (GE-AC20) and is 0 while the settings modal is open', async () => {
    setDoc('visible', true);
    const { g, clock } = await mountMarket({ golden: 1, streak: 1, broody: 1 });
    expect(focusOver(g, clock)).toBeGreaterThan(0); // Market sheet = play surface
    document.querySelector<HTMLButtonElement>('#settings')!.click();
    expect(focusOver(g, clock)).toBe(0); // menu open: M5 timers frozen (streak decay/hold, golden life, nest growth)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(focusOver(g, clock)).toBeGreaterThan(0);
  });
  it('ST-AC13 GE-AC19 BH-AC9 focus time is 0 while the Upgrades sheet or the tracks explainer is open', async () => {
    setDoc('visible', true);
    const { g, ui, clock } = await mountMarket({ golden: 1, streak: 1, broody: 1 });
    ui.openPanel('upgrades'); expect(focusOver(g, clock)).toBe(0);
    ui.openPanel(null); expect(focusOver(g, clock)).toBeGreaterThan(0);
    const el = showExp(B({ golden: 1, streak: 1, broody: 1 })); expect(focusOver(g, clock)).toBe(0);
    el.querySelector('button')!.click(); expect(focusOver(g, clock)).toBe(0); // closing still counts as open
    await new Promise(r => setTimeout(r, EXP_OUT_MS + 60)); expect(focusOver(g, clock)).toBeGreaterThan(0);
  });
  it('ST-AC13 GE-AC19 BH-AC9 focus time is 0 while blurred or hidden', async () => {
    setDoc('visible', false);
    const { g, clock } = await mountMarket({ golden: 1, streak: 1, broody: 1 });
    expect(focusOver(g, clock)).toBe(0);
  });
});

describe('CCR-F2-4: one probe in src', () => {
  const files = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
  it('CCR-F2-4 no second probe: setAttendedProbe is called only inside overlay.wireAttended, and ui/attended.ts is gone', () => {
    const src = files(join(__dirname, '..', 'src'));
    const callers = src.filter(f => /\.setAttendedProbe\(/.test(readFileSync(f, 'utf8')));
    expect(callers.map(f => f.split(/[\\/]src[\\/]/)[1])).toEqual(['ui/overlay.ts']);
    expect(src.some(f => /[\\/]ui[\\/]attended(-probe)?\.ts$/.test(f))).toBe(false);
    const app = readFileSync(join(__dirname, '..', 'src', 'ui', 'app.ts'), 'utf8');
    expect(app.match(/wireAttended\(/g)?.length).toBe(1);
  });
});
