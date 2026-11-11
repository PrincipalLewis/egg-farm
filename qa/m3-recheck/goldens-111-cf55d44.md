# #111 goldens first exact-head bar @ cf55d44a057d8f7843481219f9ea1eb2602a95b1

TASK hoqa/pr111-firstbar (resumed after usage stop, HoQA cites D-CEO-20261109-01). Lane uiqa-pr111. Written 2026-11-10 ~00:16 CET.
Worktree (disposable clone, push URL disabled): qa/scratch/goldens-111-cf55d44/wt. Evidence: qa/m3-recheck/goldens-111-cf55d44-evidence/ (logs + SHA256SUMS).
**No merge-go from this lane.**

## Overall: BLOCKED. Local bar PASS; gate 42717222277 + golden-game-browser PASS (00:18 CET look). Item 8 pacing still PENDING (one look scheduled 01:15 CET). No merge-go.

| # | Item | Result |
|---|------|--------|
| 1 | Identity / clean mergefwd / flag 0 | PASS |
| 2 | tsc | PASS |
| 3 | Full vitest (0 fail) | PASS: 156 files, 2293 pass, 1 skip, 0 fail |
| 4 | Flag-0 goldens / parity | PASS (hashes below, identical to the 96ac430 run) |
| 5 | Build + check-release-build, debug panel out of release | PASS, build-id m4.1+cf55d44 |
| 6 | FINAL A unload: unit T4–T6 | PASS. Browser F1-2/F1-3 PASS from hosted artifact (00:18 CET) |
| 7 | Hosted gate 42717222277 | PASS (completed SUCCESS @ cf55d44a; Node20.20.2; Chromium globals PASS; FF/WK skipped by design) |
| 8 | Hosted pacing 42717221875 | PENDING (one look scheduled 01:15 CET; not looked this turn) |
| 9 | golden-game-browser artifact | PASS (ALL PASS; F0-0..F1-3 + No page errors; step exit 0; shots described; no visual egg PASS) |
| 10 | F1-1 paint ruling input | HoQA accepted QA-D-1110-PR111-BAR1; visible-egg assert deferred to paint-UI PR |

## 1. Identity: PASS
- `git ls-remote origin refs/pull/111/head` returned `cf55d44a057d8f7843481219f9ea1eb2602a95b1`. rc/v5 tip is `f20b91839fdf09ba0ed45a890281ccbf7bf2909d` (ls-remote, same look).
- Parents are `96ac430e7c93307081093a3181ad54a09ce17568` and `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`. Tree is `4110ba5185598c5d3a1fcf64d068d063a1d0ca66`, which equals 96ac430^{tree}. Committed 2026-11-09 23:52:47 CET.
- `git merge-tree --write-tree 96ac430 f20b918` gave `4110ba51…`, rc 0, with no conflicts. That equals the tip tree.
- `git diff 96ac430..cf55d44a` is empty. So no own-code edits came in with the merge, and QA-D-1105-RCMOVE inherit conditions are met. A fresh bar was run anyway.
- Why it's trivial: f20b918 is the #108 merge commit (parents eed62687 + f46544e) and its tree `891f1f93` equals f46544e's. f46544e is the merge-base with 96ac430. So rc/v5 brings 0 file changes onto #111.
- PR scope vs rc/v5 (f20b918..cf55d44): 14 files, +375/−16. The tooling delta 9ee57c03..96ac430 is 5 files, +117: ci.yml +16, .gitignore +1, package.json +1, scripts/golden-game-browser.mjs +95, tests/fixtures/golden-game-browser-flag-on.json +4.
- Shipped `src/config/balance.json`: `m4.flags.golden = 0` (line 172). All m4.flags are 0.
- The overlay fixture is test-only (`{"m4":{"flags":{"golden":1}}}`) and is never written to balance.json.
- Architect file `engineering/reviews/golden-game-96ac430-browser-architect.md` sha256 = `77f659f388296aa5640d2d2184560cb05c6c5785f46afcda733777da18a3ac7c`. The claimed prefix 77f659f3 matches. Verdict line 14 is "APPROVE (bounded tooling)". Line 45 says F1-1 "seed live goldenEgg (test-only; not UI spawn) | Sufficient for unload; not a spawn/R14 layout gate".

## 2–5. Local bar (lane-run PID 117922, 00:10:06–00:12:38 CET)
- Local node is v24.22.1; CI pins Node 20. `npm ci` EXIT=0. npm printed an `install-scripts` warning that some install scripts weren't run; it had no effect on any result.
- tsc --noEmit EXIT=0.
- Full `vitest run --minWorkers=1 --maxWorkers=2`: Test Files 156 passed (156); Tests 2293 passed | 1 skipped (2294); EXIT=0. The counts are the same as the 96ac430 run.
- Flag-0 goldens (4 files, 7 tests pass):
  - flagoff-golden.a01faea GOLDEN1 `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`
  - flagoff GOLDEN2 m1-rc2-v4-12min `b69c5783…24ee9`, m2-rc1-v5-12min `2ac7070d…3f00`, m2-rc1-v5-40min `4fd46759…b431`, m2-rc1-v5-40min-edge `652d1b26…f0bb` (full values are in the evidence log)
  - m4on-golden.90a9c84 GOLDEN1 `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`
  - ZG-FLAGOFF-DOM `9c4b6439016e5d5b6a779b34643f70793fda5df8d44728f9bcc32844c662ee35`
  - m4a-flag-off sim trace = main ✓
  - All golden lines are byte-identical to the 96ac430 run.
- `npm run build` EXIT=0. check-release-build reported:
  - `m4.1+cf55d44 ok`
  - `release prefix m4.1 ok`
  - `no eggfarmUi in release ok`
  - `no ?debug/?perf/?ios/QA hooks ok`
  - `window global writes only eggfarmExportTelemetry ok`
  - dist/index.html meta build-id is `m4.1+cf55d44`.
  - The release JS has 0 hits for dbgInfo / details.dbg / eggfarmUi, so the debug panel is absent.

## 6. FINAL A unload extra
- Unit tests in tests/v5-golden-game.test.ts: 21/21 pass. T4 (goldenUnload once, idempotent), T5 (endSession gives one reload expire and serialize == m5Persist), and T6 (m5Offline egg arm == goldenUnload offline) all show ✓.
- Browser F1-2/F1-3: PENDING on the gate artifact/log.

## 7. Hosted gate 42717222277: PENDING/BLOCKED (one look at 00:14:49 CET, no poll)
- Status in_progress, conclusion empty, headSha `cf55d44a057d8f7843481219f9ea1eb2602a95b1` (matches), created 00:03:16 CET.
- Job gate 129501771105 was in_progress: https://github.com/PrincipalLewis/egg-farm/actions/runs/42717222277/job/129501771105
- Not yet available: Node 20 proof from the log, Chromium check-globals, and golden-game-browser.
- Static check: ci.yml gate uses `node-version: 20`. That is config only, not proof.
- FF/WK release-globals: will be recorded as "skipped by design, feature-PR exception, enforced on RC PR". That is not a PASS and not a blocker (QA-D-1105-PR105-GO).
- Superseded runs 42153584911/42153585017 are not credited.

## 8. Hosted pacing 42717221875: PENDING/BLOCKED (same look)
- Status in_progress, headSha cf55d44a (matches), created 00:03:15 CET.
- Shards optimal 129501772460, seller15 129501772794, and casual 129501772908 were all in_progress. There's no aggregate yet.
- Row 904 is not presumed and L897 is not recorded.

## 9. golden-game-browser artifact: PENDING. Script review at the tip
- scripts/golden-game-browser.mjs @cf55d44 (the tree equals 96ac430): `ok()` does `bad++` on false. The last line is `process.exit(bad ? 1 : 0)` after printing `FAILED n` / `ALL PASS`.
- Every check goes through ok(): F0-0, F0-1, F0-2, F1-0, F1-1, F1-2, F1-3, and "No page errors". So any one false fails the step with exit 1. It's not an immediate abort; the run finishes and exits 1 at the end.
- An exception inside an evaluate is an unhandled top-level await, so Node also exits non-zero.
- The CI step has no continue-on-error. Upload runs with `if: always()` (artifact name golden-game-browser, retention 14 days).
- No PASS lines, build-id, or shots exist yet for this tip.

## 10. F1-1 paint ruling input
- What the script asserts:
  - F1-0: the overlay is merged in-page (golden=1).
  - F1-1: `g.state = {...g.state, goldenEgg:{ageS:0, slotId:'farm', intervalS}}` then `eggfarmUi.render()`. It asserts state.goldenEgg is present and the flag is 1, and labels this "UI may not paint yet". There is no DOM or pixel assert.
  - F1-2: after `g.endSession()`, goldenEgg is gone.
  - F1-3: telemetry `collectible_expired{golden_egg,reload}` comes before `session_end`, cross-checked in the eggfarmExportTelemetry export.
- What the code can paint: at this tree, src/ui has no golden-egg render path. app.ts only calls `g.layoutChanged()` for the R15 recheck, and golden-spots.ts is a pure R14 helper. A visible golden egg at 360 flag-on is therefore not expected at this tip.
- Context only, NOT credited (superseded run 42153584911 @96ac430, which has the same tree; copies at qa/scratch/goldens-111-96ac430/hosted-artifact/, all 360×640):
  - flag0-farm `59bbf170…471e` and flag1-farm `59bbf170…471e` are byte-identical.
  - flag1-egg-live `821a19b6526f99a8a3b1fd16bf1eba7c7a77c3720e00ff4d5948ce490e0182b3` shows no golden egg. The pixel diff against flag1-farm is only bbox (21,313)-(167,354), which is hen-sprite animation.
  - flag1-after-unload `c0cd820582bec038eff561c802f9edee5e8f9af897f79e17221f92595d7f1a58` shows no egg either; the diff is hen area plus the progress bar.
  - So in those shots the golden egg is not visible either live or after unload.
- Recommendation: the state + telemetry assert is enough for GOLDBAR's 360×640 flag-on extra *as Architect scoped it*. That scope is an unload/endSession check, not a spawn/R14/paint gate, and the missing paint is not a script defect. A visible-egg assert can't be met at this tip because no paint path exists. It belongs to the later UI-paint/spawn PR's bar and should be a named follow-up there, not a #111 tooling follow-up now. Parent rules.
- Do not record any visual PASS for F1-1.

## Process
- lane-run uiqa-pr111 PID 117922 (run-all.sh). It finished itself; `lane-kill.sh uiqa-pr111 117922` gave `GONE 117922`, rc 0.
- Survivor scan of readable /proc environ for LANE_RUN_TAG=uiqa-pr111 found none.
- The old pidfile rows 1874238/1887995 are from the previous boot (different boot_id) and are not running.
- No Shell Playwright, no local GUI, no :4173. No push/merge/tag, no source/remote/CI mutation. qa/queue.md was not edited.

## Still owed (one later look)
Items 7–9 and the browser half of 6, at headSha cf55d44a:
- gate SUCCESS with Node 20 log quotes, Chromium globals PASS, and golden-game-browser ALL PASS + build-id m4.1+cf55d44 + shots
- pacing: 3 shards SUCCESS, aggregate FAIL only on the raw `blocking row 904 … NOT-WIRED` line, L897 WARN

## Addendum 2026-11-10 00:18 CET — hosted gate look @ cf55d44a (hoqa/pr111-firstbar): items 6½/7/9 PASS; item 8 PENDING
- One look only; no poll; no rerun. Backup pre-image: `qa/m3-recheck/goldens-111-cf55d44.md.bak-3dc589bc` (sha256 `3dc589bc256ec5632ef478c26b6cd6a9097f32dbfa06447ff06161fe78064eba`).
- HoQA ruling **QA-D-1110-PR111-BAR1** accepted: F1-1 is a state/telemetry assert; visible-egg assert moves to the paint-UI PR. No visual PASS recorded for an egg.
- Evidence: `qa/m3-recheck/goldens-111-cf55d44-evidence/obs-cf55d44a-gate-42717222277.txt`, `golden-game-browser/` shots + zip, updated `SHA256SUMS`. Scratch download: `qa/scratch/goldens-111-cf55d44/artifact/`.

### 7. Hosted gate 42717222277: PASS
- Independently verified (API): status **completed**, conclusion **success**, headSha `cf55d44a057d8f7843481219f9ea1eb2602a95b1` (matches tip). https://github.com/PrincipalLewis/egg-farm/actions/runs/42717222277
- Jobs: `gate` 129501771105 **success** (started 00:03:19 CET / completed 00:15:12 CET); `release-globals` 129507563894 **skipped**.
- Checkout (completed log): `HEAD is now at 35d6614 Merge cf55d44a057d8f7843481219f9ea1eb2602a95b1 into f46544efaae907217126491b29588d77258ab28a` (synthetic PR merge SHA; tip headSha still cf55d44a).
- **Node 20 proven from completed log:** `node-version: 20` · `Acquiring 20.20.2 - x64` · `node: v20.20.2` (npm 10.8.2).
- **Chromium check-globals PASS** (step "Release globals allowlist (chromium)" conclusion success):
  - `PASS [chromium] B-4 release ?perf=1: eggfarm* globals ["eggfarmExportTelemetry"], no perf overlay`
  - `PASS [chromium] refused newer-save boot window globals vs blank page: []`
  - `PASS [chromium] release window globals vs blank page: ["eggfarmExportTelemetry"]; allowed ["eggfarmExportTelemetry"]; not allowed []; 'eggfarm' in window=false; egg ids/names ["nestEggs"]`
- FF/WK `release-globals` job: **skipped by design, feature-PR exception, enforced on RC PR** — not PASS, not a blocker (QA-D-1105-PR105-GO). Log/API shows job conclusion `skipped` with empty steps.

### 6 (browser half) + 9. golden-game-browser: PASS
- Step "Golden-game browser (Chromium 360x640…)" conclusion **success**. Script printed `ALL PASS` then upload ran; with `ok()` → `process.exit(bad?1:0)` that means **exit 0**. No FAIL/FAILED lines in the step.
- Quotes from completed log (`golden-game-browser: dist-qa m4.1+35d6614 on port 37189`):
  - `PASS [chromium] F0-0 QA build boots at 360x640 with shipped golden flag 0 and HEAD build-id — {"flag":0,"bid":"m4.1+35d6614","hasEgg":false,"dbg":false}`
  - `PASS [chromium] F0-1 flag 0: no live state.goldenEgg — {"hasEgg":false}`
  - `PASS [chromium] F0-2 without ?debug=1: debug panel not mounted (no details.dbg / #dbgInfo) — {"dbg":false}`
  - `PASS [chromium] F1-0 runtime overlay applied in-page only (live balance golden=1) — {"golden":1,"hasEgg":false}`
  - `PASS [chromium] F1-1 seeded live goldenEgg on state (test-only; UI may not paint yet) — {"hasEgg":true,"egg":{"ageS":0,"slotId":"farm","intervalS":120},"golden":1}`
  - `PASS [chromium] F1-2 FINAL A endSession: state.goldenEgg gone — {"hasEgg":false}`
  - `PASS [chromium] F1-3 FINAL A: collectible_expired{skin:golden_egg,reason:reload} before session_end — {"hasEgg":false,"expIdx":1,"endIdx":2,"exportOk":true,"expired":{"type":"collectible_expired","skin":"golden_egg","reason":"reload"},"typesTail":[{"type":"session_start"},{"type":"collectible_expired","skin":"golden_egg","reason":"reload"},{"type":"session_end"}]}`
  - `PASS [chromium] No page errors — []`
  - `ALL PASS`
- Artifact `golden-game-browser` id **13718928643** (133572 bytes). Files + sha256:
  - `flag0-farm.png` `913cdc785748b30c79b7290be320b7e5c8e54d934473678b248ebb3ee0c303b0`
  - `flag1-farm.png` `59bbf1704157489583e9d1d82e7c4136797fe0f75e153c02a2dac3590c19471e`
  - `flag1-egg-live.png` `821a19b6526f99a8a3b1fd16bf1eba7c7a77c3720e00ff4d5948ce490e0182b3`
  - `flag1-after-unload.png` `c50010fae717818a5a2cc049c06689856f47d824e8eded8764d463f513020b05`
  - zip `7f9a71dce2a84eb1b6ccc9506a340acc29865154470a09ac2086bd50739b97c9`
- Screenshots opened with Read (one-line each); **no visual PASS for an egg** (QA-D-1110-PR111-BAR1):
  - flag0-farm: 360×640 Farm tab, 5 hens at coop, $0.00 / 0 eggs, Collect +5 · 0 ready; no golden egg on field.
  - flag1-farm: same Farm layout after flag-on overlay; 5 hens, 0 eggs counter; no golden egg on field.
  - flag1-egg-live: same Farm after F1-1 state seed; 5 hens, 0 eggs counter; no golden egg painted on field (state-only assert).
  - flag1-after-unload: same Farm after endSession; 5 hens, 0 eggs; no golden egg on field.
- F1-2/F1-3 browser half of item 6: **PASS** (quotes above).

### 8. Hosted pacing 42717221875: PENDING
- Not looked this turn. Per HoQA: one look scheduled at **01:15 CET**. Overall remains **BLOCKED** until item 8 closes (or FAIL if something fails).

### Overall this look
- Items 6 (browser), 7, 9: **PASS**. Item 8: **PENDING**. Overall: **BLOCKED**. Flip HELD flag 0. **No merge-go** from this lane.
