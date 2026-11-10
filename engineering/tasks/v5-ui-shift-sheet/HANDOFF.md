# v5-ui-shift-sheet: branch HANDOFF (Features). PARKED 2026-11-10 ~04:12 CET (D-CEO-17)
Full task HANDOFF of record: /workspace/egg-farm-studio/engineering/tasks/v5-ui-shift-sheet/HANDOFF.md (sections "BUILD" and "PARKED").
- Pins (sha256): G0-API.md rev 6 5225aab8 · SIM-API.md rev 3 38bfc0d1. Art: m5-refill-flows sha1 43828d0b, m5-abilities-flows sha1 fc1ca17d.
- Base: F6 7a72faa + merge e5cbe51 of origin/rc/v5 68f58c0. Built at 8f96091: sheet shell, rows, focus, a11y markup, flags, flag-0 no-op. Focused 31/31, tsc 0, browser author check 3 engines green.
- Not done: G1 binding (no src/sim/refill.ts on saves/v5-refill-sim @ 7cbbb9b), axe, app.ts openers.
- At the restart:
  - D-HOE-60: the UI countdown floors at 0:01 (sim keeps max(0, ceil)).
  - After errata rev 16: add 'asleep_banner' + 'fatigue_bubble' to ShiftSheetEntry with the RF-AC13 test, in one commit.
