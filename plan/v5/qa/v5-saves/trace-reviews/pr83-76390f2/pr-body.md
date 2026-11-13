M4.1 patch 2 for v5 (D-HOE-20261029-03). One Draft PR into `rc/v5`. HEAD `76390f2834b98e981ef52a3e165436acd9170654`.

What it covers:
- UI minors m8, m9, m5, m6, m1 and m10.
- P2a (AC-R17).
- WCAG 2.4.11.
- CCR and Art nits on #70.
- P2b (Unpaid ACs).

**No sim, save or economy behaviour diff.** `src/sim`, `src/save`, `src/config` and `data/` are untouched by this branch. `src/econ/income.ts` changes comments only (CCR n1). **No feature flag** (see flags).
`origin/rc/v5` advanced after the branch was cut (#81 v5 F2, #78 bot-m5). It is merged in at 23d2b78 with no conflicts and no force-push, and every gate below ran on the merged HEAD.

Spec pins:
- Scope: `engineering/m4.1-p2-scope.md` (f0524447…). Its standalone merge/tag/Latest line is superseded.
- Art package: acfe36a7.
- `rc1-asleep-state-spec`: v1.0.12 (666e8fd5…).
- `qa/m41/test-plan-patch1.md`: a34ace59…

## Scope item → commit
| Item | Commit(s) |
|---|---|
| m8 coop tip type/width | 98714c3 |
| m9 undim off cards, Unpaid word `--c-danger` | c2fd3fe |
| m5 state word + inline SVG (incl. UI-M5-8) | 8e99b68 |
| m6 HUD warn SVG, ▼ aria-hidden (option A); rc0 s28rate updated | 57fd900 |
| m1 keyed yard diff + reduced motion | 77f2aec, 5d00545 |
| m10 `--c-muted-strong` on disabled Buy (3.76 → 4.88:1) | 439ff5d |
| P2a AC-R17 (m-P1-1) | 7516cae |
| WCAG 2.4.11 (rc1 `--refill-bar-h` + scroll-margin-top port, plus scroller padding fix) | e7d6aa8, 5683b49 |
| CCR #70 n1 (income.ts:77-81 comment, TEST-ONLY marks) and n2 (unused `s` in `workerBanner`) | ea3c0c4 |
| Art #70 n1: refund pop never covers #rate | ac92ff6 |
| P2b Unpaid ACs R10–R16, TP1-U1..U3 | fa9bb6b |
| Browser AC script + shots (`scripts/m41-p2-browser.mjs`) | 4ca01f2, 60c7995, 83ae316 |
| Self-review nit; AC-id test titles (QA-D-1029-V5SCAP) | d790cd0, 76390f2 |

**Already on main (not redone):**
- m-RC1-1 expin fix (d5fc626).
- Yard hens from track (#69/#70).
- AC-R1..R9 port.
- rc1 sticky Refill bar base.

## AC trace (QA-D-1029-V5SCAP): AC id → test file :: test name
| AC id(s) | Scope item | Test (file :: describe > it) |
|---|---|---|
| UI-M8-1 | m8 | tests/m41-p2-ui-minors.test.ts :: m8 .cooptip (UI-M8-1) > UI-M8-1 m8: valid font shorthand 700 14px/1.3 var(--f-body), width max-content, max-width min(320px, 100vw - 32px), radius 12 kept |
| UI-M9-1/2/6 | m9 | tests/m41-p2-ui-minors.test.ts :: m9 asleep/unpaid card undim (UI-M9-1/2/6 source rules) > UI-M9-1/2/6 m9: only .ebar dims on an .is-off card; no .wk-body opacity rule; unpaid word var(--c-danger) |
| UI-M5-8 | m5 | tests/m41-p2-ui-minors.test.ts :: m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3) > UI-M5-8 (Engineering ask): each mood renders exactly Working/Tired/Asleep/Unpaid with no \\p{Extended_Pictographic} or U+26A0 |
| UI-M5-1 | m5 | tests/m41-p2-ui-minors.test.ts :: m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3) > UI-M5-1 grep: no U+1F4A4 or U+26A0 left in workers-ui.ts |
| UI-WARN-2, UI-M5-2 | m5 | tests/m41-p2-ui-minors.test.ts :: m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3) > UI-WARN-2 / UI-M5-2: icons are the signed assets (sha1), aria-hidden, focusable=false, no other hex than #3E2C23 |
| UI-WARN-4, UI-M5-4/5 | m5 | tests/m41-p2-ui-minors.test.ts :: m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3) > UI-WARN-4 / UI-M5-4/5 CSS: 14px, -2px, 4px gap, white fill; the moon takes the .st ink (color:inherit, load-bearing) |
| UI-M5-6 | m5 | tests/m41-p2-ui-minors.test.ts :: m5 card state word: text + inline SVG, no pictograph (UI-M5-1..8, UI-WARN-1..3) > UI-M5-6 / Q-WARN-1: banners keep the pinned <img> icons (icon-moon.svg / icon-warning.svg) |
| UI-M6-2/6/7 | m6 | tests/m41-p2-ui-minors.test.ts :: m6 HUD rate CSS (UI-M6-2/6/7) > UI-M6-2/6/7 m6: 11px icon at -1.5px, 2px gap, white fill; hidden without .warn; no U+FE0E route; the model strings keep the ⚠ marker (option A) |
| UI-M1-9, UI-M1-4 | m1 | tests/m41-p2-ui-minors.test.ts :: m1 yard reduced motion (UI-M1-9 source rules; bob/popin unchanged, UI-M1-4) > UI-M1-9 UI-M1-4 m1: media + .rm rules right after the .hen.pop rule; bob 1.6s infinite and popin 300ms x1 unchanged |
| UI-M10-8 | m10 | tests/m41-p2-ui-minors.test.ts :: m10 disabled Buy text >= 4.5:1 via --c-muted-strong (UI-M10-1/2/8/9, CSS only) > UI-M10-8 m10: token defined exactly once, in the first :root colour row next to --c-muted, = #5A4C42 |
| UI-M10-1/9 | m10 | tests/m41-p2-ui-minors.test.ts :: m10 disabled Buy text >= 4.5:1 via --c-muted-strong (UI-M10-1/2/8/9, CSS only) > UI-M10-1/9 m10: shared :39 rule and PT1-14 both use var(--c-muted-strong); cursor:not-allowed; no #5A4C42 literal in either |
| UI-M10-2 | m10 | tests/m41-p2-ui-minors.test.ts :: m10 disabled Buy text >= 4.5:1 via --c-muted-strong (UI-M10-1/2/8/9, CSS only) > UI-M10-2 m10: contrast: #5A4C42 on #CFC6BA >= 4.5 (4.88); old #6B5D52 was 3.76 |
| UI-M10-5 | m10 | tests/m41-p2-ui-minors.test.ts :: m10 disabled Buy text >= 4.5:1 via --c-muted-strong (UI-M10-1/2/8/9, CSS only) > UI-M10-5 m10: Buy stays aria-disabled, never native disabled (UI-M10-5) |
| CCR-70-n1 | CCR nits | tests/m41-p2-ui-minors.test.ts :: CCR #70 nits (n1 income.ts comment + test-only marks, n2 workerBanner without GameState) > CCR-70-n1: n1: grossSalesPerSec / salesStopped are marked TEST-ONLY and the stale "Used by the header aria and the worker banners" is gone |
| CCR-70-n2 | CCR nits | tests/m41-p2-ui-minors.test.ts :: CCR #70 nits (n1 income.ts comment + test-only marks, n2 workerBanner without GameState) > CCR-70-n2: n2: workerBanner / workerBannerText take no GameState |
| ART-70-n1 | Art nit | tests/m41-p2-ui-minors.test.ts :: Art nit n1 on #70: refund pop never covers #rate (geometry; per-frame overlap is measured in scripts/m41-p2-browser.mjs) > ART-70-n1: exppop rises REFUND_RISE_PX (8) at most; the start line leaves the 1.1x box (<= POP_BOX_H) >= 4px below the pill/#rate; coins end on that line |
| WCAG-2.4.11 | WCAG 2.4.11 | tests/m41-p2-ui-minors.test.ts :: WCAG 2.4.11 port from rc1 7380b86 (source; keyboard sweep at 360/390/1280 x 3 engines in scripts/m41-p2-browser.mjs) > WCAG-2.4.11: --refill-bar-h = measured sticky bar + scroller padding-top + 8px (0 without), re-measured on resize/dock; cards and their focusables use it as scroll-margin-top |
| UI-M6-1/5/8 | m6 | tests/m41-p2-ui-dom.test.ts :: m6 HUD #rate: static WARN_SVG + aria-hidden ▼ (UI-M6-1/5/6/8) > UI-M6-1/5/8 m6: neg (Market Hand asleep, nothing else): no U+26A0 text, ▼ in .tri[aria-hidden], money in .rt, one svg.wi from WARN_SVG, aria unchanged |
| UI-M6-1 | m6 | tests/m41-p2-ui-dom.test.ts :: m6 HUD #rate: static WARN_SVG + aria-hidden ▼ (UI-M6-1/5/6/8) > UI-M6-1 m6: pos: no .warn (icon hidden by CSS), .tri empty, text "+$X/s" |
| UI-M1-1/3/4/5/6 | m1 | tests/m41-p2-ui-dom.test.ts :: m1 yard: keyed per-slot diff (UI-M1-1/3/4/5/6) > UI-M1-1/3/4/5/6 m1: first render: no .pop; Hens buys keep every existing node, add only new hens with .pop + "0s, <stagger>", cap 12 = 0 mutations |
| AC-R11, TP1-U2 | P2b | tests/m41-p2-ui-dom.test.ts :: P2b AC-R11 / TP1-U2: a Refill tap on an Unpaid worker dispatches nothing > AC-R11 TP1-U2 P2b: MH Unpaid at 30% (<= T), cooldown 0: tap -> no manage dispatch, energy/cooldown unchanged; a Tired worker still refills |
| AC-R17 | P2a | tests/m41-p2-ui-dom.test.ts :: P2a AC-R17 (m-P1-1, WCAG 2.5.3): name starts with the visible text in DOM order, count announced > AC-R17 P2a: {scene}: Upgrades nav, Workers tab, Refill nav |
| AC-R16 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R16 P2b: fmtMoney check (spec v1.0.10 §2) |
| AC-R10 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R10 (above T): MH F10 Unpaid energy 70 coins $1.00 -> "Resumes at $2.50", Refill aria-disabled, name "Refill Market Hand", describedby sentence |
| AC-R11 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R11 (at/below T, cooldown 0): caption "Resumes at $2.50", aria-disabled (the UI tap guard is in m41-p2-ui-dom) |
| AC-R12 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R12 (cooldown 20 s): "Resumes at $2.50", not "Ready in 20s"; v1.0.12 precedence Unpaid > Rested > Ready in > none |
| AC-R13 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R13: from R10, coins -> $2.50: within 1 tick worker_state working, coins unchanged by the resume, caption -> "Rested, refill below 50%" |
| AC-R14 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > AC-R14: F10 MH working + CH Unpaid -> CH X = $7.50; both Unpaid -> MH $2.50, CH $7.50; at $5.00 only the MH resumes |
| TP1-U1/U2 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > TP1-U1/U2: Unpaid + energy 0 -> Unpaid wins: caption, aria-disabled + describedby, Unpaid banner, pill "Unpaid" (+ warn icon), no yawn |
| TP1-U3 | P2b | tests/m41-p2-unpaid.test.ts :: P2b Unpaid caption / Refill (AC-R10..R14, U1..U3) > TP1-U3: from U1, coins >= X; 1 tick -> resumes into Asleep: Asleep banner, normal Refill enabled; the reserve skips it (energy 0) |
| AC-R15 | P2b | tests/m41-p2-unpaid.test.ts :: P2b nav / Manage all exclude Unpaid (AC-R15) > AC-R15 P2b: 3 hired, CH Unpaid 30%, MH Tired 30%: count 1, aria "Refill 1 tired worker"; the sim needManage still has both (Manage all behaviour unchanged) |
| AC-R15, AC-R9 | P2b | tests/m41-p2-unpaid.test.ts :: P2b nav / Manage all exclude Unpaid (AC-R15) > AC-R15 AC-R9 P2b: only an Unpaid worker <= T -> N = 0: no Refill bar, nav hidden (AC-R9 hidden at 0) |
| AC-R16 | P2b | tests/m41-p2-unpaid.test.ts :: AC-R16 copy forms (fit is browser-measured in scripts/m41-p2-browser.mjs at 360/390/1280 x 3 engines) > AC-R16 P2b: the five captions |


**Browser trace:** `scripts/m41-p2-browser.mjs`, chromium + firefox + webkit at 360/390/1280. Each check is named by its AC id in `results-<engine>.json` and the gate logs `11-m41-p2-browser-*.log`:
- UI-M8-1 and UI-M8-2/3.
- UI-M9-1/2/6.
- UI-M5-1/2/3/4/5 and UI-WARN-1..5.
- UI-M6-1/2/3/5/8.
- UI-M10-1/2/5/8.
- UI-M1-1/2/3/4 and UI-M1-9.
- AC-R17 (8 scenes), including axe 4.14 `label-content-name-mismatch` = 0.
- AC-R10/U1 on the real card, and AC-R16 (5 forced captions fit on one line).
- WCAG 2.4.11 Tab/Shift+Tab sweep.
- Art #70 n1: per-frame overlap with #rate = 0 px².

## Gates on `76390f2834b98e981ef52a3e165436acd9170654` (node v20.19.2, `nice -n 10`, one vitest on the box, browsers under the shared flock)
| Gate | Result | SHA | Time | Numbers |
|---|---|---|---|---|
| 00-npm-ci | PASS | 76390f2 | 1s |  |
| 01-sync-economy-check | PASS | 76390f2 | 1s |  |
| 02-tsc | PASS | 76390f2 | 3s |  |
| 03-vitest-full | PASS | 76390f2 | 207s | 1662 passed (1662); hash `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` |
| 04-golden-flagoff-ac7 | PASS | 76390f2 | 428s | 2 passed (2); hash `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` |
| 05-golden-m4on | PASS | 76390f2 | 8s | 2 passed (2); hash `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` |
| 06-build-release | PASS | 76390f2 | 5s | check-release-build ok |
| 07-build-html | PASS | 76390f2 | 7s | check-release-build ok |
| 08-build-qa | PASS | 76390f2 | 4s |  |
| 09-check-globals | PASS | 76390f2 | 347s | 3 PASS / 0 FAIL lines |
| 10-rc0-chromium | PASS | 76390f2 | 357s | 394/394 passed |
| 10-rc0-firefox | PASS | 76390f2 | 417s | 394/394 passed |
| 10-rc0-webkit | PASS | 76390f2 | 372s | 394/394 passed |
| 11-m41-p2-browser-chromium | PASS | 76390f2 | 140s | 177/177 checks pass, 27 shots |
| 11-m41-p2-browser-firefox | PASS | 76390f2 | 192s | 177/177 checks pass, 27 shots |
| 11-m41-p2-browser-webkit | PASS | 76390f2 | 153s | 177/177 checks pass, 27 shots |
| 12-diff-stat-vs-rc-v5 | PASS | 76390f2 | 1s | 17 files changed, 737 insertions(+), 63 deletions(-); economy/save/sim paths: src/econ/income.ts only, 0 non-comment lines |

- Rule-19 logs: `/workspace/egg-farm-studio/artifacts/m41-p2/results/`, with `summary.tsv` and `MANIFEST.sha256` (= `SHA256SUMS`, checked with `sha256sum -c`).
- Shots: `/workspace/wt-ui-shots/m41-p2-76390f2/` (`manifest.json`, sha256 per shot), also copied to `results/shots/`.
- Golden pins:
  - Flag-off AC7 is `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`.
  - M4-on is `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`.
  - Both golden files are unchanged vs `origin/rc/v5`.

## Self-review (D-CEO-20261028-02): only Minor findings and Nits; no Blocker, Critical or Major
Full text: `engineering/reviews/p2-76390f2-self-review.md`.

Minor:
- **m1:** no flag (flag rule 5 vs a no-flag CSS/a11y patch). HoE to rule.
- **m2:** `income.ts` is comment-only.
- **m3:** the 2.4.11 port needed the scroller padding-top too. Without it the Shift+Tab focus sat 8px under the bar in all 3 engines.
- **m4:** the spec's "Refill, no tired workers" state doesn't exist (nav hidden at N=0).
- **m5:** the Upgrades name is "N Upgrades, …" rather than a DOM reorder.

Nits:
- **n1:** rc0 s28rate updated for m6.
- **n2:** `s2-economy-ui` comment only.
- **n3:** import comment fixed.
- **n4:** the Unpaid Refill tap keeps the refused-tap shake.
- **n5:** measure cadence.
- **n6:** the browser script freezes the sim for snapshot scenes (QA handle only).
- **n7:** at 360 the coop tip overlaps the top of the Collect row. That's a position issue, not in scope.
- **n8:** tests were written alongside the code.
- **n9:** WebKit line-height serialisation in the check.
- **n10:** rc/v5 merge.

## Flags / conflicts for HoE
1. Flag rule 5 vs UI minors: no flag added, so "flag default 0" is moot. Please rule.
2. Artifact path: the brief said `artifacts/m41-p2/results/`, while `engineering/v5-rc-manifest.md` says gate id `v5-p2`. I used `m41-p2`. Nothing was pushed to the `artifacts` branch.
3. AC-R17 "Refill, no tired workers" state isn't in code. Spec owner to drop or define it.
4. The WCAG 2.4.11 port deviates from 7380b86 (adds the scroller padding). Art/a11y to confirm.
5. d32b73fc text not on disk; the f0524447 scope pin was used.

