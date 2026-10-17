import { describe, it, expect } from 'vitest';
import { coachStep, manageRearm, isUserScrollKey, GUARD_EVENTS, SCROLL_SETTLE_MS, autoScrollDelta, type StepIn } from '../src/ui/coach-place';
const base: StepIn = { autoScroll: true, reveal: false, shown: false, sheetOk: true, rowLaidOut: true, hasClip: true, settled: true, scrolledAt: 0, now: 10_000, guardOk: true, delta: 9, rowCut: false, revealed: false };
const S = (o: Partial<StepIn>) => coachStep({ ...base, ...o });
describe('rule D coachStep (review 4d3cc77 #1)', () => {
  it('settled + guard ok + room after scrolling -> scroll by delta', () => { expect(S({})).toEqual({ act: 'scroll', d: 9 }); });
  it('unsettled geometry (sheet sliding in) -> wait, never scroll or skip', () => { expect(S({ settled: false })).toEqual({ act: 'wait' }); expect(S({ settled: false, delta: null })).toEqual({ act: 'wait' }); });
  it('guard blocked (player scrolled < 1s ago) -> skip, no scroll', () => { expect(S({ guardOk: false })).toEqual({ act: 'skip' }); });
  it("can't fit even after scrolling -> skip", () => { expect(S({ delta: null })).toEqual({ act: 'skip' }); });
  it('after the scroll: wait until settled, then skip if still no fit', () => {
    expect(S({ scrolledAt: 10_000 - SCROLL_SETTLE_MS })).toEqual({ act: 'wait' });
    expect(S({ scrolledAt: 10_000 - SCROLL_SETTLE_MS - 1 })).toEqual({ act: 'skip' });
  });
  it('sheet closed / row not laid out / already shown -> wait (sheet closed is not a skipped visit)', () => {
    for (const o of [{ sheetOk: false }, { rowLaidOut: false }, { hasClip: false }, { shown: true }]) expect(S(o)).toEqual({ act: 'wait' });
  });
  it('Manage reveal: only before show, once, with the guard, when the row is cut off (ddace62 #5)', () => {
    const R = (o: Partial<StepIn>) => S({ autoScroll: false, reveal: true, rowCut: true, ...o });
    expect(R({})).toEqual({ act: 'reveal' });
    for (const o of [{ shown: true }, { revealed: true }, { guardOk: false }, { rowCut: false }]) expect(R(o)).toEqual({ act: 'wait' });
  });
});
describe('Manage re-arm, guard inputs', () => {
  it('re-arms only after the tired tip was seen, until Manage has shown, not while a tired attempt runs', () => {
    expect(manageRearm({ tiredSeen: true, tiredWorker: 'market_hand' }, false)).toBe(true);
    expect(manageRearm({ tiredSeen: true, tiredWorker: 'market_hand', manageSeen: true }, false)).toBe(false);
    expect(manageRearm({ tiredSeen: false, tiredWorker: 'market_hand' }, false)).toBe(false);
    expect(manageRearm({ tiredSeen: true, tiredWorker: 'market_hand' }, true)).toBe(false);
    expect(manageRearm({ tiredSeen: true }, false)).toBe(false);
  });
  it('only scroll gestures arm the guard: no pointerdown/touchstart (the Hire tap); scroll keys off buttons only', () => {
    expect([...GUARD_EVENTS].sort()).toEqual(['touchmove', 'wheel']);
    for (const k of ['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' ']) expect(isUserScrollKey(k, false)).toBe(true);
    expect(isUserScrollKey(' ', true)).toBe(false); expect(isUserScrollKey('Enter', false)).toBe(false); expect(isUserScrollKey('Tab', false)).toBe(false);
  });
  it('autoScrollDelta: a row clipped under the panel top that cannot fit even when brought down -> null (ddace62 #10)', () => {
    expect(autoScrollDelta({ left: 0, right: 300, top: 300, bottom: 424 }, { left: 0, right: 300, top: 320, bottom: 474 }, 68, 474)).toBeNull();
  });
});
