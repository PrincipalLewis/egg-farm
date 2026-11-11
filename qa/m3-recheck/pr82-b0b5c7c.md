# PR #82 (v5 F3 config wiring) @ b0b5c7c: **BASELINE (superseded head)**. No merge verdict
Saves QA (33ec1b55), 2026-10-30 07:4x–07:5x CET. Per HoQA (07:45 steering), this pass on **b0b5c7ccf809fff07f9078abc429a109f953e094** is a baseline only. The head has already moved: at 07:5x CET `gh pr view 82` = **36c67defa356** (Draft). Notes below are meant to make the delta check on the next head fast.
Previous review: pr82-ecf8297.md (RETURN TO AUTHOR: trace table only; optional 2a pin M5_MAPPED_COLS, 2b 0.35 source, 2c D-C1 pin note). CCR-passed commit: **ecf8297** (engineering/reviews/pr82-ecf8297-ccr.md, PASS 0B/0M/0m/2n).
Logs: `pr82-b0b5c7c/` (SHA256SUMS). Scratch worktree qa/scratch/wt-pr82-b0b5c7c (own `npm ci`), removed after the run.

## State at b0b5c7c
- OPEN, **Draft**, base **feat/v5-f1c-effects** (not rc/v5). CI run 41015305358 `ci` **skipped** (Draft). No artifacts/v5-f3-b0b5c7c (latest F3 gate: artifacts/v5-f3-e743462, an old head).
- Ancestry ✔: #80 aa0ed32, 736d04e; #79 02e7ede; rc/v5 **b563c75**; ecf8297 are all ancestors. The re-stack after #80 is **done** (merge b0b5c7c of aa0ed32, clean remerge-diff; merge 348cdde of 736d04e, clean).
- **PR body: unchanged since ecf8297. Still no trace table and no Post-CCR delta section** (`pr-body.md`). This would still be the blocker at the next head unless the body is edited.

## Post-CCR delta ecf8297 → b0b5c7c (first-parent)
| commit | what | production? |
|---|---|---|
| 348cdde | merge #80 736d04e (clean) | brings #80/#79/#77 code |
| 9c6bff6 | merge fix-up: one M5_FLAGS import in tests/v5-f2-m5-fields.test.ts | test |
| 84df247 | CCR N-1/N-2: QA-seam test removes temp dirs; `verify --flags` rejects m4.flags.* ≠ 0/1 (scripts/verify/cli.ts +1) | tooling (explained, CCR N-2) |
| bba6c79 | AC ids in test titles; **[§9.5-1] M5_MAPPED_COLS pinned** (my 2a) | test |
| 10d1e28 | m5-rules.ts: `rest_recovery_mult > 0` guard; [Pause-§6] test | src (explained: pause spec §6 range (0, 0.35]) |
| b0b5c7c | merge #80 aa0ed32 (clean) | — |
#82's own files vs #80 head (`01-files-vs-pr80-head.txt`, 19 files): scripts/m41-p1-income-states.ts, sync-economy.ts, verify/cli.ts; src/config/balance.json, balance.ts, flags.ts, formulas.ts, **m5-rules.ts**, **src/econ/income.ts** (marketHandStalled → isPaused), **src/sim/pause.ts**; tests m41-p1-live-income, v5-f1a/f1b/f1c/f2 (fixture/import), v5-f3-config, v5-f3-is-paused, v5-f3-qa-seam, verify.test. No unexplained production change at b0b5c7c.
(Cross-lane note for #83's AC-R15/AC-R17 check: #82 changes `src/econ/income.ts` functionally, through the isPaused read, so it's not comment-only. Relevant if #83 is stacked on #82.)

## The optional asks
- 2a M5_MAPPED_COLS pin: **done** (bba6c79, `[§9.5-1] M5_MAPPED_COLS is exactly the two ruled non-tc_ mappings…`; mutant K3 killed).
- 2b 0.35: **it is a spec rule, now cited.** m5-rules.ts: `must be <= 0.35 (pause spec §6, decisions.md:9)`. Sources: product/workers/m5-worker-pause-spec.md L164 "`rest_recovery_mult` must be in (0, 0.35]" and L218, plus product/decisions.md:9 (0.35 is the fastest recovery that still loses for every model). Not a tunable, so it needs no NAMED_OK entry. ✔
- 2c D-C1 pin note: not stated in the body (no table yet).

## Baseline results @b0b5c7c (own node_modules; --maxWorkers=2)
- tsc --noEmit **exit 0**.
- vitest v5-f3-config + v5-f3-is-paused + v5-f3-qa-seam + m41-p1-live-income + v5-f2-m5-fields + verify.test: **165 tests, 164 passed, 1 FAILED** (`10-baseline-vitest.log`):
  `tests/v5-f3-config.test.ts > [F3-no-literal] … > M5 modules carry no bare numeric literal…`. Got `['save/m5-fields.ts:17 1e15', 'save/m5-fields.ts:17 12']` (BROODY_NEST_MAX_CENTS / BROODY_SLOTS from F2 #81, brought in by the #80/#79 merges). **b0b5c7c is red.** This is the allowlist fix HoQA named (665bfba on the new head).
- Trace-relevant titles: 46 v5-f3 tests, every one under an id-tagged describe or title ([F3][D-C1], [F3][§9.5-1], [F3-validate], [SS-23], [Pause-§6], [F3-no-literal], [row-8 isPaused], [AC-P1], [QA-10], Q8…), `11-f3-titles.txt`.

## Mutations run at b0b5c7c (tsc 0 each; 111 tests without verify.test; 1 pre-existing failure subtracted; `30-mutrun.log`)
| id | mutant | result |
|---|---|---|
| K1 (mine, flags block) | validateM5 accepts any flag value (drop `v !== 0 && v !== 1`) | **killed**: [F3][D-C1] validateBalance refuses an unknown flag or a non-0/1 value |
| K2 (mine, flags block) | keepFlags: absent flag → 1 | **killed**: [F3][D-C1] sync keeps the flags block whole… |
| K3 (mine, M5 config) | M5_MAPPED_COLS drops rest_recovery_mult | **killed** (2): [§9.5-1] pin + mapped-column test |
| K4 (mine) | drop the `rest_recovery_mult > 0` guard (10d1e28) | **killed**: [Pause-§6]. **Superseded by 36c67de (guard relaxed to >= 0)** |
| K5 (mine) | 0.35 bound → 0.4 | **killed**: [F3-validate] rejects {"rest_recovery_mult":…} |
| P1 (CCR list) | isPaused without the flag gate | **killed** (4) |
| P2 (CCR list) | income.ts raw `w.paused !== true` read | **killed** (4, incl. [QA-10] grep) |
7/7 killed. No Architect mutation list in the body, so the CCR's P1/P2 stand in.

## Notes for the delta check on the next head (36c67de, seen 07:5x CET)
- b0b5c7c..36c67de = 2 commits, 2 files: **665bfba** (test-only: [F3-no-literal] allowlists BROODY_NEST_MAX_CENTS + BROODY_SLOTS, D-HOE-20261030-01) and **36c67de** (m5-rules.ts: guard relaxed to `>= 0`, D-HOE-20261030-02, "0 is valid, AC-P17"; supersedes 10d1e28).
- **Flag for the next check (spec inconsistency, not a code defect):** the pause spec contradicts itself. L164 and L218 say `rest_recovery_mult` must be in **(0, 0.35]**, while L204 and AC-P17 (L341) give card copy for `rest_recovery_mult` = 0. HoE ruled `>= 0` (engineering/decisions.md L315–317, D-HOE-20261030-02, 07:50 CET). Accept the code on that ruling, but ask PM Workers for a spec erratum so L164/L218 read [0, 0.35]. Otherwise the V5-S pause rows have two oracles.
- Fast path: (1) body has a trace table + Post-CCR delta (ecf8297 → new head); (2) diff b0b5c7c..head = only those 2 commits (or explained extras); (3) tsc + the same 6 files: the 1 failure gone; (4) re-run K4' (`>= 0` → `> 0` must fail the new AC-P17 case, and `>= 0` dropped must fail the -0.25 case), K5, P1, plus one mutation on the allowlist (e.g. allow any literal in m5-fields.ts → must still fail on a new bare literal); (5) CI once Ready; (6) artifact sha256sum -c if the Architect gates the head.
- Scripts are kept for reuse: `pr82-b0b5c7c/run.sh`, `mutate.py`, `mutrun.sh` (change the worktree path/sha).

## Checks run vs not run
Run: head/Draft/CI; ancestry; Post-CCR first-parent list; files vs #80 head; remerge-diffs; 0.35 citation; tsc; vitest on 6 files; 7 mutations.
Not run: full suite, test:slow, build, check-globals, verify-24h goldens (baseline only; superseded head). No artifact for b0b5c7c to sha256sum -c. No merge verdict (by instruction).
