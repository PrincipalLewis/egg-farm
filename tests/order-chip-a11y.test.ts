// @vitest-environment jsdom
// TASK HoE/chip-a11y-1 (D-HOP-2026-11-09-01): order-chip accessible name, ACs OC-A11Y-1..3
// (product/market/scratch-order-chip-a11y-draft.md sha1 82176255315423ec7981444e7766ffcd9ea01821).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { balance as b } from '../src/config/balance';
import { fmtCount } from '../src/ui/format';
import { Game } from '../src/game';
import { mem } from './helpers';

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as any;
  (globalThis as any).requestAnimationFrame ??= (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0);
  (globalThis as any).cancelAnimationFrame ??= (i: number) => clearTimeout(i);
});
afterEach(() => { document.body.innerHTML = ''; });

type C = { id: number; demand: number; filled: number; waitedS: number };
const cust = (id: number, demand: number, filled = 0): C => ({ id, demand, filled, waitedS: 0 });
async function mount(customers: C[]) {
  const g = new Game(b, mem() as any, () => 1760000000000, 1, 'test');
  g.state = { ...g.state, farmLevel: 12, customers, nextCustomerInS: 1e9, nextCustomerId: 100 } as any;
  const { mountApp } = await import('../src/ui/app');
  document.body.innerHTML = '<div id="app"></div>';
  const ui = mountApp(document.getElementById('app')!, g, b, { enabled: false, play() {}, unlock() {} } as any, 'test', { newGame: false });
  document.getElementById('modal-layer')?.classList.remove('open');
  ui.render();
  return { g, ui };
}
const chips = () => [...document.querySelectorAll<HTMLElement>('.chip.arrive')];
const num = (el: HTMLElement) => el.querySelector('.tag .num')!.textContent!;
const name = (el: HTMLElement) => (el.getAttribute('aria-label') ?? '').trim();

describe('orderChipLabel copy helper (one swappable string)', () => {
  it('singular only at raw 1; plural at 0 and >1; uses the given visible string verbatim', async () => {
    const { orderChipLabel } = await import('../src/ui/app');
    expect(orderChipLabel('1', 1)).toBe('1 egg wanted by customer');
    expect(orderChipLabel('0', 0)).toBe('0 eggs wanted by customer');
    expect(orderChipLabel('3', 3)).toBe('3 eggs wanted by customer');
    expect(orderChipLabel('1.24K', 1240)).toBe('1.24K eggs wanted by customer');
    // plural is decided from the RAW number, never the formatted string
    expect(orderChipLabel('1', 1.5)).toBe('1 eggs wanted by customer');
  });
});

describe('OC-A11Y-1/2: rendered .chip.arrive names', () => {
  it('name starts with .tag .num and is exactly "<num> egg(s) wanted by customer" (1, 0, 3, 1,500, 12.3K)', async () => {
    const raws = [1, 0, 3, 1500, 12_345];
    await mount(raws.map((r, i) => cust(i + 1, r + 2, 2)));
    const els = chips();
    expect(els.length).toBe(raws.length);
    els.forEach((el, i) => {
      const r = raws[i], n = num(el);
      expect(n).toBe(fmtCount(r));                       // same fmtCount string as the visible digit
      expect(name(el).startsWith(n)).toBe(true);           // OC-A11Y-1 label-in-name
      expect(name(el)).toBe(`${n} ${r === 1 ? 'egg' : 'eggs'} wanted by customer`); // OC-A11Y-2
    });
    expect(num(els[3])).toBe('1,500');
    expect(name(els[4])).toBe(`${fmtCount(12_345)} eggs wanted by customer`);
    expect(fmtCount(12_345)).not.toBe('12345');            // abbreviated value still drives the label
  });
  it('no aria-label="Customer" remains in chip markup; no role / live region added', async () => {
    await mount([cust(1, 4), cust(2, 1)]);
    for (const el of chips()) {
      expect(el.outerHTML).not.toContain('aria-label="Customer"');
      expect(el.hasAttribute('role')).toBe(false);
      expect(el.hasAttribute('aria-live')).toBe(false);
      expect(el.querySelector('[aria-live],[role=status],[role=alert]')).toBeNull();
      expect(el.tagName).toBe('BUTTON');
    }
  });
});

describe('OC-A11Y-3: name follows the count on re-render', () => {
  it('4 -> 3 -> 1 -> 0: name updates in the same render as .num, never stale', async () => {
    const { g, ui } = await mount([cust(7, 4)]);
    const el = chips()[0];
    expect(name(el)).toBe('4 eggs wanted by customer');
    for (const [filled, want] of [[1, '3 eggs wanted by customer'], [3, '1 egg wanted by customer'], [4, '0 eggs wanted by customer']] as const) {
      g.state = { ...g.state, customers: [{ ...g.state.customers[0], filled }] } as any;
      ui.render();
      const now = chips()[0];
      expect(now).toBe(el);                                // same chip element, updated in place
      expect(name(now)).toBe(want);
      expect(name(now).startsWith(num(now))).toBe(true);
    }
  });
});
