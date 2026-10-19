# L30+ step-gate harness

**This is the only accepted L30+ step-gate harness** (Head of Operations, 2026-10-19). Economy, HoP and QA measure every
L31+ reshape with it. Numbers from scratch scripts, Python sims or edited copies are not gate evidence.

## Command
```
npm run measure:l30plus -- <path/to/economy.csv> [--seeds 1-200] [--T 14400] [--out <dir>]
```
- Defaults: seeds 1-200, workers horizon 14400 s (4 h), output `/tmp/l30plus-measure-<csv sha8>-<HEAD7>/`.
- The defaults are the gate run. Only `--out` may be changed for gate evidence; `--seeds` and `--T` are for smoke runs.
- Runtime: about 8-10 min on the box at load < 12.

## Prerequisites
- A worktree off `origin/main` (or a branch that contains it). Run `npm ci` if node_modules is missing.
- **Today main cannot build an L30+ CSV** (more than 31 rows / Farm max 50). It needs the #45 L30+ code (rc/m4-t3-l30plus, parked;
  see PR #48):
  - 20bf1d3 L30+ src (data-driven track max, per-row caps, extra-level surcharge)
  - c27fdfb sync-economy farmMaxLevel / per-row caps / surcharge, plus economy-config farmMaxLevel 50, hvExtraSecondLevelMult 1.1
  - af04736 Balance type (type-only)
  - 63d2c51 fit Farm/Collection/workers on rows 0..farmMaxLevel
  - 408a589 tracks clamp at their own max (55)
  - 0efda7d demand fitted on rows 0..30
  - bd3e527 per-level coop table + rising-cost tests

  With main alone the harness stops at the build step with the exact sync error, for example
  `could not fit demandLoFactor`. Until that code lands on main, measure on a local, unpushed branch:
  `git switch -c tmp/l30-measure origin/main && git cherry-pick -x 20bf1d3 c27fdfb af04736 63d2c51 408a589 0efda7d bd3e527`.
  408a589 conflicts only on tests/m4-migrate-v7-sample.test.ts; `git rm` that file, then continue.
- vitest is not used. The harness is one node process, so `maxForks=2 / minForks=1` is irrelevant. When it runs next to
  vitest, keep the studio limits for the vitest jobs. No browser.

## What it does
1. Hashes the CSV (sha256) and records the harness blob sha (and whether it equals the committed blob), HEAD and whether
   the tree is dirty. **Gate evidence requires a clean tree and the committed blob.**
2. **L0-30 byte diff** vs the repo's `data/economy.csv`, on shared columns. Any changed cell in L0-30 = FAIL; L0-11 is
   reported separately. Added columns are listed.
3. Builds balance.json **in memory** with the committed `buildBalance` + `readEconomyConfig` + `validateBalance`. It writes
   nothing in `data/` or `src/`. It also diffs L0-11 `tableRow` and the m4 costs against the repo balance.json.
4. Runs the committed bots at their defaults: workers path = `runM2` seller15 + `VAR_DEFAULT` for T s; no-workers =
   `runBot` seller15 + `VAR_DEFAULT`, 3600 s (the same definitions as tests/ac7-dceo-04.slow.test.ts).
5. Reports:
   - time on each Farm level (median / P95 across seeds), and dead zones (P95 time on a level > 180 s)
   - workers and no-workers L10 P95 and fastest seed, with the margin to the 12.1-min gate
   - the **step gate D-CEO-20261019-04**: P95 of each seed's max L30+ step ratio <= 2.00, worst seed <= 2.25 (seed id
     reported), with `step_ratio_from_level` / `step_ratio_min_prev_s` from data/pacing-targets.json
   - the **top-step share per level** (D-HOP-2026-10-19-22 rule: no level is the top step in > 25% of seeds)

## What it does not do
- No overrides: no env knobs, no alternative bots, no threshold arguments. The thresholds are constants in the script and
  change only by a reviewed commit that cites the decision.
- It doesn't change code, data, goldens or fixtures, and doesn't commit anything. It measures **data only**, against the
  code at HEAD.

## Output
`result.json` (machine-readable; keys: harness{path,blob,committedBlob}, code{head,dirty}, csv{path,sha256}, seeds, T, gate,
collectionTable{flag,state,source,codeSupportsFlag}, baselineCsv{path,sha256,expectedSha256,pinned,columns}, l0_30, l30Row{verdict,vs,diffs}, build, l0_11_balance, levels[], deadZones[], farmLevelAtT, l10, playEquivalence{verdict,seeds,mismatches,firstFail,baseline,perSeed[]}, collectionFirstBuy[], dceo15{gate,rowConvention,playEquivalence,rows[]}, stepGate{verdict,p95,worst,worstSeed,top5Seeds,
topStepShare[],topStepRuleVerdict}) and `summary.txt` (the same, as the lines printed to stdout). Exit 0 when the measurement
completed (read the verdicts inside). Exit 1 when the CSV doesn't build or the step gate can't be evaluated.

## Added 2026-10-19 (HoE, M4.1)
- **collectionCostFromCsv (D-HOP-23):** taken from `data/economy-config.json`; `--collection-table on|off` overrides it. The state
  and its source are printed and stored in `collectionTable`. `on` fails the build if this code has no D-HOP-23 sync support.
- **Baseline CSV (HoE 09:36):** `--baseline <csv>`, default `/workspace/egg-farm-studio/scratch/m41-5-drop/economy.dropped8.csv`
  (the post-D-HOP-25 economy.csv, 123 kept columns, sha256 `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44`, the
  same file as product/economy.csv). Its path and sha256 are always printed, together with whether it matches that pin.
- **L0-30 and L30-row byte checks:** raw CSV text compared cell by cell, on the baseline's columns, rows L0-30, against the
  baseline CSV. FAIL if any cell differs. Extra candidate columns are listed separately.
- **Play-equivalence:** for each seed, the Workers bot's purchase trace is hashed up to (excluding) the first tick it reaches
  Farm L31. Each event holds tick, time, kind, row paid, coins, F/C/H/V levels, workers, grader tier, coop and basket. The hash
  is compared with the same seed run on the baseline CSV (same code, same flag state). PASS only if every seed matches. A FAIL shows
  the first failing seed, its tick and both event keys. A seed that never reaches F31 compares its whole run. The baseline
  run is cached in `/workspace/.cache/l30plus-baseline/<code sha>-<baseline csv sha256>-coll<on|off>-T<T>-s<seeds>.json`
  (`--baseline-dir`; `--no-baseline-cache` turns it off). A dirty tree is never cached. Logic: `scripts/l30plus-trace.ts`,
  tests: `tests/l30plus-trace.test.ts`.
- **Collection first buy (rows 22-27):** row = collection level before the buy. For each row it reports the lowest Farm level
  at which any seed first buys it (and which seed), plus how many seeds buy it before F31.
- **D-CEO-15 per-row verdict:** row C is **0-based**. Row C = economy.csv level C = `collection.costTable[C]` = `collectionCost(C)`,
  the price of C -> C+1 (src/sim/actions.ts `buy()` charges `collectionCost(collectionLevel)`; this is unit-tested). The gate covers rows 22-27 (buys to L23-L28).
  A row is PASS (may be eased) only if play-equivalence PASSes for every seed AND no seed buys that row before F31. Otherwise
  it's FROZEN. Row 28 (buy to L29) is printed for information only and is always FROZEN.
- Workers L10 P95 and its margin to 12.1 min are still in every run (`l10`).

## Integrated branch arch/m41-integrated (M41-2, 13:00)
Base: main dd223f5. The #45 commits were cherry-picked (`-x`) from the remote objects on `origin/rc/m4-t3-l30plus`:

| source (origin/rc/m4-t3-l30plus) | result |
|---|---|
| 20bf1d3f124630ef91ac08c9def6506a05984714 | cb43e312468cc41f308b1174729c7b1020d5b092 |
| c27fdfbd753433488b021d193eb1d62684fd6032 | 6c235620a89f59a41458eaa9a650b8b613b0b6d1 |
| af047369dd08df6236746791c1bcc83cc6af733c | 027cc9f5b83f456ce41644dd40e1da83520338f9 |
| 63d2c51b9f305b09a8eecefa411fb68078f8d3e6 | 405d72cc583df0c1969da180387519a9a21baf26 |
| 408a5896861af0bb5b70f754c1b26c9dd9416a47 | 507c29b52f839e2db2490383d23a3289e98a365b |
| 0efda7deeb5ce8459d9a72e4bcc5c4a2f1dcadb4 | 4a7a2ce2ba54c316f738c1202700bd52b6cbfe5e |
| bd3e52764425d207454c29235ec7713363a10462 | 1784252f4313f1b159d640767d1d5f77df47cfe2 |

Merged in: UI PR #50 `feat/collection-cost-table` 7346011c634d450298e80d680777a7467db06e34 (D-HOP-23, merge commit; the
only conflict was in the sync-economy EconomyConfig interface), and PR #51 `arch/l30plus-cand-b` (164f4045, which contains d90a19d5).
Harness code SHA: ccfcb6387ee6728f71902a711964775721074f5b (D-CEO-16 option (b) harness commit; the README commit on top of it changes docs only). Run dir: `/workspace/wt-m41-integrated`
(a read-only worktree of arch/m41-integrated). The shared pointer copy lists the final branch head.

## D-CEO-20261019-16 option (b) (CEO ruling 09:56; gates.md v1.2). Harness commit ccfcb6387ee6728f71902a711964775721074f5b
- **`--equiv-until first-l30plus-buy` (DEFAULT, gating) | `f31` (info only).** The summary always prints BOTH verdicts and
  the D-CEO-15 row lines under each, and marks which one gates.
- **L30+ purchase:** a buy whose TARGET level (the level after the buy = row + 1) is > 30 on Farm, Collection, Hens or Egg value.
  Worker hires and Grader tiers never count.
- **first-l30plus-buy:** each seed's trace (every purchase: tick, time, kind, row, coins, F/C/H/V, workers, grader, coop,
  basket) is compared event by event with the baseline run of that seed, both cut before the candidate's first F31 tick.
  - Identical: PASS.
  - Otherwise the first differing event must be, on the candidate side, an L30+ purchase at a tick no later than the baseline's
    event at that position: PASS.
  - Anything else is a FAIL: a buy at level <= 30, a hire, a coin or timing shift, a missing event.
  - Per seed it logs the divergence tick, the Farm level at divergence, both event keys and the first L30+ purchase (tick,
    track, level). result.json has all seeds. The summary has the distribution and the first five.
- **f31:** the sha256 of the whole trace up to the first F31 tick must match.
- **D-CEO-15 rows 22-27 (buys to L23-L28):** PASS iff the equivalence verdict (per mode) passes AND 0 seeds buy the row
  before F31. Otherwise FROZEN. Row 28 is info only, always FROZEN.
- **Range:** G1/G2 step ratio, G3 top-step share and G4 cover **F28+**. The committed F30+ step range is printed for reference.
  - G4 is conservative: the longest gap between consecutive bot purchases between reaching F28 and reaching Farm max, worst
    seed and P95. The dead-zone list (P95 time on level > 180 s) is also limited to F28+.
- **G5:** Workers L10 P95 + margin.
- **G6:** acw1 casual model (tests/pacing-acw1.test.ts), seeds 1-200 and 201-299. Turn it off with `--no-acw1`.
- **G7:** L0-30 + L30-row raw cells vs the baseline, plus the gating equivalence.
- **G8:** sync = in-memory build + validateBalance. strict is n/a (Economy/CI, check-economy-copy --strict at landing).
- **G9:** farm/collection/hens/eggValue costs strictly rising.
- **G10:** every column perturbed on every row; unread = no output change and no throw.
- A gates.md v1.2 card is printed at the end with harness blob, full code SHA, CSV sha256 and baseline sha256.
