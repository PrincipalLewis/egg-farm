TASK HoE/qa-105-exact-head + HoQA/PR105-106-exacthead: verify #105 income-ref at exact merge-forward head d9539a54e3f0beb36168d4dc247e337d1bd878b4
Write scope: qa/m3-recheck/ only (report + evidence). Scratch under qa/scratch/income-ref-d9539a5/ OK. No writes outside qa/ without HoQ OK.

Tip (Features posted; already verified by parent):
- SHA: d9539a54e3f0beb36168d4dc247e337d1bd878b4
- Branch: origin/feat/v5-income-ref (remote head matches)
- Parents: 91a0144 + 844f8e15 (rc/v5 tip)
- Diff vs 844f8e15: exactly 8 files (formulas, m5-rules, game, m5-fields, actions, income-ref, timers, v5-income-ref.test)
- Artifact note: artifacts/v5-105-mergefwd-d9539a5/NOTE.md
- PR: https://github.com/PrincipalLewis/egg-farm/pull/105 (open, not Draft, not merged)

Hard rules: never push/merge/tag; never print GITHUB_TOKEN; lane-run.sh / lane-kill.sh only (lane: saves-qa); ports 5961-5964 only; vitest via flock on /workspace/egg-farm-studio/.vitest-eng.lock, nice -n 10, 1 worker; start long runs only when load allows (prefer ≤~3.5); cite d9539a5 only.

Bar (PASS needs all):
1. Identity re-confirm in clean clone/worktree under qa/scratch/
2. Diff vs origin/rc/v5 (844f8e15) = those 8 files only, no reverts
3. tsc --noEmit clean
4. full vitest 0 fail; count ≥ rc/v5 baseline + 27 (baseline: measure on origin/rc/v5 844f8e15 or cite last known 2111 at daee4c1/844f8e15 merge; expect ~+27 from v5-income-ref)
5. v5-income-ref 27/27
6. flag-off golden 7/7 identical: vitest run engineering/golden/flagoff-golden.a01faea.test.ts engineering/golden/m4on-golden.90a9c84.test.ts tests/m4a-flag-off.test.ts tests/zg-flagoff-dom.test.ts (hashes f90d1678 / a54c9cf9 unchanged)
7. npm run build (includes check-release-build.mjs)
8. Hosted gate SUCCESS on this tip — watch/record runs already kicked: ci 42114562185, pacing-x1-stack 42114562232, k10 42114562165. release-globals skipped ≠ pass (OK on non-rc PR). Gate job must SUCCESS.
9. Pacing: shards SUCCESS; aggregate FAIL OK only if log shows RC-only row 904 / summary with failing line named. No pacing grant. Do not treat skipped release-globals as pass.

Report: qa/m3-recheck/income-ref-d9539a5.md with PASS/FAIL, severity, repro, sha256 of report, evidence folder sha256s. Every check run or listed not-run.

Done when report filed + evidence logged. Parent will ping HoE+HoQA.
