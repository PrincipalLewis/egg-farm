import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
describe('Code Reviewer R1: AC14b v2.1 spacing is scoped to the recovery dialog', () => {
  it('no unscoped gap:0 / h2 margin / rc-primary margin on .recovery-card', () => {
    expect(css).not.toMatch(/(^|\n)\.recovery-card\{[^}]*gap:0/);
    expect(css).not.toMatch(/(^|\})\.recovery-card h2\{[^}]*margin-top/);
    expect(css).not.toMatch(/(^|\n)\.recovery-card \.rc-primary\{margin-top/);
    expect(css).toContain('.recovery-layer[data-outcome] .recovery-card{gap:0}');
  });
});
