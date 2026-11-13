# M4 model scope (Economy, due Thu Oct 22; F1 first)
From Head of Product, 2026-10-16. Draft numbers go here and in a separate CSV, never economy.csv.
1. Split into three tracks: Farm (capacity and unlocks), Hens (lay rate; milestones scale coop size + offline eggs, M1 fix 2026-10-16), Egg value. For each: cost curve and milestone multipliers. Pacing checks: time to L10-equivalent, no dead zone over 3 min, income parity with the current curve at matched spend. Map current saves onto the new tracks. Research slice from PM Farm Upgrades.
2. Market mechanics:
   - a small penalty when a customer leaves unserved; it must never cause a net-negative spiral
   - a small bonus for a fully filled order
   - focus premium (serving one at a time) vs bulk bonus (selling to all at once); both must stay viable
   - Golden Egg + Frenzy: one every 2-5 min from about L8, capped payout or about 7x laying for 60 s (product/research/slices/collection.md)
   - propose a capped active-to-idle income ratio; there's no external benchmark
3. M4 monetisation rows (product/m4-monetisation-proposal.md), due Fri Oct 23: pacing must hold with no boosts; with every boost the player can be at most 35% ahead at 30 min. Compare 2x and 1.5x offline against the 0.25 offline rate.
4. Constraints for the three-track split (PM Farm Upgrades; source product/research/slices/upgrades.md):
   - Hens level is capped at Farm level + 3.
   - Demand follows Farm level, not Hens (pending Head of Product's decision).
   - Milestones are uneven and include "all tracks ≥ N" bonuses.
   - No wait over 3 min, and at least two tracks are near-affordable at most times.
   - Migration: Hens and Egg value levels start equal to the current Farm level, so stats are identical on load. Check the costs players face right after migrating.
5. Inbound requests (worked in product/sim/m4/; the answers go to PM Collection by Wed):
   - PM Market §3e: completion bonus 0.05 and focus premium 0.10.
   - PM Workers: Market Hand bulk/focus toggle.
   - PM Collection: golden egg questions E1–E7.
6. M4 flag: should Market Hand also hold its turn without charging a wage when the basket is empty? (Head of Product)
7. Additional inputs from PM Farm Upgrades (upgrades.md §5a, §7.3, §9a):
   - Demand uses the Farm reference production curve, not the live Hens rate.
   - With Collection +12%/level moved into Egg value, model the Egg value price both ways (two stacked growth terms vs one).
   - Quality grades stack with Balanced and the Grader, up to x7.8 (1.5 × 1.3 × 4.0; corrected 2026-10-16, was x6.0 without Balanced).
   - M4 AC7: Farm L18 within ±10% of the F1 base.

## Market, worker modes and golden egg (Economy, 2026-10-16)
Sim: `product/sim/m4/m4_sim.py` (imports `economy_sim.py`, unedited). `run_m4` copies `run_m2` with M4 hooks. With the hooks off it matches `run_m2` exactly (same reach, coins and wages on the spot-checked runs). Base: CURRENT (P1q/P3) + M2_CURRENT (P4, wage carry), 30 seeds, 4 models (seller15, cheapest, casual, slow). Raw output: `sim/m4/m4_out.md` (AC table), `sim/m4/m4_sweep_out.md` (follow-ups, script `m4_sweep.py`). Nothing in economy.csv, game/ or m2_validation was touched. Note: the base is pre-F1 (current economy), so "base" fails the AC7@30 band (cheapest L17). That's the known stall F1 fixes.

### Key AC table (medians)
| variant | AC7 s15 L@10/L@30 | cheapest L@30 | AC7@30 band | W1 casual | W2 dF10/dF18 | W3 | W4 / W4b | W5 | W6 dF18/dInc21 | F21 ratio s15/ch | s15 managed $/s 0–60 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base | 10/18 | 17 | FAIL | 30/30, 29.0 | +0.8/+1.0 | PASS | 5.5 / 7.5 | 5.62 | +6.0 / +43% | 1.67/1.89 | 207 |
| A cb 0.05 | 11/19 | 18 | PASS | 30/30, 27.7 | +1.0/+1.0 | PASS | 5.2 / 7.2 | 5.62 | +6.0 / +46% | 1.59/1.85 | 241 |
| A cb 0.10 | 11/19 | 18 | PASS | 30/30, 26.7 | +0.8/+1.0 | PASS | 5.2 / 7.0 | 5.75 | +6.0 / +47% | **1.49** FAIL/1.76 | 280 |
| A cb0.05 + manual focus +10%, 3 cards/visit | 10/17 | 16 | FAIL | 30/30, 28.3 | — | n/r | 5.5 / 7.2 | 5.62 | +6.0 / +47% | 4.38/4.45 | 251 |
| B W1 bulk (A numbers) | = A cb0.05 | | PASS | | | PASS | 5.2 / 7.2 | 5.62 | | 1.59/1.85 | 241 |
| B W1 focus 2 s +5% x1.5 drain | 11/19 | 18 | PASS | 30/30, 27.0 | +0.8/+0.2 | PASS | 5.0 / 7.0 | 6.38 | +5.5 / +46% | 1.65/1.91 | 273 |
| B2 pause W1/W2 @40→100 (rec 0.5) | 11/19 | 18 | PASS | 30/30, 28.3 | +1.0/+1.0 | PASS | 5.5 / 7.2 | 2.62 | +2.0 / +3% | **1.48** FAIL/1.77 | 243 |
| C egg 100% catch | 11/20 | 19 | PASS | 30/30, 24.3 | +0.5/0.0 | PASS | 4.2 / 5.8 | 5.75 | +5.0 / +53% | **1.17/1.31** FAIL | 488 |
| C egg 60% catch | 11/19 | 18 | PASS | 30/30, 25.3 | +0.8/+0.6 | PASS | 4.8 / 6.5 | 5.75 | +5.0 / +47% | **1.31**/1.50 | 382 |
| D walkout fee 5% (floor $0) | 11/19 | 18 | PASS | 30/30, 27.7 | +1.0/+1.0 | PASS | 5.2 / 7.2 | 5.62 | +6.0 / +48% | 1.59/1.83 | 241 |

### A. Completion bonus and focus premium
- PM Market's claim reproduces in their own sim (5 s seller, no workers, 20 and 30 seeds): L18 27.0 → **24.6** min at 0.10 and → **25.8** at 0.05. In ours (seller15 managed), F18 goes 28.2 → 27.0 (0.05) → 26.0 (0.10).
- **Recommend complete_bonus_share = 0.05.** Every AC passes, and it lifts cheapest into the AC7@30 band. At 0.10 the seller15 F21 ratio drops to 1.49, which fails.
- Manual focus +10% (manual taps only): it is viable only if serving a card is cheap. At 1 card per visit, pacing collapses (s15 L@30 11, F18 +76 min). At 3 cards per visit, managed income is +4% vs bulk, but unmanaged income falls 55%. **Keep the cap at +10%, on manual per-card taps only, with Sell all always available at no premium.** That way bulk stays the safe default and focus is a small skill bonus.

### B. Market Hand bulk/focus (A numbers, no penalty, no combo)
- Focus (2 s, one customer, +5%, x1.5 drain) beats bulk by **+13% $/s for managed seller15** (+14% cheapest, +12% casual, +16% slow). For unmanaged players the gain is only **+0.6 to 1.9%**. Control: focus at 0% premium is equal to bulk, so the whole gain comes from the premium compounding through pacing.
- Raising drain to x2.5 doesn't remove the small unmanaged gain (+0.6%). A +3% premium halves the managed gain (+7.6%).
- **Recommended setup:** 2 s, +5%, x1.5 drain, 30 s cooldown. Focus beats bulk materially only when managed, and all W ACs pass (W5 rises to 6.38). The F21 ratio improves (1.65/1.91). The 30 s cooldown isn't exercised: modes are static per run.

### B2. Pause/Resume (paused = no output, no wage, +1% per 18 s)
| pattern | s15 $/s 0–60 vs never-pause 241.4 | wages 2 h (vs 2017) | casual | slow | F21 s15 |
|---|---|---|---|---|---|
| pause W1/W2 @40, resume 100 | **243.3 (+0.8%)** | 668 (−67%) | −16% | −42% | 1.48 FAIL |
| pause W1/W2 @40, resume 70 | 239.2 | 698 | −12% | −36% | 1.48 |
| pause W1/W2 @40, resume 50 | 238.7 | 718 | −11% | −29% | 1.59 |
| pause all @40, resume 100 | 143.6 (−41%) | 632 | | | 1.00 |
| low-demand pause W1/W2 (at visits) | 241.4 (equal) | 2017 | −26% | 0% | 1.59 |
| @40→100, recovery 0.25 (1%/36 s) | 240.2 (−0.5%) | 443 | | | 1.48 |
| @40→100, recovery 0 | 240.2 (−0.5%) | 68 | | | 1.48 |
- **A pause pattern does win:** for seller15 and cheapest, pausing W1/W2 at the yawn and resuming at 100 matches or slightly beats never pausing (+0.8% / +0.6%) and cuts wages by two-thirds. The root cause is not recovery speed. Even with **zero** recovery the gap is only −0.5%, so for a 15 s seller W1/W2 output is worth about their wage.
- **Counter (recommend):** (1) recovery 0.25 (1% per 36 s), so pausing no longer wins on income; and (2) more importantly, have PM Workers re-check W1/W2 value vs wage for active sellers. Options are a W1 wage cut or a premium, or charging 50% wage while paused. Otherwise Pause is a strict wage-saver for active players and pushes the F21 ratio under 1.5.

### C. Golden egg (PM Collection spec)
- **E1.** Raw income 0–60 min compounds through pacing (100% catch: +44% M1, +102% managed), so judge it at a matched level. At F21, 100% catch gives **+29% (M1) / +30% (managed)**, which confirms PM Collection's ~+31%. 60% catch gives +14% / +22%; 30% gives +7% / +1%. **Propose realistic catch: active 60%, idle 0%** (offline spawns nothing). Pacing at 100%: F18 22.0 min, AC7@30 L20/L19 PASS, all W ACs PASS. **But** the F21 managed/unmanaged ratio fails (1.17 at 100%, 1.31 at 60%), because unmanaged players also catch eggs. Either measure that ratio without collectible income, or accept it.
- **E5.** Frenzy eggs lost to the coop cap peak at **17% (L23)** across all models. It's ~0% for the 1 tap/s seller and highest for the slow tapper, so it's under 25% at every level L6–L30. A temporary +50% cap cuts the loss to ≤7% with no measurable income change. **Don't add it.**
- **E6.** L4 vs L6: +0.7% income, the same F18 (22.0), and s15 L@10 12 vs 11 (top of the band). **Keep L6.**
- **E7.** Capping cash at banked coins cuts the 100% uplift by about 4 points (F21 +26%) and mostly penalises players who just spent. Cash is already tied to production, not balance, so it can't snowball. **No bank cap.** Keep cash = 45 s × eggs/s × price.
- **E2.** Use formulas plus constant tc_* columns (same on every row, like the W_CONST worker columns). Suggested names: `tc_unlock_farm`=6, `tc_first_spawn_s`=45, `tc_gap_min_s`=90, `tc_gap_max_s`=180, `tc_lifetime_s`=30, `tc_p_cash`=0.45, `tc_p_frenzy`=0.35, `tc_p_eggs`=0.20, `tc_cash_prod_s`=45, `tc_frenzy_mult`=3, `tc_frenzy_s`=20, `tc_eggs_prod_s`=60. The payout is computed from the row's eggs_per_sec × egg_price, with no per-level payout columns.
- **E3.** Yes, exclude the 2× boost from the cash payout, and don't let a frenzy start or extend while a boost is active. Frenzy eggs sold during a boost would otherwise stack to 6×.
- **E4.** Apply the +35% guardrail to the collectible and M4-B **together**. Note the collectible alone at 100% catch is already +45% income at 30 min (M1), or +26% at 60% catch, while L@30 moves by only +1 level. The guardrail metric needs to be defined as levels (or progress) at 30 min, not income. If it is income, trim the collectible (e.g. cash 30 s, frenzy 2×; not yet simmed).

### D. Penalties and active/idle cap
- **No spiral possible** with a walkout fee floored at $0, charged only on the unserved remainder and never on queue-full losses: lowest coins after 10 min were $299 (casual) and $853 (slow, at a 20% stress fee). The cost was −0.0% at 5% and −1.3% at 20%. The recommended B setup has no penalty at all. If one is ever added, keep the $0 floor, ≤5%, players only (never workers or offline), and no reputation multiplier (that's the only feedback loop).
- **Proposed cap: active ≤ 5× idle income at the same Farm level** (eggs-sold basis), with a hard ceiling of 5.5× for perfect play. Idle = offline 25% of production = 4.0× baseline. Active-only bonuses then stack: cb +5%, focus +5%, golden egg at 60% catch +22%, which is about 5.1×. At 100% catch it is about 5.5×. Equivalently, active-only bonuses combined stay within +25% of base production value (+37.5% for perfect play).

## Pause recovery sweep

Fri Oct 16, 2026. Script: `sim/m4/pause_rec_sweep.py`, raw output in `sim/m4/pause_rec_out.md`. Run on the **F1 economy**: farm_cost for each level comes from `economy.f1.csv`, and the W4 tier cost follows it. Workers use M2_CURRENT (P4, wage carry) with cb 0.05. **Caveat:** `run_m4` does not implement the F1 Market Hand hold (b). That only affects W1 wages on turns where it holds. Each run uses 30 seeds and reports the median. "Pause" means pausing W1/W2 at 40 energy and resuming them at 100. A paused worker pays no wage and recovers energy at the stated fraction of its drain rate. Income is managed $/s over 0–60 min.

| recovery × drain | seller15 | cheapest | casual | slow |
|---|---|---|---|---|
| 1.0 | +1.0% | +0.0% (+$0.01/s) | −9.9% | −30.1% |
| 0.5 | +1.0% | +0.0% (+$0.05/s) | −17.4% | −43.5% |
| 0.35 | +0.03% (+$0.11/s) | −1.0% | −14.9% | −43.1% |
| 0.25 | +0.03% (+$0.11/s) | −1.0% | −14.5% | −47.2% |
| 0.15 / 0.1 / 0 | +0.03% (+$0.13/s) | −1.0% | −25.1% | −56.5% |

- **0.35 is the largest value at which pausing loses for cheapest, casual and slow.** At 0.5 and above, pausing gains 1.0% for seller15 and breaks even for cheapest.
- **For seller15, no recovery value kills the exploit, not even 0.** Below 0.5, the paused W1/W2 almost never reach 100 within the hour, so pausing them amounts to firing them. Seller15 still nets about +$0.11–0.13/s, roughly 0.03%, because W1/W2 earn about their own wage for a 15 s seller (PM Workers says this is intended). This is a wash, not an exploit. Pausing only stops being profitable for seller15 if W1/W2 earn more than their wage for that player.
- **0.25 is safe.** It sits below the 0.35 threshold, and pausing loses for cheapest (−1.0%), casual (−14.5%) and slow (−47.2%). Seller15 is the same ≈0 wash as at 0.
- **The F22–24 average managed ÷ unmanaged ratio at 0.25** (never-pause in brackets): seller15 2.21 (2.27), cheapest 2.26 (2.42), casual 2.55 (3.64), slow 2.65 (3.98). Every model is ≥1.5.

## Leave penalty check (2026-10-16, Economy)

leave_penalty_share 0.05 (§12 m4-manage-proposal.md) + complete_bonus 0.05, F1 farm costs (economy.f1.csv), 30 seeds, medians, 2 h runs (no-worker: 1 h). Script: sim/m4/leave_pen.py (patched copy of m4_sim.run_m4 walkout hook: no penalty with empty basket, price incl. Grader; full-queue losses never join; offline not simulated). No Market Hand hold rule in run_m4. Lowest balance = min coins at sell visits after 10 min. Penalty $/min = total penalty / time to final level.

| model | mode | L18 min off→on | L@30 off→on | penalty $/min (on) | lowest balance after 10 min off→on |
|---|---|---|---|---|---|
| seller15 | unmanaged | 19.8→19.8 | 21.0→21.0 | 0.60 (max 0.92) | $882.11→$880.21 |
| seller15 | managed | 19.8→19.8 | 21.0→21.0 | 0.18 (max 0.48) | $882.11→$880.21 |
| cheapest | unmanaged | 21.8→21.8 | 20.0→20.0 | 0.69 (max 0.99) | $737.26→$734.14 |
| cheapest | managed | 21.8→21.8 | 20.0→20.0 | 0.09 (max 0.27) | $737.26→$734.14 |
| casual | unmanaged | 20.7→20.7 | 20.0→20.0 | 0.00 (max 0.32) | $892.54→$891.74 |
| casual | managed | 20.3→20.3 | 21.0→21.0 | 0.00 (max 0.02) | $892.54→$891.74 |
| slow | unmanaged | 21.0→21.0 | 20.0→20.0 | 3.85 (max 6.50) | $1239.94→$1243.28 |
| slow | managed | 21.0→21.0 | 21.0→21.0 | 0.12 (max 0.20) | $1239.94→$1243.28 |

| model | F21 ratio off→on | F22-24 ratio off→on | ≥1.5? |
|---|---|---|---|
| seller15 | 1.12→1.12 | 2.27→2.27 | yes |
| cheapest | 1.44→1.44 | 2.42→2.42 | yes |
| casual | 2.42→2.42 | 3.64→3.64 | yes |
| slow | 2.65→2.64 | 3.98→3.98 | yes |

| no-worker seller | economy | L18 min off→on | penalty $/min | PM Market L18 |
|---|---|---|---|---|
| 5 s | today (economy.csv) | 25.8→25.8 | 0.03 | 25.8 |
| 15 s | today (economy.csv) | 26.0→26.0 | 0.07 | 26.0 |
| 30 s | today (economy.csv) | 30.5→30.5 | 0.16 | 30.5 |
| 5 s | F1 | 18.4→18.4 | 0.03 | 25.8 |
| 15 s | F1 | 18.8→18.8 | 0.06 | 26.0 |
| 30 s | F1 | 21.5→21.5 | 0.15 | 30.5 |

**Result: PASS.** No L18 or L@30 change for any model/mode; penalty ≤ $0.7/min except slow unmanaged $3.85/min (max $6.50), still negligible; lowest balance moves ≤ $4; F22-24 ratio 2.27–3.98 (≥1.5) unchanged; F21 ratio unchanged (seller15 1.12, cheapest 1.44 — already below 1.5 at F21 without the penalty, informational). No-worker 5/15/30 s on today's economy.csv reproduce PM Market's 25.8/26.0/30.5 exactly; on F1 they're 18.4/18.8/21.5.

## M4 abilities

**v0.2, Fri Oct 16, 2026, replacing the v0.1 run.** Scripts: `sim/m4/abilities_v2_sweep.py`. Raw output: `abilities_v2_out.md` (single abilities), `abilities_v2_combo_out.md` and `abilities_v2_combo2_out.md` (combinations).

**Setup**
- **Economy:** F1, with farm_cost for each level from `economy.f1.csv`, including the F1-GAP rows (18 = 11,076, 19 = 18,201). The W4 tier cost follows it.
- **Rules:** `mh_hold=2`, pause recovery 0.25, cb 0.05. Seeds 0–99, medians reported.
- **Players:** the managed player fires Activate-all at each visit. Paused, asleep and unpaid workers are skipped, and an ability ends early if its worker falls asleep or goes unpaid. The unmanaged player never uses abilities.
- **Abilities (30 s, 300 s cooldown):**
  - Rush: price × on eggs W1 sells.
  - Sweep: laying ×.
  - Shout: price × on all sales.
  - Inspect: +0.5 on the Grader's price tier.
- **Code:** `m4_sim.py` adds an opt-in `ab_v2` flag with `ab_w1_price`, `ab_w2_lay` and `ab_w3_price`. With the defaults, results are unchanged: I re-checked seller15 seed 0 with and without the v0.1 abilities and both matched. The pre-edit copy is at `/tmp/m4_sim.pre-v2.py`.

**Each ability alone.** The uplift is managed income with the ability versus without it, for seller15 / cheapest / casual / slow, over 0–60 min. The F22–24 window is noisier, and per-model level medians aren't monotonic in size. The F22–24 ratio is ≥2.25 for every model, and AC-W1 to W6 pass at every size.

| ability | size | uplift 0–60 | uplift F22–24 | ≥1% alone |
|---|---|---|---|---|
| W1 Rush | ×1.1 | +0.9 / +2.4 / +2.8 / +2.3% | +0.8 / +1.0 / +3.1 / +1.2% | borderline (seller15 0.9%) |
| | ×1.2 / 1.3 / 1.4 / 1.5 | +4.7–5.3% / +6.6–7.3% / +6.5–9.4% / +10.3–11.4% | +1.3–3.3% / +2.1–4.4% / +0.4–4.7% / +3.6–5.2% | yes |
| W2 Sweep | ×1.1 / 1.15 | +1.8–2.9% / +1.6–3.7% | +0.5–3.1% / −0.4–2.7% | 0–60 yes |
| | ×1.25 / 1.5 / 1.75 / 2.0 | +4.3–5.7% / +10.5–12.4% / +14.6–17.6% / +17.4–24.3% | +1.5–4.9% / +2.6–6.2% / +4.0–7.9% / +6.8–13.2% | yes |
| W3 Shout | ×1.1 / 1.15 | +0.9–2.7% / +1.3–3.5% | +0.8–3.2% / −0.9–3.2% | 1.1 borderline |
| | ×1.25 / 1.5 / 1.75 / 2.0 | +3.7–5.5% / +9.6–11.2% / +15.0–16.6% / +18.8–22.2% | +2.4–3.8% / +4.1–5.5% / +6.0–8.5% / +5.5–11.8% | yes |
| W4 Inspect | +0.5 | +1.4 / +3.4 / +3.0 / +2.6% | −1.0 / +0.9 / +3.0 / +1.6% | 0–60 yes |

The largest passing size alone is the top of each range: W1 ×1.5, W2 ×2.0, W3 ×2.0. Alone, no single ability breaks any gate. The 15% cap applies only to all four together.

**All four together** (W1 / W2 / W3 / W4). The ratio is ≥1.5 and AC-W1 to W6 pass in every row, so the 15% cap is the only gate that binds.

| sizes | uplift 0–60 (s15 / ch / cas / slow) | uplift F22–24 | F22–24 ratio | ≤15%? |
|---|---|---|---|---|
| 1.5 / 2.0 / 2.0 / +0.5 (largest alone) | +59.4 / +64.9 / +58.0 / +60.7% | +25–28% | 2.88 / 2.98 / 4.61 / 5.12 | **FAIL** |
| 1.3 / 1.5 / 1.5 / +0.5 | +30.8–34.5% | +14.2–16.0% | 2.61–4.65 | FAIL |
| 1.2 / 1.25 / 1.25 / +0.5 | +16.7–19.6% | +5.4–10.1% | 2.40–4.37 | FAIL |
| 1.1 / 1.25 / 1.25 / +0.5 (range minimums) | +15.2–17.9% | +6.8–9.0% | 2.43–4.30 | FAIL |
| 1.1 / 1.25 / 1.25 / +0.25 | +13.4–15.7% | +6.0–8.0% | 2.41–4.27 | FAIL (cheapest) |
| 1.2 / 1.15 / 1.15 / +0.5 | +11.6 / +15.0 / +14.5 / +13.5% | +3.2–7.9% | 2.35–4.21 | at the cap |
| 1.1 / 1.25 / 1.15 / +0.5 | +13.0 / +15.0 / +14.1 / +13.3% | +6.4–7.9% | 2.42–4.33 | at the cap |
| 1.1 / 1.15 / 1.25 / +0.5 | +12.1 / +14.5 / +14.3 / +13.2% | +6.1–7.9% | 2.41–4.33 | PASS |
| **1.15 / 1.15 / 1.15 / +0.5** | **+9.9 / +13.6 / +13.2 / +11.0%** | **+3.1 / +6.3 / +8.0 / +4.2%** | **2.34 / 2.53 / 3.89 / 4.22** | **PASS** |
| 1.1 / 1.1 / 1.1 / +0.5 | +7.6–10.5% | +2.8–4.8% | 2.37–4.14 | PASS |

**Conclusions**
- The abilities compound: Sweep lays more eggs, and Rush and Shout sell them for more. The largest sizes that pass alone add +58–65% together. Even the minimum of each v0.2 range adds 15.2–17.9%, which is over the cap. So the ranges as specced can't all be used together.
- **Recommendation:** W1 ×1.15, W2 ×1.15, W3 ×1.15, W4 +0.5 adds 9.9–13.6% over 0–60 min and 3.1–8.0% at F22–24, with a 1.4-point margin to the cap.
  - Alone, W2 ×1.15 and W3 ×1.15 add +1.3–3.7% over 0–60 min, which clears the 1% floor.
  - W1 ×1.15 alone wasn't run. It sits between ×1.1 (+0.9–2.8%) and ×1.2 (+4.7–5.3%).
  - Alternatives: 1.1 / 1.15 / 1.25 (14.5%), or 1.2 / 1.15 / 1.15, which sits exactly at 15.0%.
- **CEO 2× active/idle cap (check 6):** all four at the recommended sizes multiply managed income by at most ×1.136 (0–60) and ×1.08 (F22–24). Check 6's 'ALL, streak cap 0.30' stack came to 1.51–1.62. Treating the v0.1 ability as worth ×1.00 and multiplying by the new ×1.136 gives a **conservative bound of about 1.84×**, under 2×. At the largest single sizes (×1.65) the stack would be about 2.6×, which **breaks the cap**. I didn't rerun `m4_active.py`, because another job may be editing it. An exact recheck there would confirm the figure.


## 2026-10-16 M4-A review update
B1 grandfathered migration V (no F+3 cap at migration, integer-cent half-up compare), Hens milestones moved off lay rate onto coop/offline (`hens_msK_coop_mult` / `hens_msK_offline_mult`), M2 accepted, stack x7.8. Full text: m4-active-checks.md (M4-A review update) and m4a-review-response.md.
