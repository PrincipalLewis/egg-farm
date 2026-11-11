# M4 guard prep — rc1-guard-save-qa-m4.mjs (Saves QA, 2026-10-16 ~20:55 CEST)
Code-level only: no server/browser started (box busy; load avg ~140, the box also restarted mid-prep).
Source: engineering/m4-design.md v0.2 on arch/m4-design (PR #1), read via the GitHub API, plus the steering from Architect/HoQA (9.7, 3351d6c marker, S-4 gating).

## Files (qa/m3-scripts/)
- `rc1-guard-save-qa-m4.mjs`: NEW. The original `rc1-guard-save-qa.mjs` is untouched (sha256 04c4f534…bd60d), and the SD5 recheck still uses it plus the patches.
- `m4-guard-lib.mjs`: pure helpers (FNV checksum identical to save.ts, v6/v7/marked serialisers, tracksV7 byte extractor, snapshot diff, idempotency check). `--selftest` runs without a browser.
- `gen-m4-fixtures.mjs` and `m4-fixtures/`: m4-v6-base, m4-v7-basic, m4-v7-refund (refund 12345), m4-v6-marked, m4-v6-marked-refunded, plus SHA256SUMS.txt.

## Shared script update (HoQA 2026-10-16)
`rc1-guard-save-qa.mjs` updated in place (backup `rc1-guard-save-qa.mjs.orig-04c4f534`). New sha256 961fd7c2819a1a2daa19a3b96674d977e63d54e002be79cbc1b89095ae78a9b9. It now has SD5-2 (the patch applied) and SD5-1 with the final rule plus a decision comment; the old 'persisted − 1 tick' lines were removed. The R5 v6-write assert is still `=== 6`; with the added lines it now sits at line 145, not 132. The M4 legacy block is identical to it except R5 uses WRITE_V. The sd5-*.patch files are now applied, so don't re-apply them.

## What carried over
- SD5-2 patch: applied cleanly.
- SD5-1 patch: did NOT apply cleanly. The current original already has an older inline SD5-1 edit with "persisted − 1 tick" tolerance, which HoQA has since overruled. The M4 file uses the patch's HoQA-final semantics: PRIMARY ≥ newest persisted copy with 0 tolerance, SECONDARY ≥ live − one 100 ms tick. **The SD5 recheck must apply sd5-1-assert.patch against a fresh copy, or the patch needs rebasing. Right now `patch` rejects it against the live original.**
- R5 now expects `WRITE_V` (6, or 7 only when BUILD_KIND=m4 and S4=1) in place of the hard-coded 6.

## New parameters
ENGINE, PORT (exit 2 if it is unset or 4173), DIST, EXPECT_BUILD (required). The runtime build id is read from the Settings footer "Egg Farm <id>"; on a mismatch the script exits 5 before any test runs.
BUILD_KIND=rc1|flagoff|m4, S4=0|1, SUITE=all|m4 (m4 = M4 section only), ZW_SECS (default 10), M4FX, NEWER_SEL/NEWER_TXT/EXPORT_SEL (dialog selectors), ZW strictness is fixed by HoQA (no override).
Exit code 1 means any FAIL. PENDING-S4 results don't count toward pass/fail. Results go to /tmp/qags-m4-<kind>-<engine>.json.

## M4 checks
| ID | Runs on | Assert |
|---|---|---|
| ZW-1 | rc1, flagoff (S-2 + 9.7) | v7 save → newer-save dialog shown |
| ZW-2 | rc1, flagoff | Export works and returns the exact v7 bytes (download or navigator.share capture) |
| ZW-3 | rc1, flagoff | Byte-identical (all except lease/telemetry): snapshot of all localStorage keys + every IndexedDB db/store/key (byte strings) before load vs after ZW_SECS + visibilitychange(hidden)/pagehide/beforeunload + a 2nd tab: identical. eggfarm.save == v7 bytes, v6_backup == seeded bytes |
| ZW-4 | rc1, flagoff | Write spy (LS set/remove/clear + IDB put/add/delete/clear, with values): ZERO calls to any key except `eggfarm.lease` and `eggfarm.telemetry*`, and to any IDB store not named *telemetry*. So save, .bak, v6_backup, eggfarm.ui, corrupt.*, eggfarm.tab, install_id get zero writes |
| ZW-5 | rc1, flagoff | No allowed lease/telemetry write carries save fields (coins*/money*/savedAt/*Level/*_level). Every allowed write is logged in the report JSON (`allowedWrites`) |
| M4-W1 | all | rc1/flagoff/m4-pre-S-4: v6 written. m4+S4: written as v7 |
| M4-W2 | m4+S4 | v6_backup == original v6 bytes after N saves (PENDING-S4 otherwise) |
| MK-1 | rc1, flagoff, m4 pre-S-4 | marked v6 → written v6, tracksV7 bytes identical, no refund added |
| MK-2 | m4+S4 | migrate → reload → migrate: refund exact, no 2nd refund, levels equal, coins within one tick (PENDING-S4 otherwise) |

Dry runs done: `node --check` OK; lib selftest OK (checksum, serialisers, byte extractor incl. brackets in strings, diff, idempotency); fixture SHA256SUMS verify; PORT=4173 guard exits 2.
Not run: anything that needs a browser. That covers every assertion above and the legacy suite.

## Commands (run one engine at a time, own ports 4400/4430/4460, after the box is free)
```
cd /workspace/egg-farm-studio/qa/m3-scripts
node m4-guard-lib.mjs --selftest && (cd m4-fixtures && sha256sum -c SHA256SUMS.txt)
# Build the S-2 SHA in a SEPARATE worktree (don't touch others'):  git -C <repo> worktree add /workspace/wt-s2 <S2_SHA>
cd /workspace/wt-s2/game && npm ci && npm run build            # rc1/flag-off release build -> dist
cd /workspace/egg-farm-studio/qa/m3-scripts
for E in chromium:4400 firefox:4430 webkit:4460; do
  ENGINE=${E%%:*} PORT=${E##*:} DIST=dist EXPECT_BUILD=<S2_SHA7> BUILD_KIND=flagoff SUITE=all \
    OUT=../m3-recheck/save-<S2_SHA7>/m4guard-${E%%:*}.json node rc1-guard-save-qa-m4.mjs /workspace/wt-s2/game | tee ../m3-recheck/save-<S2_SHA7>/m4guard-${E%%:*}.log
done
# Rollback (9.7 on shipped rc1): same loop, worktree at tag m3-rc1-dialog (a01faea), BUILD_KIND=rc1, EXPECT_BUILD=a01faea, SUITE=m4
#   -> expected FAIL on ZW-3/ZW-4 until S-2 lands (that is the bug S-2 fixes); report it as the baseline.
# 3351d6c marker (pre-S-4): worktree m4/m4a-tracks-v2 @3351d6c
#   flag-off: npm run build -> BUILD_KIND=flagoff DIST=dist EXPECT_BUILD=3351d6c SUITE=m4
#   flag-on:  npm run build:qa -> BUILD_KIND=m4 S4=0 DIST=dist-qa EXPECT_BUILD=3351d6c SUITE=m4  (W1 v6 + MK-1; W2/MK-2 PENDING-S4)
# After S-4: BUILD_KIND=m4 S4=1 DIST=dist-qa EXPECT_BUILD=<S4_SHA7> SUITE=all
# If the real marker shape differs: MARKER_JSON='{"...":...}' node gen-m4-fixtures.mjs <real v6 fixture> m4-fixtures
```

## Ambiguities / risks (design doc v0.2)
1. **9.7 conflict:** the v0.2 §3 text still says a flag-off build *down-projects v7 and writes v6* ("open Q 7"). The steering says 9.7 = refuse with zero writes. The script follows the refusal rule, so the doc text needs updating.
2. **Newer-save dialog markup/copy are not in the doc** (and not in my local game copy, which is pre-v6, SAVE_VERSION=5). The default selectors are a guess: `.recovery-layer [role=alertdialog]` and text /newer/i. Set NEWER_SEL/NEWER_TXT/EXPORT_SEL from the S-2 code before trusting ZW-1/2.
3. **Export output format:** "export still works" — the doc doesn't say if it returns raw save bytes or a wrapper. ZW-2 demands the exact v7 bytes.
4. **tracksV7 marker shape is undocumented**, so the fixture shape is assumed. Regenerate from a real 3351d6c save via MARKER_JSON or V6 input.
5. **Fixtures:** my v6 base is a v5 fixture re-stamped as v6 with a valid sum. If v6 added fields, use a real v6 save as input. The v7 eggValueLevel is not price-matched (fine for the refusal/byte tests, not for migration correctness).
6. **What "zero writes" covers:** the lease key (`eggfarm.lease`), telemetry ring and `eggfarm.ui` count as writes under the strict default. If HoQA allows the lease/telemetry to change, set ZW_ALLOW and record it.
7. `.bak` vs `v6_backup`: the doc uses both "v6 `.bak`" and `eggfarm.save.v6_backup`. The script checks `v6_backup`, while ZW-3 covers `.bak` through the all-keys snapshot.
8. v6_backup write timing on IDB is not specified (the doc says "LS + IDB" in S-3). W2 only checks LS.

## HoQA rulings 2026-10-16 21:00 (supersede ambiguity 6 above)
1. **ZW-5 checks objects, not field names.** Telemetry may carry snapshot fields (farm_level, coinsBefore, ...). ZW-5 FAILS only if an allowed key holds a serialized save object (version + savedAt + state block; also found nested or as JSON-in-string) or a copy of the save/.bak/v6_backup bytes (raw or JSON-escaped). The byte-identical checks on save, .bak and eggfarm.ui stay in ZW-1..3.
2. **eggfarm.tab is allowed**, under the same no-save-object rule as eggfarm.lease and telemetry.
3. **eggfarm.install_id** may be created only when absent. Changing or deleting an existing value = FAIL (ZW-3 diff + ZW-4 spy + installIdCheck).
The lib self-test covers all three (allow list, install_id create/change/delete, save-object detection incl. nested/stringified, copy detection, snapshot fields not flagged).

## Script changes from the 21:13 baseline
- Served-bundle guard: a single-file asset (no `assets/` folder) is accepted only when the served HTML sha256 equals `<DIST>/index.html`. DIST may be an absolute path.
- Build-id probe opens `#settings` (it previously used a wrong nav selector).
- M4-W1/MK-1 use startLite/forceSave (pagehide, or eggfarm.save() when the hook exists), so they also run on release builds without `window.eggfarm`.
- Baseline: m4-guard-baseline-a01faea.md. ZW-2 (export) FAILs in all 3 engines; everything else passes. Recheck S-2 with the same command, plus EXPORT_SEL if S-2 labels the button differently.
