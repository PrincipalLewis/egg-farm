// Art & UX 01:55 MAJOR: 048f1ed brought the rc1 D5 .goal/.goal-pill CSS; the markup must carry span.goal-pill with Ready!/› inside.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
describe('D5 goal pill', () => {
  it('button.goal wraps icon, label, status and › in span.goal-pill', () => expect(app).toMatch(/<button class="goal" id="goal"[^>]*><span class="goal-pill"><img class="goal-ic"[^]*?<span class="goal-status num"><\/span><span class="goal-chev" aria-hidden="true">›<\/span><\/span><\/button>/));
  it('pill CSS present', () => expect(css).toMatch(/\.goal-pill\{display:grid/));
});
