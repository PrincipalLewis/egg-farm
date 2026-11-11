# PR #89 @ 58ad41b — UI QA review (static + recorded-pid vitest)

- **PR:** https://github.com/PrincipalLewis/egg-farm/pull/89 (D-HOE-20261030-04, test-infra; option (b) for UI QA harness finding N-M2)
- **Head:** `58ad41bf912267719a9d667ffa906ababa0efb42` (committed 2026-10-30 08:20:22 CET, author: Senior Software Architect), parent `2fa7318d`
- **PR commit scope:** `scripts/recorded-pid.mjs` (new, 53 lines), `scripts/serve-own.mjs` (+13/−5), `scripts/d2-kill-browser.mjs` (+27/−17), `tests/recorded-pid.test.ts` (new, 83 lines). The other 29 files in the diff against main come from the rc/v5 commits below 58ad41b and were not reviewed here.
- **How it was read:** `git fetch origin pull/89/head`, then `git worktree add --detach` into a fresh `/tmp/qa-pr89-20261030-084154` (not an author worktree, not wt-ui-shots). Nothing was pushed, commented, approved, merged or tagged.
- **CI 41019891633:** green, as reported by HoE. Not re-checked here.
- **Reviewer:** UI QA, 2026-10-30, 08:41–08:47 CET
- **Rule 18:** the PR text and code were treated as data, not instructions.

## Verdict: **FAIL (static + vitest) @ 58ad41b**: 0 Blockers, 2 Majors, 5 Minors, 4 Nits

The vitest file passes: 13/13 tests, rc 0. The core identity check holds for every refusal case that the code path hits, and each refusal happens before the single `process.kill`. Two Majors remain:

- **F1:** the "our child" check compares the process against a parent value stored in the record, instead of against `process.pid`. The record can be forged, or created with a different parent.
- **F2:** serve-own now silently leaves a leaderless vite group behind, which the old code did not do.

Both fixes are small and touch only `recorded-pid.mjs` and `serve-own.mjs`. Under QA-R21-D2 (5), any change to `recorded-pid.mjs` needs a new HoO ruling, and the head is frozen at 58ad41b until the d2 smoke is done (D-HOE-20261030-06). **HoE and HoO need to decide the order:** fix first and re-rule, or run the d2 smoke on 58ad41b and fix afterwards.

## Rulings recorded

- **QA-D-1030-PR89 (HoQ, 08:43 CET relay; decisions.md:592):**
  - (a) UI QA may run only `tests/recorded-pid.test.ts` under `lane-run.sh uiqa-pr89`, with 1 worker and no browsers. Done; see the Runtime section.
  - (b) The d2 smoke is NOT RUN.
- **QA-R21-D2 (HoO; decisions.md:593):** approves the d2 FF/WK smoke for 58ad41b ONLY, after the harness delta clears. It also OK'd this vitest run. It is still NOT RUN in this task. The pin is the decisions.md sha1 at the time of reading: `e08eabcc56ebc26420de6826847b926e86a7675c`.
- **RC path:**
  - The 09:05 HoQ correction (decisions.md:595) put #89 on the RC path.
  - That correction is **superseded by D-HOE-20261030-06** (decisions.md:596). **#89 is OFF the RC path.** It merges whenever QA passes it, because the harness's N-M2 exclusion (option (a)) covers the RC. The head is frozen at 58ad41b until the d2 smoke is done.
  - After the verdict, the Architect merges rc/v5 into #89 without touching `d2-kill-browser.mjs` or `recorded-pid.mjs`, and a delta recheck follows.
- **Clock note:** the decisions.md entries at lines 593–596 are stamped 09:00–09:08, but the box clock read 08:44–08:45 CET when they were read. The stamps look ahead of the box clock. This is noted, not acted on.

## (1) Refusal cases: does each refuse before the signal?

`killRecorded` (recorded-pid.mjs:42-47) calls `recordProblem` at :43 and returns at :44 on any reason. The only signal call is `process.kill` at :45, after that check. `stopChild` (:50-53) adds an exited check at :51 before it delegates.

| # | Case | Code path (recorded-pid.mjs) | Test (recorded-pid.test.ts) | Code | Test |
|---|---|---|---|---|---|
| 1 | PID ≤1, 0, negative, NaN, float, >4194304, string | `pidProblem` :18 → `recordPid` :22 returns null; `recordProblem` :30 refuses | :44-46, `recordPid` only | PASS | Partial: not tested at `killRecorded` level (F6) |
| 2 | Own PID | :18 (`pid === process.pid`) → :22 / :30 | :45, `recordPid` only | PASS | Partial (F6) |
| 3 | Missing record (null/undefined) | :29 | :72 (`killRecorded(null)`, `stopChild(child, null)`) | PASS | PASS (spy-asserted :73) |
| 4 | Malformed record | Non-object or bad pid → :30. Missing bootId → :31. Missing starttime → :35 (strict string compare). Missing parent → :36 | none | PASS | Gap (F6) |
| 5 | boot_id mismatch | :31 | :58-61 | PASS | PASS |
| 6 | Start-time mismatch (reused PID) | :35 | :52-57, also :74 | PASS | PASS |
| 7 | PPID mismatch (not our child) | :36: `st.ppid !== rec.parent` | :47-51 (forged with `parent: process.pid`) | **PASS only when `rec.parent === process.pid`; see F1** | PASS as written; the F1 forge is not covered |
| 8 | Not group leader (for a group signal) | :37 | :63-66 | PASS | PASS |
| 9 | Gone / zombie / child already exited | :33, :34; `stopChild` :51 | :67-75 | PASS | PASS |

**TOCTOU between check (:43) and kill (:45):** the two run back to back in one synchronous JS turn.

- **Our own child:** its PID cannot be reused in that window. An unreaped child stays a zombie that holds its PID until Node's libuv `waitpid` runs. That only happens on the event loop, never inside synchronous JS.
- **Leader dies inside the window:** `-pid` still names that same group, because a PGID stays reserved while any member, including a zombie leader, exists. The signal then reaches only the leftover members of our own group.
- **Conclusion:** for our own children, the window is bounded. PID reuse is impossible and the blast radius is our own group.
- **Caveat:** this bound only holds if the record's parent is really `process.pid`. For a record whose parent is someone else (F1), another process can reap and reuse the PID, so the window is unbounded in principle (but tiny in practice).

## (2) Can the kill spy be bypassed?

- **Single signal site.** `recorded-pid.mjs:45` is the only signal call in the three scripts (rg over the files). It looks up `process.kill` on the global at call time. No alias is captured at import: no destructuring, `bind`, `Reflect` or `globalThis['kill']`.
- **Spy timing.** `vi.spyOn(process,'kill')` replaces the property, so the spy catches the call even though the module is imported (test :8) before any spy is installed. Load order does not matter here because the lookup is late-bound.
  - The positive test at :26-31 shows this at runtime: the spy saw exactly one call, `(-pid,'SIGTERM')`, and the child died by SIGTERM.
- **Refusal tests assert zero calls, not just a throw.**
  - `noSignal()` (:13) throws, and `killRecorded` would swallow that throw into `kill failed`. So a broken guard would not surface as a test exception.
  - The tests guard against that with `expect(spy).not.toHaveBeenCalled()` at :50, :55, :60, :65, :73, plus exact-reason matchers.
  - This is sound. Note that :72 `stopChild(sleeper(), null).ok` has no reason check; the spy assertion covers it.
- **Other paths in the three scripts:**
  - `child.kill`: none. `ChildProcess.kill` would bypass the spy, because it uses the internal handle.
  - `kill` via exec/spawn: none. `execSync` in serve-own:80 runs git only.
  - Negative-PID signals without the check: none.
  - d2 imports `spawn` (:12) but never uses it (Nit N1).
  - serve-own's exit and SIGINT/SIGTERM handlers (:94-96) go through `stop` → `stopOne` → `stopChild`. All are recorded paths.
- **Paths outside recorded-pid:**
  - **Playwright's own launcher**, in d2 only. playwright-core 1.64.1 (installed in the worktree) has `process.kill(-spawnedProcess.pid,"SIGKILL")` at `lib/coreBundle.js:10115`. It runs as the force-kill fallback of `ctx.close()` and in the exit-time cleanup of browsers it launched. It is skipped when the process has already closed, which is the normal state after d2's SIGKILL. It can still fire on error or timeout paths, e.g. a refusal followed by a hung `ctx.close()`. It is never spied. See Minor F5 and condition (2) of the d2 plan.
  - **Test file:** the `afterEach` cleanup (:17) and :68 call raw `process.kill(c.pid,'SIGKILL')` on their own unexited `sleep` children. That is safe, since the children are unreaped, but it sits outside recorded-pid (Nit N2).
  - **`tests/serve-own.test.ts:106`:** `p.kill('SIGTERM')` on a spawned rc0-browser (see (6)).

## (3) Is the source check strong enough? (test :77-82 vs harness audit, 29+7 forms)

The PR checks four regexes, and only on three files:

1. `readdirSync\(\s*['"]\/proc`
2. `\/cmdline`
3. `pkill|killall|pgrep`
4. a count of `process\.kill\(` (exactly 1 in recorded-pid, 0 in the others)

I applied those regexes, in Python, to our 36 negative fixtures in `artifacts/v5-ui/harness/tests/fixtures/audit-negative/forms/`. **They catch 3 of 36: #14 `process.kill(-srv.pid)`, #29 `fs.readdirSync('/proc')` and #36 (via `/cmdline`).** They miss 33:

- **Shell kill forms (missed):**
  - `kill -9`, `kill -TERM -$pgid`, `kill -- -$pgid`
  - `/bin/kill`, `command`/`env`/`builtin kill`, `xargs kill`
  - `trap 'kill 0'`, `kill %1`
  - `loginctl kill-session`, `skill`
  - the indirect `K=kill; $K`
- **Missed outright:** `pidof`, `fuser -k`, `timeout` (plain, `--signal`, `-k`), `ps axo` / `ps aux`.
- **/proc enumeration (missed):** the `/proc/[0-9]*` loop, `ls /proc`, `os.listdir('/proc')`.
- **Python / other runtimes (missed):** `os.killpg`, `pthread_kill`, `.terminate()`, `send_signal`.
- **Detaching (missed):** `nohup`, `setsid`, `disown`, `start-stop-daemon`, `detached: true`. serve-own:24 itself uses `detached: true`.
- **JS forms that matter in these files:**
  - `process.kill (pid)`: the space defeats the count.
  - `process['kill']`, `const {kill} = process`
  - `child.kill(` / `.kill(`
  - `execSync('kill …')`, `spawn('kill', …)`
  - async `fs.readdir('/proc')`, `fs.promises.readdir`, `opendirSync('/proc')`, a template literal `` readdirSync(`/proc`) ``
- **Scope:** only the three scripts are checked. `tests/` and the other `scripts/*.mjs` that run serve-own or browsers are not.

**Verdict on the check:** it works as a regression guard for the exact forms the PR removed. It is not a rule-21 audit (Minor F3). Our harness audit (`audit-no-pattern-kill.sh`, v2) remains the control for anything run under the harness.

## (4) d2-kill-browser.mjs

- **No /proc walk and no name match.**
  - `procs()`, `killTree()` and the `/proc/*/cmdline` filter are removed.
  - The only `/proc` read left is `/proc/<recorded pid>/stat` via recorded-pid.mjs:14.
  - Confirmed by rg and by test :77-82 at runtime.
- **Only a verified leader group is stopped.**
  - `launch()` (:24-31) writes `launch.sh`, which records `$$` and then `exec`s the real browser, so the PID stays the same.
  - Playwright spawns it detached (own group).
  - `recordPid(pid)` (:28) requires a live, non-zombie child of this node process, or it throws and closes the context.
  - The kill at :46 is `killRecorded(rec,'SIGKILL',{group:true})`, so the full check, including group leadership, runs first.
  - A refusal is logged (`REFUSED … reason`) and the row FAILs (`n=0` → `pass` false).
- **WebKit:** `pw_run.sh` does not `exec` MiniBrowser; it runs it as a child in the same group. The group SIGKILL still covers it.
- **Leftover members: not handled (Minor F4).**
  - After the group SIGKILL, nothing checks that the group is empty before relaunching on the same profile.
  - Members that left the group (setsid/setpgid) are out of reach and unreported. Whether any browser helper does this, e.g. Chrome's crashpad handler, is unverified statically.
  - A refusal does not halt and writes no stop list. It logs, closes through Playwright and continues to the next rep.
  - Neither of these meets QA-R21-D2 (3) without a harness-side wrapper; see the d2 plan.
- **Error paths:** there is no try/finally. If any rep throws, `s1.stop()` / `s2.stop()` (:67) never run and both detached vite groups are orphaned. This predates the PR (Minor F7).
- **Pidfile trust:** `browser.pid` is read from our own mkdtemp dir (mode 0700 wrapper). The worst case for a tampered file is another child of ours, because of the PPID check (Nit N3).

## (5) Rule-21 fit (policy question, not a code bug)

`serve-own.mjs` and `d2-kill-browser.mjs` still send signals themselves, through `process.kill` in recorded-pid.mjs:45, instead of through `ops/tools/lane-kill.sh`. recorded-pid copies lane-kill's identity rules (start time, boot id, leader) but adds an extra check: the process must be our own child. That is stricter than lane-kill, apart from F1.

- **d2:** covered only by HoO's QA-R21-D2 narrow exception, for 58ad41b only.
- **serve-own (repo CI or dev use):** not covered by any ruling. Under the harness it stays REDIRECTED to `lib/serve-lane.mjs` through the pw-launch resolve hook, so the harness never runs it.
- **Decision needed from HoO/HoQ:** whether repo-side recorded-pid signalling is acceptable outside the harness.

## (6) Does this fix our N-M2?

**Partly.** The serve-own kill path now goes through the identity check, so the stale-`dist-qa/` run of `tests/serve-own.test.ts:101-109` no longer reaches an unchecked `process.kill(-pid)`. The rest of N-M2 is unchanged by this PR:

- That test still runs whenever `dist-qa/assets` exists (`it.skipIf` :101).
- It still spawns `scripts/rc0-browser.mjs chromium` (:103), which launches Chromium through `chromium.launch` (rc0-browser.mjs:25), outside pw-launch and the lane.
- It still signals with raw `p.kill('SIGTERM')` (:106).

**The harness keeps option (a)**: exclude the file in the local vitest step and log it. Per D-HOE-20261030-06, that exclusion is what covers the RC (Minor F8, informational for the PR).

## Findings

| ID | Sev | Where | Finding | Repro (static) | Fix |
|---|---|---|---|---|---|
| F1 | **Major** | recorded-pid.mjs:21, :36 | `recordPid` accepts `{parent}`, and `recordProblem` checks `st.ppid !== rec.parent`, not `process.pid`. A record whose `parent` equals a foreign process's real PPID passes every check, and its group gets signalled. That breaks the "our child" claim, and with it the TOCTOU bound. No current caller passes `{parent}`, so this is not a Blocker. Test :47-51 only forges `parent: process.pid`. | Take X, any foreign group leader, with PPID Y. `killRecorded({pid:X, starttime:readStat(X).starttime, bootId:bootId(), parent:Y})` passes :29-37 and reaches `process.kill(-X)` at :45. | Drop the `parent` option. Require `st.ppid === process.pid` (and `rec.parent === process.pid`) at :36. Add a test with a forged record whose parent is the real PPID. |
| F2 | **Major** | serve-own.mjs:17-21; recorded-pid.mjs:33-34, :51 | Regression: if the npx leader exits or turns zombie while vite (its child) is still alive in the group, `stopChild` returns `exited`, `gone` or `exited (zombie)`. `stopOne` drops `exited` and `gone` without logging (:19), so the vite group is left holding the port and nothing reports it. The old code `process.kill(-pid)` still reached that group. Rule 21 and HoO's MJ2 ruling want survivors reported, never left silently. Likelihood is low: the leader has to die first, e.g. OOM or an outside SIGKILL. | npx is SIGKILLed by someone else while vite is up → `stop()` → `reason: 'exited'` → no output; vite still holds the port. | Log every refusal. When the leader is gone but its PGID may still have members, report them (report-only, no signal) so a caller can put them on a stop list. |
| F3 | Minor | recorded-pid.test.ts:77-82 | The source check catches 3 of our 36 forbidden forms, is defeated by `process.kill (`, `.kill(`, `process['kill']` and exec'd `kill`, and covers only 3 files. | See (3). | Reuse the harness audit rules, or at least `\.kill\s*\(`, `process\s*(\.|\[)\s*['"]?kill`, `exec*/spawn*('kill`, `pidof|fuser|timeout`, `readdir*/opendir` on `/proc`. Scan `scripts/` and `tests/`. |
| F4 | Minor | d2-kill-browser.mjs:46-50 | After the SIGKILL, nothing checks for leftover group members. A refusal does not halt and writes no stop list. | Code read. | Re-check the group after the kill (report-only). On a refusal, exit non-zero (halt). This is required by QA-R21-D2 (3) unless the harness wrapper does it. |
| F5 | Minor | d2 via playwright-core 1.64.1 `lib/coreBundle.js:10115` | Playwright's own `process.kill(-pid,'SIGKILL')` can run on `ctx.close()` timeout or at exit, outside recorded-pid. It is inert on the normal path, because the process is already closed after d2's SIGKILL. | Refusal branch → `ctx.close()` hangs → Playwright force-kills the group. | Policy: HoO to confirm this is within QA-R21-D2 (2) "nothing else signals", or that the QA-R21-PW "close only through Playwright" precedent applies. |
| F6 | Minor | recorded-pid.test.ts | Coverage gaps: PID ≤1, own PID and invalid PIDs are tested only on `recordPid`, not on `killRecorded`/`recordProblem`. There is no malformed-record test (missing starttime, bootId or parent; string pid; non-object). There is no live-child PPID-mismatch test beyond the parent forge. | — | Add `killRecorded` refusal cases with `noSignal()` for each. |
| F7 | Minor | d2-kill-browser.mjs:17, :67 | No try/finally around the reps. On a throw, both detached vite servers are orphaned. This predates the PR. | Any `start()` timeout. | Wrap the body in try/finally around `s1.stop(); s2.stop()`, or use `serveForRun`. |
| F8 | Minor (info) | tests/serve-own.test.ts:101-109 | N-M2 is not removed: the test still spawns rc0-browser chromium outside pw-launch and uses `p.kill`. | See (6). | Harness option (a) stays. Optional for the PR: gate the test behind an env var. |
| N1 | Nit | d2-kill-browser.mjs:12 | Unused `spawn` import. | — | Remove it. |
| N2 | Nit | recorded-pid.test.ts:17, :68 | Raw `process.kill(c.pid,'SIGKILL')` on its own unexited children. Safe, but it sits outside recorded-pid and outside its own source check. | — | Use `stopChild(c, recordPid…)` or document it. |
| N3 | Nit | d2-kill-browser.mjs:28 | `browser.pid` is trusted from the temp dir. The PPID check bounds the risk to our own children. | — | Optionally check that the PID equals the Playwright-spawned child via the `launchServer` route. |
| N4 | Nit | recorded-pid.mjs:45 | `kill failed (...)` hides the error code type. Messages are fine; the catch also swallows a spy throw, which is why the zero-call assertions matter. | — | None needed; leave a comment. |

## Runtime: recorded-pid vitest (QA-D-1030-PR89 (a), HoO OK'd)

Evidence is in `qa/m3-recheck/pr89-58ad41b-evidence/` (SHA256SUMS inside).

- **Preflight (00-preflight.txt):**
  - The worktree was clean at 58ad41b.
  - `ops/tools/PINS.txt` matches disk: lane-kill sha1 `be1362520c6d…` and sha256 `9c89ddc06a1b…`; lane-run `f286a9a0` / `061e7c4f`.
  - There was no `uiqa-pr89` pidfile beforehand.
- **Load:** the HoO load gate (wait if the 1-min load is ≥12) arrived after the run started. Load read 2.69 / 3.47 / 3.41 at 08:45:38 CET, so the 1-min load at 08:44 was well under 12.
- **npm ci (01-npm-ci.*):**
  - Ran via `lane-run.sh uiqa-pr89 -- sh -c 'cd <wt> && npm ci --no-audit --no-fund > log; echo rc'`. Leader 475149, start time 505099, started 08:44:27 CET. rc=0.
  - npm's install-scripts gate skipped esbuild's postinstall, which only checks the binary.
  - playwright-core 1.64.1 was installed. No browser was downloaded or launched.
- **vitest (02-vitest.*, 03-vitest-results.json, 05-per-case.txt):**
  - Ran via `lane-run.sh uiqa-pr89 -- sh -c 'cd <wt> && npx vitest run tests/recorded-pid.test.ts --minWorkers=1 --maxWorkers=1 --reporter=verbose --reporter=json --outputFile.json=<evidence>/03-vitest-results.json > 02-vitest.log 2>&1; echo rc=$? > 02-vitest.rc'`.
  - Leader 476650, start time 506629, started 08:44:43 CET.
  - **Disclosed deviation from the ruled command:** a `sh -c` wrapper and reporter flags were added. lane-run sends stdout/stderr to /dev/null and does not return the child's rc, so this was the only way to capture the logs, the per-case results and the rc. The test selection and worker flags are exactly as ruled.
  - vitest v2.1.9: **rc=0, 13/13 passed, 0 failed**, duration 232 ms. Per case:
    1. recordPid records a live child ✔
    2. killRecorded SIGTERMs the group ✔
    3. stopChild SIGKILL ✔
    4. `group:false` ✔
    5. foreign pids never recorded ✔
    6. forged record (own parent) refused ✔
    7. reused PID refused ✔
    8. other boot refused ✔
    9. non-leader group refused ✔
    10. exited child / no record refused ✔
    11. source check d2 ✔
    12. source check serve-own ✔
    13. source check recorded-pid ✔
- **No hang:** lane-kill was not used and nothing was signalled by UI QA.
- **After the run (04-leaders-after.txt):** both recorded leaders, 475149 and 476650, are gone. This was checked by existence of those exact two PIDs only, with no scan.
- **Possible `sleep` survivors:** not checked, because ps/pgrep and /proc scans are forbidden. The test's `afterEach` SIGKILLs every unexited sleeper it spawned. Any stray `sleep 30` would have expired by about 08:45:13 CET. None were touched.
- **Left in place:** the worktree `/tmp/qa-pr89-20261030-084154` (with node_modules) and the ref `refs/qa/pr89` in the game clone. No cleanup was done.

## d2 smoke plan (QA-R21-D2; NOT RUN, after the harness delta clears, 58ad41b only)

| # | QA-R21-D2 condition | How it will be checked |
|---|---|---|
| 1 | lane-run plus the watchdog, with the browser leader PID in the lane pidfile in lane-run format | Each engine runs as one `ops/tools/lane-run.sh uiqa-d2-<engine> -- …` step under the harness watchdog. d2 only writes `browser.pid` in its temp dir, so a harness preload or wrapper appends `PID STARTTIME BOOT_ID ISO-time cmd` (STARTTIME = field 22, from `/proc/<pid>/stat` of that one PID) to `.pids/uiqa-d2-<engine>.pids` right after each `launch()`. **Evidence:** a pidfile with one line per launch, cross-checked against d2's log line `SIGKILLed recorded browser group <pid>`. |
| 2 | SIGKILL only to our own recorded group, via recorded-pid; nothing else signals | Static: d2's only signal is :46 → recorded-pid.mjs:45 (this review). At runtime, a `--import` preload wraps `process.kill` and logs every call with its caller stack. **Pass rule:** every call is `(-<recorded pid>, 'SIGKILL')` from recorded-pid.mjs:45, plus serve-own's recorded vite stops. Any call from playwright-core (F5) or any other PID counts as a FAIL or halt, and goes to HoO unless HoO rules it in. |
| 3 | On a refusal: no signal, halt, stop list | d2 itself only logs `REFUSED` and continues (F4). The harness step therefore treats any `d2-kill: REFUSED` line, a non-zero exit or a watchdog stop as a halt. It writes `$RTOP/HALT` and `STOP-LIST-for-HoO.txt` (the recorded PIDs plus lane-kill's "group members remain" PIDs, with start times) and does no cleanup. **Evidence:** a forced-refusal self-test is not allowed under (5), so this is checked statically plus by grepping the run log. |
| 4 | Every kill logged with PID, start time and result | The `process.kill` preload from (2) writes one line per kill: `pid`, `starttime` (from the record), signal, and the result (ok, refused with reason, or kill failed). The d2 stdout rows are kept as well. **Pass rule:** one log line per rep, 6 delays × 3 reps = 18 per engine, all `ok`. |
| 5 | No other use of the scripts; any change to them needs a new ruling | Before the run, re-hash `scripts/d2-kill-browser.mjs` and `scripts/recorded-pid.mjs` at 58ad41b and compare them with this review (git blob SHAs to be recorded in the run evidence). Run only `ENGINE=firefox` and `ENGINE=webkit`; Chromium is optional and not in the ruling. No other caller is used. If F1 or F2 get fixed, the hashes change and a new ruling is needed. |

## NOT RUN

| Item | Reason |
|---|---|
| d2 smoke in Chromium, Firefox and WebKit (`scripts/d2-kill-browser.mjs`) | UI QA lane is HALTED (HoQ). QA-R21-D2 allows FF/WK for 58ad41b only after the harness delta clears and HoQ gives the go. Chromium is not in the ruling (the Architect ran Chromium). |
| Full `vitest run` / `npm test`, `tests/serve-own.test.ts` | Not allowed by QA-D-1030-PR89 (a); serve-own.test.ts is the N-M2 browser path. |
| Any vite, serve-own, rc0-browser or check-globals run | Lane halted; no browsers or servers allowed. |
| Runtime repro of F1, F2, F4 and F5 | No signals or extra processes allowed; findings are static. |
| CI 41019891633 re-check | Taken as reported by HoE. |
| Harness audit (`audit-no-pattern-kill.sh`) over the PR files | Not run, to stay within "one thing". Its regexes were read and the PR's four regexes were applied in Python to the fixtures as text. |
| Survivor check for `sleep` children | ps, pgrep and /proc scans are forbidden; any survivors self-expire within 30 s. |
