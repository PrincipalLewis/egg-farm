// @vitest-environment jsdom
// HoQA hidden-attribute leak class: a display rule (class/id/attribute, incl. !important) must not
// override `hidden` on #11 cue elements. Each hide rule is scoped `[hidden]{display:none!important}`.
// The reserved .fslot is not hidden via the attribute (flag-on layout only; short viewports use an injected display:none).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync('src/ui/styles.css', 'utf8');
const HIDE = [
  { el: 'fatigue sub-line', sel: '.fsub', tag: 'button', className: 'fsub', parent: 'fslot' },
  { el: 'icon chip', sel: '.fchip', tag: 'button', className: 'fchip', parent: 'hud' },
  { el: 'cue popover', sel: '.fpop', tag: 'div', className: 'fpop', parent: 'hud' },
];

beforeAll(() => {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
});

describe('#11 hidden display (HoQA leak class)', () => {
  for (const h of HIDE) {
    it(`${h.el}: styles.css has ${h.sel}[hidden]{display:none!important}`, () => {
      expect(CSS).toContain(`${h.sel}[hidden]{display:none!important}`);
    });
    it(`${h.el}: hidden + its display class computes to none`, () => {
      const wrap = Object.assign(document.createElement('div'), { className: h.parent });
      document.body.append(wrap);
      const el = document.createElement(h.tag);
      el.className = h.className; el.hidden = true; wrap.append(el);
      expect(getComputedStyle(el).display).toBe('none');
      wrap.remove();
    });
  }
});
