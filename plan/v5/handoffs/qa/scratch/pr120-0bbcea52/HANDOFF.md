# HANDOFF — hoqa/pr120-firstbar

TASK: full exact-head Saves QA bar on PR #120 (breeds 3.8.9 re-cite) PrincipalLewis/egg-farm
Head claim: 0bbcea5277a7be7f8e8d4303b7aac49e0dc04a7e
Parent claim: rc/v5 f20b9183
Write scope: qa/v5-saves/pr120-*.md + evidence/scratch under qa/v5-saves/evidence/pr120-0bbcea52/ and qa/scratch/pr120-0bbcea52/
Rule 23: resumed helper re-reads TASK line + this HANDOFF before writing; on mismatch stop.
No writes outside qa/. Never push/merge/tag. Never print GITHUB_TOKEN.
Long processes: lane-run.sh saves-qa -- <cmd>; stop: lane-kill.sh saves-qa <pid>
Vitest: flock .vitest-eng.lock, nice -n 10, 1 worker.
Ports 5961-5964 only if serve needed.
Worktree: own clone under this scratch, detached at head; reference /workspace/wt-review-106-dc58705
Hosted: ci 42719317192, pacing 42719317458, k10 42719317403 — one-shot reads, no poll.
Train: #111 → #118 → #120 → #117; no merge GO from Saves QA.
Started: 2026-11-10 00:20 CET

## Completed 2026-11-10 00:37 CET
Local PASS; hosted OPEN (one-shot). Report: qa/v5-saves/pr120-0bbcea52.md sha256 a44f1c652541ed1f609f6f1e107f3d720e07be9ec823d35c3e4ebae1f2958cc8
