# PR #11 econ/staging-f1-m4cols-rev2 @ 9182c81 (base main c1a3085)
One commit: data/staging/economy.f1-m4cols.csv, tests/staging-f1-m4cols.test.ts. Read-only. Claude: 0 calls. Runs in a /tmp copy (git-initialised so the BUILD_ID tests are valid).

## Verdict: APPROVE

## Checks
- **CSV diff:** header identical (125 cols, 31 rows). Exactly 31 cells change, all in `manage_prompt_threshold`, 0.4 → 0.5 on every row. Nothing else.
- **Source:** sha256 86f0e80e359398e3fd3061c268794054558029270cc3944ac522ef7ddbea0550 equals product/economy.f1-m4cols.csv byte-for-byte. The test's EXPECTED_SHA256 equals the file hash.
- **New checks catch my earlier edits:**
  - farm_cost↔hens_cost header swap ⇒ the sha test fails.
  - `1e3` in farm_cost L9 ⇒ the sha test and the plain-decimal test both fail.
  - Baseline 5/5.
- **Runtime:** still no reference to data/staging in src/, vite config or scripts; the file is test-only.
- **Approval recorded:** decisions.md:253 (studio root): "Oct 16 23:58, Head of Product: APPROVED yawn_at_pct=50 and manage_prompt_threshold=0.5 … 86f0e80e3593 supersedes 70009738d2d1". product/economy.md:80 (PT1-P4) is updated to yawn 50 and threshold 0.5. This closes the PR #8 note about yawn_at_pct=50.
- **Runs:** tsc --noEmit clean; `sync-economy --check` "balance.json up to date"; full vitest 467 pass, 2 skipped, 0 fail.

## Findings
- **NIT:** the approval sits in the studio-root decisions.md, not engineering/decisions.md or product/decisions.md. The test comment says "decisions.md"; give the path.
- **NIT:** the plain-decimal test splits on ',' itself instead of using parseEconomyCsv. That's fine for this quote-free file, and the sha pin backs it up anyway.
- **NOTE:** check-economy-copy skipped in /tmp (../product/economy.csv not adjacent). It's unaffected, since live data/economy.csv is unchanged by this PR.
