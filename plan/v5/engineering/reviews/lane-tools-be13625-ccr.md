Claude calls used: 1/15 (wrapper log lines: 2026-10-30T09:09:14+01:00, PASS_ID lane-tools-be13625, status ok)

```
221: 2026-10-30T09:09:14+01:00	lane-tools-be13625	code-review	claude-sonnet-5-5/high	ok	294	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID lane-tools-be13625
```
Raw Claude output: `lane-tools-be13625-ccr-claude-raw.txt` (session in usage.log line 221). Reviewer bwrap evidence: `lane-tools-be13625-ccr-bwrap-t{1,2}.{sh,out}.txt`.

# Rule 21 lane helpers — ops/tools/lane-run.sh (sha1 f286a9a0a21aa1687f44f90fc4ebd65d6b561fad) + lane-kill.sh (sha1 be1362520c6de7e562c6d5becc765e6fe887598a)

**Claude Code Reviewer (Claude, 1 call) FAIL — blocking/major/minor/nit = 0/1/7/4**

- sha1s checked against ops/tools/PINS.txt before the review: both match.
- Read-only in place. lane-kill.sh was NEVER run against real processes. Every test ran on copies (same sha1s) inside `bwrap --ro-bind / / --tmpfs /workspace/egg-farm-studio/.pids --unshare-pid --die-with-parent --new-session`, so only sandbox-owned PIDs could be signalled and the real .pids was not touched.
- Supersedes the withdrawn 0-call review `ops-lane-tools-2fc4353-1a8756c-ccr.md`.

## Answer to the core question
- **Accidents** (PID reuse incl. across reboots, stale lines, wrong lane, integer/argument edge cases): Claude found no realistic way to signal a process the lane did not start. (pid, starttime, boot_id) blocks accidental reuse. Linux won't reuse a PID that is still a live pgid/sid, so the orphaned-group branch is safe.
- **Deliberate forgery:** yes (Major M-1). The pidfile is the only authorization, and every agent (same Unix user) can read the start time and boot_id it needs.
- **Threat-model note (reviewer, not Claude):** any agent running as `box` can already `kill` any `box` process directly. M-1 is therefore a "the guard can be laundered" issue, not a privilege escalation. If HoO/HoE rule that rule 21 is an accident guard only, Claude itself says M-1 drops to minor and the verdict becomes PASS with minors. That re-rating is HoO's call; this report records Claude's verdict as given.

## Findings (Claude; reviewer bwrap confirmation noted)
**M-1 — MAJOR — lane-kill.sh:19-22, 28, 36-39: a forged pidfile line makes lane-kill signal any same-user process, and its whole group.**
- How: read field 22 of /proc/X/stat and the world-readable boot_id, then append `X <st> <boot_id> <ISO> x` to any `.pids/<lane>.pids`. Any lane name works.
- When X leads a group, line 38 TERMs the whole group.
- **Confirmed (bwrap T3):** unrelated `sleep` PID 27 with a copied start time gave `TERM 27`, rc 0, victim killed. The same line with a wrong start time gave `REFUSED 27 (start time differs: reused PID)` (T2).
- Fix (Claude): lane-run sets `LANE_RUN_TAG=<lane>:<nonce>` in the child's environment and records the nonce. lane-kill requires that tag in /proc/$p/environ and refuses if it's missing or unreadable.

**Minors:**
- **m-2 (lane-kill.sh:18, 20-27):** legacy lines without a boot_id are accepted on the timestamp alone. Only a `YYYY-MM-DDT` prefix is checked, so a future timestamp always passes, and an offset-less timestamp is parsed in the caller's TZ.
  - **Confirmed (bwrap T13):** a line stamped `2099-01-01T00:00:00` with a copied start time gave `TERM 275`.
  - 5 live legacy lines exist in .pids (07:28-07:30).
  - Fix: drop legacy support (rewrite or remove those lines).
- **m-3 (lane-run.sh:15-18, 26-27):** lane-run never checks that `$!` is the leader it created (ppid==$$, pgrp==sid==pid).
  - (a) With job control on, setsid forks, the dead parent gets recorded, and lane-kill later says `GONE`. Not reproduced in bwrap: no tty, so bash -m had no job control.
  - (b) Exec failure is racy. **Confirmed (bwrap t2):** `lane-run.sh ef -- /nonexistent` exited 0 and wrote a record in 1 of 20 runs.
- **m-4 (lane-kill.sh:29 vs 37-39):** the start time comes from /proc and the pgid from a separate `ps` fork (TOCTOU window). A missing or failed `ps` silently degrades to a single-PID kill, and nothing checks sid==p. Exploitable reuse inside the window is negligible. Fix: take pgrp and sid from the same stat read and require pgrp==sid==p.
- **m-5 (lane-kill.sh:15, 38):** only `$$` is excluded, so a lane-run'd script that calls lane-kill on its own PID kills itself and its callers without any output. **Confirmed (bwrap t2):** no output and the "after" marker was never written.
- **m-6 (lane-run.sh:18, 21; lane-kill.sh:13, 29):** the `sed | awk $20` parse breaks on a comm containing a newline.
  - lane-run writes a malformed record but still exits 0, which leaves the process unkillable.
  - lane-kill fails closed.
  - group_members under-reports.
  - Fix: pure-bash `${s##*) }` parse. Not reproduced (bwrap T9: the script had exec'd to `sleep` before the read).
- **m-7 (lane-kill.sh:13, 32-33, 42-43):** orphan reporting matches pgid only, not session. Members in session p with another pgid, and setsid'd children, are neither signalled nor reported, so `GONE p` can look clean. A daemonizing command can never be stopped through the tooling. Escape confirmed in T12: `sleep 101` started with setsid survived the group TERM, as README:22 documents.
- **m-8 (lane-run.sh:25-27):** pidfile write robustness.
  - A very long command can be appended in several write() chunks, so concurrent appends can interleave.
  - A failed `date` doesn't trip `set -e`, so the record is silently malformed while lane-run exits 0.
  - Fix: truncate cmd to about 512 bytes, write a single `printf`, and validate the fields first.

**Nits:**
- **N1:** mawk interval expressions could break on some builds. Not an issue on this box: /usr/bin/mawk passes `{8}` (checked) and T1 killed correctly.
- **N2:** the raw `$p` is echoed back without escaping. `lane-run.sh -- cmd` takes `--` as the lane name. The 10-step wait does nothing.
- **N3:** an unreadable /proc/stat leaves btime empty, which fails open for legacy lines.
- **N4:** pidfiles are 0644 and hold full command lines. A symlink or FIFO pidfile can hang awk (same user, no privilege gain).

## Checked, no issue (Claude + reviewer bwrap)
- **Normal path:** start then kill gives `TERM 6 (group)`, and the process is gone (T1).
- **Wrong lane:** gives `REFUSED (not started by lane uiqa)` (T4). A missing pidfile is also REFUSED (T14).
- **Argument parsing:** a leading zero (`057`) maps to 57 through 10#. `00000001` (8 digits), `-0`, `x` and values over 7 digits are refused (T5). After the <=1 guard, `kill -- -1` is unreachable.
- **Pidfile records:** newline, CR, tab, \v and \f in the command can't forge a record. \n is flattened, \v and \f stay inside the last field, and the record count stayed correct (T6).
- **Command starting with `-`:** setsid treats it as the command, exec fails, and nothing is recorded (T7, exit 1). A missing `--` still works (T8).
- **Orphaned group:** gives `GONE 172 (group members remain, not signalled: 179)`, rc 1, and nothing is signalled (T10).
- **sed greedy strip:** handles a comm containing `) `.
- **setsid:** doesn't fork for a non-interactive background job, so `$!` is the leader. A foreign process cannot join a group in another session (EPERM).
- **Lane names:** the regex blocks path traversal.
