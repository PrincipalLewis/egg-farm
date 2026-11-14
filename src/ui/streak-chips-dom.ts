/**
 * v5 streak price chips in the Market: order-card price lines and Sell all (m4-collect-streak-spec v0.3 §4.5 / S-AC19 / S-AC20,
 * kept by m5-streak-tap-coins-spec v1.3.3 §3.5 + ST-AC22; combo-tiers v0.3 §4.1: no tier-based change). app.ts calls this once per
 * market render, after the order list and the Sell all label (HoE ruling 2026-11-10: one app.ts line).
 * - m4.flags.streak off: returns before touching the DOM (flag off = rc1 byte-identical).
 * - The chips come from ui/streak-chips.ts priceChips() with the same SaleCtx as the previews (CCR F-2), so a chip shows exactly
 *   when that uplift is in the price shown; none while suspended under a menu (R12).
 * - Each `.order .l1` gets one trailing `span.price-chips` (order-list.ts fills only .n/.egg/.v, so the span survives its updates);
 *   Sell all gets one `span.price-chips.sellall-chips` just before #sellAll (the button text is set as textContent each frame).
 * - S-AC20: at the phone layout (<= 360 px wide) two chips that overflow their line collapse into one gold `2×+` chip.
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import type { SaleCtx } from '../sim/effects';
import { streakUiOn } from './streak-flags';
import { priceChips, priceChipsHtml } from './streak-chips';
import './streak-chips.css';

/** S-AC20 "at 360": the phone layout width at or below which an overflowing pair collapses (layout px). */
const COLLAPSE_MAX_VW = 360;

const put = (host: Element, before: Element | null, html: string, cls: string): HTMLElement | null => {
  let el = host.querySelector<HTMLElement>(`:scope > span.${cls.split(' ').join('.')}`);
  if (!html) { el?.remove(); return null; }
  const inner = html.replace(/^<span class="price-chips">/, '').replace(/<\/span>$/, '');
  if (!el) { el = host.ownerDocument.createElement('span'); el.className = cls; host.insertBefore(el, before); }
  if (el.innerHTML !== inner) el.innerHTML = inner;
  return el;
};
const overflows = (line: HTMLElement) => line.scrollWidth > line.clientWidth + 0.5;

export function syncPriceChips(list: HTMLElement, sellAll: HTMLElement, s: GameState, b: Balance, ctx: SaleCtx, vw = innerWidth): void {
  if (!streakUiOn(b)) return;
  const full = priceChips(s, b, ctx), html = priceChipsHtml(full), small = vw <= COLLAPSE_MAX_VW && full.length > 1;
  const collapsed = small ? priceChipsHtml(priceChips(s, b, ctx, { collapse: true })) : html;
  for (const l1 of list.querySelectorAll<HTMLElement>('.order .l1')) {
    const el = put(l1, null, html, 'price-chips');
    if (el && small && overflows(l1)) put(l1, null, collapsed, 'price-chips');
  }
  const foot = sellAll.parentElement; if (!foot) return;
  const el = put(foot, sellAll, html, 'price-chips sellall-chips');
  if (el && small && overflows(foot)) put(foot, sellAll, collapsed, 'price-chips sellall-chips');
}
