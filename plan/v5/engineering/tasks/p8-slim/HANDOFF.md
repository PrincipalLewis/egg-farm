# TASK HoE/p8-slim-base

Approved design: D-HOP-2026-11-05-06 and HoE separation confirmation.
Base: 518de304fbe9f4c8f3dd04b8fffe38ee7698b94f; branch feat/v5-p8-slim; /workspace/wt-v5-p8-slim.
Scope: UI/app/build:qa/tests only. Minimal attended probe (visible + focused + no existing dialogs or registered open sheets), registerSheet opened→closeComplete, one Game wiring. Relevant release guard and IDs for existing elements only. Preserve Market semantics and existing dialog selector.
Exclude sim/econ patches, spots/zones, feature registry, audio/FX extraction, full #86. Preserve afbe314 and its WIP untouched. No pushes/PRs. Stop/report mismatch.

## Held dependencies
- Shift owner: real Shift lifecycle registration/open through closeComplete, running-call suspension and sim-time cooldowns; missing Shift/abilities selectors. This base exposes API, not feature AC completion.
- Fatigue/worker-risk feature owner (HoE to designate): missing fatigue UI/state, workerAtRisk/workersAtRisk/costliestAtRisk exports; fatigue.force/setShare/read, stall.force, workers.atRisk, tc.spawn cannot be invented.
- HoP/HoQA ruling through HoE: golden geometry v5 vs 5.1/reference. No golden spots/zones port.

## Execution plan
1. Inspect existing attended/app/QA wiring; add tagged failing lifecycle/probe tests.
2. Implement minimal registry/probe, app wiring, release guard and independent existing IDs.
3. Run Node 20.19.2 tsc, targeted vitest under shared lock, sync-economy --check; commit and verified bundle immediately for Shift.
4. Full vitest, build/build:html/check-release/check-globals; focused browser only if feasible. Produce PR body/AC trace and blockers.
Long jobs through lane-run.sh ui; no process interference.

## Inspection
Current rc/v5 matches approved base exactly. There is no existing attended.ts/overlay.ts or qa-seam.ts. Game already provides setAttendedProbe, but app never wires it. Existing Market/upgrades state and onboarding DIALOG_SEL stay unchanged. Telemetry.events() already exists on Game telemetry; main.ts exposes Game only under IOS_FLAG_ENABLED (dev/QA), so no new telemetry hook needed.
Existing IDs selected: #panel-layer → docked-panel (same root in mobile), #p-upgrades → upgrades-panel (NOT a new Workers sheet), #henpill → hens-pill. Fatigue pill/popover/icon/description, worker risk, Shift and separate Workers-sheet IDs are held; actual feature owners must implement the elements first.
Dependency setup: npm ci completed, reported 6 inherited vulnerabilities (3 moderate, 1 high, 2 critical); no dependency edits or audit-force applied.

## HoP ruling received 2026-11-05 20:36 CET (Europe/Belgrade)
Golden geometry is NOT P8; no standalone P8 geometry deliverable or new 5.1 artifact. FC-AC9/GE remains with fatigue/golden feature and complete-RC path. Missing risk exports wait for Features income/refill base. Fatigue/Shift selectors wait for owning feature bases. Dependent hooks are UNVERIFIED (not accepted at final RC); no stubs/duplicates. Follow-on lane U: V51-SS-1 chip + fatigueCue UI per m5-build-plan L17/L38 on slim F6, no sim workaround; separate from this commit.

20:39 CET: tagged red suite queued since 20:35 behind another lane full Vitest run on .vitest-eng.lock (holder 810666). No attempts to bypass shared lock or interrupt other lanes. sync-economy --check passes. Initial tsc after test creation correctly reports missing overlay API; not a clean baseline claim.

20:48 CET: implementation remains four files (overlay.ts, app.ts, release guard, focused tests). tsc and sync pass. Initial targeted run reached 46/49 pass: three failures were test assumptions (attended SaleCtx omits suspended rather than explicit false; jsdom import.meta.url is not a file URL). Corrected only tests using existing SaleCtx contract and process.cwd file paths. Rerun queued behind two additional full-suite lanes. No production change needed for those failures.

# Slim base available for Shift

Produced 2026-11-05 20:58 CET (Europe/Belgrade).
SHA: bd641ffc3fd9429494b09fdbe2e70aaab12bcbdd
Branch: feat/v5-p8-slim
Path: /workspace/wt-v5-p8-slim
Base: 518de304fbe9f4c8f3dd04b8fffe38ee7698b94f
Verified bundle: /workspace/egg-farm-studio/scratch/bundles/feat-v5-p8-slim-bd641ff.bundle

API: import registerSheet from src/ui/overlay.ts; registerSheet(id) returns opened(), closeComplete(), readonly isOpen. Opening suspends through closeComplete independently of width. Re-registering same id shares entry. App has one shared Game probe. Market remains play surface; existing dialog selector unchanged. Shift lane must own actual events/animation completion and ability-call/cooldown acceptance.

Precommit: tsc PASS, sync-economy --check PASS, 49 targeted tests PASS (22 slim + 27 Game focus/effects). Initial missing-module RED and corrected test-harness assumptions preserved in logs. No claim of complete real Shift acceptance.
Full gates started asynchronously; expected around 21:30 CET if shared locks remain available (not a guarantee). Read artifacts/v5-p8-slim/results.tsv and full-gates.done. Required final-RC fatigue/Shift hooks remain UNVERIFIED awaiting owner bases, and noon P8 completion cannot be promised for those rows.

## F1 follow-up (HoE/p8-slim-f1) 2026-11-05 ~21:24 CET
Architect CHANGES REQUESTED on eafd08c: stale mobile open=upgrades kept attendance suspended after resize into docked play. Fix derives Upgrades-dialog predicate from live docked layout + panel state; registered sheets remain width-independent.
HoQA required regressions: (1) mobile Upgrades→docked resumes (2) reverse docked→mobile re-suspends if still open (3) Upgrades closes during resize (4) registered-sheet independence.
Review routing: Architect recheck first, then QA. Do not declare QA-ready before Architect recheck.
Prior full-gates PID 925333 still active; no duplicate full suite started from this fix.

## Evidence integrity 21:28 CET (Europe/Belgrade)
Queued vitest f1-red PID1016658 and f1-green PID1019348 both execute against live /workspace/wt-v5-p8-slim (no worktree/snapshot isolation; commands are plain `cd ...; flock ... vitest run tests/...`). Source/tests were mutated after f1-red was queued (overlay/app docked predicate + HoQA tests). Therefore f1-red cannot be claimed as RED evidence of the pre-fix bug. Do not treat a later pass in f1-red.log as TDD red.
Immutable pre-fix RED retained: artifacts/v5-p8-slim/f1-repro-predicate.log (vite-node, docked+upgrades attended=false, EXIT 2) captured before the production patch.
Post-fix predicate GREEN: f1-repro-predicate-green.log EXIT 0. Waiting for existing f1-green vitest only; no additional launches. Architect review104 PID984217 uses isolated /workspace/wt-v5-review104 and is untouched.

## Corrected tip for Shift / Architect recheck
SHA 0e9151b6a8b543803a00c01a1bb14002ada0d90e at /workspace/wt-v5-p8-slim
Bundle /workspace/egg-farm-studio/scratch/bundles/feat-v5-p8-slim-0e9151b.bundle
Vitest f1-red PID1016658 EXIT0 is invalid as RED (no snapshot isolation). Valid RED: f1-repro-predicate.log. Valid GREEN: f1-green 54/54 + full-vitest 2061 on frozen tree == commit. Architect recheck first, then QA. Remaining release gates running after commit.

## Final F1 gate summary 21:49 CET
Post-commit on 0e9151b: tsc/sync/build/build:html/build:qa/check-release/check-release-html/check-globals all exit 0 (artifacts/v5-p8-slim/results.tsv). Pre-commit full-vitest 2061 pass on identical frozen tree. No push/PR edits. Architect recheck required before QA.

# Exact-head targeted Vitest — BLOCKED (no queue)

Time: 2026-11-05 21:54 CET (Europe/Belgrade)
Requested SHA: 0e9151b6a8b543803a00c01a1bb14002ada0d90e
Local HEAD: 0e9151b6a8b543803a00c01a1bb14002ada0d90e (clean porcelain)
Nonblocking flock -n /.vitest-eng.lock: LOCK_HELD
Action: no new lane-run / no duplicate queue / no third wait attempt.

Current WRITE holder (read-only): PID 1063903 pr84-resume verification run.sh
Also waiting (not ours): Architect review104-0e9151b targeted suite PID 1133056 on /workspace/wt-v5-review104-f1

Not claimed as this lane's exact-committed-head targeted evidence:
- f1-green.log (21:46) ran on dirty WIP whose content matched the later commit; tree was not clean committed HEAD at run time.
- Pre-commit full-vitest 2061 same caveat.

Post-commit clean-HEAD evidence already on file (not targeted Vitest):
- f1-tsc/f1-sync/f1-build/f1-build-html/f1-build-qa/f1-check-release/f1-check-release-html/f1-check-globals all exit 0 on 0e9151b (results.tsv).

Hosted (read-only at 21:54 CET): see hosted-check-runs-0e9151b.json / pr104-rollup.
QA: not started / not claimed.
Final PASS: not claimed.
