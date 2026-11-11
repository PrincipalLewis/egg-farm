# Re-check: PR #19 seller variance — efd7d94 (vs 3155bbd)

Read-only delta re-check. Worktree /workspace/review-efd7d94 (detached). Runs in /tmp/r19b, a clone with history. Claude calls: 0.

## Verdict: CHANGES REQUESTED (2 major, no blockers)
The F1 path works: on F1 the AC7 band is a real, hard assert, and it **passes**. But the expected-fail gate is too wide. It also hides crashes, and once #17 lands the documented fixture regeneration doesn't work.

## Verified
- **src untouched:** `git diff 3155bbd efd7d94 -- src` is empty. The changes are tests, fixture, generator, vite/vitest config, package.json and ci.yml.
- **efd7d94 on 57d964d5:** `npm run test:slow` passes 11/11 (155 s), with L@30 P5/P95 17/17-18 for m1/m2 as before. The band tests are expected-fail. Default `vitest run` excludes `*.slow.test.ts` (confirmed).
  - The single failure in the default run is `engineering/golden/flagoff-golden.a01faea.test.ts`. That is the import-path problem on main which PR #14 fixes, and it's unrelated to this PR.
- **On 86f0e80e** (efd7d94 + merge of #17 at b0e8278, csv sha256 86f0e80e): the band test is a plain `it`.
  - **Variance bot AC7 on F1, 100 seeds, TS: m1 (no workers) L@30 P5/P50/P95 = 20/20/20, worst 19 → PASS for L18–22. m2 (workers) 20/21/21, worst 20 → PASS for L20–24, with P5 on the lower edge.** This matches the proposal's numbers.
- **Missing fixture:** `fx` is read at module top level, so a missing or unparseable fixture fails the whole file. it.fails does not mask it.
- **15 s tolerance (m2 old bot):** 0/100 seeds are bit-exact (expected: the workers economy is partly demand-bound and the demand RNG is xorshift vs Python's). The test still requires the same set of levels and an identical per-seed L@30, and 15 s equals one sell step. **Justified.**
- **CI `slow` job:** it runs on `push` and `pull_request` (workflow-level `on`), with no `if:`/`continue-on-error`/path filter, and `npm run test:slow` exits non-zero when a test fails, so it fails the build. Whether it *can't be skipped* depends on branch protection marking `slow` as required. I can't see that from the repo, so it needs an admin to check.
- **Spread / 15-of-30:** now also asserted on the Python fixture (`:103-106`). Closed.
- **Fixture minified:** closed.

## Findings
### M1 (major) — any CSV other than F1 becomes "expected-fail", so an unknown sha goes green instead of failing
`tests/seller-variance.slow.test.ts:120`: `csvSha === F1_CSV ? it : it.fails`. Repro: append a newline to `data/economy.csv` (sha 168b74da), then run `npx vitest run --config vitest.slow.config.ts -t "AC7 band"`. Both band tests are reported ✓ `[expected-fail]`, so any future economy that fails AC7 passes CI. Fix: `F1 → it`, `57d964d5 → it.fails`, any other sha → a test that fails ("unknown economy csv <sha>: update the AC7 gate").

### M2 (major) — it.fails masks exceptions
The same line, `:120-124`: a thrown error inside the band test counts as an expected failure. Repro: insert `throw new Error('boom')` at `:122` and run as above. The result is ✓ 2 passed. A crash in `runBot`/`runM2` (or a renamed field) on the pre-F1 CSV would therefore be invisible. Fix: catch inside the test and assert that the failure is the band `AssertionError` with the expected L@30 values (P5 = 17). Alternatively, assert the known failing values (17/18) directly as a hard `it`, instead of using it.fails.

### m1 (minor) — after #17 merges, the slow suite turns red and the documented fix doesn't work
On efd7d94 + #17, `test:slow` fails 4 parity tests (stale fixture, which is correct fail-closed behaviour). But `scripts/gen-seller-variance-fixtures.py` then aborts with `AssertionError: 6` at its P1Q-vs-CSV guard: P1Q formulas ≠ 86f0e80e costs from level 6. So the "regenerate the fixture first" step in the test header can't be done. Either #17 or this PR needs the generator to support the F1 formula set (`S.Eco(<F1 preset>)`), and the merge order should be agreed with the #17 author.
