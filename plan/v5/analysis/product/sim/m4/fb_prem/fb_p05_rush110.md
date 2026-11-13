# Focus/Bulk cooldown sweep (Focus premium +5.0%): seller15 managed, ALL stack + abilities v0.3, 30-min session, 30 seeds, economy.f1-m4cols.csv

| cooldown | F | switch vs Focus mean | worst seed | best seed | switches/session (med) | switch vs Bulk mean | managed/unmanaged min (all seeds) | managed/idle worst seed (CEO 10-min window) |
|---|---|---|---|---|---|---|---|---|
| 30 s | F10 | -0.35% | +0.00% | -1.23% | 4 | +4.62% | 1.81 | nan (P95 nan) |
| 30 s | F18 | -0.23% | +0.45% | -1.10% | 4 | +4.58% | 2.31 | nan (P95 nan) |
| 30 s | F22 | -0.14% | +0.83% | -0.97% | 4 | +4.52% | 2.67 | 2.16 (P95 2.11) |
| 30 s | F23 | -0.27% | +0.91% | -1.21% | 6 | +4.35% | 2.68 | 2.17 (P95 2.11) |
| 30 s | F24 | -0.31% | +1.10% | -1.68% | 10 | +4.22% | 2.77 | 2.18 (P95 2.11) |

static: Focus vs Bulk mean by F: {10: '+4.99%', 18: '+4.82%', 22: '+4.67%', 23: '+4.63%', 24: '+4.55%'}

## Verdict per cooldown (criterion 1: switch gain over Focus <= 2% mean AND worst seed, all F; criterion 2: F22-24 managed/unmanaged >= 1.5 every seed, managed/idle <= 2.0 worst seed on the CEO 10-min in-tab window)
- 30 s: (1) PASS (2) FAIL
