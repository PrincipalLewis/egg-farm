# HANDOFF — hoqa/pr126-bar

TASK: one exact-head Saves QA bar on PR #126 (Saves prB commit 0: familyClamp/familyActiveBp getters and bc() keys) PrincipalLewis/egg-farm
Head claim: d4b5fdcd7e45a5c3b5d0062cf2a3a982bf9e74a9
Claimed base: rc/v5; Ready. Train slot: right after #124.
Write scope: qa/v5-saves/pr126-*.md + evidence qa/v5-saves/evidence/pr126-d4b5fdcd/ + scratch qa/scratch/pr126-d4b5fdcd/
Do NOT edit qa/v5-saves/m5-save-cases-DRAFT.md. No writes outside qa/. Never push/merge/tag. Never print GITHUB_TOKEN.
Rule 23: resumed helper re-reads TASK line + this HANDOFF before writing; on mismatch stop.
Long processes: /workspace/egg-farm-studio/ops/tools/lane-run.sh saves-qa -- <cmd>; stop: lane-kill.sh saves-qa <pid>
Vitest: flock /workspace/egg-farm-studio/.vitest-eng.lock, nice -n 10, 1 worker.
Ports 5961-5964 only if needed (never 4173).
USAGE CAP: ONE run each check, no re-runs, no polling.
Grade against gate e485f762 (product/m5-gate-acs.md sha1). G2b cases draft sha256 12fe2924… — only if head contains #124 fix; else skip and say so.
Hosted: pacing 42726279381 one-shot; find ci + k10 for this head; k10 conclusion only (known red, non-blocking).
No merge GO from Saves QA.
Started: 2026-11-10 01:12 CET

## Completed 2026-11-10 01:22 CET
Local PASS (vitest 0 failed; EXIT=1 uncaught UX minors noted); hosted OPEN (one-shot).
Report: qa/v5-saves/pr126-d4b5fdcd.md
Gate e485f762 verified. G2b 10/10 PASS (head on #124). BR-AC18/E8/E9 PASS.
report_sha256=68b1f36977ed0d5c18657a5571223336c66bcaabfc99193f93600bde0284ffd9
