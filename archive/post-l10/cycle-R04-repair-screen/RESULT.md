# RESULT — HoP/R04-repair-screen (INFORMAL, scratch, ac_claim NONE) — stopped 2026-11-10 ~00:45 CET under D-CEO-20261110-02

Envelope (a): steps L11–29 in (1.00, 1.30], L29→30 excluded, anchors 1368/624316, no sawtooth (thr 0.05 PROVISIONAL). w4 = a8c4 cells
(L21=2.5, L22–23=3.0, L24–30=4.0) in every candidate (gen.py V2). Runtime streakCap 0.28 is inert because flags are off. pl.ts, CFG none,
seeds 1–200, T=4000, 3 profiles, parity 0 in every run.

## Control a8c4e268 (control/run)
- PL-AC1 FAIL: casual L15 ×2.454, L17 ×2.004.
- PL-AC2 FAIL: opt L17/20/21/27; s15 L17/18/20/21/22/26/27; cas L17/18/20/21/22/23/24/26/27.
- tot = 2116.0/2100.2/2041.5. This reproduces the card's before values exactly, and 600/600 reach maps match s00-base-mr.

## Round 1: 10 of the 30 allowed candidates, all FAIL PL-AC1 and PL-AC2
The full table is in RESULT-table.txt. No candidate has 0 AC1 + 0 AC2 fails in any profile set.
- The candidates that keep PL-AC3 (c01, c06–c10) still fail 2–7 AC2 levels per profile.
- The candidates that cut hot rows enough to approach AC2 (c02–c05) break PL-AC3: −10.6% to −11.8%.

## Evidence of the mechanism (non-tunable lumps, from the trace of c06)
- L24: W4 tier-5 hire 51,567 (unlocks at F24, FIXED) plus collection rows 16/17.
- L26–27: collection rows 18–20.
- L28: collection row 20 = 110,858 with farm 153,691 (envelope max).
- L29: collection row 21 = 186,658 with farm 199,798 (casual P95 179 s, 1 s margin).

The 1.30 ceiling lowers farm by 30–40% at L19–28. The time that has to be re-placed can only go into hens/EV rows, but strictly rising tracks carry any raised row into every later (hot) row. As a result:
- Raising rows (c07–c10) moves the failure to L18/L19/L24/L26/L27.
- Lowering hot rows (c02–c05) breaks PL-AC3 and PL-AC7 F16-20/F21-25.

A first-order surrogate built around the best total-feasible candidate (c06), with farm at the envelope maximum and hens/EV free in 0.3–4×, found no point that clears all bars, even with zero margins. Its best prediction is casual L22 P95 204 s, with opt band F16-20 at −20.5%. The surrogate is NOT evidence (it ignores purchase re-phasing, which dominates the real runs).

## Verdict
Joint PL-AC1/PL-AC2 feasibility under envelope (a) is UNDECIDED (no pass, no proof). It points toward infeasibility (casual-bound) with data-only rows 11–29 while collection/W4 lumps stay fixed.
