// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { balance } from '../../src/config/balance';
import { breedsOnBalance, breedsOffBalance, assertBalanceDeepEqual } from './breeds-on';

describe('tests/helpers/breeds-on', () => {
  it('sets only m4.flags.breeds=1; shipped balance stays 0', () => {
    expect(balance.m4!.flags!.breeds).toBe(0);
    const on = breedsOnBalance();
    expect(on.m4!.flags!.breeds).toBe(1);
    expect(balance.m4!.flags!.breeds).toBe(0); // module untouched
    const rolled = JSON.parse(JSON.stringify(on));
    rolled.m4.flags.breeds = 0;
    assertBalanceDeepEqual(rolled, JSON.parse(JSON.stringify(balance)));
  });
  it('breedsOffBalance is breeds=0 clone', () => {
    expect(breedsOffBalance().m4!.flags!.breeds).toBe(0);
  });
});
