import { describe, it, expect } from 'vitest';
import { PINS, expectedCardSha1 } from './pins';
import { synthSide } from './synth';
import { compareSides } from './compare';

describe('trace10 pins: one config value for the card of record (QA-D-1110-BG4REPIN)', () => {
  it('default = PINS.card_sha1; a valid override wins; a bad override throws', () => {
    expect(expectedCardSha1()).toBe(PINS.card_sha1); expect(PINS.card_sha1).toMatch(/^[0-9a-f]{40}$/);
    expect(expectedCardSha1('a'.repeat(40))).toBe('a'.repeat(40));
    expect(() => expectedCardSha1('6269b126')).toThrow(/40 lowercase hex/);
  });
  it('comparator uses the pin; another card is INVALID unless the re-pin override names it', () => {
    const re = 'b'.repeat(40), mk = (side: 'before' | 'after') => { const d = synthSide({ side }); (d.manifest as any).inputs.card_sha1 = re; return d; };
    expect(compareSides(mk('before'), mk('after')).verdict).toBe('INVALID');
    expect(compareSides(mk('before'), mk('after'), { cardSha1: re }).verdict).toBe('MATCH_ALL');
    expect(compareSides(synthSide({ side: 'before' }), synthSide({ side: 'after' })).verdict).toBe('MATCH_ALL');
  });
});
