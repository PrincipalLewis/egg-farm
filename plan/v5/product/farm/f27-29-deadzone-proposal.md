# Proposal: F27–29 Farm-save dead zone (flag-off) · v0.3 · 2026-10-25 03:45 CET (v0.3: SINGLE VALUE o1a for both pickers, D-HOP-2026-10-25-11; g25/g50 moved to Appendix A; per D-HOP-2026-10-25-08 — Econ current-picker run: g50 FAILS BB-9 (s35 183.0 s); o1a verified exactly; v0.2: HoP D-HOP-2026-10-25-06 items 2–4: BBv2 isolation + sized-down cut, F30–35 check, Workers LR re-run note; v0.1 02:45 CEST)
From: PM Farm Upgrades → Head of Product (Economy to check numbers). **Paper only** (build hold). Basis: Econ `product/workers/reviews/m5.1-shipping-rerun-econ.md`; PMFU scratch `farm/scratch/f27/f27-options-results.md` (Econ's runner, flag-off, CSV 8dc90e2b, seeds 1–200; baseline reproduced per-seed exactly). All figures SCRATCH, not gate runs.

## Problem
Dead zone P50/P95/worst (s): optimal 135/**244**/308 · seller15 104/174/277 · casual 85/163/**219**. ("244/219" = optimal P95 and casual worst; casual P95 already passes.)
Cause: the bot buys every affordable row at check-ins, incl. zero-gain Collection, which resets the save; the next Farm step slips and one stretch runs F27→F30. Cutting the F27–30 save fixes it; adding cheap buys doesn't.

## Options (all pass: dead-zone P95 ≤ 180 on all 3 profiles, worst ≤ baseline, AC7 L30 band 18–22 on 200/200 seeds, L10 window unchanged, every L18–29 level ≤ 8 min)
| Option | economy.csv change | Dead zone opt / seller15 / casual (P50/P95/worst) | L30 P50 opt/cas (min; base 33.4/37.2) | G4 P95/worst (base 196/305) | BB-9 P95, seeds >180 (base 246.5, 200) |
|---|---|---|---|---|---|
| **A (rec.) o1a — cheaper F27–29 steps** | farm_cost r27 177,624→160,000; r28 239,792→175,000; r29 323,719→190,000 (L0–30 Farm spend −16.5%) | 87/147/206 · 74/109/154 · 56/100/192 | 30.74 / 34.38 | 115/153 | **129.1, 0** |
| A′ o1b — deeper | r27→145,000; r28→155,000; r29→165,000 (−21.1%) | 82/139/177 · 73/103/123 · 54/95/188 | 30.56 / 34.01 | 105/164 | 128.4, 0 |
| B o2e — Grader steps in the gap | Grader r27–30: tier 5→6/7/8/8; price ×4.0→4.4/4.8/5.2/5.2; tier cost $51,567→$20,000 | 105/163/228 · 99/161/169 · 95/148/191 | 32.65 / 36.27 | 139/175 | 237.9, 103 |
| C o3b — milestone: egg grade 4 | new cols: Egg value grade 4 ×2.0 at Farm 27 (grade 3 = ×1.5) | 105/154/237 · 80/124/171 · 62/120/159 | 32.24 / 35.79 | 152/226 | 188.2, 44 |

Warning only (G4 split rule, worst ≤ 180): A leaves optimal 206 / casual 192; A′ casual 188 — the remaining stretch is an F26/27 Egg-value wait, not the Farm save.

## Recommendation: A (o1a) — selected, D-HOP-2026-10-25-11
Smallest change (3 cells, one column, CSV-only, rows 0–26 untouched); removes the cause; with A′ the only options that also clear BB-9 (0/200 seeds > 180; B and C leave 103 and 44). Cost: L30 ≈ 2.7–2.8 min sooner (still inside AC7 18–22), L28–29 become quick steps (P95 51–90 s). Choose A′ only if HoP wants optimal's worst seed ≤ 180 (177).

## Freeze / dependencies
- All options touch frozen rows 0–30 → need the D-CEO-15/16 amendment; D-CEO-20261024-08 already routes the dead-zone fix into the M5.1 L0–30 unfreeze. Route with BBv2 v0.3 (f128f1e6).
- C also needs code (`src/ui/tracks-ui.ts:9` has 3 grade names → "undefined") and an Art name.
- Interaction with BBv2: with Econ's zero-gain-skipping picker BB-9 is 146.1 s on today's CSV and 100.9 s with o1a — A and BBv2 compound, so the M5.1 gate re-baseline must run them together.

- **Workers M5.1 re-run (D-HOP-2026-10-25-06 (4)):** the Workers M5.1 ACs measured against the flag-off baseline (AC-LR10, AC-LR11, AC-LR12; `workers/m5.1-lighter-refill-proposal.md`) are relative to today's CSV. AC-LR11's bar is the casual flag-off meaningful-row G4 (219 s, seed 116). If A lands, Economy re-runs LR10, LR11 and LR12 on the new flag-off baseline (CSV with o1a), and their bars are re-read from that baseline before the Workers M5.1 sign-off. Owner: Economy, with PM Workers; QA notes the new bars.

## v0.2 addendum (D-HOP-2026-10-25-06) — details `farm/scratch/f27/f27-options-results.md` §6–7
### (2) Isolation: BBv2 zero-gain-skipping picker alone, current CSV 8dc90e2b
Picker = PMFU scratch BBv2 Part A (the same rule Economy's g4.ts uses; not HoE's build). All profiles buy through it; Collection buys by L30 drop 23 → 3.
| Profile | base (current picker) P50/P95/worst | BBv2 alone | BBv2 + o1a |
|---|---|---|---|
| optimal | 135/244/308 | 85/136/168 | 67/106/142 |
| seller15 | 104/174/277 | 76/129/164 | 50/90/160 |
| casual | 85/163/219 | 108/165/**247 (FAIL worst ≤ 219)** | 69/112/142 |
- **Root cause is mostly the bot/★ buying zero-gain Collection:** BBv2 alone brings every P95 ≤ 180 and BB-9 to 146.1 P95 (0 seeds > 180). It does **not** fully pass: casual's worst seed rises to 247 (s173, F27 waiting on FARM) and casual P50 gets worse (85 → 108). → Per HoP, PM Collection opens an item on zero-gain purchases shown to players.
- BBv2 itself (not the cut) moves L10: AC7 `fastest ≥ 7.8` fails (no-workers 7.87 → 7.5, workers 8.32 → 7.56). That is the window amendment already in BBv2 proposal v0.3 §5(a) (7.0–10.0). AC7 L@30 stays in band 200/200 (workers P95 now on the 24 edge). Every cost variant leaves L10/AC7 identical to BBv2-alone.

### (3) F30–35 check (current picker; CSV has no rows past 30, window = 15 min after L30 ≈ F30–35, plus 30 min)
- After L30 MAX the only buyable row is Collection (gain 0), so the meaningful-wait is the **whole window on every variant, base included** (measured: 900/900/900 and 1800/1800/1800 on 200/200 seeds). This is the pre-existing L30 MAX dead zone, not created by o1a.
- **o1a creates no new kind of wait > 180 s**; it reaches the same dead zone ~2.7–2.8 min sooner. Any-purchase gaps after L30 are lower at P50 in all 12 cells; a few worst/P95 cells move up by phasing (e.g. seller15 nothing-affordable worst 665 → 729 s in 15 min).
- **Fixed session, P50 total dead time (pre + post L30) is essentially unchanged:** 45 min: optimal 1937 → 1934 s, seller15 1615 → 1625, casual 1170 → 1202; 60 min similar. o1a moves ~160–170 s of waiting from the mid-progression F27–29 save to the L30 cap.
- **Implication:** the F27–29 fix is worth it because a mid-progression stall is worse than a cap state, and the cap state is where M5.1 already adds a target (breeds BR-BB4 "Hatch" strip, #12 L30 payoff); but it does not reduce total dead time per session. The L30 cap dead zone needs L30+ content (L30+ rows / Farm max 50), which is out of this proposal and not in the CSV of record.

## v0.3 decision record (D-HOP-2026-10-25-08 pre-set rule; Econ `scratch/f27-verify/f27-verify.md` sha1 49efcf76)
**Chosen CSV value: o1a.** economy.csv `farm_cost` r27 177,624 → **160,000**; r28 239,792 → **175,000**; r29 323,719 → **190,000**. No other cell changes (variant sha256 a8c4e268…, LF; checked by Econ).
- **Single value for both pickers (D-HOP-2026-10-25-11):** o1a applies with the current picker (flag-off) and with BBv2 (flag on). Graded cuts g25/g50 are out; see Appendix A.
- o1a reproduced exactly by Econ: dead zone 87/147/206 · 74/109/154 · 56/100/192 (base 135/244/308 · 104/174/277 · 85/163/219); L30 P50 30.742 / 34.378 min; G4 115/153; BB-9 P95 129.1, 0 > 180; AC7 200/200; L10 unchanged; G1 and every L18–29 ≤ 8 min pass.
- With BBv2 also on (M5.1), o1a gives 67/106/142 · 50/90/160 · 69/112/142 and BB-9 P95 100.9 (§v0.2 table) — no conflict; BBv2's own L10 window amendment stands separately in BBv2 v0.3.
- **Before merge:** full gate set on QA's TS bot with the o1a CSV (Econ); Workers AC-LR10/11/12 re-read on the new flag-off baseline (see Freeze section).
- **Approval path:** HoP approval → CEO via the M5.1 unfreeze package (D-CEO-15/16 amendment), with BBv2 v0.3. Build waits for Vadim's go.
- Known limit **K-F1** (L30 cap dead zone; total dead time per session unchanged) is owned by PMFU for M5.2.

## Ask
HoP: o1a selected (D-HOP-2026-10-25-11); goes to the CEO in the M5.1 kickoff package. Econ: done (49efcf76) on your runner; files and variant sha256s in `farm/scratch/f27/csv/variants.json`.

## Appendix A: superseded graded cuts (g25, g50; not proposed)
With BBv2 (scratch Part A), current CSV, seeds 1–200, dead zone P50/P95/worst: g25 optimal 77/137/166, seller15 67/118/187, casual 98/149/217; g50 68/122/144 · 64/108/129 · 87/127/203.
- **Sized-down cut with BBv2:** smallest passing graded cut is g25 (r27/28/29 = 173,218 / 223,594 / 290,289; −4.1%), but casual's margin is 2 s and the response is non-monotone below it (g10/g15/g20 casual worst 245/291/281), so g25 is not robust. **g50 (168,812 / 207,396 / 256,860; −8.3% of rows 0–29 Farm spend) is the first cut with a clear margin** (worst 144/129/203 vs 308/277/219; all P95 ≤ 127; BB-9 121.9 P95).
- g50 on the current picker FAILS BB-9: 1 seed > 180 (s35 183.0 s; next s61 178.2). Its dead zone there is 102/162/200 · 82/127/211 · 66/109/195 (the 68/122/144 in v0.2 is BBv2-only, not comparable). Per the pre-set rule → o1a.
### Superseded v0.2 recommendation (record only)
- **If BBv2 ships in M5.1 (proposal v0.3):** take **g50** (rows 27/28/29 = 168,812 / 207,396 / 256,860), half of o1a's cut. Robust margin on all profiles with BBv2; smaller change to frozen rows.
- **If BBv2 does not ship, or for the flag-off (current-picker) path:** keep **o1a** (160,000 / 175,000 / 190,000). g50 is not yet measured on the current picker; Econ to run it if HoP wants g50 for both paths.
- Both need the D-CEO-15/16 amendment; route with the M5.1 unfreeze package and BBv2 v0.3.
- Superseded by D-HOP-2026-10-25-11 (one value, o1a, for both pickers).
