/** S2-8 HUD net rate (Art & UX approved visuals, Oct 16). M4.1 patch 1 (S2 asleep signal, AC-R2 / AC-R7): ported from rc1
 *  8a49d35 / 7380b86 without the S2-8 wage lines, the s2-money stubs and the S2-9 queue dot (not part of AC-R1-R9).
 *  HUD rate + aria both come from rateView over incomePerSec (T6 / MK-39 critic: one formatter). */
import type { Balance } from '../config/balance';
import { type GameState } from '../sim/state';
import { incomePerSec, marketHandStalled } from '../econ/income';
import { fmtMoneyShort, spellShort } from './format';
export type RateSign = 'pos' | 'neg' | 'zero';
/** Single money token shared by HUD text and aria (T6). Two decimals below $1,000 ("$1.25", "$999.99", Product ruling Oct 16 10:12);
 *  from $1,000 the M41-9 short form (fmtMoneyShort: $1.2K ... $999.9Dc, then scientific) instead of rc1's K/M-only fmtRateAbs,
 *  so big rates never read "$1000.0M" (number-format-big). */
export function rateMoney(absCents: number): string {
  const c = Math.abs(Math.round(absCents));
  return c >= 1e5 ? fmtMoneyShort(c) : `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/** Header rate exactly as app.ts renders it (review 23a3798 #4): real incomePerSec. The aria adds ", sales stopped" ONLY when the cause is
 *  a hired Market Hand that is Asleep or Unpaid (HoE ruling Oct 24; §4.2: its live sales are 0, so the rate is <= 0). Another off worker
 *  never adds a reason to the HUD. */
export const headerRate = (s: GameState, b: Balance) => rateView(incomePerSec(s, b) * 100, { stopped: marketHandStalled(s, b) });
/** HUD net-rate view. `text` and `aria` share `rateMoney` so the spoken amount always matches the visible one (M41-9: Qa+ spelled in aria).
 *  PM Workers ruling (a): always the real rate. Red ⚠ (sign 'neg') only when the real rate is <= 0; a sub-cent positive rate rounds to $0.00
 *  but stays 'zero' (not red). `stopped` (Market Hand Asleep/Unpaid, headerRate) adds ", sales stopped" to the aria, only at a rounded $0.00 or below. */
export function rateView(cps: number, opts: { stopped?: boolean } = {}): { text: string; sign: RateSign; aria: string; money: string } {
  const c = Math.sign(cps) * Math.round(Math.abs(cps));
  if (c === 0) {
    const money = rateMoney(0);
    return { text: `⚠ ${money}/s`, sign: cps <= 0 ? 'neg' : 'zero', aria: `Net income ${money} per second${opts.stopped ? ', sales stopped' : ''}`, money };
  }
  const money = rateMoney(c), spoken = spellShort(money);
  if (c < 0) return { text: `⚠ \u2212${money}/s`, sign: 'neg', aria: `Net income minus ${spoken} per second${opts.stopped ? ', sales stopped' : ''}`, money };
  return { text: `+${money}/s`, sign: 'pos', aria: `Net income plus ${spoken} per second`, money };
}
/** m6 (option A): '⚠ ' is a marker only; app.ts renders it as the inline WARN_SVG and never paints the glyph.
 *  HUD header rate (Cut A FIX3, T6): negative/stopped -> '⚠ ▼ <rest>' (e.g. '⚠ ▼ $0.00/s', '⚠ ▼ −$0.03/s'); otherwise rateView's text. Pure, shared by app.ts and tests (reviewer m2). */
export const headerRateText = (v: { text: string; sign: RateSign }) => v.sign === 'neg' ? `⚠ ▼ ${v.text.replace(/^⚠ /, '')}` : v.text;
