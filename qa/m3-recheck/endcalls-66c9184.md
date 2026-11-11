# Saves QA: #114 endCalls durS exact-head @ 66c9184 (HoQA/PR115-114-1106, QA-D-1106-RETARGET FULL bar)

Date: 2026-11-06 00:52 – 01:28 CET (Europe/Belgrade). Write scope: `qa/m3-recheck/` (+ scratch `qa/scratch/endcalls-66c9184/`). Nothing merged, pushed, or tagged. Evidence cites **66c9184** for the local bar; tip **147e116c** is a tree-identical NOREGATE append after #112 landed. This is the FIRST exact-head QA bar for #114 (not a redo/delta). Merge order note: #112 → #114 → #115. Merge go is HoQA's; this report does not grant merge.

## Verdict: **PASS (content, local bar, hosted gate @ 66c9184) — pacing OPEN**

Every bar item passes at exact `66c9184` except pacing: run 42131703569 had casual + seller15 SUCCESS, then optimal + aggregate were **cancelled** when HoE pushed the post-#112 merge-forward `147e116c`. No pacing verdict is credited at 66c9184. Pacing moves to 147e116c (run 42136450016, in progress at one-shot). No product defect found. Severity of open item: process/hosted only (non-defect), blocking the merge go until pacing (and the new-tip ci) completes.

## Identity (evidence/endcalls-66c9184/identity.txt)

- Tip **`66c918442d4eab6c6d064d7a59bd1a9ecf29ce34`** — "Merge origin/rc/v5 49ee46dd into fix/saves-endcalls-durs (HoE merge-forward for #114; #106+#113 landed)"
- Parents: `98e1af5b51d86a7e8b7bd0a6602d91332e3ee32f` + **`49ee46ddce010f0087515c173d34c6076d47ea44`** (`origin/rc/v5` at bar time)
- Contains 49ee46dd: YES. Remote `fix/saves-endcalls-durs` later advanced to 147e116c (see NOREGATE note); at bar start it matched 66c9184.
- Diff vs rc/v5 49ee46dd: **exactly 11 files, +470/−15**, A/M only, no reverts (abilities stack + endCalls; #112 not yet on rc at bar time):
  - `src/save/m5-fields.ts` (M) — endCalls honors AbilityState.durS (D-HOE-41)
  - `src/sim/abilities.ts` (A), `src/sim/effects.ts`, `events.ts`, `m5-state.ts`, `payout.ts`, `timers.ts`, `workers.ts` (abilities stack)
  - `tests/v5-abilities-sim.test.ts` (A), `tests/v5-f1a-fields.test.ts` (M, +combo on ability_used), `tests/v5-f2-m5-fields.test.ts` (M, +D-HOE-41 cases)
- **Patch-id** `git diff 49ee46dd..66c9184 | git patch-id --stable` = **`f07b8396e501ee3902e0a7555b46956293e1d6c4`** = `git diff f8036e8..98e1af5 | patch-id` (HoQA CLEAN merge-forward check).
- PR: https://github.com/PrincipalLewis/egg-farm/pull/114. At bar time base was still `feat/v5-abilities-sim` @ 7a492e5; after #112 landed, base retargeted to `rc/v5` @ 8253da50 (see note).
- Architect addendum @ 98e1af5: `engineering/reviews/saves-endcalls-durs-98e1af5-architect-addendum.md` sha256 **`794c621d957c816b7a3a0098d5694fe00210564391d6b0dd72f95083c67ba956`**. Earlier APPROVE also at 86973e5 (sha256 `4622dd09d0e7c495d2bf0534275c48822b28f7f64336a6e74c7445cf09f80f00`).
- Worktree: `qa/scratch/endcalls-66c9184/wt` (detached at tip; node_modules → `/workspace/wt-v5-telemetry-schema/node_modules`, package-lock sha256 `56569550…f6f75e` identical).

## Bar results

| # | check | result | evidence |
|---|---|---|---|
| 1 | Identity + 11-file diff vs rc 49ee46dd; patch-id f07b8396; no reverts | **PASS** | identity.txt, diff-detail.txt |
| 2 | Functional: m5-fields / abilities / pause-sanitize / settle / roundtrip / income-ref; durS round-trip + legacy no-durS; endCalls durS-only | **PASS** focused 6 files **115/115** (m5-fields 37, abilities 29, pause-sanitize 10, settle 8, roundtrip 4, income-ref 27). D-HOE-41 ACs all ✓ (legacy no-durS; durS=45/activeS=40 effect_s≈5; clamp+clear). AbilityState `{readyAt?, activeS?, durS?}`; no top-level `abilityDurS` in src (abilities-sim asserts). endCalls clears both activeS and durS | vitest-focused.txt, endcalls-durs-only.txt |
| 3 | Flag-0 goldens 7/7 | **PASS 7/7** (4 files). GOLDEN1 flag-off `f90d1678c260…49544`, m4on `a54c9cf9d6a4…9fda5`; m4a-flag-off 2/2; zg-flagoff-dom 1/1. All 4 test blobs identical to rc/v5 49ee46dd | vitest-flagoff-golden.txt, golden-pins-identity.txt |
| 4 | tsc --noEmit; full vitest 0 fail; build + check-release-build | **PASS** tsc EXIT=0; full vitest **151 files, 2198 passed \| 1 skipped (2199), 0 failed**; `npm run build` EXIT=0; `check-release-build: m4.1+66c9184 ok` + all 6 release checks ok. Via `lane-run.sh saves-qa`, flock `.vitest-eng.lock`, nice -n 10, 1 vitest worker. `ALL_DONE tsc=0 focused=0 golden=0 full=0 build=0 2026-11-06T00:56:37+01:00` | tsc.txt, vitest-full.txt, build.txt |
| 5 | Hosted gate SUCCESS at exact head | **PASS** at 66c9184: ci **42131703592** conclusion **success**; gate job 127609657985 success (done 00:56:01 CET). `release-globals` job 127614331310 **skipped-by-design** on non-rc/* (≠ pass, not a block). Prefer-cite for tip 147e116c: ci **42136449877** was **in_progress** at one-shot (01:28 CET) — merge go still needs that SUCCESS (same tree) | hosted-final.txt, hosted-gate.txt |
| 6 | Pacing shards SUCCESS; aggregate FAIL only on row 904 ×3 | **OPEN at 66c9184.** Run 42131703569: casual SUCCESS, seller15 SUCCESS; optimal + aggregate **cancelled** when 147e116c was pushed. No verdict credited. Carried to 147e116c pacing **42136450016** (3 shards in_progress at one-shot). No pacing grant | hosted-final.txt |
| 7 | F-1 / telemetry-schema unchanged | **PASS.** `src/telemetry/schema.ts` and other telemetry blobs identical to rc. Only `tests/v5-f1a-fields.test.ts` differs (+`combo` on `ability_used` event-spec) — abilities-stack noise, not an endCalls/F-1 schema change | f1-telemetry-unchanged.txt |
| — | release-globals skipped-by-design on non-rc/* | **Recorded** ≠ pass; not a block | hosted-final.txt |
| — | k10-breeds-offset | 42131703603 failure @ 66c9184 (known-red non-required). 42136450044 success @ 147e116c. Non-required either way | hosted-final.txt |

## Functional notes (D-HOE-41)

`endCalls` in `src/save/m5-fields.ts`: granted = finite `durS` > 0 else `tc_ability_s`; optional cap at `max(tc_ability_s, tc_combo_boost_duration_s)`; clamp `activeS` to `[0, granted]`; emit `ability_ended{cause:"offline", effect_s}`; strip both `activeS` and `durS` (readyAt stays). Legacy / invalid durS keeps today's `tc_ability_s` path. Persist shape is AbilityState.durS only — no top-level `abilityDurS`.

## Method

- Local runs via `ops/tools/lane-run.sh saves-qa` (chain: tsc → focused → golden → full → build), vitest under `flock -w 3600 .vitest-eng.lock`, `nice -n 10`, 1 fork / no file parallelism. Ports 5961–5964 reserved; lane-kill only for own PIDs.
- Hosted: cursor-github MCP (`get_workflow_run` / `list_workflow_run_jobs` / `list_workflow_runs`). Box gh rate-limited — no gh CLI poll loop. Retarget one-shot only for 147e116c runs.
- No push/merge/tag. No GITHUB_TOKEN printed. No writes outside `qa/`. Did not touch `pause-57c187e.md`.

## Appended 01:28 CET: exact-head / NOREGATE note for 147e116c (QA-D-1106-NOREGATE / RETARGET). No local re-run.

- HoE merge-forward tip **`147e116ca79db38f270189efbb978c7013e7936b`** has parents **66c9184** + **`8253da505a74e2bfd0650f2380506d11836666db`** (`origin/rc/v5` after #112 merged).
- **Tree-identical to bar tip:** `66c9184^{tree}` = `147e116c^{tree}` = `86508e121bdefa561d7ccb28db80425f84199103`. `git diff 66c9184 147e116c` = empty (0 bytes). No conflict-resolution edits; merge commit only.
- **Post-#112 content vs rc:** `git diff 8253da50..147e116c` = **2 files, +68/−5** (`src/save/m5-fields.ts`, `tests/v5-f2-m5-fields.test.ts`) — endCalls-only; abilities already on rc. Patch-id `cfd535db029f2c2e121966828d6222b83bffd4c0` (narrower than the pre-#112 stack patch-id f07b8396, as expected).
- PR head = 147e116c; PR base now `rc/v5` @ 8253da50; remote `fix/saves-endcalls-durs` = 147e116c.
- **Hosted at 147e116c, one-shot via cursor-github MCP at 01:28 CET:** ci **42136449877** gate **in_progress** (Unit tests). Pacing **42136450016**: casual/optimal/seller15 all in_progress. k10 42136450044 success (non-required).
- **Also recorded:** older ci **42131703592** SUCCESS at 66c9184 (same tree) — content gate already green; prefer-cite for merge go is 42136449877 once SUCCESS.
- Conclusion: under NOREGATE this single bar at 66c9184 stands for 147e116c (clean merge-forward, identical tree, no second heavy run). **The merge go still needs** ci 42136449877 SUCCESS at 147e116c **and** pacing 42136450016 shards SUCCESS, with an aggregate FAIL allowed only on row 904 NOT-WIRED ×3 (name them). The 66c9184 pacing was cancelled, so the 147e116c run is the only pacing evidence for this patch.

Evidence: `evidence/endcalls-66c9184/noregate-147e116c.txt`, `hosted-final.txt`.

---

## Appended 02:03 CET: HoQA/hosted-followup-0200 — one-shot at tip 147e116c. **OPEN** (pacing not settled). No local re-run.

Body above (pre-append) sha256 `b2edfa35625da7bdc5d4598469d64fd1a592772ecdc77b9f6e1264ea1c53f6c1` (prior Report-sha256 body hash).

### Hosted one-shot (cursor-github MCP, no poll) — 02:03 CET Europe/Belgrade

| Workflow | Run id | head_sha | Status | Conclusion |
|---|---|---|---|---|
| **ci** | **42136449877** (run #903) | 147e116c | completed | **SUCCESS** |
| **pacing-x1-stack** | **42136450016** (run #76) | 147e116c | **in_progress** | null |

- **ci 42136449877** verified SUCCESS @ `147e116ca79db38f270189efbb978c7013e7936b`. Gate job 127625710133 success (completed 01:38:22 CET). Chromium globals step SUCCESS. Standalone `release-globals` job 127631882323 skipped-by-design on non-rc/* (≠ pass, not a block).
- **pacing 42136450016** per-shard at one-shot:

| Shard | Job id | Status | Conclusion | Notes |
|---|---|---|---|---|
| **seller15** | 127626226185 | completed | **SUCCESS** | done 01:46:24 CET |
| **casual** | 127626225587 | **in_progress** | null | Shard casual step running |
| **optimal** | 127626226136 | **in_progress** | null | Shard optimal step running |
| **aggregate** | — | not scheduled | — | waits on remaining shards |

- Aggregate FAIL-only-row904 rule **not yet applicable** (aggregate not scheduled).
- #114 already merged as rc/v5 `19121b75`; this check records the post-merge paced conclusion for the tip. **No final PASS/FAIL** claimed — pacing still OPEN.

Evidence: `evidence/endcalls-66c9184/hosted-0200-oneshot.json.txt`, `hosted-final.txt`


## Evidence sha256 (`qa/m3-recheck/evidence/endcalls-66c9184/`)

- `qa/m3-recheck/evidence/endcalls-66c9184/build.txt` — `e084c303df360ac1d6c0e992357f806335b287f7d7fe0b619c70b57815eb9b7b`
- `qa/m3-recheck/evidence/endcalls-66c9184/diff-detail.txt` — `d6f121d2bac4f030f1401e3ba63cbf9856ef6e1e915ca7701f1e1fd41b94433c`
- `qa/m3-recheck/evidence/endcalls-66c9184/endcalls-durs-only.txt` — `dd60b533e14080b7a995261ec9dc8ac22dcbe17b0edd20608ec86609a4d33c3d`
- `qa/m3-recheck/evidence/endcalls-66c9184/f1-telemetry-unchanged.txt` — `4f2ffae7435b14b91f0a6596a0a9d718d74f800c699af8fe18346cf6a9f30dff`
- `qa/m3-recheck/evidence/endcalls-66c9184/golden-pins-identity.txt` — `ded086e4d39931b426c792974ccf5a5f0d94e5ae162c016abf5fade24206599e`
- `qa/m3-recheck/evidence/endcalls-66c9184/hosted-0200-oneshot.json.txt` — `ef14f0e35a8018a7e023c4f4dcbe89c7c829533dfd5b2c8f073e93b1a2905891`
- `qa/m3-recheck/evidence/endcalls-66c9184/hosted-final.txt` — `57d902560652db277725cb33427aec6c44d50c80267b0ae55f528475bc2c2e73`
- `qa/m3-recheck/evidence/endcalls-66c9184/hosted-gate.txt` — `12028ea5e9d373d24172933d3b910c5ca2e85f3781e1ccafc3863934dc00b6d6`
- `qa/m3-recheck/evidence/endcalls-66c9184/hosted-poll1.txt` — `df2694e9bc9b0440e9fd52bae6a4d758d2e1da2e914be1053f86cfdcb301db82`
- `qa/m3-recheck/evidence/endcalls-66c9184/identity.txt` — `27f5a1b9e90c38e74c2e71287e53535ef90aaca661a80d7bfe3e36d6f771b0cb`
- `qa/m3-recheck/evidence/endcalls-66c9184/noregate-147e116c.txt` — `7ad4e78c23373f50bb9fdb5948f18934d5db07278749ba82afee4ed668baa9fe`
- `qa/m3-recheck/evidence/endcalls-66c9184/tsc.txt` — `1c00cd482325a40a0b1fd6b174877844cf962673c79e4af7f694c07dcffcf8b3`
- `qa/m3-recheck/evidence/endcalls-66c9184/vitest-flagoff-golden.txt` — `d90749fcbb4dd6c9d65d4440c3bfe7309adbdd67ad2c05e136275e369ae88cf2`
- `qa/m3-recheck/evidence/endcalls-66c9184/vitest-focused.txt` — `eee8754244cc514404c1db0f60ea79f3b4585fd77e15e5233004f15d150e2616`
- `qa/m3-recheck/evidence/endcalls-66c9184/vitest-full.txt` — `74e7c2946f62b85cbabeffcf6b44b74b5749afd9b4a318f871125d9b22d8b6eb`

## Report sha256

Companion file `qa/m3-recheck/endcalls-66c9184.sha256` holds the hashes. The sha256 of the report body, excluding this section, is:

`c409cc2392ba1a87d9b0b4560d3009b4b917aec50365a0991863852b17dc6eb2`


## FINAL hosted check, 02:30 CET (HoQA/hosted-followup-0230, last one-shot) — #114 pacing conclusion

Cursor-github MCP, single read, no poll. Bar tip `147e116ca79db38f270189efbb978c7013e7936b` (tree = 66c9184; #114 already merged as rc/v5 `19121b75`).

| Run | Id | Status | Conclusion |
|---|---|---|---|
| ci | 42136449877 | completed | SUCCESS (gate job success 01:38:22 CET; recorded at 02:00 check) |
| pacing-x1-stack | 42136450016 | completed | **failure** (aggregate job only; see below) |

Pacing per-shard / aggregate:

| Job | Id | Conclusion | Completed (CET) |
|---|---|---|---|
| shard casual | 127626225587 | **SUCCESS** | 02:07:04 |
| shard optimal | 127626226136 | **SUCCESS** | 02:06:24 |
| shard seller15 | 127626226185 | **SUCCESS** | 01:46:24 |
| aggregate | 127643055183 | FAILURE (exit 1) | 02:07:25 |

Aggregate log: `rows: 45 PASS, 0 FAIL, 1 WARN, 20 INFO, 0 PENDING-REPRED, 3 N/A (row 903), 12 NOT-WIRED (3 blocking), 24 EXCLUDED`. The only FAIL lines are `blocking row 904 optimal / seller15 / casual NOT-WIRED` (x3). No other FAIL row. Times above are UTC+1 from the UTC log stamps (01:07 UTC = 02:07 CET).

Bar (shards SUCCESS; aggregate FAIL only row 904 NOT-WIRED x3): **met**.

### FINAL VERDICT #114: PASS (hosted pacing closed)
Content/local/gate PASS at 66c9184 (above), NOREGATE tip 147e116c ci SUCCESS, pacing shards SUCCESS, aggregate FAIL only row 904 NOT-WIRED x3 (known, accepted). 1 WARN: L897 optimal N / H worst 191 s > 180 s (pre-existing L0-30 dead zone, known risk, not blocking). Head of QA issues the verdict.

Evidence: `evidence/endcalls-66c9184/gh-pacing-42136450016-jobs-0230.json.txt`, `gh-pacing-42136450016-run-0230.json.txt`, `gh-pacing-aggregate-127643055183-logs-0230.txt`, `pacing-aggregate-summary-0230.txt`
