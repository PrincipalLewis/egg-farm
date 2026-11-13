# Spec check: M4 gate5 explainer, B c0bb3de / C 0d4c0fe (2026-10-19 ~05:35 CEST)
Refs: m4-on-checklist.md (incl. 04:13/04:34/04:47 addenda), pr46-24e3674.md reshoot list, m4a-spec v1.16 (D-07(b) swallow) / v1.15 (C).
Superseded, not reviewed: /workspace/wt-ui-shots/m4-gate5-v2/ (manifest aa59600).

## B: /workspace/wt-ui-shots/m4-gate5-b-c0bb3de/ (81 PNG + manifest), verdict HOLD (2 Major)
- Manifest sha c0bb3de7… = head. PASS. Build-id m3-rc1-pre+c0bb3de. Shot script uncommitted (/workspace/wt-logs/rc0-browser-g5v3.mjs), no run log with ok() results on disk.
- Coverage 360/375/390/1280 on Chromium/Firefox/WebKit, 1280 docked:true. PASS. Focus Esc/Enter and refund only at 360 (per script).
### Major
- **B-M1 P46-M1 not closed on the Got it path.** The manifest records focus="collect" (mobile) / "collection" (1280) on all 12 focus-after-gotit shots. webkit-focus-after-gotit-360 shows no ring on Upgrades. Cause (tracks-explainer.ts close()): with the sheet closed, `[data-tab].active` sits in a `[hidden]` sheet, so `vis` = null, `prev` = body, and the fallback is `#collect`. Fix (trivial): fall back to the nav Upgrades button (the bottom-bar Upgrades entry) before #collect, and add a test case with the sheet closed. If HoP/Head rule that "Upgrades tab" means only the in-sheet tab when the sheet is closed, this drops to Minor.
- **B-M2 Refund line at 360 not shown on any engine.** webkit-refund-line-360: a dimmed card ghost under the scrim/Upgrades sheet, refund line unreadable. chromium/firefox-refund-line-360: no card visible at all, just the open sheet. Head's provisional Major is confirmed, and it's wider than WebKit. Cause: CSS stacking doesn't explain it. .tracks-exp is z-index 27 on body, #panel-layer is z-index 10, both body-level. The likely cause is the harness: the step runs with the Upgrades sheet still open from the Buy/tab steps, and `waitForSelector('.tracks-exp-refund').catch(()=>{})` swallows a timeout, so the shot is taken whether the card is there or not. Fix: close the sheet first (and keep Welcome back closed), drop the .catch so a missing card fails, then reshoot refund-line-360 on all 3 engines and attach the ok() log. If the card really is under the sheet in the app, the fix is to mount .tracks-exp above #panel-layer explicitly (e.g. append it to #fx-layer's sibling at z≥36) and verify again.
### Minor
- Esc/Enter focus shots: the sheet body is scrolled, so the Farm tab and its ring are out of frame. Only the script's ok() asserts focus, and no log is on disk. Reshoot with the tab in view.
- No flag-off shot (checklist EXP-c). No ★ Best buy chip in the upgrades-tabs shots (F3, carried over).
- No fade-out on close and no coin pop on refund (carried over from PR #46).
### Pass
- §11 copy verbatim: "Upgrades got an upgrade!" / "Hens and Egg value are now separate. Top them up!" / "Got it". Refund string asserted "We refunded +$1,234.56 for your old upgrades."
- Got it min-height 48px (styles.css:515). Reduced motion uses a 150ms fade (styles.css:517).
- The '+$…' element top-left on webkit 360 is the queue chip (closed per Head). No toast over the card (toasts held). No Welcome back under it.
- buy-tap-card-closed x12: F0=F1=10, card closed. The script asserts the next tap buys 1. EXP-a (swallow) PASS.
- after-reload x12: no re-show. new-save x12: no card.
- Tabs at 44 hit / 36 pill (manifest checks). Rows read "Level 9 / 30" and "Level 11 / 30" (cap L30 per D-CEO-10). L31–55 out of scope.

## C: /workspace/wt-ui-shots/m4-gate5-v115/ (27 PNG), verdict REJECT / not reviewable (1 Major)
- **C-M1 Manifest sha bac1c27 (04:56) ≠ head 0d4c0fe.** The set predates the P46-M1 fix (a1f7b07, 0d4c0fe), so it can't show P46-M1 closing, card tap included. Same set as at 05:20. Fix: reshoot at 0d4c0fe.
- Missing (Minor, but required before a pass): 375, after-reload, new-save, flag-off, refund-line, buy-tap-card-stays, focus-after-gotit. webkit-focus-after-card-360 shows no ring in frame (same scroll issue as B).
- Copy, L/30 and tabs 36/44 match B.

## 2026-10-19 05:30 B-M2 cleared
m4-gate5-b-c0bb3de-refund (3 engines, 360x800, manifest sha c0bb3de): the card shows alone at opacity 1 with the sheet closed, the refund line is readable, and the §11 copy is OK. The cause was shot timing. B-M1 is still open.
