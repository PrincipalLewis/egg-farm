# HANDOFF — hoqa/pr124-bar

TASK: one exact-head Saves QA bar on PR #124 (Saves breeds drift D1–D6) PrincipalLewis/egg-farm
Head claim: baf410fff30cb6a66e8565693f84ade2250719c2
Parent claim: 3354fc7 (stacked on #120 0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e)
Write scope: qa/v5-saves/pr124-*.md + evidence qa/v5-saves/evidence/pr124-baf410ff/ + scratch qa/scratch/pr124-baf410ff/
Do NOT edit qa/v5-saves/m5-save-cases-DRAFT.md. No writes outside qa/. Never push/merge/tag. Never print GITHUB_TOKEN.
Rule 23: resumed helper re-reads TASK line + this HANDOFF before writing; on mismatch stop.
Long processes: /workspace/egg-farm-studio/ops/tools/lane-run.sh saves-qa -- <cmd>; stop: lane-kill.sh saves-qa <pid>
Vitest: flock /workspace/egg-farm-studio/.vitest-eng.lock, nice -n 10, 1 worker.
Ports 5961-5964 only if needed (never 4173).
USAGE CAP: ONE run each check, no re-runs, no polling; do not redo #120 cite-only proof / BR-AC26 mapping.
G2b cases from m5-save-cases-DRAFT.md sha256 12fe2924…; grade against gate e485f762 (product/m5-gate-acs.md sha1).
Hosted: ci 42723343775, pacing 42723343747 — one-shot, no poll.
Train: #111 → #118 → #120 → #124 → #117; no merge GO from Saves QA.
Started: 2026-11-10 00:50 CET

## Completed 2026-11-10 01:05 CET
Local PASS; hosted OPEN (one-shot). Report: qa/v5-saves/pr124-baf410ff.md
Gate e485f762 = product/m5-gate-acs.md sha1 verified. G2b 10/10 PASS.
report_sha256=036367c28618dbd6c70eae9e9e0dd20117c7995680f5012ef63df58074102524
