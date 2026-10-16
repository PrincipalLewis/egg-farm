/** Coach-tip placement (QA B-2; rc2-notes §B-2 amendment A-C). Pure, unit-tested. */
export interface Box { top: number; bottom: number; left: number; right: number }
export const COACH_GAP = 12, COACH_MIN_TOP = 120, COACH_MARGIN = 8;
/** rc2-notes §B-2 amendment (00:55, after the 00:49 FAIL): gap between the whole worker row and the tired tip. */
export const ROW_GAP = 8;
export interface SafeOpts {
  /** What the hand points at (legacy tips) */ target: Box;
  tip: { w: number; h: number }; cx: number; vp: { w: number; h: number };
  /** All laid-out [role=tablist] rects */ tabs: Box[];
  /** Extra rects the tip must not touch (worker name, Energy label, Refill/Manage button…) */ avoid?: Box[];
  /** Tired tip: anchor to the whole worker row (top = row.bottom + 8), which must be fully on screen */ row?: Box;
  /** Row mode: the scroller's visible box (.sheet .body); the row must sit fully inside it too */ clip?: Box;
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
    if (o.clip && (o.row.top < o.clip.top || o.row.bottom > o.clip.bottom)) return null;
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
