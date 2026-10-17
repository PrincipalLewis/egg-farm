import { describe, it, expect } from 'vitest';
import { managePlacement, scrollerPanel, ROW_GAP, type Box } from '../src/ui/coach-place';
const box = (left: number, top: number, w: number, h: number): Box => ({ left, top, right: left + w, bottom: top + h });
const hit = (a: Box, b: Box) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
const TIP = { w: 286, h: 68 };
// docked 1024x474 (measured): Market panel top half x 620..1024 y 44..237, Upgrades panel 237..474, tabs 274..318, Manage button 412..456
const market = box(620, 44, 404, 193), panel = box(620, 237, 404, 237), tabs = [box(630, 274, 384, 44)], btn = box(630, 412, 384, 44);
const tipBox = (cx: number, top: number) => box(cx - TIP.w / 2, top, TIP.w, TIP.h);
describe('Manage tip placement (Art & UX 04:00 Minor on 192f273)', () => {
  it('1024x474: 8px above the Manage button (hand down), inside Upgrades, under the tabs, off Market', () => {
    const p = managePlacement(btn, TIP, 822, { w: 1024, h: 474 }, panel, tabs);
    expect(p).toEqual({ side: 'above', top: 412 - ROW_GAP - 68 });
    const b = tipBox(822, p!.top); expect(hit(b, market)).toBe(false); expect(hit(b, tabs[0])).toBe(false); expect(b.top).toBeGreaterThanOrEqual(318); expect(b.bottom).toBe(btn.top - ROW_GAP);
  });
  it('no room above (tablist right over the button) -> 8px below', () => {
    const b2 = box(630, 330, 384, 44); expect(managePlacement(b2, TIP, 822, { w: 1024, h: 600 }, box(620, 237, 404, 363), tabs)).toEqual({ side: 'below', top: 374 + ROW_GAP });
  });
  it('neither side fits inside the Upgrades panel -> null (defer); never climbs onto the Market panel', () => {
    const b3 = box(630, 380, 384, 44); expect(managePlacement(b3, TIP, 822, { w: 1024, h: 474 }, panel, tabs)).toBeNull();
    // without the tabs floor the above slot would be inside the panel; with the panel top as floor it can't reach Market
    expect(managePlacement(box(630, 260, 384, 44), TIP, 822, { w: 1024, h: 474 }, panel, [])).toEqual({ side: 'below', top: 312 });
  });
  it('tip wider than the panel, or button outside the panel / zero-size -> null', () => {
    expect(managePlacement(btn, TIP, 700, { w: 1024, h: 474 }, panel, tabs)).toBeNull(); // left edge 557 < panel 620
    expect(managePlacement(box(630, 470, 384, 44), TIP, 822, { w: 1024, h: 600 }, panel, tabs)).toBeNull();
    expect(managePlacement(box(630, 412, 0, 0), TIP, 822, { w: 1024, h: 474 }, panel, tabs)).toBeNull();
  });
  it('tabs touching the tip edge are fine; 1px into them is not', () => {
    const t = [box(630, 300, 384, 36)]; // bottom 336 == tip top for button 412
    expect(managePlacement(btn, TIP, 822, { w: 1024, h: 474 }, panel, t)?.side).toBe('above');
    expect(managePlacement(btn, TIP, 822, { w: 1024, h: 474 }, panel, [box(630, 300, 384, 37)])).toBeNull();
  });
  it('8px viewport margin applies (phone sheet that reaches the bottom edge)', () => {
    const pp = box(0, 160, 390, 480), b = box(16, 40 + 120, 358, 44); // button right under the panel top: above blocked by the panel
    expect(managePlacement(b, TIP, 195, { w: 390, h: 640 }, pp, [])).toEqual({ side: 'below', top: 212 });
    expect(managePlacement(box(16, 556, 358, 44), TIP, 195, { w: 390, h: 640 }, pp, [box(0, 470, 390, 30)])).toBeNull(); // below 608+68 > 632, above under tabs 500
  });
});
describe('Manage tip never in the sheet header (CCR fdc8f7a #1/#2)', () => {
  // real docked 1024x474 layout: sheet 237..474 with a 56px header (237..293), scroller .body 295..474, tabs inside the body
  const sheet = box(620, 237, 404, 237), header = box(620, 237, 404, 56), body = box(622, 295, 400, 179), tb = [box(630, 303, 384, 44)];
  it('scrollerPanel = body clipped to the sheet', () => { expect(scrollerPanel(sheet, body)).toEqual(box(622, 295, 400, 179)); expect(scrollerPanel(box(0, 300, 500, 100), box(-10, 250, 520, 400))).toEqual(box(0, 300, 500, 100)); });
  it('a button just under the header: never placed in the header band (below or null)', () => {
    for (let y = 295; y < 420; y += 7) { const p = managePlacement(box(630, y, 384, 44), TIP, 822, { w: 1024, h: 474 }, scrollerPanel(sheet, body), []);
      if (p) expect(hit(tipBox(822, p.top), header)).toBe(false); }
    expect(managePlacement(box(630, 300, 384, 44), TIP, 822, { w: 1024, h: 474 }, scrollerPanel(sheet, body), [])).toEqual({ side: 'below', top: 352 });
    // the whole-sheet box would have allowed the header band: shows why the clip matters
    expect(managePlacement(box(630, 340, 384, 44), TIP, 822, { w: 1024, h: 474 }, sheet, [])?.top).toBe(264);
    expect(managePlacement(box(630, 340, 384, 44), TIP, 822, { w: 1024, h: 474 }, scrollerPanel(sheet, body), [])?.side).toBe('below');
  });
  it('tabs scrolled into view inside the body still floor the tip', () => {
    const p = managePlacement(box(630, 425, 384, 44), TIP, 822, { w: 1024, h: 474 }, scrollerPanel(sheet, body), tb);
    expect(p).toEqual({ side: 'above', top: 425 - ROW_GAP - 68 }); expect(p!.top).toBeGreaterThanOrEqual(347);
  });
});
