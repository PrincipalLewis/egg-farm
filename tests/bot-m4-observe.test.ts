// QA seam Q4 (unit, fast): the observe() helper behind runBot's onObserve hook. The slow suite (bot-m4-observe.slow.test.ts) covers AC7, seeds 1-200.
import { describe, it, expect } from 'vitest';
import { balance } from '../src/config/balance';
import { runBot } from './bot';
import { observe, type Observe } from './bot-m4';

describe('[Q4] observe-only hook on the AC7 bots (unit)', () => {
  it('[Q4] observe() hands the hook a structuredClone: mutating it leaves the caller state untouched', () => {
    const s: any = { coinsCents: 5, workers: { market_hand: { energy: 3 } } }; let got: any;
    observe((_k, _a, _t, x: any) => { got = x; x.coinsCents = -1; x.workers.market_hand.energy = 0; }, 'action', 'collect', 1, s);
    expect(got).not.toBe(s); expect(s.coinsCents).toBe(5); expect(s.workers.market_hand.energy).toBe(3);
  });
  it('[Q4] observe() with no hook is a no-op', () => { expect(() => observe(undefined, 'buyCheck', 'buyCheck', 0, {} as any)).not.toThrow(); });
  it('[Q4][AC7] runBot seller15 seed 1, T=600s: same result with a hostile hook as without, and every hook kind fires', () => {
    const kinds = new Set<string>(); const hook: Observe = (k, a, _t, s: any) => { kinds.add(k + ':' + a.split(':')[0]); s.coinsCents = -1; s.farmLevel = 99; };
    const pick = (r: ReturnType<typeof runBot>) => JSON.stringify([r.firstUpgradeS, [...r.reach], r.upgradesAt(600), r.farmAt(600)]);
    expect(pick(runBot(balance, 1, 'seller15', 600, 15, undefined, { onObserve: hook }))).toBe(pick(runBot(balance, 1, 'seller15', 600)));
    for (const k of ['action:collect', 'action:sellAll', 'action:buy', 'buyCheck:buyCheck']) expect(kinds.has(k), k).toBe(true);
  });
});
