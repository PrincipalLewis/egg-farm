# PR #5 (toast) delta recheck @ a56b3a2 vs PASS @ 37524aa

**Verdict: PASS.** No Blocker, Critical or Major findings. No new Minors.
Build: m3-rc1-pre+a56b3a2, verified at runtime in all 3 engines (qa-guard: release and qa both BUILD OK). Worktree /tmp/qa-pr5-a56b3a2 (removed), ports 4361-4366. Evidence: `toast-pr5-a56b3a2/` (summary.txt, run.sh, lanes.log, logs, shots).

## Delta (git diff 37524aa..a56b3a2, 1 commit, 2 files, +8/-7)
- `src/ui/toast-place.ts`: **doc comment only** (review-id tags removed). No runtime code change.
- `tests/toast-controller.test.ts`: trailing spaces trimmed from test names; the second-settle test now also asserts that the dismiss timer re-arms (`timers.size==1`, hidden after TOAST_MS).
- Scope: the gates plus a full rc0 regression in 3 engines (the build hash changes even though runtime code didn't).

## Results
| Check | Chromium (lane 2) | Firefox | WebKit |
|---|---|---|---|
| tsc / unit (2 workers) / build (+sync-economy --check, check-release-build) / build:qa | all green; unit 475 passed / 2 skipped | | |
| runtime build-id guard | BUILD OK | BUILD OK | BUILD OK |
| release globals (check-globals) | only eggfarmExportTelemetry | same | same |
| rc0 | **213/213** | **213/213** | **213/213** |
| rc0 toast-v3/toastfirst | 14/14 | 14/14 | 14/14 |
| mid-fade re-show | reverses, min op 0.21-0.30, jump 0 | min op 0.14-0.20, jump 0 | min op 0.14-0.19, jump 0 |

- Mid-fade: the harness auto-flags 4 FAIL per engine. That's the same count as on 37524aa and comes from the same 0.06 dip tolerance (a one-frame state-to-render latency). Frame traces show no snap to 0 (no op=0 frame in any json), max opacity 1 and no top jump, so I judge it PASS as before.
- **Previously not run, now covered (Chromium):** a first-frame check at 375x667, 430x932 and 1366x768, each with and without the banner (`qa-rc0-ff.mjs`, a copy of the rc0 toastfirst section with only the sizes changed): **22/22 PASS**. The first visible frame is within the 8px fade offset of the settled position and never over the banner or strip. It settles 8px below the edge. At 1366 docked with no banner it slides in from above and settles at 64 (intended). Log: `firstframe-extra-chromium.log`, shots `ff-extra-shots/`.

## Repro
`cd <worktree@a56b3a2> && npm run build && npm run build:qa && toast-pr5-a56b3a2/run.sh <engine> guard globals rc0 midfade` (under the box locks).

## Not run
- 375/430/1366 first-frame in Firefox and WebKit. That would mean starting lane-1 work close to the Saves QA lane-1 window (10:55-12:00 UTC+2), so it's left for after 12:00 if wanted. Low risk: there's no runtime delta, and 360/390/1280 pass in all 3.
- Firefox/WebKit first-frame screenshots (rc0 takes shots only in Chromium, same as before).
- 3930a4c negative control not re-run (unchanged test, done at 37524aa).
