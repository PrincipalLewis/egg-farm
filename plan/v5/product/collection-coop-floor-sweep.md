# Coop-cap floor sweep, cap = max(cap, ceil(N × lay rate)) at F8+ (Economy, 2026-10-16 23:20) — for PM Collection
**Status: proposal only.**

**Code (all under `sim/telemetry/`):**
- `tel_sweeps.py`, `tel_sweeps_report.md`.
- `tel_combo.py`, `tel_combo_out.md`.

**Setup:**
- Same full-stack window sim as the streak rerun, on M4 candidate caps.
- The no-hand player is a visitor with no Coop Hand hired.
- 60 min, 100 seeds (combined run: 50 seeds). Median pooled over F11, F17 and F23.

| N (s) | visit20 full % | **visit45 full % (≤35)** | visit90 full % | F22–24 mgd/unm (≥1.5) | worst seed active/idle 10 min (≤2.0) | pass |
|---|---|---|---|---|---|---|
| 0 (today) | 20 | 58 | 77 | 4.32 | 1.93 | no |
| 60 | 20 | 58 | 77 | 4.32 | 1.93 | no (no-op) |
| 90 | 19 | 58 | 77 | 4.29 | 1.92 | no |
| 120 | 18 | 57 | 77 | 4.23 | 1.92 | no |
| 180 | 17 | 56 | 76 | 4.13 | 1.93 | no |
| 240 | 16 | 56 | 75 | 4.02 | 1.92 | no |

**Floor alone: no N passes.**
- **Why:** at F8+ the coop already holds 62.5–75 s of laying (F11 750 / 12 per s, F17 1125 / 18, F23 1800 / 24), so N ≤ 60 is a no-op.
- **The real bottleneck is tap throughput, not coop size.** A 45 s visitor's 5 taps move 5 × eggs_per_tap: 225 eggs at F11 (C8), against about 600 eggs laid between visits. Whatever the cap, the coop refills before the next visit.
- **Levers that would work for the no-hand case:**
  - Overflow to Basket (Proposal B's first option).
  - A bigger eggs_per_tap.
  - Pushing the Coop Hand hire (its hint).

**Floor combined with asleep share 0.15** (the smallest passing share from the Workers sweep), unmanaged Coop Hand:

| N (s) | visit20 | **visit45** | visit90 |
|---|---|---|---|
| none (share only) | 2 | 20 | 35 |
| 60 | 2 | 20 | 35 |
| 90 | 1 | 20 | 35 |
| 120 | 0 | 19 | 34 |
| 180 | 0 | 17 | 32 |
| 240 | 0 | 15 | 30 |

- **Combined: the smallest passing N is "any"**, because share 0.15 passes on its own. The floor adds 0–5pp. For players with no hand the floor still fails, since the share doesn't apply to them.
- **Checks:** the worst seed stays ≤ 1.93 and mgd/unm stays at 4.0 or above.

**Offline:**
- Offline eggs bypass the coop cap (economy.md), so the floor does not change the offline grant.
- The only effect is one extra coop of stock on return: at most N × lay, i.e. ≤ 240 s against the 2 h × 0.25 = 1,800 s-equivalent grant (≤ 13%, once).
- That raises idle income, so it can only lower active/idle. The 2× cap is safe.

**Recommendation:** don't ship the floor for the coop-full goal. Use the asleep share (0.15–0.20) for unmanaged players, and Proposal B's overflow-to-Basket, or a bigger tap, for players with no hand. If B is wanted, I'll sim it next.
