# Screenshot spec check — 2026-10-17 11:19 CEST (freeze: verification only)

**Verdict: NO VERDICT. No new in-scope set with a manifest.json; nothing held, no B/C/M, no new Minor/Nit.**

## New since 10:53, seen
| Set | Item | Result |
|---|---|---|
| /workspace/wt-ui-shots/v3main/*-{chromium,firefox}.png (52) + rc0-chromium/ (48), rc0-firefox/ (empty) | #3 Cut A forward-merge onto main (rc1/ux-clarity-v3-main; dry-run due 11:25, D-HOP-05 merge cap 12:30) | REJECTED, not reviewed: no manifest.json, no WebKit, Firefox rc0 still empty (render in progress 11:02–11:11) |
| qa/m3-recheck/pr25-fwd-6dc2f5a-evidence/{hidden-chromium-dist-qa/shots (10), shots-rc0-webkit (3)} | #25 → #39 fwd-merge @ 6dc2f5a | Out of routine scope (not in freeze list); no manifest.json |
| art-ux/reviews/pr25-6dc2f5a-fwd/m1-deactivate-{chromium,firefox}-{360,390,1280}.png (6) | #39 Play here (m1) | Out of routine scope; art-ux working set, not QA evidence |
| qa/m3-recheck/player-m4a-triage/*.png (44) + shots/ (3) | QA player triage (P3/P4/P12) | Not screenshot evidence for an in-scope item |

## Still waiting on
#3 forward-merge set with manifest.json (only if layout changed; WebKit too); worker-asleep display; #37; #12 (only if UI changes); final RC 3-engine shot set with manifest.json. #35 dropped from rc per engineering/status.md 11:12 (its 10:40 PASS stands).
