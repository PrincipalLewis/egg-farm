/**
 * M5.1 zero-gain (ZG) purchase UI: the pure, read-only verdict (spec product/collection/m5.1-zero-gain-purchase-ui.md
 * v0.3.7 sha1 f86de04e, §5.2 / §5.2a / §5.6; HoE 02:55, 02:58, 03:19). Flag: m4.flags.zeroGainUi (single m4.* namespace,
 * manifest rule 5 / row 28; the spec spells it m5.flags.*). UI-only: econ/best-buy.ts, pick-hysteresis exports, the sim
 * and the bots are untouched (ZG-AC13).
 */
import type { Balance } from '../config/balance';
import type { GameState } from '../sim/state';
import { options, type BuyKey } from '../econ/best-buy';
import { incomePerSec } from '../econ/income';
import { trackCoopCapacity } from '../config/formulas';
import { flagOn } from '../config/flags';
import type { Scorer } from './pick-hysteresis';

/** Non-exempt keys. FARM and W1–W4 are never ZG (D-HOP-37, ZG-AC2). */
export const ZG_KEYS: readonly BuyKey[] = ['COLL', 'HENS', 'VALUE'];
/** Buy's accessible description (UI doc §2 / ZG-AC4), exact text. */
export const ZG_DESC = "No income gain now. Buying won't raise income.";
export const ZG_CHIP = 'No gain now';
/** HoE 03:19 dev assert: finite and |x| <= 2^53 (not a safe-integer check). 2^53 = MAX_SAFE_INTEGER + 1, exact in a double. */
const LIM = Number.MAX_SAFE_INTEGER + 1;
const DEV = !!import.meta.env?.DEV;
const assertNum = (x: number, what: string) => {
  if (!(Number.isFinite(x) && Math.abs(x) <= LIM)) throw new Error(`zeroGainVerdict: ${what} = ${x} is not finite with |x| <= 2^53`);
};
/** Spec §5.2: ZG iff incAfter <= incBefore (unrounded $/s, no ε) AND dCap <= 0. `NaN <= x` is false, so an assert-free
 *  build gives false (not ZG) for NaN. `dev` defaults to the build's DEV flag; tests pass it explicitly. */
export function zeroGainVerdict(incBefore: number, incAfter: number, dCap: number, dev = DEV): boolean {
  if (dev) { assertNum(incBefore, 'incBefore'); assertNum(incAfter, 'incAfter'); }
  return incAfter <= incBefore && dCap <= 0;
}
const working = { assumeWorking: true as const };
/** The verdict's inputs for one offered key (same function and inputs as optionGain), or null when not offered/exempt. */
export function zeroGainInputs(s: GameState, b: Balance, key: BuyKey): { incBefore: number; incAfter: number; dCap: number } | null {
  if (!ZG_KEYS.includes(key)) return null;
  const o = options(s, b).find(x => x.key === key); if (!o) return null;
  const dCap = trackCoopCapacity(o.after.farmLevel, o.after.hensLevel, b) - trackCoopCapacity(s.farmLevel, s.hensLevel, b);
  return { incBefore: incomePerSec(s, b, working), incAfter: incomePerSec(o.after, b, working), dCap };
}
/** isZeroGain(s, b, key): pure; never mutates `s`, dispatches, or touches rng/time. Exempt or not offered -> false. */
export function isZeroGain(s: GameState, b: Balance, key: BuyKey, dev = DEV): boolean {
  const i = zeroGainInputs(s, b, key); return !!i && zeroGainVerdict(i.incBefore, i.incAfter, i.dCap, dev);
}
/** Flag read (boot-time in the UI). Needs m4.enabled (flagOn). */
export const zeroGainUiOn = (b: Balance): boolean => flagOn(b, 'zeroGainUi');
/** §5.6: drop ZG rows BEFORE the pick; rows (and their payback) are otherwise the stock scorer's. */
export const zgFiltered = (scorer: Scorer, pred: (s: GameState, b: Balance, k: BuyKey) => boolean = isZeroGain): Scorer =>
  (s, b) => scorer(s, b).filter(r => !pred(s, b, r.key));
/** Upgrade-row key -> BuyKey (UI row kinds). */
export const ZG_KEY_OF: Record<'collection' | 'hens' | 'eggValue', BuyKey> = { collection: 'COLL', hens: 'HENS', eggValue: 'VALUE' };
