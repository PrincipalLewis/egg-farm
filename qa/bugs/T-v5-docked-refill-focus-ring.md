# T-v5-docked-refill-focus-ring: docked header Refill uses the browser-default focus ring [QA-D-1030-PR83-PASS concern] = V51-UI-2
2026-10-30 12:35 CET · UI QA (edb6ef85) · Severity **Minor (a11y)** (HoQ). Owner: UI e80556fd. **Art specifies the ring.** Target 5.1. Not a v5 blocker.
Tracked in engineering/v5.1-backlog.md as **V51-UI-2** (Art Minor, HoE 12:05: switch to the app's 3px ring; Art re-signs). This file adds the QA repro and doesn't open a duplicate.

## Finding
- `#p-upgrades header [data-act=manageAll]` (docked layout, min-width 960 landscape) has no styled :focus-visible ring and falls back to UA `outline:auto`.
- It's visible in all 3 engines. In Chromium it's a thin dark ring that blends into the pill's border (low contrast). Unchanged by #83; pre-existing.

## Repro
1. Build ba398b6 and serve it at 1280x720. Open a state where Refill is in the header.
2. Tab to the header Refill. Compare its outline to the app's 3px ring on the other buttons.

## Evidence
- Report qa/m3-recheck/pr83-ba398b6-delta.md §5 (:95-97). Evidence qa/m3-recheck/pr83-ba398b6-evidence/.
