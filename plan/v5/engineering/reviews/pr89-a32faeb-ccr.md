Claude calls used: 1/15 (wrapper log lines: 2026-10-30T09:30:33+01:00, PASS_ID pr89-a32faeb, status ok)

```
2026-10-30T09:30:33+01:00	pr89-a32faeb	code-review	claude-sonnet-5-5/high	ok	419	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID pr89-a32faeb
```
HoE cap for this item: 2 calls. Used 1. Raw Claude output: `pr89-a32faeb-ccr-claude-raw.txt` (session 7f87f239).

# PR #89 — test-infra recorded PIDs @ a32faeb34585db0d62c0c559e09e112b1a301e7d

**Claude Code Reviewer (Claude, 1 call) FAIL — blocking/major/minor/nit = 0/1/4/4**

## Scope
- Reviewed `git diff 2fa7318..a32faeb -- scripts tests`. 2fa7318 is the merge-base; src/ is rc/v5 history.
- PR commits: 58ad41b, cf00e62, 6c5919f, 568784e (9 scripts moved onto spawnRecorded/stopOrReport), 2a8d90a, 9a05af1, a32faeb.
- QA baseline: `qa/m3-recheck/pr89-58ad41b-static.md`.
- No src/, package.json, lockfile or .github changes. Saves, sim, RNG, money math and goldens are untouched.

## Headline answer: can anything signal a process the test run didn't start?
**No path to a foreign process was found.**
- The only signal site is `process.kill` at scripts/recorded-pid.mjs:53. It is reached only after `recordProblem` (:35-47) passes all of these checks:
  - well-formed record;
  - `rec.parent === process.pid`;
  - same boot;
  - process alive and not a zombie;
  - same start time;
  - live `ppid === process.pid`;
  - for a group kill, `pgrp === pid`.
- A forged record or a raced `browser.pid` file can at worst name another live child of the same node process.
- The check and the kill run in one synchronous turn. An unreaped child keeps its PID until it is reaped, and a PGID is not reused while the group has members.
- `groupProbe` sends signal 0 only. `groupMembers` is a bounded walk over our own recorded leader's descendants (`/proc/<pid>/task/*/children`). It reports only and never signals. HoO may want to rule explicitly that this walk is allowed.
- No pattern kills.
- Claude and other agents' processes are not children of these scripts, so they cannot be hit.
- The only signals outside the guard are Playwright's own (M1, m3 below), and they only target d2's own browser child.

## Follow-ups (Claude findings; reviewer spot-checks noted)
**M1 — MAJOR — Playwright's own force-kill during `ctx.close()` is not detected, so F5(b) is not met. Location: scripts/d2-guard.mjs:58-64, scripts/d2-kill-browser.mjs:57,63. Owner: UI/Architect.**
- How it happens:
  - A persistent context's close calls `closeOrKill(DEFAULT_PLAYWRIGHT_TIMEOUT)`. The default timeout is 3e4 ms (playwright-core lib/coreBundle.js:4733, 41264).
  - After 30 s, Playwright calls `kill()`, which runs `process.kill(-spawnedProcess.pid,'SIGKILL')` (:10115). `close()` then resolves normally.
  - d2's `closeCtx` watchdog is 90 s (d2-guard.mjs:58, `watchdogMs = 90000`), and `expectExit` has already been set. So there is no halt, no stop list, and the row can still print PASS.
- Reviewer-verified: coreBundle.js:41250-41266 (race, then `kill()` in the catch), :4733 and :10115, plus d2-guard.mjs:58.
- The existing test tests/d2-guard.test.ts:80-87 fakes a `close()` that never resolves, so it can't catch this.
- Scope: only d2's own child is hit.
- Repro: make the browser's graceful close stall for more than 30 s (for example, SIGSTOP its group, sandboxed) at d2-kill-browser.mjs:63.
- Fix: set the watchdog below 30 s, or treat any close that takes 30 s or more as "force-kill may have fired" and halt. Add a fake whose `close()` resolves after that threshold.

**m1 — minor — the "survivors" exit code 3 is lost when the caller ends with `process.exit(n)`. Location: scripts/serve-own.mjs:25, scripts/recorded-pid.mjs:122-126.**
- An explicit `process.exit(code)` overrides `process.exitCode = 3`.
- Affected moved scripts:
  - mk24-1-overflow.mjs:152-154
  - queue-qa.mjs:91-92
- Affected serveOwn callers:
  - release-globals-browser.mjs:30 (`npm run check-globals`)
  - tab-guard-browser.mjs:97
  - m41-8-shots.mjs:111
  - m41-8-f4-14a.mjs:93
  - m41-9-scroll-sweep.mjs:121
  - m41-9-uxm-shots.mjs:164
- The SURVIVORS line is still printed, but gates that look at the exit code won't see it.
- Fix: `process.exit(code || process.exitCode)`, or use the `stopped ? … : 3` pattern.

**m2 — minor — the rule-21 source check is a regression guard, not a control. Location: tests/rule21-rules.ts:14-19, tests/rule21-source.test.ts:14.**
- Reviewer probe of `hits()`: none of these is flagged:
  - `const k='ki'+'ll'; process[k](…)`
  - `Reflect.apply(process[\`k${'ill'}\`], …)`
  - `` execSync(`${'k'}ill -9 …`) ``
  - `spawn('sh',['-c','k\\ill -9 1'])`
  - `'pkil' + 'l vite'`
  - a bare `process` line (only the following `.kill(` line is flagged)
- Claude adds that `process.kill?.(…)`, `.call`, `const k = process.kill` and `Reflect.apply(process.kill, …)` are also not flagged.
- Scope gaps: `*.test.ts` (tests/serve-own.test.ts:106 and tests/verify.test.ts:426 `p.kill`), `tests/` subdirectories, `.mts`/`.tsx`/package.json scripts, and `spawnSync(…, {timeout})` (scripts/verify.ts:128).
- The real control is the single guarded site plus the runtime spy.

**m3 — minor — after a Halt, Playwright's exit hook still SIGKILLs the group d2 just refused to signal. Location: scripts/d2-kill-browser.mjs:76-82.**
- A Halt throws before `closeCtx`. Then `process.exit(3)` runs Playwright's exit handler (coreBundle.js:10081, 9982-9985), which calls `process.kill(-pid,'SIGKILL')` (:10115). That kill isn't logged.
- The stop list can show members as ALIVE that die moments later.
- Playwright's SIGINT/TERM/HUP handlers stay active.
- Scope: only d2's own child.
- Fix: note this in the HoO ruling and in the stop list, or close or detect before exit.

**m4 — minor — there is no SIGINT/SIGTERM path to `stop()` in d2 or the 9 moved scripts.**
- d2's `finally` is skipped when Playwright's SIGINT handler calls `process.exit(130)`. F7 is fixed only for thrown errors.
- perf-sm9, screenshot and smoke now spawn detached, so Ctrl-C no longer reaches vite.
- Repro: run `node scripts/smoke.mjs` and press Ctrl-C. A vite group survives.

**Nits**
- **n1 (d2-kill-browser.mjs:52):** `L.members` is appended without dedupe, which gives duplicate stop-list lines.
- **n2 (d2-guard.mjs:29):** an unrecorded pid read from the pid file is listed as ALIVE, though without a start time. Mark it "do not signal" or leave it out.
- **n3 (recorded-pid.mjs:106,119):** the synchronous `stopGroup` gives 'leader-unreaped', which counts as clean without a group probe. So members that are outside the snapshot and ignore TERM go unnoticed. The code documents this.
- **n4 (rule21-source.test.ts:43):** the test title overclaims. The allowlist is line-level, guarded by count plus marker.

## 58ad41b QA findings at a32faeb (Claude)
| ID | Status | Evidence |
|---|---|---|
| F1 | Fixed | No parent option (recorded-pid.mjs:21). Checks at :24, :38, :44. Forge tests at recorded-pid.test.ts:49-67 |
| F2 | Fixed, with caveats (m1, n3) | stopGroup (recorded-pid.mjs:112) reports survivors, never drops them. SURVIVORS line in serve-own.mjs:18-28,43. Tests :126-172 |
| F3 | Mostly fixed | 14 rules, 49 fixtures. Scope is all of scripts/ plus the tests/*.ts helpers. Residual gaps: m2 |
| F4 | Fixed, except m3 | Leftover check, halt, stop list and exit 3 (d2-guard.mjs:10-44; d2-kill-browser.mjs:56,82) |
| F5 a | Met for d2's own calls | d2-guard.test.ts:58-77 |
| F5 b | **Not met** | M1, m3 |
| F5 c | Fixed | playwrightPinProblem (d2-guard.mjs:74-88), called at d2-kill-browser.mjs:16 |
| F6 | Fixed | recorded-pid.test.ts:88-103 |
| F7 | Partly fixed | Thrown errors are handled; signal paths are not (m4) |
| F8 | Unchanged, as expected | The harness exclusion stays |
| N1 / N2 | Fixed | |
| N3 | Mitigated | n2 |
| N4 | Unchanged | |

**The 9 moved scripts (568784e):**
- Every normal-end, `die()`, `finally` and timer path goes through `stopOrReport`, and no raw kill remains.
- perf-sm9, screenshot and smoke used to kill only npx, which orphaned vite. They now stop the whole group, which is better.
- Remaining issues: m1 (mk24-1-overflow, queue-qa) and m4.

## Gates (reviewer-run, all inside `bwrap --unshare-pid`, so no signal could leave the sandbox)
- npm ci OK, `npx tsc --noEmit` OK.
- `npx vitest run tests/recorded-pid.test.ts tests/d2-guard.test.ts tests/rule21-source.test.ts`: 89/89 passed.
- Full `npm test` (via lane-run ccr): 126 files, 1745 passed, 1 skipped, EXIT 0.
- Claude re-ran `tests/rule21-source.test.ts` and got 55/55.
- Not run: d2-kill-browser.mjs, the browser scripts, and the M1/m4 repros. They need real browsers or signals, which this read-only review doesn't do.
