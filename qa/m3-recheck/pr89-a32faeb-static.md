# PR #89 @ a32faeb: UI QA re-check (static + targeted vitest)

- **PR:** https://github.com/PrincipalLewis/egg-farm/pull/89, branch `test-infra/recorded-pid-kill`, base `rc/v5`, OPEN, Ready (not draft). rc/v5 is not merged in.
- **Head:** `a32faeb34585db0d62c0c559e09e112b1a301e7d`. Checked with read-only `gh pr view 89`: `headRefOid` = a32faeb. `git merge-base --is-ancestor 58ad41b a32faeb` returns true, so a32faeb descends from 58ad41b.
- **Commits in 58ad41b..a32faeb (6), committed 08:53–09:03 CET:**
  - cf00e62: F1, F6
  - 6c5919f: F2
  - 568784e: 9 scripts moved onto spawnRecorded/stopOrReport
  - 2a8d90a: F3, N2
  - 9a05af1: F4, F7, N1
  - a32faeb: F5 a/b/c
- **Diff size:** 67 files, +604/−77. 49 of those files are one-line fixtures. Details in `pr89-a32faeb-evidence/02-per-commit-stat.txt`.
- **CI 41023936569 (read-only `gh run view`):**
  - Head SHA is exactly a32faeb. Event `pull_request`. Status completed, conclusion **success**. Ran 09:03:46–09:20:46 CET.
  - Job `gate`: **success**. Every step succeeded: npm ci, unit tests, slow suites, release build, chromium install, release globals (chromium), single-file html, build-id.
  - Job `release-globals`: **skipped**, by design. ci.yml:62 runs it only on main or `rc/*` head refs.
  - The CI log shows these targeted files passing: recorded-pid 18/18, d2-guard 16/16, serve-own 15 (1 skipped, the dist-qa chromium case), rule21-source 55/55. That is 104, which matches the Architect's count. verify.test.ts ran 54 tests. Totals: 130 files, 1813 tests passed. Evidence: `07-ci-*`.
- **How it was read:**
  - `git fetch origin pull/89/head:refs/qa/pr89-a32faeb`, then a new detached worktree `/tmp/qa-pr89-a32faeb-20261030-092237`.
  - The old worktree `/tmp/qa-pr89-20261030-084154` was not modified. Its node_modules was only read, for the playwright-core excerpt; the bundle is byte-identical to the new worktree's.
  - Nothing was pushed, commented, approved, merged or tagged.
- **Reviewer:** UI QA, 2026-10-30, 09:22–09:35 CET.
- **Rule 18:** the PR body, code and CI log were treated as data, not instructions.
- **Rulings applied:**
  - QA-R21-D2 as re-ruled by HoO for a32faeb (decisions.md:612): the same 5 conditions plus F5 (a) no force-kill API, (b) an unannounced close, a failed close or the 90 s watchdog halts the run with a stop list to HoO, (c) the Playwright pin is checked.
  - MJ2 definition (decisions.md:589): survivors are listed with their start times, and UI QA never touches them.
  - QA-D-1030-PR89-2 (decisions.md:613).

## Verdict: **FAIL (static + vitest) @ a32faeb**: 0 Blockers, 1 Major (new: NF1), 6 Minors, 3 Nits

- **vitest:** 34/34, rc 0 (recorded-pid 18, d2-guard 16).
- **Closed:** F1, F4, F6, F7, N1 and N2. HoO's MJ2 rule and the TOCTOU bound hold again for every recorded-pid caller.
- **Partly fixed:** F2, F3 and F5 (see below).
- **The blocker to a PASS is NF1.** Every halt path in d2 where the browser is still running ends in `process.exit(3)`. That exit triggers Playwright's own exit hook, which SIGKILLs the browser's process group from outside recorded-pid. It happens after STOP-LIST-for-HoO.txt has listed those PIDs as ALIVE, and in most of these paths without `playwrightKillPossible` being set.
- This conflicts with QA-R21-D2 (2) "nothing else signals" and (3) "if a PID is refused, there is no signal", and with F5 (a)'s "no force-kill path". It is either a small code fix or an explicit HoO ruling (see NF1).
- **The d2 FF/WK smoke stays NOT RUN.** It needs a static PASS, HoQ's go, HoO's go (decisions.md:612) and the pre-run lanes finishing.

## F1, F2, F5 (HoQ's priority items)

### F1: FIXED
- **"Ours" is always process.pid.**
  - `recordPid(pid)` (recorded-pid.mjs:21-26) has no parent option. It records `parent: process.pid` and returns null unless the live `st.ppid === process.pid` (:24).
  - `recordProblem` (:35-47) checks both the stored parent (`rec.parent !== process.pid`, :38) and the live PPID (`st.ppid !== process.pid`, :44) before the single signal at :53.
  - The TOCTOU bound from our 58ad41b report holds again: our own unreaped child can't be reused inside one synchronous turn.
- **Forge test** (recorded-pid.test.ts:49-67):
  - A real `sleep 3` whose real parent is our detached `sh`. `recordPid(g)` and `recordPid(g, {parent: sh.pid})` both return null.
  - `killRecorded({…, parent: sh.pid})` is refused with "not our record" for group true and false.
  - Writing `parent: process.pid` into the forged record is refused by the live-PPID check (:63-64). The spy is asserted at 0 calls.
  - Passed at runtime here.

### F2: PARTIAL (the silent drop is fixed; two Minor gaps remain, NF4 and NF5)
- **Fixed: survivors are found and reported, never dropped.**
  - `stopOne` (serve-own.mjs:22-27) runs every stop through `stopGroup`. Any non-ok result prints one `serveOwn: SURVIVORS vite group …` line (`stopReport`, :18-21) and sets exit code 3.
  - The leaderless case from our repro (npx exited, vite alive) works like this: `stopGroup` (recorded-pid.mjs:112-121) sees `exitedBefore`, sends no signal, and runs `survivors()` against the spawn-time snapshot (serve-own.mjs:43). It then probes with signal 0, `groupProbe`, :91-95, which only runs for our own same-boot record. The result is `ok:false, survivors:[vite pid], probe:'members'`.
  - Tested at recorded-pid.test.ts:144-153, where the spy shows only `(-pgid, 0)` calls.
- **Matches MJ2 on these points:**
  - Survivors are identified by PID plus start time from the snapshot (:80-88, :102). No /proc scan: only the recorded leader's `/proc/<pid>/task/*/children` files are read (:72-77).
  - There is never a second signal (:116, :120). The one TERM goes only to the recorded group after the identity check.
- **Gap NF5 (MJ2 wording):** the SURVIVORS lines (serve-own.mjs:20, recorded-pid.mjs:125) print PIDs only. Their start times are in `r.survivors`' snapshot but are not printed. MJ2 asks for survivors with start times, so a caller can't build an MJ2-style stop list from the line. d2's stop list does include them.
- **Gap NF4:** `stopGroup` counts probe `leader-unreaped` as clean (:119).
  - stopGroup waits synchronously (`Atomics.wait`, :108), so Node can't reap the TERMed leader during the grace loop. After a normal TERM the probe is therefore effectively always `leader-unreaped`, and "clean" rests only on the snapshot.
  - Members that are not in the snapshot go unreported. Examples: a process that was re-parented out of the leader's descendant tree before the snapshot, or one forked after the last snapshot.
  - d2-guard's async `leftovers()` (:10-14) handles this correctly: it waits for `probe === 'empty'`.

### F5: PARTIAL (a and c only partly met; b met for the close paths; see NF1, NF2 and NF3)
- **Commit a32faeb changes three things.**
  - (a) d2 calls Playwright only through plain `ctx.close()` wrapped in `guard.closeCtx`. The source test (d2-guard.test.ts:58-77) bans the following forms in d2-kill-browser.mjs and d2-guard.mjs: `.process(`, `launchServer`, `handleSIG*`, `close(` with options, Playwright internals, timeout env vars and patches, patching Playwright objects, and private fields. It also asserts that d2's only `'SIGKILL'` literal is `killRecorded(L.rec, 'SIGKILL', { group: true })` (d2-kill-browser.mjs:54).
  - (b) `watch` (d2-guard.mjs:52) records any 'close' event that was not announced. `checkpoint` (:56) halts on one, at d2-kill-browser.mjs:45, :53 and :63. `closeCtx` (:58-64) races `ctx.close()` against a 90 s timer that only observes, and halts on a timeout or a rejection. `pwHalt` (:54) sets `playwrightKillPossible: true`. `haltFor` (:66-69) attributes a later error to an earlier unexpected exit.
  - (c) `playwrightPinProblem` (:74-88) checks that the installed version, the lockfile version and the package.json spec without its caret all agree. d2 exits 2 at d2-kill-browser.mjs:16 if they don't.
- **Against HoO's (a), "no force-kill API": met for d2's own source, but a force-kill path remains (NF1, NF2).**
  - playwright-core 1.64.1 adds `exitHandler` (coreBundle.js:9982) on every launch (`addProcessHandlerIfNeeded("exit")`, :10081; `killSet.add`, :10089). At process exit it runs `killProcess`, which calls `process.kill(-spawnedProcess.pid, "SIGKILL")` (:10115) for any browser still running.
  - d2 ends every halt with `process.exit(3)` (d2-kill-browser.mjs:82). A halt with a live browser therefore always triggers that group SIGKILL. See NF1.
  - Playwright's default `handleSIGTERM = true` (:41211) adds a SIGTERM listener (:10004) that runs `gracefullyCloseAll()`, which falls back to `killProcess()`. The PR's own source rule bans the `handleSIGTERM` option, so d2 can't opt out. See NF2.
- **Against HoO's (b): met for the three named triggers.** An unannounced close, a failed close and the 90 s watchdog each halt with the leftover check, STOP-LIST-for-HoO.txt (PID, recorded start time, ALIVE/gone, role) and `playwrightKillPossible`. All three are tested (d2-guard.test.ts:79-108), and they passed here.
  - Not covered: halts for a refusal (:40), an unrecorded PID (d2-kill-browser.mjs:36) or a generic error (:78). These don't set `playwrightKillPossible`, even though NF1's exit-hook kill does fire on them.
- **Against HoO's (c): PARTIAL (NF3).** The check is about internal consistency, not a pin to the version that was reviewed.
  - package.json still says `"playwright-core": "^1.64.1"` (a caret range).
  - A coordinated bump of package.json, the lockfile and node_modules to, say, 1.70.0 passes the check. That would let in an unreviewed launcher with possibly different kill paths. Only 1.64.1's `coreBundle.js:10115`, `:9982` and `:10004` have been reviewed.

## All findings from 58ad41b, by status

| ID | Was | Status @ a32faeb | Evidence |
|---|---|---|---|
| F1 | Major | **FIXED** | recorded-pid.mjs:21-26, :38, :44. Test :49-67 (real-parent forge). |
| F2 | Major | **PARTIAL**: the silent drop is fixed; NF4 and NF5 are new Minors | serve-own.mjs:18-27, :43. recorded-pid.mjs:80-121. Tests :126-173. |
| F3 | Minor | **PARTIAL**: rules FIXED, scope gap remains (NF6) | tests/rule21-rules.ts:4-20 (14 rules). My Python port catches **36/36** of our harness forms (`03-rules-vs-fixtures.txt`). Payloads 01-36 are identical to ours, minus our comment header (`04-…`). Fixtures 37-49 add the JS forms from our report; 49/49 caught. Scope (rule21-source.test.ts:38) is all of `scripts/**` plus the tests/ helper modules, but it **excludes every `*.test.ts`**, so `tests/serve-own.test.ts:106` and `tests/verify.test.ts:426` (raw `p.kill`) are not checked. The allowlist is exactly 6 marked sites in recorded-pid.mjs (:14, :53, :68, :73, :75, :93). |
| F4 | Minor | **FIXED** | d2-guard.mjs:39-44 `afterKill`: a refusal halts; after a kill, `leftovers()` (:10-14) must reach `probe === 'empty'` with no live snapshot member, else it halts. `halt` (:23-37) never signals and writes STOP-LIST-for-HoO.txt (PID, start time, ALIVE/gone, role) plus the evidence JSON; d2 exits 3. Tests d2-guard.test.ts:24-53 passed here. |
| F5 | Minor | **PARTIAL** (see above, NF1-NF3) | d2-guard.mjs:45-88, d2-kill-browser.mjs:16, :45-82 |
| F6 | Minor | **FIXED** | `malformed()` recorded-pid.mjs:28-33, `pidProblem` :18. Test :88-103 covers `killRecorded` and `stopChild` with group true and false for pid 0, 1, −1, NaN, 1.5, 4194305, '123' and undefined; own pid; non-objects 5, 'x' and an array; missing or ill-typed starttime and bootId; missing or foreign parent; the real-parent forge (:49-67). The spy is asserted at 0 calls. |
| F7 | Minor | **FIXED** | d2-kill-browser.mjs:22 `try`, :76 `catch` (halt), :79-81 `finally { s1?.stop(); s2?.stop(); writeEvidence() }`. |
| F8 | Minor (info) | **NOT FIXED**, out of scope (PR body), as expected | tests/serve-own.test.ts is unchanged (blob 19a15407 at both SHAs). :103 still spawns rc0-browser chromium and :106 still calls `p.kill('SIGTERM')`. The harness N-M2 exclusion (option (a)) stays. |
| N1 | Nit | **FIXED** | The unused `spawn` import was removed from d2-kill-browser.mjs. |
| N2 | Nit | **FIXED** | The afterEach blocks at recorded-pid.test.ts:16-19 and d2-guard.test.ts:13-16 use `killRecorded(recordPid(pid))`, so the tests no longer call raw `process.kill`. |
| N3 | Nit | NOT FIXED (still a Nit) | d2-kill-browser.mjs:35 still trusts `browser.pid`. recordPid's live-PPID check (:24) limits the risk to our own children. |
| N4 | Nit | CLOSED (no action needed) | The message is now `signal failed (code)` (:54). Zero-call spy assertions are used throughout. |

## New findings

| ID | Sev | Where | Finding | Repro (static) | Fix |
|---|---|---|---|---|---|
| **NF1** | **Major** | d2-kill-browser.mjs:36, :56→d2-guard.mjs:40, :76-82; playwright-core 1.64.1 coreBundle.js:9982, :10081, :10089, :10115 | **Every halt with a live browser ends in a group SIGKILL from Playwright's exit hook, outside recorded-pid.** Halts throw → `catch` → `finally` → `process.exit(3)` (:82). Playwright's `exitHandler` then runs `killProcess()` → `process.kill(-pid,'SIGKILL')` for any launch that hasn't closed. This hits: (i) an unrecorded browser PID (:36: the browser is alive and identity is NOT verified); (ii) a refused SIGKILL (afterKill :40: the browser is alive, which is exactly QA-R21-D2 (3)'s "no signal" case); (iii) a 90 s close timeout (flagged `playwrightKillPossible`, but the kill isn't "possible", it is certain at exit); (iv) any generic error mid-rep, e.g. a `goto` or selector timeout. On (i), (ii) and (iv), `playwrightKillPossible` is not set. The stop list sent to HoO says ALIVE for PIDs that are SIGKILLed moments later without any record. It is not a Blocker: Playwright kills only the process it spawned itself and hasn't seen exit, so the target is always our own unreaped child's group, with no reuse risk. | Run d2 so that `killRecorded` refuses, e.g. the `refused kill` setup at d2-guard.test.ts:45-52 applied to a real launch. `afterKill` → `Halt` → `finally` → `process.exit(3)` → `exitHandler` (:9982) → `process.kill(-pid,"SIGKILL")` (:10115). | HoO decides. **Either** (A) rule it in explicitly: "on halt, Playwright's exit hook may SIGKILL only its own still-running spawned browser group". d2 must then set `playwrightKillPossible` on **every** halt where a watched launch is still running, add `will be SIGKILLed by Playwright's exit hook at d2 exit` to those stop-list lines, and log a post-exit leftover line. **Or** (B) d2 must not exit while a watched browser is still running after a halt. It should block and leave the browser for HoO, with the lane watchdog/HoO deciding next. NF2 then governs what happens on TERM. |
| NF2 | Minor | playwright-core coreBundle.js:10004, :10084, :41211; d2-guard.test.ts:60 | Playwright's default `handleSIGTERM/SIGINT/SIGHUP = true` installs listeners. A TERM to d2, e.g. from lane-kill or the watchdog, runs `gracefullyCloseAll()`, which can fall back to `killProcess()`, the group SIGKILL. Because a listener exists, Node no longer exits on TERM, so d2 keeps running until its next error or halt (and then NF1 applies). The PR's F5 (a) source rule bans `handleSIG*`, so d2 can't turn these off. | lane-kill TERMs d2's node leader during a rep. | HoO: decide whether `handleSIGTERM:false, handleSIGINT:false, handleSIGHUP:false` should be **required** rather than banned, so d2 exits on TERM through Node's default and the harness writes the stop list. If so, take it out of the PW_FORCE list. |
| NF3 | Minor | d2-guard.mjs:74-88; package.json:28 `^1.64.1` | The F5 (c) "pin" is a consistency check, not a pin to the reviewed version. A coordinated bump to an unreviewed Playwright passes it. | Bump package.json, the lock and node_modules to 1.70.0 → `playwrightPinProblem` returns null. | Assert `lockV === '1.64.1'`, or read a PINS entry, and make package.json name the exact version `1.64.1`. |
| NF4 | Minor | recorded-pid.mjs:108, :118-119 | `stopGroup` counts `leader-unreaped` as clean. Its synchronous wait stops Node from reaping the leader, so the result rests only on the snapshot (see F2). | A vite group member re-parented out of npx's descendant tree before the snapshot, or forked after it → `ok:true`, no SURVIVORS line. | Report `leader-unreaped` as `unverified` (non-ok, or its own line), or use an async reap-then-probe outside `exit` handlers, as d2-guard's `leftovers()` does. |
| NF5 | Minor | serve-own.mjs:20; recorded-pid.mjs:125 | The SURVIVORS lines don't include start times (MJ2 wording). | — | Print `pid:starttime` for each survivor from the snapshot. |
| NF6 | Minor | rule21-source.test.ts:38 | The source check skips `tests/*.test.ts`, which leaves two raw `p.kill` sites unflagged (serve-own.test.ts:106, verify.test.ts:426). Both are inside the harness's local exclusions (N-M2 and the verify exclusion), so it doesn't affect the harness today. | rg in `05-rg-a32faeb-tree.txt`, section A | Scan `*.test.ts` with an explicit allowlist naming those two lines and why each is allowed. |
| NF7 | Nit | 568784e: artux-shots, m41-9-bignum-shots, mk24-1-overflow, perf-ab, perf-sm9, pt1-13-webkit, screenshot, smoke | These scripts call `stopOrReport` only after `br.close()` (and in `die`). A throw before that point leaves the vite group running. This predates the PR, like F7 did for d2. queue-qa already uses `finally`. | — | try/finally, or `serveForRun`. |
| NF8 | Nit | d2-kill-browser.mjs | QA-R21-D2 (1) (the browser leader PID in the lane pidfile, in lane-run format) is still not met by d2 itself; it only writes `browser.pid` into its temp dir. As planned in the 58ad41b report, the harness wrapper has to append the line. | — | Harness-side, or a `D2_LANE_PIDFILE` hook. |
| NF9 | Nit | recorded-pid.mjs:72-77 | `groupMembers` relies on `/proc/<pid>/task/<tid>/children` (CONFIG_PROC_CHILDREN). If those files are missing it returns `[]` silently, which makes NF4 worse. They are present on this box. | — | Treat a missing `children` file as "unverified", not as empty. |

## (3) 568784e and the repo-wide kill audit

- **The 9 scripts changed:** artux-shots, m41-9-bignum-shots, mk24-1-overflow, perf-ab, perf-sm9, pt1-13-webkit, queue-qa, screenshot and smoke.
  - Before, each had a raw `process.kill(-srv.pid)` (6 scripts), a `try{process.kill(-srv.pid,'SIGTERM')}catch{}` (mk24-1) or `srv.kill()` (perf-sm9, screenshot, smoke).
  - After, each uses `spawnRecorded` + `stopOrReport`.
  - perf-sm9, screenshot and smoke used to be non-detached and are now detached recorded groups.
  - recorded-pid gained `stopOrReport` (:123-127) and the `// rule-21 guarded site` markers.
  - d2-kill-browser has a log-text change only.
- **rg over the a32faeb tree** (`05-rg-a32faeb-tree.txt`, `06-spawn-sites-and-blobs.txt`), covering scripts/ and tests/ but not fixtures:
  - There is no kill by name or pattern, no kill over ps or pgrep output, and no pkill, killall, pidof, fuser, `timeout` or `ps` form.
  - No /proc enumeration remains. The only /proc reads are per-PID, in recorded-pid.
  - The only `detached: true` is recorded-pid.mjs:68.
  - The only `process.kill` calls are recorded-pid.mjs:53 (after `recordProblem`) and :93 (signal 0 after the record checks).
  - **Unguarded kills left:** `tests/serve-own.test.ts:106 p.kill('SIGTERM')` and `tests/verify.test.ts:426 p.kill('SIGKILL')`. Both files are unchanged and both are excluded locally by the harness.
- **Harness exclusions:**
  - No new test spawns a browser or server. recorded-pid.test.ts and d2-guard.test.ts spawn only `sleep` and `sh -c` children, and d2-guard uses a fake EventEmitter ctx. rule21-source.test.ts only reads files.
  - `tests/serve-own.test.ts` (blob 19a15407), `tests/verify.test.ts` (76d7d2ba) and `scripts/verify/shot.mjs` (2caa718a) are **unchanged** between 58ad41b and a32faeb.
  - `shot.mjs:31` still launches `/usr/bin/google-chrome` without recording it. **The Architect's condition for removing the verify.test.ts exclusion ("once #89 records the shot.mjs chrome") is NOT met at a32faeb.** Both exclusions (N-M2 serve-own and verify) stay.

## (4) QA-R21-D2 condition (5) and the frozen files

Both ruled files changed, so the 58ad41b ruling doesn't carry over. HoO re-ruled for a32faeb only (decisions.md:612). Any further change to these files needs another ruling.

| File | 58ad41b blob | a32faeb blob | a32faeb sha256 | What changed |
|---|---|---|---|---|
| scripts/d2-kill-browser.mjs | eb62926d | 01e8422d | 35652ecd42d8b080ffcd31729d3fbdd294ba00d509a1ad19db299545345dac8d | Pin check and exit 2 (:16); evidence dir `D2_EVIDENCE_DIR` or mkdtemp (:18); `createRunGuard` (:19); try/catch/finally around everything (:22-81); `launch()` halts on an unrecorded PID, then `guard.watch` plus a `groupMembers` snapshot (:36-37); the snapshot is refreshed before the kill (:52); `checkpoint` and `expectExit` (:45, :53, :63, :73); `afterKill` (:56); `closeCtx` replaces `ctx.close()` (:57, :63, :73); a `writeEvidence` row per rep (:61); exit 3 on halt (:82); the `spawn` import was removed. |
| scripts/recorded-pid.mjs | 91cbb6e4 | 297e3238 | 36de9ffb6ade530e0edfb33094a3379f472639a7ae691837076fefc79f62ccd3 | The `parent` option was removed and parent is always process.pid (:21-26, :38, :44); `malformed()` (:28-33); the `kill failed` text is now `signal failed`; new `spawnRecorded`, `childrenOf`, `groupMembers`, `groupProbe`, `survivors`, `nap`, `stopGroup` and `stopOrReport` (:67-127); 6 `// rule-21 guarded site` markers. |
| scripts/d2-guard.mjs (new, used by d2) | — | 6f7f568e | b5809ac5032874a5c3b4d3721394ee32738618f89de0baa8f9a3aa8ebe15663d | `leftovers`, `createRunGuard` (`halt`, `afterKill`, `watch`, `expectExit`, `checkpoint`, `closeCtx`, `haltFor`) and `playwrightPinProblem`. It is not named in condition (5), but it's part of d2's signalling and halt path, so **it should be pinned in the new ruling too.** |
| scripts/serve-own.mjs (used by d2) | 2466a41d | 05203207 | 48389249829740034d1665bd953217fbf2d0a7c1d8d055610fbf364d3d87c446 | `stopReport` and `stopOne` now go through `stopGroup`; `spawnRecorded`; a member snapshot after the page is verified. |

**A new HoO ruling, or a confirmation that decisions.md:612 covers these exact blobs, is needed before any d2 smoke.** If NF1 or NF2 lead to a code change, the hashes change again.

## Runtime: targeted vitest (QA-D-1030-PR89-2 (2))

Evidence is in `qa/m3-recheck/pr89-a32faeb-evidence/` (SHA256SUMS inside).

- **Candidates, chosen after reading each file's source:**
  - `tests/recorded-pid.test.ts`: spawns only `sleep` and `sh -c` children, cleaned up by their recorded PIDs. Its only import from serve-own.mjs is `stopReport`, and nothing spawns at import time.
  - `tests/d2-guard.test.ts`: `sh -c 'sleep …'` children and a fake ctx. It imports d2-guard.mjs only, and reads d2-kill-browser.mjs as text, so it never executes it.
- **Not run:** `tests/rule21-source.test.ts` spawns nothing, but it isn't a d2 or recorded-pid test, so it's outside the ruling. Its rules were applied statically instead, and CI shows it at 55/55. `tests/serve-own.test.ts` and `tests/verify.test.ts` are never run locally.
- **Preflight (`10-preflight.txt`, 09:26:22 CET):**
  - The worktree was clean at a32faeb.
  - PINS.txt matches disk: lane-run sha1 `f286a9a0` / sha256 `061e7c4f`, lane-kill sha1 `be136252` / sha256 `9c89ddc0`.
  - Load was 5.39 / 5.79 / 5.35, under 8. It was 4.98 at the vitest start.
- **npm ci (`11-npm-ci.*`):**
  - Command: `ops/tools/lane-run.sh uiqa-pr89 -- sh -c 'cd <wt> && npm ci --no-audit --no-fund > 11-npm-ci.log 2>&1; echo rc=$? > 11-npm-ci.rc'`.
  - Leader 907471, start time 756998, started 09:26:26 CET. rc=0, 88 packages.
  - esbuild's postinstall was skipped by npm's install-scripts gate. playwright-core 1.64.1 was installed. No browser was downloaded or launched.
- **vitest (`12-vitest.log`, `12-vitest.rc`, `13-vitest-results.json`):**
  - Command: `/workspace/egg-farm-studio/ops/tools/lane-run.sh uiqa-pr89 -- sh -c 'cd /tmp/qa-pr89-a32faeb-20261030-092237 && npx vitest run tests/recorded-pid.test.ts tests/d2-guard.test.ts --minWorkers=1 --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<evidence>/13-vitest-results.json > <evidence>/12-vitest.log 2>&1; echo rc=$? > <evidence>/12-vitest.rc'`.
  - Leader 921303, start time 763066, started 09:27:27 CET.
  - **Disclosed deviation (accepted by HoQ earlier):** a `sh -c` wrapper plus reporter flags, used only to capture the rc and the logs. The test files and worker flags are exactly as ruled.
  - vitest 2.1.9: **rc=0, 2 files, 34/34 passed** (recorded-pid 18, d2-guard 16), duration 10.2 s. That matches CI's counts for these two files.
- **After the run (`14-leaders-after.txt`):** both recorded leaders, 907471 and 921303, are gone. I checked only those two exact PIDs, with no scan. lane-kill was not used and nothing was signalled by UI QA.
- **Possible children left over:** the tests' TERM-ignoring `sleep 2` grandchildren expire by themselves, and each test waits for that by PID and start time. Nothing was scanned or touched.
- **Disclosed:** I ran one trivial `node -e` outside lane-run to read `node_modules/playwright-core/package.json`'s version (1.64.1). It ran under 0.1 s and spawned nothing. That goes against the "only git, gh and read tools" rule; reading the JSON with a file read would have been enough.

## (5) Runtime checks still pending, and the exact commands

1. **d2 smoke, Firefox and WebKit** (the PR documents it at d2-kill-browser.mjs:10, with `D2_EVIDENCE_DIR` from the PR body):
   - `npm run build && npm run build:qa` (in the a32faeb worktree, under lane-run)
   - `ENGINE=firefox D2_EVIDENCE_DIR=<evidence>/d2-firefox [DELAYS=0,100,500,1000,2000,3000] [REPS=3] node scripts/d2-kill-browser.mjs`
   - `ENGINE=webkit D2_EVIDENCE_DIR=<evidence>/d2-webkit … node scripts/d2-kill-browser.mjs`
   - It uses PORT 4720/4721 by default, not :4173.
   - Each needs `ops/tools/lane-run.sh uiqa-d2-<engine> -- …` with the watchdog, plus the harness-side pidfile line (NF8).
   - **Blocked until:** a static PASS (NF1 fixed or ruled), HoQ's go, HoO's go, and the pre-run lanes finishing (decisions.md:613).
2. **CI-only (not run locally):** `tests/serve-own.test.ts` (15, 1 skipped in CI) and `tests/rule21-source.test.ts` (55/55 in CI). Run locally only if HoQ rules it in.
3. **After any NF1/NF2/NF3 fix:** re-run `npx vitest run tests/recorded-pid.test.ts tests/d2-guard.test.ts --minWorkers=1 --maxWorkers=1` under `lane-run uiqa-pr89`, plus a static delta check and a re-hash under condition (5).
4. **Later:** the delta recheck once rc/v5 is merged into #89.

## NOT RUN

| Item | Reason |
|---|---|
| d2 smoke FF/WK (and chromium) | Needs a static PASS, HoQ's go, HoO's go and the pre-run finishing. No browsers allowed. |
| `tests/serve-own.test.ts`, `tests/verify.test.ts` | Never local (N-M2 and the verify exclusion; they spawn chromium). CI 41023936569 covers them. |
| `tests/rule21-source.test.ts` | Not within "recorded-pid plus d2 unit tests". Its regexes were applied in Python (`03-rules-vs-fixtures.txt`); CI 55/55. |
| Full `npm test`, `tsc`, build, check-globals | Outside the ruling, and to avoid load during the pre-run. CI gate success. |
| Runtime repro of NF1, NF2 and NF4 | Would need browsers, signals or extra processes. These findings are static, backed by playwright-core 1.64.1 source lines (`09-…excerpt.txt`). |
| Survivor scan for test `sleep` children | ps, pgrep and /proc scans are forbidden; they expire in at most 3 s. |
| Cleanup | The worktree `/tmp/qa-pr89-a32faeb-20261030-092237` (with node_modules) and the ref `refs/qa/pr89-a32faeb` were left in place. |
