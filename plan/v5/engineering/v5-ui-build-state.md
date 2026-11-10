# v5 UI build-state audit (lane U)

**Task:** HoE/v5-ui-build-state  
**When:** 2026-11-10 01:14 CET (Europe/Belgrade)  
**Repo:** `/workspace/egg-farm-studio/game` (GitHub `PrincipalLewis/egg-farm`)  
**RC tip checked:** `origin/rc/v5` = `f20b91839fdf09ba0ed45a890281ccbf7bf2909d` (2026-11-09 23:50 +0100, “Merge pull request #108 … feat/v5-golden-spawn”) after `git fetch`.  
**Plan source:** `engineering/m5-build-plan.md` (lane U rows + F6). Owner column **U** = UI engineer `e80556fd`.  
**Method:** read-only `git grep` / `git show` / `git log` / `git diff` / `git merge-tree` on remote refs; `gh pr list` for open PRs. No push, no checkout mutation.

## Flags on RC tip (D-CEO-20261030-07)

`src/config/balance.json` → `m4.flags` at `f20b918` (all **0**, not 1):

| flag | value |
|---|---|
| golden | 0 |
| streak | 0 |
| tapCoins | 0 |
| abilities | 0 |
| broody | 0 |
| salesStopped | 0 |
| fatigueCue | 0 |
| pause | 0 |
| rc2Refill | 0 |
| autoRefill | 0 |
| clockWage | 0 |
| breeds | 0 |
| zeroGainUi | 0 |
| bestBuyV2 | 0 |

14 named keys present; every value is **0**. Claim “v5 ships all 14 flags at 1” is **false on this tip**. Flag-on AC grading on a full RC is blocked until built rows exist *and* ship-values flip flags under D-CEO-20261030-07.

Merge-train PR numbers used for **IN-TRAIN**: `#111 #118 #120 #124 #126 #100 #117 #116 #119 #121 #123 #125` (Leadership order; post-freeze includes `#117 #116` and bundle bars).

---

## Lane-U rows

| # | Plan row (U scope) | Verdict | Evidence | Hours left (est.) |
|---|---|---|---|---|
| F6 | F6 overlay mount layer (spots / feature registry; golden·broody·streak mount on it) | **ON-BRANCH-UNMERGED** (partial base on RC) | **On RC:** slim attendance only — `src/ui/overlay.ts` @ `f20b918` is 51 lines (“Slim v5 attendance API. No layout, spots, feature registry…”); landed as `bd641ff` (2026-11-05) + `0e9151b`. `app.ts:1` imports `makeDialogOpen, wireAttended` from `./overlay`. **Not on RC:** spots / `registerFeature` / mount host. **Branch:** `origin/feat/v5-ui-f6-overlay` @ `2b4abf930c408c4813aedb6315c559be00458551` (2026-10-29; ahead 18 / behind 79; mb `406e4558`); Draft **#86** (base=`feat/v5-ui-attended`, not `rc/v5`). Diff vs tip: +1826/−76 (42 files), adds `src/ui/overlay.ts` (+181), `features.ts`, `tests/v5-f6-overlay.test.ts`. `features.ts` documents empty registry awaiting `goldenEgg` / `streakMeter` / `broody`. **merge-tree onto rc/v5: CONFLICTS** in ≥25 paths incl. `src/ui/overlay.ts`, `src/game.ts`, `src/sim/*`, `balance.json`. Cleaner sibling: `bundle-f6/feat/v5-ui-f6-overlay` @ `6307674` (conflicts only `overlay.ts` + `check-release-build.mjs`). **Not in merge train.** Related Draft **#85** `feat/v5-ui-attended` @ `2325e2aa` also conflicts heavily; attendance behaviour already on tip via slim path. | **~8 h** — rebase/bundle-f6 path (~2 conflict files) + re-bar F6 tests; full origin/feat rebase would be ~12 h. *Estimate.* |
| 1 | Streak UI + tapCoins (meter/chips UI, A2 pops, +$ pop, F-2) | **MISSING** | **Sim on RC, no UI:** `src/sim/streak.ts`, `src/sim/tap-coins.ts`, `src/sim/income-ref.ts` present at tip; `game.ts:13` / `actions.ts` wire sim. **No UI modules** named `streak-meter` / tap-coin pop anywhere (`git ls-tree --all` empty). `git grep` on `src/ui/` for streak/tapCoins UI symbols → only coop `#meter` (eggs), not streak. No open PR / remote branch for streak UI. `feat/v5-tapcoins` tip = already an ancestor of rc/v5 (ahead 0; sim-only). | **~24 h** — plan sizes streak UI 1.25–1.5 dd + A2 0.5 dd; tapCoins UI still unbuilt after sim (plan tapCoins 1–1.5 dd total, sim landed). *Estimate from plan § row 1.* |
| 2 | Golden (overlay UI, SFX hooks) | **MISSING** (Game plumbing **IN-TRAIN**) | **Sim on RC:** `src/sim/golden.ts`. **IN-TRAIN #111** `feat/v5-golden-game` @ `cf55d44a057d8f7843481219f9ea1eb2602a95b1` (2026-11-09; ahead 16 / behind 0; **merge-tree CLEAN**): Game spawn driver + `setSpotProbe` / `tapGolden` / `driveGolden` in `game.ts`; pure helper `src/ui/golden-spots.ts` (`validSpotIds`); `app.ts` only adds `layoutChanged` listener (L868) — **does not** call `setSpotProbe` or mount egg DOM. `setSpotProbe` used from `tests/v5-golden-game.test.ts` only. **No** `src/ui/golden-egg.ts` / overlay SVG / golden SFX hooks on any branch. F6 `features.ts` still expects a future `registerFeature(goldenEgg)`. | **~18 h** UI overlay+SFX (plan UI 2–2.5 dd) after F6 lands; #111 Game bar is separate train work. *Estimate.* |
| 3 | Breeds (Flock sheet UI) | **ON-BRANCH-UNMERGED** | **Not on RC** `src/ui/` (no `breeds-*.ts`). **Local (no open GitHub PR):** `v5/breeds-ui-a` @ `4737eb7c5042dcc13fb4f4e096480163dd498d09` (2026-11-10 01:09; ahead 8 / behind 0; **merge-tree CLEAN**) — `src/ui/breeds-ui.ts`, `breeds-mount.ts`, `breeds-adapter.ts`, assets, `tests/v5-breeds-ui.test.ts` (+1752/−7). `feat/v5-breeds-ui-prB` @ `c7bb73df5231f7422eecafd07c264f85932a2227` (+2893/−7; CLEAN) adds HUD/strip/yard/ext-b. Waiting on Vadim yes for PR-A push; binding to Saves `#126` `familyClamp` is a follow-up. `gh pr list` shows no breeds-UI PR (only Saves `#120/#124/#125/#126`). | **~8 h** — open/stack PR-A, clamp-bind follow-up, one bar; bulk UI already written locally. *Estimate.* |
| 5 | Pause (toggle/banner UI) | **MISSING** | **Sim on RC:** `src/sim/pause.ts`, load sanitiser in `save/m5-fields.ts`, `isPaused` used in econ/abilities. **No** pause toggle / pause banner in `src/ui/` (`grep` for `pauseToggle` / `data-paused` / break toggle → empty; only save-recovery “Saving is paused” copy). **#121** `feat/v5-workers-ui-drift` @ `2e48305e` is IN-TRAIN but only Manage-N / resume-reserve drift vs `isPaused` — not the toggle/banner UI. | **~8 h** — plan UI 0.75–1 dd. *Estimate.* |
| 7 | Abilities (4b card / Activate-all UI, 4c sheet auto-close) | **IN-TRAIN** | **Sim on RC:** `src/sim/abilities.ts` (`activateAll`, eligibility). **PR #116** `feat/v5-abilities-ui` @ `629ab76d0c529497591498bd0c716e82b405bcf6` (2026-11-06; ahead 9 / behind 10): new `src/ui/abilities-ui.ts` (224 lines), `app.ts` Activate-all + card calls, `workers-ui.ts` hooks, icons, `tests/v5-abilities-ui.test.ts` (+854/−12). **merge-tree onto rc/v5: CONFLICT** only `src/sim/actions.ts`. In train (post-freeze full re-bar per HoQA). 4c sheet auto-close present in `app.ts` (`onActivateAll` / close-sheet path). | **~3 h** — resolve `actions.ts` conflict + hosted CI / QA bar. *Estimate.* |
| 8 | Broody (yard UI, glow) | **MISSING** | **No** `src/sim/broody*.ts` on tip (only save fields `broodyNestCents` / `broodyHenIdx` in `m5-state.ts`, brRng). **No** broody UI module on any branch; `public/assets/` on tip has `icon-nest.svg` / `nest-eggs.svg` only — **not** `overlay-broody-nest.svg`. Art file exists outside repo at `/workspace/egg-farm-studio/art-ux/assets/overlay-broody-nest.svg` (sha1 7de37176, FINAL Oct 24) — copy is part of the yard-UI PR. Assigned to Generalist after `gen/breeds-telemetry`; no broody-ui branch yet. | **~10 h** yard UI+glow once sim exists (plan feature 2.25–2.5 dd total; UI share ~1 dd) + asset copy. *Estimate; blocked on Architect broody sim.* |
| 9 | zeroGainUi | **BUILT** | On tip: `src/ui/zero-gain.ts` (50 lines), wired in `src/ui/app.ts:25,54–55,247,269,507,581,591–622`, styles `src/ui/styles.css:655+`, tests `tests/zg-ui*.test.ts`. Landed `#97` `0ad018d` + follow-up `#99` `30df38c`. Flag still **0** (code present, gated). | **0 h** |
| 11 | salesStopped + fatigueCue (Sales-stopped chip, HUD cue) | **MISSING** | **On RC (not the chip):** `salesStopped()` selector `src/econ/income.ts:83`; header aria “, sales stopped” via `s2-economy-ui.ts:16–30` + `app.ts:639`; worker-card “sales stopped” banner copy in `workers-ui.ts:95–105` (role/mood only). Telemetry schema only: `sales_stall` / `fatigue_cue_shown` / `fatigue_cue_tapped` in `telemetry/schema.ts:169–176`. **No** V51-SS-1 chip UI, **no** fatigueCue HUD cue DOM in `src/ui/` or any open PR head (`gh` heads `#111/#116/#121/#100/#119/#85/#86` grepped empty). | **~20 h** — plan 1.75–2.0 dd + fatigueCue 0.5–0.75 dd; Art flow still a dep. *Estimate.* |

### Related (not a plan U row, noted for freeze)

| Item | Verdict | Note |
|---|---|---|
| workers-ui drift D1/D2 | IN-TRAIN #121 | Pause-aware Manage N / reserve; not pause toggle UI. merge-tree CLEAN onto rc/v5. |

---

## Counts & hours

| Verdict | Rows (plan U + F6) |
|---|---|
| BUILT | 1 (zeroGainUi) + F6a slim attendance (counted under F6 as partial, not a separate plan row) |
| IN-TRAIN | 1 (abilities #116); golden Game plumbing #111 supports row 2 but overlay still MISSING |
| ON-BRANCH-UNMERGED | 2 (F6 overlay spots half; Breeds Flock UI local) |
| MISSING | 5 (Streak/tapCoins UI; Golden overlay UI; Pause toggle/banner; Broody yard UI; salesStopped chip + fatigueCue) |

**Strict row tally (9 rows: F6 + ranks 1,2,3,5,7,8,9,11):**  
BUILT **1** · IN-TRAIN **1** · ON-BRANCH-UNMERGED **2** · MISSING **5**.

**Total estimated hours left (U scope):** **~99 h** (8+24+18+8+8+3+10+0+20). Marked estimates; F6/Breeds/Abilities assume existing branches land; Streak/Golden/Pause/Broody/SS assume greenfield UI.

---

## What blocks AC grading on a full RC

1. **All `m4.flags` are 0** on `f20b918` — flag-on ACs (ST/GE/BR/PA/M5A/BH/ZG/SS) cannot pass a “flags at 1” RC until ship-values + O-3/X1 stack.  
2. **Mount dependency:** Golden overlay, Broody yard, and Streak meter need **F6 spots/registry** (still unmerged, conflicted).  
3. **Missing UI blocks their gates:** ST-AC\* (UI), GE overlay/SFX ACs, AC-P\* toggle/banner, BH yard/glow (and broody **sim** absent), SS-1–35 chip + fatigueCue.  
4. **In flight but not on RC tip:** Abilities UI (#116) and Breeds Flock UI (local) — ACs need merge + flag 1.  
5. **Only zeroGainUi** is built on tip today; even it grades flag-on only after `zeroGainUi` → 1 (confirm strip stays off while `m4.zeroGain.confirm=0`).

---

## 5-line summary

1. **Rows audited:** 9 (F6 + U ranks 1, 2, 3, 5, 7, 8, 9, 11) at `origin/rc/v5` `f20b918`.  
2. **Verdicts:** BUILT 1 (zeroGainUi) · IN-TRAIN 1 (abilities #116) · ON-BRANCH-UNMERGED 2 (F6 overlay, Breeds UI local) · MISSING 5 (streak/tapCoins UI, golden overlay, pause UI, broody UI, salesStopped+fatigueCue).  
3. **Flags:** all 14 `m4.flags` are **0** on tip (not 1).  
4. **Est. hours left:** ~99 h U work (see table).  
5. **AC blockers on full RC:** F6 unmerged + five missing UIs + breeds/abilities not on tip + flags still 0; only zeroGainUi is gate-ready on the tree today.
