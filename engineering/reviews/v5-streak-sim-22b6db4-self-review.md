# v5 #2 streak sim self-review: feat/saves-v5-streak-sim-2 @ 22b6db41a7424285f10aa003ada774a415d4e9c5
Senior Engineer, Saves & Persistence · 2026-10-30 · self-review of the post-#80 merge after the Saves QA PASS at 14894bd (qa/m3-recheck/pr87-14894bd.md).
Review rule: D-CEO-20261030-01 (rule 22 amended): Claude review is never a gate. **CCR post-merge if Claude is available, otherwise
recorded as 'no Claude review'.** #87 merges on the Saves QA trace PASS plus green CI.

Commits since 14894bd (no amend, no rebase, no push): exactly one.
- `22b6db41a7424285f10aa003ada774a415d4e9c5` merge origin/rc/v5 6bcc194090ea2c24fe7331d97c5ad653d4419dde (#80 F1c + #88), --no-ff.
  Parents 14894bd32fdb072f5f54369bce677853e6b53962, 6bcc194090ea2c24fe7331d97c5ad653d4419dde. origin/feat/saves-v5-streak-sim-2 = 14894bd confirmed before the merge.
Size vs origin/rc/v5 6bcc194: 14 files, +286 / −23 = 309 lines (was 324 vs 2fa7318). No SAVE_VERSION line in the diff.

## Merge of #80 (22b6db4): #80's sale-context code is canonical
Conflicts (3 files):
- `src/sim/payout.ts`: took #80 whole (`SaleCtx` from sim/effects.ts, `saleEffectFactors`). Our own `SaleCtx` type and inline
  `streakSaleFactor` hook dropped. File now byte-identical to rc/v5.
- `src/sim/tick.ts`: took #80 whole (suspended = M5 flag live && no focus; `workerActions(…, fxSuspended)`). Our duplicate
  `!clock?.focus` plumbing dropped. File now byte-identical to rc/v5.
- `src/sim/actions.ts`: kept both imports (`creditTap, streakSaleFactor, addStreakExtra` from ./streak; `playerSaleCtx` from ./effects);
  took #80's doc comment, `apply(…, attended = true)` and its sell/sellAll (`'player', !attended`). `sellTo` uses #80's ctx
  (`by === 'player' ? playerSaleCtx(!suspended) : suspended ? { by, suspended } : { by }`); kept our credited `collect` (R3) and the
  extra_coins line, now `addStreakExtra(o, value - saleValueCents({ ...s, streakS: 0 }, k, b, ctx))` with the same ctx.
Non-conflict edits in the merge commit:
- `src/sim/effects.ts`: `SALE_EFFECTS = [{ id: 'streak', flag: 'streak', factor: s => 1 + (s.streakS ?? 0) }]` (R8). This is the
  single place the (1 + s) factor lives now; Market Hand on unfocused ticks stays 1x through #80's `suspended` ctx (R12/K10).
- `tests/v5-f1c-effects.test.ts`: the fixture reset (`SALE.length = 0; LAY.length = 0`) now runs in `beforeEach` as well as
  `afterEach`. Without it, the first test would see the shipped streak entry plus its own fixture entry (double factor). #80's
  assertions are unchanged. FYI Architect (owner of #80).
ST-AC7 behaviour kept: player Sell / Sell all and Market Hand focus vs unfocused at x {0.01, 0.14, 0.28} × Grader {1, tier 3} all pass
unchanged on the merged code.

## ST-AC7 Basket stock
N/A v5, no Basket sale path. Owner: Saves, before that path ships.
(QA-D-1030-STAC7 / plan v0.8.1, qa/m5/test-plan-streak-tap-coins.md line 51.) No tests and no code added for it. The trace and owner
tables in the PR body carry the row with exactly that text.

## Checks run on 22b6db4 (load caps: targeted only, maxWorkers=1, flock + nice via lane-run)
- tsc --noEmit exit 0.
- Targeted vitest: 12 files, 159/159 passed (the 8 streak/F1/F2 files + #80 sale/payout: v5-f1c-effects, market, payout-parity,
  sellall-label-grader).
- QA's mutate.py set (S1a, S1b, S2–S9): 10/10 killed. S2 targets the TimerSystem line (as at 14894bd). S5 and S9 re-pointed to #80's code:
  S5 = the streak SALE_EFFECTS factor returns 1 for `ctx.by === 'market_hand'` (killed, 1 failing test: the MH focus case);
  S9 = the extra_coins line with `, ctx)` (killed, 2 tests). Tree clean after the run; detached mutation worktree removed.
- Not run: full unit suite on this head, golden, builds, check-globals, rc0 ×3 (deferred under the load caps; WebKit broken on the box).

## Risks / open
- Saves QA PASS was at 14894bd; 22b6db4 moves the sale factor into #80's registry, so a re-check of this head is needed.
- Frenzy/Rush ST-AC7 cases land with rows 12/15 (Architect/Features), N/A v5 per QA-D-1030-STAC7.
- The trace table in the PR body is the source of truth; test names are verbatim from `tests/v5-streak-sim.test.ts`.
Manifest: artifacts/v5-streak-sim-22b6db4/results/SHA256SUMS (38 files, sha256sum -c clean) sha256 a20bedd45985aa7901a782848974006d5c313354d9ac9395ee972fe990a62361.
Bundle: scratch/bundles/feat-saves-v5-streak-sim-2-22b6db4.bundle (git bundle verify: okay; requires 6bcc194 + 14894bd).
