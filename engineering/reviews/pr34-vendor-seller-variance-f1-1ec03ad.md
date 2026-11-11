# PR #34 review: vendor seller_variance_sim 68a64c59 (F1) @ 1ec03ad, base main 2311741
Claude Code Reviewer (read-only), 2026-10-17 ~08:10 UTC+2. Zero Claude calls. Detached worktree.

## Verdict: PASS (no blocking, major or minor findings; 2 nits)

## Verified
- 384fccc vendor/economy-sim/sim/seller_variance_sim.py changes from 560ea73b to 68a64c59.
  - The byte diff is exactly 1 line replaced by 2: l.402 `M2_CURRENT = M2_P4` becomes l.402 `M2_F1 = deepcopy(M2_P4); update(yawn_at=50, manage_at=50)` and l.403 `M2_CURRENT = M2_F1`. Nothing else changed.
  - The file is LF only (0 CR, no BOM). `git check-attr` shows text unset.
- M2_F1 is consistent with data/economy.csv 86f0e80e: yawn_at_pct = 50 and manage_prompt_threshold = 0.5 on all rows.
  - The generator builds its worker spec with spec_from_csv(data/economy.csv), whose yawn_at is 50. It doesn't use M2_CURRENT.
  - The remaining M2_F1 vs spec_from_csv key differences (wage_carry, manage_all_low_only, w1.defer/hold_until_servable) are the same as P4 vs CSV before this PR; they are not introduced here.
- SOURCE, SHA256SUMS and README agree on 68a64c59…98f1. check-vendor-pins: 4 match, no unlisted files.
- Fixtures: re-ran `python3 -B scripts/gen-seller-variance-fixtures.py` and `gen-sim-fixtures.py`, and git status is clean afterwards. Against main, seller_variance.json differs only at l.3, the sim_sha256 label 560ea73b → 68a64c59. The traces are byte-identical.
- 0c642e9:
  - The 57d964d5 row is removed from tests/economy.test.ts:71 and from the README table. Putting the pre-F1 CSV in place now hard-fails with "unknown economy.csv 57d964d5…: update vendor/economy-sim".
  - The pacing-acw1:7 comment now names M2_F1 (50/0.5).
- 1ec03ad: the merge-tree of its parents (0c642e9, main 2311741) is conflict-free, and the auto-merge tree equals the committed tree.
- Slow tests: 11 seller-variance parity tests (31 expects, including AC7 quantiles and targets 1-2) and 3 AC7 worst-seed guards. The guards assert `g.failures` = [] against the l18_25 bounds; the t20 P95 is warn-only, by design.

## Gates @ 1ec03ad
- tsc: OK. sync --check: OK.
- vitest full x2: 592/592, 592/592.
- golden: 2/2.
- test:slow: vendor pins OK + 14/14.
- build and build:html: release checks OK.
- git status: clean after all gates and fixture regeneration.
- check-globals, PORT unset: PASS (only eggfarmExportTelemetry).
- --strict: exit 1, failing only on `seller_variance_sim.py (68a64c59) differs from product (560ea73b)`, as expected until Economy copies the file.

## Findings
- n1 (nit): vendor/economy-sim/README.md, 10f29a4a pin line: "pre-F1 stays available as `--config p1q`" holds only for the report/in-process path. The CSV writer for p1q has 17 columns (the #33 m1 context). Reword it or drop it.
- n2 (nit): tests/ac7-worst-seed.slow.test.ts:29/36 titles still say "skipped on pre-F1 57d964d5". With the freshness row gone, that CSV now hard-fails earlier in economy.test.ts. The titles are harmless but stale.
