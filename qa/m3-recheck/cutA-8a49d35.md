# Cut A recheck: PR #3 @ 8a49d35 (Cut A QA, UI/Layout)
Date: 2026-10-17, Europe/Belgrade (CEST). Worktree: /tmp/qa-cutA-8a49d35 (detached, local objects; 8a49d35 is on origin/fix/rc2-b3-farmcard-compact and origin/rc1/ux-clarity-v3).
Ancestry: `git merge-base --is-ancestor 23a3798 8a49d35` → true.
Build ID: dist and dist-qa bundles = `m3-rc1-pre+8a49d35` (not dirty); at runtime the probe confirmed the served build = `m3-rc1-pre+8a49d35` in each engine before testing, and the HUD tag reads "build 8a49d35". Ports 6911–6916 (never :4173). Engines run one at a time (Chromium on lane 2 with load < 12; Firefox/WebKit on lane 1).
Evidence: `cutA-8a49d35/` (logs, layout-*.json, screenshots, fc-shots/, probe-layout.mjs, summary.txt).

## Results
| # | Check | Chromium | Firefox | WebKit | Evidence |
|---|---|---|---|---|---|
| 1 | tsc --noEmit | PASS | | | tsc.log |
| 1 | check-economy-copy + sync-economy --check | PASS | | | economy-copy.log, sync-economy.log |
| 1 | vitest (2 workers) | PASS 55 files, 604 passed / 1 skipped | | | vitest.log |
| 1 | test:slow (maxForks 2) | PASS 11/11 | | | test-slow.log |
| 1 | build + check-release-build | PASS (build id ok, no eggfarmUi, no QA hooks, globals = eggfarmExportTelemetry) | | | build.log |
| 1 | build:qa | PASS | | | build-qa.log |
| 1 | check-globals (runtime) | PASS: only eggfarmExportTelemetry | PASS | not run (lane-1 queue; static check passed) | check-globals-chromium.log |
| 2 | rc0 suite (incl. PT1-6 axe) | PASS 307/307 | PASS 307/307 | PASS 307/307 | rc0-*.log |
| 2 | axe serious/critical on queue/scene/onboarding | PASS (info only: #buildTag color-contrast, known) | PASS | same as Chromium | rc0-*.log |
| 3 | Order fit v1.1 (.l1 value never cut, Need/No eggs buttons 44px, equal widths) 360/375/390/1280 | PASS | PASS | PASS | rc0 orderFit11 |
| 3 | Layout probe at 360/375/390/430/1280/1024x474/1280x720/1366x768: no page h-scroll | PASS all 8 | PASS all 8 | same as Chromium | layout-*.json |
| 3 | Tap targets >= 44px (market + upgrades) | PASS all 8 | PASS all 8 | same as Chromium | layout-*.json |
| 3 | Need-state order buttons exactly 44px (not 46+) | PASS all 8 (44.0) | PASS all 8 | same as Chromium | layout-*.json |
| 3 | Element scrollWidth <= clientWidth (.l1, buttons) | Minor m1, m2 (no visible clip) | Minor m1, m2 | same as Chromium | layout-*.log |
| 4 | Farm card: limiter link vs "Pays back in" chip, 44px hit, in flow, >=8px below Buy, 360/375/390/1280 (rc0 farmLimit) | PASS | PASS | PASS | fc-shots/cuta3-farmcard-* |
| 4 | Farm card G-strict (visible, in viewport; all pairs of parts non-intersecting, all inside card) 360/375/390 (+ info at other sizes) | PASS | PASS | PASS | *-farmcard-WxH.png |
| 4 | v1.6/v1.6.1 goal label: one-line, two-line, short-name paths at 360; no ellipsis, gain unsplit, strip 40px | PASS | PASS | PASS | fc-shots/cuta3-goal-* |
| 4 | Goal label at all 8 sizes (probe) | PASS | Minor m3 (FF scrollWidth +1px on .g-track; visually full) | same as Chromium | *-goal-WxH.png |
| — | Page errors | none | none | same as Chromium | |

## WebKit
rc0 307/307 (axe, farmLimit, orderFit11, goal v1.6.1 all PASS) and layout probe 48/64, where the only failures are m1/m2, the same as Chromium. Its served build was verified as m3-rc1-pre+8a49d35.

## Findings (none hold Cut A)
No Blocker, Critical or Major findings.

Follow-up list (Minor / Info):
- **m1 (Minor/Info):** queue chips `.chip.arrive` report scrollWidth 56–57 > clientWidth 50 for the "181.2B" / "8.76M" count badge, at every size, in both engines. overflow-x is visible and the badge is drawn as a pill over the chip edge by design; nothing is clipped (see *-market-360x800.png). Suggest either containing the badge or treating this as accepted.
  Repro: save with customers of demand 181.2e9 and 9.99e6, any width, `document.querySelector('.chip.arrive').scrollWidth`.
- **m2 (Minor):** order line `.l1` "1.23M/9.99M · $20.8M" at 360x800 overflows its box by 3px (sw 167 / cw 164), overflow visible. The text is fully visible and doesn't touch the button, but it has zero margin at 360. rc0 orderFit11 (other prices) passes. Repro: 360x800, farmLevel 6, customer {demand 9.99e6, filled 1234567}, basket 0, open Market.
- **m3 (Minor/Info, Firefox only):** `.goal-label .g-track` scrollWidth is 1px > clientWidth in Firefox at every size (nowrap, overflow visible). Screenshots show "★ Collection L6 · +8% income" in full with no ellipsis; rc0's v1.6.1 goal-label checks pass in Firefox. Probably subpixel rounding.
- Known: Firefox banner scroll (carried over, not retested here).
- Known info: axe color-contrast on #buildTag (QA build tag only).

## Not run
- check-globals runtime in WebKit (Chromium and Firefox PASS; WebKit was queued behind other lane-1 holds and cancelled to meet the deadline; the static check-release-build passed).
- Layout probe states were limited to the Market sheet (Need state) and the Upgrades > Farm tab; Collection/Workers tabs at the 8 sizes are covered only by rc0's own sections.
- rc0 farmLimit/orderFit cover 360/375/390/1280 only; 430/1024x474/1280x720/1366x768 are covered by the probe only.
- Firefox banner scroll recheck (known Minor, deferred per Head of QA).

## Recommendation
**PASS: Cut A @ 8a49d35 can proceed.** All gates are green, rc0 is 307/307 in Chromium, Firefox and WebKit, and axe is clean. The Farm card limiter/chip overlap is fixed at 360/375/390 in all 3 engines (G-strict rects intersect nowhere), and the v1.6/v1.6.1 goal label doesn't clip or wrap where it shouldn't. Need-state buttons are 44px, and nothing scrolls sideways at any of the 8 sizes. Minors m1–m3, plus the known Firefox banner scroll, go on the follow-up list.
