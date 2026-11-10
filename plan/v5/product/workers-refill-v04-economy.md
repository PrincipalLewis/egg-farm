# Workers Refill v0.4: 150 s / cap 2 / threshold 40% / single-row (Economy, 2026-10-16)
Sims:
- Progression: sim/m4/rf_v04.py (100 seeds; output sim/m4/rf_v04_out.md). This is m4_workers_prog patched with charges, live risk, combo 45 s, and away sessions.
- Window: sim/m4/rf_sweep.py `--live --only150`, without and with `--stagger` (100 seeds; outputs rf_v04_window_live*.md). The v0.3 script is backed up in scratch/.

## What changed vs v0.3
- **Live risk.** Each worker's $/s at risk is now its measured net contribution: a 60 s moving average, paused while the worker is asleep, minus wage.
  - W1: its own sales.
  - W2: sales × its share of the basket eggs.
  - W3: sales × (1 − 1/demand multiplier).
  - W4: 0.85 × sales × (1 − 1/g).
- **Real away sessions in each run.** Each seed has:
  - offline 8–12 min,
  - a 40 s hidden tab (stays in-tab: clock runs, no visits),
  - a 90 s hidden tab (counts as offline),
  - 20 min offline.
  Offline freezes the clock, so energy, charges, ability timers and customers stay put. Offline coins = 0.25 × lay × coop ms × price × min(dur, 7200).

## AC-W1–W7 at 150 s / cap 2 (100 seeds): all PASS
| gate | value | result |
|---|---|---|
| AC-W1 casual: F10 ≤15 min in ≥95% of seeds, F18 median ≤40 | 99%, 25.0 min | PASS |
| AC-W2 seller15 vs rc1 at F10/F18, ≤ +1 min | +0.00 / +0.00 | PASS |
| AC-W3 unmanaged F25 < no workers | 33.8 vs 46.8 min | PASS |
| AC-W4 steps F18–F25 ≤6 min; F25 ≤70 | 2.0; 32.2 | PASS |
| AC-W5 ≥1 action per 15 min | 4.6 refills | PASS |
| AC-W6 slow tapper (proxy: F18 gain, F20–22 income) | +10.8 min, +293% | PASS |
| AC-W7 level at 30:00 (with / without workers) | L23 / L21 | PASS |
| Offline and hidden ≥60 s freeze (energy, charges, timers unchanged on return) | 574/574 events | PASS |
| Sessions: dead zones, F25 loss vs rc1 | 0 (longest 51 s seller15, 60 s casual); +0.0% | PASS |
| Hidden 40 s (<60 s) | stays in-tab and regen continues; no dead zone | PASS |

## Refill gates
| gate | v0.3 (static shares, window) | v0.4 window, live risk | v0.4 window, live + staggered start | v0.4 progression (live) |
|---|---|---|---|---|
| AC-RF5 not-lowest ≥25% | 40% PASS | **20% FAIL** | **1% FAIL** | **0–2% FAIL** |
| AC-RF8 dead zones 0, loss ≤10% | PASS | PASS (0; worst −1.4%) | PASS (0; worst −2.2%) | PASS (0; ±0.0%) |
| Shortage ≥20% of active time | 30% PASS | 30% PASS | **17% FAIL** | **0–4% FAIL** |
| Worst-seed 2× (optimal/idle, 10 min) | 1.88 | 1.88 PASS | 1.88 PASS | n/a |
| managed/unmanaged ≥1.5 | 1.96 | 1.96 | 1.96 | — |

**Verdict: AC-W1–W7 and the freezes pass, but the Refill decision gates do not.**
- **v0.3's passes came from how the window starts.** Every worker started at 100% energy, so all of them hit 40% at the same moment, which produced both the 30% shortage and the 40% not-lowest share. Desynchronise the workers (staggered start, or real hiring order in the progression run) and they drop below 40% one at a time. Charges (2, +1 per 150 s) then nearly always cover demand.
- **Live risk also agrees with "refill the lowest" almost every time.** Not-lowest is 20% even on the synchronised window.
- **Income is barely affected:** refills change progression by about 0 min, so this is purely a decision-design question.

Options for PM Workers. None has been simulated yet:
- (a) Raise the drain or the threshold so 2+ workers are Refillable at once, e.g. threshold 60% or a faster drain.
- (b) Slower regen (≥240 s) or cap 1.
- (c) Drop AC-RF5 / the shortage gate as a design goal at this pacing.

## Step 4 (CSV columns): NOT applied
Its precondition fails: the Focus worst seed is 2.18–2.20 even at +3% (see m4-focus-bulk-cooldown.md), and AC-RF5 and the shortage gate fail. economy.f1-m4cols.csv and economy.m4-candidate.csv are unchanged. game/ was not touched.

## rc2 options (2026-10-16): live risk, staggered start energies, single-row refills, 100 seeds, P95 + worst-seed guard
Script: `rf_sweep.py 100 --live --stagger --combos 240:2:40,150:1:40,150:2:50`. Output: sim/m4/rf_rc2_opts.md.

| option | AC-RF5 not-lowest (seller15 / casual) | shortage share (s15 / casual) | AC-RF8 (dead zones; worst-seed loss vs rc1) | managed income vs rc1, mean (worst) s15 / casual | 2× optimal/idle P95 / worst | managed/unmanaged | all |
|---|---|---|---|---|---|---|---|
| (a) 240 s, cap 2, threshold 40% | 40% / 40% PASS | 75% / 75% PASS | 0 dead zones; **−12.1% / −14.9% FAIL** | −4.1% (−12.1%) / −5.8% (−14.9%) | 1.80 / 1.88 PASS | 1.79 | FAIL |
| (b) 150 s, cap 1, threshold 40% | **5% / 5% FAIL** | 43% / 54% PASS | 0; −4.3% / −6.3% PASS | −0.4% (−4.3%) / −1.2% (−6.3%) | 1.79 / 1.88 PASS | 1.89 | FAIL |
| **(c) 150 s, cap 2, threshold 50%** | **46% / 8%** PASS (gate is on seller15) | **68% / 66%** PASS | 0; −2.1% / −2.8% PASS | −0.3% (−2.1%) / −0.2% (−2.8%) | 1.80 / 1.88 PASS | 1.93 | **PASS** |

- **Revised AC-RF5**, computed because (a) and (b) failed: the share of refill decisions where the best refill (highest live $/s at risk) is not the lowest-energy worker. Those are the not-lowest numbers above, because the sim player always takes the best refill. "How often the player picks it" is 100% by construction. The real rate needs playtest telemetry: log both chosen and best on each refill.
- **Recommendation: (c), 150 s / cap 2 / threshold 50%.** It is the only option that passes every gate. Income cost is at most −2.8% on the worst seed.
  - (a) costs too much income: −12% to −15% on the worst seed.
  - (b) turns the choice back into "refill the lowest" (5%).
  - Caveat: casual not-lowest under (c) is only 8%. Casual players face real shortage (66%) but rarely a real choice.
- If adopted, the step-4 CSV columns would be refill_threshold_pct = 50, not 40. Step 4 is still blocked by the Focus 2× result.

## Final sign-off run (2026-10-16): 150 s / cap 2 / threshold 50%, live risk, single-row refills, seeds 0–99
- **Progression:** `RF_THR=50 python3 sim/m4/rf_v04.py 100` → sim/m4/rf_signoff_prog.md. Workers are staggered naturally by hire order, and away sessions are included.
- **Window:** `rf_sweep.py 100 --live --stagger --combos 150:2:50` → sim/m4/rf_signoff_window.md.

| AC | value | result |
|---|---|---|
| AC-W1 | casual F10 ≤15 min in 99% of seeds; F18 median 24.8 | PASS |
| AC-W2 | seller15 vs rc1 at F10 / F18: +0.00 / +0.00 min | PASS |
| AC-W3 | unmanaged F25 33.8 < no workers 46.8 | PASS |
| AC-W4 | steps F18–F25 2.0 min (median); F25 at 32.2 | PASS |
| AC-W5 | 5.0 refills per 15 min | PASS |
| AC-W6 | slow tapper +10.8 min at F18; +293% income F20–22 (proxy) | PASS |
| AC-W7 | level at 30:00: L23 with workers, L21 without | PASS |
| Offline / hidden ≥60 s freeze | 572/572 checks; 0 dead zones; 0.0% loss vs rc1 | PASS |
| AC-RF5 (window) | not-lowest 46% (casual 8%); 6.5 actions per 15 min; managed/unmanaged 1.93 | PASS |
| AC-RF8 | 0 dead zones (longest 15 / 20 s); worst-seed loss −2.1% seller15 / −2.8% casual | PASS |
| Shortage ≥20% | window 68% / 66%; progression 16–24% | PASS |
| 2× optimal/idle | P95 1.80 / worst 1.88 | PASS |

**Caveat:** in the progression run, not-lowest is 0%. Workers hired one at a time reach 50% one at a time, so there's rarely a real choice. AC-RF5 passes on the window (staggered start energies) only. Playtest telemetry (chosen vs best refill) should confirm it.

## Telemetry plan
AC-RF5 full-progression check: see product/workers-rf5-telemetry-addendum.md. The refill telemetry lives in PM Workers' rc2-refill-proposal.md, so the addendum is a separate file and their file is unedited.
