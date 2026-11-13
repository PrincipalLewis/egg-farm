# Refill v0.4 (150 s / cap 2 / thr 40% / combo 10 s->45 s, single-row, live risk), economy.f1-m4cols.csv, seeds 0-99

| config | F10 med | F18 med | F25 med | F30 med | L@30:00 med | worst gap min | refills/15 min (med) | not-lowest | dead zones (max s) | shortage share | freeze checks ok |
|---|---|---|---|---|---|---|---|---|---|---|---|
| s15_rf | 10.50 | 20.25 | 32.25 | 40.75 | 23 | 1.75 | 4.6 | 0% | 0 (15) | 0% | 0/0 |
| s15_rc1 | 10.50 | 20.25 | 32.25 | 40.75 | 23 | 1.50 | 4.6 | 0% | 0 (0) | 0% | 0/0 |
| s15_unm | 10.50 | 20.50 | 33.75 | 57.25 | 23 | 5.50 | 0.0 | 0% | 0 (0) | 0% | 0/0 |
| s15_none | 10.00 | 20.75 | 46.75 | — | 21 | 2.75 | 0.0 | 0% | 0 (0) | 0% | 0/0 |
| cas_rf | 14.00 | 25.00 | 37.00 | — | 21 | 2.00 | 4.6 | 0% | 0 (20) | 4% | 0/0 |
| cas_rc1 | 14.00 | 25.00 | 37.00 | — | 21 | 2.00 | 4.6 | 0% | 0 (0) | 0% | 0/0 |
| cas_none | 15.00 | 34.67 | — | — | 17 | 2.67 | 0.0 | 0% | 0 (0) | 0% | 0/0 |
| slow_rf | 13.25 | 22.75 | 34.75 | 43.25 | 22 | 1.75 | 4.3 | 0% | 0 (15) | 4% | 0/0 |
| slow_none | 14.00 | 33.50 | — | — | 17 | 3.50 | 0.0 | 0% | 0 (0) | 0% | 0/0 |
| s15_rf_sess | 10.00 | 18.25 | 29.91 | 37.53 | 25 | 2.00 | 4.5 | 2% | 0 (51) | 4% | 274/274 |
| s15_rc1_sess | 10.00 | 18.25 | 29.91 | 37.53 | 25 | 2.00 | 4.8 | 0% | 0 (0) | 0% | 274/274 |
| cas_rf_sess | 12.00 | 22.78 | 34.77 | 41.53 | 22 | 2.33 | 4.3 | 0% | 0 (60) | 3% | 300/300 |

| gate | value | result |
|---|---|---|
| AC-W1 casual F10 <=15 min in >=95% seeds, F18 med <=40 | 99%, 25.0 | PASS |
| AC-W2 s15 rf vs rc1 at F10/F18 <= +1 min | +0.00 / +0.00 | PASS |
| AC-W3 unmanaged F25 < no workers F25 | 33.8 vs 46.8 | PASS |
| AC-W4 s15 rf steps F18-F25 <= 6 min (med), F25 <= 70 | 2.00, 32.2 | PASS |
| AC-W5 >=1 refill/manage action per 15 min (telemetry) | 4.6 | PASS |
| AC-W6 slow tapper: workers beat none by >=4 min at F18 and >=15% income F20-22 (proxy) | 10.8 min, +293% | PASS |
| AC-W7 L@30:00 with workers L20-24, without L18-22 | 23 / 21 | PASS |
| Freeze: offline/hidden>=60 s leaves energy, charges, ability timers unchanged | 574/574 | PASS |
| Sessions: no dead zone, F25 (active clock) loss vs rc1 sessions <= 10% | dz 0, +0.0% | PASS |
