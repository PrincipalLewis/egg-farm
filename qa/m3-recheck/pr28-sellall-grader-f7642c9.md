# PR #28 f7642c9 — Sell all label includes Grader mult (fix for bug-sellall-label-grader.md, Major)

**Verdict: PASS.** No new findings. The Major bug is fixed in Chromium, Firefox and WebKit. Two optional test-only nits remain, both from the Code Reviewer; one was confirmed by QA.

Scratch clone /tmp/qa-pr28 at f7642c9 (base main f035594). Evidence: `pr28-sellall-grader-f7642c9/` (summary.txt, logs, probe.mjs, run-engine.sh, screenshots).

## Results
| Check | Result |
|---|---|
| tsc --noEmit | PASS |
| vitest (max 2 workers) | PASS: 498 passed + 1 skipped of 499. The engineer reported "499/499"; the 1 skip is pre-existing, not a fail |
| test:slow | PASS 11/11 |
| sync-economy --check | PASS |
| build + check-release-build | PASS (m3-rc1-pre+f7642c9 ok, no QA hooks) |
| check-globals (3 engines) | PASS 2/2 each |
| rc0 Chromium / Firefox / WebKit | 212/212, 212/212, 212/212 (the engineer reported 210/210/212; the 2 extra in Chromium/Firefox are the new sellallgraderfit checks) |
| Build ID at runtime | m3-rc1-pre+f7642c9 in all 3 engines |
| QA probe (3 engines × 390, 360 × Grader 0/1/2 × 3 seeded states) | 57/57 each. Label = money gained after the tap, the label isn't clipped (sw==cw: 354 at 390, 324 at 360), and the button is 358×56 / 328×56 (≥44) |
| New sellallgrader check on old code (f035594 + new rc0 script, Chromium) | FAILS 4/12 as expected: G1/G2 label "$1.19T" vs gained $1.78T / $2.37T. The unit test file also fails 9/9 on old code |

Probe values (identical in all engines), basket 181.2B:
- One order, farm 20: G0 $405.9B, G1 $608.8B, G2 $811.8B.
- Two orders, farm 23 / coll 17: G0 $1.19T, G1 $1.78T, G2 $2.37T.

In every case the label equals the payout. Small case, 37.7 eggs with a partial order: $47.73 / $71.61 / $95.46, exact to the cent (per-order rounding).

The exact original $666.8B/$1T save (PR #22 evidence) wasn't reconstructed; its collection level wasn't recorded. The same scenario class (Grader 1, 181.2B eggs, where the old label left out ×1.5) is covered, and on old code the rc0 section reproduces the same understatement.

## Code Reviewer nits (engineering/reviews/fix-sellall-label-grader-f7642c9.md). Optional, not blocking
1. The wiring test in tests/sellall-label-grader.test.ts:41-42 is a source tripwire tied to adjacent-line formatting. Suggested: loosen the regex, and assert that `setText(sellAllBtn` appears exactly once.
2. sellallgraderfit only checks fit plus `$…T`. **QA confirmed:** on old code the "fits at 390/1280" checks still PASS with the buggy $1.19T label. So label = payout is guarded at 360 only (by rc0) and at 390 (by this QA probe). Suggested: rename the check, or add the money() delta check.

## Not run
- 1280/docked and 375/430/1024×474/1366×768 label = payout (fit at 390/1280 is covered by rc0 sellallgraderfit).
- axe (not in scope for this display-only change).
- Real-play Grader purchase flow: the states were seeded through window.eggfarm in the QA build.
- Exact original $666.8B save (see above).

## Process notes
- Two of my own preview servers were orphaned after a kill and stayed idle for up to about 25 min on :4383. I killed both (my PIDs only). No servers of mine are left.
