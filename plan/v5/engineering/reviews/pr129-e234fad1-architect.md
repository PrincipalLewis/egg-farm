# Architect review: PR #129 at e234fad1 (Generalist: collection-cost port of 7346011, `collectionCostFromCsv`, default OFF)
**Reviewer:** Architect · 2026-11-10 04:05 CET · read-only. `git fetch origin pull/129/head`; detached worktree `worktrees/rev-pr129-e234fad`. No push, no PR action.
**Head:** `e234fad1f42a0b7cd0d3461dc57f66cefe3f2671` = de438e8 (red-first test) + e234fad (impl), on `origin/rc/v5` d65391b. 7 files, +145/−5.

## Verdict: **APPROVE** (0 Blocker, 0 Major, 1 Minor that must land before anyone flips the key, 2 nit)

## 1. Faithful port: PASS, no divergence
`diff <(git show 7346011) <(git diff d65391b e234fad)`, ignoring `index` lines, differs **only in six hunk-header line offsets** (`@@ -12` → `@@ -13`, and so on). Every added and removed line is byte-identical across all 7 files, tests included. `git range-diff` shows only the author and the commit message. The one extra commit, de438e8, is the red-first split of the same test file. The commit-message claims checked out: "applied clean, no edits".

## 2. Default-off byte-identity: PASS
- **The key is sync-time, not runtime.** `collectionCostFromCsv` lives in `data/economy-config.json` and is read only by the Node script `scripts/sync-economy.ts:82`. It never enters the bundle, so there is nothing to dead-code-eliminate. It is not a QA/dev key, so check-release-build coverage isn't required. The shipped config doesn't set it (`economy-config.json`: `farmCostGrowthSegments: []`, `farmCostFromCsv: true`).
- **balance.json:** `sync-economy --check` → "balance.json up to date with economy.csv" (rc 0). Test `:17-23` rebuilds it byte for byte with the flag off. There is no `collection.costTable`, so `collectionCost` (`formulas.ts:62-66`) takes the unchanged `Math.floor(baseCost * costGrowth ** L)` branch.
- **Fixtures:** I reran `scripts/gen-sim-fixtures.py` and `gen-seller-variance-fixtures.py` in my worktree. `git status --porcelain` stayed empty, so `tests/fixtures/*` regenerate byte-identical.
- **Release bundle:** its bytes are *not* identical by construction, because the new `collectionCost` body ships. Behaviour is identical (the table branch is unreachable without `costTable`). The release-bundle tests pass inside the full run below. Flag-0 goldens and save goldens are green.

## 3. Data-driven / naming / fixtures
- **Source of truth:** the existing per-level CSV column `collection_cost` (`data/economy.csv`, 31 rows, L0-30), copied verbatim, with no literals. It is a per-level column, not a `tc_*` scalar, so D-HOE-20261030-30 naming doesn't apply. It follows the F1 `farmCostFromCsv` / `farm.costTable` pattern exactly.
- **Validation:** `validateCostTable(..., 'collection.costTable')` (`balance.ts:38`, `formulas.ts:100-105`) requires length maxLevel+1 and safe positive integers. `collectionCost` throws on a non-integer entry. Unknown and empty-array config keys are handled (`collectionTableConflicts`, `sync-economy.ts:20-22`).
- **D-HOE-20261030-05:** see m1.

## 4. Boundaries / determinism / big numbers: PASS
- The change is config-layer only (`config/formulas.ts`, `config/balance.ts`, the sync script, and the Python fixture scripts). sim, econ and ui all reach cost only through `collectionCost`: `git grep collection.costGrowth|baseCost` finds no bypass in `src`. The vendored Python sim is untouched (sha pins kept), and `collection_cost_table.apply` overrides `ccost` per instance.
- Integer table lookup with a level clamp: deterministic, no float growth on the table path. The maximum value is 13,292,279¢ at L30, far below 2^53, and safe-integer is enforced. TS/Python parity is tested on a deliberately off-formula table (`:59-77`).

## 5. Independent runs (Node 20.19.2, flock .vitest-eng.lock, nice 10, via `lane-run.sh architect`)
Logs are in `/workspace/artifacts/pr129-e234fad-architect/` (`head.txt` = e234fad1, clean tree).
- `tsc --noEmit` rc 0.
- `sync-economy --check` rc 0.
- Fixture regen: 0 diff.
- **Full `vitest run`: 157 files, 2302 passed + 1 skipped, rc 0.** That includes `tests/collection-cost-table.test.ts`, `cost-segments`, `m4a-sync`, the economy tests, release-bundle, and the flag-0 goldens.

## Findings
- **m1 (Minor; must land before the key is flipped). D-HOE-20261030-05.** `tests/collection-cost-table.test.ts:24-31` builds flag-off vs flag-on from the **live** `data/economy.csv` and asserts that the costs are equal on every row. That only holds while the live CSV is formula-shaped, and that is exactly what changes when Econ retunes `collection_cost` per level, the purpose of this key. The off-path fit then throws, and the test breaks for a data reason.
  - Move the on/off equality to a committed fixture CSV under `tests/fixtures/` with a sha256 assert.
  - Keep the live-data checks, which are allowed shipped-data mapping tests: `costTable == live CSV column` and the `:17-23` default-off pin.
  - When the key is flipped, `:18` (`collectionCostFromCsv` undefined) must be updated in the same change. Say so in a comment.
- **nit n1** `sync-economy.ts:20-22`: `/Segments$/` counts *any* present-or-future `*Segments` key as a conflict, not only cost-curve keys. This is faithful to 7346011. Use an explicit list when the next config key lands.
- **nit n2** `scripts/collection_cost_table.py` `read_table`: `isinstance(v, int)` accepts `True` while TS rejects it. Harmless, because sync only writes ints.

Content APPROVE is separate from hosted CI and the HoQA bar.
