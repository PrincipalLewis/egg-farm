# #115 Pause/Resume sim (row 31): Architect delta addendum at a73804d

Date: 2026-11-06 ~00:10 CET · Lane: architect · Prior: pause-409fa6a-architect.md (PASS, m1 fixture Minor, CONDITIONAL YES)

## Verdict: **HOLD (1 Major, spec conflict)** at exact a73804d45519c758a5bcb8310461643f04e9788f. Flag-0 safe; everything else in the delta PASSes
- Preservation, merges, the fixture (m1 → CLOSED), flag 0 and scope exclusions all PASS.
- The new production hunk in src/sim/offline.ts **zeroes the offline egg grant whenever every hired worker is paused**. That contradicts the Pause spec of record.
- It matches the wording of HoQA's #115 bar "extras", so the Product spec owner (HoP/PMW) has to rule. Until then I can't APPROVE the flag-on Pause content at this SHA.
- This is not merge clearance in any case.

## Identity / ancestry
- origin pull/115/head = a73804d. PR #115 is open, not draft, base fix/saves-endcalls-durs @ 98e1af5 (#114 current head). 9 files, +411/−11.
- First-parent chain from the approved 409fa6a:
  - 409fa6a → 8e7532e (fixture) → 3b62913 (AC-P13 tests + offline.ts)
  - → c840716 (merge 86973e5) → 2ffa02c (merge 9e043c4, #114 merge-forward onto rc f8036e8) → a73804d (merge 98e1af5 = 9e043c4 + #112 7a492e5).
- All 3 merges are clean: each tree equals `git merge-tree` of its parents (c840716 176fc7fb, 2ffa02c/a73804d 4ef7073f).
- So a73804d contains rc/v5 f8036e8 (#105). rc tip is still f8036e8 (read 23:54).
- Author: Saves & Persistence (merges 23:51–23:53 CET; commits 22:48/22:53 CET).
- #112 7a492e5 and #114 98e1af5 are under review elsewhere. This note does not approve them.

## Delta vs approved content (PR patch 98e1af5..a73804d vs e4117c4..409fa6a)
- All src except src/sim/offline.ts is **byte-identical**: pause.ts, tick.ts, workers.ts, income.ts, m5-rules.ts. The v5-f3-config NAMED_OK `ENERGY_FULL` change is unchanged from 409fa6a.
- New in the delta:
  - tests/fixtures/saves/m5-pause-committed-hired.json (sha256 36c00260…975d, matches the PR body)
  - +130 lines in tests/v5-pause-sim.test.ts
  - **src/sim/offline.ts +17/−2 (`offlineAccrualFrozen`)**

## MAJOR A1: offline egg grant zeroed while all hired workers are paused (src/sim/offline.ts)
- Code: `applyOffline`: `eggs = offlineAccrualFrozen(s,b) ? 0 : …`. offlineAccrualFrozen is true when at least one worker is hired and every hired worker `isPaused`. The comment cites "§15 / AC-P13".
- Spec of record: product/workers/m5-worker-pause-spec.md v1.3.15, sha1 4c081f64.
  - §3 L88: "**Not changed:** … and offline (workers already do nothing offline)."
  - AC-P13 L330: "Hidden gaps of 60.0 s and 600 s give +0 (**state at the hide plus the offline grant**)".
  - §rule 11 and E1: recovery +0, no wage, lockout frozen, paused flag kept. Nothing in them removes the egg grant.
  - §15 (L381–391) is build size plus the fixture deliverable. It contains no offline rule.
- The spec's "+0" refers to paused-worker recovery, wages and lockout, not to hen-produced offline eggs.
- Source of the behaviour: HoQA #115 bar (qa/decisions.md L876) "Extras: pause freezes income/offline accrual (clock-change during pause gives 0 accrual)". The PR implements that literally.
- Probe (offline-probe.ts, 108 cases: F × H × gap 60 s/600 s/2 h × worker sets):
  - Flag 0: paused:true vs no field gives 0 grant diff, so flag-0 is safe.
  - Flag on: all-paused grant zeroed in 108/108 cases. Partial pause: unchanged.
- Impact: flag-on economy change. The offline grant is hen production and does not depend on workers. Pacing/G5-P and Econ are affected.
- Required: HoP/PMW ruling on spec vs QA bar, with Econ informed. Either:
  - (a) the spec governs: drop offlineAccrualFrozen and the paused-gap "0 eggs / no double credit" tests, and keep the worker-level freeze; or
  - (b) spec erratum adopting the QA extra.
- Then a new SHA and an Architect recheck. I made no code change.

## m1 (prior Minor: committed tracksV7 fixture with ≥1 hired worker, QA-D-1030-ACP1-B, spec §15 L391 / AC-P13 L328): CLOSED
- Fixture is derived from m4-exp1-committed-unseen:
  - version 6, saveSeq 3, tracksV7 1, v6BackupId b42507d60308d615
  - farm 30 (≥ tc_pause_unlock_farm), hired market_hand + coop_hand {energy 100, cdS 0}
  - idb.main == ls save; bak and v6_backup present
- Tests assert: sum == checksum(state); validate → m5Load keeps both hires with no events; boot/pause/save/reload/resume round-trip; export doesn't throw; legacy (no `paused` field) loads unpaused.
- These tests are the prerequisite enabling the formal AC-P13 run. The formal AC-P13 bullets (59.9 s +1.66%, 60/600 s via real hide/show, E9/E13 sequence) remain QA's run.
- D-HOE-20261030-05: the new fixture tests make no specific balance-value assertions (all relational or read from tc), so no digest is needed.
- **New Minor m2 (pre-existing at 409fa6a, missed in my prior review):** tests/v5-pause-sim.test.ts L144 `expect(LOCK).toBe(45)` asserts a specific value from live balance with no fixture/sha256. That is not compliant with D-HOE-05. Non-blocking. Fix: pin it via a fixture with a digest, or drop the literal.

## Contract preservation (unchanged from 409fa6a except A1)
- Pause rules 1/3/7: unlock farm + hired only; recovery via rest_recovery_mult; B5 Market Hand lockout 45 sim-s, saved, frozen offline/hidden.
- E2/E9/E12/E13: E13 is still ignore-not-clear, so flag-off saves stay byte-identical.
- Flag 0: all reads go through isPaused/flagOn('pause').
- MH stall and income: unchanged code.
- Scope exclusions held: no Pause UI, no G5-P driver, no worker_paused/resumed telemetry emit, no E13 clear-on-save. SAVE_VERSION 6.

## Independent evidence (worktree /workspace/wt-arch-review115-a73804d, clean, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0, tsc 0.
- Focused: **24 files / 435 tests pass**. Files: v5-pause-sim, v5-m5load-pause-sanitize, v5-f3-is-paused, v5-f3-config, v5-f2-game-settle, v5-f2-m5-fields, v5-abilities-sim, v5-income-ref, offline, offline-modal, m4a-offline-csv, workers, workers-v11, all save* tests, m4a-flag-off, telemetry-schema, goldens flagoff a01faea + m4on 90a9c84.
- Offline probe: as above.
- Not run: full suite or build (no duplication; hosted gate pending).
- Logs + SHA256SUMS: scratch/architect/review115-a73804d/.

## Hosted / QA (read-only, ~00:05 CET)
- gate run 42125364613: QUEUED. pacing shards (42125364576): QUEUED. K10 (42125364604): in progress. **No SUCCESS cited.**
- QA: no Saves QA report pause-<sha7>.md exists. qa/decisions.md L874 says "No QA run on 409fa6a".

## Remaining integration / gates
1. A1 ruling (HoP/PMW, Econ informed), then a fix or erratum, then a new SHA and Architect recheck.
2. #114 merges first (its paired review is active elsewhere).
3. #115 is retargeted or merged forward onto the then-current rc/v5. The diff must be the 7 PR files + fixture/test only (HoQA L876).
4. Architect APPROVE at that exact head.
5. Standard bar: flag-0 parity, tsc, full vitest 0 fail, build + check-release-build, hosted gate Node 20, pacing shards SUCCESS.
6. Saves QA report qa/m3-recheck/pause-<sha7>.md, then HoQA merge go.

m2 is non-blocking. No code/PR post/Ready/push/merge/messages done. No publishing authority.
