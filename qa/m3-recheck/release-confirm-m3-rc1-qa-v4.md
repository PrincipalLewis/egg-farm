# Release confirmation: m3-rc1-qa-v4 (7d52952)
QA, 2026-10-16 23:10 to 2026-10-17 00:02 CEST. Repo PrincipalLewis/egg-farm. Same method as release-confirm-m3-rc1-dialog.md (confirm.mjs reused and extended). Evidence: `release-confirm-m3-rc1-qa-v4/` (sha256.log, run-all.log, run-qa-v4-*.log, result-*.json, gen-a01faea.log, fixtures/, shots/ (21 png), confirm.mjs, gen-a01faea-save.mjs, run-all.sh).
Ports: 4490 (v4 asset) and 4491 (a01faea asset, used only to generate saves), own Node static server; :4173 untouched. Engines: Chromium (/usr/bin/google-chrome), Firefox and WebKit, one at a time, mirroring the prior confirm. All browser runs ran in one acquisition of `.browser-test.lock` (23:54:22 to 00:02:02 CEST, about 8 min). Nothing was pushed, merged or tagged. All servers are stopped.

## Verdict: CONFIRMED. All checks PASS in all 3 engines, 0 fails.

| # | Check | Result |
|---|---|---|
| 1 | Latest + tag | PASS. `releases/latest` = m3-rc1-qa-v4 (not a draft or prerelease). Annotated tag a07d823e resolves to 7d52952e197fd1bb264950acc9a2ca401b7abdfb. |
| 2 | Asset sha256 | PASS. egg-farm-m3-rc1-qa-v4-7d52952.html (471,475 B) = 32d7cd530ad0d1cae679526544c274b55b7a89dec29d3bf98c5cfea1aaef8e1a, which matches both Head of QA's value and the API digest. |
| 3 | Runtime build id (offline, own port, all non-local requests aborted, 0 attempted) | PASS m3-rc1-pre+7d52952 in C/F/W |
| 4 | Core-loop smoke (UI only: collect, then sell to a customer, then buy an upgrade, then reload; state persists) | PASS C/F/W |
| 5 | Load a01faea save, no loss | PASS C/F/W. The saves were real ones written by the a01faea release asset: a mid-game save (F19/C17) and a fresh save, each loaded as a full localStorage dump including .bak, telemetry and install_id. No recovery dialog appeared. Farm and collection levels matched exactly, and coins were at or above the original. The legacy v3, v4 and v5 fixtures also PASS. |
| 6 | No console errors / pageerrors | PASS C/F/W (0) |
| 7 | Runtime globals | PASS C/F/W. Compared with a blank same-origin page, the only extra global is `eggfarmExportTelemetry` (a function), and `'eggfarm' in window` = false. |

Known gap: check-release-build can't read the single-file HTML, so the globals check (7) was done at runtime only.

## Not run / caveats
- The v3 fixture is derived from a v4 save (no real v3 exists), the same as in the prior confirm.
- The Settings build label wasn't scraped. The build id comes from runtime telemetry instead, the same as in the prior confirm.
- The no-loss check on the fresh a01faea save compares coins and levels only (all 0). The basket count isn't compared.
- Not run: the recovery-dialog flows, the full save suite and the file:// open.

## file:// check (2026-10-17 00:03 to 00:15 CEST)
The asset's sha256 was re-verified as 32d7cd530ad0d1cae679526544c274b55b7a89dec29d3bf98c5cfea1aaef8e1a. It was copied unchanged to `release-confirm-m3-rc1-qa-v4/fileurl/game.html` and opened as `file://…/fileurl/game.html` with no server. All non-file/data/blob requests were set to abort; 0 were attempted.
- Each run used `launchPersistentContext` with a fresh user-data-dir in /tmp, deleted afterwards.
- a01faea saves were seeded through a sibling `file://…/fileurl/seed.html`. This works because all file:// pages share the same origin in Chrome.
- The 1-minute load was 10.4, so both runs used lane 2 (`flock .browser-test-2.lock timeout 600`). Holds: 00:04:06 to ~00:08:10 and 00:08:12 to ~00:14:20, each under 10 min.
- Script: `fileurl-v4.mjs`. Logs: `run-fileurl-{chromium,chrome-channel}.log` and `result-fileurl-*.json`. Screenshots: `shots/fileurl-*-{boot,coreloop,settings,reopen,a01faea-v5mid,a01faea-fresh}.png`.

| # | Item | Chromium (executablePath /usr/bin/google-chrome) | channel: 'chrome' |
|---|---|---|---|
| 1 | Loads with 0 console errors or pageerrors; build id is m3-rc1-pre+7d52952 | PASS | PASS |
| 2 | Core loop: collect, sell to a customer, buy an upgrade | PASS (18 collects, sold, bought collection L1) | PASS |
| 3 | Save survives a reload | PASS (F0/C1, coins equal) | PASS |
| 3 | Storage on the file:// origin | localStorage holds eggfarm.save, .save.bak, .ui, .lease, .telemetry and .install_id. IndexedDB is available: a probe open succeeded and the game's `eggfarm` v1 DB exists. No IDB-unavailable or IDB-failure events were logged. | same |
| 4 | Full context close, then reopen on the same profile, keeps progress | PASS | PASS |
| 5 | Real a01faea saves (v5mid F19/C17, and fresh), loaded and then closed and reopened | PASS. Levels are exact, coins are at or above the original, and no recovery dialog appeared. | PASS |
| 6 | Settings shows the build label "Egg Farm m3-rc1-pre+7d52952" | PASS (screenshot shots/fileurl-*-settings.png) | PASS |

Result: **PASS, 0 fails.**

Not run / caveats:
- Playwright's bundled Chromium build isn't installed (~/.cache/ms-playwright has only firefox and webkit), and downloading it would be an outside request. The "Chromium" column is Google Chrome 155.0.8059.84 run through executablePath. channel 'chrome' resolves to the same installed Chrome, so the two columns are the same binary launched two ways.
- The file:// behaviour when IDB is unavailable was not exercised, because IDB was available. Forcing it off would mean an injected stub, which is out of scope for a release confirm.
- The file:// check was run in Chromium/Chrome only, as requested. Firefox and WebKit were not run on file://.
