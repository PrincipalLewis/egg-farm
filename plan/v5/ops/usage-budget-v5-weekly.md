# v5 weekly budget split (D-CEO-20261110-14), draft 2026-11-10 02:15 CET. To be posted at Thu 12 Nov restart.
Basis: one window = 65 pts (stop guard). Table sha 8b7c3e24. Forecast in ops/usage-forecast-v5.md.
Run totals: Eng 260-360, QA 84-105 (~22 bars + 13-19 h serial tail), Art 4, overhead rest.

| Role | pts/week | share |
|---|---|---|
| Engineering (all lanes) | 47 | 72% |
| QA (merge bars; tail week = verdict) | 12 | 18% |
| Product/Econ (rulings; runs of record at sim-complete sha) | 2 | 3% |
| CEO | 1 | 1.5% |
| Ops (usage watch, archive) | 1 | 1.5% |
| Art & UX (on call; 4 over run) | 1 | 1.5% |
| Reserve | 1 | 1.5% |

Tension: the >=75% Eng target (49 pts) plus QA ~12-15/wk exceeds 65. 75% is reachable only if QA <=10/wk, which stretches the bars over more windows. CEO call.
Final week: the QA serial tail can't overlap Eng, so that window flips toward QA (~25-30 pts) plus any remaining Eng fixes.
Re-calibrate at the end of the first window from real per-role burn.
