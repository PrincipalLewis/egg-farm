# BBv2 (TASK HoE/bbv2-100-mergefwd) · Generalist, lane H · 2026-11-06 ~03:42 CET
Pins unchanged: **spec v1.0.4 4ea3841a**, **Card #12 9f900304**, manifest 6e5757ef, errata v5 rev 13 a0e8f6d7.

## Head (SUCCESS — mergefwd post-#107)
- Tip **2e76d0c55d8bcb29f5fb561e30378457dc69aae7** = merge (not rebase) of rc/v5 **eed62687** (#107 golden/frenzy + #115 pause + #114 endCalls/durS + #112 abilities) into **8b222f6a** (timeout-60 tip; content still Architect PASS @ b6705124). Parents **8b222f6a** + **eed62687**. Tree **7049c3fb**. Ordinary push 8b222f6..2e76d0c → origin `v5-m51-bbv2`.
- **Conflicts: NONE.** Auto-merged `src/econ/income.ts` (+ formulas/m5-rules/effects/timers/events/payout/workers/offline/pause). `telemetry.ts` clean — no HARD STOP. New from rc/v5: abilities.ts, golden.ts, pause/abilities/golden tests.
- Flags **bestBuyV2=0 / zeroGainUi=0 HELD**. Flip held. No merge-ask. PR #100 Ready, MERGEABLE (checks in progress → UNSTABLE).
- Local (lane H, mergefwd4-unit.log): `tsc --noEmit` OK; focused vitest **19 files / 288 pass** (prior mergefwd3 set + parta + qapicker + bbv2-telemetry + golden-rewards + abilities-sim + pause-sim). Full suite → hosted gate.
- Hosted on 2e76d0c: **gate** https://github.com/PrincipalLewis/egg-farm/actions/runs/42152006627 ; **pacing-x1-stack** https://github.com/PrincipalLewis/egg-farm/actions/runs/42152006631 ; k10-breeds-offset 42152006570 (KNOWN-RED). Artifact `/workspace/artifacts/v5-100-mergefwd-2e76d0c/`.
- Next (owner/HoQA): wait gate+pacing SUCCESS; Architect exact-head bar (content delta vs b6705124 if needed — merge brought abilities/golden/pause only, no BBv2 edits); UI QA for HoQA GO. Flip stays 0.

---

# BBv2 (TASK HoE/100-mergefwd-post107) · Generalist, lane H · 2026-11-06 CET
Pins unchanged: **spec v1.0.4 4ea3841a**, **Card #12 9f900304**, manifest 6e5757ef, errata v5 rev 13 a0e8f6d7.

## Head (WAITING #107 merge)
- Tip **8b222f6a** = prior tip + `ci.yml` jobs.gate timeout 45→60 only (HoE APPROVED; release-globals 20 unchanged). Architect PASS @ **b6705124** carries for content (workflow-only).
- HoE: after **#107 merges** (current tip a5f8e3c on base 71375901; gate 42145282654), mergefwd #100 onto post-#107 `rc/v5`. Flip **held flag 0**. ci/pacing @ 8b222f6 do **NOT** count for GO.
- Expect possible conflict (prior: telemetry.ts; dry overlap vs current rc/v5 71375901: `src/econ/income.ts`). On conflict → Architect delta + fresh local bar. After tip: Ready; report tip/tree/gate/pacing; UI QA for HoQA bar.
- Do not merge-ask.

---

# BBv2 (TASK HoE/gen-100-mergefwd3) · Generalist, lane H · 2026-11-06 CET
Pins (sha1), unchanged: **spec v1.0.4 4ea3841a**, **Card #12 9f900304**, manifest 6e5757ef, errata v5 rev 13 a0e8f6d7 (no BBv2 emission change).

## Head (TASK HoE/gen-100-mergefwd3, 2026-11-06 ~00:45 CET)
**b67051248fef08351327fe9e8f42690cebcda610** = merge (not rebase) of rc/v5 **49ee46dd** (#106 tapCoins + #113 telemetry ring {v,events}+schema_version; also carries #105 income-ref via prior mergefwd2) into ae12da452. Parents **ae12da452** + **49ee46dd**. Pushed ordinary fast-forward ae12da4..b670512 to origin `v5-m51-bbv2`; PR #100 stays Ready, flags 0, flip held. No merge ask.
- Prior tip ae12da452 went CONFLICTING vs rc/v5 after #106/#113 landed; prior hosted gate on ae12da4 **cancelled** mid slow suite: https://github.com/PrincipalLewis/egg-farm/actions/runs/42127280016 (units had passed; not SUCCESS — do not cite).
- One conflict, `src/telemetry/telemetry.ts` TelemetryConfig hunk: kept BBv2 `TelemetryConfig.bbv2? {shown_min_gap_s, zero_gain_eta_max_s, dead_zone_min_s, zero_gain_purchase_cap}` AND rc/v5 ring helpers `tagLegacy` / `readRing` / `exportDoc` + TELEMETRY_SCHEMA_VERSION import (already auto-applied in constructor/flush/snapshotJSON/exportJSON). Auto-merged: formulas.ts, m5-rules.ts, actions.ts, events.ts, streak.ts, new `sim/tap-coins.ts`, tapCoins + ring-export tests. M1 `ignoreQE2` hatchCostCents, M2 `zeroGainUiOn` ship-empty→no-pick / rankable, F3 `zeroGainUiOn` helper (no raw flagOn in best-buy/next-goal), dual `eggfarmQa`+`qaPicker` in check-release-build, game.ts I_ref reset + bb telemetry sample — all unchanged.
- Hosted on b670512: **gate** https://github.com/PrincipalLewis/egg-farm/actions/runs/42131797413 (in_progress); k10-breeds-offset https://github.com/PrincipalLewis/egg-farm/actions/runs/42131797659 (KNOWN-RED monitor). `gh run list` was rate-limited; URLs from Checks API on tip SHA.
- Local (lane H, mergefwd3-unit.log): `tsc --noEmit` OK; focused vitest 13 files / **166 pass** (F3-config, M1 hatch-qe2, M2 ship-nopick, qe2, income-ref, tap-coins, telemetry-ring-export, telemetry, telemetry-m3, export-global, zg-telemetry-annotate, breeds-hatch, next-goal). Full suite left to hosted gate.

---

# BBv2 (TASK HoE/gen-100-mergefwd) · Generalist, lane H · 2026-11-05 CET
Pins (sha1), unchanged: **spec v1.0.4 4ea3841a**, **Card #12 9f900304**, manifest 6e5757ef, errata v5 rev 13 a0e8f6d7 (no BBv2 emission change).

## Head (TASK HoE/gen-100-mergefwd2, 2026-11-06 CET)
**ae12da452fa00443a1d12078cd8f9468d34c3591** = merge (not rebase) of rc/v5 **f8036e8f** (#105 income-ref) into c8cc5e3f (F3 fix on M1 8a514e4 + M2 e7f3ca7). Parents c8cc5e3f + f8036e8f. Pushed fast-forward c8cc5e3..ae12da4 to origin v5-m51-bbv2; PR #100 headOid ae12da45, Ready, flags 0, flip held.
- Prior F3 gate on c8cc5e3f: run 42123690754 SUCCESS.
- One conflict, src/game.ts frame() catch-up: kept rc/v5 `this.state = gap >= maxMs && incomeRefOn(b) ? resetIncomeRef(r.state) : r.state` AND BBv2 V-2d `bbTel.sample(...)` (now samples the post-reset state). Auto-merged with no overlap on our side: formulas.ts, m5-rules.ts, m5-fields.ts, actions.ts, timers.ts, new sim/income-ref.ts + tests/v5-income-ref.test.ts. M1 ignoreQE2 hatch, M2 zeroGainUiOn ship-empty→no-pick, F3 constants, dual eggfarmQa+qaPicker unchanged.
- Local: tsc --noEmit OK; focused vitest (F3 ×3, M1 hatch-qe2, M2 ship-nopick, qe2, parta, qapicker, bbv2-sim, telemetry, next-goal, income-ref, breeds-hatch) 13 files / 193 pass (mergefwd2-unit.log). Full suite left to the hosted gate.
- Hosted on ae12da4: ci https://github.com/PrincipalLewis/egg-farm/actions/runs/42127280016 (+ k10-breeds-offset 42127280065, pacing-x1-stack 42127280092).

## Head
**gen/bbv2 92381edd8ba3f01beffa72e7b2bea94298d24f93** (12/n), pushed (ordinary fast-forward b6dec40..92381ed) to origin v5-m51-bbv2 for #100; stays Draft. Previous head b6dec409 (11/n, Architect PASS with Minors). Merge (not rebase) of rc/v5 30df38c0 (#99 zg follow-up, #98 K10 harness) = **10/n a8a8d67a56664e1ed034afdab4957095d7feef35**, parents 04a3788 + 30df38c0.

## Commits since fbce499
- **9/n 04a3788** AC-W1 BB-AC13 flag-on regression baseline (QA-D-1105-ACW1), seeds 1–200 bestBuyV2=1/zeroGainUi=0: pass10 100, medF10 10.333333 min, medF18 19.666667 min; ±5 pp/±20%/±20% retained; design gate (≥95% F10 ≤16 min, F18 median ≤40 min, 1–200 and 201–299) unchanged. Note: author recorded as Saves (box git config); not rewritten.
- **10/n a8a8d67** merge rc/v5. One conflict, src/ui/app.ts UI return object: kept both #99 `dispose: () => zgAC.abort()` and BBv2 SG-12 qaPicker spread. #99 focus restore/350 ms guard and BBv2 FARM-★ selectGoal auto-merged (all added lines of both sides present).
- **11/n b6dec40** comment only: Economy countersign 66764c12cf07845b468ce7d54d8ea6d320ef081d55cc95cc9701904e4b5a4a04 supersedes 456f94bc (same values).

- **12/n 92381ed** merge (not rebase) of rc/v5 **844f8e15** (after #103), parents b6dec409 + 844f8e15. Two conflicts: (a) scripts/check-release-build.mjs:74 hooks array now has BOTH `'eggfarmQa'` (rc/v5) and `'qaPicker'` (BBv2 SG-12): eggfarmOnb, eggfarmQa, eggfarmQaRecovery, qaPicker, eggfarmPerf, …; (b) src/config/balance.json `telemetry.bbv2`: both sides added the same block with identical values 5/60/30/50; took rc/v5's version (no `_note` string, since schema tests read the block as numbers). telemetry.ts and app.ts auto-merged.

## Bundle
**gen-bbv2-92381ed.bundle** (prereqs 844f8e15, 30df38c0), sha256 9a7a00cc…3e7d, in SHA256SUMS (`sha256sum -c` OK). Previous bundle:
gen-bbv2-b6dec40.bundle, prereq 30df38c0 (also lists 0ad018d, an ancestor of 30df38c0), sha256 in SHA256SUMS (`sha256sum -c` OK).

## Gates
92381ed: build + build:html PASS (tsc, check-release-build m4.1+92381ed, no QA hooks in release). npm test 2179 pass / 1 skip (152 files, mergefwd-unit.log). Hosted `gate` run 42113793729; test:slow and check-globals have not been re-run on 92381ed. The results below are for b6dec40.
b6dec40: npm test 2102 pass/1 skip (AC-W1 4/4), test:slow 20 pass/1 skip (AC14 0 violations), build/html/check-release-build/check-globals ×3 PASS, goldens f90d1678/a54c9cf9/DOM 9c4b6439 byte-identical (bbv2-gate-11n-*.log).

## D-HOE-35 / D-HOE-38
Live gate-acs not pinned. **Flags HELD**: bestBuyV2/zeroGainUi stay 0; HELD-flip-bestBuyV2.diff untouched. Flip after the Architect's SIM-only flag-list PR. K10 RED is separate, untouched.

## Open (owner)
1. anyM5FlagOn counts UI flags (Architect PR). 2. AC8 VAR cadence / COLL L0 under Q-E2 (Econ/HoQA). 3. schema.ts not in rc/v5 (Saves).


---

## 2026-11-05 ~23:10 CET · TASK HoE/gen-100-m1-hatch + M2 (lane H) · LOCAL→pushed tip
Pins: **spec v1.0.4 `4ea3841a`**, **Card #12 `9f900304`** (was 6cb27b3d), D-HOP-2026-11-05-14, D-ECON-20261105-M1-QE2-HATCH sha256 d938f07f….
Architect delta PASS on merge-fwd tip 92381ed (addendum sha256 794d8c96…3cc0) before push.

### Head
**gen/bbv2-m12 → origin/v5-m51-bbv2** tip **e7f3ca7** (14/n), ordinary FF from 92381ed. PR #100 stays **Draft**. Flags HELD (no bestBuyV2 flip).

### Commits (author: Senior Engineer, Generalist (Sim/TS + UI) <gen-engineer@egg-farm.local>)
- **13/n `8a514e4`** M1: isolate Q-E2 from BR-R5 hatchCostCents (D-ECON-20261105-M1-QE2-HATCH). `IncomeOpts.ignoreQE2`; hatchCostCents passes `assumeWorking+ignoreQE2`; planner Q-E2 default unchanged (BB-AC10).
- **14/n `e7f3ca7`** M2: ENFORCE v1.0.4 ship empty BBv2 set → no-pick (D-HOP-14). `rankable` ship empty→`[]`; selectGoal no capacity fallback; CONFIRMATORY `suppressedAffordable===0`; DECISIVE zg-off mark-null preserved. Card pin → 9f900304.

### Tests (lane H, vitest --minWorkers=1 --maxWorkers=2)
- M1+M2+qe2+breeds-hatch+parta+sim unit: 72 pass (earlier); final reconfirm m1/m2/qe2/sim: 20 pass EXIT 0.
- AC14 unit seeds 1–3: DECISIVE suppressedAffordable=334 (net OK); CONFIRMATORY **0**.
- qapicker ship incl. post-L30: PASS.

### 18-state / capacity-only diagnostic
- Path: `engineering/tasks/bbv2/m2-18-state-diagnostic.md` (+ `.json`)
- Generator: `game` worktree `scripts/m2-18-state-diagnostic.ts` (lane H)
- Pre-fix reconstruction: shape = F≥30 empty meaningful + affordable **HENS** capacity-only (dCap>0, gain≤0, not ZG). Architect reported 18 at b6dec409; reconstruction count 960329 (all ≥L30, runM2). Post-fix CONFIRMATORY → 0.

### Residual
- Full AC14 seeds 1–200 slow not re-run on e7f3ca7 (unit sample green). UI QA no-pick strip + m1 29-code-point @ 360×640 ×3 engines — route after tip (does not block land).
- Flip still held (D-HOE-35/38). Architect delta on new tip after push+gate.

### Hosted CI on e7f3ca7
- FF push 92381ed..e7f3ca7 → origin/v5-m51-bbv2; #100 remains Draft.
- `ci.yml` draft guard skips gate on PR drafts (`if: !draft`). Initial run 42119213482 skipped; `gh run rerun` → in progress: https://github.com/PrincipalLewis/egg-farm/actions/runs/42119213482
- Prior mergefwd gate SUCCESS on 92381ed: https://github.com/PrincipalLewis/egg-farm/actions/runs/42113793729
- If draft skip sticks, HoE must Ready/undraft (or workflow_dispatch) for a required gate at e7f3ca7.
