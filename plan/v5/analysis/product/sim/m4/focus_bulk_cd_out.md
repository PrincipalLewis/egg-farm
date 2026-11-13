# Focus/Bulk cooldown sweep: seller15 managed, ALL stack + abilities v0.3, 30-min session, 30 seeds, economy.f1-m4cols.csv

| cooldown | F | switch vs Focus mean | worst seed | best seed | switches/session (med) | switch vs Bulk mean | managed/unmanaged min (all seeds) | managed/idle worst seed (CEO 10-min window) |
|---|---|---|---|---|---|---|---|---|
| 0 s | F10 | -0.17% | +0.09% | -0.80% | 4 | +4.79% | 1.81 | nan |
| 0 s | F18 | -0.09% | +0.52% | -0.74% | 4 | +4.69% | 2.32 | nan |
| 0 s | F22 | -0.01% | +0.96% | -0.77% | 4 | +4.59% | 2.67 | 2.18 |
| 0 s | F23 | -0.04% | +1.14% | -0.94% | 10 | +4.52% | 2.69 | 2.19 |
| 0 s | F24 | -0.02% | +1.33% | -1.21% | 13 | +4.43% | 2.77 | 2.20 |
| 15 s | F10 | -0.25% | +0.00% | -1.00% | 4 | +4.70% | 1.81 | nan |
| 15 s | F18 | -0.15% | +0.49% | -0.91% | 4 | +4.62% | 2.32 | nan |
| 15 s | F22 | -0.08% | +0.87% | -0.86% | 4 | +4.53% | 2.67 | 2.18 |
| 15 s | F23 | -0.16% | +0.93% | -1.24% | 8 | +4.39% | 2.69 | 2.18 |
| 15 s | F24 | -0.13% | +1.40% | -1.38% | 10 | +4.32% | 2.77 | 2.19 |
| 30 s | F10 | -0.34% | +0.00% | -1.28% | 4 | +4.60% | 1.81 | nan |
| 30 s | F18 | -0.23% | +0.45% | -1.16% | 4 | +4.54% | 2.32 | nan |
| 30 s | F22 | -0.14% | +0.82% | -0.98% | 4 | +4.46% | 2.67 | 2.17 |
| 30 s | F23 | -0.27% | +0.90% | -1.21% | 6 | +4.28% | 2.68 | 2.18 |
| 30 s | F24 | -0.30% | +1.14% | -1.70% | 10 | +4.14% | 2.77 | 2.19 |
| 60 s | F10 | -0.52% | +0.00% | -1.62% | 4 | +4.42% | 1.81 | nan |
| 60 s | F18 | -0.38% | +0.39% | -1.57% | 4 | +4.38% | 2.32 | nan |
| 60 s | F22 | -0.26% | +1.01% | -1.22% | 4 | +4.33% | 2.67 | 2.17 |
| 60 s | F23 | -0.44% | +0.98% | -1.51% | 6 | +4.10% | 2.68 | 2.17 |
| 60 s | F24 | -0.39% | +0.96% | -1.66% | 6 | +4.05% | 2.77 | 2.19 |

static: Focus vs Bulk mean by F: {10: '+4.96%', 18: '+4.78%', 22: '+4.61%', 23: '+4.56%', 24: '+4.46%'}

## Verdict per cooldown (criterion 1: switch gain over Focus <= 2% mean AND worst seed, all F; criterion 2: F22-24 managed/unmanaged >= 1.5 every seed, managed/idle <= 2.0 worst seed on the CEO 10-min in-tab window)
- 0 s: (1) PASS (2) FAIL
- 15 s: (1) PASS (2) FAIL
- 30 s: (1) PASS (2) FAIL
- 60 s: (1) PASS (2) FAIL
