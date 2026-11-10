# v5 #2 streak sim self-review: feat/saves-v5-streak-sim-2 @ 694468eaad069cd58d48108c1dca11a8c6f57158
Senior Engineer, Saves & Persistence · 2026-10-30 · self-review of the #82 (F3) merge on top of 22b6db4 (post-#80).
Review rule: D-CEO-20261030-01 (rule 22 amended): Claude review is never a gate. **CCR post-merge if Claude is available, otherwise
recorded as 'no Claude review'.** #87 merges on the Saves QA trace PASS plus green CI.

Before the merge: `git fetch`; origin/feat/saves-v5-streak-sim-2 = 22b6db41a7424285f10aa003ada774a415d4e9c5 (HoE pushed it);
origin/rc/v5 = 1a61b36091e634aef87ec6d02866323130a3a7cc. Commits this round (no amend, no rebase, no push): exactly one.
- `694468eaad069cd58d48108c1dca11a8c6f57158` merge origin/rc/v5 1a61b36 (#82 F3), --no-ff. Parents 22b6db4, 1a61b36.
Size vs origin/rc/v5 1a61b36: 14 files, +286 / −23 = 309 lines (unchanged). No SAVE_VERSION line. balance.json: 0 diff lines vs rc/v5.

## Merge of #82 (694468e)
Git conflict: `src/config/balance.ts` only (formulas.ts, v5-f1b-clock-rng, v5-f1c-effects, v5-f2-m5-fields auto-merged).
- Imports: kept ours (`M5_TC_KEYS, m4On, tcNum` from ./formulas) and #82's (`validateM5` from ./m5-rules).
- Body: kept both, #82 first: `validateM5(b.m4, W)` (known flag names, 0/1 values, m4.zeroGain, M5 tunable bounds) then our
  `if (m4On(b)) for ([f, ks] of M5_TC_KEYS) if (flags[f] === 1) ks.forEach(k => tcNum(b, k))`. So a flag-on balance missing a streak
  tc key still fails at load with `balance.m4.tc.<k> missing (economy.csv tc_<k>)`; #82's range rules (streak_cap in (0, 1],
  streak_tier_count integer ≥ 1) also apply when the keys are present. Both covered by the targeted run (ST-AC18 + v5-f3-config).
Semantic (non-git) conflict, fixed in the merge commit: `tests/v5-f2-helpers.ts` `ON = { …, flags: { golden, streak, broody, abilities }, tc: {…b.m4.tc, …G3} } as typeof b`
failed tsc (TS2352) because F3 made `b.m4.flags` a full 14-key block. Now `flags: { ...b.m4!.flags, golden: 1, … }`: same runtime
values (the other flags are 0 either way).
Config source check: balance.json streak values equal rc/v5 (`streak_decay_per_s` 0.03, `streak_hold_s` 3, `streak_max_taps_per_s` 1,
`streak_per_tap` 0.01; F3 adds `leave_attended_window_s`, `rest_recovery_mult`, the all-0 flags block and zeroGain.confirm 0).
The G3 keys (`streak_unlock_farm`, `tap_credit_min_s`, `streak_tier_count`, `streak_cap`) are not in economy.csv/balance.json yet;
they come with the Economy CSV PR (row 4). Shipping has `flags.streak` 0, so validateBalance doesn't require them; tests use G3.
[F3-no-literal]: passes. Our m5-fields.ts uses `const tc = tcNum` (no `tc.x ?? n` fallback; rc/v5's `?? 0` is gone), and its only
bare constants are the allowlisted BROODY_NEST_MAX_CENTS / BROODY_SLOTS (D-HOE-20261030-01). sim/timers.ts and sim/effects.ts edits
add no numeric literal. streak.ts is not scanned (it doesn't call flagOn); it reads every tunable through tcNum.

## flags.ts equivalents (for a follow-up; NOT refactored here)
- `m5Flag(b, k)` in m5-fields.ts is already `flagOn(b, k)` (rc/v5 since F1a/F2). Nothing to do.
- `streakOn(b)` in sim/streak.ts = `m4On(b) && b.m4?.flags?.streak === 1`, which is exactly `flagOn(b, 'streak')`. 1-line swap.
- `tcNum`: flags.ts has no tc reader. F3 offers `M5_REQUIRED_TC` in config/m5-rules.ts (empty map, "the feature PR that reads a key
  adds it"), which is the same rule as our `M5_TC_KEYS` + tcNum loop, but it reports `balance.m4.tc.<k> is required while flags.<f> is on`.
  Proposed follow-up: move the streak (and golden/abilities, if owners agree) key lists into `M5_REQUIRED_TC`, drop the balance.ts loop
  and `M5_TC_KEYS`; keep `tcNum` as the reader (it also rejects non-finite values at read time). Also fix the stale comment on tcNum
  ("F3's flags.ts helpers replace this on merge").

## Checks run on 694468e (load caps: targeted only, maxWorkers=1, flock + nice via lane-run; load 6.41 at start, 8 cores)
- `npm run sync-economy -- --check`: exit 0 ("balance.json up to date with economy.csv").
- tsc --noEmit exit 0.
- Targeted vitest: 17 files, 290/290 passed (the previous 12 + v5-f3-config, v5-f3-is-paused, v5-f3-qa-seam, and the #82-changed
  tests that import balance/flags/formulas/income: m41-p1-live-income, verify). v5-f1a/f1b/f1c/f2-m5-fields were already in.
- QA mutate.py set: 10/10 killed (S1a, S1b, S2–S9; same adapted patterns as at 22b6db4, each matching once). Failing tests per mutant: S5 1, S1a 1, S1b 32, S2 6, S3 2, S4 1, S6 4, S7 7, S8 1, S9 2. Tree clean after the run; mutation worktree removed.
- Not run: full unit suite on this head, golden, builds, check-globals, rc0 ×3 (deferred under the load caps).

## Risks / open
- S1a is now killed only by the `ST-AC29: flag default 0 = off` test (shipping now carries `streak: 0`, so other tests no longer
  exercise an absent key). It is still killed; the flag-default test is what guards it.
- Saves QA PASSED 22b6db4 (qa/m3-recheck/pr87-22b6db4.md; CI 41022593909 green; full suite 1698 passed / 1 skipped). Its Major for the
  next head (TS2352 in tests/v5-f2-helpers.ts after the 1a61b36 merge) was already fixed inside the merge commit 694468e with QA's suggested
  spread; no extra commit was needed (tsc 0, targeted 290/290 on 694468e). 694468e: hosted CI + the Saves QA delta check.
- ST-AC7 Basket stock: N/A v5, no Basket sale path. Owner: Saves, before that path ships. (QA-D-1030-STAC7 / plan v0.8.1.)
Manifest: artifacts/v5-streak-sim-694468e/results/SHA256SUMS (39 files, sha256sum -c clean) sha256 2bd3b3b77b8fb15a380219bb1a9c2560eb4f9bf5c63bd0027fb995c0a0c66db8. Bundles: scratch/bundles/feat-saves-v5-streak-sim-2-22b6db4.bundle, feat-saves-v5-streak-sim-2-694468e.bundle (git bundle verify OK; 694468e requires 1a61b36 + 22b6db4).
