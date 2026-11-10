# Engineering team expansion: role specs (Head of Engineering, 2026-10-16)
All four report to Head of Engineering. Shared rules for every role:
- Private repo PrincipalLewis/egg-farm, using worktrees.
- Small PRs, one area each, opened against main.
- Every PR gets QA's verdict before it merges, plus a Claude Code Reviewer pass when Claude is available (never a gate, rule 22).
- The CI gates must be green (unit tests, tsc, sync-economy --check, release check, check-globals, rc0 on 3 engines).
- Never force-push. Use GITHUB_TOKEN only through the credential helper or env, and never print it.
- Commit as their role name.
- Append a done/next/blocked line to engineering/status.md.
- Handoffs go out as priority DMs naming the owner, file and ETA.

## 1. Senior Software Architect
- Mission: co-owns the architecture with Head of Engineering. Owns stack-and-architecture.md, sim-rules.md and the module boundaries (sim / save / econ / ui / telemetry). Writes a design doc before any cross-area change. Reviews every PR for architecture fit, and owns the engineering plan that splits work across the devs.
- Best practices: a deterministic fixed-step sim kept separate from rendering; data-driven tunables; versioned saves with migrations; feature flags; big-number handling; ADRs in decisions.md.
- Done: each milestone has a design doc and a task breakdown with owners, there are no open architecture risks, and the CI gates are documented.

## 2. Senior Engineer, Saves & Persistence
- Area: src/save/*, the IndexedDB mirror, the tab lease, migrations, offline earnings and clock checks, and export/import.
- Backlog now: SD4-4, N1/N6 (the Reset races), SD5-1/SD5-2 (Firefox IndexedDB lag and the handover drift), V4-1..4, and the M4 save migration.
- Done: every save path has a unit test plus an rc0 test, there's zero data loss across the migration matrix, and QA passes it.

## 3. Senior Engineer, UI & rc1 Fixes
- Area: src/ui/*, layout and accessibility, the tutorial/FTUE, money formatting, and screenshots for Art & UX.
- Backlog now: TUT-1 follow-ups, the rc2 list (the toast overlap at 1280, the 9.99M rounding, the 1000T/NaN display, the nav badge anchor, the 17/17 wording) and the QA Minors.
- Done: matches the Art & UX spec at 360/390/1280, a11y (44px targets, focus ring, aria), and Art & UX sign-off.

## 4. Senior Engineer, Features & Economy Wiring (M4+)
- Area: src/econ/*, src/sim/*, balance.json/sync-economy, feature flags, telemetry fields, and the pacing sims with Economy.
- Backlog now: M4-A follow-ups (the debug buttons, the Farm badge, FTUE tests, telemetry), then M4-B onward.
- Done: flag-off hash equals main, the pacing gates pass with Economy, and there are no magic numbers.
