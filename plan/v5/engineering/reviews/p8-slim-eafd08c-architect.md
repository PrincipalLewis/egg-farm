> Follow-up 2026-11-05 21:54 CET (Europe/Belgrade): **F1 source correction accepted at 0e9151b6a8b543803a00c01a1bb14002ada0d90e; exact-head independent targeted tests pending shared lock. Not final merge/QA approval.** See correction review appended below. Earlier findings/evidence are historical.

# Architect review — PR #104 slim P8

Status: **CHANGES REQUESTED (static finding); local targeted/repro tests queued; QA required**.
Reviewed head: `eafd08c258ebe36224f5bf6b5d2a59a1699a3941`.
Base: `30df38c0a0bd5d48db96d0705abccc6db197d161` (`rc/v5`).
Review date: 2026-11-05, Europe/Belgrade (CET).
Isolated worktree: `/workspace/wt-v5-review104`.
Artifacts: `scratch/architect/review104-eafd08c/`; executor-specific evidence in `executor/`.

## Finding F1 — P2: stale mobile Upgrades state suspends docked play after resize

`src/ui/app.ts:185` forwards the raw `open` state into the new attendance probe.
`src/ui/overlay.ts:43-45` treats `sheet() === 'upgrades'` as a dialog without consulting layout.
Open Upgrades on mobile (`app.ts:191` sets `open='upgrades'`), then resize/rotate into the docked media query (`app.ts:126`). The permanently docked panels become play surfaces, but the resize/media-query handlers do not reset `open`; only a subsequent `openPanel` call clears it in docked mode (`app.ts:187`). Thus the newly wired probe remains false despite visible/focused docked play, contradicting the stated permanently-docked exception (`overlay.ts:41-42`). This can persist until another panel navigation action. Game consumes this probe in `game.ts:409,412,430` for attended actions/player-sale context/focus time.

Required correction: derive the existing Upgrades-dialog predicate from current layout as well as panel state (or otherwise reconcile state on breakpoint changes), preserving the independent registered-sheet suspension at every width. Add mounted-app coverage for mobile Upgrades -> docked and reverse transitions. No product patch made in this review.

Evidence qualification: code-path finding is independently inspected; mounted regression `tests/architect104-resize.test.ts` is queued behind the shared Vitest lock, not yet an observed failing test. Copy preserved at `executor/repro.test.ts`.

## Scope and contract review

Read `engineering/tasks/p8-slim/HANDOFF.md`, `follow-on-inspection.md`, and `engineering/m4.1-backlog.md` (including superseding/parked entries). Exact base-to-head diff is four files +147/-4: `overlay.ts` (+48), `app.ts` (+6/-3), release guard (+1/-1), focused tests (+92).
- No sim/economy/config, #86 engine, golden geometry, FX/audio extraction, or new feature UI changes.
- Registry lifecycle uses one shared entry per ID; stays suspended until closeComplete; closing one distinct ID cannot release another (`overlay.ts:17-31`). This is an API foundation, not real Shift integration.
- Existing `DIALOG_SEL` and explainer predicate are reused unchanged (`overlay.ts:3-4,45`; `onboarding.ts:65`; `tracks-explainer.ts:15`). Market remains a play surface.
- Only existing hens/panel/Upgrades IDs are labeled (`app.ts:88,106,109`). No fabricated risk/fatigue/Shift hooks or selectors. Held hooks remain UNVERIFIED, not accepted at final RC.
- One app probe installation (`app.ts:185`). Existing dev/QA Game exposure remains guarded in main; no new window seam.
- Release scan adds generic `eggfarmQa` rejection (`scripts/check-release-build.mjs:74`). Actual release and HTML logs show no QA hooks and only allowed globals. This string scan is not browser runtime globals evidence.

## Gate evidence and limitations

Node 20.19.2 selected. Shared Vitest execution launched with `lane-run.sh architect` and `/workspace/egg-farm-studio/.vitest-eng.lock`, no bypass or process interference.
- tsc and sync-economy --check exit 0 in local results.
- build, build:html, build:qa exit 0 in local results. Release and single-file checks pass, identify `m4.1+eafd08c`, and reject QA/global/external-resource leakage (build.log, build:html.log).
- Initial targeted launcher recorded exit 127 with empty log: **not a test result**. A dedicated executor rerun of the 49 claimed tests plus mounted breakpoint regression is queued (`executor/tests.log`, eventual `tests.exit`). Earlier original bd641ff 49-pass statement remains author evidence, not an independently confirmed exact-head pass.
- Lock holder observed PID 912654 running the slow Vitest config; other lanes are queued. No interruption attempted.
- Hosted exact-head refresh: gate IN_PROGRESS; casual/seller15/optimal pacing shards IN_PROGRESS; K10 monitor SUCCESS. Snapshot: `executor/hosted.json`. Gate URL: https://github.com/PrincipalLewis/egg-farm/actions/runs/42099848278/job/127499458919
- Independent full Vitest and browser check-globals not completed here. QA still required. No final-RC fatigue/Shift or geometry acceptance claimed.

## Done / next / blocked

DONE: contracts, exact-head diff, integration/release boundary review; F1 identified; build evidence inspected; hosted snapshot saved.
NEXT: obtain queued targeted/repro result; correct F1 in owning UI lane; rerun exact-head tests and required gates; obtain QA and green hosted gate before merge.
BLOCKED: shared test lock currently defers runtime confirmation; hosted gate pending. Architect approval withheld for F1 regardless of pending gate outcome.

No merge/push/product edits/external messages. Added only review reproduction test in isolated worktree and box-local review/artifacts.

## F1/M1-only delta re-review — 0e9151b6a8b543803a00c01a1bb14002ada0d90e

### Verdict
**F1 FIXED by source inspection; no additional blocking delta finding.** Hold final exact-head test/QA acceptance pending independently queued targeted run and hosted publication/gates. No redundant full rerun launched.

Parent is exactly eafd08c258ebe36224f5bf6b5d2a59a1699a3941. Delta is only three files +76/-4: app wiring, overlay predicate, tests. Worktree `/workspace/wt-v5-review104-f1` is clean at exact correction SHA. `git diff --check` passes. Bundle verifies against eafd08c; sha256 `5838cc286ccb71aaa57fcb53ce1bacc5e578000baeff493da10ae1bfb36b4768`.

### Source/test review
- `src/ui/app.ts:185` now supplies `docked: () => docked.matches`, rereading the current MediaQueryList at probe time rather than snapshotting the original layout.
- `src/ui/overlay.ts:39,47-48` suppresses only the Upgrades-dialog term while docked. Existing dialogs/explainer and any registered sheet remain independent OR terms. Optional layout callback defaults to mobile-compatible prior behavior.
- Mobile Upgrades -> docked resumes; docked -> mobile while Upgrades remains selected suspends again; clearing panel state during the resize leaves resumed attendance. `tests/v5-p8-slim.test.ts:133-151` covers all three mounted-app cases. Lines 152-160 exercise independently registered-sheet suspension across both layouts through closeComplete. Lines 97-107 additionally verify the predicate-level case.
- No changes to release guard, main QA exposure, balance/sim/economy, golden geometry, #86, missing feature hooks/selectors or held feature acceptance. Existing release boundary remains clean.

### Evidence provenance
- `artifacts/v5-p8-slim/f1-red.log` / f1-red.exit EXIT0 is INVALID as red evidence and is NOT relied upon.
- Valid predicate reproduction `f1-repro-predicate.log` records docked Upgrades incorrectly unattended, EXIT2; `f1-repro-predicate-green.log` records corrected docked/mobile and independent-sheet behavior, EXIT0. These are UI-produced evidence inspected here, not an independent exact-head test run.
- UI's 54 targeted and full2061 frozen-WIP results are not substituted for independent exact-head evidence.
- Independent exact-head `tsc --noEmit` PASS (exit0) and `sync-economy -- --check` PASS (exit0), Node20.19.2. Evidence `scratch/architect/review104-0e9151b/{head.txt,tsc.exit,sync.exit}`.
- Independent 54-test targeted run launched via lane-run architect PID1132521 and shared `.vitest-eng.lock`; currently queued behind #84 verification holder1063903. Evidence will land in `targeted.log` and `targeted.exit` in that directory. No bypass/interrupt attempted.
- Existing release output provenance: `f1-gates-head.txt` names exact 0e9151b SHA; build/build-html logs identify m4.1+0e9151b, HTML check matches HEAD, QA hooks/global/resource scans pass; `f1-check-globals.log` records Chromium runtime allowed globals and no eggfarm Game/debug global. These existing outputs were inspected rather than redundantly rerun; they are UI-produced exact-build evidence, not reviewer-run builds.
- Hosted exact-head read returned GitHub422 `No commit found for SHA: 0e9151b6a8b543803a00c01a1bb14002ada0d90e`. Publishing was in progress; no hosted success claimed. This response does not invalidate the verified local bundle. Recheck after publication.

DONE: correction-only source/contract/tests/release boundary review; independent tsc/sync; verified bundle.
NEXT: observe queued 54-test exit/results; hosted exact-head check after publication; exact-head QA remains required.
BLOCKED: shared Vitest lock defers independent runtime result; hosted commit not yet available at lookup.

No merge/push/product edits/messages. Architect source-fix acceptance does not accept held Shift/fatigue/golden rows or authorize merge.
