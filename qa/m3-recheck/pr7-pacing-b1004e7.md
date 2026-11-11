# PR #7 (PrincipalLewis/egg-farm) head b1004e7: AC7 pacing gates vs HoP standard (product/ac7-qa-threshold-changes.md)
Saves QA · 2026-10-17 00:45 CEST · head re-checked at 00:39 via `git ls-remote origin refs/pull/7/head` = b1004e7c39bd (unchanged). Clean detached worktree qa/scratch/pr7-b1004e7 (node_modules symlinked, package-lock identical to a01faea). Evidence: qa/scratch/pr7-b1004e7/qa-mut/ (run.log, full.log, tsc.log, probe.json, pacing.*.test.ts{,.log}). Every vitest/tsc run was under `flock .browser-test.lock`, with `--maxWorkers=2`; lock acquired 00:14:03, load 4.4. No push, merge or comment.

**Recommendation: CHANGES REQUESTED (Minor).** The gates match the HoP standard, 465/465 tests pass (463 passed + 2 skipped) and tsc is clean. But the 30 seeds produce **identical** results, so the P95 / seed-count part of every gate is vacuous and two of the mutations survive. Fix with two cheap asserts (below), and escalate the seed-invariance to Economy/HoP.

## Scope
`git diff --stat a01faea b1004e7` (merge-base = origin/main a01faea): `tests/pacing.test.ts | 29 ++++++---` only. **PASS.**

## Gates (static + run)
| Gate | Status | Evidence |
|---|---|---|
| 30 seeds | PASS | `SEEDS = Array.from({ length: 30 }, …)`; header updated ("30 seeds (P95 needs >= 30) … P95 + worst-seed guard"). |
| P95 rank = ceil(0.95N), 1-indexed on sorted values | PASS | `quant = a[min(n-1, max(0, ceil(q*n) - 1))]` on an ascending copy. 0-indexed `ceil(qN)-1` = 1-indexed rank `ceil(qN)` = 29 of 30. The low tail `q=0.05` gives rank 2 = N+1−ceil(0.95N) (symmetric) ✔. Unreached L10 counts as Infinity, so it fails rather than being skipped ✔. |
| L10 P95 within 8–12 min | PASS | P95-high ≤ 12 and P95-low ≥ 8 (band kept, per spec "Keep the band. Judge at P95"). Measured: **every seed 9.25 min.** |
| L18–22 at 30:00, no workers | PASS | `runBot(b, s, 'seller15', 1800).farmAt(1800)`. runBot is the M1 bot with no hire path (workers live only in bot-m2). P05 ≥ 18 and P95 ≤ 22. Measured: **every seed L18** (on the lower edge; L17 at 25:00). |
| With-workers L20–24 soft behind WORKERS_GATE=false | PASS (acceptable until F1) | `runM2(… seller15, T 1800)`. With `WORKERS_GATE=false` it only `console.warn`s; the comment says to flip it in the F1 merge PR. Measured: every seed L18 (warns, as the comment says for pre-F1). Flipping it to true fails, as expected. Nit: `levelAt` floors at 1 while the farm starts at 0 (harmless). |
| Full suite / tsc | PASS | `vitest run tests` → 47 files, **Tests 463 passed, 2 skipped (465)**, exit 0. `tsc --noEmit -p .` exit 0, no output. |

## Mutations (scratch copies in qa-mut/, tests/pacing.test.ts never modified; worktree `git status` shows only `?? qa-mut/`)
| Mutant | Result | Note |
|---|---|---|
| L10 upper 12 → P95−0.01 (9.24) | **killed** (L10 test fails) | |
| L10 lower 8 → P05+0.01 (9.26) | **killed** | |
| L18 upper 22 → 17 | **killed** (L18 test fails) | |
| L18 lower 18 → 19 | **killed** | |
| L18 time bound farmAt(1800) → farmAt(1500) | **PENDING** (queued under the lock since 00:39, pid 1204530; result goes to qa/scratch/pr7-b1004e7/qa-mut/run2.log) | My first attempt mutated a log line instead of the gate, so it was invalid and discarded. Re-run on the correct line is pending/below. Probe: every seed is L17 at 25:00, so this must fail. |
| WORKERS_GATE false → true | **killed** (with-workers test fails, lo = hi = 18) | Confirms the soft gate is real. |
| Seed count 30 → 20 | **SURVIVED** | Nothing asserts the seed count, and the results don't depend on the seed. |
| P95 rank ceil(qN)−1 → ceil(qN) (rank+1), with L10 upper tightened to exactly P95 = 9.25; control (original rank, same tight bound) passes | **SURVIVED** | All 30 values are equal (9.25), so any rank returns the same value. A rank-formula error can't be detected with this data. |

## Findings
- **F-1 (Major, escalate to Economy/HoP, not a PR defect):** `probe.json` shows the seller15 bot gives **identical** outcomes for all 30 seeds. L10 = 9.25 min, L@30:00 = 18, L@25:00 = 17, with workers L18. So "P95 across 30 seeds" equals median, worst and best. The standard's tail protection adds nothing for these gates until the sim/bot has per-seed variance (customer RNG apparently doesn't move a sell-all bot). Also, L18 sits exactly on the band's lower edge for every seed, so any pre-F1 economy change that slows one level fails the gate.
- **F-2 (Minor, PR):** add `expect(SEEDS.length).toBeGreaterThanOrEqual(30)`. Also add a small `quant` unit test on synthetic data (e.g. 1..30 ⇒ q 0.95 → 29, q 0.05 → 2; 1..20 ⇒ 19). Then the seed-count and rank mutants are killed whatever the sim's variance.
- Nit: the no-workers test runs 30 extra `runBot(…, 1800)` sims that are the same as the `seller` array (T defaults to 1800). It could reuse `seller`.
