/** P1q/P2 order cards + "+N waiting" chip (art-ux/m3-customer-queue-spec.md v1.0). Pure helpers, unit-tested. */
import { queueMax, type Customer } from '../sim/state';
import type { Balance } from '../config/balance';
import { fmtCount, fmtMoney } from './format';
/** Spec §2.1: eggs >= 1,000 -> 1.2K (compact, 1 decimal). */
const eggs = (n: number) => n >= 1000 ? fmtCount(n).includes(',') ? `${(Math.floor(n / 100) / 10).toFixed(1)}K` : fmtCount(n) : String(n);
export type OrderState = 'wait' | 'partial' | 'ready';
export interface OrderView { id: number; have: number; want: number; sell: number; valueCents: number; state: OrderState; line: string; button: string; }
/** have = eggs already sold to it + what Sell would sell now (min(basket, remaining)); want = full order; value = full order. */
/** priceCents: per-egg price, or the payout function k -> cents (sim/payout saleValueCents) so the card equals the credit. */
export function orderView(c: Customer, basket: number, priceCents: number | ((k: number) => number)): OrderView {
  const rem = c.demand - c.filled, sell = Math.max(0, Math.min(Math.floor(basket), rem)), have = c.filled + sell, want = c.demand;
  const state: OrderState = sell === 0 ? 'wait' : sell < rem ? 'partial' : 'ready';
  const valueCents = typeof priceCents === 'function' ? priceCents(want) : want * priceCents;
  const value = !Number.isFinite(valueCents) ? '—' : valueCents > 0 && valueCents < 1 ? '$0.01' : fmtMoney(Math.max(1, Math.round(valueCents)));
  return { id: c.id, have, want, sell, valueCents, state, line: `${eggs(have)}/${eggs(want)} eggs · ${value}`,
    button: state === 'wait' ? `Need ${eggs(rem)}` : state === 'partial' ? `Sell ${eggs(sell)}` : 'Sell' };
}
/** Sheet body height rule (§1.1): 5 cards when the body has >= 384px, else 4. Desktop docked shows all. */
export const visibleOrders = (viewportH: number, docked: boolean, n: number) =>
  docked ? n : Math.min(n, 0.75 * viewportH - 56 - 72 - 24 >= 384 ? 5 : 4);
export const moreLabel = (hidden: number, expanded: boolean) => expanded ? 'Show less' : `+${hidden} waiting`;
export const moreName = (hidden: number, expanded: boolean) => expanded ? 'Show fewer customers' : `${hidden} more customers waiting, show all`;
/** Farm strip (§1.2): at most 5 chips; with > 5 customers show 4 + a "+N" chip. */
export const stripSplit = (n: number) => n > 5 ? { shown: 4, more: n - 4 } : { shown: n, more: 0 };
export function orderHtml(v: OrderView, avatar: string): string {
  const pct = v.want ? (v.have / v.want) * 100 : 0;
  return `<div class="order ${v.state}" data-row="${v.id}"><div class="av"><img src="${avatar}" alt=""></div>
    <div class="txt"><div class="l1"><span class="e">${v.line.split(' · ')[0]}</span><span class="v"> · ${v.line.split(' · ')[1]}</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${v.want}" aria-valuenow="${v.have}" aria-label="Order ${v.have} of ${v.want} eggs"><i style="width:${pct.toFixed(2)}%"></i></div></div>
    <button class="btn sell ${v.state === 'wait' ? '' : 'buy affordable'}" data-id="${v.id}" aria-disabled="${v.state === 'wait'}">${v.button}</button></div>`;
}
/** §6 Farm row preview when the next Farm level adds a customer slot (data-driven: queueMax(F+1) > queueMax(F)).
 *  Returns the two <li> lines (order-range line omitted when unchanged), or null. */
export function slotPreview(qNow: number, qNext: number, dNow: [number, number], dNext: [number, number], icon: string): string | null {
  if (qNext <= qNow) return null;
  const r = (d: [number, number]) => `${eggs(d[0])}–${eggs(d[1])}`;
  const lead = `<li class="slot" aria-label="Next level: plus 1 customer slot, ${qNow} to ${qNext}"><img src="${icon}" alt="">+${qNext - qNow} customer slot<span class="m"> (${qNow} → ${qNext})</span></li>`;
  const same = dNow[0] === dNext[0] && dNow[1] === dNext[1];
  return lead + (same ? '' : `<li class="orders">Orders ${r(dNow)} → ${r(dNext)} eggs</li>`);
}

/** F5: one queue length shared by the farm strip "+N" and the Market "+N waiting", updated at most once per `ms`
 *  (trailing: the latest value lands once the window passes). Each place subtracts what it shows itself. */
export class Coalesce {
  private v: number | null = null; private at = -Infinity;
  constructor(private ms: number, private now = () => performance.now()) {}
  read(latest: number): number {
    const t = this.now();
    if (this.v === null || latest <= 5 || this.v <= 5 || t - this.at >= this.ms) { if (latest !== this.v) { this.v = latest; this.at = t; } }
    return this.v;
  }
}
/** Strip split with live chips but the "+N" taken from the coalesced length. */
export const stripSplitAt = (live: number, coalesced: number) => { const s = stripSplit(live); return s.more ? { shown: s.shown, more: Math.max(1, coalesced - s.shown) } : s; };
/** F1: the "+1 customer slot" toast only on a level that really adds a slot (queue_max(F) > queue_max(F-1)). */
export const slotAdded = (F: number, b: Balance) => F > 0 && queueMax(F, b) > queueMax(F - 1, b);
/** F2: never "$0.00": a greyed Sell all reads "No eggs to sell". */
export const sellAllLabel = (eggs: number, cents: number, fc: (n: number) => string, fm: (c: number) => string) =>
  eggs > 0 ? `Sell all (${fc(eggs)} eggs\u00a0· ${fm(cents)})` : 'No eggs to sell';
