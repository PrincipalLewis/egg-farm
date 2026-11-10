// @vitest-environment jsdom
// v5 streak price chips in the Market DOM (ui/streak-chips-dom.ts): order-card lines + Sell all (S-AC19/20, ST-AC22).
import { describe, it, expect, beforeEach } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { PLAYER_SALE, playerSaleCtx } from '../src/sim/effects';
import { syncPriceChips } from '../src/ui/streak-chips-dom';

const mk = (flags: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, flags: { ...balance.m4!.flags, ...flags } } }) as Balance;
const S = mk({ streak: 1 }), SG = mk({ streak: 1, golden: 1 }), st = (x: object) => ({ ...({} as any), ...x });
const card = (id: number) => `<div class="order" data-row="${id}"><div class="txt"><div class="l1"><span class="n">4/17&nbsp;</span><span class="egg">eggs</span><span class="v">&nbsp;· $9.84</span></div></div><button></button></div>`;
const SHELL = `<div id="mRows">${card(1)}${card(2)}</div><div class="foot"><button class="btn" id="sellAll">Sell all 8 eggs · $19.68</button></div>`;
let list: HTMLElement, sell: HTMLElement;
beforeEach(() => { document.body.innerHTML = SHELL; list = document.getElementById('mRows')!; sell = document.getElementById('sellAll')!; });
const chips = () => [...document.querySelectorAll('.price-chips')].map(e => e.textContent);

describe('syncPriceChips', () => {
  it('streak flag off (shipped balance): the DOM is untouched even with s > 0', () => {
    const before = document.body.innerHTML; syncPriceChips(list, sell, st({ streakS: 0.2 }), balance, PLAYER_SALE, 390);
    expect(document.body.innerHTML).toBe(before);
  });
  it('s > 0: every order line and Sell all get one +N% chip; Sell all text is untouched; repeat calls are idempotent', () => {
    for (let i = 0; i < 3; i++) syncPriceChips(list, sell, st({ streakS: 0.187 }), S, PLAYER_SALE, 390);
    expect(chips()).toEqual(['+18%', '+18%', '+18%']);
    expect(document.querySelectorAll('.order .l1 > .price-chips')).toHaveLength(2);
    expect(sell.previousElementSibling!.classList.contains('sellall-chips')).toBe(true); expect(sell.textContent).toBe('Sell all 8 eggs · $19.68');
    expect(document.querySelector('.price-chip')!.getAttribute('aria-label')).toBe('Streak +18% price');
  });
  it('chips go when the bonus ends (s = 0) or is suspended under a menu (preview ctx not attended, R12)', () => {
    syncPriceChips(list, sell, st({ streakS: 0.1 }), S, PLAYER_SALE, 390); expect(chips()).toHaveLength(3);
    syncPriceChips(list, sell, st({ streakS: 0.1 }), S, playerSaleCtx(false), 390); expect(chips()).toEqual([]);
    syncPriceChips(list, sell, st({ streakS: 0.1 }), S, PLAYER_SALE, 390); syncPriceChips(list, sell, st({ streakS: 0 }), S, PLAYER_SALE, 390); expect(chips()).toEqual([]);
  });
  it('Frenzy: gold 2x first then meadow; at <= 360 an overflowing line collapses to one 2x+ chip (S-AC20)', () => {
    syncPriceChips(list, sell, st({ streakS: 0.14, frenzyRemainingS: 5 }), SG, PLAYER_SALE, 390);
    expect([...document.querySelectorAll('.order .l1 .price-chip')].slice(0, 2).map(e => e.className)).toEqual(['price-chip frenzy', 'price-chip streak']);
    const l1 = document.querySelector<HTMLElement>('.order .l1')!; // jsdom has no layout: fake an overflow on the first line only
    Object.defineProperty(l1, 'scrollWidth', { value: 300, configurable: true }); Object.defineProperty(l1, 'clientWidth', { value: 200, configurable: true });
    syncPriceChips(list, sell, st({ streakS: 0.14, frenzyRemainingS: 5 }), SG, PLAYER_SALE, 360);
    expect([...l1.querySelectorAll('.price-chip')].map(e => e.className)).toEqual(['price-chip combined']);
    expect(document.querySelectorAll('.order')[1].querySelectorAll('.price-chip')).toHaveLength(2); // no overflow: both stay
    syncPriceChips(list, sell, st({ streakS: 0.14, frenzyRemainingS: 5 }), SG, PLAYER_SALE, 390); // wider: never collapsed
    expect(l1.querySelectorAll('.price-chip')).toHaveLength(2);
  });
});
