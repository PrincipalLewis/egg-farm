/** Coach-tip placement (QA B-2; rc2-notes §B-2 amendment A-C). Pure, unit-tested. */
export interface Box { top: number; bottom: number; left: number; right: number }
export const COACH_GAP = 12, COACH_MIN_TOP = 120, COACH_MARGIN = 8;
/** rc2-notes §B-2 amendment (00:55, after the 00:49 FAIL): gap between the whole worker row and the tired tip. */
export const ROW_GAP = 8;
/** rule D guard: no auto-scroll within 1s of the player's own scroll/touch; skips before the tired tip counts as seen; max wait of a hidden tip */
export const AUTO_SCROLL_GUARD_MS = 1000, MAX_TIRED_SKIPS = 3, MAX_DEFER_MS = 15000;
export interface SafeOpts {
  /** What the hand points at (legacy tips) */ target: Box;
  tip: { w: number; h: number }; cx: number; vp: { w: number; h: number };
  /** All laid-out [role=tablist] rects */ tabs: Box[];
  /** Extra rects the tip must not touch (worker name, Energy label, Refill/Manage button…) */ avoid?: Box[];
  /** Row mode: anchor to the whole worker row (top = row.bottom + 8, rule A), which must be fully on screen */ row?: Box;
  /** Row mode only: also allow above the row, then above the tablist (Manage tip). The tired tip is below-only (rule A; never beside, rule D) */ rowAbove?: boolean;
  /** The scroller's visible box (.sheet .body): the row (row mode) or target (legacy mode) must sit fully inside it */ clip?: Box;
  /** Anchor laid out, in view, and (row mode) the Workers sheet open */ visible: boolean;
}
const hit = (a: Box, b: Box) => b.right - b.left > 0 && b.bottom - b.top > 0 && Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
/**
 * Every tip, every path: returns a placement fully inside the viewport (8px margin) that intersects no tablist, no avoid
 * rect and not its own anchor, or null = don't show it now. Never clamps onto the tabs, never beside the anchor.
 * Row mode: below the row (row.bottom + 8); with rowAbove also above the row, then above the tablist. Null unless the row is fully visible.
 * Legacy mode: the legacy side first (above when target.top >= 120), then the other side.
 */
export function safeCoachPlacement(o: SafeOpts): { side: 'above' | 'below'; top: number } | null {
  if (!o.visible) return null;
  const M = COACH_MARGIN, { tip, vp } = o, l = o.cx - tip.w / 2, r = o.cx + tip.w / 2;
  if (l < 0 || r > vp.w) return null;
  let cands: Array<{ side: 'above' | 'below'; top: number }>;
  const anchor = o.row ?? o.target;
  if (anchor.top < 0 || anchor.bottom > vp.h) return null;
  if (o.clip && (anchor.top < o.clip.top || anchor.bottom > o.clip.bottom)) return null;
  if (o.row) {
    cands = [{ side: 'below', top: o.row.bottom + ROW_GAP }];
    if (o.rowAbove) {
      cands.push({ side: 'above', top: o.row.top - ROW_GAP - tip.h });
      const tt = o.tabs.filter(t => t.bottom <= o.row!.top && t.right > l && t.left < r).map(t => t.top);
      if (tt.length) cands.push({ side: 'above', top: Math.min(...tt) - ROW_GAP - tip.h });
    }
  } else {
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
/**
 * Rule D: how far to scroll the Upgrades panel (px, + = content moves up) so the tip fits 8px under the row: the smallest
 * scroll that makes room, never taking the row's top above the panel's visible top (= just under the tablist).
 * Also brings a row clipped under the panel top back down. 0 = no scroll needed, null = can't fit even after scrolling (skip this visit).
 */
export function autoScrollDelta(row: Box, clip: Box, tipH: number, vpH: number): number | null {
  const bottomLimit = vpH - COACH_MARGIN; // the tip is a fixed overlay: the viewport bounds it, not the panel
  const need = row.bottom + ROW_GAP + tipH - bottomLimit;
  if (row.top < clip.top) { const d = row.top - clip.top; return row.bottom - d + ROW_GAP + tipH <= bottomLimit ? Math.floor(d) : null; }
  if (need <= 0) return 0;
  return row.top - need >= clip.top ? Math.ceil(need) : null;
}
/** Rule D guard: auto-scroll only if the player hasn't scrolled/touched the panel within the last second. */
export const guardAllows = (now: number, lastUser: number) => now - lastUser >= AUTO_SCROLL_GUARD_MS;
/** Rule D: the tired tip counts as seen once shown, or after 3 skipped visits. */
export function tiredTipAfter(st: { seen: boolean; skips: number }, ev: 'shown' | 'skipped') {
  if (st.seen) return st;
  if (ev === 'shown') return { seen: true, skips: st.skips };
  const skips = st.skips + 1; return { seen: skips >= MAX_TIRED_SKIPS, skips };
}
/** A tip that hasn't shown within MAX_DEFER_MS is dropped (never pops up minutes later). */
export const deferExpired = (born: number, now: number, shown: boolean) => !shown && now - born > MAX_DEFER_MS;

/** Rule D per-tick decision for a hidden tip (pure; review 4d3cc77 #1). Tired tip: one guarded auto-scroll on settled geometry, then skip. */
export interface StepIn { autoScroll: boolean; reveal: boolean; shown: boolean; sheetOk: boolean; rowLaidOut: boolean; hasClip: boolean;
  settled: boolean; scrolledAt: number; now: number; guardOk: boolean; delta: number | null; rowCut: boolean; revealed: boolean }
export type Step = { act: 'wait' } | { act: 'skip' } | { act: 'scroll'; d: number } | { act: 'reveal' };
export const SCROLL_SETTLE_MS = 800;
export function coachStep(i: StepIn): Step {
  const ready = i.sheetOk && i.rowLaidOut && i.hasClip && !i.shown;
  if (i.autoScroll && ready) {
    if (i.scrolledAt) return i.now - i.scrolledAt > SCROLL_SETTLE_MS ? { act: 'skip' } : { act: 'wait' };
    if (!i.settled) return { act: 'wait' }; // the phone sheet may still be sliding in
    if (!i.guardOk || i.delta === null) return { act: 'skip' };
    return { act: 'scroll', d: i.delta };
  }
  if (i.reveal && ready && i.rowCut && !i.revealed && i.guardOk) return { act: 'reveal' };
  return { act: 'wait' };
}
/** Re-arm the Manage tip on a later Workers visit until it has actually shown (review ddace62 #3). */
export const manageRearm = (f: { tiredSeen?: boolean; manageSeen?: boolean; tiredWorker?: string }, tiredPending: boolean) => !!f.tiredSeen && !!f.tiredWorker && !f.manageSeen && !tiredPending;
/** Rule D guard: keys that scroll the panel (not Enter/Space on a button, i.e. the Hire tap). */
export const isUserScrollKey = (key: string, onButton: boolean) => !onButton && /^(Page(Up|Down)|Arrow(Up|Down)|Home|End| )$/.test(key);
/** Rule D guard: only these panel events count as the player scrolling/touching (not pointerdown/touchstart: the Hire tap). */
export const GUARD_EVENTS = ['wheel', 'touchmove'] as const;
/**
 * Manage tip (Art & UX 04:00 Minor on 192f273): anchored to the Manage button, 8px above it (hand down) or else 8px below.
 * The tip box must sit inside the Upgrades panel, below every tablist above the button, inside the viewport (8px), and touch
 * neither a tablist nor the button. Null = defer. Never lands on the Market panel (it lies outside the Upgrades panel box).
 */
export function managePlacement(btn: Box, tip: { w: number; h: number }, cx: number, vp: { w: number; h: number }, panel: Box, tabs: Box[]): { side: 'above' | 'below'; top: number } | null {
  const M = COACH_MARGIN, l = cx - tip.w / 2, r = cx + tip.w / 2;
  if (btn.bottom - btn.top <= 0 || btn.top < panel.top || btn.bottom > panel.bottom) return null;
  const floor = Math.max(panel.top, ...tabs.filter(t => t.bottom <= btn.top && t.right > panel.left && t.left < panel.right).map(t => t.bottom));
  for (const c of [{ side: 'above' as const, top: btn.top - ROW_GAP - tip.h }, { side: 'below' as const, top: btn.bottom + ROW_GAP }]) {
    const b: Box = { left: l, right: r, top: c.top, bottom: c.top + tip.h };
    if (b.left < Math.max(0, panel.left) || b.right > Math.min(vp.w, panel.right) || b.top < Math.max(M, floor) || b.bottom > Math.min(vp.h - M, panel.bottom)) continue;
    if ([btn, ...tabs].some(x => hit(b, x))) continue;
    return c;
  }
  return null;
}
/** Manage tip bounds: the Upgrades scroller's visible box (.body) clipped to the sheet, so never the sheet header (CCR 4adec84 #1, fdc8f7a #1). */
export const scrollerPanel = (sheet: Box, body: Box): Box => ({ left: Math.max(sheet.left, body.left), right: Math.min(sheet.right, body.right), top: Math.max(sheet.top, body.top), bottom: Math.min(sheet.bottom, body.bottom) });
