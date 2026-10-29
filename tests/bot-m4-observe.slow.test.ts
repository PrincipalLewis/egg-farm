// QA seam Q4: the observe-only hook on the AC7 bots (tests/bot.ts runBot driving tests/bot-m4.ts pickBuy) does not change a single byte of
// their results. AC7 digest = sha256 over seeds 1-200 of each run's firstUpgradeS, Farm reach map and upgrade counts.
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { balance } from '../src/config/balance';
import { runBot, type Model } from './bot';
import { VAR_DEFAULT } from './seller-variance';
import type { Observe } from './bot-m4';

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const digest = (model: Model, T: number, variance: typeof VAR_DEFAULT | undefined, hook?: Observe) => {
  const h = createHash('sha256');
  for (const seed of SEEDS) { const r = runBot(balance, seed, model, T, 15, variance, { onObserve: hook });
    h.update(JSON.stringify([seed, r.firstUpgradeS, [...r.reach], r.upgradesAt(T), r.farmAt(T)]) + '\n'); }
  return h.digest('hex');
};
// A hostile hook: it scribbles on what it gets. Because it gets a clone, the run must not notice.
const hostile = (calls: Map<string, number>): Observe => (kind, a, _t, s: any) => { const k = kind + ':' + a.split(':')[0]; calls.set(k, (calls.get(k) ?? 0) + 1); s.coinsCents = -1; s.farmLevel = 99; s.workers = {}; };

describe('[Q4][AC7] runBot onObserve (QA seam Q4) is observe-only: AC7 digests byte-identical with and without the hook, seeds 1-200', () => {
  for (const [model, T, v, pin] of [
    ['seller15', 1800, undefined, '8d06a5504429f186e55fcce00c8aa2ca30ec424ba1d432570d198f67bac9784c'],
    ['cheapest', 1800, undefined, '5eee607f2759f81f4e3c216b8115b94dad71bcfa3a7db1742a3edb87a94a1e4a'],
    ['seller15', 600, VAR_DEFAULT, 'f0863858fd65baf25f44cf240fdcc16fb3fb23d093687bf9a03cecd0ad56f7e7'],
  ] as [Model, number, typeof VAR_DEFAULT | undefined, string][]) {
    it(`[Q4][AC7] ${model}${v ? ' + VAR_DEFAULT' : ''}, T=${T}s: digest with hook == without hook == pin`, () => {
      const calls = new Map<string, number>();
      const off = digest(model, T, v), on = digest(model, T, v, hostile(calls));
      expect(on).toBe(off);
      expect(off).toBe(pin); // pinned on 22eac98 without the hook: the hook plumbing itself changes nothing either
      for (const k of ['action:collect', 'action:sellAll', 'action:buy', 'buyCheck:buyCheck']) expect(calls.get(k) ?? 0, k).toBeGreaterThan(0);
    }, 600_000);
  }
});
