# Casual player without workers: pacing check (Economy, 2026-10-16)
Sim: sim/market/casual_taper.py, economy.m4-candidate.csv, 200 seeds, roadmap_m4_prog.run (same as run_prog base). Output: sim/market/casual_taper_out.md. Variant CSVs are in scratch/casual/; no product CSV was changed.

AC7 targets: L10 8–12 min and L18 24–36 min, with centres 10 / 30. Levels L11–17 are interpolated geometrically and L19–20 extrapolated. Bar: ±20%.

## Base (economy.m4-candidate.csv)
| player | L10 | L16 | L18 | L20 | level at 30:00 | in band |
|---|---|---|---|---|---|---|
| casual, no workers | 15.0 (+50%) | 29.7 (+13%) | 34.7 (+16%) | 41.0 (+4%) | **L17 [16–17]** | **0/200** (L18–22) |
| casual, with workers | 14.0 (+40%) | 21.7 | 24.7 | 27.3 | L21 [19–21] | 198/200 (L20–24) |
| 5 s optimal, no workers | 9.6 (−4%) | 17.2 | 20.2 | 24.8 (−37%) | L21 | 200/200 |
| 5 s optimal, with workers | 10.1 | 17.0 | 19.9 | 23.2 | L24 [23–24] | 200/200 (top edge) |

- **The casual no-worker player is outside ±20%.** L10 is +50% (+33–44% across L10–13), and they miss the 30:00 band by one level.
- Against AC7-soft (the casual-specific target: L10 ≤15, L18 ≤45), they just pass: 15.0 and 34.7.
- Above L13, every player runs 30–45% faster than the interpolated targets. The AC7 anchors (24–36 min at L18) are older than the F1/M4 curve; M4 AC7 uses L18 17.8–21.7. That part of the comparison is weak.
- **Workers are effectively required for casual players.** Hiring takes them from L17 to L21 at 30:00 and from 34.7 to 24.7 min at L18. Before L10 workers barely help (+40%), because W1 at F3 costs $40 and gives the casual player little demand.

## Smallest-fix search (200 seeds)
| fix | casual no-worker L10 / L18 | casual no-worker level at 30:00 | 5 s optimal with workers, in band | strictly rising |
|---|---|---|---|---|
| base | 15.0 / 34.7 | L17 | 200/200 | yes |
| cost taper ×0.70 on L0–14 (linear ramp) | 12.7 (+27%) / 31.7 | L17 | **17/200 (L25)** FAIL | yes |
| cost taper ×0.80 on L0–12 | 13.3 (+33%) / 33.0 | L17 | 200/200 | yes |
| demand ×1.25 on L0–12 | 14.0 (+40%) / 33.3 | L17 | 200/200 | yes |
| first hire (W1) $40 → $20 | no change | L17 | 200/200 | yes |

In earlier smokes (4 seeds), queue +2 and patience ×1.5 changed nothing, so casual players aren't queue-limited.

**Conclusion: no small tweak brings the no-worker casual player into band, or within ±20% at L10, without pushing the optimal player with workers past L24.**
- The smallest safe partial fix is the ×0.80 taper on L0–12. It cuts L10 by 1.7 min (from +50% to +33%), keeps the optimal player in band, and keeps costs rising.
- It still leaves the casual no-worker player at L17.

Recommendation: accept that a casual player needs workers by about L10–18. Make sure the first hire is shown and nudged early (F3, $40). Treat the no-worker casual band as a known miss rather than retuning costs.
- The 2× cap is unaffected. It is measured on a 10-minute window with fixed state, so costs don't enter it: 1.88 in the Refill window. The Focus sim's 2.18–2.21 FAIL stands for its own reason.

## First-hire nudge (rc2-first-hire-nudge.md, AC-FH3), casual model, 200 seeds
Script: sim/market/first_hire.py. Output: sim/market/first_hire_out.md.
- **Trigger:** first visit with F ≥3, W1 not hired and coins ≥$40.
- **Nudge:** the player hires within U(0, 60) s.
- **No nudge:** an assumption, since there's no telemetry yet: the player finds the Workers tab after Exp(mean 10 min).

| case | F3 → first hire, median / P95 / worst (min) | has a worker by L10 | level at 30:00 | in band L20–24 | F18 | AC-FH3 |
|---|---|---|---|---|---|---|
| **nudge** | 0.67 / 1.33 / 1.67 | 100% | L21 [19–21] | 198/200 | 24.7 | **PASS** |
| no nudge | 7.67 / 32.67 / 54.0 | 54% | L20 [18–21] | 179/200 | 25.5 | FAIL |
| instant (earlier runs) | 0.00 / 0.33 / 0.67 | 100% | L21 | 198/200 | 24.7 | PASS |
| never hires | — | 0% | L17 [16–17] | 0/200 (no-worker band 0/200) | 34.7 | FAIL |

- With the nudge, casual players match the instant-hire bot: +1 median level at 30:00 vs no nudge, and 19 more seeds in band.
- The other AC-FH3 parts are unaffected, because the nudge only moves when W1 gets hired: F22–24 managed/unmanaged is 1.93–1.96, and AC-W1–W7 pass (workers-refill-v04-economy.md).
