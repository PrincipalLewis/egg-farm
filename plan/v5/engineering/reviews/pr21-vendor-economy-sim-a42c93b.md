# PR #21 arch/vendor-economy-sim @ a42c93b (base main)
One commit: tests/economy.test.ts, vendor/economy-sim/{SHA256SUMS, README.md, economy.f1-m4cols.csv, sim/economy_sim.py}, engineering/ci-gates.md, status.md. **No src/ change.** Read-only. Claude: 0 calls. /tmp copy.

## Verdict: APPROVE. The key question resolves to a newer ruling (see below). One coordination item with #17 and two minors.

## Key question: eddf945d vs 5ad5a3a6. It's a DIFFERENT sim, not line endings.
- I diffed the vendored file against a 5ad5a3a6 copy (left in /tmp from the #18 re-check), CR-stripped. There are 3 real changes:
  - `CURRENT = F1` → `CURRENT = P1Q` (:45)
  - `M2_CURRENT = M2_F1` → `M2_P4` (40 / 0.4) (:371)
  - a new `--config f1` branch writing the F1 table (:463-464)
- **Ruled:** decisions.md:295 (Oct 17 01:32) and balance-changelog.md:108, "economy_sim.py sha eddf945d. CURRENT reverted to pre-F1 … F1 is config 'f1' … flip CURRENT to F1 when #17 merges". engineering/status.md:300 records why: the live product/ sim broke main's fixture test.
- So eddf945d supersedes 5ad5a3a6 for main, and the vendored file equals product/sim/economy_sim.py today (sha eddf945d…).

## Checks
- **Pins fail closed:**
  - Appending a comment to the vendored sim fails "vendored reference sim matches its sha256 pins".
  - Deleting the CSV fails both the pin test and the fixture test (the sim reads the CSV at import, :39-41).
  - The pin list must be exactly those 2 files.
- **No silent skip:** `it.runIf(py)` is gone. With python3 removed from PATH, "fixture is fresh" FAILS (execFileSync throws).
- **Parsing:** parseEconomyCsv (scripts/sync-economy.ts:14-26) tolerates only `\r?\n`. It still throws on a width mismatch (a trailing comma), on empty or non-numeric cells, and on a level out of order. It compares numeric values, so "1.0" vs "1" is equal, which is acceptable for a value table.
- **Parity:** `toEqual(data)` on the full parsed table, i.e. main's 46 columns, every row, no tolerance (tests/economy.test.ts, the "fixture is fresh vs the vendored reference sim" test).
- **Vendored CSV vs data/economy.csv:** NOT equal, by design. Main's data/economy.csv is pre-F1 (57d964d5…); the vendored economy.f1-m4cols.csv (86f0e80e…) only feeds `--config f1` and must exist at import. `--config current` reproduces main's CSV exactly (the test passes).
- **Gates:** tsc clean; economy.test 69/69; full vitest 471 pass + 1 skipped (49/49 files).

## Findings
- **MAJOR (coordination, not a defect): #17/#18 must rework this test on merge.**
  - #17 b0e8278 changed the same test to `pick` 46 columns from the product/ sim at 5ad5a3a6 (F1 CURRENT) and switched data/economy.csv to 86f0e80e.
  - After both land, the vendored sim's CURRENT (P1Q) no longer matches data/economy.csv. The F1 PRs need `--config f1` (or a re-vendored sim with CURRENT=F1 plus new SHA256SUMS) and the 46-column pick.
  - Merge order and an owner should be set (status.md:300 says Features owns the `--config f1` change). Also the ci-gates.md conflict with #13.
- **MINOR: the pin check doesn't gate the sim run.** The pin and fixture tests are separate `it`s, so a tampered sim still executes (and could pass the fixture test). The suite is red either way, but verify the hashes inside the fixture test (or in a `beforeAll` that throws) so the sim never runs unverified.
- **MINOR: README/comment drift.** The describe title still says "parity with product/sim/economy_sim.py"; rename it to the vendored path. Have the README state which config the test runs and which ruling the pin implements (decisions.md:295).
