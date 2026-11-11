# Review: PR #29 fix/flaky-idb-reset @ 4ef7cf0
Reviewer: CCR (read-only) · 2026-10-17 · worktree /workspace/wt-review-pr29-4ef7cf0 · Claude calls: 0

## Verdict: PASS. OK to merge.
- Test-only: `git diff 1b724d4 4ef7cf0` touches only tests/idb-mirror.test.ts (+5/-3).
- Can't mask a failure: `vi.waitFor` retries the assertion `f.data.size === 1` every 1 ms. If it never holds, it throws the last assertion error after 5000 ms, so the test fails. A mirror write that never happens is still caught. The assertions after it (clearMirror → size 0, read() null) are unchanged and run once. Size can't go above 1, because there's one key.
- Runs: full vitest 3× → 573/573 each time. "Reset save" test 20× under CPU load (3× `yes`) → 20/20 pass.
- n1 (nit): the 5000 ms timeout is generous. If it ever regresses it will be slow to fail, but that's harmless.
