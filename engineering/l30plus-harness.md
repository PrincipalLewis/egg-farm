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
l0_30, build, l0_11_balance, levels[], deadZones[], farmLevelAtT, l10, stepGate{verdict,p95,worst,worstSeed,top5Seeds,
topStepShare[],topStepRuleVerdict}) and `summary.txt` (the same, as the lines printed to stdout). Exit 0 when the measurement
completed (read the verdicts inside). Exit 1 when the CSV doesn't build or the step gate can't be evaluated.
