# CSV lineage check — D-HOP-25 amendment — 2026-10-19 CEST

## Verdict: VERIFIED

Only `guard_heartbeat_s` and `guard_stale_s` were removed. Kept columns = **123**. Data rows = **31** (plus header; 32 lines total). Every kept cell is byte-identical. Header order of kept columns preserved. No BOM; both LF with trailing newline; no quoting differences; raw-line rebuild after dropping the 2 columns matches new file exactly (0 mismatches).

## Hashes and sources

| Role | Full sha256 | Source |
|------|-------------|--------|
| OLD (b48be8a4) | `b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857` | `git show 0808fa6e141b659b5cfcf062cb4394b0852e593d:data/economy.csv` (commit msg: M4-on retune T3). Also equals `origin/main:data/economy.csv` (= dd223f510e9acabf9b1915b56e39da8b88dcac63) and `product/economy.f1-m4cols.csv`. |
| NEW (c7bb783f) | `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` | Studio `product/economy.csv` (D-HOP-25). **Not in any game-repo commit yet** (all `data/economy.csv` blobs enumerated). Dirty WT copy on `arch/m41-5-dead-cols`. |

Note: `product/economy.csv` is not a path in PrincipalLewis/egg-farm.git; game path is `data/economy.csv`.

## Artifacts

- Copies: `qa/scratch/csv-lineage/economy-b48be8a4.csv`, `economy-c7bb783f.csv`, `PROVENANCE.txt`
- Script: `qa/m3-scripts/csv-lineage-diff.mjs`
- Log: `qa/m3-recheck/csv-lineage-c7bb783f/diff.log`
- queue.md row #6 annotated 2026-10-19 CEST
