# Usage budget to the RC verdict (D-CEO-20261110-02) — drafted by Head of Operations, 2026-11-10 00:45 CET
Weekly usage: 4.5% at 00:41 (0.2% at the 23:45 resume, so ~4%/h). Stop guard trips at 65%. Next reset Thu 12 Nov 17:53 CET.
Spendable to the guard: 60 points. At the current pace that lasts about 14 h, until Tue ~15:00, which is before PR-B is Ready. So every share below is a cap, not a target.

| Dept | Share (points) | Covers |
|---|---|---|
| Engineering | 25 | PR-A (Architect), PR-B (Generalist), their cross-reviews, #124 drift fixes only if they gate K10/B4, freeze sha |
| QA | 14 | UI bar for PR-A and PR-B (one bar per head), CSV TS gate, K10/B4, RC verdict (incl. one re-run) |
| Product / Economy | 8 | CSV repair or feasibility by Tue 22:00, the CSV go |
| CEO | 3 | Decisions and the verdict only |
| Art & UX | 2 | RC UI evidence review (one pass) |
| Ops | 2 | Hourly guard and daily archive only |
| Reserve | 6 | Held by the CEO for a re-run or a slip |

Rules: a head reports when their dept reaches half its share and again at 80%. No polling, no status chatter, and no message unless it's a sha, a gate or a blocker. Wait on completion pings instead of loops.
Checkpoints at 25%, 40% and 55% weekly usage: the CEO checks critical-path progress against usage, and at 55% decides between finishing on reserve or re-planning around the Thu 17:53 reset.
Measuring: per-bot usage is only visible to Vadim's account, so Ops tracks dept burn through the Tools & Accounts Admin usage registry, not live in rooms.
