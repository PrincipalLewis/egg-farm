# Architect re-review: UI QA harness-rc re-freeze, run-rc bb28040f (delta from fc2f7a65)

- Reviewer: Senior Software Architect, Egg Farm Studio. 2026-10-30, 10:55 CET.
- Scope: a static, read-only review of `artifacts/v5-ui/harness-rc/`. I ran no harness, browser or test, signalled nothing, and committed nothing. The only commands were sha256sum / `sha256sum -c`, rg, find and reads. Every file was read as data.
- **Scope narrowed by HoQA (10:54 CET):** the verdict covers the **22eac98 baseline (MODE=r17base) path only**, because that baseline runs on bb28040f now. I also report the rest of the delta (B-1, B-2, lane-step, rule 21), but HoQA's RC-path adoption is decided separately.
- Supersedes my earlier PASS: `ui-qa-harness-rc-fc2f7a65-architect.md` (6873c105…). That PASS is VOID after HoQA's FAIL QA-D-1030-HARNESS-RC-5 (13a265d4…). I missed B-1 and B-2 in that review.

## Verdict: **PASS for 22eac98 baseline scope**

- The r17base path cannot touch pre-run state. It refuses before any write when the launch is wrong. Its B4 order is correct: summary done line, then SHA256SUMS, then `-c`, and nothing writes into a signed file afterwards.
- B-1 and B-2 are fixed. The lane-step 255 change meets HoO's condition. The rule-21 properties hold.
- **Out of scope, KNOWN (HoQA 10:54; UI QA found them and they go into the next re-freeze), not new findings:**
  - B4 order is still wrong on the manifest paths for prerun (run-rc.sh:474), m5dry (:477) and RC (:497/:499).
- New for the RC path (not baseline scope), for HoQA: **F1, an unknown MODE falls through to the RC path** (§6). The baseline is not affected when it is launched as PROCEDURE documents.

## 1. Integrity (all verified)

| item | claimed | found |
|---|---|---|
| run-rc.sh | bb28040f… | bb28040f4fd70393a47f211c23a8113e93675e3124d732a61ec78dc87244f8c3 (r-x, mtime 10:11:38) |
| lib/lane-step.sh | 605f1e52… | 605f1e529f8c82f45b73ab1d9fb582e1402f1e1e0f1e9820a7853a6c2bb73cdf |
| lib/third-lane.sh | e8415ba2… | e8415ba2838a4a969220be9c7fa0317f9e98da87276789a65c2e610ed52c4d8c |
| other lib | unchanged | lane-proc 14de85f8, lane-kill-check 19ddcad9, pw-launch 6510c5a2, wk-preflight 12b5b0ab, mkvariant-flags bd60aa34: all equal my fc2f7a65 values. Only lane-step and third-lane changed after 09:45 |
| REVIEW (tests/run-rc-lane-helpers-REVIEW.md) | 10c7a888… | 10c7a88813d0a330bccb9008c8aa8dd04032beafe97bc602700dda291b007d50; §21.1a L774, §21.2 L779, §21.2a L822 |
| SHA256SUMS | e646c036…, 209 | e646c03629d4f83f4e299ccd2088ae549764b8fe768c6bfc1726a5bc37e4c577, 209 lines. `sha256sum -c` is clean. No unlisted file apart from the self-test folders, which REVIEW §21.1a/§21.2a anchor by hash |
| self-test 101638 SUMS | f6eeec0e… | f6eeec0e60ed8cbe5ea27a7ff2d164f1822a08c54b940b4ce28ac9b55c12d1bf, 265 lines. `-c` is clean, and the nested 4/5/6/7/8 sums are OK |
| harness/ (frozen pre-run) | 6c3628c9 | SHA256SUMS 6c3628c9…, `-c` clean; run-rc.sh 4a915d4e |
| ops/tools pins | 061e7c4f / 9c89ddc0 | lane-run 061e7c4f…, lane-kill 9c89ddc0…, PINS.txt 08a30ce9: unchanged |

**Self-test freshness:**
- It started 10:16:38 CET (selftest-full.log:1). The last code edits were run-rc 10:11:38, lane-step 10:11:51, third-lane 10:11:59, selftest-full.sh 10:13:24 and selftest-main-halt.sh 10:15:54.
- The printed hashes (log:2-12) equal the current files.
- third-lane.sh is not in PART0's printed list (nit n3). Its mtime is before the start, and the new STILL CLOSED log lines in third-lane.log show the new version ran.
- Files edited after the start are docs only: plan/plan.md and case-index.md at 10:43 (§21.2a), and REVIEW and SUMS at 10:47. No self-test part reads plan/.

## 2. Line-by-line check of the claimed changes

| claim | evidence | result |
|---|---|---|
| :59-61 early unconditional prerun refusal | :61 `[ "${MODE:-rc}" = prerun ] && { …; exit 2; }`. It runs right after `set -u` (:58), before argument parsing (:63), SEG (:64), R (:87), any mkdir/lock/write and main_selfcheck | OK |
| :88-92 under_prerun guard | :90 PRERUN_GUARD = prerun-p2 (hard-coded from ROOT, not env). :91 `realpath -m` prefix match, so symlinks resolve. :92 refuses R before any write. QA_PRERUN_GUARD_EXTRA only adds a guard | OK (nit n1) |
| :96-97 guard for the wk out dir and wk lock | The same check on R/wk/ and `${R%/}.wk-run.lock`. Defence in depth: the paths are under R, which :92 already checked | OK |
| :139-142 WK lock after main_selfcheck | :123 main_selfcheck, :124 HALT, :127-138 input checks, then :140 mkdir + `exec 8>` + `flock -n`. The lock now sits in results/wk.wk-run.lock, never prerun-p2 | OK |
| lane-step :28-29 | :27 keeps the interrupted value and writes .note if the second wait is outside 0..255. :29 records 255 + .note if neither value is in range. :30 the exit file is always 0..255 | OK |
| header :36 | The MODE=prerun fallback is gone. It now reads `ENGINES=webkit QA_CI_ACK=... ./run-rc.sh <sha> --lane wk (RC)` | OK (nit n2) |
| d1 | REVIEW L709: W on .browser-test-2.lock, which matches lanelock :173 | folded in |
| d2 | run-rc.sh:130-131 comment: MODE=rc + QA_DRYRUN=1 always refuses at B2 | folded in |
| d4 | REVIEW §21.1a L775-777 (5be387b7, 541de658) and §21.2a L829 (f6eeec0e) | folded in |

## 3. Matrix: --lane × MODE × QA_DRYRUN

Code read in order:
- :61 refuses prerun.
- :64 rejects any SEG other than main/wk (exit 2, nothing else evaluated).
- :70-83 validate MODE, SEG and steps.
- :87 picks R; :92 runs the guard; :123 runs main_selfcheck.
- :124-138 are the input checks; :139-142 handle the WK lock.
- :143 is the first write (mkdir R).
- `--lane wk`, `--lane=wk` and `SEG=wk` are equivalent (:63).

Lock and port rules:
- Lane A uses LOCK `.browser-test.lock`. Lanes B and W use LOCK2 `-2`. Lane T uses LOCK3 `-3` (:173). main step() takes no lock.
- Ports apply only in run_legacy: P0 = 5201 + 10·PO (:354). The A/B/W/T port blocks never overlap harness/'s 5171-95.
- `.browser-test(-2).lock` are box-wide serialisation locks shared by design (lane-step `flock -w`). They are not pre-run state.

**BASE** = the combinations the 22eac98 baseline uses.

| # | lane | MODE | DRY | out dir R | lock(s) | ports | refused before write? | touches pre-run? |
|---|---|---|---|---|---|---|---|---|
| 1 | main | rc (unset/"") | 0 | v5-rc-ui/<S7>/results/ | A LOCK, B LOCK2 (PARALLEL=0: A only) | A 5201-05, B 5211-15 | :66 SHA, :92, :119, :123 lane uiqa-rc-<S7>, :124, :127/:132 B2, :133 axe, :138 B3 | reads only: :430-437 PRERUN.json, carry-over.py (writes OUTD=$LR only), `cp -a` FROM prerun |
| 2 | main | rc | 1 | v5-ui/dryrun-rc-<S7>/run-rc/ | — | — | always at :132 (d2) | no |
| 3 | any | prerun | any | not computed | — | — | :61 exit 2 (m6a/m6b/m6c) | no |
| 4 | main | vdry | 0 | — | — | — | :75 | no |
| 5 | main | vdry | 1 | dryrun-rc-<S7>/run-rc-vdry/ | steps only (no lock) | none | :92, :123, :124, :133, :134 | no |
| 6 | main | stub | 0 | — | — | — | :75 | no |
| 7 | main | stub | 1 | dryrun-rc-<S7>/run-rc-stub-<ts>-<pid>/ | A step, no lock | none | :92 (m6d), :123; QA_STUB_REFUSE gives REFUSED.txt (:188) | no |
| **8 BASE** | **main** | **r17base** | **0** | **v5-rc-ui/r17-badge-base-22eac98/** | **T LOCK3 (browser steps); setup/build steps unlocked** | **none used (T block 5231-35 reserved, run_legacy not called)** | **:66, :92, :105 SHA==V5_BASE, :106 BASELINE.json exists, :123 lane uiqa-run-22eac98 needs MODE=r17base + S7=22eac98 (lane-proc.sh:108), :124 HALT, :127 ack, :133 axe** | **reads only: tl_wkphase (third-lane.sh:11-20) before every lane-T launch** |
| 9 (BASE dry) | main | r17base | 1 | dryrun-rc-22eac98/run-rc-r17base/ | T LOCK3 | none | as #8 except :106 | reads only (gate) |
| 10 | main | m5dry | 0/1 | v5-ui/dryrun-rc-m5-<PIECE>-<S7>/ | A/B LOCK/LOCK2 | none fixed | :81 PIECE, :92, :123 … | no |
| 11 | main | other (e.g. PRERUN, Rc) | 0 | **v5-rc-ui/<S7>/results/** | A/B | 5201-15 | only :66/:92/:123/:124/:127/:133. **B2 :132, B3 :138, carry-over :429 and strict ST-AC26b :448 are all skipped** | no. See F1 |
| 12 | main | other | 1 | dryrun-rc-<S7>/run-rc/ | A/B | 5201-15 | as #11 | no |
| 13 | wk | rc | 0 | …/<S7>/results/wk/ | W LOCK2 + results/wk.wk-run.lock (:140, after :123-138) | W 5221-25 | :71, :73, :94 ENGS=webkit, :96/:97, :123-138, then :141 WK-DONE, :142 worktree | reads only (carry-over) |
| 14 | wk | rc | 1 | dryrun…/run-rc/wk/ | — | — | :132, before the :140 lock | no |
| 15 | wk | vdry/stub/r17base/m5dry/other | any | not computed | — | — | :71 exit 2 | no |
| 16 | other | any | any | — | — | — | :64 exit 2 | no |

**Result:**
- No combination writes, locks or creates anything under `artifacts/v5-rc-ui/prerun-p2`.
- No combination opens the pre-run's `wk.wk-run.lock`, which does not exist there now.
- The only accesses to prerun-p2 are reads (carry-over in #1/#13, and the third-lane gate in #8/#9 and the self-test).
- **No blocker.**

## 4. PART7 M6 coverage (13 assertions = m6a 3 + m6b 3 + m6c1 2 + m6c2 2 + m6d 3; 29 → 42 PASS)

**Covered:**
- #3 for both lanes on the live dir: m6a uses `--lane wk`, m6b the main lane. They check exit 2, the refusal text, a read-only before/after listing and the group GONE.
- The same two commands on a scratch copy (m6c1/c2), where the scratch dir stays empty.
- The :92 guard (m6d, through QA_PRERUN_GUARD_EXTRA on #7).
- I checked m6b's 9 "added" paths. They are the live pre-run's own `p62-firefox-375` writes, not ours.

**Missing combinations.** None of them is a pre-run risk, because :61 is unconditional and R is never under prerun-p2 by construction:
- (a) prerun × QA_DRYRUN=1, and the `SEG=wk` / `--lane=wk` forms. These are covered by construction (:61 is first).
- (b) #15, a non-rc MODE with `--lane wk`, which :71 refuses. Not tested.
- (c) #13/#14, a refused `--lane wk` (bad QA_MAIN_LANE, or DRY=1). There is no assertion that no `results/wk.wk-run.lock` is created before main_selfcheck.
- (d) #11/#12, an unknown MODE. Not tested, and not refused (F1).
- (e) The real PRERUN_GUARD path, and symlink resolution in under_prerun. No R can reach it today, and m6d exercises the same function.
- (f) #8 r17base with a wrong lane, or BASELINE.json already present. Not in M6. lane-proc.sh:108 and run-rc.sh:106 are simple to read.

Recommend (b), (c) and (f) as negative cases in the next re-freeze. None blocks the baseline.

## 5. B-2: the R17 log is fresh

- tests/p2-r17-rules.test.log (971df8ae…, in SUMS) has a header from 10:14:26 CET. It ran through lane-run lane `uiqa-selftest-rc-r17unit-101426`; the pidfile line exists, pid 1402853.
- The test and rules sha256 in that header equal the current files (e2201960…, 4275125311…; both mtime 09:31).
- It shows 83 PASS lines and 0 FAIL, then `RESULT 83/83 pass` and `exit=0`.
- Static count: 68 `t('` calls plus 5 `t(\`` calls in a 3-surface loop (:75-80) = 68 + 15 = **83**. This matches.
- It differs from harness/'s 79/79 log (01751440…). **Fixed.**
- Nit n4: it ran on node v24.22.1, not the /workspace/tools v20.19.2.

## 6. Exit status 255 (HoO 10:05: may only be read as fail or halt, never as pass or continue)

Every consumer of a lane-step exit file or code:
- **lane-step.sh:22.** The re-wait `continue` keys on wait's `$?` and `same` (child alive, not a zombie), never on the file. A child that is gone breaks out of the loop.
- **lane-proc.sh:67.** Returns the file value as non-zero, with no success branch.
- **lane-proc.sh:72.** The watchdog overwrites the file with 124. A browser step then HALTs (:73).
- **lane-proc.sh:77-80.** 127 and 75 HALT. Any other value, 255 included, is returned non-zero.
- **lane-proc.sh:24.** The stop list checks only that the exit file is non-empty (step ended), not its value.
- **run-rc.sh step() :150 and b() :178-179.** They record `exit=$e` in steps.tsv; no caller treats non-zero as pass.
- **zgbg_join :163-167.** `-ne 0` → CRASH → rows FAIL.
- **r17base wk-preflight :290-291.** `= 0` or WebKit SKIPPED, so cells stay UNVERIFIED.
- **wk_preflight :420-423.** `-ne 0` → SKIPPED.
- **:448-449.** Only prints the value.
- No Python lib reads exit files (rg over lib/m5/zg/p2/shots). lane-run.sh reads no child status (:20-23).

**Met:** 255 is never read as pass, and no branch continues because of the value. The self-test hit the lost-status case for real: 7-main-halt/run-dir/run/stub-sleep/exit.note says "bash wait returned -1; recorded the interrupted wait value 143". The file read 143, so the "cleanup 143" assertion cannot tell the real status from the fallback (nit n5).

Optional hardening for 5.1: in lrun, `[ -e "$d/exit.note" ] && run_halt "status lost"`.

## 7. Rule-21 properties (re-confirmed)

- Signals go only through lstop → lkcall → `ops/tools/lane-kill.sh`, using PIDs from this run's pidfiles, with exact-match results (lane-proc.sh:38-42; lane-kill-check.sh). run-rc.sh has no direct `$LANE_KILL` call (PART7 static check, log:160).
- No ps, pgrep, pkill, killall, fuser, plain kill, process.kill, setsid, nohup, disown or detached in harness-rc code. The only hits are comments, the audit's own patterns and the inert .orig file.
- The /proc reads are for one known PID each (lane-proc.sh:8,15; lane-step.sh:20-21), plus /proc/loadavg.
- The audit ran over 99 files with violation=0, AUDIT PASS (2-audit-full.log).
- "Claude" appears only in the "never touch Claude processes" comments (run-rc.sh:24, :42).
- harness/ is byte-clean at 6c3628c9, and the pins are unchanged (§1).

## 8. B4 on the r17base path (baseline scope): CONFIRMED FIXED

Order:
- run-rc.sh:295 writes BASELINE.json.
- :303 appends the **done line to summary.txt first**.
- :304 writes SHA256SUMS over every file except SHA256SUMS and the live run-rc.log, then runs **`sha256sum -c --quiet`**. On failure → run_halt, which renames SHA256SUMS to *.HALTED-NOT-EVIDENCE.
- :305 echoes to stdout, which goes only to tee → run-rc.log, then exit 0.

Nothing writes into a signed file after :304:
- r17base runs no ZG background job, no lane drivers and no async writer. Every lrun has blocked to completion, including its postcheck lane-kill.log writes.
- on_main_exit returns at rc 0 without writing (lane-proc.sh:85-91).
- The only file still growing is run-rc.log. It is deliberately unsigned, so later appends cannot break the RC's `r17base_ok` `-c` (:136).

**On "-c passes on its log":** the log itself is not in SUMS by design. Every other file, including summary.txt with the final done line, lanes.txt (gate decisions) and BASELINE.json, is signed and final before SUMS. If HoQ wants the log anchored, they can hash run-rc.log once the process has exited, when they sign the baseline.

Other r17base points:
- The launch line (PROCEDURE:7-8) matches main_selfcheck (lane-proc.sh:108) and run-rc.sh:105-106.
- The worktree /tmp/qa-v5rc-22eac98 is checked HEAD == SHA (:196), and BID must end +22eac98 (:234).
- Every lane-T launch is gated (:174 guard → tl_wait; :289). The pre-run ended at 10:36:32, so the gate now waits on load < 8 only.
- A watchdog stop of a browser step HALTs.
- F1 does not affect the baseline: a mistyped MODE under lane uiqa-run-22eac98 is refused at lane-proc.sh:108.

## 9. Findings

**For HoQA (RC path, outside baseline scope):**
- **F1 (Minor, fail-open on an invalid MODE, RC evidence dir).** run-rc.sh:83 `else` accepts any MODE that is not one of the five known modes, with no allowlist. Example: `MODE=PRERUN` or `MODE=Rc` under lane uiqa-rc-<S7>. That run writes a full run into `artifacts/v5-rc-ui/<S7>/results/`, the RC evidence dir, while:
  - B2 (:132, the QA_CI_ACK exact-SHA check the vitest exclusions rely on) is skipped;
  - B3 (:138) is skipped;
  - carry-over (:429) is skipped;
  - ST-AC26b is downgraded from FAIL to UNVERIFIED (:448);
  - QA_MODE≠rc relaxes the streak cap.
  It does not touch pre-run state. I missed this in fc2f7a65 too.
  Fix (one line, next re-freeze): after :61 add `case ${MODE:-rc} in rc|vdry|stub|r17base|m5dry) ;; *) echo "unknown MODE"; exit 2;; esac`. Interim operator rule: launch the RC with MODE unset or exactly `rc`.

**KNOWN, out of scope (HoQA 10:54):** B4 order on prerun :474, m5dry :477, RC :497/:499.

**Nits (non-blocking):**
- n1: under_prerun uses `${QA_DRYRUN:+…}` (:91), so the extra guard is honoured for any non-empty QA_DRYRUN, not only 1 as the comment says. It only adds guards, so it fails safe.
- n2: header :36 and :422 give the WK fallback without the lane-run/QA_MAIN_LANE wrapper. As written it would refuse at :123, which is safe, but it should show the full launch line.
- n3: PART0 does not print the third-lane.sh or wk-preflight.mjs hashes. Add them.
- n4: the R17 unit test ran on node v24.22.1. Record which node is intended.
- n5: the "cleanup 143" assertion also passes on the fallback value. Assert on the .note, or document it.
- n6: dead prerun branches remain (:74, :144, :356, :425, :468-474). Remove them in 5.1.
- n7: PROCEDURE says QA_DRYRUN=1 writes `dryrun-22eac98/run-rc-r17base/`, but the code writes `dryrun-rc-22eac98/run-rc-r17base/` (:87). PROCEDURE also cites ports 5231-35, which the baseline doesn't use.
- n8: env overrides V5_BASE, R17_BASE_DIR and PRERUN_DIR are honoured in MODE=rc. They are read-only paths, but the RC should be launched without them.

**Observation for HoQA (outside harness-rc):** `prerun-p2/SHA256SUMS.carryover` was written at 10:49:54 CET. That is after the pre-run ended (10:36:32) and after the self-test ended (10:44:29). No harness or harness-rc code writes that name. Please confirm who wrote it.

**For HoO:** nothing new on rule 21. The 255 condition is met (§6). HoO's 10:50 re-clearance hashes equal what I verified.
