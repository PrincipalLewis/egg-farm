Claude calls used: 1 (wrapper log lines: 2026-11-10T10:55:18+01:00, PASS_ID usage-audit-w45-review, status ok)

```

227: 2026-11-10T10:55:18+01:00	usage-audit-w45-review	code-review	claude-sonnet-5-5/high	ok	23	0	1
verify-claude-verdict.sh: Claude calls used: 1 (status ok) for PASS_ID usage-audit-w45-review
```

Raw Claude stdout also saved as this file body below (session bef01b7b). PASS_ID warned (not <branch>-<shortsha>); HoOps required this id. 1 of 5 cap.

VERDICT: CONFIRMED WITH CHANGES

Claude Code Reviewer (Claude, 1 call) CONFIRMED WITH CHANGES

**CHANGES:**
1. `ops/usage-overhead-audit-w45.md`, line 17 (item 2): remove "PR #103 alone has 29 review files, #104 has 14". The reviewer's glob found 0 hits for #103 and 3 for #104, so these figures are unverified. Keep #125 = 11, which was reproduced. Also remove "#103 had 29 files" from cut 2 (line 31). Either cite the exact tree or counting method used, or mark the figures "not reproduced".
2. Same file, line 11: the "304 Architect review files (79 re/delta)" count uses a different method from the reviewer's check (79 Architect-named files, about 36 re/delta). Say so, e.g. "counts depend on the method; the 26% re-run share is E".
3. Same file, lines 17 and 23 (items 2 and 8): add a non-additive note. Merge-forward delta reviews (HoE tasks them, Features pings Architect and HoQA) fall under both. Split them explicitly: item 8 = CI runs plus notices, item 2 = content re-reviews only. Cut 2 and cut 5 then claim separate pools. Rework the totals so the overlap isn't summed.
4. Same file, line 19 (item 4) and line 33 (cut 4): reword the Product/Econ saving as deferred work, not eliminated waste. The sample shows Econ's R04/BG5 and #100 Q-E2 work was real production. Restate cut 4 as about 3–6 points, or split it into "waste removed" and "work deferred". Add the cost of deferral.
5. Same file, line 36: lower the headline. Suggested: ≈25–38 of 135 points (≈18–28%), with the unexplained overlap flagged. Change "1.3–1.5x" to "≈1.2–1.4x".
6. Same file, item 3 (line 18) and cut 3: add a caveat that Architect "noted/received" matches (18) were mostly inside substantive replies. The pure ack fraction is therefore lower than assumed. Features had about 22 short ack turns, which is a real but smaller pool. Lower cut 3 to roughly 4–7 points.
7. Same file, item 1 or cut 1: add the STOP side effect. A Features `StopSubagent` on the Nov 10 STOP also cancelled HoE, Architect, HoQA and others, and there were duplicate CEO 65% STOP messages. Put "one STOP, scoped StopSubagent, no duplicate wake" in the cuts. This is a cheap saving that is currently missed.
8. `org-plan.md`, rule 10 (line 73): add "QA gate exception: HoQA wakes automatically when a PR is Ready for gate or a release-candidate (rc) gate is due. Engineers or HoE may wake QA by DM." This keeps staged restarts from stalling QA gates.
9. `org-plan.md`, rule 11 (line 74): add "A new round is allowed when the sha changed. The cap counts rounds on an unchanged scope. Conflict deltas that touch code (effects.ts/timers.ts in #107) are not inherits." Also state that the cap can be lifted by HoE.
10. `org-plan.md`, rule 12 (line 75): add "A blocker, a failed gate, or a sha mismatch is never an ack and must always be sent. Pure 'Ack #N @sha, Ready' replies are replaced by marking the queue row, per rule 1."
11. `org-plan.md`, rule 13 (line 76): change "one-line ruling" to "a short written ruling (≤10 lines) when an engineer asks. A lane may finish an in-flight screen or package already started, with a status line." This covers the #100 Q-E2 case.
12. `org-plan.md`, rule 14 (line 77): add "Each PR keeps its own sha and gate id. The batched CI must report per-PR results. A red PR is posted as a blocker immediately and does not wait for the batch." Also add that a broken PR, or a content conflict like #107, still gets its own delta.

**(1) Main sources, missed or overstated?**
- Mostly right. Items 1, 2, 3, 5 and 8 line up with the sample. Architect had 235 of 352 messages matching review/delta/inherit, Features had 255 of 459 matching mergefwd/CI, and Bot-to-Bot is 87% of usage.
- Overstated:
  - Item 3 (acks). Architect's ack matches were mostly in substantive replies.
  - Item 4. Econ's traffic was largely real planning and tuning work, not waste.
  - Item 2's file counts. #103 and #104 were not reproduced.
- Missed: stop side effects (cancelled in-flight turns plus duplicate STOP wakes) and Build-room wakes where Econ had nothing to add (supports item 5). The latter is already covered, so only the first is genuinely new.
- Item 1 is real and probably understated in its causes: Nov 10 had D-12 park, D-16 un-park and D-17 park, then two STOPs.

**(2) Will rules 10–14 cut the waste, and could they hurt?**
- Yes, they target the right patterns. Rule 11 already fits the sample, since some inherits are already one line (#108/#111).
- Risks, with the mitigations in CHANGES 8–12:
  - **Rule 10:** it could delay QA gates if no wake trigger exists.
  - **Rule 12:** "no acks" could swallow blockers, or the "Ack #114 … Noted Ready" signals that the queue still needs. Those need a queue-row substitute.
  - **Rule 13:** hard idle would have stopped the R04/BG5 work and the #100 Q-E2 analysis mid-stream.
  - **Rule 14:** batching could mask a broken PR. #107 needed a real conflict delta, and inheriting on an unchanged tree is not the same as inheriting after a conflict.
  - **Rule 11:** the 3-round cap needs a rule for rounds where inputs changed (the PR-A 11-case pre-bar fix plus a recheck).
- With those guards the rules should not slow v5.

**(3) Are the savings plausible?**
- The claim of 33–49 points (25–35%) is somewhat high. Treat it as an upper bound. The sample is not a census, so the evidence only supports a range.
- Double-counting:
  - Items 2 and 8 overlap (merge-forward delta reviews). Cuts 2 and 5 draw on the same pool.
  - Cut 5 mixes room turns (item 5, M) with merge-forwards (item 8).
  - Cut 4 counts deferred Product/Econ work as saved.
  - Cut 3's pool is smaller than assumed.
  - Cut 1 overlaps with item 4 (park/un-park appears in both).
- The cut ranges also sum to 33–49, which assumes zero overlap and full compliance. A realistic range after netting out overlap is about 25–38 points.
- The sample cannot confirm the 304 Architect files or the points-per-item figures. All of these stay E (estimates), as the audit already says.
