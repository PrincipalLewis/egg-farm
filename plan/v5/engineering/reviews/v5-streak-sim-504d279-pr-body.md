<!-- Draft PR body for HoE to open: feat/saves-v5-streak-sim-2 -> rc/v5 (Draft). Not opened by Saves. -->
# v5 #2 Collect Streak sim (behind `m4.flags.streak`, default 0)

**Piece:** v5-rc-manifest row 13 (v5-streak-sim) · **Owner:** Senior Engineer, Saves & Persistence
**Base:** `origin/rc/v5` b563c75 (#77 F1a), merged in by 504d279 (no rebase)
**Head:** `504d279a91703c1c5e87e543f4568270c2a105c2` (329fe69 streak sim, 2e8160d tc no-fallback, 5d2aa04 AC tags, 504d279 merge of rc/v5 b563c75) · **Size:** 14 files, +302/−35 (337 lines ≤ 400; no SAVE_VERSION change) · **Flag:** `m4.flags.streak` (absent = 0)
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

## AC trace (QA-D-1029-V5SCAP; spec: product/collection/m5-streak-tap-coins-spec.md v1.1 §9)
Test names start with the AC ids they cover. F2's tests (`tests/v5-f2-*.test.ts`) changed fixtures only (no new tests).

| AC | Test (file :: name) | Note |
|---|---|---|
| ST-AC1 | `tests/v5-streak-sim.test.ts` :: ST-AC1, ST-AC29: below the unlock farm or with the flag off: no credit and the rc1 collect event | s part only; the tap-coin part is the tapCoins PR |
| ST-AC2 | `tests/v5-streak-sim.test.ts` :: ST-AC2: a Collect at F >= unlock credits +per_tap, restarts the hold, starts the window and emits streak_started once | s = 0.01 + streak_started; coins and meter are tapCoins / UI |
| ST-AC3 | `tests/v5-streak-sim.test.ts` :: ST-AC16c, ST-AC3, ST-AC4: the window is sim time, hidden ticks included (R2/K1/K19); credited even when the coop is empty (K2) | credit rate ≤ 1 per tc_tap_credit_min_s; coins part is tapCoins |
| ST-AC4 | `tests/v5-streak-sim.test.ts` :: ST-AC16c, ST-AC3, ST-AC4: (same test) | empty coop still credited; empty_credited is the telemetry subset |
| ST-AC5 | `tests/v5-streak-sim.test.ts` :: ST-AC5: s = 0.28 reaches 0 at 12.33 s of focus; ST-AC5, ST-AC28: K5 stop at the cap: … streak_peak{reason:"decay"} | peak fields at cap 0.27 |
| ST-AC6 | `tests/v5-streak-sim.test.ts` :: ST-AC13, ST-AC6: K10/R12 unfocused ticks freeze s and the hold; a credited tap during decay stops it and restarts the hold (R7) |  |
| ST-AC7 | `tests/v5-streak-sim.test.ts` :: ST-AC7: player sale and preview get (1 + s); extra_coins accrues the streak share only | Grader x (1+s); the Frenzy factor arrives with #1/F1c |
| ST-AC11 | `tests/v5-streak-sim.test.ts` :: ST-AC11: §3.3 tiers T_k = round_to_step(cap x k/4) from config (0.27 and 0.40); max_tier | thresholds only; copy/meter are UI |
| ST-AC12 | `tests/v5-streak-sim.test.ts` :: ST-AC12: a >= 60 s gap: streak_peak{reason:"offline"} …; ST-AC12: the run stats are session only (never saved); ST-AC12a, ST-AC12, ST-AC13: Game: … pagehide sends streak_peak{reason:"reload"} |  |
| ST-AC12a | `tests/v5-streak-sim.test.ts` :: ST-AC12a, ST-AC12, ST-AC13: Game: attended frames decay, unattended frames and a 5 s hide freeze (K8); pagehide … |  |
| ST-AC13 | `tests/v5-streak-sim.test.ts` :: ST-AC13, ST-AC6 (K10); ST-AC13: D-C3 (R12) only the first ceil(focusMs/tick) ticks …; ST-AC13, ST-AC29: suspended (unfocused tick) and flag off: …; ST-AC12a, ST-AC12, ST-AC13: Game … | sim side (frozen s/hold, worker sales 1x); menu types are UI (attended probe) |
| ST-AC14 | `tests/v5-streak-sim.test.ts` :: ST-AC14: a Coop Hand collect and the welcome-back Collect are never credited (R3) | synthetic click / guarded tab / golden / Broody taps are UI or other PRs |
| ST-AC16c | `tests/v5-streak-sim.test.ts` :: ST-AC16c, ST-AC3, ST-AC4: (same test as ST-AC3) | 3 s stall catch-up: sim-time window only |
| ST-AC18 | `tests/v5-streak-sim.test.ts` :: ST-AC18: tcNum throws …; ST-AC18: validateBalance rejects a flag that is on without every tc key it reads …; ST-AC18: the F2 readers throw … | all streak values from tc_*; missing key caught (HoE/Architect follow-up) |
| ST-AC28 | `tests/v5-streak-sim.test.ts` :: ST-AC28: caps at tc_streak_cap exactly (K4), and K18 clamps a lowered cap …; ST-AC5, ST-AC28: K5 … | oracles read tc_streak_cap |
| ST-AC29 | `tests/v5-streak-sim.test.ts` :: ST-AC29: flag off: step with or without a clock is identical, and no streak fields appear; ST-AC1, ST-AC29; ST-AC13, ST-AC29 | streak=0 path; tapCoins half is the tapCoins PR; f90d1678 golden in engineering/golden (gate) |
| ST-AC2b, ST-AC2c, ST-AC15, ST-AC16, ST-AC16b, ST-AC16d, ST-AC16e, ST-AC17, ST-AC17b | **not covered** | tap coins / I_ref (tapCoins + sim/income-ref.ts): not in this PR |
| ST-AC8 | **not covered** | golden cash, tap coins and the Broody nest don't exist on this base; the factor only enters saleMultipliers (R9 by construction). Covered by those PRs |
| ST-AC9, ST-AC10, ST-AC10b, ST-AC21, ST-AC22, ST-AC24, ST-AC25, ST-AC26, ST-AC26b, ST-AC27 | **not covered** | UI / sound (row 17); the sim exposes streakS and streakTier() |
| ST-AC19, ST-AC20 | **not covered** | telemetry subset piece (tap.credited, session_end fields): later Saves task |
| ST-AC23 | **not covered** | Economy G1 sim (bot-m5), not a unit test |
| ST-AC30 | **not covered** | Broody / flutter actions don't exist on this base (Broody PR) |

## Tests
`tests/v5-streak-sim.test.ts` (19): credit window (sim time, hidden ticks, K1/K2/K19), unlock/flag-off, missing tc keys (3), ST-AC14 not credited, cap + K18, tiers,
K5 (0.27 → 0 at 12.0 s, streak_peak decay), ST-AC5 (0.28 → 0 at 12.33 s), K10 freeze + R7 tap-in-decay, D-C3, R8 sale factor +
extra_coins, suspended/flag-off, flag-off identity, offline peak, session-only, Game frames + 5 s hide (K8) + pagehide reload peak.

Gate: `artifacts/v5-streak-sim-504d279/results/` (summary.txt, tsc.log, vitest-targeted.log, diffstat.txt, SHA256SUMS). Pre-merge gate: `artifacts/v5-streak-sim-5d2aa04/results/`.

### Merge of rc/v5 b563c75 (#77 F1a), 2026-10-30 07:44 CET
Conflicts in 3 files, resolved to F1a's single declarations:
- `src/save/m5-fields.ts`: took F1a's `M5Flag`/`flagOn` (`m5Flag` = `flagOn`) and `M5_SESSION_KEYS = M5_SESSION_FIELDS` (CCR m1 pin, 8 spec keys); kept `tcNum` (no silent 0) and the `sim/streak` imports. `streakRun` is not an F1a field, so `m5Persist` strips `[...M5_SESSION_KEYS, 'streakRun']` (private `SESSION_ONLY_KEYS`).
- `src/sim/events.ts`: took F1a's (`collect` with `credited`/`bonus_cents`; `streak_started`/`streak_peak` now in `M5SimEvent`). Our duplicate members dropped.
- `src/sim/state.ts`: took `GameState extends M5Fields`; dropped our inline F2 field block; kept only `streakRun?: StreakRun` (session only).
Test names and the trace table above are unchanged (tests/v5-streak-sim.test.ts is untouched by the merge).

**Verification under the RC/UI-QA load caps:** `tsc --noEmit` exit 0; targeted vitest (v5-streak-sim, v5-f2-m5-fields, v5-f1a-fields, v5-f2-game-settle, v5-f2-roundtrip, v5-f2-downgrade; maxWorkers=1) 78/78 passed. **Pending until the load caps lift:** the full unit suite, golden, builds, check-globals and rc0 on 3 engines (chromium, firefox, webkit) on this head. On 5d2aa04 everything but rc0-webkit (killed at 23:21) passed before the incident.
