# Workers Refill v0.3a: regen/cap sweep (TASK 3)
Sim: product/sim/m4/rf_sweep.py, 100 seeds, F22–24, single-row refill for everyone, threshold 40%, Combo Boost 45 s. Raw output: sim/m4/rf_sweep_out.md.

| regen | cap | seller15 vs rc1 | casual vs rc1 (worst) | managed/unm min | opt/idle worst (10 min) | dead zones | shortage share s15/casual | RF5 | RF8 | supply<demand ≥20% | all gates |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 90 | 2 | +0.0% | −1.6% | 1.96 | 1.88 | 0 | 10/10% | P | P | F | F |
| 90 | 3 | +0.0% | −0.4% | 1.96 | 1.88 | 0 | 5/5% | P | P | F | F |
| 120 | 2 | +0.0% | −2.1% | 1.96 | 1.88 | 0 | 13/13% | P | P | F | F |
| 120 | 3 | +0.0% | −0.5% | 1.96 | 1.88 | 0 | 7/7% | P | P | F | F |
| **150** | **2** | +0.1% | −1.6% | 1.96 | 1.88 | 0 | **30/29%** | P | P | **P** | **PASS** |
| 150 | 3 | +0.0% | −2.2% | 1.96 | 1.88 | 0 | 18/18% | P | P | F | F |

**Recommendation: regen 150 s, cap 2.** It is the only combination where demand exceeds supply regularly (about 30% of active time, against a threshold of ≥20%) while AC-RF5 (25% not-lowest proxy: 40%) and AC-RF8 (no dead zone; idle loss vs rc1 ≤10%) both pass. The 2× worst-seed check passes for every combination (1.88). The 30–50% threshold sweep was not needed because RF8 passes.

Assumptions:
- $/s-at-risk shares are static: W4 0.85(g−1)/g·I, W2 I/3−wage, W3 0.1I, W1 0.1I−wage.
- The offline/hidden-tab freeze isn't exercised in the in-tab window.
- AC-W1..W7 were not re-run.
- Refills barely move income (±0.1%), so this is a pacing and engagement choice, not an economy risk.
