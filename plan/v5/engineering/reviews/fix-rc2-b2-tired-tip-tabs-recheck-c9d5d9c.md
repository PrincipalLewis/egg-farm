# Re-check: PR #4 fix/rc2-b2-tired-tip-tabs @ c9d5d9c (on 4fbd0b9)
This was a read-only re-check in the detached worktree /workspace/review-c9d5d9c. Claude made 1 of 5 calls through the wrapper (RECHECK=1). Its Bash access was denied, so it only read the files. I checked each of its points by hand and ran the numbers myself.

**Verdict: CHANGES.** Nothing blocks. There is 1 new major finding, 2 minor and 1 nit. M1, m3 and m4 are fixed. M2 is partly fixed: the clamp works, but the fallback can now cover the tip's own target.

## Status of earlier findings
- **M1: FIXED.** The placement logic is now the pure function `coachPlacement()`/`tabOverlap()` in src/ui/coach-place.ts:6-34. tests/rc2-b2-coach-tabs.test.ts:7-45 holds 11 rect tests that check behaviour; the old text-grep test is gone. I mutated a /tmp copy to test them:
  - Inverting the overlap test (`x<0&&y<0`): 3 of 11 fail.
  - Using `||` instead of `&&`: 3 fail.
  - Changing `aboveTop >= M` to `<`: 3 fail.
  - Changing `oA === 0` to `!==`: 6 fail.
  - Inverting legacyAbove (`target.top < 120`): 4 fail.
  - Flipping the tie-break (`oA > oB`): 1 fails.
  - The claim of "4 of 11 fail" holds only for the legacyAbove flip. The overlap flip fails 3.
  - Some mutants survive (all 11 still pass):
    - `belowFits` flipped (`>=`), at :27
    - `oB === 0` changed to `!==`, at :31
    - `x>=0&&y>=0` at :11. This one is equivalent, because the code sums areas.
- **M2: PARTIAL.** The below position is clamped to [8, vh-8-h] at coach-place.ts:26, and the less-overlap fallback is at :33. The rc0 `b2tip` check (scripts/rc0-browser.mjs:74-87) passes 3/3 in headless Chromium at 1280x720 (top 578, bottom 646), 1280x600 (518-586) and 390x640 (256-324). I ran it from a /tmp copy using `build:qa`. The clamp brings a new problem; see N1.
- **m3: FIXED.** Overlap now needs both axes (coach-place.ts:10-11). Zero-size rects are skipped (:9), and edges that only touch count as zero area. The "other column" case is tested at test:24.
- **m4: FIXED.** `avoidTabs` defaults to false (app.ts:527, coach-place.ts:24), and only the tired tip passes `true` (app.ts:574). Hire, Manage and goal tips keep the old rule, tested at test:38-41.

## New findings
### N1 MAJOR: the clamped-below tip can cover its own target (coach-place.ts:26, :33)
- When the tip doesn't fit below, it's clamped upward, which can put it on top of the target it points at.
- The fallback then picks it purely on tab overlap.
- The PR's own 390x640 test case (test:30-36) shows it:
  - The target spans 600-608 and the tabs span 540-584.
  - Above, at 520-588, the tip overlaps the tabs by 44 rows. Below, clamped to 564-632, it overlaps them by only 20 rows.
  - So the code picks below, a tip that covers the energy bar it points at, with the hand pointing up.
- The test and the rc0 check never test for target overlap, so they pass anyway.
- Fix: rank candidates first by whether they cover the target, then by tab overlap. Add a target-rect assertion to the unit test and to rc0 b2tip.

### N2 MINOR: the above fallback isn't clamped (coach-place.ts:33, app.ts:535)
- When legacyAbove is true and the tip is tall (h > target.top - 20, e.g. a tip that wraps at 390), line 33 can return A with top < 8.
- app.ts places A using `bottom:`, so nothing clamps it and the tip clips off the top of the screen.
- No test covers this branch.

### N3 MINOR: test gaps
- The surviving mutants above mean the belowFits/oB===0 path at :31 isn't pinned by any test.
- test:33,35 contain dead code (`other`, `void other`).

### N4 NIT (from before this PR): cx is clamped with 156 at app.ts:533, which assumes a 312px tip
- `.coach` can be up to 320px wide, so at ≥960 the tip can hang about 4px past the edge.

## Tests
These ran in a /tmp git-archive copy.
- rc2-b2-coach-tabs: 11/11 passed.
- Full vitest: 472 passed, 2 skipped, 1 failed. The failure is telemetry-m3 BUILD_ID, because the copy has no .git; that's a test-environment issue.
- rc0 `ONLY=b2tip` in headless Chromium: 3/3 passed. The other rc0 sections and engines weren't run.
