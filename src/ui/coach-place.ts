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

/** rc2-notes §B-2 amendment (00:55, after the 00:49 FAIL): gap between the whole worker row and the tired tip. */
export const ROW_GAP = 8;
export interface SafeOpts {
  /** What the hand points at (legacy tips) */ target: Box;
  tip: { w: number; h: number }; cx: number; vp: { w: number; h: number };
  /** All laid-out [role=tablist] rects */ tabs: Box[];
  /** Extra rects the tip must not touch (worker name, Energy label, Refill/Manage button…) */ avoid?: Box[];
  /** Tired tip: anchor to the whole worker row (top = row.bottom + 8), which must be fully on screen */ row?: Box;
  /** Anchor laid out, in view, and (tired tip) the Workers sheet open */ visible: boolean;
}
const hit = (a: Box, b: Box) => b.right - b.left > 0 && b.bottom - b.top > 0 && Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
/**
 * Every tip, every path: returns a placement fully inside the viewport (8px margin) that intersects no tablist, no avoid
 * rect and not its own anchor, or null = don't show it now (defer and re-check). Never clamps onto the tabs.
 * Row mode (tired tip): below the row first (row.bottom + 8), else above it (row.top - 8 - h); null unless the row is fully on screen.
 * Legacy mode: the legacy side first (above when target.top >= 120), then the other side.
 */
export function safeCoachPlacement(o: SafeOpts): { side: 'above' | 'below'; top: number } | null {
  if (!o.visible) return null;
  const M = COACH_MARGIN, { tip, vp } = o, l = o.cx - tip.w / 2, r = o.cx + tip.w / 2;
  if (l < 0 || r > vp.w) return null;
  let cands: Array<{ side: 'above' | 'below'; top: number }>, anchor: Box;
  if (o.row) {
    anchor = o.row;
    if (o.row.top < 0 || o.row.bottom > vp.h) return null;
    cands = [{ side: 'below', top: o.row.bottom + ROW_GAP }, { side: 'above', top: o.row.top - ROW_GAP - tip.h }];
  } else {
    anchor = o.target;
    const A = { side: 'above' as const, top: o.target.top - COACH_GAP - tip.h }, B = { side: 'below' as const, top: o.target.bottom + COACH_GAP };
    cands = o.target.top >= COACH_MIN_TOP ? [A, B] : [B, A];
  }
  const bad = [anchor, ...o.tabs, ...(o.avoid ?? [])];
  for (const c of cands) {
    const b: Box = { left: l, right: r, top: c.top, bottom: c.top + tip.h };
    if (b.top < M || b.bottom > vp.h - M) continue;
    if (bad.some(x => hit(b, x))) continue;
    return c;
  }
  return null;
}
