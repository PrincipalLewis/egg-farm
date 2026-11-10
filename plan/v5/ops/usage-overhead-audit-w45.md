# Usage overhead audit, week 45 (Thu 5 Nov 17:53 CET → Tue 10 Nov 10:50 CET)
Owner: Head of Operations · asked by CEO for Vadim · audit cost kept to a handful of tool calls (no transcript crawl, no helpers).

**Legend:** M = measured (usage report or file/git counts) · E = estimate (inference; ±50%).

## Base
- The usage report gives shares of all Grok Bot usage for Nov 5–10 UTC. The week spans two windows: about 68 points to the 06 Nov 04:48 STOP (D-CEO-20261106-04) and about 66.5 points after the Nov 9 restart. The total is **≈135 points, so 1% share ≈ 1.35 points (M)**.
- By day (M): Thu 5 40%, Fri 6 10%, Sat/Sun <1%, Mon 9 19%, Tue 10 31%.
- By activity (M): Bot-to-Bot 87% (≈117 points), group chats 7% (≈9.5), routines 3% (≈4), chats with Vadim 3% (≈4).
- Top bots (Bot-to-Bot, M): Architect 15%, Features & Economy 10%, Econ/Balance 8%, Saves 7%, Generalist 6%, HoQA 6%, QA UI 5%, HoE 5%, QA Saves 5%, HoP 3%, Hire2 3%, Hire3 3%, others 11%.
- Output since the reset (M): 328 game commits (104 are merges, 32%), 304 Architect review files (79 are re-, delta or re-bar files, 26%), 706 QA report files (296 are re-runs or deltas, 42%), and 28 CEO decisions (11 of them stop, resume or park).

## Where the non-production usage went
| # | Item | Share | Points | Basis |
|---|---|---|---|---|
| 1 | Turns lost to stops and restarts: the 6-hour Nov 5 resume storm (40% in one evening), STOP, park and un-park flips, HANDOFF pushes, and re-orientation after the Nov 9 restart | 8–12% | 11–16 | E; day split M, 11 stop/resume decisions M |
| 2 | Reviews and re-reviews, including duplicate reviews of unchanged inputs (rule 25). PR #103 alone has 29 review files, #104 has 14 and #125 has 11 | of the ≈42 points in the review lanes, 26–42% were re-runs | 11–17 | Counts M, points E |
| 3 | Coordination messages and acks between bots (DM relays, "got it", forwarded status, head ↔ staff ping-pong) | 8–11% | 11–15 | E; Bot-to-Bot M, ack fraction E |
| 4 | Re-planning and re-sizing: forecast v5, QA flag table, budget split D-14/15/16, park/un-park. Product/Econ burned about 11 points against a weekly split of 2 | 5–7% | 7–9 | Product/Econ 11% M; planning share E |
| 5 | Group-room turns: every member wakes on each post | 7% | 9.5 | M |
| 6 | Polling, waiting and empty wakes: gate watchers inside bot turns, "is CI done" turns, held-message wakes | 3–5% | 4–7 | E |
| 7 | status.md and decisions.md upkeep: rewrites, plus 28 decisions logged across 5+ files each | 2–3% | 3–4 | E; decision count M |
| 8 | Merge-forward churn: 104 merge commits, each with its own CI and test run plus a notice | 3–4% | 4–5 | Count M, points E |
| 9 | Routines | 3% (studio ≈1.5%, non-studio Serbia/AI picks/Propaganda ≈1.5%) | 4 | M |
| 10 | CEO's own overhead: chats 1%, group <1%, routines <1%; CEO isn't in the Bot-to-Bot top 12 | ≈2% | ≈3 | M, ±1 |

Total overhead is ≈ **55–70 of 135 points (40–50%)**, all E. The remainder is code, tests and documents, which is mostly the engineer lanes.

## Top 5 cuts (ranked by points saved; figures are for a week like this one, ≈135 points across 2 windows)
1. **Staged restarts:** at a reset, wake only HoE plus the engineers on the next train item, and bring QA and Product in on request. No studio-wide resume broadcast, and no park/un-park inside a window: decide once at the restart. **Saves ≈8–12 points.**
2. **One review per sha:** enforce rule 25 mechanically. A new review is allowed only when the PR diff sha changed; otherwise the bar is inherited in one line. Cap any PR at 3 review rounds before escalating to HoE (#103 had 29 files). **Saves ≈8–12 points.**
3. **No-ack rule for DMs too:** extend D-CEO-20261110-06 from rooms to bot-to-bot DMs. Send only a sha, a result or a blocker; drop acknowledgements and pure relays; heads stop forwarding staff updates the CEO can read in status.md. **Saves ≈6–9 points.**
4. **Hard idle for out-of-split lanes:** Product/Econ and Art take no turns unless an engineer asks for a ruling (one line). Product/Econ overran by ≈9 points. **Saves ≈6–8 points.**
5. **Batch merge-forwards and rooms:** merge-forward the train once after each rc/v5 merge, not once per open PR, with one CI run. Rooms are only for sha, gate and blocker posts (already D-06/D-12); move everything else to the poster's status line. **Saves ≈5–8 points.**

Together these save ≈25–38 of ≈135 points (18–28%), about 12–18 points per 65-point window. At the same budget, that leaves about 1.2–1.4x as much usage for production work. (Revised after the Claude Code Reviewer second opinion: ops/usage-overhead-audit-w45-review.md. Acks and the Product/Econ overrun were overstated, merge-forward reviews were double-counted in items 2 and 8, and the Nov 10 STOP side effects of duplicate wakes and cancelled HoE, Architect and HoQA work were missing.)

## Limits of this audit
- The usage report has no per-turn or per-message-type split, so items 1–4 and 6–8 are estimates.
- A transcript sample of 2–3 heavy bots (Architect, Features, Econ) would firm them up, at about 1–2 extra points. I'll do that only on request.
