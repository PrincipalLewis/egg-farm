# PR #12 save compatibility @ bd487ab — SUPERSEDED (by 182b932, then 003ddcc = SHA of record)
Verdict at stop: **FAIL — Blocker (data loss)**, reproduced. Superseded mid-run; see pr12-save-compat-182b932.md.
Clone: /tmp/qa-x/pr12 (bd487ab), main worktree /tmp/qa-x/main (2700804), merge-base /tmp/qa-x/mb (dfd53b9). Evidence: pr12-save-compat-bd487ab-evidence/

| # | Check | Result |
|---|---|---|
| 1 | Main round-trip (14 fixtures: 3 main-2700804 written saves, a01faea v6, m3-fixtures v4/v5, m4 a01faea fixtures): w1/w2/.bak bytes vs main & merge-base | PASS, all byte-identical (cmp-main-vs-pr12.txt, cmp-mb-vs-pr12.txt); main-written + a01faea state bytes unchanged, no saveSeq |
| 2 | v7 (tracksV7 + v6BackupId, M4-on migrate of a01faea) flag-off load+save x2 | PASS, track fields + state bytes identical (v7-and-m4on-results.txt) |
| 3 | M4-on ranks by saveSeq | PASS (unit script); m4a-v3-backup vitest NOT RUN |
| 4a | Stale saveSeq copy vs newer flag-off copy (no seq) | **FAIL Blocker**: pickNewest/reconcile pick the 10-min-old saveSeq copy; main picks the newer one (edge-results.txt, stale-idb-repro.log) |
| 4b | Equal savedAt / NaN / null / "NaN" / future | Same as main. NaN literal = parse/corrupt, same as SD6-2 behaviour (not a regression) |
| 4c | serialize() without balance (main.ts:96 storage-blocked export) writes hensLevel/eggValueLevel/celebratedMilestones | Minor (export only); fixed in 182b932 |

Repro (blocker): `cd /tmp/qa-x/pr12 && ./node_modules/.bin/vite-node /workspace/egg-farm-studio/qa/m3-scripts/pr12-stale-idb-rank.mjs $PWD` → `pick:"idb", restoredCoins:111` FAIL (main and 182b932 PASS).
Not run: full vitest + tsc (killed in lock queue on HOLD), browser engines (all three).
Note: the repro ran as a Node gate with no lock; the locked attempt sat in the lane-1 queue for more than 6 minutes, so I killed my own PIDs 1638545/1638554.
