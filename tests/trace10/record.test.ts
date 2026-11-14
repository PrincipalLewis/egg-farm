import { describe, it, expect } from 'vitest';
import { initialState } from '../../src/sim/state';
import { balance } from '../../src/config/balance';
import { stateFields, stateRec, simEventFields, footerRec, line, S_FARM } from './record';
import { sha256 } from './encode';

describe('trace10 records (§5, §6.2)', () => {
  it('S3 field order is §6.2 exactly and absent != 0', () => {
    const s = { ...initialState(balance, 3), coinsCents: 1234, farmLevel: 4, workers: { coop_hand: { energy: 55.5, cdS: 1 } }, wageFracCents: { coop_hand: 0 } };
    const f = stateFields(s);
    expect(f.length).toBe(19);
    expect(f.slice(0, 9)).toEqual([1234, 4, 0, 0, 0, 0, 0, 0, 0]);
    expect(f[9]).toEqual([null, [55.5, 1, null, null, null], null, null]);
    expect(f[10]).toEqual([null, 0]);
    expect(f[15]).toBe(s.rng); expect(f[16]).toBeNull(); expect(f[17]).toBeNull();
    expect(f[18]).toMatch(/^[0-9a-f]{64}$/);
    const r = stateRec(3, 7, 2, 'step', s); expect(r[S_FARM]).toBe(4); expect(r.slice(0, 5)).toEqual(['S', 3, 7, 2, 'step']);
  });
  it('sfull catches a change in a key outside fields 0-17', () => {
    const s = initialState(balance, 3), z = { ...s, celebratedTier: 1 };
    expect(stateFields(z).slice(0, 18)).toEqual(stateFields(s).slice(0, 18));
    expect(stateRec(3, 1, 1, 'end', z)[5]).not.toBe(stateRec(3, 1, 1, 'end', s)[5]);
  });
  it('S2 kinds positional; optional collect fields -> null; unknown kinds kept whole', () => {
    expect(simEventFields({ type: 'collect', eggs: 3 })).toEqual(['collect', 3, null, null]);
    expect(simEventFields({ type: 'sell', id: 1, k: 2, N: 3, price: 40, value: 80, by: 'player' })).toEqual(['sell', 1, 2, 3, 40, 80, 'player']);
    expect(simEventFields({ type: 'grader_tier', tier: 2, mult: 1.5, cost: 9 })).toEqual(['other:grader_tier', { cost: 9, mult: 1.5, tier: 2, type: 'grader_tier' }]);
  });
  it('footer carries count, sorted seeds, body sha256', () => {
    const body = [line(['T', 2, 1, 0.1]), line(['T', 1, 1, 0.1])];
    expect(footerRec('s1', body, [2, 1])).toEqual(['END', 's1', 2, [1, 2], sha256(body.join(''))]);
  });
});
