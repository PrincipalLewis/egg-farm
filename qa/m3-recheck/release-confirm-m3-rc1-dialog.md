# Release confirmation: m3-rc1-dialog (a01faea) + m3-rc1-save-v4 (aaaa91a)
QA, 2026-10-16 ~20:20–20:35 CEST. Repo PrincipalLewis/egg-farm. Evidence: `release-confirm-m3-rc1-dialog/` (api.log, sha256.log, run-*.log, result-*.json, shots/, confirm.mjs, fileurl.mjs).
Box check at 20:19: no Cut A playwright/preview processes running. Ports used: 4480–4482 (own Node static server). :4173 untouched. One engine at a time. `npm ci` in game/ (node_modules was missing), playwright-core 1.64.1, Chromium = /usr/bin/google-chrome.

## Verdict: PASS, both releases, all checks, all 3 engines. 0 fails.

## Check 1: tag / Latest
| Release | Tag → commit | Latest | Asset sha256 (downloaded = API digest = release notes) |
|---|---|---|---|
| A m3-rc1-dialog | a01faea4097dd5a869be93343d65fd0e82e5255c ✅ (matches save-recovery-dialog-a01faea.md) | ✅ `releases/latest` = m3-rc1-dialog; not draft or prerelease | egg-farm-m3-rc1-dialog-a01faea.html `291229bca7e6d6fbcc12626ca6c07a4c265f05b1018ca9cb32ad10d05075bbc7` ✅ |
| B m3-rc1-save-v4 | aaaa91a3d0e73d41fa53cc2d80e92b5cb3c42106 ✅ | n/a (superseded) | egg-farm-m3-rc1-save-v4-aaaa91a.html `d63b9d0b6d9c79086ec26b1a9ebb3dc5170bb52778dc8e6945d4b16e15d86ae2` ✅ |

## Checks 2–5 per engine
| Check | A Chromium | A Firefox | A WebKit | B Chromium | B Firefox | B WebKit |
|---|---|---|---|---|---|---|
| 2 offline open, runtime build id (http own port + file://, all non-local requests aborted, 0 attempted) | PASS a01faea | PASS | PASS | PASS aaaa91a | PASS | PASS |
| 3 v3 save (derived) no loss | PASS | PASS | PASS | PASS | PASS | PASS |
| 3 v4 save m1-rc2-v4-12min no loss | PASS | PASS | PASS | PASS | PASS | PASS |
| 3 (extra) v5 m2-rc1-v5-40min no loss | PASS | PASS | PASS | PASS | PASS | PASS |
| 4 no console errors / pageerrors | PASS | PASS | PASS | PASS | PASS | PASS |
| 5 only extra global = eggfarmExportTelemetry (vs blank page same origin) | PASS | PASS | PASS | PASS | PASS | PASS |

Runtime build id was read from `eggfarm.telemetry` (`m3-rc1-pre+a01faea` / `m3-rc1-pre+aaaa91a`).
Check 3 method: seed `eggfarm.save` (savedAt = now−3 s) + `eggfarm.ui {onboardingDone}`. Boot, wait 9 s, read the re-persisted save, reload, read again. Pass = farmLevel and collectionLevel equal, coinsCents ≥ fixture, save rewritten as v6. v3/v4: $1,415.85, F10, C11, exact. v5: F19, C17, coins grow from offline/live income (1,291,591 → ≥1,507,206).
Check 5: `'eggfarm' in window` = false, and `typeof eggfarmExportTelemetry` = function.

## Not run / caveats
- No real v3 fixture exists in qa/m3-fixtures or game/tests/fixtures. The v3 save was **derived** from m1-rc2-v4-12min by applying the exact inverse of the 3→4 migration (version 3, drop celebratedTier).
- The Settings "Egg Farm m3-rc1-pre+…" label wasn't scraped: the probe's Settings click didn't hit. The build id is confirmed from runtime telemetry instead.
- I did not exercise the recovery-dialog flows (already covered by save-recovery-dialog-a01faea.md). I did not run the full save suite (that's not in scope for this confirmation).
