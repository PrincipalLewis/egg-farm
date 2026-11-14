import { balance as b } from '../src/config/balance';
/** The G3 streak tc columns, not in economy.csv until the Economy CSV PR (row 4). Cap of record for v5 = 0.28 while m4.flags.breeds
 *  = 0 (D-HOP-2026-10-29-08 (1), CSV 8dc90e2b); 0.27 only if Breeds ships (the breeds PR carries it). */
export const G3 = { streak_unlock_farm: 8, tap_credit_min_s: 1, streak_tier_count: 4, streak_cap: 0.28 };
/** v5 F2 tests: the shipping balance with the M5 release flags on (D-C1 m4.flags; shipping has the full F3 flags block with every flag 0), plus G3
 *  (validateBalance requires every tc key a flag reads, so the streak flag needs them). */
export const ON = { ...b, m4: { ...b.m4!, flags: { ...b.m4!.flags, golden: 1, streak: 1, broody: 1, abilities: 1 }, tc: { ...b.m4!.tc!, ...G3 } } } as typeof b;
