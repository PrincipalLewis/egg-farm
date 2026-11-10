# PR #78 @ 0951aef: bot-m5 port + `verify --profile m5x-casual` (rc/v5, Q-ZG-H3 option A). CCR review: **PASS** (0B/0M/0m/5n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/78, head `0951aefa37f7c2fd9171071ccf9095f55a8373c4`, base rc/v5 `22eac98c` at the time of the PR (rc/v5 is now `406e4558`, #81 F2; see check 7). Merge-base = 22eac98. One commit. OPEN, not a draft, MERGEABLE.
- Reviewer: Claude Code Reviewer, read-only, one pass (D-CEO-20261028-02). Own detached worktrees `/workspace/review-pr78-0951aef` and `/workspace/review-pr78-base-22eac98`, both removed at the end; scratch clones under /workspace/.pr78-ev (kept as evidence). Review ran 20:46–21:35 CET.
- The Architect's self-review (pr78-0951aef.md) and artifacts/bot-m5-parity/results/VERDICT.md were read as data only. Every number below was re-measured.
- Every CCR run used `TMPDIR=/workspace/.pr78-ev/…`, so no CCR run wrote into /tmp, and leaks are counted exactly (check 6).

## 0. File list and scope
`git diff --stat 22eac98 0951aef`: 7 files, +331/-11.
- New: tests/bot-m5.ts +189, tests/bot-m5.test.ts +55, scripts/bot-m5x.ts +15.
- Changed: scripts/verify/sim.ts +34/-4, tests/verify.test.ts +36/-5, scripts/verify.ts +1/-1, scripts/README.md +1/-1.
- **No src/, data/, .github/ or save diff**, as claimed. The brief listed 4 items; the 2 test files are the extra 3 files, and the self-review lists all 7.
- gitleaks 8.21.2 `git --log-opts=22eac98..0951aef`: no leaks. `dir` on the m5x-casual 24 h output: no leaks. The added-lines grep (ghp_/github_pat/GITHUB_TOKEN/Bearer//home//Users//workspace/e-mail) finds 0 hits.

## 1. Faithful port (supporting: -port-diff.txt)
- **Originals:** scratch/v2-econ/h/m5.ts sha256 `29d423c5…e0b6` and m5x.ts `196e8ed5…729a`. Both match the hashes in the README and the file header.
  - Other m5.ts/m5x.ts copies exist under scratch/m51-econ, scratch/f27-verify/e10g and product/farm/scratch/e10. They are the M5.1 breeds variants (`breeds?: BCfg`, a different m5x output). They are not the M5.0 harness and are out of scope for option A.
- **m5.ts vs tests/bot-m5.ts:1-153.** In `diff`, the body is byte-identical except for:
  - the header and imports: relative paths, `type` imports, `type B = Balance` instead of `typeof b0`, and `maxStepRatio`/`quantile` imported for windowGate;
  - the `run()` option type, now named `RunOpts` with 2 optional observers;
  - :55, where `drain` first calls `opt.onEvents(t, ev)`;
  - :78/:81/:149, which add `prevT` and the `onSecond` calls.
  - All constants are unchanged: PROFS, the rng (`seed*2654435761+99`, mulberry32), the stacks, streak 0.28, tapShare 0.03, golden gaps 120/300, 45 s first spawn, 0.45/0.80 splits, Broody 0.05×I cap 150 s, 0.25× pause recovery and sweep 1.15. So are the RNG draw order and every `Math.round`/`toFixed`.
- **m5x.ts vs windowGate()/gateOptsFromEnv() (:155-189).** The logic is line for line the same: loop order cfg→prof→seed, `seed*7919+round(t)` window seeds, quantiles, `toFixed` digits and the output key order.
  - The only added behaviour is the unknown-CFG/profile throw (:172). `console.error` became `onResult`, which the CLI wires back to `console.error(JSON.stringify(o))`.
  - scripts/bot-m5x.ts reproduces m5x.ts's header keys `{csv, sha, seeds, T, STEP}` in the same order.
- **src coupling.** bot-m5 calls the shipped `src` step/apply/initialState/mood/graderMult/candidates/priceDollars/prodEggsPerSec/coopCap and the unchanged tests/bot-m4.ts, seller-variance.ts and pacing-guards.ts (byte-equal to the harness copies). That is the intended coupling: the bot plays the real rc/v5 sim.
  - Nothing goes the other way: no src file imports tests/ or scripts/ (the src diff is empty).
  - The M5.0 mechanics live only in the bot (S-5), so this profile does not exercise shipping M5 code.
- **Harness src ≠ rc/v5 src (O-1).** Economy's harness runs on its own src snapshot (scratch/v2-econ/h/src): 27 files differ from rc/v5. The sim-relevant ones are actions.ts/tracks.ts (L30+ `trackBuyCost` = row cost + `trackExtraCost`, `trackMaxLevel`), formulas.ts (collection `costTable`, `coopCapacityTable`, `capOverFarmByFarm`), income.ts (rc/v5 `marketHandStalled`, a planner path the bot never reaches because best-buy passes `assumeWorking`), and next-goal/best-buy, which use the same cost functions. scripts/sync-economy.ts and data/economy.csv also differ.
  - On both parity CSVs these differences are inert, which is why the outputs are byte-identical.
  - On a CSV that carries L30+ columns (hv_extra_cost_farm_share, per-row caps, collection_cost table, non-linear coop capacity), the harness and the port would diverge.
  - "Results equal the original harness's on the same CSV and seeds" (tests/bot-m5.ts:2-3) is therefore empirical for today's CSVs, not structural. Where they differ, the port is the one that follows the shipped game.

## 2. Determinism and parity (supporting: -parity.txt)
- **No wall clock or ambient randomness on the path.** `rg 'Math.random|Date.now|performance.now|new Date|hrtime|crypto.random'` over tests/bot-m5.ts, bot-m4.ts, seller-variance.ts, pacing-guards.ts, scripts/bot-m5x.ts, scripts/verify/sim.ts, src/sim, src/econ, src/config and next-goal finds 0 hits; the only match is a comment.
  - RNG: the seeded mulberry32 `R` and SellerVariance's own PyRandom (MT19937), seeded `1000003*(seed+1)+17`.
  - Iteration order: Map/object insertion order only (`paused`, `src`, `s.workers`), and that order is set by the deterministic code.
- **Run twice:**
  - The CLI small case (SEEDS=2 T=3000 CFG=none,AssZ PROFS=casual) gave the same stdout and stderr bytes twice.
  - `verify --hours 24 --profile m5x-casual`, run twice with full builds, gave the same verify.json `25eb6895…` and verify.png `7dea0ef0…`. trace `07139bdd…`, matching the self-review.
- **Parity reproduced myself:**
  - **game run:** original m5x.ts vs scripts/bot-m5x.ts on rc/v5 data/economy.csv `b48be8a4`, SEEDS=200, CFG=none,AssZ, PROFS=casual, run in parallel (20:48–21:07 CET). stdout `cmp` identical (`3c60507f…`) and stderr identical (`11e0a7d0…`, the same as the Architect's log). The stdout hash differs from the Architect's `5470dde8` only because the `csv` key holds the CSV path (`/workspace/review-pr78-0951aef/…` vs `/workspace/wt-v5-botm5/…`, +8 bytes). With that key masked, the files are equal.
  - **Pinned test hash:** I ran the ORIGINAL harness with SEEDS=2 S0=1 T=3000 CFG=none,AssZ PROFS=casual, dropped the header keys and took sha256. It gives `41324ef4…a985`, the value pinned in tests/bot-m5.test.ts:21.
  - Not re-run: the m50 9-combo run (economy.m50-draft.csv), because of time. The Architect's m50 orig/port files are byte-identical by their SHA256SUMS.
- **Mutants (scratch clone, killed = `vitest run tests/bot-m5.test.ts tests/verify.test.ts` fails):** 9 of 11 are killed. The parity pin kills the constant, RNG, catchP and stack changes. Survivors: MH (m5x trace drops events) and MI (checkpoint `sold` counts sells instead of eggs) (N-5). Script and output: -mutants.sh.txt / -mutants.out.txt.

## 3. Verify hook: existing profiles unchanged (supporting: -cli-cases.sh.txt, -cli-results.txt)
- **idle 24 h, PR vs base 22eac98 (both full builds):** both PASS. trace **2c0d3ec3…883d**, goldens **f90d1678 / a54c9cf9**, both pass.
  - With the build id/sha masked, verify.json differs in exactly one line, `asset.sha256` (the html embeds the build id). `sim.tickPath`/`sim.bot` for idle are byte-identical: they now come from `PROFILE_BOT.idle` and keep the same key order.
  - The PNG diff bbox is (128,598)-(263,609), which is the build-label line only.
  - idle 1 h / 0.0005 h / 0.0001 h / `--flags m4.enabled=0` all match base the same way (asset sha only).
- **The idle code path is untouched.** The only change is `...PROFILE_BOT.idle` in the return (sim.ts:115). The m5x branch is an early return at :78, after the UNAVAILABLE check.
- **m5x-casual 24 h:** PASS, exit 0. Same goldens f90d1678 / a54c9cf9, save round-trip pass (not migrated, 0 mismatches). trace 07139bdd. The PNG shows "All upgrades done!", $342.4M, +$2.8K/s and the label "Egg Farm m4.1+0951aef".
- **Exit codes (PR; base where comparable):**

| Case | PR | base |
|---|---|---|
| `--profile nope` / `''` / `M5X-CASUAL` / `__proto__` / `toString` | 2 (usage line) | 2 |
| `--profile` with no value | 2 | 2 |
| `--profile=m5x-casual` | 2 (unknown argument) | — |
| `--profile m5x-casual` | runs | 2 (`needs tests/bot-m5.ts`) |
| m5x `--hours 0` | 2 | — |
| m5x `--flags m4.enabled=0` (differs from build) | **4** | idle: 4 |
| m5x `--flags m4.enabled=1` (same as build) | 0 | — |
| m5x `--flags nope=1` / `--flags` twice | 2 / 2 | — |
| m5x `--no-shot` | 1 (label check) | — |
| m5x `--seed 0` | 0 | — |
| m5x `--seed 9007199254740991` | **1**, uncaught `PyRandom: non-negative safe-integer seed only`, FAIL json stage run (N-2) | idle: 0 |
| `--profile m5x-casual --profile idle` | 0, runs **idle** silently (N-3) | 0, idle |
| m5x / idle `--hours 0.0001` (0 ticks, 0 checkpoints) | 0 / 0 | idle 0 (pre-existing, O-4) |

- **schemaVersion stays 4.** No key is added or removed. For m5x-casual only the values of `profile`, `sim.tickPath` and `sim.bot` change. `manages: null` is not in verify.json. Readers: none in code. Only scripts/README.md, tests/verify.test.ts, verify-smoke.yml (artifact upload) and the PR template mention verify.json, so there is no consumer to break.

## 4. Gates (PR worktree, node v20.19.2)

| Gate | Result |
|---|---|
| npm ci | 0 |
| tsc --noEmit | 0 |
| sync-economy --check | 0 (up to date) |
| npm test (vitest) | **1574 passed, 1 skipped** (116 files), 219 s, 0 flakes |
| vitest bot-m5 + verify only | 59/59 |
| test:slow | **16 passed, 1 skipped**, 486 s |
| build | 0 |
| check-globals | 0 (3/3 chromium PASS; run after build, CI order) |
| build:html | 0 |
| gitleaks | clean |

- `git status --porcelain` is clean after every gate.
- **CI on 0951aef** (`gh pr view`, read-only): verify-smoke **success** (20:46 CET), ci/gate **success** (21:00 CET), release-globals skipped.

## 5. Hostile input (bwrap: tmpfs `/`, `--unshare-all`, scratch clone at /repo, evidence in /out; -sandbox-cases.txt / -sandbox-summary.txt)
- scripts/bot-m5x.ts is env-driven and writes nothing.
  - Missing, non-CSV or `/etc/passwd` CSV: exit 1 with a parse error. The parse error echoes one cell of the file to stderr; this is a dev tool and the caller can already read the file.
  - After 10 cases, nothing outside /out was written and `git status` is clean.
- **N-1:** `CFG=__proto__`/`constructor` and `PROFS=__proto__`/`toString` get past the new unknown-name guard (tests/bot-m5.ts:172) because `CF[ck]`/`PROFS[pf]` read inherited prototype members. They exit 0 with garbage results.
  - `SEEDS=abc` (seeds `[1,null]`), `T=-5` and `STEP=0` also exit 0. These are faithful to m5x.ts, which never validated its env.
  - verify's `--profile` is not affected: it is checked against the `PROFILES` array (cli.ts:36).

## 6. /tmp hygiene (-tmp-counts.txt)
- **New tests leak 0 dirs.** With a fresh TMPDIR, `vitest run tests/bot-m5.test.ts tests/verify.test.ts` on the PR leaves 15 `v-*` + 2 playwright dirs. tests/verify.test.ts alone on base 22eac98 leaves the same 15 + 2.
  - The new CLI test's `trackedTmp('v5m5-')` is cleaned up, and bot-m5.test.ts makes no dirs. The 15 `v-*` are the older suites' leak already parked as VER-1f.
  - The full suite under my TMPDIR left 89 entries (prod/rb/vend/v/ef/pins…). All of them come from pre-existing suites; there are 0 `v5m5-`/`v1d-` entries.
- **System /tmp:** 3156 entries at 20:47 CET and 4367 at 21:29 CET (+1222/−11). None is attributable to CCR, since every CCR run had TMPDIR redirected, and 0 `v5m5-`/`v1d-` entries appeared. I deleted nothing in /tmp.

## 7. Against current rc/v5 (406e4558, #81 F2 merged at 21:12 CET)
`git merge-tree` of 406e4558 + 0951aef is clean. I built a local merge-preview commit in a scratch clone (never pushed). On it:
- tsc 0;
- vitest bot-m5 + verify + v5-f2-* **95/95**;
- verify 24 h idle PASS, trace **2c0d3ec3**, goldens f90d1678 / a54c9cf9;
- verify 24 h m5x-casual PASS, trace 07139bdd.

The squash-merge will behave the same.

## Findings
No Blocking, Major or Minor findings. Nits:

### N-1. The unknown-CFG/profile guard in windowGate passes prototype keys
- File: tests/bot-m5.ts:172 (`CF[ck]` / `PROFS[pf]`), and :161-163 (`gateOptsFromEnv` does no numeric checks).
- Repro (bwrap H1–H4): `CFG=__proto__ PROFS=casual SEEDS=1 T=300 NOWIN=1 npx vite-node scripts/bot-m5x.ts` gives exit 0 and a result keyed `__proto__|casual`. The same happens with `PROFS=toString`. `SEEDS=abc` gives `seeds:[1,null]`, exit 0.
- Impact: dev CLI only; verify is unaffected. The test at tests/bot-m5.test.ts:28-31 checks only `nope`.
- Fix (optional): `Object.hasOwn(CF, ck) && Object.hasOwn(PROFS, pf)`, and `Number.isSafeInteger` on SEEDS/S0/T/STEP.

### N-2. m5x-casual crashes with exit 1 on large seeds that the CLI accepts
- Files: scripts/verify/cli.ts:35 accepts any safe integer. tests/bot-m5.ts:36 → tests/seller-variance.ts:16/22 → py-random.ts:8 then throws for `1000003*(seed+1)+17 > 2^53-1`, i.e. any seed ≥ 9,007,172,233.
- Repro: `npm run verify -- --hours 0.25 --profile m5x-casual --seed 9007199254740991 --skip-build` gives exit **1**, `uncaught error: PyRandom: non-negative safe-integer seed only`, and a FAIL json (stage run). idle with the same seed: exit 0.
- Impact: non-zero and visible, never a wrong PASS. It should be a usage error (exit 2) or a documented range.
- Fix: in parseArgs, bound the seed for m5x-casual (≤ 9007172232), or reject it with exit 2.

### N-3. A repeated `--profile` is silently last-wins
- File: scripts/verify/cli.ts:24 (pre-existing; now relevant because m5x-casual runs).
- Repro: `--profile m5x-casual --profile idle` gives exit 0 and runs **idle**, with verify.json `profile: idle`. It is the same class as N-b on #73 (repeated `--flags`), which is now exit 2.
- Fix: exit 2 on a second `--profile`, matching `--flags`.

### N-4. The "unavailable profile, exit 2" path is now dead and untested
- Files: scripts/verify/sim.ts:33 (`UNAVAILABLE = {}`), :77; scripts/verify.ts:4, :63. tests/verify.test.ts:147 is still titled "usage errors and unavailable profiles exit 2", but its r2 assertion was removed.
- Impact: none today. If a profile is added to UNAVAILABLE later, nothing checks that it exits 2.
- Fix (optional): keep one unit test that stubs an UNAVAILABLE entry, or drop the branch and the header wording.

### N-5. Two non-equivalent test-strength survivors in the m5x verify hook
- **MH** (scripts/verify/sim.ts:128, drop the per-event `h.update`): all 59 tests pass. Determinism and "differs from idle" are still met through the end-state line. The m5x trace hash 07139bdd isn't pinned (the same policy as idle's, VER-1g parked).
- **MI** (:127, `sold += 1` instead of `e.k`): all pass. No test checks the m5x checkpoint `eggs.sold`/`eggs.collected` against bot-m5.
- Neither affects shipped behaviour.
- Fix (optional): pin a 0.25 h m5x trace hash, or compare the checkpoint counters to a counter fed by `onEvents` in the test.

### Observations
- **O-1 (port claim scope):** parity with Economy's harness is empirical for the 2 CSVs, not structural. The harness runs on its own src snapshot, and 27 files differ, including the L30+ cost/cap code in actions/tracks/formulas (check 1). Suggest rewording tests/bot-m5.ts:2-3 and the bot-m5.test.ts:17 title from "equals the original harness" to "equals m5x.ts on CSV b48be8a4 with today's src". When an L30+ or new-column CSV lands, the pin and the harness will diverge, and the port, not the harness, follows the shipped game.
- **O-2 (trace granularity):** the m5x trace hashes step/collect/sellAll events and the end state. Buys and Manage are applied without `ev` (as in m5.ts), so they reach the hash only through the end state. This is fine for determinism and consistent with the original.
- **O-3 (future double count):** when M5.0 src pieces land behind `m4.flags.*` and the gate runs bot-m5 "with the flags on" (decisions.md:222), the bot's own layered mechanics (golden, streak, tap coins, Broody, abilities) would stack on top of the src versions. That is the self-review's S-5. Someone needs to own switching bot-m5 to the src mechanics before that gate.
- **O-4 (pre-existing):** `--hours` below 1/7200 (e.g. 0.0001) runs 0 ticks with 0 checkpoints and still PASSes, for idle on base as well as m5x.
- **O-5 (paperwork):** the self-review's verdict line (pr78-0951aef.md:24) says "Ready … as Draft. Not marked Ready", but the PR is Ready. The decision log at 20:47 says Ready is correct. The m5x-casual profile has no CI coverage beyond the 0.1 h CLI unit test, since verify-smoke runs idle only.
- **O-6:** while reproducing the pinned hash I briefly redirected one small run's stdout/stderr into scratch/v2-econ/h (small.orig.json/.log). I moved both files into my evidence dir straight away. Nothing else in Economy's scratch changed.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 5 Nits (N-1…N-5) / 6 observations
- The port is faithful: the body is byte-identical to m5.ts apart from the read-only observers, and windowGate matches m5x.ts line for line. I reproduced the parity myself (200 seeds, byte-identical) and the pinned hash from the original harness.
- It is deterministic: two full 24 h m5x-casual runs are byte-identical, with no wall clock or ambient randomness.
- The existing profiles are unchanged: idle trace 2c0d3ec3 and goldens f90d1678 / a54c9cf9 on the PR and on PR + current rc/v5. Exit codes 1/2/3/4 are unchanged and schemaVersion stays 4.
- All gates are green, the new tests leak 0 /tmp dirs, and there is no src/, data/ or workflow diff.
- Per D-CEO-20261028-02 the nits go to self-review; no CCR re-review is needed.
- Claude calls used: 0/15.
