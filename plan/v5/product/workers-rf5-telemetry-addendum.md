# Addendum to workers/rc2-refill-proposal.md (PM Workers' file, unedited): AC-RF5 full-progression telemetry check
Economy/Balance, 2026-10-16. Refill is approved at 150 s / cap 2 / threshold 50%, single-row. This is proposed text for PM Workers to fold into the refill_used telemetry (proposal lines 106/153).

## Fields needed on `refill_used` (pinned, never trimmed)
- Per refill:
  - `refillable_n`: Refillable workers at tap time (energy ≤50%, incl. asleep).
  - `charges`: charges before the tap.
  - `chosen_worker`.
  - `best_worker`: highest live $/s at risk = the worker's measured net contribution over the last 60 s (share of incomePerSec minus wage; Grader 85% of its bonus), as the sim computes it.
  - `lowest_worker`: lowest energy; ties W1→W4.
  - `rank_by_risk`: the chosen worker's rank, 1 = best.
- Only refills with `refillable_n ≥ 2` count as decisions.

## Check (playtest, per tester and pooled)
| metric | definition | sim reference | target / reading |
|---|---|---|---|
| RF5-best≠lowest | share of decisions where best_worker ≠ lowest_worker | 46% on the 10-min window with staggered start energies (casual 8%); **0–2% in full progression** (rf_v04 / rf_signoff_prog.md) | ≥25% = AC-RF5 holds in real play. Near 0% = the progression result is right, and the Refill choice is cosmetic. |
| Pick rate | share of decisions where chosen_worker = best_worker (rank_by_risk = 1) | 100% by construction (the sim always picks the best) | Report it. Below ~50% means the at-risk signal isn't readable. Art & UX/PM Workers decide on the cue. |
| Pick rate when best ≠ lowest | same, restricted to the RF5-best≠lowest decisions | 100% (sim) | The real decision-quality number. |
| Shortage share | share of active time with refillable_n > floor(charges) | 66–68% window, 16–24% progression | ≥20%. |

**Decision rule after the playtest.** If the pooled RF5-best≠lowest is <25%, AC-RF5 fails in real play. Raise the threshold or spread worker energies, re-sim, then decide. If it's ≥25% but the pick rate is <50%, fix the readability of the at-risk cue rather than the economy.
