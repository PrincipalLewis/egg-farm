import { describe, it, expect } from 'vitest';
import { nextRand, mixSeed } from '../../src/sim/state';
import { PyRandom } from '../py-random';
import { SellerVariance, VAR_DEFAULT } from '../seller-variance';
import { engineDraws, pyCursor, varianceCursor, RngCursorError } from './rngcursor';

describe('trace10 rngcursor (§7)', () => {
  it('engine: exact draw counts by replay', () => {
    let x = mixSeed(42); const x0 = x;
    for (let k = 1; k <= 25; k++) { x = nextRand(x)[0]; expect(engineDraws(x0, x)).toBe(k); }
    expect(engineDraws(x0, x0)).toBe(0);
  });
  it('engine: unreachable within cap -> error (INVALID)', () => {
    const x0 = mixSeed(1); let x = x0; for (let k = 0; k < 50; k++) x = nextRand(x)[0];
    expect(() => engineDraws(x0, x, 10)).toThrow(RngCursorError);
  });
  it('PyRandom private fields exist with the expected types; cursor moves per draw', () => {
    const r = new PyRandom(7), a = pyCursor(r); expect(a.mti).toBe(624); expect(a.mtSha).toMatch(/^[0-9a-f]{64}$/);
    r.random(); const b = pyCursor(r); expect(b.mti).toBe(2); expect(b.mtSha).not.toBe(a.mtSha);
    r.random(); const c = pyCursor(r); expect(c.mti).toBe(4); expect(c.mtSha).toBe(b.mtSha);
  });
  it('fails closed when the PyRandom layout changes', () => {
    expect(() => pyCursor({ mt: [], mti: 1 } as any)).toThrow(RngCursorError);
  });
  it('variance cursor is identical for the same seed and call sequence', () => {
    const v1 = new SellerVariance(VAR_DEFAULT, 3), v2 = new SellerVariance(VAR_DEFAULT, 3);
    expect(varianceCursor(v1)).toEqual(varianceCursor(v2));
    v1.checkInterval(15); v2.checkInterval(15); expect(varianceCursor(v1)).toEqual(varianceCursor(v2));
    v1.delay(); expect(varianceCursor(v1)).not.toEqual(varianceCursor(v2));
  });
});
