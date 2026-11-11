# Early delta review: UI QA pre-RC change set DRAFT (DRAFT-SHA256SUMS 2289a5d2, draft run-rc.sh 049f9f08, against frozen 4a915d4e)

- Reviewer: Senior Software Architect (rule 22: no Claude review). 2026-10-30, 09:27–09:45 CET.
- Basis: my `ui-qa-run-rc-lane-harness-rereview2-6a33b088-architect.md` (A1–A5, n1–n6, advisory) and the HoQA check `qa/m3-recheck/ui-harness-delta-4a915d4e-hoqa-check.md`.
- Safety: static only. I ran sha256sum/cmp/cat/grep/sed and read-only `git show` / `git grep` / `git ls-tree` in game/. No harness, self-test, browser, lane-run or lane-kill, and no signals. Nothing was edited except this file.

## VERDICT: FINDINGS. Not yet "OK to adopt". 0 Blockers, 1 Major, 7 Minors, 4 Nits.
- **The Major is a regression introduced by the n1 fix:** a comment placed in the middle of run_halt's pipeline means the HALT reason no longer reaches HALT, summary.txt or lanes.txt. Halting still works. Fixing it is a one-line change.
- After the Major and Minors B2–B4 are fixed (B1, B5–B7 can follow), this set is **OK to adopt** as a delta re-check of only those lines. Final PASS comes after adoption into harness-rc/, re-hashed sums, and the full self-test (PART1–8) run on the adopted copy.
- Everything else I checked is fixed: A2, A3, A4, A5, n2, n3, n4, n5, n6, the verify.test.ts conditions, m9, MODE=r17base, and N-m3(c)/(d). A1 is fixed only for steps that go through lrun (B1).

## Integrity (09:28 CET)
- CHANGESET.md 4b157e4a…, ALL.diff 2a1e81a4… (603 lines) and DRAFT-SHA256SUMS 2289a5d25449c2b3… all match. `sha256sum -c DRAFT-SHA256SUMS` gives 30 OK and 0 failures.
- draft/run-rc.sh is 049f9f0854e35e0b…; frozen/run-rc.sh is 4a915d4e…83ae.
- All 13 files in `frozen/` are byte-identical (`cmp`) to their copies in `harness/`, so the draft is diffed against the frozen package.

## Major
- **M1 (n1 regression): run_halt's `| tee` is commented out.**
  - draft/lib/lane-proc.sh:34 reads `run_halt(){ local hp=$BASHPID; mkdir -p "$RTOP"; { echo "HALT … [pid $hp]: $1"; }   # n1: $BASHPID captured before the pipeline | tee -a "$RTOP/HALT" "$RTOP/summary.txt" >> "$RTOP/lanes.txt"`.
  - Everything after `#` is a comment, so the reason goes only to stdout. `bash -n` is still clean.
  - The next line (`echo "-> run stopped…" >> "$RTOP/HALT"`) still creates HALT, so `halted`, the stop list and exit 9 still work.
  - But **every HALT loses its reason** in HALT, HALTED.json (`reason` is read from HALT), summary.txt and lanes.txt, and the "first reason wins" rule breaks.
  - The adoption self-test would catch it: PART7 M3 greps HALT for "main received SIGTERM", 4-halt greps for "returned rc=1", and the new pw-watchdog greps for "watchdog stopped browser step".
  - Fix: move the comment to the end of the line, after `>> "$RTOP/lanes.txt"`.

## Minors
- **B1 (A1 partly fixed): the `starting` marker covers only lrun.**
  - draft/lib/lane-proc.sh:57-58 writes `run/<n>/starting` before lane-run, and stoplist :20-25 reports a start that has a marker but no pid, plus a child whose leader was never recorded. That part is correct.
  - But three **long-running** starts call `$LANE_RUN` directly and get no marker: the ZG sim (draft run-rc.sh:135), vite preview (:319) and the p62 server (:330). An unrecorded vite or node server in that window would run indefinitely and never appear in the stop list.
  - Fix: write a marker before each of those three calls (e.g. `run/zg-trace/starting`, `run/vite-$tag/starting`, `run/p62-$eng/starting`, which the existing glob picks up), or route them through one small helper.
- **B2 (verify condition 1): the RC-SHA check halts mid-run and only checks for a substring.**
  - draft run-rc.sh (gates, just before `step vitest`) calls `run_halt` when QA_CI_ACK lacks `$SHA`/`$S7`.
  - The condition is right, but it fires after setup and build and then locks the results dir with a HALT for what is a pre-flight input error.
  - Fix: move it next to the QA_CI_ACK refusal as a no-HALT `exit 2` before any write (see answer (1)).
  - The substring test accepts "NOT green on <sha7>". That is acceptable as a naming check, but say in the header that the operator, not the code, asserts green.
- **B3 (MODE=r17base): the RC trusts baseline files without checking that the baseline run finished cleanly.**
  - draft run-rc.sh:365-366 uses `$R17_BASE_DIR/p2/r17-badge-r17-base-<eng>-<z>.json` whenever the file exists.
  - A HALTED or partial r17base run leaves those JSON files behind; on_main_exit renames only SHA256SUMS*, DONE and PRERUN files. The RC would then silently use baseline cells from a halted, unsigned run.
  - Fix: use R17_BASE_DIR only if BASELINE.json exists, there is no HALT, `sha256sum -c SHA256SUMS` is clean, and BASELINE.json's sha equals V5_BASE (the same pattern as the WK carry-over check). Otherwise fall back to the in-run p2base step and log why.
- **B4 (MODE=r17base): its SHA256SUMS can't verify.** draft run-rc.sh:274 writes SHA256SUMS over every file, then appends "MODE=r17base done…" to summary.txt, and run-rc.log keeps growing through the tee, so `-c` fails on both. Write the done line first and leave run-rc.log out of the sums (or write the sums last, from a list that excludes the live log). This matters because B3's check needs these sums.
- **B5 (A5 / m9): the TEST-AUDIT scope is narrower than vitest's.**
  - snapshot-repo-scripts.sh selects only `(^|/)tests?/…\.test\.`. vitest's default include (vite.config.ts:32 only adds excludes) also runs `engineering/golden/flagoff-golden.a01faea.test.ts` and `m4on-golden.90a9c84.test.ts` on rc/v5. Both have no process hits today, but they are outside the audit.
  - It also has no `.spec.` files and no import closure. A test that imports a spawning `scripts/*` module would show no hits. Today the only imported scripts with hits are check-release-build.mjs and build-id.ts, both git-only, so it is clean.
  - Fix: select all `*.{test,spec}.*` files minus the config excludes, and add the hits of each test's `../scripts/*` imports.
  - Also: a "known" file keeps its reason even if its hits change. Pin each known reason to its hit list and mark it `NEEDS REASON (hits changed)` on any difference.
  - The scratch dry check at 1a61b36 (`/workspace/qa-v5-scratch/rs-dry/1a61b36/TEST-AUDIT.tsv`) is otherwise correct: 10 files, NEEDS REASON 0, and v5-f3-qa-seam.test.ts listed as "runs (spawnSync check-release-build, sync)", which matches my reading of :6/:53.
- **B6 (N-m3(c)): one pw-watchdog assertion is vacuous and would be wrong if made literal.**
  - draft/tests/selftest-pw-watchdog.sh "stop list … lists no live recorded PID" tests `! grep -q "^[0-9]"`, but stop-list lines start with `ops/tools/lane-kill.sh`, so it can never fail.
  - A literal version would fail on purpose: the sentinel (lane `$LNB-S`, alive) matches stoplist's `$LNB-*` glob.
  - Fix: assert `! grep -q "^ops/tools/lane-kill.sh $LNB-B "` and that the sentinel line is present.
  - Also: the 5 s watchdog can fire before Chromium is up on a loaded box. That fails safe (assertion 1 fails), but use 20 s, or a watchdog that starts after `ready` (the child already writes ready), so the test proves the path it targets.
- **B7 (Art-c2 capture): one crash costs the rest of the p2 step.** secArtC2 runs inside p2.mjs's single top-level try, before p2b/r16/explore/minors. Any throw ends those existing sections for that size: a 3 s `click` timeout on a refused button, the workers sheet not opening, or a missing locator. Wrap secArtC2 in its own try/catch that records `Art-c2 UNVERIFIED (probe error)` and continues.
  - Also: `red()` reads only the first `rgba(` in `box-shadow`. A non-red drop shadow listed before the red inset ring would give a false FAIL on the card (a gate). Check every colour in the shadow list.
  - The selectors match 4eb220f app.ts:98 (one `manageAll` button with `nav-manage … desk-manage-all`), :195, :203 and :243. Whether that button sits under `nav`/`header` at each size is unverified until a browser run, as CHANGESET states.

## Nits
- **c1:** n2 has no negative self-test. Add a selftest-main-halt case where QA_MAIN_LANE names another sha7, expecting `refusing … does not name this run's SHA` and no run dir.
- **c2:** PART8 (pw-watchdog, `RESULT pass=10 fail=0`) is not yet in draft selftest-full.sh. It must be added at adoption, under the n4 `partc` scheme.
- **c3:** draft run-rc.sh:367 says "pure file merge, no process started", but it runs a short foreground `node`. That is consistent with the other inline python3 calls, but reword it. A stale "# no baseline file -> badge-pos UNVERIFIED" comment is left on the same line.
- **c4:** MODE=r17base runs WebKit with no wk_preflight and serially on the lane-A lock. That is acceptable for a baseline, but note it in the procedure doc.

## Checked and fixed
| Item | Evidence |
|---|---|
| A2 refusal before any write | draft run-rc.sh:115-122: source lane-proc, main_selfcheck and the HALT-dir refusal now come before `mkdir -p $R; exec > >(tee …)`. selftest-main-halt M1/M2 now assert "no run dir". Remaining writes before the refusal: the WK lock file (not evidence), and the QA_CI_ACK refusal still after the write (B2 / answer 1). |
| A3 fail-closed | After `step vitest`, a grep of logs/vitest.log for each excluded basename leads to run_halt. This is a post-hoc tripwire: it detects, it doesn't prevent. That is acceptable because vitest 2.1.9 honours `--exclude` (verified in rereview2). Advisory: a `vitest list` precheck would prevent. |
| verify.test.ts conditions | (1) The MODE=rc RC-SHA check is present (placement and strength: B2). (2) Removal conditions are written in the code comment (serve-own after #89; verify once shot.mjs:31 is recorded or skipped). (3) The explicit per-file list stays. |
| A4 | draft run-rc.sh:413-416: empty ST26B_SIZES gives FAIL (MODE=rc + QA_STRICT) or UNVERIFIED, written to summary.txt and m5/gaps.jsonl. |
| A5 / m9 | `tests/snapshot-repo-scripts.sh` uses git show only, refuses to overwrite, writes MANIFEST/MISSING/SHA256SUMS/README, chmod a-w, diffs against the previous snapshot, and builds TEST-AUDIT.tsv with NEEDS REASON as an RC blocker. Scope gaps: B5. |
| n1 | Intent is right, implementation broken: M1. |
| n2 | lane-proc.sh main_selfcheck: QA_MAIN_LANE minus `uiqa-run-` must equal `$S7` or `$S7-*`. |
| n3 | lane-kill-check.sh lkrequery logs `@ survivor <pid> start <st>` at report time (one PID lane-kill named). stoplist compares and marks REUSED, with no action. |
| n4 | selftest-full.sh `part`/`partc`: exact pinned lines, rc ANDed, per-part summary. Matches the 085726 logs (PART1 `RESULT pass=20 fail=0`, PART2a/2b, PART3 15, PART4 23, PART5 16 + no HALT, PART6 11, PART7 19). |
| n5 | Global `/proc/$1/stat` and `/proc/$p/stat` allows removed. File-scoped to lib/lane-proc.sh, lib/lane-kill-check.sh (`/proc/$m/stat`), tests/selftest-lane-helpers.sh and tests/fixtures/audit-positive/ok.sh. See the opinion below. |
| n6 | Labels now name the P0 blocks (header :18-19, :38, lanes.txt lines). HoQA N-a (header :2-3 = MJ3 launch) and N-b (:25-28 exact strings) are also done. |
| MODE=r17base | Targets V5_BASE only, refuses an existing BASELINE.json, steps limited to setup/build/r17base, every probe goes through `b` (lane-run, lock, 600 s watchdog, pw-launch preload), the documented launch is in docs/…PROCEDURE.md, and the RC skips the in-run p2base when the baseline exists. Gaps: B3, B4, c4. |
| N-m3(c)/(d) | selftest-pw-watchdog.sh covers watchdog → lane-kill group TERM on the step leader → pw-launch SIGTERM → closeAll → exit 124 → HALT, and asserts exactly one TERM and none naming the browser. It prints run-rc and lib sha256 (d). Gaps: B6, c2. |
| RETALLY / REVIEW | The 201+5=206 correction is accurate (it matches HoQA N-d). |
| TP1-R17c placeholder | No re-pin; the conditional edits are written down. Fine. |

## n5 opinion: is the scoping sound, or does it reopen the hole?
It is sound and closes the hole, for three reasons.
- The allow mechanism removes the **exact substring** `/proc/$1/stat`, only in the named file, before the rules run. Enumeration forms (`/proc/[0-9]*`, `/proc/*`, `ls|find|for … /proc`) still trip `proc-walk`/`proc-enum` on the same line.
- A new file that reads `/proc/$1/stat` is now flagged and needs its own reviewed entry, which is the point of n5.
- selftest-lane-helpers.sh:10-11 (`st()`/`alive()` on one PID) and the positive fixture ok.sh:2 are exactly the single-PID form. Giving each its own entry is the honest version of what the global allow did implicitly. The fixture becoming clean through an allow is slightly circular, but its job is to keep the auditor from flagging the sanctioned form, and that still holds.
- One caution: keep each scoped entry to the full `/proc/$1/stat` (or `$m`, `$c`), never `/proc/$`.
- The snapshot-repo-scripts entry is a literal search-regex substring in that one file. That is fine.

## (1) The "refused before any step started" advisory
- **Yes, it is in rereview2** ("Advisory: after main_traps, pre-flight exits 2/3/4 (axe sha, git fetch, unknown vdry variant, m5dry build) become HALTs that lock the dir until HoQ moves it aside. Consider a 'refused before any step started' class.").
- **Recommendation: yes, put it in this set.** It is cheap and safety-neutral when keyed to the right condition:
  - in lrun, set `RTOP_STARTED=1` (or touch `$RTOP/run/.started`) before the first lane-run call;
  - in on_main_exit, an rc≠0 with **no lane-run call made yet** writes `REFUSED.txt` (reason, rc, time) and no HALT. Nothing was started, so there is nothing for HoO to stop.
  - Any rc≠0 after the first lane-run stays a HALT, unchanged.
- In the same change, move the pure input checks up to the A2 pre-write block as plain `exit 2`: empty QA_CI_ACK, the MODE=rc RC-SHA check (B2), VDRY_VARIANTS validation, and the axe sha check.
- Keep a TERM on main a HALT always (the trap path).
- Add one selftest-main-halt case for each branch: a pre-start refusal gives REFUSED.txt and no HALT; after the stub step starts, it gives a HALT.

## (2) HoO: should lane-run.sh defer TERM between fork and the pidfile record (A1)?
- **Recommendation: yes, but only with a *caught* handler, never an ignore, and as its own re-pinned change after the pre-run.**
- How:
  - In lane-run.sh, before `setsid … &`, set `trap 'LR_TERM=1' TERM`.
  - After the `printf … >> "$PIDDIR/$lane.pids"` and `echo "$pid"`, run `[ -n "${LR_TERM:-}" ] && exit 143`.
  - Bash defers the handler until the current `sleep 0.1` finishes, so the record is always written once the fork has happened.
- **Why not `trap '' TERM`:** an ignored signal is inherited across exec. In a non-interactive bash, a signal ignored on entry *cannot be trapped*, so lane-step's `trap ':' TERM` would be silently dropped, and the step and its command would ignore lane-kill's TERM. That would break every rule-21 stop. A caught handler is reset to default in the exec'd child.
- **What it buys:**
  - A step that would have been an unrecorded orphan becomes a recorded leader. It is then lane-kill-able and appears in the stop list as a ready line.
  - It closes the window for the direct `$LANE_RUN` callers too (ZG, vite, p62; B1) and for every other lane on the box, not just UI QA.
- **What it costs:**
  - lane-run outlives a TERM by up to about 1.1 s (the /proc poll).
  - A pinned-tool change: new sha1/sha256 in PINS.txt, HoO and HoQA diff review, and every self-test that checks pins (PART0, pw-watchdog, PART3 lifecycle) re-run on the new pin.
  - Changing the pin mid-stream would void the current pre-run go, so do it after the pre-run, together with adopting harness-rc.
  - The harness `starting` marker (A1/B1) stays as defense in depth: it also covers a SIGKILL of lane-run, which no trap can catch.

## Adoption conditions (for the final PASS)
1. Fix M1. Fix B2–B4 before adoption; B1 and B5–B7 may land in the same adoption or a fast follow-up before the RC run. Add (1) if accepted.
2. Copy into harness-rc/ and re-hash the harness and v5-ui SHA256SUMS and the REVIEW. Add PART8 to selftest-full (c2).
3. Run, on the adopted copy: full self-test PART1–8, selftest-main-halt with the A2/n2/(1) cases, and MODE=vdry, MODE=stub and MODE=r17base with QA_DRYRUN=1. Then the m9 snapshot and TEST-AUDIT at the final RC SHA (NEEDS REASON = 0).
4. A HoO look at run-rc.sh and lib (and the separate lane-run re-pin if HoO accepts (2)). Then an Architect delta re-review of the adopted hashes.
