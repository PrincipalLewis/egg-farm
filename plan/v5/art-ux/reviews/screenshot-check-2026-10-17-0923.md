# Screenshot check 2026-10-17 09:23 (UI/Visual Designer) — PASS on new, no new Minor

Specs: art-ux/rc2-notes-b2-b3.md §B-3 + "B-3 mock v2" (lines 20-55), art-ux/rc1-upgrade-value.md v1.6.1 §4 (line 52+), order spec §9 (Wants fit).

## 1. B-3 compact Farm card — early look, Firefox @ 9690b9d (/workspace/wt-ui-shots/b3/, 6 PNG) — PASS
Commit e9c0987 "B-3 compact Farm card (rc2 mock v2)" + 9690b9d (fixture restore) in /workspace/wt-b3. HUD + QA badge both read m3-rc1-pre+9690b9d.
Measured from pixels (x=150 column scan):
| Shot | Card outer | Spec | Buy | Result |
|---|---|---|---|---|
| affordable 360 | 330→587 = 258px | ≤260 | 488→535 = 48px (2+44+2) | PASS |
| eta 360 | 330→609 = 280px | 282±2 | 510→557 = 48px | PASS |
| affordable 390 | 341→598 = 258px | ≤260 | 499→546 = 48px | PASS |
| eta 390 | 341→620 = 280px | 282±2 | 521→568 = 48px | PASS |
- Order matches mock v2 (rc2-notes:42): title `Farm` + `L6/30` right, muted 12px; `Coop upgrade at L10` tier line with icon; wrapping fx row `Hens 35 → 40 | 👤 Every 3.68 → 3.49s / Coop 350 → 400 | Price $2.08 → $2.16 / Demand 21–42 → 23–45`, no ellipsis or clipping; one chip row `+19% income` + `~3 min 26 s` with clock; ETA `Affordable in ~0:38` above Buy; Buy full width 48px; `Limited by collecting ›` below Buy, clear of it (no overlap, B-3 overlap bug stays fixed).
- Contrast: green chip #336D2B on #E8F4E4, ETA #6B5D52 on white, disabled Buy dark text on #CFC6BA all read ≥4.5:1 by eye/token; unchanged tokens.
- 1280 docked (affordable + eta): card ≈255px, one chip row, fx flex row as on phone. **Question for Head (not a fail):** the docked Buy is a right-aligned compact pill (~175px) rather than full width. rc2-notes:53 says "stays 48px, full width" and :33 says docked "keeps the current one-line chip row (§5)"; no docked mock was made. Head to confirm compact docked Buy is OK, or ask for full width.
- Not yet evidence: /tmp/b3s/*-chromium.png (6) show HUD `build cd9b313` + QA badge `build undefined` (pre-commit dev render, not posted). Needed for sign-off: Chromium + WebKit at the posted SHA, 375 width, and the B-3 commit landed on top of #3 final (ETA 10:30 per engineering/status.md 08:56).

## 2. QA recheck PR #3 Cut A @ 8a49d35, Chromium (qa/m3-recheck/cutA-8a49d35/, 32 + fc-shots 26 + rc0-shots 47) — parity PASS
Same SHA as /workspace/wt-ui-shots/cuta4 (reviewed 08:18). Chromium matches; no new issue. Gates per summary.txt: rc0 307/307 incl. axe; layout probe 48/64.
- v1.6.1 goal label (partial evidence, Chromium only): layout-chromium.log "Goal label v1.6.1 farm at 360": 1 line `Farm L30`, gain unsplit, no ellipsis, lh 17, strip/pill 40px, hit 44 — PASS. fc-shots/cuta3-goal-stress-wrap-360: `★ Hire Market Hand` / `· +99999% income`, wraps before the gain, no ellipsis — PASS. Note: QA measured the live label box at **218px** at 360 (spec §4 assumes 188px); a wider box only means fewer wraps, rule still holds. Full v1.6.1 sign-off still needs every listed wrap label (Collection L30, Egg value L30, Market Hand, Grader 1–5) shot at 360 on the final build.
- Probe FAILs (16) are the same two items in every viewport; both visible in chromium-market-360x800.png:
  - **Nit N1** customer-slot `chip arrive` text `181.2B` / `8.76M` is 57/56px in a 50px chip (overflow visible, so readable, but the ink touches the pill edge). Fix suggestion: chip min-width:auto + padding-inline 6px, or 12px font at ≥6 chars. Owner UI & rc1 Fixes; carry with the #3 nits.
  - **Nit N2** order line `.l1` `1.23M/9.99M · $20.8M` is 167px in a 164px box at 360 (3px clipped; the "M" edge). This is the stress fixture; order spec §9 fallback (drop " · $" value or 3-sig) should kick in. Owner UI & rc1 Fixes; re-check on PR #35.
- B-3 carry-over: chromium-farmcard-360x800.png still shows the old 5-line card at 8a49d35 (expected; B-3 is on 9690b9d, §1).

## 3. Other new files
- qa/m3-recheck/toast-pr5-37524aa/cmp-toast-midfade-100ms-{1280x800-banner,390x640-nobanner}.png (2): QA side-by-side composites of already-passed frames; no new evidence.
- Not posted / outside scope, not reviewed: /tmp/m2full/rc2-minors-2/*.png (35, HUD build 35a37a6; /workspace/wt-ui-shots/rc2-minors-2/ still empty), /tmp/frz-shots/*.png (13, M4-A frz re-renders; covered by the 09:30 M4-A final-head diff).

## Still open
PR #3 Firefox banner-scroll fix (08:18 Minor); B-3 posted SHA (Chromium/WebKit/375, on top of #3 final) + Head ruling on docked Buy width; PR #16 fix re-shoot (07:22 Minors); PR #25 Fx/WK m1 at 2340d61; HUD 1T; rc2-minors Fx/WK; rc2-minors-2 / PR #35 shots; 'Sold out!' frame; B-1 (PM Workers); v1.6.1 full label set; Refill nav fix.
