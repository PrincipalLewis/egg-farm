# UI screenshot spec check · 2026-10-17 02:24 CEST · UI/Visual Designer
Result: **PASS** on everything new this run. M4-A @ 14ba6e9 fixes the 01:55 Major (the next-goal pill is back). B-2 @ PR #4 902f924 fixes all three 00:49 items (amended rules A–C). No new failures. Still open (not failures of these builds): M4-A sign-off evidence (01:17 items 1, 3, 4, toasts, a 360 Farm view with the goal strip uncovered) and B-2 rule D (signed off 02:15, after 902f924 was cut; already with UI & rc1 Fixes since 02:16).

## 1. M4-A · 14ba6e9 · Engineering (engineering/screenshots/m4a-14ba6e9/, 12 shots)
Commit on top of 2625e5c: 14ba6e9 (wraps the goal button's children in `span.goal-pill`, game/src/ui/app.ts line 80 @14ba6e9, + tests/d5-goal-pill.test.ts).

PASS
- **01:55 Major fixed: next-goal pill restored.** m3-rc0-desktop-1280.png: `Collection L1: +5/tap` sits in the white pill with the meadow outline again; flag icon, label, `Ready!` chip and `›` are all inside the pill with normal gaps, no collision between `+5/tap` and `Ready!`. Matches the e38cf76 render and layout-spec §3.3 / rc1-upgrade-value.md §4 line 75 (40px strip). Source check: app.ts:80 now `<button class="goal">…<span class="goal-pill">icon, label, status, chev</span></button>`, matching the D5 CSS from 048f1ed.
- rc1-s2-6-qtag-9of9-{375,390}.png: byte-identical to 2625e5c (`Full` at 375, `Queue full` at 390), still PASS.
- save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280}.png: dialogs unchanged (art-ux/save-recovery-dialog.md v2.1 lines 9–11, 55, 58); bodies 2 lines at 360, buttons ≥ 44px ✔. Pixel diffs vs 2625e5c are the pill behind the dim.
- m3-rc0-bug9-375-market.png: 5 rows `113/113 eggs · $553.70`, `Sell all (200 eggs · $980.00)` fit at 375, Sell ≥ 44px ✔.

Still needed for M4-A sign-off (unchanged from reviews/screenshot-check-2026-10-17-0155.md §1 item 2)
- A 360 Farm view with the goal strip **not** behind a dialog (Ready! and ~m:ss states). At 360 the only shots have the save dialog covering the strip.
- #1 MAX as a non-interactive label, #3 no tag on a turned-away customer, #4 CSS lock glyph in Dust, #5 5/5 text-alternative DOM dump, tier-reached + per-track milestone toasts at 360 and 1280 docked (v7 save or a live tier-crossing buy).

## 2. B-2 tired tip · PR #4 @ 902f924 · QA Chromium (qa/m3-recheck/b2-pr4-902f924/)
Spec: art-ux/rc2-notes-b2-b3.md §B-2 amended A–D (lines 13–18). Evidence: b2-chromium.log, rc0-chromium.log, pr-chromium-tired-*.png, rc0-shots/*.png.

PASS (00:49 change list)
- **Item 1 (Major) fixed:** pr-chromium-tired-direct-1024x474.png shows no tip at all; rc0-chromium.log `direct 1024x474 … "first":"deferred (not shown)"`. Nothing covers Collection/Farm/Workers (rule B).
- **Item 2 (Minor) fixed:** pr-chromium-tired-viaHireTip-360x740.png, rc0-shots/b2-tired-direct-1280x800.png: tip sits 8px under the whole Market Hand row (log `gap=8 covers=[] tabOv=0 rowOv=0` at 360×740, 390×640, 1280×800), hand points up at the row, Manage button and `Energy 100%` fully visible (rule A).
- **Item 3 (Minor) fixed:** pr-chromium-tired-direct-360x740.png: sheet closed, no floating tip over the coop roof (rule C).
- Copy `Workers get tired over time.` unchanged ✔; tip within the docked panel at 1280×800 (r 1219 < 1280) ✔.

Open, not a new failure
- **Rule D not in this build** (902f924 predates the 02:15 sign-off). At 1280×720, 1280×600 and 1024×474 the tired tip defers and the Manage tip doesn't show (rc0-chromium.log `"manage":false`; pr-chromium-tired-viaHireTip-1280x720.png shows no tip). Rule D wants: auto-scroll the panel (1s no-touch guard), then place per A; if still no fit, skip the tired tip but still show Manage; mark seen after shown or 3 skips. Already sent to UI & rc1 Fixes at 02:16 (art-ux/status.md). Re-check on the next PR #4 SHA at 1280×720, 1280×600, 1024×474 + Firefox/WebKit.
- Harness note for QA (not a visual item): b2-chromium.log rows at defer sizes say `SHOWN-at-defer-size` with a 0,0 rect and `sheet:false`; the screenshots show no tip, so the probe is likely measuring the hidden `.coach` node. smoke-chromium.log has 4 SMOKE FAILs (onboarding caption, Queue full tag/bubble, replay) and crashed; QA's call.

## 3. Also checked
- qa/m3-recheck/pr12-b6cbeb5-recapture/*.png (10) and engineering/screenshots/pr12-nudge/{workers-tab-dot,nudge-f25-0workers}-360x740-webkit.png (2): already reviewed and PASSED at 02:19 (art-ux/status.md line 23): New dot clears the "s", nudge one line 221.5/224px. Logged here.
- Re-renders under already-logged names / out of scope: qa/m3-recheck/b2-pr4-572864a/*.png (12, baseline re-renders before QA retargeted to 902f924), qa/m3-recheck/cuta-ux-extras/{firefox,webkit}-{360,1280}-*.png (d56033f), engineering/screenshots/pr12-nudge/*-chromium.png (01:58 re-render), qa/m3-recheck/b2-pr4-902f924/chromium-{mixed,need}-{360,375,390,430,1280}.png (10, layout fixture re-renders of reviewed states).

Still waiting on: M4-A 360 goal-strip view + items 1, 3, 4, 5 and toast captures; B-2 rule D build; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card SHA (UI engineer); 'Limited by collecting' fix; v1.6.1 goal label; Refill nav fix (Market Hand only asleep); sticky Refill bar backing.
