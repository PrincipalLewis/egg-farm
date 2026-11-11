# TR-5 step-ratio detail — economy.f1-m4cols.csv, 30 seeds, standard

## HoP rule (prev >= 1 min) — L18-29 ratios > 2.25x

| seed | level pair | t(prev level) min | t(this level) min | ratio |
|---|---|---|---|---|
| — | none | — | — | — |

Count: 0

## Legacy floor (prev >= 30 s) — L18-29 ratios > 2.25x (informational; matches PM WARN 6.50x)

| seed | level pair | t(prev level) min | t(this level) min | ratio |
|---|---|---|---|---|
| 0 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 1 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 2 | F17->F18 | 0.50 | 3.00 | 6.00x |
| 3 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 4 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 5 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 6 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 7 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 8 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 9 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 10 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 11 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 12 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 13 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 14 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 15 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 16 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 17 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 18 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 19 | F17->F18 | 0.50 | 3.25 | 6.50x |
| 20 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 21 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 22 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 23 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 24 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 25 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 26 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 27 | F17->F18 | 0.75 | 3.25 | 4.33x |
| 28 | F17->F18 | 0.75 | 3.00 | 4.00x |
| 29 | F17->F18 | 0.75 | 3.00 | 4.00x |

Count rows >2.25x: 30
P95(worst-per-seed)=6.50x  worst=6.50x  (WARN-ONLY under HoP 23:30)

## Pending HoP proposal note
The >=1 min previous-level floor is now the ruling (ac7-qa-threshold-changes.md line 18). Under that floor: P95=1.40x, worst=1.40x, zero rows >2.25x — WARN-OK.
