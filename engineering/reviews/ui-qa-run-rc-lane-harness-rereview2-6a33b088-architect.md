# Re-review 2: UI QA run-rc lane-harness delta since 0e080e5c (frozen run-rc.sh 4a915d4e, REVIEW 6a33b088)

- Reviewer: Senior Software Architect, second reviewer (rule 22: no Claude review). Date: 2026-10-30, 09:07–09:20 CET.
- Prior review: `engineering/reviews/ui-qa-run-rc-lane-harness-rereview-0e080e5c-architect.md` (findings + addendum).
- HoQA input: `qa/m3-recheck/ui-harness-delta-4a915d4e-hoqa-check.md` (sha256 49cd32db056adb6a99ca25f91b39a5cd51375a29765012b5f892fe65ac445c6c, HoQA check PASS). I read it after forming my own findings; agreements and disagreements are listed in its own section below.
- Safety: static review only. I ran nothing from the harness, no self-test, no vitest, no browser, and sent no signals. Commands: sha256sum/sha1sum (`-c` included), cat/sed/grep/rg, read-only `git show` / `git grep` on game objects. No lane-run or lane-kill call.

## VERDICT: PASS. 0 Blockers, 0 Majors, 5 Minors, 6 Nits.
- Every open finding from 0e080e5c (N-M1=MJ1, N-M2, MJ2, MJ3, m1, m3–m8, m10, N1–N5, N-m1–N-m4) is closed in code. I checked each one against the frozen files (table below).
- **Pre-run (MODE=prerun on 76390f2): GO from the Architect side**, through the §20.2 launch only. HoO cleared MJ2/MJ3 (qa/decisions.md L606) and HoQA passed (check file above).
- The Minors below are not pre-run blockers. A1–A5 go into the pre-RC change set together with m9, the Art-c2 capture code and HoQA's N-a/N-b. run-rc.sh and lib are frozen, so that change set needs a new HoO look and an Architect delta re-review.
- One operational note for the pre-run (A1): if HoO stops main with lane-kill, also check `run/*/` for step dirs that have no `pid` file (see A1).

## Hash checks (09:08 CET, all match)
| Item | Claimed | On disk |
|---|---|---|
| harness/run-rc.sh | sha256 4a915d4e… / sha1 b2b2e400… | 4a915d4e57ea0aec65a90c221cd82d8384d65312480343bcd46b37c48e2883ae / b2b2e400327fec3fa627a796abc58c4f82d05ac6, mode r-xr-xr-x, mtime 08:48:13 |
| tests/run-rc-lane-helpers-REVIEW.md | 6a33b088… | 6a33b088f7c7891080d4b54c673cb097f882b4d3cc696379166179c533bf6869 |
| harness/SHA256SUMS | 6c3628c9… | 6c3628c9cc36ef718c916736cbd035650155b2f89606df0e87641d1ae3be18bc; 972 lines; `sha256sum -c` 0 failures; lists run-rc.sh at 4a915d4e |
| v5-ui/SHA256SUMS | c8b663b1… | c8b663b1cb17a96faf89c9091e1bb57a5880265b6cbdcdeb6e2aa606d9790d6b; 5 lines; `-c` clean |
| ops/tools/lane-run.sh | 061e7c4f | 061e7c4fa31d46e47a9440becb90ca10e7ac9c46bee8f85aab8339892a1f1901 (= PINS) |
| ops/tools/lane-kill.sh | 9c89ddc0 | 9c89ddc06a1b8d6dd36073c65084d2d2156dab031291bdc9ff557abf644d3817 (= PINS) |
| selftest-20261030-085726-full/SHA256SUMS | cacf4939… | cacf4939e33b10ca1c9dc9f36096e2023ed97eedeafe4ce5de7cafda63338ed5; top-level and nested 4-halt/, 5-pw-browser/, 6-step-guard/, 7-main-halt/ sums all `-c` clean |
| tests/run-rc-delta-0e080e5c.diff | +66 −43 | +66 −43 (sha256 42738662…) |
| tests/lib-delta-0e080e5c.diff | +124 −42 | +124 −42 (sha256 e4c9eab4…) |
| lib hashes printed in selftest-full.log L2-7 | — | the same as REVIEW §20.7. All lib mtimes (≤ 08:44:27) and run-rc (08:48:13) predate the self-test start (08:57:26), so the self-test ran on the frozen code |

## Closed findings, checked against code
| Finding | Status | Evidence |
|---|---|---|
| **N-M1 = MJ1** mkvariant via step → 127 | CLOSED | run-rc.sh:214 `mkvariant` is a function called directly by `vrun` (:216), and its two halves are real lane-run steps: `step flags-$v bash lib/mkvariant-flags.sh …` and `step build-$v bash -c …` (:215). The body was moved verbatim into lib/mkvariant-flags.sh:8-20, identical to the 0e080e5c heredoc. Runtime guard: lane-proc.sh:51 HALTs if lrun's command word is a function, builtin, keyword or alias, before lane-run runs; :66 HALTs on 127; :67 HALTs on 75 with a lock. Evidence: PART6 11/11 (G2 function → HALT, nothing started; G3/G4 127 → HALT; G5 real mkvariant-flags edit) and the vdry run (steps.tsv: flags-m4off 0, build-m4off 0, `m4.1+76390f2+dirty`; zg-on flags exit 1 "flag path absent", as expected before #82). |
| **Step-guard vrun overwrite fix** | CLOSED | `step` sets the globals `n`, `s`, `e` (run-rc.sh:122). vrun now uses `local vn ve` (:216) and mkvariant uses `local v` (:214). Because of bash dynamic scoping, the old local name was overwritten by step's `n=`. I found no function called from mkvariant/vrun that assigns `v`, `vn` or `ve` without `local`: lrun, postcheck, lkcall, lkrequery and stoplist all declare their own locals. PART6 G5 "vrun logged 'variant-m4off exit=0'" confirms it. |
| **N-M2** gates vitest runs serve-own | CLOSED (option a) | run-rc.sh:188-190 `--exclude` for serve-own.test.ts and verify.test.ts, logged to summary.txt and run-rc.log. vitest in the RC worktree is 2.1.9, and its CLI has `--exclude` ("Additional file globs to be excluded from test"; `cliExclude` in dist/chunks/resolveConfig*.js), which is added on top of the config's `exclude`. Stale builds are moved out at :166-167. See A3 for the missing fail-closed check. |
| **MJ2** leaderless survivors | CLOSED | lane-step.sh:18 `trap ':' TERM` (caught, not ignored, so the child gets the default action). :19 runs the child in the background in the same group, :20 records the child's pid and start time, :22 re-waits while that same child (identity by start time, not a zombie) lives, :23 gets the real status. No signal is sent from lane-step. Survivors from lane-kill's "group members remain" line are copied into the stop list (lane-proc.sh:22-25). Evidence: 4-halt/s1 STOP-LIST lists the live leader 686333 as a lane-kill line plus child 686344; s2 lists survivor 695338 with start time 614909. 7-main-halt cleanup shows lane-step wrote the child's 143 after waiting. The `wait` re-read works in practice: the vdry step exits 0 and PART7 records 143 (HoQA also probed it on bash 5.2.37). |
| **MJ3** main launch / TERM | CLOSED | The documented launch is in the run-rc.sh:4-14 header and REVIEW §20.2. main_selfcheck (lane-proc.sh:88-91, run-rc.sh:119) needs `$$` plus its start time as the last line of `.pids/$QA_MAIN_LANE.pids`. The HALT-dir refusal is at :120. main_traps (lane-proc.sh:92, run-rc.sh:121) maps TERM to run_halt, and its stdout is first re-pointed because the tee dies. on_main_exit makes rc≠0 a HALT (lane-proc.sh:74). PART7 19/19: m1/m2 refusals write no HALT; M3 lane-kill main gives exactly `TERM 747229 (group)` rc 0, then HALT, HALTED.json, a stop list naming the stub leader 747277 and child 747285, the renames, and wk/ untouched; the main group is then exactly `GONE` rc 0, so the lane driver and tee died with main. |
| m1 / N2 exact strings | CLOSED | lane-kill-check.sh:16-17 accept only `TERM <pid> (group)` on the call and `GONE <pid>` on the re-query. lkrequery refuses to call lane-kill while the PID is still the same live process (:26). PART1 20/20. |
| m2 / N-m3(a) settle | CLOSED | lane-kill-check.sh:27-29 re-ask report-only up to LK_SETTLE, never re-signal. s2 "asked exactly LK_SETTLE=3 times". |
| m3 ports | CLOSED | run-rc.sh:295 `P0=5171+10*PO`, used at :299, :301, :303 and :307-309. No literal 5175/5177/5185/5190 is left. A 5171-75, B 5181-85, W 5191-95, all inside the 5171-5199 rule (:55). |
| m4 st26b | CLOSED | Computed once in main (:385) before zgbg_start and the lane drivers. :320 reads `$ST26B_SIZES`. No `step` call remains in run_legacy/run_m5/run_engine/shots/lane (:295-363). See A4. |
| m5 / N-m1 ZG watchdog | CLOSED | :129 `halted && exit 0`; on_main_exit joins `$ZGW` (lane-proc.sh:76). |
| m6 wk/ prune + rc≠0 | CLOSED | lane-proc.sh:78-79 and :74; PART7 shows wk/WK-DONE.json not renamed. |
| m7 / N1 pw-launch fail-closed | CLOSED | pw-launch.mjs:39-40 throw; run-rc.sh:65 unsets the escape hatch. |
| m8 lock cap | CLOSED | lane-step.sh:16 → 75 → lane-proc.sh:67 HALT. |
| m10 real run-rc exercised | CLOSED | MODE=stub (run-rc.sh:158-160, PART7) and MODE=vdry. |
| N3 / N4 / N5 | CLOSED | :88 flock before any wk/ write; :359 `halted && return 1`; decisions L574/L578 quoted. L593's last sentence does record "HoO also OK'd trap ':' TERM (no forward)", and L606 is the 09:09 clearance. |
| N-m2 own-server stops after halt | CLOSED (documented) | lane-proc.sh:30, lane-kill-check.sh:13. |
| N-m4 audit forms | CLOSED | audit-no-pattern-kill.sh:35-36 (`detach`, `proc-enum`); forms 36/36; full tree 0 violations. The 8 violations in the SUPERSEDED 084838 run were resolved by narrow per-file allowlisting of self-test `eval` and single-PID `/proc/$X/stat` reads, not by weakening a rule (the substitution is by substring, so `/proc/[0-9]*` or `/proc/*` still trips). See n5. |

## Core properties
- **Kills only PIDs it recorded through lane-run:** the only signal path is `$LANE_KILL` in lkcall (lane-kill-check.sh:22). It is called only from lstop on a PID from the run's own pidfile while that PID is alive with its recorded start time (lane-proc.sh:33-36; vstop/p62 :294/:304; ZG :129; browser watchdog :59-61). The re-queries are report-only.
- **No ps/awk/pgrep walks:** my rg over run-rc.sh, lib/*.sh, lib/*.mjs and lib/*.py for pkill, killall, pgrep, `ps -`, `kill -`, process.kill, xargs kill, fuser, killpg, setsid, nohup, disown, detached, /proc/[ and /proc/* found only comments. All `/proc` reads are for one PID: alive() :8, stfield :15, lane-step :20-21, and pw-launch statStart. (The pinned lane-kill/lane-run tools walk /proc themselves; that is HoO's pinned code and out of scope.)
- **Never touches Claude processes:** the harness has no reference to Claude, and lane-kill REFUSES any PID that is not recorded for the lane (PART3 (ii): foreign `sleep` 663710 REFUSED and expired with status 0; PART5: the sentinel in the other lane was never signalled and expired with exit 0).
- **Fails safe on GONE with survivors:** lkrequery HALTs after LK_SETTLE re-asks (lane-kill-check.sh:29-31) and the survivors go into the stop list (lane-proc.sh:22-25). PART1 b/f cases and 4-halt s2 confirm it.

## RETALLY disclosure: accepting it without a re-run is sound
- Every part log is inside the cacf4939 sums (nested sums clean), and each part's own `RESULT` line says fail=0. My grep over the folder found no `FAIL` assertion line; the only FAIL is the aggregator's `== FULL RESULT FAIL`. Per part: 20, 36 forms + audit 0 violations, 15, 23, 16, 11, 19.
- The defect was over-strict: it checked for the exact string `pass=18`. It could only cause a false FAIL, never a false PASS, and the code under test was not touched after the run (mtimes, plus the hashes printed in the log).
- A re-run would only re-exercise the same frozen code and cost one more browser launch, so it adds no evidence.
- Caveat (n4): the new check `pass=[0-9]+ fail=0 ` (selftest-full.sh:31) is weaker than an exact count, and PART4 still ignores `$r`. Pin the expected counts per part and AND in rc 0 before the next full run.

## verify.test.ts exclusion: advice for HoQA (HoQA already accepted it at qa/decisions.md 09:08)
- I concur, but for the browser, not the SIGKILL. verify.test.ts:217 and :255 run verify.ts without `--no-shot`, which reaches scripts/verify/shot.mjs:31 `chromium.launch({ executablePath: CHROME ?? '/usr/bin/google-chrome' })` without the pw-launch preload. Playwright starts that browser detached (own group), outside the vitest step's group and pidfile. That is an unrecorded browser, which breaks QA-R21-PW (1)/(4).
- The `p.kill('SIGKILL')` at :426-432 targets the test's own non-detached direct child, which stays inside the lane-run'd vitest group. On its own I would not exclude for that.
- Conditions:
  1. QA_CI_ACK must name a CI run on the exact RC SHA. CI runs `npm test`, which includes both excluded files.
  2. The exclusions are removed once serve-own is fixed (#89) and verify's shot path is either recorded (preload) or skipped by an env switch in the gates.
  3. Keep the per-file include/exclude list (HoQA 09:08).

## Findings (Minors: pre-RC change set, not pre-run blockers)
- **A1, Minor (rule 21 gap, narrow window). A TERM on main while lane-run.sh is starting a step can leave an unrecorded step.**
  - lane-run.sh:15-26 forks `setsid … &` first and appends the pidfile line only after a ≤1 s /proc poll.
  - lrun runs lane-run inside main's or a lane driver's process group (lane-proc.sh:53), so the documented group TERM on main (run-rc.sh:121) kills lane-run inside that window. The setsid'd lane-step and its command keep running in their own session, never recorded and never supervised (the watchdog lived in the dead driver).
  - stoplist (2) (lane-proc.sh:20-21) may still list its child from exit.child, but it labels the leader "the recorded step PID", which is wrong in this case. The leader itself is never listed.
  - Fix: lrun writes `$d/starting` before calling lane-run. stoplist then reports every `run/<n>/` that has `starting` but no `pid`, as "possibly unrecorded start; see exit.child / lane-run.err; HoO decides".
  - Also ask HoO whether lane-run should defer TERM between fork and record (a pinned-tool change).
  - Until then, the pre-run stop procedure: after `lane-kill uiqa-run-76390f2 <main>`, check `run/*/` for dirs without `pid`.
- **A2, Minor (evidence integrity). The MJ3 refusals come after writes into the run dir.**
  - run-rc.sh:109 (`mkdir`, `exec > >(tee -a run-rc.log)`), :111 (DRY-RUN marker) and :114 (`tee -a summary.txt`) run before main_selfcheck (:119) and the HALT-dir refusal (:120).
  - So a bare, non-rule-21 launch, the exact case MJ3 refuses, still appends to run-rc.log and summary.txt of an existing results dir. For a completed RC `results/`, summary.txt is in SHA256SUMS.all, so `-c` on finished evidence would break.
  - The prerun dir is protected earlier by the PRERUN.json refusal (:98), so this is not a pre-run blocker.
  - Fix: run main_selfcheck and the HALT check (they need only PIDDIR/stof and R) before the first write to `$R`.
- **A3, Minor. The vitest exclusion is not fail-closed and has never run.**
  - vdry skips gates. In the RC order, the build (:180) runs before the gates (:186-191), so `dist-qa/assets` exists and serve-own.test.ts:101 (`skipIf(!existsSync('dist-qa/assets'))`) would run if `--exclude` were ever ignored.
  - The risk is low (2.1.9 supports the flag).
  - Fix: after `step vitest`, HALT if `logs/vitest.log` mentions `serve-own.test.ts` or `verify.test.ts`, or run a `vitest list` precheck.
- **A4, Minor (silent coverage loss). If `st26b-sizes` fails, ST-AC26b rows just disappear.**
  - run-rc.sh:385 sets ST26B_SIZES only on success, and :320 then loops over nothing, with no row or UNVERIFIED record.
  - Fix: if the result is empty, write "ST-AC26b UNVERIFIED (st26b-sizes exit=N)" to summary.txt and the m5 gaps, and FAIL under QA_STRICT in MODE=rc.
- **A5, Minor (RC scope; fold into m9). The repo-test process audit was done at 76390f2, not on the RC line.**
  - rc/v5 head 1a61b36 (#82 merged) adds tests/v5-f3-qa-seam.test.ts:6,53 (`spawnSync node scripts/check-release-build.mjs`). That is synchronous, with no signal and no browser, so it should "run", but it is not in the REVIEW §20.4 table.
  - Re-run the audit at the final RC SHA as part of m9, with a reason per file.

## Nits
- **n1:** run_halt's `[pid $BASHPID]` (lane-proc.sh:29) sits inside a pipeline, so it logs the pipeline subshell's PID, not the halting shell's. 7-main-halt/run-dir/HALT shows `[pid 747404]` while main was 747229. Capture `$BASHPID` in a local before the pipe.
- **n2:** main_selfcheck (lane-proc.sh:88) does not tie the `uiqa-run-<sha7>` in QA_MAIN_LANE to `$S7`. Compare them.
- **n3:** stoplist (3) reads a survivor's start time when the list is written (lane-proc.sh:24), not when lane-kill reported it. If the PID is reused, the report-only list can name an unrelated process. Record the start time inside lkrequery at report time and show both values.
- **n4:** selftest-full.sh:31 uses a loose `pass=[0-9]+` and ignores rc for PART4 (see the RETALLY section).
- **n5:** The global allow substrings `/proc/$1/stat` and `/proc/$p/stat` (audit-no-pattern-kill.sh:45-46) apply to every file. Scope them to lib/lane-proc.sh, as was done for lane-step.
- **n6:** Stale "ports +0/+1/+2" labels at run-rc.sh:37, :388, :390 and :391 (the ports are now P0 blocks). I also concur with HoQA's N-a (old bare launch line in run-rc.sh:2-3) and N-b (stale `'TERM <pid>'` in run-rc.sh:26).
- Advisory: after main_traps, pre-flight exits 2/3/4 (axe sha, git fetch, unknown vdry variant, m5dry build) become HALTs that lock the dir until HoQ moves it aside. Consider a "refused before any step started" class.

## Still-open items (UI QA's list)
- **m9** (repo-script snapshot plus the repo-test audit on the final RC SHA): an RC blocker, not a delta or pre-run blocker. It must land in the pre-RC change set (with A5).
- **Art-c2 browser capture code** (p2.mjs): not a delta blocker. It blocks only the Art-c2 row at the RC (UNVERIFIED until coded). Because it is harness code, it goes into the pre-RC change set under a new HoO look and an Architect delta.
- **22eac98 badge baseline:** not a delta blocker. It is wired inside run-rc's supervised path (`b p2base-…`, run-rc.sh:338, minbase build :240), so run it through the documented launch, not as a hand-run `p2.mjs`. Until it runs, badge position stays UNVERIFIED.

## Agreement with the HoQA check (49cd32db)
- I agree with every FIXED/VERIFIED row, the retally arithmetic (140/140), and N-a to N-d.
- I add A1–A5 and n1–n5, which HoQA did not raise. None of them changes the pre-run go.
- On HoQA's N5 note: I confirm L593's last sentence records HoO's OK of `trap ':' TERM (no forward)`.
- On the ops-log L642 Claude reviewer item (pidfile forgery by the same user): under rule 22 it is not a gate; it is for HoO.
