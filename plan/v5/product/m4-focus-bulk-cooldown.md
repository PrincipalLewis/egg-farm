# M4 Market Hand Focus/Bulk: mode-switch cooldown sweep (Economy, 2026-10-16 22:50)
Request: PM Workers. Script `sim/m4/focus_bulk_cd.py` → `sim/m4/focus_bulk_cd_out.md`. Table economy.f1-m4cols.csv. 30 seeds, H=F=V, C=F−3.

## Method
- **Sim:** `m4_active.window` (energy, refills, W1–W4, Grader) with the ALL stack (golden egg v0.3, streak 0.40, completion bonus/leave penalty 0.05, manual focus 0.10) plus abilities v0.3 (×1.15 / ×1.15 / ×1.15 / +0.5, 30 s / 300 s). It is patched at import; m4_active.py is unchanged.
- **Bulk** is the shipped W1: every 1 s (tired 3 s) it sells to every customer who has waited ≥ 2 s.
- **Focus** sells to one customer every 2 s (tired 6 s) at +5%, with W1 drain ×1.5 (m4-tracks-model §B).
- **Managed switcher (greedy short-horizon oracle):** re-evaluated every 1 s once the cooldown allows. It estimates W1 eggs sold over the next 10 s in each mode from the live queue, patience and basket, values Focus at +5%, and switches only when the other mode is > 1% better.
- **Player:** seller15 (tap 1/s, Sell all every 15 s, refills at visits). Unmanaged = no refills, static Focus. Idle = no taps, no sells, no refills.
- **Session:** 30 min for criterion 1 and managed/unmanaged; the CEO's 10-min in-tab window for the 2× cap.

## Results (switch vs always-Focus, mean / worst seed; F22–24 ratios)
| cooldown | switch vs Focus, mean (F10–24) | worst seed | switches / 30 min (med) | F22–24 managed/unmanaged, min seed | F22–24 managed/idle, worst seed (10 min) |
|---|---|---|---|---|---|
| 0 s | −0.17% … −0.01% | +1.33% (F24) | 4–13 | 2.67 | 2.20 |
| 15 s | −0.25% … −0.08% | +1.40% (F24) | 4–10 | 2.67 | 2.19 |
| 30 s (spec) | −0.34% … −0.14% | +1.14% (F24) | 4–10 | 2.67 | 2.19 |
| 60 s | −0.52% … −0.26% | +1.01% (F22) | 4–6 | 2.67 | 2.19 |

- Static Focus beats static Bulk by +4.5–5.0% (F10–24), matching §B (managed).
- Switching beats Bulk by about +4–4.8%, but **never beats always-Focus by more than 1.4% on any seed at any cooldown**.

## Verdict
- **Criterion 1 (switching ≤ 2% over Focus): PASS at every cooldown, including 0 s.** The cooldown isn't what keeps switching from paying: Focus is almost always the better mode, and the few switches to Bulk (big queues near patience) gain ≤ 1.4%.
- **Criterion 2:**
  - Managed/unmanaged ≥ 1.5 on every seed: PASS (min 2.67).
  - **2× cap on the worst seed: FAIL at every cooldown (2.17–2.20).** The cooldown doesn't change this either. Static runs show the cause:

    | F22–24 managed/idle, 10 min | mean | worst seed |
    |---|---|---|
    | Focus | 1.99–2.00 | 2.21–2.23 |
    | Bulk | 1.91–1.92 | 2.08–2.11 |

    The Focus +5% premium on top of the full stack + v0.3 abilities pushes the worst seed over 2×. Even Bulk is slightly over on the worst seed for seller15.
- **Shortest cooldown passing both: none.** Criterion 2 fails for reasons the cooldown can't fix. On criterion 1 alone the shortest is **0 s**. Recommendation: keep **30 s** (UI anti-thrash; no economy reason to lengthen it).
- **Proposal for PM Workers / HoP (not tested here):** bring the worst seed under 2× by lowering the Focus premium (+5% → about +3%; §B: +3% halves the managed gain) or trimming one v0.3 ability (trim order Rush, then Shout). Re-run this script after the change.
- **Caveat:** the oracle is a heuristic (10-s look-ahead), not a full search; a perfect switcher could gain slightly more. Gains ≤ 1.4% leave 0.6 pt of headroom against the 2% threshold.

## Follow-up 2026-10-16: Focus premium at a 30 s cooldown (abilities v0.3 unchanged)
`PREM=<x> CDS=30 python3 sim/m4/focus_bulk_cd.py` (30 seeds). Raw output: sim/m4/fb_prem/.

| Focus premium | switch vs Focus, worst seed (all F) | managed/unmanaged min | managed/idle worst seed F22/23/24 (10-min CEO window) | ≤2.0? |
|---|---|---|---|---|
| +5% (shipped) | ≤ +1.40% | 2.67 | 2.18–2.20 | FAIL |
| +3% | +1.39% | 1.80 (F10), 2.66+ at F22–24 | 2.18 / 2.20 / 2.20 | FAIL |
| +1.5% | +1.61% | 2.65 | 2.19 / 2.20 / 2.21 | FAIL |
| 0% | +1.23% | 2.64 | 2.19 / 2.20 / 2.21 | FAIL |

**No premium passes, so the binary search ends at 0%.** The worst-seed ratio doesn't move with the premium (2.18–2.21 at every value), so the Focus premium isn't what breaks the 2× cap. The cause is the rest of the active stack on the worst seed. To fix it, trim an ability (e.g. one ×1.15 → ×1.10) or the ALL stack. The other criteria pass at every premium (switching < +2%, managed/unmanaged ≥ 1.5). focus_premium = 0.03 is still fine for feel, but on its own it doesn't fix the cap.

## HoP standard, 2026-10-16 23:15: P95 ≤2.0 with a worst-seed guard ≤2.25 (Focus +5%, 30 s cooldown, abilities locked)
30 seeds, managed/idle on the 10-min window. Outputs: sim/m4/fb_prem/fb_p05_p95.md, fb_p05_rush110.md.

| case | P95 at F22 / 23 / 24 | worst seed | result |
|---|---|---|---|
| Focus +5% | 2.12 / 2.12 / 2.12 | 2.17 / 2.18 / 2.19 | **FAIL** on P95; worst-seed guard passes |
| Fallback: Rush ×1.10 | 2.11 / 2.11 / 2.11 | 2.16 / 2.17 / 2.18 | **FAIL** on P95 |

Rush only acts on W1's sales during the 30 s ability window, so cutting it moves the ratio by about 0.01. The gap above the cap (about 0.12) comes from the whole active stack. Closing it needs a broader cut, e.g. Shout or Sweep, or the ALL stack. That's outside "abilities locked", so it goes to HoP.
