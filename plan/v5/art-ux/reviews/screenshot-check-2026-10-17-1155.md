# Screenshot spec check — 2026-10-17 11:55 CEST (freeze, verification only)

**Verdict: NO VERDICT.** No new in-scope set has a manifest.json, so nothing was reviewed. Nothing held.

## Seen since 11:19
| Set | Item | Result |
|---|---|---|
| /workspace/wt-ui-shots/v3main/*.png (31) + rc0-chromium/*.png (42), rc0-firefox empty | #3 fwd-merge (now incl. p3-collection-card-375 F3/F10, banners, cuta3 goal) | REJECTED: no manifest.json, no WebKit, re-render in progress (files written 11:54–11:55) |
| qa/m3-recheck/p3-fix-462a071/*.png (32) + rc0-shots/*.png (2) | PM4-P3 Collection card @375 (HoQA Major, 11:26), P3-only patch 462a071 vs main af5e3ab, Chromium only | REJECTED: no manifest.json, Chromium only |
| /workspace/wt-ui-shots/p3-375/{before,after}/*.png (3) | P3 before/after @375 | REJECTED: no manifest.json |
| qa/m3-recheck/player-m4a-triage/*.png (13), pr25-fwd-6dc2f5a-evidence/**/*.png (30) | QA triage; #39/#25 (merged 11:33) | Not in scope / not evidence |

## Notes
- #5 was dropped from the RC at 11:33 (CCR Major on fwd-merge), so no #5 checks are pending.
- The P3 fix (#3 or the P3-only contingency, decision due 12:15) is the RC-critical UI item. A 3-engine set with a manifest at 375 (plus 360/390/1280 docked) is needed before I can give a verdict.

Still waiting on: #3 fwd-merge or P3 patch set with manifest.json + Firefox/WebKit; worker-asleep display; #37 (only if UI changes); #12/L30+ C2 (only if UI changes); final RC 3-engine set with manifest.
