# Review: PR #4 fix/rc2-b2-tired-tip-tabs @ 4fbd0b9 (base a01faea), QA B-2
Read-only. Worktree /workspace/review-4fbd0b9 (detached). Claude: 1 call via the wrapper (sonnet/high). Its sandbox denied Bash, so it read the files only. I checked each of its points against the code and CSS.

**Verdict: CHANGES REQUESTED.** 0 blocking, 2 major, 2 minor, 2 nit. The flip itself works for the 1280 case; the problems are the missing fallback and the test.

## How the flip works (src/ui/app.ts:532-533)
- The tip's "above" band is [r.top-12-eh, r.top-12]. It flips below when a visible [role=tablist] overlaps that band vertically, using strict `>` and `<` (exactly touching does not count).
- Re-placement runs every 250 ms (app.ts:537), so resize and scroll are picked up within one tick.
- Measuring the height: `.coach.below` only changes the hand's animation (styles.css:253), and the hand is in normal flow (flex:none). So `eh` is stable, there's no above/below oscillation, and the 40px hand is included in offsetHeight.
- The only tablist is the Upgrades `.tabs` (app.ts:90). RTL and zoom: placement uses rects and innerWidth/innerHeight, so zoom is handled. RTL doesn't apply (no RTL layout).

## Findings
### MAJOR 1: the test doesn't check behaviour (tests/rc2-b2-coach-tabs.test.ts:5-9)
- It reads app.ts as text and matches `/const above = r\.top >= 120 && !tl\.some/` plus the string '[role=tablist]'.
- It would still pass if the comparison were inverted or wrong (e.g. `t.top < r.top`, or `eh` missing). It would fail on a harmless rename.
- If the end marker is missing, `indexOf` returns -1 and `slice(start, -1)` still passes.
- Repro: change `t.bottom > r.top - 12 - eh` to `t.bottom < r.top - 12 - eh`; the test still passes.
- Fix: pull out a pure `coachSide(targetRect, tipH, tabRects, vw, vh)` and unit-test these cases: overlap, exact touch, no tablist, top < 120, horizontally disjoint, below off-screen. Or add an rc0-browser check at 1280×800 (and 390) that the tip rect and tablist rect don't intersect.

### MAJOR 2: the below placement has no viewport check or fallback (app.ts:534)
- `top = r.bottom + 12` is never clamped to innerHeight. Before this PR, only targets with r.top < 120 (near the top) were placed below. Now a target just under the tab bar anywhere on screen can be, so a tall tip on a low target can render partly off-screen.
- Repro: a short viewport (e.g. 1280×600, or a 390×640 bottom sheet) where the Market Hand row sits just under the tabs and near the bottom of the sheet. Trigger the "Workers get tired" tip (app.ts:573) or the Manage tip (app.ts:576): it flips below and its bottom is clipped.
- I worked this out from the code; I didn't run it in a browser.
- Fix: if below doesn't fit, choose the placement with less overlap, or clamp top to `innerHeight - eh - 8`.

### MINOR 3: no horizontal-overlap check (app.ts:533)
- Any visible tablist that overlaps vertically forces the flip, even if it's in another column (docked ≥960px layout). The tip is at most 320px wide (styles.css:254), centred on cx.
- Repro: a coach target in the main column at the same height as the docked panel's tabs flips below for no reason.
- Fix: also require `t.left < cx + eh_w/2 && t.right > cx - eh_w/2`, using el.offsetWidth.

### MINOR 4: changed look for the other coach tips (app.ts:556, 576)
- The hire and Manage tips target rows right under the tabs, so they now flip below as well: the hand points up and the tip covers the rows beneath. That's consistent with B-2's intent, but Art & UX should sign it off. Goal intro (app.ts:541) is unaffected (goalBtn is in the HUD at top < 120).

### NIT
- 5: the first `place()` runs during the panel's open transition (app.ts:556 right after openPanel), so the side can change about 250 ms later as a visible jump. The same lag existed before; the flip just makes it more noticeable.
- 6: querySelectorAll plus getBoundingClientRect every 250 ms, interleaved with the offsetHeight read. Trivial cost.

## Tests
Run in a /tmp git-archive copy with node_modules symlinked.
- rc2-b2-coach-tabs: 1/1 passed (but see Major 1).
- Full vitest: 462 passed, 2 skipped, 1 failed. The failure is telemetry-m3 BUILD_ID, because the copy has no .git (test environment).
- Browser tests weren't run.
