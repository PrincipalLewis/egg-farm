/** v5 streak / tapCoins UI flag reads (R13a, ST-AC29): the only place the streak UI calls flagOn. Kept literal-free so the
 *  [F3-no-literal] gate (tests/v5-f3-config.test.ts) scans it; the UI's Art layout/unit constants live in the files that import it. */
import type { Balance } from '../config/balance';
import { flagOn } from '../config/flags';
/** Streak meter / A2 pops / chips: m4.flags.streak (needs m4.enabled). */
export const streakUiOn = (b: Balance) => flagOn(b, 'streak');
/** Tap-coin +$ pop: m4.flags.tapCoins (needs m4.enabled). Either can be cut alone. */
export const tapCoinUiOn = (b: Balance) => flagOn(b, 'tapCoins');
