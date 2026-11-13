# First-hire nudge, casual model, economy.m4-candidate.csv, 200 seeds

| case | F3 unlock -> first hire: median / P95 / worst (min) | worker by L10 | L@30:00 median [min-max] | in band L20-24 | F18 median (min) | AC-FH3 (med <=3, P95 <=8, >=90% by L10) |
|---|---|---|---|---|---|---|
| nudge | 0.67 / 1.33 / 1.67 | 100% | L21 [19-21] | 198/200 | 24.7 | PASS |
| no_nudge | 7.67 / 32.67 / 54.00 | 54% | L20 [18-21] | 179/200 | 25.5 | FAIL |
| instant | 0.00 / 0.33 / 0.67 | 100% | L21 [19-21] | 198/200 | 24.7 | PASS |
| never hires | — | 0% | L17 [16-17] | 0/200 (no-worker band L18-22: 0/200) | 34.7 | FAIL |
