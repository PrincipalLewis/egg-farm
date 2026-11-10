# v5 #2 streak sim self-review: feat/saves-v5-streak-sim-2 @ 5d2aa04aa08fa85bfe7773aba5eb218cff886bb4 (3 commits: 329fe69 streak sim, 2e8160d tc no-fallback follow-up, 5d2aa04 AC-tagged tests)
Senior Engineer, Saves & Persistence · 2026-10-29 · D-CEO-20261028-02 (self-review; CCR re-review only after a Blocker/Critical/Major).
Base: 406e455 (F2 squash-merged into rc/v5 as #81; origin/rc/v5 is now d3b5a53 = #78, scripts/tests only, no overlap). Cherry-pick of a957fee (first cut on dff771b; identical tree; its commit message still says "Stacks on F2", left as is: no amend). F1a/F1b/F1c (Architect, local ea6b6db/a6b4fe4/e87562c) are NOT on rc/v5 yet.
Size vs 406e455: 15 files, +302 / -36 = 338 changed lines (329fe69: +254/-28; 2e8160d: +53/-20; 5d2aa04: +24/-17 tests only; overlapping lines counted once). Gate: artifacts/v5-streak-sim-5d2aa04/results/ (SHA256SUMS).
Specs: product/collection/m5-streak-tap-coins-spec.md v1.1 §3 (R1-R13a, §3.3 tiers), §5, §6 (K1-K19), §8; sizing §2 #2, §9.5; D-HOP-08 #2;
cap value of record 0.27 (product/decisions.md D-HOP-21, kept by D-HOP-37).

## What it does
- `src/sim/streak.ts` (new, 70 lines): `streakOn`, `creditTap` (R1-R6, R13a), `streakTick` (sim-time credit window; hold/decay and
  run stats on focus seconds only; K18 clamp; decay to 0 ends the run), `streakSaleFactor` (R8 (1 + s); 1 when suspended, R12),
  `streakTier` (§3.3, T_k = round_to_step(cap x k/N)), `streakPeak` / `endStreak` (streak_peak decay | offline | reload),
  `addStreakExtra` (extra_coins), `streakAfter` (moved from F2's m5-fields.ts, re-exported there; same body).
- `src/sim/clock.ts` (new, 21 lines): F1b's focus-clock subset, verbatim (FOCUS_DT_MAX_S, StepClock, FrameClock, focusFrameMs,
  focusTicks, tickClock). `step(…, clock?)` / `advance(…, clock?)` take F1b's signatures; D-C3 first-ceil(focusMs/tick) ticks.
- `payout.ts`: `saleMultipliers(s, b, ctx?)` / `saleValueCents(…, ctx?)` with F1c's `SaleCtx {by, suspended}` shape; the streak
  factor is appended only while live, so flag off returns `[grader]` exactly as before.
- `actions.ts`: `collect` is the only credited-tap source (R3: collectOffline, workers, golden/broody are other actions);
  `collect.credited` and `streak_started` only while on. `sellTo(…, suspended)` (worker sales on unfocused ticks are 1x, K10)
  and adds the streak share of each sale to the run (value − the same sale at s = 0).
- `m5-fields.ts` (F2): `m5Offline` now ends the run with `streak_peak{reason:"offline"}` (the F2 TODO); `streakRun` joins
  M5_SESSION_KEYS. `game.ts`: F1b's `attendedProbe`/`setAttendedProbe` + focus ms into advance(); `endSession` (pagehide)
  emits `streak_peak{reason:"reload"}` before session_end (R11).

## Spec ambiguities resolved (please confirm or overrule)
1. **Cap**: code reads `tc.streak_cap` (no literal). balance.json/CSV still say 0.40 until the Economy CSV PR (manifest row 4)
   lands 0.27; tests pin the ruled 0.27. Not edited here (Economy owns economy.csv; sync --check passes).
2. **G3 columns absent from the CSV** (`tc_streak_unlock_farm`, `tc_tap_credit_min_s`, `tc_streak_tier_count`): since 2e8160d a
   missing key is an error, never a silent 0 or a silently inert streak: `validateBalance` rejects `m4.flags.streak = 1` without
   all seven keys (M5_TC_KEYS), and `tcNum` throws on a missing key at read time. No fallback defaults / magic numbers;
   the v1.1 derivation 1/max_taps_per_s is not used (D-HOP-16 #5 made tap_credit_min_s its own column). Turning the flag on
   therefore requires row 4 (consistent with ST-5: flagged merges are gated on the CSV PR).
3. **streak_peak fields**: value = the run's peak s; duration_s / time_at_cap_s / frenzy_overlap_s = focus seconds (2 dp);
   time at cap = focus time spent at the cap (hold portion), so K5 gives 3 s; **extra_coins = integer cents** (the streak share
   of player + worker sale credits, value − value at s = 0, so a later Frenzy factor isn't attributed to the streak);
   max_tier = streakTier(peak). frenzy_overlap uses F2's `frenzyRemainingS > 0`.
4. **Hidden < 60 s**: frozen exactly (no focus ticks), the credit window still counts down in sim time (R2: hidden sim-time counts).
5. **Reload reason**: emitted from `Game.endSession` (pagehide → session_end flush) without mutating state; s is never saved,
   so the next load starts at 0 (R11).
6. **Attended probe**: default false like F1b, so until the UI (row 17, F6 dialogOpen) calls `setAttendedProbe`, hold/decay
   never run and worker sales get no uplift; player sales do get (1 + s) (a player sale is attended by definition).
7. **Tier hysteresis pops** (§3.3) are UI feedback (row 17); the sim exposes `streakTier()` only. No new event names (T-AC12).
8. `collect.credited` is emitted (true/false) only while the streak is live; the `tap` batch fields (credited, empty_credited,
   bonus_cents) and session_end.credited_taps are the §10.1 telemetry subset piece, not here.

## Findings (all Minor / Nit; none Blocker/Critical/Major)
| # | Sev | Finding | Disposition |
|---|---|---|---|
| m1 | Minor | Merge with F1b/F1c: clock.ts, tick.ts step/advance, game.ts probe, payout SaleCtx overlap theirs (same names/bodies). | Take F1b/F1c; move `streakSaleFactor` into F1c's SALE_EFFECTS as the one streak entry (flag 'streak', factor 1 + s); `sellTo` suspended = F1c's. |
| m2 | Minor | F1a declarations (state/events) duplicated minimally, as in F2. | Take F1a's on merge; keep `streakRun` (session only, add to F1a's M5_SESSION_FIELDS). |
| m3 | Minor | Turning the flag on before row 4 now fails balance load (ambiguity 2). | Intentional (HoE/Architect follow-up); the flag stays 0 until the CSV PR. |
| m4 | Minor | HoE/Architect follow-up: F2's `tc()` read `?? 0`. F3 (#82) is not on origin/rc/v5 (d3b5a53), so `tc()` became `tcNum` (throws) plus a validateBalance check per ON flag (golden: egg_gap_min_s/max_s, frenzy_s; abilities: ability_s, ability_cd_s; streak: 7 keys). `m5Flag` keeps `=== 1 && m4On` (absent flag = off is D-C1, not a hidden tunable). | On F3 merge, switch both to config/flags.ts (`flagOn`, its tc helper). Tests: tcNum, validateBalance per flag/key, drawGap throws. |
| m5 | Minor | The brief said m5-fields.ts re-exports `ensureEvRng`/`EV_RNG_SALT` from sim/rng.ts: not on this base (no sim/rng.ts on rc/v5; F2's own `ensureEvRng` is still the only seeding path). The streak uses no RNG. | Nothing to change here; F1b's sim/rng.ts replaces it on merge. |
| m6 | Minor | F2 test fixtures: `ON` gains the G3 columns (cap 0.27); the game-settle fixture s 0.28 -> 0.27 (K18 clamps above the cap); the m5-fields offline peak now has max_tier 4. | Expected test changes. |
| n1 | Nit | `endSession` twice (pagehide, bfcache restore, pagehide) can send a second reload peak for the same run. | Accept; dashboards key by sid. |
| n2 | Nit | `streakTick` runs every tick (cheap guard `streakOn`); with the flag off it returns its input object. | OK. |
| n3 | Nit | F2's m5-fields test updated: the offline settle now also emits streak_peak (the F2 doc comment promised it). | Expected change. |

## Flag off
Every new path returns its input (or the rc1 event shape) when `m4.flags.streak` is off: `engineering/golden` and the full
unit suite pass unmodified; a test checks step() with/without a clock is identical and no streak keys appear. No SAVE_VERSION bump.


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

Post-restore note (2026-10-30 07:37 CET): 5d2aa04 came back intact after the 23:20 snapshot restore (tree 0e83311f). Before the 23:21 SIGTERM incident tsc, sync-economy, golden, the full unit suite, the F2/streak tests, the three builds, check-globals on 3 engines and rc0 on chromium + firefox all passed. rc0-webkit was killed in flight at 23:21 and is **deferred** until the RC/UI-QA load caps lift; a re-run of the full unit suite is deferred too. Re-verified under the caps: `tsc --noEmit` exit 0; targeted vitest (v5-streak-sim, v5-f2-m5-fields, v5-f2-game-settle, maxWorkers=1) 59/59 passed (`restore-*.log`). Manifest: results/SHA256SUMS sha256 ae6069a4922f3ad4b72a6fd1483b293268c475f7399fd82b90597ed2507a35dc.
