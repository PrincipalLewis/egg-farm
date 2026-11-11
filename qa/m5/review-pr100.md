# HoQA review — PR #100 "v5 M5.1: Best Buy v2 (flag 0)"

- Decision: **QA-D-1105-PR100**, 5 Nov 2026 ~21:25 CET. Reviewer: Head of QA. No Architect review of #100 exists yet ("Review: Architect next"); this does not substitute for one.
- **Verdict: MERGE-WITH-NOTES for the candidate gen/bbv2 @ b6dec40, once it is pushed to PR #100 as its head. DO-NOT-MERGE for the PR as it stands on GitHub (head d654afda).**
- Out of scope: K10 assertion patch r2 (QA-D-1105-K10R2), #104 (slim P8).

## 1. Identity / reconciliation (the two shas are different things)
| ref | sha | what it is |
|---|---|---|
| GitHub PR #100 head (`refs/pull/100/head` = `v5-m51-bbv2`) | **d654afda** | BBv2 1/n–6/n only; body pins spec **v1.0.3** 27e753d8 / Card #12 4a154bb4; built on 0ad018d; GitHub baseRefOid still shows 518de304; mergeable UNKNOWN after #99 landed. Re-checked 21:14 CET: still d654afda. |
| fbce4994 | local, unpushed | 7/n (drop SG-8 probe) + 8/n (pin **v1.0.4 4ea3841a / Card #12 6cb27b3d**, Farm-strip ★ for affordable FARM hint, §6) |
| 04a3788 | local, unpushed | 9/n AC-W1 flag-on re-baseline (QA-D-1105-ACW1) |
| a8a8d67 | local, unpushed | 10/n merge of rc/v5 **30df38c0** (#99) into gen/bbv2 |
| **b6dec40** (gen/bbv2 tip, /workspace/wt-gen-bbv2-r, clean) | local, unpushed | 11/n comment-only: countersign cite 456f94bc → 66764c12 (verified `git diff a8a8d67 b6dec40` = 1 comment line) |

Ancestry verified: b6dec40 ⊇ a8a8d67 ⊇ {30df38c0, fbce4994, d654afda}. Local branch is `gen/bbv2`; the PR branch is `v5-m51-bbv2` — the push must update `v5-m51-bbv2` (or the PR is re-pointed), otherwise CI and the merge button keep pointing at d654afda.

Diffstat rc/v5 30df38c0 → a8a8d67: **26 files, +853 / −62** (src 12 files incl. new src/telemetry/bbv2.ts; tests 14 incl. 7 new bbv2-*; scripts/check-release-build.mjs). Full src/scripts diff: evidence/src.diff.

## 2. Scope check vs stated scope
- BBv2 Part A (zero-gain never ranked in all 4 pick paths: bestPaybackAmong, PickHysteresis scorers, next-goal, tracks highlight; ∞-tie = BUY_ORDER) — present.
- Q-E2 planner collect fix (assumeWorking + flag on + Coop Hand: tap / coop_hand.every_s) — present; live path unchanged.
- SG-12 qaPicker (IOS_FLAG_ENABLED only) + check-release-build lists `qaPicker` — present.
- §8 telemetry (#19–22, pinned zero_gain_purchase / dead_zone, session_end field) — present; Bbv2Tel built only when flag on.
- v1.0.4 §6 **affordable-FARM ★ fix** — present **only in fbce4994 (unpushed)**; tests (a) affordable FARM → mark+chip+strip ★, (a′) unaffordable → no ★, (a″) bestBuyV2=0 control → no strip ★.
- Gate Card #12 re-pin 6cb27b3d / spec v1.0.4 4ea3841a — in fbce4994; spec file on disk sha1 4ea3841a matches (frozen copy present); QA-D-1105-RR4 authorized it.
- AC-W1 re-baseline (04a3788) and the #99 merge (a8a8d67) — beyond the PR body, but expected and in scope. **No scope creep found** (no data/economy.csv change, no unrelated src).

## 3. Correctness / flag-0 / magic numbers
- **flag-0 behaviour: unchanged.** bestBuyV2 = 0 in balance.json (all M5 flags 0, zeroGain.confirm 0). Every new branch is gated: `rankable` returns keys unchanged; `infTie` false; income Q-E2 only when flag on; `hintMark = bestBuyMark(hintPick)` at flag 0 (same value as before); selectGoal `c = c0` at flag 0 so `forced` lookup is identical; FARM ★ path requires bestBuyV2On; `g.bbTel` null → no emitter, `session_end` unchanged; qaPicker compiled out of release. The only flag-0 cost is computing `before`/`bbKey = null` in dispatch.
- **Empirical flag-0 evidence:** (1) local AC-W1 ship config seeds 1-200 = pass10 91 / medF10 13.67 / medF18 25.0 and 201-299 = 90.91 — **exactly the pre-BBv2 history values**; (2) CI pacing-x1-stack on d654afda: all 105 measured rows identical to #98/rc/v5 (balance sha differs only by the added telemetry.bbv2 block); (3) K10 numbers identical to rc/v5 (§5).
- **Magic numbers:** none in logic. BBv2 telemetry tunables live in balance.json `telemetry.bbv2` (5 / 60 / 30 / 50) with matching BBV2_TEL_DEFAULTS fallback; Q-E2 reads `b.workers.coop_hand.every_s`. `qaHist` cap 32 is QA-build-only. Note N-4: the defaults duplicate the JSON values (harmless; keep in sync).

## 4. AC-W1 / BB-AC13 signed re-baseline (QA-D-1105-ACW1, signoff 1c5fae7f)
- **Landed atomically** in one commit 04a3788, one object: `BBV2_BASELINE = { pass10: 100, medF10: 10.333333, medF18: 19.666667 }` — 100 / 620 s / 1180 s. All three together; no half-moved median (the old 13.67/25.0 0.8-floor trap does not exist here).
- **Tolerances unchanged:** ±5 pp, ±20 %, ±20 % (same expressions as the old PY assertions). **Design gate unchanged:** ≥95 % F10 within 960 s and medF18 ≤ 40 min, both cohorts, ship config.
- **Per-cohort check:** the flag-on regression baseline is asserted **only on seeds 1-200**, so the single 1180 s figure is correct; the 201-299 cohort (measured 1200 s) is not asserted against 1180 anywhere. 201-299 runs only the ship-config design gate. Consistent with the signoff ("if per-cohort, 1180 for 1-200 and 1200 for 201-299").
- Flag-off band (91 / 13.67 / 25.0) removed from assertions = "flag-off = history" per the signoff. Note N-3: while bestBuyV2 ships 0, ship-config AC-W1 is now guarded only by the design gate; flag-off regressions remain covered by pacing-x1-stack shards and the flag-off goldens.
- Local run (a8a8d67): flag-on seeds 1-200 **pass10 100, medF10 10.333333, medF18 19.666667** = signed values exactly; test PASS.
- Citation fixed in b6dec40 (66764c12 supersedes 456f94bc).

## 5. CI (only exists for d654afda; runs 30 Oct, 16:00–~16:43 CET)
| check | result | merge-relevant? |
|---|---|---|
| gate (run 41076676581) | SUCCESS (148 files) | required — but **stale**: on d654afda, not on the candidate |
| pacing-x1-stack shards ×3 | SUCCESS | — |
| pacing-x1-stack (aggregator) | FAILURE | non-required; **same signature as #99**: 45 PASS / 0 FAIL / 1 WARN, only `blocking row 904 {optimal,seller15,casual} NOT-WIRED`; /workspace/gates-v5/x1-summary-100.log (sha256 606a7342…) matches the live log; 105/105 rows identical to #98. Reporting-only, not a hold. |
| k10-breeds-offset (KNOWN-RED monitor) | **FAILURE** | **non-required for merge.** Triggered because the diff touches src/config/flags.ts. Result `g1max 63.12 | no-breeds 63.10 | Present-only 63.10 → expected 63.12 ≤ 63.1`, **identical to the #98 run on rc/v5** (41069337352). #99 was green only because the trigger no-op'd (no K10 paths). So K10 red is the rc/v5 state, not caused by #100. |
| release-globals | SKIPPED (head branch not rc/*; expected) | runs on the rc PR |

**K10, explicitly:** RED on rc/v5 and therefore on #100; non-required monitor → **not a merge blocker for #100**. But **K10 red at the RC cut BLOCKS THE CUT** (D-HOP-52/53); the fix path is Economy's B4 CSV + the assertion patch r2 under QA-D-1105-K10R2, not #100.
Nothing else is red besides the pacing-x1-stack aggregator (reporting) and K10 (known-red monitor).
**acw1 in CI:** not yet — CI has never run the re-baselined test (04a3788 is unpushed). Locally it passes on the signed values (§4).

## 6. What I ran (box, lane hoqa-pr100 pid 957965, scratch worktree at a8a8d67 = gen/bbv2 merged with 30df38c0; b6dec40 differs by one comment line)
| command | result |
|---|---|
| `npx tsc --noEmit` | EXIT 0 |
| `npx vitest run tests/bbv2-*.test.ts tests/zg-*.test.ts tests/next-goal*.test.ts tests/pick-hysteresis*.test.ts tests/telemetry*.test.ts` | 16 files, **178/178** |
| `npx vitest run tests/pacing-acw1.test.ts` | 4/4 PASS; values in §4 |
| `npx vitest run` (full default suite) | **150 files, 2102 pass / 1 skipped, EXIT 0** |
| `vitest --config vitest.slow.config.ts` (maxForks 2) | **5 files, 20 pass / 1 skipped, EXIT 0** (incl. bbv2-sim.slow AC9/AC14 seeds 1-200, 691 s); process exited on its own |
| CI log reads: x1 summary (#100, #98), K10 (#100, #98, #99), verdict.json row diff | §5 |
Not run: `npm test`'s sync-economy prefix (no CSV change), `test:k10` locally (CI result identical to rc/v5; K10 is QA-D-1105-K10R2's lane), build/html/check-release-build (CI gate covers on push), browsers, full pacing sim locally.
Evidence (logs saved incrementally): qa/m5/review-pr100-evidence/ + SHA256SUMS.

## 7. Merge conditions and notes
**Blockers (must be true before HoE merges):**
- B-1: push gen/bbv2 **b6dec40** (or a tree-identical successor) to `v5-m51-bbv2` so PR #100's head contains fbce4994 (v1.0.4 ★ fix + Card #12 6cb27b3d pin), 04a3788 (signed AC-W1) and the 30df38c0 merge. Merging d654afda would ship v1.0.3 without the §6 ★ fix and with the old AC-W1 band.
- B-2: required `gate` green on that pushed head (incl. slow suite with the new AC-W1 test and bbv2-sim.slow).
- B-3: Architect review PASS on that head (process; none exists yet).
**Not blockers:** K10 red (known-red monitor; blocks the RC cut, not this merge); pacing-x1-stack aggregator row-904 (reporting; HoE fixes post-merge, before RC handoff Wed 11 Nov 14:00 CET).
**Notes:** N-1 update the PR body pins to v1.0.4 4ea3841a / Card #12 6cb27b3d. N-2 bestBuyV2 stays 0 in this PR (D-HOE-35/-38); the flip is a separate commit with its own re-baseline evidence. N-3 ship-config AC-W1 now guarded only by the design gate (§4). N-4 BBV2_TEL_DEFAULTS duplicates balance.json values.
**Dependency tracking:** slim P8 now has a concrete PR, **#104** (head eafd08c2: attended sheet seam + one Game wiring + release guard/tests; Architect reviewing, gates pending, not merged). Not reviewed here.
