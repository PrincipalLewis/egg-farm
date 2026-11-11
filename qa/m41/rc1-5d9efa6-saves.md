# RC gate, Saves lane: PR #67 `rc/m4.1-rc1` @ 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463 (5d9efa6)

**Recommendation: QA PASS (Saves lane), Chromium blocking. 0 blocking findings.** Run once, 2026-10-24 14:42–16:2x CEST, in worktree `qa/wt-rc1-5d9efa6` (clean, own `npm ci`, porcelain 0 at every step).
Evidence: `qa/m41/rc1-5d9efa6/` (status.md = checkpoints). Scripts reached the worktree through symlinks `qa/wt-m41-7-5d9efa6{,-acs}` → `wt-rc1-5d9efa6` and `qa/m41/m41-7-5d9efa6` → `rc1-5d9efa6`, so there was ONE worktree and ONE evidence folder.

## Verify-before-publish values
| value | result |
|---|---|
| HTML `dist-html/egg-farm.html` sha256 | `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`: **MATCHES** `ccb87daa…88d5e1` (gates/html-sha256.txt; re-hashed at report time) |
| build-id | `m4.1+5d9efa6`, prefix `m4.1` (BUILD_PREFIX in scripts/build-id.ts@5d9efa6). Static: dist-html 3× `m4.1+5d9efa6`, 0 `+dirty`; dist-qa the same. Runtime (dist, Chromium): meta = #app data-build-id = session_start.build = `m4.1+5d9efa6` (delta/rc0/buildid.log). Also confirmed by csr9c, qel and resetat probes |
| tree hash `git rev-parse 5d9efa6^{tree}` | `31f66351ab8cd865b04848e4881d39cbcea940cd` |
| check-release-build | dist-html exit 0, dist exit 0 |
| check-globals (Chromium) | 3/3 PASS; release globals only `eggfarmExportTelemetry` |

## Intake (intake.txt)
- Tip 5d9efa6 = origin/rc/m4.1-rc1.
- Ancestors: 3c86720 Y, 8c568b0 Y, dd223f5 Y. merge-base with dd223f5 = `dd223f510e9acabf9b1915b56e39da8b88dcac63`.
- First-parent merges: #60, #61, #62, #63 (3c86720), #64, #66 (8c568b0), #65 (c877f69). Diff vs dd223f5: 116 files, +5345/−262.
- Spec of record `corrupt-save-recovery-spec.m41-final.md` sha256 = `530b29d3…f874`, unchanged, so no newer spec to diff (snapshot `qa/m41/csr-spec.m41-final.530b29d3.md`).

## Results per item
| item | check | result | evidence |
|---|---|---|---|
| (1) | unit `m4-exp1-explainer` + `m41-7-explainer-recovery` | **PASS 32/32** (m4-exp1 alone 25/25) | expl/unit.log, delta/m4-exp1-unit.log |
| (1) | `m4-exp1-explainer.test.ts` byte-identical to dfdf49c | **PASS** (TESTDIFF IDENTICAL) | csr/testdiff/ |
| (1) | csr9c full (Chromium) | **PASS 121/121, fails 0**, 13 cases. M1/M2 pre-M4 restore: seen only after the dismiss click, 8 s auto-hide leaves seen false in mem/LS/IDB, reload shows the card again, never under .recovery-layer. Welcome-back pre-M4: seen at show (§17 B10). EXPB1 commit/reload/new-farm/deferred: seen at show, auto-hide counts, reload 0 | delta/csr9c/run.log |
| (1) | csr9c `ONLY=EXPB1` | **PASS 35/35, fails 0** | delta/csr9c-expb1/run.log |
| (2) | CSR vitest `csr-m41-7.qa.test.ts` | **193/194**. The 1 fail is `CSR12-ls-throws-securityerror`, the known M4.2 Major, out of the M4.1 gate under D-HOP-2026-10-22-03(8). Same result as #63 (3c86720/8694222). RESET_AT/RS-* HARD **33/33** (incl. RS-AC4), INFO 6 | csr/vitest.log, csr/summary.txt |
| (2) | Chromium DOM subset (CSR ACs, IDB1, copy, age/level) | **PASS 159, FAIL 0** | csr/browser-chromium/ |
| (2) | b8-14 (8a, 8b full, CSR-14, re-measure) | **PASS 107/107**. 8a 5/5: the loser makes 0 IDB puts/deletes after takeover. 8b race-loser-during-idb-copy 5/5 iterations (55 checks): the loser makes NO IDB put/delete after losing the lease (only the pre-loss copy-tx ops, dt<0). 8b forced-claim-inside-copy-tx 3/3 iterations (21 checks). CSR-14 M5 lease-quota 12, Q preserve-quota 5. REMEASURE 9 | csr/browser-b8-14/ |
| (2) | reset.surfaced AC1–4 + clock-ahead-rollback (Chromium) | **PASS 16/16 cases, 180 PASS, 0 FAIL**. AC1 ×3, AC2 ×2, AC3 ×3, AC4 throw-in-tx / abort()-quota / throw-delete / control, CLK ×4 | csr/browser-resetat/ |
| (2) | QE-LATE-e §7 | **PASS**: gate4-explainer 17/17, qel7 19/19, oq2 10/10. QEL-8 rg 2 lines, the same 2 lines as dfdf49c; tracks-explainer markSeen moved L28→L141 with identical text. qe-late-browser Chromium **58/58** | gates/qel/, delta/qel/ |
| (2) | settled tap floors 48/44 @360/375/390 | **PASS**: 24 primary ≥48, 18 Export ≥44. REMEASURE M3 primary 48 / export 44 at all 3 widths. Mid-animation rcPop dips (min 40.8/37.4) are INFO, as in earlier runs | csr/browser-ui/, csr/browser-b8-14/ |
| (2) | EXPORT_ARIA + copy diff | **PASS**: EXPORT_ARIA 18 + legacy 6. title/body/button = art 18 each, export link/aria = art 27, aria-label starts with the visible text 18. Total UI PASS 237, FAIL 0, INFO 42 | csr/browser-ui/run.log |
| (2) | Firefox (non-blocking) | **PASS**: DOM 159/0, UI 237/0 | xb/firefox-dom, xb/firefox-ui |
| (2) | WebKit (non-blocking) | **PASS**: DOM 159/0; UI 257 PASS / 0 FAIL / 22 INFO (same 279 checks as Chromium; 20 mid-animation checks PASS outright in WebKit, INFO in Chromium) | xb/webkit-dom, xb/webkit-ui |
| (3) | save-noreg vs dd223f5 | **PASS**: 122/122 vitest. compare: 286 rows, valid-identical 90, **valid-DIFF 0**, errors 0, recovery/newer rows 196, lossless=false none (both sides) | save-noreg/compare.txt |
| (3) | older-fixture migrations | **PASS**: v1/v2/v3 MIG fixtures, v4 m1-rc2, v5 m2-rc1 ×3, m4 pre-v7 F30-C30 (SAVE_VERSION is still 6 at the RC, so there is no v7 format; "v7" = the tracksV7 pre-M4 fixture). All have stateSha identical to dd223f5 in every mode and roundtrip losslessly | save-noreg/noreg-5d9efa6.json |
| (4) | economy vs dd223f5 | **PASS, delta 0 on every metric, per-seed identical** (see below) | econ/ |
| (5) | sync --check, tsc, build, build:qa, build:html | all exit 0, porcelain 0 | gates/local-gates-summary.txt |
| (5) | full vitest | **PASS: 107 files, 1403/1403** | gates/vitest-full.log |
| (5) | goldens subset | **PASS 89/89** (5 files) | gates/goldens.log |
| (5) | test:slow | **PASS 16 passed, 1 skipped** (3 files). dd223f5 gives the same counts; the skip is the same test | gates/test-slow.log |
| (5) | rc0-browser Chromium | **PASS 358/358**. This is +10 vs the 348 at 8c568b0: 6 new `B … target: no aria-label, name starts with the visible text` (#62 M41-8 WCAG 2.5.3) and 4 new `G refund card on screen` (#65 M41-9 CCR). 6 ACb lines now assert the CSR-9 FINAL copy (#63). 0 checks dropped | delta/rc0/rc0.log, delta/rc0/rc0-vs-8c568b0.diff |

## (4) Economy: dd223f5 vs 5d9efa6 (econ/compare.txt, per-seed dumps econ/perseed-*.json)
| metric | dd223f5 | 5d9efa6 | Δ | threshold | verdict |
|---|---|---|---|---|---|
| acw1 seeds 1–200: % F10 ≤960 s | 98 | 98 | 0 | ≥95 | PASS |
| acw1 seeds 1–200: median F18 (min) | 25 | 25 | 0 | ≤40 | PASS |
| acw1 seeds 201–299: % F10 ≤960 s | 96.97 | 96.97 | 0 | ≥95 | PASS |
| acw1 seeds 201–299: median F18 (min) | 25 | 25 | 0 | ≤40 | PASS |
| acw1 median F10 1–200 / 201–299 (min) | 13.67 / 14 | 13.67 / 14 | 0 | info | |
| L10 1–200 P95 nw / w (min) | 12.02 / 12.08 | same | 0 | ≤12.1 | PASS |
| L10 1–200 fastest nw / w | 7.87 / 8.32 | same | 0 | ≥7.8 | PASS |
| L10 201–300 P95 nw / w | 11.81 / 11.81 | same | 0 | ≤12.0 strict | PASS |
| L10 201–300 fastest nw / w | 8.13 / 8.76 | same | 0 | ≥8.0 strict | PASS |
| AC7 workers L@30 P5/med/P95 (100 seeds) | 21/22/22 | same | 0 | band 20–24 | PASS (TS bot RESULT: PASS both) |
| AC7 workers L18-25 step P95/worst (s) | 180/180 | same | 0 | ≤390 / ≤480 | PASS |
| AC7 variance L18-25 (test:slow) P95/worst | 236.4/255.9 s | same | 0 | ≤390/≤480 | PASS; t20 P95 1555 ≤1740 |
- Seeds worse than main: **0** (`ECON_COMPARE metrics_changed=0 seeds_worse=0 per_seed_identical=true`). The printed pacing reports (AC-W1, AC7 seller15, M4A-PACING) and the test:slow reports (D-CEO-04, worst-seed, seller-variance) are byte-identical between the two SHAs. Pacing trio 14/14 on each SHA.
- This is consistent with the diff: the RC touches no economy data, balance config, bots or pacing tests vs dd223f5.

## save-noreg row `chain/valid-main-seq4+newer-idb-seq6 (stale LS)` [on]/[off]: EXPECTED, not a finding
- The row is in the **valid-identical** section of compare.txt (L689–690). The checkpoint line showed it only because it printed the last 2 lines of that list.
- State, pick, LS after load, mirror writes, savedMainSha, dialog (null) and recovery (null) are all identical to dd223f5. The only differences are outside the compare fields:
  - telemetry: the candidate has +`save_restore`.
  - `via`: null vs "idb".
- Cause: at dd223f5, main.ts `reconcile()` (L93) and main.ts:109 emitted `save_restore {source:'idb'}`. The harness records only Game telemetry, so the base list misses an event the dd223f5 product did emit. At the RC the boot reconcile was removed (3a6eb7b) and Game emits the event from loadSafe staleRestore (34d50a8, src/game.ts:65). So the newer IDB still wins silently with exactly one `save_restore{source:'idb'}`.
- Rulings: D-HOP-35 10:18 amendment (decisions.md:394); spec 530b29d3 L39/G7, IDB1-7; D-HOP-2026-10-22-04 (decisions.md:473) for the no-main counterpart.
- Write-up: rc1-5d9efa6/save-noreg/chain-seq4-newer-idb-seq6-classification.md

## Findings
- **None new.**
- Carried, non-blocking: `CSR12-ls-throws-securityerror` is an M4.2 **Major**, out of the M4.1 gate under D-HOP-2026-10-22-03(8) (`qa/m41/csr12-ls-throw-m42-major.md`).
  - Repro: `localStorage.getItem` throws SecurityError → `new Game` throws, the page stays on the start screen with 1 unhandled rejection, 0 save writes, and IDB is untouched.
  - Same behaviour as at 3c86720.
- INFO: mid-animation (rcPop) tap heights dip below 48/44 during the pop. The gate is on the settled floors, which pass.

## Not run / pending
- **Not run:**
  - WebKit and Firefox resetat, b8-14 and csr9c (Chromium-only scripts / the lock budget is shared with UI QA).
  - Firefox/WebKit rc0-browser and check-globals.
  - Python AC7 cross-check `py_ac7` (covered by test:slow seller-variance TS-vs-PY: t18 P50 21.11 vs 21.06).
- `csr12-ls-throw-probe.mjs` (INFO) was not rerun; the behaviour is known.

## Addendum 16:22 CEST
- WebKit UI finished 16:22:31 CEST: exit 0, PASS 257, FAIL 0, INFO 22. Driver end: worktree porcelain 0, :5961 free.
- Cleanup: no own processes left; ports 5961-5964 free; helper symlinks removed; worktree `qa/wt-rc1-5d9efa6` kept clean (porcelain 0) for re-verification; method scripts copied to rc1-5d9efa6/method/.
