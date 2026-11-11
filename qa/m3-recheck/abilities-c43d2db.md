# HoQA/PR112-c43d2db — local verification PASS; overall BLOCKED

Continuation of HoQA/PR112-exacthead. Prior provisional-head block resolved by HoE HOLD release relayed at 22:47 CET (Europe/Belgrade), corroborated by engineering/status.md snapshot. TASK and saved HANDOFF re-read before writing; successor/scope amendments preserved owner, no genuine mismatch.

Confirmed head: `c43d2db5dd56f90096a6ba5c509d33ccef69117d`
Comparison base: `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` (`rc/v5`).
Source of confirmation: parent's explicit HoE release message; engineering status “#112 tip c43d2db confirmed (9 files on 844f8e15) — UI QA HOLD released”. Local detached worktree independently verified full head/base ancestry.

## Results

### Exact 9 files / no reverts: PASS
Base ancestor, ahead 3 / behind 0; exactly expected 9 files. Normalized old/new patch identical, retaining every added/deleted/context line.
Evidence: `abilities-c43d2db-evidence/patch-preservation.json` sha256 `6f5e91829ed224231c5c0491729872b463a2fb11329e960847345d4fff16090a`

### Flag-0 goldens: PASS
Pinned golden sources unchanged vs base. Full suite: flag-off storage hashes and trace f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544 identical to pins; M4-on also passes.
Evidence: `abilities-c43d2db-evidence/full-vitest.log` sha256 `0f105360c694cd62ab7a9c8acdbcef949f166cac93f99e4bbc74ab0ecc231477`

### v5-abilities-sim + v5-f1a-fields: PASS
2 files, 39 passed (29 + 10); exit 0.
Evidence: `abilities-c43d2db-evidence/focused.log` sha256 `402614cde9933aa0dbb5ca81a0d98253934efdb6f5d053887577bf15fdc1b9b5`

### tsc --noEmit: PASS
Exit 0.
Evidence: `abilities-c43d2db-evidence/tsc.log` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### Full vitest: PASS
148 files; 2140 passed, 1 skipped, 0 failed. --minWorkers=1 --maxWorkers=2; exit 0.
Evidence: `abilities-c43d2db-evidence/full-vitest.log` sha256 `0f105360c694cd62ab7a9c8acdbcef949f166cac93f99e4bbc74ab0ecc231477`

### build: PASS
npm run build includes economy check, tsc, vite, check-release-build; exact build id m4.1+c43d2db; exit 0.
Evidence: `abilities-c43d2db-evidence/build.log` sha256 `c1489d79b29b9ec4c1183775acaf5f23b66ecb9323d07a80e3fb2c1d62ba3abc`

### check-release-build: PASS
Explicit second invocation against dist; exit 0.
Evidence: `abilities-c43d2db-evidence/release-build.log` sha256 `5ea2508464cec94c38217f2732a4a42fd36a3c40292aaa791bf3b219e3f4e112`

### Hosted Node20 gate: BLOCKED
42115540195 / gate 127554070902 QUEUED, no conclusion. Workflow pins Node20 but no successful execution evidence.
Evidence: `abilities-c43d2db-evidence/hosted-checks-tool.txt` sha256 `56f4e6ed215d5b8f66bd91b4cc86836f441645d2d8d7012ac2d4e1abaf483940`

### Hosted pacing shards: BLOCKED
optimal 127554073732, casual 127554073685, seller15 127554073263 all QUEUED at exact head.
Evidence: `abilities-c43d2db-evidence/hosted-checks-tool.txt` sha256 `56f4e6ed215d5b8f66bd91b4cc86836f441645d2d8d7012ac2d4e1abaf483940`

### Release-globals execution: BLOCKED / NOT RUN
No actual execution evidence obtained. Standalone missing or SKIPPED is not PASS; Chromium gate pending. No local browser run.
Evidence: `abilities-c43d2db-evidence/hosted-checks-tool.txt` sha256 `56f4e6ed215d5b8f66bd91b4cc86836f441645d2d8d7012ac2d4e1abaf483940`

### Architect exact-head merge requirement: PASS delta / merge-go HELD
Exact-head Architect note now exists: literal verdict PASS (delta), says Architect delta gate met and links prior sim APPROVE. Do not fabricate a separate literal APPROVE or merge authorization. HoE/HoQ must accept this wording; hosted and QA merge requirements remain.
Evidence: `abilities-c43d2db-evidence/architect-delta.md` sha256 `0487a08704b3ed60347102862ade50da6c8a5abdaf3c1914af42ca2453a2604c`

## Diff files
src/sim/abilities.ts (A), effects.ts, events.ts, m5-state.ts, payout.ts, timers.ts, workers.ts; tests/v5-abilities-sim.test.ts (A), tests/v5-f1a-fields.test.ts. All other files M. 9 total, +402/−10. Raw diff, file list, commits, merge-base and ancestry included. No unrelated base changes reverted; content patch preserved from the prior abilities delta (only index and hunk location metadata excluded for comparison).

## Runtime and limitations
Local Node `v24.22.1`, not Node20. This is fresh local verification, NOT a replacement for mandatory hosted Node20 SUCCESS. Used existing installed dependencies copied into the disposable exact-SHA worktree; no install, fetch, clone, source fixes or remote mutation. Build/test commands and exit codes retained. All checks used successor, never old-tip test results. The old patch was used only for merge-forward preservation comparison.

Hosted workflow read once and check rollup read once; no repeated hosted polling. Both gate and pacing remained pending/queued at observation. There is no observed aggregate FAIL to attribute; if later aggregate FAILs, its named failing line/log evidence remains required, not waived. No CI dispatch or browser/server run.

## Cleanup
Owned PID 1318669 recorded by lane-run uiqa-pr112. lane-kill exit 0, exact `GONE 1318669`; /proc tag scan found zero owned survivors. Run worktree status after completion is empty (no source modifications), retained as disposable reproduction snapshot. No other worktrees changed. Cleanup evidence: `abilities-c43d2db-evidence/cleanup-lane-kill.txt` sha256 `b55238c7fae9c91b6f74404741afe004c22f6892dc4892f05f879d99f8d1fd45`; `abilities-c43d2db-evidence/cleanup-survivors.json` sha256 `9d6e9f69a85478f39d46b87c102514324633cfb66a40b498e3611d32d34a652b`.

## Evidence manifest
`qa/m3-recheck/abilities-c43d2db-evidence/manifest.json`
sha256: `3467b5c797684d636444f9e82cd7d8c9839c03c151487397629ed7a6fa5c6309`
Includes raw logs, commands, exit codes, diff/identity snapshots, Architect delta and cleanup proof. Manifest excludes itself and this report to avoid circular hashes. HoQ owns final verdict; no merge-go granted here.

## Hosted follow-up — 2026-11-05 22:56:02 CET (Europe/Belgrade)
HoQA accepted local report `cb767878` and rules Architect PASS(delta) counts as exact-head Architect approval (QA-D-1105-PR112-LOCAL); that merge prerequisite is satisfied. No genuine TASK/HANDOFF mismatch; same owner, scope, head and base.

Single live check-rollup observation: every returned check has exact head `c43d2db5dd56f90096a6ba5c509d33ccef69117d`.
- Node20 gate: **BLOCKED — QUEUED**, no conclusion. https://github.com/PrincipalLewis/egg-farm/actions/runs/42115540195/job/127554070902
- Pacing optimal/casual/seller15: **BLOCKED — all QUEUED**, no conclusions. https://github.com/PrincipalLewis/egg-farm/actions/runs/42115540034 (jobs 127554073732 / 127554073685 / 127554073263).
- Release-globals: **BLOCKED / NOT RUN**; no actual execution evidence returned. Not graded PASS.
- Aggregate FAIL: none observed; row904 cause **not presumed**. Retrieve named failure-line logs if one appears.
- K10 queued, not required per HoQA.

Raw observation: `abilities-c43d2db-evidence/hosted-checks-2255-tool.txt`, sha256 `56f4e6ed215d5b8f66bd91b4cc86836f441645d2d8d7012ac2d4e1abaf483940`. No completed results/logs available; no additional hosted polling, dispatch, process launch or external mutation. Previous cleanup proof remains valid. Prior report preserved as `abilities-c43d2db.md.bak-cb767878` (sha256 `cb7678789c32aef66fc55779092831073b3935402eaa0648f4a4ac76e61bfbcb`).

Current evidence manifest sha256 (supersedes earlier manifest digest): `70a54a7371d3efde8886e71dfa0a74f02ab21874ca93bd4961d35a5674a70536`. Overall **BLOCKED pending hosted evidence**.

## Hosted handoff verification — 23:39 CET continuation (Europe/Belgrade)
Latest section supersedes earlier pending gate/Chromium findings; local evidence is retained. TASK/HANDOFF re-read; queued PR110 explicitly added by HoQA, no genuine mismatch.

- **Node20 gate PASS**: run42115540195, job127554070902 SUCCESS; actual log records node v20.20.2, 148 unit files / 2140 passed +1 skipped / 0 failed; slow 4 files /17 passed +1 skipped. Build and check-release-build steps SUCCESS.
- **Hosted identity PASS with explicit checkout distinction**: check rollup head is exact c43d2db5dd56f90096a6ba5c509d33ccef69117d. GitHub checked out synthetic merge 60801ae, NOT the literal head commit. Sanctioned compare of frozen head→60801ae: ahead1/behind0, files=[]; identical content, no silently substituted old tip.
- **Chromium release-globals actual execution PASS**: raw gate log L659–671 runs `npm run check-globals -- chromium` → `node scripts/release-globals-browser.mjs chromium`; B-4, refused-newer-save and allowlist checks each print PASS. Job steps independently record Release globals allowlist (chromium) SUCCESS. Build id m4.1+60801ae is the content-identical synthetic merge.
- **Firefox/WebKit release-globals BLOCKED / NOT RUN**: standalone job127568840572 SKIPPED, no steps. Workflow branch condition limits it to main/rc-head branches; feature PR is excluded. Skipped is NOT PASS. No waiver inferred: any all-engine execution requirement remains unsatisfied pending HoQA ruling/execution.
- **Pacing seller15 PASS; casual PASS; optimal BLOCKED/in_progress** at the single fresh observation. Run42115540034, jobs seller15=127554073263, casual=127554073685, optimal=127554073732. No aggregate FAIL observed; row904 cause not presumed.
- K10 failure is recorded but non-required under HoQA ruling. Architect exact-head PASS(delta) accepted under QA-D-1105-PR112-LOCAL.

Gate URL: https://github.com/PrincipalLewis/egg-farm/actions/runs/42115540195/job/127554070902
Pacing URL: https://github.com/PrincipalLewis/egg-farm/actions/runs/42115540034

Raw execution: `abilities-c43d2db-evidence/gate-log-42115540195.txt` sha256 `199eb083436bfb53caed09dfd418a2bf6071df1c06db7739fd1abdf360f466f6`
Rollup: `abilities-c43d2db-evidence/hosted-checks-2339.txt` sha256 `d11bc58eeb36e527c441cfc654e01d7b08ead5726dd67218714c4e33e986918f`
Step outcomes: `abilities-c43d2db-evidence/gate-jobs-42115540195.txt` sha256 `a3dc30ef9fdbe0720aa27e08189dc03e23547543d393daeefc1f25923033feb2`
Synthetic tree comparison: `abilities-c43d2db-evidence/ci-merge-compare.txt` sha256 `a4672f826ae8446ee5d05bf44415f4304a4594dd9e6d652558404f143fbe32fc`

Current manifest sha256: `f27d178f574c3d04aa74a81c9b04dd21823a04de0dbea3d70c243076f3f5443a` (supersedes all earlier digests). Overall **BLOCKED**: optimal pending, FF/WK not executed if required. No merge-go. One status observation, no polling loop; no local suites/processes or external mutations. Prior cleanup proof remains valid. Backup `abilities-c43d2db.md.bak-6942e7cf` preserves previous report.

## QA-D-1105-RCMOVE successor7a492e5 — current verification
Explicit continuation of approved112 stream; TASK/HANDOFF re-read before writes, same owner/canonical report. Candidate supplied by Features via parent, **not independently described as HoE-confirmed**. Current exact remote head `7a492e5fea47f9bb92ae2d07e82820c64471ec5a`, base `f8036e8f0826ca76fcc0ee13092d575533d4969b` both independently MATCH. Priorc43d2db results remain historical only.

### Structural checks
- **PASS** sanctioned compare ahead4/behind0, exact same nine paths: src/sim/{abilities,effects,events,m5-state,payout,timers,workers}.ts; tests/v5-abilities-sim.test.ts; tests/v5-f1a-fields.test.ts. No unrelated paths.
- **PASS** overlap independently established against actual merged #105 eight paths: intersection is exactly **src/sim/timers.ts**. Candidate imports incomeRefTick and abilitiesTick and TIMER_SYSTEMS ends `[seedEvRng, streak, breeds, incomeRef, abilities]`.
- **PASS** no identified reverts: all seven nonoverlapping #105 paths have empty diff vs new base; non-timers abilities patch equals previous abilities delta after index/hunk-number normalization. Timers diff vs new base retains incomeRef unchanged and adds abilities import/wrapper/last array entry only. No source fix made.
- **FAIL — clean automatic merge-tree criterion**: independent `git merge-tree --write-tree c43d2db f8036e8` exits **1**, reporting content conflict in `src/sim/timers.ts`. Its conflicted tree `6fb76ee0b105dd163013e5a8db39e99ac62a7e3f` does **not** match committed candidate tree `924d11cc269544853b539f54f27923bc039b6922`. Candidate is a resolved merge, not a clean automatic merge. This is an evidence mismatch, not a fabricated test failure; explicit Architect/HoQA review of resolution required. Merge-tree temporary objects confined to qa evidence.

### Fresh overlap regression
A new disposable detached worktree at exact7a492e5 was used; no fetch/clone/source changes. Existing dependencies copied into it. Ran only required tsc and full Vitest via lane-run uiqa-pr112.
- **tsc PASS**, exit0.
- **Full Vitest PASS**, `vitest run --minWorkers=1 --maxWorkers=2`: **149 files,2167 passed,1 skipped,0 failed**, exit0. Includes ability/income-ref regressions and pinned flag-off/M4-on golden suites. No focused-only substitution.
- Local runtime Node24.22.1, not substitution for hosted Node20. Worktree status after tests empty. No new build or browser/server run.

### Current approval / hosted checks
- **Architect delta BLOCKED**: exact7a492e5 review search empty at final observation. Priorc43d2db approval historical only.
- **Hosted Node20 gate BLOCKED / QUEUED**: run42124942241/job127586595154, exact7a492e5. https://github.com/PrincipalLewis/egg-farm/actions/runs/42124942241/job/127586595154
- **Pacing BLOCKED / all QUEUED**: run42124942275; optimal127586595961, seller15127586595852, casual127586595670. No aggregate FAIL observed; no presumed row904 attribution.
- **Chromium-in-gate BLOCKED / NOT RUN**: no finished new-head execution evidence. Prior-head logs not promoted.
- **FF/WK NOT RUN / NOT PASS / NOT BLOCKER** under direct HoQA QA-D-1105-PR105-GO feature-PR exception; enforced on RC PR. K10 non-required.

### Cleanup / evidence
Owned lane PID1458142; lane-kill returns exit0 and exact `GONE 1458142`. /proc tag read finds zero owned survivors; no custom or unrelated signals. Disposable source tree unchanged.

`abilities-c43d2db-evidence/mergefwd-7a492e5/pr112.txt` sha256 `fe0ebe21df6661573058a9e8bf68a3ad7d18e00788558bd953d92434edb0021c`
`abilities-c43d2db-evidence/mergefwd-7a492e5/base-compare.txt` sha256 `7c6bcaeaac95694efad02b98340b2887c1a1808ea582ee66244705cd035361c8`
`abilities-c43d2db-evidence/mergefwd-7a492e5/structure.json` sha256 `45bdd1742a8d42ed4865fc2a6f78d40fd94e6df8d9e66d17fadd0a5bbb92a145`
`abilities-c43d2db-evidence/mergefwd-7a492e5/clean-merge-tree.txt` sha256 `8b448a643d2a1a5e34c2138e4cb466f154b270988d77b351a3a06e2ea89bd892`
`abilities-c43d2db-evidence/mergefwd-7a492e5/timers-vs-base.diff` sha256 `26cebb9e235754c36a6d7ae85457cb1ecf8fac20b7f5763eb05060a2244d5f17`
`abilities-c43d2db-evidence/mergefwd-7a492e5/income-ref-nonoverlap-preservation.txt` sha256 `bde294368bfed77c2cddf8cec271d398aee9cdbab3b26e1059281bd33adb0120`
`abilities-c43d2db-evidence/mergefwd-7a492e5/non-timers-patch-preservation.json` sha256 `6ddeda04d6d3196360783fce3bf67d3c6ed09d9bd999f54a8123f7a761559912`
`abilities-c43d2db-evidence/mergefwd-7a492e5/tsc.log` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
`abilities-c43d2db-evidence/mergefwd-7a492e5/full-vitest.log` sha256 `b2e18f6a6a7c720c0dfa5527293e2668e53141164ef4b9fce8262d8580cf873f`
`abilities-c43d2db-evidence/mergefwd-7a492e5/exit-codes.txt` sha256 `464fef48d6e0e267dc73b0d109f1bd189e800f44b714363611bbb08e0c71de71`
`abilities-c43d2db-evidence/mergefwd-7a492e5/hosted-checks.txt` sha256 `93895fab4a651d2ce8c3b518016fe2552b57d46360244703b852bfff6e857b83`
`abilities-c43d2db-evidence/mergefwd-7a492e5/architect-search.json` sha256 `faee156e272e6e763dd06878b160057ca4da52771743858aa16894d256c7fab2`
`abilities-c43d2db-evidence/mergefwd-7a492e5/cleanup-lane-kill.txt` sha256 `3318b92422b028e74e6d229a2d5d2fb3246dfb4023e78ded6665d39cd5ca8918`
`abilities-c43d2db-evidence/mergefwd-7a492e5/cleanup-survivors.json` sha256 `2f8195e20cdc2d892dda3ee5e7408b7c0d241cec627b11bd1cc73861cce54f16`

Manifest `qa/m3-recheck/abilities-c43d2db-evidence/manifest.json` sha256 `ba78a4a76aba9a44fb8b92472bdeff043567f81a5daeb521d28c32f87c9b8aa5` supersedes earlier digests. Prior report backup `abilities-c43d2db.md.bak-f534e86f`, sha256 `f534e86fa9dc28adee05d3c4f21795f880a92a4011539470c4d8e271ce1e7e28`.

**Overall BLOCKED**, with **FAIL clean-automatic-merge claim**: require Architect resolution/delta acceptance plus hosted Node20/Chromium and pacing completion. No merge-go. Exactly one hosted rollup observation, no polling loop; no remote mutations/sends/source fixes.

## Hosted finish @ 7a492e5 — 2026-11-06 00:49 CET (Europe/Belgrade)
Latest section supersedes prior pending hosted findings for this successor. Local tsc / 149 files / 2167 passed / 1 skipped / 0 failed already accepted; **not rerun**. TASK/HANDOFF re-read; same owner, canonical report, write scope; PR100 ae12da4 cancelled / b6705124 on hold are out of scope and untouched. No genuine mismatch.

### Architect exact-head amendment — PASS (accepted)
On-disk `engineering/reviews/abilities-sim-7a492e5-architect-addendum.md` sha256 `f4741a79fd4d593ab14bc7c0e7e8bc47003446206a2d6d57f9e5900c3b08a654` (**prefix f4741a79** MATCH). Literal verdict **PASS (content delta)** at exact `7a492e5fea47f9bb92ae2d07e82820c64471ec5a`. Accepts the intentional `timers.ts` resolution keeping `incomeRef` then **abilities last**, and classifies the pair **independent** for same-tick flags-ON order under **QA-D-1105-PR112-TIMERS**. Per HoQA **QA-D-1106-PR112-TIMERS-B / QA-D-1105-PR112-TIMERS**, this acceptance **replaces** the earlier clean-automatic-merge-tree FAIL **for #112 only**. Evidence: `abilities-c43d2db-evidence/mergefwd-7a492e5/architect-addendum.md` sha256 `f4741a79fd4d593ab14bc7c0e7e8bc47003446206a2d6d57f9e5900c3b08a654` / `abilities-c43d2db-evidence/mergefwd-7a492e5/architect-addendum.sha256` sha256 `d79ef5e6cc2abe952fa1d5b979ebe5e4111a6843443c8bd88e1ad824ea1bbdd8`.

### Node20 gate — PASS
Run https://github.com/PrincipalLewis/egg-farm/actions/runs/42124942241 job127586595154 **SUCCESS**, exact check head `7a492e5…`. Actual log: Node **v20.20.2**; unit 149/2167+1skip; slow 4/17+1skip; Release globals allowlist (chromium) step SUCCESS. Checkout is synthetic merge `8e47eeb` (HEAD is now…); sanctioned compare head→8e47eeb ahead1/behind0 **files=[]** → content-identical, not old tip. Raw: `abilities-c43d2db-evidence/mergefwd-7a492e5/gate-log-42124942241.txt` sha256 `4374e6146bee86c00ff594fb74b25d1743a2c2179969ffa903112e724a900963` · steps `abilities-c43d2db-evidence/mergefwd-7a492e5/gate-jobs-42124942241.txt` sha256 `a8aea15499a519cb52cfce61000fb4eee429c6f8ff7ad27b89c6d730717ac831` · compare `abilities-c43d2db-evidence/mergefwd-7a492e5/ci-merge-compare-8e47eeb.txt` sha256 `7eabd6cf2b09a5297653fae7fdbe64b4171c93e420485af1ee24828053163f0f`.

### Chromium-in-gate globals — PASS (actual execution)
Gate log L634–646: `npm run check-globals -- chromium` → `node scripts/release-globals-browser.mjs chromium`; PASS lines for B-4, refused newer-save, and release allowlist. Build id `m4.1+8e47eeb` is the content-identical synthetic merge. Excerpt: `abilities-c43d2db-evidence/mergefwd-7a492e5/gate-log-42124942241-excerpt-CET.txt` sha256 `3ea80351d6aabb69661e32433594251fda15e34c4fb2aca364312729c8fcd824`.

### FF/WK release-globals — NOT RUN / NOT PASS / NOT BLOCKER
Job127591763787 **SKIPPED** (feature-PR branch condition). Under direct HoQA **QA-D-1105-PR105-GO**: skipped by design, feature-PR exception, enforced on RC PR.

### Pacing shards — PASS; aggregate FAIL attributed to row904 only
Run https://github.com/PrincipalLewis/egg-farm/actions/runs/42124942275:
- shard optimal 127586595961 **SUCCESS**
- shard seller15 127586595852 **SUCCESS**
- shard casual 127586595670 **SUCCESS**
- aggregate job `pacing-x1-stack` 127607509243 **FAILURE**

Raw aggregate evidence names the **sole blocking failures** as:
- `FAIL: blocking row 904 optimal NOT-WIRED`
- `FAIL: blocking row 904 seller15 NOT-WIRED`
- `FAIL: blocking row 904 casual NOT-WIRED`
Summary line: `rows: 45 PASS, 0 FAIL, … 12 NOT-WIRED (3 blocking)` with the three blocking lines all row904. **No other FAIL rows named.** Attribution is therefore row904-only from raw logs, not presumption. Evidence: `abilities-c43d2db-evidence/mergefwd-7a492e5/pacing-aggregate-log-42124942275.txt` sha256 `0c3212eabf5f72e55b1a11719a0078a1d6c8ca7589f67dffed38823429f6daa0` · `abilities-c43d2db-evidence/mergefwd-7a492e5/pacing-aggregate-log-42124942275-excerpt-CET.txt` sha256 `4882a62207c882d24245b7639baf103aa6eacbcffe2352b64165bb5ef4a19a11` · rollup `abilities-c43d2db-evidence/mergefwd-7a492e5/hosted-checks-0049.txt` sha256 `5f42a53de1d323a43024704b3d1d5d3b105d81e760ed1ab9590ec89ff47abe55`.

### K10
Failure recorded, **not required** per HoQA.

### Process
Single live check-rollup observation; completed logs retrieved once; **no polling loop**. No local suites/processes/signals/source changes/remote mutations/sends/CI dispatch. Prior own-lane cleanup remains valid.

**Overall for #112 @ 7a492e5:** local regression PASS; Architect timers amendment PASS (f4741a79); Node20 gate + Chromium PASS; three pacing shards PASS; aggregate FAIL = row904-only (NOT-WIRED) as expected RC pattern. FF/WK not blocker. **No merge-go claimed here** — HoQ owns final merge verdict. Current evidence manifest sha256 `33ba1f1c38fc08d71f91fce30ee6b1dd865a5646769a6053a10f0eddb7666aea` (supersedes earlier digests). Backup `abilities-c43d2db.md.bak-2d196cab` sha256 `2d196cab044fd41f9d7cb053f403fccf12054c99a4b64aeb6fdd95bb4bf0c2ec`.
