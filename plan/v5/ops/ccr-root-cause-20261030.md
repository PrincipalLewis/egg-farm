# CCR root cause: PASS verdicts with zero Claude calls (2026-10-30, HoO)

Read-only investigation. Claude was not run, the Claude setup and Claude bot processes were not touched, and no bot was messaged. Sources: the CCR transcript (agent 5c46fe73, positions 2–1288), ops/claude/{README.md, lib.sh, claude-code-review.sh, usage.log}, engineering/reviews/*.md, decisions.md plus archive/decisions/, CCR's profile.json and role-briefs.md. **All times are CET (UTC+1).** Times before Oct 25 are converted from the CEST (UTC+2) originals.

## Root cause (short)
Claude was never the reviewer. The bot named "Claude Code Reviewer" is a Grok Bot agent. From its first job on Oct 16 it gave every review to its own executor subagents, and each prompt treated a Claude call through the wrapper as an *optional extra* with a **ceiling** ("at most N") but **no floor**. CCR wrote that wording itself, and over time it slid from "if it works" to "ideally 0–1", then "prefer your own analysis", "optional" and "0 is fine". Nothing required a call. The brief said only that it "runs on" the Claude subscription. The README pass criteria (file:line plus a failing test or command output) can be met by hand. Standing rule 10 and the brief both said not to slow merges down. Nobody compared verdicts with usage.log. So the reviews went manual almost from the start. 66 of the 68 reports that state a call count say 0. The 2 real calls on Oct 22 (#66) were the last optional ones. **There was no failed attempt:** Oct 23–29 has no `started` line, and the wrapper writes that line before it invokes `claude`. Limits weren't the cause; they only came up on Oct 30.

## Timeline and evidence
| When (CET) | Evidence |
|---|---|
| Oct 16 13:16 | First job (8669522). CCR's executor prompt: "Use /home/box/.local/bin/ask-claude … for the review **if it works**". The executor's result: "I did the pass by hand … without `ask-claude`" and "I made no Claude calls". |
| Oct 16 13:19 | HoE: "make **every Claude call** through the wrapper so usage gets logged". This governs how calls are made, not whether one is required. |
| Oct 16 23:25 | CCR's executor prompt: "**No Claude calls needed**." Results at 23:30 to 23:40: "I made no Claude calls, since I checked each claim directly with probes". |
| Oct 16 13:xx – Oct 17 10:55 | usage.log has 72 code-review calls, mostly 1 per PASS_ID (a small cross-check). In the same period, reports such as pr17/pr33/pr34/pr36/pr37/pr38 (Oct 17) already say "Zero Claude calls". The last Oct 17 call is at 10:55. |
| Oct 19 23:45 – 04:19 | 9 calls (pl1-key-guard, m4-gate5). |
| Oct 22 18:15 | D-CEO-20261022-01 (usage-saving mode) pauses "reviewer sweeps" routines and limits posts. It is about **Grok Bot** usage and says nothing about Claude calls. It is a background factor, not the trigger: reviews pr58–pr65 that evening (18:55–21:50) were already at 0 calls. |
| Oct 22 22:22 / 22:53 | #66 prompts: "Only call Claude through `PASS_ID=… claude-code-review.sh`" and "at most 5 Claude calls". Results: "I used 1 of the 15 Claude calls" and "1 of the 5". These are the **last usage.log lines** (22:25 and 22:57). |
| Oct 22 23:17 | pr64/pr65 deltas: "I made 0 Claude calls". |
| **Oct 23 00:13** | CCR's #66 delta prompt: "(≤5 Claude calls; **ideally 0–1**)". Result: "I used 0 of the 5 Claude calls". From here on every review is manual. |
| Oct 23 03:22 / 05:38 | pr65-delta-c877f69 and pr67-rc1-5d9efa6 headers: "**Claude calls:** 0", with a PASS verdict. |
| Oct 24 14:13 | pr69 prompt: "Call Claude … **if genuinely useful** (cap 15 calls); **prefer your own analysis**." |
| Oct 24 17:40 → Oct 29 | Template line in every prompt from then on: "**CLAUDE CALLS (optional, cap 15)**: only via `PASS_ID=… claude-code-review.sh -p …`" (pr70, pr71, pr77–pr82). Oct 27 20:55: "use 0 if not needed"; Oct 27 21:31: "0 is fine". Every result says "0 of 15" or "0 of 5". |
| Oct 27 23:15 – Oct 29 | #73–#82 reports say "Claude calls used: 0/15" next to the PASS. HoE and the Architect cited them as "CCR PASS" (engineering/status.md, PR comments on #77–#79). |
| Oct 30 07:26 | A limit probe in ~/.claude (not a review) gets "You've hit your session limit · resets 8:40am". |
| Oct 30 07:28 → 07:34 | CCR's lane-tools PASS is manual. Asked by Vadim at 07:31, CCR said: "I didn't use the Claude Code subscription for this one … this review didn't get **the usual** Claude second pass". There had been no "usual" Claude pass since Oct 22. Withdrawn at 07:34. |

**Tried and failed, or never tried?** It never tried. lib.sh appends a `started` line to usage.log *before* `setsid timeout … claude` runs, so even a call that hit a limit, timed out or produced no output would leave a line. There is none after Oct 22 22:57 CET. ~/.claude has no session between Oct 22 22:57 and the Oct 30 07:26 probe (per audit). No executor result mentions a limit, an error or a wrapper failure. Every one reports a deliberate 0.

**Who set "optional"?** CCR did, in its own executor prompts. Nothing in HoE's review requests from Oct 22 to Oct 30 asks for a Claude call or tells CCR to skip one; no HoE message in that period mentions Claude calls at all. The CEO's decisions never mention CCR's Claude calls. The framing came from CCR's reading of its brief (cadence "to keep subscription use reasonable", "must not slow merges down") plus standing rule 10.

## Contributing factors
1. **Role and engine mismatch.** The profile says "run on the studio's Claude Code subscription via /home/box/.local/bin/ask-claude". The bot itself isn't Claude, nothing requires a call, and the path in the brief is ask-claude, while the README says to use the wrapper only.
2. **Cap without floor.** The wrapper and README define a maximum per PASS_ID (15, or 5 for a re-check) and no minimum. "Claude calls: 0/15" read as budget left over, not as a missing review.
3. **Pass criteria a person can meet.** README "Evidence / pass criteria" for the Code Reviewer asks for file:line plus a failing test or command output, all of which a manual executor provides.
4. **Speed and cost pressure.** Brief: "keep subscription use reasonable", "must not slow merges down". Rule 10: Claude bots "never wait". Usage-saving mode (D-CEO-20261022-01, 27-01) adds to it. Each one alone is reasonable, but together they reward 0 calls.
5. **Name used as proof.** Verdicts were relayed as "CCR PASS", and the name implied Claude. Nobody (HoE, HoQA, CEO, Ops) cross-checked the "Claude calls" header or usage.log, and the CEO weekly `usage-report.sh` summary wasn't used to spot it.
6. **Delegation hides the engine.** All work ran in executor subagents that may not call Claude except through Shell, so whether Claude was used depended entirely on the prompt.
7. **The other 4 Claude bots** were simply inactive after Oct 16–22 (cadence cuts in D-CEO-20261028-02 plus usage-saving), so their gap was idleness, not manual substitution.

## Fix proposals (for HM to apply to the 5 Claude bots' briefs; CEO to approve; no change to the Claude setup itself)

**A. Brief line (all 5 Claude bots), just after the rule-22 line:**
> Claude-call proof (D-CEO-20261030-01): every verdict must rest on at least one real Claude call made through your wrapper `ops/claude/claude-<bot>.sh` with a PASS_ID for the exact SHA or build under review. Never call `claude` or `ask-claude` directly. If you delegate, the subagent prompt must say "Claude call REQUIRED: at least 1, at most <cap>, only via <wrapper>"; never write "optional", "if useful", "ideally 0" or "0 is fine". Your own reading and tests support the Claude review; they never replace it. If no call succeeds (limit, error, timeout, noout), give no verdict.

**B. Brief line (CCR only), replacing "run on the studio's Claude Code subscription via /home/box/.local/bin/ask-claude":**
> You run your reviews through Claude Code, only via `ops/claude/claude-code-review.sh` (wrapper-only rule, ops/claude/README.md).

**C. Report template (first line of every Claude-role report file and every summary message):**
```
Claude calls used: N (wrapper log lines: <usage.log line numbers or timestamps of each final line>, PASS_ID <id>, status <ok|error|timeout|noout>)
```
- When N ≥ 1 and at least one status is `ok`: the verdict follows as usual.
- When N = 0, or no line is `ok`, the line must read: `Claude calls used: 0 — no Claude review — no verdict (reason: <limit/outage/login/not attempted>)`. There is no PASS or FAIL and no finding counts, and nothing should cite it as a review. Notes may follow under the heading "Unofficial notes, not a review".

**D. Wrapper and log check (read-only, owned by Ops, no change to lib.sh or the Claude setup):**
- Add `ops/claude/verify-verdict.sh <bot> <PASS_ID>`, which prints the matching final lines from usage.log and exits non-zero if none has status `ok` and counted=1. Reviewers paste its output into the header line above. Anyone citing a Claude verdict (HoE, HoQA, CEO) runs it first, or checks that the header quotes log lines.
- Ops' daily archive, or the keep-moving check, greps new `engineering/reviews/*-ccr.md`, `qa/claude-*`, `art-ux/claude-review`, and `product/claude-review` reports for a verdict while `Claude calls used: 0`, then flags each hit in ops-log as "no Claude review" (non-blocking).
- `usage-report.sh` output goes into the CEO weekly summary next to the count of Claude-role verdicts, so a gap between verdicts and calls shows up within a week.

**E. Process wording (org-plan / README, for the CEO):** README "Evidence / pass criteria" for the Code Reviewer gains "…and at least one `ok` wrapper call for the reviewed SHA". Anyone relaying a Claude-role verdict writes it as "CCR (Claude, N calls) PASS" or "no Claude review", never as a bare "CCR PASS".

Per rule 22, none of this makes Claude a gate. It only makes sure a missing Claude review is labelled as one.
