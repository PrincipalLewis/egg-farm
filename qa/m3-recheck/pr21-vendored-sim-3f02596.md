# PR #21 vendored sha-pinned economy_sim.py — QA verdict @ 3f02596

Head 3f02596 (commits a42c93b vendor, 5f1490f SOURCE sidecar, 3f02596 config-by-csv-sha + beforeAll pins). Diff vs origin/main: tests/economy.test.ts, vendor/economy-sim/*, engineering/{ci-gates,status}.md only; no src/.
Worktree: /tmp/pr21env/game, so `../../product` resolves to /tmp/pr21env/product, a scratch copy (scratch/qa-pr21) — originals never touched.

**Verdict: PASS** (1 Minor note, not a blocker for this PR)

| # | Check | Result |
|---|---|---|
| 1 | tests read only the in-repo sim | PASS. economy.test.ts executes only vendor/economy-sim/sim/economy_sim.py; the sole ../../product read is the advisory drift warning (never fails). No strace on box; independence proven by mode B/C below. |
| 2 | vendored file records product/ source sha | PASS. SOURCE + SHA256SUMS: sim eddf945d…646dc ← product/sim/economy_sim.py, csv 86f0e80e…0550 ← product/economy.f1-m4cols.csv, vendored 2026-10-17. Both equal sha256 of current product/ files; `cmp` byte-identical. product/ is not a git repo, so "origin in history" = current content only (cannot check older history). Pins verified in beforeAll and in a test. |
| 3 | editing product/sim doesn't change unit results | PASS. A unchanged 473/0/0; B sim edited (comment + COLL_SHARE 0.5→0.9, SELL_EVERY 15→3, csv header col added) 473/0/0, per-test results identical (diff-A-vs-B empty); C product/ hidden 472 pass + 1 skip (economy-copy.test runIf), exit 0. |
| 4 | gates | PASS. vitest (maxWorkers=2) 473/473; tsc 0; vite build + check-release-build ok; sync-economy --check ok; check-globals chromium PASS; rc0 chromium 197/197. |

**Minor (pre-existing, outside PR scope):** `npm test` still depends on product/economy.csv via scripts/check-economy-copy.mjs and tests/economy-copy.test.ts. Mode B2 (edit product/economy.csv line 2 in temp copy) → copy-check exit 1 and 2 economy-copy tests fail. That is the intended data-copy guard, not the sim, but it means "an edit in product/ cannot turn main red" (ci-gates.md wording) is true only for the sim. Suggest the doc say "sim" or HoE decide whether the copy check stays.

Repro: `qa/m3-recheck/pr21-evidence/modes.sh <outdir>` (worktree at /tmp/pr21env/game, scratch copy at scratch/qa-pr21).

Not run: check-globals and rc0 in firefox/webkit (no src/ change; low value); strace (not installed); product/ git history (none exists).

Evidence: pr21-evidence/3f02596/ (A/B/B2/C logs, results.tsv, diffs, tsc.log, build.log, check-globals-chromium.log, rc0-chromium.log); pre-run at a42c93b in pr21-evidence/pre-a42c93b/ (partial, interrupted).
