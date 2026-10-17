/** P1q/P2 order cards + "+N waiting" chip (art-ux/m3-customer-queue-spec.md v1.0). Pure helpers, unit-tested. */
import { queueMax, type Customer } from '../sim/state';
import type { Balance } from '../config/balance';
import { fmtCount, fmtMoney } from './format';
/** Spec §2.1: eggs >= 1,000 -> 1.2K (compact, 1 decimal). */
/** rc2-order-sell-preview v1.1 (b): counts >= 1,000 use 3 significant figures with K/M/B/T (rolls over: 999.5B -> 1T); below 1,000 exact. */
export const count3 = (n: number): string => {
  if (!isFinite(n)) return '—'; if (n < 1000) return String(Math.floor(n));
  const U = ['K', 'M', 'B', 'T']; let i = -1, v = n; while (v >= 1000 && i < U.length - 1) { v /= 1000; i++; }
  let r = Number(v.toPrecision(3)); if (r >= 1000 && i < U.length - 1) { r = Number((r / 1000).toPrecision(3)); i++; }
  return `${r}${U[i]}`;
};
const eggsLegacy = (n: number) => n >= 1000 ? fmtCount(n).includes(',') ? `${(Math.floor(n / 100) / 10).toFixed(1)}K` : fmtCount(n) : String(n);
export type OrderState = 'wait' | 'partial' | 'ready';
export interface OrderView { id: number; have: number; want: number; sell: number; valueCents: number; state: OrderState; line: string; button: string; /** progressbar name */ aria: string; }
/** have = eggs already sold to it + what Sell would sell now (min(basket, remaining)); want = full order; value = full order. */
export function orderView(c: Customer, basket: number, priceCents: number): OrderView {
  const rem = c.demand - c.filled, sell = Math.max(0, Math.min(Math.floor(basket), rem)), have = c.filled + sell, want = c.demand;
  const state: OrderState = sell === 0 ? 'wait' : sell < rem ? 'partial' : 'ready';
  const valueCents = want * priceCents;
  const value = !Number.isFinite(valueCents) ? '—' : valueCents > 0 && valueCents < 1 ? '$0.01' : valueCents >= 1e11 ? `$${count3(valueCents / 100)}` /* §9: 3 sig figs from $1B ('$181B', '$1.78T'); the v3 base fmtMoney has no T tier and gives '$181.2B'/'$1000B' (review dbc6948 nit 5) */ : fmtMoney(Math.max(1, Math.round(valueCents)));
  return { id: c.id, have, want, sell, valueCents, state, line: state === 'ready' ? `✓ Ready · ${value}` : have === 0 ? `Wants ${count3(want)} eggs · ${value}` : `${count3(have)}/${count3(want)} eggs · ${value}`, // v1.1 (a)/(b); rc2 M-Order-zero: 'Wants 13' until the first egg
    aria: have === 0 ? `Customer wants ${want} eggs` : `Order ${have} of ${want} eggs`,
    button: state === 'wait' ? (basket < 1 ? 'No eggs' : `Need ${count3(rem)}`) : state === 'partial' ? `Sell ${count3(sell)}` : 'Sell' }; // MK-35: 0 eggs -> 'No eggs'
}
/** m3-customer-queue-spec §2.4 (:62): when line 1 doesn't fit, drop the whole word " eggs" ("0/1.8M · $9.94M"); never cut mid-word. */
/** rc2 M-Order-zero (rc2-order-sell-preview §9): 'Wants 13 eggs' follows the same rule as '4/17 eggs': drop " eggs" when it doesn't fit (always at <=375). */
export const fitOrderEggs = (e: string, fits: (s: string) => boolean): string => fits(e) ? e : e.replace(/ eggs$/, '');
/** §9 decision used by OrderList: <=375 always drops ' eggs'; wider keeps it only when it fits; 'Wants N' that still doesn't fit shows the value alone (§9.1). The value is never cut (review dbc6948 #3). */
export const fitOrderText = (e: string, narrow: boolean, fits: (s: string) => boolean): string => {
  const t = narrow ? e.replace(/ eggs$/, '') : fitOrderEggs(e, fits);
  const w = /^Wants (\S+)$/.exec(t), r = /^(\S+)\/\S+$/.exec(t);
  // §9.1 (Head of Art & UX 09:26): value never cut; drop '/{want}' ('1.23M · $20.8M'), then the count ('$20.8M'); 'Wants N' -> ''. '' = value only.
  const chain = [t, ...(!w && r ? [r[1]] : []), '']; // 'Wants N' that doesn't fit goes straight to the value alone ('0/N' was rejected for the zero line, review 6a744d6 #1)
  for (const c of chain.slice(0, -1)) if (fits(c)) return c;
  return '';
};
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
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${v.want}" aria-valuenow="${v.have}" aria-label="${v.aria}"><i style="width:${pct.toFixed(2)}%"></i></div></div>
    <button class="btn sell ${v.state === 'wait' ? '' : 'buy affordable'}${v.button.length > 9 ? ' long' : ''}" data-id="${v.id}" aria-disabled="${v.state === 'wait'}">${v.button}</button></div>`;
}
/** §6 Farm row preview when the next Farm level adds a customer slot (data-driven: queueMax(F+1) > queueMax(F)).
 *  v1.2 (S2-3b, Product ruling final): lead "+1 customer (max N)", N = the new queue_max; "New coop look" above it on a coop step.
 *  Returns the <li> lines (order-range line omitted when unchanged), or null. */
export function slotPreview(qNow: number, qNext: number, dNow: [number, number], dNext: [number, number], icon: string, coopStep = false): string | null {
  if (qNext <= qNow) return null;
  const r = (d: [number, number]) => `${eggsLegacy(d[0])}–${eggsLegacy(d[1])}`;
  const coop = coopStep ? `<li class="coopnew">New coop look</li>` : '';
  const lead = `<li class="slot" aria-label="Next level: plus ${qNext - qNow} customer, queue holds up to ${qNext}"><img src="${icon}" alt="">+${qNext - qNow} customer<span class="m"> (max ${qNext})</span></li>`;
  const same = dNow[0] === dNext[0] && dNow[1] === dNext[1];
  return coop + lead + (same ? '' : `<li class="orders">Orders ${r(dNow)} → ${r(dNext)} eggs</li>`);
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
/** rc2 M-SellAll-empty: eggs in the basket but no customers -> "Waiting for customers"; an empty basket keeps "No eggs to sell". */
export const sellAllLabel = (eggs: number, cents: number, fc: (n: number) => string, fm: (c: number) => string, basket = 0, customers = 0) =>
  eggs > 0 ? `Sell all (${fc(eggs)} eggs\u00a0· ${fm(cents)})` : basket >= 1 && customers === 0 ? 'Waiting for customers' : 'No eggs to sell';
/** rc2 M-Sold-freeze: the disabled chip a served row shows for SOLD_HOLD_MS before it leaves. */
export const soldLabel = (money: string) => `Sold! +${money}`;
export const SOLD_HOLD_MS = 240, SOLD_FADE_RM_MS = 120;
/** M-Sold-freeze removal plan for one OrderList.apply (pure, unit-tested; review ebbd02e #2/#4/#5).
 *  gone = nodes no longer shown; soldUntil = held Sold rows. Held rows stay (even under a pointer freeze they only leave once
 *  the hold ends, and they always leave, freeze or not: they never move under the finger). Everything that animates out
 *  leaves together in ONE batch (one timer, one FLIP); `ms` = 240, or 120 with reduced motion. */
export function planRemovals(o: { gone: number[]; inQueue: (id: number) => boolean; soldUntil: ReadonlyMap<number, number>; t: number; frozen: boolean; rm: boolean; lastLeave: number }) {
  const keep: number[] = [], animate: number[] = [], drop: number[] = [];
  const sold = (id: number) => o.soldUntil.has(id) && !o.inQueue(id);
  const free = o.gone.filter(id => !((o.soldUntil.get(id) ?? 0) > o.t));
  for (const id of o.gone) if (!free.includes(id)) keep.push(id);
  const others = free.filter(id => !sold(id));
  if (o.frozen) keep.push(...others); // non-sold removals still wait for the pointer freeze
  const anim1 = !o.frozen && !o.rm && others.length === 1 && !o.inQueue(others[0]) && o.t - o.lastLeave >= 240;
  for (const id of free) { if (sold(id)) animate.push(id); else if (!o.frozen) (anim1 ? animate : drop).push(id); }
  return { keep, animate, drop, ms: o.rm ? SOLD_FADE_RM_MS : 240 };
}

/** Coin-burst start just above a source rect's top edge (rc2 designer minor), clamped by the caller. */
export const startAbovePoint = (r: { left: number; top: number; width: number }, size: number) => ({ x: r.left + r.width / 2, y: r.top - size / 2 - 2 });
/** QA B4 riser top: 44px above the button; null when its 48px rise would leave the safe top (skip, review ebbd02e #7). */
export const riserTop = (btnTop: number, insetT: number): number | null => { const top = btnTop - 44; return top - 48 >= insetT + 2 ? top : null; };
/** Empty state shows only when no customers, no keyed rows and no rows still leaving. */
export const emptyHidden = (customers: number, nodes: number, leavingN: number) => customers > 0 || nodes > 0 || leavingN > 0;

/** §9.1 render pair: value alone (no leading '· ') once the count is dropped (review 1827a27 #3). */
export const orderLineText = (fe: string, val: string) => ({ e: fe, v: fe ? `\u00a0· ${val}` : val });
