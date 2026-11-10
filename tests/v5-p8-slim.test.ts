// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { Game } from '../src/game';
import { balance } from '../src/config/balance';
import { mem } from './helpers';
import { attendedProbe, clearSheets, registerSheet, anySheetOpen, openSheets, makeDialogOpen, wireAttended } from '../src/ui/overlay';

import { initialState } from '../src/sim/state';
import { serialize, SAVE_KEY } from '../src/save/save';

async function mountProbe() {
  let docked = false; const listeners: Array<() => void> = [];
  window.matchMedia = ((q: string) => ({
    get matches() { return q.includes('min-width:960px') && docked; },
    media: q,
    addEventListener(_: string, f: () => void) { listeners.push(f); },
    removeEventListener() {}, addListener() {}, removeListener() {},
  })) as any;
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as any;
  const kv = mem() as any; kv.removeItem = (k: string) => kv.m.delete(k);
  kv.setItem(SAVE_KEY, serialize({ ...initialState(balance), tracksV7: 1, seenTracksExplainer: true }, 1760000000000));
  kv.setItem('eggfarm.ui', JSON.stringify({ onboardingDone: true, workersIntroA: true, workersIntroB: true, sfx: false }));
  const g = new Game(balance, kv, () => 1760000000500);
  const spy = vi.spyOn(g, 'setAttendedProbe');
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, balance, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  const probe = spy.mock.calls[0][0] as () => boolean;
  const setDocked = (v: boolean) => { docked = v; listeners.forEach(f => f()); window.dispatchEvent(new Event('resize')); };
  return { probe, setDocked, ui, g };
}

beforeEach(() => { clearSheets(); document.body.innerHTML = ''; });
afterEach(() => { clearSheets(); document.body.innerHTML = ''; });
const visibleFocused = { visibilityState: 'visible' as DocumentVisibilityState, hasFocus: () => true };
const probe = (sheet: 'market' | 'upgrades' | null = null) => {
  let read = () => false;
  wireAttended({ setAttendedProbe(fn) { read = fn; } }, makeDialogOpen({ sheet: () => sheet }), visibleFocused);
  return () => read();
};

describe('slim sheet attendance API (not real Shift integration)', () => {
  it.each([375, 959, 960, 1024, 1280])('[RF-AC16][Q-AB-N7][gap6] registered sheet suspends through closeComplete at width %i', width => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    const read = probe(), shift = registerSheet('shift');
    expect(read()).toBe(true); expect(shift.isOpen).toBe(false);
    shift.opened(); expect(shift.isOpen).toBe(true); expect(anySheetOpen()).toBe(true); expect(read()).toBe(false);
    // Closing animation has not reported closeComplete yet; it must remain suspended.
    expect(read()).toBe(false);
    shift.closeComplete(); expect(read()).toBe(true); expect(shift.isOpen).toBe(false);
  });
  it('[Q-AB-N8][gap6] repeated open/close is safe and same-id handles share lifecycle', () => {
    const first = registerSheet('shift'), second = registerSheet('shift');
    first.opened(); second.opened(); expect(openSheets()).toEqual(['shift']); expect(second.isOpen).toBe(true);
    second.closeComplete(); first.closeComplete(); expect(anySheetOpen()).toBe(false);
  });
  it('[RF-AC16][Q-AB-N7] closing one of multiple sheets does not resume attendance', () => {
    const read = probe(), a = registerSheet('shift'), b = registerSheet('coach');
    a.opened(); b.opened(); expect(openSheets()).toEqual(['shift', 'coach']);
    a.closeComplete(); expect(read()).toBe(false); expect(openSheets()).toEqual(['coach']);
    b.closeComplete(); expect(read()).toBe(true);
  });
  it('[Q-AB-N7][Q-AB-N8][gap6] real Game player-sale context suspends and resumes through the shared probe', () => {
    const b = { ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, golden: 1 } } } as typeof balance;
    const g = new Game(b, mem(), () => 1793900000000, 7);
    wireAttended(g, makeDialogOpen({ sheet: () => 'market' }), visibleFocused);
    const shift = registerSheet('shift');
    expect(g.playerSaleCtx().suspended).toBeFalsy();
    shift.opened(); expect(g.playerSaleCtx().suspended).toBe(true);
    shift.closeComplete(); expect(g.playerSaleCtx().suspended).toBeFalsy();
  });
  it('[RF-AC16] test reset forgets sheet state', () => {
    registerSheet('test').opened(); clearSheets(); expect(openSheets()).toEqual([]); expect(anySheetOpen()).toBe(false);
  });
  it.each([['visible', true, true], ['hidden', true, false], ['visible', false, false], ['hidden', false, false]] as const)(
    '[RF-AC16][Q-AB-N8] visible=%s focused=%s attended=%s', (visibilityState, focused, expected) => {
      const doc = { visibilityState, hasFocus: () => focused };
      expect(attendedProbe(doc)).toBe(expected);
      let read = () => false;
      wireAttended({ setAttendedProbe(fn) { read = fn; } }, () => false, doc);
      expect(read()).toBe(expected);
    });
  it('[Q-AB-N7][gap6] wired probe rereads current focus, visibility and dialogs', () => {
    let focused = true, dialog = false;
    const doc = { visibilityState: 'visible' as DocumentVisibilityState, hasFocus: () => focused };
    let read = () => false;
    wireAttended({ setAttendedProbe(fn) { read = fn; } }, () => dialog, doc);
    expect(read()).toBe(true); focused = false; expect(read()).toBe(false);
    focused = true; dialog = true; expect(read()).toBe(false);
    dialog = false; doc.visibilityState = 'hidden'; expect(read()).toBe(false);
  });

  it('[RF-AC16][HoQA-F1] docked layout does not treat Upgrades as a dialog; registered sheets still suspend', () => {
    let docked = true, sheet: 'market' | 'upgrades' | null = 'upgrades';
    let read = () => false;
    wireAttended({ setAttendedProbe(fn) { read = fn; } }, makeDialogOpen({ sheet: () => sheet, docked: () => docked }), visibleFocused);
    expect(read()).toBe(true);
    const shift = registerSheet('shift'); shift.opened(); expect(read()).toBe(false);
    shift.closeComplete(); expect(read()).toBe(true);
    docked = false; expect(read()).toBe(false);
    sheet = null; expect(read()).toBe(true);
  });
  it('[RF-AC16][Q-AB-N8] Market stays a play surface; Upgrades remains a dialog', () => {
    expect(probe('market')()).toBe(true); expect(probe('upgrades')()).toBe(false);
    const shift = registerSheet('shift'); shift.opened(); expect(probe('market')()).toBe(false);
    shift.closeComplete(); expect(probe('market')()).toBe(true);
  });
  it.each(['<div id="modal-layer" class="open"></div>', '<div class="recovery-layer"></div>', '<div id="rotate-prompt"></div>', '<div role="alertdialog"></div>', '<div class="tracks-exp"></div>'])(
    '[RF-AC16] existing dialog source still suspends: %s', html => {
      document.body.innerHTML = html; expect(probe('market')()).toBe(false);
      document.body.innerHTML = ''; expect(probe('market')()).toBe(true);
    });
  it('[RF-AC16] app installs exactly one shared attended probe; F6 rebuild adds only the mount host (no audio engine, no feature registered in app.ts)', () => {
    const app = readFileSync(`${process.cwd()}/src/ui/app.ts`, 'utf8');
    expect(app.match(/wireAttended\(g,/g)).toHaveLength(1);
    // HoE/v5-f6-rebuild: app.ts gains exactly one mountOverlay(...) fed by the SAME dialogOpen closure as wireAttended, and the shared FxBudget.
    expect(app.match(/mountOverlay\(\{/g)).toHaveLength(1); expect(app).toMatch(/wireAttended\(g, attDialogOpen\)/); expect(app).toMatch(/dialogOpen: attDialogOpen/);
    expect(app.match(/new FxBudget\(/g)).toHaveLength(1); // QA-D-1110-F6-GUARDS (1): one FX budget, shared with overlay features
    expect(app).not.toMatch(/AudioHooks|registerFeature/);
    expect(app).toContain('data-testid="hens-pill"');
    expect(app).toContain('data-testid="docked-panel"');
    expect(app).toContain('data-testid="upgrades-panel"');
  });
  it('[RF-AC16] release guard rejects all eggfarmQa seams, existing QA telemetry remains compiled out', () => {
    const guard = readFileSync(`${process.cwd()}/scripts/check-release-build.mjs`, 'utf8');
    expect(guard).toContain("'eggfarmQa'");
    const main = readFileSync(`${process.cwd()}/src/main.ts`, 'utf8');
    expect(main).toContain('if (IOS_FLAG_ENABLED) (window as any).eggfarm = g');
  });
});

describe('slim attendance layout transitions (HoQA F1)', () => {
  it('[RF-AC16][HoQA-F1] mobile Upgrades -> docked resumes attendance', async () => {
    const { probe, setDocked, ui } = await mountProbe();
    ui.openPanel('upgrades'); expect(probe()).toBe(false);
    setDocked(true); expect(probe()).toBe(true);
  });
  it('[RF-AC16][HoQA-F1] docked -> mobile re-suspends when Upgrades was still open', async () => {
    const { probe, setDocked, ui } = await mountProbe();
    ui.openPanel('upgrades'); expect(probe()).toBe(false);
    setDocked(true); expect(probe()).toBe(true);
    setDocked(false); expect(probe()).toBe(false);
  });
  it('[RF-AC16][HoQA-F1] closing Upgrades during resize leaves attendance resumed', async () => {
    const { probe, setDocked, ui } = await mountProbe();
    ui.openPanel('upgrades'); expect(probe()).toBe(false);
    setDocked(true); expect(probe()).toBe(true);
    ui.openPanel(null); expect(probe()).toBe(true);
    setDocked(false); expect(probe()).toBe(true);
  });
  it('[RF-AC16][HoQA-F1][Q-AB-N7] registered sheet stays suspended at every width through closeComplete', async () => {
    const { probe, setDocked } = await mountProbe();
    const { registerSheet } = await import('../src/ui/overlay');
    const shift = registerSheet('shift');
    shift.opened(); expect(probe()).toBe(false);
    setDocked(true); expect(probe()).toBe(false);
    setDocked(false); expect(probe()).toBe(false);
    shift.closeComplete(); expect(probe()).toBe(true);
  });
});
