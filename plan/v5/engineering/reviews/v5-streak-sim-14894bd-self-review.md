# v5 #2 streak sim self-review: feat/saves-v5-streak-sim-2 @ 14894bd32fdb072f5f54369bce677853e6b53962
Senior Engineer, Saves & Persistence · 2026-10-30 · self-review of the Saves QA #87 return (qa/v5-saves/trace-reviews/pr87-504d279.md).
Review rule: D-CEO-20261030-01 (rule 22 amended): Claude review is never a gate. **CCR post-merge if Claude is available, otherwise
recorded as 'no Claude review'.** #87 merges on the Saves QA trace PASS plus green CI.

Commits since 504d279 (no amend, no rebase, no push):
- `5573593399ea918a08d8cbfdda6152ad68e6ac35` merge origin/rc/v5 2fa7318 (#79 F1b), --no-ff.
- `14894bd32fdb072f5f54369bce677853e6b53962` QA fixes (M1, M2, m3–m5, flag-default test).
Size vs origin/rc/v5 2fa7318: 14 files, +295 / −29 = 324 lines (was 337 vs b563c75). No SAVE_VERSION line in the diff. #80 not on rc/v5.

## Merge of #79 (5573593)
Conflicts: `src/game.ts` (imports; attendedProbe doc; focusMs: took #79's `anyM5FlagOn` gate), `src/save/m5-fields.ts` (kept `tcNum`;
took #79's `EV_RNG_SALT`/`ensureEvRng` re-export from sim/rng.ts), `src/sim/clock.ts` (add/add: took #79's file whole),
`src/sim/tick.ts` (took #79's `stepTimers` call; kept `workerActions(…, !clock?.focus)` for R12). Our inline
`streakTick(out, dt, clock?.focus ? dt : 0, …)` in step() became a `TimerSystem` in `TIMER_SYSTEMS` (sim/timers.ts), so the streak
runs exactly where #79 says each feature's timer runs (end of step, only while an M5 flag is on; focus seconds from `tickFocusS`).
Semantic follow-up in the same merge: `tests/v5-f1b-clock-rng.test.ts` "[D-C2] flags off (or only non-RNG flags on)" enabled
`streak` on the shipping balance without its tc columns; our `tcNum` throws there (by design, 2e8160d). The case now adds G3.
Its assertion is unchanged (no evRngState with streak + abilities on). FYI Architect.

## Fixes (14894bd)
- M1: `sellTo` passes `{ by, suspended }` always (was `undefined` on focus ticks, which made S5 an equivalent mutant at the sale
  level). `saleMultipliers` result for `suspended:false` is the same as no ctx, so this changes no behaviour. Tests: ST-AC7 player Sell +
  Sell all (2 customers, per-sale rounding; extra_coins = Σ streak share), ST-AC7/13 Market Hand one step on F and U clocks, each at
  x ∈ {0.01, 0.14, 0.28} × Grader {none, tier 3 (mult from balance.workers.grader.tiers[2])}. Oracle = round(k × price × g × (1+x)),
  with price from `salePriceCents` and g from config, not `saleValueCents`, so the oracle doesn't reuse the code under test.
- M2: G3 cap 0.28. K5 now 28 taps → 0.28; hold 30 focus ticks, then 93 ticks > 0 and the 94th = 0 (12.4 s of focus ≤ 12.33 + 0.1).
  The peak payload is asserted in full except duration, which is checked as |d − 12.33| ≤ 0.1 (the plan's tolerance).
  The old timing-only "s = 0.28 reaches 0 at 12.33 s" test is folded into it. ST-AC11 at 0.28 (0.20 is still tier 2; 0.21 is tier 3);
  the 0.27 row is the Breeds-on case (`breeds: 1`, cap 0.27).
- m3: renamed to `K4/K18: …`; ST-AC28 is not claimed anywhere. m4: spec v1.3.2 acb4cdbb + plan v0.8 403c2c46 (frozen on v1.3.1 895ca903)
  cited in streak.ts, the test header and the body. m5: owner/lane table in the body (plan Lane column + v5-rc-manifest rows 11/12/14/15/17/20/33).
- Flag default 0: `streakOn(shipping balance)`, absent `streak` key and `streak: 0` are all off (kills S1a inside the streak file).

## Checks run (load caps: targeted only)
tsc exit 0; 8 targeted files 103/103; mutation set (QA mutate.py; path made an argument; S2 re-pointed to the TimerSystem line,
same mutant) at 14894bd: 10/10 killed; control S5 at 5573593. Logs + SHA256SUMS: artifacts/v5-streak-sim-14894bd/results/.
Not run: full unit suite on this head, golden, builds, check-globals, rc0 ×3 (deferred under the load caps; WebKit broken on the box).

## Risks / open
- Basket stock (ST-AC7) has no manifest row, so HoE needs to name an owner. Frenzy/Rush ST-AC7 cases land with rows 12/15 (+ #80).
- #80 (F1c) will re-home the sale factor into SALE_EFFECTS: needs a re-merge and a full QA re-check.
- The trace table in the PR body is the source of truth; test names are verbatim from `tests/v5-streak-sim.test.ts`.
Manifest: artifacts/v5-streak-sim-14894bd/results/SHA256SUMS (41 files, sha256sum -c clean) sha256 2930938993b6ae7b97f807f591ba2a2a5dd5078f220f6c85e569608dfdfe59d8. Bundles: scratch/bundles/feat-saves-v5-streak-sim-2-5573593.bundle, feat-saves-v5-streak-sim-2-14894bd.bundle (git bundle verify OK).
