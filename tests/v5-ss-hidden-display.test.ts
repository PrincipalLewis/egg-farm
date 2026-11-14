// @vitest-environment jsdom
// HoQA hidden-attribute leak class: a display rule (class/id/attribute, incl. !important) must not
// override `hidden` on #5b elements. Each hide rule is scoped `[hidden]{display:none!important}`.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const HIDE = [
  { el: 'stall chip', sel: '.stall-chip', tag: 'button', className: 'stall-chip', parent: null as string | null },
  { el: 'asleep banner', sel: '.farm-banner', tag: 'div', className: 'farm-banner', parent: 'farm' },
];

beforeAll(() => {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
});

describe('#5b hidden display (HoQA leak class)', () => {
  for (const h of HIDE) {
    it(`${h.el}: styles.css has ${h.sel}[hidden]{display:none!important}`, () => {
      expect(CSS).toContain(`${h.sel}[hidden]{display:none!important}`);
    });
    it(`${h.el}: hidden + its display class computes to none`, () => {
      const wrap = h.parent ? Object.assign(document.createElement('div'), { className: h.parent }) : document.body;
      if (h.parent) document.body.append(wrap);
      const el = document.createElement(h.tag);
      el.className = h.className; el.hidden = true; wrap.append(el);
      expect(getComputedStyle(el).display).toBe('none');
      el.remove(); if (h.parent) wrap.remove();
    });
  }
});
