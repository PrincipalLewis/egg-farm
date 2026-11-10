/**
 * HoQA (via HoE): vitest fixture for Breeds UI. Deep-clones the loaded balance.json and
 * sets ONLY m4.flags.breeds=1. balance.json itself stays at breeds=0 (no commit of that file).
 */
import { balance, type Balance } from '../../src/config/balance';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Assert two Balances are deep-equal (stable via JSON.stringify). */
export function assertBalanceDeepEqual(a: Balance, b: Balance, label = 'balance'): void {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${label}: deep-equal failed (len ${sa.length} vs ${sb.length})`);
}

/**
 * Deep-clone `base` (default: shipped `balance`) and set ONLY `m4.flags.breeds = 1`.
 * Asserts that restoring breeds to the original value yields a deep-equal clone of `base`.
 */
export function breedsOnBalance(base: Balance = balance): Balance {
  if (!base.m4?.flags || typeof base.m4.flags.breeds !== 'number') {
    throw new Error('breedsOnBalance: m4.flags.breeds missing on base');
  }
  const orig = clone(base);
  const b = clone(base);
  b.m4 = { ...b.m4!, flags: { ...b.m4!.flags!, breeds: 1 } };
  const rolled = clone(b);
  rolled.m4 = { ...rolled.m4!, flags: { ...rolled.m4!.flags!, breeds: orig.m4!.flags!.breeds } };
  assertBalanceDeepEqual(rolled, orig, 'breedsOnBalance isolation');
  if (b.m4!.flags!.breeds !== 1) throw new Error('breedsOnBalance: breeds flag not 1');
  return b;
}

/** Shipped-flag clone with breeds forced to 0 (module singleton left untouched). */
export function breedsOffBalance(base: Balance = balance): Balance {
  const b = clone(base);
  if (!b.m4?.flags) throw new Error('breedsOffBalance: m4.flags missing');
  b.m4 = { ...b.m4, flags: { ...b.m4.flags, breeds: 0 } };
  return b;
}
