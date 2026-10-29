// @vitest-environment jsdom
// v5 F6a: the UI attended probe (API sheet §5, Q-F1c-1 D-HOP-2026-10-29-06). Attended = visible && focused; the Market
// sheet is a play surface, so player sales made in it keep Frenzy/streak. Hidden or blurred => suspended.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import type { M5Flag } from '../src/config/flags';
import { initialState, type GameState } from '../src/sim/state';
import { saleValueCents, sellAllPreview } from '../src/sim/payout';
import { salePriceCents } from '../src/sim/tracks';
import { graderMult } from '../src/sim/workers';
import { SALE_EFFECTS, saleEffectFactors, type SaleEffect } from '../src/sim/effects';
import { attendedProbe, wireAttendedProbe, type AttendedDoc } from '../src/ui/attended';
import { dialogOpen } from '../src/ui/onboarding';
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
});
afterEach(() => { SALE_EFFECTS.length = 0; document.body.innerHTML = ''; vi.restoreAllMocks(); });
/** Drive the real jsdom document: visibilityState getter + hasFocus(). */
const setDoc = (vis: DocumentVisibilityState, focus: boolean) => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(vis);
  vi.spyOn(document, 'hasFocus').mockReturnValue(focus);
};

describe('F6a attendedProbe: true iff visible && focused', () => {
  const doc = (visibilityState: DocumentVisibilityState, focus: boolean): AttendedDoc => ({ visibilityState, hasFocus: () => focus });
  it('visible + focused => true', () => { expect(attendedProbe(doc('visible', true))).toBe(true); });
  it('hidden => false (focused or not)', () => { expect(attendedProbe(doc('hidden', true))).toBe(false); expect(attendedProbe(doc('hidden', false))).toBe(false); });
  it('visible but blurred => false', () => { expect(attendedProbe(doc('visible', false))).toBe(false); });
  it('defaults to the live document and is re-read on every call (no cached state)', () => {
    setDoc('visible', true); expect(attendedProbe()).toBe(true);
    setDoc('hidden', true); expect(attendedProbe()).toBe(false);
    setDoc('visible', false); expect(attendedProbe()).toBe(false);
  });
  it('wireAttendedProbe installs a live probe on Game (default probe is () => false)', () => {
    let probe: (() => boolean) | null = null; const d = { visibilityState: 'visible' as DocumentVisibilityState, focus: true };
    wireAttendedProbe({ setAttendedProbe: fn => { probe = fn; } }, { get visibilityState() { return d.visibilityState; }, hasFocus: () => d.focus });
    expect(probe!()).toBe(true); d.focus = false; expect(probe!()).toBe(false); d.focus = true; d.visibilityState = 'hidden'; expect(probe!()).toBe(false);
  });
});

/** mountApp (the real wiring line) with golden+streak on and the fixture effects registered, Market sheet open. */
async function mountMarket() {
  SALE_EFFECTS.push(frenzy, streak);
  const b = B({ golden: 1, streak: 1 }), s0 = farm(b);
  const g = new Game(b as any, mem() as any, () => Date.UTC(2026, 9, 29, 12), 3, 'test');
  g.state = { ...s0 };
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.openPanel('market'); ui.render(); ui.render();
  return { g, b, s0, ui };
}
const expectSheetOpen = () => {
  expect(document.querySelector<HTMLElement>('#p-market')!.hidden).toBe(false);
  expect(document.getElementById('panel-layer')!.classList.contains('open')).toBe(true);
  expect(dialogOpen()).toBe(false); // the Market sheet is not a dialog (not in DIALOG_SEL)
};
const sellRow = (id: number) => document.querySelector<HTMLButtonElement>(`#mRows button[data-id="${id}"]`)!;

describe('F6a wired probe + Market sheet (flags on): player sales attended => Frenzy/streak apply', () => {
  it('sell from the open Market sheet while visible+focused is NOT suspended (credit == preview, frenzy+streak attributed)', async () => {
    setDoc('visible', true);
    const { g, b, s0 } = await mountMarket(); expectSheetOpen();
    expect(saleEffectFactors(s0, b)).toEqual([{ id: 'frenzy', factor: 2 }, { id: 'streak', factor: 1.28 }]);
    const row = sellRow(1); expect(row).toBeTruthy(); row.click();
    const k = 10, base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b);
    expect(g.state.coinsCents - s0.coinsCents).toBe(Math.round(k * base * gm * 2 * 1.28));
    expect(g.state.coinsCents - s0.coinsCents).toBe(saleValueCents(s0, k, b)); // sheet preview (attended ctx) == credit
    expectSheetOpen(); // selling does not close the sheet or turn it into a dialog
  });
  it('Sell all from the open Market sheet while visible+focused is NOT suspended (== sellAllPreview)', async () => {
    setDoc('visible', true);
    const { g, b, s0 } = await mountMarket(); expectSheetOpen();
    document.querySelector<HTMLButtonElement>('#sellAll')!.click();
    const k1 = 10, k2 = 7, base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b);
    const boosted = Math.round(k1 * base * gm * 2 * 1.28) + Math.round(k2 * base * gm * 2 * 1.28);
    expect(g.state.coinsCents - s0.coinsCents).toBe(sellAllPreview(s0, b).cents);
    expect(g.state.coinsCents - s0.coinsCents).toBe(boosted);
  });
});

describe('F6a wired probe (flags on): hidden or blurred => player sales suspended (no Frenzy/streak)', () => {
  for (const [vis, focus] of [['hidden', true], ['hidden', false], ['visible', false]] as const) {
    it(`sell + Sell all with visibilityState=${vis}, hasFocus=${focus} are suspended`, async () => {
      setDoc(vis, focus);
      const { g, b, s0 } = await mountMarket();
      const base = salePriceCents(s0, b), gm = graderMult(s0.workers, s0.graderTier, b);
      sellRow(1).click();
      expect(g.state.coinsCents - s0.coinsCents).toBe(Math.round(10 * base * gm));
      const mid = g.state.coinsCents; document.querySelector<HTMLButtonElement>('#sellAll')!.click();
      expect(g.state.coinsCents - mid).toBe(Math.round(7 * base * gm));
    });
  }
});
