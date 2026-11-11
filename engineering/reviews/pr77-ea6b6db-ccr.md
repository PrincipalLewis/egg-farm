> **SUPERSEDED (21:51 CET):** the PR head moved to `008bcca0` (rc/v5 406e455 #81 F2 merged in, plus D-HOP-2026-10-29-06 follow-ups). The verdict of record is in **pr77-008bcca-ccr.md**. This file reviews the old head only and is kept as evidence.

# PR #77 @ ea6b6db: v5 F1a (M5 GameState fields, SimEvent members, m4.flags.* plumbing). CCR review: **PASS** (0B/0M/0m/0n)

- PR https://github.com/PrincipalLewis/egg-farm/pull/77, head `ea6b6dbd2f3b49a3ad1eaf7f8fe650211ffeff25` (matches the head given), base `rc/v5` = `22eac98c` (#76 merge). Merge-base = 22eac98. One commit. State OPEN, **Ready** (not draft).
- Bottom of the v5 stack: rc/v5 → **#77 ea6b6db** → #79 a6b4fe4 → #80 e87562c → #82 (e743462, 60ca5e4, c5b0371). #77 has no dependency.
- Reviewer: Claude Code Reviewer, read-only, own detached worktrees `/workspace/review-pr77-ea6b6db` and a base worktree `/workspace/review-base-22eac98`. Review ran 21:09–21:35 CET. Evidence in /workspace/.pr77-ev and /workspace/.base-ev.
- The Architect's self-review (pr77-ea6b6db.md) was read as data only; every number below was re-measured. Claude calls used: 0/15.

## 0. File list
`git diff --stat 22eac98 ea6b6db`: 7 files, +171/−4. src/config/flags.ts (new, 17), src/config/formulas.ts +3, src/sim/events.ts +22/−2, src/sim/m5-state.ts (new, 66), src/sim/state.ts +4/−1, src/sim/workers.ts +3/−1, tests/v5-f1a-fields.test.ts (new, 56). No data/, scripts/, .github/ or balance.json diff, as claimed.

## 1. Runtime surface
- Everything added is a type, two `as const` lists (`M5_FLAGS`, `M5_*_FIELDS`) or the pure helpers `flagOn()` / `evRngFlagOn()` (flags.ts:15-17). `grep` for importers at ea6b6db: no src file calls `flagOn`/`evRngFlagOn` and no src file reads an M5 field. `initialState` (state.ts) is unchanged.
- `GameState extends M5Fields` (state.ts:9) and `Worker` gains optional `paused?`/`callLockoutS?` (workers.ts:11): compile-time only. All sim writes of a worker are spreads (`{ ...w, cdS }`), so nothing strips or adds these keys.
- `flagOn` = `!!p.m4?.enabled && p.m4.flags?.[f] === 1`: absent block, `enabled: 0`, value 0 or 2 are all off (tested, and confirmed by mutant G3 in the #82 run, which the F1a test kills).

## 2. Save migrations / old saves
- `serialize()` is `JSON.stringify(state)` (save.ts:144-145) and `validate()` keeps unknown state keys (save.ts:213-237). With every flag off nothing writes an M5 key, so saves are byte-identical; the verify round-trip reports `migrated: false`, version 6, 0 mismatches.
- No SAVE_VERSION bump, no new migrate step. An old save (v6 / tracksV7) loads exactly as before.

## 3. Goldens, trace, determinism (own runs, not the "green locally" claim)

| Run | Base 22eac98 | #77 ea6b6db |
|---|---|---|
| `npm run verify -- --hours 24 --seed 1` | PASS, trace **2c0d3ec3**, goldens **f90d1678 / a54c9cf9** | PASS, trace **2c0d3ec3**, goldens **f90d1678 / a54c9cf9** |
| verify --hours 1 | trace 198992ff078e | trace 198992ff078e |
| engineering/golden/*.test.ts (both suites) | pass | pass, GOLDEN1 a54c9cf9…, GOLDEN2 unchanged |

- `diff` of the two 24 h verify.json files: only `buildId`, `sha`, the html sha256 and the build-id label lines differ. Every check, the trace, events (479 715), the round-trip and the goldens are identical.
- No `Math.random`, `Date.now` or `performance.now` in src/sim, src/config, src/econ.

## 4. Module boundaries
- New imports: config/formulas → `import type` config/flags; config/flags → `import type` config/formulas (type-only, erased); sim/m5-state → type sim/workers; sim/state → type sim/m5-state. 
- Import-graph check over src (value imports only, script .pr82-ev/cycles.py): 0 cycles at base and at #77; no config → sim/econ/ui and no sim → ui/econ/save/game edges.

## 5. Gates (own worktree)

| Gate | Base | #77 |
|---|---|---|
| npm ci | 0 | 0 |
| tsc --noEmit | 0 | 0 |
| npm test (sync --check + vitest, maxForks=3) | 1564 passed, 1 skipped (115 files) | **1571 passed, 1 skipped (116 files)**; +7 = the new file |
| test:slow | 16 passed, 1 skipped | **16 passed, 1 skipped** |
| build (check-release-build) | 0 | 0 |
| check-globals | 3/3 PASS | 3/3 PASS |
| build:html | 0 | 0 |
| gitleaks 8.21.2 `22eac98..ea6b6db` | — | no leaks |

- `git status --porcelain` empty after all gates. Note: my first `npm test -- --maxWorkers=2` invocation errored in tinypool (min/max threads conflict, no tests ran); the counts above are from the re-run with `--poolOptions.forks.maxForks=3`.
- CI at ea6b6db (gh api, read-only): verify-smoke **success** (21:09 CET); `gate` in progress at the time of reading (a 20:03 CET run was skipped while Draft); release-globals skipped. rc/v5 has no branch protection.

## Findings
No Blocking, Major, Minor or Nit findings of my own.

### Observations
- **O-1 (dependency for F2, already the self-review's #4):** "session-only, never saved" (m5-state.ts:62-66) is a list, not enforcement. Because serialize writes the whole state and validate passes unknown keys, any session field a feature PR sets (and #79's `brRngState`) **would be saved and restored** until F2 strips `M5_SESSION_FIELDS`. No risk while flags are off; F2 must land before (or with) the first feature that writes one.
- **O-2:** `streak_peak.reason: string` and `abilities.readyAt` in save form (epoch ms) are open spec questions recorded in the self-review; nothing to do here.

## Verdict: **PASS**. 0 Blocking / 0 Major / 0 Minor / 0 Nits / 2 observations
Types-only foundation; flag-off saves, goldens (f90d1678 / a54c9cf9) and the 24 h trace (2c0d3ec3) are byte-identical in my own runs. Claude calls used: 0/15.
