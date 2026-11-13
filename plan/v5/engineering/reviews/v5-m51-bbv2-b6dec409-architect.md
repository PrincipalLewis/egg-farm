# Architect review: PR #100 v5-m51-bbv2 (BBv2, row 29) — FINAL at integration head b6dec409 (history: d654afd → fbce499 → b6dec409)
Reviewer: Senior Software Architect. Date 2026-11-05 CET (UTC+1). No Claude review (rule 22); QA verdict not replaced. No merge, no push.

## Exact SHAs
- **FINAL reviewed head: b6dec409b15ab9c9f0d4869045a0f3c9b385f613** = origin `v5-m51-bbv2` (ls-remote 2026-11-05 ~21:55 CET). Base **rc/v5 30df38c0a0bd5d48db96d0705abccc6db197d161** is an ancestor (merge 10/n a8a8d67, parents 04a3788 + 30df38c). Ancestry b6dec40 ⊇ a8a8d67 ⊇ {30df38c, fbce499, 82c183b, d654afd}.
- Delta fbce499 → b6dec40: 9/n 04a3788 (Saves; tests/pacing-acw1.test.ts AC-W1 flag-on re-baseline, QA-D-1105-ACW1), 10/n a8a8d67 merge rc/v5 (#98 K10, #99), 11/n b6dec40 comment-only citation. src delta = src/ui/app.ts only; its +/- lines equal fbce499's BBv2 app.ts change except the return line, resolved exactly as recommended below (`dispose: () => zgAC.abort(),` + qaPicker spread). All other src files byte-identical to fbce499.
- Earlier step (kept for the record):
- Reviewed head: **fbce499480568e4b0364a0ff0baa0543e4921d19** (bundle engineering/tasks/bbv2/gen-bbv2-fbce499.bundle, sha256 18db9c3c58923c44adcbbf2788a64194b84514613b8dd671263f75a6bdd267c5, `git bundle verify` OK, prereq 0ad018de). Chain: 93e9b2a 1/n … d654afd 6/n → 82c183b 7/n → fbce499 8/n.
- **Mismatch history (resolved at b6dec409, now on origin):** GitHub `v5-m51-bbv2` / PR #100 head is still **d654afd** (ls-remote 2026-11-05). 7/n and 8/n exist only in the bundle; hosted CI exists only for d654afd. Original task was d654afd; HoE superseded it with fbce499 (20:53 CET).
- PR branch base: rc/v5 **0ad018de** (#97). Current rc/v5: **30df38c0a0bd5d48db96d0705abccc6db197d161** (= 518de304 K10 #98 + #99 30df38c). Not reviewed/merged by me; Generalist merges forward.
- Specs: BBv2 v1.0.4 4ea3841a (sha1 verified), Card #12 6cb27b3d, errata v5 rev 13 a0e8f6d7 (sha1 verified), D-HOE-35, D-HOE-38.
- Process note: 8/n fbce499 carries author "Senior Software Architect <architect@eggfarm.studio>" (2026-11-05 20:26 CET). I did not author it in this task; if it came from an Architect-identity session, the 8/n delta is not independently reviewed by me — HoE/QA should treat the 8/n delta review as same-identity and keep QA's verdict as the independent check.

## Verdict
**PASS with Minors for merge at flags 0** (bestBuyV2 = 0, zeroGainUi = 0) at b6dec409, conditional on the hosted `gate` at b6dec409 finishing green (see Hosted CI). No merge blocker found.
**One Major (M1) blocks the bestBuyV2 flip**, not the flag-0 merge. Flip is also held by D-HOE-38 (SIM-only flag list).

## Findings
### M1 — Major, FLIP BLOCKER (D-HOE-38): Q-E2 leaks a UI-only flag into SIM coin charges via BR-R5 hatch cost
- `src/econ/income.ts:35` (fbce499) Q-E2 changes `collectPerSec(…, {assumeWorking:true})` under bestBuyV2. `src/sim/breeds-hatch.ts:51` `hatchCostCents` = `hatchCostFrom(round(incomePerSec(s,b,{assumeWorking:true})))` — a sim action cost (BR-R6/R7 charges coins).
- Probe (scratch, not committed; probe-hatch-qe2.ts/.log): breeds 1, Market Hand + Coop Hand + Hawker, F10–28 × C5/10/14/18: **7/28 states differ**, e.g. F22 C5 hatch 1,704,285 → 1,022,085 cents; F28 C5 2,983,725 → 1,442,925; F17 C5 809,955 → 607,230. Flag 0: no effect (byte parity holds).
- Spec v1.0.4 §2.5/§4.9 list only live consumers (header, ETAs, secondsToAffordSteady, offline, BR-R7b); BR-R5 planRef is not mentioned. D-HOE-38: "UI-only flags (zeroGainUi, bestBuyV2) must never change sim behaviour."
- Fix options (needs ruling HoE + Econ + PM Collection before flip): (a) BR-R5 reads the pre-Q-E2 planner (e.g. an IncomeOpts flag that ignores Q-E2, default in sim callers), plus a test hatchCostCents(bb0) === hatchCostCents(bb1) on a collect-binding state; or (b) rule that Q-E2 applies to planRef and re-baseline breeds (then bestBuyV2 is no longer UI-only and D-HOE-38's list must say so). Recommend (a), small, in #100 before the flip commit.
- Note for my D-HOE-38 PR: anyM5FlagOn exclusion does NOT cover this path; its byte-identical UI-flip test will include a breeds-on + Coop Hand collect-binding state so it catches M1.

### m1 — Minor (flip-time QA): starred FARM strip label bypasses the 27-cp truncator
- `src/ui/next-goal.ts:77-81` builds FARM parts without goalLabelParts truncation. Longest: "★ Farm L3: unlock Market Hand" = 29 code points (> MAX_GOAL_LEN 27; probe-farm-label.log). Art §9 condition: longest strip label 1 line / 0 overflow at 360. Needs UI QA BB-AC17 browser check at 360×640 on 3 engines before flip; if it overflows, apply step 1 (drop "★ ") as F4 does. aria "best buy, Farm level 3, unlock Market Hand" OK; accName = visible text minus aria-hidden ★ OK.
### m2 — Minor (test gap): AC14 ship config "no exception" not asserted
- `tests/bbv2-sim.ts` ac14 / `bbv2-sim(.slow).test.ts` assert only `suppressedAffordableBelow30 = 0`. v1.0.4 §6: "in ship config there is no exception" → CONFIRMATORY config should also assert `suppressedAffordable === 0` (observed 0 on seeds 1–3; tightening, not weakening).
### M2 — Major, FLIP BLOCKER (BB-AC14, v1.0.4 §6 "in ship config there is no exception"): 18 ship-config states with an affordable hint and null ★
- Slow AC14 seeds 1–200 (fbce499; src identical at b6dec409): CONFIRMATORY ship (bb1+zg1) `suppressedAffordable = 18`, `suppressedAffordableBelow30 = 0`, violations 0. So 18 states at Farm ≥ L30 show an affordable hint with no ★. DECISIVE (bb1+zg0): 25,297, all ≥ L30, which is the allowed mark-null net.
- Likely cause, not yet confirmed state by state: after L30 no meaningful row is offered, so `rankable` keeps every key. The ZG filter (Δincome ≤ 0 AND Δcapacity ≤ 0) lets through a row that BBv2 counts as zero-gain (e.g. a capacity-only HENS milestone, spec §2.7), and that row becomes an affordable hint with ★ null. Spec §4.1 expects the ship-config UI picker to be empty after L30.
- Tests miss it because they assert only below L30 (m2). Needs a ruling (PMFU/HoQA) or a fix before the flip. Options: count that post-L30 state as the net in ship config too, or after L30 make the ship hint use the BBv2 set (empty → no-pick strip / BR-BB4). Then add `suppressedAffordable === 0` for the CONFIRMATORY config. Does not affect flags 0.
### m4 — Minor (agrees with QA review-pr100 N-3): AC-W1 flag-0 M4 regression band removed (9/n 04a3788)
- `tests/pacing-acw1.test.ts`: the ship-config ±5 pp/±20 %/±20 % check against 91 / 13.67 / 25.0 is replaced by the same bands at flag on (100 / 10.33 / 19.67, signed QA-D-1105-ACW1 + Economy countersign 66764c12). The design gate is unchanged. While bestBuyV2 ships 0, the ship config is guarded only by the design gate, plus X1 shards and flag-off goldens. Recommend restoring the flag-0 band next to the flag-on band in a follow-up (an added assertion, not a tuning). Not a blocker: signed ruling.
### m3 — Minor (coverage): BB-AC1 "every state on the AC7 traces"
- Traces check only the hint (ac14). Highlight / next-goal / tracks highlight / bot pick are covered on the generated grid (n > 300) + BB-1 fixtures, not on the AC7 traces. Acceptable for merge; add the other paths to the STATE_TRACE callback before the final RC.
### Nits
- d654afd's `suppressedEvents` was a vacuous always-0 counter (no SG-8 emitter); 7/n 82c183b removes it — correct; no SG/bbstop fixture or probe remains in v5 runs (rg clean).
- `meaningfulKeys` re-runs options()+incomePerSec per row on every call (scorers, bbv2Mark, telemetry); fine today, memoise per state if render cost shows up.

## Checklist (fbce499)
- **Flag-0 byte parity:** BB-AC11 (rankable identity; all paths equal flag-absent; m4-off inert) PASS; zg-flagoff-dom DOM golden 9c4b6439 PASS; m4a-flag-off, m41-11-farm-max, v5-f3-qa-seam (bestBuyV2 pin 0) PASS; these files, tests/fixtures/ and src/sim are byte-unchanged 0ad018d→fbce499. bb0 FARM strip unchanged ((a″) control). bb0 zg-matrix cells keep the 65a7443 reference; bb1 parity re-asserted per bb as spec §2.5 requires (not a weakening).
- **Part A:** zero-gain removed before affordable-first in all 4 paths (bestPaybackAmong best-buy.ts:176, scorerFor pick-hysteresis.ts:27, selectGoal next-goal.ts:57, highlightPick tracks-ui.ts:75; bot via bestPaybackAmong). Exempt FARM/W1–W4, ε = 0, generic (no COLL hard-code). ∞-tie FARM→BUY_ORDER only when both ∞; finite ties unchanged.
- **Hysteresis unchanged:** SWITCH_RATIO/MIN_SHOWN_MS/RECHECK_MS, keepable, freshWin, 0.9×/2 s logic untouched; only scorer input filter + ∞-tie in better(). BB-AC7: m4a-pick-hysteresis.test.ts unedited, 17/17 PASS.
- **Q-E2:** planner-only, flag-on, live path identical (BB-AC10 PASS) — except M1.
- **qaPicker/hintMark:** IOS_FLAG_ENABLED-gated, read-only (1,000-call test), v1 fields; release dist 0 / dist-html 0 / dist-qa 1 occurrences; check-release-build lists 'qaPicker'. hintMark is the single ★ source for chip + strip.
- **Telemetry AC16** vs errata rev 13: #19 ring rate-limited 5 s, eta_s 0 when affordable, null = ∞; #20 picker clock from last ★ switch; #21 pinned, cap 50 + session_end.zero_gain_purchase_dropped, meaningful_eta_s non-null, no farm_eta_s; #22 pinned, scope 10 ≤ F < maxLevel(30), reason none_affordable, open:true on hide/unload. Flag 0: no Bbv2Tel, no field. telemetry.bbv2 tunables 5/60/30/50. Schema compat: additive, flag-gated; schema.ts not in rc/v5 (Saves, G-8 must add rows #19–22 + session_end field).
- **Spec v1.0.4:** `suppressed && hint.affordable` property used (unit + traces); FARM strip ★ implemented in 8/n behind bestBuyV2 (AC2(a) asserts ★, (a′) unaffordable FARM no ★). No further refresh needed beyond M1/m1/m2.
- **No UI flag in sim:** PR adds no src/sim change; M1 is the one indirect sim effect. anyM5FlagOn still counts bestBuyV2/zeroGainUi (timers.ts:28) → D-HOE-38 PR, flip prerequisite.

## AC coverage
AC1 grid+fixtures (m3) · AC2(a)(a′)(b) jsdom analog, (c) unit · AC3 generated 100% · AC4 FX-TIE reachable + constructed · AC5 · AC6 · AC7 unedited PASS · AC8 fixed cadence 0/200 violating, max first ★ 30 s (variance cadence report-only 61/200 > 30 s, max 57.8 s — Open 4, Econ/HoQA) · AC9/AC14 seeds 1–200: see slow results below · AC10 · AC11 · AC15 · AC16 · AC12/13 Econ re-baseline (not in PR scope) · AC17 QA browser (m1) · AC18 scope OK.

## Local checks (fbce499, node v20.19.2, clean tree)
- sync-economy --check EXIT 0; tsc --noEmit EXIT 0; build + check-release-build EXIT 0; build:html + check-release EXIT 0; build:qa EXIT 0.
- check-globals chromium/firefox/webkit: 9/9 PASS (dist m4.1+fbce499).
- Full unit (flock, nice 10, maxWorkers 1): **147 files, 2085/2085 pass**, EXIT 0.
- Slow (fbce499; flock, maxForks 1): **5 files, 20 pass / 1 skipped, EXIT 0**. AC9 seeds 1–200: 0 zero-gain of 42,737 buys. AC14 DECISIVE: 2,160,000 states, 0 violations, suppressedAffordableBelow30 0. AC14 CONFIRMATORY: 0 violations, below30 0, suppressedAffordable 18 (M2). I did not re-run slow at b6dec409: the fbce499→b6dec409 delta touches no slow-suite input (src only app.ts UI focus/dispose; tests only zg-*, m41-p2, acw1, K10). QA's run at b6dec40 also reports slow 20 pass / 1 skip.
- b6dec409 (integration head): sync-economy, tsc, build + check-release, build:html, build:qa all EXIT 0; qaPicker release 0 / html 0 / qa 1; check-globals ×3 9/9 PASS. Full unit (flock, nice 10, maxWorkers 1, clean tree): **150 files, 2103/2103 pass, EXIT 0** (scratch/architect/review100-b6dec409/full-unit.log).

## Hosted CI
- b6dec409 (Checks API, re-read ~22:30 CET): **gate success** (workflow run 42104117439, job 127530850621, attempt 2, completed 22:27:51 CET; attempt 1 job 127514312772 cancelled 22:01 CET) · release-globals skipped (expected) · pacing-x1-stack shards casual/optimal/seller15 success (run 42104117409) · summary failure (job 127537421936) = documented RC-only row 904 · k10-breeds-offset failure = KNOWN-RED non-required monitor. Matches expectations.
- d654afd (history):
gate success (run 41076676581) · release-globals skipped (expected) · pacing-x1-stack shards casual/optimal/seller15 success (run 41076676697) · summary failure = documented RC-only row 904 · k10-breeds-offset failure = KNOWN-RED non-required monitor. Re-run required at the pushed integration head.

## Integration with rc/v5 — NEW: rc/v5 advanced to 7452679a19dbc0c0bfca848d9ebb4f17d885ad52 (#104 v5-p8-slim, merged after b6dec409)
- b6dec409 is not an ancestor of rc/v5 7452679, and `git merge-tree` b6dec40 × 7452679 gives **one conflict: scripts/check-release-build.mjs:74** (hook list). Resolve as the union: `'eggfarmOnb', 'eggfarmQa', 'eggfarmQaRecovery', 'qaPicker', …`. Both entries are needed: #104 adds eggfarmQa, BBv2 adds qaPicker, and tests/bbv2-qapicker.test.ts greps `'qaPicker'`. src/ui/app.ts merges clean: #104 adds data-testids and wireAttended, which do not touch hintMark/qaPicker; zg-flagoff-dom dumps #uRow/#goal only.
- **Merge prerequisite (process, not a code finding):** the Generalist merges rc/v5 7452679 forward (no rebase), applies the union resolution and re-runs the gate at the new head. I re-check only the resolution. Note for D-HOE-38: #104's wireAttended feeds attendedNow(), which is gated by anyM5FlagOn, so bestBuyV2 = 1 alone would switch attendance on. That is my flag-list PR's scope.

## Integration with rc/v5 30df38c (#98 K10 + #99) — done in 10/n a8a8d67
- `git merge-tree` fbce499 × 30df38c: **one conflict, src/ui/app.ts return object (~L903)**. Resolution: keep both — `…get recoveryOpen() {…}, dispose: () => zgAC.abort(), ...(IOS_FLAG_ENABLED ? { qaPicker: … } : {})`. K10 (vite.config exclude, workflow, fixtures) merges clean; BBv2 touches no CSV so the K10 trigger does not fire.
- #99 focus fix (zgApply focusKey, zgAC) and BBv2 hintMark/qaPicker touch disjoint code apart from the return line. Generalist must re-run full unit, slow, build/check-release, check-globals ×3, zg-flagoff-dom and zg-followup at the merge head, bundle + SUMS, then push.

## Flip prerequisites (not #100 merge blockers)
1. D-HOE-38 SIM-only flag list merged (anyM5FlagOn). 2. M1 fixed or ruled. 2b. M2 fixed or ruled (ship-config post-L30 affordable hint without ★). 3. m1 browser check at 360 (BB-AC17). 4. Econ + HoQA flag-on goldens (BB-AC13: m4on, bot-m5 hashes, zg-flagoff-dom 6757f235, pacing). 5. HELD-flip-bestBuyV2.diff + v5-f3-qa-seam pin as the PR's last commit (D-HOE-35).

## Handoff follow-up (QA request, not #100)
X1 hygiene: make row 904 non-failing outside `--require-ac7` (e.g. status RC-ONLY, not counted by verdictOf) and still blocking with `--require-ac7`. This reverses the tested design in tests/pacing-x1.test.ts:92-95 ("blocking NOT-WIRED 904 in plain CI → FAIL") and .github/workflows/pacing-x1-stack.yml:54-55, so it needs a HoE/HoQA ruling and an owner; small PR on scripts/pacing-x1-stack.ts + those tests.
