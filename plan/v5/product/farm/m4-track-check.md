# M4 three-track gate check: PM Farm Upgrades · 2026-10-16 13:30 (UTC+2)
Inputs: product/m4-manage-proposal.md (v1.0), product/m4-tracks-model.md, product/m4-active-checks.md, research/slices/upgrades.md §5a/§7/§9a, Economy's model product/sim/m4/m4_active.py.
Sim: `product/farm/m4/m4_sim.py` (new, reads `product/economy.f1.csv`; canonical files untouched). Raw: `m4/m4_results.txt` (as proposed), `m4/m4_results_fix36.txt` (recommended fix), `m4/m4_results_fix.txt` (40/55 variant). 30 seeds (0–29), 30 min, no workers, 0.1 s ticks.

## Model
- **Stats (Economy's definitions, from m4_active.py; no migration-equivalent assumption needed):**
  - Hens: eggs/s = 1.5 at H0, else 0.2 × (5 + 5H), with milestones ×1.25/×1.5/×2 at H10/20/30.
  - Egg value price A = (1 + 0.05V)(1 + 0.12V) × grade (V5 ×1.1, V10 ×1.25, V20 ×1.5 needs F15) × Balanced farm (min(F,H,V) ≥ 5/10/15/20/25 → +10…30%).
  - Collection = eggs per tap only.
  - Farm: F1 costs, coop, queue, interval, and demand from the CSV at F (the Farm reference curve, not live Hens).
- **Tuning under test:** Hens 30×1.30^H, Value 40×1.33^V, both ≤ F+3.
- **Player:** tap 1/s, Sell all every 15 s. Casual worst case: Poisson, every 20 s, demand ×0.75. −25%: seller15 with demand ×0.75.
- **Buyers:**
  - **Greedy best-ROI (gating):** bundle-aware. For each first buy it evaluates bundles of up to 3 buys across Farm/Hens/Value/Collection and takes the best Δincome ÷ total cost, using income = min(eggs/s, Farm demand, eggs per tap) × price. This values Collection whenever tap size co-binds supply (Economy's single-step bot can't see that; its caveat in m4-active-checks §1). It waits for the best item.
  - **Hens-first / Value-first / Balanced:** fixed priority (lowest track first for Balanced). A lower-priority item is bought only if it costs ≤ 50% of the top item, and Collection only when tap size binds.
  - Cheapest-first for reference.
- **Gap metric:** longest time between consecutive purchases (the HoP criterion). Also reported: longest wait after a purchase until anything becomes affordable.

## Result as proposed (30/40): **FAIL** (too fast)
| seller15 | F5 | F10 | F18 | F20 | L@30 median (min–max), in L18–22 | max purchase gap |
|---|---|---|---|---|---|---|
| **Greedy (gating)** | 5.75 | 8.75 | **17.25 ✗** (band 17.8–21.7) | 20.25 | **23 (22–23), 2/30 ✗** | 2.25 min (F22, 27.5 min) ✓ |
| Hens-first | 6.75 | 10.75 | 19.25 | 24.25 | 22, 30/30 | 2.00 (F21) |
| Value-first | 6.50 | 9.75 | 18.75 | 23.00 | 22, 30/30 | 1.75 (F21) |
| Balanced | 6.50 | 10.00 | 18.25 | 23.25 | 22, 30/30 | 2.00 (F21) |
| Cheapest | 9.25 | 13.25 | 24.25 | 30.00 | 20, 30/30 | 1.25 (F19) |
- **Casual worst case:** greedy F18 24.0, L@30 20. Hens/Value/Balanced L@30 18 (29–30/30). Cheapest L16.
- **−25% demand:** greedy F18 21.25, L@30 21. Priority bots L19. Cheapest L17.
- **Track switching (greedy, L5–20):** the best buy changes on 43 of 52 purchases (median); the longest same-track run is 3. That meets the "changes at least every 3 buys" proposal.
- **Spread between strategies:** F18 18.25–19.25 min (5%). L@30 all 22. That's within the ±15% proposal; no dominant rule.
- **Cause:** a Collection-aware greedy buyer is about 1 min faster than Economy's single-step bot (Economy 18.25 min). Collection levels 2 → 5 keep tap size from capping supply, and Hens ↔ Value alternation is priced correctly. Economy's own caveat predicted this. Over 30 min the gap compounds to one extra Farm level: L23, outside L18–22.
- No-dead-zone criterion: passes everywhere (max 2.33 min, casual greedy at F19).

## Proposed fix: Hens 36×1.30^H, Value 48×1.33^V (+20% on both bases; growth, caps and everything else unchanged) → **PASS**
| seller15 | F5 | F10 | F18 | F20 | L@30 (in band) | max gap |
|---|---|---|---|---|---|---|
| **Greedy** | 6.00 | 9.50 | **19.00 ✓** (F1 reference 19.75, −4%) | 22.00 | **22, 30/30 ✓** (all seeds at 22, the top edge) | 1.75 min (F21) ✓ |
| Hens-first | 7.50 | 11.75 | 21.75 | 26.75 | 20, 30/30 | 1.75 |
| Value-first | 6.75 | 10.25 | 20.50 | 25.00 | 21, 30/30 | 1.50 |
| Balanced | 6.50 | 10.25 | 18.75 | 24.25 | 21, 30/30 | 1.75 |
| Cheapest | 10.25 | 14.25 | 26.25 | — | 19, 30/30 | 1.00 |
- **Spread:** F18 18.75–21.75 (±8%). L@30 20–22. Switches 42 of 53, longest run 3.
- **Casual worst case:** greedy F18 26.7, L@30 19 (30/30). Balanced 18 (30/30). Hens-first 17 (1/30), Value-first 17 (12/30), cheapest 15. The priority-bot casual cases are not gating, but they get worse than as proposed (18).
- **−25% demand:** greedy 23.5 min / L20. Priority bots L18–19 (30/30). Cheapest 16.
- **Margin note:** greedy L@30 sits at L22, the top edge of the band.
- **Variant 40/55:** greedy F18 20.25, L@30 21 (better centred, −2.5% vs F1). But casual Hens-first/Value-first drop to L16–17 (0/30) and casual greedy to L19. Not recommended unless HoP wants more margin at the top.

## Recommendation
**FAIL as proposed** (greedy F18 17.25 < 17.8, L@30 23 in 28/30 seeds). Fix: **Hens 36×1.30^H, Value 48×1.33^V**, which passes all three gate criteria for the gating greedy buyer with the max gap at 1.75 min. Economy should rerun its active/idle windows and AC table with these bases: they slow both tracks about 20% in cost and don't touch Farm, so the active/idle ratios should be roughly unchanged. Also adopt this bundle-aware greedy buyer as the TR-5 reference bot, so QA doesn't validate against a bot that undervalues Collection.
Open: whether L@30 "in band" means the median or all seeds (here all 30 seeds agree in every gating case); casual Hens-first/Value-first at L17 under the fix (non-gating).

## Decisions (Head of Product, 2026-10-16 13:05)
1. **Adopted:** Hens 36×1.30^H, Egg value 48×1.33^V (caps F+3). Economy reruns its checks and updates economy.csv.
2. The Collection-aware greedy buyer (m4/m4_sim.py) is the **TR-5 reference bot** for QA. Packaged as `m4/tr5_run.py` + `m4/tr5-README.md`.
3. **"In band"** = the median seed in band AND ≥80% of seeds in band.
Confirmation with tr5_run.py (standard, 30 seeds, economy.f1.csv + 36/48): F18 median 18.88 min (30/30), L@30 L22 (30/30), worst gap 1.75 min at F21 → **PASS**. Note: tr5_run uses the true median (18.88); the table above used the upper-middle seed (19.00).

## Risk list
| # | Risk | Evidence (36/48, 30 seeds) | Owner / mitigation |
|---|---|---|---|
| R1 | **Casual Hens-first and Value-first players end at L17 at 30:00** (below L18–22) | casual worst case: Hens-first L17 (1/30 in band), Value-first L17 (12/30); Balanced L18 (30/30); greedy L19 | HoP keeps it on the risk list. Mitigation options: the "best value" row hint (upgrades §7.4) nudges toward Balanced; Economy can check whether the Balanced-farm bonus at 5/10/15 is enough to pull single-track casual players back |
| R2 | Greedy L@30 sits at L22, the top edge of the band | all 30 seeds at L22 | Any Economy change that speeds play (golden egg, cb 0.05, ability, streak in a no-worker run) could push it to L23. Rerun tr5_run.py after every economy.csv change |
| R3 | Casual and −25% demand F18 times are outside 17.8–21.7 | casual 26.5 min, −25% 23.5 min (both L@30 in band) | Diagnostic only. AC7 gates the standard scenario. AC7-soft still holds (L18 ≤ 45 min) |
| R4 | Cheapest-first falls to L15–16 for casual and −25% | cheapest casual L15, −25% L16 | Old ≥70% robustness rule: casual 15/19 ≈ 79%, so it holds for now. Watch it |
| R5 | TR-5 table lookup depends on Economy's column names | tr5_run expects hens_cost / egg_value_cost | Economy to confirm names when publishing the M4 table, or QA passes --csv with --hens/--value |
