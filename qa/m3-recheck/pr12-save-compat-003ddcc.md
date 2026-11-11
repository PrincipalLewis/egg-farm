# PR #12 save compatibility @ 003ddcc (SHA of record), 2026-10-17 03:50 CEST
**Verdict: PASS on save compatibility, with 1 Minor open item.** The 2 vitest failures are not save logic and are marked NOT VERIFIED as pre-existing (see below).
Supersedes 182b932 (pr12-save-compat-182b932.md) and bd487ab (Blocker reproduced there).
Worktrees: /tmp/qa-x/pr12c (003ddcc), /tmp/qa-x/main (2700804). Evidence: pr12-save-compat-003ddcc-evidence/. Repro script: qa/m3-scripts/pr12-stale-idb-rank.mjs

| # | Check | Result | Evidence |
|---|---|---|---|
| a | Stale-IDB repro (seq-5 IDB copy 10 min old vs newer flag-off LS copy with no seq) | PASS (pick ls). It FAILS on bd487ab | stale-idb-repro.log, ../pr12-save-compat-bd487ab-evidence/stale-idb-repro.log |
| b | Exact case: seq-5 copy with 1000, flag-off save 999,999, reload keeps 999,999 | Unit PASS (i: LS+IDB seq5 → writes seq 6, ls wins; ii: IDB-only seq5 → ls wins). Chromium PASS: dist003, build 003ddcc found at runtime in loaded index-CfwlKAFT.js, port 4638, LS 99,999,900 cents after reload | exact-b-unit.txt, browser-chromium.log |
| c | M4-on ranking: m4a-v3-backup (37/37), saveSeq outranks savedAt when on, seq increments | PASS | vitest-full.log, v7-and-m4on-results.txt |
| d | Flag-off main round-trip, 14 fixtures (3 written by main 2700804, a01faea v6, m3 v4/v5, m4 a01faea set): w1/w2/.bak bytes vs main | PASS: all byte-identical. Main-origin saves: state bytes unchanged, no saveSeq/M4 keys. v7 by version (m4-v7-*) and the 98396ed export are rejected identically by main | cmp-main-vs-003ddcc.txt, state-preservation.txt |
| e | v7 (tracksV7+v6BackupId) save, flag-off load+save x2 | PASS: track fields and state bytes identical | v7-and-m4on-results.txt |
| f | Recovery export carries balance: main.ts:96 → recoveryExport(g.state, balance) | PASS: shipped balance (m4 off) gives no M4 keys, validates flag-off, equals serialize(..., balance). Marked state keeps track fields | recovery-export.txt |
| g | Edge: equal savedAt / NaN / null / "NaN" / future, stale-seq LS vs newer IDB | Same as main for every case. A NaN literal → parse/corrupt, same as SD6-2 (still open, not a regression) | edge-results.txt |
| h | tsc / vite build | 0 / 0 | tsc.log, build.log |
| i | vitest full (2 workers) | 682 passed, 2 failed, 1 skipped | vitest-full.log |

**Open, Minor (data loss in an edge case; owner: Saves, under their 3-way ordering rework, acknowledged in CCR's comment in save.ts):** exact-b case iii. LS starts from a seq-1 copy, the flag-off save writes seq 2 (newer), and the stale IDB copy has seq 5 → reconcile restores the stale 1000-coin copy. Repro: `cd /tmp/qa-x/pr12c && ./node_modules/.bin/vite-node <evidence>/exact-b.mjs $PWD` → iii_pick "idb". Main would pick by savedAt.
**Note:** a flag-off build now writes saveSeq when the previous LS copy had one (hadSeq, by design). The claim "flag-off never writes saveSeq" therefore holds only for main-origin saves. .bak is a byte copy of the previous main, so it may carry seq.
**vitest failures (not save logic, NOT VERIFIED as pre-existing):** tests/cost-segments.test.ts (Economy's draft economy.f1.csv) and engineering/golden/flagoff-golden.a01faea.test.ts "sim trace" (hash 2ab8ff02… ≠ main pin 50a87ddb…). Neither file exists on main 2700804, so the main check couldn't run (vitest-main-2failing.log). Both also fail on 182b932. Hand to HoE/Economy.
**Not run:** Firefox and WebKit (lane-1 queue around 20+ min). The browser round-trip did not trigger a rewrite within about 18 s (rt_lsRewritten=false), so it checked load/boot only and found no M4 keys in LS/IDB; the browser save-and-rewrite byte diff is not verified (the unit byte diff covers it). The golden failure checked on the merge-base.

## Browser addendum (Head of QA: CONDITIONAL), Firefox then WebKit
The stale-IDB case and the 999,999 case are the same seeded scenario in browser-b.mjs (IDB saveSeq 5 with 1000 coins, 10 min old; LS flag-off save 999,999 with no seq). The recovery export can only be reached with storage blocked and the bundle has no module hook, so it is covered by the unit check (recovery-export.txt), not by a browser run.
- firefox (03:57 CEST): `{"engine":"firefox","port":"4639","buildIdInLoadedScript":"index-CfwlKAFT.js","b_lsCoinsAfterReload":99999900,"b_idbCoinsAfterReload":1000,"b_pass":true,"b_lsM4keys":[],"b_idbM4keys":["saveSeq"],"rt_lsM4keys":[],"rt_bakM4keys":null,"rt_idbM4keys":[],"rt_lsRewritten":false,"rt_inputStateKeysKept":true,"rt_keyOrderSame":true} exit=0 `
- webkit (04:07 CEST): `{"engine":"webkit","port":"4640","buildIdInLoadedScript":"index-CfwlKAFT.js","b_lsCoinsAfterReload":99999900,"b_idbCoinsAfterReload":1000,"b_pass":true,"b_lsM4keys":[],"b_idbM4keys":["saveSeq"],"rt_lsM4keys":[],"rt_bakM4keys":null,"rt_idbM4keys":[],"rt_lsRewritten":false,"rt_inputStateKeysKept":true,"rt_keyOrderSame":true} exit=0 `
