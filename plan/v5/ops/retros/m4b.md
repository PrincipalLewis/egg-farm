# M4 B retro (OPS-3), written 2026-10-19 by Retro Facilitator

**Routing:** every action below is a **proposal**. A change goes through the owner's head first, then the CEO. (For the CEO-owned action, the CEO decides directly.) Anything that touches reporting lines, roles or handoff rules also goes to the **Company Architect**. Those actions are marked **[Architect]**: A2 and A4.

**Inputs:** ops-log.md (2026-10-19 entries, plus the 00:10 freeze-over line filed under the Oct 18 heading), decisions.md D-CEO-20261019-01 to -13 (and D-HOE-20261019-02 inside it), ops/decisions.md (empty, so nothing relevant), engineering/parked.md, engineering/triage/parked-pre-m4.1-20261019.md. Gaps were checked against engineering/m4.1-backlog.md, qa/queue.md and org-plan.md. Times are Belgrade (UTC+2).

## Summary
The freeze lifted at 00:09 (D-CEO-20261019-01), and M4 B is now live as Latest `m4b-dd223f5`, built from 246de09 (D-CEO-20261019-11, 09:00). It shipped **capped at farm L30**. The L30+ pack was merged into the RC at 03:22 (D-05) and dropped at 04:46 (D-10).

The biggest slowdown was a **harness mismatch**. Economy's L30+ step number (P95 2.12) came from a different harness than the real #45 code (P95 2.710, worst seed 3.029). As a result the fallback decided in advance in D-08 (04:14) was overturned by D-09 (04:29), and then D-10 (04:46) shipped the capped B. Earlier, D-03 (00:36) found that `tests/bot.ts` ignored the M4 tracks.

Two other problems added friction:
- **Stale shared docs after the freeze lifted:** org-plan freeze text, qa/queue.md and the status.md Current focus.
- **parked.md drift:** it turned into a next-release backlog instead of the approved one-row-per-PR list.

Most fixes were approved at 09:06–09:08 (D-12, D-13). The actions below target what those decisions leave open or unverified.

## What went well
- **The freeze ended on a recorded decision.** It ended on Vadim's own words and a decision ID (D-CEO-20261019-01, 00:09). Ops reset the keep-moving check at 00:10 (ops-log).
- **The post-RC scope rule was followed.** The L30+ merge came with D-CEO-05 plus a HoQA capacity ask (ops-log 09:12, follow-up item 4).
- **A gate change was cross-checked before it took effect.** D-06 was put on hold at 03:52 until Economy re-measured. HoQA's independent check agreed (no sim cap, the 900 s hits are real buys), and D-06 came into force at 04:04 on two matching measurements.
- **The harness mismatch was caught before ship.** D-09 required measurement on real #45 code with the Architect's harness, and Engineering staged the capped variant in parallel. That let D-10 be decided at 04:46 instead of waiting for the 06:00 cap.
- **The explainer spec was settled before B was built.** HoP's m4a-spec v1.15 (D-HOP-2026-10-19-14) was final, and B was built to it (D-10, 04:46 later note).
- **Housekeeping closed quickly.** The QA bot trial report was done at 01:54, and QA4-1 was ruled Minor in D-02 (ops-log 09:12). The improvement proposals were approved within minutes (D-12 at 09:06, D-13 at 09:08), and team queues existed by 09:12. qa/queue.md was reset for M4.1 at 09:10, and its intake rule now asks for harness + code SHA + CSV sha256.

## What slowed us (evidence)

### 1. Harness mismatch (D-08 → D-09 → D-10)
- **D-CEO-20261019-03 (00:36):** `tests/bot.ts` ignored the M4 Hens/Egg Value tracks, so the 15.3 min L10 P95 was suspect. The 00:48 amendment then found that Economy's scratch bot already bought tracks, so the miss was real. This means the test bot and Economy's bot behaved differently, and that was only found during the release night.
- **D-CEO-20261019-08 (04:14):** this approved an L31+ retune with a fallback decided in advance: "ship CSV f158e258 with the P95 step at 2.12". The fallback rested on a number that had not been measured on real code.
- **D-CEO-20261019-09 (04:29):** on real #45 code (b29e0e9) with CSV f158e258, the step was P95 2.710 and the worst seed 3.029. The decision says "Economy's 2.12 came from a different harness". D-08's fallback was superseded 15 minutes after it was written.
- **D-CEO-20261019-10 (04:46):** both candidates fail on #45 code (T3b 2.710/3.029; T3c 2.691/3.065) because of the farm_cost jumps at L34/L39/L49. B ships capped at L30, L30+ moves to M4.1, and Economy stops the retune.
- **ops-log 09:12, topic 2:** "Harness mismatch cost the night."
- **Time lost:** L30+ work ran from the 03:22 merge decision (D-05) to the 04:46 drop (D-10), plus the retune from 03:30 (D-03 amendment). How many bot-hours this cost, and how long the release was delayed, is *unclear from logs*.
- **What exists now:** a one-command harness on #45 code is approved (D-12 item 2). It is row M41-1 in engineering/m4.1-backlog.md (Architect, cap 13:00, status "in progress" at the time of this retro). Nothing in the inputs says that someone other than the number's author re-runs it before the CEO rules on a gate number.
- **Related churn on the explainer spec:** D-07 (04:13) was amended at 04:13, amended again at 04:46, and that amendment was superseded later at 04:46 by v1.15. A commit was dropped as a result (D-10 note). Whether this delayed the RC is *unclear from logs*.

### 2. Stale docs after the freeze lifted
- The freeze lifted at 00:09 (D-CEO-20261019-01). At the 09:12 meeting (ops-log), these were still stale:
  - org-plan.md "Feature freeze" still read "in force". Ops fixed it at the meeting.
  - status.md Current focus still said the CEO had to set scope and caps, after D-CEO-11 at 09:00. Ops fixed it.
  - qa/queue.md was reset at 01:54 for M4-on but still showed #41 "waiting for intake" after M4 B shipped. HoQA reset it at 09:10.
  - UI/Visual Designer appended a "nothing new" status line every 30 min (ops-log 09:12, topic 1).
- **Contributing factor:** Standing rule 9 requires each decision to name "the files it affects". None of D-CEO-20261019-01 to -13 in decisions.md has a files list. (The archived Oct 17 decisions did, for example D-CEO-20261017-01, "Files: decisions.md, …".) Without that list, no owner was told which files to update.
- **What exists now:** D-12 item 1 approves "every milestone decision lists the files it affects, each owner updates within 30 min". The 09:12 meeting proposal also says that "Ops checks it in the keep-moving run". Whether that check now runs is *unclear from logs*.

### 3. parked.md drift
- D-CEO-20261018-01 (2) asked for engineering/parked.md with one row per PR, each row giving head SHA, owner, why parked + parking decision ID, revive condition, open risks, and keep/close.
- **ops-log 09:12, follow-up (2):** parked.md existed (08:58) but had no PR rows. It held next-release follow-ups instead (canPersist, QE-LATE, CCR pr49, ECON-DEADCOL, the Art & UX L30 label). Meanwhile status.md pointed to "PRs in engineering/parked.md" that weren't listed. Topic 3 says "parked.md became the next-release backlog".
- **Reset:** HoE reset parked.md at 09:10. The old notes moved to engineering/triage/parked-pre-m4.1-20261019.md, and next-release work moved to m4.1-backlog.md (D-12 item 3). D-13(a) added revive-or-kill dates.
- **Still open in the current file:**
  - It has no head SHA, owner, parking decision ID or open-risks columns. It does have Branch, What, Why parked, Revisit, and Revive-or-kill by.
  - One row bundles nine PRs: #2, #3, #4, #5, #6, #10, #16, #30, #35, with triage "by 18:00".
  - Whether the 6 merged branches and the stale worktree/scratch dirs (12 wt-/game- dirs, 82 scratch dirs, per ops-log 09:12 topic 3) have been cleaned is *unclear from logs*.

## Actions (proposals; at most 5, one owner each)

| # | Action | Owner (roster role) | Done when | Architect? |
|---|---|---|---|---|
| A1 | Publish the one-command L30+ harness on #45 code (M41-1). It uses the same bot policy as `tests/bot.ts`, including track buying (D-CEO-20261019-03), and prints harness version, code SHA and CSV sha256 with every result. Economy scratch bots are no longer a source of gate numbers. | Senior Software Architect | M41-1 in engineering/m4.1-backlog.md is marked done with the command path, by its 13:00 Oct 19 cap. Re-running it on b29e0e9 + CSV f158e258 reproduces D-09's P95 2.710 / worst 3.029. | No |
| A2 | Before the CEO rules on any L30+ gate number, including a fallback decided in advance like D-08, QA re-runs it independently on the A1 harness at the named code SHA and CSV sha256. This repeats the D-06 cross-check that worked (04:04). | Head of QA | qa/queue.md has a standing row for "independent harness rerun before gate ruling". The M41-2 reshape result is re-run and matched (or flagged) by QA before the 18:00 Oct 19 reshape cap. | **Yes** (adds a step to the Economy → CEO handoff) |
| A3 | Every new CEO decision carries a "Files:" line naming each affected file and its owner (Standing rule 9, D-12 item 1). | CEO | Every D-CEO entry from D-CEO-20261019-14 onward in decisions.md has a Files: line with owners. | No |
| A4 | Add a 30-minute stale-file check to the keep-moving run. For each new milestone decision, check that every file on its Files: line was updated within 30 min, and flag the owner if not. Also flag status lines that only say "nothing new". | Head of Operations | The first keep-moving entry in ops-log.md after the next milestone decision lists each affected file with updated yes/no and minutes since the decision. | **Yes** (adds a duty to a role) |
| A5 | Bring engineering/parked.md to the D-CEO-20261018-01 (2) shape. Give each PR its own row (split the #2/#3/#4/#5/#6/#10/#16/#30/#35 row) and add head SHA, owner, parking decision ID and open-risks columns next to the existing revive-or-kill date. | Head of Engineering | Every open parked PR has its own row with all of those fields filled. The bundled row is gone by its 18:00 Oct 19 triage cap. | No |

## Status (Oct 19, 09:15, per Head of Operations)
- A1: Covered by D-CEO-20261019-12 and D-CEO-20261019-13 (one harness).
- A3: Covered by D-CEO-20261019-12 and D-CEO-20261019-13 (affected files updated within 30 min).
- A5: Covered by D-CEO-20261019-12 and D-CEO-20261019-13 (parked.md one row per PR).
- A4: Taken by Head of Operations (stale-file check added to the keep-moving routine).
- A2: New. Sent to Head of QA and the Company Architect for review; the CEO ruling comes after. Outcome pending.
- A2, Company Architect (09:15): Approved, with three limits. (1) Scope: only L30+ gate numbers the CEO is about to rule on, not exploratory reshape candidates. (2) Flow: Economy sends Head of QA a priority handoff naming the harness sha, code SHA and CSV sha256. QA adds a qa/queue.md row with an owner and a cap (about 30 min). The item also goes on the status.md "Waiting on decision" line. (3) Pass rule: QA's CSV sha256 must match Economy's, or the number must be within the tolerance in product/economy/gates.md. On a mismatch it goes back to Economy, and the CEO doesn't rule until it's resolved. Once the CEO approves, the Architect adds it to the org-plan Process rules. Still waiting on Head of QA.
- A2, Head of QA (09:15): Accepted, with one change. Economy must hand QA the candidate CSV, its sha256 and the code SHA at least 45 min before any ruling or cap (for M41-2, by 17:15). If it arrives later, QA reports the rerun as incomplete and doesn't sign off. The rerun uses only `npm run measure:l30plus` (D-CEO-12). A match means exact under seed determinism. Standing row: qa/queue.md #6.
- A2: Sent to the CEO for a ruling (09:16). Combined terms: the Architect's three limits, plus QA's 45-min lead time and exact match.
- A2: APPROVED by the CEO as written, D-CEO-20261019-14 (09:16). The M41-2 Economy handoff to Head of QA is due by 17:15. The Company Architect has been asked to add it to the org-plan Process rules.
