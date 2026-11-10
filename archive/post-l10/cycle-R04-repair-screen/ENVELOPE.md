# ENVELOPE — farm_cost step envelope options (INFORMAL, scratch, ac_claim NONE)

Task HoP/R04-repair-screen (D-HOP-2026-11-09-04). **Chosen: option (a)** per D-HOP-2026-11-09-05.
Arithmetic: `tests/test_gen.py::Feasibility` (exact Fractions) and `tools/gen.py max_chain` (integer floor chain = the largest
integer chain whose every step is ≤ cap, because maximising each cell maximises the next ceiling).

Fixed anchors: farm_cost L10 = 1368 (PL-AC5 frozen rows 0–10) and L30 = 624316 (PL-AC6(a)). Row L = cost of L→L+1.
Required total growth L10→L30 = 624316/1368 = **456.37** (ln 6.1233).

## Infeasibility (cap 1.30 over all 20 steps L11..L30)
1.30^20 = 190.05 < 456.37 → max FC30 = 1368·1.3^20 = 259,988 (integer chain 259,737) < 624,316. **Infeasible**; the minimum
uniform cap reaching the anchor is 456.37^(1/20) = **1.3582**. (Test `test_infeasible_cap_130_twenty_steps`.)

## (a) CHOSEN — cap (1.00, 1.30] on steps L11..L29 only; L29→L30 excluded (unbuyable/cliff step, card §3 risk 2)
- Matches Card #4 PL-AC6(b) wording (19 steps L11–29; row 30's step is the L30→L31 cost that is never buyable).
- Feasible region: 1368 = FC10 < FC11 < … < FC29 with 1 < FC[L]/FC[L−1] ≤ 1.30, no sawtooth within L11–29 (gen.py V5),
  FC30 = 624316 fixed. Upper ceilings (integer floor chain from 1368 at 1.30):

| L | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| max FC | 1778 | 2311 | 3004 | 3905 | 5076 | 6598 | 8577 | 11150 | 14495 | 18843 |

| L | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|
| max FC | 24495 | 31843 | 41395 | 53813 | 69956 | 90942 | 118224 | 153691 | 199798 |

- No lower bound beyond strictly rising (any step > 1.00).
- Forced consequence: FC30/FC29 ≥ 624316/199798 = **3.125** (the excluded L30 step is a ≥3.12× cliff; it is never paid
  in the measured L11–29 window, but it is on the watch list). L29 P95 ≤ 180 s is still measured in full (PL-AC2).
- **o1a**: F27 160000 > 118224 and F28 175000 > 153691 → F27 and F28 MUST leave o1a (PMFU re-check required).
  F29 190000 ≤ 199798 is reachable only if F28 ≥ 146154 and F27 ≥ 112426 (i.e. steps L27–29 near the cap). gen.py prints
  `o1a_left` for every candidate.
- Where 456.4 forces the steps: nowhere inside L11–29 (all slack is pushed into the excluded L30 cliff).
- R04 (d1cff5ac) is above the ceiling at L11–L24 (L11 2756 = ×2.01) and below at L25–29; a8c4 is above at L16, L17, L19–L28.

## (b) cap 1.40 on all 20 steps L11..L30 (not chosen)
- 1.4^20 = 836.68 ≥ 456.37, total log slack ln(836.68/456.37) = 0.606.
- Feasible band per level: max(624316/1.4^(30−L)) ≤ FC[L] ≤ 1368·1.4^(L−10):

| L | 11 | 15 | 20 | 24 | 25 | 26 | 27 | 28 | 29 |
|---|---|---|---|---|---|---|---|---|---|
| min FC | 1045 | 4014 | 21584 | 82916 | 116082 | 162515 | 227521 | 318529 | 445940 |
| max FC | 1915 | 7357 | 39570 | 152012 | 212817 | 297944 | 417121 | 583970 | 817558 |

- Forces late costs UP: FC29 ≥ 445,940 (vs a8c4 190000, R04 106652) and FC24 ≥ 82,916 → large added L24–29 dwell; o1a
  F27–29 all leave o1a (all < lower bounds). PL-AC6(b) bar change (1.30 → 1.40) needs an AC edit.

## (c) release the L30 anchor, cap 1.30 on 20 steps (not chosen)
- FC30 ≤ 1368·1.3^20 = 259,988 (integer chain 259,737) → breaks PL-AC6(a) (624316) — an AC change and a PMFU/L30 economy
  change (L30→ endgame pacing). Same ceilings as (a) for L11–29, plus the L30 ceiling.

## Sawtooth definition (gen.py V5, PROVISIONAL)
step(L) = FC[L]/FC[L−1], L in 11..29. A sawtooth at L is step(L) < step(L−1) AND step(L+1) − step(L) > 0.05 (absolute).
Monotone or gently wiggling step sequences pass; a dip followed by a rebound > 0.05 is rejected. Threshold 0.05 is a scratch
choice (not in authority) — flagged for HoP.
