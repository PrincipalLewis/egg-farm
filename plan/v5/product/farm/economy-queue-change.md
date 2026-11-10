# Proposed economy change: queue_max cap at 5 · 2026-10-15 · PM, Farm Upgrades
For review by PM Market/Customers, then Head of Product to apply. economy.md / economy.csv NOT edited by me.

## Context
Head of Product decision (P2, 2026-10-15): max customer queue is **3 at L0–9, 4 at L10–19, 5 at L20–30**, and the 3 s minimum arrival gap stays.
The current canonical files already have `queue_max = 3 + floor(L/10)`, written in by HoP after the market sim. That matches the decision everywhere **except L30, where it gives 6**. The only change needed is to cap it at 5.
Pacing impact: none. L30 is the max level, so the extra slot only affects selling after max, and the Farm sim does not change.

## economy.md
```diff
-| Queue max (co-owned with PM Farm Upgrades) | 3 + floor(L/10) (farm, `queue_max`) | 3 | 4 (L20–29: 5, L30: 6) |
+| Queue max (co-owned with PM Farm Upgrades) | min(5, 3 + floor(L/10)) (farm, `queue_max`) | 3 | 4 (L20–30: 5) |
```
```diff
-`queue_max` = 3 + floor(L/10) per Farm level (Head of Product 2026-10-15, after the market sim; co-owned with PM Farm Upgrades, since it is a Farm-level benefit).
+`queue_max` = min(5, 3 + floor(L/10)) per Farm level: 3 at L0–9, 4 at L10–19, 5 at L20–30 (Head of Product 2026-10-15, Farm P2; co-owned with PM Farm Upgrades, since it is a Farm-level benefit).
```

## economy.csv (row 30 only; column `queue_max`, 15th field)
```diff
-30,662,155,203213,155,31.0,1550,4.0,3.0,33,68,15.5,111600,30,6,10
+30,662,155,203213,155,31.0,1550,4.0,3.0,33,68,15.5,111600,30,5,10
```

## economy_sim.py (generator, so the CSV regenerates correctly)
```diff
-def qmax(f): return QUEUE_BASE+f//10  # HoP 2026-10-15; co-owned with PM Farm Upgrades
+def qmax(f): return min(5,QUEUE_BASE+f//10)  # HoP 2026-10-15 (Farm P2: 3/4@L10/5@L20); co-owned with PM Farm Upgrades
```

## Knock-on (PM Market/Customers to update)
- market/feature-spec.md table row: `| queue_max | 3 + floor(L/10) | 3 | 4 | 6 (L20–29: 5) |` → `| queue_max | min(5, 3 + floor(L/10)) | 3 | 4 | 5 (L20–30) |`
- Edge case 7: "grows at L10/20/30" → "grows at L10/20".
- MK-3b: "…5 at L20–29, 6 at L30" → "…5 at L20–30".
- core-loop-spec.md (HoP): "max queue 3" in loop step 3 and AC3 "queue never exceeds 3" → "queue_max(L)".
