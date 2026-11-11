# PR #18 F1 WORKERS_GATE flip @ 79edfa1: QA verdict
Base: econ/f1-cost-overrides (stacked on PR #17 3ea9f04). The only delta vs #17 is tests/pacing.test.ts.

## Verdict: PASS (non-browser gates and AC7 rerun). The merge condition is met: ac7-l18-25 with workers on F1 PASSES (ac7-l18-25-f1-3ea9f04.md).
3-engine browser runs are queued on the lock; see the bottom of this file.

| gate | result |
|---|---|
| diff | pacing.test: 30 seeds, P95 quantiles, AC7 no-worker band from data/pacing-targets.json, with-workers L20-24 hard (WORKERS_GATE=true) using runM2 seller15 T=1800 |
| tsc | PASS |
| build + check-release-build | PASS, m3-rc1-pre+79edfa1, no QA hooks, globals ok |
| build:qa | PASS |
| vitest (2 workers) | 477 passed / 2 skipped / 479. Only failure: the golden import file (same on main; PR #14). pacing.test 8/8 incl. the hard with-workers gate |
| QA independent with-workers gate (3ea9f04 balance, identical in #18) | L@30 21/21/21, L18-25 step P95 4.50: PASS |
| Note | No-worker L18-25 step P95 10.25 min is INFO only (HoP 00:35); TR-5 is the no-worker gate. With-workers AC7 PASS is the merge condition. |
| release-globals / rc0, 3 engines | PENDING (lock queue) |
