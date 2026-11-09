// @vitest-environment jsdom
// Breeds UI PR-B — label-in-name sweep (BR-AC52c; UI doc v0.2.7 §7b / UI-BR-23; WCAG 2.5.3). TDD: written before breeds-a11y.ts.
import { describe, it, expect, beforeEach } from 'vitest';
import { labelInNameIssues, accessibleName, visibleLabel } from './fixtures/breeds-prB/a11y';
import { mountPresentChip, presentMirror } from '../src/ui/breeds-hud';
import { flagOnBalance, stateWith, leghorn312, RefGate, HUD_HTML } from './fixtures/breeds-prB/setup';

beforeEach(() => { document.body.innerHTML = HUD_HTML; });
const b = flagOnBalance();

describe('helper semantics', () => {
  it('name from content skips aria-hidden, keeps .sr; visible label skips both', () => {
    document.body.innerHTML = '<button id="x"><span aria-hidden="true">+</span>Empty<span class="sr"> slot</span></button>';
    const x = document.getElementById('x')!; expect(visibleLabel(x)).toBe('Empty'); expect(accessibleName(x)).toBe('Empty slot');
  });
  it('flags an aria-label that does not start with the visible text', () => {
    document.body.innerHTML = '<button aria-label="Breed bonus +3% paused">+3%</button>';
    expect(labelInNameIssues(document.body).map(i => i.issue)).toEqual(['label-not-start']);
  });
  it('flags nested interactive content', () => {
    document.body.innerHTML = '<button>Leghorn <span role="button" tabindex="0">+3%</span></button>';
    expect(labelInNameIssues(document.body).map(i => i.issue)).toContain('nested-interactive');
  });
  it('icon-only control may use aria-label (2.5.3 N/A) but must have a name', () => {
    document.body.innerHTML = '<button aria-label="Flock"><img alt=""></button><button><img alt=""></button>';
    expect(labelInNameIssues(document.body).map(i => i.issue)).toEqual(['no-name']);
  });
  it('aria-labelledby resolves to the referenced text', () => {
    document.body.innerHTML = '<span id="l">Hatch</span><button aria-labelledby="l">Hatch · $1.00</button>';
    expect(labelInNameIssues(document.body).map(i => i.issue)).toEqual(['label-not-start']);
  });
});

describe('PR-B controls pass the sweep', () => {
  it('HUD chip, active and paused', () => {
    const g = new RefGate(10000, 6); let t = 0;
    const h = mountPresentChip({ doc: document, b, now: () => t, gate: g })!; h.sync(stateWith(b, 10, leghorn312()));
    expect(labelInNameIssues(document.body)).toEqual([]);
    for (let i = 0; i < 6; i++) g.tap(i); t = 5; h.sync(stateWith(b, 10, leghorn312())); expect(h.state).toBe('paused');
    expect(labelInNameIssues(document.body)).toEqual([]);
  });
  it('slot card with the Present mirror: name starts with the card text and contains the mirror text; no nesting', () => {
    for (const open of [true, false]) {
      const m = presentMirror(312, open)!;
      document.body.innerHTML = `<button class="slot" aria-describedby="d">Leghorn ${m.html} lay Present</button><span id="d" class="sr">${m.description}</span>`;
      const card = document.querySelector('button')!;
      expect(labelInNameIssues(document.body)).toEqual([]); expect(accessibleName(card)).toContain(m.text);
    }
  });
  it('best-buy strip #goal markup (rc/v5 shape) with a Hatch label passes', () => {
    document.body.innerHTML = '<button class="goal" id="goal" type="button" aria-describedby="goalDesc"><span class="goal-pill"><img alt=""><span class="goal-label">Hatch · $1,368.00</span><span class="goal-status num">Ready!</span><span class="goal-chev" aria-hidden="true">›</span></span></button>';
    expect(labelInNameIssues(document.body)).toEqual([]);
  });
});
