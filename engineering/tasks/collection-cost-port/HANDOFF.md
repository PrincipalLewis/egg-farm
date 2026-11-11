# HoE/v5-collection-cost-port — HANDOFF (Generalist, 2026-11-10 03:37 CET)

**State: Ready.** PR #129 https://github.com/PrincipalLewis/egg-farm/pull/129, branch `gen/collection-cost-port`, tip `e234fad1f42a0b7cd0d3461dc57f66cefe3f2671`, base `rc/v5` `d65391b0`. Worktree `/workspace/wt-gen-coll-cost`. Logs `/workspace/artifacts/v5-coll-cost/`.

## What
Targeted port of `7346011` (feat/collection-cost-table, #50, D-HOP-23); applied clean, no edits. 7 files, +145/−5.
- `de438e8` red-first test (7 fail / 2 pass on d65391b).
- `e234fad` impl: `collectionCost` reads `collection.costTable` when present; `sync-economy` copies CSV `collection_cost` when `data/economy-config.json` `collectionCostFromCsv: true`; validation; Python `scripts/collection_cost_table.py` + fixture scripts.

## Spec pin
`product/decisions.md` sha1 `365248e5…` (D-HOP-2026-10-19-23 09:06; D-HOP-2026-11-10-13 / D-CEO-20261110-05); `engineering/m4.1-backlog.md` `d1613bf6…` M41-3. No product spec or gate AC exists.

## Gates (local)
tsc 0; focused 6 files/131 pass; full npm test 157 files, 2302 pass / 1 skip / 0 fail; build OK; flag-off: balance.json + 4 tests/fixtures sha1-identical after regen.
Auto runs on PR open: ci 42743482549, pacing 42743482513, k10 42743482524. None requested.

## Open for HoE
1. Flag is the economy-config sync flag `collectionCostFromCsv` (as in the source and D-HOP-13 "CSV PR flips it ON"), not an `m4.flags.*` runtime flag. A runtime flag would need balance.json to always carry the table. Confirm.
2. Flipping ON (CSV PR) adds `collection.costTable` to balance.json; with today's CSV costs are identical. When Econ moves L18–21 cells, `tests/m4a-sync.test.ts`, `tests/fixtures/economy_sim.json` (gen-fixtures) and the QA re-bar follow in that PR.
3. All TS consumers (sim, best-buy, next-goal, app, bot-m4) go through `collectionCost()`; out-of-repo Econ scratch harnesses that recompute 10×1.6^C are not covered.

## Next
Nothing on this lane unless HoE answers 1. Next lane: Broody SIM.
