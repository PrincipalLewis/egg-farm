// v5 streak R2/R3 tap filter + R16 tier-pitched collect (ui/streak-tap.ts), pure.
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { vi } from 'vitest';
import { tapIgnored, collectSemi, playCollect, noteTapSting, takeTapSting } from '../src/ui/streak-tap';
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

describe('collectSemi + playCollect (R16 / CT-AC6, F6 v1.0 Audio.playFile)', () => {
  const T = tierThresholds(streakParams(ON));
  it('credited tap after tier k: +k st, +4 at MAX; 0 at tier 0', () => {
    expect(collectSemi({ streakS: 0.01 }, ON, true)).toBe(0);
    T.forEach((t, i) => expect(collectSemi({ streakS: t }, ON, true)).toBe(i + 1));
    expect(collectSemi({ streakS: T[T.length - 1] }, ON, true)).toBe(4);
  });
  it('uncounted tap, streak off (tapCoins only) or flags off: 0', () => {
    expect(collectSemi({ streakS: T[2] }, ON, false)).toBe(0); expect(collectSemi({ streakS: T[2] }, ON, undefined)).toBe(0);
    expect(collectSemi({ streakS: T[2] }, COINS, true)).toBe(0); expect(collectSemi({ streakS: T[2] }, OFF, true)).toBe(0);
  });
  it("semi 0, or rc/v5 Audio without playFile: exactly audio.play('collect'); with F6 playFile: the pitched collect file + hook", () => {
    const a = { play: vi.fn() }; playCollect(a as any, 0); playCollect(a as any, 3); expect(a.play.mock.calls).toEqual([['collect'], ['collect']]);
    const f = { play: vi.fn(), playFile: vi.fn(() => true) }; playCollect(f as any, 0); playCollect(f as any, 2);
    expect(f.play.mock.calls).toEqual([['collect']]); expect(f.playFile).toHaveBeenCalledWith('sfx-collect-pop', undefined, 2, 'collect');
  });
});

describe('tap sting mark (combo-tiers §1: the sting replaces that tap\'s collect)', () => {
  it('take returns true once after note, then false; clear by default', () => {
    takeTapSting(); expect(takeTapSting()).toBe(false); noteTapSting(); expect(takeTapSting()).toBe(true); expect(takeTapSting()).toBe(false);
  });
});
