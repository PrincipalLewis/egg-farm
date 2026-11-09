/**
 * M5.1 Breeds UI PR-B — label-in-name sweep helper (BR-AC52c; UI doc v0.2.7 §7b, UI-BR-23; WCAG 2.5.3).
 * Studio rule (HoAUX 23:40): an interactive control's accessible name STARTS WITH its visible text; hidden words may follow
 * (e.g. the chip's `.sr` state word). Decorative glyphs/icons are aria-hidden / alt="" and not part of either. Icon-only
 * controls (no visible text) may use aria-label. No interactive control may contain another (axe `nested-interactive`).
 * This is a structural approximation of the accname algorithm for unit tests; browser runs use the engine's computed name.
 */
const INTERACTIVE = 'button, [role="button"], a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
const norm = (t: string) => t.replace(/\s+/g, ' ').trim();
const isHidden = (el: Element) => el.getAttribute('aria-hidden') === 'true' || (el as HTMLElement).hidden;

function textOf(el: Element, skipSr: boolean): string {
  let t = '';
  el.childNodes.forEach(n => {
    if (n.nodeType === 3) t += n.textContent ?? '';
    else if (n instanceof Element && !isHidden(n) && !(skipSr && n.classList.contains('sr'))) {
      if (n instanceof HTMLImageElement) t += n.alt ?? '';
      else t += textOf(n, skipSr);
    }
  });
  return t;
}
/** Visible label: text content minus aria-hidden subtrees and visually hidden `.sr` spans. */
export const visibleLabel = (el: Element) => norm(textOf(el, true));
/** Accessible name: aria-labelledby → aria-label → content (minus aria-hidden; `.sr` text counts). */
export function accessibleName(el: Element): string {
  const lb = el.getAttribute('aria-labelledby');
  if (lb) return norm(lb.split(/\s+/).map(id => el.ownerDocument.getElementById(id)?.textContent ?? '').join(' '));
  const al = el.getAttribute('aria-label'); if (al !== null && norm(al)) return norm(al);
  return norm(textOf(el, false));
}

export type A11yIssue = { el: Element; issue: 'label-not-start' | 'nested-interactive' | 'no-name'; name: string; visible: string };
export function labelInNameIssues(root: ParentNode): A11yIssue[] {
  const out: A11yIssue[] = [];
  for (const el of root.querySelectorAll(INTERACTIVE)) {
    if (el.closest('[aria-hidden="true"]')) continue;
    const name = accessibleName(el), visible = visibleLabel(el);
    if (el.querySelector(INTERACTIVE)) out.push({ el, issue: 'nested-interactive', name, visible });
    if (!name) out.push({ el, issue: 'no-name', name, visible });
    else if (visible && !name.startsWith(visible)) out.push({ el, issue: 'label-not-start', name, visible });
  }
  return out;
}
