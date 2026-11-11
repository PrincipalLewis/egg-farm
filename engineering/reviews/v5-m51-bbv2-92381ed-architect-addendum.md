# #100 v5-m51-bbv2: Architect merge-forward delta addendum at 92381ed

Date: 2026-11-05 ~23:10 CET · Lane: architect · Prior: v5-m51-bbv2-b6dec409-architect.md (sha256 005247ac…df84e; PASS with Minors at flag 0; M1/M2 flip blockers)

## Verdict: PASS (delta) at exact 92381edd8ba3f01beffa72e7b2bea94298d24f93
This holds for merge at flags 0 (bestBuyV2 = 0, zeroGainUi = 0). Prior findings carry over unchanged. The flip stays BLOCKED.

## Identity
- origin refs/heads/v5-m51-bbv2 = refs/pull/100/head = 92381ed. PR #100 is open and DRAFT, base rc/v5 @ 844f8e15774daeb1c0a855cb69b1fabd2f0ab820, 25 files +845/−61. "unstable" means the X1 shards are still running.
- Parents: b6dec409b15ab9c9f0d4869045a0f3c9b385f613 (the head of my prior review) and 844f8e15 (current rc/v5). Old merge-base 30df38c.
- Author and committer: "Senior Engineer, Generalist (Sim/TS + UI)", 22:33 CET. Message: "Merge rc/v5 844f8e15 into gen/bbv2 (#100 merge-forward)".
- Bundle engineering/tasks/bbv2/gen-bbv2-92381ed.bundle: sha256 9a7a00cc…53e7 MATCHES. `git bundle verify` ok. Single ref refs/heads/gen/bbv2 = 92381ed. Prerequisites: 0ad018d, 30df38c, 844f8e15.

## Delta / conflict resolution
- `git merge-tree b6dec409 844f8e15` gives exactly 2 conflicts: scripts/check-release-build.mjs and src/config/balance.json. Auto-merged: telemetry.ts, app.ts.
- The 92381ed tree (954a7902) differs from the auto-merge result ONLY in the 2 conflict hunks.
  - check-release-build.mjs:74 hooks list keeps BOTH `eggfarmQa` (from rc) and `qaPicker` (from #100): `…'eggfarmOnb','eggfarmQa','eggfarmQaRecovery','qaPicker','eggfarmPerf'…`. CORRECT.
  - balance.json telemetry.bbv2 = {shown_min_gap_s 5, zero_gain_eta_max_s 60, dead_zone_min_s 30, zero_gain_purchase_cap 50}, identical to rc. Only `_note` dropped. CORRECT. As a result, balance.json drops out of the PR diff (26 → 25 files).
- The PR patch rc..92381ed is byte-identical to the reviewed 30df38c..b6dec409 for the other 24 files (ignoring index lines and hunk offsets). The only change is the check-release-build line gaining `qaPicker`.
- So no feature code changed versus b6dec409. Nothing in this head fixes any prior finding.

## Prior findings at this head (classified after reading D-HOP-2026-11-05-14, 22:37 CET, and Card #12 9f900304)
- **M1** (Q-E2 UI flag leaks into SIM coin charge via BR-R5 hatch cost; D-HOE-38): **OPEN**. Flip blocker. Code unchanged.
- **M2** (BB-AC14 ship config: 18 states with an affordable hint and null ★): **OPEN**. Flip blocker.
  - D-HOP-14 ruled B, "ENFORCE v1.0.4, no reversal, no waiver". v1.0.5/v1.0.6 were rejected. The live spec is v1.0.4 4ea3841a and Card #12 9f900304 is restored to v1.0.4.
  - So M2 must be FIXED, not ruled away. Flip ACs per D-HOP-14:
    1. CONFIRMATORY suppressedAffordable === 0 at all Farm levels.
    2. DECISIVE zg-off contract unchanged.
    3. Strict BBv2 meaningful set on all 4 picker paths post-L30, with the no-pick path when empty.
    4. L30+ capacity-only HENS fixtures: breeds off → no-pick; breeds on → BR-BB4 Hatch.
    5. 18-state diagnostic dump. The diagnostic task engineering/tasks/bbv2/m2-18-state-diagnostic.md exists; it is not evidence on this head.
    6. Flag 0 byte-identical.
  - None of these is implemented at 92381ed. The last measured CONFIRMATORY value is 18 (fbce499 slow.log).
- **m1** (starred FARM label bypasses the 27-cp truncator; flip-time QA): OPEN.
- **m2** (AC14 "no exception" not asserted): OPEN. It is now covered by D-HOP-14 AC1.
- **m3** (BB-AC1 coverage) and **m4** (AC-W1 flag-0 band removed, matches QA N-3): OPEN, both non-blocking.
- Flip prerequisites from the prior review still stand: the D-HOE-38 SIM-only flag list (mine, not started), M1, M2, m1 at 360, flag-on goldens, and the HELD-flip diff/seam pin.

## Independent evidence (worktree /workspace/wt-arch-recheck100-92381ed, clean before and after, Node v20.19.2, lane-run architect, flock + nice 10, maxWorkers=1)
- npm ci 0, tsc 0.
- Focused: 20 files / 248 tests pass. Files: bbv2-{parta,qapicker,qe2,sim,telemetry}, all zg-*, v5-f3-qa-seam, telemetry-schema, telemetry, m4a-flag-off, v5-p8-slim, goldens flagoff a01faea + m4on 90a9c84 (flag-0 parity).
- `npm run build` and `build:html` EXIT 0, including check-release-build "no ?debug/?perf/?ios/QA hooks ok" with the merged hooks list. So qaPicker and eggfarmQa are compiled out of release.
- release-build-id / release-bundle / release-html: 3 files / 61 tests pass.
- Not rerun: the full suite (the hosted gate covers it) and the slow suite (no feature delta; the AC14 figures in the prior review remain fbce499 evidence).
- Logs + SHA256SUMS: scratch/architect/recheck100-92381ed/.

## Hosted (read-only, ~23:05 CET, exact head_sha 92381edd8)
- **gate: completed SUCCESS 23:00:59 CET, run 42113793729.** Claim verified.
- release-globals: skipped (expected).
- K10 monitor: failure (known-red, non-required; expected).
- pacing-x1-stack shards (optimal, casual, seller15): IN PROGRESS, run 42113793818. Not yet evidence. The X1 summary is expected red only on the RC row.

## Gates and remaining holds
- Architect delta gate for a flag-0 merge: met at 92381ed.
- Stays DRAFT. Ready only after:
  - the X1 shards finish with the expected pattern
  - QA exact-head verdict (not replaced here)
  - the later M1/M2 stack per HoE
- The flip stays blocked on M1, M2 (D-HOP-14 ACs 1–6), D-HOE-38 and m1.
No Ready/PR post/push/merge/messages/code writes done.
