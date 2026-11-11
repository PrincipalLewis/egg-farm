# ops/tools — lane process helpers (standing rule 21, D-CEO-20261029-04)

Start long-running processes only through `lane-run.sh`; stop them only through `lane-kill.sh`.

    ops/tools/lane-run.sh <lane> -- <cmd...>    # prints the PID; exit 143 if TERM arrived during the record window
    ops/tools/lane-kill.sh <lane> <pid...>      # prints TERM / REFUSED / GONE per PID

## Success outcomes (`lane-kill.sh`)
These are success lines (process stopped or already gone). A stop is clean when the command exits 0 and every PID prints one of:

- `TERM <pid> (group)` — SIGTERM delivered to the process group led by `<pid>`
- `TERM <pid>` — SIGTERM delivered to `<pid>` only (it did not lead its group)
- `TERM <pid> (tag)` — SIGTERM delivered to a process that left the group/session but still carries this start's `LANE_RUN_TAG` (setsid children)
- `GONE <pid>` — `<pid>` had already exited; no signal sent

`GONE <pid> (group members remain…)` / `(session stragglers remain…)` is **not** success: leftovers need their own shutdown or a HoO stop list. Any `REFUSED` line fails the command (exit 1).

## Record format
`lane-run.sh` starts the command with `setsid --` (own session and process group) in the background and appends

    PID STARTTIME BOOT_ID ISO-time NONCE cmd

to `/workspace/egg-farm-studio/.pids/<lane>.pids`

- `STARTTIME` = field 22 of `/proc/PID/stat` (PID-reuse guard)
- `BOOT_ID` = `/proc/sys/kernel/random/boot_id`
- `NONCE` = 16 hex chars; also exported to the child as `LANE_RUN_TAG=<lane>:<nonce>` (forgery + setsid-child guard)
- Newlines, CRs and tabs in the command are flattened to spaces; commands longer than 512 bytes are truncated, so one start is always one line
- If the leader exits before it can be recorded, nothing is recorded, any surviving group members are listed, and it exits 1
- If TERM arrives between fork and record, the record is still written, the PID is printed, and lane-run exits 143 (Architect 5.1 TERM-window design; never `trap '' TERM`)

## `lane-kill.sh` checks
Refuses a PID that is not numeric (max 7 digits), is <=1, is its own PID, or shares lane-kill's process group (m-5 self-kill guard); a PID with no well-formed record in that lane's pidfile; a legacy line without `BOOT_ID` (m-2 dropped); a record from a different boot; a PID whose current start time differs from the recorded one (reused PID); or a recorded nonce whose `/proc/PID/environ` lacks the matching `LANE_RUN_TAG` (M-1).

A passing PID gets SIGTERM to its process group when it leads it, otherwise to the PID. After that, any live process still carrying the start's `LANE_RUN_TAG` is also signalled (`TERM <pid> (tag)`), which covers children that called `setsid` and left the group.

If the leader is gone but its group or session still has members, it lists them, signals nothing in that group/session (tag-matched stragglers may still get `TERM (tag)`), and exits 1: stop untagged leftovers through the runner's own shutdown. Exits non-zero if any PID was refused.

There is no name, pattern, ps/pgrep or awk-walk mode, by design. Never pkill or killall.

Use your own lane name (your bot/role), e.g. `ui-qa`, `saves`, `econ`. Lane identity is a convention (all bots run as the same user), so never name another bot's lane.

Do not put secrets (`GITHUB_TOKEN`, passwords, keys) on the command line: lane-run records the full command in the pidfile. Pass secrets through the environment instead.

## Claude exception (Vadim's rule)
The Claude Code setup and the Claude-powered bots are never wrapped, started or changed through these tools, and no agent may kill their processes.

## Status (5.1 hardening, 2026-11-05)
Pins in `PINS.txt` (re-pinned this pass). 5.1 items applied: M-1 nonce/`LANE_RUN_TAG` (optional per HoO ruling, now on), m-2 legacy lines refused, m-3b post-settle leader check, m-5 own-group refuse, Architect TERM-window (`trap 'LR_TERM=1' TERM` → exit 143), setsid-children via tag signal, README success lines listed above. Prior CCR (Claude, 1 call) on be136252/f286a9a0: engineering/reviews/lane-tools-be13625-ccr.md; HoO ruled M-1 minor under the accident-only threat model. New pins need a fresh Claude review when available (never a gate, rule 22).

Threat model: rule 21 prevents accidental and over-broad kills. It is not a security boundary against a deliberate agent; every bot is uid box. Forging a pidfile line is a rule violation in itself; the nonce check raises the bar for accidents and casual forgery.

## verify-claude-verdict.sh
`ops/tools/verify-claude-verdict.sh <PASS_ID> [role]` is read-only. It prints the usage.log lines for that PASS_ID and exits 0 only when at least one has status ok. Paste its last line into every Claude-role report header, and run it before citing a Claude verdict (rule 22).
