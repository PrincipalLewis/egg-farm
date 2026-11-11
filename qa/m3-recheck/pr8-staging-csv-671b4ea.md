# PR #8 @ 671b4ea — staging CSV (econ/staging-f1-m4cols → main a01faea) — QA verdict: PASS
Fetched `refs/pull/8/head` read-only (HEAD = 671b4ea919f2…). Worktrees /tmp/qa-pr8-671b4ea (PR) and /tmp/qa-pr8-base (a01faea). No push/merge/tag. PR #9 not touched. Logs: qa/m3-recheck/pr8-staging-csv-671b4ea/.

| # | Check | Result |
|---|---|---|
| 1 | CSV hash = HoP-approved changelog entry, 125 cols | PASS |
| 2 | `sync-economy --check` clean | PASS |
| 3 | No code diff vs base | PASS (data + 1 test file only) |
| 4 | vitest + tsc | PASS |
| + | Release build hash-equal to main | PASS (identical after build-ID normalisation) |

## 1. Hash
- data/staging/economy.f1-m4cols.csv sha256 `70009738d2d176f60874e737014d389474986aa7b8aa8cc333e1683d3a5613fa` (changelog uses the 12-hex sha256 prefix: `70009738d2d1` ✓). md5 1fc17584822bbd9519dabb7fe3bca29a.
- Identical to studio copy product/economy.f1-m4cols.csv (same sha256).
- 125 columns, header + 31 rows, LF only (0 CR).
- product/balance-changelog.md line 62 (quoted): "Oct 16 23:41: Head of Product confirmed revision 70009738d2d1 as APPROVED and the new TR-5 baseline, replacing 053b2ba5ad71. MK-33a and leave_attended_window_s=30 are approved. w2_asleep_collect_share=0.20 holds only if MK-33a ships in the same build; if it slips, the share reverts to 0.15."
- Caveat: the approval is conditional — w2_asleep_collect_share=0.20 is valid only if MK-33a ships in the same build.

## 2. sync-economy --check
`balance.json up to date with economy.csv`, exit 0 (sync.log). check-economy-copy exit 0. The staging CSV isn't a sync input; balance.json is unchanged.

## 3. Changed files (git diff --name-status a01faea 671b4ea)
- A data/staging/economy.f1-m4cols.csv (data)
- A tests/staging-f1-m4cols.test.ts (test only, 28 lines, 3 tests; not in src/ or the bundle)
No src/, config, script or generated-file changes. No reference to `staging`/`economy.f1` in src/, scripts/ or vite config.

## 4. Unit + types
- tsc --noEmit exit 0.
- vitest run --maxWorkers=2: 48 files, 465 passed + 2 skipped = 467 (matches Features' 467), exit 0. New test ✓ (3 tests).

## + Release build equality
`npm run build` on both, exit 0. 50 dist files: 48 byte-identical. The other 2 differ only by the build ID: the JS bundle has `m3-rc1-pre+671b4ea` vs `+a01faea`, and index.html carries the resulting hashed bundle name. After substituting the SHA, the bundle sha256 is identical to main's (`cdc51cf5…7543`). No CSV content (e.g. leave_attended_window_s) is in dist.
