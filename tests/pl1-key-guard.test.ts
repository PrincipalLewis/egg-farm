import { describe, it, expect, vi } from 'vitest';
import { keyGuard } from '../src/ui/key-guard';

// Minimal focused-button model: native activation = click on Enter/Space keyup unless default was prevented.
function press(key: string, repeat = false) {
  const buy = vi.fn(), close = vi.fn(); let prevented = false;
  const target = { closest: (s: string) => (s === 'button' ? target : null) };
  const ev = { key, repeat, target, preventDefault: () => { prevented = true; }, stopPropagation: vi.fn() };
  keyGuard(ev, close);
  if (!prevented && (key === 'Enter' || key === ' ')) buy();
  return { buy, close, ev };
}
describe('PL-1 keyboard guard', () => {
  it('Escape on a focused buy button never buys, only closes', () => {
    const r = press('Escape'); expect(r.buy).not.toHaveBeenCalled(); expect(r.close).toHaveBeenCalledTimes(1); expect(r.ev.stopPropagation).toHaveBeenCalled();
  });
  it('Enter and Space buy exactly once; held-key repeats do not', () => {
    for (const k of ['Enter', ' ']) { expect(press(k).buy).toHaveBeenCalledTimes(1); expect(press(k, true).buy).not.toHaveBeenCalled(); }
  });
  it('other keys never buy', () => { for (const k of ['Tab', 'a', 'ArrowDown']) expect(press(k).buy).not.toHaveBeenCalled(); });
});
