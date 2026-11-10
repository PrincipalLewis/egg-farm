# PR #24 final re-check: check-economy-copy at 8569fef (on top of 1b50002)
Reviewer: Claude Code Reviewer (read-only). Detached worktree /workspace/wt-pr24-8569fef (node_modules symlinked from game/). Claude calls: 0.
Diff 1b50002..8569fef: scripts/check-economy-copy.mjs, tests/economy-copy.test.ts (+20), engineering/ci-gates.md (+1), engineering/status.md.

## Verdict: PASS. OK to merge. All four 1b50002 items (m1, m2, n1, n2) are fixed. No blocking or major findings. Two nits remain, and neither needs another iteration.

## Gates (re-run)
tsc OK · vitest (maxForks=2) 49 files, 481/481 · test:slow 11/11 · sync-economy --check OK

## Tamper runs (`node scripts/check-economy-copy.mjs --strict`)
| Case | Result |
|---|---|
| clean repo | exit 0, 4 files match (no false positive) ✔ |
| ECONOMY_VENDOR_DIR=<empty dir> without VITEST | warning "ignored", real vendor dir checked, exit 0 ✔ |
| VITEST + empty dir / missing dir | override printed to stderr, exit 1 ✔ |
| SHA256SUMS hash changed, count unchanged | exit 1, sets differ ✔ |
| SHA256SUMS path changed | exit 1 ✔ |
| SOURCE vendored path `../../…/product/sim/economy_sim.py` | exit 1, "resolves outside the vendor dir" ✔ |
| SOURCE product path `product/../wt-…/vendor/…` | exit 1, "resolves outside the product dir" ✔ |
| SOURCE product path `product//etc/passwd` | joined under the product dir, so "not found" and exit 1 ✔ |
| override path containing `#`, `%` and a space (pathToFileURL) | resolves correctly, exit 0 ✔ |
| duplicated row in both files | exit 1 (size check) ✔ |
ci-gates.md documents the variable as test-only. Neither ECONOMY_VENDOR_DIR nor VITEST appears in .github/workflows, package.json scripts or ops/.

## Findings
- **n1 (nit): the VITEST gate accepts any truthy value.** scripts/check-economy-copy.mjs:23.
  A release shell that exports both VITEST and ECONOMY_VENDOR_DIR would still honour the override. Nothing sets either variable, and the override is now printed to stderr, so this is an accepted residual risk.
- **n2 (nit): the duplicate-row error message is unhelpful.** scripts/check-economy-copy.mjs:41.
  When the only problem is a duplicate row, the check correctly exits 1, but the message reads "sets differ: only in SOURCE [], only in SHA256SUMS []". Wording only.
- **n3 (nit): the product-side containment test is stricter than the vendor side.** scripts/check-economy-copy.mjs:51.
  It uses `relP.startsWith('..')`, so it would also reject a legitimate file named like `..foo`. The vendor side uses the stricter `'..' + sep` test. This fails closed, and no such file exists.
