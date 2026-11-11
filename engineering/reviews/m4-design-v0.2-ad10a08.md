# Review: PR #1 arch/m4-design @ ad10a08 (m4-design.md v0.2 + engineering/decisions.md M4-4..9). Reviewer: Head of Engineering
Verdict: **APPROVE** (with follow-ups, none blocking the design)

Checks:
- 9.7 REFUSE: §Saves L51/L67/L82 says a v7 save is refused like a newer save, with zero writes (LS, IDB, .bak, 2nd tab), the .bak kept and export available. S-2 covers flag-off-opens-v7. OK.
- ADR M4-8 interim marker vs 3351d6c: it matches. SAVE_VERSION is 6 (test L16). save.ts:40 runs `m4On && !tracksV7` → migrateTracksV7 once and marks it; game.ts:52 marks new M4 farms; state.ts has `tracksV7?: 1`. migrate-v7.ts is pure, uses H=F and the price-matched V, refunds only for the clamp. OK.
- S-4 covers unmarked v6 (full), marked v6 (bump only, no re-match or refund or events, idempotent) and v7. Tests at L79-83. OK.
- Ownership and sequencing: every item has an owner (SAV/UI/FE/ARCH, HoE for A-0), and there's a dependency column, an ordering paragraph and a merge order. OK.

Findings:
1. **Gap in 3351d6c vs ADR M4-8:** the design requires flag-off builds to keep the marker and track fields byte-for-byte on write. The branch only tests that a flag-off build loads an unmarked v6 save. It has no test that a flag-off build saves a *marked* save without stripping `tracksV7`/hensLevel/eggValueLevel. Add that test to m4a-tracks-v2 before playtest builds spread marked saves (owner: FE/SAV).
2. Answer for Head of QA: at 3351d6c, SAVE_VERSION stays 6 and M4-on saves are v6 with `tracksV7: 1`. The v7 write and the kept v6 `.bak` arrive with S-4. Add one sentence saying the v7/.bak text describes S-4, not v2.
3. The interim marked path writes no v6_backup before the in-place price-match. Note this as an accepted playtest-only risk, or have migrateTracksV7's caller write the backup once.
4. Nit: §9 lists 8 before 7. Reorder.
