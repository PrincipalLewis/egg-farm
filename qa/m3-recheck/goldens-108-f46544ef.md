# Saves QA: #108 golden spawn, first exact-head bar @ f46544ef (HoQA/pr108-firstbar)

TASK HoQA/pr108-firstbar: first exact-head QA bar for #108 (golden spawn) at f46544efaae907217126491b29588d77258ab28a.
Date: 2026-11-06 03:56 – 04:08 CET; pacing settle 04:48 CET (Europe/Belgrade). Write scope: `qa/m3-recheck/goldens-108-f46544ef.md`, evidence `qa/m3-recheck/evidence/goldens-108-f46544ef/`, scratch `qa/scratch/goldens-108-f46544ef/`. Nothing merged, pushed, or tagged. Evidence cites **f46544ef** only.

## Recommendation: **PASS** (content / local / gate / pacing). HoQA issues the merge GO.

The exact head clears every local check: identity and trees (verified independently), a 14-file A/M diff vs rc/v5 with no reverts, tsc 0, full vitest 2272 passed with 1 skipped and 0 failed, flag-off golden 7/7 with pins identical to rc/v5, build plus `check-release-build: m4.1+f46544e ok`, GE-AC26 1/0, m5persist, and legacy load. The hosted ci gate run 42152085295 is SUCCESS at this headSha. The 04:48 CET one-shot (HoQA/pr108-pacing) of pacing-x1-stack run 42152085267 found all 3 shards SUCCESS and the aggregate FAIL **only** on blocking row 904 NOT-WIRED ×3 (45 PASS / 0 FAIL). That meets the pacing bar. Tip still f46544ef. HoQA issues the merge verdict.

## Rules 24/25 context
- This is the **first** Saves exact-head bar for #108. It was owed and is run here. No prior Saves QA PASS exists to inherit, and none is claimed.
- The Architect inherit recorded at 00552332 carries to f46544ef because the tree is the same (verified below). That is **Architect inherit only**, not a Saves PASS.

## Identity (evidence: identity.txt, diff-detail.txt)
- `git ls-remote origin refs/pull/108/head` = `refs/heads/feat/v5-golden-spawn` = **f46544efaae907217126491b29588d77258ab28a** (03:56 CET; re-checked 04:08 CET, unchanged). GitHub pull #108 head.sha = f46544ef…, base rc/v5 @ eed62687; open, not draft, mergeable=true, mergeable_state `unstable` (hosted settling). Not merged.
- Tip subject: "Merge rc/v5 into feat/v5-golden-spawn (#108 mergefwd onto eed62687)".
- Parents: `00552332a5ef8436a878246f70dd102cd849433f` (parked prior tip) + **`eed62687db4aa05167e5e7f8b14e1674715dfc4a`** (`origin/rc/v5`, #107 merged; unchanged at 04:08 CET).
- Contains origin/rc/v5: **YES**.
- Trees, verified independently:
  - tip f46544ef tree = **891f1f93f98dc786ac586487c91b795ad8cf8d4f**
  - 00552332 tree = **891f1f93f98dc786ac586487c91b795ad8cf8d4f**
  - `git merge-tree --write-tree 00552332 origin/rc/v5` = **891f1f93f98dc786ac586487c91b795ad8cf8d4f** (same both orders; clean, no conflicts). merge-base(00552332, rc/v5) = a5f8e3c9.
  - `git diff 00552332 f46544ef` = empty. HoQA's claim (merge-tree = committed tree = 00552332 tree, no product delta) is **confirmed**.
  - rc/v5 eed62687 tree = 92a3dbf8c0c14723609717adb9d8a47b2a48facc
- Diff vs `origin/rc/v5` eed62687: **14 files, +494/−37**, A/M only, no reverts (no revert-subject commits, no pure-deletion files):
  - `src/config/formulas.ts` (M, +3/−1)
  - `src/game.ts` (M, +3/−3)
  - `src/main.ts` (M, +1/−1)
  - `src/save/m5-fields.ts` (M, +23/−12)
  - `src/save/save.ts` (M, +5/−5)
  - `src/sim/actions.ts` (M, +7/−2)
  - `src/sim/golden.ts` (M, +97/−7)
  - `src/sim/state.ts` (M, +4/−0)
  - `src/sim/timers.ts` (M, +5/−3)
  - `src/ui/app.ts` (M, +1/−1)
  - `tests/v5-f1b-clock-rng.test.ts` (M, +2/−1)
  - `tests/v5-golden-m5persist.test.ts` (A, +121)
  - `tests/v5-golden-spawn.test.ts` (A, +220)
  - `tests/v5-streak-sim.test.ts` (M, +2/−1)
- Shipping data and golden pins are not in the diff: `data/`, `public/`, `src/config/balance.json`, `src/config/flags.ts`, `engineering/golden/` all have an empty diff vs rc/v5 (golden-pins-identity.txt). Shipping `m4.flags.golden = 0` (all M5 flags 0).
- Worktree: `qa/scratch/goldens-108-f46544ef/wt` (clone `--reference` the game object store, detached at tip, `git status` clean). node_modules is symlinked from `qa/scratch/tapcoins-dc58705/wt/node_modules`. package-lock.json is byte-identical: tip sha256 `56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e` = donor sha256 `56569550…f6f75e`; package.json and package-lock.json are not in the diff.

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity (ls-remote + GitHub) + trees + 14-file A/M diff vs rc/v5, no reverts | **PASS** | identity.txt, diff-detail.txt |
| 2 | `tsc --noEmit` | **PASS** EXIT=0 | tsc.txt |
| 3 | Full default vitest (1 worker, flock, nice 10) | **PASS** 155 files passed (155); **2272 passed \| 1 skipped (2273)**, 0 failed; 230 s | vitest-full.txt |
| 4 | Flag-0 goldens/parity | **PASS 7/7** (4 files): GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`, m4on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` (same as the prior bars); m4a-flag-off 2/2; zg-flagoff-dom 1/1. All 4 test blobs and the shipping balance/economy/flags blobs are identical to rc/v5 | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 5 | `npm run build` (sync-economy --check, tsc, vite build, check-release-build) | **PASS** EXIT=0; **`check-release-build: m4.1+f46544e ok`** (no +dirty) + all 6 release checks ok; dist/index.html carries `m4.1+f46544e` | build.txt |
| 6a | GE-AC26 valid-1 / invalid-0 | **PASS**: `tests/v5-golden-rewards.test.ts` 21/21. ✓ `validateBalance (GE-AC26 / D-HOP-2026-11-05-11) > tc_frenzy_all_sales must be 1 (0 is invalid, no alternate branch)`. 0 is rejected with golden on and with the flag off, 2 is rejected, 1 and the shipping default are accepted; no 0-path fallback. Sibling ✓ in v5-golden-spawn (same rule + slice-2 required keys) | vitest-ge-ac26-rewards.txt, vitest-m5persist-spawn.txt |
| 6b | m5persist | **PASS**: `tests/v5-golden-m5persist.test.ts` 7/7 (T1, T1 edge, T2 bit-identical, T3 strip-only incl. spawn-due 0, flag off strip, M1 debugBackdateSave, load keeps stored spawn-due 0) + sibling `tests/v5-golden-spawn.test.ts` 25/25 (incl. R10a never-saved egg/pending/Frenzy, goldenUnload, m5Offline) = 32/32 | vitest-m5persist-spawn.txt |
| 6c | Legacy load | **PASS 128/128**, 5 files: `tests/v5-f2-m5-fields.test.ts` 37 (incl. "legacy v1.0 frenzyEndAt dropped", "legacy save without durS", "flags off: m5Load… SAME object", golden no-egg settle), `tests/save-fixtures.test.ts` 4, `tests/save.test.ts` 9, `tests/newer-save.test.ts` 14, `tests/csr-loadsafe.test.ts` 64 | vitest-legacy-load.txt |
| 7 | Hosted gate SUCCESS at headSha | **PASS**: ci run **42152085295** headSha f46544ef, conclusion **success**; gate job 127677462601 success, incl. step 9 "Release globals allowlist (chromium)" success and step 11 "check-release-build --build-id" success. Standalone `release-globals` job 127680353901 **skipped-by-design** on a non-rc/* PR (≠ pass; not a block) | hosted-gate.txt |
| 8 | Pacing: 3 shards SUCCESS; aggregate FAIL only row 904 ×3 | **PASS**: seller15/optimal/casual all success; aggregate failure only blocking row 904 NOT-WIRED ×3 (45 PASS / 0 FAIL); one-shot 04:48 CET | hosted-pacing-0448.txt, pacing-summary.md, pacing-verdict.json |
| — | k10-breeds-offset run 42152085247 | job 127677462484 failure; known-red, non-required (D-HOP-2026-10-30-52/53); not a block | hosted-pacing.txt |

## Hosted runs (exact tip f46544ef)

| workflow | run id | conclusion | notes |
|---|---|---|---|
| ci (gate) | [42152085295](https://github.com/PrincipalLewis/egg-farm/actions/runs/42152085295) | **success** | gate job 127677462601 success (03:43:08 → 03:51:39 CET); release-globals job 127680353901 skipped-by-design |
| pacing-x1-stack | [42152085267](https://github.com/PrincipalLewis/egg-farm/actions/runs/42152085267) | **failure (PASS bar)** | shards SUCCESS ×3; aggregate FAIL only row 904 NOT-WIRED ×3 |
| k10-breeds-offset | [42152085247](https://github.com/PrincipalLewis/egg-farm/actions/runs/42152085247) | failure | known-red, non-required |

Pacing shards (one-shot read 04:48 CET, HoQA/pr108-pacing; earlier 04:08 CET left optimal/casual in_progress):

| shard | job id | status | conclusion | started → completed (CET) |
|---|---|---|---|---|
| seller15 | 127677462563 | completed | **success** | 03:43:08 → 04:05:37 |
| optimal | 127677462812 | completed | **success** | 03:43:08 → 04:28:41 |
| casual | 127677462855 | completed | **success** | 03:43:09 → 04:15:46 |
| aggregate (pacing-x1-stack) | 127692724288 | completed | **failure** | 04:28:45 → 04:29:02 |

### Row 904 attribution
From `x1-verdict` summary.md / verdict.json (copied under evidence/):
- rows: **45 PASS, 0 FAIL**, 1 WARN, 20 INFO, 0 PENDING-REPRED, 3 N/A (903), 12 NOT-WIRED (3 blocking), 24 EXCLUDED (G5-P)
- Aggregate FAIL lines (only):
  - **FAIL: blocking row 904 optimal NOT-WIRED**
  - **FAIL: blocking row 904 seller15 NOT-WIRED**
  - **FAIL: blocking row 904 casual NOT-WIRED**
- Matches the pacing PASS bar (shards SUCCESS ×3; aggregate FAIL only row 904 NOT-WIRED ×3). No other FAIL row.

## Pacing settle (HoQA/pr108-pacing, 04:48 CET)
- Tip re-checked via GitHub pull #108 head.sha = **f46544efaae907217126491b29588d77258ab28a** (unchanged; open, not draft).
- One read of run 42152085267; no poll loops; this routine deleted after the look.
- Local + gate PASS already accepted (QA-D-1106-PR108-BAR). Pacing now **PASS**. Full bar recommendation: **PASS**. Not a merge action — HoQA issues GO.

## Not run / limits
- No further paced re-check after this one-shot.
- #117 not started (queued until mergefwd tip).
- No browser serve was needed (no port used).
