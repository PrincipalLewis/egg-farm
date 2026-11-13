# M4-A review response · PM, Farm Upgrades · 2026-10-16
Responds to `product/claude-review/m4a-economy-2026-10-16.md`. Joint verdict **pending Economy verification** of the B1/M1 numbers (draft request sent separately). Every number here was reproduced with PM Farm's scripts, which read `product/economy.m4-candidate.csv` (v7) and `product/economy.f1.csv` (v6). No canonical file was edited.

Scripts and outputs (all in `product/farm/m4/`):
- `m4a_b1_sweep.py` → `m4a_b1_sweep_out.txt`: migration sweep over all 961 (F, C) saves.
- `m4a_m1_check.py` → `m4a_m1_check_out.txt`: Hens marginal value and TR-5 purchase mix.
- `m4a_tr5_variant.py`: tr5_run.py with patched Hens milestone multipliers, because m4_sim hardcodes 1.25/1.5/2.
- `m4a_m40_bots.py` → `m4a_m40_bots_out.txt`: Farm-only and follow-the-highlight bots.
- Candidate tables: `m4a-fix-m1a-demand.csv`, `m4a-fix-m1b-demand-farm{115,125,135}.csv`, `m4a-fix-m1c-ms110-120-130-farm{100,115,125}.csv`.

## Summary
| Item | Verdict | One line |
|---|---|---|
| B1 migration fails at high C | **ACCEPT**, rule fix PROPOSED | Reproduced: 186/961. Fix A (over-cap V at migration) solves 961/961 |
| M1 Hens dead from F10 to F29 | **ACCEPT**, retune PROPOSED | Reproduced: ROI(H) = 0 at H=F for F10–29. Fix M1-C passes TR-5 at L21 |
| M2 first-minute > 1.5× | **MODIFY** | Reproduced 46/961 (max 1.66× at F12/C1). Keep the gate on the 3 fixtures plus a named bot; the sweep is a diagnostic for HoP |
| M3 waits > 3 min after min 30 | **ACCEPT as diagnostic** | Outside TR-5's 30:00 window. Ask Economy to add an L23–L30 check with workers in m4_active |
| M4 stack ×7.8 | **ACCEPT** | 1.5 × 1.3 × 4.0 = 7.8. Spec corrected |
| m1 v6 bonus source | **ACCEPT** | Source = `product/economy.f1.csv`. Spec names it |
| m2 rounding knife-edge | **ACCEPT** | Integer-cents unit test added to M4A-28 |
| m3 untestable ACs | **ACCEPT** | M4A-18/28/37/39/40 rewritten (below) |
| m4, m5 done state / strip fill | ACCEPT, deferred | Small copy/UI rules. Next spec pass with Art & UX |

## B1: migration fails for C ≥ F+5 (ACCEPT)
**Reproduction** (`m4a_b1_sweep.py`; v6 price = egg_price[F] × (1 + collection_price_bonus[C]) from f1, half-up to cents):
- 186/961 saves have no V ≤ min(F+3, 30) with v7 price ≥ v6 price. This matches the review exactly.
- Failures start at C−F ≥ 5 at F0–F1, ≥ 7 at F2–F4, ≥ 9 at F5, ≥ 10 at F6, ≥ 13–14 at F7–F9, ≥ 16–17 at F10–F13. None from F14 up.
- Worst case F0/C30: v6 $4.60 vs v7 at cap (V3) $1.56, which needs V12.
- Reachable: Collection is ungated by Farm in v6 (game/src/save/save.ts only checks ≤ maxLevel), and collection_cost < farm_cost at L0–L10.

**Options compared:**
| Option | Result | Problem |
|---|---|---|
| A. V may exceed the cap at migration only (lowest V ≤ 30 that matches) | 0 unsolvable saves; overshoot ≤ 9 levels (F0/C30 → V12); first-minute static ratio for B1 saves ≤ 1.31× | Validator must not clamp it (needs a stored floor) |
| A′. Same, but clamp per M4A-29 | Clamping lowers V → breaks never-lower again | Rejected |
| B. Per-save price floor, V at cap | Floor up to 2.95× the formula price; up to 9 Egg value buys that change nothing | Dead buys, confusing UI |
| C. Decaying legacy bonus | Visible price drop after migration; contradicts "never lower" in spirit | Rejected |
| D. Raise cap for everyone to F+k | Needs k ≥ 9 at F0; breaks TR-5 tuning | Rejected |

**Recommendation: A.** Proposed spec text (now in M4A-28, marked PROPOSED):
> If no V ≤ min(F+3, 30) reaches the v6 price, `eggValueLevel` = the lowest V ≤ `maxLevel` that does, and the save stores `eggValueMigratedLevel` = that V. The Egg value cap still blocks purchases until F + 3 > V. The load validator clamps V only above max(F + `egg_value_cap_over_farm`, `eggValueMigratedLevel`), capped at `maxLevel`, so these levels are never clamped or refunded (M4A-29 refund stays 0).

Engineering impact: one extra integer field in v7 (`eggValueMigratedLevel`, default 0), and one change to the validator rule in M4A-27. The UI for an over-cap row shows "Needs Farm L{V−2}", using the existing copy.

**New fixtures** (added to M4A-28; H = F, Grader off; * = over cap, valid only under A):
F0/C0 V0, F0/C5 V4*, F0/C30 V12*, F5/C30 V13*, F10/C0 V3, F10/C10 V8, F10/C30 V15*, F15/C0 V4, F15/C15 V11, F15/C30 V17, F20/C0 V5, F20/C20 V15, F20/C25 V17, F30/C30 V20. The existing C = F−3 fixtures are unchanged: V7/10/14.

## M1: Hens has no in-tab value from F10 to F29 (ACCEPT)
**Reproduction** (`m4a_m1_check.py`, m4_sim model = the TR-5 model; income = min(eggs/s, demand, tap) × price):
- The root cause is structural. Demand is the Farm reference curve 0.2(5+5F), the same curve as unboosted Hens supply. At H = F, supply equals demand before milestones, so any Hens milestone (×1.25 at H10) puts supply above demand.
- At H = F, ΔIncome from +1 Hens is 0.000 for every F10–F29. Examples: F10 supply 13.75 vs demand 13.38; F20 31.5 vs 25.7.
- TR-5 greedy (30 seeds) still buys a median of 20 Hens in 30 min and ends at H20 with F22. Those buys only reach Balanced thresholds, which supports the review.

**Fixes tried** (tr5_run.py, standard, 30 seeds):
| Candidate | TR-5 | L@30 | F18 | Hens ROI at parity | Migration fixtures (static) |
|---|---|---|---|---|---|
| Baseline candidate | PASS | L22 (top edge) | 18.88 | 0 at F10–29 | 1.33 / 1.35 / 1.32 |
| M1-A demand ×1.25/1.5/2 (match milestones) | **FAIL** | L23 | 18.50 | > 0 | F20 1.62, 362/961 > 1.5× |
| M1-B as A + farm_cost ×1.15–1.35 from F10 | PASS | L22 | 18.88–19.50 | > 0 | same ratio problem as A |
| **M1-C milestones ×1.10/1.20/1.30, demand ×1.10/1.20/1.30 from F10/F20/F30, farm_cost ×1.15 from F10** | **PASS** | **L21 (30/30)** | **20.25** | > 0 at every F10–29 (H F−1→F: 31.4 at F10 … 0.46 at F29 $/s per $1k) | **1.20 / 1.22 / 1.29**; 29/961 > 1.5× (max 1.71× at F30/C24) |

M1-C details:
- casual diagnostic: F18 26.00 min vs baseline 26.50; L@30 L19.
- worst gap 1.50 min.
- It also moves L@30 off the band's top edge (risk R2).

**Recommendation: M1-C** (`m4a-fix-m1c-ms110-120-130-farm115.csv`), PROPOSED pending Economy + HoP.
Proposed spec text:
> Hens milestones ×1.10/×1.20/×1.30 at H10/20/30. Farm demand (`demand_min`/`demand_max`) ×1.10/×1.20/×1.30 from F10/F20/F30, still Farm-only (M4A-13 unchanged). `farm_cost` ×1.15 from F10.

Caveats for Economy:
- m4_sim hardcodes the Hens multipliers, so I ran it through the patch wrapper. m4_active.py needs the same change.
- TR-4 "demand range equal" becomes "≥ v6" at F ≥ 10.
- Toast copy changes: `laying boost ×1.1`.
- Not checked: workers, offline and coop fill.

## M2: first-minute > 1.5× at non-fixture saves (MODIFY)
- Reproduced: 46/961 above 1.5×, max 1.656× at F12/C1 (V5, $1.79 → $2.42).
- This is inherent to "lowest V with price ≥ v6": V4 gives $1.78, 1¢ short, and the H10 milestone gives a supply jump.
- Keep the gate on the 3 fixtures with a named bot and metric (M4A-28 rewrite). Report the static sweep to HoP as a diagnostic.
- Under M1-C the count drops to 29, but the peak is 1.71× at F30.
- **HoP decision needed:** accept the overshoot at step edges, or bound it as a price ratio.

## M3: waits > 3 min after 30:00 (ACCEPT as diagnostic)
TR-5 criterion 3 covers only the 30:00 run, and the review's model has no workers or Grader. Ask Economy to report the max gap for L23–L30 with workers in m4_active.py. That stays non-gating unless HoP wants it to gate.

## M4: price stack ×7.8 (ACCEPT)
- CSV w4 tiers: T1 ×1.5 at F18, T2 ×2.0 at F19, T3 ×2.5 at F21, T4 ×3.0 at F22, T5 ×4.0 at F24.
- Full stack = Jumbo 1.5 × Balanced 5/5 1.30 × T5 4.0 = **×7.8**, from F25 with H, V ≥ 25. The spec's ×6.0 left out Balanced. **Applied to M4A-14.**

## m3: testability rewrites (applied to m4a-spec.md)
- **M4A-18:** the anti-flicker hold = `holdTicks` 2 consecutive 1 Hz ticks (next-goal.ts default). Purchases apply in the same tick. Fake-clock tests: oscillating coins never flip the highlight; a sustained crossing flips it by tick 2 (≤ 2 s).
- **M4A-28 income cap:** bot = `product/sim/m4/m4_active.py` seller15 + casual; 30 seeds; workers as in the fixture; golden egg, streak and abilities off. Metric = first-60 s coins, v7 ÷ v6, same seed. Pass = median ≤ 1.5 per player per fixture (F10/C7, F15/C12, F20/C17).
- **M4A-37:** `tr5_run.py --scenario casual --seeds 30` (scenario defined in the AC). Pass = F18 ≤ 45:00 in ≥ 24/30, with a horizon ≥ 45 min. Today: median 26.50.
- **M4A-39:** the Hens-first, Value-first and Balanced bots, the 50% rule and the Collection rule are now defined in the AC. The thresholds are unchanged.
- **M4A-40:** `m4a_m40_bots.py` (draft O4). Farm-only median L@30 ≤ greedy − 3 (today L7 vs L22). Follow-the-highlight in L18–22 under the in-band rule (today median L21, 30/30, worst gap 1.50 min). Casual is diagnostic (L17, 5/30), so it's added to risk R1.

## Merged with Economy (product/m4a-review-response.md, 15:00) — supersedes the B1/M1 recommendations above
**Agree:** B1 186/961 starting at F0/C5. All five Economy fixtures reproduced exactly: F0/C5 → V4 $1.78; F1/C6 → V5 $2.20; F3/C10 → V7 $2.73; F5/C14 → V9 $3.65; F13/C30 → V17 $8.08. Also agree on M4 ×7.8, integer-cents rounding, and the C ≥ F+5 fixtures.

**B1 fix:** adopt Economy's uncapped V search at migration only; I've dropped my option A field. One addition: M4A-27's validator clamps levels "above cap (F + offset)" on load, which would undo the over-cap V on the next reload. Proposed: clamp only above `maxLevel`, and enforce caps at purchase. Still no new field.

**M1 fix:** adopt Economy's (Hens milestones go to coop and offline, not lay rate). PM Farm TR-5 rerun (`m4a_tr5_variant.py` with ms 1,1,1 on the candidate): **PASS, F18 20.75, L@30 L21 30/30, worst gap 1.50 min**. Casual: F18 26.67 min, L19. My M1-C stays as a fallback (PASS, L21, F18 20.25), but it moves migration ratios.

**Disagreements (numbers):**
1. Hens stop point: Economy H11, using a look-ahead buyer over 60 min. TR-5 greedy keeps buying Hens to Balanced thresholds: median 20 Hens buys, ending H20 at 30 min. Different bots, same conclusion (zero in-tab ROI).
2. M2 F12/C1: mine is 1.66× and Economy's is 1.35×. The price ratio is 1.35 in both. The extra 1.23× in mine is supply: H12 with the ×1.25 milestone versus v6 eggs/s. Economy's tap clamp removes it. Under Economy's M1 fix the supply part disappears, so the figure should fall toward 1.35. Economy to confirm.
3. M4A-18 hold: Economy says 1.0 s "same as next-goal.ts", but next-goal.ts has holdTicks = 2 at 1 Hz, about 2 s. The spec states 1.0 s and flags it for Eng/HoP.
4. M4A-37 casual taps 0.5/s (Economy), but tr5_run.py casual taps 1/s. Not yet re-run at 0.5/s.
5. M4A-40: the highlight is the cheapest row, but the clarity spec's hint is the best payback. This conflict is flagged for HoP.
