# Player M4-A findings triage: d75d41f vs main acdbedc (Latest) (+ Cut A 8a49d35 for P3)

**Verdict: P3 is Major on M4-A d75d41f and Latest acdbedc (fixed by Cut A 8a49d35 once forward-merged). P1 and P2 are Minor (dismissable, time-limited tips; the required tap is never blocked). P4 is by design.**
Numbering follows HoQ. Player's numbering is swapped: Player "P1" = HoQ **P2** (New helper!), Player "P2a/P2b" = HoQ **P1** (hire/tired tips).

Chromium only, lane 2 (`flock .browser-test-2.lock`). Own /tmp worktrees, ports 4491–4499, build-id checked at runtime: m3-rc1-pre+d75d41f / +acdbedc / +8a49d35 (QA builds report the `m3-rc1-pre+` prefix, not `m4a-`).
**src/ is byte-identical between d75d41f and acdbedc** (`git diff --quiet d75d41f acdbedc -- src`), and the runtime numbers match, so every finding applies to Latest acdbedc unchanged. These tips (`renderWorkersIntro`, `coach()`) and the coop hint (M1, 73828bf) predate this delta, so none of them is new in the d75d41f merge. 7d52952 was not run separately; it already carries the same coop-hint code.
Evidence: player-m4a-triage/ (P*.png, P*.log, probes p12.mjs / p3.mjs / p3full.mjs / P4-probe.mjs; Player's shots in shots/).
Measurement method: G-strict rect intersection of the tip box against each target's box, plus `elementFromPoint` at the target's centre (true = the tip is on top there).

## P1 (Player P2a/P2b): hire tip and "Workers get tired" tip cover the Market Hand row and tabs. Reproduces. **Minor**
Repro: Farm L3, $40, workersIntroA/B unset. The "New helper!" banner appears. Tap **See workers**, then tap Hire.
| Tip | Viewport | Covers (intersection / % of target / centre covered) |
|---|---|---|
| "Hire them for $40.00…" (8 s) | 360×800 | name 280×20 / 91% / yes; desc 280×8 / 45%; tabs 8 px strip / 18–22%; **Hire button 0%** |
| | 375×700 (acdbedc) | name 87% / yes; desc 43%; tabs 8 px / 18%; Hire 0% |
| | 390×844 | name 83% / yes; desc 41%; tabs 8 px / 16–22%; Hire 0% |
| | 1280×720 | docked panel: covers the "Market Hand" name and the bottom edge of the Workers tab, Hire visible (screenshot P1-d75d41f-1280x720-hiretip.png) |
| "Workers get tired over time." (3 s) | 360 / 390 / 375×700 | name 90% / 82% / 51% (centre covered); energy bar 90% / 82% / 0%; desc 34–64%; Manage 0%. At 1280 it falls back to screen centre over the scene (row anchor not found). Cosmetic only. |
| "Tap Manage…" (6 s) | 360 / 390 / 375×700 | name ~85–91%, energy bar 83–91%; **Manage 0%** |
The real Hire tap at the button's centre **hired on the first tap** at every size. Every tip closes on tap and auto-closes after 8/3/6 s. No page errors.
Severity **Minor** (brief cover, dismissable; no required tap blocked). Suggested follow-up: anchor the coach above the row title rather than the button, or place it below the row.

## P2 (Player P1): "New helper!" covers the top customer row and its Full pill. Reproduces. **Minor**
At 360×800, 375×700 and 390×844 the banner [12,64,~W-12,188] covers the queue strip 98% and the first customer chip 93% (centre covered). That includes the queue "Full" pill, as in Player's shot. At 1280×720 it covers 54% of the strip, but not chip 1. The banner has a 44 px **Dismiss (X)** and "See workers", and it hides while a panel is open. Customers can still be served from the Market, so no required action is blocked.
Severity **Minor** (dismissable). Follow-up: place it below the queue strip, like the F1 toasts.

## P3: Collection card "Need $X more" overlaps "Limited by coop · Upgrade Farm →" at 375. REPRODUCES. **Major** (HoQ may downgrade, see note)
Repro (d75d41f, Chromium 375×700): Farm L3, Collection L19, $20 (coop hint active), then Upgrades > Collection. Screenshot **P3-d75d41f-375x700-F3C19-full.png**: "Need $75.5K more" is drawn through "Limited by coop ·", and the "Upgrade Farm →" link wraps onto it. Both texts are illegible.
G-strict measurements (after scrollIntoView/settle): the coop hint [101,469,274,501] intersects the Need hint [102,479,341,495] by 171.8×16 px. The "Upgrade Farm →" link intersects it by 75.5×16. Glyph-level overlaps reach 58.3×6.3 and 7.8×16. The coop hint also cuts 1.7 px into the price button. elementFromPoint at the coop hint's centre = the coop hint (drawn over Need).
- Player's exact state (F3/C4, short) does **not** trigger the coop hint in a seeded save (rule: eggsPerTap(C+1) > 50% of coop cap; 30 vs 200). Player's save had a different coop cap/Hens level. Any coop-limited, unaffordable Collection card shows the defect.
- The first, pre-settle probe pass at 360/375/390×800 (p3.mjs logs) measured the hints as separate, with the coop hint below the card box. That's a timing artefact of measuring before the sheet settled; the settled full-screen pass above is authoritative.
- **Latest acdbedc:** the same src (identical), so it's present there too. **Not new in M4-A:** the coop hint dates from M1 (73828bf).
- **Cut A 8a49d35:** not affected. That branch replaced the Collection hints with an in-card "Affordable in ~…" ETA and has no "Limited by coop" link: 0 overlaps and 0 parts outside the card at 360/375/390. But 8a49d35 is **not an ancestor of acdbedc**, so Latest/M4-A still carry the bug until Cut A is forward-merged (the forward-merge rc0 should re-probe this card).
- Severity note: overlapping text that makes the shortfall and the Upgrade Farm link illegible is the same G-strict class as the Farm-card overlap Cut A fixed, hence Major. The price is still readable on the button and no tap is blocked, so HoQ could reasonably call it Minor if Cut A is guaranteed to land in this release.

## P4: Sell all 30 vs 24 visible. BY DESIGN, not a bug (sent earlier, see player-m4a-triage/P4.md)
At 360×640 the sheet shows 4 cards (24 eggs) plus "+1 waiting". The button reads "Sell all (30 eggs · $62.40)" and the tap pays exactly $62.40 to 5 real customers. Sell all and its label walk the whole queue; label = payout per #28. Same on d75d41f and acdbedc. Follow-up Minor copy note: "Sell all to N customers" or auto-expand the list.

## Follow-up list (Minors)
P1 coach placement over the MH name/energy bar/tabs; P2 banner over the queue strip; P4 Sell all label/visible-count copy.

## Not run
Firefox/WebKit (Chromium-only by rule). Release HTML build (QA build used; same src). 7d52952 runtime. Player's exact P3 save (coop cap unknown).
