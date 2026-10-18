// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

// jsdom gaps only (no app logic stubbed): matchMedia, rAF, Audio play.
beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (id: number) => clearTimeout(id);
});

async function mount() {
  const [{ mountApp }, { Game }, { balance }] = await Promise.all([import('../src/ui/app'), import('../src/game'), import('../src/config/balance')]);
  document.body.innerHTML = '<div id="app"></div>'; localStorage.clear();
  const g = new Game(balance, localStorage, () => Date.now(), 1, 'test');
  g.state.coinsCents = 1e12; // rich enough that every buy succeeds
  const audio = { enabled: false, play() {}, unlock() {} } as any;
  const ui = mountApp(document.getElementById('app')!, g, balance, audio, 'test', { newGame: false });
  const dispatch = vi.spyOn(g, 'dispatch');
  ui.openPanel('upgrades'); (document.querySelector('[data-tab=farm]') as HTMLElement).click(); ui.render();
  const btn = document.querySelector<HTMLButtonElement>('#uRow button.buy[data-kind=farm]')!;
  expect(btn).toBeTruthy(); btn.focus(); expect(document.activeElement).toBe(btn);
  const buys = () => dispatch.mock.calls.filter(([a]) => a.type === 'buyFarm').length;
  // Native model: Enter activates on each un-prevented keydown; Space activates once on keyup unless its first keydown was prevented.
  // The Buy button is re-rendered after a purchase, so always target the live, focused one.
  const live = () => { const b = document.querySelector<HTMLButtonElement>('#uRow button.buy[data-kind=farm]')!; b.focus(); return b; };
  let spaceBlocked = false;
  const key = (k: string, repeat = false) => { const t = live(); const ev = new KeyboardEvent('keydown', { key: k, repeat, bubbles: true, cancelable: true });
    t.dispatchEvent(ev); if (!ev.defaultPrevented && k === 'Enter') t.click(); if (k === ' ' && !repeat) spaceBlocked = ev.defaultPrevented; return ev; };
  const keyup = (k: string) => { const t = live(); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); if (k === ' ' && !spaceBlocked) t.click(); };
  return { btn, buys, key, keyup, ui };
}

describe('PL-1 keyboard guard (real app.ts wiring)', { timeout: 30_000 }, () => {
  it('Escape on a focused Farm buy button never buys and closes the panel', async () => {
    const { buys, key } = await mount();
    const layer = document.querySelector('#p-upgrades')!.closest('.open');
    expect(layer).toBeTruthy();
    const ev = key('Escape');
    expect(ev.defaultPrevented).toBe(true); expect(buys()).toBe(0);
    expect(document.querySelector('#p-upgrades')!.closest('.open')).toBeNull();
  });
  it('a held Enter (repeat keydowns) buys exactly once', async () => {
    const { buys, key } = await mount();
    key('Enter'); expect(buys()).toBe(1);
    for (let i = 0; i < 5; i++) expect(key('Enter', true).defaultPrevented).toBe(true);
    expect(buys()).toBe(1);
  });
  it('a held Space (repeat keydowns) buys exactly once', async () => {
    const { buys, key, keyup } = await mount();
    key(' '); for (let i = 0; i < 5; i++) expect(key(' ', true).defaultPrevented).toBe(true); keyup(' ');
    expect(buys()).toBe(1);
  });
  it('a single click buys exactly once', async () => {
    const { btn, buys } = await mount();
    btn.click(); expect(buys()).toBe(1);
  });
});
