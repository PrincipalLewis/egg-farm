# L30+ spec: L30–50 cost curve + unlock schedule · PM, Farm Upgrades · v0.2 DRAFT · 2026-10-16

Status: **DRAFT for HoP review. Not buildable** until Economy's split-growth re-run lands and the M4A-27 clamp is raised (D1).
Scope: Farm/Hens/Egg value track costs, milestones and unlocks for L30–50. Prestige is parked (HoP); L50 carries only a teaser.

**Sources:**
- `product/economy.l30plus-candidate.csv` (candidate; L0–29 copied from `economy.f1-m4cols.csv`).
- `product/late-game-curve-model.md`; sim `product/sim/late/late_curve.py`, raw output `product/sim/late/late_curve_out.md` (30 seeds, greedy depth-2 buyer, dt 0.2 s).
- `product/farm/m4a-spec.md` v1.14 (M4A-1 source of truth, M4A-4 offline, M4A-27 clamp, ×7.8 stack).
- `product/economy.csv` (shipped, L0–30 only).

**Rules (same as M4-A):**
- **`economy.csv` is the source of truth.** This spec names columns only. Numbers in *italics* are current candidate values, for reference only. Until Economy merges the L30–50 rows, QA tests against `product/economy.l30plus-candidate.csv`.
- QA reads every expected value from the CSV, never from this doc.
- Notation as M4-A: F = Farm level, H = Hens, V = Egg value. "Cost at L" = price of L → L+1.

## 1. Goals
1. Extend all three tracks from L30 to `maxLevel` 50 with a smooth, strictly rising cost curve.
2. Pacing with workers: L35 ≈ 45 min, L40 ≈ 60 min, L50 ≈ 100 min (±20%). **Design assumption: workers are required by L30**; no-workers pacing past L30 is not a target.
3. No dead zone: no purchase gap over 3 min, and something affordable within 60 s.
4. A new unlock or milestone every ~5 levels so the late game has goals, not just bigger numbers.
5. Keep idle and active play in a healthy ratio (folded-in active/offline gap item).
6. Existing v6 saves near L30 continue with no jump in cost, income or level.

## 2. Tunables (all in economy.csv; spec cites columns only)
| what | column(s) | candidate value |
|---|---|---|
| Track costs L30–50 | `farm_cost`, `hens_cost`, `egg_value_cost` | *geometric, g = 1.0984/level from L30 (single rate; to be split, see below)* |
| Split growth | `farm_cost` / `hens_cost` / `egg_value_cost` rows L30–40 vs L41–50 | **TBD: slower g for L30–40, faster g for L41–50 (Economy re-running)** |
| Post-milestone bump | cost rows at L36, L41, L46 | **TBD: about +8% on the level after each milestone** (exact factor from re-run) |
| Farm milestone price mult | `farm_ms_price_mult` | **v0.2: ×1.10 L35, ×1.15 L40, ×1.10 L45, ×1.15 L50** (×1.60 cumulative; candidate CSV still has ×1.25 at L40/L50, TBD re-run) |
| Second coop wing (L32) | `coop_capacity` | *coop ×1.5* |
| Feed mill (L35) | `feed_mill_price_mult` | *1.10* |
| Auto-collector (L40) | `auto_collect_every_s` | *2* |
| Contracts board (L45) | `contracts_manual_bonus` | *0.05* |
| Offline | `offline_eggs_per_sec`, `offline_max_eggs_2h`, `hens_msK_offline_mult` | *0.25 × eggs/s × coop mult, capped at 7,200 s* (M4A-4 rules unchanged) |
| Price stack | `egg_grade*`, `balanced*`, `w4_*` | unchanged; top end ×7.8 (M4-A M4A-5) |
| Hens milestones | `hens_ms1..3_*` | unchanged (coop 1.25/1.5/2.0) |
| Track caps | `hens_cap_over_farm`, `egg_value_cap_over_farm` | **F+3 below L40, F+5 from F40 (HoP decision)**; per-row cap columns (D4) |
| Level cap | `maxLevel` (config) | 30 → **50** (D1) |

## 3. Unlock schedule (from late-game-curve-model.md)
| level | unlock | column |
|---|---|---|
| L32 | Second coop wing | `coop_capacity` (×1.5) |
| L35 | Feed mill | `feed_mill_price_mult` |
| L40 | Auto-collector (worker tier 2) | `auto_collect_every_s` |
| L45 | Market / contracts board | `contracts_manual_bonus` |
| L50 | Prestige teaser only (no numbers, no mechanic; prestige parked) | none |

Copy and lock states for each unlock: Art & UX (open item O4).

## 4. Milestones
Farm milestones via `farm_ms_price_mult`: **×1.10 at L35 and L45, ×1.15 at L40 and L50** (v0.2; was ×1.25). Values TBD pending Economy's re-run. They stack multiplicatively with the existing price stack. Each milestone is followed by the post-milestone cost bump (§2) so the next level is not a cheap catch-up.

## 5. Edge cases
- **E1 v6/M4 save at L29–30:** loads with no change in level, coins or price; the L30→31 cost is the CSV row, continuous with L29→30 (no jump).
- **E2 Clamp not yet raised:** a build with `maxLevel` 30 must not load L30+ CSV rows into play; L30 shows MAX as today. Saves at L30 are not altered.
- **E3 Save above 30 loaded by an old build:** clamped to 30 by M4A-27 (known; data loss of levels). Ship only together with D1; no L30+ save may reach a clamp-30 build in release.
- **E4 L50 MAX:** all three tracks show MAX at 50; teaser shows; no further cost read past row 50.
- **E5 Track caps:** H, V ≤ F + 3 while F < 40; H, V ≤ F + 5 from F40 (HoP decision), never above 50. Reaching F40 unlocks the extra 2 levels at once; no refund or clamp for anyone. Saves migrated over cap stay as M4A-28.
- **E6 Offline at high levels:** same M4A-4 formula, floored, 2 h cap; no new offline multiplier from unlocks unless the CSV says so.
- **E7 No workers:** not a target past L30. Reported only; flag if any level is unreachable in the run (currently L40+ unreachable, see §8).
- **E8 Auto-collector + Collection track:** auto-collect must not double-collect with manual taps (Engineering to confirm in design).

## 6. Dependencies
Engineering items (from Economy; HoE told about D1 as a risk, no build ask yet):
- **D1 (blocking):** M4A-27 load clamp 30 → 50: save validator, balance `maxLevel` 50, UI MAX handling; economy.csv carries rows L0–50. AC L30-14.
- **D2:** Buy gate: Hens and Egg value cap = the row's `hens_cap_over_farm` / `egg_value_cap_over_farm` (3 for L0–39, 5 for L40–50). AC L30-13.
- **D3:** Save validator uses the same per-row caps (3 for L0–39, 5 for L40–50); must accept F40/H45/V45. AC L30-15.
- **D4:** sync-economy carries the per-row `hens_cap_over_farm` / `egg_value_cap_over_farm` columns, the new `hv_extra_cost_farm_share` column (0 below L40, 0.5 from L40) and rows L31–50. Resolves O7. AC L30-16.
- **D8:** Extra-level pricing: the cost of the two F+5 levels depends on the current Farm level (`hv_extra_cost_farm_share` × Farm cost), so the buy gate needs new code, not just data. AC L30-17.

Pricing of the two extra F+5 levels: **HoP option (a)**, about one Farm-level interval each, implemented as `hv_extra_cost_farm_share` (0.5 from L40) of the current Farm cost (D8). Numbers TBD pending Economy's re-run.

**Step ratio status:** still FAIL at P95 4.38× on Economy's latest run; a hand-tune is pending with HoP.

Other dependencies:
- **D5:** Economy re-run with split growth + post-milestone bump + ×1.15 L40/L50 + F+5 pricing, then merge L30–50 rows into `economy.csv` / `game/data/economy.csv` (after the Wed Oct 21 F1 merge and the M4 merge).
- **D6:** Art & UX copy for unlocks and the L50 teaser.
- **D7:** QA L30+ fixtures and sim gate.

## 7. Acceptance criteria
**Gate standard (HoP 23:15, product/ac7-qa-threshold-changes.md):** every sim gate is judged at **P95 across seeds** (≥ ceil(0.95N), i.e. 29/30), with **worst-seed guards: ratios ≤ 2.25×, gaps ≤ 4 min**. This replaces all median / p90 wording. Run with workers, ≥ 30 seeds, `product/sim/late/late_curve.py`. **Scoped by level (HoP 23:22):** the level-step ratio is a HARD gate from L30 up (P95 ≤ 2×, worst ≤ 2.25×); for L18–29 it is WARN only, with a HARD worst-seed level-time guard ≤ 8 min; no step check below L18. Same rule in `product/farm/m4/tr5_run.py`.

All numbers below are **TBD pending Economy's re-run** (split growth, +8% post-milestone bump, ×1.15 L40/L50, F+5 caps from L40). Results shown are the v0.1 single-rate candidate (×1.25 milestones, F+3 caps), reported by Economy as medians/worst seed; they must be re-reported at P95 + worst seed.
| AC | criterion | current candidate result | status |
|---|---|---|---|
| L30-1 | L35 ≤ 54 min | 55.8 min | **FAIL, pending re-run** |
| L30-2 | L40 in 60–72 min | 70.0 min | PASS (at edge) |
| L30-3 | L50 in 80–120 min (target ≈ 100) | 98.2 min | PASS |
| L30-4 | P95 purchase gap ≤ 3 min; worst seed ≤ 4 min | 2.25 min (casual 2.33) | PASS (pre-standard; re-check) |
| L30-5 | Something affordable within 60 s | 15 s (casual 40 s) | PASS |
| L30-6 | P95 level-step ratio ≤ 2×; worst seed ≤ 2.25× | 2.71 (L36), 2.4 (L41/L46) | **FAIL, pending re-run** |
| L30-7 | Costs strictly rising across all milestones, all three tracks, L0–50 | strictly rising | PASS |
| L30-8 | 2 h idle vs 2 h active ratio within 1.4–2.0 at P95, worst seed ≤ 2.25, at L30/40/50 (HoP-folded active/offline gap AC) | 1.65 / 1.64 / 1.72 (worst seed ~1.80) | PASS (pre-standard; re-check) |
| L30-9 | A v6 save near L30 (fixtures F29, F30) loads with no jump in level, coins, price or next cost | not yet tested | OPEN (needs D1 build) |
| L30-10 | QA reads all expected values (costs, mults, unlock levels) from the CSV; no hardcoded numbers | n/a | OPEN |
| L30-11 | With `maxLevel` 50, an L45 save round-trips with level intact; MAX shows only at 50 | not yet tested | OPEN (D1) |
| L30-13 | (D2) From F40, Hens and Egg value can be bought to F+5 (cap read from the CSV row); below F40, F+3; buy button locks at the cap | not yet tested | OPEN |
| L30-14 | (D1) Saves with F/H/V up to 50 load without clamping; validator and `maxLevel` accept 50; UI shows MAX only at 50 | not yet tested | OPEN |
| L30-15 | (D3) Save validator reads per-row caps: fixture F40/H45/V45 loads unchanged; fixture F39/H44 is handled as today's over-cap rule (no clamp, no refund, M4A-28) | not yet tested | OPEN |
| L30-16 | (D4) sync-economy output carries rows L0–50, the per-row cap columns and `hv_extra_cost_farm_share`; a changed cap value in a row reaches the build with no code change | not yet tested | OPEN |
| L30-17 | (D8) An extra F+5 level (H or V above F+3 at F ≥ 40) costs the row's track cost plus `hv_extra_cost_farm_share` × current Farm cost; price updates when Farm levels up; expected values read from the CSV | numbers TBD (re-run); needs buy-gate code | OPEN |
| L30-12 | No-workers run is reported (time per level, unreachable levels flagged); not a pass/fail gate | L30 93 min; L40 not reached in 200 min; 0/30 reach L50; gaps to 8.5 min | REPORTED, flag raised |

Note: the model's 2 h fully-offline vs active comparison (15–16×) is reported only, not gated (O3 resolved).

## 8. Open items
- **O1** Exact split growth rates (L30–40, L41–50): TBD, Economy re-running.
- **O2** Exact post-milestone bump at L36/L41/L46 (~+8%) vs spreading milestones over 2 levels: PM chose the bump; factor TBD from re-run.
- **O3 RESOLVED (v0.2):** the gap AC is the idle-vs-active ratio (L30-8), the HoP-folded item. Offline-vs-active is reported only.
- **O4** Art & UX copy for unlocks and L50 teaser.
- **O5** D1 clamp raise scheduling with HoE.
- **O7 RESOLVED:** caps become per-row `hens_cap_over_farm` / `egg_value_cap_over_farm` columns read by sync-economy (D4).
- **O6** No-workers flag: L40+ unreachable without workers. Not a target (PM decision); recorded for HoP visibility.

## Changelog
- v0.2 update (2026-10-16 23:3x): Economy CSV details in D1–D4 (rows L0–50, caps 3/5 per row, `hv_extra_cost_farm_share` 0/0.5); new D8 + L30-17 (Farm-dependent extra-level cost needs buy-gate code); step ratio still FAIL P95 4.38×, hand-tune pending HoP.
- v0.2 update (2026-10-16 23:4x): Dependencies D1–D4 (Eng items from Economy) with ACs L30-13..16; HoP option (a) pricing of F+5 levels (L30-17, TBD); O7 resolved; level-scoped step-ratio gate note.
- v0.2 DRAFT (2026-10-16 23:2x): gate standard P95 + worst-seed guards (2.25× / 4 min) replaces median/p90; L40/L50 milestones ×1.15; Hens/Egg value caps F+3 → F+5 from L40 (HoP); L50 ≈ 100 min; workers required by L30 as design assumption; all numbers TBD pending re-run; O3 resolved to idle-vs-active.
- v0.1 DRAFT (2026-10-16): first draft from Economy candidate (g 1.0984). PM decisions: split growth (TBD), +8% post-milestone bump (TBD), no-workers reported only.

## Update 2026-10-16 (Economy hand-tune, product/economy.l30plus-candidate.csv)
- Results: L35 53.8 min, L40 66.8, L50 103; step ratio P95 1.88; active/idle in band. Gap FAILS: P95 4.25 min (Hens/Egg value hit the table max of 50 from F45, so nothing is left to buy between Farm levels).
- Pending HoP choice: add rows L51-55 (Economy pick, PM Farm agrees), lower the L50 target to about 95 min, or count contracts/abilities as purchases.
- L30-17 amended: hv_extra_cost_farm_share = 0.15 × the current Farm level cost from L40, so the buy gate reads the current Farm level. Source: late-game-curve-model.md.

## Update 2026-10-16 23:37 (HoP picked option (a), relayed by Economy)
- Hens and Egg value rows are extended to L51-55. Economy re-run is pending.
- ENG DEP 1: load clamp for Hens/Egg value levels raised from 30 to 55.
- ENG DEP 2 (L30-17): the buy gate needs the current Farm level. Extra-level cost = hv_extra_cost_farm_share (0.15 from L40) x current Farm cost; the second extra level costs +10% on top.
- AC L30-18: the +$1 steps are accepted as polish, but the UI must never show a near-zero increase (no "+$0"/"+0%" style values; hide or round up the label instead).
- HoP 23:37 confirmed option (a). The L50 target stays at about 100 min, and contracts and abilities do NOT count as purchases. For L30+, the gap gate is P95 <= 4 min. The M4A-27 load clamp goes to 55, not 50.
- The approved economy.f1-m4cols.csv sha256 is 053b2ba5ad71... (the live file, with Workers columns added at 23:36); 583c0ba is superseded.

## v0.2 FINAL numbers (Economy, 100 seeds, 2026-10-16 23:44) - READY FOR HoP APPROVAL
Source: product/economy.l30plus-candidate.csv (L0-55; Farm max 50, Hens/Egg value max 55).
| Gate | Target | Result | |
|---|---|---|---|
| L35 time | <= 54 min | 53.8 | PASS |
| L40 time | 60-72 min | 67.0 | PASS |
| L50 time | ~100 min (±20%) | 102.5 | PASS |
| Step ratio L30+ | P95 <= 2.0, worst <= 2.25 | 1.88 | PASS |
| Purchase gap L30+ | P95 <= 4 min | 3.50 | PASS |
| Active/idle | 1.4-2.0 | worst 1.80 | PASS |
Engineering dependencies: clamp 55 (M4A-27); caps F+5 from L40; L30-17 extra-level cost is 0.15 × the current Farm cost (+10% for the 2nd). Polish: 16 +$1 steps; per AC L30-18 the UI never shows a near-zero increase.

## STATUS: v0.2 APPROVED by HoP (2026-10-16 23:44). Baseline for build.
Open item OI-1: the casual + workers step ratio at L36 is P95 2.40 (target 2.0). Economy is fixing it in a separate polish pass. Any number change comes back to HoP as v0.3, and v0.2 stays the baseline.
Pending before kickoff: Head of Engineering confirms buildable; Head of QA confirms testable.

## v0.3 DRAFT — QA testability answers (HoQA 23:45). Items marked [HoP] need a ruling; the rest restate existing rules.
1. Pins: economy.l30plus-candidate.csv sha256 77a68a613189... Sim is product/sim/late/late_curve.py (hash in the status line). QA baselines on these exact hashes.
2. Sample: at least 30 seeds per scenario, P95 = value at rank ceil(0.95N) (same as TR-5). Gating scenarios are standard, casual, casual+workers and active, all HARD except where item 3 says otherwise. [HoP to confirm the scenario list]
3. [HoP] casual+workers step ratio P95 2.40 at L36: PM proposes WARN-only for that scenario until Economy's polish lands in v0.3. Otherwise kickoff is a FAIL.
4. [HoP] L35 has 0.4% margin. PM proposes judging level-time targets at the MEDIAN with ±20% tolerance (the studio's "sim within ±20%" done-rule), plus the worst-seed guard. That makes L35 ≤ 54 (+20% = 64.8), L40 60–72 (48–86.4) and L50 ~100 (80–120).
5. Same as item 4: ±20% applies to all level-time targets, which are medians. Ratio and gap gates stay at P95 with no tolerance.
6. Yes. Steps from L30 count only if the previous level took ≥ 60 s, the same as L18–29 (HoP 23:30).
7. Active/idle: per seed, eggs earned over 2 h active (bot taps 1/s, buys greedy) divided by eggs over 2 h idle (offline accrual), measured at L30, L40 and L50. Gate is P95 within 1.4–2.0, with the worst seed ≤ 2.25.
8. Yes, the purchase gap has a worst-seed guard of ≤ 4 min alongside P95 ≤ 4. [HoP: P95 and worst are now the same; tighten P95 to 3?]

## v0.3 — HoP rulings 2026-10-16 23:45 (replaces the [HoP] items in the v0.3 DRAFT above). Ready for QA.
- (2) There are four gating scenarios: standard, casual, casual+workers and active. All are HARD.
- (3) EXCEPTION EX-1 (logged): in casual+workers, the L30–40 step ratio is WARN, with a HARD ceiling of P95 ≤ 2.5. Every other gate in that scenario stays HARD. EX-1 expires when Economy's polish pass lands, and HoP must close or re-approve it before release.
- (4/5) Level times are judged at the MEDIAN within ±20% of target (L35 ≤ 64.8, L40 48–86.4, L50 80–120 min). The worst-seed guard of ≤ 8 min per level is unchanged. Ratio and gap gates are judged at P95 plus the worst-seed guard.
- (8) The gap gate is HARD at P95 ≤ 4 min with worst seed ≤ 4. It WARNs if P95 > 3 min, without failing.
- Clarification (HoQA 23:46): L35/L40/L50 targets are CUMULATIVE play time from a NEW GAME (t=0) until the Farm level is reached. The ≤ 8 min worst-seed guard applies to each SINGLE level's time (time from reaching L-1 to reaching L), in every seed, for each level from L30 up. The two don't conflict.
- HOLD (HoP 23:49): CSV 77a68a613189... was built on a stale L0-29 base. Economy is rebasing and re-running. The v0.2/v0.3 rulings stand, but the numbers attach to the corrected sha (TBD). Do not baseline on 77a68a61.
- Hens and Egg value gameplay cap = 55 with real production (buyable, producing), not only the save-load clamp.
- Sim pin: late_curve.py is now f47b76be6747 (6232543b superseded). Re-pin it together with the rebased CSV. Provisional QA check (qa/m3-recheck/l30plus-gate-2026-10-16.md): 5 FAILs, all in casual with no workers (worst level 18.3 min at L31, gap P95 12 min). Open question for HoP: workers are required by L30, so should casual-no-workers gate L30+?
- HoP 23:56 ruling: at L30+, "casual" means casual+workers (HARD). Casual-no-workers is REPORT-ONLY (workers are required by L30).
- New HARD gate L30-19 (no silent wall): in casual-no-workers, from Farm L25 the worker-hire nudge must be shown, and the next worker hire must be affordable within 3 min of the nudge at P95 across ≥30 seeds.
- L30-19 is split into two parts:
  - L30-19a (sim, HARD): late_curve.py emits a hire-nudge event at Farm L25 when the player has no workers. The time from the nudge until the next worker hire is affordable must be ≤ 3 min at P95, across ≥30 casual-no-workers seeds. Economy owns the sim change.
  - L30-19b (runtime AC, PR #9 verification): in a real build save with 0 workers, reaching Farm L25 shows the hire nudge within 1 s. The nudge links to the worker hire and stays visible until a worker is hired. It does not reappear after a hire. Verified by QA on the build.
- Provisional QA run (77a68a61, 00:00): all HARD gates PASS. WARNs: EX-1 casual+workers 2.40×, gap P95 3.67. Sign-off is waiting on L30-19 and the rebased CSV.
- L30-19b detail, agreed with PM Workers at 00:01:
  - Component: reuses the rc2 first-hire nudge component, with the same New dot (data-testid="new-dot") and pulse on the Upgrades nav button and the Workers tab.
  - Placeholder hint line: "Your farm needs hands · Hire a worker ›". Final copy comes from Art & UX in rc2-workers-copy.md. Aria label: "Hire a worker. Opens Workers."
  - Trigger: data-driven, at Farm L25 with 0 workers. It fires even if the F3 nudge was used up by 2 dismissals. It can't be dismissed and clears for good on the first hire.
  - Hint precedence (one hint line at a time): coop-full first, then this nudge, then UC25, then the M4 hints.
  - Telemetry: hire_nudge_shown and hire_nudge_clicked, each with source f3 or l25.
  - AC: at L25 with 0 workers, the line and dot show within 1 s. Tapping opens Workers with the next hire highlighted. After a worker is hired, the nudge never shows again, including after a reload.
- L30-19b FINAL COPY (Art & UX 00:02): hint line "Busy farm! · Hire a worker ›" with a worker icon. Aria "Your farm is busy. Hire a worker. Opens Workers." New dot aria "New: workers can be hired". Styled like UC25: 12px accent text, 44px hit area, non-breaking spaces around "·", "›" chevron. Source: rc2-workers-copy.md.
- RE-PIN (00:04, verified on box): CSV economy.l30plus-candidate.csv sha256 3e3d61fdc869... (replaces 77a68a61; Economy reports the gates are identical). Sim late_curve.py 8c5a08a87d55... (replaces 6232543b/f47b76; includes the nudge event). The v0.2 numbers attach to these pins.
- Polish candidate b59c4e0d is pending HoP (v0.3 numbers): casual step 2.00/2.20, 0 +$1 steps, gap 3.25, L35 54.5 (within the median ±20% rule). Casual-no-workers: the cause is before L30 and there's no cheap curve fix. It stays report-only, with L30-19 as the guard.

## v0.3 FINAL (HoP 00:04)
- The baseline is 3e3d61fdc869. The SHIPPING candidate is polish b59c4e0d (HoP approved). EX-1 should close on b59c4e0d once QA confirms casual+workers 2.00/2.20.
- L30-19 trigger confirmed: the L25 hire nudge has its OWN trigger, which is reaching Farm L25 (F25+) with 0 workers. It's independent of the coop-full nudge, which never fires for no-worker casual players.
- HoP override of the 00:01 PM Workers behaviour: the nudge is shown once per session and is DISMISSIBLE. A dismissal hides it for the rest of that session, and it shows again next session while workers = 0. It clears for good on the first hire, including after a reload.
- L30-19a (sim, HARD in casual-no-workers): the nudge event is the first time F25 is reached. The next hire must be affordable within 3 min at P95. QA provisional: P95 20 s, PASS.
- Re-pin (00:12): sim late_curve.py f0e3f1180ab0 (adds the nudge_f25_noworker event). QA baseline is 3e3d61fd + f0e3f118: OVERALL PASS, L30-19a 30/30 fired with P95 and worst 20 s.
- Polish b59c4e0d: OVERALL PASS, but EX-1 stays OPEN. Casual+workers L30-40 step ratio is P95 2.20 and worst 2.20 (over 2.0, under the 2.5 ceiling). Before release, either Economy brings P95 to ≤ 2.0 or HoP re-approves EX-1 in writing.
- 2026-10-17 00:12 HoP (written): EX-1 is RE-APPROVED for release, with a tighter limit. In casual+workers, the L30-40 step ratio may go up to P95 ≤ 2.25 and worst ≤ 2.25, replacing the 2.5 ceiling. Current 2.20/2.20 PASSES. No more pre-release Economy work; post-launch telemetry re-judges it. Casual+workers L40 at 71.0 min is accepted under the ±20% rule. Polish b59c4e0d is CLEARED for release; fallback is 3e3d61fd.
- 2026-10-17 00:18 PM Farm: L30+ v2 is now PR #12 (replaces #9). The nudge dismiss per session is confirmed per HoP 00:04. Full hint precedence is a release AC once rc2/UC25 land. Release sign-off needs PR #12 runtime QA (incl. L30-19b) plus the rc1/rc2 gates (HoQA).
- 2026-10-17 00:29, reported by Economy as HoP-approved at 00:28; no HoP entry found in decisions.md yet, APPROVED by HoP 00:29 (see below):
  - Sim re-pin: late_curve.py ab928dc96d1c (verified on the box).
  - L30-17 AMENDED: the extra-level price = max(row cost, 0.15 × current Farm cost × markup), where the markup is 1.0 for the 1st extra level and 1.10 for the 2nd. It no longer replaces the row cost.
  - 3e3d61fd is RETIRED as the fallback. If b59c4e0d regresses, the L30+ release holds.
- 2026-10-17 00:29 HoP (direct, approved at 00:28): (1) the sim re-pins to late_curve.py ab928dc96d1c, whose only change is the max() patch; (2) L30-17: the extra-level price = max(row cost, 0.15 × current Farm cost × markup); (3) 3e3d61fd is retired, and if b59c4e0d regresses the L30+ release holds; (4) the official gate is 100 seeds, with EX-1 measured over L30-40 and other ratios over L30-50. HoQA's rerun on the new sha is the release gate.
