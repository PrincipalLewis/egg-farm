<!-- Draft PR body for HoE to update on #87: feat/saves-v5-streak-sim-2 -> rc/v5 (Draft). Not pushed by Saves. -->
# v5 #2 Collect Streak sim (behind `m4.flags.streak`, default 0)

**Piece:** v5-rc-manifest row 13 (v5-streak-sim) · **Owner:** Senior Engineer, Saves & Persistence · **PR:** #87 (Draft)
**Base:** `origin/rc/v5` 2fa7318 (#79 F1b), merged in by 5573593 (no rebase)
**Head:** `14894bd32fdb072f5f54369bce677853e6b53962` (… 504d279 merge of #77, 5573593 merge of #79, 14894bd Saves QA #87 fixes) · **Size vs rc/v5:** 14 files, +295/−29 (324 lines ≤ 400; no SAVE_VERSION change) · **Flag:** `m4.flags.streak` (absent = 0 = off)
**Spec:** product/collection/m5-streak-tap-coins-spec.md **v1.3.2 sha1 acb4cdbb** (v1.3.2 changes the QA oracle only, §9.1) · **Plan:** qa/m5/test-plan-streak-tap-coins.md **v0.8 sha256 403c2c46…6772** (frozen on spec v1.3.1 895ca903) · sizing §2 #2, §9.5 · D-HOP-08 #2
**Cap of record (v5): 0.28** while `m4.flags.breeds` = 0 (D-HOP-2026-10-29-08 (1) + 22:58 addendum; CSV 8dc90e2b). 0.27 applies only if Breeds ships (the breeds PR carries it).

## What
- `sim/streak.ts`: credited taps (R1–R5: player Collect only, ≥ tc_tap_credit_min_s of sim time apart, eggs moved or not), hold
  tc_streak_hold_s then decay tc_streak_decay_per_s on **focus time only** (R6/R7/R10/R12), cap from `tc.streak_cap` (K4, K18 clamp),
  §3.3 tiers (`streakTier`), the (1 + s) sale factor (R8), `streak_started` / `streak_peak` (decay, offline, reload).
- Focus clock: **#79's** `sim/clock.ts`, `step/advance(…, clock?)` and `Game` focus path are used as merged (our copy dropped). The streak
  hold/decay is ONE `TimerSystem` in `sim/timers.ts` `TIMER_SYSTEMS` (runs in `stepTimers`, only while an M5 flag is on).
- `payout.ts`: `saleMultipliers(s, b, ctx?)` with F1c's `SaleCtx {by, suspended}` shape; `sellTo` always passes `{by, suspended}`;
  worker sales on unfocused ticks are 1x (K10/R12).
- F2 wiring: `m5Offline` (≥ 60 s) ends the run with `streak_peak{reason:"offline"}`; pagehide (`endSession`) sends
  `streak_peak{reason:"reload"}`. All streak state is session only (never saved; `streakRun` stripped with M5_SESSION_FIELDS).
- No UI (row 17). No SAVE_VERSION bump. No economy.csv / balance.json edit.

## Flag off = byte-identical
`stepTimers` doesn't run with every m4.flags.* off; every streak path returns its input when the flag is off (ST-AC29 tests).
Saves QA ran the full unit suite at 504d279: 122 files, 1652 passed / 1 skipped.

## Needs before the flag can go on
- **Economy CSV PR (row 4)**: `tc_streak_unlock_farm`, `tc_tap_credit_min_s`, `tc_streak_tier_count` and `tc_streak_cap` 0.40 → **0.28**
  (CSV 8dc90e2b). Without them `validateBalance` rejects `m4.flags.streak = 1` (missing tunables fail at load, never read as 0).
- **UI (row 17)**: `g.setAttendedProbe(() => !dialogOpen())` (F6); until then hold/decay don't run.

## Merge notes
- #79 merged in at 5573593: conflicts in game.ts, m5-fields.ts, sim/clock.ts (add/add), sim/tick.ts, all resolved to #79's code;
  streak moved into `TIMER_SYSTEMS`. `tests/v5-f1b-clock-rng.test.ts` D-C2 streak-on case now carries the G3 tc columns (the streak
  flag requires them; FYI Architect).
- **#80 (F1c) is not on rc/v5 yet**: on merge, the streak becomes ONE `SALE_EFFECTS` entry `{ id: 'streak', flag: 'streak', factor: s => 1 + s.streakS }`
  (drop the inline payout hook); Saves QA asks for a full re-check of that head.
- F3 (#82): switch `tcNum`/`m5Flag` to config/flags.ts helpers.

## AC trace (QA-D-1029-V5SCAP; plan v0.8 403c2c46; all in `tests/v5-streak-sim.test.ts`)
| AC | Test name(s) | Note |
|---|---|---|
| ST-AC1 | ST-AC1, ST-AC29: below the unlock farm or with the flag off: no credit and the rc1 collect event | s part; tap-coin part is row 14 |
| ST-AC2 | ST-AC2: a Collect at F >= unlock credits +per_tap, restarts the hold, starts the window and emits streak_started once | |
| ST-AC3, ST-AC4, ST-AC16c | ST-AC16c, ST-AC3, ST-AC4: the window is sim time, hidden ticks included (R2/K1/K19); credited even when the coop is empty (K2) | |
| ST-AC5 | ST-AC5: K5 stop at the cap of record 0.28: hold 3 s, -0.03/s, 0 at 12.33 +-0.1 s, one streak_peak{value:0.28, reason:"decay", max_tier:4} | cap 0.28 |
| ST-AC6 | ST-AC13, ST-AC6: K10/R12 unfocused ticks freeze s and the hold; a credited tap during decay stops it and restarts the hold (R7) | |
| ST-AC7 (**partial**) | ST-AC7: player sale and preview get (1 + s); extra_coins accrues the streak share only · ST-AC7: player Sell and Sell all at x 0.01/0.14/0.28, Grader none/tier 3: (1 + s) on every sale, rounded once per sale · ST-AC7, ST-AC13: Market Hand sales on a focus tick get (1 + s); on an unfocused tick 1x (R8/R12) | covered: player Sell, Sell all, Market Hand × x {0.01, 0.14, 0.28} × Grader {1, tier 3}, one rounding; kills S5. Not covered: see below |
| ST-AC11 | ST-AC11: §3.3 tiers T_k = round_to_step(cap x k/4) from config: cap of record 0.28 and 0.40; Breeds on (cap 0.27); max_tier | 0.07/0.14/0.21/0.28; 0.40 config case; 0.27 = Breeds on only |
| ST-AC12 | ST-AC12: a >= 60 s gap: streak_peak{reason:"offline"} …; ST-AC12: the run stats are session only (never saved); ST-AC12a, ST-AC12, ST-AC13: Game … | 60.0 s boundary also in F2's v5-f2-game-settle |
| ST-AC12a | ST-AC12a, ST-AC12, ST-AC13: Game: attended frames decay, unattended frames and a 5 s hide freeze (K8); pagehide sends streak_peak{reason:"reload"} | |
| ST-AC13 | ST-AC13, ST-AC6 (K10) · ST-AC13: D-C3 (R12) only the first ceil(focusMs/tick) ticks of a frame carry focus · ST-AC7, ST-AC13 (MH unfocused 1x) · ST-AC13, ST-AC29: suspended (unfocused tick) and flag off … · ST-AC12a, ST-AC12, ST-AC13: Game … | sim side; menu types are UI |
| ST-AC14 | ST-AC14: a Coop Hand collect and the welcome-back Collect are never credited (R3) | synthetic click / guarded tab = UI |
| ST-AC18 | ST-AC18: tcNum throws on a missing or non-finite key · ST-AC18: validateBalance rejects a flag that is on without every tc key it reads … · ST-AC18: the F2 readers throw instead of defaulting … | |
| ST-AC29 | ST-AC29: flag default 0 = off: the shipping balance, an absent streak key and streak: 0 are all off · ST-AC29: flag off: step with or without a clock is identical, and no streak fields appear · ST-AC1, ST-AC29 · ST-AC13, ST-AC29 | kills S1a in the streak file |
| (no AC) | K4/K18: caps at tc_streak_cap exactly (K4), and K18 clamps a lowered cap on the next tick with no event | was tagged ST-AC28; retired in plan v0.8 |

### Not covered here: owner and lane (plan v0.8 Lane column + v5-rc-manifest rows)
| Rows | Why not here | Owner (lane) · where it lands |
|---|---|---|
| ST-AC7 rest: Frenzy ×2, Rush/Shout (X7a), Basket stock, balanced tiers 0/2 | Frenzy, abilities and Basket stock have no sale path on rc/v5 | Saves (U) tests; land with #1 golden sim (row 12, Architect, v5-golden-sim) + #80 F1c for Frenzy, #4a abilities sim (row 15, Features, v5-abil-sim) for Rush/Shout; Basket stock: no manifest row names it, so HoE needs to assign it. Hawker has no own sale path (it scales demand), so its sales are the player/MH cases above |
| ST-AC2b, 2c, 15, 16, 16b, 16d, 16e | tap coins / I_ref | Saves (U) tests; land with #3 tap coins + income-ref (row 14, Architect, v5-tapcoins) |
| ST-AC17, 17b | coin pop format / zero payout | UI (U format, B) · row 17 v5-streak-ui (UI e80556fd) with #3 pop |
| ST-AC8 | golden cash / tap coins / Broody payout don't exist on this base | Saves (U) · re-check with rows 12, 14, 20 |
| ST-AC9, 10, 10b, 21, 22, 24, 25, 26, 26b, 27 (+ ST-AC11 copy/meter) | UI / sound | UI · row 17 v5-streak-ui (UI e80556fd) |
| ST-AC19 | telemetry `tap{count, credited, empty_credited, bonus_cents}` | **Saves** (U) · row 11 v5-tel-sub (§10.1 subset) |
| ST-AC20 [T-sub] | `session_end` fields + dashboard | **Saves** (U, export) / Head of QA (dashboard script) · row 11 v5-tel-sub |
| ST-AC23 | Economy G3/G1 sim, never-tap bot | Economy (S) · bot-m5 + F5 harness (row 33 v5-f5, Features); Saves QA re-runs on the RC SHA |
| ST-AC30 | Broody / flutter actions don't exist | Saves (U) · lands with #5 Broody sim (row 20, Architect, v5-broody-sim) |
| ST-AC28 | **retired** (plan v0.8, ST-5 closed) | — |

## Saves QA #87 findings addressed (qa/v5-saves/trace-reviews/pr87-504d279.md)
- **M1 (Major) ST-AC7 / mutant S5:** `sellTo` now always passes `SaleCtx {by, suspended}` (behaviour-identical: `suspended:false` = no ctx).
  New tests: player Sell + Sell all, and a Market Hand step on focus vs unfocused ticks, at x ∈ {0.01, 0.14, 0.28} × Grader {1, tier 3},
  expected = round(k × price × g × (1 + x)) once per sale. ST-AC7 marked **partial** with owners for the rest.
  **Mutation run @14894bd (QA mutate.py set; S2 re-pointed to sim/timers.ts after #79):** 10/10 killed, S5 included (by the new MH test).
  Control: S5 at the pre-fix merge 5573593 (see artifacts) shows the old tests let it through.
- **M2 (Major) cap of record:** G3 fixture `streak_cap` 0.28 (D-HOP-2026-10-29-08); ST-AC5 asserts the full `streak_peak` payload at 0.28
  (value 0.28, 28 taps, time_at_cap 3 s, max_tier 4, duration 12.33 ± 0.1 s); ST-AC11 tiers 0.07/0.14/0.21/0.28 + 0.40 config; the
  0.27 tier case is labelled **Breeds on**; `tcNum` asserts 0.28; F2's game-settle test is back to rc/v5's s = 0.28. balance.json untouched.
- **m3:** ST-AC28 tags dropped (test renamed `K4/K18: …`). **m4:** spec v1.3.2 acb4cdbb / plan v0.8 403c2c46 cited in the body, the
  test header and streak.ts. **m5:** every deferred row has an owner and lane (table above). **Extra:** `ST-AC29: flag default 0 = off` test.
- Review: Majors were fixed. Per D-CEO-20261030-01 (rule 22 amended), Claude review is never a gate: **CCR post-merge if Claude is
  available, otherwise recorded as 'no Claude review'**. #87 merges on the Saves QA trace PASS plus green CI.

## Verification (RC/UI-QA load caps: targeted only, maxWorkers=1)
`tsc --noEmit` exit 0 · targeted vitest (v5-streak-sim, v5-f2-m5-fields, v5-f1a-fields, v5-f2-game-settle, v5-f2-roundtrip,
v5-f2-downgrade, v5-f1b-clock-rng, v5-f1b-focus-wiring): **8 files, 103/103 passed** · mutations 10/10 killed.
**Pending until the load caps lift:** the full unit suite on this head, golden, builds, check-globals and rc0 on 3 engines (WebKit is
also broken on the box, with HoO).
Gate: `artifacts/v5-streak-sim-14894bd/results/` (summary.txt, tsc.log, vitest-targeted.log, diffstat.txt, mutations/, SHA256SUMS).
Manifest: artifacts/v5-streak-sim-14894bd/results/SHA256SUMS (41 files, sha256sum -c clean) sha256 2930938993b6ae7b97f807f591ba2a2a5dd5078f220f6c85e569608dfdfe59d8. Bundles: scratch/bundles/feat-saves-v5-streak-sim-2-5573593.bundle, feat-saves-v5-streak-sim-2-14894bd.bundle (git bundle verify OK).
