# Screenshot spec check, 2026-10-17 06:47 (Europe/Belgrade)

Result: **PASS on new captures. One carry-over Minor from 06:16 is still open** (PR #25 Play here 44px vs 48px), now confirmed in Firefox and WebKit too. No new issues.

## Checked (new since 06:16)

| Screenshots | Spec | Result |
|---|---|---|
| qa/m3-recheck/pr25-hidden-tab-59cce62/shots/{firefox,webkit}-{hide,reload}-{61s,120s,671s,10800s}.png (16) | offline popup v0.3.1 / Welcome-back v1 | PASS. Same layout as Chromium (pixel diffs are engine font rasterisation only). Copy per result-{firefox,webkit}.json: 'Welcome back! / You were away 1m · 2m · 11m · 2h+ / +244 · +480 · +2,684 · +28.8K eggs / Collect'; full digits under 1M, K suffix above. No popup at 30/59/59.999 s, popup at 60 s. Title on one line, Collect ≥44px, close ≥44px hit. 'Coop full!' tip under the popup matches Chromium baseline (06:16). |
| qa/m3-recheck/pr25-hidden-tab-59cce62/shots/{firefox,webkit}-m1-{deactivate,refuseNewer}.png (4) | art-ux/single-tab-guard/spec.md | Copy PASS ('Game open in another tab' / 'Your farm is running in another tab. Play here to continue from your latest save.' / 'Play here'), focus ring visible, save unchanged. **Still FAIL Minor (carry-over):** Play here green fill measures 44px tall in every engine (y 485–528 deactivate, 506–549 refuseNewer at 390×844 DPR1); spec and mock tab-guard-360.png say 48px. Fix unchanged: min-height 48px on the Play-here button. CSS-only, so one fix covers all three engines. |
| qa/m3-recheck/pr28-sellall-grader-f7642c9/shots/sellall-grader-t1-360.png (1) | m3-customer-queue-spec.md §Sell all / :70,:105; rc2-order-sell-preview.md | PASS. Label 'Sell all (181.2B eggs · $1.78T)' on one line at 360 (324px of 324 box, 16px margins), B/T suffixes, money now includes the Grader bonus (rc0-chromium.log 212/212; old main f035594 failed 4 'label = money gained' checks). Order line 1 ellipsis ('90.6B/90.6B eggs · …') is allowed by spec :70/:105 (nowrap + ellipsis, fixed 60px card). Sell buttons ≥44px. The '+$…' sale float crossing the label is the in-flight juice animation caught mid-frame, not a layout fault. Fits at 390 (354px) and 1280 docked (362px) per log. |
| qa/m3-recheck/pr28-sellall-grader-f7642c9/shots/{m3-rc0-*,save-recovery-v4-*}.png (10) | baselines | Re-renders PASS: save-recovery identical or ≤10px diff to the pr18 d8d680e rerun; rc0 diffs are hen animation only. |

## Change list
1. (carry-over, Minor) PR #25 @ 59cce62: Play-here button 44px → 48px (`min-height:48px`), all engines. Recheck on the next PR #25 SHA.

## Still waiting on
PR #25 Play-here fix re-shoot; PR #5 toast mid-fade re-shoot (toast-pr5-ac4ec56 has no PNGs yet); PR #4 Manage-tip fix; PR #16 0470045 shots; visible paused 'Sold out!' frame; B-1 Coop full SHA/screenshot (PM Workers); B-3 compact Farm card + v1.6.1 goal label (Cut A v4); Refill nav fix (Market Hand only asleep).
