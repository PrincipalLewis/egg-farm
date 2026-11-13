# Screenshot check 2026-10-17 09:47 (UI/Visual Designer) — PASS on new, no new Minor (1 new Nit)

Specs: art-ux/rc2-notes-b2-b3.md §B-3 + "B-3 mock v2" (lines 20-55, :53 Buy full width), art-ux/rc2-order-sell-preview.md §9 + §9.1 (lines 86-98), product/collection/first-minute-proposal v0.3 ('$2 to go · Upgrades ›'), 07:22 review (toast over Welcome-back). Contact sheets: art-ux/scratch/sc0947/.

## 1. B-3 compact Farm card @ 3ee5d39, Chromium + WebKit, 360/375/390/1280 docked (/workspace/wt-ui-shots/b3/*-chromium.png 8, b3/webkit/*.png 8) — PASS
Branch fix/rc2-b3-farmcard-compact: e9c0987 → 9690b9d → ec0f1b3 (Buy full width docked, rc2-notes:53) → 3ee5d39 (Every li + level tag helpers, SR 'Level 6 of 30' via .sr). Contains #3 ruling (a) 23a3798. HUD + QA badge both read m3-rc1-pre+3ee5d39.
Measured from pixels (x=150 column scan), identical in both engines:
| Shot | Card outer | Spec | Buy | Result |
|---|---|---|---|---|
| affordable 360 / 375 | 330→587 = 258px | ≤260 | 488→535 = 48px | PASS |
| eta 360 / 375 | 330→609 = 280px | 282±2 | 510→557 = 48px | PASS |
| affordable 390 | 341→598 = 258px | ≤260 | 499→546 = 48px | PASS |
| eta 390 | 341→620 = 280px | 282±2 | 521→568 = 48px | PASS |
- Content order, wrap and copy match mock v2 and the 09:23 Firefox look (title `Farm` + `L6/30`, `Coop upgrade at L10`, wrapping fx with 👤 Every, one chip row `+19% income` + `~3 min 26 s`, `Affordable in ~0:38` above Buy, `Limited by collecting ›` clear below Buy). No ellipsis or clipping at 360/375.
- 1280 docked: Buy is now full card width (ec0f1b3), which answers the 09:23 question to Head per rc2-notes:53. Affordable state green Buy with white label, disabled state dark text on #CFC6BA; tokens unchanged.
- Capture note (not a fail): docked shots are scrolled so the card is in view, so the Collection/Farm/Workers tab row is partly (WebKit) or fully (Chromium) scrolled under the Upgrades header. That's normal scroller behaviour.
- Left for sign-off: the B-3 commit on top of #3 final (ETA 10:30 per engineering/status.md 08:56). Firefox at 3ee5d39 would be nice to have but 9690b9d Firefox already matched.

## 2. rc2-minors-2 (PR #35 branch fix/rc2-minors-2) @ fcdda2c, Chromium (/workspace/wt-ui-shots/rc2-minors-2/, 39 PNG) — PASS
rc0 log /workspace/wt-logs/full/m2-fcdda2c-sec.log: 89/89 PASS; globals 2 PASS.
- **§9 Wants N** (order-wants-*): 360 reads `Wants 13 · $15.34`, `Wants 13 · $13.00`, `Wants 181B · $1.78T`, `Wants 181B · $181B`, one line, no ellipsis; 390 and 1280 docked read `Wants 13 eggs · $13.00` (the " eggs" drop is ≤375 only). PASS. `Wants 3.98M · $9.94M` doesn't fit the 164px .l1 box at 360, so it shows `$9.94M` alone (fcdda2c, review 6a744d6 #1/#2), value uncut, no `0/N`. At 320 every Wants fixture shows the value alone. Both follow the §9.1 chain (the value is never cut, drop the count last). PASS.
- **§9.1 fallback / Nit N2 closed on this branch**: `1.23M/9.99M · $20.8M` shows `1.23M · $20.8M` at 320 and 360, no clip. PASS.
- **07:22 Minor #2 (toast over Welcome-back) fixed on this branch**: toast-layer-welcome-open-{320x568,360x420}-{before,during,same} show no toast over the open modal; toast-layer-after-close-* show the held 'Coop upgraded!' after the modal closes; welcome-over-toast-{320,360,390,1280-docked} show the modal with no toast on top. The rc0 M-Toast-layer frame checks pass at all widths. Note: this branch's Welcome-back is the old card, not PR #16 v2, so close the 07:22 item for good once #16 and #35 meet (the #16 360x420 cap-line Minor is separate and still open).
- **Tutorial goal bubble** (tutorial-goal-bubble/-link-tapped/-step3, 360/390/1280 docked): `$2 to go · Upgrades ›` with NBSPs (onboarding.ts:31), matches first-minute v0.2/v0.3 copy. The link is 44px min-height (styles.css:601, `.onb .tut-link`), #2B79A8 on white ≈4.8:1. Skip is min-height 44px (styles.css:173). Link-tapped opens Upgrades on Collection with the first card in view. Step 3 'Buy your first upgrade: more eggs per tap.' points at Upgrades in the nav on phone and at Buy when docked. PASS.
- **New Nit N3** (stress height only): at 360x420 (toast-layer-after-close-360x420-*), hen sprites draw on top of the next-goal strip, so `Collection L1 · +34% income` is mostly hidden behind hens. 420px tall is below the designed scene minimum (m3-next-goal-spec.md:46), and 360/375/390 at 640+ tall are fine. Fix suggestion: put the meter/goal strip/Collect stack above the hen layer (z-index), or clip hens to the scene box. Owner: UI & rc1 Fixes. Low priority.
- Not posted: Firefox/WebKit rc2minors2 shots go to /tmp/m2x per minors2-fcdda2c.sh, so Fx/WK are not evidence yet. No 375 Wants shot (the ≤375 rule boundary); would be nice to have.

## 3. QA recheck PR #3 Cut A @ 8a49d35, Firefox (qa/m3-recheck/cutA-8a49d35/firefox-*.png, 32) — parity PASS
Pixel diff vs the Chromium set: only font rasterisation and hen animation differences. summary.txt: Firefox rc0 307/307 (axe, farmLimit, orderFit11, goal v1.6.1). Layout probe fails 40/64 are QA-labelled probe artefacts (chip/.l1 overflow-visible, Firefox g-track subpixel scrollWidth); visually unclipped. Carry-overs reproduce as expected at 8a49d35: Nit N1 chip `181.2B` wider than the slot; the `0/5 · $10.40` zero line predates §9 (fixed on #35). firefox-goal-360-crop: `Affordable in ~0:41` OK.

## 4. Not evidence
/tmp/m8/*.png (47 + rc2-minors 8), /tmp/scratch25/shots (4): unposted tmp renders. /tmp/mw-fe33/docs/readme/*.png (4): README copies.

## Still open
PR #3 Firefox banner-scroll fix (08:18 Minor); B-3 on #3 final; PR #16 fix re-shoot (07:22 cap-line Minor; toast part fixed on #35, re-check when combined); PR #25 Fx/WK m1 at 2340d61/72078b5; HUD 1T; rc2-minors Fx/WK; rc2-minors-2 Fx/WK + 375; Nit N1 (#3 chip); Nit N3 (hens over goal strip at 360x420); 'Sold out!' frame; B-1 (PM Workers); v1.6.1 full label set; Refill nav fix.
