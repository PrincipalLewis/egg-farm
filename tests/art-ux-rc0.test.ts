// Art & UX rc0 review fixes (art-ux/reviews/rc0-pt1-13-queue-review.md F1/F2/F4/F5) + rotate prompt + font credits.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { balance as b } from '../src/config/balance';
import { slotAdded, sellAllLabel, Coalesce, stripSplitAt, orderView } from '../src/ui/orders';
import { rotateShown, ROTATE_QUERY, ROTATE_TITLE, ROTATE_BODY } from '../src/ui/rotate-prompt';
describe('F1 slot toast only when a slot is added', () => {
  it('true only at F5/10/15/20', () => { expect([...Array(31).keys()].filter(F => slotAdded(F, b))).toEqual([5, 10, 15, 20]); });
});
describe('F2 greyed Sell all', () => {
  it('"No eggs to sell", never $0.00', () => { expect(sellAllLabel(0, 0, String, c => `$${c / 100}`)).toBe('No eggs to sell'); expect(sellAllLabel(3, 300, String, c => `$${c / 100}`)).toBe('Sell all (3 eggs\u00a0· $3)'); });
});
describe('F4 separator', () => { it('" · " with spaces on both sides', () => {
  expect(orderView({ id: 1, demand: 50, filled: 48, waitedS: 0 }, 0, 748).line).toMatch(/^48\/50 eggs · \$/);
  expect(orderView({ id: 1, demand: 50, filled: 0, waitedS: 0 }, 48, 748).line).toMatch(/^0\/50 eggs · \$/); // basket does not inflate delivered count
}); });
describe('F5 shared coalesced waiting count', () => {
  it('one value for strip and Market, <= 1 change / 2 s, trailing', () => {
    let t = 0; const c = new Coalesce(2000, () => t);
    expect(c.read(10)).toBe(10); t = 500; expect(c.read(9)).toBe(10); t = 2000; expect(c.read(9)).toBe(9);
    expect(stripSplitAt(10, c.read(10))).toEqual({ shown: 4, more: 5 }); // both places read the same 9 -> strip +5, Market (4 cards) +5 waiting
  });
});
describe('rotate-to-portrait prompt', () => {
  it('query and copy per spec; recovery dialog takes priority', () => {
    expect(ROTATE_QUERY).toBe('(orientation:landscape) and (pointer:coarse) and (max-height:499px)');
    expect([ROTATE_TITLE, ROTATE_BODY]).toEqual(['Turn your phone', 'Egg Farm plays best in portrait.']);
    expect(rotateShown(true, false)).toBe(true); expect(rotateShown(true, true)).toBe(false); expect(rotateShown(false, false)).toBe(false);
  });
});
describe('font credits', () => {
  it('OFL bundled, Settings line verbatim, README credits', () => {
    expect(existsSync(new URL('../public/fonts/OFL.txt', import.meta.url))).toBe(true);
    const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
    expect(app).toContain('Fonts: Fredoka © 2016 The Fredoka Project Authors; Nunito © 2014 The Nunito Project Authors. <a href="${import.meta.env.BASE_URL}fonts/OFL.txt"');
    expect(readFileSync(new URL('../README.md', import.meta.url), 'utf8')).toContain('## Credits');
  });
});
