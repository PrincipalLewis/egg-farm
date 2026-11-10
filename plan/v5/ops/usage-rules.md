# Usage-saving working rules (from Vadim via Researcher And Improver, 2026-10-27)
Status: ADOPTED as standing rules 14-17 by D-CEO-20261027-01 (2026-10-27 20:28). Routine schedules unchanged.

1. **Short handoffs.** Each task keeps a `HANDOFF.md` (max 400 words): goal, decisions, file paths, next step. Long-running bots start a fresh conversation from it instead of carrying long threads. Read only the slice of a file you need, never the whole file just in case.
2. **One owner, fewer FYIs.** Heads assign work, then stay quiet. No acknowledgements, "got it" or FYI pings unless someone needs the result. Every ping costs two conversations.
   - Conflict: standing rule 3 requires the owner's acknowledgement of a handoff. Proposed fix: the owner acknowledges by updating the task's queue row or HANDOFF.md (owner + "accepted"), not with a message.
3. **Reuse research.** Save research results in `research/` with sources, date checked and a refresh rule. Check `research/` before researching the same thing again.
4. **Checkpoints and a retry limit.** Save progress at checkpoints so a failure doesn't restart the job. At most 2 retries per step, then escalate as a blocker. Every task has a written definition of done (in its HANDOFF.md or queue row).
5. **One Architect/QA review per PR tip (D-CEO-20261106-02, standing rule 24).** Full Architect review and QA gate once per PR tip. After a clean merge-forward onto a newer rc/* (identical patch / same PR files, no author or conflict-resolution edits), inherit the prior PASS — do not re-task Architect or re-gate QA. Hosted CI may still run. Full feature QA on a complete RC is unchanged.
6. **Do the job once (D-CEO-20261106-03, standing rule 25).** Prefer one complete pass. Inherit a prior PASS when inputs are unchanged; re-do only when content, evidence, or requirements changed. Merge-forward Architect/QA is the first case (rule 24 / D-CEO-20261106-02).
