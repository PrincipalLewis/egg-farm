# PR #38 feat/market-hand-min-wait @ fe33db2 — QA recheck (follow-up to c05c83a)
Date: 2026-10-17 ~10:00 CEST. fe33db2 = c05c83a + 1 commit on main 8e6d53e. Scratch worktrees /tmp/mw-fe33 and /tmp/mw-fe33w3 (CSV=3), both removed afterwards. Nothing was pushed. Evidence: min-wait-pr38-fe33db2/.

## Verdict: PASS (no Blocker/Critical/Major). MK-59a: **PASS**. One Minor (stale test comment).

| # | Check | Result |
|---|---|---|
| 1 | Wages on held or empty-queue turns, identical to main | PASS |
| 2 | Min wait comes from data and is exactly 2.000 s; CSV=3 gives 3.000 s | PASS |
| 3 | s2-3a matches MK-21 wording; re-measured fractions | PASS (+Minor) |
| 4 | npm test (sync-economy --check + vitest, 2 forks) 58 files / 604 tests; tsc; build | PASS |
| 5 | MK-59a 400 paired seeds + always-required checks | PASS |
| 6 | rc0 browser | NOT RUN (lane 1 busy with Cut A) |

## 1) Wages
- In tick.ts the hold gate is removed. Market Hand takes its turn and is paid every every_s; only serving is gated through servable().
- Fixed-state check (wagefix.ts): Market Hand only, 600 s, seeds 1/2/3/7/99 × L5/12/20, with three scenarios: busy, empty queue (forced) and a 5-egg basket. The per-tick wage lists (tick:cents, sha1) are **byte-identical to main 8e6d53e in all 45 cases**. The empty-queue case is paid 600 wages in 600 s at every_s = 1, the same as busy (wagefix-main.txt and wagefix-fe33.txt).
- Progression harness, 400 paired seeds: Market Hand wage events total 1,344,602 vs 1,344,614 on main (−0.001%), and wage cents differ by −0.000%. 399/400 seeds have the same count. One seed is −12 because the player's purchase path diverges, not because turns are held.
- The tests assert that wages are charged: the empty-queue test checks `wages.length == 10/every_s` and the coins debit. The 1.99 s test checks `wages.length == 1` and that cdS resets. The cadence test checks paid ticks [1,11,21] and sold [11]. The MK-57 timeout test checks `wages.length == 1`.

## 2) Min wait from data
- economy.csv `market_hand_min_wait_s` → sync-economy → balance.json `min_wait_s: 2` → `servable()`. There is no literal 2 in the sim. `sync-economy --check` reports "balance.json up to date".
- CSV=2: 5,520 Market Hand sells, shortest wait **2.000 s** (dwell-csv2.txt).
- CSV=3 (scratch, `npm run sync-economy`, balance 2→3): 5,515 sells, shortest wait **3.000 s** (dwell-csv3.txt).

## 3) s2-3a / MK-21
- The test now uses `b.feel.served_dwell_ms` (1500) and checks ≥0.40 at L10, L12 and L14 over 60 s. No-dwell L12 over 120 s is checked within [0.40, 0.90]. The seed loop is gone (seed fixed at 7) and the comment no longer quotes 88–99%.
- Re-measured on fe33db2 (vis-fe33.txt; spread across 20 seeds is still zero):

| scenario | c05c83a | fe33db2 | bar |
|---|---|---|---|
| L10 / L12 / L14, dwell 1500, 60 s | 0.835 each | **0.835 / 0.835 / 0.835** | ≥0.40 |
| L12, dwell 0, 120 s | 0.683 | **0.824** | [0.40, 0.90] |
| L10 / L12 / L14, dwell 0, 60 s | 0.567 / 0.625 / 0.688 | 0.607 / 0.745 / 0.792 | (info) |

- **Minor M1:** the new test comment says "the game gives ~57-69%". That was c05c83a. On fe33db2 the figure is 61–82% (no dwell, 60 s) and 0.824 at the test point. Suggest changing it to "~61-82%".
- Note: the no-dwell upper margin is now 0.076 (0.824 vs 0.90). It is deterministic, so not flaky, but a small balance change could trip it.

## 4) Gates
- `npm test`: sync-economy --check OK; 58 files / 604 passed; exit 0 (unit.txt).
- `tsc --noEmit`: exit 0 (tsc.txt).
- `npm run build`: check, tsc, vite build and check-release-build all OK, exit 0 (build.txt).

## 5) MK-59a verdict (HoP merge condition): **PASS**
Harness: mk59a-harness (shipped src/sim, seller15, game RNG, 0.1 s ticks, 3,600 s), extended to record wages and income (harness2.ts). Seeds 1–400 are paired for fe33db2 and main 8e6d53e, and served % is taken per arrival level (analyze.py, mk59a-400.txt).
- **L20 mean diff (fe33 − main) = +0.029 pp, SD 0.47, SE 0.024, lower 95% bound −0.017 ≥ −2.0 → PASS.**
- Guard L3–L25: the most negative mean is L12 at −0.121 (SD 2.81). **No level trips (< −2.0), so no 1,600-seed rerun is needed.**
- Re-measured paired SDs (fe33 vs main): L20 0.47; max L12 2.81; L3–L7 0.00. That is far below the c05c83a SDs (6.57 / 17.8), because the turn cadence now matches main. 395/400 seed records are byte-identical to main.
- Always-required checks:
  - Wage/min unchanged: −0.001%.
  - Income/min: +0.000% total, per-seed mean 0.000%, well within ±0.5%.
  - F2 median Market Hand sale ≥ 8: **not measurable**. Market Hand unlocks at Farm 3 (`unlock_farm: 3`), so there are 0 Market Hand sales at F2 in both builds.
- Observation: once the turn cadence is unchanged, the 2 s min wait barely affects progression in this harness, because Market Hand rarely meets a customer younger than 2 s at its turn. This answers the MK-59 wage question. The hold-build comparison is a separate item.

## Repro
1. `git worktree add --detach /tmp/mw-fe33 fe33db2` (main: /tmp/mw-main @ 8e6d53e).
2. `REPO=<wt> vite-node min-wait-pr38-fe33db2/harness2.ts -- 1 200 x-a.json`, then the same for 201 400.
3. `python3 analyze.py main-a.json,main-b.json fe-a.json,fe-b.json`.
4. `REPO=<wt> vite-node wagefix.ts`, then diff the two outputs.
5. Run dwell.ts and vis.ts against the worktree.

## Not run
- rc0 in a browser with the runtime build-id m3-rc1-pre+fe33db2: lane 1 was held by Cut A. Engineering reports Chromium 212/212.
- test:slow, check-globals, axe.
- F2 Market Hand sale median: structurally not measurable, see above.
- 1,600-seed reruns: not needed, no trips.

## HoP 09:50 redefinition
The F2 check is redefined as the median Market Hand sale size at **F3**, the first level with Market Hand, which must be ≥ 8 eggs. It is measured on fe33db2, with main for comparison. Method: the same 400-seed harness (seeds 1–400, seller15, 3,600 s), with every `sell` event `by: 'market_hand'` counted while farmLevel == 3, and sale size = k eggs (harness3.ts, f3-*.json, f3-income.txt). The worktree was recreated and then removed.

| build | sales (n) | seeds with sales | p25 | median | min / max |
|---|---|---|---|---|---|
| fe33db2 | 11,290 | 388 / 400 | 3 | **4** | 1 / 28 |
| main 8e6d53e | 12,385 | 388 / 400 | 3 | 4 | 1 / 28 |

- **F3 check: FAIL against the ≥ 8 bar (median 4).** **It is not a regression:** main gives the same median 4 and p25 3. The min wait doesn't change sale size at F3; fe33db2 has 8.8% fewer F3 sales because some customers are served by the player instead. The bar or its definition needs a ruling from HoP/Economy. It doesn't measure anything PR #38 changes. If the HoP ruling makes it a merge gate, it blocks main as well.
- **Income/min (exact):** total sale value over 400 seeds × 60 min was main 53,997,650,059¢ vs fe33db2 53,997,671,742¢, a difference of +21,683¢ (**+0.000040%**). Per seed that is main 2,249,902.09¢/min vs fe33db2 2,249,902.99¢/min, within ±0.5%: PASS.

## HoP re-ruling (2026-10-17 09:52 Europe/Belgrade)
- F3 median-sale bar = no regression vs main at Farm L3 (median and p25 not lower). fe33db2 4/3 vs main 4/3: PASS. Income/min +0.000040%: PASS.
- **PR #38 @ fe33db2: clear to merge (HoP).** The stale comment (M1) is a follow-up. The absolute >=8 target is a separate Economy design item and doesn't block.
