# PR #37 review: start_coop_eggs column @ 85e5bb1, base main 8e6d53e
Claude Code Reviewer (read-only), 2026-10-17 ~09:25 UTC+2. Zero Claude calls. Detached worktree.

## Verdict: PASS (no blocking, major or minor findings; 1 note, 1 nit)

## Verified
- CSV diff (byte level, all 3 copies):
  - data/economy.csv, data/staging/economy.f1-m4cols.csv and vendor/economy-sim/economy.f1-m4cols.csv are each a pure append. Every line is `old + ",start_coop_eggs"` on the header and `old + ",10"` on all 31 rows; nothing else changes.
  - LF only (0 CR). 125 → 126 columns.
  - All 3 files are byte-identical (9980ec22).
  - Constant 10 on every row is what Economy intended: product/balance-changelog.md:134 says "6dca24cd plus one constant column", and first-minute-proposal.md:75 re-pins the same 9980ec22.
- Column counts are consistent: all three files have 126 columns. "46" is the subset the vendored sim's CSV writer emits.
  - economy.test.ts deliberately compares only `Object.keys(sim[0])` (46), so the extra column is skipped by design.
  - The sim reads the CSV with DictReader and ignores the column. The freshness test passes.
- The sync ignore is real: sync --check passes, and src/config/balance.json is byte-unchanged (`git diff --quiet`). No runtime consumer: `rg start_coop_eggs src scripts` finds nothing, and initialState still has coop 0.
- data/economy.f1.csv is untouched (4ad1349a).
- Pins:
  - The 6dca24cd hits left are history comments only (README:23 provenance line, "was 6dca24cd"). Live pins are 9980ec22 in economy.test (map), staging (sha, 126 columns, new last-column/constant-10 test), cost-segments, the AC7 band and worst-seed switches, SOURCE and SHA256SUMS.
  - Unknown hashes still hard-fail; the map has one entry.
- Fixtures: re-ran `python3 -B` for gen-sim and gen-seller-variance, and git status is clean afterwards. The only fixture change vs main is seller_variance.json `economy_csv_sha256` 6dca24cd → 9980ec22. economy_sim.json is unchanged.
- Golden f90d1678 is unchanged. AC7 is unchanged from #36:
  - L@30 without workers P5/P95 20/20, with workers 20/21.
  - Worst-seed variance P95 361.0 s / worst 378.3 s, fixed 270 s.

## Gates @ 85e5bb1
- tsc: OK. sync --check: OK.
- vitest full x2: 593/593, 593/593.
- golden: 2/2.
- test:slow: vendor pins OK + 14/14.
- build and build:html: release checks OK.
- git status: clean after all gates and fixture regeneration.
- check-globals, PORT unset: PASS (only eggfarmExportTelemetry).
- --strict: exit 1, with one ERROR: `vendor/economy-sim/economy.f1-m4cols.csv (9980ec22) differs from product/economy.f1-m4cols.csv (6dca24cd)`. This is the expected product drift. The changelog says Economy promotes the file to product/ on merge. product/economy.csv is presumably also behind and not reported, because the script stops at the first ERROR (#36 note).

## Findings
- note: the "label" change in seller_variance.json is `economy_csv_sha256`, not `sim_sha256` (the sim is unchanged). That is correct; the request wording just named the wrong field.
- n1 (nit): the staging test comment (tests/staging-f1-m4cols.test.ts:5) still ends with "Live data/economy.csv untouched until merge", which has been stale since #17/#36. data/economy.csv is the same bytes.
