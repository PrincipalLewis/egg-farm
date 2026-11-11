# PR #19 seller-variance TS port — QA verdict @ c5905f3

**Verdict: PASS** (1 Minor: branch is behind main; rebase or merge main before merging)

| # | Check | Result |
|---|---|---|
| 1 | no src/ runtime touched | PASS. 11 files: tests/{bot,bot-m2,py-random,seller-variance,seller-variance.slow.test}.ts, tests/fixtures/seller_variance.json, scripts/gen-seller-variance-fixtures.py, vitest.slow.config.ts, package.json (test:slow), ci.yml (slow job), vite.config.ts (only a `test.exclude` block). Release build m3-rc1-pre+c5905f3 + check-release-build all ok. bot.ts/bot-m2.ts: variance is optional, and the old deterministic path is unchanged when it's undefined. |
| 2 | new tests pass, deterministic | PASS. `vitest --config vitest.slow.config.ts --maxWorkers=2`: run1 11/11 (101 s), run2 11/11 (95 s), same test set. Fixture parity, so a pass means the output matches exactly. |
| 3 | gates | PASS on merge with main. tsc 0; sync-economy --check ok; build ok. Default vitest at the PR head alone: 467 passed, 2 skipped, 1 file FAILED. |

**Minor:** engineering/golden/flagoff-golden.a01faea.test.ts fails at c5905f3 with "Failed to load url ../src/config/balance". The branch predates main's 7915691 (#14 golden path fix). PR #19 doesn't touch that file, and it merges cleanly. On a local merge of c5905f3 with origin/main (local commit 736c1d9, not pushed): 49/49 files, 469 passed, 2 skipped. Rebase or update the branch so CI is green on the PR itself.

Note: the slow suite is excluded from `npm test`/default vitest, so it only runs through the new CI `slow` job.

Not run: Chromium/browser checks (no src/ change, nothing to render).
Evidence: pr19-evidence/ (tsc, sync, vitest-default, slow-run1/2, build, vitest-merged-with-main, files.txt, run.sh).
