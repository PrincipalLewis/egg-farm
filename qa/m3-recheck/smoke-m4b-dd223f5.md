# Post-publish smoke: release m4b-dd223f5, asset egg-farm.html
**Result (09:14 CEST): PASS. No Major+ found.** One SPEC CONFLICT in the brief (explainer on fresh saves) is reported below. Evidence: `smoke-m4b-dd223f5-evidence/` (`run2/` = full FF/CR/WK run; root = CR rerun + core-loop probe; `run1-bad-harness/` = invalid first run, harness bug, kept for traceability).

## 0) Independent artifact checks
- Downloaded with `gh release download` to `qa/scratch/relchk/egg-farm.html` (token never printed). sha256 `0bc5bb72df4ab0dee287d3e1d57b7d8178659a147dd6740738b3f0ea8f179a4c`, **511,108 bytes**. Both match HoQ, and the file is byte-identical to /tmp/relchk/egg-farm.html.
- Embedded build-id: `m3-rc1-pre+246de09` (3 occurrences), no `+dirty`. `localhost`: 0 hits. `4173`: 0 hits. Bundle has `maxLevel:zo` with `zo=30`.
- Release "Egg Farm M4 B (dd223f5), M4 on, capped at L30" is marked **Latest**. Published 2026-10-19 08:50:32 CEST.
- **Tag vs build-id:** tag `m4b-dd223f5` (lightweight) points to **dd223f5**, the merge commit `Merge #41: M4 B, capped at farm L30` on origin/main (parents dd52bfd + 9b2ef40). 9b2ef40 is `Merge #49 ... into rc/m4-default-on` (parents 7fdb273 + 246de09). **Tree of dd223f5 = tree of 246de09** (b6732798...), and `git diff 246de09 dd223f5` is empty. The tag names the main merge commit. The binary was built from 246de09, the QA'd SHA, whose content is identical. This is a naming mismatch, not a content mismatch.

## Results (file://, one engine at a time under the flock; saves injected into localStorage before boot)
| # | Check | CR | FF | WK |
|---|---|---|---|---|
| 1 | no console/page errors (all sessions) | PASS | PASS | PASS |
| 1 | runtime build-id | +246de09 | +246de09 | +246de09 |
| 2 | core loop fresh: collect, sell, buy first upgrade <30 s | **PASS 15.9 s** (probe; Collection L1, coins $12) | collect+sell PASS, buy NOT PROVEN (harness) | same as FF |
| 3a | fresh farm: explainer cards | 0 | 0 | 0 |
| 3b | migrated M1 L18 (dd52bfd): card once, then 0 after 2 reloads | 1, 0, 0 | 1, 0, 0 | 1, 0, 0 |
| 3b | migrated v6 F30 (732e70e) | 1, 0, 0 | 1, 0, 0 | 1, 0, 0 |
| 4 | M1: coins 4,567,890 / F18 / C11 kept; H18 V10 added; tracksV7=1; v6BackupId == v6_backup.migrationId; v6_backup raw = original (F18, coins) | PASS | PASS | PASS |
| 4 | 732e70e: coins 123,456,789 / F30 / C30 kept; H30 V20; id match; backup raw F30 | PASS | PASS | PASS |
| 5 | reload round-trip x2: values identical; .bak present (F matches); v6_backup intact; no recovery dialog | PASS | PASS | PASS |
| 6 | cap: near-cap F29 pre-v7 save ($90M) migrates; buy Farm -> **L30**; at L30 the buy button is gone ("L30"), 3 more attempts do nothing; L30 persisted after reload; bundle maxLevel 30 | **PASS** | migration PASS; buy step NOT RUN (harness selector bug in run2) | same as FF |
Welcome back! dialog shown first for migrated saves. The card appears after it closes (never two dialogs), which matches the spec.

## SPEC CONFLICT (explainer)
m4a-spec v1.14 / D-HOP-13 and the code (`showTracksExplainer` is called only from onTracksCommitted and tracksMigratedWithBackup) say: **shown once for EXISTING migrated saves, NEVER on fresh farms.** HoQ's brief says "shows exactly once on a fresh save". **Observed = spec**: fresh 0 cards in all 3 engines; migrated 1 card, then 0. I judged against the spec. HoQ's brief wording should be corrected, or the spec changed, before anyone calls the fresh-0 a bug.

## Not run / limits
- FF/WK: "buy first upgrade" within 30 s and the L30 buy-stop were not proven. My batch harness clicked too fast (run2: collect/sell OK, $9 reached, no buy; cap buttons not found because the Farm tab wasn't selected). These were fixed and proven in CR only. Low risk: same bundle, and the engine-specific checks (errors, build-id, saves, migration, explainer) all passed in FF/WK.
- IndexedDB mirror over file:// was not inspected (localStorage only).
- Scripts: qa/m3-scripts/smoke-release.mjs. Fixtures: gate4-fixtures/M1-midgame-L18-dd52bfd.json, pre-v7-F30-C30-732e70e.json, qa/scratch/relchk/nearcap-F29-prev7-246de09.json (generated with serialize() at 246de09).

## Gap closed (09:23 CEST): FF + WK, step-by-step harness (qa/m3-scripts/smoke-step.mjs), file:// released asset
| Check | FF | WK |
|---|---|---|
| fresh core loop: collect, sell, buy first upgrade | **PASS 16.4 s** (Collection L1) | **PASS 20.5 s** (Collection L1) |
| L30 cap: F29 buy -> L30; buy button gone; 3 more attempts find no button; L30 kept after reload (UI "L30", no button) | **PASS** | **PASS** |
| console/page errors | none | none |
Together with CR (15.9 s; cap PASS), checks 2 and 6 now PASS in all three engines. Screenshots: evidence/step-{firefox,webkit}-{core-bought,cap-F29,cap-L30,cap-reload}.png; data: step-{engine}.json/.log.

`git rev-parse dd223f5^{tree} 246de09^{tree}`:
```
b67327984883eebdd4ecdc6587e8375b31d7a7fa
b67327984883eebdd4ecdc6587e8375b31d7a7fa
```
**Smoke verdict: PASS in CR/FF/WK. Nothing is left unproven except the IndexedDB mirror over file:// (not inspected).**
