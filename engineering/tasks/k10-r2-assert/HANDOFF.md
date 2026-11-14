# GEN/rc-fixes-1113 (b) — gen/k10-r2-assert — HANDOFF (16:20 CET, 2026-11-13)

**State:** Ready. Cut from origin/rc/v5 `607081c7` (Merge #129). D-HOP-2026-11-13-03 (2a/2b): land the HoQA-approved r2 assertion (patch `3bfd301b`, review `a38edfa0`) unchanged, commit the K002/reference CSV pair as fixtures, and set `K10_CSV` / `K10_REF_CSV` in `k10-breeds-offset.yml`. Assertion, caps and threshold unchanged. Local 200-seed run is an honest red (no throw) and matches HoQA's K002 result JSON `eda8e3a7` field-for-field (only the `csv` path differs). `engineering/status.md` untouched (rc/v5 blob `e5534d89`). This HANDOFF commit sits on top of the gate sha.

**PR:** (filled after open). Branch `gen/k10-r2-assert`, worktree `/workspace/wt-gen-k10-r2-assert`.
**Gate sha `78b0ccef`** (tree `e6c96c53`, parent `607081c7`).

## Fixtures
- `tests/fixtures/k10/economy.combined-K002.csv` sha256 `aeaeadee3ed731c42e7c95b36812b5282699095d22b517697fea10ad11e5eaa9` (candidate, cap 0.27, 32 `bc_*` columns). Byte-equal to `/workspace/egg-farm-studio/scratch/post-l10/resume-20261105/economy.combined-K002.csv`.
- `tests/fixtures/k10/economy.no-breeds-reference.csv` sha256 `18f2016f87605b891b72fbd2acbe2af14fa2c8a7334627c465d8b38556b59369` (reference, cap 0.28, 32 `bc_*` columns). Byte-equal to `/workspace/egg-farm-studio/scratch/post-l10/resume-20261105/economy.no-breeds-reference.csv`.

## Workflow
`.github/workflows/k10-breeds-offset.yml` step env now sets `K10_CSV` and `K10_REF_CSV` to those fixture paths. `scripts/k10-trigger.mjs` `spawnSync('npm', ['run', 'test:k10'], { stdio: 'inherit' })` inherits `process.env`, so the vars reach `test:k10`. Default `npm test` already excludes `**/*.k10.test.ts` (vite.config.ts); the 200-seed test is only in `npm run test:k10`.

## Local 200-seed k10 @ 78b0ccef (lane-run generalist, ~449 s)
Honest FAIL, no throw. Line:
`K10 csv=aeaeadee bc=csv seeds=1-200 settle=0 F20-29 median premium: g1max 63.74 | no-breeds 63.75 | Present-only 63.75 -> FAIL (decisionTargetPp=0.58, targetTwoNoisePp=0.6102553635928984)`

Evidence: marginPp `0.013299186386817041`, medianNoisePp `0.3051276817964492`, bootstrapSdPp `0.44940532079541834`, targetTwoNoisePp `0.6102553635928984`, decisionTargetPp `0.58`, verdict `FAIL`, pass false, marginal false, n 200.

Compared to HoQA `/workspace/egg-farm-studio/scratch/k10-breeds/review-20261105-r2/k10-full200-K002.result.json` sha256 `eda8e3a74d676d9b330b587d065b2d6c10e2b2146669372fd6faa69524afa9fc`: every field matches, including `perSeed` (200+200 rows), premium blocks, and bootstrap metadata. The only difference is `csv` (fixture path vs HoQA's scratch path). Substituting the HoQA path and compact-serializing with a trailing newline yields sha256 `eda8e3a7…` byte-identical.

## Gates @ 78b0ccef (`/workspace/scratch-rc-fixes-1113/logs-k10-r2/`)
- check-vendor-pins: 4 files, EXIT 0.
- tsc `--noEmit`: EXIT 0.
- k10 unit (evidence 3 + harness 9): 12 passed, EXIT 0.
- ST-AC19/20 whole file, no `-t`, `--reporter=verbose`: 16 passed, 0 skipped, EXIT 0.
- Flag-0 goldens unchanged: `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544` / `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5`. 2 files / 4 passed, EXIT 0.
- Full npm test (unfiltered; `*.k10.test.ts` excluded): 190 files, 2875 passed / 1 skipped, EXIT 0. (was 189 / 2872; +`k10-b4-evidence.test.ts` 3 tests).
- Build + check-release-build: ok (`m4.1+78b0ccef`).

## Hosted runs
Collected after the plain push of this tip; k10-breeds-offset is waited on. See the report.
