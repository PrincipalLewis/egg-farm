TASK HoQA/PR105-106-exacthead (#106): verify #106 tapCoins at exact merge-forward head dc58705a3ca86902ef0a0d4a58e1799671800ac0
Write scope: qa/m3-recheck/ only. Scratch under qa/scratch/tapcoins-dc58705/ OK.

Tip (Features posted; parent verified):
- SHA: dc58705a3ca86902ef0a0d4a58e1799671800ac0
- Parents: e5b3d02 + f8036e8 (rc/v5 after #105)
- Branch: origin/feat/v5-tapcoins
- Diff vs f8036e8: exactly 7 files +213/−8 (formulas, m5-rules, actions, events, streak, tap-coins, v5-tap-coins.test) — no income-ref reverts
- Artifact: artifacts/v5-106-mergefwd-dc58705/NOTE.md
- PR https://github.com/PrincipalLewis/egg-farm/pull/106 Ready/open
- Hosted runs started: ci 42124406327, pacing 42124406279, k10 42124406304

Bar:
1. Identity + 7-file diff vs rc/v5, no reverts
2. tsc --noEmit clean
3. full vitest 0 fail (count ≥ rc/v5 baseline + tapCoins tests)
4. v5-income-ref 27/27 (still on tip via #105)
5. v5-tap-coins 22/22 + ST-AC8 (find ST-AC8 in streak/tap tests; cite)
6. flag-off golden 7/7 identical (flagoff + m4on + m4a-flag-off + zg-flagoff-dom)
7. npm run build + check-release-build
8. Hosted gate SUCCESS; release-globals skipped by design on non-rc/* ≠ pass, not a block
9. Pacing shards SUCCESS; aggregate FAIL OK only RC-only row 904 named

Hard rules: never push/merge/tag; lane-run saves-qa; flock .vitest-eng.lock nice -n 10 1 worker; cite dc58705 only; no writes outside qa/.

Report: qa/m3-recheck/tapcoins-dc58705.md + evidence/.
