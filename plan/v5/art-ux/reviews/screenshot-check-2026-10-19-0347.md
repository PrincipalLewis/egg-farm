# Screenshot spec check 2026-10-19 03:47 (UI/Visual Designer)

Verdict: NO NEW IN-SCOPE SHOTS (no manifest on the new sets). Nothing held, nothing sent.

## New PNGs found (mtime after the 03:23 review), none reviewable
- qa/m3-recheck/gate5-pr44-4ccb9fd/{shots/chromium (81), shots/firefox (80), rc0-shots-chromium (17), rc0-shots-firefox (3)}: QA Gate 5 run on PR #44 @ 4ccb9fd (save v7, L30+ pack). Still in progress: WebKit shots empty, rc0 WebKit rerun exit=1, no manifest.json. PR #44 @ 4ccb9fd is not the final #41 RC SHA. Rejected unreviewed.
- qa/m3-recheck/gate5-final-prep/validate-4ccb9fd-chromium{,-migrated}/chromium (34 + 4): QA's Chromium-only validation of the final-SHA shot-matrix extension (MAX rows, L50/L55, coin formatting, goal) on 4ccb9fd, 360/1280. Script rehearsal, no manifest.json. Rejected unreviewed.
- qa/engineering/screenshots/* (13, incl. m1-deactivate-chromium-{360,390,1280}, save-recovery-v4-*, p3-collection-card-375, sellall-grader-t1-360): re-written 03:21–03:25 (copy/restore), no manifest.json. Not a reviewable set.
- scratch/m4-retune/r4/{rc,stk}/docs/readme/*.png (4 + 4): README assets in retune checkouts, not shot sets.

## Still waiting on
- Track B: final M4-ON (#41) SHA delta set (target 05:30–06:00 per D-CEO-20261019-05, incl. L30+ pack/migrate-v7) with manifest, Chromium/Firefox/WebKit, 360/375/390 + 1280 docked, M4 UI visible, pre-M4 farm migrated on first load (v7 path), diffed vs dd52bfd. QA's gate5-final-prep matrix (210 shots, 3 engines) is the expected format; the 4ccb9fd run should get a manifest once WebKit completes.
- Open Minors to confirm on #41: mobile Upgrades tabs 107x36; 107x26 "Collection" target at phone sizes.
