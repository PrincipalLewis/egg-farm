# L30–50 late-game curve model (TASK 2, proposal only; no shipped CSV changed)
Sim: product/sim/late/late_curve.py (30 seeds, greedy depth-2 buyer, dt 0.2 s). Raw output: sim/late/late_curve_out.md. Candidate: product/economy.l30plus-candidate.csv (numeric, LF; L0–29 copied from economy.f1-m4cols.csv).

## Curve
- L30–50 track costs are geometric at g = 1.0984/level, bisected so L50 ≈ 100 min with workers. ×7.8 stack and Hens coop milestones 1.25/1.5/2.0 are unchanged.
- Farm milestones (farm_ms_price_mult): ×1.10 at L35, ×1.25 at L40, ×1.10 at L45, ×1.25 at L50 (1.89 cumulative).
- Unlocks: L32 second coop wing (coop ×1.5); L35 feed mill (feed_mill_price_mult 1.10); L40 auto-collector (auto_collect_every_s 2); L45 contracts board (contracts_manual_bonus 0.05); L50 prestige teaser only (no numbers).
- Offline: 0.25 × eggs/s × coop multiplier, capped at 7200 s.

## Gates (with workers, 30 seeds)
| gate | result |
|---|---|
| L35 ≈45 min ±20% (36–54) | 55.8 min, **FAIL (slightly slow)** |
| L40 ≈60 ±20% (48–72) | 70.0, PASS (at the edge) |
| L50 ≈100 ±20% | 98.2, PASS |
| per-level time ≤2× the previous level, L19+ | **FAIL**: worst 2.71 (L36), 2.4 (L41/L46). The level right after a milestone is short (a cheap catch-up), so the next one looks 2.7× longer. Costs themselves rise smoothly. |
| purchase gap ≤3 min | PASS (2.25 min; casual 2.33) |
| something affordable within 60 s | PASS (15 s; casual 40 s) |
| cost monotonic across all milestones, L0–50 | PASS (strictly rising, all three tracks) |
| active/idle 1.5–2× at L30/40/50 | PASS: 1.65 / 1.64 / 1.72 (worst seed 1.80 / 1.79 / 1.79) |
| 2 h offline vs 2 h active | offline $/s 348 / 1052 / 2533 vs active 5202 / 16302 / 41024, so active is 15–16× offline |

**No workers: the curves disagree with the targets.** L30 at 93 min, L40 is not reached in the 200-min run, 0/30 seeds reach L50, gaps up to 8.5 min. The targets only hold for a worker-managed farm.

Calibration conflict: with one growth rate, L35 and L40 come out about 10 min slower than the targets when L50 is at 100. Hitting all three would need a lower g for L30–40 and a higher g for L41–50. Fix for the ratio failure: smooth the milestone dips by adding about +8% cost on the level just after L35/40/45, or by spreading each milestone over 2 levels. Neither is done yet.

## Flag for Engineering: M4A-27 load clamp
The save loader clamps level to max 30. Raising it to 50 needs changes in the save validator, balance maxLevel, sync-economy (the new columns) and the UI MAX handling. Otherwise L30+ saves get clamped back to 30.

## v2 re-run 2026-10-16 (approved by PM Farm Upgrades and HoP): split growth + step after milestones
Rate g1 applies to L30–40 and g2 to L41–50. g1 is bisected so L40 = 65 min, then g2 so L50 = 100 min. Each run puts a persistent +b step on the cost of buying L36, L41 and L46 (that row and every later one). Milestones ×1.10/×1.25 and the unlocks are unchanged. Costs are strictly rising. 30 seeds.

**Placement of the step:** an earlier try put it on a single row only. That flattened the next row: after the strictly-rising fix it ended up at +$1. Kept in scratch/late_curve_out_v2a_singlerow.md.

| b | g1 | g2 | L35 | L40 | L50 | worst per-seed ratio L31–50 | worst gap |
|---|---|---|---|---|---|---|---|
| 0% (single row) | 1.0688 | 1.2156 | 54.8 | 65.8 | 101.0 | 4.00 | 3.75 |
| **8% (written to the CSV)** | 1.0562 | 1.1969 | **54.2** | **65.2** | **100.2** | **3.20 (L41)** | **4.00** |
| 15% | 1.0562 | 1.1594 | 53.8 | 65.8 | 100.5 | 3.60 | 3.25 |
| 25% | 1.0438 | 1.1406 | 53.2 | 65.2 | 100.0 | 3.60 | 3.25 |

| gate | value (b = 8%) | result |
|---|---|---|
| L35 ≤54 min | 54.2 | edge FAIL (+0.2 min); b = 15% gives 53.8 PASS |
| L40 60–70 | 65.2 | PASS |
| L50 ≈100 | 100.2 | PASS |
| No level >2× the previous, worst seed, L30–50 (30 s floor) | 3.20 at L41; 90/600 seed-level pairs >2× (median ratio 2.62 at L46) | **FAIL at every b** |
| Worst gap ≤3 min | 4.00 (b = 15–25%: 3.25) | **FAIL** |
| Strictly rising L0–50 | yes | PASS |
| In-tab idle vs active at L30/40/50 (band 1.4–2.0) | active/idle 1.65 / 1.64 / 1.72 (worst seed 1.80 / 1.79 / 1.79) | PASS |
| 2 h offline vs 2 h active | active 15.0× / 15.5× / 16.2× offline (offline $/s 348 / 1052 / 2533) | report only |

**Why it still fails:** the per-seed ratio is dominated by noise. Levels last 1.5–5 min, and players visit every 15 s with a greedy buyer. A level the buyer clears quickly is often followed by one 3× longer, even on a smooth curve.
- The level after each milestone (L41, L46) is still long on the median. The milestone multiplier gets spent on H/V first, before the next Farm level.
- A steeper g2 (needed for L50 at 100 with a slow g1) makes L46–50 long, at 4–5 min, which breaks the 3-min gap.
- **I can't meet the worst-seed ≤2× gate with growth rates plus one bump size.**

Options, none simulated yet:
- (a) Judge the 2× gate on medians, as AC-W4 does. The median is 2.62 now.
- (b) Tune each of the 20 levels by hand.
- (c) Shrink the L40/L50 milestone to ×1.15.

The CSV and late_curve_out.md now hold b = 8%. The previous version is in scratch/economy.l30plus-candidate.v1.csv.

## Worker dependency (report only)
- **Workers are effectively required by L30.** Without workers, L30 comes at 92 min (vs 42.8 with workers) and L40 at 187.5 min. The longest purchase gap is 7 min.
- **L41–L50 are never reached without workers in 200 min:** 0/30 seeds. Income without workers never covers those costs in a reasonable session, so all of L41–50 are flagged.
- **Casual players need workers by L10–18** (product/casual-noworker-pacing.md, 200 seeds):
  - Casual without workers is at L17 at 30:00 (0/200 in the L18–22 band), and L10 is +50% vs AC7.
  - Casual with workers is at L21 (198/200 in band).
  - No small cost taper fixes the no-worker casual player without pushing the optimal player with workers out of the L20–24 band.

## v3 re-run 2026-10-16 23:15: HoP P95 standard, milestones ×1.10 / ×1.15 / ×1.10 / ×1.15 (current CSV)
Ratio and gap are judged on P95 across seeds, with worst-seed guards of ≤2.25× and ≤4 min. 30 seeds (P95 = 29th of 30).

| b (step from buying L36/41/46) | g1 / g2 | L35 | L40 | L50 | ratio P95 / worst | gap P95 / worst |
|---|---|---|---|---|---|---|
| 0% | 1.0562 / 1.2344 | 54.2 | 65.0 | 100.8 | 2.88 / 2.88 | 4.25 / 4.25 |
| **8% (CSV)** | 1.0438 / 1.2156 | **53.8 PASS** | **64.5 PASS** | **100.0 PASS** | **2.88 / 2.88 FAIL** | **4.25 / 4.25 FAIL** |
| 15% | 1.0438 / 1.1781 | 53.2 | 65.2 | 100.2 | 3.25 / 3.25 | 3.75 / 3.75 |

- Strictly rising costs: PASS.
- Idle vs active at L30/40/50: active/idle 1.65 / 1.64 / 1.72, worst seed 1.80 / 1.79 / 1.79, inside the 1.4–2.0 band (PASS). Over 2 h, active earns 15.0 / 15.5 / 16.2× offline.

**The targets themselves conflict with the gap gate.** L40 at 60–70 min and L50 at about 100 min leave 30–40 min for 10 Farm levels: 3.0–4.0 min per level on average. At L41+, H and V are already at their F+3 caps, so almost every purchase is a Farm level, and the gap equals the level time. The 3-min gap at P95 can't hold together with those time targets.
- L41–50 are fast early and long late (L46–48: 4.5–5.8 min). That is where the ratio fails (2.88 at L46).
- Changes that would make it fit, none simulated yet:
  - (a) Move the L50 target to about 90 min with L40 at 65.
  - (b) Allow H/V caps of F+5 from L40 so there are more purchases between Farm levels.
  - (c) Count ability or contract buys as purchases.
- The CSV holds the b = 8% run. The v2 CSV is in scratch/economy.l30plus-candidate.v2.csv.

## v4 re-run 2026-10-16 (HoP 23:19): Hens/Egg value cap F+5 from L40; milestones ×1.10/×1.15/×1.10/×1.15
Calibration ran on 30 seeds; the final evaluation uses 100 seeds at P95 with worst-seed guards. Output: sim/late/late_curve_out.md. Backups: scratch/csv-bak-2319/.

| b | g1 / g2 | L35 | L40 | L50 | Farm-level step ratio P95 / worst | gap P95 / worst |
|---|---|---|---|---|---|---|
| 0% | 1.0562 / 1.2344 | 54.2 | 65.0 | 100.2 | 4.38 / 5.00 | 4.25 / 4.25 |
| **8% (written to the CSV)** | 1.0438 / 1.2156 | **53.8** | **64.5** | **99.2** | **4.86 / 4.86 FAIL** | **4.00 / 4.00 FAIL** (worst guard just holds) |
| 15% | 1.0438 / 1.1781 | 53.2 | 65.2 | 99.8 | 5.50 / 5.50 | 4.00 / 4.00 |

- **Passes:** time targets; strictly rising costs; idle vs active at L30/40/50 1.65 / 1.64 / 1.72 (worst 1.80); 2 h active ≈15–16× offline.
- **2× active/idle with the bigger caps is not affected:** P95 1.77 / worst 1.80 at F40 with H=V=45, and P95 1.76 / worst 1.79 at F44 with H=V=49.
- **F+5 makes the step ratio worse (2.88 → 4.86).** The buyer now spends the post-milestone income on 2 extra Hens/Egg value levels, so the next Farm level takes longer (L41 5.2 min, L46 8.5 min).
  - The gap improves only slightly (4.25 → 4.00), because the extra buys bunch up right after each Farm level.
  - Growth rates and the step can't fix this; the gates still fail.
  - Options, none simulated yet:
    - (a) Spread the H/V cost growth so each extra level costs about one Farm-level interval.
    - (b) An L50 target of about 90 min.
    - (c) Judge the step ratio on all purchases, not Farm levels only.
- **Limitation:** the CSV has rows up to L50 only, so Hens and Egg value max out at 50. The F+5 cap is fully active only at F40–44. Above that, the cap is 50.
- **Engineering flag (on top of the M4A-27 max-level clamp):**
  - The Hens/Egg value buy-gate must allow F+5 from Farm L40 (F+3 below that).
  - The save validator must accept H,V ≤ F+5 at F ≥40.
  - sync-economy needs the cap rule. The CSV column `hens_cap_over_farm` / `egg_value_cap_over_farm` is a single value per row; suggest making it per-row (3 below L40, 5 from L40).

## v5 2026-10-16: HoP option (a), extra H/V levels priced at about one Farm-level interval (F+5 from L40), L50 ≈100
Buying a Hens or Egg value level beyond F+3 (from F40) costs max(table cost, k × farm_cost[F]). New column: hv_extra_cost_farm_share (k, rows ≥40). Calibration on 30 seeds; final evaluation on 100 seeds, P95 with worst-seed guards.

| k | b | L35 | L40 | L50 | Farm-level step ratio from L30, P95 / worst | gap P95 / worst | (c) all-purchase ratio, P95 / worst (diagnostic) |
|---|---|---|---|---|---|---|---|
| 0.5 | 0% | 54.2 | 65.0 | 100.5 | 4.38 / 5.14 | 4.25 / 4.25 | 3.50 |
| **0.5 (written to the CSV)** | **8%** | **53.8** | **64.5** | **99.8** | **4.38 / 4.38 FAIL** | **4.25 / 4.25 FAIL** | **3.00 / 3.50** |
| 1.0 | 0% | 54.2 | 65.0 | 100.2 | 7.80 / 7.80 | 3.25 / 3.25 | 3.50 |
| 1.0 | 8% | 53.8 | 64.5 | 99.8 | 8.00 / 8.00 | 3.25 / 3.25 | 3.00 |

- **Passes:** time targets; costs strictly rising per track; idle vs active 1.65 / 1.64 / 1.72 (worst 1.80); 2× unaffected (F40 with H=V=45: P95 1.77, worst 1.80; F44 with H=V=49: P95 1.76, worst 1.79).
- **Option (a) can't get the P95 step ratio under 2.0, so I stopped here.**
  - Best found is 4.38 at k = 0.5 (v4 without extra pricing was 4.86).
  - Raising the price to one full interval (k = 1.0) trades a shorter gap (3.25) for a much worse step ratio. The extra levels now take a whole interval each, and the Farm level after them waits.
  - The worst level is still L46 (after the L45 milestone). The cause is the steep L41–50 growth that L50 at 100 requires.
- **D1–D4 (l30plus-spec.md) numbers in this CSV:**
  - D1: 51 rows (L0–50), maxLevel 50.
  - D2/D3: hens_cap_over_farm = egg_value_cap_over_farm = 3 on L0–39 and 5 on L40–50. The validator must accept F40/H45/V45.
  - D4: the per-row cap columns and hv_extra_cost_farm_share (0 below L40, 0.5 from L40) are new columns sync-economy must carry.
  - The extra-level pricing needs buy-gate code (cost depends on F). That's new L30-17 for Engineering/PM.
- Backup of the previous CSV: scratch/economy.l30plus-candidate.v4.csv.

## PM Farm Upgrades TR-5 60-min check (no workers / with workers)
`farm/m4/tr5_run.py --csv economy.m4-candidate.csv --seeds 30 --scenario standard --minutes 60 [--workers]`

| table | workers | gap P95 / worst | worst level time L18–29 | level at 30:00 | result |
|---|---|---|---|---|---|
| economy.m4-candidate.csv | no | 2.75 / 2.75 (F26) | 6.25 min (F26) | L21 | PASS |
| economy.m4-candidate.csv | yes | 1.50 / 1.50 | 3.00 min | L23 | PASS |
| economy.f1.csv (PM's run) | no | 4.0 (F25) | 8.5 min (F26) | — | FAIL |

**Classification:** the failure is a dead zone in the superseded L23–29 farm_cost of economy.f1.csv. It is not a no-worker wall. On the approved M3 taper (m4-candidate), the same check passes without workers, and the remaining slowdown (6.25 min at F26, under the 8-min guard) is the expected no-worker slope. PM Farm Upgrades should point the check at economy.m4-candidate.csv (or economy.f1-m4cols.csv).

## v6 2026-10-16: HoP hand-tune of L31–50 (written to the CSV)
Each Farm cost row L30–49 is hand-tuned (10 passes) so the median time per Farm level is about 2.2 min on L31–40 and rises from 3.0 to 4.0 min on L41–50. Hens/Egg value rows L41–50 are priced at 0.3 × their L40 share of farm_cost. The F+4/F+5 extras cost 0.15 × the current Farm cost × (1 + 0.1 per extra level) (`hv_extra_cost_farm_share` = 0.15). Every purchase resets the gap. Step ratio follows the HoP 23:30 rule: it only counts when the previous level took ≥1 min. Final evaluation: 100 seeds, P95 with worst-seed guards. Output: sim/late/late_curve_out.md. Previous version: scratch/l30-v5/.

| gate | value | result |
|---|---|---|
| L35 ≤54 / L40 60–70 / L50 ≈100 | 53.8 / 66.8 / 103.0 | PASS |
| Farm step ratio from L30, P95 ≤2.0, worst ≤2.25 | 1.88 / 1.88 (L41); 0 of 2000 seed-level pairs >2× | **PASS** |
| Gap across all purchases, P95 ≤3, worst ≤4 | 4.25 / 4.25 | **FAIL** |
| Fallback: gap P95 ≤4 on L41–50 only | 4.25 | **FAIL** (not used, so no exception logged) |
| Strictly rising per track | yes | PASS (see caveat) |
| Idle vs active 1.4–2.0 at L30/40/50 | 1.65 / 1.64 / 1.72 (worst 1.80) | PASS |
| 2× active/idle, F+5 caps | F40 at H=V=45: P95 1.77, worst 1.80; F44: 1.76 / 1.79 | unaffected, PASS |
| (c) all-purchase gap ratio (diagnostic) | P95 6.00 | report only |

- **Why the gap fails.** From F45, Hens and Egg value are at the table maximum of 50, so nothing gets bought between Farm levels. The gap is then the Farm level time itself, 3.8–4.2 min at L47–50. To fix it:
  - (a) Add rows L51–55 so the F+5 extras exist above L45 (D1/D4 scope grows).
  - (b) Lower the L50 target to about 95 min so L47–50 take ≤3.5 min.
  - (c) Count contracts or abilities as purchases.
- **A tighter pass made things worse.** I also tried forcing Farm cost up at least 3% per level (no flat steps). That gave L35 54.8 and a 4.50 gap, worse, so I didn't keep it (scratch/l30-v5/v6b_ming103_out.md).
- **Caveat: the written curve isn't smooth.** Costs rise strictly, but the hand-tuned farm_cost has near-flat steps of +$1, e.g. L29–33 and L34–36. Hens/Egg value rows L41–43 are also +$1 apart.
- **D1–D4 update (columns changed):**
  - D1: rows L0–50, maxLevel 50.
  - D2/D3: hens/egg_value cap 3 on L0–39, 5 on L40–50.
  - D4: new column `hv_extra_cost_farm_share` (0 below L40, 0.15 from L40). Its meaning changed: an extra level now costs that share × the current Farm cost, × 1.1 for the second extra. It's no longer a floor. Engineering's buy-gate needs the current Farm level to price an extra level (L30-17).

## v7 2026-10-16: HoP decision (a), Hens/Egg value rows L51–55 (written to the CSV)
Farm still tops out at L50, and the Farm curve, milestones and hand-tune (10 passes, same targets) are unchanged. The Hens/Egg value table now runs to **L55**, so the F+5 cap (from L40) keeps purchases available between Farm levels from F45 on. Contracts and abilities are not counted as purchases. Rows L50–55 Hens/Egg value use the same pricing as L41–49: 0.3 × the L40 share × that row's farm_cost (`HVS=0.3`, now named in the run command). Rows 50–55 farm_cost carry on the L41–49 geometric growth (×1.17/level). They are **never purchasable** (Farm max 50) and only exist as the pricing base. The F+4/F+5 extras rule (0.15 × current Farm cost) is unchanged. Run: `HVS=0.3 python3 late_curve.py --xk 0.15 --handtune 10`, final eval 100 seeds. Backup of v6: scratch/l30-v6/.

| gate | value | result |
|---|---|---|
| L35 ≤54 / L40 60–70 / L50 ≈100 | 53.8 / 67.0 / 102.5 | PASS |
| Farm step ratio from L30 (prev level ≥1 min), P95 ≤2.0, worst ≤2.25 | 1.88 / 1.88 (L41), 0 of 2000 pairs >2× | PASS |
| Gap across all purchases, P95 ≤4 (ideal ≤3), worst ≤4 | 3.50 / 3.50 | **PASS** (misses the ideal ≤3) |
| Active/idle ≤2 (L30/40/50; F+5 caps at F40/44/50) | 1.65 / 1.64 / 1.72, worst 1.80; F50 at H=V=55: P95 1.76, worst 1.79 | PASS |
| Strictly rising L0–55, all three tracks | yes | PASS |
| (info) casual+workers step ratio | P95 2.40 / worst 2.60 at L36 (unchanged from v6) | report only |
| (info) no workers | gap 9.5 min, does not reach L50 (workers required by L30) | report only |

- The script's built-in PASS flag still uses the old ≤3 gap, so the output prints "FAIL". Judged on HoP's v7 gate (≤4), it passes.
- **POLISH: +$1 cost steps (the UI must never show a near-zero increase).** These rows are only +$1 above the previous row: farm_cost @30, 31, 34, 35, 37, 39, 42, 46; hens_cost and egg_value_cost @40, 41, 42, 46. HoP accepts them for now. Revisit after the gate is green, either with a minimum-% step or by smoothing the hand-tune.
- **Engineering deps:**
  - D1: rows L0–55. Farm maxLevel is 50; Hens/Egg value maxLevel is 55.
  - The load clamp goes from 30 to **55**.
  - D2/D3: the cap is 5 on L40–55.
  - D4/L30-17: `hv_extra_cost_farm_share` (0.15 from L40) needs the current Farm level in the buy gate.
- **Inherited columns.** The CSV now has 130 columns: it picked up five new f1-m4cols columns (w2_asleep_collect_share, nudge_coopfull_share/_window_s/_min_farm, leave_attended_window_s). No new L30+ columns.

## v8 2026-10-17: rebase of the approved candidate + polish candidate (economy.l30plus-polish.csv)
**Approved candidate, corrected revision `3e3d61fdc869…`** (supersedes 77a68a61 / 831a1fb9; numbers unchanged, 100 seeds identical on every gate):
- Rows L0–29 are now string-exact copies of economy.f1-m4cols.csv `86f0e80e3593` (manage_prompt_threshold 0.5; the old diffs vs 70009738 were number formatting only, e.g. `2.0` vs `2`). manage_prompt_threshold is 0.5 on L30–55 too.
- collection_cost L30–55 = floor(10 × 1.6^L), the same closed form as L0–29 and sync-economy's single costGrowth fit (old extrapolation drifted by 1–4×10⁻⁷ from L32). Strictly rising to L55 (1,684,998,446,752).
- New columns farm_max_level=50, hv_extra_second_markup=0.10 (the `(1 + 0.1 × (extra-1))` term).
- late_curve.py line 71: the extra-level cost **replaces** the table cost (`c = share × farm_cost[F] × (1 + 0.1 × (L − F − 3))`), it is not added. Note the docstring at line 68 says "max(table, …)": the code does not take a max, so an extra level can cost less than its table row. Flagged to Engineering; values unchanged.
- Hens L51–55: the sim's lay rate is 0.2 × (5 + 5H) with no Farm cap, so H51–55 add real production (CSV hens/eggs_per_sec rows 51–55 = 260…280 / 52…56, consistent). Per HoP ruling this is the intended model (Engineering raises the game cap to 55, M4A-27). Instrumented check (100 seeds): 0 zero-effect Hens/Egg value buys at F≥45 in workers and casual+workers; every purchase counted in the gap has a real income effect. (Casual+workers has 2 zero-immediate-effect Hens buys per seed at F32/F37, demand-bound, part of 2-step bundles.)
- late_curve.py: PASS line now uses the gap ≤4 gate (≤3 shown as ideal); rows L0–29 written verbatim from SRC; optional `NUDGE=1` hire-nudge event log (no effect when off). Named event `nudge_f25_noworker` (L30-19b) added in sha `f0e3f1180ab0…` (was `8c5a08a87d55`).

**Polish candidate `economy.l30plus-polish.csv`** (built by sim/late/late_polish_tune.py on the corrected candidate: `--hvsmooth 0 --mstep 0.02 --hvg1 0.005 --unbump 1.10 --tover 31:1.4,32:1.4,33:1.5,34:1.7,35:2.1,36:2.2,41:2.7 --t41 2.9 --t50 3.6`):
- Cause of the casual L36 ratio: L35 brings ×1.10 milestone and ×1.10 feed mill together (+26% price per egg from one Farm buy). The greedy buyer then saves straight for Farm L35 (0 Hens/Egg value buys during L34→35 on every seed), and the backlog of ~5 Hens/Egg value buys lands in L35→36. With row 34 = row 35 flat and the +8% H/V bump at row 35, L35 takes ~2.0 min and L36 ~4.0 → 2.4–2.6×.
- Fix: every L29→55 cost step ≥ +2% (no +$1 steps); H/V rows 35–39 divided by 1.10 (removes the row-35 bump), H/V rows 30–34 at +2%/level, per-level Farm targets re-fitted on a 50/50 workers/casual blend.
- Result: casual+workers step ratio P95 2.40 → 2.00, worst 2.60 → 2.20 (≤2.25 ✓); +$1 steps 16 → 0; workers gap P95 3.50 → 3.25. L35 (workers) 53.8 → 54.5 min; HoP logged as noted variance (L35 ≤55). Root of the 0.7 min: L31–34 are floor-bound (Hens/Egg value purchases, not Farm cost). Shipping candidate; fallback `3e3d61fdc869`.
- Casual no-workers (report-only per HoP 23:56): reproduces QA's numbers (worst level 18.3–18.7 min at L31, gap P95 11.7–12.3 min). Cause is upstream of L30: the profile reaches L30 at ~128 min (vs 46.7 with workers) with ~1/3 income (no W1 seller, W2 collector, W3 demand, Grader), and the max gap is the wait on F29 for the frozen F1 row-29 Farm cost while H/V sit at the F+3 cap. No cheap L30+ curve fix; the only cheap lever is the hire nudge (L30-19).
- **HoP 00:0x ruling:** polish `b59c4e0d` approved as the shipping candidate; L35 (workers) 54.5 logged as noted variance (L35 ≤55), not a gate change. Fallback remains `3e3d61fdc869`.

### L30-19 named event (`nudge_f25_noworker`) — late_curve.py `f0e3f1180ab0…`
- Replaces the ad-hoc `probe_F25` diagnostic. Fires once when a no-workers profile first reaches Farm L25 with 0 workers hired (runtime AC L30-19b). Per-seed log: fire time, coins, next-hire cost (Coop Hand $150), afford_after_s.
- Written to `product/sim/late/nudge_log_casual_noworkers.csv` (NUDGE=1, casual no-workers, 100 seeds). Default pacing output unchanged when NUDGE is off.
- Result: fired 100/100; afford P95 20 s, worst 20 s (≤3 min PASS).

### Full 4-scenario gate on polish `b59c4e0d` (100 seeds, 2026-10-17)

| scenario | L35 | L40 | L50 | step P95 | step worst | gap P95 | gap worst | costs rising | active/idle worst | F25 nudge P95/worst |
|---|---|---|---|---|---|---|---|---|---|---|
| workers (HARD) | 54.5 | 66.8 | 100.8 | 1.88 | 1.88 | 3.25 | 3.25 | yes | 1.80 | — |
| casual+workers (HARD) | 58.0 | 71.0 | 105.0 | 2.00 | 2.20 | 3.67 | 3.67 | yes | 1.80 | — |
| casual no-workers (info / L30-19) | — | — | — | 1.15 | 1.17 | 11.67 | 12.00 | yes | — | 20 s / 20 s |
| no-workers (info) | 141.2 | 195.0 | — | 1.45 | 1.47 | 9.50 | 9.75 | yes | — | — |

Limits: L35 ≤55 (noted variance), L40 60–70, L50 ≈100, step P95 ≤2 / worst ≤2.25, gap P95/worst ≤4, active/idle ≤2, F25 nudge ≤3 min. No-worker pacing is information-only (workers required by L30) except L30-19.
