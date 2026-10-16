/**
 * B-1 rule 1: the ONE shared income selector. Realized net income per second =
 * coins actually credited from sales over a trailing window (default 5 s, tunable) / window - wages/s.
 * Never theoretical lay/production. HUD rate, goal ETA, upgrade cards and rates() all read incomePerSec().
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { totalWageCentsPerSec } from '../ui/rates';
export const INCOME_WINDOW_MS = 5_000;
export class IncomeMeter {
  private ev: { t: number; cents: number }[] = [];
  constructor(public windowMs = INCOME_WINDOW_MS) {}
  /** Record coins credited by a sale (player or Market Hand). */
  add(t: number, cents: number) { if (cents > 0) this.ev.push({ t, cents }); }
  /** Realized sales, cents/s, over the trailing window (old entries roll off, so it decays, never holds). */
  salesCentsPerSec(now: number) {
    this.ev = this.ev.filter(e => now - e.t < this.windowMs);
    return this.ev.reduce((a, e) => a + e.cents, 0) / (this.windowMs / 1000);
  }
}
/** Shared selector: realized net cents/s (sales over the window minus current wages). */
export const incomePerSec = (m: IncomeMeter, s: GameState, b: Balance, now: number) =>
  m.salesCentsPerSec(now) - totalWageCentsPerSec(s, b);
/** Goal/upgrade ETA in seconds; null ("—") when the net rate is <= 0 (rule 3). */
export const etaSeconds = (needCents: number, netCentsPerSec: number) =>
  needCents <= 0 ? 0 : netCentsPerSec > 0 ? needCents / netCentsPerSec : null;
