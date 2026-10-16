// S2-6 (layout-spec.md line 74), reapplied from rc1 05fe19b: Queue full tag straddles the strip outline, "Full" below 380px.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
describe('S2-6 Queue full tag (layout-spec §3.3)', () => {
  it('straddles the top outline with the spec box and never takes taps', () => expect(css).toMatch(/\.qtag\{top:-9px;right:8px;height:18px;line-height:16px;z-index:1;pointer-events:none;white-space:nowrap/));
  it('reads "Full" below 380px, "Queue full" otherwise', () => {
    expect(app).toContain('<span class="q-long">Queue full</span><span class="q-short">Full</span>');
    expect(css).toMatch(/@media \(max-width:379px\)\{\.qtag \.q-long\{display:none\}\.qtag \.q-short\{display:inline\}\}/);
  });
  it('strip reserves a 9px top band (tag is 18px at top:-9px)', () => { expect(css).toMatch(/\.queue\{padding-top:9px;min-height:81px\}/); expect(css).toMatch(/max-height:699px\)\{\.queue\{min-height:73px\}/); });
});
