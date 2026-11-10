# HANDOFF — hoqa/pr125-bar

TASK hoqa/pr125-bar: one HARD exact-head Saves QA bar on PR #125 (saves prB traits: Present calm-gate, Away, Broody, present_active_s/present_lost_count, away_bp). PrincipalLewis/egg-farm
Head claim: a8a1ae8a224d69c6b9099f25351ecd6ed1d4361b (ls-remote 01:26 CET: unchanged). rc/v5 = d65391b0 (#111 merged).
Write scope: qa/v5-saves/pr125-*.md + evidence qa/v5-saves/evidence/pr125-a8a1ae8a/ + scratch qa/scratch/pr125-a8a1ae8a/
No writes outside qa/. Never push/merge/tag. Never print GITHUB_TOKEN.
Rule 23: resumed helper re-reads TASK line + this HANDOFF before writing; on mismatch stop.
Long processes: ops/tools/lane-run.sh saves-qa -- <cmd>; stop: lane-kill.sh saves-qa <pid>
Vitest: flock .vitest-eng.lock, nice -n 10, 1 worker. Ports 5961-5964 only. USAGE CAP: one run each, no re-runs, no polling.
Grade vs gate e485f762 + PMC breeds-trait spec + drift-audit row 32. Any unmet item = FAIL with repro; nothing conditional. k10 known red.
Hosted one-shot: #125 ci 42726519056 / pacing 42726519416 / smoke 42726518993; #126 ci 42726279282 / pacing 42726279381 / smoke 42726278976.
No merge GO from Saves QA.
Started: 2026-11-10 01:26 CET. run-all.sh started via lane-run (pid in run-all.pid).

## Completed 2026-11-10 ~01:40 CET
Recommendation FAIL (3 MAJOR F1 fT share / F2 tick order 660.3 vs 660.0 / F3 away_bp post-grant; 3 MINOR F4 float order / F5 <60 s emit / F6 Broody unwired). Hosted OPEN (pacing in_progress #125 and #126).
Local: tsc 0; vitest 159 files 2319/1/0, 134 m41-9 errors EXIT=1 (recur); goldens f90d1678/a54c9cf9 PASS; build m4.1+a8a1ae8; events.ts PASS; G2b 10/10 PASS.
Report: qa/v5-saves/pr125-a8a1ae8a.md  report_sha256=0662dc9035c78398acd70246e8d0d9c62cd16a0ab87f5d82e74ee619aa7e922c
Probe: qa/scratch/pr125-a8a1ae8a/probes/qa-pr125-probe.test.ts (copy in evidence). run-all exited (DONE line); no live lane pids.
