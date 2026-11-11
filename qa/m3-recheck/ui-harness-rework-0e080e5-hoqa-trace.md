# HoQA independent end-to-end trace review: UI QA run-rc lane harness rework (frozen run-rc.sh sha1 0e080e5)

- Reviewer: Head of QA (independent second trace, read-only). 2026-10-30, 08:21–08:30 CET.
- Scope: artifacts/v5-ui/harness (run-rc.sh, lib/lane-proc.sh, lib/lane-kill-check.sh, lib/lane-step.sh, lib/pw-launch.mjs, lib/serve-lane.mjs, lib/wk-preflight.mjs, lib/merge-engines.py, every probe that launches a browser), tests/audit-no-pattern-kill.sh v2, the self-test folder selftest-20261030-081142-full, ops/tools/lane-run.sh and lane-kill.sh, and the repo scripts run-rc executes (read with `git show` / `git rev-parse` only).
- Safety: I did not run the harness, any self-test, the audit, a browser, vite or a sim, and I signalled nothing. Commands were limited to sha256sum/sha1sum (`-c` included), stat, rg/sed/cat, and read-only git object reads.

## VERDICT: GO WITH CONDITIONS, for the legacy pre-run on 76390f2 only. NO-GO for the RC run until MJ1 is fixed.
B1, B2, M1 and M2 are fixed in the code, not just claimed, and I traced every stop and halt path below. No path signals anything except through lane-kill.sh with a PID from the run's own pidfile. No path writes a manifest, SHA256SUMS or DONE marker after a HALT unless the marker is then renamed. Three Majors remain:
- **MJ1:** variant builds are broken by the rework. The pre-run never reaches them; the RC run does.
- **MJ2:** a TERM survivor gets no stop-list entry and no sanctioned stop path. QA-R21-PW (3) is only partly met.
- **MJ3:** there is no rule-21 launch command for run-rc.sh itself.

Conditions for the pre-run go:
- **C1:** the Architect's re-review PASSes. None is on disk yet (see §6).
- **C2:** MJ2 is fixed and the halt self-test re-run, **or** HoO accepts the residual in writing.
- **C3:** UI QA gives the exact launch command, under ops/tools/lane-run.sh (MJ3).
- **C4 (recommended):** fix the port collision (m3). It fails safe, but it can halt the pre-run.

Before the RC run: MJ1 is fixed with a dry-run proof, the repo-script snapshot is refreshed on the final RC SHA, and m4, m5 and m6 are fixed or justified.

## 1. Hash and integrity checks (all verified by me)
| Item | Claimed | On disk | Result |
|---|---|---|---|
| harness/run-rc.sh sha1 | 0e080e5cbc13e66acca2074b4b8aa10c7f544504 | same | OK |
| harness/run-rc.sh sha256 | 0bd2bd47…1656 | 0bd2bd4721ff68b8afe7516e116046d5910e4c952e58d4952deccd10107e1656 | OK |
| run-rc.sh read-only | since 08:11:40 | `-r-xr-xr-x`, mtime 08:11:36 CET | OK |
| tests/run-rc-lane-helpers-REVIEW.md | 53648ffe…598f | 53648ffebea940d4b1c75ba4bda61de3774848414a74cfb8c5644bef51ec598f | OK |
| harness/SHA256SUMS | ceac41da…3d6e, 378 files, -c clean | ceac41da339eebf59165da31e8b447f5485a4670fde43776014e561900a83d6e, 378 lines, `sha256sum -c` rc 0; lists run-rc.sh at 0bd2bd47 | OK |
| top v5-ui SHA256SUMS | c57739b6…, unchanged | c57739b64a145b00294fc9e75e509399045d91df1e95875909337f2ff1dab1df, 5 files, -c rc 0 | OK |
| selftest-20261030-081142-full/SHA256SUMS | ac59eaa7… | ac59eaa769865d3855b825790cd92639c179309f5875dfd57a50705debe0ebef, 70 entries, -c rc 0; nested 4-halt/ and 5-pw-browser/ -c rc 0 | OK |
| ops/tools/lane-run.sh | pin 061e7c4f / sha1 f286a9a0 | 061e7c4fa31d46e47a9440becb90ca10e7ac9c46bee8f85aab8339892a1f1901 / f286a9a0a21aa1687f44f90fc4ebd65d6b561fad | OK = PINS.txt |
| ops/tools/lane-kill.sh | pin 9c89ddc0 / sha1 be136252 | 9c89ddc06a1b8d6dd36073c65084d2d2156dab031291bdc9ff557abf644d3817 / be1362520c6de7e562c6d5becc765e6fe887598a | OK = PINS.txt |
| ops/tools/PINS.txt | 08a30ce9… (REVIEW §3.5) | 08a30ce907fb1838cab63b0616415110c91f682a69a51e3805afa81a7b3a30f2 | OK |
| "da0fd21f superseded" | — | PINS.txt names it by sha1 7e8b5f4d. ops/.lane-kill.sh.bak-0807 is sha256 da0fd21f / sha1 7e8b5f4d. | OK in substance |
| §19 lib hashes | lane-proc ec22fa1a, lane-kill-check f55279b1, pw-launch b0e2b139, serve-lane 71d3f408 | same prefixes; all 4 files `r--r--r--` | OK |

## 2. What lane-kill actually prints, and the harness's exact-match check
- lane-kill.sh:38 prints `TERM <pid> (group)` with rc 0 for a live, recorded leader whose start time matches. That is the **only** success output for a live process. lane-kill sends the signal and returns; it never waits and never confirms.
- `GONE <pid>` with rc 0 (:33, :43) appears only when the leader is already gone **and** its group is empty. `GONE <pid> (group members remain, not signalled: …)` gives rc 1 (:33, :43). REFUSED gives rc 1. :39 `TERM <pid>` is the non-leader case.
- Our 07:55 decision said "anything but an exact 'GONE <pid>' rc 0 = halt". Read literally, that would halt every stop, because the TERM call can never print GONE for a live process. The harness does the correct two-step:
  1. lkcall accepts `TERM <pid> (group)` on the signal call (lane-proc.sh:22).
  2. lstop then waits for the leader (:23) and halts if it is still alive (:24).
  3. A report-only re-query must then print a clean stop line (:25). After the leader is gone, lane-kill can only print `GONE…` or REFUSED there, so a clean stop is in effect confirmed only by exact `GONE <pid>` rc 0.
- UI QA's claim "TERM 348636 (group) rc 0" is therefore correct for the signal call. The clean-stop proof is the following `GONE 348636` rc 0 (5-pw-browser/run/lane-kill.log, 08:18:01 TERM, then 08:18:08 GONE).
- **No mismatch.** One hardening item: lk_ok (lane-kill-check.sh:9-10) uses one whitelist for both contexts (m1).

## 3. End-to-end trace of every stop and halt path (file:line, frozen versions)
**Start (all steps).**
- lrun runs lane-proc.sh:36-50, then `lane-run.sh <lane> -- env QA_LANE QA_PIDFILE bash lib/lane-step.sh … -- cmd` (:38).
- lane-step.sh:9-11 takes the flock, writes the stamp, runs the cmd and writes the exit file.
- lane-run is setsid, so the step leader is the lane-step bash.

**lane-run failure.** :39-40 halts if lane-run reported "members still running" or wrote no exit file. Otherwise it returns the step's exit code.

**Empty recorded start time.** :42 run_halt (Architect m1 fixed).

**Normal step end.**
- The poll loop :43-48 ends when the leader is not alive with the same start time (:8).
- postcheck :49, then :28-33:
  - lkcall on the leader. Only an exact success line passes (it is `GONE <pid>` in practice); anything else halts.
  - Then every pidfile line appended after n0 (browser servers recorded by pw-launch) is checked. Alive means HALT (:32), which signals nothing. Gone means an lkcall re-query (:33).
- **B1 is fixed for the normal-exit path.**

**Watchdog timeout.**
- At :44, now − stamp > tmo (600 s for b() at run-rc.sh:132, 120 s for wk-preflight at :336).
- lstop (:21-25): lkcall TERM, then up to LSTOP_GRACE = 30 s of leader polling. Alive after that means HALT; otherwise a re-query.
- Then 124 goes to the exit file (:45).
- For a browser step (LR_KIND=browser): postcheck, then run_halt unconditionally (:46). That is QA-R21-PW (3).
- Non-browser main steps have tmo 0, so they have no watchdog, by design.

**lane-kill rc 0 vs rc 1 vs other output.** The exact case match is at lane-kill-check.sh:9-10.
- rc ≠ 0, or rc 0 with any extra text (stub cases f and l), halts at :16-17.
- The logged output goes to lane-kill.log (:15).
- Stub test 13/13 confirmed in 1-lane-kill-check.test.log.

**Survivors.**
- GONE-with-members gives rc 1, which halts.
- Evidence: 4-halt/s1/lane-kill.log 08:16:52, `GONE 332725 (group members remain, not signalled: 332738)` rc=1 → HALT. s2 covers the normal-exit variant.
- **B1 is fixed.** The gap is that the survivor is not in the stop list (MJ2).

**TERM-ignoring child.**
- lane-step's bash leader has default SIGTERM handling and dies at once. The child survives in the leaderless group, the re-query reports members, and the run HALTs.
- Exactly 2 lane-kill calls are made, with no escalation (4-halt s1).
- **MJ2 applies here.**

**HALT propagation.**
- run_halt (lane-proc.sh:18-19) appends to `$RTOP/HALT`, writes the stop list and does `exit 9` in the current shell.
- `halted` is checked at: lrun :36; step run-rc.sh:106; b :132; guard :129 (and in its pause loop, :130); lb :261 and :263 (before the partial manifest); vserve :268; p62 start :280; lane :340-341 (before each engine and at the end); engdone :335; zgbg_start :110.
- If run_halt fires inside a nested subshell or a `$( )`, only that subshell exits. The HALT file still stops every later step in both lanes. I checked the lb subshell (:262), the `$(step st26b…)` at :297 and the ZG watchdog subshell at :113.

**Both lanes.**
- Lane A (firefox) runs `( LANE=A; PO=0; lane … ) &`. Lane B (chromium then webkit) runs `( LANE=B; PO=1; lane … ) &` (:367-368).
- Main `wait`s on each and records non-zero rcs (:369).
- At :370, main halts if HALT exists or any driver rc ≠ 0. A lane dying on a `set -u` error therefore also halts the run.
- 4-halt s1 shows lane B refusing step 3 after the HALT and both drivers exiting 9. That is a mini-main, though (m10).

**Lane B load pause (≥ 12).** guard (:129-131) only sleeps 15 s at a time, before the next step. There is no SIGSTOP or SIGCONT. A HALT during a pause ends the loop, and lrun :36 then returns 99.

**WebKit.** wk_preflight (:336-339) runs via lrun with LR_KIND=browser and a 120 s watchdog. A failure skips only WebKit (`continue` at :340). A watchdog stop halts the run.

**Exit codes reaching main.**
- `lane` ends with `halted && exit 9; return 0` (:341).
- lb's return is ignored, but HALT gates everything after it.
- Main's run_halt then exits 9 → `trap on_main_exit EXIT` (:105) → lane-proc.sh:52-57 runs only when BASHPID = MAINPID. It writes the stop list, renames every SHA256SUMS*, *.DONE.json, WK-DONE.json, PRERUN.json and MERGED.json under RTOP to `*.HALTED-NOT-EVIDENCE`, writes HALTED.json and HALTED-NOT-EVIDENCE.txt, and exits 9.

**No manifest after a halt.**
- The manifest code (:379-418) is reached only after :370 and :377 (`halted && run_halt` before the manifest), and :378 zgbg_join halts in main if the ZG watchdog did.
- Partial per-engine sums (:264) and engine DONE markers (:335) written before a halt are renamed by the trap.
- Evidence: 4-halt/s1 holds SHA256SUMS.partial.chromium.HALTED-NOT-EVIDENCE and engines/chromium.DONE.json.HALTED-NOT-EVIDENCE, and has no SHA256SUMS. main.rc is 9.
- **B2 is fixed.**

**merge-engines.** :418 runs only after a successful manifest. merge-engines.py:26-31 sets every engine to HALTED when <run>/HALTED.json exists, and only WebKit for wk/HALTED.json; it then exits 1. tests/merge-engines-halted-test.log shows DONE ×3 → HALTED ×3 with rc 1. OK.

**vite (M1).**
- vserve (:268-270) starts `bash -c "cd $WT && exec npx vite preview … --strictPort"` via lane-run. An empty start time halts.
- vstop (:271) uses lstop if alive. If vite exited early, it runs postcheck and then halts.
- The repo serve-own.mjs is redirected by the pw-launch.mjs:38-40 resolve hook to lib/serve-lane.mjs. That file has no spawn or kill, and its stop() is a no-op (:11, :20). It imports serve-own `?orig` only for pure functions; serve-own has no top-level side effects (its signal handlers live only in serveForRun, which is replaced).
- scroll-sweep-p1.mjs:19 imports serve-lane directly.
- The p62 server (:280, :283) runs `exec node lib/serve.mjs` via lane-run and is stopped by lstop.
- **M1 is fixed.**

**Playwright (QA-R21-PW), lib/pw-launch.mjs.**
- (1) Every browser step goes through b()/lb() → lrun with a 600 s watchdog, and wk-preflight has 120 s. The preload is `H=…--import pw-launch.mjs` (:124) and is used in every probe call. A launch with no QA_PIDFILE is refused before launchServer (:28). **Met.**
- (2) `launch` is patched to launchServer + connect (:29, :33). `br.close` = browser close, then server.close (:34). The SIGTERM handler calls closeAll (:37). On process.exit, Playwright's own exit hook closes the browser. **Met in code.** The self-test stopped the browser with lane-kill instead; that path is the HoO stop-list path, not condition (2).
- (3) A browser-step watchdog stop always halts (lane-proc.sh:46), and the stop list is written. **Partly met: MJ2.**
- (4) The pidfile line is `PID STARTTIME BOOT_ID ISO cmd` (:18-24), and isoBelgrade matches `date -Iseconds` (pw-launch-static-check.log). The line passes lane-kill's well-formed-record awk (lane-kill.sh:19-21); the live test recorded `348636 346400 ad2ad629-… 2026-10-30T08:18:00+01:00 playwright chromium launchServer…`. **Met.**
- **Every probe imports `${QA_WT}/node_modules/playwright-core/index.mjs`**, the same module instance pw-launch patches. I grepped p1, p62, p64, csr, mrc1, axe62, axe-detail, lin-sweep, p65, p65-tap, scroll-sweep, qa-page (the 17 qa-page users), console-hook and wk-preflight. The repo scripts' bare `playwright-core` import resolves through exports `import → ./index.mjs` (checked on playwright-core 1.64.1). console-hook wraps the already-patched launch.
- No launchPersistentContext, launchServer outside pw-launch, connectOverCDP, spawn/fork/detached or exec of a browser anywhere in artifacts/v5-ui. **No browser is launched outside pw-launch.**

**M2 (audit v2).**
- 15 rules, quote-stripping, scoped allowlist and wiring checks (audit-no-pattern-kill.sh:20-106).
- The logs confirm 29/29 forms caught and 0 violations over 86 files (2-audit-forms-test.log, 2-audit-full.log).
- My own grep over non-test code found only:
  - `kill $SP` in the INERT lib/run-chain.p1-30b29d3.sh.orig, which nothing references;
  - `execSync('git …')` (scroll-sweep:21, zg-trace:16), `execSync('google-chrome --version')` (env-versions:7) and `subprocess.run(['git', …])` in the python libs. These are short non-detached children and not signals.
- **M2 is fixed.**

**d2-kill-browser.mjs (Architect m7).** At 76390f2 and 5e38d91 it is referenced only by scripts/README.md. It is not in the package.json scripts that run-rc uses (build, build:qa, build:html, which call sync-economy-cli, tsc, vite, build-html and check-release-build), not imported by rc0-browser, release-globals-browser or serve-own, and not called by run-rc (audit wiring check). **Not reachable.**

**Architect minors.**
- m1 fixed (lane-proc.sh:22, :42).
- m2 fixed, except that it introduced MJ1.
- m3 fixed (stoplist and the ZG watchdog), with gaps m5 and m6 below.
- m4 fixed (flock -n at :363 plus a re-check at :364).
- m5 fixed (frozen, re-hashed, self-tests run after the freeze at 08:11:40/42).
- m6 fixed in lane-kill.sh:40-44.
- n1 fixed (:70 `-$$`), n2 fixed (:126-130), n3 documented (:28), n4 reworded.

**Self-test claims.** All match the logs: 13/13, 29/29 plus 0 violations, 15/15, 18/18, 16/16, FULL RESULT PASS at 08:18:41 CET.

## 4. Findings
**MJ1 — Major (blocks the RC run and m5dry, not the pre-run): variant builds always fail with exit 127.**
- Where: run-rc.sh:106 `step()`, then lrun, then lane-run, then lane-step.sh:11 `"$@"` in a new bash process. The callers at run-rc.sh:206-213, :215, :219 and :227 pass the **shell function** `mkvariant` (:184) as the command. A new process cannot see it (no `export -f`; it also needs the unexported WT/REPO/SHA/FLAG_FILE), so every `variant-*` step exits 127.
- Introduced by the rework: tests/run-rc-lane-helpers.diff:105→111 changed step from in-shell `"$@"` to lane-run.
- Effect at the RC:
  - m4off, zg-on/off/confirm, ss-on/off, fc-off, m5-on and shipped are all NOT BUILT;
  - SS rows FAIL under QA_STRICT;
  - 62 M5.0 rows are UNVERIFIED;
  - ZG variant rows and E-4 m4off are skipped.
  That wastes the single RC run.
- MODE=prerun (setup, build, legacy, manifest) never calls it.
- Fix: call `mkvariant` directly (the flag edit is a short foreground python step) and keep only its inner `step build-$v …` under lane-run. Prove it with a QA_DRYRUN run that shows `variant-* exit=0`.

**MJ2 — Major: a TERM survivor has no stop-list entry and no sanctioned stop path, so QA-R21-PW (3) "stop list, no manual cleanup" is only partly met.**
- Where: lane-step.sh is the group leader with default SIGTERM handling, so it dies immediately on lane-kill's group TERM. The child (the node probe, a vite child, or any slow or TERM-ignoring process) is left in a leaderless group.
- lane-kill then, by design, only reports `GONE <leader> (group members remain…)` and will never signal those members (lane-kill.sh:30-34; README: "stop those through the runner's own shutdown").
- stoplist (lane-proc.sh:11-15) lists only pidfile PIDs that are alive, so the members never appear in it.
- Evidence: in 4-halt/s1/STOP-LIST-for-HoO.txt, survivor 332738 was alive at the HALT, but the file holds only the header and `# end`. HALTED.json stop_list is empty as well. The survivor is named only inside the HALT text.
- Every browser watchdog stop goes through this leader-dies-first path. A wedged probe would leave HoO with an empty stop list and no rule-21 way to stop it.
- Fix:
  1. lane-step keeps the leader alive until its child exits, without any kill, e.g. `trap ':' TERM`, start the cmd in the background, and re-`wait $c` in a loop until the child has really exited (a trap interrupts `wait`; no kill or `kill -0` is needed). A trapped handler is reset in the child, so the child still gets the group TERM. Then lane-kill has a live leader to re-TERM, and lstop's 30 s "still alive ⇒ HALT" lists it.
  2. stoplist also copies the "group members remain" PIDs from lane-kill.log into the stop list, report-only.
  3. Re-run 4-halt with an assertion that the stop list is non-empty.
- Alternatively, HoO accepts this residual in writing.

**MJ3 — Major (process): no rule-21 launch command for run-rc.sh itself.**
- Rule 21 requires long-running processes to start only via ops/tools/lane-run.sh. run-rc (hours) is not covered by any documented launch line in REVIEW §2 or the run-rc header.
- If it is started from a tool shell, a tool-host cut-off, like the one at 08:08 in the self-test, kills main.
- In that case the EXIT trap takes the rc≠0 branch (lane-proc.sh:53): it writes a stop list only. It writes **no HALT**, so lanes that survive keep starting steps, and DONE and partial markers are not renamed (see m6).
- Condition C3: UI QA states the exact command, e.g. `ops/tools/lane-run.sh uiqa-run-<sha7> -- env … artifacts/v5-ui/harness/run-rc.sh …`, and HoO agrees how that run is stopped (lane-kill on the main PID TERMs main plus the lane drivers; the EXIT trap writes the stop list).

**m1 — Minor:** lk_ok (lane-kill-check.sh:9-10) also accepts `TERM <pid>` / `TERM <pid> (group)` on the report-only re-queries (lane-proc.sh:25, :29, :33). A TERM there would mean a signal was sent and accepted as clean. It is near-impossible because alive() and lane-kill use the same start-time check, but it does not match our decision text. Use a GONE-only check for re-queries, and accept only `(group)` on the TERM call. The leaders are always setsid leaders.

**m2 — Minor:** there is no settle window between "leader gone" and the group re-query (lane-proc.sh:23-25, :43-49). A group member exiting a few ms after the leader would cause a spurious HALT:
- the npx → vite child in vstop;
- Chrome/Firefox/WebKit helpers after server.close() on a normal step end.
That is fail-safe, but untested. The self-test stopped the browser by lane-kill on the browser group. It did not test the normal Playwright close followed by an immediate re-query, the watchdog → SIGTERM-handler → closeAll path, or a real vite stop. Use bounded report-only re-query retries (e.g. 5 × 1 s) before halting.

**m3 — Minor (new in the rework):** port collision. Lane A sweep vite is on 5177+2·0 = **5177** (run-rc.sh:276), and lane B rc0 vite is on 5175+2·1 = **5177** (:284, :286). W rc0 (5179) also equals B sweep (5179). `--strictPort` makes the second vite exit, the probe may hit the other lane's server (same dist-qa, so serve-lane's own-chunk check passes), and vstop then HALTs. That is fail-safe, but it can cost the pre-run. Use disjoint port blocks per lane.

**m4 — Minor (RC only):** both lanes use `$LNB-main` concurrently (`step st26b-sizes-$eng` in run_m5, :297). postcheck (lane-proc.sh:31-33) treats every line after n0 as the step's own, so it can see the other lane's live step PID and raise a false HALT. Give each lane its own lane name for that step.

**m5 — Minor (RC only):** if main halts at :370 while ZG runs, the ZG watchdog subshell (:113) is never joined. It keeps polling and can later lane-kill TERM zg-trace and append to HALT after HALTED.json was written. It is not in the stop list.

**m6 — Minor:** on_main_exit's rc≠0 non-HALT branch (lane-proc.sh:53) should also write HALT and rename the markers, as on a halt. In addition, the rename `find "$RTOP"` (:55) does not exclude `./wk/`, so a main-segment halt would rename a separate, completed WK segment's WK-DONE.json and SHA256SUMS.

**m7 — Minor:** `QA_PW_LAUNCH_NO_PATCH` (pw-launch.mjs:38) is an inherited env escape hatch. If set, browsers launch unrecorded and unrefused. run-rc should `unset` it, as it does QA_M5_FORCE at :55.

**m8 — Minor:** lock waits have no cap (lane-step.sh:9; the watchdog counts from the stamp written after the lock). A step whose lock is held by a foreign process or a leaked holder waits forever instead of halting. The flock fd 9 is also inherited by the browser. Use `flock -w`, with a timeout exit code that halts.

**m9 — Minor:** the repo-script snapshot is 2fa7318, but the pre-run target is 76390f2. I checked at 76390f2:
- serve-own.mjs (1a75aff) and release-globals-browser.mjs (b18bede) are identical to the snapshot;
- rc0-browser.mjs differs (e566aae vs a787503) only in the s28rate assertions (+3 −2 lines, no process code);
- the current rc/v5 5e38d91 equals the snapshot for all three.
This is process-neutral for the pre-run. Refresh the snapshot on the final RC SHA.

**m10 — Minor:** the halt self-test drives a mini-main (4-halt/s1/main.sh) built on lib/lane-proc.sh, not run-rc.sh. run-rc's own wiring (lb, b, guard, lane, :369-377) is verified only by reading, which I did. A QA_DRYRUN stub run of the real run-rc would close this.

**Nits:**
- REVIEW §2 gives the pidfile format without BOOT_ID.
- REVIEW §3.6 says the audit fails if code references a `.orig` for execution, but no such wiring check exists (audit :102-106).
- The lane-kill-check.sh:3 header still cites da0fd21f.
- merge-engines.py:27 shadows the `h` lambda (harmless).
- After a halt, vstop and the p62 stop still lane-kill the run's own servers. That is rule-21 compliant, and the final stop list is regenerated by the trap, but it contradicts the "no further signals" wording in HALT.

## 5. Not verified (and why)
- I did not run any code, by instruction. Every behaviour here comes from reading the code plus the existing logs.
- Playwright and vite internal process handling (detached browser group, Playwright's exit-hook SIGKILL, npm exec signal forwarding) is third-party code covered by the QA-R21-PW exception. I did not read it.

## 6. Architect re-review status
engineering/reviews/ has no Architect file newer than ui-qa-run-rc-lane-harness-8bd8fb46-architect.md (07:51). Nothing references the frozen hashes 0bd2bd47, 0e080e5 or 53648ffe outside artifacts/, except ops-log.md. **The re-review is pending (C1).**
