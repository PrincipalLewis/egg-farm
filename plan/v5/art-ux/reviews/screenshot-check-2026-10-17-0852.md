# Screenshot spec check — 2026-10-17 08:52 (UTC+2)

**Result: PASS on new captures.** Closes the 06:16 Minor (PR #25 "Play here" 44px vs 48px). Carry-over Minors from 07:22 (PR #16 @ 0470045) reproduce in WebKit too; no new findings.

## New since 08:18

| # | Capture | Spec | Result |
|---|---------|------|--------|
| 1 | art-ux/reviews/pr25-2340d61-m1-deactivate/m1-deactivate-chromium-{360,390,1280}.png (PR #25 @ 2340d61) | art-ux/single-tab-guard/spec.md (Play here 48px, copy) | **PASS.** "Play here" now 48px tall at 360/390/1280 (logs/rc0-chromium.log: "Tab guard 'Play here' min-height 48px" ×3, playH 48). Copy "Game open in another tab" / "Your farm is running in another tab. Play here to continue from your latest save." matches; title wraps cleanly at 360 ("…another / tab"), single line at 390/1280; focus ring visible; white card on dimmed scrim. **06:16 Minor closed.** |
| 2 | same folder: m3-rc0-*, save-recovery-v4-* (8), sellall-grader-t1-360.png | re-renders | PASS (rc0 chromium 222/222; Sell all label fits at 360/390/1280, cantsave controls 48/44px). Firefox rc0 log still empty (render running), WebKit not yet. |
| 3 | qa/m3-recheck/pr16-offline-v2-0470045-evidence/shots/webkit-welcome-{320x568,360x420,360x640,375x667,390x844,1280x800}.png | art-ux offline v2 copy | Parity with Chromium/Firefox. **Both 07:22 Minors reproduce** (carry-over, same build 0470045): cap line "⏱ Offline limit is 2h…" cut at 360x420 (styles.css:457-458, 80dvh + overflow), and "Coop upgraded!" toast over the welcome card hides the hero number at 320x568 and the "Away 3h · capped at 2h" line at 360x420 (toast z31 over modal z20). Fix re-shoot still needed. |
| 4 | qa/m3-recheck/toast-pr5-37524aa/webkit-midfade-re+100ms-{360x740-banner,390x640-nobanner,1280x800-banner,1280x800-nobanner}.png | PR #5 toast placement | PASS, parity with Firefox: toast sits below the "New helper!" banner at 360 and 1280, no overlap. |

Note (Nit, not this PR): in the PR #25 m1 shots the "Coop upgraded! +1 customer slot" toast sits over the New helper! banner title at 1280 (and inside the banner at 360/390). It's under the modal scrim, and the PR #5 toast fix (37524aa) isn't on this branch, so expect it to clear on merge-forward. Recheck once #25 carries #5.

## Out of scope
- qa/wt-ac7-8e6d53e/docs/readme/*.png (4): README copies (commit 00e004c), not review evidence.
- wt-ui-shots/cuta4/webkit-*.png and wt-ui-shots/rc2-minors/*.png: same file names as the 08:18 check (re-written 08:24/08:42), already logged.

## Still open / waiting on
PR #16 fix re-shoot (360x420, 320x568); PR #25 Firefox/WebKit m1 at 2340d61; PR #3 Firefox banner-scroll fix (08:18 Minor); B-3 compact Farm card SHA (carry-over Major, 369px); HUD 1000B→1T; rc2-minors Fx/WK and rc2-minors-2; paused 'Sold out!' frame; B-1 Coop full (PM Workers); v1.6.1 goal label; Refill nav fix; M4-A sign-off items.
