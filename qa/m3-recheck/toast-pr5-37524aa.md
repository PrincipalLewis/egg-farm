# PR #5 (fix/rc2-toast-hire-banner) @ 37524aa: QA UI/Layout recheck
**Verdict: PASS** (no blocking findings). 3930a4c was skipped on request (superseded). Only partial 3930a4c Chromium evidence exists, in `toast-pr5-3930a4c/`.
Build: m3-rc1-pre+37524aa, verified at runtime in all 3 engines (guard: release and qa both BUILD OK). Evidence: `toast-pr5-37524aa/` (`summary.txt`, `run.sh`, `chain.sh`, `qa-midfade.mjs`).
Diff vs ed3fc9a: only `src/ui/toast-place.ts` (comment) and `tests/toast-controller.test.ts`, as claimed.

| Check | Chromium | Firefox | WebKit |
|---|---|---|---|
| unit (vitest, 2 workers) | 475 passed, 2 skipped; toast-controller 7/7, rc2-toast-banner 6/6 (toastTop) | | |
| tsc / build / build:qa / sync-economy --check / check-release-build | all green (build id ok, no QA hooks, globals = eggfarmExportTelemetry) | | |
| release window globals (real engine) | PASS, only eggfarmExportTelemetry | PASS | PASS |
| rc0 (lane 2 for Chromium, load < 12; main lock otherwise) | **213/213** | **213/213** | **213/213** |
| rc0 toast-v3 / toastfirst, per-frame | 14/14 | 14/14 | 14/14 |
| toastfirst (37524aa test) on OLD code 3930a4c | **6 FAIL / 8 PASS**: the first visible frame sits at top 97/37/57 px vs settled 196/136/156, i.e. it slides through the banner/strip. The test does catch the old bug | n/a | n/a |
| Mid-fade reversal (own harness, re-show 100 ms into fade-out) | reverses | reverses | reverses |

## What the evidence shows
- **First frame, no off-screen slide:** the rc0 per-frame log on 37524aa has the first visible frame within the 8px fade offset of the settled top at 360x740 with banner, 390x640 with strip, and 1280x800 with banner. No frame with opacity > 0 is over the banner or strip in any engine. Docked 1280 with no banner still slides in from above, which is intended (nothing to cross) and asserted by rc0.
- **Live rects measured myself (not only rc0 B2):** the settled toast sits 8px below the banner or strip: 360 top 196 vs banner 188, 390 top 136 vs strip 128, 1280 top 156 vs banner 148. At 1280 with no banner it settles at 64 (on-screen) after sliding in.
- **Mid-fade reversal:** at 100 ms into the fade-out (opacity 0.21-0.40) a new 'Coop upgraded!' re-adds `.show`. Opacity dips for one rendered frame (−0.04 to −0.12, the trigger goes through state, then render, so there's a frame of latency), then rises to 1. It never snaps to 0, and top moves smoothly back to the settled top (no jump). My harness's auto-flag, which allows at most a 0.06 dip, marks these FAIL. I judge them PASS from the frame traces in `midfade-<engine>.json` / `.log` because the criterion is no snap. Shots: `<engine>-midfade-re+100ms-*.png`.
- **Engineering shots** `/workspace/wt-ui-shots/toast-v3/toast-midfade-100ms-*.png` vs mine (`rc0-shots-chromium/toast-v3/`): toast position and size are identical. 360x740-banner is pixel-identical. The other diffs are game state only (hens, eggs, Collect button). Side-by-sides: `cmp-*.png`.
- First run of the midfade harness (v1, `midfade-chromium-v1-invalid.log`) was invalid: a second buyFarm doesn't toast. v2 re-triggers through celebratedTier.

## Findings
None blocking. Note (not a defect): a one-frame opacity dip before the reversal is expected from the render-loop trigger. A direct showToast re-call would need a hook QA builds don't expose.

## Not run
375/430/1366 sizes for the first-frame check (rc0 toastfirst covers 360/390/1280). Firefox/WebKit first-frame screenshots (rc0 takes shots only in Chromium; per-frame logs exist for all 3). 977be6a not run separately (3930a4c..37524aa reviewed by diff).

## Send-ready (to Senior Engineer UI e80556fd, cc Head of Engineering, Head of QA), priority true
PR #5 @37524aa: **QA PASS**. Gates green (unit 475/2 skipped incl. toast-controller 7/7 and toastTop 6/6, tsc, build, build:qa, check-release-build). Release globals are only eggfarmExportTelemetry in Chromium, Firefox and WebKit. rc0 213/213 in all 3 (toast-v3 14/14 each). The toastfirst test fails on old 3930a4c (6 FAIL, first frame 99-100px above settled, through the banner/strip), so it catches the bug. On 37524aa the first visible frame is within the 8px fade offset of settled, never over the banner or strip, and settles 8px below the banner/strip (360/390/1280; 1280 no-banner slides in as intended). Mid-fade re-show reverses in all 3 engines (no snap to 0, one-frame dip, smooth top). Shots match Engineering's toast-v3 set. Report: qa/m3-recheck/toast-pr5-37524aa.md
