/** S2-8 header net rate + wage lines, S2-9 Market queue-full dot (Art & UX approved visuals, Oct 16).
 *  DATA SEAM: net rate, per-worker wage and the queue-full flag are meant to come from m3/rc1-s2-money. Until that lands
 *  they are derived here from existing sim data (same formulas as tick.ts wages / queueMax); swap these three functions. */
import type { Balance } from '../config/balance';
import { queueMax, type GameState } from '../sim/state';
import type { WorkerId } from '../sim/workers';
/** STUB (s2-money): wage in cents per second for a worker at Farm level F; 0 for workers without a wage. */
export const wagePerSecCents = (id: WorkerId, farm: number, b: Balance) =>
  id === 'market_hand' || id === 'coop_hand' ? b.workers[id].wage_per_farm_per_min * farm / 60 * 100 : 0;
/** STUB (s2-money): net rate = rolling sales income - wages of hired, paid, awake workers (cents/s). */
export function netRateCents(incomeCps: number, s: GameState, b: Balance) {
  let wages = 0;
  for (const id of ['market_hand', 'coop_hand'] as const) { const w = s.workers[id]; if (w && !w.unpaid && w.energy > 0) wages += wagePerSecCents(id, s.farmLevel, b); }
  return incomeCps - wages;
}
/** STUB (s2-money): queue-full flag. */
export const queueFull = (s: GameState, b: Balance) => s.customers.length >= queueMax(s.farmLevel, b);
/** "$0.03" under $1, "$1.2" under $100, then whole dollars with K/M. */
export function fmtRateAbs(cents: number) {
  const d = Math.abs(cents) / 100;
  if (d < 1) return `$${d.toFixed(2)}`;
  if (d < 100) return `$${(Math.round(d * 10) / 10).toString()}`;
  if (d < 1000) return `$${Math.round(d)}`;
  return d < 1e6 ? `$${(Math.floor(d / 100) / 10).toFixed(1)}K` : `$${(Math.floor(d / 1e5) / 10).toFixed(1)}M`;
}
/** Product ruling (Oct 16): show the exact rate charged. Under $0.10/s it reads per minute ("$0.75/min"), else per second. */
export function fmtExactRate(centsPerSec: number) {
  const a = Math.abs(centsPerSec);
  return a < 10 ? `$${(Math.round(a * 60) / 100).toFixed(2)}/min` : `${fmtRateAbs(a)}/s`;
}
export type RateSign = 'pos' | 'neg' | 'zero';
export function rateView(cps: number): { text: string; sign: RateSign; aria: string } {
  const perMinCents = Math.round(Math.abs(cps) * 60);
  if (perMinCents === 0) return { text: '$0/s', sign: 'zero', aria: 'Net income zero per second' };
  const t = fmtExactRate(cps), perMin = t.endsWith('/min');
  const cents = perMin ? perMinCents : Math.round(Math.abs(cps));
  const amount = cents < 100 ? `${cents} cent${cents === 1 ? '' : 's'}` : `${(perMin ? `$${(cents / 100).toFixed(2)}` : fmtRateAbs(cents)).replace('$', '')} dollars`;
  const unit = perMin ? 'minute' : 'second';
  return cps > 0 ? { text: `+${t}`, sign: 'pos', aria: `Net income plus ${amount} per ${unit}` }
    : { text: `\u2212${t}`, sign: 'neg', aria: `Net income minus ${amount} per ${unit}` };
}
/** Wage line markup (hire cards under the effect line; worker cards at the bottom). '' for unwaged workers. */
export const wageLine = (cents: number, coinIcon: string) => cents > 0 ? `<div class="wage num"><img src="${coinIcon}" width="12" height="12" alt="">Wage ${fmtExactRate(cents)}</div>` : '';
/** S2-9 dot state: shown while the queue is full and Market hasn't been opened during this full spell. */
export class QueueDot {
  private ack = false; private lastPulse = -Infinity;
  constructor(public periodMs = 10_000) {}
  /** Returns { show, pulse } for this frame. */
  update(full: boolean, marketOpen: boolean, nowMs: number, reducedMotion: boolean) {
    if (!full) this.ack = false; else if (marketOpen) this.ack = true;
    const show = full && !this.ack && !marketOpen;
    let pulse = false;
    if (show && !reducedMotion && nowMs - this.lastPulse >= this.periodMs) { pulse = true; this.lastPulse = nowMs; }
    if (!show) this.lastPulse = -Infinity;
    return { show, pulse };
  }
}
