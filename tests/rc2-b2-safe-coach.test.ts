import { describe, it, expect } from 'vitest';
import { safeCoachPlacement, autoScrollDelta, guardAllows, tiredTipAfter, deferExpired, ROW_GAP, MAX_DEFER_MS, type Box } from '../src/ui/coach-place';
const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });
const hit = (a: Box, b: Box) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
const TIP = { w: 276, h: 68 };
// worker row = name + bar + Energy label + Refill button; checks every returned rect against all of them
const scene = (vp: { w: number; h: number }, tabs: Box[], rowTop: number, x: number, w: number) => {
  const name = box(x + 8, rowTop + 4, 120, 20), bar = box(x + 8, rowTop + 30, w - 16, 8), label = box(x + 8, rowTop + 42, 90, 16), btn = box(x + w - 108, rowTop + 4, 100, 44);
  return { vp, tabs, row: box(x, rowTop, w, 64), bar, parts: [name, bar, label, btn], cx: x + w / 2 };
};
const run = (s: ReturnType<typeof scene>, visible = true, rowAbove = false) => safeCoachPlacement({ target: s.bar, tip: TIP, cx: s.cx, vp: s.vp, tabs: s.tabs, row: s.row, visible, rowAbove });
const runM = (s: ReturnType<typeof scene>) => run(s, true, true); // Manage tip: row mode + above fallbacks
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
  it('Manage tip: no room below -> above the row, clear of tabs; tired tip stays below-only (rule A/D: never beside, never above)', () => {
    const s = scene({ w: 1024, h: 474 }, [box(620, 60, 404, 44)], 380, 630, 380); expect(run(s)).toBeNull(); const p = runM(s);
    expect(p?.side).toBe('above'); expect(clean(s, p)).toBe(true);
  });
  it('B: row partly off screen -> null', () => { expect(run(scene({ w: 390, h: 640 }, [], 600, 8, 374))).toBeNull(); expect(run(scene({ w: 390, h: 640 }, [], -10, 8, 374))).toBeNull(); });
  it('C: sheet closed / anchor not visible -> null', () => { expect(run(scene({ w: 360, h: 740 }, [], 300, 8, 344), false)).toBeNull(); });
  it('legacy tips also never sit on a tablist or leave the viewport', () => {
    const t = box(100, 300, 100, 44), tabs = [box(0, 230, 400, 50)];
    const p = safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp: { w: 400, h: 700 }, tabs, visible: true });
    expect(p?.side).toBe('below');
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp: { w: 400, h: 420 }, tabs, visible: true })).toBeNull();
    expect(safeCoachPlacement({ target: box(100, 600, 100, 44), tip: TIP, cx: 150, vp: { w: 400, h: 700 }, tabs: [], visible: true })?.side).toBe('above');
  });
  it('sweep: every returned placement is clean across sizes and row positions', () => {
    for (const [w, h] of [[1024, 474], [390, 640], [360, 740], [1280, 720], [1280, 600], [375, 812]]) for (let y = -40; y < h; y += 13) for (const ty of [0, y - 50, y + 70]) {
      const s = scene({ w, h }, [box(0, ty, w, 44)], y, 4, Math.min(w - 8, 380)); expect(clean(s, run(s))).toBe(true);
    }
  });
  it('margin: a tip that fits only without the 8px bottom margin is not placed there', () => {
    // row 300..364, below = 372..440; vp 444 -> bottom 440 > 436 -> not below; above 224..292 clean
    const s = scene({ w: 390, h: 444 }, [], 300, 8, 374); expect(runM(s)).toEqual({ side: 'above', top: 300 - ROW_GAP - TIP.h });
    const s2 = scene({ w: 390, h: 448 }, [], 300, 8, 374); expect(run(s2)?.side).toBe('below');
  });
  it('horizontal overflow -> null', () => {
    const s = scene({ w: 390, h: 740 }, [], 300, 8, 374);
    expect(safeCoachPlacement({ target: s.bar, tip: TIP, cx: 100, vp: s.vp, tabs: [], row: s.row, visible: true })).toBeNull();
    expect(safeCoachPlacement({ target: s.bar, tip: TIP, cx: 300, vp: s.vp, tabs: [], row: s.row, visible: true })).toBeNull();
  });
  it('legacy side order when both sides are clean: above at top >= 120, below under 120', () => {
    const vp = { w: 400, h: 900 };
    expect(safeCoachPlacement({ target: box(100, 400, 100, 44), tip: TIP, cx: 150, vp, tabs: [], visible: true })).toEqual({ side: 'above', top: 400 - 12 - 68 });
    expect(safeCoachPlacement({ target: box(100, 119, 100, 44), tip: TIP, cx: 150, vp, tabs: [], visible: true })).toEqual({ side: 'below', top: 163 + 12 });
  });
  it('avoid rects are honoured', () => {
    const t = box(100, 400, 100, 44), vp = { w: 400, h: 900 };
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp, tabs: [], avoid: [box(0, 340, 400, 10)], visible: true })?.side).toBe('below');
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp, tabs: [], avoid: [box(0, 340, 400, 10), box(0, 470, 400, 10)], visible: true })).toBeNull();
  });
  it('clip: a row inside the viewport but scrolled under the sheet header / past the scroller bottom -> null', () => {
    const s = scene({ w: 390, h: 740 }, [], 300, 8, 374), o = { target: s.bar, tip: TIP, cx: s.cx, vp: s.vp, tabs: [], row: s.row, visible: true };
    expect(safeCoachPlacement({ ...o, clip: box(0, 320, 390, 400) })).toBeNull();
    expect(safeCoachPlacement({ ...o, clip: box(0, 100, 390, 250) })).toBeNull();
    expect(safeCoachPlacement({ ...o, clip: box(0, 100, 390, 600) })?.side).toBe('below');
  });
  it('top margin: above that fits only without the 8px top margin is refused', () => {
    // row 80..144 -> above top = 4 (< 8) refused; vp too short for below (152+68=220 > 212)
    expect(runM(scene({ w: 390, h: 220 }, [], 80, 8, 374))).toBeNull();
    expect(runM(scene({ w: 390, h: 220 }, [], 84, 8, 374))).toEqual({ side: 'above', top: 8 });
  });
  it('touching edges do not count as overlap (tip bottom == tab top; tip top == tab bottom)', () => {
    const s = scene({ w: 390, h: 740 }, [box(0, 440, 390, 44)], 300, 8, 374); // below band 372..440
    expect(run(s)?.side).toBe('below');
    const s2 = scene({ w: 390, h: 740 }, [box(0, 441 - 1 - 1, 390, 44)], 300, 8, 374); expect(run(s2)?.side).not.toBe('below');
  });
  it('COACH_MIN_TOP boundary: target.top = 120 prefers above', () => {
    expect(safeCoachPlacement({ target: box(100, 120 + 80, 100, 44), tip: TIP, cx: 150, vp: { w: 400, h: 900 }, tabs: [], visible: true })?.side).toBe('above');
    expect(safeCoachPlacement({ target: box(100, 120, 100, 44), tip: { w: 276, h: 20 }, cx: 150, vp: { w: 400, h: 900 }, tabs: [], visible: true })?.side).toBe('above');
  });
  it('Manage tip at 1024x474: below and above the row both blocked -> above the tablist, clear of everything', () => {
    // measured docked 1024x474: tabs 274..318, row 336..460
    const s = scene({ w: 1024, h: 474 }, [box(620, 274, 404, 44)], 336, 630, 380); expect(run(s)).toBeNull();
    const p = runM(s); expect(p).toEqual({ side: 'above', top: 274 - ROW_GAP - TIP.h }); expect(clean(s, p)).toBe(true);
  });
  it('legacy tips: target outside the scroller clip -> null; avoid rects (row name/label) honoured', () => {
    const t = box(100, 400, 100, 44), vp = { w: 400, h: 900 };
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp, tabs: [], clip: box(0, 420, 400, 300), visible: true })).toBeNull();
    expect(safeCoachPlacement({ target: t, tip: TIP, cx: 150, vp, tabs: [], clip: box(0, 300, 400, 300), visible: true })?.side).toBe('above');
  });
});
describe('rule D (rc2-notes §B-2, 02:15): auto-scroll, guard, skip, seen, 15s cap', () => {
  const clip = box(898, 446, 366, 274); // docked 1280x720 panel body
  it('D1: 1280x720 measured row 521..645 -> scroll 9px so the tip fits 8px under the row', () => {
    const d = autoScrollDelta(box(898, 521, 366, 124), clip, 68, 720); expect(d).toBe(9);
    const s = { vp: { w: 1280, h: 720 }, tabs: [box(898, 459 - 9, 366, 44)], row: box(898, 521 - 9, 366, 124) };
    expect(safeCoachPlacement({ target: box(908, 0, 1, 1), tip: TIP, cx: 1081, ...s, clip, visible: true })).toEqual({ side: 'below', top: 645 - 9 + ROW_GAP });
  });
  it('D1: 1280x600 measured row 431..555 / body 386 -> 39px', () => { expect(autoScrollDelta(box(898, 431, 366, 124), box(898, 386, 366, 214), 68, 600)).toBe(39); });
  it('D1: no scroll when it already fits; a row clipped under the panel top is scrolled back down', () => {
    expect(autoScrollDelta(box(0, 300, 300, 64), box(0, 200, 300, 500), 68, 740)).toBe(0);
    expect(autoScrollDelta(box(0, 180, 300, 64), box(0, 200, 300, 500), 68, 740)).toBe(-20);
  });
  it('D3: 1024x474 (row 336..460, body 323..474) cannot fit even after scrolling -> null (skip this visit)', () => {
    expect(autoScrollDelta(box(630, 336, 380, 124), box(620, 323, 404, 151), 68, 474)).toBeNull();
  });
  it('D1: the scroll never takes the row above the panel top (never under the tablist)', () => {
    const d = autoScrollDelta(box(0, 400, 300, 100), box(0, 370, 300, 300), 68, 560)!; expect(d).toBe(24); expect(400 - d).toBeGreaterThanOrEqual(370);
    expect(autoScrollDelta(box(0, 400, 300, 100), box(0, 380, 300, 300), 68, 560)).toBeNull();
  });
  it('D2: guard: no auto-scroll within 1s of the player scrolling/touching', () => {
    expect(guardAllows(10_000, 9_001)).toBe(false); expect(guardAllows(10_000, 9_000)).toBe(true); expect(guardAllows(10_000, -Infinity)).toBe(true);
  });
  it('D4: seen once shown, or after 3 skipped visits', () => {
    let st = { seen: false, skips: 0 };
    st = tiredTipAfter(st, 'skipped'); expect(st).toEqual({ seen: false, skips: 1 });
    st = tiredTipAfter(st, 'skipped'); expect(st.seen).toBe(false);
    st = tiredTipAfter(st, 'skipped'); expect(st).toEqual({ seen: true, skips: 3 });
    expect(tiredTipAfter({ seen: false, skips: 2 }, 'shown')).toEqual({ seen: true, skips: 2 });
    expect(tiredTipAfter({ seen: true, skips: 1 }, 'skipped')).toEqual({ seen: true, skips: 1 });
  });
  it('15s cap: a tip that has not shown is dropped after MAX_DEFER_MS; a shown tip never is', () => {
    expect(MAX_DEFER_MS).toBe(15000);
    expect(deferExpired(0, 15000, false)).toBe(false); expect(deferExpired(0, 15001, false)).toBe(true); expect(deferExpired(0, 60000, true)).toBe(false);
  });
});
