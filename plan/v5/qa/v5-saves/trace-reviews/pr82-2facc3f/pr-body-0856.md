**v5 F3: config wiring, no magic numbers. Adds the `m4.flags.*` block, `m4.zeroGain.confirm`, and the `isPaused` selector** (engineering/m5.0-sizing.md §1 F3, §12.1 D-C1, §12.2, §14 pt 5; engineering/v5-rc-manifest.md row 8 and row 34; HoE QA seam Q8; D-HOP-2026-10-29-05). Manifest row 8.

**Review:** Architect self-review + green gates + Saves QA trace (rule 22: Claude is never a gate); CCR may run later as an optional extra. The earlier CCR review of this PR (at `ecf8297`) is cited below as **no Claude review** (rule 22, ops/claude-verdict-audit-20261030.md: no PASS_ID exists for it; `verify-claude-verdict.sh pr82-ecf8297` → 0 Claude calls; the review file records "Claude calls used: 0/15").

**Base: `rc/v5`** (6bcc194: #77 F1a, #79 F1b and #80 F1c are merged there and merged in here). The PR diff against rc/v5 shows only F3's changes.

## Scope (config only, plus one read-path fix)
- **balance.json `m4.flags`:** `golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, pause, rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2`, **all 0**. `m4.enabled` stays 1. sync-economy `fitM4` keeps the block whole (`keepFlags`): an absent flag becomes 0, and an unknown name or a value other than 0/1 fails the sync.
- **`m4.zeroGain.confirm` = 0** (QA seam Q8). The zero-gain UI spec (`product/collection/m5.1-zero-gain-purchase-ui.md`, sha1 1098f14e, §"m5.zeroGain.confirm") defines it as a balance.json tunable, default false, off in M5.1. sync keeps it (`keepZeroGain`), and validateM5 checks it. `zeroGainConfirmOn(b)` = `flagOn(b,'zeroGainUi') && confirm === 1`.
- **`isPaused(w, b)`** (`src/sim/pause.ts:10`) is now the only read of `Worker.paused`, and it returns false whenever `m4.flags.pause` is 0. Before this, on rc/v5, `src/econ/income.ts` `marketHandStalled` read `w.paused !== true` with no flag gate (HoE, row 8). That read now goes through `isPaused`. A src grep test fails on any other read.
- **`m4.flags.fatigueCue`** is the Rule 2 chip's own cut flag (D-HOP-2026-10-29-05). Default 0.
- **Non-`tc_` CSV columns** `leave_attended_window_s` (30) and `rest_recovery_mult` (0.25) are copied into `m4.tc` (`M5_MAPPED_COLS`). `data/economy.csv` is unchanged.
- **`validateM5()`** (`src/config/m5-rules.ts`) checks flags 0/1 with known names, `zeroGain`, weights summing to 1, gap_min ≤ gap_max, warn < urgent < despawn, 0 < streak_cap ≤ 1, broody cap/shares, stall_hold_s, fatigue clear < min, ability_s ≤ cd, and rest_recovery_mult in [0, 0.35] (finite; 0 is valid per pause spec §6 / AC-P17, D-HOE-20261030-02). Each rule runs only when its keys exist.
- **No-literal-tunables test:** it greps `src/` for `tc.x ?? <n>` fallbacks and for bare numerics in M5 modules. `BROODY_NEST_MAX_CENTS` and `BROODY_SLOTS` (`src/save/m5-fields.ts`) are allowlisted as named save-schema constants (save-schema bounds from F2 #81, not economy tunables; D-HOE-20261030-01), only in that file and only as whole `export const NAME = <number>;` declarations.

## Flags and defaults
Every new flag is 0. `m4.zeroGain.confirm` is 0. Ship values are in the manifest's "Row 34 ship values" table.

## Spec deviations
- **Namespace:** the spec's `m5.flags.zeroGainUi`, `m5.flags.bestBuyV2` and `m5.zeroGain.confirm` are implemented as `m4.flags.zeroGainUi`, `m4.flags.bestBuyV2` and `m4.zeroGain.confirm` (single `m4` namespace: manifest rule 5, rows 28/29).
- **`confirm` is the number 0/1, not a boolean**, because `validateBalance` accepts numeric leaves only.
- **Flag names:** sizing §1's `m4.tc.*_enabled` names are replaced by `m4.flags.*` (HoE D-C1).
- **`isPaused` behaviour change, flag-gated:** with `pause` = 0, a stray `paused: true` is now ignored, and an asleep Market Hand counts as stalled. `tests/m41-p1-live-income.test.ts` now runs its "paused" fixture states with `m4.flags.pause` = 1. The assertions and fixture values are unchanged. No shipped save carries `paused`.

## Tests
- `tests/v5-f3-config.test.ts`: flags block, sync, validateM5, and the no-literal-tunables grep.
- `tests/v5-f3-qa-seam.test.ts`: exact paths and defaults, no `m5` block, zeroGain sync/validate, and **check-release-build rejects `eggfarmQa*`** whether the hook is assigned, aliased or referenced. QA seams stay dev / build:qa only.
- `tests/v5-f3-is-paused.test.ts`: with pause = 0, `paused: true` leaves income byte-identical to the unpaused case (4 moods, and with m4.enabled 0); with pause = 1, `paused` is respected; src grep confirms there's no other `paused` read.

## Depends on
#77, #79, #80.

## Post-CCR delta (past `ecf8297`, no Claude review; all pushed)
- `348cdde` Merge feat/v5-f1c-effects (736d04e, incl. F1b b041561, F1a 172ca3f, rc/v5 d3b5a53 #78): **rc/v5 merge (parent-head restack)**
- `9c6bff6` Merge fix-up: one M5_FLAGS import in tests/v5-f2-m5-fields.test.ts: **merge fix-up (tests only)**
- `84df247` Self-review of manual review notes (no Claude review) N-1/N-2 (D-CEO-20261028-02): QA-seam temp-dir cleanup; verify --flags rejects m4.flags.* ≠ 0/1: **nits from manual review notes (no Claude review)**
- `bba6c79` AC trace + Saves QA gap (V5SCAP): AC ids in test titles; [§9.5-1] M5_MAPPED_COLS pinned: **tags + Saves QA gap**
- `10d1e28` Guard `tc.rest_recovery_mult > 0` + [Pause-§6] test: **production line in src/config/m5-rules.ts (HoE ruling, since superseded by D-HOE-20261030-02; see `36c67de`)**
- `b0b5c7c` Merge feat/v5-f1c-effects (aa0ed32 → F1b 02e7ede → rc/v5 b563c75, #77 merged): **rc/v5 merge (parent-head restack); tree identical to 10d1e28**
- `665bfba` [F3-no-literal] allowlist `BROODY_NEST_MAX_CENTS` + `BROODY_SLOTS` as named save-schema constants (F2 #81; D-HOE-20261030-01): **test-only**
- `36c67de` Relax the `rest_recovery_mult` guard to `>= 0` (finite; pause spec §6, 0 is valid, AC-P17; D-HOE-20261030-02) + [Pause-§6] test: **production line in src/config/m5-rules.ts, per HoE ruling.** Under amended rule 22 the review for this line is Architect self-review + green gates + Saves QA trace; a CCR delta review is optional.
- `dda39fc` Merge origin/rc/v5 (2fa7318, #79 F1b squash-merged): **rc/v5 merge (parent-head restack); rc/v5's tree equals F1b 02e7ede, already contained; conflicts resolved to this branch's side; tree identical to 36c67de**
- `f4648e1` Merge feat/v5-f1c-effects (5dd36d1: F1c test titles/tags only, Saves QA nits): **parent-head restack; tests/v5-f1c-effects.test.ts titles only**
- `2facc3f` Merge feat/v5-f1c-effects (174286e: #80's merge of rc/v5 2fa7318, tree = 5dd36d1): **parent-head restack; tree identical to f4648e1**
- `48b6857` Merge origin/rc/v5 (6bcc194, #80 F1c squash-merged): **rc/v5 merge; conflict in tests/v5-f1c-effects.test.ts resolved to F3's B() helper; `git diff --stat 2facc3f 48b6857` = only #88's tests/bot-m5.test.ts and tests/fixtures/economy-b48be8a4.csv, as on rc/v5**

## AC trace (AC id → file::test)
| AC id | Test |
|---|---|
| D-C1 | tests/v5-f3-config.test.ts::[F3][D-C1] F3 flags block (m4.flags.*, HoE D-C1) |
| §9.5-1 | tests/v5-f3-config.test.ts::[§9.5-1] M5_MAPPED_COLS is exactly the two ruled non-tc_ mappings |
| F3-validate | tests/v5-f3-config.test.ts::[F3-validate] F3 validateBalance M5 rules (rejects …) |
| SS-23 | tests/v5-f3-config.test.ts::[SS-23] tc_stall_hold_s = 0 is the supported kill switch |
| Pause-§6 (D-HOE-20261030-02) | tests/v5-f3-config.test.ts::[Pause-§6] rest_recovery_mult range [0, 0.35] (pause spec §6; D-HOE-20261030-02): 0 and 0.35 pass; negative, NaN, Infinity and 0.4 fail |
| §12.2 | tests/v5-f3-config.test.ts::[F3-no-literal] F3 no literal tunables in src/ |
| D-HOE-20261030-01 | tests/v5-f3-config.test.ts::[F3-no-literal] F3 no literal tunables in src/ > M5 modules carry no bare numeric literal (SAVE_SCHEMA_OK allowlist: BROODY_NEST_MAX_CENTS, BROODY_SLOTS in save/m5-fields.ts) Note: the test title carries no D-HOE-20261030-01 id; the id is in the SAVE_SCHEMA_OK comment and on the allowlist line. |
| row 8 | tests/v5-f3-is-paused.test.ts::[row-8 isPaused] isPaused(w, b) / pause = 1: paused is respected |
| AC-P1 | tests/v5-f3-is-paused.test.ts::[row-8 isPaused][AC-P1] pause = 0: paused:true leaves income byte-identical |
| QA-10 | tests/v5-f3-is-paused.test.ts::[row-8 isPaused][QA-10] every src read of `paused` goes through isPaused |
| Q8 | tests/v5-f3-qa-seam.test.ts::[Q8] Q8 zero-gain paths / [Q8] release gate rejects eggfarmQa* |
| D-HOP-2026-10-29-05 | tests/v5-f3-qa-seam.test.ts::[D-HOP-2026-10-29-05] ships m4.flags.fatigueCue = 0 (Rule 2 chip cut flag, D-HOP-2026-10-29-05) and m4.flags.pause = 0 |

## Gates at 48b6857 (final head; local, 08:39-08:41 CET, node v20.19.2, strict RC cap: targeted vitest, maxWorkers=1, via lane-run)
sync-economy --check 0 · tsc 0 · targeted vitest (v5-f3-config incl. [F3-no-literal], v5-f3-is-paused, v5-f3-qa-seam, v5-f1a/f1b/f1c, v5-f2-*, verify, bot-m5 with the #88 fixture): **13 files, 209/209 passed**.
CI at 48b6857: `ci` run 41021364051 **success** (gate green; release-globals skipped as usual for a non-rc PR).

## Gates at 2facc3f (local, 08:16-08:20 CET, node v20.19.2, strict RC cap: targeted vitest, maxWorkers=1, via lane-run)
sync-economy --check 0 · tsc 0 · `npm run build` (incl. check-release-build, build id m4.1+2facc3f) 0 · check-globals chromium 0 (3× PASS, under flock .browser-test-2.lock) · targeted vitest (v5-f3-config incl. [F3-no-literal], v5-f3-is-paused, v5-f3-qa-seam, v5-f1a/f1b/f1c, v5-f2-*, verify, bot-m5): **13 files, 209/209 passed**. Tree identical to f4648e1.
CI at 2facc3f: `ci` run 41019019230 **success** (gate: unit, slow suites, release build, chromium release globals, build:html, build-id check all green; release-globals skipped as usual for a non-rc PR).

## Gates at f4648e1 (local, 07:59-08:06 CET, node v20.19.2, strict RC cap: targeted vitest, maxWorkers=1, via lane-run)
sync-economy --check 0 · tsc 0 · `npm run build` (incl. check-release-build, build id m4.1+f4648e1) 0 · check-globals chromium 0 (3× PASS, under flock .browser-test-2.lock) · targeted vitest (v5-f3-config incl. [F3-no-literal], v5-f3-is-paused, v5-f3-qa-seam, v5-f1a/f1b/f1c, v5-f2-*, verify, bot-m5): **13 files, 209/209 passed**.

## Gates at 36c67de (local, 07:45-07:55 CET, node v20.19.2, strict RC cap: targeted vitest, maxWorkers=1, via lane-run)
sync-economy --check 0 · tsc 0 · `npm run build` (incl. check-release-build: build id m4.1+36c67de, no QA hooks, globals only eggfarmExportTelemetry) 0 · check-globals chromium 0 (3× PASS, under flock .browser-test-2.lock) · targeted vitest (v5-f3-config incl. [F3-no-literal], v5-f3-is-paused, v5-f3-qa-seam, v5-f1a/f1b/f1c, v5-f2-*, verify, bot-m5): **13 files, 209/209 passed**.
Earlier runs: at 10d1e28 and b0b5c7c the only failure was the [F3-no-literal] save/m5-fields.ts 1e15/12 finding, now ruled and fixed in `665bfba`.



