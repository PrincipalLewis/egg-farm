# Re-check PR #17 3ea9f04 → b0e8278
Commits 81a62aa, b0e8278 (scripts/sync-economy.ts, tests/economy.test.ts, tests/sync-economy.test.ts). Read-only. Claude: 0 calls. /tmp copy with sibling product/.

## Verdict: PASS. Both minors are fixed.

- **Fails closed:**
  - scripts/sync-economy.ts:44-46 throws on any `!(R[i].farm_cost > R[i-1].farm_cost)` before the mode branch, so it covers both per-level and curve mode, and NaN fails as well.
  - Verified: making L23 equal to L22 in data/economy.csv makes `sync-economy --check` exit 1 with "farm_cost must be strictly increasing: L23=56589 <= L22=56589".
  - Tests: tests/sync-economy.test.ts covers flat, decreasing, and curve mode.
- **Parity is exact:** tests/economy.test.ts:40-49.
  - `toEqual` on the parsed numbers for all sim columns, with no tolerance. It asserts `cols.length === 46` and an equal row count.
  - It ran (not skipped) in /tmp, with python3 present: 68/68 pass.
- **Sim:** product/sim/economy_sim.py sha256 is 5ad5a3a6019e…, the one ruled at decisions.md:290 (00:58, writer now yawn 50 / threshold 0.5).
- **Gates:** tsc clean; check-economy-copy matches; sync up to date; vitest 479/479. Golden import pending #14.

## Findings
- **MINOR: the parity test runs only when the studio product/ dir is present** (`it.runIf(py)`, :41), and it doesn't pin the sim sha. In CI without product/ it silently skips. When product/ is present, a changed sim would fail it, which is correct. Consider asserting the sim file's sha (5ad5a3a6) so a sim change gives a clear message, and note the CI skip.
