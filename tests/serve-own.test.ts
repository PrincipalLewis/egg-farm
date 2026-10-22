// CCR #66 (reviews/pr66-f8ba53c.md) m1/n3: the browser-gate server guard. Pure parts only (no vite, no browser).
import { describe, it, expect } from 'vitest';
// @ts-expect-error plain .mjs helper without types
import { buildIdProblem, parsePort, isDirty as isDirtyJs } from '../scripts/serve-own.mjs';
import { isDirty as isDirtyTs } from '../scripts/build-id';
const HEAD = 'f8ba53c5d3766a1674e90c88a70721fc6fe179cd';

describe('m1: expectHeadBuild checks hash AND dirty state', () => {
  it('clean build on a clean tree at HEAD: ok', () => expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, false)).toBeNull());
  it("CCR R4: '+f8ba53c+dirty' served on a clean tree is refused (and on a dirty tree too) unless ALLOW_DIRTY", () => {
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, false)).toMatch(/\+dirty build/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, true)).toMatch(/\+dirty build/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c+dirty', HEAD, true, true)).toBeNull();
  });
  it('a clean build-id on a dirty tree is refused (the build predates the edits), even with ALLOW_DIRTY', () => {
    expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, true)).toMatch(/tree .* is dirty/);
    expect(buildIdProblem('m3-rc1-pre+f8ba53c', HEAD, true, true)).toMatch(/tree .* is dirty/);
  });
  it('another commit, unknown or missing id: refused', () => {
    for (const id of ['m3-rc1-pre+dd223f5', 'm3-rc1-pre+dd223f5+dirty', 'm3-rc1-pre+unknown', '', undefined]) expect(buildIdProblem(id as any, HEAD, false, true)).toMatch(/is not HEAD f8ba53c/);
  });
  it('the JS isDirty used by the scripts equals scripts/build-id.ts isDirty', () => {
    for (const p of ['', ' M src/a.ts\n', '?? x.txt\n', '?? vite.config.ts.timestamp-123.mjs\n', ' M vite.config.ts\n', '?? "a b.txt"\n?? vite.config.mjs.timestamp-9-x.mjs\n'])
      expect(isDirtyJs(p)).toBe(isDirtyTs(p));
  });
});

describe('n3: PORT parsing', () => {
  it('unset or empty = 0 (free port); an integer 1..65535 as-is', () => {
    expect(parsePort(undefined)).toBe(0); expect(parsePort('')).toBe(0); expect(parsePort('4331')).toBe(4331); expect(parsePort('65535')).toBe(65535);
  });
  it('non-numeric or out of range: an error (callers exit 2)', () => {
    for (const v of ['abc', '43a', '-1', '0', '65536', '4.5', ' 4331']) expect(() => parsePort(v)).toThrow(/not a port number/);
  });
});
