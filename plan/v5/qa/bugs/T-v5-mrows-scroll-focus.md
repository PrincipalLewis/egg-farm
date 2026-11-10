# T-v5-mrows-scroll-focus: Market order list #mRows can't be scrolled by keyboard (axe scrollable-region-focusable, serious) [QA-D-1030-PR83-PASS F-B]
2026-10-30 12:35 CET · UI QA (edb6ef85) · Severity **Major (a11y)** (HoQ). Owner: UI e80556fd. Target 5.1, or sooner if a small focusable fix lands with a test. **Known issue in the v5 RC report and release notes.** Not an RC blocker (pre-existing).

## Finding
- axe-core 4.14.0 reports `scrollable-region-focusable` (impact serious) on `#mRows`, the Market order list (src app.ts:103).
- At the docked sizes, 1024x474 and 1280x720, the list is a scroll container with no focusable child and no tabindex. Keyboard-only users can't scroll it to reach the rows below the fold.
- Coverage: all 3 engines × 1024x474 and 1280x720. 6/6 FAIL. Not seen at phone sizes, where the list doesn't scroll inside its own box.
- **Pre-existing:** base 76390f2 has it too (Chromium). #83 doesn't add it, and it removes the base's other violation (`label-content-name-mismatch` on `.nav-manage`).

## Repro
1. Build ba398b6 (or 76390f2) and serve it at 1280x720 (docked layout).
2. Load a save with enough Market orders to overflow #mRows.
3. Run axe-core with all rules: 1 violation, `scrollable-region-focusable` on `#mRows`.
4. Manual check: Tab through the page. Focus never lands in the list, and arrow keys and PgDn don't scroll it.

## Fix acceptance (suggested)
- #mRows gets `tabindex="0"` plus an accessible name (role=region with aria-label), or its rows become focusable. The focus ring must be visible (Art spec).
- Add a test: axe on docked 1024x474 and 1280x720 gives 0 `scrollable-region-focusable` violations, and keyboard focus plus PgDn scrolls the list in all 3 engines.

## Evidence
- Report qa/m3-recheck/pr83-ba398b6-delta.md rows F-B and :53, :89, :91. Evidence qa/m3-recheck/pr83-ba398b6-evidence/.
