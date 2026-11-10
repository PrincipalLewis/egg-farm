# F6 (#86) cut to 5.1: impact on v5 rows 16, 17, 22 — UI eng (e80556fd), 2026-10-30 08:55 CET
For HoE / HoP (D-HOP-2026-10-30-03). Sources: engineering/v5-rc-manifest.md rows 9/16/17/22; engineering/m5.0-sizing.md §2 row F6 (L27), §4
hotspot 1 (L86), critical path (L12: "#1 golden egg UI (needs F6)"); engineering/tasks/v5-f1-f3-api-sheet.md L79; engineering/decisions.md L262
(HoE 22:51 done-definition); specs in artifacts/v5-ui/specs/ (golden 910098bd, streak acb4cdbb) and product/collection/m5-broody-hen-spec.md.
F6 code: wt-v5-f6 @ 2b4abf9 (src/ui/overlay.ts, qa-seam.ts, audio.ts, features.ts; app.ts +33/-30).

## Bottom line
- No row is IMPOSSIBLE without overlay.ts. F6 is a pure refactor (no behaviour change), so everything it provides can be written elsewhere.
- But rows 16, 17 and 22 cannot ship without most of what F6 *contains*. If F6 is cut, that content has to land inside the row PRs
  (mostly in app.ts, the hotspot F6 was meant to remove). Estimated extra: ~1.5-2 dd across 16/17/22, i.e. about F6's own size (sized
  1.5-2 dd, sizing L27). Cutting F6 saves no work if those rows stay in v5; it moves it, and the code gets reviewed twice (once as #86, again inside the rows).
- Two pieces are hard prerequisites for ALL three rows, whatever happens to F6:
  1. attended probe with !dialogOpen. game.ts:394 defaults the probe to () => false (no focus time, M5 timers frozen; API sheet L79). #85
     (F6a) wires visible && focused only; F6 adds !dialogOpen (overlay.ts:93-99, app.ts:185). Without it, menus don't freeze M5 timers:
     GE-AC19, ST-AC13, BH-AC9 fail. Fix without F6: ~6 lines in app.ts (or in #85): low risk, ~0.1 dd.
  2. the window.eggfarmQa seam. 22:51 ruling: "A row missing these isn't merged". F6 has the base (qa-seam.ts; app.ts:740-741: audio.log, fx.setMax,
     menu.open/close, sheet.stepClose; check-release rejects eggfarmQa). menu/sheet hooks need mountApp closures (showSettings, closeModal,
     openPanel), so without F6 they're app.ts edits anyway. ~0.25 dd.
- Recommendation (my view, HoE decides): asking for the one-fix-commit exception is cheaper and lower risk than rebuilding F6 inside the rows.
  The fix commit for both failures is made locally (see report). If the exception is refused, ship 1+2 with #85 (small app.ts edits) and
  carry each remaining part with the first row that needs it, as below.

## Row 16: #1 golden-egg UI (flag golden)
| Needs | F6 piece | ACs / hooks | Without F6 |
|---|---|---|---|
| 8 spots per layout from Art v1.1 §2, live-rect zones (HUD, toast, queue, coop, nest, Full!, hens pill 0 px, meter, goal, Collect, nav, sheet, modal, docked column) | spotCentres/validSpots/domZones, overlay.ts:20-90 | R11, GE-AC15 (8+4 viewports x 3 engines, live rects), GE-AC16 (no valid spot -> defer), GE-AC28 (resize re-layout), eggfarmQa overlay.spots | Possible: move the same ~70 lines + its tests (tests/v5-f6-overlay.test.ts F6-AC1..10, scripts/v5-f6-browser.mjs) into ui/golden-egg.ts. ~0.5 dd + re-review. Same code, new name. |
| Zones from other features: streak meter +16, Broody tap box | registerZone, overlay.ts:176 | GE-AC15 zone list, BH-AC13 "golden never within 16 px of the tap box" | Possible, but golden-egg.ts would import streak/broody rects directly (cross-feature coupling) or app.ts plumbs them. Medium risk. |
| Audio hooks: golden.spawn/warning/collect (new files), Frenzy sell semi +2, QA log | AudioHooks + Audio.playFile(semi)/load/qaLog, audio.ts, overlay.ts:107-120 | GE-AC24, §9.2 (assert by hook + semi), eggfarmQa.audio.log | Possible: take F6's audio.ts diff as-is (~15 lines, no app.ts). Low risk, ~0.1 dd. |
| FX budget <=30 shared with the egg/popup FX | FxBudget, overlay.ts:131; app.ts:122 | layout-spec §6 cap, eggfarmQa.fx.setMax | Possible, but the budget is a closure array in mountApp: golden-egg.ts needs a handle passed in (app.ts edit). A second, private budget would break the global <=30 cap. Low-medium. |
| Menu freeze | dialogOpen (prereq 1) | GE-AC19, GE-AC20 (docked Market panel keeps focus clock) | prereq 1 |
| Reduced motion | reducedMotion, overlay.ts:123 | GE-AC22 | Not an F6 dependency: rm() already exists in app.ts on rc/v5; needs to be passed to the module. |
| Mount + per-frame render | registerFeature/mountOverlay, overlay.ts:158-181; features.ts | (structure, sizing §4 hotspot 1) | Possible: app.ts markup + render() edits, ~0.1 dd, but it's the conflict hotspot (render() region). |
| data-testids (22:51 (a)): frenzy pill/chip, reward pop, coin pop | none (hens-pill testid is in F6 app.ts:81) | 22:51 (a) | Independent of F6 except data-testid="hens-pill" (1 attribute). |
Row 16 total without F6: ~0.75-1 dd extra, medium risk (biggest consumer of F6; sizing L12 puts "#1 golden egg UI (needs F6)" on the critical path).

## Row 17: #2 streak UI + A2 + #3 +$ pop (flags streak / tapCoins)
| Needs | F6 piece | ACs / hooks | Without F6 |
|---|---|---|---|
| 4 tier pitch steps + cap chime (new file), muted none, QA log | AudioHooks semi + playFile/load/qaLog | ST-AC9, ST-AC27, audio.log | Same audio.ts diff as row 16 (whichever lands first). Low. |
| Menu freeze of decay/hold | prereq 1 | ST-AC13, ST-AC25 (frozen while menu/hidden) | prereq 1 |
| Coin pop (+$) through the FX layer | FX budget (app.ts spawn/fx) | ST-AC16/16e/17 (no pop at I_ref 0; pop spec) | Possible in app.ts; the pop lives next to Collect, already in app.ts's FX code. Low. |
| Streak meter as a spawn zone (+16) for golden; streak box clearance for Broody | registerZone | GE-AC15, BH-AC13 | Only matters if 16/22 ship; coupling as above. |
| streak.set hook, streak bar/pill testids | qa-seam base | 22:51 (a)/(b) | Needs the seam (prereq 2). |
| Reduced motion | existing rm() | ST-AC24 | No F6 dependency. |
| Meter band layout vs nav | none | ST-AC26b | No F6 dependency (CSS). |
Row 17 total without F6: ~0.25-0.5 dd extra (audio + seam if not already done + app.ts mount). Least dependent row.

## Row 22: #5 Broody UI (flag broody)
| Needs | F6 piece | ACs / hooks | Without F6 |
|---|---|---|---|
| Tap box clearances vs live rects (16 px from R4 targets + toast, 8 px from meter/streak box/Full!/pill, 8 px inside viewport), 3 engines, 12 viewports | gap()/domZones() (overlay.ts:51-90) reusable; Broody's 16/8/8 rule and Y-slot table are its own | BH-AC13, BH-AC13b, BH-AC14 | Possible: Broody uses yard slots Y0-Y11, not S1-S8, so it needs its own eligible-slot code with or without F6. Without F6 it also re-writes the live-rect zone reader (~25 lines). ~0.25 dd. |
| Golden must avoid the tap box | registerZone | BH-AC13 last bullet, GE-AC15 | Cross-feature coupling as in row 16. |
| Menu freeze: nest 0 growth, frozen + inert | prereq 1 | BH-AC9 | prereq 1 |
| broody.set/eligible, sheet.stepClose, fx.setMax hooks | qa-seam | 22:51 (b) | prereq 2 |
| Reduced motion, Enter collects, live region | existing rm() | BH-AC17 | No F6 dependency. |
| Release test | none (#69 + m1) | BH-AC20 (manifest row 22 note) | No F6 dependency. |
Row 22 total without F6: ~0.25-0.5 dd extra.

## app.ts conflicts
- #83 (4eb220f) merges cleanly with F6 (origin feat/v5-ui-f6-overlay) and with #85 today (git merge-tree, 09:00 CET). #83's app.ts hunks are the nav markup
  and the badge/name block in render(); F6's are imports, rm/audio/FX setup, attended wiring and the mount at the end of mountApp.
- Without F6, rows 16/17/22 each edit mountApp markup + render() (the region F6's one-line registration avoids, sizing L86). All three
  are on my seat and sequential, so conflicts are manageable but real; anything else touching render() (#5b row 23, #4b abilities UI row 18) collides too.

## Caveats
- dialogOpen as written in F6 covers DIALOG_SEL modals, the tracks explainer and the Upgrades sheet; GE-AC19's menu list also names
  onboarding steps and coach marks: worth a check whichever way this goes (not a reason to keep or cut F6).
- Estimates are mine, unreviewed; they assume the F6 code is reused (moved), not rewritten.
