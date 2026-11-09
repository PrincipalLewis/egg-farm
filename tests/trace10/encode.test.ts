import { describe, it, expect } from 'vitest';
import { canon, canonValue, sha256 } from './encode';

describe('trace10 encode (§6.1, §13 encoder)', () => {
  it('numbers round-trip exactly via Number::toString', () => {
    for (const x of [0.1 + 0.2, 1e21, 1e-7, 123456789.123456789, 2 ** 53 + 2, 5e-324, 1.7976931348623157e308]) {
      const t = canon([x]); expect(JSON.parse(t)[0]).toBe(x); expect(t).toBe(`[${String(x)}]`);
    }
    expect(canon([0.1 + 0.2])).toBe('[0.30000000000000004]');
  });
  it('-0 is distinct from 0', () => {
    expect(canon([-0])).toBe('["-0"]'); expect(canon([0])).toBe('[0]'); expect(canon([-0])).not.toBe(canon([0]));
  });
  it('non-finite values become strings and are reported', () => {
    const seen: number[] = [];
    expect(canon([NaN, Infinity, -Infinity], v => seen.push(v))).toBe('["NaN","Infinity","-Infinity"]');
    expect(seen.length).toBe(3);
  });
  it('absent -> null, which is not 0', () => {
    expect(canon([undefined, 0, null])).toBe('[null,0,null]');
    expect(canon({ a: undefined })).toBe('{"a":null}');
    expect(canon([undefined])).not.toBe(canon([0]));
  });
  it('object keys sorted; typed arrays and maps canonicalised', () => {
    expect(canon({ b: 1, a: 2, B: 3 })).toBe('{"B":3,"a":2,"b":1}');
    expect(canonValue(new Uint32Array([1, 2]))).toEqual([1, 2]);
    expect(canon(new Map([[2, 'x'], [1, 'y']]))).toBe('{"1":"y","2":"x"}');
  });
  it('sha256 is hex of utf-8', () => { expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'); });
});
