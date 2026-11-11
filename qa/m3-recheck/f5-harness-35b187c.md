# HoQA/PR110-35b187c — hosted harness verification; overall BLOCKED

Authorized queued continuation, examined after PR112. Scope qa/ only; no source changes/local suites/processes/remote mutations. Exact head `35b187cdd56c5428c22069675cd32f9306415602`; base `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` (rc/v5). TASK/HANDOFF re-read; task list expanded by explicit HoQA authorization, no genuine mismatch.

## Per-check results
- **Head/base and scope PASS**: live PR head/base match; sanctioned base comparison ahead2/behind0, exactly five files matching Architect addendum: `engineering/f5-active-pacing.md`, `tests/bot-m5-active.slow.test.ts`, `tests/bot-m5-active.test.ts`, `tests/bot-m5-active.ts`, `tests/bot-m5.ts`. No src/config/workflow changes.
- **Hosted Node20 gate PASS**: run42117041325/job127559322051 SUCCESS; actual test runtime v20.20.2. CI uses synthetic merge d273f45, not literal head; sanctioned compare head→d273f45 ahead1/behind0 files=[] proves identical content. No old-tip test results used.
- **Full unit suite PASS**: raw log L551–552: 148 files, 2122 passed +1 skipped, zero failures. Includes new `tests/bot-m5-active.test.ts`: 11 tests PASS at L273.
- **bot-m5-active.slow actual CI execution PASS**: L585–588 names `tests/bot-m5-active.slow.test.ts`, 2 tests PASS, including seeds0–99/three-profile windows. Full slow phase L612–613: 5 files,19 passed +1 skipped, zero failures. This is real execution, not mere test discovery.
- **Flag0 goldens PASS**: golden sources/runtime unchanged by five-file delta. Hosted log L283–305 prints pinned storage hashes and GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`; M4-on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`; both suites pass.
- **Build / release checks PASS**: release build, single-file build and check-release-build --build-id job steps SUCCESS.
- **Chromium release-globals actual execution PASS**: L646–658 runs `npm run check-globals -- chromium` / `node scripts/release-globals-browser.mjs chromium`; B-4, refused-newer-save and allowlist each PASS, with release globals step SUCCESS. Build id m4.1+d273f45 corresponds to identical synthetic merge.
- **Firefox/WebKit BLOCKED / NOT RUN**: release-globals job127575724343 SKIPPED/no steps by feature-branch condition (main/rc-head only). Not counted PASS, no waiver of HoQA requirement inferred.
- **Pacing optimal PASS** (job127559321412); **seller15 BLOCKED/in_progress** (127559322063); **casual BLOCKED/in_progress** (127559321919). Run42117041192. Single rollup observation; earlier skipped draft jobs ignored, never promoted to PASS. No aggregate FAIL yet observed, no row904 attribution presumed.
- K10 non-required under HoQA; current success immaterial to required bar.

## Architect / RC separation
Architect exact-head addendum PASS(delta) is preserved, same five paths and no hidden runtime changes. This verifies harness CI only. **F5 manifest row33 full-stack G0/AC7 + G1 remains OPEN**; G1 dependency-blocked findings are not closed by merge or slow-suite success. No HoQA ACK or merge-go fabricated.

## URLs and raw evidence
https://github.com/PrincipalLewis/egg-farm/pull/110
https://github.com/PrincipalLewis/egg-farm/actions/runs/42117041325/job/127559322051
https://github.com/PrincipalLewis/egg-farm/actions/runs/42117041192

`f5-harness-35b187c-evidence/hosted-checks-2339.txt` sha256 `d7aea08570983204dd9689ad46d01eb6b82a57d57919f8bbf6578427af33f230`
`f5-harness-35b187c-evidence/pr110.txt` sha256 `bc1d159a91251e5eed2c91c5818e4146063950520c79f3181133cd86a4693918`
`f5-harness-35b187c-evidence/base-compare.txt` sha256 `e87349d933218b01506fff85e67fac18775abec1f5f6dd469296f361ac5f3acc`
`f5-harness-35b187c-evidence/gate-log-42117041325.txt` sha256 `04fccfb1865640a6b266dbb71193dad6f6d17a9d7227743b16e204a4593e9a0c`
`f5-harness-35b187c-evidence/ci-merge-compare.txt` sha256 `b9460f7e31eef585bbc56355ba6402be5af1e107fbc050b6f2ec648a20ba989d`
`f5-harness-35b187c-evidence/gate-jobs-42117041325.txt` sha256 `a0cf6f0171fb0d10bb92b8d7c0c7944c4c0a61d365b13e879c71c26f73bc42a6`
`f5-harness-35b187c-evidence/architect-addendum.md` sha256 `ba34fb1989a2f9a67d8c293815b79fa7c0edd57219b15a29d30d980e32786945`

Evidence manifest: `qa/m3-recheck/f5-harness-35b187c-evidence/manifest.json`
sha256 `c56045bea4956c1c6b050e4e789c063afb0dd0a943099ac6e72d041d05023b96`. Contains raw logs/rollup/PR metadata/comparisons and CET excerpts.

**Overall BLOCKED** pending seller15/casual pacing, plus FF/WK execution if HoQA requires it. No monitoring loop, signals, browser/server, local test or source edits. No processes launched, cleanup unnecessary. No merge-go.

## QA-D-1105-RCMOVE — successor 16d91de (23:50 CET continuation, Europe/Belgrade)
This section supersedes prior head verdicts for the current candidate. Earlier 35b187c SUCCESS results are historical only. TASK/HANDOFF re-read before writing; same owner/scope/canonical report, authorized successor update, no genuine mismatch.

### Origin / identity
Candidate supplied by **Features**, relayed by parent: `16d91de7345dd0ab6b92bdb2740a50037e86aadc`, base `f8036e8f0826ca76fcc0ee13092d575533d4969b`. Live sanctioned PR read independently confirms these exact head/base values. **No separate HoE confirmation source was provided/found; not claimed.**

### Structural checks
- **PASS** remote base comparison: ahead3/behind0, same exact five harness tests/docs paths, no runtime/config/workflow file edits.
- **PASS** no reverts: new-base→candidate content patch equals prior-base→35b187c after removing only index metadata/hunk positions; all context/additions/deletions retained. New base runtime paths preserved unchanged.
- **PASS** clean merge-tree: parents are `35b187cdd56c5428c22069675cd32f9306415602` and `f8036e8f0826ca76fcc0ee13092d575533d4969b`; independently computed clean merge tree equals candidate tree `1765971f12085ea5a254d26547b5c34576547284`, exit0. Temporary computed objects written only inside qa evidence; original Git object store and worktrees unchanged.
- **PASS / no overlap** against #105 actual eight paths, independently confirmed by sanctioned comparison old rc844f8e15→f8036e8: `src/config/formulas.ts`, `src/config/m5-rules.ts`, `src/game.ts`, `src/save/m5-fields.ts`, `src/sim/actions.ts`, `src/sim/income-ref.ts`, `src/sim/timers.ts`, `tests/v5-income-ref.test.ts`. Intersection with five harness paths is empty.
- **Local tsc/full vitest NOT RUN, NOT REQUIRED** under overlap-only HoQA rule. Features' extra cheap-tsc claim is retained as author evidence only, not adopted as a new QA requirement or independently graded.

### New-head approvals / hosted evidence
- **Architect delta BLOCKED**: exact16d91de search of engineering/reviews found no matching review at observation. Old35b187c Architect PASS is not successor approval.
- **Node20 hosted gate BLOCKED/QUEUED**: run42124762864/job127585988987; exact check head16d91de, no conclusion. https://github.com/PrincipalLewis/egg-farm/actions/runs/42124762864/job/127585988987
- **Pacing BLOCKED / absent new-head shard evidence**: single fresh rollup returned only queued gate and queued non-required K10. No current shard SUCCESS evidence; no aggregate FAIL observed, so row904 attribution is not presumed.
- **Chromium globals BLOCKED / NOT RUN**: gate unfinished, no actual new-head execution logs. Old35b187c Chromium success is historical only.
- **FF/WK NOT RUN, NOT PASS, NOT BLOCKER** under direct HoQA **QA-D-1105-PR105-GO**: “skipped by design, feature-PR exception, enforced on RC PR.” This explicitly supersedes previous conditional FF/WK blocker language; it does not waive actual Chromium-in-gate PASS.
- K10 is non-required. F5 row33 full-stack G0/AC7+G1 stays **OPEN**, regardless of eventual harness merge.

### Evidence and process

`f5-harness-35b187c-evidence/mergefwd-16d91de/pr110.txt` sha256 `1644e7d89ad31a08c50fed47d07d6ad163233470e4a8b9a3993282f3616b1c3f`
`f5-harness-35b187c-evidence/mergefwd-16d91de/base-compare.txt` sha256 `3cb8fb60c2989eff7ab680f254b99acc0712c9aaca2dab6885119ebf8356f11f`
`f5-harness-35b187c-evidence/mergefwd-16d91de/income-ref-compare.txt` sha256 `f874d685efe1ab2bf51301c2118dd6b0cd3c2749803870bdbc823005ac36cd01`
`f5-harness-35b187c-evidence/mergefwd-16d91de/verification-summary.json` sha256 `a0e2b7e0960d9a2f9314ffc10461994a72020e46d7ae6857415fac411e6a3234`
`f5-harness-35b187c-evidence/mergefwd-16d91de/clean-merge-tree.txt` sha256 `6cf4b44501f324e1f0a1130fbf898d16912e6f292dc9a9e1eb1ed2edf3cd5b7b`
`f5-harness-35b187c-evidence/mergefwd-16d91de/hosted-checks.txt` sha256 `5d465071d035638db3e056a3738debd8da8fbbb2c16d6c2340cd8fe68d32bf24`
`f5-harness-35b187c-evidence/mergefwd-16d91de/architect-search.json` sha256 `9956239c833a53dfb76170112c6f19584210663887fd0bd4e6c3f6fe035fe9d8`

Current manifest `qa/m3-recheck/f5-harness-35b187c-evidence/manifest.json` sha256 `55eafaf6bf63fc64bf8f4ed0530fa690927dfbf30a848390aadd4cd08dec959b`; supersedes earlier manifest digest. Original report backed up to `f5-harness-35b187c.md.bak-dd755470` sha256 `dd755470115cf2ac8e50a69506d561127ce3225fa56cf563edb51b14aac6e03c`.

**Overall BLOCKED**: missing exact-new-head Architect delta PASS, pending Node20 gate/actual Chromium and absent pacing shard success evidence. One hosted observation, no polling. No local suites, servers, browsers, long-running processes, signals, source changes, remote mutations or sends. No cleanup needed and no merge-go.
