# FC-AC9: golden-egg spots at 360×640, fatigueCue 0 vs 1 (Art & UX worker, 2026-10-30 12:55 CET)
For D-HOP-2026-10-30-20 addendum (FC-AC9) and PM Market's ask. Bar: same valid-spot count and reachability with the flag on as with it off, in the same state. Baseline: `art-ux/m4-timed-collectible.md` v1.1 (sha1 28dcff19) §2.2: 8 / 7 / 4. Paper and prototype only. No signed doc was edited.

## Method
- Build: `origin/rc/v5` **e77fc5c**, `vite build --mode qa --outDir dist-qa` in the clean worktree `/tmp/art-m42-rcv5-e77fc5c` (QA build only for the `eggfarm` state hook: 12 yard hens, coop 3, as in the v1.1 measure). Served via Playwright `page.route`, no server.
- Runs: `ops/tools/lane-run.sh art -- node art-ux/scratch/fcac9/measure.mjs …` (rule 21, lane `art`). Chromium 156.0.8078.47, Firefox 157.0, WebKit 27.2. 360×640, DPR 1, reduced motion. No `.browser-test*.lock` taken.
- Flag-on mock: the same 28 px sub-line used for the 390 rect (`m4.2-fatigue-390-rect.md`). `.fslot` is the first `.farm` grid row (`grid-template-rows: 28px auto 1fr auto`), and the pill (`Tired −$999.9K/s`) is start-aligned to `#rate` x 58. Full! and the `×155 hens` pill are forced visible. The toast is placed the way `app.ts showToast` places it (`queue.bottom + 8`, `.below`), with the longest stock toast.
- Spots and verdicts: `scratch/m5-layout-recheck-5d9efa6/v11.py` rules, unchanged (`spots()`, `golden_ok()`, `broody_ok()`), run on the live rects by `scratch/fcac9/analyse_fcac9.py`. Rule: 56×56 hit box, 16 px clear of every zone, 0 px on the ×N pill.
- Cross-engine: every rect matches within **0.3 px** in all states, and the counts are identical in all 3 engines.

## 1. Live rects (l,t–r,b; Chromium; FF/WK ±0.3)
| Rect | flag off | flag on (sub-line) | fix (a) | fix (b) icon-inline |
|---|---|---|---|---|
| sub-line slot | none | 8,66–352,94 | 8,66–352,94 | none |
| chip pill | none | 58,67–206.3,93 | same | 216.4,14–252.4,40 (hit 216.4,5–260.4,49) |
| `#queue` | 8,66–352,139 | **8,102–352,175** (+36) | same | 8,66–352,139 |
| toast | 47.3,147–312.7,179 | 47.3,183–312.7,215 | 47.3,174–312.7,206 (scene-anchored) | 47.3,147–312.7,179 |
| `#scene` | 8,156.5–352,414.5 (h 258) | **8,183–352,424 (h 241)** | same | 8,156.5–352,414.5 |
| Full! | 257.3,172–297,191 | 257.3,197.5–297,216.5 | 257.3,198.5–297,217.5 | 257.3,172–297,191 |
| ×N pill | 12,389.5–90.9,410.5 | 12,399–90.9,420 | same | 12,389.5–90.9,410.5 |
| `#meter` | 8,432–328,448 | 8,432–328,448 | same | same |
| yard | 8,311.3–352,414.5 | 8,327.6–352,424 | same | same as off |
Flag off on e77fc5c equals the v1.1 §2.2 rects from 5d9efa6 exactly.

## 2. Valid spots (v11 rules), all 3 engines identical
| State | pill hidden | pill shown | worst with Broody (pill shown) | Broody-eligible slots (pill shown) |
|---|---|---|---|---|
| **flag off** (baseline) | **8/8** | **7/8** (S4 ✗ pill) | **4** (Y5) | 0,5,8,9,10,11 |
| **flag on, sub-line** | **5/8** ✗ | **5/8** ✗ | **3** ✗ | 0,5 |
| fix (a) toast + Full! scene-anchored | 5/8 ✗ | 5/8 ✗ | 3 ✗ | 0,5 |
| fix (b) literal (full `Tired −$X/s` pill inline in HUD) | 8/8 | 7/8 | 4 | same as off, **but the HUD breaks (see §4)** |
| fix (b) `⚠ Tired` pill inline | 8/8 | 7/8 | 4 | same as off, **but the HUD breaks (see §4)** |
| **fix (b) icon-only chip inline** | **8/8** | **7/8** | **4** | same as off ✓ |

Flag-on spot detail (pill shown): S1 50,260 OK · S2 50,304 OK · S3 50,347 OK · **S4 50,390 ✗ meter 14, pill −19** · **S5 310,260 ✗ Full! 15.5** · S6 50,304 OK · S7 310,347 OK · **S8 310,390 ✗ meter 14**. Flag off: S1–S8 at y 239/286/332/378, all OK except S4 on the pill. Min clearance of valid spots is 20 px.

**FC-AC9 with the sub-line as specced: FAIL.** 3 spots are lost (S4, S5, S8), not PMC's 1–2. The toast is **not** the blocker: S1/S5 sit 17 px below the toast, because the spots move down with the scene top. The real blockers are:
- `#meter`: S4/S8 are 14 px from it, below the 16 px rule. The scene bottom moves down 9.5 px while the meter stays put.
- Full!: S5 is 15.5 px from it.

The slot also cuts the Broody-eligible slots from 6 to 2 (BH-AC13 owner FYI).

## 3. 36 px vs 17 px: where the 19 px goes (measured, and checked against the CSS)
Both figures were right. `.farm` is 56–576 (520 px), with 10 px top padding (`@media (max-width:390px)`), 8 px bottom padding and an 8 px row gap. That leaves 502 px of content.
- **Off:** the rows are 73 (queue) + 8 + **277** (1fr) + 8 + 136 (collectbar) = 502. `.scene` has `aspect-ratio:4/3; width:min(100%,560px); max-height:100%; align-self:center`. At 344 px wide that makes it 258 tall, which is width-bound. So the 1fr row has **19 px of empty slack**, split **9.5 above and 9.5 below** by `align-self:center`, which gives scene 156.5–414.5.
- **On:** the rows are 28 + 8 + 73 + 8 + **241** + 8 + 136 = 502. The 1fr row loses the full 36 px (28 slot + 8 gap). `max-height:100%` now binds, so the scene is 241 tall (it stays 344 wide and is no longer 4:3).
- So scene height falls by 36 − 19 = **17**. The scene top moves down by 36 − 9.5 = **26.5** (156.5 → 183), and the scene bottom moves down **9.5** (414.5 → 424). It now sits flush with the row and 8 px above the meter, not 17.5. The goal and Collect rects don't change.
- The 19 px isn't lost in margins or flex-shrink. It's the centring slack of the width-bound scene, which the slot uses up before the scene starts to shrink. That's also why the spots fail at the bottom (meter), not at the top.

## 4. Fixes (c not prototyped; it needs HoP + Econ)
- **(a) Toast + Full! anchored to the scene: FAIL, and it has no effect.** Full! is already scene-anchored (`.fullbadge{position:absolute;top:6%}` inside `.scene`). Pinning it to the flag-off 15.5 px makes S5 worse (14 px). Anchoring the toast to `scene.top − 9.5` (174–206) changes nothing, because the toast wasn't blocking any spot. S4/S8 vs the meter isn't touched by (a). The count stays 5/5/3.
- **(b) The sub-line goes inline in the top bar at 360.** It restores the flag-off farm layout exactly (8/7/4, all rects = off). The pill form decides whether the HUD survives (3 engines, identical):
  | Inline form | pill w | `#settings` w | `#rate` | Verdict |
  |---|---|---|---|---|
  | `⚠ Tired −$999.9K/s` (spec string) | 148.2 | **26.5** (<44) | clipped to 19 px (58–77.1) | FAIL HUD |
  | `⚠ Tired` | 77.3 | **42.7** (<44) | clipped (58–113.3) | FAIL HUD by 1.3 px |
  | **icon-only ⚠ (44×44 hit, 36 px pill)** | 36 | 44 ✓ | intact (58–116.2) | **PASS**: coins, rate, basket and settings rects = off. The gap to settings is 43.6 px. |
  The room between the basket (right edge 208.4) and settings (304), with 8 px gaps, is **79.6 px**.

## Recommendation
Use **fix (b), icon-only chip inline in the HUD at 360×640**. It's measured as FC-AC9 PASS (8/7/4, flag on = flag off) in 3 engines, with the HUD intact.
- **Cost:** the visible `Tired −$X/s` words drop at 360. The −$X/s is already visible in `#rate` right beside it, and the accessible name keeps the full sentence (`Tired workers are costing $999.9K per second. Open workers.`), so no WCAG 2.5.3 issue arises because there's no visible text. The fatigue-ux §1/§2 strings are signed FINAL, so this needs an Art (HoAUX) errata plus PMW agreement before it's built.
- **Open:**
  1. The breakpoint. The slot is free at 390×844 (scene unchanged), so apply the inline form where the slot would eat scene slack, at least `phone-360` (vw < 368).
  2. 375×667 isn't measured. Its 1fr slack is projected at about 35 px against the 36 px slot, so the scene bottom would drop about 17 px, putting S4/S8 at risk against the meter. Re-measure before Wave C.

## Files
`art-ux/wireframes/fcac9-360x640-{off,on,fixA,fixB,fixB-tired,fixB-icon}-{chromium,firefox,webkit}.png` and `…-chromium-spots.png` (spot overlays: green OK, red ✗ with the zone and gap). Raw: `art-ux/scratch/fcac9/` (`measure.mjs`, `analyse_fcac9.py`, `annotate.py`, `results.json`, `results-pass1.json`, `analyse.out`, `run.log`). Sums: `art-ux/reviews/fc-ac9/SHA256SUMS`. There's no personal data. This isn't a rule-19 sign-off artifact (it's not under `artifacts/<gate-id>/results/`).

## 5. v1.3 follow-up: icon chip below 740 px, threshold sweep, popover (2026-10-30 13:10 CET)
This follows the Art ruling in `decisions.md` 2026-10-30 12:58 and the HoP/PMW conditions, and is written up as `m4.2-fatigue-visibility-ux.md` v1.3.
- **Runs.** Each was `lane-run.sh art -- timeout 600 node scratch/fcac9/measure{2,3}.mjs …`, with no lock taken and each under 70 s. The build is the e77fc5c `dist-qa`, copied to `scratch/fcac9/dist-qa-e77fc5c/`.
- **Method.** One page per engine, with the viewport resized for each case. This reproduces the per-context 360×640 numbers above exactly. Same v11 rules; "equal" means the same counts, the same failing spot set and the same Broody-eligible slots.

### 5.1 Spot counts (pill hidden / shown / worst with Broody), all 3 engines identical
| Viewport | Rule picks | flag off | flag on (picked variant) | other variant (info) | Equal? |
|---|---|---|---|---|---|
| 360×640 | icon chip | 8/7/4 | **8/7/4** (closed and popover open) | sub-line 5/5/3 | ✓ |
| 375×667 | icon chip | 8/7/4 | **8/7/4** (closed and popover open) | sub-line 8/7/4, same set | ✓ |
| 360×739 | icon chip | 8/7/4 | **8/7/4** | sub-line 8/7/4 | ✓ |
| 360×740 | sub-line | 8/7/4 | **8/7/4** (scene 228.5–486.5) | — | ✓ |
| 360×780 | sub-line | 8/7/4 | **8/7/4** (scene 248.5–506.5) | — | ✓ |
| 390×844 | sub-line | 8/7/4 | **8/7/4** (slot 8,66,374,28; scene 269.3–549.8) | — | ✓ |
Failing spot in every equal case: S4 only, on the ×N pill. Broody-eligible slots are 0,5,8,9,10,11 everywhere except 360×640 with the sub-line, which has only 0,5.

### 5.2 Threshold (Chromium sweep, 640–900 px high; 1 px steps at 360 wide, 2 px at the others; boundaries re-run in 3 engines)
| Width | Lowest height where the sub-line equals flag-off at that height and every height above | First height with equal counts only | 3-engine boundary check |
|---|---|---|---|
| 360 | **663** | 653 | 662: Broody slots 0,5 only ✗ · 663 ✓ |
| 375 | **664** | 654 | — |
| 390 | **664** | 654 | — |
| 412 | **672** | 660 | 670 ✗ · 672 ✓ |
| 430 | **672** | 660 | 670 ✗ · 672 ✓ |
- The sub-line holds 8/7/4 at 740 and above, so the ruled 740 is safe.
- The lowest single threshold that works for every phone width from 360 to 430 is **672 px**, i.e. `(max-height: 671px)`.
- 375×667 passes with the sub-line, so it would get the sub-line under a 672 threshold but the icon chip under 740.
- Not swept: widths 431–959 (portrait tablets).
- v1.3 is written with the ruled `(max-height: 739px)` and cites these numbers.

### 5.3 Top bar at 360 wide, icon chip (3 engines identical; 375 is the same except settings at 319–363)
| Item | Rect | Size |
|---|---|---|
| coins pill (display) | 12,7–130.2,47 | 118.2×40 |
| `#rate` (text inside coins) | 58,29.5–116.2,42.5 | 58.2×13 |
| basket pill (display) | 138.2,7–208.4,47 | 70.2×40 |
| **chip (button)** | 216.4,5–260.4,49 | **44×44** |
| **settings (button)** | 304,5–348,49 | **44×44** |
- No overlaps among coins, basket, chip and settings, and `#rate` isn't clipped.
- Coins, rate, basket and settings equal flag-off exactly, so there's 0 px shift.
- Both tap targets are 44×44 or more. Coins and basket are display pills: they aren't tap targets, are 40 px tall and are unchanged from the signed HUD.
- Name: content-based `.sr` span with no `aria-label`. `getByRole('button', {name: 'Tired workers are costing $999.9K per second. Open workers.'})` finds exactly 1 in each engine.
- `aria-describedby` points to the FC-AC2 copy, and `aria-expanded`/`aria-controls` are present.

### 5.4 Popover (one line + inline Manage; 3 engines identical, same at 360×640, 375×667 and 360×739)
| Rect | Value |
|---|---|
| Popover | 26.1,62–260.4,114 (234.3×52) |
| Manage | 172.4,66–254.4,110 (82×44) |
| Text line | 40.1,80–164.4,96 |
- **It covers no golden spot.** S1/S5 hit boxes start at y 211 (360×640) or 223 (375×667).
- It doesn't cover the toast slot (147–179), Collect, the tab bar, the HUD or the chip. It overlays the queue band only.

### 5.5 Correction (`#rate`)
§4 above and the 12:58 ruling say the −$X/s is "already visible in `#rate`". **That's wrong.**
- On e77fc5c, `#rate` is net income: `headerRate = rateView(incomePerSec(s, b) * 100, …)`, where `incomePerSec` is "Gross eggs sold/s × price − wages. Live moods unless assumeWorking" (`src/econ/income.ts` L72–76, `src/ui/s2-economy-ui.ts` L19).
- It drops when workers tire, but it never shows the fatigue loss X (Σ `workerAtRisk`).
- On short viewports the popover is what carries X for sighted players. v1.3 says so.

### 5.6 Files (added)
- **Screenshots:** `wireframes/fcac9-{360x640,375x667}-{off,sub,icon-tired,icon-asleep,icon-tired-pop}-{chromium,firefox,webkit}.png`, `fcac9-360x640-icon-asleep-pop-*.png` and `fcac9-{390x844,360x740,360x780}-{off,sub}-*.png`.
- **Raw data:** `scratch/fcac9/` (`measure2.mjs`, `measure3.mjs`, `analyse2.py`, `analyse3.py`, `sweep_an.py`, `sweep-*.json`/`.log`, `v13-*.json`/`.log`, `analyse3.out`, `smoke*.json`).
- **Not behaviour-tested:** dismissal, pass-through taps, focus and resize-close are written as v1.3 ACs FC-SV6/7 for the build. There's no built chip yet.
- **v1.3 additions (13:02).**
  - The closing outside tap passes through to every target, with no swallow exceptions (golden-egg collect, buys and Sell all), in FC-SV6.
  - Tap behaviours are in FC-SV10: the sub-line (≥ 740) opens Workers sorted by costliest; the chip (< 740) opens the popover, and its Manage opens the Shift sheet.

## 6. v1.3.1 follow-up: HoQA gaps G30–G34, G38 (2026-10-30 13:30 CET)
- **Runs.** `lane-run.sh art -- timeout 600 node scratch/fcac9/measure4.mjs` (G31/G32) and `measure5.mjs` (G34), 3 engines, each under 30 s.
- **Mock changes.** `measure4` adds the docked layout (the `#panel-layer` column and the HUD + 8 toast, as `app.ts showToast` does). `measure5` inserts the popover as the chip's next sibling with `role=group` and `aria-labelledby`.
- **Raw data:** `scratch/fcac9/g32-*.json`/`.log`, `g34-*.json`/`.log` and `analyse4.out`. `analyse2.py` now skips the unused docked-compact spots; the earlier `analyse3.out` is unchanged (md5 checked).

### 6.1 G31 / G32 (flag on; chip closed and popover open; 3 engines identical)
| Viewport | Layout | Spots off | Spots on: chip | Spots on: popover open | Chip | Settings | Popover / Manage | Overlaps |
|---|---|---|---|---|---|---|---|---|
| 360×739 | phone | 8/7/4 of 8 | 8/7/4 | 8/7/4 | 216.4,5–260.4,49 | 304,5–348,49 | 26.1,62–260.4,114 / 172.4,66–254.4,110 | none (queue band only) |
| 960×600 | docked-compact | 5/4/2 of 6 | 5/4/2 | 5/4/2 | 216.4,5–260.4,49 | 904,5–948,49 | same | none: chip and popover ∩ panel 560,56–960,600 = ∅; popover ∩ toast 347.3,64–612.7,96 = ∅ |
| 959×600 | phone | 6/6/4 of 8 | 6/6/4 | 6/6/4 | 216.4,5–260.4,49 | 903,5–947,49 | same | none |
| 1024×474 | docked-compact | 6/5/3 of 6 | 6/5/3 | 6/5/3 | 216.4,5–260.4,49 | 968,5–1012,49 | same | none: ∩ panel 624,56–1024,474 = ∅; ∩ toast 379.3,64–644.7,96 = ∅ |
- The failing spot sets are equal on and off:
  - 960×600: S3 on the ×N pill, S5 Full! 14 px.
  - 959×600: S4/S8 `#meter` 15 px, S4 also on the pill.
  - 1024×474: S3 on the pill.
  1024×474 off equals the v1.1 §2.3 row (6/5/3).
- Broody-eligible slots are equal on and off.
- Coins, rate, basket and settings equal flag-off, and `#rate` isn't clipped.
- **G32 verdict: PASS, no fix needed.** The chip and popover change nothing at these viewports.
- **Pre-existing, outside FC-AC9:** the flag-off baselines at 960×600 (S5 Full! 14 px) and 959×600 (S4/S8 meter 15 px) are below 16 px. Those viewports aren't in the golden-egg §2.3 matrix. This is an FYI for the golden-egg owner, not caused by the cue.
- **Consequence of height-only:** at docked widths below 740 px high (e.g. 1280×720), the icon chip replaces the ≥ 600 px inline long pill even though the long pill fits. That's accepted by G32.

### 6.2 G34 (mock; 3 engines identical at 360×640, 375×667, 360×739, 960×600, 959×600, 1024×474)
- The popover is the chip's `nextElementSibling` (`#fchip-pop`, inside `.hud`, `position: fixed`, z 9). Tab from the chip goes to Manage, and Shift+Tab goes back to the chip.
- `getByRole('group', {name: 'Tired −$999.9K/s'})` finds 1, and `getByRole('dialog')` finds 0.
- The popover rect (26.1,62–260.4,114) and the spot counts are unchanged from the body-appended mock, and the top bar equals flag-off.

### 6.3 G38
- `.pill.coins` and `.pill.basket` have no `tabindex` attribute (`tabIndex` −1), no role and no `onclick`, in 3 engines.
- In source, `app.ts` L73–74 are plain `<div>`s, and the only other references are `fly()`/`pulse()` animation targets.
- Side note: both carry `aria-label` on a role-less `<div>`, which ARIA 1.2 prohibits on generic elements. That's an FYI for the a11y owner; G38 doesn't change it.

### 6.4 Gap found (not decided)
- **The sub-line pill's name fails WCAG 2.5.3.** At ≥ 740, the visible text is `Tired −$X/s`, but the §1 Aria / FC-SV14 name is `Tired workers are costing $X per second. Open workers.`, which doesn't contain the visible text (axe `label-content-name-mismatch`). The icon chip is unaffected because it has no visible text.
- **Proposed fix (for Art and PMW to decide):** make the sub-line name the visible text (content-based), and move the sentence (`… Open workers.`) to `aria-describedby`, the same pattern as the stall chip (sales-stopped SS-18).
- **Alternative:** a name that starts with the visible text, e.g. `Tired −$X/s. Tired workers are costing $X per second. Open workers.`.
