# Breeds UI PR-A pre-bar — bd5b068a (tree d767dfd4)

TASK HoQA/PRA-PREBAR (owner HoQA 78e99c2d), resumed under TASK HoQA/TRAIN-RESUME-U / D-CEO-20261110-16 (LEAN). Lane `uiqa-breeds-pra`. Written 2026-11-10 ~03:40 CET (Europe/Belgrade). Resumed from WIP sha256 `e4114eac49460a8f5484efb4beb095335096e914f7eb3ba230e71d1e2795683d` (backed up as `breeds-pra-bd5b068a.md.bak-e4114eac`); HANDOFF at resume was sha256 `18c37fc7536cf0dd9f60877a7a4e036efb2077bd29ee27824806788bdcc6fd5c` (identity matched; scratch HEAD tree = `d767dfd4`).

Pins: bundle `scratch/bundles/breeds-ui-pra-bd5b068a.bundle`, ref `refs/heads/v5/breeds-ui-a`, head `bd5b068acff63694f02b334a3fad065e9a53b017`, tree `d767dfd48894bc716443f19846e870a6e0496503`, base rc/v5 `d65391b0868cc993aa39e5bde49d279967c3b8af`. Case set `qa/m3-recheck/breeds-ui-cases-v1.md` sha256 `1addc5368990fafde5b021c9b731690ca32f0ac20b15d7b2ab44cc6405c4413b`. Disposable clone: `qa/scratch/breeds-pra-bd5b068a/repo` (push URL DISABLED; tree stayed clean after builds). Evidence: `qa/m3-recheck/evidence/breeds-pra-bd5b068a/`. Flag-on path: `tests/helpers/breeds-on.ts` + `?qaBreeds=1`; `src/config/balance.json` breeds stays 0. Chromium only (Google Chrome 156.0.8078.47), port 47122, flock `.browser-test.lock`, `timeout 600`. axe-core 4.14.0 at `artifacts/v5-ui/tools/axe-core-4.14.0/axe.min.js` sha256 `20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878`. Local Node v20.19.2 (`/workspace/tools/node-v20.19.2-linux-x64/bin`). Runtime build-id `m4.1+bd5b068` matched the served QA build. **No merge-go from this lane. No hosted (branch not pushed).**

## Overall: FAIL (pre-bar complete enough to file; leftovers listed, none counted as PASS)

Items 1–6 PASS. Item 7: 11 PASS · 11 FAIL (all Major) · 6 BLOCKED (dependency / authorized switch) · 1 NOT RUN (BR-UI-22) · 1 OBSERVATION (BR-UI-39, not a PASS). Item 8 NOT RUN by design. All eight code-read leads confirmed FAIL at runtime (Major). BR-AC23b deferred to RC; BR-AC34 part 2 deferred to RC.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Identity/tree/base/commit list/diffstat; docs-only after 0ae9d907 | **PASS** (from halted WIP; re-confirmed scratch HEAD tree = d767dfd4 on resume) | 01-identity.txt |
| 2 | npm ci; tsc --noEmit (Node v20.19.2) | **PASS** (npm ci EXIT=0; tsc EXIT=0) | logs/npm-ci.txt, logs/tsc.txt |
| 3 | Full vitest `--minWorkers=1 --maxWorkers=2`, 0 fail | **PASS** — Test Files 159 passed (159); Tests 2340 passed \| 1 skipped (2341); EXIT=0; duration 349.85s; Node v20.19.2; lock 03:02:46–03:08:38 CET | logs/vitest-full.txt |
| 4 | Flag-0 goldens | **PASS** (4 files, 7 tests, EXIT=0; values unchanged from the halted WIP) | logs/vitest-flagoff-golden.txt |
| 5 | build + build:html + build:qa + check-release-build; build-id; qaBreeds release rejection | **PASS** — all three builds EXIT=0; check-release-build `m4.1+bd5b068 ok`; `no ?debug/?perf/?ios/?qaBreeds/QA hooks ok` on dist and dist-html; independent grep `dist_hook_hits {}` / `html_hook_hits {}`; dist-qa contains `qaBreeds`/`eggfarmQa` (positive control). html sha256 `331dfdbd79fc72a70ff8eae846b14e7ed3bc1c13b389fabaf163e38c8fa45f04` | logs/build.txt, build-html.txt, build-qa.txt, check-release-hooks.txt |
| 6 | Flag-on helper `tests/helpers/breeds-on.ts`; balance.json breeds=0 | **PASS** — runtime diff EXIT=0; only path changed is `m4.flags.breeds` 0→1; `file_still_zero` true; `file_equals_module` true; `only_breeds_changed` true; all other m4.flags remain 0 | logs/helper-diff.txt, json/helper-diff.json |
| 7 | Case set PR-A + both (Chromium) | **FAIL** — see tallies and per-case table. Probe attempt 6 EXIT=0, 03:30:44–03:32:33 CET, port 47122, served/build-id match true, flagBreeds=1, abilities=0, rc2Refill=0 | logs/browser.txt, json/probe-results.json, shots/ (85), SHA256SUMS |
| 8 | Hosted | **NOT RUN** (not pushed; push waits on Vadim). The pushed head inherits this bar only if its tree == d767dfd4 | — |

## 1. Identity (PASS)

Unchanged from the halted WIP (`01-identity.txt`). Resume re-checked: scratch `HEAD=bd5b068acff63694f02b334a3fad065e9a53b017`, `HEAD^{tree}=d767dfd48894bc716443f19846e870a6e0496503`, `git status --porcelain` empty after builds and after the probe.

## 3. Full vitest (PASS)

`LOCK+START 2026-11-10T03:02:46+01:00` node=v20.19.2 head=bd5b068a…; `--minWorkers=1 --maxWorkers=2` under `.vitest-eng.lock`. Test Files 159 passed (159); Tests 2340 passed | 1 skipped (2341). EXIT=0 at 03:08:38 CET. (Prior #118 bar was 156 files / 2276 tests; the extra files are the breeds tests at this head.)

## 4. Flag-0 goldens (PASS) — from the halted WIP, Node v20.19.2, EXIT=0

- GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` = known
- GOLDEN1 m4-on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` = known
- ZG-FLAGOFF-DOM `9c4b6439016e5d5b6a779b34643f70793fda5df8d44728f9bcc32844c662ee35` = known
- GOLDEN2 flag-off: b69c5783…, 2ac7070d…, 4fd46759…, 652d1b26… = identical to the #118/#111 values.

## 5. Builds + release qaBreeds rejection (PASS)

- `npm run build` EXIT_BUILD=0, Node v20.19.2, tree d767dfd4. check-release-build: `m4.1+bd5b068 ok`; `no ?debug/?perf/?ios/?qaBreeds/QA hooks ok`; eggfarm* identifiers `eggfarmRecovery, eggfarmTabGuard, eggfarmExportTelemetry` ok.
- `build:html` EXIT_BUILDHTML=0; same hooks ok; single-file 640550 bytes; html sha256 `331dfdbd79fc72a70ff8eae846b14e7ed3bc1c13b389fabaf163e38c8fa45f04`.
- `build:qa` EXIT_BUILDQA=0; dist-qa build-id `m4.1+bd5b068`; `breeds-qa-pLIMGv3Z.js` present.
- Independent python grep (`check-release-hooks.txt`): `dist_hook_hits {}` and `html_hook_hits {}`. QA build hook hits: `qaBreeds`/`eggfarmQa`/`get("qaBreeds")` in `dist-qa/assets/index-BwAJPvIq.js` and `eggfarmQa` in the breeds-qa chunk (positive control that the switch exists only on the QA build).
- Runtime (item 7): served build-id `m4.1+bd5b068` matched; `hasEggfarmQa=true` on the QA build.

## 6. Helper runtime diff (PASS)

`only_breeds_changed=true` (`m4.flags.breeds` 0→1). `file_still_zero=true`, `file_equals_module=true`. abilities, rc2Refill, and every other m4.flag remain 0 in both the shipped module and the file. This is why BR-UI-04/05/08 are BLOCKED on the authorized path.

## 7. Cases (Chromium) — tallies

Scoped: PR-A BR-UI-02..24 (23) + both BR-UI-01, 30, 32, 34, 35, 37, 39 (7) = 30. PR-B-only out of scope: 25–29, 31, 33, 36, 38. Sizes used where the 30 cases name them: 360×640, 390×844, 1280×800, 1280×720, 1024×474. 375, 430, and 1366×768 appear in RC-LAYOUT-118-PILL, not in these 30 cases, and were not invented. FF/WK engines are not installed: those cells are **NOT RUN**.

| Status | Count | IDs |
|---|---|---|
| PASS | 11 | BR-UI-01, 09, 10, 11, 12, 15, 16, 18, 20, 23, 24 |
| FAIL Major | 11 | BR-UI-02, 03, 06, 07, 13, 14, 17, 19, 21, 34, 35 |
| BLOCKED | 6 | BR-UI-04, 05, 08, 30, 32, 37 |
| NOT RUN (case) | 1 | BR-UI-22 |
| OBSERVATION (not PASS) | 1 | BR-UI-39 |

Probe: attempt 6 (hardened axFor), `START 2026-11-10T03:30:44+01:00` / `EXIT=0 END 2026-11-10T03:32:33+01:00`. Attempts 1–5 were aborted on probe bugs (click timeout, tab-guard, close-outside-viewport, tap-to-start, stale CDP node); their logs are kept as `logs/browser-attemptN-*.txt`. Grades below are from attempt 6 `json/probe-results.json` plus visual inspection of the shots.

### Visual inspection (required)

Shots are Playwright `page.screenshot({ fullPage: false })` of the viewport, 85 files. Opened and checked a representative set covering PASSes, FAILs, and leads: flag-0 01; 02 F9/F10 at 360 and 1280×800; 03 F10 phone + docked; 06 sheet at 360 and 390 + 06-open; 07 overlay at 1280×800 / 1280×720 / 1024×474; 09-after; 10-F10 docked; 13 commons/complete; 17 filled; 19 album docked; 21 reveal; 39 sheet-affordable at 360.

- **Phone Upgrades-header entry paints.** 02-F10 at 360 shows the Flock pill (chicken icon + "Flock") in the Upgrades header with exactly 3 tabs (Collection / Farm / Workers) and a Close X. 02-F9 and 01-flag0 show the same header **without** a Flock control. This confirms the entry-presence legs.
- **Phone Flock sheet does not paint in the viewport.** Every phone shot taken while the probe claimed `#breeds-sheet` open (06, 09, 10, 11, 12, 13, 14, 16, 17, 18, 19-360, 34-360, 35-360, 39 sheet/album/incubating) shows only the farm scene + nav. Measured `#breeds-sheet` is `y = viewport height` (360×640: `0,640 360×480` vs expected `0,160 360×480`; 390×844: `0,844 390×633` vs `0,211 390×633`) — the sheet sits just below the clip. DOM/AX/JS-click grades for those cases still stand; they were **not** confirmed from pixels. The reveal card in 21 **does** paint over the farm (see BR-UI-21).
- **Docked Flock UI does paint.** 07 shots show the farm on the left and a right-side Flock column (Incubator / Hatch / slots / album). 03-F10, 10-F10, and 19-album at 1280×800 show a full-viewport Flock page: locked slots read visible **"Farm 14" / "Farm 20"** with a padlock (not "Slot 2 · Farm 14"); Farm-soon **"Needs next Farm upgrade"** is visible under "Ready in 1:00" in 10-F10; there is **no Active totals row**; album cells are wide and short with ~36 px sprites; filled-slot "Remove" is a short chip; header has ‹ and "Flock", no visible Close X.
- **07 overlay-rect caveat.** Measured `#breeds-sheet` was `0,0 1280×800` (vs expected `880,56 400×744`) and `0,0 1024×474` (vs `624,56 400×418`). The **pixels** on the 07 shots still show a right-side column with the farm visible, so this is the element's box (likely a full-size wrapper), not a painted full-screen takeover. Case 07 still FAILs on focus-return and the 0×0 Close hit area.

### Per-case results

**BR-UI-01 PASS** (both). Flag-0 DOM scan at 360 / 1280×800 / 1280×720 / 1024×474: no `#breeds-entry`, no breeds testids, no pchip, no breed-asset hits, no breeds copy. Visual: 01-flag0 at 360 is the Upgrades sheet with no Flock pill (L20). Substeps **NOT RUN**: base rect compare vs an rc/v5 QA build (no such build in this scratch; not rebuilt); 120 s telemetry.

**BR-UI-02 FAIL Major** (PR-A). F9: no entry (visual + DOM). F10: entry present, label "Flock", height 44, minH 44px, exactly 3 tabs. Rects miss the Art table on 4 of 5 sizes (1280×720 was within tolerance): 360×640 `156.73,168 104.95×44` vs `200,168 100×44`; 390×844 `171.73,219 104.95×44` vs `230,219 100×44`; 1280×800 `1012.42,391 104.95×44` vs `1164,436 100×44`; 1024×474 `756.42,228 104.95×44` vs `908,273 100×44`. Visual: the pill sits immediately after the "Upgrades" title, which matches the measured x (left of the Art x). Observed, not separately graded by the probe: `aria-haspopup` was null (case expected `dialog`). Repro: `qaBreeds=1`, seed F9 then F10, open Upgrades, measure `#breeds-entry`.

**BR-UI-03 FAIL Major** (PR-A). Unlocked counts match (F10/13 → 1 open; F14/19 → 2; F20 → 3). Locked visible text is **"Farm 14" / "Farm 20"**; sr is `"Slot 2 Farm 14"` / `"Slot 3 Farm 20"` (no middot). Case expected `"Slot 2 · Farm 14"` / `"Slot 3 · Farm 20"`. Confirmed at 360 and 1280×800 and in the docked 03-F10 shot (padlock + "Farm 14" / "Farm 20"). Repro: open Flock at F10/13/14/19/20 and read the locked placeholder.

**BR-UI-04 BLOCKED** (PR-A). Coach leg needs `m4.flags.abilities=1`. Authorized path sets only `breeds=1`. Runtime `abilities=0`. Glow/dot can be written via the QA handle after `abilitiesCoachSeen`, but coach-first sequencing is not testable. Shots: `BR-UI-04-no-abilities.png`, `BR-UI-04-coachSeen-state.png`.

**BR-UI-05 BLOCKED** (PR-A). Same reason: highlight fallback is defined in terms of the Shift-calls coach / `abilitiesCoachSeen` rules; `abilities=1` is not reachable via the authorized switch.

**BR-UI-06 FAIL Major** (PR-A). (1) Phone sheet rect is off-viewport: `0,640 360×480` vs `0,160 360×480`; `0,844 390×633` vs `0,211 390×633`. Screenshots show the farm only — this is a painted miss, not just a number. (2) No Active totals row; `#breeds-body` children are `incu-card | breeds-slots | breeds-album`. (3) Close and Esc leave `document.activeElement=BODY`; focus does not return to `#breeds-entry` (case also names `#flock-entry`; neither is focused). Repro: F20, open Flock at 360 and 390, measure `#breeds-sheet`, body sections, Close/Esc target.

**BR-UI-07 FAIL Major** (PR-A). Focus does not return to `#breeds-entry` after Close or Esc at 1280×800, 1024×474, and 1280×720 (`active=BODY`). Docked Close hit is 0×0 (control not visible in the docked Flock header; ‹ back is). Overlay-rect measurement of `#breeds-sheet` is full-viewport; see the visual caveat above — the 07 shots still show a right-side Flock column. `sales_30s_control`: **NOT RUN** (Market node present; no 30 s sale-count compare). Repro: F20, open docked Flock, Close/Esc, read focus.

**BR-UI-08 BLOCKED** (PR-A). Needs `m4.flags.rc2Refill=1` and a visible docked Refill pill. Authorized path sets only `breeds=1`. Runtime `rc2Refill=0`, `refillVisible=false`. Shot: `BR-UI-08-no-rc2Refill.png`.

**BR-UI-09 PASS** (PR-A). Free hatch: before label "Hatch · Free"; after coins=0, `freeHatchUsed=1`, incu breed leghorn remainingMs 60000, label "Hatching…", sub "Ready in 1:00". DOM-proven; phone shot does not show the sheet (see visual note).

**BR-UI-10 PASS** (PR-A). Affordable labels "Hatch · $500.00" at F10 (360 and 1280×800) and the F28 row; AX name matches. Docked 10-F10 shot also shows "Ready in 1:00" and "Needs next Farm upgrade". No "of income" copy in the hatch scan.

**BR-UI-11 PASS** (PR-A). Unaffordable Hatch is `aria-disabled=true`, greyed (`rgb(207, 198, 186)`), press does nothing (coins stay 1, incu stays null).

**BR-UI-12 PASS** (PR-A). t0: "Hatching…", disabled, "Ready in 1:00", silhouette src `/assets/char-breed-silhouette.svg`. Mid: "Ready in 0:42". Near end: "Ready in 0:01" (not 0:00).

**BR-UI-13 FAIL Major** (PR-A). Labels themselves match: (a) "More breeds at Farm 14"; (b) "Flock complete". Subs do not: (a) got `"Ready in 1:00"`, expected `"All Commons at 2★"`; (b) got `"Slots still work"`, expected `"All 8 breeds at 2★ · slots still work"`. Phone shots do not show the sheet; copy is from DOM. Repro: seed F13 commons-at-2★ and all-8-at-2★, read Hatch label/sub.

**BR-UI-14 FAIL Major** (PR-A). The F28 natural + `eggfarmQa` override path in this case did not make a Farm-soon node appear (`noteCount=0`, no `#hatch-fs`). `aria-describedby` stayed `"hatch-sub"`. **However**, BR-UI-10 at F10 already had the note visible in the DOM and in the docked shot ("Needs next Farm upgrade"), with `describedby="hatch-sub"` and `hatchFs=false` — so the describedby lead is confirmed when the note *does* show. FF/WK **NOT RUN**. Repro: open Flock with Farm-soon visible; read Hatch `aria-describedby` and whether `#hatch-fs` exists.

**BR-UI-15 PASS** (PR-A). Hook present on the QA build (`eggfarmQa.breeds.hatchEstimate` is a function). The 85/95 second-pair matrix was not fully driven (hook returns $/s). Release-hook absence is graded from item 5, not this page.

**BR-UI-16 PASS** (PR-A, Chromium only). At 360, Hatch / sub / slots / album strings had `scrollWidth ≤ clientWidth`. FF/WK **NOT RUN**.

**BR-UI-17 FAIL Major** (PR-A). Filled slot is `role=group` `aria-label="Slot 1, Leghorn"`; visible name is "Leghorn"; AX name is "Slot 1, Leghorn" (from the attribute) — aria-label replaces the visible text. Remove is 60.89×28, computed min-height 28px (< 44). Album-select + place into an empty slot did work (Sussex landed in slot 1, settling). Docked 19-album shot shows the short Remove chip on the filled Leghorn card. Repro: F20, Leghorn settled in slot 0; inspect the group name and `.slot-remove`.

**BR-UI-18 PASS** (PR-A). "Settling 5:00" then "Settling 4:12"; meta "+18.75% away · inactive". Substeps **NOT RUN**: hidden-tab 50 s; t300 settled transition.

**BR-UI-19 FAIL Major** (PR-A). 8 cells present. 360: width 76 (matches the 76 target); owned+slotted cells 76×108.38 (above 100); Brahma owned and 3 locked cells 76×95.19 (minH 72px) < 100; owned sprites 36 vs 48. 1280×800: all 8 cells 306×95.19 (want width 86, height ≥100); owned sprites 36. Docked 19-album shot shows the wide short cells and small sprites. Repro: F20, 5 of 8 owned, measure `.album-cell` and `img` at 360 and 1280×800.

**BR-UI-20 PASS** (PR-A). No ★ / payback / "best" / "of income" text outside the album.

**BR-UI-21 FAIL Major** (PR-A). Reveal card has the breed name and "Nice!" only — no kicker, no placement line. Esc closed the Flock sheet (`flockOpen=false`) but left the reveal card (`reveal=true`). Visual: 21-reveal shows a large Leghorn sprite, the word "Leghorn", and a "Nice!" button over the farm; no kicker/placement copy. Repro: force `pendingReveal`, open Flock, read reveal copy, press Esc.

**BR-UI-22 NOT RUN** (PR-A). Did not construct a genuine offline save (savedAt 10 min past + remainingMs 40s) and reload; welcome-back path not exercised.

**BR-UI-23 PASS** (PR-A). Clicks inside the (open) sheet did not change the basket (0→0); coins moved 1000000→950000 from the hatch spend, not from a credited farm tap. Caveat recorded: the sim was frozen (`g.frame` no-op), so credited-tap counters may also have been frozen.

**BR-UI-24 PASS** (PR-A). All 9 `public/assets/char-breed-*.svg` files are byte-identical to the art-ux assets (sha256s in `probe-results.json`). In-page srcs map to `/assets/char-breed-*.svg`. Automated IoU matrix and the human 9/9 reviewer match are **NOT GRADED / NOT RUN** this pass (file identity + mapping only).

**BR-UI-30 BLOCKED** (both). Gate legs need the Present rate gate (W 10 / k 6) in the sim. Runtime `hasPresentOpen=false`, no `.pchip`. Dependency (PR-A must not edit `src/sim`). Shot: `chromium-1280x800-deps-present-telemetry.png`.

**BR-UI-32 BLOCKED** (both). Chip state rules need the Present chip and rate gate, absent on this PR-A head. Sheet/overlay themselves were exercised in 06/07; the chip legs are blocked on the sim/PR-B dependency.

**BR-UI-34 FAIL Major** (both, Chromium). Filled slot: AX name `"Slot 1, Leghorn"` (from `aria-label`) vs visible text starting `"Leghorn+3.12% lay Present…"`. 1280×800 filled-slot AX call hit a stale CDP node (`Could not find node with given id`) and recorded AX name `""` with the same aria/visible mismatch still in attributes; 360 and 1280×720 returned the AX name. Hatch AX "Hatch · $500.00" / desc "Ready in 1:00" is fine; empty slot "Empty"; settling name follows visible text. Some `.album-cell.locked` CDP describes also missed (recorded, not treated as PASS). FF/WK **NOT RUN**. PR-B surfaces (chip / Present mirror / Broody yard) are not on this head (NOT RUN / N/A). Repro: open Flock at 360/1280, CDP AX on entry/Hatch/slots/album; compare name vs visible text. BR-AC34 part 2 remains deferred to RC.

**BR-UI-35 FAIL Major** (both, Chromium). axe 4.14.0: `landmark-no-duplicate-banner` (moderate) on `#breeds-sheet > header` at 360, 1280×800, and 1280×720. `label-content-name-mismatch` violations = 0; docked runs had it **incomplete** (serious, target `.breeds-back`, "Unable to determine if the visible text is part of the accessible name") — recorded as incomplete, not counted as a violation. Hit areas: `.slot-remove` 60.89×28 < 44 at all three sizes; docked Close 0×0 < 44 at 1280×800 and 1280×720; phone `#breeds-entry` 0×0 while the sheet was claimed open (entry is in the Upgrades header, not on screen). Hatch / back / filled slot cleared 44. PR-B surfaces not on this head.

**BR-UI-37 BLOCKED** (both). Breed telemetry emitters (`hatch_started` / `breed_revealed` / `breed_slotted` / `flock_complete`) are not present at this head (`schema.ts` only). Runtime export types=`["session_start","tab_guard_takeover"]`, `hasHatchStarted=false`. Dependency (drift audit row 34); UI triggers exist in PR-A but emitters are sim work.

**BR-UI-39 OBSERVATION** (both). Visual judgement is never an automatic PASS against Art wireframes. Chromium matrix recorded at 360 / 390 / 1280×800 / 1280×720 for entry-F10, sheet affordable / unaffordable / incubating, and album (paths + per-cell sha256s in `probe-results.json`). Phone sheet/album cells in this matrix show the farm only (sheet off-viewport); docked cells and the phone entry cell are usable pixels. Present-badge cells are PR-B and were **NOT RUN**. FF/WK **NOT RUN**. Visual match vs Art is not claimed.

### Code-read leads (all confirmed FAIL Major at runtime)

| Lead | Result | Evidence |
|---|---|---|
| hatch-describedby-missing-farmsoon | **FAIL Major** | `describedby="hatch-sub"`, no `#hatch-fs`. When the note was visible (BR-UI-10, docked shot "Needs next Farm upgrade") it was still not in the describedby list. BR-UI-14's F28/override path did not itself produce the note (`noteCount=0`). |
| filled-slot-aria-label-replaces-visible-text | **FAIL Major** | `aria="Slot 1, Leghorn"`, visible name `"Leghorn"`, AX `"Slot 1, Leghorn"` (from the attribute). |
| remove-button-28px | **FAIL Major** | `.slot-remove` 60.89×28, `min-height: 28px`. Visible as a short chip on the docked 19-album shot. |
| locked-slots-Farm-14 | **FAIL Major** | Visible "Farm 14" / "Farm 20"; sr `"Slot 2 Farm 14"` without a middot. Docked 03-F10 shot confirms the visible copy. |
| small-album-cells | **FAIL Major** | minH 72px; sprites 36 vs 48; 360 locked/Brahma height 95.19 < 100; docked cells 306×95.19 vs 86×≥100. Docked 19-album shot confirms. |
| no-active-totals-row | **FAIL Major** | Body is `incu-card \| breeds-slots \| breeds-album` at 360 and 390. No "Active:" row in docked shots either. |
| reveal-no-kicker-esc-not-closing | **FAIL Major** | `hasKicker=false`, `hasPlacement=false`; after Esc `reveal=true`, `flockOpen=false`. 21-reveal shot: name + Nice! only. |
| focus-not-returning-to-flock-entry | **FAIL Major** | Close and Esc at 360, 390, 1280×800, 1024×474, 1280×720 all leave `active=BODY`. |

## 8. Hosted — NOT RUN

Branch not pushed. Inheritance requires the pushed tree == `d767dfd48894bc716443f19846e870a6e0496503`.

## Leftovers (explicitly not PASS)

Case **NOT RUN**: BR-UI-22 (offline welcome-back).
**NOT RUN** substeps / cells: FF/WK on BR-UI-14, 16, 34, 39; BR-UI-01 base-rect compare and 120 s telemetry; BR-UI-07 30 s sale-count control; BR-UI-15 full 85/95 matrix; BR-UI-18 hidden-50s and t300; BR-UI-24 IoU and human 9/9; BR-UI-39 Present-badge (PR-B) cells; item 8 hosted.
**BLOCKED** (do not re-run on this head): 04, 05 (abilities=1 not on the authorized switch), 08 (rc2Refill=1 not on the authorized switch), 30, 32 (Present gate / `.pchip` absent; re-bar on sim/PR-B heads), 37 (emitters absent; re-bar on sim heads).
**Deferred**: BR-AC23b to RC; BR-AC34 part 2 to RC.
375 / 430 / 1366×768 were not required by these 30 cases.

## Process

Resume identity matched HANDOFF `18c37fc7…` and WIP `e4114eac…`; scratch tree `d767dfd4`. Long processes via `ops/tools/lane-run.sh uiqa-breeds-pra -- …` and `ops/tools/lane-kill.sh uiqa-breeds-pra <pid>` only. Port 47122 was free after the probe; no survivor was signalled.

lane-kill outputs (rc 0 in each case):

- prior halt: `TERM 647361 (group)` (already recorded in the WIP)
- this resume: `GONE 705343` (vitest), `GONE 783861` (helper-diff), `GONE 798967` (builds), `GONE 829508` / `GONE 848195` / `GONE 893450` / `GONE 922645` / `GONE 959608` (browser attempts 1–5), `GONE 1001373` (browser attempt 6; `/proc/1001373` GONE)

End-of-bar: every recorded pid in `.pids/uiqa-breeds-pra.pids` was lane-killed again and confirmed GONE via `/proc`. No readable survivor with `LANE_RUN_TAG` `uiqa-breeds-pra`.

**No merge-go.**
