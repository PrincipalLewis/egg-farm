import { describe, it, expect } from 'vitest';
import { coachPlacement, tabOverlap, type Box } from '../src/ui/coach-place';
const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });
const TIP = { w: 276, h: 68 }, VP = { w: 1280, h: 720 };
// 1280 docked (QA B-2 repro): Upgrades column x 880..1280, tabs 462..506, first worker .ebar just under them.
const tabs = [box(880, 462, 400, 44)], ebar = box(900, 530, 360, 8), cx = 1080;
const P = (t: Box, tb: Box[], vp = VP, tip = TIP, x = cx) => coachPlacement(t, tip, x, vp, tb, true);
describe('QA B-2 coachPlacement (pure, real rects)', () => {
  it('above would cover the tablist -> below (the B-2 case)', () => {
    expect(P(ebar, tabs)).toMatchObject({ side: 'below', top: 550, overlap: 0 });
    expect(tabOverlap(cx - 138, cx + 138, 530 - 12 - 68, 68, tabs)).toBeGreaterThan(0);
  });
  it('no overlap -> stays above', () => { expect(P(box(900, 580, 360, 8), [box(880, 200, 400, 44)], { w: 1280, h: 900 }).side).toBe('above'); });
  it('edge touch (tip bottom == tab top) is not an overlap; one px more is', () => {
    const t = box(900, 600, 360, 8); // above band 520..588
    expect(P(t, [box(880, 588, 400, 44)]).side).toBe('above');
    expect(P(t, [box(880, 587, 400, 10)]).side).toBe('below');
  });
  it('no tablist / zero-size tablist -> legacy above', () => {
    expect(P(ebar, []).side).toBe('above'); expect(P(ebar, [box(880, 462, 0, 0)]).side).toBe('above');
  });
  it('target near the top -> below (legacy rule)', () => { expect(P(box(900, 80, 360, 8), tabs).side).toBe('below'); });
  it('tablist in another column (docked >=960) is no conflict (m3)', () => { expect(P(ebar, [box(0, 462, 600, 44)]).side).toBe('above'); });
  it('below is clamped into the viewport (M2), 1280x600', () => {
    const p = P(box(900, 560, 360, 8), [box(880, 470, 400, 44)], { w: 1280, h: 600 });
    expect(p.top + TIP.h).toBeLessThanOrEqual(592); expect(p.top).toBeGreaterThanOrEqual(8);
  });
  it('N3 bottom clamp keeps the 8px margin: below 520 clamped to 514 in a 590px viewport', () => {
    expect(P(box(900, 500, 360, 8), [box(880, 400, 400, 44)], { w: 1280, h: 590 })).toMatchObject({ side: 'below', top: 514, overlap: 0 });
  });
  it('N1 390x640: above hits the tabs by 44 rows, below clamped to 564..632 would cover the target 600..608 -> never covers the target', () => {
    const t = box(20, 600, 350, 8), tb = [box(0, 520, 390, 44)], vp = { w: 390, h: 640 };
    const p = P(t, tb, vp, TIP, 195);
    expect(tabOverlap(57, 333, p.top, 68, [t])).toBe(0);
    expect(p).toMatchObject({ side: 'above', top: 520 });
  });
  it('N2: a tall wrapped tip at 390 has its above position clamped too (top >= 8)', () => {
    const tall = { w: 280, h: 240 }, t = box(20, 200, 350, 8), vp = { w: 390, h: 640 };
    const p = P(t, [box(0, 300, 390, 44)], vp, tall, 195); // below 220..460 hits tabs; above raw -52 -> clamped 8 but covers the target
    expect(p.top).toBeGreaterThanOrEqual(8); expect(p.top + tall.h).toBeLessThanOrEqual(632);
    const q = P(box(20, 400, 350, 8), [box(0, 420, 390, 200)], vp, tall, 195); // below covers the tabs: above raw 148 fits
    expect(q).toMatchObject({ side: 'above', top: 148 });
  });
  it('N3 belowFits: legacy above blocked by tabs, below has no room -> clamped below covers target, so above (less bad) wins', () => {
    const t = box(900, 690, 360, 8), p = P(t, [box(880, 610, 400, 44)]);
    expect(p.side).toBe('above'); expect(p.overlap).toBeGreaterThan(0);
  });
  it('N3 oB === 0 branch: below clean -> below even though above only touches nothing but tabs', () => {
    expect(P(ebar, tabs)).toMatchObject({ side: 'below', overlap: 0 });
    // below not clean (tabs under the target too) and above dirtier -> lower overlap wins
    const t = box(900, 300, 360, 8), p = P(t, [box(880, 230, 400, 60), box(880, 330, 400, 10)]);
    expect(p.side).toBe('below'); expect(p.overlap).toBe(276 * 10);
  });
  it('N3 flipped comparison: of two dirty sides the one with LESS tab overlap wins', () => {
    const t = box(900, 300, 360, 8);
    expect(P(t, [box(880, 280, 400, 10), box(880, 320, 400, 50)]).side).toBe('above');
    expect(P(t, [box(880, 230, 400, 60), box(880, 330, 400, 10)]).side).toBe('below');
  });
  it('off-screen target above -> below, clamped', () => { const p = P(box(900, -50, 360, 8), tabs); expect(p.side).toBe('below'); expect(p.top).toBeGreaterThanOrEqual(8); });
  it('without avoidTabs (hire / Manage / goal tips) behaviour is the legacy one, tabs ignored (m4)', () => {
    expect(coachPlacement(ebar, TIP, cx, VP, tabs, false)).toMatchObject({ side: 'above', top: 530 - 12 - 68 });
    expect(coachPlacement(box(900, 80, 360, 8), TIP, cx, VP, tabs, false)).toMatchObject({ side: 'below', top: 100 });
  });
  it('tabOverlap: touching edges are 0, real intersections are their area', () => {
    expect(tabOverlap(0, 10, 0, 10, [box(0, 10, 10, 10)])).toBe(0); expect(tabOverlap(0, 10, 0, 10, [box(0, 9, 10, 10)])).toBe(10); expect(tabOverlap(0, 10, 0, 10, [box(10, 0, 10, 10)])).toBe(0);
  });
});
