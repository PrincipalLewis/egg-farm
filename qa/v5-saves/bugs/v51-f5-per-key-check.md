# v51-f5-per-key-check: F-5 doesn't check each pause tc key on its own
Severity: **Minor** | Target: **v5.1** | Owner: **HoE** | Found at: 2d15dacdb45884bf1aabce48ea20e7571fb69d66 (PR #92, base rc/v5 a923206) | Found 2026-10-30 10:52 CET by Saves QA | Ruling: HoQ, 2026-10-30
File: tests/v5-m5load-pause-sanitize.test.ts, `[CCR-F4][F-5]` (L72-79). Validator: src/config/m5-rules.ts L13 (`M5_REQUIRED_TC.pause`), L31.
Report: [qa/v5-saves/trace-reviews/pr92-2d15dac.md](../trace-reviews/pr92-2d15dac.md) §(2), finding M1.

Repro: run in a read-only worktree. Each mutant is applied by qa/v5-saves/trace-reviews/pr92-2d15dac/mutate.py, which targets qa/scratch/wt-pr92-2d15dac.
```
cd /workspace/egg-farm-studio/game && git fetch origin pull/92/head && git worktree add --detach ../qa/scratch/wt-pr92-2d15dac 2d15dacdb45884bf1aabce48ea20e7571fb69d66 && cd ../qa/scratch/wt-pr92-2d15dac && npm ci
python3 /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr92-2d15dac/mutate.py F3-only-unlock-required   # M5_REQUIRED_TC.pause = ['pause_unlock_farm']
npx vitest run --maxWorkers=2 tests/v5-m5load-pause-sanitize.test.ts tests/v5-f3-config.test.ts
git checkout -- src tests
# repeat with F4-only-lockout-required, T2-strip-unlock-misspelt, T3-strip-lockout-misspelt
```
Expected: F-5 fails when either key is no longer required, or when either key name in the strip is misspelt. The test title names both keys ("missing tc_pause_call_lockout_s / tc_pause_unlock_farm is a load error").
Actual: all 4 mutants **survive** (38/38 pass). F-5 strips both keys and its regex `/tc\.pause_(unlock_farm|call_lockout_s) is required…/` matches whichever key throws first, so dropping either key from the required list goes unnoticed. The validator itself does require each key on its own: probe 13-probe-f5.json gives stripUnlockOnly → "tc.pause_unlock_farm is required…" and stripLockoutOnly → "tc.pause_call_lockout_s is required…".
Evidence: qa/v5-saves/trace-reviews/pr92-2d15dac/30-mut-F3-only-unlock-required-vitest.log, 30-mut-F4-only-lockout-required-vitest.log, 30-mut-T2-strip-unlock-misspelt-vitest.log, 30-mut-T3-strip-lockout-misspelt-vitest.log, 13-probe-f5.json (all in pr92-2d15dac/SHA256SUMS).
Suggested fix (test-only): in F-5, add two cases, each stripping exactly one key with pause=1, and match the exact per-key message: `/tc\.pause_unlock_farm is required while flags\.pause is on/` with lockout present, and `/tc\.pause_call_lockout_s is required…/` with unlock present. Also assert that the stripped tc lacks both keys (`expect('pause_unlock_farm' in tcNoPause).toBe(false)`, same for lockout) so a typo can't make the strip a no-op. Re-run mutants F3/F4/T2/T3: all must be killed. Note: the same shape exists in #91 (a923206).
