/** P1q/P2 order cards + "+N waiting" chip (art-ux/m3-customer-queue-spec.md v1.0). Pure helpers, unit-tested. */
import { queueMax, type Customer } from '../sim/state';
import type { Balance } from '../config/balance';
import { fmtCount, fmtMoney, fmtMoneyPreview, fmtMoneyExact } from './format';
/** Spec §2.1: eggs >= 1,000 -> 1.2K (compact, 1 decimal). */
const eggs = (n: number) => n < 1000 ? String(n) : n < 1e4 ? `${(Math.floor(n / 100) / 10).toFixed(1)}K` : fmtCount(n); // band by number, not by fmtCount's comma (1,000T)
export type OrderState = 'wait' | 'partial' | 'ready';
export interface OrderView {
  id: number; have: number; want: number; sell: number;
  /** Full order value (want eggs) — stays on the card line (P2 / HoP / MK-23). */
  valueCents: number;
  /** What THIS Sell pays (sell eggs) via the same payout as credit; 0 when wait. Shown on the Sell button (MK-24). */
  sellCents: number;
  state: OrderState; line: string;
  /** Row aria: "4 of 17 eggs delivered, order worth $93.84" (Art & UX). */
  lineAria: string;
  /** Visible Sell label: eggs + floored short money (HoP 15:14). */
  button: string;
  /** Exact amount for screen readers / aria-label (popup and Thanks stay exact too). */
  buttonAria: string;
}
/** have = filled (eggs already delivered); want = demand; valueCents = full order; sellCents = this Sell.
 *  Product: card shows delivered eggs (e.g. 4/17), not filled+this-Sell. MK-23: progress filled/N; $ = full order. */
/** priceCents: per-egg price, or k -> cents (sim/payout saleValueCents) so Sell button == credit. */
export function orderView(c: Customer, basket: number, priceCents: number | ((k: number) => number)): OrderView {
  const rem = c.demand - c.filled, sell = Math.max(0, Math.min(Math.floor(basket), rem)), have = c.filled, want = c.demand;
  const state: OrderState = sell === 0 ? 'wait' : sell < rem ? 'partial' : 'ready';
  const pay = (k: number) => typeof priceCents === 'function' ? priceCents(k) : k * priceCents;
  const valueCents = pay(want), sellCents = sell > 0 ? pay(sell) : 0;
  const cardMoney = (cents: number) => !Number.isFinite(cents) ? '—' : cents > 0 && cents < 1 ? '$0.01' : fmtMoney(Math.max(1, Math.round(cents)));
  const exact = (cents: number) => !Number.isFinite(cents) ? '—' : cents > 0 && cents < 1 ? '$0.01' : fmtMoneyExact(Math.max(1, Math.round(cents)));
  const preview = (cents: number) => !Number.isFinite(cents) ? '—' : cents > 0 && cents < 1 ? '$0.01' : fmtMoneyPreview(Math.max(1, Math.round(cents)));
  const value = cardMoney(valueCents);
  // MK-24 / HoP 15:14: visible button uses floored short money; aria / popup / Thanks use fmtMoneyExact.
  const wait = `Need ${eggs(rem)}`;
  const button = state === 'wait' ? wait : `Sell ${eggs(sell)} · +${preview(sellCents)}`;
  const buttonAria = state === 'wait' ? wait : `Sell ${eggs(sell)} · +${exact(sellCents)}`;
  const line = `${eggs(have)}/${eggs(want)}\u00a0eggs · ${value}`; // Art & UX: NBSP between count and eggs
  const lineAria = `${eggs(have)} of ${eggs(want)} eggs delivered, order worth ${exact(valueCents)}`;
  return { id: c.id, have, want, sell, valueCents, sellCents, state, line, lineAria, button, buttonAria };
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
  const parts = v.button.split('\u00a0· ');
  const inner = v.state === 'wait' ? v.button : `<span class="sk">${parts[0]}</span><span class="sy">${parts[1] ?? ''}</span>`;
  const count = `${eggs(v.have)}/${eggs(v.want)}`;
  return `<div class="order ${v.state}" data-row="${v.id}"><div class="av"><img src="${avatar}" alt=""></div>
    <div class="txt" aria-label="${v.lineAria}"><div class="l1"><span class="n">${count}\u00a0</span><span class="egg">eggs</span><span class="v"> · ${v.line.split(' · ')[1]}</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${v.want}" aria-valuenow="${v.have}" aria-label="${v.lineAria}"><i style="width:${pct.toFixed(2)}%"></i></div></div>
    <button class="btn sell ${v.state === 'wait' ? '' : 'buy affordable'}" data-id="${v.id}" aria-disabled="${v.state === 'wait'}" aria-label="${v.buttonAria}">${inner}</button></div>`;
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
