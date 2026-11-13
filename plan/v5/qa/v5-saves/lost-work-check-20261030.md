# Saves QA lost-work check: 2026-10-30 (07:27–07:45 CET)
Incidents: ~21:56 CET Oct 29 box restore (qa node_modules deleted), ~23:21:45 CET box-wide SIGTERM + restart (box back ~07:20 Oct 30).
Method: hashes against the LAST KNOWN values (HoQ's list + values recorded in READINESS.md, which itself matches ccae2edf), not only on-disk manifests.
**mtimes are unusable:** every file under qa/ and artifacts/ now carries an mtime of 07:20–07:26 Oct 30 (the restore rewrote them), and the
workspace is not a git repo, so "modified after 21:56" was judged by hash only. Evidence: `lostwork-20261030/`.

## Verdict: nothing of mine missing or changed. 1 legit upstream change (HoQ plan re-pin). 3 environment losses, 2 restored, 1 BROKEN (WebKit host libs).

| item | expected (last known) | now | status |
|---|---|---|---|
| READINESS.md | sha256 ccae2edf | ccae2edf…bdba, sha1 eff600d3 | OK |
| scripts/SCRIPTS.sha256 (file) | sha256 72977983 | 72977983…1ed2, sha1 25dd5a8c; `-c` 10/10 OK | OK |
| spec/SPEC.sha256 (file) | sha256 cd39288f | cd39288f…b6de9, sha1 d94ecab2; `-c` 9/9 OK | OK |
| fixtures/FIXTURES.sha256 (file) | sha256 25e4e603 (READINESS) | 25e4e603, sha1 1c6dfe04; `-c` 20/20 OK | OK |
| fixtures/offline/tp1-c2-base.p1-B-mh-hired.save.json | 617f3534…9123 | 617f3534991811cf8f93da41f808ab6085a8e95be1fbaadad0daec7cd70f9123, sha1 accfaa20 | OK |
| scripts/offline-seed.mjs | f9c21487 | f9c21487…ef82, sha1 ccb63181 | OK |
| spec/telemetry-spec.v0.6.2+addendum-20261029.6d504570.md | present, 6d504570 | 6d504570 | OK |
| v5-saves-cases.md | ef87eb96 | ef87eb96, sha1 4519e135 | OK |
| q13-saves-lane-rows.md | 3366b574 | 3366b574, sha1 54cf55be | OK |
| q13-rows.json | 69c7d737 | 69c7d737, sha1 154e2e29 (217 rows) | OK |
| q13-to-V5-E.md | 3def2368, 23 rows | 3def2368, sha1 0f258ae7, 23 rows | OK |
| unit-trace-review.md | e1e2bf85, 62 rows | e1e2bf85, sha1 f9327739, 62 rows | OK |
| spec/PLANS.sha256 (file) | 9c61baa5 | 9c61baa5, sha1 f85dc066 | OK (file) |
| PLANS.sha256 -c (from repo root) | 7/7 | 6/7 OK; **test-plan-streak-tap-coins.md FAILED** (pinned 84f8a58f / sha1 5fb68dc9, now 403c2c46 / sha1 1ebd7fc3) | **CHANGED, legit**: HoQ re-pin 22:5x Oct 29 (D-HOP-2026-10-29-08 (2)), one line L68 ST-AC21 (UI row: cap no-pulse). Frozen copies of both in artifacts/v5-ui/specs/ (SHA256SUMS). HoQA 07:25 incident note confirms 1ebd7fc3. No Saves-lane row affected (ST-AC21 not in q13-saves-lane-rows / unit-trace-review). My manifest left unchanged; re-pin to 1ebd7fc3 needs HoQ OK |
| PLANS.sha1 sales-stopped 8626c650 | 8626c650 | OK | OK |
| telemetry-check.mjs self-test | 25/25 | **25/25 PASS** (`lostwork-20261030/telemetry-selftest/`) | OK, re-run |
| ss15-share-guard.mjs self-test | 38 cases | shareGood **38 cases, 0 HARD FAIL**; negative control shareNaive 21 HARD FAIL as expected | OK, re-run |
| trace-reviews/README.md | present, non-empty | 1009 B, sha1 f6ed5fac | OK |
| trace-reviews/pr77-37f24c1.md | present | 4592 B, sha1 07d21ec2 | OK |
| trace-reviews/pr79-9bebf4b.md | present | 6411 B, sha1 59e156d7 | OK |
| trace-reviews/pr80-1a64e95.md | present | 5281 B, sha1 16de30eb | OK |
| trace-reviews/pr82-ecf8297.md | present | 5335 B, sha1 4684713f | OK |
| trace-reviews/src/ (pr77–82 bodies + json) | present | 8 files | OK |
| partial pr83 (on HOLD) | — | trace-reviews/pr83-76390f2/ 15 files (npm-ci, vitest-p2 exit 0, trace-exists, sim-paths = src/econ/income.ts only, strip-compare); worktree qa/scratch/wt-pr83-76390f2 @76390f2, clean, **node_modules gone** (restore). No verdict file | PARTIAL (expected; re-run on new head) |
| qa/scratch worktrees | — | wt-pr83-76390f2 (mine), wt-pr77-172ca3f (mine, created + removed this turn), plus older pr7-3b464ea, pr7-b1004e7, sd5-1-5d636d8. `git worktree list` also shows 11 **prunable /tmp/qa-v5-*** worktrees (22eac98, 23d2b78, 33df27b×2, base-30b29d3, c8c5d0c×3, d790cd0, p2-d790cd0, v5base-22eac98): /tmp was wiped. Nothing deleted or pruned | LISTED |
| dryrun/ | intact | 582 files; pubv postpublish 22/22, pubv rollback-negctl 16/16, run2 80/80 OK; gate-DRYRUN-22eac98 SHA256SUMS = d106116b (= READINESS) and run5 = aad60f25: each 1 mismatch, `status.log` | OK (pre-existing driver quirk, see below) |
| artifacts/v5-rc-saves/ | absent | absent | OK (no real gate has run) |
| qa/m41/pub-35931cb-verify.md + pub-35931cb/ | present | sha1 b04d0ff7; 40 files | OK |
| qa/m41/pub-30b29d3-verify.md + pub-30b29d3/ | present | sha1 733bf6c5; 94 files | OK |
| qa/v5-saves/tools/node_modules (playwright-core 1.64.1) | present | **MISSING** | REINSTALLED: `npm ci` → 1.64.1 |
| ~/.cache/ms-playwright firefox-1555 / webkit-2370 | present (3-engine dry run 21:17 Oct 29 passed S-webkit) | **MISSING** (whole cache gone) | REINSTALLED via lane-run (PID 43038): firefox-1555 (FF 157.0), webkit-2370, ffmpeg-1013 |
| WebKit host libraries | present | **MISSING**: libevent-2.1.so.7, libgstgl-1.0.so.0, libgstcodecparsers-1.0.so.0, libavif.so.16, libmanette-0.2.so.0, libenchant-2.so.2 | **BROKEN**: one `sudo playwright install-deps webkit` via lane-run (PID 47413) failed: deb.debian.org returns 500 via the box proxy. WebKit launch FAILS; Chromium (Chrome 156.0.8078.47) and Firefox 157.0 launch OK (`engine-launch.log`) |
| ports 5961–5964 | nothing listening | nothing listening | OK |
| lane PIDs (.pids/saves-qa.pids) | — | 43038, 47413, both exited | OK |

## Pre-existing harness bug found (not caused by the incidents)
`scripts/v5-saves-gate.sh` L72 builds SHA256SUMS over `status.log`, then appends the "SHA256SUMS -c OK" and `du` lines to status.log, so a
later `sha256sum -c` (HoE's copy, rule 19) fails on status.log. Both dry-run results show exactly this. Fix before the RC run: exclude
status.log from the manifest (or write the final lines to a separate file). Not changed here: it would move SCRIPTS.sha256 off 72977983; needs HoQ OK.

## Re-run / reinstalled this turn
telemetry self-test (25/25), ss15 self-test (38/0 + negctl), engine launch smoke, playwright-core 1.64.1 npm ci, firefox/webkit browser download.
Nothing of mine was running at 23:21 (the pr83 check was stopped 23:20 for HoQ's hold), so no run needed re-running beyond that.

## Open
1. WebKit unusable until the apt mirror is reachable (or HoO restores the libs). Blocks 3-engine Saves gate (T-AC2 HARD on all 3 engines).
2. HoQ OK to re-pin PLANS.sha256 to streak plan 1ebd7fc3 and to fix the status.log manifest bug (both change my manifests).
