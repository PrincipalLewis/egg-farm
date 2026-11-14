# GEN/rc-fixes-1113 (a) — gen/revendor-m4cols — HANDOFF (15:52 CET, 2026-11-13)

**State:** Ready. Cut from origin/rc/v5 `607081c7` (Merge #129). D-HOP-2026-11-13-02 (1): CSV parity FAIL is a vendor drift — product and `data/economy.csv` were already the approved `58dcf20e`; only `vendor/economy-sim/economy.f1-m4cols.csv` was still `a8c4e268`. Re-vendored that file byte-equal to `/workspace/egg-farm-studio/product/economy.f1-m4cols.csv`. SOURCE line 4 and SHA256SUMS updated to the same sha256. `engineering/status.md` untouched (still rc/v5 blob `e5534d89`). Local gates green. This HANDOFF commit sits on top of the gate sha.

**PR:** (filled after open) Branch `gen/revendor-m4cols`, worktree `/workspace/wt-gen-revendor-m4cols`.
**Gate sha `b901850c`** (tree `237c81ef`, parent `607081c7`).

## Hashes (verified locally)
- Approved (product/economy.f1-m4cols.csv) sha256: `58dcf20e72b82df73988726c4da3c13f390da07be9a15ed73561045762c1fe87`
- Vendored (vendor/economy-sim/economy.f1-m4cols.csv) sha256: `58dcf20e72b82df73988726c4da3c13f390da07be9a15ed73561045762c1fe87` (byte-equal)
- Previous vendored pin: `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f`
- `58dcf20e` is the **sha256** prefix (not sha1; sha1 of the approved file is `8967c160…`).

## Gates @ b901850c (`/workspace/scratch-rc-fixes-1113/logs-revendor/`)
- check-vendor-pins: 4 files match SHA256SUMS, EXIT 0.
- tsc `--noEmit`: EXIT 0.
- `npm run sync-economy -- --check`: balance.json up to date, EXIT 0. (`sync-economy-cli` has no `--strict` flag.)
- `npm run check-economy-copy -- --strict` with `ECONOMY_PRODUCT_DIR=/workspace/egg-farm-studio/product`: 4 vendored files match product/; data/economy.csv matches product/economy.csv sha256 `58dcf20e`, EXIT 0.
- ST-AC19/20 whole file, no `-t`, `--reporter=verbose`: 16 passed, 0 skipped, EXIT 0.
- Flag-0 goldens **unchanged**: GOLDEN1 `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` / `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`. 2 files / 4 passed, EXIT 0.
- Full npm test (unfiltered): 189 files, 2872 passed / 1 skipped, EXIT 0.
- Build + check-release-build (clean tree): ok (`m4.1+b901850c`).

## Hosted runs
Collected after the plain push of this tip; not waited. See the PR checks / the report.
