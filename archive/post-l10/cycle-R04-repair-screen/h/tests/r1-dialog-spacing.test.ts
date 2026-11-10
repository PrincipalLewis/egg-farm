import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const src = readFileSync(new URL('../src/ui/save-recovery.ts', import.meta.url), 'utf8');
// A rule "starts" after a newline, a closing brace, or the file start (whitespace allowed).
const unscoped = (sel: string, prop: string) => new RegExp(`(^|[}\\n])\\s*${sel}\\{[^}]*${prop}`);
describe('Code Reviewer R1: AC14b v2.1 spacing is scoped to the recovery dialog', () => {
  it('no unscoped gap:0 / h2 / p#rcB / rc-primary margins on .recovery-card', () => {
    expect(css).not.toMatch(unscoped('\\.recovery-card', 'gap:0'));
    expect(css).not.toMatch(unscoped('\\.recovery-card h2', 'margin-top'));
    expect(css).not.toMatch(unscoped('\\.recovery-card p#rcB', 'margin'));
    expect(css).not.toMatch(unscoped('\\.recovery-card \\.rc-primary', 'margin-top'));
  });
  it('the regex catches a line-start rule and a brace-preceded rule (self-check)', () => {
    expect('x{}\n.recovery-card h2{margin-top:8px}').toMatch(unscoped('\\.recovery-card h2', 'margin-top'));
    expect('x{}.recovery-card h2{margin-top:8px}').toMatch(unscoped('\\.recovery-card h2', 'margin-top'));
    expect('.recovery-layer[data-outcome] .recovery-card h2{margin-top:8px}').not.toMatch(unscoped('\\.recovery-card h2', 'margin-top'));
  });
  it('the scoped v2.1 rules exist', () => {
    for (const r of ['.recovery-layer[data-outcome] .recovery-card{gap:0}',
      '.recovery-layer[data-outcome] .recovery-card h2{margin-top:8px}',
      '.recovery-layer[data-outcome] .recovery-card p#rcB{margin-top:8px}',
      '.recovery-layer[data-outcome] .recovery-card .rc-primary{margin-top:16px}']) expect(css).toContain(r);
  });
  it('only the AC14b dialog layer carries data-outcome; tab-guard and newer-save do not', () => {
    expect(src.match(/dataset\.outcome\s*=/g)?.length).toBe(1);
    expect(src).toMatch(/layer\.className = 'recovery-layer'; layer\.dataset\.outcome = c\.outcome/);
    for (const k of ['tab-guard', 'newer-save']) {
      const line = src.split('\n').find((l) => l.includes(`className = 'recovery-layer ${k}'`));
      expect(line).toBeDefined(); expect(line).not.toMatch(/outcome/);
    }
  });
});
