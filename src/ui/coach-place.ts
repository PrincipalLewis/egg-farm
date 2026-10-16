/** Coach-tip placement (QA B-2; reviews b2-tired-tip-tabs-4fbd0b9 F1-F3, fix-rc2-b2-tired-tip-tabs-4fbd0b9 M1/M2/m3). Pure, unit-tested. */
export interface Box { top: number; bottom: number; left: number; right: number }
export interface Placement { side: 'above' | 'below'; top: number; overlap: number }
export const COACH_GAP = 12, COACH_MIN_TOP = 120, COACH_MARGIN = 8;
/** Area of the tip box [left,right]x[top,top+h] that covers the tablists. Zero-size rects are ignored; touching edges (shared border) do not count. */
export function tabOverlap(left: number, right: number, top: number, h: number, tabs: Box[]): number {
  let a = 0;
  for (const t of tabs) {
    if (t.right - t.left <= 0 || t.bottom - t.top <= 0) continue;
    const x = Math.min(right, t.right) - Math.max(left, t.left), y = Math.min(top + h, t.bottom) - Math.max(top, t.top);
    if (x > 0 && y > 0) a += x * y;
  }
  return a;
}
/**
 * Legacy rule (every tip): above the target if it starts >= 120px down, else below.
 * avoidTabs (the first-hire "Workers get tired" tip only): keep 'above' only if it neither covers a tablist (vertical AND horizontal
 * overlap, so a tab bar in another column at >=960 docked is no conflict) nor leaves the viewport; else consider 'below', clamped
 * into the viewport. If neither fits cleanly, take the one with less tab overlap (ties keep the legacy side).
 */
export function coachPlacement(target: Box, tip: { w: number; h: number }, cx: number, vp: { w: number; h: number }, tabs: Box[], avoidTabs = false): Placement {
  const G = COACH_GAP, M = COACH_MARGIN, legacyAbove = target.top >= COACH_MIN_TOP;
  const aboveTop = target.top - G - tip.h, belowRaw = target.bottom + G;
  if (!avoidTabs) return legacyAbove ? { side: 'above', top: aboveTop, overlap: 0 } : { side: 'below', top: belowRaw, overlap: 0 };
  const l = cx - tip.w / 2, r = cx + tip.w / 2;
  const belowTop = Math.max(M, Math.min(belowRaw, vp.h - M - tip.h));
  const aboveFits = aboveTop >= M, belowFits = belowRaw + tip.h <= vp.h - M;
  const oA = tabOverlap(l, r, aboveTop, tip.h, tabs), oB = tabOverlap(l, r, belowTop, tip.h, tabs);
  const A: Placement = { side: 'above', top: aboveTop, overlap: oA }, B: Placement = { side: 'below', top: belowTop, overlap: oB };
  if (legacyAbove && aboveFits && oA === 0) return A;
  if (belowFits && oB === 0) return B;
  if (!legacyAbove && !aboveFits) return B;
  return oA < oB ? A : oB < oA ? B : legacyAbove ? A : B;
}
