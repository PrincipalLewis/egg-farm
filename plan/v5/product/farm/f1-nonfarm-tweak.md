# F1 non-Farm buy share: data-tweak check · PM Farm Upgrades · 2026-10-16 14:05 (UTC+2)
Ask (HoP via Economy): a data-only tweak so non-Farm upgrades win ≥ ~30% of next buys for the Collection-aware greedy bot (Vadim only ever bought Farm). Farm + Collection only, no workers, queue/coop tiers unchanged.
Tables:
- `product/economy.f1.csv`, which already has F1-GAP (rows 18/19 farm_cost 11,076 / 18,201).
- The shipped rc1 table `game-rc1-ui/data/economy.csv` (still pre-F1 farm costs: L6 605 … L19 29,946).

Sim: `product/farm/f1_nonfarm.py` (30 seeds, tap 1/s, Sell all every 15 s; casual = Poisson, 20 s, ×0.75; 6 h horizon for L30). Greedy = the TR-5 bundle-ROI logic restricted to Farm/Collection. Canonical files untouched.

## 1. Baseline: the greedy bot already buys Collection 43–44% of the time
| Table | L0–5 | L5–10 | L10–15 | L15–20 | **L0–20** |
|---|---|---|---|---|---|
| economy.f1.csv (+F1-GAP) | 50% | 44% | 29% | 44% | **43% (450/1050 buys)** |
| rc1 shipped (pre-F1) | 50% | 44% | 44% | 38% | **44% (480/1080)** |
Workers excluded (per Economy). The AC7 seller15 rule also lands at 43%.

**Ignoring Collection is already heavily punished** (economy.f1.csv, standard player):
| Strategy | L5 | L10 | L18 | L@30 | L30 |
|---|---|---|---|---|---|
| greedy | 4.50 | 8.25 | 19.50 | L20 (30/30) | 195 min |
| **Farm only** | 5.25 | **14.25** | **77.75** | **L13** (0/30) | not reached in 6 h |
Farm-only steps at L5–14 run 60–390 s; the worst gap is 4.75 min at F12. It fails every F1 gate.
So the data already makes Collection the right buy about 4 times in 10, and skipping it costs about 6 min to L10 and about 58 min to L18. **Vadim's Farm-only play is not a balance problem.** The game just doesn't tell him: Collection is a second tab, and nothing points at it when it's the better buy.

## 2. Data levers tried (Collection only; no Farm cost raises)
| Candidate (file) | Change | greedy non-Farm L0–20 | L10 | L@30 | L30 | max gap | L5–14 steps | F1 gates |
|---|---|---|---|---|---|---|---|---|
| baseline (economy.f1.csv) | — | 43% | 8.25 | L20 30/30 | 195.0 | 3.00 (F20) | 45–75 ✓ | all pass |
| A `f1-nonfarm-A-bonus15.csv` | collection_price_bonus 0.12 → 0.15/level | 43% | **7.75 ✗** | L21 | **166.8 ✗** | **3.75 ✗** | 30–75 ✗ | fail L10, L30, gap |
| B `f1-nonfarm-B-growth150.csv` | Collection growth 1.6 → 1.50 | 46% | 8.00 | L20 | **178.0 ✗** | 2.75 | 30–75 ✗ | fail L30 band (180–300) |
| C `f1-nonfarm-C-growth145.csv` | Collection growth 1.6 → 1.45 | 49% | **7.75 ✗** | L21 | 180.2 | **3.50 ✗** | 30–75 ✗ | fail L10, gap |
- Every Collection buff speeds the whole game up (Collection's price bonus compounds) and breaks the F1 gates. None of them shifts the share much (+3 to +6 points), because the share is already 43%.
- Farm-only times are identical under all candidates (Farm-only never buys Collection), so they don't widen the punishment gap beyond today's.
- F22–24 step ratio: my per-step metric is noisy because Collection buys alternate with Farm buys. The baseline itself reads 1.84 (B 1.68, C 1.26), so I can't certify Economy's 1.54 rule with this sim. Use Economy's tool for that check.
- Casual and −25%: baseline greedy L@30 19 / 20 (30/30). Candidates are similar, but casual gaps rise to 3.67–4.0 min with A, B and C.

## 3. Recommendation: **no data tweak**
- Baseline greedy already picks Collection 43% of the time (≥30% target met with margin), and Farm-only is already punished hard (L10 14.25 vs 8.25 min, L@30 L13 vs L20). Every data buff tested breaks at least one F1 gate.
- **Fix it in UX instead** (Art & UX / PM Collection; no economy change):
  1. A "best value" highlight on whichever row (Farm or Collection) the TR-5 greedy rule picks, the same rule as the M4 cheapest-row/best-value hint (upgrades §7.4).
  2. The next-goal strip should name Collection when it's the greedy pick. Today the targets are mostly Farm.
  3. Show the time-to-afford hint on the Collection row too.
  
  Check Vadim's telemetry to see whether he ever opened the Collection tab.
- If HoP still wants a data change, **B (growth 1.50)** is the least bad: +3 points of share, L10 8.00, L@30 L20. It breaks L30 (178 min, just below 180), so it needs Economy to restore the late curve, e.g. a small Farm cost bump at L25+, which Economy wanted to avoid.

## 4. Cross-check with Economy (2026-10-16 13:47)
Economy's look-ahead buyer: 43–44% non-Farm before L20 without workers (44–46% with workers). Mine: 43% (economy.f1.csv + F1-GAP) and 44% (rc1 shipped), no workers. **The numbers agree**, so the search is stopped. Economy's lever results also match mine (at most +6 points, breaking the 3-min gap and the L5–14 floor).
**Joint recommendation: no CSV change. UI fix on the Collection button:** show its "+12% egg price" effect and its payback time (cost ÷ income gain), and highlight it when it's the better buy (§3).
