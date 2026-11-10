// v5 streak R2/R3 tap filter + R16 tier-pitched collect (ui/streak-tap.ts), pure.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { tapIgnored, collectRate } from '../src/ui/streak-tap';
import { tierThresholds, streakParams } from '../src/ui/streak-view';

const mk = (flags: Record<string, number>): Balance => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...flags } } }) as Balance;
const ON = mk({ streak: 1, tapCoins: 1 }), COINS = mk({ streak: 0, tapCoins: 1 }), OFF = mk({ streak: 0, tapCoins: 0 });
const trusted = { isTrusted: true, detail: 1 }, key = { isTrusted: true, detail: 0 }, synth = { isTrusted: false, detail: 0 };

describe('tapIgnored (R2/R3)', () => {
  it('flags off: never filters (rc1), not even synthetic or key-repeat', () => {
    expect(tapIgnored(OFF, synth, true)).toBe(false); expect(tapIgnored(balance, synth, false)).toBe(false);
  });
  it('streak or tapCoins on: synthetic clicks and held-key repeats are ignored; pointer and first key press count', () => {
    for (const b of [ON, COINS]) {
      expect(tapIgnored(b, synth, false)).toBe(true);
      expect(tapIgnored(b, key, true)).toBe(true);
      expect(tapIgnored(b, key, false)).toBe(false);
      expect(tapIgnored(b, trusted, true)).toBe(false); // a pointer click (detail >= 1) is not a key repeat
      expect(tapIgnored(b, trusted, false)).toBe(false);
    }
  });
});

describe('collectRate (R16 / CT-AC6)', () => {
  const T = tierThresholds(streakParams(ON));
  it('credited tap after tier k: 2^(k/12), +4 st at MAX; base pitch at tier 0', () => {
    expect(collectRate({ streakS: 0.01 }, ON, true)).toBe(1);
    T.forEach((t, i) => expect(collectRate({ streakS: t }, ON, true)).toBeCloseTo(2 ** ((i + 1) / 12), 12));
    expect(collectRate({ streakS: T[T.length - 1] }, ON, true)).toBeCloseTo(2 ** (4 / 12), 12);
  });
  it('uncounted tap, streak off (tapCoins only), or flags off: rate 1', () => {
    expect(collectRate({ streakS: T[2] }, ON, false)).toBe(1);
    expect(collectRate({ streakS: T[2] }, ON, undefined)).toBe(1);
    expect(collectRate({ streakS: T[2] }, COINS, true)).toBe(1);
    expect(collectRate({ streakS: T[2] }, OFF, true)).toBe(1);
  });
});
