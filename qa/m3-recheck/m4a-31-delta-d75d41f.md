# M4-A #31 delta: d75d41f (m4/m4a-tracks-v4)
## Verdict: PASS (10:50 CEST). 0 Blocker, 0 Critical, 0 Major.
Owner: QA Saves & Release. Baseline: UI QA c108440 pass 3 (m4a-c108440.md). SHA landed 09:20; run 09:20–10:39.

## Scope check
- d75d41f fast-forwards from 1a44b19 (9 commits). The only src change since 1a44b19 is src/config/balance.json, L21: farm 41918→40660 and w4 tier 20959→20330, the HoP-approved −3% (6dca24cd).
- c108440..1a44b19 is main merges #17/#32, #28 and #33 (see diffstat-since-1a44b19.txt).

## Results (evidence: m4a-31-delta-d75d41f-evidence/summary.txt)
| Check | Chromium | WebKit | Firefox |
|---|---|---|---|
| Runtime build-id m3-rc1-pre+d75d41f | PASS | PASS | PASS |
| Release globals (only eggfarmExportTelemetry) | PASS | PASS | PASS |
| rc0 | 224/224 PASS | 224/224 PASS | 224/224 PASS |
| Served open | PASS | PASS | PASS |
| Release artifact dist-html/egg-farm.html via file:// | PASS (build-id x2, globals ok, 0 errors) | not run | not run |
- Build, build:html and check-release-build: PASS (all assets inlined, no external URLs).
- Unit: 754/754 PASS. This includes m4a-saveseq-carry and the save.ts/idb-mirror changes from the merges, so saves/migration is covered at unit level and by the rc0 save-recovery rows (screenshots in shots-chromium/).
- rc0 grew from 209 to 224 because the merged PRs added rows; it matches Features' 224.

## Notes / follow-ups (not defects)
- QA-script issue: the first file:// probe opened dist/index.html, a served build with absolute /assets and /fonts paths that isn't meant for file://. It "failed" in all 3 engines, and that's expected. I reran it against the real release artifact (dist-html/egg-farm.html) in Chromium: PASS. The script needs fixing to target dist-html (owner: me).
- Follow-up (Minor): run the release-artifact file:// open on WebKit and Firefox.

## Not run
- Release-artifact file:// open on WebKit and Firefox (Chromium only, as HoE scoped "HTML open in Chrome").
- Saves browser 3-engine suite (reconcile, .bak, quota, lease): no src/save change since 1a44b19; saves are covered by unit tests plus rc0.
- Real-device or mobile runs.

## Shipped-code check (11:03)
Latest is main acdbedc2f5a9 = "Merge PR #31 (d75d41f)". d75d41f is an ancestor, and `git diff d75d41f acdbedc` is EMPTY (identical tree). Shipped code is the code that passed.
