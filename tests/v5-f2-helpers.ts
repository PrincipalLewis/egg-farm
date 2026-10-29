import { balance as b } from '../src/config/balance';
/** v5 F2 tests: the shipping balance with the M5 release flags on (D-C1 m4.flags; shipping has none = all off). */
export const ON = { ...b, m4: { ...b.m4!, flags: { golden: 1, streak: 1, broody: 1, abilities: 1 } } } as typeof b;
