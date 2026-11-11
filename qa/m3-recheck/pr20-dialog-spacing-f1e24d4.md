# PR #20 dialog spacing — QA verdict @ f1e24d4

**Verdict: PASS** (no findings)

Tested on a local merge of f1e24d4 + origin/main dfd53b9 (local commit 47ba9e2, not pushed; runtime build-id m3-rc1-pre+47ba9e2 confirmed in bundle). Also merges cleanly with current main 2700804.

| Check | Result |
|---|---|
| Diff ff6b5d3..f1e24d4 test-only | PASS: only tests/r1-dialog-spacing.test.ts |
| Merge with main dfd53b9 | PASS: clean (local merge-tree) |
| unit (vitest, 2 workers) | PASS 476 passed, 1 skipped (economy-copy runIf: ../product absent in /tmp layout — environmental) |
| tsc / sync-economy --check / build + check-release-build | PASS |
| check-globals chromium | PASS (only eggfarmExportTelemetry) |
| Dialog layout chromium: 4 outcomes (restored, fresh, storage, can't-save) × 360x740, 390x844, 1280x800, 1024x474 | PASS 64/64: no text with scrollWidth>clientWidth, all targets ≥44px (primary 48, Export 44), no overlap between leaf elements, card in viewport (1024x474: card top 16, h 332), no page h-scroll |
| rc0 chromium | PASS 197/197 |

Repro: `G=<worktree> PORT=<own> OUT=<dir> flock .browser-test-2.lock timeout 600 node qa/m3-recheck/batch-0218/dlg-layout.mjs chromium` (needs dist built).
Not run: Firefox/WebKit (not requested; test-only change).
Evidence: pr20-evidence/ (unit, tsc, sync, build, check-globals-chromium, dlg-layout-chromium.log, rc0-chromium.log, shots/ 16 PNGs, head.txt).
