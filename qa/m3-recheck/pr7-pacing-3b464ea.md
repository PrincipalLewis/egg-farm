# PR #7 F-2 recheck at 3b464ea (vs b1004e7)
Saves QA · 2026-10-17 ~01:35 CEST · head = `git ls-remote origin refs/pull/7/head` 3b464eaea536. Read-only detached worktree qa/scratch/pr7-3b464ea (only `?? qa-mut/` untracked). Unit runs under `flock .browser-test.lock timeout 600`, `--maxWorkers=2`; lock 01:11:59, load 10.5. Evidence: qa/scratch/pr7-3b464ea/qa-mut/ (run.log, full.log, tsc.log, pacing.*.test.ts{,.log}, eco-*.log). No push, merge or comment.

**Recommendation: APPROVE.** All three mutations are killed, 465 passed + 2 skipped, tsc clean. The economy.test fixture check is still **open**; see the addendum. AC7 P95 tail: **NOT VERIFIED (TR-AC7-TAIL)**.

## Scope
`git diff --stat b1004e7 3b464ea`: `tests/pacing.test.ts | 15 +++++++++++++--`, **13 insertions, 2 deletions**, 1 commit. Matches the claim. **PASS.**

## F-2 items
| Item | Status | Evidence |
|---|---|---|
| MIN_SEEDS_P95 = 30 assert | PASS | `const MIN_SEEDS_P95 = 30; const SEEDS = Array.from({ length: MIN_SEEDS_P95 }, …)`; test `seed count >= 30`: `expect(SEEDS.length).toBeGreaterThanOrEqual(MIN_SEEDS_P95)`. Note: mutating the constant itself moves the seed count and the bound together, so that mutant would survive. Only a literal seed count is guarded. That's acceptable: the constant is named and is reviewed like a threshold. |
| quant unit test on synthetic data | PASS | Input 30..1 (deliberately unsorted) ⇒ `quant(.,0.95) = 29`, `quant(.,0.05) = 2`; input 1..20 ⇒ 19 and 1. Correct for nearest-rank ceil(qN), 1-indexed. `quant` is now exported (harmless). |

## Mutations (scratch copies in qa-mut/; each diff checked to change the gate line only, never a log line)
| Mutant | Changed line | Result |
|---|---|---|
| Seed count 30 → 20 | `const SEEDS = Array.from({ length: 20 }, …)` | **KILLED** by `seed count >= 30 (P95 standard)` |
| P95 rank off by one | in `quant`: `Math.ceil(q * a.length) - 1` → `Math.ceil(q * a.length)` | **KILLED** by `quant nearest-rank on synthetic data` |
| L18 30:00 → 25:00 | `runBot(b, s, 'seller15', 1800).farmAt(1800)` → `.farmAt(1500)` in the L18 gate | **KILLED** by `AC7 L18: Farm level at 30:00 in L18-22, no workers` (every seed is L17 at 25:00) |
All three are killed (each 1 failed / 8 passed). The earlier b1004e7 time-mutant run (my pid 1204530) never got the lock, and I killed it (my own PID). It's superseded by this run.

## Full suite and tsc
- `vitest run tests` at 3b464ea: **47 files, 465 passed | 2 skipped (467)**, exit 0. The +2 vs b1004e7's 463+2 = 465 are the 2 new harness tests.
- `tsc --noEmit -p .`: exit 0, no output.

## economy.test 'fixture is fresh vs the live reference sim'
The test is `it.runIf(py)`, with `py = existsSync('../../product/sim/economy_sim.py')` relative to tests/. In a worktree under qa/scratch that path doesn't exist, so the test was **skipped** (it's one of the 2 skips) on both heads in the runs above. Neither run showed a failure, so "pre-existing" couldn't be confirmed from them. To actually run it, I added a symlink `qa/scratch/product → ../../product` (qa/ only) and re-ran `tests/economy.test.ts` under the lock on **unmodified b1004e7** and on 3b464ea. Result: see the addendum below. tests/economy.test.ts is byte-identical on the two heads (`diff` empty), and PR #7 doesn't touch economy code, so a fail here can't be a PR #7 regression **if it fails identically on b1004e7**.

## AC7 P95 tail: NOT VERIFIED (TR-AC7-TAIL, per HoP)
The seller15 bot is deterministic across seeds: all 30 seeds give L10 = 9.25 min, L@30:00 = 18, L@25:00 = 17, and L18 with workers (probe at b1004e7, qa/scratch/pr7-b1004e7/qa-mut/probe.json). So the gates exercise only one value, and the P95/P5 tails aren't tested. The harness itself (seed count, rank formula) is now verified by unit tests. The tail stays open until the bot or sim has per-seed variance (owner: Economy/HoP).

## Addendum: economy.test with product/ present (run 01:22–01:48, under the lock, 2 workers)
With the symlink `qa/scratch/product → ../../product` in place, `runIf(py)` is true, so the test **ran** (0 skipped):
- **b1004e7 (unmodified): `tests/economy.test.ts` 68 passed (68)**, including 'fixture is fresh vs the live reference sim'. Log: qa-mut/eco-pr7-b1004e7.log.
- **3b464ea: 68 passed (68)**, same. Log: qa-mut/eco-pr7-3b464ea.log.
(The `exit=` field in the job output captured a variable assignment, not vitest. The pass is taken from the vitest summary lines, which show 68/68 with no skips.)
**Result:** the claimed failure **does not reproduce** on either head in this setup. Nothing needs excluding, and there's no regression. **Verdict unchanged: APPROVE.** Caveat: the reference sim was run from the live `/workspace/egg-farm-studio/product` tree as of 01:4x. If the reported fail came from a different product/ state (e.g. pre-F1 fixtures vs an F1 product sim), that's an environment difference to raise with whoever reported it, not a PR #7 issue.
