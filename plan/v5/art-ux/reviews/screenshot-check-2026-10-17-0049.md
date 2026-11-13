# UI screenshot spec check · 2026-10-17 00:49 CEST · UI/Visual Designer
Result: **FAIL** for B-2 first-hire tip @ PR #4 572864a (1 Major, 2 Minor); 1 Minor on the Workers-tab New dot (PR #12 0f2b785 QA shot). Everything else new this run: PASS or out of scope.

## 1. B-2 "Workers get tired over time." tip · PR #4 @ 572864a · Chromium (qa/m3-recheck/b2-pr4-572864a/)
Spec: art-ux/rc2-notes-b2-b3.md §B-2 lines 4–15 (place below the energy bar, never cover `[role=tablist]`, AC line 15: tip rect doesn't intersect the tablist or the Refill button at 1280×800 and 360×640).
Evidence: b2-chromium.log (per-size rects), pr-chromium-tired-{viaHireTip,direct}-*.png, base-chromium-tired-*.png.

PASS parts
- viaHireTip flow, all 9 sizes (360×740 … 1366×768): tip sits **below** the bar (`side=below`), `tabHits=0`, in viewport, gap bar→tip ≈ 12–13px as spec'd (rc2-notes line 7). 1280×720 and 1280×600 docked: clear of the Upgrades tablist (pr-chromium-tired-viaHireTip-1280x720.png). Copy unchanged and correct.

Change list
1. **Major · direct-hire flow at 1024×474 still puts the tip above, on the tablist.** pr-chromium-tired-direct-1024x474.png; b2-chromium.log `direct-1024x474 tired … tabHits=27 … tabOv=7734 side=above`. The tip covers Collection/Farm/Workers and the "Market Hand" name for its whole 3s life. Rule 2 (rc2-notes line 8, flip side or clamp to `tablist.bottom + 8`) isn't applied on this path. Fix: run the tablist-intersection check in `place()` for every coach call, including the direct-hire path. Since below doesn't fit at 474 tall, clamp top to `tablist.bottom + 8`, or skip the tip when neither side fits (it's a 3s non-blocking hint).
2. **Minor · the tip covers the Manage (Refill) button and the "Energy 100%" label** at every size where it sits below. b2-chromium.log `covers=["manage"]` ×all below placements; visible in viaHireTip-1280x720 / 360x740 / 390x640 (button pill hidden behind the tip). AC (rc2-notes line 15) says no overlap with the Refill button. My spec anchored at `.ebar` bottom + 12 (line 7), which didn't allow for the label and button under the bar. **Spec correction (this review):** anchor below-pref to the **worker row's bottom + 8px** (row = name, bar, label, button), and keep the hand pointing up at the row. Fall back above the row only if that doesn't hit the tablist, otherwise clamp as in item 1. QA's 390×640 CHECK (rowHits) goes away with the same change.
3. **Minor · tip shown with no anchor when the Upgrades sheet is closed (direct flow, 360–430 portrait).** pr-chromium-tired-direct-360x740.png (tip floats over the coop roof with the hand pointing at hens; log `side=null tabs=0 rowOv=null`). Fix: only show the tip when its `.ebar` anchor is laid out and in view. Otherwise queue it until the Workers tab is open (same 3s, once).

## 2. PR #12 @ 0f2b785 L30 shots · QA (qa/m3-recheck/pr12-l30-0f2b785/chromium-360-{F29,nudge}.png)
- M4 strip copy "Balanced farm 0/5 · next +10% at all ≥ 5" matches art-ux/m4-tracks-copy.md line 18 ✔, one line at 360 ✔. Buy buttons ≥ 44px ✔.
- 4. **Minor · the Workers-tab New dot clips the "s" of "Workers" at 360** (both shots, tab at ~x 250–335, y 262–290). rc2-workers-copy.md line 17 / line 53 place the dot on the tab name, but it mustn't cover the label. Fix: give the tab label `padding-right: 10px` and pin the 8–10px dot at `top:-2px; right:0` of the label box (or sit it in the tab's top-right corner, outside the text). Check at 360 and 1280 docked.
- Note: the "nudge" shot doesn't show the nudge itself (the Farm card is below the fold). Engineering's engineering/screenshots/pr12-nudge/ shots (282e7b2) already cover it and passed at 00:44 (status.md line 17).

## 3. Also checked, no change
- qa/m3-recheck/cuta-ux-extras/firefox-{360,1280}-{1,2,2a,2b,2c}-*.png, firefox-360-3{,a}-nav-badge*.png (12, d56033f, Firefox): render matches Chromium; nav badge "3" top-right ✔. The sticky "Refill 1 tired worker" bar over the red banner at 360 (firefox-360-2c) is the same open 23:25 Minor (reviews/screenshot-check-2026-10-16-2325.md), now reproduced in Firefox too. No new issue.
- qa/scratch/engineering/screenshots/rc0-recovery-v11/*.png (3): recovery dialog "A fresh start" matches the approved rc0 v11 copy, buttons ≥ 44px ✔.
- Out of scope (QA release/save/regression runs and playtest): qa/m3-recheck/pr13-release-check-6cc37f6/shots/*.png (7), qa/m3-recheck/save-5d636d8/shots/chromium/*.png (10), qa/m3-recheck/b2-pr4-572864a/rc0-shots{,-base}/ and chromium-{mixed,need}-*.png (fixture re-renders of already-reviewed states), qa/claude-gamer/rc1-qa-bugs-v4-7d52952/{desk,m390}-*.png (playtest), qa/m3-recheck/logs-4bf4a22/tg-chromium-*.png (tooling, like tg-webkit).

Still waiting on: M4-A remaining sign-off shots (locked 'Needs Farm L{n}' row + aria, MAX row, 'Balanced farm 5/5 · +30%' + toasts, Farm tab at 360/1280 docked, strip text-alternative DOM dump), B-1 Coop full SHA/screenshot (PM Workers), B-3 compact Farm card SHA (UI engineer), 'Limited by collecting' fix, v1.6.1 goal label, Refill nav/bulk bar fix when only Market Hand is asleep.
