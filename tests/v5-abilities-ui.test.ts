// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateAllState, activateAllHtml, activateAllName, fmtCd, ACTIVATE_ALL_TESTID,
  abilitiesUiOn, activateAllEligibility, callButtonState, callButtonHtml, CALL_NAME,
} from '../src/ui/abilities-ui';
import { apply } from '../src/sim/actions';
import { balance } from '../src/config/balance';
import type { Balance } from '../src/config/balance';
import type { GameState } from '../src/sim/state';
import { WORKERS } from '../src/sim/workers';
import { Game } from '../src/game';
import { mem } from './helpers';
import { clearSheets, anySheetOpen } from '../src/ui/overlay';
import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';

const NOW = 1_700_000_000_000;

function B(flags: Record<string, number> = {}, tc: Record<string, number> = {}): Balance {
  return {
    ...balance,
    m4: {
      ...balance.m4!,
      flags: { ...balance.m4!.flags, abilities: 0, ...flags },
      tc: { ...balance.m4!.tc!, ability_s: 30, ability_cd_s: 300, ability_unlock_farm: 10, ability_w1_price_mult: 1.15, ability_w2_lay_mult: 1.15, ability_w3_price_mult: 1.15, ability_w4_tier_add: 0.5, ...tc },
    },
  } as Balance;
}

function farm(over: Partial<GameState> = {}): GameState {
  return {
    farmLevel: 10, collectionLevel: 1, hensLevel: 1, eggValueLevel: 1, coinsCents: 1e9, coop: 0, basket: 0,
    customers: [], nextCustomerInS: 10, manageCdS: 0, graderTier: 1, celebratedTier: 0, celebratedMilestones: [],
    workers: {
      market_hand: { energy: 100, cdS: 0 },
      coop_hand: { energy: 100, cdS: 0 },
      hawker: { energy: 100, cdS: 0 },
    },
    pendingOfflineEggs: 0, ...over,
  } as GameState;
}

describe('AB-UI-1 flag off', () => {
  it('abilities=0: no chrome, no call buttons', () => {
    const b = B({ abilities: 0 }), s = farm();
    expect(abilitiesUiOn(s, b)).toBe(false);
    expect(callButtonState(s, 'market_hand', b, NOW)).toBeNull();
    expect(activateAllEligibility(s, b, NOW)).toEqual({ ready: 0 });
  });
});

describe('Activate-all Q8 compact/full [AC-M5A-8][AB-UI-7][AC-M5A-10]', () => {
  it('full labels when Refill hidden / not docked', () => {
    const ready = activateAllState({ readyCount: 3, docked: true, refillVisible: false });
    expect(ready.compact).toBe(false);
    expect(activateAllName(ready)).toBe('Shift calls (3)');
    const html = activateAllHtml(ready, '/assets/icon-bolt.svg');
    expect(html).toContain('Shift calls (3)');
    expect(html).not.toContain('is-compact');
    expect(html).toContain(`data-testid="${ACTIVATE_ALL_TESTID}"`);
    expect(html).not.toMatch(/aria-label=/);
  });
  it('compact N / 4:51 / — when docked + Refill visible; .sr-in carries exact name', () => {
    const ready = activateAllState({ readyCount: 2, docked: true, refillVisible: true });
    expect(ready.compact).toBe(true);
    let html = activateAllHtml(ready, '/x.svg');
    expect(html).toContain('is-compact');
    expect(html).toContain('aria-hidden="true">2<');
    expect(html).toContain('<span class="sr-in">Shift calls (2)</span>');
    expect(activateAllName(ready)).toBe('Shift calls (2)');

    const next = activateAllState({ readyCount: 0, nextCdS: 291, docked: true, refillVisible: true });
    expect(fmtCd(291)).toBe('4:51');
    expect(activateAllName(next)).toBe('Next call');
    html = activateAllHtml(next, '/x.svg');
    expect(html).toContain('data-cd=" 4:51"');
    expect(html).toContain('<span class="sr-in">Next call</span>');

    const none = activateAllState({ readyCount: 0, docked: true, refillVisible: true });
    expect(activateAllName(none)).toBe('No calls ready');
    html = activateAllHtml(none, '/x.svg');
    expect(html).toContain('—');
    expect(html).toContain('<span class="sr-in">No calls ready</span>');
  });
});

describe('Card call names [Art §5.6 / D2]', () => {
  it('Ready name is Call, Role with no space before comma; no aria-label', () => {
    const b = B({ abilities: 1 }), s = farm();
    const st = callButtonState(s, 'market_hand', b, NOW)!;
    expect(st.kind).toBe('ready');
    expect(st.name).toBe('Rush, Market Hand');
    expect(st.name).not.toMatch(/ ,/);
    const html = callButtonHtml(st, 'market_hand');
    expect(html).toContain('data-act="fireAbility"');
    expect(html).not.toMatch(/aria-label=/);
    expect(html).toContain('<span class="sr">, Market Hand</span>');
  });
  it('Active uses AbilityState.durS for progress semantics; name Active, Call, Role', () => {
    const b = B({ abilities: 1 });
    const s = farm({ abilities: { market_hand: { readyAt: NOW + 300_000, activeS: 21, durS: 45 } } });
    const st = callButtonState(s, 'market_hand', b, NOW)!;
    expect(st.kind).toBe('active');
    expect(st.name).toBe('Active, Rush, Market Hand');
    expect(st.cd).toBe('0:21');
  });
  it('Asleep / Unpaid / Paused exact names', () => {
    const b = B({ abilities: 1 });
    expect(callButtonState(farm({ workers: { market_hand: { energy: 0, cdS: 0 } } }), 'market_hand', b, NOW)!.name)
      .toBe('Asleep, Rush, Market Hand');
    expect(callButtonState(farm({ workers: { market_hand: { energy: 50, cdS: 0, unpaid: true } } }), 'market_hand', b, NOW)!.name)
      .toBe('Unpaid, Rush, Market Hand');
    const bp = B({ abilities: 1, pause: 1 });
    expect(callButtonState(farm({ workers: { market_hand: { energy: 80, cdS: 0, paused: true } } }), 'market_hand', bp, NOW)!.name)
      .toBe('Paused, Rush, Market Hand');
  });
});

describe('apply fireAbility / activateAll wiring', () => {
  it('fireAbility writes abilities[id].durS and never top-level abilityDurS', () => {
    const b = B({ abilities: 1 }), s = farm();
    const ev: any[] = [];
    const next = apply(s, { type: 'fireAbility', worker: 'market_hand', inSheet: false, nowMs: NOW }, b, ev);
    expect(next.abilities?.market_hand?.durS).toBe(30);
    expect(next.abilities?.market_hand?.activeS).toBe(30);
    expect((next as any).abilityDurS).toBeUndefined();
    expect(ev.some(e => e.type === 'ability_used' && e.combo === false && e.in_sheet === false)).toBe(true);
  });
  it('activateAll fires eligible workers via_all; no combo', () => {
    const b = B({ abilities: 1 }), s = farm();
    const ev: any[] = [];
    const next = apply(s, { type: 'activateAll', inSheet: true, nowMs: NOW }, b, ev);
    const used = ev.filter(e => e.type === 'ability_used');
    expect(used.length).toBeGreaterThanOrEqual(3);
    expect(used.every(e => e.via_all === true && e.combo === false)).toBe(true);
    expect(next.abilities?.market_hand?.durS).toBe(30);
  });
  it('blocked fireAbility emits ability_blocked and keeps state identity', () => {
    const b = B({ abilities: 1 });
    const s = farm({ workers: { market_hand: { energy: 0, cdS: 0 } } });
    const ev: any[] = [];
    const next = apply(s, { type: 'fireAbility', worker: 'market_hand', inSheet: false, nowMs: NOW }, b, ev);
    expect(next).toBe(s);
    expect(ev).toEqual([{ type: 'ability_blocked', worker: 'market_hand', reason: 'asleep', count: 1 }]);
  });
});

describe('CALL_NAME map', () => {
  it('maps all four workers', () => {
    expect(CALL_NAME.market_hand).toBe('Rush');
    expect(CALL_NAME.coop_hand).toBe('Sweep');
    expect(CALL_NAME.hawker).toBe('Shout');
    expect(CALL_NAME.grader).toBe('Inspect');
    expect(WORKERS.every(id => !!CALL_NAME[id])).toBe(true);
  });
});

// --- Architect CHANGES @ dc3c60f: sheetCloseComplete hold + ability_blocked from aria-disabled ---

function balAbilities(): Balance {
  return B({ abilities: 1 });
}

async function mountAbilitiesUi(over: Partial<GameState> = {}) {
  let docked = false;
  const listeners: Array<() => void> = [];
  window.matchMedia = ((q: string) => ({
    get matches() { return q.includes('min-width:960px') && docked; },
    media: q,
    addEventListener(_: string, f: () => void) { listeners.push(f); },
    removeEventListener() {}, addListener() {}, removeListener() {},
  })) as any;
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  // Keep rAF async-ish so sheetCloseComplete is not auto-stepped mid-assert.
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number) as any;
  const b = balAbilities();
  const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
  const base = {
    ...initialState(b),
    tracksV7: 1,
    seenTracksExplainer: true,
    farmLevel: 10,
    coinsCents: 1e9,
    workers: {
      market_hand: { energy: 100, cdS: 0 },
      coop_hand: { energy: 100, cdS: 0 },
      hawker: { energy: 100, cdS: 0 },
    },
    ...over,
  } as GameState;
  kv.setItem(SAVE_KEY, serialize(base, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false, reducedMotion: false }));
  const g = new Game(b, kv, () => 1760000000500);
  g.state = { ...g.state, ...base } as GameState;
  const spy = vi.spyOn(g, 'setAttendedProbe');
  const tracked: Array<{ type: string; rest: Record<string, unknown> }> = [];
  const origTrack = g.telemetry.track.bind(g.telemetry);
  g.telemetry.track = ((type: string, rest: Record<string, unknown> = {}) => {
    tracked.push({ type, rest });
    return origTrack(type, rest);
  }) as typeof g.telemetry.track;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  document.getElementById('modal-layer')?.remove();
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  const probe = spy.mock.calls[0][0] as () => boolean;
  ui.openPanel('upgrades');
  (document.querySelector('.tabs button[data-tab="workers"]') as HTMLElement | null)?.click();
  ui.render();
  return { g, ui, b, probe, tracked, setDocked: (v: boolean) => { docked = v; listeners.forEach(f => f()); } };
}

beforeEach(() => { clearSheets(); document.body.innerHTML = ''; });
afterEach(() => { clearSheets(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('AB-14 / AC-M5A-22 sheetCloseComplete hold [Architect CHANGES]', () => {
  it('fireAbility from portrait sheet keeps attendance frozen until sheetCloseComplete', async () => {
    const { g, ui, probe } = await mountAbilitiesUi();
    expect(probe()).toBe(false); // upgrades open
    const btn = document.querySelector('[data-testid="call-market_hand"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-disabled')).not.toBe('true');
    btn.click();
    expect(g.state.abilities?.market_hand?.activeS).toBeGreaterThan(0);
    expect(probe()).toBe(false); // still frozen while closing
    expect(anySheetOpen()).toBe(true);
    expect(document.getElementById('p-upgrades')?.hidden).toBe(false);
    ui.sheetCloseComplete();
    expect(anySheetOpen()).toBe(false);
    expect(probe()).toBe(true);
    expect(document.getElementById('p-upgrades')?.hidden).toBe(true);
  });

  it('activateAll from portrait sheet keeps freeze until sheetCloseComplete', async () => {
    const { g, ui, probe } = await mountAbilitiesUi();
    const btn = document.querySelector(`[data-testid="${ACTIVATE_ALL_TESTID}"]`) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(Object.values(g.state.abilities ?? {}).some(a => (a?.activeS ?? 0) > 0)).toBe(true);
    expect(probe()).toBe(false);
    expect(anySheetOpen()).toBe(true);
    ui.sheetCloseComplete();
    expect(probe()).toBe(true);
    expect(anySheetOpen()).toBe(false);
  });
});

describe('ability_blocked from aria-disabled chrome [Architect CHANGES]', () => {
  it('asleep call button still dispatches and emits ability_blocked', async () => {
    const { g, tracked } = await mountAbilitiesUi({
      workers: {
        market_hand: { energy: 0, cdS: 0 },
        coop_hand: { energy: 100, cdS: 0 },
        hawker: { energy: 100, cdS: 0 },
      },
    });
    const btn = document.querySelector('[data-testid="call-market_hand"]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    const before = g.state;
    btn.click();
    expect(g.state).toBe(before);
    expect(tracked.some(e => e.type === 'ability_blocked' && e.rest.worker === 'market_hand' && e.rest.reason === 'asleep')).toBe(true);
  });
});
