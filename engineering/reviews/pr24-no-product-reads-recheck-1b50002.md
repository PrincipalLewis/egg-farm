# PR #24 re-check: check-economy-copy at 1b50002 (on top of a8f8611, which passed)
Reviewer: Claude Code Reviewer (read-only). Detached worktree /workspace/wt-pr24-1b50002. Claude calls: 0.
Diff a8f8611..1b50002: scripts/check-economy-copy.mjs (+13/-4), tests/economy-copy.test.ts (+23), engineering/status.md.

## Verdict: PASS. OK to merge. m1 from a8f8611 is fixed. No blocking or major findings.

## Gates (re-run at 1b50002)
- tsc --noEmit: OK
- vitest (maxForks=2): 49 files, 478/478 passed
- test:slow: 11/11 passed
- sync-economy --check: OK ("balance.json up to date")

## Claim verification (real tamper runs, `node scripts/check-economy-copy.mjs --strict`, temp copies of vendor/economy-sim)
| Tamper | Result |
|---|---|
| baseline (no env) | exit 0, 4 files match |
| SOURCE row path changed to `C:economy.f1-m4cols.csv` | exit 1, "vendored C:economy... not found" (no crash) ✔ |
| SOURCE row dropped (3 vs 4) | exit 1, count mismatch ✔ |
| extra SHA256SUMS entry (4 vs 5) | exit 1, count mismatch ✔ |
| SHA256SUMS removed | exit 1, "SOURCE or SHA256SUMS not found" ✔ |
| ECONOMY_VENDOR_DIR = empty dir | exit 1 ✔ |
| ECONOMY_VENDOR_DIR = missing dir | exit 1 ✔ |
| ECONOMY_VENDOR_DIR = "" | treated as unset; real vendor dir checked ✔ |
| ECONOMY_VENDOR_DIR path containing `#` | exit 1 (fails closed) |
| self-consistent alt dir listing only 1 file | **exit 0** (see m1) |
| SHA256SUMS hash changed, count unchanged | **exit 0** (see m2) |
| SOURCE vendored path `../../../../workspace/egg-farm-studio/product/sim/economy_sim.py` | **exit 0** (see n1) |

Inheritance: ECONOMY_VENDOR_DIR is not referenced in .github/workflows/ci.yml, package.json, ops/ or engineering/ docs. Nothing in CI or release sets it.

## Findings
- **m1 (minor): ECONOMY_VENDOR_DIR is honoured silently in any run and isn't documented as test-only outside one code comment.** scripts/check-economy-copy.mjs:20-21, engineering/ci-gates.md (no mention).
  Empty or missing dirs fail closed, which is good. But if the variable leaks into a release shell, a self-consistent alternate dir (even with one file) passes, and the repo's real vendor/economy-sim is never checked against product/. Product drift is still caught for whatever the alt dir lists.
  Repro: build a dir with sim/economy_sim.py plus a 1-row SOURCE and a 1-row SHA256SUMS, then run `ECONOMY_VENDOR_DIR=<dir> node scripts/check-economy-copy.mjs --strict`. It exits 0 with "1 vendored file(s) match".
  Suggested fix: honour it only when VITEST is set (or refuse it under CI or a release), print the overridden path, and document it in ci-gates.md.
- **m2 (minor): SHA256SUMS is only counted, never compared with SOURCE.** scripts/check-economy-copy.mjs:27,30.
  Repro: `sed -i 's/^eddf/0000/' SHA256SUMS` in a tampered copy, then run --strict. It exits 0. The two pins can disagree without the check noticing.
  Suggested fix: require each SOURCE `<sha> <vend>` to appear exactly in SHA256SUMS.
- **n1 (nit): the vendored path isn't confined to the vendor dir.** scripts/check-economy-copy.mjs:34.
  `join(vdir, vend)` accepts `../` paths, so a SOURCE row can point at product/ itself and compare the file with itself. To exploit this, someone has to commit a SOURCE edit, which PR review should catch.
  Suggested fix: reject a row when relative(vdir, v) starts with `..` or the path is absolute.
- **n2 (nit): the override builds a file URL by string concatenation.** scripts/check-economy-copy.mjs:21.
  A path containing `#`, `%` or `?` misparses. It fails closed, but pathToFileURL() would be correct.
