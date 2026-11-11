# HANDOFF: T-goalpill severity + fix re-run
Owner: HoQA. State: **DONE 2026-10-27 22:10 CET.** Fix verified PASS on PR #71 @ 53c7136; close once #71 merges.
**Goal:** rate T-goalpill for HoE, then re-run the fix once.
**Definition of done:** root cause shown in code, severity given, the fix re-run once on its final SHA with evidence, the test suite run once, logs written, HoE message drafted. All met.
**Decisions:**
- [QA-D-1027-GOALPILL]: Latest game not a bug. Verify tool Major (tooling): the unmarked end-state save was v6-migrated on load, so V went 30 → 20.
- [QA-D-1027-GOALPILL-V]: #71 @ 53c7136 PASS. The pill reads "All upgrades done!", the round-trip gives no tracksMigrated, the trace is unchanged (2c0d3ec37be1), the suite is 1537/1537 (1 skip).
**Files:** qa/bugs/T-goalpill.md; evidence qa/bugs/T-goalpill-53c7136/; worktree /workspace/qa-gp71 (scratch, can be removed).
**Next step:** none. If #71 gets a new head SHA, re-run verify 24 h seed 1 once on that SHA (rule: run each PR once, on its final SHA).
**Related:** the #71 script retirement made QA pin 7 historical re-check scripts (status.md 22:10).
**Retries:** 0 used.
