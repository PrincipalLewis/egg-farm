# L30+ harness: warm-up reproduction of HoE's b.csv run at 729565e9

**Type: WARM-UP REPRODUCTION. This is not a gate verdict.** It covers queue item #6 (D-CEO-20261019-14), the dry run before the Economy handoff.
Saves QA (33ec1b55). Run 2026-10-19 09:25:52 to 09:33:20 CEST (7 min 28 s), exit 0.
Evidence is in `l30plus-dryrun-b-729565e9/`: `run1.log` (tee of stdout and stderr), `out/run1/{result.json,summary.txt}`, `inputs/` (read-only CSV copies, `sha256.txt`, and HoE's reference summary), `npm-ci.log`, `summary-vs-hoe.diff`, `l0-30-diff.txt` and `l0-30-diff-c7bb783f.txt`.

## Result: EXACT MATCH, YES
My `summary.txt` is byte-identical to HoE's reference summary (PR #51 head d90a19d, `engineering/reviews/l30plus-cand-b-dd223f5.summary.txt`, blob f140f024) on every line except line 2. Line 2 is the CSV **path**: the input sha256 is the same, but HoE read the file from scratch/ and I read my qa/ copy. That covers all 50 per-level median and P95 values, the dead-zone list, L10, the step gate and the top-step list.

| Metric | HoE | QA (mine) | |
|---|---|---|---|
| Step gate P95 (G1) | 1.974 | 1.974 (raw 1.9738687…) | MATCH |
| Worst seed (G2) | 2.171 (seed 188) | 2.171 (seed 188) (raw 2.1710227…) | MATCH |
| Step-gate verdict | PASS | PASS | MATCH |
| Top-step share (G3) | FAIL, F38 27.5% | FAIL, F38 27.5%, F45 20.0%, F49 19.5%, F34 10.5%, F35 6.0%, F42 5.0% | MATCH (full list identical) |
| Workers L10 P95 (G5) | 12.08 | 12.08 min (margin 0.022, fastest 8.32) | MATCH |
| No-workers L10 P95 | 12.02 (summary) | 12.02 (margin 0.083, fastest 7.87) | MATCH |
| L30 row byte-exact | NOT byte-exact | NOT byte-exact (3 cells) | MATCH |
| Farm level at T (P5/median/P95) | 50/50/50 | 50/50/50 | MATCH |
| Seeds counted | 200 | 200 | MATCH |

## Provenance
- Harness: `scripts/measure-l30plus.ts`, blob 8aa74ce14a21f797092c0b6d9d966e16baf6302f, which equals the committed blob (result.json `committedBlob`). The PR #51 head d90a19d holds the same blob.
- Code: 729565e9543542f49f6f61d6fe0a1a509e687a6c, **dirty: false**. `git status --porcelain` printed 0 lines before and after the run, and result.json reports `dirty:false`.
  - It is a merge of 2ac994f (#45 line) and 47f0c12 (harness). dd223f5 is an ancestor.
  - `git log dd223f5..729565e9` lists the merge, the harness commit and **7 #45 commits**: b2d3f38, 74e0ed6, 639608d, ffe3299, cee9f2c, 8a2280d, 2ac994f.
- CSV: b.csv, sha256 **84bd0b70bf40b8dfa8be223a0356f2cddbf025c532fe4da3ab5adf11d9088faa**, verified before the run.
  - Source: `scratch/m4-retune/handoff-T3h/cand/b.csv`, the same file HoE used.
  - The copy is `inputs/b.csv`, mode 0444, outside the worktree.
- Seeds 1–200 (200 seeds), workers T 14400 s; no-workers runs 3600 s, as the harness defines. Defaults only, with `--out` set to my evidence folder.
- Worktree: `qa/wt-l30plus-729565e9`, detached at 729565e9, `npm ci` run (87 packages). Node v20.19.2, npm 11.21.0.
- Command: `npm run measure:l30plus -- <qa>/inputs/b.csv --out <qa>/out/run1`.

## L0–30 byte-exact (G7)
- **New baseline c7bb783f** (product/economy.csv, sha256 c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44, 123 columns, D-HOP-25): **FAIL, 3 cell diffs, all on the L30 row. L0–29 are byte-identical after projecting b.csv onto the 123 kept columns. L0–11 PASS.**
- **Old baseline b48be8a4** (main dd223f5 data/economy.csv, sha256 b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857, 125 columns): **FAIL, the same 3 cells.** My independent Python diff agrees with the harness's own L0–30 line.
- The 3 L30 cells, written baseline → b.csv:
  - `farm_cost` 624316 → 330194
  - `hens_cost` 94319 → 74005
  - `egg_value_cost` 249339 → 133856
- Cross-check: c7bb783f is b48be8a4 with `guard_heartbeat_s` and `guard_stale_s` removed. The column order is otherwise the same, and there are 0 value diffs on the 123 shared columns.
- b.csv has 31 + 25 rows (L0–55) and 133 columns. It still carries the 2 guard columns and 8 added columns.

## Anomalies and notes
1. **The harness's built-in L0–30 diff uses the repo's `data/economy.csv` at HEAD** (b48be8a4, 125 columns), not c7bb783f. For c7bb783f the harness line is not the G7 evidence; my separate diff is.
2. `product/economy/gates.md` v1 still names b48be8a4 in G7. The D-HOP-25 amendment to c7bb783f is not in that file yet.
3. **G10 heads-up (not evaluated here):** b.csv carries columns that `csv-column-allowlist.md` (D-HOP-25) lists as dropped: guard_heartbeat_s, guard_stale_s, farm_ms_price_mult, feed_mill_price_mult, auto_collect_every_s, contracts_manual_bonus, farm_max_level and hv_extra_second_markup. `hv_extra_cost_farm_share` is neither on the allowlist nor in the dropped list. `start_coop_eggs` is allowlisted.
4. 729565e9 is **only on the local branch `tmp/cand-b-l30code`**; it is on no remote branch. PR #51's head is d90a19d, which carries the harness and docs only and does not contain 729565e9. The #45 commit SHAs differ from the ones in the harness doc's cherry-pick recipe (20bf1d3 and others), because they are different commits for the same content line.
5. Determinism: I ran once. My run is byte-identical to HoE's earlier, separate run, which is evidence of cross-run determinism. I did not do a second self-rerun.
6. `npm ci` warned that the esbuild postinstall is "not yet covered by allowScripts". esbuild 0.21.5 still works and the run completed.
7. A run that is not mine (`/workspace/wt-arch-m41-unlock`, b.csv → scratch/.../b84bd0b70-b7e5ffb) was active at the same time. I left it alone.

## Not run
- G4 (no-affordable-purchase stretch), G6 (acw1), G8 (sync + strict, apart from the harness's in-memory build and validateBalance, which came back OK), G9 and G10: these are out of scope for the warm-up, and the harness does not report G4 or G6.
- The full gates.md G1–G10 card waits for Economy's candidate (due 17:15).
- No second determinism rerun, no browser, no vitest.

The worktree `qa/wt-l30plus-729565e9` is kept, clean, for the real rerun. No servers or processes of mine are running.
