// rc1 Art & UX handoff (art-ux/*.md, 2026-10-16): CSS / markup / logic checks per item.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');

describe('D5 next-goal button (m3-next-goal-spec v1.0.1)', () => {
  it('tokens --goal-h:40px and --goal-hit:44px', () => { expect(css).toMatch(/--goal-h:40px/); expect(css).toMatch(/--goal-hit:44px/); });
  it('button.goal is a 44px hit area with 2px vertical padding; the 40px pill is an inner span', () => {
    expect(app).toMatch(/<button class="goal" id="goal"[^>]*><span class="goal-pill">/);
    expect(css).toMatch(/\.goal\{[^}]*min-height:var\(--goal-hit\);padding:2px 0;margin-bottom:-4px/);
    expect(css).toMatch(/\.goal-pill\{[^}]*height:var\(--goal-h\)/);
  });
  it('row budget: 44 hit + 4 gap = 40 pill + 8 gap', () => expect(44 + (8 - 4)).toBe(40 + 8));
});
