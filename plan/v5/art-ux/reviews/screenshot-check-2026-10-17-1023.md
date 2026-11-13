# Screenshot check 2026-10-17 10:23 (UI/Visual Designer) — PASS on new, no new Minor or Nit

Freeze rules (CEO 09:57): verification only, hold only on Blocker/Critical/Major. Specs: art-ux/rc2-notes-b2-b3.md §B-3 + mock v2 (lines 20-55), art-ux/rc2-order-sell-preview.md §9 + §9.1 (lines 86-98), 09:47 review (N3, toast over Welcome-back), PR #5 toast-v3 first-frame spec (approved at a56b3a2). Contact sheets and crops: art-ux/scratch/sc1023/.

## 1. B-3 compact Farm card @ 3598417, Firefox (+ Chromium/WebKit re-render) at 360/375/390/1280 docked — PASS
/workspace/wt-ui-shots/b3/firefox/*.png (8, new), b3/*-chromium.png (8) and b3/webkit/*.png (8) re-rendered 10:10-10:14 at the same names. HUD + QA badge read m3-rc1-pre+3598417.
3598417 is 3ee5d39 + one CSS line (src/ui/styles.css, pins the level tag's .sr text inside the tag box). Pixel column scan, identical in all three engines:
| Shot | Card outer | Spec | Buy | Result |
|---|---|---|---|---|
| affordable 360 / 375 | 330→587 = 258px | ≤260 | 488→535 = 48px | PASS |
| eta 360 / 375 | 330→609 = 280px | 282±2 | 510→557 = 48px | PASS |
| affordable 390 | 341→598 = 258px | ≤260 | 499→546 = 48px | PASS |
| eta 390 | 341→620 = 280px | 282±2 | 521→568 = 48px | PASS |
- Copy/order unchanged from the 09:47 pass (`Farm` + `L6/30`, `Coop upgrade at L10`, wrapping fx, `+19% income` + `~3 min 26 s`, `Affordable in ~0:38`, `Limited by collecting ›`). No clip/ellipsis at 360/375. Docked 1280 Buy full card width in Firefox too (rc2-notes:53).
- Engine note (not a fail): Chromium draws the fx arrows as thin `→`, Firefox/WebKit bold; same as earlier sets.
- Still open for sign-off: B-3 on top of #3 final.

## 2. rc2-minors-2 (PR #35) @ 1827a27, Chromium + Firefox (/workspace/wt-ui-shots/rc2-minors-2-1827a27/*.png 50, firefox/*.png 50) — PASS
Engineering review engineering/reviews/fix-rc2-minors-2-1827a27.md: no correctness problem; 1827a27 adds 375 widths + SHOT_LOG; cd3d316 is the N3 hen z-index fix (styles.css:603-605).
- **§9 Wants N, now with 375** (asked for at 09:47): 375 reads `Wants 13 · $13.00`, `Wants 13 · $15.34`, `Wants 181B · $1.78T`, `Wants 181B · $181B`, `Wants 3.98M · $9.94M` (" eggs" dropped ≤375); 390/1280 docked keep `Wants 13 eggs · $13.00`; 360 and 320 follow the §9.1 chain exactly as at fcdda2c. Firefox matches Chromium shot for shot. PASS.
- **§9.1**: `1.23M · $20.8M` at 320/360, `1.23M/9.99M · $20.8M` at 375. Value never cut. PASS.
- **Nit N3 CLOSED** (cd3d316): n3-hens-under-hud-goal-360x420 and toast-layer-after-close-{360x420,320x568}-* now draw the meter, goal strip and Collect above the hens in both engines (`Collection L1 · +12% income` fully readable at 360x420; fcdda2c showed hens over the label). Compared side by side in scratch/sc1023/n3cmp.png.
- **Toast over Welcome-back**: toast-layer-welcome-open-* and welcome-over-toast-* show no toast over the open modal in Firefox either. PASS (close for good once #16 v2 and #35 meet, as noted at 09:47).
- **Tutorial goal bubble/link/step 3** (360/375/390/1280 docked): Firefox matches Chromium; `$2 to go · Upgrades ›`, 44px link and Skip. PASS.
- Observation only (320 is below the 360 design floor, unchanged since fcdda2c): at 320x568 the goal label shows two faint egg-like glyphs right after `Collection L1` before wrapping `· +34% income`. Not logged as a finding; Head may want UI to say what that glyph is.
- Not yet: webkit/ (empty at check time). Tooling note from the engineering review (#78-84): root rc2minors2 shot names carry no engine; .shotlog.jsonl says the root set is Chromium, so I treated it that way.

## 3. PR #5 toast first frame @ a56b3a2, QA (qa/m3-recheck/toast-pr5-a56b3a2/) — PASS
- rc0-shots-chromium/toast-v3/toast-midfade-100ms-{1280x800,360x740}-banner, -{1280x800,390x640}-nobanner (4) and ff-extra-shots/toast-v3/*-{375x667,430x932,1366x768}-{banner,nobanner} (6; firstframe-extra-chromium.log says these are Chromium despite the folder name): `Coop upgraded! +1 customer slot` sits 8px below the banner or the queue strip mid-fade, never over the banner; docked no-banner slides in from above. Matches the approved first frame. firstframe-extra 22/22, rc0 213/213 (toastfirst 14/14).
- chromium-midfade-re+100ms-*.png (4): same re-trigger probe QA marked invalid for 37524aa (midfade fails=4, jump=0); not evidence.
- rc0-shots-chromium/{m3-rc0-*,save-recovery-v4-*}.png (10): re-renders PASS.
- Firefox/WebKit toast shots at a56b3a2: not yet (Firefox guard just passed 10:25).

## 4. M4-A #31 frz @ d75d41f, QA delta (qa/m3-recheck/m4a-31-delta-d75d41f-evidence/shots-chromium/, 16) — PASS
- fileopen-release-chromium.png: dist-html/egg-farm.html opens from file:// with fonts (Fredoka/Nunito), no build label in the release HUD, layout matches the served build (fileopen-served-chromium.png). PASS.
- fileopen-file-chromium.png is blank: QA pointed it at the wrong target first (font CORS errors, textLen=0; summary.txt corrected at 10:16). Not a product finding.
- m3-rc0-*, rc1-s2-6-qtag-9of9-{375,390}, save-recovery-v4-*, sellall-grader-t1-360 (13): re-renders match the earlier passes.
- M4-A sign-off items (locked `Needs Farm L{n}` row, MAX row, `Balanced farm 5/5 · +30%`, Farm tab 360/1280, DOM dump) are not in this set; the 09:30 diff (reviews/m4a-1a44b19-diff.md) found no UI change since 1a44b19.

## Still waiting on
B-3 on #3 final; PR #3 Firefox banner-scroll fix (#3 final ETA 11:30); rc2-minors-2 WebKit @ 1827a27; #5 Firefox/WebKit at a56b3a2; #31 Firefox/WebKit shots (3-engine verdict ETA 10:50); B-1 (PM Workers); v1.6.1 full label set. Parked per freeze: #16, Sold out! frame, v1.6.1 follow-ups, Refill nav fix.
