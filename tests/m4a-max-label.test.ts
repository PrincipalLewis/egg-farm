// Art & UX 2026-10-17 01:17 #1: MAX is a non-interactive label (no <button>, not focusable), row carries the aria-label.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/ui/styles.css', import.meta.url), 'utf8');
describe('MAX label', () => {
  it('is never a button', () => { expect(app).not.toMatch(/<button[^>]*maxed/); expect(app.match(/<span class="maxed" aria-hidden="true">MAX<\/span>/g)?.length).toBe(2); });
  it('rows at max carry "{name}, level {L}, max."', () => { expect(app).toContain('aria-label="${name}, level ${L}, max."'); expect(app).toContain("'Farm level' : 'Collect per tap'}, level ${L}, max."); });
  it('has no press shadow and takes no pointer events', () => expect(css).toMatch(/\.maxed\{[^}]*box-shadow:none;pointer-events:none/));
});
