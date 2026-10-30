// @vitest-environment jsdom
// QA-PRERUN-2 (UI QA 76390f2 pre-run, HoQ QA-D-1030-PRERUN-TRIAGE; qa/m3-recheck/prerun-76390f2-bugs/bug-p64-ff375-sell-label-clip.md):
// Firefox 375: the Sell label overflowed its button by 1-2 px (scrollWidth 86 / clientWidth 84). Root cause (measured,
// scripts/v5-qa-prerun-2-sell-clip.mjs): syncSellWidth sized the BORDER-box --sell-w from scrollWidth at max-content, which is the
// PADDING box (2 x 2px border short) rounded to an integer: e.g. Firefox 'Sell 876.4K' = 68.1px of text + 20px padding -> scrollWidth
// 88 -> --sell-w 88px -> 64px content box. Fix: fractional border-box width at max-content, ceil, + SELL_SLACK (1px).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { OrderList, SELL_SLACK, sellBoxWidth } from '../src/ui/order-list';
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });
/** Layout stub: a Sell button at width:max-content is `text + 20` px of padding box (what scrollWidth reports, rounded) and
 *  `text + 24` px of border box (the used `width` under box-sizing:border-box). */
function mount(textW: (b: HTMLElement) => number) {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((e: Element, p?: string | null) => {
    const cs = real(e, p); const b = e as HTMLElement;
    if (!b.classList?.contains('sell')) return cs;
    const w = b.style.width === 'max-content' ? `${textW(b) + 24}px` : cs.width;
    return new Proxy(cs, { get: (t, k) => k === 'width' ? w : k === 'boxSizing' ? 'border-box' : k === 'borderLeftWidth' || k === 'borderRightWidth' ? '2px' : (t as any)[k] });
  });
  const sw = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth')!;
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get(this: HTMLElement) { return this.classList.contains('sell') && this.style.width === 'max-content' ? Math.round(textW(this) + 20) : sw.get!.call(this); } });
  const list = document.createElement('div'), live = document.createElement('div'); document.body.append(list, live);
  const q: (() => void)[] = [], ol = new OrderList(list, live, 'a.svg', '', () => 0, f => { q.push(f); return q.length; });
  const upd = () => { ol.update({ customers: [{ id: 900, demand: 999_949, filled: 123_456, waitedS: 0 }, { id: 901, demand: 999_999, filled: 999_000, waitedS: 0 }], basket: 2e6, unit: 1, visible: 3, expanded: false, rm: true }); while (q.length) q.shift()!(); };
  return { list, upd, restore: () => { delete (HTMLElement.prototype as any).scrollWidth; } };
}
const sellW = (l: HTMLElement) => l.style.getPropertyValue('--sell-w');
describe('QA-PRERUN-2 Sell label never clipped (Firefox 375 QA4-1)', () => {
  it('QA-PRERUN-2 repro numbers: Firefox Sell 876.4K (68.1px text) -> --sell-w covers text + padding 20 + border 4 + slack (was 88px = 64px content)', () => {
    const m = mount(() => 68.1);
    try { m.upd(); const w = parseFloat(sellW(m.list)); expect(w).toBe(Math.ceil(68.1 + 24) + SELL_SLACK); expect(w - 24).toBeGreaterThanOrEqual(68.1 + 1); } finally { m.restore(); }
  });
  it('QA-PRERUN-2 every QA case fits with slack: content box (--sell-w - 24) >= widest label + 1px (999.9K, Qa, Dc-999.9, sci-1.00e36, huge-max Firefox widths)', () => {
    for (const t of [68.1, 70.633, 67.117, 65.933, 75.967]) { const m = mount(() => t); try { m.upd(); expect(parseFloat(sellW(m.list)) - 24, `${t}`).toBeGreaterThanOrEqual(t + SELL_SLACK); } finally { m.restore(); document.body.innerHTML = ''; } }
  });
  it('QA-PRERUN-2 Chromium/WebKit-sized labels: the 88px floor is unchanged when text + 24 + slack <= 88 (no layout change beyond the slack)', () => {
    for (const t of [48.683, 56.217, 62.9]) { const m = mount(() => t); try { m.upd(); expect(sellW(m.list)).toBe('88px'); } finally { m.restore(); document.body.innerHTML = ''; } }
    const m = mount(() => 63.5); try { m.upd(); expect(sellW(m.list)).toBe(`${Math.ceil(63.5 + 24) + SELL_SLACK}px`); } finally { m.restore(); } // 87.5 -> 88 + 1 slack
  });
  it('QA-PRERUN-2 the widest button sets the shared width (max over #900/#901), still capped by 45% of the row', () => {
    const m = mount(b => b.closest('.order')?.getAttribute('data-row') === '901' ? 70.633 : 58.883);
    try { m.upd(); expect(sellW(m.list)).toBe(`${Math.ceil(70.633 + 24) + SELL_SLACK}px`); } finally { m.restore(); }
  });
  it('QA-PRERUN-2 sellBoxWidth: used border-box width (fractional), not scrollWidth; content-box sizing adds padding + border', () => {
    const b = document.createElement('button'); document.body.append(b);
    const cs = (o: Record<string, string>) => vi.spyOn(window, 'getComputedStyle').mockReturnValue(new Proxy({} as CSSStyleDeclaration, { get: (_, k) => o[k as string] ?? '' }));
    cs({ width: '92.1px', boxSizing: 'border-box' }); expect(sellBoxWidth(b)).toBeCloseTo(92.1);
    vi.restoreAllMocks(); cs({ width: '68.1px', boxSizing: 'content-box', paddingLeft: '10px', paddingRight: '10px', borderLeftWidth: '2px', borderRightWidth: '2px' }); expect(sellBoxWidth(b)).toBeCloseTo(92.1);
  });
  it('QA-PRERUN-2 source: syncSellWidth no longer sizes --sell-w from scrollWidth', () => {
    const src = readFileSync('src/ui/order-list.ts', 'utf8'), body = src.slice(src.indexOf('private syncSellWidth()'), src.indexOf('private syncLineFit()'));
    expect(body).toMatch(/sellBoxWidth\(b\)/); expect(body).not.toMatch(/scrollWidth/); expect(SELL_SLACK).toBe(1);
  });
});
