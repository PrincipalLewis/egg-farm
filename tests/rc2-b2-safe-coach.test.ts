import { describe, it, expect } from 'vitest';
import { safeCoachPlacement, ROW_GAP, type Box } from '../src/ui/coach-place';
const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });
const hit = (a: Box, b: Box) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
const TIP = { w: 276, h: 68 };
// worker row = name + bar + Energy label + Refill button; checks every returned rect against all of them
const scene = (vp: { w: number; h: number }, tabs: Box[], rowTop: number, x: number, w: number) => {
  const name = box(x + 8, rowTop + 4, 120, 20), bar = box(x + 8, rowTop + 30, w - 16, 8), label = box(x + 8, rowTop + 42, 90, 16), btn = box(x + w - 108, rowTop + 4, 100, 44);
  return { vp, tabs, row: box(x, rowTop, w, 64), bar, parts: [name, bar, label, btn], cx: x + w / 2 };
};
const run = (s: ReturnType<typeof scene>, visible = true) => safeCoachPlacement({ target: s.bar, tip: TIP, cx: s.cx, vp: s.vp, tabs: s.tabs, row: s.row, visible });
const clean = (s: ReturnType<typeof scene>, p: { top: number } | null) => {
  if (!p) return true; const b = box(s.cx - TIP.w / 2, p.top, TIP.w, TIP.h);
  return ![...s.tabs, ...s.parts, s.row].some(x => hit(b, x)) && b.top >= 0 && b.bottom <= s.vp.h;
};
describe('B-2 amended (rc2-notes A-C): safeCoachPlacement', () => {
  it('A: anchors 8px under the whole worker row (not the energy bar) and touches none of name/bar/label/Refill', () => {
    const s = scene({ w: 1280, h: 720 }, [box(880, 140, 400, 44)], 200, 890, 380);
    const p = run(s); expect(p).toEqual({ side: 'below', top: s.row.bottom + ROW_GAP }); expect(clean(s, p)).toBe(true);
  });
  it('390x640: below the row, clear of the Refill button and Energy label (QA rowHits CHECK)', () => {
    const s = scene({ w: 390, h: 640 }, [box(0, 250, 390, 44)], 320, 8, 374); const p = run(s);
    expect(p?.side).toBe('below'); expect(clean(s, p)).toBe(true);
  });
  it('360x740 sheet open: below the row, clean', () => { const s = scene({ w: 360, h: 740 }, [box(0, 262, 360, 44)], 330, 8, 344); expect(clean(s, run(s))).toBe(true); expect(run(s)).not.toBeNull(); });
  it('B: 1024x474 repro (tabs right above the row, no room below) -> null (deferred), never on the tabs', () => {
    const s = scene({ w: 1024, h: 474 }, [box(620, 340, 404, 44)], 386, 630, 380);
    expect(run(s)).toBeNull();
  });
  it('B: 1024x474 with room above (row scrolled down, tabs far up) -> above the row, clear of tabs', () => {
    const s = scene({ w: 1024, h: 474 }, [box(620, 60, 404, 44)], 380, 630, 380); const p = run(s);
    expect(p?.side).toBe('above'); expect(clean(s, p)).toBe(true);
  });
  it('B: row partly off screen -> null', () => { expect(run(scene({ w: 390, h: 640 }, [], 600, 8, 374))).toBeNull(); expect(run(scene({ w: 390, h: 640 }, [], -10, 8, 374))).toBeNull(); });
  it('C: sheet closed / anchor not visible -> null', () => { expect(run(scene({ w: 360, h: 740 }, [], 300, 8, 344), false)).toBeNull(); });
  it('legacy tips also never sit on a tablist or leave the viewport', () => {
    const t = box(100, 300, 100, 44), tabs = [box(0, 230, 400, 50)];
    const p = safeCoachPlacement({ target: t, tip: TIP, cx: 150 > 142 ? 150 : 142, vp: { w: 400, h: 700 }, tabs, visible: true });
    expect(p?.side).toBe('below');
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp: { w: 400, h: 420 }, tabs, visible: true })).toBeNull();
    expect(safeCoachPlacement({ target: box(100, 600, 100, 44), tip: TIP, cx: 150, vp: { w: 400, h: 700 }, tabs: [], visible: true })?.side).toBe('above');
  });
  it('sweep: every returned placement is clean across sizes and row positions', () => {
    for (const [w, h] of [[1024, 474], [390, 640], [360, 740], [1280, 720], [1280, 600], [375, 812]]) for (let y = -40; y < h; y += 13) for (const ty of [0, y - 50, y + 70]) {
      const s = scene({ w, h }, [box(0, ty, w, 44)], y, 4, Math.min(w - 8, 380)); expect(clean(s, run(s))).toBe(true);
    }
  });
});
