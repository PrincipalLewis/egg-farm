# PR #33 review: vendor economy sim 10f29a4a (F1 default) @ 17245d2, base main 97a57c1
Claude Code Reviewer (read-only), 2026-10-17 ~07:55 UTC+2. Zero Claude calls. Detached worktree.

## Verdict: PASS (no blocking or major findings). Fix m1 before merge or right after. It fails closed, so nothing is masked today.

## Verified
- Sim bytes: vendor/economy-sim/sim/economy_sim.py has sha 10f29a4a and equals the SOURCE/SHA256SUMS pins.
  - Compared byte for byte with 97a57c1 (eddf945d): exactly 2 changed lines, at l.45 `CURRENT = F1` and l.371 `M2_CURRENT = M2_F1`, plus their comments. Both versions have 467 lines, 0 CR, and no BOM.
  - `git check-attr`: text unset (`vendor/economy-sim/** -text`, listed after `*.csv`).
- SOURCE, SHA256SUMS and README agree: same 4 paths, same shas, matching sha256sum of the files. check-vendor-pins: 4 match, no unlisted files.
- Tamper tests (tests/economy-copy.test.ts:72/86/97) fail closed. Mutation check: putting the old `eddf945d` prefix back makes 3 of the 13 tests fail, so the tamper is real and the regexes are not vacuous. Assertions are unchanged.
- Fixtures: regenerated with `python3 -B scripts/gen-sim-fixtures.py` and `gen-seller-variance-fixtures.py`, and git status is clean afterwards, so they are byte-identical. gen-sim uses `m.F1` and seller-variance uses `spec_from_csv(data/economy.csv)`. Neither reads CURRENT or M2_CURRENT.
  - `--config current` and `--config f1` now both reproduce data/economy.csv (86f0e80e) on all 46 columns.
- Runtime: no src/ change. The only src reference to the sim is a comment (src/config/formulas.ts:3). No product read and no new globals (check-globals PASS). AC7 worst-seed and seller-variance slow tests keep their band asserts and pass (slow 14/14).

## Gates @ 17245d2
- tsc: OK. sync --check: OK.
- vitest full x2: 583/583, 583/583.
- golden f90d1678: 2/2.
- test:slow: vendor pins OK + 14/14.
- build and build:html: all release checks OK.
- git status: clean after the tests, slow, builds and fixture regeneration.
- check-globals, PORT unset: PASS (only eggfarmExportTelemetry).
- check-economy-copy (default): skip, exit 0.
- --strict: exit 1, failing only on `vendor/economy-sim/sim/economy_sim.py (10f29a4a) differs from product/sim/economy_sim.py (eddf945d)`. This is expected until Economy copies the file. economy.csv no longer drifts: product/ is now 86f0e80e.

## Findings
- m1 (minor): tests/economy.test.ts:71 maps pre-F1 57d964d5 to `p1q`, but that mapping cannot pass.
  - The sim's CSV writer emits the 46-column v11 table only for `current` and `f1` (economy_sim.py:463-465). `--config p1q` goes through `write_csv` and emits 17 M1 columns, and the test asserts 46.
  - Repro: copy the pre-F1 data/economy.csv (b652cb0, sha 57d964d5) into the worktree and run `npx vitest run tests/economy.test.ts -t "fixture is fresh"`. It fails with "expected 17 to be 46".
  - The old sim's `--config current` on that CSV matched all 46 columns with 0 mismatches, so the pre-F1 freshness path worked before this PR and is now broken. It fails closed rather than masking anything.
  - Fix: drop the 57d964d5 row (main is F1 now, so an unknown sha gives the intended hard failure), or have Economy add a v11 writer for p1q with M2_P4.
- m2 (minor, PR body): "Pre-F1 stays as `--config p1q`" is true only for the in-process `m.P1Q` / report path, not for the CSV table, so the freshness-map bullet is inaccurate (see m1). The body's "check-economy-copy exit 0 (skip)" is correct but is the opt-in skip, not a product check. The other claims are accurate.
- n1 (nit, out of scope, already flagged in the body): vendored seller_variance_sim.py:402 still has `M2_CURRENT = M2_P4`. It is harmless for the fixtures, which use spec_from_csv, but confusing.
- n2 (nit): tests/pacing-acw1.test.ts:7 comment cites `spec=M2_CURRENT`, which now means M2_F1. Check that the reference numbers there were produced with M2_F1 or name the spec explicitly.
