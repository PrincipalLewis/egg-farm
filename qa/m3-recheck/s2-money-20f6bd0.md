# QA recheck — s2-money @ 20f6bd0 (was 43eb112; tests/CI only)
Date: 2026-10-16 (CEST). Clones: /tmp/qa-clean-20f6bd0/game (no ../product), /tmp/qa-s2money-20f6bd0 (../product -> /tmp/product link). Both cloned from /workspace/egg-farm-studio/game; branch not modified or pushed.

| # | Check | Result |
|---|---|---|
| 1 | Clean clone, no product/: npm ci + npm test | PASS — 373 passed, 2 skipped (375); check-economy-copy prints "skipped" |
| 2 | With product/ present | PASS — 375/375 |
| 3 | check-economy-copy | PASS — matches (32 lines); one value changed in data/economy.csv line 2 (10→910) → exit 1, names line 2, npm test also fails; reverted. Repo copy rewritten with BOM+CRLF → still passes (product/ is CRLF, 32 CR lines) |
| 4 | Wiring | PASS — `test` and `build` run check-economy-copy first; .github/workflows/ci.yml runs `npm run check-economy-copy` then `npm test` |
| 5 | Diff 43eb112..20f6bd0 | PASS — only ci.yml, package.json (scripts), scripts/check-economy-copy.mjs, 3 test files; nothing under src/, data/, public/; balance.json unchanged |
| 6 | npm run build | PASS — both clones; check-release-build ok |

## Notes (no defects)
- Info: on GitHub CI there is no product/, so the copy check always skips there; drift protection is local only (npm test/build in the studio workspace). Acceptable as designed.
- Info: `build:qa` does not run check-economy-copy (unchanged from before).
- S2-REL-1 (debug hooks, Low) still open; recheck on Tuesday's rebase.

Verdict: PASS — 20f6bd0 is clear for Monday's merge.
