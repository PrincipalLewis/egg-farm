# M3 save fixtures (QA, 2026-10-15)
Each "real" save was produced by **that tag's own code** (sim + `save()` from the tag's worktree): m1-rc2 = /tmp/eggm1rc2 @ f485987, m2-rc1 = /tmp/efs/rc1 @ bf1962a. A scripted player ran in sim time (collect 1/s, Sell all every 15 s, buy Farm/Collection, hire every worker, Grader tiers, Manage all every 2 min). Generator: `qa/m3-scripts/gen-save.ts`. `savedAt` = 2026-10-15 18:00 UTC (20:00 CEST).
| File | Source | Content |
|---|---|---|
| m1-rc2-v4-12min.json | m1-rc2, 12 min | v4, F10, C11, $1,415.85 |
| m2-rc1-v5-12min.json | m2-rc1, 12 min | v5, F10, C11, 3 workers at 86.7% |
| m2-rc1-v5-40min.json | m2-rc1, 40 min | v5, F19, C17, 4 workers, Grader tier 2 |
| m2-rc1-v5-40min-edge.json | derived from 40min | + cooldown 12 s, Coop Hand Unpaid at 55%, Hawker Asleep 0%, Grader Tired 25% |
| corrupt-truncated / wrong-type / version-99 / empty / missing-state | derived | AC14b cases |
Baseline on bf1962a `migrate()`: 4 corrupt files throw (load → null → fresh game, no notice). **`corrupt-missing-state.json` loads silently as a fresh F0 game.** That's expected before hardening, and it's the AC14b case that must change by rc0.
Engineering: copy into `game/tests/fixtures/saves/` (AC14a). Before any real-browser play saves are captured, they are additionally needed from V2 devices.

## M4 migrate-v7 sample (Architect, 2026-10-19, rc/m4-t3-l30plus; copied from 732e70e)
| m4-pre-v7-F30-C30.json | save() on rc/m4-t3-l30plus, live balance (flag off) | v6, F30, C30, $1,234,567.89, H0/V0 (pre-M4). Used by tests/v7-marker-run-once.test.ts. |
