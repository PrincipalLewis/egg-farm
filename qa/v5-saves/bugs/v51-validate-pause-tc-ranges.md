# v51-validate-pause-tc-ranges: validateBalance doesn't enforce the pause tc ranges (lockout 15-60, unlock integer)
Severity: **Minor** | Target: **v5.1** | Owner: **HoE** | Found at: 2d15dacdb45884bf1aabce48ea20e7571fb69d66 (PR #92, base rc/v5 a923206). Pre-existing: the validator is unchanged since #91 (a923206) and #92 has no src/ code change | Found 2026-10-30 10:51 CET by Saves QA | Ruling: HoQ, 2026-10-30
Code: src/config/m5-rules.ts. L13 + L31 check presence only, through `has()` = `typeof === 'number'`; the leaf check in src/config/balance.ts rejects NaN and negatives. There is no rule for `pause_call_lockout_s` or `pause_unlock_farm` among the value rules (L32-56). Spec: product/workers/m5-worker-pause-spec.md v1.3.10 (sha1 b4f86ca8) §9 L222 (`tc_pause_unlock_farm` 10, fixed for M5.0) and L226 (`tc_pause_call_lockout_s` 45, range **15–60**).
Report: [qa/v5-saves/trace-reviews/pr92-2d15dac.md](../trace-reviews/pr92-2d15dac.md) §(3), Info line.

Repro: the probe's "info" case calls validateBalance with pause=1 and one key overridden, and records the outcome.
```
cd /workspace/egg-farm-studio/game && git fetch origin pull/92/head && git worktree add --detach ../qa/scratch/wt-pr92-2d15dac 2d15dacdb45884bf1aabce48ea20e7571fb69d66 && cd ../qa/scratch/wt-pr92-2d15dac && npm ci
cp /workspace/egg-farm-studio/qa/v5-saves/trace-reviews/pr92-2d15dac/probe-f5.test.ts tests/zz-qa-probe-f5.test.ts
QA_PROBE_OUT=/tmp/probe-f5.json npx vitest run --maxWorkers=1 tests/zz-qa-probe-f5.test.ts && cat /tmp/probe-f5.json   # see "values"
rm tests/zz-qa-probe-f5.test.ts
```
Expected: with `flags.pause` on, validateBalance refuses `pause_call_lockout_s` outside [15, 60] and a non-integer `pause_unlock_farm` (or one outside the valid farm level range), consistent with the other M5 value rules in m5-rules.ts.
Actual (13-probe-f5.json "values"):
- `pause_call_lockout_s=0` → ok (accepted)
- `pause_call_lockout_s=1e9` → ok (accepted)
- `pause_unlock_farm=2.5` → ok (accepted)
- NaN and negative values are refused ("… invalid", leaf check)

Impact: latent. The shipped values are 10/45 and the pause flag ships at 0. m5Load clamps a saved lockout to whatever the tunable is, so a bad CSV value such as 0 or 1e9 would pass the load gate and become the cap. A unlock of 2.5 would open Pause at F3 (`farmLevel >= 2.5`).
Evidence: qa/v5-saves/trace-reviews/pr92-2d15dac/13-probe-f5.json, 13-probe-f5.log, probe-f5.test.ts.
Suggested fix: in validateM5 (m5-rules.ts), next to the abilities/Pause rules:
- `if (has(tc,'pause_call_lockout_s') && !(tc.pause_call_lockout_s >= 15 && tc.pause_call_lockout_s <= 60)) fail('tc.pause_call_lockout_s must be in [15, 60] (pause spec §9)')`
- `if (has(tc,'pause_unlock_farm') && !(Number.isInteger(tc.pause_unlock_farm) && tc.pause_unlock_farm >= 1)) fail('tc.pause_unlock_farm must be an integer >= 1')`

Add AC-tagged tests in tests/v5-f3-config.test.ts for 0, 14.9, 60.1, 1e9 and 2.5 (rejected) and 15, 45, 60 (accepted), each from a fixture balance. HoP should confirm whether 15–60 is a validation bound or only a tuning range before this lands.
