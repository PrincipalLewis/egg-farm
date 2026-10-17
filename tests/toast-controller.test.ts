// Unit tests for the toast state machine (show / settle / dismiss / second toast / re-show mid-exit / double call).
import { describe, it, expect } from 'vitest';
import { toastController, TOAST_MS } from '../src/ui/toast-place';
function rig() {
  const log: string[] = []; let shown = false, op = 0, t = 0, id = 0;
  const frames: (() => void)[] = [], timers = new Map<number, { at: number; f: () => void }>();
  const show = toastController({ shown: () => shown, opacity: () => op, show: () => { shown = true; op = 1; log.push('show'); }, hide: () => { shown = false; log.push('hide'); },
    transitions: on => log.push(on ? 'tr-on' : 'tr-off'), reflow: () => log.push('reflow'), place: () => log.push('place') },
    { raf: f => { frames.push(f); return frames.length; }, setTimeout: (f, ms) => { timers.set(++id, { at: t + ms, f }); return id; }, clearTimeout: k => { timers.delete(k); } });
  const frame = () => { const fs = frames.splice(0); fs.forEach(f => f()); };
  const advance = (ms: number) => { t += ms; for (const [k, v] of [...timers]) if (v.at <= t) { timers.delete(k); v.f(); } };
  return { show, frame, advance, log, timers, frames, set op(v: number) { op = v; }, get shown() { return shown; } };
}
describe('toastController', () => {
  it('hidden -> next frame: transitions off, place, reflow, on, THEN show (first frame already settled)', () => {
    const r = rig(); r.show(); expect(r.log).toEqual([]); r.frame();
    expect(r.log).toEqual(['tr-off', 'place', 'reflow', 'tr-on', 'show']);
  });
  it('dismiss path: hides TOAST_MS after .show, not after the call', () => {
    const r = rig(); r.show(); r.advance(TOAST_MS + 500); expect(r.shown).toBe(false); expect(r.timers.size).toBe(0); // rAF paused: no timer yet 
    r.frame(); expect(r.shown).toBe(true); r.advance(TOAST_MS - 1); expect(r.shown).toBe(true); r.advance(1); expect(r.log.at(-1)).toBe('hide');
  });
  it('second toast while visible: shown at once (no snap/settle), timer re-armed from the second call', () => {
    const r = rig(); r.show(); r.frame(); r.advance(1000); r.log.length = 0; r.show();
    expect(r.log).toEqual(['show']); expect(r.log).not.toContain('tr-off'); r.advance(TOAST_MS - 1); expect(r.shown).toBe(true); r.advance(1); expect(r.shown).toBe(false);
  });
  it('second toast during the exit fade (opacity > 0, .show gone): reverse at once, no transitions-off snap ', () => {
    const r = rig(); r.show(); r.frame(); r.advance(TOAST_MS); expect(r.shown).toBe(false); r.op = 0.6; r.log.length = 0; r.show();
    expect(r.log).toEqual(['show']); r.frame(); expect(r.log).toEqual(['show', 'place']);
  });
  it('two calls before the first frame: one settle, one show ', () => {
    const r = rig(); r.show(); r.show(); expect(r.frames.length).toBe(1); r.frame(); expect(r.log.filter(x => x === 'show').length).toBe(1); expect(r.timers.size).toBe(1);
  });
  it('a later toast after the first has fully gone settles again (transitions-off path), not the instant re-show', () => {
    const r = rig(); r.show(); r.frame(); r.advance(TOAST_MS); r.op = 0; r.log.length = 0; r.show();
    expect(r.frames.length).toBe(1); r.frame(); expect(r.log).toEqual(['tr-off', 'place', 'reflow', 'tr-on', 'show']); expect(r.shown).toBe(true);
  });
  it('visible branch places next frame only, not synchronously ', () => { const r = rig(); r.show(); r.frame(); r.log.length = 0; r.show(); expect(r.log).not.toContain('place'); r.frame(); expect(r.log).toContain('place'); });
});
