/**
 * PR-A x #149 (bc wiring): every UI roster-trait read goes through rosterTraitBp, the same source as sim slotTraitBp.
 * Shipping CSV has no bc_trait_* columns, so values equal the ROSTER defaults (flags-0 / shipping byte-identical).
 */
import { describe, it, expect } from 'vitest';
import { balance as shipping, type Balance } from '../src/config/balance';
import { BREED_IDS, ROSTER, bc, rosterTraitBp, type BreedId } from '../src/config/breeds';
import { starBp } from '../src/ui/breeds-adapter';

const withBc = (bcBlock: Record<string, number>): Balance =>
  ({ ...shipping, m4: { ...(shipping as Balance & { m4?: object }).m4, bc: bcBlock } }) as unknown as Balance;

describe('PR-A roster-trait reads follow #149 rosterTraitBp', () => {
  it('shipping balance: starBp equals the ROSTER-default formula for every breed and 0..3 stars', () => {
    for (const id of BREED_IDS as BreedId[]) for (let st = 0; st <= 3; st++)
      expect(starBp(id, st, shipping)).toBe(Math.floor(ROSTER[id][2] * (10000 + st * bc(shipping, 'star_bonus_bp')) / 10000));
  });
  it('m4.bc.trait_<id>_bp override: starBp uses rosterTraitBp, not the hardcoded ROSTER value', () => {
    const b = withBc({ trait_cochin_bp: 0, trait_brahma_bp: 1234 });
    expect(rosterTraitBp(b, 'cochin')).toBe(0);
    expect(starBp('cochin', 2, b)).toBe(0);
    expect(starBp('brahma', 0, b)).toBe(1234);
    expect(starBp('brahma', 1, b)).toBe(Math.floor(1234 * (10000 + bc(b, 'star_bonus_bp')) / 10000));
  });
});
