# Screenshot spec check · UI/Visual Designer · 2026-10-17 08:18 CEST
Scope: screenshots not yet in screenshot-check-log.md (judged by folder/file name). Viewed with Read (montages + 2–6× crops); px measured from PNGs with PIL; cross-engine pixel diffs for parity.

## Verdict: FAIL, 1 new Minor (Firefox only). Closes 5 cuta3 items and the 06:17 Sold-chip Minor.

### A. Cut A v3, PR #3 @ 8a49d35 (/workspace/wt-ui-shots/cuta4/, HUD + report buildId `m3-rc1-pre+8a49d35`; provenance flag from 02:50 resolved)
Specs: rc1-upgrade-value.md v1.6.1 §4, rc2-order-sell-preview.md v1.0 (+MK-35), rc2-notes-b2-b3.md B-3, rc2-workers-copy.md §6, prior review screenshot-check-2026-10-17-cuta3-eb27707.md.

| # | Item | Result | Sev | Evidence |
|---|---|---|---|---|
| 1 | Asleep/unpaid banner hidden under the sticky Refill bar, Firefox 1280 docked | **FAIL (new)** | **Minor** | firefox-1280-4-asleep-card.png, -4a-asleep-viewport.png, -2a-unpaid-banner.png, -2b-grader-banner.png vs chromium-1280-* |
| 2 | B-3 compact Farm card (≤260 / ≤282 with ETA) | OPEN (carry-over, not in this build) | Major | cuta3-farmcard-*-{360,375,390}-*.png: card still 369px, layout identical to eb27707 (pixel diff only in the Buy button) |
| 3 | HUD egg count `1000B` | OPEN (carry-over cuta3 #6) | Minor | order-sell-360-*.png, order-sell-1280-*.png |
| 4 | Goal short-name gain line clipped (cuta3 #2) | **CLOSED** | — | cuta3-goal-short-name-360-{chromium,firefox,webkit}.png |
| 5 | 0-eggs button `No eggs` (cuta3 #3, MK-35) | **CLOSED** | — | order-need-360/1280-*.png |
| 6 | Drop ` eggs` at ≤375 (cuta3 #4) | **CLOSED** | — | order-*-360-*.png |
| 7 | `$` value never cut (cuta3 #5) | **CLOSED** | — | order-need-360: `1.8M/181B · $453B`; sell: `✓ Ready · $453B` |
| 8 | Market empty-state raw seconds (cuta3 #6 timer part) | **CLOSED** (Nit) | Nit | cuta3-full-1280-*.png `Next customer soon... (—)` |
| 9 | Refill strip tick + duplicate header pill (cuta3 Nit 7) | **CLOSED** | — | cuta3-refillbar-{360,1280}-*.png, *-1280-4a-asleep-viewport.png |
| 10 | Goal label one-line / wrap / stress (v1.6.1 §4) | PASS | — | cuta3-goal-{farm,collection,stress-wrap}-360-*.png |
| 11 | §6 banners at 360/1280 (one line, icon, 32px, aria text) | PASS | — | banners-{360,1280}-*.png, *-2a/2b-*.png, report-*.json `banners` |
| 12 | Upgrades nav badge at 360 (18px, aria `Upgrades, 3 workers asleep or unpaid`) | PASS | — | *-360-3a-nav-badge-crop.png, report navBadge360 |
| 13 | Tap targets | PASS | — | report under44 lists only inner spans/chips (goal-status `Ready!` inside button#goal; `Limited by collecting ›` has a 44px hit box per limitHit44) |
| 14 | Sell label on full rows reads `Sell`, not `Sell {k}` (cuta3 Nit 11) | OPEN | Nit | order-sell-*.png |
| 15 | Farm card 1280 fully in frame (cuta3 #12) | Not verifiable | — | *-1280-farmcard-*.png crop starts under the sticky `Upgrades` header |
| 16 | Engine parity | PASS except item 1 | — | Chromium vs Firefox/WebKit mean diff ≤1.8 on all other pairs |

**1. FAIL Minor (new, Firefox only): banner scrolled under the sticky Refill bar at 1280 docked.** In Chromium the card scrolls to sit below `Refill 1 tired worker` (bannerRect y=556). In Firefox the same step leaves the card's top under the bar (bannerRect y=501): only a 4px red sliver shows, so `Market Hand asleep: sales slowed` / `unpaid` / `Grader asleep` can't be read. The `Asleep 💤` / `Unpaid ⚠` name line still shows, which is why this is Minor. Cause (hunch, to verify): `#uRow .wk{scroll-margin-top:var(--refill-bar-h)}` (src/ui/styles.css:581), with the var set on `#uRow` from app.ts:604, isn't honoured by Firefox for this scroll; Chromium honours it. Fix: also set `scroll-padding-top` to the same measured bar height on the Upgrades scroll container, so every engine stops below the strip. Then re-shoot firefox-1280-{2a,2b,4,4a}. Also confirm the app's own scroll (app.ts:436 `block:'center'`) can't land a card under the bar.

**2. B-3 still not applied** (Major carry-over, waiting on the UI engineer's B-3 SHA; not a regression in 8a49d35).

**3. HUD `1000B`.** src/ui/format.ts:4 stops at B. Add a T tier (`n >= 1e12`) so 1e12 shows `1T`. Money has the same cap at format.ts:72.

**8. Nit:** `(—)` in brackets reads oddly; spec said hide the timer or show `—`. Suggest dropping the brackets.

**10. Note:** `★ Collection L30 · +999% income` now fits on one line at 360 (ink ends x=262, status at about x=280, no ellipsis or overlap). So the live label box is wider than the 188px in §4. That's allowed by rule 1 ("one line if it fits"). The §4 wrap table is now conservative, and no change is needed.

### B. rc2 Minors, fix-rc2-minors-sell-states @ 9677d26 (/workspace/wt-ui-shots/rc2-minors/, Chromium 360 + 1280 docked)
- sold-freeze-mid-110ms-{360,1280-docked}: **PASS, closes the 06:17 Minor.** `Sold! +$8.00` sits on a clean #3D7F33 chip with white text, and no coin particles cross it. Nit: chip text is about 10px. That's fine for a ~240ms frame, but check that `Sold! +$453B` fits without shrinking further.
- sellall-waiting: `Waiting for customers` PASS. sold-after-next-customer-soon: `Next customer soon... (~16:37)` after the row leaves, PASS. b4-riser-after-buy-100ms: PASS (unchanged from 06:17).
- Still needed: Firefox/WebKit.

### C. Other new captures
- qa/m3-recheck/toast-pr5-37524aa/firefox-midfade-re+100ms-{360x740-banner,390x640-nobanner,1280x800-banner,1280x800-nobanner}.png (4): toast visible, below the banner or queue. PASS, parity with Chromium (QA judged the reversal PASS, summary.txt 08:10).
- qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/firefox-welcome-{320x568,360x420,360x640,375x667,390x844,1280x800}.png (6): same SHA as 07:22, and **both 07:22 Minors reproduce in Firefox** (cap line cut at 360x420, `Coop upgraded!` toast over the hero at 320x568). Carry-over, not new. The other sizes PASS.
- engineering/screenshots/{m3-rc0-*,rc1-s2-6-qtag-9of9-*,save-recovery-v4-*,sellall-grader-t1-360}.png (13): re-renders PASS (hen, toast and HUD diffs only).
- /workspace/offline-v2-gates/rc0-shots/*.png (10): Saves gate re-render in progress (r8 Chromium done 08:21). save-recovery PASS. The bug9 fixture now shows partial fills: `26/113 eggs · $553.70` with `Sell 87 / +$426.30`, fits at 375, and the rc0 Bug9 asserts PASS. Re-renders PASS.
- Not yet: /workspace/wt-ui-shots/rc2-minors-2/ (empty, render running), cuta4/rc0-firefox and rc0-webkit (empty).

## Still waiting on
PR #3 Firefox banner-scroll fix re-shoot; B-3 compact Farm card SHA; HUD `1T`; PR #16 fix re-shoot (360x420, 320x568); PR #25 m1-deactivate PNG at fix SHA (2340d61 folder has logs only); rc2-minors Firefox/WebKit; rc2-minors-2 shots; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); Refill nav fix (Market Hand only asleep).
