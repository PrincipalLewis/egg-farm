# Screenshot check 2026-10-17 07:22 CEST (routine run)
Reviewer: UI/Visual Designer. New since the 06:47 run (by folder/file name).

## Verdict
**FAIL, 2 Minor (PR #16 @ 0470045).** PR #5 toast @ 37524aa mid-fade re-shoot PASSES (closes the 04:22 Minor). PR #16 @ 0470045 closes its 03:00/03:54 items (⏱ emoji Major, title wrap Minor, 'when / sold' Nit, Collect at 360x420) but shows 2 Minor: the 'Coop upgraded!' toast is drawn over the Welcome-back card (hides the hero number at 320x568), and the cap line is cut in half at 360x420. PR #28 and PR #25 re-renders PASS. Carry-over: PR #25 Play here 44px (spec 48px) still open, no re-shoot yet.

## 1. PR #5 toast @ 37524aa, mid-fade re-shoot (qa/m3-recheck/toast-pr5-37524aa/rc0-shots-chromium/toast-v3/toast-midfade-100ms-{360x740-banner,390x640-nobanner,1280x800-banner,1280x800-nobanner}.png, 4)
Spec: rc2 item 1 (never over the 'New helper!' banner; below it the toast fades in place), rc0-pt1-13 F1 (toast top = strip bottom + 8px, never over the strip).
| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | 100 ms into the first toast after load, banner shown: toast already at its settled spot under the banner, half opaque, nothing crossing the banner | PASS | 360x740-banner (banner bottom ~188, toast ~196–222), 1280x800-banner (toast under the docked banner) |
| 2 | No banner, phone: toast under the queue strip, never over it, mid-fade | PASS | 390x640-nobanner (strip bottom ~128, toast ~134) |
| 3 | Docked, no banner: default slide from the top under the HUD, clear of the chips | PASS | 1280x800-nobanner (intended path, same as 04:22 #3) |
04:22 Minor (first toast slides through banner/strip, app.ts:147) is **closed**. rc0-shots-chromium/m3-rc0-desktop-1280.png re-render PASS. QA's rc0 log for 37524aa was still empty at review time (run in progress); this verdict covers the visuals only.

## 2. PR #16 offline popup v2 @ 0470045 (qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/chromium-welcome-{320x568,360x420,360x640,375x667,390x844,1280x800}.png, 6; pr16-v2-chromium.json 16/16 pass)
Spec: product/collection/offline-popup-v2-spec.md v0.3.1 (C-AC33 layout, cap line), 03:54 review items.
| # | Item | Result | Sev | Evidence | Fix |
|---|---|---|---|---|---|
| 1 | 03:00 #1 cap line icon: SVG clock, not ⏱ emoji | **PASS (closed)** | – | brown outline clock on every shot; /tmp/qa-x/pr16b/src/ui/styles.css:476 `.wb-clock` 16px, #8A5528 | – |
| 2 | 03:54 #4 'Welcome back!' on one line next to the icon | **PASS (closed)** | – | one line at 320–1280 (json: 22px at 320, 23.04px at 360, 24px at 375, 24.96px at 390, 28px at 1280); styles.css:462 nowrap + clamp | – |
| 3 | 03:54 #5 money line wrap | **PASS (closed)** | – | 'Worth up to / $848,160 when sold' on every shot; styles.css:470 `text-wrap:balance` | – |
| 4 | 03:00 #3 Collect at 360x420: visible without scrolling, ≥48px | PASS | – | 360x420 | – |
| 5 | Line A, hero, sub-line, full-digit amounts (+54,052 eggs, $848,160), rate line, × ≥44px, contrast | PASS | – | 360x640, 375x667, 390x844, 1280x800 | – |
| 6 | **No truncation (C-AC33) at short height** | **FAIL (new)** | Minor | 360x420: the rate line drops (correct, spec :17), but the cap line 'Offline limit is 2h. Check in…' is cut in half by the bottom of the scrolling body, right above Collect, with no scroll cue | Cause: styles.css:457 `.welcome-v2{max-height:80dvh}` (336px at 420 tall) + :458 `.wb-body{overflow-y:auto}` clips the last line mid-glyph. Fix: `@media (max-height:479px){.welcome-v2{max-height:calc(100dvh - 24px)}.welcome-v2 .wb-body{gap:4px}}` (about +60px, enough for the 2-line cap line), and as a fallback a 16px bottom fade mask on `.wb-body` when it scrolls. Re-shoot 360x420 and 320x568. Owner: Senior Engineer, Saves & Persistence (0470045 author). |
| 7 | **'Coop upgraded!' toast over the Welcome-back card** | **FAIL (raised from 03:54/06:16 Nit)** | Minor | 320x568: the pill covers the hero number '+54,052 eggs'; 360x420: covers line A 'Away 3h · capped at 2h'; 360x640 and 375x667: overlaps the card top and the clock icon | Cause: styles.css:150-151 `.toast{z-index:31}` sits above `#modal-layer{z-index:20}` (:134), and the toast is placed 8px under the queue strip, which is mid-card on short phones. Fix: hold toasts while `#modal-layer.open` and show them after the modal closes (preferred), or drop `.toast` below 20 while a modal is open. Toast code owner: UI & rc1 Fixes engineer (PR #5). Raised to Minor because it now hides the popup's main number; Head of Art & UX to confirm severity/owner. |
| 8 | 03:00 #2 build label visible | still not visible | Minor (carry-over) | no build label in any shot; QA reads the id from the bundle (json check 1) | as 03:00 |
Note: the toast copy in this build is 'Coop upgraded!' (main shows 'Coop upgraded! +1 customer slot'); outside this popup's scope, flagging only.

## 3. Re-renders / parity
- qa/m3-recheck/pr28-sellall-grader-f7642c9/{chromium,firefox}-{360,390}-t1-orig.png (4): PASS, same as the 06:47 Chromium baseline ('Sell all (181.2B eggs · $608.8B)' on one line, Sell ≥44px; order line 1 ellipsis allowed per m3-customer-queue-spec.md :70/:105, as judged 06:47; '+$…' float is in-flight juice).
- qa/m3-recheck/pr25-hidden-tab-59cce62/rc0-shots/{m3-rc0-desktop-1280,m3-rc0-bug9-375-market,save-recovery-v4-{fresh,restored,storage,cantsave}-{360,1280}}.png (10): harness re-renders PASS.

## Still open / waiting
PR #16 items 6–8 above; PR #25 Play here 48px fix + re-shoot; PR #4 Manage-tip fix; paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).
