/** UX-M2 (art-ux/m4.1-ui-minors.md) + Art ruling on #65 (2): the bottom-anchored no-storage notice (.save-warn, NO_STORAGE_TEXT,
 *  the only caller of saveNotice in main.ts) sits above Collect, never over it. At widths <= 390 it may cover the next-goal strip;
 *  wider (430+, docked 1280) it also clears the goal strip. Offset from the viewport bottom = viewport height - (Collect top, or
 *  the goal strip top when wider than 390) + 8px; never below the old nav + 8px anchor. Pure; unit-tested. */
export const TOAST_GAP = 8, GOAL_COVER_MAX_W = 390;
type R = { top: number; height: number };
export function toastSafeBottom(collect: R | null, viewportH: number, navH = 64, goal: R | null = null, viewportW = 0): number {
  const floor = navH + TOAST_GAP, ok = (r: R | null): r is R => !!r && r.height > 0 && Number.isFinite(r.top);
  let top = ok(collect) ? collect.top : Infinity;
  if (viewportW > GOAL_COVER_MAX_W && ok(goal)) top = Math.min(top, goal.top);
  return Number.isFinite(top) ? Math.max(floor, Math.ceil(viewportH - top + TOAST_GAP)) : floor;
}
/** Keep --toast-safe-b on <html> current (resize + Collect / goal strip size changes). */
export function trackToastSafe(collectEl: HTMLElement, doc: Document = document, goalEl: HTMLElement | null = doc.getElementById('goal')) {
  const win = doc.defaultView; if (!win) return;
  const vis = (e: HTMLElement | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.height > 0 ? r : null; };
  const set = () => { const nav = doc.querySelector('nav.actions')?.getBoundingClientRect().height || 64;
    doc.documentElement.style.setProperty('--toast-safe-b', `${toastSafeBottom(vis(collectEl), win.innerHeight, nav, vis(goalEl), win.innerWidth)}px`); };
  set(); win.addEventListener('resize', set);
  if (typeof win.ResizeObserver === 'function') { const ro = new win.ResizeObserver(set); ro.observe(collectEl); if (goalEl) ro.observe(goalEl); }
  return set;
}
