import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
describe('rc2: Coop upgraded! toast never overlaps the New helper! hire banner', () => {
  it('showToast places the toast below a visible .intro-a, docked or not', () => {
    const fn = app.slice(app.indexOf('const showToast'), app.indexOf('toastTimer = window.setTimeout'));
    expect(fn).toContain(".intro-a:not([hidden])");
    expect(fn).toMatch(/Math\.max\(docked\.matches \? 0 : qb, ia\)/);
  });
});
