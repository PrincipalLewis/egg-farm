# M4 guard baseline — m3-rc1-dialog asset (a01faea), BUILD_KIND=rc1, SUITE=m4 — 2026-10-16 21:13–21:16 CEST
Asset: release `m3-rc1-dialog` → `egg-farm-m3-rc1-dialog-a01faea.html`, sha256 291229bc…5bbc7 (served-HTML sha matched before each engine).
Runtime build ID `m3-rc1-pre+a01faea` was verified in the Settings footer before each engine. One engine at a time: chromium :4400, firefox :4430, webkit :4460. 1-min load was 7.0, 5.2 and 4.6 at the start of each engine run (load.log).
Script: qa/m3-scripts/rc1-guard-save-qa-m4.mjs. A copy plus its sha256 is in the evidence folder, as are the logs, per-engine JSON and fixtures (m4-guard-baseline-a01faea/).

| Check | chromium | firefox | webkit |
|---|---|---|---|
| BUILD id = a01faea | PASS | PASS | PASS |
| ZW-1 newer-save dialog (v7-basic / v7-refund) | PASS / PASS | PASS / PASS | PASS / PASS |
| ZW-2 export returns the v7 bytes | **FAIL / FAIL** | **FAIL / FAIL** | **FAIL / FAIL** |
| ZW-3 storage byte-identical (10 s + visibilitychange/pagehide/beforeunload + 2nd tab) | PASS / PASS | PASS / PASS | PASS / PASS |
| ZW-4 zero writes to save keys / save IDB stores; install_id create-only | PASS / PASS | PASS / PASS | PASS / PASS |
| ZW-5 no save object in allowed writes | PASS / PASS | PASS / PASS | PASS / PASS |
| M4-W1 v6 written as v6 | PASS | PASS | PASS |
| MK-1 tracksV7 marker byte-identical (marked / marked-refunded) | PASS / PASS | PASS / PASS | PASS / PASS |
| Total | 11/13 | 11/13 | 11/13 |

## Findings
- **ZW-2 FAIL (all engines):** the newer-save dialog on a01faea reads "This save is from a newer version of Egg Farm. Open the newer build to keep playing." and has one button, **"Try again"**. There is no export control, so the player can't export the v7 save from the refusal screen. Repro: seed `eggfarm.save` = m4-fixtures/m4-v7-basic.json → load → Tap to start → the dialog has no Export. This is the S-2 "export still works" gap. Severity: suggest Minor, since no data is lost; HoQA to rate. Caveat: the default selector is `button:has-text("Export")`. If S-2 adds export under another label, set EXPORT_SEL.
- **Zero writes is already satisfied on a01faea** for this harness: ZW-3/4/5 PASS in all engines. The only writes were creating `eggfarm.install_id` (absent before, so allowed) and lease/tab/telemetry. The baseline does not show the expected S-2 write gaps on these paths. Either a01faea already refuses cleanly here, or the S-2 bug sits on a path this harness doesn't reach: autosave after "Try again", IDB mirror with a pre-existing IDB copy, `.bak` rotation with an existing `.bak`, or long sessions. Recommend Saves name the failing path so I can add it as ZW-6.
- MK-1: rc1 re-saved the marked v6 (coins rose 1291591 → ~1317629), and the `tracksV7` bytes came through unchanged.

## Not run / limits
- Legacy suite (SUITE=all) not run: it needs the `window.eggfarm` QA hook, which the release asset does not expose (D3/D4).
- M4-W2 and MK-2 are not applicable to BUILD_KIND=rc1 (PENDING-S4 applies only to m4 builds).
- Fixtures are synthetic: the v6 base is a re-stamped v5, and the marker shape is assumed. a01faea accepted them without the recovery dialog.
- Infra: the first chromium attempt died (exit 5, build-id probe used a wrong selector; fixed to `#settings`), then a crash on `window.eggfarm` (fixed: startLite/forceSave via pagehide), then exit 3 because its own stale :4400 server was still running (I killed my own server and reran). The table reflects the final clean runs.

## ZW-6 baseline: 2026-10-16 21:19–21:25 CEST (same asset, build ID verified per engine, :4400/:4430/:4460, one at a time; load 1.6 at start)
HoQA ruling 2026-10-16: **ZW-2 (export) is Minor now but blocks S-4** (it is also in the script header).
Evidence: m4-guard-baseline-a01faea/zw6-<engine>.{log,json}, load-zw6.log, rc1-guard-save-qa-m4.zw6.mjs. Every sub-path seeds `eggfarm.save` = m4-v7-basic.json.

| Sub-path | chromium | firefox | webkit |
|---|---|---|---|
| ZW-6a 'Try again' ×3 (dialog still shown after) | PASS | PASS | PASS |
| ZW-6b1 boot with existing IDB copy (v7) | PASS | PASS | PASS |
| ZW-6b1v6 boot with older v6 IDB copy (reconcile) | PASS | PASS | PASS |
| ZW-6b2 boot with existing .bak (v6) + v6_backup | PASS | PASS | PASS |
| ZW-6c 12.5 s session (autosave 5 s ×2.5) + visibilitychange/pagehide/beforeunload, re-show + 2nd autosave window | PASS | PASS | PASS |
| ZW-6d tab-lease writes, no save object in the lease | PASS (vacuous) | PASS (vacuous) | PASS (vacuous) |
| ZW-6e 2nd tab while the 1st shows the dialog (both show it, no tab-guard) | PASS | PASS | PASS |
| Full SUITE=m4 total | 18/20 (ZW-2 ×2 FAIL) | 18/20 | 18/20 |

Notes:
- In every sub-path the only allowed write was creating `eggfarm.install_id` while it was absent. Seeded IDB records and `.bak`/`v6_backup` stayed byte-identical, and no IDB database was created where none existed.
- **ZW-6d is vacuous on a01faea:** a refusing rc1 writes no `eggfarm.lease` or `eggfarm.tab` at all (both are null). It will become meaningful once S-2 or a later build takes a lease during refusal.
- The ZW-6 baseline therefore still shows no write gap on a01faea. The only S-2 gap found is ZW-2 export.
