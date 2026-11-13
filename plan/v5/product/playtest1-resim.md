# Playtest 1 re-sim: P1 / P3 / P4 (Economy/Balance Designer, 2026-10-15 23:37 UTC+2)
Scope: sim variants only. `economy.csv`, `balance.json` and engineering files are untouched. Workers stay frozen at v1.1.
Script: `product/sim/m2_validation/pt1_resim.py` (100 seeds, 0–99). Raw output: `product/sim/m2_validation/pt1_resim_out.md`.

**Regression check (done first):** `m2val9.py` still matches `m2table_v9.md` byte-for-byte (seller15 v1.1 F25 62.2, worst step 5.8; cheapest 7.8; casual 12.3/30.7; Manage 1.25/15 min). The `economy_sim.py --config current` M1 report is byte-identical to the pre-change copy, and `write_csv_v11` still reproduces `economy.csv` exactly.

**Sim changes (all opt-in; default behaviour unchanged):**
- `Eco`: `iv_scale` shortens the customer interval. `_k` now uses the **base** interval, so P1 order size = 0.4–0.8 × eggs/s × base interval. `rate_l0` overrides L0 eggs/s.
- `run_m2`:
  - P4 flags: `manage_at`, the energy threshold (default = `tired_below`, as before), and `manage_all_low_only`.
  - New diagnostics: `qfull_ticks`, `filled`.
  - Latent crash fixed: `wage_min` broke whenever a worker went Unpaid while the Grader was hired, because W4 is a tier list. W4 has no wage, so the fix returns 0 for it. It first appeared under P1 and does not change any baseline number. It is Python-only; Engineering may want to confirm the build has no equivalent bug.

## Variant definitions
- **P1**: demand uniform int [ceil(0.4k), ceil(0.8k)], k = eggs/s × base interval. `customer_interval_s` ×0.5, rounded to 2 dp (floor 3 → 1.5). Queue cap and patience are unchanged.
- **P3**: L0 eggs/s 1.0 → 1.5, at **L0 only** (a "starter nest" +0.5 eggs/s). L1+ and hens are unchanged.
  - Why: this is the simplest change. Raising `egg_rate` or `hens_base` would shift every level, and hens = 7.5 isn't an integer.
  - Trade-off: L0 breaks the `eggs/s = 0.2 × hens` formula. economy.md needs a one-line exception.
- **P4**: Manage fires only when a worker is at or below 40% (`yawn_at_pct`). Manage all needs at least 3 workers at or below 40% and refills only those; otherwise Manage refills the lowest worker. Free, 30 s shared cooldown.
- **P1q** (compensation, see below): P1 plus `queue_max` = min(10, 6 + floor(F/5)). That gives about 2× the slots, so the queue holds the same number of eggs as baseline.
- **pat60** (compensation tried): P1 with patience 30 → 60 s. **It has no effect**, because the losses come from arrivals into a full queue, not from timeouts (partial% ≈ 0).

## Results: M1 AC7 / AC7-soft (run(), 30 min; casual 60 min)
| variant | seller15 L@10m (8–12) | L@30m (14.4–21.6) | upg@5m min (≥9) | cheapest @10/@30 (≥70%) | casual F10≤15m | casual F18≤45m (med) | verdict |
|---|---|---|---|---|---|---|---|
| baseline | 10 | 18 | 10 | 80% / 94% | 95/100 | 100/100 (39.3) | PASS |
| P1 | 9 | 17 | 9 | 89% / 94% | **0/100** | **0/100 (60.0)** | AC7 pass, **AC7-soft FAIL** |
| P1+P3 | 9 | 17 | 11 | 89% / 94% | **0/100** | **0/100 (60.0)** | **AC7-soft FAIL** |
| P4 | 10 | 18 | 10 | 80% / 94% | 95/100 | 100/100 (39.3) | PASS (M1 unaffected) |
| P1+P3+P4 | 9 | 17 | 11 | 89% / 94% | **0/100** | **0/100 (60.0)** | **AC7-soft FAIL** |
| P1+P3+P4 pat60 | 9 | 17 | 11 | 89% / 94% | 0/100 | 0/100 (60.0) | FAIL (patience doesn't help) |
| P3 | 10 | 18 | 12 | 90% / 94% | 100/100 | 100/100 (38.3) | PASS |
| P1q | 10 | 18 | 10 | 80% / 94% | 100/100 | 100/100 (35.3) | PASS |
| P1q+P3 / P1q+P3+P4 | 10 | 18 | 12 | 90% / 94% | 100/100 | 100/100 (34.3) | PASS |

## Results: M2 Workers v1.1 (run_m2, 120 min, managed unless noted; seller15 / cheapest / casual)
AC-W1 needs F10≤15m in ≥95/100 and F18 median ≤40. AC-W4 needs seller15 worst step ≤6 min; AC-W4b needs cheapest ≤8. AC-W5 needs Manage ≥1 per 15 min.

| variant | W1 F10≤15m s/c/casual | F18 med s/c/casual | W4 | W4b | W5 Manage/15m | F25 s managed / unmanaged | inc@F21 managed÷unmanaged (s) | $/s first 2 min (s) | verdict |
|---|---|---|---|---|---|---|---|---|---|
| baseline | 100/100/98 | 29.0/32.2/30.7 | 5.8 | 7.8 | 1.25 | 62.2 / 86.0 | 1.67 | 1.29 | PASS |
| P1 | 100/100/**86** | 29.0/32.2/32.0 | 5.8 | 7.8 | 1.25 | 62.2 / n/r | 2.81 | 1.29 | **casual W1 FAIL** |
| P1+P3 | 100/100/100 | 28.0/31.2/30.7 | 5.8 | 7.8 | 1.25 | 61.5 / n/r | 2.80 | 2.10 | PASS (unmanaged and M1 degrade) |
| P4 | 100/100/98 | 29.0/32.2/30.7 | 5.5 | 7.5 | **5.62** | 62.2 / 86.0 | 1.67 | 1.29 | PASS |
| P1+P3+P4 | 100/100/100 | 28.0/31.2/30.7 | 5.8 | 7.5 | 5.62 | 61.2 / n/r | 2.80 | 2.10 | PASS (M1/unmanaged degrade) |
| P3 | 100/100/99 | 28.2/31.2/29.7 | 5.8 | 7.8 | 1.25 | 61.5 / 85.2 | 1.67 | 2.11 | PASS |
| P1q | 100/100/100 | 29.0/32.2/30.3 | 5.8 | 7.8 | 1.25 | 62.2 / 86.0 | 1.67 | 1.29 | PASS |
| P1q+P3 | 100/100/100 | 28.2/31.2/29.2 | 5.8 | 7.8 | 1.25 | 61.5 / 85.2 | 1.67 | 2.11 | PASS |
| **P1q+P3+P4** | 100/100/100 | 28.2/31.2/29.2 | 5.5 | 7.5 | 5.62 | 61.5 / 85.2 | 1.67 | 2.11 | **PASS** |

Slow tapper (info): baseline managed F18 30.5, worst step 6.0. P1q+P3+P4 managed F18 29.5, worst step 6.0, 1.39 $/s. P1+P3+P4 M1 F10 is 19.5 min (0/100 within 15).

## Queue diagnostics (seller15, median of 100)
| variant | scen | queue-full time % | arrivals lost to full queue % | lost % | partial % | orders fully filled % |
|---|---|---|---|---|---|---|
| baseline | M1 | 30.3 | 16.2 | 16.2 | 0.1 | 83.5 |
| baseline | managed | 64.9 | 32.0 | 32.1 | 1.0 | 66.7 |
| P1 | M1 | **47.3** | **42.9** | 42.9 | 0.0 | **57.1** |
| P1 | managed | 64.0 | 32.6 | 32.6 | 0.0 | 67.3 |
| P1q | M1 | 23.1 | 16.0 | 16.0 | 0.2 | 83.8 |
| P1q | managed | 63.0 | 31.9 | 31.9 | 1.7 | 66.2 |
| P1q+P3+P4 | managed | 61.6 | 32.1 | 32.1 | 1.6 | 66.0 |
(casual: baseline M1 24.2% full / 74.9% filled; P1 53.1 / 45.4; P1q 17.9 / 80.7.)

Why P1 fails: halving each order while keeping 3–5 slots halves the eggs the queue can hold. At 15–20 s sell visits, the basket outgrows the queue, eggs pile up unsold and income falls. Patience does nothing, because customers aren't timing out. Doubling the slots restores the old egg capacity, and pacing comes back to baseline.

Caveat on the playtest complaint: for a managed player the queue is still full ~62% of the time under every variant. That's by design: the Hawker adds ×1.25 demand, and workers keep it saturated. P1 fixes order *size* (L15 orders 60–119 → 30–60, so each order now completes), not saturation. P2 (cards show the full-order value and progress) is still what removes the "stuck" read.

## Flags: >5% moves vs baseline (AC7 / AC-W metrics)
- **P1**:
  - M1 seller15 F18 28.0 → 34.5 (+23%); F25 90.8 → n/r.
  - AC7 L@10m 10 → 9 (−10%), L@30m 18 → 17 (−6%); both still inside ±20%.
  - Casual AC7-soft F10 13.7 → 19.3 (+41%), **FAIL**.
  - Casual managed W1 98 → 86/100, **FAIL**.
  - M1 lost customers 16 → 43%.
  - Unmanaged F25 no longer reached, so the managed/unmanaged ratio jumps 1.67 → 2.81.
  - Pattern-identical with P3 and P4 added. **Do not ship P1 as written.**
- **P3**:
  - upg@5m 10 → 12 (+20%, in the good direction).
  - M2 F10 10.8 → 10.0 (−7%); M1 seller F10 10.0 → 9.2 (−8%).
  - Cheapest @10m ratio 80 → 90%.
  - First-2-min income 1.29 → 2.11 $/s (+64%).
  - F18/F25 within 3%.
- **P4**:
  - Manage/15 min 1.25 → 5.62 (+350%; still passes ≥1). Manage now fires at 40% instead of 30%, and Manage all no longer refills full workers, so refills stagger.
  - W4 5.8 → 5.5 (−5%), W4b 7.8 → 7.5 (−4%).
  - No pacing change otherwise.
  - UX note: ~1 tap per 2.7 min, each one after a yawn cue. That's more frequent than today, but every tap is a reaction to a cue. If Product wants fewer taps, a follow-up could have Manage all fire at ≥2 yawning workers.
- **P1q**:
  - Casual AC7-soft F18 39.3 → 35.3 (−10%), F10 13.7 → 12.3 (−10%), in the good direction.
  - Casual unmanaged now reaches F25 in 92/100.
  - Everything else within ±1%.
- **P1q+P3+P4**:
  - Combines the P3 and P4 flags plus the casual gain: casual F18 30.7 → 29.2 managed (−5%), 39.3 → 34.3 in M1 (−13%).
  - seller15 AC-W, AC7 and F25 all within ±1–3%.

## CSV diffs each variant would need (not applied)
- **P1 alone:** `customer_interval_s`, `demand_min`, `demand_max` on all rows. Values are in the table below; at L0 without P3, demand is 4–8.
- **P1q:** P1 plus `queue_max` on all rows (table).
- **P3:** L0 row only:
  - `eggs_per_sec` 1.0 → 1.5
  - `offline_eggs_per_sec` 0.25 → 0.38
  - `offline_max_eggs_2h` 1800 → 2700
  - `demand_min/max` 8/16 → 12/24 without P1, or 6/12 with P1.
  - `hens` stays 5, and economy.md documents the L0 starter-nest exception.
- **P4:** no column change. The rule uses the existing `yawn_at_pct`=40 as the Manage enable threshold, and `manage_all_min_workers`=3 now counts workers ≤ `yawn_at_pct`. It's a rule change in workers spec §8 plus a build change.

Full per-level diff for P1q+P3:
| level | customer_interval_s | demand_min | demand_max | queue_max (P1q only) | demand_min/max with P1 but no P3 (L0) |
|---|---|---|---|---|---|
| 0 | 10.0 → 5.0 | 8 → 6 | 16 → 12 | 3 → 6 | 4–8 |
| 1 | 9.5 → 4.75 | 16 → 8 | 31 → 16 | 3 → 6 | (same) |
| 2 | 9.03 → 4.51 | 22 → 11 | 44 → 22 | 3 → 6 | (same) |
| 3 | 8.57 → 4.29 | 28 → 14 | 55 → 28 | 3 → 6 | (same) |
| 4 | 8.15 → 4.08 | 33 → 17 | 66 → 33 | 3 → 6 | (same) |
| 5 | 7.74 → 3.87 | 38 → 19 | 75 → 38 | 3 → 7 | (same) |
| 6 | 7.35 → 3.67 | 42 → 21 | 83 → 42 | 3 → 7 | (same) |
| 7 | 6.98 → 3.49 | 45 → 23 | 90 → 45 | 3 → 7 | (same) |
| 8 | 6.63 → 3.31 | 48 → 24 | 96 → 48 | 3 → 7 | (same) |
| 9 | 6.3 → 3.15 | 51 → 26 | 101 → 51 | 3 → 7 | (same) |
| 10 | 5.99 → 3.0 | 53 → 27 | 106 → 53 | 4 → 8 | (same) |
| 11 | 5.69 → 2.85 | 55 → 28 | 110 → 55 | 4 → 8 | (same) |
| 12 | 5.4 → 2.7 | 57 → 29 | 113 → 57 | 4 → 8 | (same) |
| 13 | 5.13 → 2.56 | 58 → 29 | 115 → 58 | 4 → 8 | (same) |
| 14 | 4.88 → 2.44 | 59 → 30 | 118 → 59 | 4 → 8 | (same) |
| 15 | 4.63 → 2.31 | 60 → 30 | 119 → 60 | 4 → 9 | (same) |
| 16 | 4.4 → 2.2 | 60 → 30 | 120 → 60 | 4 → 9 | (same) |
| 17 | 4.18 → 2.09 | 61 → 31 | 121 → 61 | 4 → 9 | (same) |
| 18 | 3.97 → 1.99 | 61 → 31 | 121 → 61 | 4 → 9 | (same) |
| 19 | 3.77 → 1.89 | 61 → 31 | 121 → 61 | 4 → 9 | (same) |
| 20 | 3.58 → 1.79 | 61 → 31 | 121 → 61 | 5 → 10 | (same) |
| 21 | 3.41 → 1.71 | 61 → 31 | 121 → 61 | 5 → 10 | (same) |
| 22 | 3.24 → 1.62 | 60 → 30 | 120 → 60 | 5 → 10 | (same) |
| 23 | 3.07 → 1.53 | 59 → 30 | 118 → 59 | 5 → 10 | (same) |
| 24 | 3.0 → 1.5 | 60 → 30 | 120 → 60 | 5 → 10 | (same) |
| 25 | 3.0 → 1.5 | 63 → 32 | 125 → 63 | 5 → 10 | (same) |
| 26 | 3.0 → 1.5 | 65 → 33 | 130 → 65 | 5 → 10 | (same) |
| 27 | 3.0 → 1.5 | 68 → 34 | 135 → 68 | 5 → 10 | (same) |
| 28 | 3.0 → 1.5 | 70 → 35 | 140 → 70 | 5 → 10 | (same) |
| 29 | 3.0 → 1.5 | 72 → 36 | 144 → 72 | 5 → 10 | (same) |
| 30 | 3.0 → 1.5 | 75 → 38 | 149 → 75 | 5 → 10 | (same) |

## Recommendation
1. **Reject P1 as written.** It fails AC7-soft (0/100) and casual AC-W1 (86/100), and patience doesn't fix it.
2. **Adopt P1q instead**: half-size orders, half interval and **double queue slots** (min(10, 6 + floor(F/5))). Pacing is within ±1% for seller15 and cheapest, and the casual player improves.
   - Needs: Farm/PM Farm Upgrades sign-off on `queue_max` (P2 Farm ruling owner), and Art & UX confirmation that 6–10 order cards fit at 375px. If the cards don't fit, show a compact "+N waiting" count past 5 cards. That's UI only; the sim depends only on the slot count.
3. **Adopt P3** (L0 = 1.5 eggs/s, L0 only). First-2-min income goes 1.29 → 2.11 $/s with no AC breaks. The flags are faster early pacing (−7–8% F10) and more early upgrades (12 by 5 min).
4. **Adopt P4.** Every AC-W still passes. Product should know the Manage tap rate rises to ~5.6 per 15 min, all cue-driven.
5. Ship together as **P1q+P3+P4**. Every AC passes, and seller15 AC7/AC-W moves ≤5% apart from the flagged P3 early-pacing items. P2 (UI) is still needed to fix the "$0.00 / always full" read.
