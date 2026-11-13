# CCR delta review — PR #31 (M4-A tracks v4) @ d75d41f vs 1a44b19

Verdict: **PASS** (no Blocker/Major). Read-only; detached worktree /tmp/wt31 + fresh clone /tmp/fc31. 2026-10-17 ~09:25 UTC+2.

## 18e5057..1a44b19 (unreviewed hop)
- .gitattributes `data/economy.f1.csv -text` (from #17) — closes earlier M1 CRLF major.
- src/save/idb-mirror.ts: doc comment only (m3 accepted, cites ADR M4-19) — m3 documented, no logic change.
- src/sim/actions.ts + src/ui/app.ts (main's Sell-all-label fix via #34 merge path): new `saleValueCents`/`sellAllPreview`; sellTo value math unchanged (refactor to shared helper); Sell all label now uses Grader mult + per-order rounding + floored basket, matching the action. Money: label-only correctness fix, no payout change.
- Tests/vendor/rc0 script: sellall-label-grader test, economy_sim.py F1 vendor pins (#33).

## 1a44b19..d75d41f
- fb8c809 is a true 2-parent merge (1a44b19 + main 8e6d53e). `git merge-tree --write-tree 1a44b19 8e6d53e` differs from fb8c809's tree only in engineering/status.md (the sole conflict, union resolution). No hidden resolutions in src/tests/data/vendor.
- balance.json: every main key/value at 8e6d53e equals d75d41f (0 value diffs); L21 farm cost 40660 and grader T3 (farm 21) 20330 match #36. M4 keys (187 leaf paths under /m4 etc.) present and intact, PR-only.
- d75d41f: single-line test change, tests/m4a-sync.test.ts grader tiers 20959 -> 20330; correct (matches balance.json and tests/fixtures/economy_sim.json "21": 20330).
- Note: the merge also brings in #34 (seller_variance sim F1 + fixtures) from main, not just #36; all main-side, untouched by resolution.
- B1 carry test tests/m4a-saveseq-carry.test.ts present and passing.
- M1 gone: fresh clone at d75d41f, `git status --porcelain` empty (also empty with core.autocrlf=true).

## Gates @ d75d41f
- tsc --noEmit: OK
- npm test (sync --check + full vitest, once): 72 files, 754/754 pass
- golden/flag-off parity tests/m4a-flag-off.test.ts 2/2 (trace hash = main; m4.enabled ships 0); storage/save tests within full suite all pass. (Did not locate a separate artifact labelled f90d1678; relied on the in-suite golden.)
- build + build:html: check-release-build all ok, build id m3-rc1-pre+d75d41f
- check-globals PORT unset: free port 40117, Chromium PASS (release + refused-newer boot), only eggfarmExportTelemetry
- Post-gate worktree status clean.

## Findings
- None Blocker/Major/minor.
- n1 (info): PR merge commit pulls #34 too; description says "#36 L21 trim" only — doc wording.
