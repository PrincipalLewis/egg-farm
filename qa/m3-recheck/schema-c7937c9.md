# Saves QA — schema.ts pre-merge verification @ c7937c9 (TASK saves-qa/schema-c7937c9)

Date: 2026-11-05 20:48–22:0x CET. Verifier: Saves QA. Errata of record: rev 13 a0e8f6d7. QA evidence + recommendation only; HoQ issues the verdict. Nothing pushed/merged/tagged; worktree not modified (status clean before and after).

## Recommendation: **FAIL — do not merge as-is** (1 MAJOR regression; schema content itself PASS)
Schema requirements (1)–(6) and G-8 size all PASS independently. But the PR's new `validateBalance` requirement for `telemetry.bbv2.*` breaks 3 existing default-suite tests whose pinned balance fixtures (no `telemetry.bbv2` block) pass at rc/v5 518de30 and throw at c7937c9 (F-1). Fix F-1, then re-verify (expect PASS).

## Tested identity
| item | value | check |
|---|---|---|
| worktree / branch | /workspace/wt-v5-telemetry-schema, feat/saves-v5-telemetry-schema | HEAD = c7937c9a16fc81cde1eed526c804c5800bbd17b4; `git status --porcelain` 0 lines (only ignored dist/, node_modules) |
| "schema content a1f81a97…" | **a1f81a97ba1063cbf17a3124495ac04a2af45743 is a COMMIT** ("rev13 resume polish after rc/v5 merge"), not a file blob. Tree eb825538. | c7937c9 vs a1f81a9: only engineering/status.md (1 line) → code identical |
| schema.ts blob | **e1a5e5dc6ad4ee907935b1070eed977c3235ba0a** at both a1f81a9 and c7937c9 | `git rev-parse <sha>:src/telemetry/schema.ts` |
| merge 2f4794c | parents f1bb844 + 518de304fbe9…; tree d3cb7ba7 == `git merge-tree --write-tree f1bb844 518de30` → **clean merge, no manual resolution** | |
| delta vs rc/v5 518de30 (code) | src/config/balance.json, src/config/balance.ts, src/sim/workers.ts, src/telemetry/schema.ts (new), src/telemetry/telemetry.ts, tests/telemetry-schema.test.ts (+ engineering docs) | `git diff --stat 518de30 c7937c9` |
| tested content | `git archive c7937c9` extract (scratch/src) and `git clone` + checkout c7937c9 (scratch/gitc, clean); baseline checkout 518de30 (scratch/gitb) | |

## Results per requirement
| # | requirement | result | evidence |
|---|---|---|---|
| 1 | FATIGUE_CUE_TAPPED_FIELDS = exactly surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused | **PASS** (schema.ts L72; each required; extra field rejected) | indep 1/1b/1c |
| 2 | sum ≤ 4 enforced; FAIL fixture 2+2+1=5 | **PASS** (RULES fatigueSum L234-235, tapped + shown; 5 rejected, 4 accepted; 4+1+0, 0+4+4, 3+3+0 rejected) | indep 2–2d; G8V-C1b |
| 3 | tapped rejects suppressed_by_stall; shown keeps it | **PASS** (tapped: unknown field for true/false; shown = six + suppressed_by_stall, required, bool) | indep 3–3c; G8V-C1c |
| 4 | zero_gain_purchase no capped marker; overflow only session_end.zero_gain_purchase_dropped; cap 50 from balance.telemetry.bbv2 | **PASS (schema scope)**: no `capped` spec; bare/with-fields marker, `capped:false`, `dropped` rejected; only overflow field in schema is session_end.zero_gain_purchase_dropped (count, optional); balance.json bbv2.zero_gain_purchase_cap = 50 and validated int. Note: no emitter of zero_gain_purchase/dead_zone/fatigue_cue_* exists in src at this SHA, so runtime cap enforcement is NOT TESTABLE here (emitter PR). | indep 4–4e; G8V-ZG |
| 5 | dead_zone.reason only none_affordable; cap/max/idle rejected | **PASS** (enum exactly ['none_affordable']; cap, max, idle, '', None_affordable rejected; pinned) | indep 5–5c; G8V-DZ |
| 6 | G-8 ≤ 200 KB incl. dead_zone + buy-spam | **PASS**: base 155374 chars / 155376 UTF-8 bytes (headroom 49424); buy-spam 175905 chars / 175907 bytes (headroom 28893); 120 dead_zone, 50 zero_gain, all valid & pinned. Matches engineer's 155374/175905. Info: the test measures `JSON.stringify().length` (UTF-16 units), 2 below UTF-8 bytes (≥/– in viewport buckets) — immaterial. | indep 6a/6b; vitest log |
| T | PR tests L211 / L338 cover C-1 | **PASS on content, cites stale (minor, known rev 14 m-2)**: at c7937c9 L211 is the shown-sum fixture (test L210-213: shown 2+2+1 rejected), L338 is the T-AC9 warn-once test (unrelated). C-1 coverage is at **L214-226**: exact six-key set for tapped, shown = six + suppressed_by_stall, surface enum, suppressed_by_stall rejected on tapped, each missing field required, **2+2+1=5 FAIL fixture (L224)**, boundary 4 accepted. | test file read at c7937c9 |

## Findings
- **F-1 MAJOR (merge blocker; regression vs rc/v5 518de30).** `validateBalance` (balance.ts L22-23, added by this PR) now requires `telemetry.bbv2.*`; committed sha-pinned fixtures from rc/v5 lack that block, so 3 tests fail:
  - tests/k10-breeds-offset.test.ts "seed 1 equals the scratch harness of record" and "steps at exactly 100 ms…" (fixture tests/fixtures/k10/balance-9a73bd8a.json, from #98 merged in 2f4794c);
  - tests/verify.test.ts "[VER-1h N-5] … m5x-casual 0.25 h seed 1 …" (fixture tests/fixtures/balance-883d1b0d.json).
  Error: `balance.telemetry.bbv2.shown_min_gap_s must be > 0`.
  Repro (no vitest): `validateBalance(JSON.parse(tests/fixtures/k10/balance-9a73bd8a.json), false)` → THROWS at c7937c9, OK at 518de30 (evidence k10-validateBalance-c7937c9-vs-518de30.txt). vitest repro in a clean checkout: `vitest run tests/k10-breeds-offset.test.ts tests/verify.test.ts` → 3 failed.
  Fix is the engineer's call (e.g. tests merge a bbv2 block onto the pinned fixture before validate, or validation defaults/accepts an absent block for legacy fixtures); pinned trace shas must stay unchanged. Possibly also affects *.slow tests using pre-bbv2 fixtures (not run here).
- **F-2 MAJOR for G-8/V-0, outside items (1)-(6), HoQ to scope.** Errata rev 13 V-0 L42-43: stored ring `{v, events}` + `legacy:true` on load, export header `schema_version`. At c7937c9 src/telemetry/telemetry.ts has neither (no `TELEMETRY_SCHEMA_VERSION`, `legacy`, `schema_version` anywhere in src outside schema.ts). G-8 static G8-12/G8-13 FAIL. May belong to a separate row (24) PR; if it is part of this PR's scope it is a blocker.
- **F-3 MINOR (ruling).** FieldSpec kind `obj` (session_summary, breed_family_s) is not in the errata L41/L186 kind list (enum/int/count/bucket/bool + N-2 float/str/arr). Closed and pattern-checked, so no free text; needs a PMC/HoQ nod or errata line (G8-7).
- **F-4 MINOR.** Stale test cites L211/L338 (rev 14 m-2), see row T.

## G-8 static probe (g8-schema-ts.mjs) — not a wrong tree
Re-ran against a full clean git checkout of c7937c9 (scratch/gitc): output **identical** to the run against the engineer's worktree (both read the commit via git, not the working files). So the earlier FAIL was not a path error. Causes:
- G8-20 "0 test files": probe only listed `src/**` tests; this repo keeps tests in `tests/`. **Legitimate probe fix** made (list `src` + `tests`); self-test 61/61; G8-20 now PASS (tests/telemetry-schema.test.ts).
- G8-4, G8-7s, G8-7a, G8-15, G8-17, G8-18, G8-19, G8-21, G8-22, G8-23 ("not declared"): **probe parser limitation** — it expects literal `{ kind: … }` field objects; schema.ts uses builders (E(), I(), C, opt(), spreads, `Object.freeze(Object.keys(…))`). Each of these is verified semantically by the runtime probe and the independent probe instead. Not rewritten (out of proportion pre-merge; flagged for a follow-up probe rework).
- G8-7 = F-3; G8-12/G8-13 = F-2 (real).
- Net: **G8 static FAIL (13)** = 10 parser-limitation, 1 ruling (F-3), 2 real (F-2). Not a pass.

## Checks run
| check | result | log (evidence/schema-c7937c9/) |
|---|---|---|
| independent probe items 1-6 (esbuild bundle of git-archive c7937c9) | PASS 20/20 | indep-items1-6.txt |
| G-8 runtime probe g8-validate-c1.mjs --git worktree --rc c7937c9 | G8V PASS (0, C1a, C1b, C1c, DZ, ZG) | g8-runtime-c7937c9.txt |
| G-8 runtime self-test (nosum, zgmarker, dzcap, two, sbs, absent, rc tip) | 8/8 | g8-validate-selftest.txt |
| G-8 static vs worktree / vs clean checkout / after G8-20 fix | FAIL 14 / FAIL 14 identical / FAIL 13 | g8-static-c7937c9.txt, g8-static-gitc-c7937c9.txt, g8-static-gitc-c7937c9-fixed.txt |
| G-8 static self-test before / after fix | 61/61 / 61/61 | g8-selftest.txt, g8-selftest-after-fix.txt |
| vitest telemetry-schema + telemetry + telemetry-m3 + export-global (git-archive extract, no .git) | telemetry-schema **47/47**; 63/64 — 1 fail telemetry-m3 BUILD_ID `m4.1+unknown` = no-git ENV artefact | vitest-telemetry.txt |
| vitest full suite (extract, no .git) | 2064 pass, 9 fail, 1 skip: 6 git-env artefacts (4 pacing-x1-ac7 "not a git repository", telemetry-m3 BUILD_ID, verify M31) + 3 F-1 | vitest-full.txt |
| vitest rerun of the 4 failing files in clean git checkout c7937c9 | 83/86: telemetry-m3 BUILD_ID PASS (real hash), pacing-x1-ac7 PASS, verify M31 PASS; **3 fail = F-1** | vitest-rerun4-gitc-c7937c9.txt |
| same 4 files at baseline 518de30 | **86/86 PASS** | vitest-rerun4-gitb-518de30.txt |
| validateBalance on k10 fixture c7937c9 vs 518de30 | THROWS vs OK | k10-validateBalance-c7937c9-vs-518de30.txt |
| environment / load | node v24.22.1, 8 CPU; every vitest run under flock .vitest-eng.lock, nice -n 10, 1 fork, started at load <= 11 (logged LOCK+START/END loadavg) | env.txt, load-pre-vitest1.txt, LOCK lines in each vitest log |

Runner: scratch/schema-c793-2048/run-vitest.sh, run-vitest-dir.sh (via lane-run.sh saves-qa). One queued run killed via lane-kill.sh (load was 13.9) and relaunched with the load gate.

## NOT RUN
- vitest *.slow / k10 config suites — out of scope (TS engine default suite only); may show more F-1 instances.
- Emitter-side checks (cap 50 at runtime, dead_zone emission, fatigue_cue emission) — no emitters at this SHA.
- Browser / server — not needed; no ports used.

## Baseline
Same 4 files at rc/v5 518de304 (clean checkout scratch/gitb), same lock/nice/1-fork: **86/86 PASS** (LOCK+START 21:55:59 load 4.10). At c7937c9: 83/86, the 3 F-1 tests fail → F-1 is introduced by this PR (merge 2f4794c + balance.ts bbv2 validation).
