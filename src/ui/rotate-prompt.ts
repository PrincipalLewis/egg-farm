/** Rotate-to-portrait prompt (art-ux/m3-rotate-portrait-prompt.md v1.0): phones in landscape only; game keeps running; #app inert. */
export const ROTATE_QUERY = '(orientation:landscape) and (pointer:coarse) and (max-height:499px)';
export const ROTATE_TITLE = 'Turn your phone', ROTATE_BODY = 'Egg Farm plays best in portrait.';
/** Shown only when the media query matches and the save-recovery dialog isn't open (it takes priority). */
export const rotateShown = (matches: boolean, recoveryOpen: boolean) => matches && !recoveryOpen;
/** D7: while open the prompt is the only focus stop: Tab / Shift+Tab stay on it, focus that lands outside is pulled back. */
export function trapFocus(el: HTMLElement, doc: Document = document) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); el.focus(); } };
  const onIn = (e: FocusEvent) => { if (!el.contains(e.target as Node)) el.focus(); };
  doc.addEventListener('keydown', onKey, true); doc.addEventListener('focusin', onIn, true);
  return () => { doc.removeEventListener('keydown', onKey, true); doc.removeEventListener('focusin', onIn, true); };
}
export function mountRotatePrompt(app: HTMLElement, icon: string, recoveryOpen: () => boolean, onChange: (shown: boolean) => void = () => {}) {
  const el = document.createElement('div'); el.id = 'rotate-prompt'; el.hidden = true; el.tabIndex = -1;
  el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'rp-t'); el.setAttribute('aria-describedby', 'rp-b');
  el.innerHTML = `<img src="${icon}" alt="" aria-hidden="true" width="64" height="64"><h2 id="rp-t">${ROTATE_TITLE}</h2><p id="rp-b">${ROTATE_BODY}</p>`;
  document.body.append(el);
  const mq = matchMedia(ROTATE_QUERY); let last: Element | null = null; let shown = false; let release: (() => void) | null = null;
  const sync = () => {
    const want = rotateShown(mq.matches, recoveryOpen()); if (want === shown) return; shown = want;
    el.hidden = !want; app.inert = want;
    if (want) { last = document.activeElement; el.focus(); release = trapFocus(el); }
    else { release?.(); release = null; if (last instanceof HTMLElement && last.isConnected) last.focus(); last = null; }
    onChange(want);
  };
  mq.addEventListener('change', sync); sync();
  return { sync, get shown() { return shown; } };
}
