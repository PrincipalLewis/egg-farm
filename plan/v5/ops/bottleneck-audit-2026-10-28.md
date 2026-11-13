# Bottleneck audit, 2026-10-28 (Ops, one-off, Vadim-approved)
Sources: studio logs, archive (Oct 18–25), queues, qa/m41/, engineering/reviews/, git log, GitHub release times. Times before Oct 25 are CEST, after are CET. **Fixed (D-CEO-20261028-01), not up for merging:** green CI, sha256/build-ID check (verify-before-publish), Saves QA, external-action rule (11). Everything below is a proposal for the CEO.

## Top 3 waits
| # | Waiting on | Evidence (computed) | Typical | Worst |
|---|---|---|---|---|
| 1 | **Vadim's go / direction** | Freeze idle 17 Oct 14:53 → "M4" 19 Oct 00:09 = 33h16m. P2 NO-GO (D-CEO-20261025-01, 25 Oct 02:32) → now = ~77–78h, open. M5.0 code waiting since D-CEO-20261024-08 (24 Oct 18:15) = ~86h, open | ~33h | 86h+ and still open |
| 2 | **Account resources owned by Vadim** (Grok Bot usage, Actions billing) | Usage stalls: 19 Oct 10:35 → 21 Oct 17:17 (54h42m) and 21 Oct 17:26 → 22 Oct 19:21 (25h55m) = 80h37m with no work done. Actions down ~19 Oct 09:30 → repo public 24 Oct 14:47 = ~125h. RC 5d9efa6 (23 Oct 05:39) sat 33h03m before the Saves QA run (24 Oct 14:42); Latest 24 Oct 17:31 = 35h52m from RC | 26–55h per outage | 125h (CI) |
| 3 | **Review/verify queues** (QA intake, CCR) | Commit → QA PASS on 7 M4.1 builds: 18, 54, 83, 144, 181, 199, 230 min. CCR head → verdict on PRs #72–#75: 38, 64, 67, 104 min; #76 has been waiting 86 min since its 06:19 head. VER-1 took 4 serial CCR rounds (each round's Minor/Nit became a new PR): #72 head 22:17 → #75 merge 03:12 = 4h55m | QA 144 min median; CCR ~65 min/round | QA 230 min; CCR 104 min/round, 4 rounds for one tool |

Thin data: handoff→'accepted' marks exist only since Oct 27 (one HANDOFF.md), so they can't be measured. Before Oct 22, QA times are mixed with outages (1682a0c was committed Oct 19 and passed Oct 22). Waits 1–2 are ~30x wait 3, and gate changes can't fix them. Proposal: one batched CEO brief to Vadim with revive-or-kill dates.

## Gates and passes found (counts differ from expected)
- **Release gates: 8 rows, not 7.** status.md Current focus table: G1 unit+slow, G2 AC7 pacing, G3 L30+ step (N/A until M4.2), G4 Saves, G5 release checks/EXP1, **G5b published-asset smoke**, G6 Art & UX, G7 reviewers. G5b repeats release-checklist step 5. Separate name clash: product/economy/gates.md has its own G1–G10 economy card.
- **Review passes: 7, not 4.** G7 lists 4 (Player, Critic, Claude QA, Claude Gamer). org-plan.md roster lines 23–27 add CCR (blocking, per build), Claude UX (≤8 calls per build) and Claude Design (≤10 calls per milestone). Claude QA and Gamer are ≤10 calls each per build. QA verify is the G4/G5 lanes.

## Merge proposals (max 3, CEO decides)
| # | Merge | Safety given up | Saving (rough) |
|---|---|---|---|
| A | **Claude QA + Claude Gamer → one Claude pass per milestone** (not per build); Player and Critic stay | A second bug lens on intermediate builds. Low risk: rule 10 says they're second opinion only, and studio QA owns bugs | ≤20 calls per build → ≤10 per milestone; M4.1 had 7+ builds |
| B | **CCR: re-review only on Blocker/Major**; Minors/Nits are fixed with a self-review, in the same PR, not a new PR plus a new CCR round | An outside check on nit fixes. Blocking findings still stop the merge | VER-1 would have needed 2 rounds, not 4–5: ~2–3 CCR passes and ~2.5h of wall time |
| C | **G6 Art & UX at RC signs off from UI QA's 3-engine shots + manifest** (process rule 5) instead of its own re-run; Claude UX goes per milestone | An independent designer browser run at the RC. Per-PR Art gates stay (all PASS by 23 Oct 04:11) | One 3-engine browser run per RC + ≤8 calls per build |

Not proposed: G1/G2 (cheap), G3 (off), G4/G5b/verify/CI (fixed). G5b and checklist step 5 are one check under two names.
