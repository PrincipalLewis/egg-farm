# Gate 5 FINAL-SHA prep: fixtures + shot-matrix extension (QA Engineer UI/Layout, 2026-10-19)
Sources: art-ux/reviews/m4-on-checklist.md, the 03:25 addendum and the "L31–55 rows" section. Schema from 4ccb9fd (save v7, PR #44), own clone /tmp/qa-final-prep-4ccb9fd, own node_modules. gate5-pr44/ was not touched.

## Files
- `lib-ext.mjs`: fixture states. Each one is a patch on the build's own fresh save, so the version and checksum always match the SHA under test. `$MAX` resolves to the build's maxLevel, read at runtime from "Level n / MAX".
- `fixtures/*.patch.json` + `SHA256SUMS`: the same patches as static files. The migrated save reuses `../gate5-pr44/fixtures/acdbedc-v6rich.json`, read-only.
- `shoot-ext.mjs <engine> <outdir>`: the extension. Run it after gate5 `run.sh` shots for the same outdir. It appends to `entries-<engine>.jsonl` with `group:"final-prep:*"`, so the unchanged gate5 `manifest.mjs` includes the shots. PNGs go to `<engine>/ext-*.png` and assertions to `ext-probes-<engine>.jsonl`. Filters: env `EXT_GROUPS`, `EXT_STATES` and `SIZES`. Use `EXT_GROUPS`, not `GROUPS`, because GROUPS is a bash builtin and gets ignored.
- `run-ext.sh <sha40> <url> <outdir> [engines]`: one engine × group per hold. Lane 2 if the 1-min load is under 12, otherwise lane 1.
- `validate-4ccb9fd-chromium*/`: the Chromium validation on 4ccb9fd at 360 and 1280.

## Matrix (per engine)
| group | states | sizes | screens | shots |
|---|---|---|---|---|
| max | max-farm, max-collection, max-hens, max-eggvalue, max-all | 360, 1280 docked | target tab (max-all: farm, tracks, collection) | 14 |
| l5x | L50 (F50 MAX, C49), L55 (H55/V55 MAX, F50 C50) | all 4 | upgrades-farm, farm-tracks | 16 (on a build that rejects the save: 8 "rejected" evidence shots) |
| coins | coins-999.96B, coins-1.68T (no basket, customers or workers, so coins stay put) | all 4 | hud | 8 |
| goal | fresh, L10, L30, migrated-acdbedc | all 4 | goal (farm view), upgrades-farm-tracks | 32 |
Total: **70 per engine, 210 for 3 engines.** On 4ccb9fd it's 62 per engine, because l5x gives 8 rejected-evidence shots.

## Assertions
- MAX row:
  - `.maxed` text is `MAX` and visible.
  - No `button.buy` in the row, and no `$` price.
  - aria-label contains "max".
  - A tap on MAX plus Enter and Space leaves the level unchanged.
- Next-goal: `#goal` isn't hidden, and its label is recorded. The label must never name a level above maxLevel (`Farm|Hens|Egg value|Collection L<n>`).
- HUD: `#coins` must equal `$1T` (999.96B) or `$1.68T`, never `1000B`. Every on-screen `$` string is recorded.
- l5x: a cell is skipped and logged "not reachable on this build" when the Farm meta isn't `Level 50 /`, or the save is rejected.

## Added 03:52: HoP cap cases (Farm 50, Hens and Egg value 55; D-HOP-08). Groups `cap` and `c4`.
Fixtures use values read from the build: `$FMAX` (Farm max), `$CMAX` (Collection max) and `$TMAX` (the lower of the Hens and Egg value max), each from that row's "Level n / max" text.
- `farm50` (F=$FMAX, C=$CMAX-1, H=V=$FMAX, $1,000T):
  - Farm shows MAX, with no Buy button and no price.
  - Hens and Egg value each still have a Buy button with a price.
  - The next-goal label matches `Hens|Egg value L51–55`.
  - Shots: upgrades-farm and farm-tracks.
- `farm50-tracks55` (F=$FMAX, C=$CMAX, H=V=$TMAX):
  - Farm, Hens, Egg value and Collection all show MAX, with no price.
  - The next-goal strip reads `data-state=done`.
  - Shots: upgrades-farm and farm-tracks.
- `c4` (farm50 with no eggs, customers or workers): one L50→51 buy each of Hens and Egg value, each on a freshly loaded save.
  - Before and after the buy, it records the HUD coins and each track's level, price and readouts (Eggs/s for Hens, Egg price for Egg value), as raw text and parsed numbers.
  - Shots: before and after for each track.
- Sizes: 360 and 1280 docked, in 3 browsers.
- Extra shots per browser: 4 (farm50) + 4 (farm50-tracks55) + 8 (c4) = **+16, so 86 per browser and 258 total**.
- Guards:
  - If the build's Farm max isn't 50, the case is skipped as `PENDING final SHA`.
  - If the tracks max out at 50 or below, a `kind:"product-question"` line goes in `ext-probes-<engine>.jsonl`. That's a **Product question, not a blocker**: the HoP cap says 55.
- Status: **pending until the final SHA.**
  - 6809f8e (on origin/econ/l30plus and econ/l30plus-v2) is reachable, but its live `balance.json` is still maxLevel 30 with m4.enabled 0. The 50/55 data is only in `data/staging/economy.l30plus.csv` ("Live data/economy.csv and balance.json unchanged"), so a build of 6809f8e can't show these states, and I didn't build it.
  - On 4ccb9fd (Chromium, 360), all three cases skip cleanly as pending (Farm max 30), and max-farm still passes. Evidence is in `validate-4ccb9fd-chromium-cap/`.

## Added 04:13: EXP1, F2, F3, H6 (m4a-spec §11 and checklist 04:13 addendum). Groups `exp1`, `f2`, `f3`, `h6`.
- **exp1** (4 sizes):
  - **migrated-acdbedc** (3 frames: `explainer`, `dismissed`, `reload`):
    - The explainer is located by `[role=dialog][aria-modal=false]` with the title text, falling back to the text `Upgrades got an upgrade!`.
    - The 'Got it' hit box is recorded as width and height. It fails under 44, and also under 48 tall (04:13 addendum).
    - `seenTracksExplainer:true` must be persisted in eggfarm.* localStorage when the explainer is shown.
    - After Got it, the explainer must be gone. It's then checked again after a reload (the G3 log).
    - If the explainer is absent, the case logs `PENDING: explainer not implemented` and takes no shots.
    - The run doesn't pause animations before frame 1, because the explainer auto-dismisses after 8 s.
  - **fresh** (2 frames: `first-open`, `reload`): asserts the explainer is **absent**. Spec M4A-33 says a new farm never sees it, which conflicts with the "fresh first open" wording. I followed the spec; Product/UI should confirm.
- **f2** (L10, 4 sizes, 1 shot): for every Upgrades tab it records the visible pill size, the button size, any absolutely positioned ::before/::after, and the resulting hit box. It fails if the visible height is under 36 or the hit box is under 44.
- **f3** (L10, 4 sizes, 1 shot): finds the 'Best buy' chip and checks for the ★ (a star character or an icon) and the label. There must be exactly one, on the row the next-goal hint points to. If there's none, it logs `status:"missing"` and takes a `chip-missing` shot.
- **h6** (h6 fixture: F10, Hens L9, $5M; sizes 390 and 1280): buys Hens L10, checks the toast matches `Hens L10: bigger coop · offline ×{mult}`, and shoots right after.
- **Shots per browser:** +30 (exp1 20, f2 4, f3 4, h6 2). New totals: **116 per browser, 348 for 3 browsers.** On a build without the explainer, exp1 gives 8 instead of 20.
- **4ccb9fd validation** (Chromium 360 + 390, lane 2 at load 11.55; results in `validate-4ccb9fd-chromium-0413/`):
  - exp1 migrated: PENDING, explainer not implemented.
  - exp1 fresh: passes (the explainer is absent on first open and after reload).
  - f2: **FAILS**. Each tab button is 26 tall with a 24 visible pill, and there's no pseudo-element extending the hit area.
  - f3: Best buy chip **missing** (the hint pointed at Egg value).
  - h6: passes, with the toast `Hens L10: bigger coop · offline ×1.25`.

## 04:17 HoQ rulings (supersede the 04:13 notes above where they differ)
- **F2 is Minor and non-blocking.** It still measures ≥36 visible and ≥44 tap. The verdict is `close` on a pass and `Minor follow-up` on a fail. It never counts as an assert fail. The manifest gets `f2_verdict`, `gate_blocking:false` and `f2_findings`.
- **F3 is a follow-up, non-blocking.** The verdict is `close` or `follow-up (non-blocking)`, recorded with `gate_blocking:false`. F4 has the same label, but it isn't defined in m4-on-checklist.md or this matrix, so it isn't implemented yet. Its definition is needed.
- **Explainer cases per m4a-spec v1.14 (D-HOP-13).** Each case uses a clean context. A MutationObserver counts each insertion of the title node `Upgrades got an upgrade!` and keeps the count in sessionStorage across reloads. The only click before the explainer assert is the boot gate `Tap to start`: no Skip, wbCollect or Got-it clicks. The shot is taken the moment the explainer is visible.
  - **E1 (fresh):** shots on first open and after reload. The explainer must be absent both times, with count 0.
  - **E2 (migrated acdbedc):**
    - Shots: showing, then dismissed, then after reload.
    - The count must be exactly 1.
    - The Got it hit box must be ≥44, and height ≥48.
    - The flag must be persisted when the explainer is shown.
  - **E3 (migrated and committed, but not yet shown):**
    - Starts from the E2 live save after the commit, which has `tracksV7:1` and `v6BackupId`.
    - Removes `seenTracksExplainer` from the state and from `eggfarm.ui`, recomputes the sum, bumps saveSeq, drops `.bak` and clears IndexedDB, then reloads.
    - The explainer must show, then not show again on the next reload, with count exactly 1.
    - Shots: `E3-reload-shows` and `E3-reload2`. The derived save is written to `<outdir>/exp1-E3-derived-<engine>-<size>.json`.
  - **E3 fixture source, coordinated with Saves QA:**
    - 732e70e is a pre-migration v6 F30/C30 save by the Senior Software Architect, not Saves QA. It isn't committed and has no flag, so it can't serve as the committed-unseen state.
    - Saves QA's `m4-guard-baseline-a01faea/m4-fixtures/m4-v6-marked*.json` use the older a01faea marker shape (`tracksV7` is an object, there's no `v6BackupId` or v6_backup record), so they don't fit 4ccb9fd's committed rule (`tracksV7:1` plus a `v6BackupId` that matches `eggfarm.save.v6_backup`).
    - E3 therefore derives its save from the build at run time. Saves QA should confirm or provide a canonical fixture.
- **Shots per browser:** exp1 = (E1 2 + E2 3 + E3 2) × 4 = 28, up from 20. New totals: **124 per browser, 372 for 3 browsers**. Without the explainer it's 104 per browser, since E2 and E3 skip as PENDING.
- **4ccb9fd validation** (Chromium 360; lane 1 at load 20.6; results in `validate-4ccb9fd-chromium-0417/`):
  - E2/E3: PENDING, explainer not implemented.
  - E1: passes (count 0).
  - F2: Minor follow-up (tabs 26 tall, 24 visible).
  - F3: follow-up (chip missing).

## 04:30 updates
- **E3 fixture.**
  - The script prefers Saves QA's canonical `qa/m3-recheck/gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json`. It's used only if its sha256 is listed in `<file>.sha256` or `gate4-fixtures/SHA256SUMS`; otherwise it's logged as REJECTED and the synthetic save is used.
  - The synthetic save follows Saves QA's 04:30 guidance. It keeps `tracksV7:1`, `v6BackupId` and the `eggfarm.save.v6_backup` slot, strips only `seenTracksExplainer` (also from `.bak`, re-summed, and from `eggfarm.ui`), and recomputes the checksum. It doesn't bump saveSeq.
  - IndexedDB is still cleared so a mirror copy with the flag can't win the load. Saves QA, please confirm.
  - The source used is logged in `run-ext-<engine>.log`, in `ext-probes` (`E3fixture`) and in the `exp1-E3-derived-*.json` file. This is coordinated with Saves QA.
- **F4 (next-goal copy), follow-up, non-blocking.** Recorded in the f3 cell as `f4:{label,pattern,match,verdict}` against `★ {Track} L{n} · +X% income`. 4ccb9fd shows `Egg value L10: Large`, which is a follow-up.
- **`PROFILE=A|B` for `run-ext.sh`:**
  - **A**, full L30+ (#45, #46, #47): everything runs.
  - **B**, capped at L30 (rc/m4-t3-capped): the `cap` (farm50, farm50-tracks55), `c4` and `l5x` (L50/L55) cells don't run. Each is written as `N/A by ruling (D-CEO-09 option B)` to `ext-probes` (`kind:"na"`) and `na-by-ruling-<engine>.txt`, and `NOT_RUN-profileB.txt` is built for `NOT_RUN="$(cat …)" node ../gate5-pr44/manifest.mjs`. They go into manifest `not_run`, not as skips.
  - Profile B still runs EXP1 E1–E3, F2/F3/F4, H6, coins, goal, and MAX with the extra assert that max == 30.
  - Shots per browser in B: 124 − 16 (cap+c4) − 16 (l5x) = **92 per browser, 276 for 3 browsers**.
- **Main gate5 run.sh:** the gate5-pr44 copy isn't modified. It takes any SHA as an argument and asserts `meta[name=build-id] == m3-rc1-pre+<sha7>` plus the Settings label. Use `STATES=fresh,L10,L30,migrated-acdbedc` on both A and B (L30 is within the cap). The B preview checks that the label format matches.
- **04:34 E3 default = Saves QA canonical** `gate4-fixtures/EXP1-committed-unseen-4ccb9fd.json` (sha256 de6b0297…6e7961, verified against `gate4-fixtures/SHA256SUMS`).
  - Before boot, the script loads **all** of its `ls` keys (`eggfarm.save`, `.bak`, `.v6_backup`, `install_id`, `telemetry`) and writes `idb.main` into IndexedDB `eggfarm`/`save`/`main`. Then it boots.
  - The synthetic fallback keeps every live key (both backup slots) and strips `seenTracksExplainer` only from main. It recomputes the sum and writes the same stripped main to IndexedDB. Saves QA showed that clearing the backups makes the save read as a fresh farm.
  - Limitation: E3 runs after E2 in the migrated cell, so on a build without the explainer (4ccb9fd) it's PENDING with E2. The canonical load path hasn't been exercised in a browser yet.

## 04:34 EXP1 additions (checklist 04:34 addendum + HoQ). `exp-ext.mjs`; groups `expgate`, `expui`, `expoff`; profiles A and B.
- **expgate** (390, 2 cells × 2 shots). Uses the canonical fixture. The init script emulates the blocked condition:
  - **hidden:** `visibilityState`/`hidden` are overridden to report hidden. Unblocking calls `__qaShow()`, which dispatches `visibilitychange` and `focus`.
  - **readonly:** `localStorage.setItem` for `eggfarm*` throws QuotaExceededError.
    - In 4ccb9fd the read-only paths are `game.readOnly` (newer save or second tab) and `canCommit()` (`!readOnly && !inactive && canWrite()`).
    - The lease is "newest tab owns", so a held lease can't be emulated from a fresh tab. Storage-blocked is used instead.
  - Checks while blocked: no card, `seenTracksExplainer` not set, count 0. Then unblock (visible, or writable plus reload). The card must show, then a reload must leave the count at exactly 1.
  - Note: app.ts:701 `onTracksCommitted` isn't in 4ccb9fd (line 701 is `rates()`), so the trigger is a final-SHA item.
- **expui** (4 sizes × 2 variants × 5 shots: card, after-first-tap, enter-closed, esc-closed, auto-dismissed). Variants: canonical no-refund, and a refund variant derived from it (`state.migrationRefundCents=12345`, re-summed, main + IDB). It's recorded whether the build shows `We refunded +$X for your old upgrades.`, since in 4ccb9fd the refund isn't stored (spec §5: S-4).
  - EXP-a: snapshot, tap an affordable Buy (or the scene), snapshot again. Coins, HUD and levels must not change.
  - EXP-b: focus is on Got it when the card opens. Enter or Esc closes it, and focus returns to `[role=tab][data-tab]` or `[data-nav=upgrades]`.
  - EXP-c: no text with `scrollWidth>clientWidth` (G-strict) and nothing offscreen. Got it is at least 48 tall and 44 wide.
  - Copy matches §11 verbatim. role=dialog, aria-modal=false.
  - The 8 s auto-dismiss is timed, accepted within 7–9.5 s.
  - Reduced motion (emulated): no transform/scale/translate keyframes and no animation over 160 ms. The transition and animation values are recorded.
  - **Spec conflict:** EXP-a says the tap must *not* pass through, while m4a-spec §11 v1.3 says the tap "passes through to the game and is never swallowed". The probe follows the 04:34 addendum (D-CEO-07). Product should confirm.
- **expoff** (390, 1 shot): EXP-d with the flag off. Needs `FLAGOFF_URL` set to an M4-off build such as Latest dd52bfd; without it the cell is PENDING. EXP-d on a new save is E1.
- **Shots per browser:** +45 (expgate 4, expui 40, expoff 1). Totals: **A 169 per browser / 507 for 3**; **B 137 per browser / 411 for 3**.
- **4ccb9fd** (Chromium 390, lane 1 at load 19): all PENDING, since the explainer isn't implemented. In the blocked phase there was no card and no flag.

## 04:46 HoQ EXP1 refinements (expui reworked; A and B; all 3 engines; Saves' canonical fixture)
- **(1) EXP-a, two taps**, for Buy and for Collect (`#scene`), each on a fresh seed. Before tap 1, after tap 1 and after tap 2, it records coins, HUD, basket and F/C/H/V levels.
  - Tap 1 must close the card with **no** change; a change is a MAJOR pass-through. Tap 2 must have an effect.
  - Buy targets an on-screen affordable Buy. On phone sizes there isn't one while the card is open, because the Upgrades sheet is closed. That's recorded as "no target", and Buy is covered at 1280 docked.
- **(2) EXP-b** is unchanged: focus is on Got it when the card opens, Enter or Esc closes it, and focus returns to the Upgrades tab.
- **(3) Toasts held while the card is open.**
  - Trigger: localStorage writes are refused for 3.5 s while the card is open, which provokes the save toast. No toast may be visible during that time, and one must appear after Esc.
  - If no toast appears after close, that's recorded as "trigger may not raise a toast on this build" rather than a fail. The trigger may need swapping for a final-SHA event.
- **(4) Behind Welcome back.** `savedAt` is moved back 1 h (main, `.bak`, IDB; it sits outside the checksum).
  - Welcome back (`#wbCollect`) must show with no card under it. After Collect, the card must appear.
  - The 8 s auto-dismiss is timed **from the card becoming visible** and accepted within 7–9.5 s.
- **(5) EXP-c fit** runs at every size for both refund > 0 and refund = 0 (G-strict `scrollWidth<=clientWidth`, nothing offscreen, Got it ≥48 tall and ≥44 wide).
- **Kept:** expgate (writable and active-tab gating), E1 (never on a new farm), E2 (shows exactly once), E3 (reload before shown).
- **expui shots per cell (11):** card, tap1-buy, tap2-buy, tap1-collect, tap2-collect, enter-closed, esc-closed, toast-after-close, welcome-back-first, card-after-welcome, auto-dismissed. Tap shots are omitted when there's no target.
  - 8 cells per browser → up to 88, compared with 40 before.
  - Totals: **A 217 per browser / 651 for 3; B 185 per browser / 555 for 3** (upper bounds).
