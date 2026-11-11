# TASK HoE/p8-qa-hooks: P8 QA hooks, stable test-ids, docked golden spots

Owner: Senior Engineer, UI & rc1 Fixes (e80556fd)
Authority: D-CEO-20261105-01 (resume), D-HOE-38, HoE TASK HoE/p8-qa-hooks / HoE/v5-resume
Sources: qa/m3-recheck/HOE-PORT-REQUEST-groupC.md (sha256 a9248210), artifacts/v5-ui/harness-rc-next/tests/SELECTORS-NEED-TESTID.md

## Write scope
- `/workspace/wt-v5-p8-qa-hooks` only (game/src UI + app, build:qa wiring, tests)
- `/workspace/egg-farm-studio/engineering/tasks/p8-qa-hooks/`
- `/workspace/egg-farm-studio/artifacts/v5-p8/`
- Bundles: `/workspace/egg-farm-studio/scratch/bundles/`
No sim changes. No cross-department writes. No push / open / edit PRs.

## Branch / base
- Worktree: `/workspace/wt-v5-p8-qa-hooks`
- Branch: `feat/v5-p8-qa-hooks` (was clean at 0ad018d)
- Stack: merge `origin/rc/v5` 518de304fbe9f4c8f3dd04b8fffe38ee7698b94f into `#86` 05a1e01 into this branch (`--no-ff`, never rebase). rc/v5 wins unrelated conflicts; retain #85/#86 overlay.
- Docked overlay lives on #86 (`/workspace/wt-v5-f6` 05a1e01), not bare rc/v5.

## Deliverables
1. Stable data-testids (QA names) for P8 pill/popover/Manage/chip/docked/Workers/.wk[data-risk]/×N hens + applicable SELECTORS rows. List missing-element rows.
2. build:qa-only hooks: fatigue.force/setShare/read, stall.force, workers.atRisk, tc.spawn, layout.showZones; keep telemetry.events() qa-only; check-release clean + regression.
3. Golden-spot SoT for W≥960 from #86 overlay (spotCentres/validSpots/domZones): doc + unit pins at 960×600, 1024×474, 1280×720.

## ETAs (CET, Fri 6 Nov / Sat)
- (2) test-ids: Fri 6 Nov 00:00
- (1) hooks: 04:00
- (3) golden spots: 08:00
- Full bundle high: 12:00

## Status
- done: HANDOFF written; sources + D-CEO-20261105-01 / D-HOE-38 read; confirmed fatigueCue UI absent on 0ad018d and 05a1e01 (flags/tunables only); hens-pill testid already on #86; overlay pure funcs present on #86.
- next: stacked merges (--no-ff); then test-ids → hooks → golden doc/tests → gates → bundle+body.
- blocked: none yet. Expected missing rows: fatigue sub-line/popover/chip (UI not on stacked base); Shift-sheet / abilities selectors still Features-owned.

## Rules
Standing 21/23; lane-run/lane-kill ui only; flock .vitest-eng.lock + .browser-test.lock (never -3); node v20.19.2; commit as Senior Engineer, UI & rc1 Fixes <engineering@egg-farm-studio.local>; bundle after each commit; HoE pushes.

## 2026-11-05 20:31 CET — scope-separation STOP
- Saved afbe314 + four WIP UI/test files preserved; no sim/econ changes.
- Old full-#86 stack instructions above conflict with D-HOP-2026-11-05-06. Do not resume full-#86 implementation from those instructions.
- Detailed inherited-file inventory, proposed clean base 518de30 (38d2484 tree identical), missing risk-selector imports, golden reference limitations and ETA risk: `artifacts/v5-p8/scope-separation-stop-20261105.md`.
- HoE separation decision required before implementation; no gates, commit, bundle or external actions performed.
