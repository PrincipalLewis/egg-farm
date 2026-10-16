import { describe, it, expect } from 'vitest';
import { coachPlacement, tabOverlap, type Box } from '../src/ui/coach-place';
const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });
const TIP = { w: 276, h: 68 }, VP = { w: 1280, h: 720 };
// 1280 docked (QA B-2 repro): Upgrades column x 880..1280, tabs 462..506, first worker .ebar just under them.
const tabs = [box(880, 462, 400, 44)], ebar = box(900, 530, 360, 8), cx = 1080;
describe('QA B-2 coachPlacement (pure, real rects)', () => {
  it('above would cover the tablist -> below (the B-2 case)', () => {
    const p = coachPlacement(ebar, TIP, cx, VP, tabs, true);
    expect(p).toMatchObject({ side: 'below', top: 550, overlap: 0 });
    expect(tabOverlap(cx - 138, cx + 138, 530 - 12 - 68, 68, tabs)).toBeGreaterThan(0);
  });
  it('no overlap -> stays above', () => { expect(coachPlacement(box(900, 700 - 120, 360, 8), TIP, cx, { w: 1280, h: 900 }, [box(880, 200, 400, 44)], true).side).toBe('above'); });
  it('edge touch (tip bottom == tab top) is not an overlap', () => {
    const t = box(900, 600, 360, 8); // above band = 520..588; tabs start at 588
    expect(coachPlacement(t, TIP, cx, VP, [box(880, 588, 400, 44)], true).side).toBe('above');
    expect(coachPlacement(t, TIP, cx, VP, [box(880, 587, 400, 10)], true).side).toBe('below');
  });
  it('no tablist / zero-size tablist -> legacy above', () => {
    expect(coachPlacement(ebar, TIP, cx, VP, [], true).side).toBe('above');
    expect(coachPlacement(ebar, TIP, cx, VP, [box(880, 462, 0, 0)], true).side).toBe('above');
  });
  it('target near the top -> below (legacy rule)', () => { expect(coachPlacement(box(900, 80, 360, 8), TIP, cx, VP, tabs, true).side).toBe('below'); });
  it('tablist in another column (docked >=960) is no conflict (m3)', () => { expect(coachPlacement(ebar, TIP, cx, VP, [box(0, 462, 600, 44)], true).side).toBe('above'); });
  it('below is clamped into the viewport (M2), 1280x600', () => {
    const vp = { w: 1280, h: 600 }, t = box(900, 560, 360, 8), tb = [box(880, 470, 400, 44)];
    const p = coachPlacement(t, TIP, cx, vp, tb, true);
    expect(p.top + TIP.h).toBeLessThanOrEqual(600 - 8); expect(p.top).toBeGreaterThanOrEqual(8);
  });
  it('neither fits cleanly -> less overlap wins (390x640 bottom sheet)', () => {
    const vp = { w: 390, h: 640 }, t = box(20, 600, 350, 8), tb = [box(0, 540, 390, 44)];
    const p = coachPlacement(t, TIP, 195, vp, tb, true);
    const other = p.side === 'above' ? coachPlacement(t, TIP, 195, vp, [], true) : null;
    expect(p.top + TIP.h).toBeLessThanOrEqual(632);
    expect(p.overlap).toBe(Math.min(tabOverlap(57, 333, 600 - 12 - 68, 68, tb), tabOverlap(57, 333, 564, 68, tb))); void other;
  });
  it('off-screen target above -> below, clamped', () => { const p = coachPlacement(box(900, -50, 360, 8), TIP, cx, VP, tabs, true); expect(p.side).toBe('below'); expect(p.top).toBeGreaterThanOrEqual(8); });
  it('without avoidTabs (hire / Manage / goal tips) behaviour is the legacy one, tabs ignored (m4)', () => {
    expect(coachPlacement(ebar, TIP, cx, VP, tabs, false)).toMatchObject({ side: 'above', top: 530 - 12 - 68 });
    expect(coachPlacement(box(900, 80, 360, 8), TIP, cx, VP, tabs, false)).toMatchObject({ side: 'below', top: 100 });
  });
  it('a flipped overlap comparison would fail: overlap is strictly positive only for real intersections', () => {
    expect(tabOverlap(0, 10, 0, 10, [box(0, 10, 10, 10)])).toBe(0); expect(tabOverlap(0, 10, 0, 10, [box(0, 9, 10, 10)])).toBe(10); expect(tabOverlap(0, 10, 0, 10, [box(10, 0, 10, 10)])).toBe(0);
  });
});
