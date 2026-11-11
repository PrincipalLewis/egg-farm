# PR #11 @ 9182c81 — staging CSV rev 86f0e80e (base main c1a3085) — QA verdict: PASS
Fetched `refs/pull/11/head` read-only (HEAD 9182c8121fa8…, parent = c1a3085, the PR #8 merge). Worktrees /tmp/qa-pr11-9182c81 and /tmp/qa-pr11-base (removed after). No push/merge/tag. Logs in qa/m3-recheck/pr11-staging-csv-9182c81/.

| # | Check | Result |
|---|---|---|
| 1 | CSV hash = HoP-approved changelog entry | PASS |
| 2 | Cell diff vs 70009738: only manage_prompt_threshold 0.4→0.5 | PASS |
| 3 | sync-economy --check | PASS |
| 4 | Changed files data/tests only | PASS |
| 5 | tsc + vitest (2 workers) | PASS |
| 6 | Release build = main c1a3085 except build ID | PASS |

## 1. Hash
data/staging/economy.f1-m4cols.csv sha256 `86f0e80e359398e3fd3061c268794054558029270cc3944ac522ef7ddbea0550` (12-hex prefix `86f0e80e3593` as in the changelog). Same hash as studio product/economy.f1-m4cols.csv. 125 cols, header + 31 rows, LF only.
product/balance-changelog.md line 64 (quoted): "Oct 16 23:58, Head of Product: APPROVED yawn_at_pct=50 and manage_prompt_threshold=0.5 (was 0.4), matching refill_threshold_pct=50, so the yawn, the Manage prompt and the refill all appear at the same moment. The yawn change had been missing an explicit approval. economy.md PT1-P4 is updated. economy.f1-m4cols.csv revision 86f0e80e3593 supersedes 70009738d2d1."

## 2. Cell diff (old = c1a3085:data/staging/economy.f1-m4cols.csv, sha 70009738)
Header identical (125 cols), row count identical (31). Only differing cells: manage_prompt_threshold 0.4 → 0.5 on all 31 rows. No other cell changed. yawn_at_pct was already 50 in 70009738 (both revisions = 50), so the yawn approval in line 64 needs no CSV change here.

## 3. sync-economy --check
"balance.json up to date with economy.csv", exit 0.

## 4. Changed files (git diff --name-status c1a3085 9182c81)
- M data/staging/economy.f1-m4cols.csv (31 lines)
- M tests/staging-f1-m4cols.test.ts (+20/−2; sha/decimal/safe-int tests; full diff in tests.diff)

## 5. tsc / vitest
tsc --noEmit exit 0. vitest --maxWorkers=2: 48 files, 467 passed + 2 skipped (469), exit 0; staging-f1-m4cols 5 tests ✓. (The first vitest attempt was interrupted at 00:04 and the full rerun is the result above.)

## 6. Release build
`npm run build` on both, exit 0. 48/50 dist files byte-identical. The bundle differs only by the build-ID string `m3-rc1-pre+9182c81` vs `+c1a3085`; after substitution its sha256 = main's (`a4d1368a…94c5`). index.html differs only by the hashed bundle filename.
