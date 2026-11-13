**v5 F3: config wiring, no magic numbers. Adds the `m4.flags.*` block, `m4.zeroGain.confirm`, and the `isPaused` selector** (engineering/m5.0-sizing.md §1 F3, §12.1 D-C1, §12.2, §14 pt 5; engineering/v5-rc-manifest.md row 8 and row 34; HoE QA seam Q8; D-HOP-2026-10-29-05). Draft. Manifest row 8.

**Stacked on #80 (F1c) → #79 (F1b) → #77 (F1a).** The base is `feat/v5-f1c-effects`, so this diff shows only F3's commits: `e743462`, `60ca5e4` and `c5b0371`. ci.yml's `pull_request` trigger has no branch filter, so CI runs on this base as well. Merge after #77, #79 and #80. GitHub retargets this PR to `rc/v5` when `feat/v5-f1c-effects` is merged and deleted.

## Scope (config only, plus one read-path fix)
- **balance.json `m4.flags`:** `golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, pause, rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2`, **all 0**. `m4.enabled` stays 1. sync-economy `fitM4` keeps the block whole (`keepFlags`): an absent flag becomes 0, and an unknown name or a value other than 0/1 fails the sync.
- **`m4.zeroGain.confirm` = 0** (QA seam Q8). The zero-gain UI spec (`product/collection/m5.1-zero-gain-purchase-ui.md`, sha1 1098f14e, §"m5.zeroGain.confirm") defines it as a balance.json tunable, default false, off in M5.1. sync keeps it (`keepZeroGain`), and validateM5 checks it. `zeroGainConfirmOn(b)` = `flagOn(b,'zeroGainUi') && confirm === 1`.
- **`isPaused(w, b)`** (`src/sim/pause.ts:10`) is now the only read of `Worker.paused`, and it returns false whenever `m4.flags.pause` is 0. Before this, on rc/v5, `src/econ/income.ts` `marketHandStalled` read `w.paused !== true` with no flag gate (HoE, row 8). That read now goes through `isPaused`. A src grep test fails on any other read.
- **`m4.flags.fatigueCue`** is the Rule 2 chip's own cut flag (D-HOP-2026-10-29-05). Default 0.
- **Non-`tc_` CSV columns** `leave_attended_window_s` (30) and `rest_recovery_mult` (0.25) are copied into `m4.tc` (`M5_MAPPED_COLS`). `data/economy.csv` is unchanged.
- **`validateM5()`** (`src/config/m5-rules.ts`) checks flags 0/1 with known names, `zeroGain`, weights summing to 1, gap_min ≤ gap_max, warn < urgent < despawn, 0 < streak_cap ≤ 1, broody cap/shares, stall_hold_s, fatigue clear < min, ability_s ≤ cd, and rest_recovery_mult ≤ 0.35. Each rule runs only when its keys exist.
- **No-literal-tunables test:** it greps `src/` for `tc.x ?? <n>` fallbacks and for bare numerics in M5 modules.

## Flags and defaults
Every new flag is 0. `m4.zeroGain.confirm` is 0. Ship values are in the manifest's "Row 34 ship values" table.

## Spec deviations
- **Namespace:** the spec's `m5.flags.zeroGainUi`, `m5.flags.bestBuyV2` and `m5.zeroGain.confirm` are implemented as `m4.flags.zeroGainUi`, `m4.flags.bestBuyV2` and `m4.zeroGain.confirm` (single `m4` namespace: manifest rule 5, rows 28/29).
- **`confirm` is the number 0/1, not a boolean**, because `validateBalance` accepts numeric leaves only.
- **Flag names:** sizing §1's `m4.tc.*_enabled` names are replaced by `m4.flags.*` (HoE D-C1).
- **`isPaused` behaviour change, flag-gated:** with `pause` = 0, a stray `paused: true` is now ignored, and an asleep Market Hand counts as stalled. `tests/m41-p1-live-income.test.ts` now runs its "paused" fixture states with `m4.flags.pause` = 1. The assertions and fixture values are unchanged. No shipped save carries `paused`.

## Goldens and gates (local, HEAD c5b0371)
Flag-off golden `f90d1678` and M4-on golden `a54c9cf9` are byte-identical (engineering/golden 4/4, and verify.test re-derives both).
Results: sync-economy --check 0 · tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1639 passed / 1 skipped (1640) · goldens 4/4 · `npm run build` (incl. check-release-build) 0 · `npm run build:html` 0 · check-globals chromium 0 (3× PASS, under flock .browser-test-2.lock).
CI: the `gate` job skips Drafts, so it runs when this PR is marked Ready.

## Tests
- `tests/v5-f3-config.test.ts`: flags block, sync, validateM5, and the no-literal-tunables grep.
- `tests/v5-f3-qa-seam.test.ts`: exact paths and defaults, no `m5` block, zeroGain sync/validate, and **check-release-build rejects `eggfarmQa*`** whether the hook is assigned, aliased or referenced. QA seams stay dev / build:qa only.
- `tests/v5-f3-is-paused.test.ts`: with pause = 0, `paused: true` leaves income byte-identical to the unpaused case (4 moods, and with m4.enabled 0); with pause = 1, `paused` is respected; src grep confirms there's no other `paused` read.

## Depends on
#77, #79, #80.

## Update 2026-10-29 21:4x CET: merged #80 (incl. rc/v5 406e455 #81 F2 and the D-HOP-2026-10-29-06 rulings), head ecf8297
- Merged, not rebased (no force-push). No textual conflicts.
- Semantic fix-up in F2's `tests/v5-f2-m5-fields.test.ts` for this PR's shipped flags block: "shipping balance has no m4.flags" now asserts the block exists with every `M5_FLAGS` entry 0 (exact `toEqual`, same intent: every flag off), and the non-1 `golden: true` case spreads the shipped flags so it type-checks. F2 src unchanged.
- Row 34 ship values are now fixed numbers (manifest): 1 for golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, rc2Refill, autoRefill, clockWage, zeroGainUi, pause; 0 for bestBuyV2, breeds; `m4.zeroGain.confirm` 0. balance.json dev defaults are unchanged (all 0).
Gates at ecf8297: sync --check 0 · tsc 0 · vitest (--minWorkers=1 --maxWorkers=2) 1691 passed / 1 skipped · goldens f90d1678 / a54c9cf9 byte-identical (4/4) · build + check-release-build 0 · build:html 0 · check-globals chromium 0 (3× PASS, flock .browser-test-2.lock, load ≤ 12).
