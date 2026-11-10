# Economy response to Claude M4-A review (2026-10-16 15:00)
Checked with our own models (m4_active.py v7 price/hens_rate, greedy look-ahead buyer from prog()). Scripts: sim/m4/m4a_verify.py, m4a_m1m3.py, m4a_m1_ratio.py, qa_l14_waits.py.

| Item | Real? | Our evidence | Preferred fix | Migration code? |
|---|---|---|---|---|
| B1 | YES | 186/961 (F,C) saves can't reach the v6 price at V=F+3. Smallest gap C=F+5 (F0/C5: $1.60 v6 vs $1.56). v6 has no C-vs-F rule (actions.ts checks only maxLevel). Cheapest-first (AC7 robustness bot) reaches C−F=5 on live and F1. | **Grandfather V:** search V over 0..30 with no F+3 cap at migration only. After that, the cap only blocks *buying* V until F+3 ≥ V. Fixes all 186 saves (max V−F=12 at F0/C30). Overshoot ≤1.22× price. No new save field. Rejected alternative: per-save price floor, which adds state and a second price path. | YES. One line: drop min(F+3,30) from the V search. Spec M4A-28 text changes too. |
| M1 | YES, and worse than reported | Payback at H=V=F: Hens is ∞ at every F10–29 (supply 13.75→45 vs demand 13.4→36 eggs/s). Look-ahead buyer, 60 min, 20 seeds: Hens stops at **H11**; buy share is F 50% / H 0% / V 50% at F20–30. Balanced is stuck at tier 10. | **Remove the Hens lay-rate milestones** (hens_ms1..3 multiply coop + offline only, not in-tab lay). Result: buy share F 31/H 31/V 31% (F10–19), 27/39/26% (F20–30). H28/V28 at 60 min. F18 20.8 vs 20.2 min. F@60 25 vs 24. Active/idle (ALL, st 0.4): 1.53/1.58/1.61 at F10/18/24 (base 1.54/1.58/1.65) → keeps the 1.5–2× target. Tested and rejected: milestone ×order size (k=1 and k=0.5) still gives Hens 0–5%. Supply and demand scale together, so nothing changes. | No. CSV hens_ms semantics + sim only. Idle $/s at a fixed level drops about 20–30% (supply-bound), which is already reflected in the progression numbers above. |
| M2 | PARTLY | Static income ratio (demand/tap-clamped): 35 saves >1.5×, max **1.61×** at F23/C29 (V0=20 Jumbo). Their F12/C1 type (a) is **1.35×** in ours ($1.79→$2.42 is 1.35, not 1.66). Fixtures stay 1.33/1.35/1.32. | Accept. Every case is C≥F+4 late-game, Jumbo-step overshoot. It's inside the accepted 10-min catch-up burst and lasts one step. If HoP wants a hard cap, the option is "lowest V with price ≥ v6, but not crossing Jumbo (V20) unless V19 fails". Not recommended. | No (if accepted). |
| M3 | YES | Greedy, 60 min, 20 seeds, waits >180 s: base F22 max 210 s, F23 270 s, F24 330 s (all seeds). With M1 fix: F25 225 s (52 waits), F26 240 s. Earlier than the review says (F22, not F23). No workers in this model (wages vs Grader); tr5_run needs to confirm. | Extend TR-5 crit. 3 to 60:00. Proposed: trim farm_cost / egg_value_cost F22–26 by about 25% after the M1 fix is in. Re-run then. Not changed now. | No. |
| M4 | YES, numbers right, spec text wrong | Jumbo 1.5 × Balanced5 1.3 × Grader T5 4.0 = **7.8** (6.0 without Balanced). F25: $17.55 → $70.20 with Grader. | Change the spec line "up to about x6.0" to "x7.8 incl. Balanced". No number change. | No. |
| Fixture ±1¢ | YES (knife-edge, not a bug in ours) | F20/C17: v6 = 2.00×3.04 = $6.08 exact. V13 = 1.65×2.56×1.25×1.15 = 6.072 → $6.07, so V14 ($6.55). Python round(x+1e-9,2) and JS float rounding can differ by 1¢ on products like this. | Compute in integer cents with one half-up rounding at the end (Math.round(x*100+1e-6)). Compare cents to cents. Add unit tests F20/C17→V14, F10/C7→V7, F15/C12→V10. | Yes (rounding helper in migration/price), mechanical. |

## B1 fixtures to add (C ≥ F+5), grandfathered V
F0/C5 v6 $1.60 → V4 $1.78 · F1/C6 $1.81 → V5 $2.20 · F3/C10 $2.53 → V7 $2.73 · F5/C14 $3.35 → V9 $3.65 · F13/C30 $7.59 → V17 $8.08 (all H=F). The cap blocks V purchases until F+3 ≥ V.

## Testability (PM Farm Upgrades request)
- **M4A-18:** testable once the hold has a number. Propose 1.0 s, the same as next-goal.ts. Test: unit test on row choice (cheapest affordable, ties H>V>F, none if none affordable). Fake-clock test for ≤1 s update and no flip inside the hold.
- **M4A-28:** testable. Fixture table above + the C=F−3 set. Income cap needs a stated method: seller15 + casual, 30 seeds, workers per migration_v7.py, cap 1.5× over 0–60 s, or accept M2.
- **M4A-37:** testable once "casual" is defined in the spec. Copy migration_v7 MODELS: tap 0.5/s, sell every 20 s, Poisson customers, demand ×0.75. Then run the greedy buyer for 45 min, 30 seeds, and need ≥24/30 at F18.
- **M4A-39:** testable once the "≤50% of top item" rule moves into the spec. With the current hens_ms it **fails by design** (H 0% share from F10). It passes with the M1 fix.
- **M4A-40:** not testable until O4 builds the follow-the-highlight bot and Farm-only bots. Note that M4A-18 highlights the *cheapest* affordable row, not best payback. Economy can build both in m4_sim.py in about 1 h.

## QA (a) Farm L14 waits, no workers, 30 seeds
Live game/data/economy.csv: wait before L14 is median 90 s (seller15) / 120 s (casual), max 140 s, L14 at 15.0 / 18.7 min. economy.f1.csv: 60 s / 70 s, max 100 s, L14 at 12.2 / 15.0 min. Our model doesn't reproduce 173/211 s (likely wages/hiring/slower selling in rc1-pt1). F1 cuts this wait by about 35–40%, so the same scaling puts rc1-pt1 at about 110–135 s, under the 3-min limit. F1-GAP (rows 18–19) doesn't touch L14.

## (b) economy.f1-m4cols.csv numeric check
31 rows × 107 cols, every cell is numeric, no blanks/text/comments/NaN, no duplicate headers. The only issue was CRLF line endings (game/data uses LF). Normalised to LF; cells are identical (backup /tmp/economy.f1-m4cols.pre-lf.csv). m4-candidate/f1 CSVs are still CRLF (not shipped).

## Follow-up 2026-10-16 (after HoP 14:45)
**M2 under the Hens fix** (sim/m4/m4a_m2_newhens.py, static income v7/v6, grandfathered V): F12/C1 **1.35×** (the review's 1.66 included the old lay milestone). 0 saves > 1.5×. Top 5: F12/C1 1.352, F16/C0 1.344, F9/C2 1.344, F28/C25 1.328, F23/C29 1.324. Fixtures F10/C7 1.09, F15/C12 1.11, F20/C17 1.08.

**M4A-37** (`tr5_run.py --scenario casual --taps 0.5 --minutes 45 --ac37`): F18 within 45 min in 30/30 seeds (median 34.67 min). PASS.

**M3: PROPOSAL (no CSV change; needs HoP approval).** TR-5 greedy, 60 min, 30 seeds, f1-m4cols with the Hens fix. Baseline worst gap is **4.00 min at F25** (0/30 seeds ≤3 min). Diagnosis: the wait sits on Farm/Egg value at L24–26 and moves later when only those levels are cut.

| Cut (cost ×) | worst gap | seeds ≤3 min |
|---|---|---|
| none | 4.00 @F25 | 0/30 |
| Farm F22–26 ×0.75 | 3.25 @F25 | 13/30 |
| Farm+Value F22–26 ×0.75 | 4.00 @F26 | 0/30 |
| Farm F22–26 ×0.65 / F21–27 ×0.65 (Farm or both) | 4.00 @F26 | 0/30 |
| Farm+Value F22–30 ×0.75 | 3.25 @F26 | 20/30 |
| Farm+Value F22–30 ×0.65 | 3.25 @F26 | 9/30 |
| Farm F22–30 ×0.5–0.75 only | 3.25–4.00 | 0–13/30 |
| Farm+Value F24–30 ×0.75 | 3.00 @F26 | 30/30 (at limit) |
| **Farm+Value F24–30 ×0.70** | **2.75 @F26** | **30/30** |

**Proposed:** farm_cost and egg_value_cost ×0.70 at rows L24–29. Farm becomes 72,194 / 97,461 / 131,573 / 177,624 / 239,792 / 323,719 (from 103,134 / 139,230 / 187,961 / 253,748 / 342,560 / 462,456). Egg value becomes 31,534 / 41,940 / 55,780 / 74,187 / 98,670 / 131,231 (from 45,048 / 59,914 / 79,686 / 105,982 / 140,957 / 187,473).
- TR-5 30 min still PASS (F18 20.75, L21, gap 1.50), because the 30-min run doesn't reach L24.
- M4A-37 casual 30/30.
- Active/idle 1.53/1.58/1.61 is unchanged: the 10-min windows are fixed-level, so cost doesn't enter.
- Caveat: no workers or Grader in TR-5. Re-check in tr5_run once workers are modelled, and check L30 timing (it will come sooner).

## M3 applied + HoP 14:54 additions (2026-10-16)
**(A) Farm-only vs both (TR-5, 60 min, 30 seeds, monotone tapers).**
- Farm-only fails at every depth tried, because Egg value becomes the wall:
  - L23 ×0.9 / L24–29 ×0.7: 3.25 min, 12/30.
  - ×0.9 / ×0.65: 3.25, 19/30.
  - ×0.8 / ×0.6: 3.50, 1/30.
  - ×0.85 / ×0.55: 3.75, 0/30.
  - L22 ×0.9 / L23 ×0.7 / L24–29 ×0.5: 4.00, 0/30.
- Both (winner, written): L23 ×0.90 and L24–29 ×0.70 on Farm and Egg value: **2.75 min, 30/30**.
- The ×0.9/0.8/0.7 taper from L22 on both fails (3.50 min). Plain ×0.70 from L24 breaks monotonicity.

**(B) MJ2 offline at a 2 h absence** (sim/m4/mj2_offline.py; H=F=V, C=F−3; offline eggs/s = min(hens_rate, demand) × hens_offline_mult; cap offline_max_eggs_2h × mult; no Grader offline). Active is the optimal player with the ALL stack.

| H | active $/s | in-tab idle | act/idle | mult | offline $/s (cap binds) | active/offline | if the cap did not bind |
|---|---|---|---|---|---|---|---|
| 10 | 86.0 | 56.4 | 1.53 | 1.25 | 16.3 | 5.28 | 65.2 → **1.32 FLAG** |
| 20 | 949.3 | 595.4 | 1.59 | 1.5 | 100.4 | 9.45 | 401.6 → 2.36 |
| 30 | 5118.7 | 3155.7 | 1.62 | 2.0 | 347.7 | 14.72 | 1390.7 → 3.68 |

- With the CSV cap the ratio stays well above 1.4, because the 2 h cap binds at only 2.75 / 5.25 / 7.75 eggs/s.
- The flag applies only if the cap is lifted or made non-binding. At H10, uncapped offline × 1.25 out-earns in-tab idle and active/offline falls to 1.32.
- Recommendation: keep offline_max_eggs_2h as the binding cap (scaled by the mult per MJ2).

**MJ2 corrected method (parent 14:53).** Offline eggs = offline_eggs_per_sec (eggs_per_sec × 0.25) × min(away, 7200 s) × hens_msK_offline_mult. There is no demand cap at production; the eggs are sold after the player returns, at the v7 price without the Grader.
- At 2 h: 24,750 / 56,700 / 111,600 eggs at H10/20/30 (mult 1.25 / 1.5 / 2.0). That equals offline_max_eggs_2h × mult, so the cap and the rate agree.
- Offline is $16.3 / $100.4 / $347.7 per s against active $86.0 / $949.3 / $5,118.7 per s.
- **Active over offline is 5.28 / 9.45 / 14.72** and in-tab idle over offline is 3.46 / 5.93 / 9.08. **No value below 1.4: no flag.**
- This supersedes the "if the cap did not bind" column above, which used raw eggs/s.

## Workers + Grader re-check (2026-10-16 ~15:05; sim/m4/m4_workers_prog.py → m4_workers_prog_out.md)
Setup: the TR-5 greedy bot plus hires (W1/W2/W3 at unlock, CSV costs and wages), the Grader tiers (w4_tier_cost, w4_price_mult), and the v0.3 abilities (Activate-all every 300 s for 30 s). 30 seeds. Workers are assumed refilled at each Sell-all visit. Both CSVs give identical results. The sim stops the clock once nothing is left to buy (F30, H/V at caps, Grader maxed, all hired), so the worst gap is computed directly: standard with workers 1.50 min, 30/30 seeds.

| Scenario | F18 | Farm @30:00 | F30 | worst gap (s) by Farm level | ≤3.0 min |
|---|---|---|---|---|---|
| s15 60 min, workers ON | 20.25 | L23 | 40.75 min (30/30) | F10–27 ≤60, F28 90, F29 90 | 30/30 |
| s15 60 min, control (no workers) | 20.75 | L21 | not reached (F26 at 60) | F20 90, F22 135, F23–24 150, F25–26 165 | 30/30 |
| casual 45 min, workers ON | 24.83 (30/30 ≤45) | L21 | 7/30 | ≤60 to F26, F28 100, F29 120 | 30/30 |
| casual 45 min, control | 34.67 (30/30 ≤45) | L17 | — | F19 160, F20 140 | 30/30 |
| pre-M3 CSV, s15 workers ON (reference) | 20.25 | L23 | 45.0 min | F28 135, F29 165 | 30/30 |

- **Active over idle at F10/18/24:** 1.53 / 1.58 / 1.62. This check includes workers and the full v0.3 ability stack, so the 1.5–2× target holds.
- **Every gap is ≤ 3.0 min in all cases.** With workers the worst gap is 1.5 min at F28–29, and even the pre-M3 table would pass (2.75 min).
- **Keep M3 as is:** the no-worker control still needs it (165 s worst). The worker model is optimistic, so it shouldn't drive an easing.
- **Keep the Grader top tier at 51,567:** Grader buys create no gap, and the worst gap with workers is ≤ 90 s.
- **Flag for HoP:** with workers, Farm @30:00 is **L23**, above the TR-5 band of L18–22. The pre-M3 table gives the same, so workers cause this, not M3. TR-5's band is defined without workers. Options: define a with-worker band, or leave it as information.
