# HoQA delta review: harness-rc-next (run-rc 71b45fce) vs harness-rc bb28040f
Written 12:0x CET, Oct 30 2026 (Europe/Belgrade). This was a read-only review. Nothing in harness-rc-next or harness-rc was edited, nothing was swapped, and no one was messaged.
Package: artifacts/v5-ui/harness-rc-next/tests/DELTA-FOR-REVIEW.md. Prior review: m3-recheck/ui-harness-rc-bb28040f-hoqa-delta.md (304c6cbc). Rulings checked: HARNESS-RC-6..13, ART-ROWS.
Architect review: engineering/reviews/ui-qa-harness-rc-next-71b45fce-architect.md (62f64a79), PASS. Its open items are ruled in QA-D-1030-HARNESS-RC-13 and listed below as "covered by RC-13". This review adds the defects the Architect did not report.

## VERDICT: FAIL as frozen (1 Blocker). Fixes are small and fold into the RC-13 follow-up freeze; re-check is delta-only.
(a)–(k), RC-12 R1/R2 and the 1280 trace rule are present, correct and tested, except where noted below. The Blocker is a broken import line in csr/csr-spot.mjs: the csr suite cannot start in any engine or width. The self-test cannot catch it because it never executes csr-spot.mjs; it only unit-tests focus-ring.mjs.

## 0. Hash verification (all match)
- DELTA-FOR-REVIEW.md 5cee7c7710a4… OK; run-rc.sh 71b45fce29dd… OK; tests/run-rc-lane-helpers-REVIEW.md cc438d5b2bee… OK; SHA256SUMS f0a7fcf741da… OK.
- `sha256sum -c SHA256SUMS`: rc 0, 221 lines, all OK. The file lists DELTA-FOR-REVIEW.md 5cee7c77.
- Self-test 113736 SHA256SUMS 44d17e95c710… OK; its `sha256sum -c` rc 0. selftest-full.log reports FULL RESULT PASS with all 16 parts.
- k-docked-diff.patch 564e0093… OK; rc12-diff.patch e4b8ef9d… OK; REBASELINE-CASES.txt 434d5d09… OK.
- All 34 old→new rows of the DELTA §1 hash table verified against both trees by script.
- harness-rc (bb28040f, SUMS e646c036) still passes `sha256sum -c` rc 0, so it is untouched.
- Scope: `diff -rq harness-rc harness-rc-next` shows exactly the 21 changed, 12 added and 1 removed files (.pyc) in DELTA §1, plus DELTA-FOR-REVIEW.md and the selftest folders. Nothing outside the listed items changed.
- I re-ran PART2c/2d/2e/2f/2g in a scratch copy (/tmp/hoqa-delta/h) under lane hoqa-delta (pid 2508428, node v24.22.1). Results: 16/0, 9/0, 96/96, 11/0, 15/0, all rc 0. lane-kill re-query was exactly "GONE 2508428" rc 0.

## 1. Required fixes (numbered)
1. **BLOCKER: csr/csr-spot.mjs:7 has lost two imports.**
   - The RC-7 edit appended `// (d) RC-7` before `import http from 'node:http';import {join,extname} from 'node:path';` on the same line, so both imports are now inside a comment.
   - :15 uses `http.createServer`, `join` and `extname`.
   - Reproduced in scratch (lane hoqa-delta, pid 2521612, GONE rc 0) with a stub playwright-core and no browser:
     - harness-rc-next: `ReferenceError: http is not defined at csr-spot.mjs:15:17`, rc 1.
     - bb28040f: gets past :15 and fails only at the stub's `.launch` (:17).
   - ESLint no-undef over the 7 changed or new probe .mjs files reports only this file: http 15:41, join 15:158, extname 15:301. Old harness-rc is clean, and p1.mjs, p2.mjs, qa-page.mjs, r17-rules.mjs, farm-view.mjs and focus-ring.mjs are clean.
   - Effect: every `csr-<eng>-<w>` step (run-rc.sh:388) exits 1 before any check. Item (d)'s FF focus fix can never produce evidence, and the csr suite fails at the RC.
   - Fix: put the comment after the imports (or on its own line).
   - Test: add a self-test part that would have caught it, either a no-undef lint or a stub-WT import smoke run of every changed probe .mjs up to the server listen. Then re-run the full self-test.
2. **Minor (required): run-rc.sh:449 breaks its own quoting (Architect n2 edit).**
   - The new `rejoin=` text contains `QA_CI_ACK="<CI-green ref naming <sha>>"` inside the double-quoted `python3 -c "…"`.
   - Bash ends the string there and parses `<CI-green` as an input redirect. Reproduced by running the exact line in a scratch dir: `CI-green: No such file or directory`, python not run, rc 1, and no engines/webkit.SKIPPED.json.
   - Per RC-13 item 2 a WebKit preflight failure blocks the RC anyway. So this is not a false PASS, but the WebKit-skip record and its rejoin instructions are lost and a stray error lands in run-rc.log.
   - Fix: escape the quotes (or drop them from the text).
   - Test: run the extracted line on a scratch RTOP and assert that the JSON parses.
3. **Minor (required, gate (i) hole): lib/r17base-gate.py:43-44 accepts a cell with as few as 1 of 7 measured boxes.**
   - All 7 SCENES have N>0, and the accepted 390 cells have 7/7 boxes.
   - The p2base step exits 0 even when assert-tab fails: the bb28040f 1280 cells had exit 0 with 1 pass and 7 fails. So "exit 0" proves nothing about the asserts.
   - A cell with 6 null scenes would pass the gate and surface only as UNVERIFIED badge-pos rows at the RC (r17-rules.mjs:14).
   - Fix: require a box in every scene, or require fail==0 from the cell's done record, plus a negative fixture `one-null-scene` in PART2f.
   - The current gate correctly refuses the real 12/15 baseline: I ran it read-only against r17-badge-base-22eac98, and it refused the three 1280 cells with "no measured badge box" (rc 1).
4. **Minor (required, R3 procedure): the full 15-cell re-baseline is not written down, and it cannot run without a move-aside.**
   - run-rc.sh:124 refuses MODE=r17base while r17-badge-base-22eac98/BASELINE.json exists.
   - n8 (:66) forbids an R17_BASE_DIR override in MODE=rc.
   - So the accepted 12/15 folder (SUMS 8fbd6245) must be renamed with my sign-off before the re-run, e.g. to r17-badge-base-22eac98-bb28040f-12of15/ (kept as corroboration).
   - Add this R3 step to docs/r17-badge-baseline-22eac98-PROCEDURE.md and REBASELINE-CASES.txt. Today those files still say "HoQ decides whether the baseline is re-run" (REBASELINE :5-6; PROCEDURE "running now … HoQ's call") and "WebKit SKIPPED … RC cells UNVERIFIED" (PROCEDURE :17, contradicted by gate (i)).
5. **Minor (text): REBASELINE-CASES.txt:29 still asks "HoQ to confirm they apply to the tab".**
   - Replace it with RC-12 R1 + the 11:54 clarification (TP1-R17b).
   - plan.md:59 / case-index.md:40: state that Art's c2 reduced-motion refusedFlash row is **Major-on-fail** per QA-D-1030-ART-ROWS. Today only (b) says Major, and the base Art-c2 row still reads "Minor on nav and header".
- **Covered by RC-13 (not duplicated here):** F2 findings=N tally; the 'npm OPEN pending HoQ' strings at run-rc.sh:171 and REBASELINE-CASES.txt:33 become ACCEPTED (confirmed both are still present, Minor); the MODE=rc refusal of the BASE_SHA/P2_HEAD/ZG_BASE_SHA/FLAG_FILE/MANIFEST/MATRIX overrides; atomic swap.

## 2. Per item (harness-rc-next file:line)
| item | status | evidence |
|---|---|---|
| (a) B4 | PASS | lib/manifest.sh (new). mf_flat writes SUMS after the done line, then `-c`, else HALT. mf_rc writes the per-engine manifests, then the final "results" line, then per-dir SUMS + .all, then `-c` on all of them. run-rc.log and MERGED.json are never listed. Call sites: run-rc.sh:331-332 r17base, :497-498 m5dry, :518 rc/wk, all `|| exit 9`. The WK path writes WK-DONE.json after .all (a signing marker holding the .all hash) and echoes to stdout only (:521-523). pipefail is on (:59). Test: PART2c 16/0, re-run by me 16/0. |
| (b) p1 F1-F5 | PASS | p1/p1.mjs:144-147, :177-179, :191-192, :258/:261, :265-266. These match the + lines of p1-test-fix-proposal.md (sha256 5262eca8) token for token; only comments were added. |
| (c) Art rows text | PASS with fix 5 | plan/plan.md:59 and case-index.md:40: c2 maps to secArtC2 (p2.mjs:135); (b) is not covered by an existing check, so it goes to the manual 3-browser RC addendum, Major on fail; new probe for 5.1. |
| (d) csr focus fix | **FAIL (fix 1)** | focus-ring.mjs logic is correct: :focus-visible AND a change from the unfocused style, and the drop shadow never counts. Its negative case is present (PART2d 9/0). csr-spot.mjs:49-58 wiring is correct. But :7 drops the http/path imports, so the probe cannot run. Architect n3 (any shadow change counts) is noted, not required. |
| (e) dead prerun code | PASS | The prerun manifest branch, `elif MODE=prerun` and the run_legacy/lane prerun conditionals are removed. :62 refusal is kept and :172 `LR=$R/legacy/`. PART7 M6 passes. |
| (f) MODE allowlist | PASS | run-rc.sh:63-64, before any write. n8 env refusals at :65-66. PART7 M7 m7a/b/c (PRERUN, Rc, wk) each assert exit 2 and no new path. |
| (g) PART7 negatives | PASS | selftest-main-halt.sh M7/M8. PART7 121/0 (log verified). |
| (h) node pin | PASS | run-rc.sh:72 checks major 24 before any write. v24.22.1 is recorded in toolchain.txt and node-versions.txt, not enforced exactly; that matches RC-9 ("pin + major preflight"). M8 m8a refuses v20. |
| (i) baseline gate | PASS with fix 3 | run-rc.sh:129-131, a pure read before main_selfcheck, plus lib/r17base-gate.py. It refuses: empty or unreadable BASELINE.json; missing cells (15/15); HALT, HALTED.json, REFUSED.txt or *NOT-EVIDENCE*; all-null cells; step exit != 0; tampered SUMS; wrong sha. PART2f 11/0 and PART7 M8. Confirmed against the real 12/15 folder (refused). |
| (j) split toolchain | PASS | run-rc.sh:73-80 preflight; $BP on every npm ci/build: :227, :239-241, :255, :279, :304-305, :346, :354. Static assert in PART7 and G5 in PART6 (fails unless v20). |
| (k) docked precondition | PASS | lib/farm-view.mjs:10-19; qa-page.mjs:39-44 farmFacts with mq `(min-width:960px) and (orientation:landscape)`. Docked is OK only with: hidden attr, static, inside a static #panel-layer, no aria-modal, close hidden, farm visible, no modal. Below the breakpoint the rule is unchanged. PART2g 15/0 covers modal (aria-modal and #modal-layer), non-docked open sheet, fixed, panel aria-modal, visible close, non-static layer, hidden farm, and 390 unchanged ×4. |
| (k) badge target | PASS (note) | p2.mjs:26-34: when docked it uses `#p-upgrades .tabs [data-tab=workers]`, with no substitute target, and records the target. A missing tab gives `{missing:true}` and then a finding. Note: the badge is the first visible numeric leaf inside the tab, not `.asleep-badge` by class. nb.badge.cls is recorded; at the RC I check that it is asleep-badge. |
| RC-12 R1 | PASS | r17-rules.mjs:74-89 (workersNameOk = TP1-R17b: name starts with the visible text and with "Workers N"; N=0 → "Workers"). p2.mjs:36-40 records rt:'finding' and never FAIL/HALT/null; a thrown check also becomes a finding. Used at r17base :76 and RC :60-66. Tests p2-r17-rules.test.mjs:92-108 (+13, 96/96). |
| RC-12 R2 | PASS | run-rc.sh:168-171. Self-test output: node v24.22.1 / v20.19.2, npm 11.21.1, lock sha256 56569550…, scope line. Positive and negative assert in PART7 M3. The string fix is covered by RC-13; the separator cosmetic (disclosure 8) is noted. |
| 1280 pos trace | PASS | r17-rules.mjs:90 DOCKED_POS_TRACE; p2.mjs:62-65: beyond tolerance → finding citing styles.css:627, ≤1px → PASS, no base → UNVERIFIED. plan.md:193, case-index.md:34. |
| exit codes | PASS | selftest-full part()/partc() require rc 0 AND the exact line. All mf_* calls are `|| exit 9`. The lane-step child status is preserved (below). |
| lane-step.sh:22-27 | PASS (HoO owns the helper review) | `while same; do sleep 0.5; done`, then one `wait`. TERM during the poll only interrupts `sleep`, and the loop condition is `same`. Pid reuse is guarded by start time. PART7 asserts 143 with no exit.note. Nit: the comment at :28-30 and the .note text still describe the old interrupted-wait value. A TERM landing exactly on the final `wait` could still record 128+n: a tiny window, Info. |
| PART7 `sleep 1` | PASS | The sleep sits inside the lane-run'd wrapper BEFORE the command, so the leader is recorded (lane-run race). rc is captured after the command, so nothing is masked. |
| REBASELINE-CASES | PASS with fixes 4/5 | Lists the 3×1280 cells (:24-26) and the RC-12 rows (:31-33); R3 full 15-cell is missing (fix 4). |
| Disclosures | noted | The out-of-lane unit run was re-run under a lane. Self-test 112603 is marked SUPERSEDED (correct, not evidence). The .pyc removal is fine. |

## 3. Re-check scope after the freeze (delta only)
- csr-spot.mjs:7, run-rc.sh:449, r17base-gate.py plus its new fixture, docs and REBASELINE text, and the RC-13 items.
- New SUMS and a full self-test that includes the new import-smoke/lint part.
- Then the swap (RC-13 item 4), then the move-aside (fix 4), then the R3 15-cell re-baseline.
