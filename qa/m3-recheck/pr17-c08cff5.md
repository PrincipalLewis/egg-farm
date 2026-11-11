# PR #17 @ c08cff5: open 3ea9f04 items (globals + rc0, 3 engines)
Follows pr17-3ea9f04.md (non-browser gates PASS there). Head has main 2700804 merged in (verified with merge-base).
Fresh clone /tmp/qa-x/pr17. Ports 56xx (never 5108 or 4173). Every step ran as `flock .browser-test.lock timeout 600`, one engine at a time.
Driver: qa/m3-recheck/pr17-18-x-run.sh. Evidence: pr17-c08cff5-evidence/ (exits.txt, run.log, per-step logs, shots-*).

## Verdict: PENDING (see results)

| check | result |
|---|---|
| npm ci + build + build:qa | PASS (build.log, buildqa.log) |
| static build-id dist / dist-qa | m3-rc1-pre+c08cff5 / m3-rc1-pre+c08cff5 |
| src/config/balance.json | sha256 f0dcf767… is identical to 3ea9f04 |
| runtime build-id + globals + rc0 per engine | see Results (appended as each step finishes) |

Claims taken from the engineer and not rerun by QA: unit 483, test:slow 11/11, AC7 hard-assert pass, golden f90d1678.

Repro: `git clone game /tmp/qa-x/pr17 && git -C /tmp/qa-x/pr17 checkout c08cff5 && npm ci && npm run build && npm run build:qa`, then `PORT=56xx node scripts/release-globals-browser.mjs <eng>` and `PORT=56xx node scripts/rc0-browser.mjs <eng>`.

## Results


**SUPERSEDED (03:43 CEST):** the runs were stopped at the engineer's request. Main moved to eb97a2a, so new heads are coming. NOT RUN: all remaining 3-engine globals and rc0 checks.
