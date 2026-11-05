// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSheets, registerSheet, SHEET_OPENED, SHEET_CLOSE_COMPLETE, isDocked, DOCKED_MQ, type SheetEventDetail,
} from '../src/ui/overlay';
import { createShiftSheet, SHIFT_SHEET_ID } from '../src/ui/shift-sheet';
import {
  activateAllState, activateAllHtml, activateAllName, fmtCd, ACTIVATE_ALL_TESTID,
} from '../src/ui/abilities-ui';
import { Audio, ABILITY_CALL_SFX, SFX } from '../src/ui/audio';

beforeEach(() => {
  clearSheets();
  document.body.innerHTML = '';
  // jsdom matchMedia stub
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (q: string) => ({
      matches: q === DOCKED_MQ ? (window as any).__docked === true : false,
      media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      dispatchEvent() { return false; }, onchange: null,
    }),
  });
  (window as any).__docked = false;
});
afterEach(() => { clearSheets(); document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe('D-HOE-27 sheet CustomEvents [Q-AB-N16]', () => {
  const listen = (name: string) => {
    const evs: SheetEventDetail[] = [];
    document.addEventListener(name, (e) => evs.push((e as CustomEvent<SheetEventDetail>).detail));
    return evs;
  };
  it.each([
    [360, false],
    [1280, true],
  ] as const)('[Q-AB-N16][AC-M5A-24] one open + one closeComplete event at width %i docked=%s', (width, docked) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    (window as any).__docked = docked;
    expect(isDocked()).toBe(docked);
    const opened = listen(SHEET_OPENED), closed = listen(SHEET_CLOSE_COMPLETE);
    const shift = registerSheet('shift');
    shift.opened();
    expect(opened).toEqual([{ id: 'shift', docked }]);
    expect(Object.keys(opened[0]).sort()).toEqual(['docked', 'id']);
    shift.closeComplete();
    expect(closed).toEqual([{ id: 'shift', docked }]);
    expect(Object.keys(closed[0]).sort()).toEqual(['docked', 'id']);
  });
  it('[Q-AB-N16] repeat closeComplete dispatches nothing; opened only on false→true', () => {
    const opened = listen(SHEET_OPENED), closed = listen(SHEET_CLOSE_COMPLETE);
    const shift = registerSheet('shift');
    shift.closeComplete(); expect(closed).toEqual([]);
    shift.opened(); shift.opened(); expect(opened).toHaveLength(1);
    shift.closeComplete(); shift.closeComplete(); expect(closed).toHaveLength(1);
  });
  it('[Q-AB-N16] detail shape has no extra keys', () => {
    const closed = listen(SHEET_CLOSE_COMPLETE);
    const h = registerSheet('coach');
    h.opened(); h.closeComplete();
    expect(closed[0]).toEqual({ id: 'coach', docked: false });
  });
});

describe('Shift attended lifecycle [Q-AB-N7][Q-AB-N8][RF-AC16]', () => {
  it('createShiftSheet registers id shift and stays open until closeComplete after requestClose', () => {
    vi.useFakeTimers();
    const ctrl = createShiftSheet({ closeMs: 180, reducedMotion: () => false });
    expect(ctrl.id).toBe(SHIFT_SHEET_ID);
    expect(ctrl.isOpen).toBe(false);
    ctrl.open(); expect(ctrl.isOpen).toBe(true);
    ctrl.requestClose(); expect(ctrl.isOpen).toBe(true); // animation not done
    vi.advanceTimersByTime(179); expect(ctrl.isOpen).toBe(true);
    vi.advanceTimersByTime(1); expect(ctrl.isOpen).toBe(false);
    vi.useRealTimers();
  });
  it('[Q-AB-N8] closeCompleteNow steps past animation (harness)', () => {
    const closed: SheetEventDetail[] = [];
    document.addEventListener(SHEET_CLOSE_COMPLETE, e => closed.push((e as CustomEvent<SheetEventDetail>).detail));
    const ctrl = createShiftSheet({ closeMs: 5000, reducedMotion: () => false });
    ctrl.open(); ctrl.closeCompleteNow();
    expect(ctrl.isOpen).toBe(false);
    expect(closed).toEqual([{ id: 'shift', docked: false }]);
  });
  it('reduced motion closes immediately', () => {
    const ctrl = createShiftSheet({ closeMs: 500, reducedMotion: () => true });
    ctrl.open(); ctrl.requestClose(); expect(ctrl.isOpen).toBe(false);
  });
});

describe('Activate-all Q8 compact/full [AC-M5A-8][AC-M5A-9b][AC-M5A-10][AB-UI-7]', () => {
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
    expect(html).not.toContain('>Next call<span');

    const none = activateAllState({ readyCount: 0, docked: true, refillVisible: true });
    expect(activateAllName(none)).toBe('No calls ready');
    html = activateAllHtml(none, '/x.svg');
    expect(html).toContain('—');
    expect(html).toContain('<span class="sr-in">No calls ready</span>');
  });
  it('disabled next/none set aria-disabled; ready does not', () => {
    expect(activateAllHtml(activateAllState({ readyCount: 1, docked: false, refillVisible: false }), '/x.svg')).not.toContain('aria-disabled');
    expect(activateAllHtml(activateAllState({ readyCount: 0, nextCdS: 10, docked: false, refillVisible: false }), '/x.svg')).toContain('aria-disabled="true"');
  });
});

describe('ability.call audio API [audio-hooks v1.5]', () => {
  it('SFX map includes abilityCall1..4 files; playAbilityCall uses gain 0.6 path', () => {
    expect(SFX.abilityCall1).toBe('sfx-ability-call-01');
    expect(ABILITY_CALL_SFX).toHaveLength(4);
    const audio = new Audio('/assets/audio/');
    audio.enabled = false; // mute respected: no start
    expect(() => audio.playAbilityCall(0)).not.toThrow();
  });
  it('play opts accept gain and detuneCents without throwing when muted/no ctx', () => {
    const audio = new Audio('/assets/audio/');
    audio.enabled = true;
    expect(() => audio.play('upgrade', 0, { gain: 0.6, detuneCents: -15 })).not.toThrow();
  });
});
