# Second review — UI QA run-rc harness rework (rule 21), package 8bd8fb46

- Reviewer: Senior Software Architect (second reviewer per CEO ruling (b), with HoQA)
- Date: 2026-10-30, 07:45–07:55 CET
- Package: `artifacts/v5-ui/harness/tests/run-rc-lane-helpers-REVIEW.md`, sha256 `8bd8fb46b34d9680d233929fe72b07d7a14e823f0b9d816a0dfd282e91a24964` (verified)
- **VERDICT: FINDINGS (blocking).** There are 2 Blockers, 2 Majors and 7 Minors, plus Nits and advisories. Rule 21 is respected inside the harness's own files: no pattern kill, no process walk, nothing that can reach Claude. The fail-safe halt the package claims, though, does not happen in the default two-lane mode, and GONE-with-survivors is never detected. Browser lanes should stay halted until B1 and B2 are fixed and re-verified.

## What was reviewed (and pinned)
| Item | Hash / state |
|---|---|
| run-rc.sh as reviewed | `51dfe66744795e2f1654f0eb6824f42a13e39f410d8cbd55209a255edb195af8`. Matches harness `SHA256SUMS` and `patch(before-lanehelpers, run-rc-lane-helpers.diff)`. A copy is at `engineering/reviews/.ui-qa-run-rc-51dfe66.reviewed-copy.sh`. All run-rc line numbers below refer to this version. |
| run-rc.sh on disk now | `934af79f…`, **modified 07:49:04 during this review** (HoQ 07:46 p2base lines; new 301–303, later lines shift +2). This delta is not in the package. On reading it, it adds only `b` calls, so it is process-neutral (see m5). |
| lib/lane-step.sh | `dab430e5…` (12 lines), matches SHA256SUMS |
| tests/audit-no-pattern-kill.sh | `d34a6d50…` |
| tests/selftest-lane-helpers.sh | `98878416…` |
| diff | +100 −41 confirmed |
| selftest-20261030-073238/SHA256SUMS | `sha256sum -c`: 3/3 OK |
| ops/tools lane-run.sh / lane-kill.sh | `061e7c4f…` / `da0fd21f…`. These are the same hashes the self-test logged, so the self-test ran against the current tools. |

Safety: I did not run run-rc.sh, any browser lane or their self-test script. Signals were sent only by lane-kill.sh, and only to my own lane-run'd `sleep 60` in lane `architect`. The audit was run read-only on the harness and on a fixture of mine in /tmp.

## Contract recap (ops/tools)
- lane-run starts `setsid -- cmd` (own session/pgid) and records `PID STARTTIME BOOT_ID ISO cmd` (lane-run.sh:15-26).
- lane-kill refuses non-numeric, <=1 or self PIDs; PIDs with no record in that lane; PIDs from another boot; and PIDs whose start time differs (lane-kill.sh:15-36). Otherwise it sends a group TERM to a leader (:37-38).
- **GONE semantics:** if the leader is gone, it lists surviving members of the pgid, **signals nothing and exits 1** (:30-34). Children that call setsid leave the group and are invisible to lane-kill (README.md:22).

## Criterion results
| # | Criterion | Result |
|---|---|---|
| 1 | Only lane-kill stops anything | **PASS for harness files; FAIL for code the harness executes** (M1) |
| 2 | No ps/pgrep/pidof/proc walks | PASS (harness) |
| 3 | Cannot target Claude; stale/reused PID safety | PASS |
| 4 | Fail-safe on GONE+survivors / alive after 30 s | **FAIL** (B1, B2, m1) |
| 5 | Audit coverage real | PARTIAL (M2) |
| 6 | Self-test evidence | Logs match claims (5/5, 7/7). Gap closed by me (G1) |
| 7 | Load pause, WK preflight, `--lane wk` | PASS with minors (m4, nits) |

### (1) Stop paths
- Harness files: the only signal path is `lstop` → `$LANE_KILL $ln $pid` (run-rc.sh:97). Callers are the watchdog (run-rc.sh:105) and the p62 server stop (run-rc.sh:271). The audit and my own greps over run-rc.sh and lib/ find no `kill`, `trap`, `timeout`, `xargs kill`, `fuser`, `pkill` or `killall`, and no SIGSTOP or SIGCONT. lib/lane-step.sh:8-12 sends no signals. The lane driver subshells are only `wait`ed (run-rc.sh:350-352). PIDs passed to lane-kill always come from lane-run's own stdout (run-rc.sh:102, 268), never from a scan.
- **Not true for executed code:** see M1. That covers `$WT/scripts/serve-own.mjs:14,19` `process.kill(-pid)` and Playwright's own group SIGKILL of the browsers it detaches.

### (2) Process enumeration
- `alive()` reads `/proc/<own recorded pid>/stat` only (run-rc.sh:96). That is a single-PID identity check, not a walk.
- awk at run-rc.sh:125 is a float compare. awk at :146 parses tools/README.md.
- No ps, pgrep, pidof or `/proc/[0-9]*` loops anywhere in the harness. The only /proc walks are inside the sanctioned ops tools: lane-kill.sh:13 (read-only `group_members`), :37 (`ps -o pgid= -p`), and lane-run.sh:21.

### (3) Claude / identity
- Lane names are `uiqa-<sha7>-<YYYYmmddHHMMSS>-{main,A,B,W,zg}` (run-rc.sh:62, 108, 112, 127, 268, 321). They are fresh per run, so a stale pidfile from an earlier run or from the snapshot restore is never consulted.
- lane-kill checks boot_id plus start time. The current boot is 07:20:16 CET, boot_id `ad2ad629…`, and pre-restore records cannot validate. run-rc also re-checks start time itself (`stof` :95, `alive` :96).
- Nothing in the harness names, greps or wraps a Claude process. The group TERM reaches only the setsid session lane-run created.
- Residual risk: the `.pids` dir is shared and writable by every bot. A forged line in a uiqa pidfile could validate a foreign PID, but run-rc never reads PIDs from pidfiles (only start times), so it cannot be steered by one. lane-kill has no cmdline check, but start time plus boot_id is sufficient.

### (4) Fail-safe — FAILS (B1, B2)
- `lstop` discards lane-kill's output and exit code (`>> lane-kill.log`, run-rc.sh:97). It then polls only the leader (:98). When the leader dies but group members survive, lane-kill prints `GONE … group members remain` with rc 1, and `lstop` returns 0, so the run continues. **B1.**
- I demonstrated this directly (G3 below): lane-kill reported `GONE 189822 (group members remain, not signalled: 189828)` with rc 1.
- `exit 9` in `lstop` exits only the innermost subshell **(B2)**:
  - `lb` runs `b` inside `( … )` (run-rc.sh:257), so `run_legacy` just continues to the next suite.
  - In PARALLEL=2 (the default) both lanes are `( … ) &` subshells (run-rc.sh:350-351). main logs `exit=$?` and ignores it (:352), then runs the sweep summary, minors/zg compare, zgbg_join and the full manifest/SHA256SUMS (:354-399). The other lane keeps going.
  - Only PARALLEL=0 or a main-shell `step` actually halts.
- No `set -e` (run-rc.sh:40, `set -u -o pipefail`), so nothing is accidentally swallowed by `-e`, but nothing checks these statuses either.

### (5) Audit coverage
- I ran it at 07:46 on the then-current file: PASS, 0 violations. The pattern is at audit-no-pattern-kill.sh:16.
- I ran it against my 29-form fixture (`/tmp/arch-audit-fixture/forms.fixture`, `AUDIT_ALL_FILES=1`).
- **Caught (15):** `kill -9 $pid`, `kill -TERM -$pgid`, `kill -- -$pgid`, `/bin/kill`, `command kill`, `env kill`, `builtin kill`, `xargs kill`, `trap 'kill 0'`, `kill %1`, `timeout 10m`, `ps axo pid,ppid` (only via `ppid`), `process.kill (pid)`, `process.kill(-srv.pid)`, `loginctl kill-session`.
- **Missed (14):** `fuser -k 5185/tcp`, `timeout --signal=TERM 600 …`, `timeout -k 5 600 …`, `pidof node`, `ps aux | grep vite`, `for f in /proc/[0-9]*/stat`, `skill -TERM`, `K=ki""ll; $K $p`, `os.killpg(…)`, `signal.pthread_kill(…)`, `p.terminate()`, `p.send_signal(15)`, `os.listdir('/proc')`, `fs.readdirSync('/proc')`.
- Scope gap: the audit only scans the harness dir. Code it executes from `$WT/scripts/` and `node_modules` is not scanned. **M2**, and see M1.
- Negative fixture: 7/7 is real (audit-negative.log). It covers only 7 forms.

### (6) Self-test evidence
- selftest.log:4-18 shows the (i) lifecycle 5/5: recorded `69928 74145 ad2ad629… sleep 300`, `TERM 69928 (group)`, then gone, then `GONE` on the second call.
- selftest.log:19-32 shows the (ii) refusals 7/7, with the foreign sleep alive after every refusal. Note that the "caller PID" case was refused as "not started by lane", not by the self-guard (Nit).
- The gap at :33-34 is that the foreign sleep vanished at 07:36:32, about 66 s early, with the tool-host shell session. No lane-kill call could have done it, since all were REFUSED.
- **Closed by me (G1):** at 07:47:41 I ran a plain `sleep 30 &` (PID 189678). lane-kill architect refused it (rc 1, not started by lane architect), and it was still alive 1 s later. `wait 189678` returned **status 0 at 07:48:11**, so it expired naturally and was never signalled. **The gap does not matter.**
- G2: `lane-run architect -- sleep 60` gave PID 189726, recorded with boot_id. lane-kill printed `TERM 189726 (group)` with rc 0, and the process was gone 1 s later.
- G3: `lane-run architect -- bash -c 'sleep 40 & …; sleep 3; exit 0'` had leader 189822 and child 189828 in pgrp 189822. After the leader exited, lane-kill printed `GONE 189822 (group members remain, not signalled: 189828)` with rc 1. The child was untouched and later expired by itself (gone by 07:48:58).
- Evidence staleness: the package audit.log (07:39:06) cites run-rc.sh:92-98, but the packaged file (mtime 07:41:33) has these at :93-99. My 07:46 re-run reproduces PASS with the same counts (m5).

### (7) Load pause / WK
- **Pause:** `guard` (run-rc.sh:124-126) only sleeps 15 s while load >= MAXLOAD, before the next step, and only for lanes B and W. There is no SIGSTOP or SIGCONT anywhere. PASS.
- **WK preflight:** `wk_preflight` (run-rc.sh:321-324) runs via `lrun` with a 120 s watchdog. On failure it writes `engines/webkit.SKIPPED.json` and `continue`s, so only WebKit is skipped (:325). lib/wk-preflight.mjs:9 launches and closes; it has no kill code. PASS, subject to B2: a watchdog halt here also only exits lane B's subshell.
- **Rejoin `--lane wk`:**
  - It gets its own `LNB` timestamp, so its pidfiles are separate (`…-W.pids`), and lane-run only appends (`>>`). It cannot stomp another run's pidfiles.
  - It writes to `<R>/wk/` (run-rc.sh:66) on the B lock, with ports +2.
  - It refuses setup/build/gates (:53) and refuses if WK-DONE.json exists (:67). That check is TOCTOU (m4).

## Findings
**B1 — Blocker — GONE with surviving group members is never detected; lane-kill's result is ignored.**
- Where: run-rc.sh:97-98 (lstop) and run-rc.sh:104-107 (lrun's natural-exit path). Evidence: G3 above.
- Fix:
  1. In `lstop`, capture `out=$($LANE_KILL $ln $pid 2>&1); rc=$?` and log both.
  2. After the leader is gone, call `$LANE_KILL $ln $pid` once more. With the leader gone, it signals nothing (verified in G3) and only reports.
  3. If the output contains `group members remain`, or rc≠0 for any reason other than a plain `GONE <pid>`, halt (B2 mechanism) and write the member list to summary.txt for HoO.
  4. Do the same read-only GONE probe in `lrun` after every normal step exit, so orphaned group members (servers, sims) are caught too.
  5. Never re-signal and never escalate the signal.

**B2 — Blocker — "run-rc halts (exit 9)" only exits the innermost subshell; the run continues and produces full manifests.**
- Where: `lb` subshell run-rc.sh:257; lane subshells :350-351; driver exit codes ignored at :352; post-lane work at :354-399.
- Fix:
  1. In `lstop`, before `exit 9`, create `$RTOP/HALT` containing the reason.
  2. Check `[ -e $RTOP/HALT ] && exit 9` at the start of `b`, `lrun`, `lb`, `step` and `guard`, so the other lane stops at its next step boundary. No signals are needed.
  3. In main, after `wait`, exit 9 if any driver exit is non-zero or HALT exists, before line 354. Do not write SHA256SUMS.all, per-engine manifests or DONE markers; write `HALTED-NOT-EVIDENCE.txt` instead.
  4. Add a self-test using a stub step that ignores TERM (e.g. `bash -c 'trap "" TERM; sleep 60'` via lane-run, watchdog 2 s). Assert the whole run exits 9, the sibling lane starts no further step, and no manifest is written.

**M1 — Major — The harness executes code that signals process groups and detaches processes, outside lane-kill and the audit.**
- What runs:
  - run-rc.sh:272-273 runs `$WT/scripts/rc0-browser.mjs` (rc/v5 :21-22) and `npm run check-globals` (`release-globals-browser.mjs:7`). Both go through `$WT/scripts/serve-own.mjs`.
  - That file spawns `vite preview` with `detached: true` (:16) and stops it with `process.kill(-pid)` at :19 and in `stopAllChildren` at :14. There is no exit-status check, so a recycled PID that has become a group leader can be hit.
  - `browser/scroll-sweep-p1.mjs:19,44` uses `serveOwn` with no SIGTERM handler, so a watchdog TERM leaves a detached vite orphan that lane-kill cannot see (README.md:22). It is also run directly, not via lane-run, at run-rc.sh:354.
  - Playwright launches every browser detached (`playwright-core/lib/server/utils/processLauncher.js:112`) and group-SIGKILLs it itself (:202). Browsers are therefore never in the lane group, and a watchdog stop cannot confirm they are gone.
- Fix:
  1. List the executed repo scripts in the package and have the audit scan them (`$WT/scripts/serve-own.mjs`, `rc0-browser.mjs`, `release-globals-browser.mjs`).
  2. Ask HoE for a serve-own change. Under the harness (e.g. `QA_LANE_STEP=1`, set by lane-step.sh), spawn vite **non-detached**, so the step's group TERM covers it, and guard `stop()` with `srv.exitCode === null && srv.signalCode === null`. Alternatively, serve via the harness's own `lib/serve.mjs` started by lane-run, as p62 already does (run-rc.sh:268), and pass `BASE`.
  3. Get HoO sign-off on a documented Playwright exception.
  4. Treat any watchdog stop of a browser step as a HALT (B2), since detached survivors cannot be verified without a process walk.

**M2 — Major — Audit pattern misses 14 of 29 kill and enumeration forms, and does not scan executed repo code.**
- Where: audit-no-pattern-kill.sh:16, :27-29. Misses are listed in (5).
- Fix: add these to `PAT`:
  - `fuser`, `pidof`, `(^|[^A-Za-z_-])ps([[:space:]]|$)`, `/proc/(\[|\$|\*|[0-9])`, `readdirSync\(['"]/proc`, `listdir\(['"]/proc`
  - `killpg`, `pthread_kill`, `\.terminate\(`, `send_signal`, `timeout[[:space:]]+-`, `(^|[^A-Za-z])s?kill`, `snice`
  - Flag `eval` or indirect `$VAR` command words for manual review.
- Extend the negative fixture to all 29 forms above, expecting 29/29 VIOLATION.
- Add an optional second scan root for the executed `$WT/scripts` files (M1).

**m1 — Minor — REFUSED from lane-kill is treated as "still alive 30 s after TERM".**
- Where: run-rc.sh:97-99. It waits 30 s and prints a misleading reason. (`stof` returning empty also makes `lrun`'s loop exit at once, leaving the step unsupervised: run-rc.sh:103-104.)
- Fix: on REFUSED, or on an empty `st`, halt immediately with the lane-kill line quoted.

**m2 — Minor — Long-running children not started via lane-run, contrary to "every spawned step".**
- Where: `npm ci` in the unit step at run-rc.sh:233 and :241; `node … --summary` (with serveOwn) at :354; `node -e` at :284. REVIEW.md:17 only excuses `npm ci` in setup.
- Fix: wrap these in `step` (`lrun … main`).

**m3 — Minor — No stop list on halt or interruption.**
- Where: the ZG sim (run-rc.sh:112) has no watchdog and outlives a halt. Lane steps outlive run-rc if it dies. Pidfiles are copied to evidence only at the end (:360).
- Fix: on HALT, or in an EXIT trap that sends no signals, copy `$PIDDIR/$LNB-*.pids` into `$RTOP/pids/` and print the still-alive recorded PIDs (via `alive`) with ready-to-run `lane-kill.sh <lane> <pid>` lines for HoO.

**m4 — Minor — `--lane wk` WK-DONE refusal is check-then-act.**
- Where: run-rc.sh:67. Two concurrent wk segments both pass the check.
- Fix: `mkdir $R.running` (atomic) or `flock -n` on `$R/.wk.lock`, and refuse if it is held.

**m5 — Minor — Package evidence is not pinned to the file under review.**
- audit.log (07:39:06) predates run-rc.sh's 07:41:33 mtime; the line numbers are off by one.
- run-rc.sh changed again at 07:49:04 (`934af79f…`, p2base lines 301-303) after the package hash.
- Fix: freeze run-rc.sh during review; re-run the audit and regenerate SHA256SUMS whenever it changes; include each delta in the package.

**m6 — Minor (advisory, ops/tools owner) — lane-kill can report a clean `GONE` with rc 0 without checking the group.**
- Where: lane-kill.sh:38-40, when both kills fail in the race between the stat read and the kill.
- Fix: run `group_members` there as in :32-33.

**m7 — Minor (advisory, HoE) — A descendant walk with SIGKILL exists in the repo.**
- Where: `scripts/d2-kill-browser.mjs:19-23` on rc/v5 walks /proc and SIGKILLs the tree. It is not called by run-rc.
- Fix: put it under rule 21 or retire it before anyone wires it into a lane.

**Nits**
- n1: `LNB` is unique only per second per SHA (run-rc.sh:62). Append `-$$`.
- n2: `QA_LOAD_STUB_FILE` is honoured outside dry-runs, and its bytes are interpolated into an awk program (run-rc.sh:122, :125). Require `QA_DRYRUN=1` and validate `^[0-9.]+$`.
- n3: the wk segment writes `MERGED.json` in the parent run dir (run-rc.sh:399), which contradicts "writes ONLY wk/" (:21). Document it or move it.
- n4: the self-test's "caller PID REFUSED" passes via the missing record, not the self guard (selftest.log:26). Reword it.

## Re-review needed for PASS
B1 and B2 fixed, plus the new halt self-test (B2 item 4), M1 (at least items 1, 2 and 4) and M2 applied, with a re-hashed package. The Minors may follow as PASS-with-minors items.
