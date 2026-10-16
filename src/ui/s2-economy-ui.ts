/** S2-8 header net rate + wage lines, S2-9 Market queue-full dot (Art & UX approved visuals, Oct 16).
 *  HUD rate + aria both come from rateView over incomePerSec (T6 / MK-39 critic: one formatter). */
import type { Balance } from '../config/balance';
import { type GameState } from '../sim/state';
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
/** Queue-full flag — single source in ./rates (re-exported so QueueDot / older imports stay stable). */
export { queueFull } from './rates';
/** "$0.03" under $1, "$1.2" under $100, then whole dollars with K/M. */
export function fmtRateAbs(cents: number) {
  const d = Math.abs(cents) / 100;
  if (d < 1) return `$${d.toFixed(2)}`;
  if (d < 100) return `$${(Math.round(d * 10) / 10).toString()}`;
  if (d < 1000) return `$${Math.round(d)}`;
  return d < 1e6 ? `$${(Math.floor(d / 100) / 10).toFixed(1)}K` : `$${(Math.floor(d / 1e5) / 10).toFixed(1)}M`;
}
/** Two decimals below $1,000 ("$1.25", "$999.99"), else the short form ("$1.2K") — Product ruling Oct 16 10:12. */
export function fmtMoney2(absCents: number) {
  const c = Math.round(absCents);
  return c >= 1e5 ? fmtRateAbs(c) : `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fmtExactRate(centsPerSec: number) {
  const a = Math.abs(centsPerSec);
  return a < 10 ? `$${(Math.round(a * 60) / 100).toFixed(2)}/min` : `${fmtMoney2(a)}/s`;
}
export type RateSign = 'pos' | 'neg' | 'zero';

/** Single money token shared by HUD text and aria (T6). Always "$X.XX" / short form — never a second toFixed path. */
export function rateMoney(absCents: number): string {
  return fmtMoney2(Math.abs(Math.round(absCents)));
}

/**
 * HUD net-rate view. `text` and `aria` share `rateMoney` so the spoken amount always matches the visible one.
 * AC-R2: never positive while production is stopped; ≤0 → red ⚠.
 */
export function rateView(cps: number, opts: { stopped?: boolean } = {}): { text: string; sign: RateSign; aria: string; money: string } {
  let c = Math.sign(cps) * Math.round(Math.abs(cps));
  if (opts.stopped && c > 0) c = 0;
  if (c === 0) {
    const money = rateMoney(0);
    const aria = opts.stopped
      ? `Net income ${money} per second, production stopped`
      : `Net income ${money} per second`;
    return { text: `⚠ ${money}/s`, sign: opts.stopped ? 'neg' : 'zero', aria, money };
  }
  const money = rateMoney(c);
  if (c < 0) {
    return {
      text: `⚠ \u2212${money}/s`,
      sign: 'neg',
      aria: `Net income minus ${money} per second`,
      money,
    };
  }
  return {
    text: `+${money}/s`,
    sign: 'pos',
    aria: `Net income plus ${money} per second`,
    money,
  };
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
