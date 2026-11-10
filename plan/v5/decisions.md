# v5 decision index

One line per CEO decision from D-CEO-20261029 onward (v5 era). Full text: [`studio/decisions.md`](studio/decisions.md) (from D-CEO-20261030-02) and [`studio/archive-decisions-in-force/`](studio/archive-decisions-in-force/) (D-CEO-20261029-* and -20261030-01; archived but still in force). Department decision logs (D-HOE-*, D-HOP-*, D-PM*-*, QA-D-*) are in `engineering/decisions.md`, `product/decisions.md`, `qa/decisions.md`, `art-ux/decisions.md` and `ops/decisions.md`. Earlier still-in-force decisions (D-CEO-20261024-02…09, D-CEO-20261025-01/-02) are in the archive files too.

| ID (date = YYYYMMDD in the ID) | Time (CET) | Decision |
|---|---|---|
| D-CEO-20261029-01 | 19:40 CET | Vadim's go for version 5, shipped as ONE release |
| D-CEO-20261029-02 | 22:20 CET | v5 UI QA, provisional run on P2_HEAD with diff-based carry-over (HoQA request) |
| D-CEO-20261029-03 | Thu Oct 29 23:15 CET | v5 RC UI QA lane split (HoQA escalation, V5UCAP3 >10 h) |
| D-CEO-20261029-04 | Thu Oct 29 23:36 CET, logged Oct 30 07:24 after box recovery | Standing rule 21, lane-scoped process control |
| D-CEO-20261030-01 | Fri Oct 30 07:36 CET | Standing rule 22, Claude roles work only through Claude |
| D-CEO-20261030-02 | Fri Oct 30 10:05 CET | V5-HOP-1 economy CSV PR needs no separate Vadim go |
| D-CEO-20261030-03 | Fri Oct 30 10:40 CET | V5-HOP-1 is on the RC critical path |
| D-CEO-20261030-04 | Fri Oct 30 11:10 CET | telemetry v0.6.2 and salesStopped (#5b) move to 5.1 — *superseded by -09 (back in v5)* |
| D-CEO-20261030-05 | Fri Oct 30 11:38 CET | release links to Slack #egg-farm |
| D-CEO-20261030-06 | Fri Oct 30 12:16 CET | v5 RC ships all m4.flags = 0, and the M5 features become the next release — *superseded by -09* |
| D-CEO-20261030-07 | Fri Oct 30 12:19 CET | manifest build-state controls |
| D-CEO-20261030-08 | 12:40 CET | M5 build plan approved (CEO) — *waves cancelled by -09* |
| D-CEO-20261030-09 | 12:55 CET | Vadim's direction: v5 = ONE release with ALL features (supersedes -06 ship-all-0 RC and -08 waves) |
| D-CEO-20261030-10 | 12:55 CET | Vadim: no cuts, take the dev time; no full QA on small builds (amends -09) |
| D-CEO-20261030-11 | 13:55 CET | v5 schedule (iii) approved; hire approved; BBv2 in v5 |
| D-CEO-20261030-12 | 13:55 CET | Standing rule 23: restart guard (HoO proposal) approved |
| D-CEO-20261030-13 | 15:10 CET | 90% usage STOP (Vadim's rule) — *lifted by 20261105-01* |
| D-CEO-20261105-01 | 20:10 CET | 90% usage STOP lifted; v5 resumes |
| D-CEO-20261105-02 | 20:30 CET | Operative v5 schedule while Features remains blocked |
| D-CEO-20261105-03 | 20:21 CET | Vadim resumes every v5 lane, including Features and Economy |
| D-CEO-20261105-04 | 20:23 CET | Full-speed v5; usage stop lowered to 80% — *stop now 65%* |
| D-CEO-20261106-01 | 00:11 CET | Usage stop lowered to 67% — *stop now 65%* |
| D-CEO-20261106-02 | 00:17 CET | No merge-forward re-review / re-gate unless PR code changed |
| D-CEO-20261106-03 | 00:30 CET | Standing rule 25: do the job once |
| D-CEO-20261106-04 | 2026-11-06 04:47 | CEO STOP, Vadim 67% usage rule |
| D-CEO-20261109-01 | 2026-11-09 23:38 | RESUME v5, usage stop now 65% |
| D-CEO-20261109-02 | 2026-11-09 23:52 | v5 re-baseline approved |
| D-CEO-20261110-01 | Tue 10 Nov 00:25 CET | v5 freeze slips for Breeds UI |
| D-CEO-20261110-02 | Tue 10 Nov 00:30 CET | Usage budget through the v5 freeze |
| D-CEO-20261110-03 | Tue 10 Nov 00:45 CET | Usage budget approved — *split replaced by -15 from the restart* |
| D-CEO-20261110-04 | Tue 10 Nov 00:55 CET | Burn re-plan; held-PR and PR-A push rulings |
| D-CEO-20261110-05 | Tue 10 Nov 01:05 CET | R04 CSV repair route |
| D-CEO-20261110-06 | Tue 10 Nov 01:10 CET | #100 on critical path; QA post-freeze budget |
| D-CEO-20261110-07 | Tue 10 Nov 01:15 CET | Broody yard UI gap — *amended by -08: svg is FINAL* |
| D-CEO-20261110-08 | Tue 10 Nov 01:25 CET | Lane-U UI gap: no cuts, RC slips |
| D-CEO-20261110-09 | Tue 10 Nov 01:26 CET | Lane-U backfill hire approved |
| D-CEO-20261110-10 | Tue 10 Nov 01:30 CET | Lane-U plan and provisional dates — *dates withdrawn by -11* |
| D-CEO-20261110-11 | Tue 10 Nov 01:42 CET | Sim gaps found too; dates withdrawn until the audit |
| D-CEO-20261110-12 | Tue 10 Nov 01:57 CET | Burn triage before the ~03:00 stop |
| D-CEO-20261110-13 | Tue 10 Nov 02:12 CET | 14-flag table accepted; Hire 2 and Hire 3 approved; usage named as the binding constraint |
| D-CEO-20261110-14 | Tue 10 Nov 02:14 CET | Lean operating mode from the restart |
| D-CEO-20261110-15 | Tue 10 Nov 03:00 CET | Weekly split and parked burn |
| D-CEO-20261110-16 | Tue 10 Nov 03:02 CET | Un-park in lean mode until the 65% stop |
| D-CEO-20261110-17 | Tue 10 Nov 03:55 CET | 55% reserve call |
| D-CEO-20261110-18 | 2026-11-10 04:49 | CEO STOP, Vadim 65% usage rule |
| D-CEO-20261110-19 | Tue 10 Nov 10:50 CET | Overhead cuts adopted from the HoOps audit |
