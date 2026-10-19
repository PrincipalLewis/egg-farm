# Parked work

## PR #45 — L30+ (rc/m4-t3-l30plus), parked for the next release (HoE, 2026-10-19 ~04:47 Europe/Belgrade)

### State at parking
- #45 head `043aedb2cff829303a242ace7771fec04ee074c8` (includes Saves PR #47 via merge `3cfcb209`). Nothing more to be pushed to rc/m4-t3-l30plus until it's unparked.
- Per-level coop capacity table: `bd3e527` (D-HOP-10).
- Per-track clamp at 55 (Farm max 50, Hens/Egg value 55): `408a589`.
- Landing script: `/workspace/egg-farm-studio/scratch/m4-retune/land-l30-data.sh` (+ `land-l30-edit.py`). It lands the data delta (staging CSV 625452d4) after the code in one rerun.
  - Usage: `land-l30-data.sh [-C <worktree>] [--ruling D-CEO-20261019-04|D-CEO-20261019-08] [--skip-browser] [--commit] [--push] <csv> <csv_sha256_prefix> <seller_variance.json> <fixture_sha256_prefix>`
  - What it does: verifies both shas, copies the CSV to data/economy.csv and vendor/economy-sim/economy.f1-m4cols.csv, updates vendor SOURCE + SHA256SUMS, copies the fixture, edits allowlists/tests via land-l30-edit.py, runs sync, and re-pins the M4-on golden (2 identical runs required). It then runs every gate and writes `$LOG/summary.txt` (default `/tmp/land-l30-<timestamp>`).
  - The step gate is always on; `--ruling` only picks the thresholds (default D-CEO-20261019-04). Nothing is committed or pushed without `--commit` / `--push`, and push is a normal push, never force.
- Dry run: worktree `/workspace/wt-arch-l30-dry`, branch `tmp/l30-dry` (local, unpushed), with the parameterized L30+ step test (gate taken from the `STEP_GATE` ruling env).

### (a) CCR findings — engineering/reviews/pr45-a99f4e3.md (verdict BLOCKER: B1, M1-M2, m1-m5)
- **B1 (Blocker)** `tests/l30plus.test.ts:14` reads `data/staging/economy.l30plus.csv`, which isn't in the tree, so the whole suite errors (also Saves M4: 0 tests collected). It's the only test of `trackExtraCost` (D8 surcharge, ×1.10 second level), the per-row caps `capOverFarmAt` and the L30+ fxArrow behaviour. Fix: build from `costTable` / the live CSV and add a nonzero test-count assertion.
- **M1 (Major)** `scripts/sync-economy.ts` `buildBalance` fits/verifies CSV rows only up to farmMaxLevel (L50). `trackEggsPerSec` extrapolates H51-55 from the Farm formula, but offline reads the CSV rows (`m4.offline`), so the in-tab rate and offline can silently disagree for L51-55. Repro: CSV L55 eggs_per_sec=999999 doesn't make sync throw, and in-game eps@H55 is still 56. Fix: carry per-row eps for Hens in fitM4, or verify rows above Farm max against the formula.
- **M2 (Major)** The flag-off pin (FLAGOFF_BALANCE hashes everything outside m4) breaks once the 56-row CSV moves maxLevel 30→50 plus the farm/collection tables. A strict D-CEO-05 "flag-off byte-identical" fails. Needs an HoE ruling before the data delta: can flag-off change, or must it stay frozen?
- **m1** `0efda7d` sync collects `demandDrift` for L31-50 but never prints or throws it, so CSV demand for those rows is silently replaced by the formula. At minimum, log it.
- **m2** `tests/bot-m4.ts:43` and `tests/m4a-pacing.test.ts:19` price tracks with `trackCost` and ignore the extra-level surcharge, so pacing bots underprice levels above F+3. Unused `trackCost` import in `src/ui/tracks-ui.ts:5`.
- **m3** `milestoneHint` (`tracks-ui.ts:69`) stops at `b.maxLevel` (Farm 50), not the track max, so no hint shows at L50-54. `priceMatchedV` (migrate-v7) also searches V only up to Farm max. Harmless today.
- **m4** fxArrow also changes the flag-off Farm/Collection row code (`app.ts:448`). Nothing visible changes, but test:flagoff doesn't cover the UI. Note it in the PR body.
- **m5** Pre-existing: save validate (`save.ts:209-210`) doesn't check hensLevel/eggValueLevel. A corrupt non-numeric level gives NaN cost and price. Add an integer ≥0 check.

### (b) Pacing — L30+ step gate fails on our code
- T3b `f158e258`: P95 step ratio 2.710, worst 3.029 (seed 121) vs gate P95 ≤2.00 / worst ≤2.25.
- Economy's best track-only retune, T3c `2053526a`: 2.691, still failing.
- 2×2 diagnosis on T3b: coop table on/off × clamp 55/50 all give an identical P95 2.710 and worst 3.029 (seed 121). Our code isn't the cause; it's the farm_cost data.
- Driver: farm_cost jumps at L34 (×1.75), L39 and L49. Needs farm_cost smoothing (ruling to reopen farm rows) or a gate waiver.

### (d) Dry-run follow-ups (tmp/l30-dry)
- The flag-off no-m4 balance hash can't match `7fdb273` once maxLevel is 50 (= CCR M2; needs a ruling).
- The AC6 test "every economy.csv cell from formulas" needs scoping: rows 0..50, demand to L30, coop from the per-level table (44 failures today).
- check-economy-copy --strict needs `product/economy.f1-m4cols.csv` updated by Economy.
- Two-bot ±20% agreement: passes 7/7.
- The demand-rewritten CSV passes sync.
