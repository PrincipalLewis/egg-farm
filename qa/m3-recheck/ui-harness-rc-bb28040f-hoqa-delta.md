# HoQA delta re-check: harness-rc run-rc bb28040f (after FAIL B-1/B-2 on fc2f7a65), Oct 30 2026

Scope: `artifacts/v5-ui/harness-rc/`, `artifacts/v5-ui/harness/`, `artifacts/v5-rc-ui/prerun-p2/`. Read-only check at about 10:50-10:55 CET: hashes, `sha256sum -c`, diff, rg and sed only. No run, browser, signal or message.
Baseline for the diff: /workspace/qa-v5-scratch/pre-hoqa5/ (UI QA's copy of the fc2f7a65 files). I verified each copy against the hashes from my previous check: run-rc fc2f7a65, lane-step 6e850cec, third-lane 2bf65afc, REVIEW b94354d9. The other files in the old package were checked by name list (/tmp/arch-rc-sums.txt, 209 names = the new SUMS' 209 names) and by mtime (only the 11 files below changed after 09:52).
Previous report: qa/m3-recheck/ui-harness-rc-fc2f7a65-hoqa-check.md (13a265d4…).
Context: HoO re-cleared bb28040f at 10:50 (ops-log, last line), before this check finished.

## 1. Hashes / integrity
| Item | Status | Evidence |
|---|---|---|
| run-rc.sh bb28040f… (r-x) | FIXED | sha256 matches; mode -r-xr-xr-x; sha1 479d04f5 (as in selftest-full.log:2) |
| lib: lane-step 605f1e52, third-lane e8415ba2; lane-proc 14de85f8, lane-kill-check 19ddcad9, pw-launch 6510c5a2, wk-preflight 12b5b0ab unchanged | FIXED | all match |
| REVIEW 10c7a888…, SHA256SUMS e646c036… (209) | FIXED | `sha256sum -c` 209/209 OK. Unlisted files are only the self-test folders, which carry their own SUMS. 0 missing. Names are identical to the fc2f7a65 list |
| self-test 101638 SUMS f6eeec0e… (265) | FIXED | `-c` clean; 265 listed = 265 on disk; 0 unlisted |
| harness/ 4a915d4e, byte-clean | FIXED | run-rc 4a915d4e; SUMS 6c3628c9 `-c` clean; 972 listed = 972 on disk |
| ops/tools vs PINS 08a30ce9 | FIXED | lane-run 061e7c4f, lane-kill 9c89ddc0 |

## 2. B-1: MODE=prerun refusal
| Item | Status | Evidence |
|---|---|---|
| Refusal is the first executable statement after `set -u` | FIXED | run-rc.sh:1-57 are comments only (rg); :58 `set -u -o pipefail`; :61 `[ "${MODE:-rc}" = prerun ] && { echo …; exit 2; }`. This comes before argument parsing (:63), so it covers every SEG/--lane, and before any mkdir/lock/write |
| MODE never re-set to prerun later | FIXED | The only assignment is :68 `MODE=${MODE:-rc}`. No lib sets MODE |
| --lane wk is MODE=rc only | FIXED | :71 |
| No path can resolve under prerun-p2 | FIXED | :87 R assignment has no prerun branch. :90-92 `under_prerun` (realpath -m prefix) refuses an out dir under prerun-p2 with exit 2. :96-97 does the same for wk/ and the wk lock. QA_PRERUN_GUARD_EXTRA only ADDS a guard, dry runs only (:91). :103 PRERUN_DIR is read-only (cp *from* it at :433/:437) |
| WK lock moved after main_selfcheck | FIXED | :139-142 (lock, WK-DONE check, worktree check) come after the selfcheck/input checks; the old :92-94 are gone |
| Header :36 fallback deleted | FIXED | diff: old :36 removed; :50-53 now say "MODE=prerun: REFUSED in harness-rc" |
| "no prerun branches left" | OPEN (nit, non-blocking) | The prerun R/default-SHA/P2_HEAD branches are removed as claimed. Still present but **unreachable** (refused at :61; MODE never reassigned): :74 (defensive refusal, labelled unreachable); :144 `LR=$R` when prerun; :356 and :425 prerun conditionals; :468-474 the prerun manifest/SUMS writer. They are dead code: even if reached, R can never be under prerun-p2 (:92). Recommend deleting them at the next code touch. I'm not asking for a re-freeze just for this |

## 3. M6 tests (retallied from raw logs, tests/selftest-20261030-101638-full/7-main-halt/)
| Item | Status | Evidence |
|---|---|---|
| m6a: real harness-rc, `ENGINES=webkit MODE=prerun … run-rc.sh --lane wk` | FIXED | selftest-main-halt.sh:81-82 ($HN/run-rc.sh). Log :54-60 shows rc=2 with the :61 text "refuses MODE=prerun (any --lane/SEG)" (unique to :61; :74 has different text), then GONE. m6/m6a.rc = 2. m6a-prerun-added.txt is EMPTY; the only newer file is lane-kill.log, which names no harness-rc lane (rg: no uiqa-selftest-rc/uiqa-rc-/harness-rc anywhere in prerun-p2) |
| m6b: main segment `MODE=prerun … run-rc.sh <sha>` | FIXED | log :61-67 shows rc=2 with the :61 text, then GONE. The "added" paths are all the live pre-run's own p62-firefox-375 outputs (it was running then); none is wk/ or a lock |
| m6c1/m6c2: scratch copy, prerun path replaced | FIXED | log :68-76: 2 paths replaced, 0 left on code lines; rc=2 both times, scratch dir 0 entries; GONE |
| m6d: path guard (dry stub, extra guard) | FIXED | log :77-81: rc=2 "under the pre-run dir", stub run dirs 8→8, GONE |
| Count | FIXED | 13 M6 assertions (3+3+2+2+3). PART7 raw PASS=42 FAIL=0 (29+13) |

## 4. B-2: r17 unit-test log
| Item | Status | Evidence |
|---|---|---|
| Fresh log, 83/83, exit 0 | FIXED | tests/p2-r17-rules.test.log mtime 10:14:26. Header: lane uiqa-selftest-rc-r17unit-101426, node v24.22.1, test sha256 e2201960… (= current tests/p2-r17-rules.test.mjs). Raw PASS lines 83, FAIL 0; "RESULT 83/83 pass"; "# exit=0" |
| Test file has the new cases | FIXED | tests/p2-r17-rules.test.mjs:66-73: exception+SR pass → FAIL (L1454), never INFO, fit360 → FAIL routed to HoP, docked bare countdown FAIL, pin L1454. Test file and p2/r17-rules.mjs (42751253…) unchanged since 09:31 |

## 5. Diff fc2f7a65 → bb28040f: every change explained
| File | Change | Status |
|---|---|---|
| run-rc.sh | B-1 (:59-61, :68, :71, :74, :87-92, :96-97, :139-142; removed old :64, :73-75 branch, :103-105); header :21/:23/:38 (lane T lock, uiqa-rc- names, LOCK2 for W), :50-53 prerun text; d2 comment :130-131 | FIXED, all listed |
| lib/lane-step.sh | :28-29 range check of the first wait (nit) | FIXED, listed |
| lib/third-lane.sh | tl_wait logging: PAUSE, STILL CLOSED every TL_LOG_EVERY=300 s, CET stamps (HoQ 10:09, REVIEW §21.2 :801). The gate condition (tl_open, load < 8, WK phase) is unchanged | JUSTIFIED (explained) |
| tests/selftest-full.sh | PART7 pin 29→42; TL_WAIT_MAX=10800; PART6/7 moved before the gated browser parts (HoQ 10:09) | JUSTIFIED (explained) |
| tests/selftest-main-halt.sh | M6 block :73-111 + header | FIXED |
| tests/p2-r17-rules.test.log | B-2 re-run | FIXED |
| docs/r17-badge-baseline-22eac98-PROCEDURE.md:12 | worktree /tmp/qa-v5rc-22eac98 | FIXED (nit) |
| plan/plan.md :1, :55 / plan/case-index.md :1, :35 | TP1-R17c pinned by line sha1 4b972918… (decisions.md file-sha1 nit) | FIXED (nit) |
| plan/plan.md :134, :183 / case-index.md :228 | REG-9/axe62 "Chromium-only by ruling QA-D-1030-PRERUN-TRIAGE (c)". Not on the parent's list, but it is a HoQ ruling (qa/decisions.md:631 (c)) disclosed in REVIEW §21.2a :823-824. Plan text only, no code | JUSTIFIED |
| REVIEW, SHA256SUMS | §21.1a (d4), §21.2 (incl. d1 lane-W lock :790, audit count 94 = 89 + 5 run-1 generated scripts :797), §21.2a | FIXED |
| Nothing else | The other 198 entries are unchanged (mtime < 09:52 and same name set). Self-test inputs predate the run: run-rc 10:11:38, selftest-main-halt 10:15:54, selftest-full 10:13:24 < start 10:16:38. Plan files (10:43) are docs only | FIXED |

## 6. Kill-path audit on the changed files
| Item | Status | Evidence |
|---|---|---|
| run-rc.sh, lane-step.sh, third-lane.sh, selftest-full.sh, selftest-main-halt.sh | FIXED | rg for pkill/killall/pgrep/pidof/plain kill/ps/process.kill/setsid/nohup/disown found nothing except a comment (run-rc.sh:24). `awk` is used only for numeric/text parsing (third-lane.sh:23 load compare; selftest pin/pidfile reads of their own lanes; run-rc :176, :207); there are no process walks. M6 sends no signal: lane-kill is used only as a GONE re-query (selftest-main-halt.sh:79). Self-test audit 2-audit-full.log: files=99, violation=0, AUDIT PASS |

## 7. lane-step and third-lane
| Item | Status | Evidence |
|---|---|---|
| lane-step | FIXED | lib/lane-step.sh:22-30. The interrupted value is kept when the 2nd wait is out of range (:27). If neither wait gives 0..255, it records 255 plus a `.note` (:29). `exit $e` is always 0..255. There is still no kill: `trap ':' TERM` (:18). Kill semantics are unchanged |
| third-lane | JUSTIFIED | Logging/timeout only (see §5). The 101638 gate log shows PAUSE 10:25:24 (load 21.68, pre-run WebKit phase), STILL CLOSED 10:30/10:35/10:40, OPEN 10:42:46 → PART5 and 10:43:28 → PART8, both after "pre-run ended" (PRERUN.json 10:36:32) |

## 8. Self-test 101638 retally (raw logs)
PART0 pins PASS; P1 20/0; P2a 36/36; P2b files=99, violation 0; P3 15/0; P4 23/0; P6 11/0; P7 42/0; P5 16/0; P8 12/0; every part rc=0; FULL RESULT PASS at 10:44:29 (start 10:16:38). selftest-full.log:2 pins run-rc bb28040f and lane-step 605f1e52. Status: FIXED.

## 9. Pre-run evidence (prerun-p2)
| Item | Status | Evidence |
|---|---|---|
| SHA256SUMS -c fails only on ./run-rc.log | CONFIRMED | 2226 entries; `sha256sum -c` gives exactly 1 failure, `./run-rc.log: FAILED` |
| SUMS hash for run-rc.log = current file minus its final line | CONFIRMED | SHA256SUMS:1029 ccf9f44a8e0786bc…1227. `head -n -1 run-rc.log \| sha256sum` = ccf9f44a8e0786bc…1227 (exact match). The full file is 2a4bd077…. The final line is "prerun results: …/prerun-p2/ (2226 files)", the echo after the SUMS write. Same mtime 10:36:32 |
| Untouched apart from what was reported | JUSTIFIED | No wk/ and no wk.wk-run.lock in prerun-p2. No file names a harness-rc lane. The only file newer than 10:36:33 is **SHA256SUMS.carryover** (10:49:54, 2217 lines), which is authorized by QA-D-1030-PRERUN-TRIAGE (a) (qa/decisions.md:631: original kept, the 9 lines ac-r15-r17/ ×8 + NOT-PRERUN.txt excluded). Its name set = SHA256SUMS minus exactly those 9 entries. `-c` clean, and run-rc.log is hashed in full (2a4bd077). This file is not in the "apart from" list in the request; the ruling covers it. The original SHA256SUMS is unmodified (mtime 10:36:32) |

## Open items (none blocking)
1. Dead, unreachable MODE=prerun conditionals remain in run-rc.sh (:74, :144, :356, :425, :468-474), contrary to "the prerun branches are removed". They are safe (refusal at :61 + path guard at :92). Delete them at the next code change.
2. SHA256SUMS.carryover in prerun-p2 (ruled, verified) should be named in the pre-run report as the evidence manifest (a).

HoQA check PASS
