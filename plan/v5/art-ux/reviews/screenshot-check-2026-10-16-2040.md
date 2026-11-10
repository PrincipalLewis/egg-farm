# UI screenshot spec check · 2026-10-16 21:03 · UI/Visual Designer
Routine run. New screenshots since the 20:10 baseline (log: reviews/screenshot-check-log.md).
Builds: Cut A **1371305** (rc1/ux-clarity-v2) and **7d52952** (fix/rc1-qa-bugs-v4, on main a01faea).

## Verdict: FAIL (1 Major, 1 Minor), plus 2 items not built yet
| # | Item | Spec | Result |
|---|---|---|---|
| 1 | "Limited by collecting ›" overlap fix @1371305, 360/375/390, all 3 engines | rc2-notes-b2-b3.md:16, :34, :36, :48; rc1-upgrade-value.md:32 | **FAIL, Major** (not fixed) |
| 2 | v1.6 goal label "★ Egg value · +999% income" @1371305, 360 | rc1-upgrade-value.md:52–59 (v1.6 §4) | **PASS on fit**; v1.6 wrap rule **not built** |
| 3 | B-1 Coop full @7d52952, 360 + 1280 | b1-coop-full-copy.md §1–§5 | **NOT IN BUILD** (badge fit passes) |
| 4 | m3/rc1-ui order card (MK-24-1) @7d52952, 360, Chromium + Firefox | m3-customer-queue-spec.md:62 | **FAIL, Minor** |
| 5 | M4-A vs m4-tracks-copy.md v1.1 | — | no screenshots yet |

## 1. "Limited by collecting ›" sits on the payback chip: FAIL, Major
Evidence: qa/m3-recheck/cut-a-1371305-artux-triage/1371305-{chromium,firefox,webkit}-farmcard-{affordable_noETA,unaffordable_withETA,control_C25_notLimited}-{360,375,390}.png; report qa/m3-recheck/cut-a-1371305-artux-triage.md §1.
- Seen in the shot: the link text is drawn over "Pays back in ~3 min 43 s", both unreadable (glyph overlap 135.8×15.8px at 360, 139.8 at 375, 140.6 at 390; identical in all engines). The link appears above Buy, while spec order is Buy → link (rc2-notes-b2-b3.md:36).
- Cause (QA, confirmed at runtime): wrapper `<div class="hint coop">` (app.ts:489) picks up the farm-sprite rule `.coop{position:absolute;…bottom:38%}` (styles.css:76). It is **not** the ETA-line collapse I suspected in rc2-notes-b2-b3.md:16; the overlap is the same with the ETA line shown. I'll correct that line once Head of Art & UX okays the edit.
- The 44px hit box (72px tall here) also covers the chip row; spec wants a 44px hit area with 8px clear of Buy (rc2-notes-b2-b3.md:34, :48).
**Change list (Eng):**
1. Rename the hint modifier (e.g. `.hint.limit`) or scope the sprite rule (`.scene .coop` / `#coop`) so the link is back in normal flow, below Buy.
2. Hit area per rc2-notes-b2-b3.md:48: drop `margin-block:-14px`, use `position:relative;margin-top:16px` + `::before{inset:-14px 0}`; 8px clear between Buy bottom and the hit-area top.
3. Recheck at 360/375/390 + 1280 docked: no overlap with chips, `.meta` or Buy; link hit ≥44px; text `--c-wood-text` 12px 700 on card white keeps contrast.

## 2. Goal label "★ Egg value · +999% income" at 360: PASS on fit, v1.6 not implemented
Evidence: 1371305-{engine}-goal-eggvalue-360.png, goal-{engine}.json (label injected into the live strip; Egg value isn't a goal in this build).
- One line, ★ kept, gain span whole, no ellipsis, no clipping: natural 176px in a 188px box, all engines within 0.04px. ✔ Copy matches `★ {Track} · +X% income`.
- Not built: the build still has v1.4 behaviour (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis` and `fitGoalLabelEl` hide ★ → short name). v1.6 needs the wrap-before-gain step and no ellipsis (rc1-upgrade-value.md:54–59, :76). **Change (Eng):** implement v1.6 §4, then post a 2-line case (e.g. a forced narrow label) for recheck.
- Spec accuracy (on me): the live label box at 360 is **188px**, not the 200px budget (rc1-upgrade-value.md:53, :56), and my table reads ~24px high (Egg value 200 in the table, 176 measured, rc1-upgrade-value.md:66; the "Collection 201px → wraps" note at :75 is probably also high). Next: re-measure the §4 table in-browser at a 188px budget and bring the corrected table to Head of Art & UX.

## 3. B-1 Coop full @7d52952: not in build
Evidence: qa/m3-recheck/rc1-qa-bugs-v4-7d52952/chromium-b1-coopfull-{360,1280}.png, chromium-b1-badge-{360,1280}.png, extra-chromium.log.
- Badge still reads `Full!` (39.7px), no ⚠, no `aria-label="Coop full"`, no rate chip, no hint line (QA: `b1BuildPresent:false`). The B-1 copy simply isn't on this branch, so this is not a fail.
- What does pass: the badge is inside the coop box and viewport with no overlap at 360 and 1280 (8 samples each); white on #B83B37 is 5.65:1.
- When B-1 lands, check against b1-coop-full-copy.md: `⚠ Full!` with U+FE0E (:5–7), badge `--c-danger` + aria (:10–11, :36), rate chip on the rate line, HUD fits 344px at 360 (:18–22), one hint at a time (:24–30), badge ≈54px in the live-rect check (:12).
- Info: this branch's HUD shows no net-rate line at all (360 and 1280), unlike Cut A 1371305 (`+$14.54/s`). B-1 rule 2 (rate number stays visible, :19, :21) needs the Cut A HUD, so B-1 has to build on top of Cut A.

## 4. Order card cuts "eggs" mid-word at 360: FAIL, Minor
Evidence: rc1-qa-bugs-v4-7d52952/{chromium,firefox}-mixed-360.png, row 2: `0/1.8M eg… · $9.94M`.
- Spec m3-customer-queue-spec.md:62: the eggs count is never cut; at ≤360, if the line doesn't fit, **drop the " eggs" word** (`0/1.8M · $9.94M`). Money never truncates (MK-24-1 v3) is respected ✔.
- 375/390/430/1280 fit (`0/1.8M eggs · $9.94M` whole). Sell buttons fit at all widths incl. `Sell 181.2B` (M-1 PASS); Sell all fits.
**Change (Eng):** at ≤360 use the drop-the-word fallback (container query on `.txt` or a JS width check) instead of ellipsis on line 1.

## Out of scope / no review needed
- qa/m3-recheck/release-confirm-m3-rc1-dialog/shots/ (24): release build-id and save-load checks (QA PASS); no UI spec item.
- rc1-qa-bugs-v4-7d52952: need-*, m1-181B-*, tut1-cardtap-*, b4-release-perf, rc0-shots/*: QA checks passed; glanced at, nothing new against my specs beyond item 4.
- art-ux/mocks/ (2 new): my own B-3 mock.
