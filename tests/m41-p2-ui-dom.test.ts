// @vitest-environment jsdom
// v5 / M4.1 patch 2: DOM checks on the mounted app (jsdom). Layout/contrast/animation numbers are browser-measured in scripts/m41-p2-browser.mjs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';
import { Game } from '../src/game';
import { mem } from './helpers';
import { WARN_SVG } from '../src/ui/icons';

const on: Balance = { ...balance, m4: { ...balance.m4!, enabled: 1 } };
const kvOf = () => { const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k); return kv; };
let n = 0; const id = () => (++n).toString(16).padStart(16, '0');
export async function mount(o: Record<string, unknown>, b: Balance = on) {
  const kv = kvOf();
  kv.setItem(SAVE_KEY, serialize({ ...initialState(b), tracksV7: 1, seenTracksExplainer: true, ...o } as any, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(b, kv, () => 1760000000500 + n * 1000, undefined, 'dev', null, null, { idbBoot: 'absent', newId: id });
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  ui.render();
  return { g, ui };
}
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });
const W = (e: number, unpaid = false) => ({ energy: e, cdS: 5, ...(unpaid ? { unpaid: true } : {}) });

describe('m6 HUD #rate: static WARN_SVG + aria-hidden ▼ (UI-M6-1/5/6/8)', () => {
  const rate = () => { const e = document.getElementById('rate')!; return { e, text: e.textContent, tri: e.querySelector('.tri')!, rt: e.querySelector('.rt')!, svgs: e.querySelectorAll('svg.wi'), warn: e.classList.contains('warn'), aria: e.getAttribute('aria-label') }; };
  it('neg (Market Hand asleep, nothing else): no U+26A0 text, ▼ in .tri[aria-hidden], money in .rt, one svg.wi from WARN_SVG, aria unchanged', async () => {
    await mount({ farmLevel: 6, coinsCents: 1e6, customers: [], nextCustomerInS: 1e9, workers: { market_hand: W(0) } });
    const r = rate();
    expect(r.text).not.toContain('\u26A0'); expect(r.text!.startsWith('\u25BC')).toBe(true);
    expect(r.tri.getAttribute('aria-hidden')).toBe('true'); expect(r.tri.textContent).toBe('\u25BC '); expect(r.rt.textContent).toMatch(/^(\u2212)?\$\d+\.\d\d\/s$/);
    expect(r.svgs.length).toBe(1); expect(r.svgs[0].outerHTML.replace(/ xmlns="[^"]*"/, '')).toBe(WARN_SVG.replace(/ xmlns="[^"]*"/, '').replace(/\/>/g, '></path>').replace(/<circle([^>]*)><\/path>/, '<circle$1></circle>'));
    expect(r.svgs[0].getAttribute('aria-hidden')).toBe('true'); expect(r.svgs[0].getAttribute('focusable')).toBe('false');
    expect(r.warn).toBe(true); expect(r.aria).toMatch(/^Net income .* per second, sales stopped$/); // D-HOP-32 (a) suffix kept, byte form unchanged
  });
  it('pos: no .warn (icon hidden by CSS), .tri empty, text "+$X/s"', async () => {
    await mount({ farmLevel: 6, coinsCents: 1e6, collectionLevel: 5, workers: { market_hand: W(90), coop_hand: W(90) } });
    const r = rate(); expect(r.warn).toBe(false); expect(r.tri.textContent).toBe(''); expect(r.text).toMatch(/^\+\$/); expect(r.svgs.length).toBe(1);
  });
});
