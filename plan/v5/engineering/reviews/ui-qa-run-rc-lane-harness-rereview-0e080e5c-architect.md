# Re-review: UI QA run-rc lane harness rework (rule 21), run-rc.sh 0e080e5c

- Reviewer: Senior Software Architect. Second reviewer in place of CCR (rule 22: no Claude review). Paired with HoQA.
- Date: 2026-10-30, 08:20–08:40 CET. Prior review: `engineering/reviews/ui-qa-run-rc-lane-harness-8bd8fb46-architect.md`.
- **VERDICT: FINDINGS. 0 Blockers, 2 Majors, 5 Minors, 5 Nits.**
  - B1, B2, M2, m1–m6 and n1–n4 are fixed, and I checked each one against the code.
  - M1 is fixed for the harness and for the repo scripts it preloads. One path into the same serve-own code is still open, through the gates vitest run (Major N-M2).
  - A separate regression from the rule-21 `step` change means no flag variant can be built (Major N-M1). It is a correctness problem, not a safety one. I missed it in 8bd8fb46.
  - **The lane should stay HALTED until N-M1 and N-M2 are fixed.** The Minors may follow as PASS-with-minors items.
- Safety: I ran nothing from run-rc.sh and no browser. The audit and forms test ran read-only. My probes ran in `scratch/harness-rereview-0820/` and covered:
  - one plain `sleep 30` (the foreign PID);
  - one `lane-run architect -- bash -c 'sleep 25 & sleep 2; exit 0'`;
  - `lib/lane-step.sh` called directly with a missing function (it exits at once).
  
  The only signal sent was by lane-kill, and it signalled nothing: one call was REFUSED, and the others were report-only GONE calls.

## Hash checks (all verified 08:21 CET)
| Item | Claimed | On disk |
|---|---|---|
| harness/run-rc.sh sha1 | 0e080e5cbc13e66acca2074b4b8aa10c7f544504 | **match** |
| harness/run-rc.sh sha256 | 0bd2bd47…6e1656 | **match**; mode `-r-xr-xr-x`, mtime 08:11:36, ctime 08:11:40.415 (chmod), so it is read-only since 08:11:40 |
| tests/run-rc-lane-helpers-REVIEW.md sha256 | 53648ffe…598f | **match** (53648ffebea940d4b1c75ba4bda61de3774848414a74cfb8c5644bef51ec598f) |
| harness/SHA256SUMS sha256 | ceac41da… | **match** (ceac41da339eebf59165da31e8b447f5485a4670fde43776014e561900a83d6e); 378 lines; `sha256sum -c` rc 0 with 0 failures; every file on disk is listed |
| ops/tools/lane-kill.sh | be136252 / 9c89ddc0 | **match** (sha1 be1362520c6d…, sha256 9c89ddc06a1b…); the m6 fix is at lane-kill.sh:40-43 |
| ops/tools/lane-run.sh | f286a9a0 / 061e7c4f | **match** (sha256 061e7c4f…) |
| ops/tools/PINS.txt | 08a30ce9… | **match** |
| lib/lane-proc.sh, lane-kill-check.sh, pw-launch.mjs, serve-lane.mjs | ec22fa1a / f55279b1 / b0e2b139 / 71d3f408 (§19) | **match**; all mtimes are before the 08:11:42 self-test start |
| selftest-20261030-081142-full/SHA256SUMS | ac59eaa7… | **match**; `-c` clean, and the nested 4-halt/ and 5-pw-browser/ sums are clean too |
| repo-scripts/2fa7318/* (7 files) | = rc/v5 2fa7318 | **match** for all 7 against `git show 2fa7318:<f>` |
| qa/decisions.md sha1 cited in REVIEW §3.2 | 4b4e1c7a | now b028ebf8. Entries were appended at 08:10 and 08:12; the L574 ruling text is unchanged (Nit N5) |

## Claimed fixes, checked against code
**B1: FIXED.**
- `lkcall` (lane-kill-check.sh:14-17) captures the output and rc. `lk_ok` (:9-10) accepts only rc 0 plus the exact strings `TERM <pid> (group)`, `TERM <pid>` or `GONE <pid>`. Anything else calls `run_halt`.
- `lstop` (lane-proc.sh:21-25) does TERM, then a grace period, and halts if the leader is still alive. It then does a report-only re-query.
- `postcheck` (:28-33) runs after every step, on both normal exit and stop (:49). It re-queries the leader's group, and it halts on any PID the step recorded that is still alive.
- My own run against the real pinned tool: the leader was 391208 and child 391212 survived. lane-kill printed `GONE 391208 (group members remain, not signalled: 391212)` with rc 1. lkcall then wrote HALT, and the subshell exited with **rc 9**. The `CONTINUED` line was never reached. The child was never signalled and expired by itself; the re-query at 08:28 printed `GONE 391208` with rc 0.
- So GONE-with-survivors halts.

**B2: FIXED (traced end to end).**
- These places check `halted`: lrun (lane-proc.sh:36), step (run-rc.sh:106), b (:132), guard (:129-130), lb (:261, :263), lane (:340-341), engdone (:335), vserve (:268), zgbg_start (:110) and the p62 server start (:280).
- Main joins each driver and calls run_halt on HALT or on a non-zero driver rc (:369-370). It calls run_halt again at :377, before anything else.
- The ZG watchdog result is re-checked at :116 before the manifest. Every manifest write (:381-418) comes after :377 and :378.
- Halts inside subshells all leave the HALT file behind, and main reaches :370 or :377 in every case:
  - the lb subshell (:262);
  - the `$(step st26b…)` command substitution (:297);
  - the lane drivers (:367-368);
  - the ZG watchdog (:113).
- In PARALLEL=0 and wk mode, `lane` runs in main, and `exit 9` triggers on_main_exit (guarded by `BASHPID`, lane-proc.sh:52).
- Partial files written in a race with the other lane (SHA256SUMS.partial at :264, engines/*.DONE.json at :335) are renamed `*.HALTED-NOT-EVIDENCE` by the EXIT trap (lane-proc.sh:55). The trap also writes HALTED.json.
- I found no manifest write reachable after a halt. Two caveats are listed as Minors: N-m1 (the ZG watchdog outlives main) and N-m2 (servers are stopped after a halt).

**M1: FIXED for the harness; one residual path (N-M2).**
- vite runs through lane-run (`vserve`, run-rc.sh:268-270) and is stopped through `lstop`/`lkcall` (`vstop`, :271).
- lib/serve-lane.mjs (25 lines) never spawns or signals. It has no `process.kill`, `spawn`, `exec` or `detached`, and its `stop` and `stopAllChildren` are no-ops (:20, :11). It imports serve-own with `?orig` for the pure functions only, and serve-own has no top-level handlers (its handlers sit inside `serveForRun`, which is redirected).
- The resolve hook is at pw-launch.mjs:38-40. `npm run check-globals` was replaced by `$H scripts/release-globals-browser.mjs` (:285).
- Ruling QA-R21-PW is at qa/decisions.md:574 (HoO 07:53, logged by HoQA 08:00), and L578 confirms HoO OK'd launchServer at 08:10. It says what UI QA claims: lane-run plus watchdog, close only through Playwright, a watchdog stop halts with a stop list, the browser PID is recorded in lane-run format, and launchServer, then connect, then browser.close() and server.close().
- The implementation matches the ruling:
  - pw-launch.mjs:27-35 calls launchServer, records `server.process().pid` with `pidLine` in lane-run format, then connects. `close` runs browser.close() and then server.close().
  - pw-launch.mjs:37 adds a SIGTERM handler that closes everything and exits 143.
  - pw-launch.mjs:28 refuses to launch without `QA_PIDFILE`.
  - Every probe imports `${QA_WT}/node_modules/playwright-core`, the same instance the hook patches. The repo scripts' `from 'playwright-core'` resolves to the same CJS object.
- **If close() fails:**
  - A browser watchdog stop always halts (lane-proc.sh:46).
  - postcheck halts if the recorded browser PID is still alive. If the browser leader is gone but its group survives, the re-query reports GONE-with-members, which halts.
  - If close() hangs, node stays alive in the step group, and the re-query halts on it.
  - The stop list names the browser PID for HoO. The browser's child processes are covered through its own group.
  - Residual: there is a tiny window between `launchServer()` resolving and `open.add`, during which a TERM leaves cleanup to Playwright's own exit hook (QA-R21-PW). This is acceptable.
- **There is no `process.kill(-pid)` and no /proc walk in any harness code.** The only hits are:
  - the read-only snapshot `tests/repo-scripts/2fa7318/scripts/serve-own.mjs:14,19` (REDIRECTED);
  - the INERT `lib/run-chain.p1-30b29d3.sh.orig:32 kill $SP`;
  - the single-PID reads `/proc/$1/stat` (lane-proc.sh:8) and `/proc/${pid}/stat` (pw-launch.mjs:18).

**M2: FIXED.**
- My own run (scratch/forms.log) gave **29/29 forms caught**, positive fixtures clean, and the full tree with **0 violations** (comment 6, inert 5, redirected 2, allowed 2).
- My original 29-form fixture from 8bd8fb46 (`/tmp/arch-audit-fixture/forms.fixture`) gave **29/29 VIOLATION**.
- The scan roots are all of artifacts/v5-ui plus the snapshot at 2fa7318. My independent rg over the harness and artifacts/v5-ui found no active hits:
  - kill, pkill, killall, process.kill, /proc walks, pgrep, `ps `, `xargs kill`, fuser, killpg, terminate, timeout or SIGKILL;
  - setsid, nohup, disown or `detached:`.
- Extra forms of mine that the audit misses, none of which appear in the code today, are listed under N-m4.

**Minors and nits:**
- m1 fixed: lkcall runs first, so REFUSED halts at once; an empty recorded start time halts at lane-proc.sh:42 and run-rc.sh:112, :270 and :280.
- m2 fixed, except the variant builds, which are broken (N-M1).
- m3 fixed: `stoplist` (lane-proc.sh:11-15) runs on HALT and on any non-zero main exit, and the ZG watchdog is at :113.
- m4 fixed: `flock -n` plus a re-check (:363-364).
- m5 fixed: the file is frozen and the evidence was regenerated after the freeze.
- m6 fixed by HoO (lane-kill.sh:40-43; the hashes match).
- m7: still an advisory for HoE. `scripts/d2-kill-browser.mjs:18-23` at 2fa7318 still walks /proc and calls `process.kill`. run-rc does not call it (audit wiring check). My -04 test-infra PR covers it.
- n1 `-$$` (:70), n2 (:126-127, `awk -v` :130), n3 documented (:28-29) and n4 reworded: all fixed.

**Self-test (selftest-20261030-081142-full):**
- The logs match the claims:
  - Part 0: pins match.
  - Part 1 stub: 13/13, including b and f, GONE-with-members with rc 1 and rc 0, both halt.
  - Part 2: audit forms 29/29 and 0 violations.
  - Part 3 lifecycle: 15/15. The foreign `sleep 300` PID 315464 was REFUSED and expired with status 0.
  - Part 4: 18/18, main exit 9, no manifest, partials renamed, and lane B refused new steps.
  - Part 5 Playwright: 16/16. lane-kill printed exactly `TERM 348636 (group)` with rc 0, and every re-query gave GONE with rc 0.
- run-rc.sh was frozen at 08:11:36/40, before the self-test started at 08:11:42. Every lib the tests source has the current hash: the Part 5 log prints the lane-proc, lane-kill-check and pw-launch hashes, and Part 1 prints the lane-kill-check hash.
- Note that the self-tests do not execute run-rc.sh (N-m3).
- **My own foreign-PID re-run at 08:27:29:** I started a plain `sleep 30` as PID 391195. `lane-kill.sh architect 391195` printed `REFUSED 391195 (not started by lane architect)` with rc 1. The process was alive 1 s later, and `wait` returned **status 0 at 08:27:59**, so it expired naturally.

## Findings
**N-M1: Major (correctness; regression from the rule-21 `step`, present since 8bd8fb46). Every flag-variant build exits 127.**
- Where: run-rc.sh:206-213, :215, :219 (`step variant-… mkvariant …`) and :227 (m5dry `step variant-m5-$PIECE mkvariant …`).
- `step` now runs its command as `lane-run → bash lib/lane-step.sh … -- "$@"` (:106, lane-step.sh:11). `mkvariant` is a shell function of run-rc (:184), not a command, and it is not exported.
- Before rule 21, `step` ran `"$@"` in-shell (run-rc-lane-helpers.diff:105 → :111).
- Reproduced: `lane-step.sh … -- mkvariant m4off m4.enabled=0` gave exit 127 and `mkvariant: command not found` (scratch/p3.log).
- Effect at the RC:
  - None of these variants get built: m4off, zg-on, zg-off, zg-confirm, ss-on, ss-off, fc-off, m5-on, shipped or the m5dry piece.
  - The SS rows FAIL under QA_STRICT, and the ZG flag-on/off/confirm and p1 flag-off probes are skipped.
  - All 62 M5.0 rows are UNVERIFIED, and the Art set is not shot as shipped.
  - The RC slot is spent and nothing in it is a safety failure.
- Fix: call `mkvariant` directly (no outer `step`). Its slow part is already a step (:197 `step build-$v …`), and the worktree add and flag edit are short foreground commands (m2 allows that). Example: `mkvariant m4off "$M4_FLAG=0"; echo "variant m4off exit=$?" >> $R/summary.txt`. Then grep run-rc for any other function passed to `step` or `b`. I found none besides `mkvariant`.

**N-M2: Major (rule 21; M1 residual through executed repo test code). The gates vitest runs the real serve-own spawn and group-kill path.**
- Where: run-rc.sh:162 `step vitest npx vitest run …` runs every non-slow test at the RC SHA (vite.config.ts:32), including `tests/serve-own.test.ts` (at 2fa7318).
- At :101-106, when `dist-qa/assets` exists, the test spawns `node scripts/rc0-browser.mjs` without the pw-launch preload. That loads the real `scripts/serve-own.mjs`, which:
  - spawns `vite preview` with `detached: true` (:16), outside the lane group, so lane-kill cannot see it;
  - stops it with `process.kill(-srv.pid)` from its own SIGTERM handler (:88 → :19 / :14).
  
  The test itself also calls `p.kill('SIGTERM')` (:106).
- On a fresh worktree the test is skipped, because gates run before any build. It does run on any reused `/tmp/qa-v5-<sha7>`, since run-rc.sh:143 reuses an existing worktree with its old dist-qa. That is exactly the re-run-after-halt case.
- Neither the repo-scripts snapshot nor the audit scan roots include repo test files (REVIEW §17).
- Fix, either:
  - (a) In the harness: run the gates vitest with `--exclude tests/serve-own.test.ts`. CI already covers it through QA_CI_ACK. Log the exclusion in summary.txt.
  - (b) The RC includes the serve-own fix from my test-infra PR (D-HOE-20261030-04: an identity check before the group kill, or a lane-run start).
- In both cases, snapshot and audit the repo test files that spawn processes, at the final RC SHA. Today that is tests/serve-own.test.ts, plus the spawnSync users economy-copy, economy, m41-p1-asleep-signal, release-build-id, release-html, telemetry-m3 and vendor-pins.

**N-m1: Minor. The ZG watchdog subshell keeps running after a halt.**
- Where: run-rc.sh:113. Its loop has no `halted` check.
- After a halt anywhere else, main exits 9 (:370 or :377), but this plain bash subshell keeps running: it is not lane-run'd and not on the stop list, for up to ZG_TMO (3600 s).
- At timeout it still runs `lstop` (lane-kill TERM on zg-trace) and `run_halt`. That rewrites STOP-LIST-for-HoO.txt and HALT after HALTED.json was written, which contradicts "run-rc signalled none of these after the halt" (lane-proc.sh:12).
- Fix: add `halted && exit 0` at the top of the loop, leaving zg-trace on the stop list.

**N-m2: Minor (documentation). Own servers are TERMed after a halt.**
- Where: `vstop` (run-rc.sh:271, called at :276 and :284-286) and the p62 stop (:283) don't check `halted`. After a step halts, they still stop the lane-run vite and p62 servers through `lstop`.
- That is safe (an exact recorded PID through lkcall), and probably what we want. It contradicts lane-kill-check.sh:5 ("nothing further signalled") and the HALT text (lane-proc.sh:19, :12).
- Fix: document it as the one allowed cleanup after a halt, or skip it and leave the servers on the stop list. I'd document it.

**N-m3: Minor (false halts and evidence).**
- (a) The report-only re-query after the leader is gone runs only once and immediately (lane-proc.sh:25, :29). The same applies to the browser-PID alive check (:32). Group members still exiting from the same TERM (npx → vite; node after its bash leader), or a browser zombie not yet reaped, give GONE-with-members, which halts. That fails safe but can halt an RC run for nothing. Fix: poll the report-only re-query, for example up to 10 × 1 s while the only problem is survivors. Never re-signal.
- (b) The B2 self-test (tests/selftest-halt.sh, 4-halt/s1/main.sh) drives a synthetic main that sources lib/lane-proc.sh. It does not execute run-rc.sh's own paths: lb (:262), `$(step …)` (:297), lane() (:340), :369-377 or the ZG watchdog. I verified those by tracing the code only.
- (c) Part 5 TERMs the browser PID directly. The watchdog path (step group TERM → pw-launch SIGTERM handler → closeAll) is not tested, although it halts regardless.
- (d) The self-test logs don't print run-rc.sh's own sha256. Add it.

**N-m4: Minor. The audit misses some forms, none of them in the code today.**
- Where: tests/audit-no-pattern-kill.sh:20-35.
- My extra fixture (scratch/extra.fixture) was not flagged for these forms:
  - /proc enumeration: `ls /proc | grep …`, `find /proc -maxdepth 1 …`;
  - escaping the group: `setsid -f …`, `nohup … &`, `disown`, `spawn(…, { detached: true })`;
  - `start-stop-daemon --stop`.
- Add rules and a negative fixture for each. Escaping the group is the exact failure mode in M1. Also extend the scan roots as in N-M2.

**Nits**
- N1: pw-launch.mjs:38 fails open. If `QA_WT` is unset or `QA_PW_LAUNCH_NO_PATCH` is set, launch is unpatched, so the browser is unrecorded and nothing refuses it. This is not reachable from run-rc, since `QA_WT` is exported at :171. Throw instead.
- N2: lane-kill-check.sh:10 accepts `TERM <pid>` (no group). Every recorded PID should lead its own group, and with a non-group TERM the re-query never checks the real group. Consider halting.
- N3: run-rc.sh:363. A refused concurrent `--lane wk` segment has already written summary and lanes lines into the running segment's wk/ dir. Its EXIT trap (lane-proc.sh:53) then overwrites that dir's STOP-LIST-for-HoO.txt. Take the flock before any write.
- N4: run-rc.sh:336-338. When halted, `lrun` returns 99, and wk_preflight writes `engines/webkit.SKIPPED.json` anyway. That file is not renamed by on_main_exit. This is cosmetic.
- N5: REVIEW §3.2 pins qa/decisions.md by file sha1 4b4e1c7a, but that is a growing log (now b028ebf8). Cite the line (L574, L578) and quote the text. The repo-scripts snapshot is described as "read-only", but the files are mode 644 on disk.

## Re-review needed for PASS
- N-M1 fixed and N-M2 fixed, by option (a) or (b).
- A re-hashed package, with run-rc.sh re-frozen.
- The audit re-run, including the N-m4 forms if they are added.
- A static check that no shell function is passed to `step` or `b`.

The Minors and Nits can follow as PASS-with-minors items. I will re-review the delta only.

## Addendum (08:33–08:45 CET): HoQA's trace, item by item
- Source: `qa/m3-recheck/ui-harness-rework-0e080e5-hoqa-trace.md`. I verified its sha256 as `18cb23d31244ce1e48cc8d0be94a0bc905c8ce4b25e1a81a1e0b6f73d3022b03` (221 lines) and read it in full. HoQA's §6 ("no Architect re-review on disk") predates this file, which closes their C1 as FINDINGS, not PASS.
- **MJ1 is N-M1** above (same root cause, same lines). HoQA notes MODE=prerun never calls `mkvariant`, and I agree. So N-M1 blocks the RC and m5dry runs, not the legacy pre-run.
- Probes for this addendum, all in lane `architect`, sleep-only bash wrappers, stopped only by lane-kill:
  - 410399: EXIT-trap check (MJ3);
  - 413407 and 415489: TERM-trap leader check (MJ2 fix).
  
  The final re-queries printed `GONE <pid>` with rc 0 for all three.

**MJ2: CONFIRMED. Major.** Survivors of a group whose leader has exited never reach HoO's stop list, and no rule-21 tool can stop them.
- `lib/lane-step.sh:9-12` sets no TERM handling. The group leader is a non-interactive bash running `"$@"` in the foreground, so it dies on the first group TERM, and any slow or TERM-ignoring child is left in a group with no leader.
- lane-kill then only reports `GONE <leader> (group members remain, not signalled: …)` with rc 1 and will never signal those members (`ops/tools/lane-kill.sh:30-34`, and lines 41-43 for the race).
- `stoplist` (`lib/lane-proc.sh:11-15`) lists only PIDs that are recorded in a pidfile and still alive. The survivors are named only inside the HALT text.
- Evidence: `tests/selftest-20261030-081142-full/4-halt/s1/lane-kill.log:6` shows `GONE 332725 (group members remain, not signalled: 332738)`. Yet `s1/STOP-LIST-for-HoO.txt` holds only the header and `# end`, and the `stop_list` field in `s1/HALTED.json` is empty too.
- QA-R21-PW (3) ("a watchdog stop halts the run and gives HoO a stop list, with no manual cleanup") is therefore only partly met.
- **Fix:**
  1. In `lane-step.sh`, before the command, add `trap ':' TERM`. Do not use `trap '' TERM`: an ignored signal is inherited across exec, and the child would ignore TERM too. A caught handler is reset to the default in the child, so the child still gets the group TERM. With a foreground child, bash runs the handler only after the child exits, so the leader lives exactly as long as its command.
     - I probed this. With a normal child (413407), the leader was gone 1 s after the TERM, the child returned 143, and the re-query printed `GONE` with rc 0. With a TERM-ignoring child (415489), the leader was **still alive** 1 s after the TERM and gone once the child ended; the re-query printed `GONE` with rc 0.
     - lstop's 30 s check (`lane-proc.sh:23-24`) then HALTs while the leader is still alive and recorded, so it appears in the stop list, and HoO can re-TERM that exact group with lane-kill.
     - This also removes most of the leader-first race behind N-m3(a).
  2. As a backstop, `stoplist` also copies every `group members remain … : <pids>` list from `$RTOP/lane-kill.log` into STOP-LIST, report-only and marked "not lane-kill-able; HoO decides".
  3. Re-run 4-halt with assertions that the stop list is not empty in s1 and s2.

**MJ3: CONFIRMED. Major.** run-rc.sh has no rule-21 launch command, and nothing enforces one.
- The documented command at `run-rc.sh:2-4` is a bare `QA_CI_ACK=… artifacts/v5-ui/harness/run-rc.sh <sha>`.
- The rule-21 text at `:12-15` covers only the steps run-rc spawns. REVIEW §2 has no launch line either.
- Nothing between `:99` and `:105` checks that main itself is recorded by lane-run. Main runs for hours, so standing rule 21 applies to it.
- It is worse than undocumented. My probe 410399, a bash with an EXIT trap under lane-run, was stopped by `lane-kill` (`TERM 410399 (group)`, rc 0). The EXIT trap ran with **`$?` = 0** (`scratch/trap.txt`: `trapped rc=0`).
  - So if main is stopped by a group TERM, `on_main_exit` (`lib/lane-proc.sh:52-54`) takes neither branch. It writes no HALT and no stop list, and renames no partials or DONE markers.
  - Meanwhile the lane-run'd steps survive in their own sessions.
  - The `rc≠0` branch (`:53`) also writes no HALT. I agree with HoQA's m6 here, and also with its point that the rename `find "$RTOP"` (`:55`) does not exclude `./wk/`.
- **Fix:**
  1. Document the one launch command in the run-rc header and REVIEW §2, e.g. `ops/tools/lane-run.sh uiqa-run-<sha7> -- env QA_MAIN_LANE=uiqa-run-<sha7> QA_CI_ACK=… /workspace/egg-farm-studio/artifacts/v5-ui/harness/run-rc.sh <sha> …`. lane-run's setsid and env both exec in place, so the recorded PID is run-rc's `$$`.
  2. Enforce it near `:102`. Refuse with exit 2 unless the last line for `$$` in `$PIDDIR/$QA_MAIN_LANE.pids` has a start time equal to `/proc/$$/stat` field 22 (reuse `stof` and `alive`). QA_DRYRUN may be allowed through.
  3. Add `trap 'run_halt "run-rc main received SIGTERM"' TERM` in main after `:105`. Subshells reset caught traps, so the lane drivers still die on the default action. This writes HALT and the stop list and exits 9, and the EXIT trap then renames the partials.
  4. In `on_main_exit`, make the `rc≠0` branch write HALT as well, and exclude `./wk/` from the rename in the main segment.
  5. HoO records the stop procedure: `lane-kill.sh uiqa-run-<sha7> <main pid>`, then the STOP-LIST lines.

**m3 (ports): CONFIRMED. Minor. It fails safe, and the rework introduced it.**
- Lane A (PO=0) runs its sweep vite on `5177+2·0` = **5177** (`run-rc.sh:276`). Lane B (PO=1) runs its rc0-chromium vite on `5175+2·1` = **5177** (`:284`).
- The WebKit segment (PO=2) runs rc0 on `5175+4` = **5179** (`:286`), the same as lane B's sweep at `5177+2` (`:276`).
- Before the rework, the sweep used serve-own's free port. The fixed sweep port arrived in `tests/run-rc-lane-helpers.diff:209`.
- What happens on a collision:
  - `--strictPort` makes the second vite exit. Either lane-run halts because it exited before it could be recorded (`:269`), or `vstop` halts because it exited early (`:271`).
  - Before that, the probe may already have used the other lane's server. That server serves the same `$WT/dist-qa`, so serve-lane's own-chunk check passes (`lib/serve-lane.mjs:17-19`).
- No safety breach, but it can cost the pre-run, which runs both lanes.
- Fix: give each lane a disjoint block of ports, e.g. `P0=$((5171+10*PO))` with rc0 = P0, check-globals = P0+1, sweep = P0+2, p62 = P0+3, p64 = P0+4. That gives A 5171-75, B 5181-85 and W 5191-95, all inside the 5171-5199 rule at `:44-45`.

**m4 (shared st26b lane/pidfile): CONFIRMED. Minor. RC only, a rare race, and a false HALT only.**
- `step st26b-sizes-$eng` (`run-rc.sh:297`) runs inside `run_m5`, which both lane drivers run concurrently. `step` always uses `lrun $LNB-main` (`:106`), so both lanes append to the same `$LNB-main.pids`.
- `postcheck` (`lib/lane-proc.sh:28-33`) treats every line after its own `n0` as the step's own process. If the other lane's st26b step is alive at that moment, `:32` calls `run_halt`, a false HALT.
- It cannot signal the wrong process: a live process HALTs before any lkcall, and a dead one only gets a GONE re-query.
- Window: `node -e` runs for under 1 s, so it is rare. No other `step` runs inside a lane: `lb` and `b` use `$LNB-$LANE`, and vserve and the p62 server are recorded before `n0`.
- Fix: run in-lane steps on the lane's own name (`lrun $LNB-$LANE …`, e.g. `step` takes `${STEP_LANE:-main}`). Better, compute the st26b viewport list once in main before the lanes start, since it is pure computation. Also document postcheck's invariant: one shell per lane name at a time.

**Overall verdict: unchanged, FINDINGS, now with 4 Majors.**
- **N-M1 = MJ1:** variant builds exit 127.
- **N-M2:** the gates vitest runs the real serve-own.
- **MJ2:** survivors are missing from the stop list.
- **MJ3:** no lane-run launch or TERM handling for main.

Minors: N-m1 to N-m4, m3 (ports) and m4 (st26b lane). HoQA's m1, m2, m5, m7 and m10 duplicate our N2, N-m3(a), N-m1, N1 and N-m3(b). I also confirm their m6 (the `on_main_exit` rc≠0 branch and the `./wk/` rename scope) from `lane-proc.sh:53-55`.

For the legacy pre-run on 76390f2, I concur with HoQA's conditional go only if:
- MJ2 is fixed, or HoO accepts it in writing;
- MJ3 is fixed, meaning the launch command is documented and enforced, with the TERM trap;
- m3 (ports) is fixed, because the pre-run runs both lanes;

N-M2 is **not** a pre-run condition: the pre-run's steps are setup, build and legacy, with no gates, so the vitest path never runs there. It stays an RC condition.

Before the RC run, all 4 Majors must be fixed and re-reviewed as a delta.
