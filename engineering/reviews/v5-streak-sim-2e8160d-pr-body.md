<!-- SUPERSEDED by the 5d2aa04 files (AC-tagged tests + trace table). -->
<!-- Draft PR body for HoE to open: feat/saves-v5-streak-sim-2 -> rc/v5 (Draft). Not opened by Saves. -->
# v5 #2 Collect Streak sim (behind `m4.flags.streak`, default 0)

**Piece:** v5-rc-manifest row 13 (v5-streak-sim) · **Owner:** Senior Engineer, Saves & Persistence
**Base:** `406e455` (F2 #81 on rc/v5; rc/v5 head d3b5a53 adds #78, scripts/tests only)
**Head:** `2e8160d50c83756dd01ef8fc893434287c2cf2b0` (2 commits) · **Size:** 15 files, +295/−36 (331 lines ≤ 400) · **Flag:** `m4.flags.streak` (absent = 0)
**Spec:** m5-streak-tap-coins-spec v1.1 §3/§5/§6/§8 · sizing §2 #2, §9.5 · D-HOP-08 #2 · cap value of record 0.27 (D-HOP-21/37)

## What
- `sim/streak.ts`: credited taps (R1–R5: player Collect only, ≥ tc_tap_credit_min_s of sim time apart, eggs moved or not), hold
  tc_streak_hold_s then decay tc_streak_decay_per_s on **focus time only** (R6/R7/R10/R12), cap from `tc.streak_cap` (K4, K18 clamp),
  §3.3 tiers (`streakTier`, for max_tier and the UI), the (1 + s) sale factor (R8), `streak_started` / `streak_peak` (decay, offline, reload).
- `sim/clock.ts` + `step/advance(…, clock?)` + `Game.setAttendedProbe`: F1b's focus clock subset, verbatim (D-C3 first-n ticks).
- `payout.ts`: `saleMultipliers(s, b, ctx?)` with F1c's `SaleCtx`; worker sales on unfocused ticks are 1x (K10).
- F2 wiring: `m5Offline` (settleHiddenPeriod ≥ 60 s, visible ≥ 60 s frame) ends the run with `streak_peak{reason:"offline"}`;
  pagehide (`endSession`) sends `streak_peak{reason:"reload"}`. All streak state is session only (never saved).
- No UI (row 17). No SAVE_VERSION bump. No economy.csv / balance.json edit.

## Flag off = byte-identical
Goldens (`engineering/golden`) and the full unit suite pass unmodified; every new path returns its input when the flag is off.

## Needs before the flag can go on
- **Economy CSV PR (row 4)**: `tc_streak_unlock_farm`, `tc_tap_credit_min_s`, `tc_streak_tier_count` and `tc_streak_cap` 0.40 → 0.27.
  Without them `validateBalance` rejects `m4.flags.streak = 1` (missing tunables fail at load, never read as 0).
- **UI (row 17)**: call `g.setAttendedProbe(() => !dialogOpen())` (F6); until then hold/decay don't run.

## Merge notes
- F1b/F1c (Architect): take their `sim/clock.ts`, `step/advance` signatures, `attendedProbe`, `SaleCtx`/`sellTo(…, suspended)`;
  the streak becomes ONE `SALE_EFFECTS` entry `{ id: 'streak', flag: 'streak', factor: s => 1 + s.streakS }` (drop the inline hook).
- F1a: take its declarations; keep `tapCreditCdS` + `streakRun` session only.
- F3 (#82): switch `tcNum`/`m5Flag` to config/flags.ts helpers; keep the M5_TC_KEYS validateBalance check (or F3's equivalent).

## Also in this PR: tc no-fallback follow-up (HoE/Architect, commit 2e8160d)
F2's `tc()` defaulted a missing tc_* key to 0. Now `tcNum` (config/formulas.ts) throws, and `validateBalance` requires every tc key an ON
M5 flag reads (`M5_TC_KEYS`). Tests: tcNum, validateBalance per flag/key, `drawGap` throws without `tc_egg_gap_min_s`.

## Tests
`tests/v5-streak-sim.test.ts` (18): credit window (sim time, hidden ticks, K1/K2/K19), unlock/flag-off, missing tc keys (3), cap + K18, tiers,
K5 (0.27 → 0 at 12.0 s, streak_peak decay), ST-AC5 (0.28 → 0 at 12.33 s), K10 freeze + R7 tap-in-decay, D-C3, R8 sale factor +
extra_coins, suspended/flag-off, flag-off identity, offline peak, session-only, Game frames + 5 s hide (K8) + pagehide reload peak.

Gate: `artifacts/v5-streak-sim-2e8160d/results/` (summary.txt, logs, SHA256SUMS).
