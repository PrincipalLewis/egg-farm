Claude calls used: 1 (wrapper log lines: 2026-11-10T10:55:18+01:00, PASS_ID usage-audit-w45-review, status ok)

```
227: 2026-11-10T10:55:18+01:00	usage-audit-w45-review	code-review	claude-sonnet-5-5/high	ok	23	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID usage-audit-w45-review
```

# Usage overhead audit, week 45 — Claude review

**Claude Code Reviewer (Claude, 1 call) CONFIRMED WITH CHANGES**

Full Claude output: `engineering/reviews/usage-audit-w45-review-ccr.md`. The audit and org-plan were not edited. Reviewer transcript sample (Architect, Features, Econ; 5–10 Nov) was fed into the call; Claude judged.

## Concrete changes

To `ops/usage-overhead-audit-w45.md`:
1. Item 2 / cut 2: drop "PR #103 alone has 29 review files, #104 has 14" (and "#103 had 29 files"). A filename glob under engineering/reviews + qa + artifacts did not reproduce those counts (0 and 3). Keep #125 = 11, which was reproduced, or cite the exact tree/method.
2. Line 11: the "304 Architect review files (79 re/delta)" count uses a different method from the sample check (79 Architect-named files, ~36 re/delta). Note that counts depend on the method, and that the 26% re-run share is E.
3. Items 2 and 8, and cuts 2 and 5: add a non-additive note. Merge-forward delta reviews sit in both pools. Split them: item 8 = CI runs plus notices; item 2 = content re-reviews only. Don't sum the overlap.
4. Item 4 / cut 4: treat the Product/Econ saving as deferred work, not eliminated waste. Econ's R04/BG5 and #100 Q-E2 work in the sample was real production. Restate cut 4 as about 3–6 points, or split "waste removed" vs "work deferred", and add the cost of deferral.
5. Line 36 headline: lower to ≈25–38 of 135 points (≈18–28%), and "1.3–1.5x" to "≈1.2–1.4x".
6. Item 3 / cut 3: Architect's "noted/received" matches were mostly inside substantive replies; the pure-ack pool is smaller. Features had about 22 short ack turns. Lower cut 3 to roughly 4–7 points.
7. Item 1 / cut 1: add the STOP side effect. Features' StopSubagent on the Nov 10 STOP also cancelled HoE, Architect, HoQA and others, and there were duplicate CEO 65% STOP messages. Add "one STOP, scoped StopSubagent, no duplicate wake" as a cheap missed saving.

To `org-plan.md` rules 10–14 (do not apply here; recommendations only):
8. Rule 10: add a QA-gate exception — HoQA wakes automatically when a PR is Ready for gate or an rc gate is due; engineers or HoE may also wake QA by DM. This stops staged restarts from stalling QA bars.
9. Rule 11: a new round is allowed when the sha (or scope) changed; the 3-round cap counts rounds on an unchanged scope. Conflict deltas that touch code (e.g. #107 effects.ts/timers.ts) are not inherits. HoE may lift the cap.
10. Rule 12: a blocker, a failed gate, or a sha mismatch is never an ack and must always be sent. Pure "Ack #N @sha, Ready" replies are replaced by marking the queue row (rule 1).
11. Rule 13: change "one-line ruling" to "a short written ruling (≤10 lines) when an engineer asks." A lane may finish an in-flight screen or package already started, with a status line. This covers the #100 Q-E2 case.
12. Rule 14: each PR keeps its own sha and gate id; batched CI must report per-PR results. A red PR is posted as a blocker immediately and does not wait for the batch. A content conflict like #107 still gets its own delta.

## Answers (Claude)

**(1) Sources.** Mostly right. Items 1, 2, 3, 5 and 8 line up with the sample (Architect 235/352 messages matched review/delta/inherit; Features 255/459 matched mergefwd/CI; Bot-to-Bot is 87%). Overstated: item 3 (acks often sit inside substantive replies), item 4 (Econ traffic was largely real work), and item 2's #103/#104 file counts. Missed: STOP side effects (cancelled in-flight turns and duplicate STOP wakes). Item 1's causes are if anything understated: Nov 10 had D-12 park, D-16 un-park, D-17 park, then two STOPs.

**(2) Will rules 10–14 cut the waste, and could they hurt?** Yes, they target the right patterns; some inherits are already one line (#108/#111). Risks, with the mitigations in changes 8–12: rule 10 can delay QA gates without a wake trigger; rule 12 can swallow blockers or "Ready" signals unless the queue row substitutes; rule 13 would have stopped R04/BG5 and the #100 Q-E2 analysis mid-stream; rule 14 can mask a broken PR if a conflict delta is treated as an inherit; rule 11's cap must not count rounds where inputs changed (PR-A pre-bar fix then recheck). With those guards the rules should not slow v5.

**(3) Savings.** 33–49 points (25–35%) is somewhat high; treat it as an upper bound. Double-counting: items 2 and 8 / cuts 2 and 5 share mergefwd-delta reviews; cut 5 mixes measured room turns with mergefwd; cut 4 counts deferred work as saved; cut 3's pool is smaller; cut 1 overlaps item 4 (park/un-park). The cut ranges also assume zero overlap and full compliance. A realistic range after netting overlap is about 25–38 points (≈18–28%). All per-item points stay E, as the audit already says. The sample is not a census.
