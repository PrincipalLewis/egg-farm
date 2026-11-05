// ZG-AC13 / ZGU-AC1 [no-regression]: the zero-gain UI is UI-only. The AC7 bots (tests/bot.ts runBot, seller15 + cheapest) give
// byte-identical results with m4.flags.zeroGainUi 0 and 1 (and with bestBuyV2 1 on top). Bounded: seeds 1–20 x 1,800 s here;
// the seeds 1–200 / 12,000 s run is QA's P1/P2 (m5-gate-acs card #9).
import { describe, it, expect } from 'vitest';
import { balance, type Balance } from '../src/config/balance';
import { runBot } from './bot';

const with_ = (f: Record<string, number>) => ({ ...balance, m4: { ...balance.m4!, enabled: 1, flags: { ...balance.m4!.flags, ...f } } }) as Balance;
describe('ZG-AC13 AC7 bots unchanged by zeroGainUi', () => {
  it.each(['seller15', 'cheapest'] as const)('%s seeds 1–20: JSON(runBot) equal for zeroGainUi 0 / 1 / 1+bestBuyV2', model => {
    for (let seed = 1; seed <= 20; seed++) {
      const a = JSON.stringify(runBot(with_({ zeroGainUi: 0 }), seed, model)), z = JSON.stringify(runBot(with_({ zeroGainUi: 1 }), seed, model));
      expect(z, `seed ${seed}`).toBe(a);
      if (seed <= 3) expect(JSON.stringify(runBot(with_({ zeroGainUi: 1, bestBuyV2: 1 }), seed, model))).toBe(a);
    }
  });
});
