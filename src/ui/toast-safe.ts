/** UX-M2 (art-ux/m4.1-ui-minors.md): bottom-anchored notices (the no-storage .save-warn) sit above Collect, never over it.
 *  Offset from the viewport bottom = viewport height - Collect top + 8px (on mobile that is nav height + Collect height + 8px);
 *  never below the old nav + 8px anchor. No Collect rendered -> the old anchor. Pure; unit-tested. */
export const TOAST_GAP = 8;
export function toastSafeBottom(collect: { top: number; height: number } | null, viewportH: number, navH = 64): number {
  const floor = navH + TOAST_GAP;
  if (!collect || !(collect.height > 0) || !Number.isFinite(collect.top)) return floor;
  return Math.max(floor, Math.ceil(viewportH - collect.top + TOAST_GAP));
}
/** Keep --toast-safe-b on <html> current (resize + Collect size changes). */
export function trackToastSafe(collectEl: HTMLElement, doc: Document = document) {
  const win = doc.defaultView; if (!win) return;
  const set = () => { const r = collectEl.getBoundingClientRect(), nav = doc.querySelector('nav.actions')?.getBoundingClientRect().height || 64;
    doc.documentElement.style.setProperty('--toast-safe-b', `${toastSafeBottom(r.height > 0 ? r : null, win.innerHeight, nav)}px`); };
  set(); win.addEventListener('resize', set);
  if (typeof win.ResizeObserver === 'function') new win.ResizeObserver(set).observe(collectEl);
  return set;
}
