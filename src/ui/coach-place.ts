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
 * avoidTabs (the first-hire "Workers get tired" tip only): both sides are clamped into the viewport; a side is clean when it
 * covers neither the target nor a tablist (2-D overlap, so a tab bar in another column at >=960 docked is no conflict).
 * Rank the two sides: not covering the target first, then less tab overlap
 * (ties keep the legacy side). Review recheck c9d5d9c N1/N2.
 */
export function coachPlacement(target: Box, tip: { w: number; h: number }, cx: number, vp: { w: number; h: number }, tabs: Box[], avoidTabs = false): Placement {
  const G = COACH_GAP, M = COACH_MARGIN, legacyAbove = target.top >= COACH_MIN_TOP;
  const aboveRaw = target.top - G - tip.h, belowRaw = target.bottom + G;
  if (!avoidTabs) return legacyAbove ? { side: 'above', top: aboveRaw, overlap: 0 } : { side: 'below', top: belowRaw, overlap: 0 };
  const l = cx - tip.w / 2, r = cx + tip.w / 2, clamp = (t: number) => Math.max(M, Math.min(t, vp.h - M - tip.h));
  const mk = (side: 'above' | 'below', top: number) => ({ side, top, overlap: tabOverlap(l, r, top, tip.h, tabs), covers: tabOverlap(l, r, top, tip.h, [target]) > 0 });
  const A = mk('above', clamp(aboveRaw)), B = mk('below', clamp(belowRaw));
  const [first, second] = legacyAbove ? [A, B] : [B, A];
  // rank: not covering the target first, then less tab overlap; ties (incl. both clean) keep the legacy side
  const pick = (Number(first.covers) - Number(second.covers) || first.overlap - second.overlap) > 0 ? second : first;
  return { side: pick.side, top: pick.top, overlap: pick.overlap };
}
