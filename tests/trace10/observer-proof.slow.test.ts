// Observer proof P1-P3 (design §11, EC-2): seeds 1-5 x 3 profiles, T = 4000, ship CSV a8c4, CFG none. P4 (reach vs scratch
// raws) is informational and runs only in the CLI witness mode (`scripts/trace10.ts --observer-proof`), where the raws live.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { balanceFromCsv, ROOT } from './producer';
import { proveSeed } from './observer-proof';

const bal = balanceFromCsv(readFileSync(join(ROOT, 'data/economy.csv'), 'utf8'));
describe('trace10 observer proof P1-P3', () => {
  for (const profile of ['optimal', 'seller15', 'casual']) it(`${profile}: seeds 1-5 traced == untraced; buy order, runner (0) and V cursor equal; hostile hooks change nothing`, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const r = proveSeed(bal, seed, profile);
      expect(r.observer_invalid).toEqual([]);
      expect(r.traced_sha256).toBe(r.untraced_sha256); expect(r.engine_rng_end_traced).toBe(r.engine_rng_end_untraced); // P1 (incl. engine RNG consumption)
      expect(r.buy_order_equal).toBe(true); expect(r.buys_full).toBeGreaterThan(0); expect(r.runner_full).toBe(0); expect(r.runner_minimal).toBe(0); expect(r.v_full).toEqual(r.v_minimal); // P2
      expect(r.mutated_sha256).toBe(r.untraced_sha256); // P3
    }
  }, 600_000);
});
