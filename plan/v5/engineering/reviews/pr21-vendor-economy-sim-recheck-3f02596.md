# PR #21 delta re-check a42c93b → 3f02596 (5f1490f, 3f02596)
Read-only, 0 Claude calls, /tmp copy. Diff: tests/economy.test.ts, vendor/economy-sim/{README.md, SOURCE (new)}, ci-gates.md. **No src/ change.**

## Verdict: PASS. All a42c93b findings are closed. Two nits.

| Claim | Status | Evidence |
|---|---|---|
| Config is chosen by CSV sha; an unknown sha fails | ✅ | `CONFIG_BY_CSV_SHA` maps 57d964d5→current and 86f0e80e→f1. An unknown sha throws `unknown economy.csv <sha>`. Test: a one-byte CSV change gives a hard FAIL (1 failed), not a skip. |
| #17's CSV with f1 gives an exact 46-column match | ✅ | I dropped in b0e8278:data/economy.csv (sha 86f0e80e). "fixture is fresh" PASSES with `cols.length==46` asserted, the row count equal and `toEqual` with no tolerance. The only other failures are AC6, because this branch has main's balance.json/config, not #17's; that clears once #17's config lands. |
| beforeAll throws on a pin mismatch | ✅ (see nit 1) | Tampered sim: vitest exits 1 with "Failed Suites 1 / Test Files 1 failed" naming the economy describe. All 37 tests in that describe are reported **skipped**, not green, and the sim never runs. The fixture test also calls `checkPins()` again itself. |
| Retitled | ✅ | `parity with vendored reference sim vendor/economy-sim` |
| README config table | ✅ | vendor/economy-sim/README.md maps CSV sha → config and cites decisions.md:295. SOURCE is in the update steps. |
| Gates 473/473 | ⚠ wording | Full vitest: **472 passed + 1 skipped (473)**, 49/49 files. The skip is the existing economy-copy test, not from this PR. economy.test: 70/70. tsc as before. |
| Merge order #21 first | ✅ OK | With #21 first, #17 only swaps the CSV (already mapped to f1) and drops its own product/ test edit. The map keeps working after #17 without re-vendoring. |

## 5f1490f (provenance)
- Adds vendor/economy-sim/SOURCE: a vendoring date plus `<sha256> <vendored path> <source path>` for both files.
- A test asserts the SOURCE hashes equal the SHA256SUMS pins and the date is YYYY-MM-DD.
- An advisory-only check: if `../../product/...` exists locally and its sha differs, it `console.warn`s and never fails. It's harmless in CI because the path is absent there.

## Nits
1. A pin mismatch reports the suite as failed but its 37 tests as "skipped" (the 33 tests outside the describe pass). The run is red and exits 1, so it fails closed. A reader skimming only the "Tests" line sees "33 passed | 37 skipped" with no "failed" count, so CI should gate on the exit code / failed-suite count, which it does.
2. The advisory SOURCE check reads `../../product/` when it exists. That's a small exception to "never reads /workspace/product". It's read-only and can't fail the test, but say so in the README.
