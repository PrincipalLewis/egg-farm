# M4 risk list (Economy / Balance)

Cross-cutting M4 / AC7 risks owned by Economy/Balance Designer. Farm-track-specific risks stay in `product/farm/m4-track-check.md`.

Any change to a **hard** AC7 band (level-at-30 bounds, inclusive edges) needs Head of Product approval before Engineering changes the test.

---

## R-AC7-W-ZERO-MARGIN — with-workers AC7 sits on the L20 lower edge

| Field | Value |
|---|---|
| **Status** | Open (known; soft guard proposed, no economy buff) |
| **Owner** | Economy/Balance Designer |
| **ETA** | Soft early-warning guard: propose now; wire into CI with Architect's post-#17 variance-bot switch (before the next `farm_cost` / income change). Hard-band change: only with Head of Product. |
| **Evidence** | Variance bot, F1 `economy.f1-m4cols.csv` (86f0e80e), 100 seeds, `seller_variance_sim.py` / `run_m2` seller15. Raw: `scratch/ac7_zero_margin_base.json` + `scratch/ac7_zero_margin_scale*.json`. |

### With workers (shipping gate)

| Metric | P5 | P50 | P95 | worst |
|---|---|---|---|---|
| time to L20 (min) | 26.00 | 26.65 | 27.84 | 29.11 |
| time to L21 (min) | 28.98 | 29.62 | 31.09 | 32.80 |
| level @ 30:00 | **20** | 21 | 21 | 20 (36× L20 / 64× L21) |

- Slack at 30:00 for the slow tail (30:00 − P95 time-to-L20, 1670 s / 27:50) = **130 s**. (Corrected Oct 17 02:07: the earlier 239.9 s used P5 of times, the fast seeds, which was the wrong tail.)
- Worst-seed slack to L20 (30 − worst time-to-L20) = **53.6 s**. Hard band passes only because edges are inclusive; any small slowdown that pushes one seed past 30:00 fails AC7.
- Matches Architect note: TS and Python agree L@30 P5 = 20.

### No workers (diagnostic / separate gate)

| Metric | P5 | P50 | P95 | worst |
|---|---|---|---|---|
| time to L18 (min) | 20.04 | 20.64 | 22.05 | 24.06 |
| time to L20 (min) | 26.04 | 27.05 | 28.94 | 31.38 |
| level @ 30:00 | 20 | 20 | 20 | 19 (3× L19 / 97× L20) |

- Slack at 30:00 for the P5 seed (30 − P5 time-to-L18) = **597.9 s** (~10.0 min). Ample; not the shipping concern.

### Nerf sensitivity (scale `farm_cost` up; 100 seeds, with workers)

| farm_cost scale | L@30 P5 | L@30 worst | seeds &lt; L20 | P5 t20 (min) | hard AC7 (L20–24) |
|---|---|---|---|---|---|
| ×1.00 (base) | 20 | 20 | 0 | 26.00 | PASS |
| ×1.02 (+2%) | 20 | 20 | 0 | 26.35 | PASS (fragile) |
| ×1.03 (+3%) | 20 | 20 | 0 | 26.67 | PASS (fragile) |
| ×1.04 (+4%) | 20 | 20 | 0 | 26.83 | PASS (fragile) |
| ×1.05 (+5%) | 20 | **19** | 1 | 26.87 | **FAIL** |
| ×1.10 (+10%) | **19** | 19 | 8 | 27.76 | **FAIL** (P5 below L20) |

- **~5%** farm_cost increase (or equivalent income cut) is enough to drop at least one seed below L20.
- **~10%** pushes P5 itself below L20.
- Do not "fix" with an economy buff; keep the hard band and add a soft tripwire.

### Proposed margin metric (no economy buff)

1. **Soft early-warning guard (CI / variance bot), HoP-confirmed 02:05:** warn when P95 time-to-L20 > **1740 s (29:00)**, key `ac7_w_t20_p95_warn_s`. Today 1670 s (130 s slack); a 60 s cushion before the hard band at 30:00. Hard band unchanged.
2. **Documented nerf budget:** treat any change that is ≥ **~3%** effective farm_cost-up / income-down as needing a re-run of this 100-seed workers variance sweep before merge; ≥ **~5%** is expected to fail the hard band.
3. **Hard band unchanged** (L20–24 inclusive at P5/P95 with the variance bot). Changing the hard band needs **Head of Product**.

### Mitigation owners

- Economy/Balance Designer: own X, the nerf-budget note, and re-measure after any F1 / farm_cost / income change.
- Architect: wire the soft P95-t20 > 1740 s warning next to the hard AC7 gate when switching `pacing.test.ts` to the variance bot (post-#17 follow-up).
- Head of Product: only approver for any hard-band change.
- **Near edge (Oct 17, HoP):** no-workers variance P95 time-to-L20 = 1737 s, 3 s under the 1740 s line. The warning applies only to the with-workers run, but any slowdown on L1-20 (cost or demand) should re-check it.

- **R-L30-EX1-THIN-MARGIN** (Oct 17, 2026, HoP-accepted): with C2 (sha 1536be49), the worst casual+workers EX-1 seed at L30-40 is 2.20 against a 2.25 limit (P95 2.00). The cause is the short L35 / long L36 pair; level times move in 20 s steps. No L31-40 retune for now. Track the L35-36 time ratio in post-launch telemetry; if real players show above 2.25, retune L31-40 broadly.
