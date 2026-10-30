// UI QA #89 F3: rule-21 source check over ALL of scripts/ and the test helper modules (tests/*.ts that are not
// *.test.ts; tests/rule21-rules.ts is the rule data itself). Every forbidden form in tests/fixtures/rule21-negative/
// must be caught, and the only allowed hits are the marked guarded sites in scripts/recorded-pid.mjs.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs'; import path from 'node:path';
import { RULES, hits, GUARD_MARK } from './rule21-rules';

const CODE = /\.(mjs|cjs|js|ts|sh|bash|py)$/;
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...filesUnder(p)); else if (CODE.test(e.name)) out.push(p); }
  return out;
}
const SCOPE = [...filesUnder('scripts'), ...fs.readdirSync('tests').filter(f => CODE.test(f) && !/\.test\.ts$/.test(f) && f !== 'rule21-rules.ts').map(f => path.join('tests', f))];
const GUARDED = 'scripts/recorded-pid.mjs';
const scan = () => SCOPE.flatMap(f => fs.readFileSync(f, 'utf8').split('\n').map((l, i) => ({ f, n: i + 1, l, h: hits(l) })).filter(x => x.h.length));

describe('F3: rule-21 source check', () => {
  it('scope covers every scripts/ code file and the test helpers', () => {
    expect(SCOPE).toContain('scripts/serve-own.mjs'); expect(SCOPE).toContain('scripts/d2-kill-browser.mjs'); expect(SCOPE).toContain(GUARDED);
    expect(SCOPE).toContain('tests/helpers.ts'); expect(SCOPE.length).toBeGreaterThan(30);
  });
  it('no forbidden form anywhere in scope except the marked guarded sites in scripts/recorded-pid.mjs', () => {
    const bad = scan().filter(x => !(x.f === GUARDED && x.l.includes(GUARD_MARK))).map(x => `${x.f}:${x.n} [${x.h}] ${x.l.trim()}`);
    expect(bad).toEqual([]);
  });
  it('the allowlist is exactly the 6 guarded sites (stat read, kill, detached spawn, task readdir, children read, signal-0 probe)', () => {
    const g = scan().filter(x => x.f === GUARDED).map(x => x.h.join(','));
    expect(g).toHaveLength(6); expect(scan().filter(x => x.f === GUARDED && !x.l.includes(GUARD_MARK))).toEqual([]);
    expect(fs.readFileSync(GUARDED, 'utf8').split(GUARD_MARK).length - 1).toBe(6); // no unused marker that could hide a future hit
  });
  const dir = 'tests/fixtures/rule21-negative', fixtures = fs.readdirSync(dir).filter(f => f.endsWith('.fixture')).sort();
  it('there are 49 negative fixtures (UI QA harness 01-36 + #89 report JS forms 37-49)', () => expect(fixtures).toHaveLength(49));
  for (const f of fixtures) {
    const line = fs.readFileSync(path.join(dir, f), 'utf8').trim();
    it(`negative fixture ${f} is caught: ${line}`, () => expect(hits(line).length).toBeGreaterThan(0));
  }
  it('ordinary code that merely looks similar is not flagged (keeps the check usable, not weakened)', () => {
    for (const l of ['AbortSignal.timeout(FETCH_MS)', 'await p.waitForSelector(x, { timeout: 10000 })', 'for (const ps of [null, "::before"])',
      '// 2/5 sold then timeout -> card collapses', 'killRecorded(rec, "SIGKILL", { group: true })', 'skillful', 'const procs = 3', 'SIGKILLed recorded browser group'])
      expect(hits(l), l).toEqual([]);
  });
  it('every rule has at least one fixture that only it would need (each rule is exercised)', () => {
    const all = fixtures.map(f => fs.readFileSync(path.join(dir, f), 'utf8').trim());
    for (const r of RULES) expect(all.some(l => r.re.test(l) || r.re.test(l.replace(/""|''/g, ''))), r.id).toBe(true);
  });
});
