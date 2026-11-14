# L24-step economy proposal (HoP, 2026-11-14 ~18:50 Saigon) — PROPOSAL, NOT STARTED

Ask: CEO 18:26. Bars unchanged, no waivers, no harness change, no bypass. Nothing starts before CEO GO.

## Diagnosis (sealed R04 record r04-wide-32307f32, P50 s / tstep)
- L24 tstep fail is a short-L23 / double-gate-L24 pattern, not a slow L24 alone.
  - W12 slow: L23 52 s (x0.53) -> L24 232 s (x4.48, P95 292). W08 slow L23 58 -> L24 232 (x3.98). W01 slow L23 60 -> L24 214 (x3.56).
- Cause in economy.csv: L23 has no W4 tier step (tier 4 at L22 and L23, cost 28294 unchanged) so L23 is quick;
  L24 stacks farm_cost 72194 AND the W4 tier 5 purchase (51567; 33519 under C1). Farm L23->L24 is only +5%.
- egg_value_cap_over_farm 3->1 (W05) is the only lever that moved L24 materially (slow x2.738, casual x1.237,
  optimal AC2 PASS) and the only hard K10 (ii) PASS (+0.76 vs noise 0.31 / SD 0.35). W05 failed only because
  its non-farm body kept the 9 envelope cells, G4 205, and L17 casual x2.307 / P95 260.
- Farm-path bodies (GEO-L29 / MAX-130-EASE-L29) pass the envelope but leave L24 at x3.6-4.5.
- AC3 fails were too-fast totals, so lengthening L23 also helps AC3.

## Levers and bounds (all columns already writable without bypass; verify() only constrains egg_price formula and wages, untouched here)
1. T5@L23: move W4 tier 5 to L23 (w4_tier 5, w4_price_mult 4.0, w4_tier_cost 33519 = C1 value). Only the L23 row changes. Bound: cost 28294-33519.
2. evcap: egg_value_cap_over_farm 3 -> 1, all rows (the W05 lever). Bound: {1}. Value 2 only if all evcap=1 cells fail on L17.
3. Base: W07 (GEO-L29+C1+EV L15-21) or W08 (MAX-130-EASE-L29+C1+EV L15-21) — both envelope PASS.
No egg_price, wage, harness, or scorer change.

## One screen, 6 candidates (same harness 32307f32 tools, seeds 1-200, 5 profiles, T=4000)
| ID | body |
|---|---|
| X1 | W07 + evcap1 |
| X2 | W08 + evcap1 |
| X3 | W07 + T5@L23 |
| X4 | W08 + T5@L23 |
| X5 | W07 + evcap1 + T5@L23 |
| X6 | W08 + evcap1 + T5@L23 |
Pre-step (not a screen): Econ runs sync-economy verify() on all 6 bodies; any verify failure = body dropped, no fix-up, no bypass.
Survivor rule: PL-AC AC1/AC2/AC3 all profiles, idle 200/200, G4 <= 191, R04 envelope 0 fail, row-897, then K10 (ii) D-HOP-52 hard PASS (margin > noise AND > bootstrap SD, g1max <= Present-only). MARGINAL / hard=False = fail.
Stop rule: one pass, no re-runs, no new candidates on this approval. 0 survivors = close and report.

## Cost
- Box time: last screen ~18 min/candidate (15 bodies 05:26-09:54 incl. reboot) -> ~2 h for 6 + K10 (ii) on survivors only.
- Usage: scripted sim on box CPU; spend is the bots' setup/monitor turns. Estimate (not measured) <= 2 points. Econ posts only start/finish.
- Lane: econ lane via lane-run.sh; K10 (iii) stays parked until this screen ends.

## Owners and ETA (if CEO GO by 21:00 Saigon)
- Econ: verify + build 6 bodies by 22:30; screen 22:30-~00:45 Sun.
- HoP: ruling on survivor by ~01:00 Sun; PMC review in parallel.
- HoE: CSV PR (dc592848 + survivor deltas + unpaid_trickle=0, 156 col) by ~02:00 Sun, with shipped bc == CSV check.
- HoQA: hosted k10 + pacing + bc==CSV verdict by ~03:00 Sun.
- Honest K10: no guarantee. If no body clears every bar, there is no PR; item 2 stays blocked and I report by ~01:00 Sun.
