# F1 mid-game stall fix: Farm Upgrades review · 2026-10-16 02:40 (UTC+2) · PM, Farm Upgrades
Input: product/f1-proposal.md, candidate `product/economy.f1.csv` (farm_cost ×1.25 on L6–14, ×1.45 on L15–20, ×1.35 after; w4_tier_cost follows). Canonical files are untouched, nothing is merged, and no messages were sent.
Runs:
- `ECON_CSV=../economy.f1.csv python3 farm_stress_sim.py --seeds 200 --long-seeds 50` → `sim_results_f1.txt` (compare `sim_results_final.txt`).
- Per-level steps: `levels_check.py` (30 seeds × 6 h; seller15, casual = Poisson + 20 s + −25%, cheapest, −25% demand, 20 s seller) → `levels_final.txt`, `levels_f1.txt`, `levels_f1-alt{1,2,3}.txt`.
- F7: `hint_check_f1.txt`. Alternatives: `make_f1alt.py` → `economy.f1-alt{1,2,3}.csv` (farm_cost re-segmented, w4_tier_cost = floor(0.5 × farm_cost at tier L18/19/21/22/24); rebuilding F1 with it reproduces economy.f1.csv cell-for-cell).
Note: my sim is the M1 model (no Workers). Economy's 9.2 / 20.5 come from the M2 run with Workers managed (Hawker 800 coins at L9 plus wages), which is why mine are 0.7 min faster at L10 and L18 (8.5 / 19.8). The direction and size of the effects match.

## 1. Times (p50 min, final → F1)
| Scenario | L5 | L10 | L15 | L18 | L20 | L25 | L30 |
|---|---|---|---|---|---|---|---|
| seller15 | 4.8→4.8 | 9.2→**8.5** | 17.5→13.2 | 27.2→**19.8** | 37.2→26.8 | 90.0→71.5 | 243.8→196.5 |
| cheapest | 6.0→6.0 | 10.8→9.5 | 19.8→15.2 | 30.5→22.0 | 45.0→32.0 | 108.8→79.8 | 293.5→217.0 |
| active (1 s) | 4.5→4.5 | 8.9→8.1 | 17.1→12.6 | 26.9→19.2 | 36.7→26.1 | | |
| casual 20 s | 4.7→4.7 | 9.3→8.7 | 17.7→13.3 | 27.3→20.0 | 37.3→27.0 | | |
| demand −25% | 5.2→5.2 | 10.2→9.2 | 19.2→14.5 | 30.0→21.8 | n/r→29.2 | | |
| worst combo (AC7-soft casual) | 5.7→5.7 | 11.3→10.0 (max 14.0→12.7) | 21.3→16.0 | 34.0→24.3 | n/r→33.7 | | |

## 2. Farm checks
- **Targets (AC7: L10 at 10 min, L18 at 30 min, ±20% on times → L10 8–12, L18 24–36 min):**
  - L10 8.5 passes, but sits near the 8.0 floor (Economy: 9.2).
  - **L18 19.8 fails the time band** (Economy 20.5; band floor 24.0).
  - F1 passes only if AC7 is read as "Farm level at 30 min" (L20 vs 18 ±20% = 14.4–21.6). The proposal reads it that way and calls AC7 "a floor". The core-loop wording says ±20% on times. **HoP must rule which reading applies.**
- **Per-level steps (seller15, s to reach L):**
  - final: L6–15 = 45 60 30 60 75 60 90 105 90 150
  - F1: L6–15 = 45 60 30 45 45 45 60 45 75 60
  
  F1 fixes the L12–15 stall (90–150 s → 45–75 s). L5–14 dwell is 30–75 s; L7→8 is 30 s, the same as today.
- **Dead zones over 3 min:**
  - final: first at L17→18 (255 s), 13 levels over 180 s.
  - F1: first at L18→19 (225 s), 12 levels. L15–18 steps are 60/90/135/165 s, all under 3 min.
  - Casual: final first at L16, F1 first at L18. Cheapest: final first at L16, F1 first at L18.
- **Step ratio (step vs previous step, seller15):**
  - L2–18 max 1.67 (final 2.00); L19–30 max 1.77 (final 1.79). Cheapest L19–30 is 2.37 (final 2.28).
  - My ratios are noisier than Economy's because Collection buys alternate with Farm buys. Compare relatively: F1 is no worse than today.
- **Coop looks:** L5 4.8 (unchanged), L10 8.5 (was 9.2), **L20 26.8 (was 37.2)**. Tier 4 arrives about 10 min earlier. That's acceptable, but L10 → L20 is now an 18-min gap instead of 28.
- **Late curve and Workers handoff:**
  - Costs from L20 on are 23% lower, so L25 is 71.5 (was 90.0) and L30 196.5 (was 243.8).
  - Every "×current income needed for a 3-min step" figure in late-curve-for-workers.md drops by about 23% (e.g. F30 ×12.5 → about ×9.6).
  - W4 tier costs drop 23–33% automatically. PM Workers should re-check W4 pricing value (no parameter changes asked).
  - The handoff note needs a refresh after merge.
- **F7 hint:** median error for seller15 is 9.7% (final 10.8%), active 3.8%, casual 18.5%. No regression; the QA oracle is still the steady-income bot.
- **Casual and −25%:**
  - AC7-soft improves: L10 10.0 (≤15), L18 24.3 (≤45).
  - −25% L10 9.2, L18 21.8.
  - Both get faster, and the −25% L10 edge (was 11.2–11.5 on M1-R1) is now comfortable.
- **F1–F6 spec ACs:** F1 must be re-baselined to the new farm_cost column. F2–F6 are unaffected. F8 (queue) is unaffected.

## 3. Alternative L15–20 segments (L6–14 kept at ×1.25)
| Table | Segments | seller15 L10 / L15 / L18 / L20 / L25 / L30 | L15–18 steps s | first >180 s | casual L18 | cheapest L18 |
|---|---|---|---|---|---|---|
| F1 (Economy) | ×1.45 L15–20 | 8.5 / 13.2 / 19.8 / 26.8 / 71.5 / 196.5 | 60 90 135 165 | L19 (225) | 24.3 | 22.0 |
| alt1 | ×1.55 L15–20 | 8.5 / 13.2 / 20.5 / 31.0 / 96.5 / 279.8 | 60 90 150 195 | **L18** (195) | 25.3 | 24.8 |
| alt2 | ×1.60 L15–20 | 8.5 / 13.2 / 20.8 / 32.5 / 108.0 / 320.5 | 60 105 150 195 | **L18** (195) | 25.7 | 25.0 |
| alt3 | ×1.54 L15–17, ×1.40 L18–20 | 8.5 / 13.2 / 20.2 / 29.8 / 75.2 / 208.0 | 60 90 150 180 | L19 (255) | 25.3 | 24.5 |
Also swept (not saved): L6–14 ×1.28/1.30/1.32 × L15–20 ×1.40/1.45/1.50. L18 reaches 24.2–26.5 only at ×1.30–1.32, and then L13 dwell is 105 s (outside 45–75) and L16–17 steps are 195–285 s (over 3 min).

**Finding: no segment meets all three constraints.** "L18 in 24–36", "L5–14 at 45–75 s" and "no step over 3 min" can't all hold:
- With L5–14 in band, L15 arrives at 13–15 min. L18 at 24 min then needs about 9–11 min across three steps, i.e. ≥180–216 s per step, which is exactly the dead zone F1 is meant to remove.
- Steeper L15–20 growth barely moves L18 (it only affects L15–17 costs): +0.7–1.0 min at most.
- It does push the late game out: L25 up to 108 min, L30 up to 320 min, and a 3-min step appears at L18.

## 4. Recommendation: ACCEPT F1 AS IS (×1.25 L6–14, ×1.45 L15–20, ×1.35 after), on condition that HoP re-baselines the AC7 L18 target
- Reasons:
  - It fixes the mid-game stall: L12–15 go from 90–150 s to 45–75 s, and the first dead zone moves from L17 to L18 (from L16 for casual and cheapest).
  - It keeps L5 at 4.8 min.
  - It improves casual and −25% players.
  - The F7 hint holds.
  - The late game is 23% faster, which helps the Workers handoff.
- None of the alternatives gets L18 into band. alt1 and alt2 make the late game worse and add a 3-min step at L18; alt3 is the closest, but L18 only reaches 20.2.
- Condition: HoP rules that AC7's L18 check is "Farm level at 30 min ≥ 18 (14.4–21.6 levels)", or moves the time target to **L18 at about 20 min (band 16–24)**. Otherwise F1 fails AC7 on time and no in-constraint alternative fixes it.
- If HoP insists on L18 ≥ 24 min: the only route is to give back part of the stall fix (L6–14 ×1.30, accepting L13 at about 105 s and 3–4 min steps at L16–17). I advise against that.
- Follow-ups after merge: Farm spec F1/§2 cost formula (segments) and the sim tables; refresh late-curve-for-workers.md; PM Workers to re-check W4 tier pricing; QA band targets in the proposal look consistent with my per-level steps.

## 5. Spec folder
pm-role-specs.md (shared rules) says specs go in `product/<area>/`. The brief says the new folder is `product/farm-upgrades/`; that folder doesn't exist yet, and the Farm files are in `product/farm/`. Recommendation: **move** to `product/farm-upgrades/` so the folder matches the role name and the other PM folders (collection/, market/), but only after F1 is merged (Wed Oct 21), so links in status.md, QA reports and Economy docs don't break mid-review. Leave a `product/farm/README.md` pointer, and note that `farm_stress_sim.py` resolves `../economy.csv` relative to its folder, so it keeps working after a same-depth move. Not moved.
