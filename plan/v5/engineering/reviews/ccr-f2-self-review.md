# Self-review: v5 CCR F-2 (playerSaleCtx in sale previews + setAttendedProbe wiring)

## UPDATE 2026-10-30 13:10 CET: reworked on F6 (D-HOE-20261030-15) as fix/v5-ccr-f2-f6 @ 62ff9e9 (from #86 head 916f098)
- The standalone version below (fix/v5-ccr-f2 @ b0802e6, own src/ui/attended-probe.ts) is superseded and stays local.
- On F6 there is ONE probe: overlay.wireAttended (same dialog definition as below: DIALOG_SEL | explainer | Upgrades sheet; Market sheet attended).
  F6a's src/ui/attended.ts is deleted (folded into overlay); CCR-F2-4 asserts setAttendedProbe has exactly one caller (ui/overlay.ts) and
  app.ts calls wireAttended once. Points 1-5, 7-8 below still hold; point 6 (#85 overlap) is resolved by the fold.
- Found while porting: tests/qa-rc1-bugs.test.ts (BUG-1/2) and tests/sellall-label-grader.test.ts (QA4-2) assert app.ts source text
  `sellAllPreview(s, b)`; they now expect `sellAllPreview(s, b, saleCtx)` / `saleValueCents(s, k, b, saleCtx)`. b0802e6 never reached its
  full-vitest gate and would have failed these two checks.
- Added ST-AC13 / GE-AC19 / BH-AC9 probe tests (focus seconds at the stepTimers seam: > 0 with the Market sheet, 0 with modal / Upgrades /
  explainer / blurred / hidden).
Senior Engineer, UI & rc1 Fixes, 2026-10-30 (CET). Branch fix/v5-ccr-f2 on rc/v5 a923206. Source: engineering/reviews/rcv5-vs-main-1a61b36-ccr.md F-2;
triage D-HOE-20261030-08 ("latent while streak is off; must land before the streak flag flips; owner UI, after #83, not in #83").

## CCR F-2 text vs this change
| CCR fix item | Done where |
|---|---|
| "pass `game.playerSaleCtx()` into both previews" | src/ui/app.ts market block: one `saleCtx = g.playerSaleCtx()` per render feeds `saleValueCents(s,k,b,saleCtx)` (order-card Sell buttons) and `sellAllPreview(s,b,saleCtx)` (Sell all label). |
| "call `setAttendedProbe`" | src/ui/attended-probe.ts `wireAttended(g, () => open)`, one line in mountApp right after openPanel. Probe = visible && focused && !dialogOpen(). |
| "add a preview==credit test through Game" | tests/v5-ccr-f2-attended-previews.test.ts CCR-F2-1: real mountApp + Game.dispatch via the DOM buttons, attended / blurred / hidden, preview == credit to the cent. |

## Decisions and things a reviewer should check
1. **game.ts is unchanged.** The CCR location lists game.ts:394-402, but that is where the probe is *defined* (default `() => false`). Game is DOM-free; the API
   sheet (engineering/tasks/v5-f1-f3-api-sheet.md L79) says "UI must wire this". So the call lives in mountApp, and the test spies Game.prototype.setAttendedProbe.
2. **dialogOpen definition = F6's reviewed one** (wt-v5-f6 overlay.ts makeDialogOpen): DIALOG_SEL (modal layer, recovery, rotate prompt, alertdialog except
   the onboarding caption), the tracks explainer, the Upgrades sheet. Market sheet = play surface (Q-F1c-1, D-HOP-2026-10-29-06). Same ~6 lines the F6-cut
   doc (f6-cut-impact-rows-16-17-22.md, prereq 1) estimated, put in a tiny module so they can be unit-tested.
3. **Open question (same caveat as the F6-cut doc):** the API sheet L79 says the probe is false for "onboarding/coach" too. DIALOG_SEL excludes `.onb-cap`,
   so FTUE coach-mark steps count as attended here, as they did in F6. Not changed in this PR (scope); HoP/HoE to rule before GE-AC19 / ST-AC13 are verified.
4. **Docked layout:** openPanel keeps `open = null` when docked, so the always-visible docked Upgrades column does not count as a dialog. Matches F6.
5. **Flags off:** Game.attendedNow() short-circuits on anyM5FlagOn (CCR N-1 #79), so the probe is never read (test CCR-F2-2 asserts no hasFocus call) and,
   with no live sale effect, `playerSaleCtx(false)` previews equal the old PLAYER_SALE previews. Goldens AC7 (f90d1678…) and m4-on (a54c9cf9…) unchanged.
6. **Overlap with #85 (F6a, feat/v5-ui-attended @ 2325e2a, open, base feat/v5-f3-config):** #85 adds src/ui/attended.ts and `wireAttendedProbe(g)`
   (visible && focused only) at the top of mountApp. No textual conflict expected (different file name, different hunk), but if both land, #85's
   weaker probe is installed first and this PR's stricter one overrides it later in mountApp. Recommendation: when #85 picks up rc/v5 (merge, not rebase),
   drop its wiring line and keep its tests pointed at this probe, or close the wiring part of #85 as superseded. HoE to decide.
7. **Cost with flags on:** one probe read per render while the Market panel is visible (1 querySelector for DIALOG_SEL + 1 for `.tracks-exp`), plus the
   existing per-frame/per-dispatch reads in Game. Negligible.
8. No visible change with flags off, so no new browser script; rc0 x3 covers regressions. No save, sim, econ or config path changed (12-diff-stat).

## Not in this PR
F6 overlay/QA seam (cut to 5.1), coach-mark question (3), #85 cleanup (6), any flag flip.

## Update 14:05 CET: coach marks (D-HOE-20261030-25), head 0d15543
- Coach-mark steps now register as sheets: `mountOnboarding` holds `registerSheet('coach-mark')`, opened while `flow.mode === 'mark'`, closeComplete on hint/none, on pause under a dialog, and on finish. The wait hint (no mark) stays attended, by reading "coach-mark steps" narrowly. If HoP wants hint mode not-attended too, it is one condition (`mode !== 'none'`).
- The registry moved to `src/ui/sheets.ts` (no imports), and overlay re-exports it. This avoids an overlay↔onboarding cycle (overlay imports DIALOG_SEL from onboarding). `DIALOG_SEL` is unchanged.
- Risk: during FTUE coach steps with M5 flags on, sales are unattended (no Frenzy/streak uplift). The preview still equals the credit (CCR-F2-1), so there is no lie on screen. With flags off nothing changes (the probe is never read).
- Tests: CCR-F2-5 ×2 (registry/probe lifecycle; focus time 0 while marked). Targeted run 99/99 incl. onboarding.test.ts + ftue-v11.test.ts.
