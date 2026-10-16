import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
describe('QA B-2: the "Workers get tired" coach never sits over the tab bar', () => {
  it('coach() drops the above placement when it would overlap a [role=tablist]', () => {
    const fn = app.slice(app.indexOf('const coach ='), app.indexOf("el.classList.toggle('below', !above)"));
    expect(fn).toContain('[role=tablist]');
    expect(fn).toMatch(/const above = r\.top >= 120 && !tl\.some/);
  });
});
