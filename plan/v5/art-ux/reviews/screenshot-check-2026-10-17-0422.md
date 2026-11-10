# Screenshot spec check — 2026-10-17 04:22 (UI/Visual Designer)

Result: **FAIL, 1 Minor** (PR #5 toast placement @ 3930a4c, entry motion). End-state placement PASS. Everything else: no new issues.

## 1. PR #5 fix-rc2-toast-hire-banner @ 3930a4c (QA: qa/m3-recheck/toast-pr5-3930a4c/, 18 PNGs + pr-toast-chromium.json)
Spec: art-ux/reviews/rc0-pt1-13-queue-review.md F1 (toast top = strip bottom + 8px, never over the strip); rc2 item 1 (never over the 'New helper!' banner; below it the toast fades in place, styles.css:403 comment).

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Settled position, banner shown: 8px below the banner, centred, inside the viewport | PASS | pr-chromium-toast-360x740.png (banner b=188, toast at ~196), 1024x474.png, 1280x800.png |
| 2 | Settled position, no banner, phone: 8px below the queue strip | PASS | pr-chromium-toast-390x640-nobanner.png (strip b=128, toast ~136) |
| 3 | Docked, no banner: default slide from the top under the HUD, clear of the chips | PASS | pr-chromium-toast-1280x800-nobanner.png. QA's `outVp=1` there is the intended slide-from-top path (`toastTop()` returns null when docked with no banner), not a defect |
| 4 | Copy 'Coop upgraded! +1 customer slot', white on --c-meadow-strong, one line ≤ 266px | PASS | all 18 |
| 5 | **Entry motion: never over the banner / strip** | **FAIL (Minor)** | pr-toast-chromium.json: mid-fade samples (opacity 0.31–0.60) overlap the banner in all 9 banner cases (e.g. 360x740 toast t=141–173 vs banner 64–188) and the strip in 5 no-banner phone cases (390x640 toast t=81 vs strip b=128) |

**Item 5 cause (from source):** `showToast` (src/ui/app.ts:147) sets `toast.style.top` and adds `.below` in the same frame as `.show`. On the first toast after load the element has no computed `.below` state yet, so the transform transition runs from the base off-screen value (`styles.css:150`, `translate(-50%, calc(-100% - var(--hud-h) - 16px))`) to 0, starting from the new `top`. The toast slides ~100px down through the banner / strip for ~160 ms instead of fading in place from `-8px` (`styles.css:404`). Later toasts already carry `.below`, so it only shows on the first one per load (or after a docked no-banner toast clears `.below`).
**Fix:** apply `place()` and flush style before adding `.show` (e.g. `place(); void toast.offsetHeight; toast.classList.add('show')`), or add `.show` inside the `requestAnimationFrame` after `place()`. Re-shoot: a mid-fade frame (~100 ms) at 360x740 with banner and 390x640 no-banner; QA's sampler should then show `ovBanner=0 ovQueue=0` for the phone/banner cases.
- rc0-shots/*.png (10) and rc0-chromium.log 199/199: re-renders, PASS.

## 2. PR #4 B-2 rule D @ 192f273 (QA: qa/m3-recheck/b2-pr4-192f273/, 12 PNGs + geo-chromium-v1.log)
Same SHA as the 04:10 rule D check (art-ux/status.md). Confirms it: tired + Manage tips 8px under the row, clear of tabs/nav/toast, in viewport at 360x740 and 390x640 (chromium-direct-360x740-end.png); 1280x600/720/800 PASS. QA's 3 'direct 1280' FAILs are harness (`preOpen` counted while the docked Workers tab was already open; QA note in summary.txt). The 04:10 Minor stands: at 1024x474 the standalone Manage tip is placed at l=681–968, t=204–272 (geo log `gap:-262`), over the Market panel, not by Manage. No new items.

## 3. Re-renders / no new issues
- qa/m3-recheck/pr16-offline-v2-5248dd9/shots/webkit-*-capped-1234567.png (8): same SHA as 03:54; WebKit shows the same open items (⏱ emoji cap line Major, 'Welcome back!' 2-line wrap Minor, 'when / sold' Nit). Nothing new.
- qa/m3-recheck/hidden-tab-offline-b3341bd/shots/webkit-{hide,reload}-{61s,671s,10800s}.png (6): v1 popup, matches the 03:54 Chromium set.
- qa/m3-recheck/b2-pr4-902f924/webkit-{mixed,need}-{360,375,390,430,1280}.png (10): fixture re-renders, PASS.
- engineering/screenshots/m4a-c108440/save-recovery-v4-*.png (7): re-renders, PASS.

## 4. Not done this run
- Own paused-frame 'Sold out!' render (/tmp/uivd-soldout/run.sh) never started (empty run.log) and its fixture /tmp/m4a-new/sm/v6state.json is gone; ~15 QA jobs are queued on the browser lock. M4-A is already SIGNED OFF (decisions.md 04:02), so this stays a follow-up check; not re-queued now to keep the lock free for QA.
