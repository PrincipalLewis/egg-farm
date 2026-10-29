import { balance as b } from '../src/config/balance';
/** The G3 streak tc columns, not in economy.csv until the Economy CSV PR (row 4); cap = the ruled 0.27 (D-HOP-21/37). */
export const G3 = { streak_unlock_farm: 8, tap_credit_min_s: 1, streak_tier_count: 4, streak_cap: 0.27 };
/** v5 F2 tests: the shipping balance with the M5 release flags on (D-C1 m4.flags; shipping has none = all off), plus G3
 *  (validateBalance requires every tc key a flag reads, so the streak flag needs them). */
export const ON = { ...b, m4: { ...b.m4!, flags: { golden: 1, streak: 1, broody: 1, abilities: 1 }, tc: { ...b.m4!.tc!, ...G3 } } } as typeof b;
