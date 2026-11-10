# Focus/Bulk cooldown sweep (Focus premium +1.5%): seller15 managed, ALL stack + abilities v0.3, 30-min session, 30 seeds, economy.f1-m4cols.csv

| cooldown | F | switch vs Focus mean | worst seed | best seed | switches/session (med) | switch vs Bulk mean | managed/unmanaged min (all seeds) | managed/idle worst seed (CEO 10-min window) |
|---|---|---|---|---|---|---|---|---|
| 30 s | F10 | -0.16% | +0.11% | -0.78% | 4 | +1.62% | 1.79 | nan |
| 30 s | F18 | -0.07% | +0.55% | -0.70% | 4 | +1.65% | 2.30 | nan |
| 30 s | F22 | +0.02% | +0.96% | -0.74% | 4 | +1.62% | 2.65 | 2.19 |
| 30 s | F23 | -0.04% | +1.05% | -0.90% | 6.5 | +1.53% | 2.67 | 2.20 |
| 30 s | F24 | +0.03% | +1.61% | -1.24% | 10 | +1.51% | 2.76 | 2.21 |

static: Focus vs Bulk mean by F: {10: '+1.78%', 18: '+1.72%', 22: '+1.60%', 23: '+1.58%', 24: '+1.49%'}

## Verdict per cooldown (criterion 1: switch gain over Focus <= 2% mean AND worst seed, all F; criterion 2: F22-24 managed/unmanaged >= 1.5 every seed, managed/idle <= 2.0 worst seed on the CEO 10-min in-tab window)
- 30 s: (1) PASS (2) FAIL
