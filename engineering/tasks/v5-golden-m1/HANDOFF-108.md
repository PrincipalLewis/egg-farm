# HANDOFF · #108 golden spawn M1 fix · 90fb447

**Date:** 2026-11-05 22:10 CET (Europe/Belgrade, UTC+1)
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/108 (Draft — stays Draft)
**Head:** `90fb44747f3c590dec1de6fb31d4c5568cefbfee`
**Parent:** `dfaffa6e2d2f2d3f05d5f617d43b982383658dd8`
**Branch:** `feat/v5-golden-spawn`
**Worktree:** `/workspace/wt-v5-golden-s2`

## Done
- Architect M1: restored `M5_TC_KEYS.abilities: ['ability_s','ability_cd_s']` in `src/config/formulas.ts` (was EOL-comment on b0d7e85).
- Pin test in `tests/v5-golden-spawn.test.ts`: abilities entry + golden key list + validateBalance abilities:1 requires ability_s/ability_cd_s.
- Minor: GE-AC33 comment clarified to gap-at-resolve -> slot -> reward (first-spawn uses tc_first_spawn_s).
- Did **not** churn goldenUnload arg order (#111 owns FINAL A).

## Gates
- tsc --noEmit: exit 0
- vitest targeted spawn+rewards: **46/46** (was 45; +1 M1 pin)
- Artifact: `artifacts/v5-golden-spawn-90fb447/`

## Next
- Architect recheck #108 @ this tip.
- Restack #111 Game onto this tip + #109 `98d2cbe` base.
- Keep both Draft / no Ready.
