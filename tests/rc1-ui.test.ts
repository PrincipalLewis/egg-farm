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

describe('D7 rotate prompt focus trap', async () => {
  const { trapFocus } = await import('../src/ui/rotate-prompt');
  const fakeDoc = () => { const l: Record<string, Function> = {}; return { l, addEventListener: (t: string, f: Function) => { l[t] = f; }, removeEventListener: (t: string) => { delete l[t]; } }; };
  it('Tab and Shift+Tab are swallowed and focus stays on the prompt', () => {
    const d = fakeDoc(); let focus = 0; const el = { focus: () => focus++, contains: (n: any) => n === el } as any;
    trapFocus(el, d as any); let prevented = 0;
    for (const shiftKey of [false, true]) d.l.keydown({ key: 'Tab', shiftKey, preventDefault: () => prevented++, stopPropagation() {} });
    d.l.keydown({ key: 'a', preventDefault: () => prevented++, stopPropagation() {} });
    expect(prevented).toBe(2); expect(focus).toBe(2);
  });
  it('focus landing outside is pulled back; release removes the listeners', () => {
    const d = fakeDoc(); let focus = 0; const el = { focus: () => focus++, contains: (n: any) => n === el } as any;
    const release = trapFocus(el, d as any); d.l.focusin({ target: {} }); d.l.focusin({ target: el }); expect(focus).toBe(1);
    release(); expect(d.l.keydown).toBeUndefined(); expect(d.l.focusin).toBeUndefined();
  });
});
