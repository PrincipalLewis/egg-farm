# PR #36 review: AC7 L21 -3% trim @ ca9c9bc, base main acaceee
Claude Code Reviewer (read-only), 2026-10-17 ~08:45 UTC+2. Zero Claude calls. Detached worktree.

## Verdict: PASS (no blocking, major or minor findings; 1 note, 2 nits)

## Verified
- **CSV diff.** data/economy.csv goes from 86f0e80e to 6dca24cd. The header and all 31 rows are unchanged except two L21 cells:
  - farm_cost 41918 → 40660 (= floor(41918 × 0.97) = floor(40660.46)).
  - w4_tier_cost 20959 → 20330 (= floor(0.5 × 40660), the same share rule as the other rows; also = floor(20959 × 0.97)).
  - Both are integers with no float artifacts.
  - Still monotonic: L20 31050 < L21 40660 < L22 56589.
  - The vendored economy.f1-m4cols.csv and data/staging/economy.f1-m4cols.csv are byte-identical to it (6dca24cd).
  - Line endings: all LF (`ls-files --eol` i/lf w/lf). data/ and staging use text eol=lf; vendor/ is -text.
- **balance.json.** Only farm.costTable[21] 41918 → 40660 and grader tier farm 21 cost 20959 → 20330 change. sync --check: OK.
- **Fixtures.** `python3 -B` for gen-sim-fixtures and gen-seller-variance-fixtures leaves git status clean, so they are byte-identical to the PR's.
  - economy_sim.json changes only at the 3 L21 values.
  - seller_variance.json changes widely, which is expected: its 60-min runs pass L21.
- **Pins.** No live reference to 86f0e80e is left. economy.test.ts, cost-segments, staging-f1-m4cols, the seller-variance AC7 band, the ac7-worst-seed F1_CSV, SOURCE, SHA256SUMS and the README all use 6dca24cd.
  - The remaining 86f0e80e hits are comments or labels only (see n1). No skip or fallback accepts the old hash.
  - In economy.test.ts an unknown sha still hard-fails, and 86f0e80e is no longer mapped.
- **Vendored sim parity.** The sims read the vendored m4cols CSV at import (_F1_FC/_F1_W4). The freshness test (`--config f1` vs data/economy.csv, 46 columns) passes, so parity holds. The #17 costTable path equals the CSV on every level (cost-segments test).
- **Golden f90d1678 unchanged, and why.** The golden bot runs for 1800 s (seller15/cheapest, seeds 1-6). The scripted run is 600 s with $50k. Both end at a maximum farmLevel of 20 (measured), so costTable[21] (the L21→22 price) and the grader tier at farm 21 are never read.
- **AC7.**
  - No workers: L@30 P5/P95 = 20/20, within the band L18-22 with P5 ≥ 18.
  - Workers: 20/21, within L20-24.
  - Variance t18 TS vs PY parity holds.
  - Worst-seed guards: variance L18-25 slowest P95 361.0 s (≤ 390), worst 378.3 s (≤ 480). Fixed P95/worst 270 s (≤ 360). t20 P95 1670 s is under the 1740 s warn threshold.

## Gates @ ca9c9bc
- tsc: OK. sync --check: OK.
- vitest full x2: 592/592, 592/592.
- golden: 2/2 (f90d1678).
- test:slow: vendor pins OK + 14/14.
- build and build:html: release checks OK.
- git status: clean after all gates and fixture regeneration.
- check-globals, PORT unset: PASS (only eggfarmExportTelemetry).
- --strict: exit 1. The only ERROR line is `vendor/economy-sim/economy.f1-m4cols.csv (6dca24cd) differs from product/economy.f1-m4cols.csv (86f0e80e)`.

## Findings
- **note:** --strict reports the vendored m4cols file, not the data/economy.csv drift you mentioned (product/economy.csv is still 86f0e80e). The data/economy.csv line did not appear, which suggests the script stops at the first ERROR.
  - It is expected red until Economy copies 6dca24cd to product/economy.f1-m4cols.csv and product/economy.csv, but that hand-off now covers 2 product files.
  - Expect a second ERROR to appear after the first copy if only one file is updated.
- **n1 (nit):** the vendored sims' F1 name labels and comments still say 86f0e80e (economy_sim.py:37/44/45, seller_variance_sim.py:37/44, seller-variance-proposal.md). They are pinned Economy files, so this is cosmetic; Economy can update them on the next vendoring.
- **n2 (nit):** tests/seller-variance.slow.test.ts:116/125 comments still say "needs #17 economy.f1-m4cols 86f0e80e" for the pre-F1 branch; this should read 6dca24cd. tests/sync-economy.test.ts:23 comment cites 86f0e80e.
