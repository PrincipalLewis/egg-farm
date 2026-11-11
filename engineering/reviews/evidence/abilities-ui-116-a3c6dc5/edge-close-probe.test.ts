// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../../wt-review-116-a3c6dc5/src/game';
import { mem } from '../../../wt-review-116-a3c6dc5/tests/helpers';
import { clearSheets, anySheetOpen } from '../../../wt-review-116-a3c6dc5/src/ui/overlay';
import { initialState, type GameState } from '../../../wt-review-116-a3c6dc5/src/sim/state';
import { serialize, SAVE_KEY } from '../../../wt-review-116-a3c6dc5/src/save/save';
import { balance } from '../../../wt-review-116-a3c6dc5/src/config/balance';
import type { Balance } from '../../../wt-review-116-a3c6dc5/src/config/balance';

const NOW = 1760000000500;

function B(): Balance {
  return {
    ...balance,
    m4: { ...balance.m4!, flags: { ...balance.m4!.flags, abilities: 1 },
      tc: { ...balance.m4!.tc!, ability_s: 30, ability_cd_s: 300, ability_unlock_farm: 10,
        ability_w1_price_mult: 1.15, ability_w2_lay_mult: 1.15, ability_w3_price_mult: 1.15, ability_w4_tier_add: 0.5 } },
  } as Balance;
}

async function mount(docked0 = false) {
  let docked = docked0;
  const listeners: Array<() => void> = [];
  window.matchMedia = ((q: string) => ({
    get matches() { return q.includes('min-width:960px') && docked; },
    media: q, addEventListener(_: string, f: () => void) { listeners.push(f); },
    removeEventListener() {}, addListener() {}, removeListener() {},
  })) as any;
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number) as any;
  const b = B();
  const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
  const base = {
    ...initialState(b), tracksV7: 1, seenTracksExplainer: true, farmLevel: 10, coinsCents: 1e9,
    workers: { market_hand: { energy: 100, cdS: 0 }, coop_hand: { energy: 100, cdS: 0 }, hawker: { energy: 100, cdS: 0 } },
  } as GameState;
  kv.setItem(SAVE_KEY, serialize(base, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: false }));
  const g = new Game(b, kv, () => NOW);
  g.state = { ...g.state, ...base } as GameState;
  const spy = vi.spyOn(g, 'setAttendedProbe');
  const { mountApp } = await import('../../../wt-review-116-a3c6dc5/src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  document.getElementById('modal-layer')?.remove();
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  const probe = spy.mock.calls[0][0] as () => boolean;
  ui.openPanel('upgrades');
  (document.querySelector('.tabs button[data-tab="workers"]') as HTMLElement | null)?.click();
  ui.render();
  return { g, ui, probe, setDocked: (v: boolean) => { docked = v; listeners.forEach(f => f()); } };
}

beforeEach(() => { clearSheets(); document.body.innerHTML = ''; });
afterEach(() => { clearSheets(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('Architect edge: reopen / docked mid-close', () => {
  it('reopen upgrades while close pending does not leave stale transitionend hiding sheet', async () => {
    const { ui, probe } = await mount(false);
    const btn = document.querySelector('[data-testid="call-market_hand"]') as HTMLButtonElement;
    btn.click();
    expect(anySheetOpen()).toBe(true);
    expect(probe()).toBe(false);
    // Reopen while closing (Architect cancel/reopen case)
    ui.openPanel('upgrades');
    expect(document.getElementById('p-upgrades')?.hidden).toBe(false);
    // Simulate delayed transitionend from the interrupted close
    const sheet = document.getElementById('p-upgrades')!;
    sheet.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform', bubbles: true }));
    // If stale listener still armed, sheet would hide / freeze drop while open===upgrades
    const hidden = document.getElementById('p-upgrades')?.hidden;
    const sheets = anySheetOpen();
    const attended = probe();
    // Record outcomes for Architect ruling (expectations document actual hazard)
    console.log(JSON.stringify({ afterReopenThenTransitionend: { hidden, sheets, attended, openClass: document.getElementById('panel-layer')?.classList.contains('open') } }));
    // Desired: sheet stays usable (not hidden) and attendance frozen by open upgrades OR sheets cleared cleanly with open panel
    expect(hidden).toBe(false);
  });

  it('docked media change mid-close must not leave dangling freeze without transitionend', async () => {
    const { ui, probe, setDocked } = await mount(false);
    const btn = document.querySelector('[data-testid="call-market_hand"]') as HTMLButtonElement;
    btn.click();
    expect(anySheetOpen()).toBe(true);
    expect(probe()).toBe(false);
    // Rotate to docked: CSS transform:none!important — no transitionend expected
    setDocked(true);
    // Wait a turn; without handler, freeze may linger
    await new Promise(r => setTimeout(r, 50));
    const sheets = anySheetOpen();
    const attended = probe();
    console.log(JSON.stringify({ afterDockedMidClose: { sheets, attended } }));
    // Desired: no dangling freeze
    expect(sheets).toBe(false);
    expect(attended).toBe(true);
  });
});
