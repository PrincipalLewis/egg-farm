import { describe, it, expect } from 'vitest';
import { toastGate, TOAST_MS, TOAST_GAP_MS } from '../src/ui/toast-place';
const rig = () => {
  let blocked = false; const shown: [string, number][] = []; const frames: (() => void)[] = []; const timers: [() => void, number][] = [];
  const g = toastGate(() => blocked, (t, ms) => shown.push([t, ms]), { raf: f => { frames.push(f); return 0; }, setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; } });
  return { g, shown, frames, timers, set: (b: boolean) => { blocked = b; }, frame: () => frames.splice(0).forEach(f => f()), tick: () => timers.splice(0).forEach(([f]) => f()) };
};
describe('toastGate (rc2 M-Toast-layer: hold while #modal-layer.open)', () => {
  it('passes straight through when no modal is open', () => { const r = rig(); r.g.toast('A', 2500); expect(r.shown).toEqual([['A', 2500]]); });
  it('holds while blocked and shows on release in the next frame, not synchronously', () => {
    const r = rig(); r.set(true); r.g.toast('A'); expect(r.shown).toEqual([]); r.g.released(); expect(r.shown).toEqual([]);
    r.set(false); r.g.released(); expect(r.shown).toEqual([]); r.frame(); expect(r.shown).toEqual([['A', TOAST_MS]]);
  });
  it('several held toasts show one at a time, oldest first, each after the previous one\'s duration + gap; duplicates collapse', () => {
    const r = rig(); r.set(true); r.g.toast('A', 2500); r.g.toast('A', 2500); r.g.toast('B'); r.set(false); r.g.released(); r.frame();
    expect(r.shown).toEqual([['A', 2500]]); expect(r.timers.map(t => t[1])).toEqual([2500 + TOAST_GAP_MS]);
    r.g.toast('C'); expect(r.shown.length).toBe(1); // queued behind the drain, not shown over A
    r.tick(); expect(r.shown.map(s => s[0])).toEqual(['A', 'B']); r.tick(); expect(r.shown.map(s => s[0])).toEqual(['A', 'B', 'C']); expect(r.timers).toEqual([]);
    r.g.toast('D'); expect(r.shown.at(-1)).toEqual(['D', TOAST_MS]); // drain over: pass-through again
  });
  it('a toast pulled off screen by hold() re-shows first after the modal', () => {
    const r = rig(); r.set(true); r.g.toast('B'); r.g.hold('A', 2500); r.g.hold('A'); expect(r.g.held()).toEqual(['A', 'B']);
    r.set(false); r.g.released(); r.frame(); expect(r.shown[0]).toEqual(['A', 2500]);
  });
  it('a modal reopening mid-drain stops the drain; the rest waits for the next release', () => {
    const r = rig(); r.set(true); r.g.toast('A'); r.g.toast('B'); r.set(false); r.g.released(); r.frame(); r.set(true); r.tick();
    expect(r.shown.map(s => s[0])).toEqual(['A']); expect(r.g.held()).toEqual(['B']); r.set(false); r.g.released(); r.frame(); expect(r.shown.map(s => s[0])).toEqual(['A', 'B']);
  });
  it('release with nothing held does nothing', () => { const r = rig(); r.g.released(); expect(r.frames).toEqual([]); });
});
