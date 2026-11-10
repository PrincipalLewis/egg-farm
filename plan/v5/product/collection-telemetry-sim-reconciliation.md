# Collection telemetry ↔ sim reconciliation (E-Q1 to E-Q6) · Economy/Balance Designer · 2026-10-16
Answers `product/collection/telemetry-spec.md` §6 / §9 (v0.2). **This is a proposal.** The canonical sim is unchanged.
**Sim:** `product/sim/telemetry/`
- `tel_core.py` is a copy of `sim/economy_sim.py` `run_m2`. It adds counters per Farm band: foreground seconds, coop-full seconds (coop ≥ cap), eggs produced, eggs lost at the cap (overflow), and taps / effective taps.
- `tel_run.py` runs the deterministic bots. `tel_visits.py` runs a stochastic "visit" player.
- Raw output: `tel_raw.json` and `tel_visits.json`. Tables: `tel_report.md` and `tel_visits_report.md`.

**Setup:**
- Economy: CURRENT (= economy.csv). Workers come from economy.csv via `spec_from_csv`, so the Coop Hand (w2) unlocks at **F7** and acts every 2 s.
- Runs last 2 h. Monte Carlo: 30 seeds per cell.
- Modes: **nohand** (no Coop Hand), **unmanaged** (Coop Hand never managed: Working → Tired → Asleep after about 15 min), **managed** (Manage at ≤ 40 energy).
- **M4 candidate caps** = `coop_capacity` × `hens_msK_coop_mult` (1.25/1.5/2.0 at Hens 10/20/30), with Hens level assumed = Farm level. Its base coop_capacity is identical to economy.csv.

**Player profiles:**
- **bot1hz**: the AC7 seller15 and cheapest-first bots, tapping 1/s.
- **casual05**: 0.5 taps/s.
- **slow**: 5 taps every 30 s.
- **visitG**: Poisson visits with mean gap G = 20/45/90 s, 5 taps per visit, Sell all every 30 s, seller15 buy rule.

## Summary table
| Q | Sim value | Spec tolerance | Recommended tolerance | Verdict |
|---|---|---|---|---|
| E-Q1 taps/active min | seller15 **60.0**, cheapest **60.0** (P10=P90; the tap rate is a bot *input*, not an output). Effective-tap share 1.00. | ±25% | Don't compare raw tap rate with the sim. Compare `effective_tap_share`: sim 1.00 for all profiles, alert if live < 0.85. Report live taps/min in buckets (≥45 ≈ bot, 15–45 ≈ casual, <15 ≈ visitor) and use the bucket to choose which sim profile E-Q2/E-Q3 compare against | **changed** |
| E-Q2 coop_full_share | Always-on bots: **0%** in every band and mode (both cap sets). It is non-zero only with gaps between taps; see table A | ±10pp | Compare live against the visit-model cell matched by the live median gap between tap bursts. **±10pp managed, ±15pp unmanaged/no hand** (seed spread P10–P90 is up to 40pp at F0–7) | **changed** |
| E-Q3 eggs lost share | Equals coop_full_share within ±2pp in every cell (overflow = rate × full time); see table B | ±15% (relative) | **±5pp absolute when the sim is < 30%, ±15% relative when ≥ 30%**. A relative tolerance blows up near 0 (managed = 0%) | **changed** |
| E-Q4 band reachable? | F0–2 and F3–7 no hand: yes for a visit gap of about 45 s (P50 31–32%). F8+ no hand: **no** (P50 48–59% at G45, which breaks the 35% ceiling and the 50% alert). Managed ≤ 5%: yes (0% everywhere). Same on M4 candidate caps (within 1–4pp) | 10–30 / 10–35 / ≤5 | See table C | **changed** (F8+), yes (F0–7, managed) |
| E-Q5 TTFU | **15.0 s verified** (30/30 seeds, both bots, min = max = 15.0; it equals the first Sell-all at 15 s). The same applies to casual05. Visit players: P50 30 / 60 / 90 s at G20 / 45 / 90 | live p50 ≤ 30 s, never > 5 s faster than sim | Keep **p50 ≤ 30 s, p75 ≤ 45 s**. Replace "never > 5 s faster" with a **floor: TTFU < 10 s = clock/telemetry bug**. The first customer arrives at 10 s and pays $6–12 against a $10 Collection L1, so 10–12 s is physically possible and faster than the 15 s bot | yes (15 s), **changed** (lower bound) |
| E-Q6 golden egg / streak | Not re-simmed here (the canonical sim has no golden egg or streak). Published values: E1 v0.3 managed +17% / +11% (100% / 60% catch) to F18, +11% / +7% at F24; unmanaged +12% / +8% (m4-active-checks.md §golden egg; m4-timed-collectible-spec v0.5). Streak worst seed 1.80× at cap 0.40. **The 1.44–1.55 means are from cap 0.30, not 0.40** | ±5pp uplift; P95 ≤ 2.0; mean ±0.15 of 1.44–1.55 | Uplift: compare live catch rate × E1 curve per Farm band, **±3pp** (±5pp is 45–70% of a 7–11pp effect). Streak: keep **P95 ≤ 2.0** (hard CEO rule). The mean target must be re-based on a cap-0.40 rerun before it locks | **changed** (mean target inconsistent; uplift tolerance too loose) |

## A. coop_full_share %, no Coop Hand / unmanaged / managed (economy.csv caps; P10/P50/P90 over 30 seeds, seller15)
| Profile | Mode | F0–2 | F3–7 | F8–14 | F15–19 | F20–30 |
|---|---|---|---|---|---|---|
| bot1hz, casual05 (both bots) | all | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| slow (5 taps/30 s), seller15 \| cheapest | nohand | 2 \| 2 | 0 \| 0 | 12 \| 5 | 27 \| 21 | 32 \| 28 |
| visit20 | nohand | 0/8/27 | 0/5/21 | 5/11/20 | 9/16/23 | 20/22/29 |
| visit20 | unmanaged | 0/8/27 | 0/4/21 | 0/0/0 | 8/14/21 | 18/22/28 |
| visit45 | nohand | 14/32/52 | 11/31/51 | 41/49/56 | 51/54/58 | 55/59/65 |
| visit45 | unmanaged | 14/32/52 | 10/31/51 | 0/0/0 | 43/49/57 | 53/58/63 |
| visit90 | nohand | 39/52/73 | 40/61/75 | 67/72/78 | 73/76/79 | n/r (F18 at 2 h) |
| visitG | managed | = nohand (F0–7, before the hand) | = nohand | 0/0/0 | 0/0/0 | 0/0/0 |

On M4 candidate caps the shift is 0–4pp lower at F8+ (for example, visit45 nohand F8–14: 40/48/54). Full tables: `sim/telemetry/tel_report.md` and `tel_visits_report.md`.

## B. eggs_lost_share % (P50; economy.csv caps)
| Profile/mode | F0–2 | F3–7 | F8–14 | F15–19 | F20–30 |
|---|---|---|---|---|---|
| bots, all modes | 0 | 0 | 0 | 0 | 0 |
| visit20 nohand | 7 | 5 | 11 | 16 | 22 |
| visit45 nohand | 31 | 33 | 50 | 54 | 59 |
| visit45 unmanaged | 31 | 31 | 0 | 50 | 58 |
| managed (F8+) | — | — | 0 | 0 | 0 |

## C. Proposed coop-full band (median session), replacing §5.3
| Segment | Spec v0.2 | Sim (visit20–visit45 P10–P90) | Proposed |
|---|---|---|---|
| No Coop Hand, F0–2 | 10–30% | 0–52% (P50 8–32) | **5–40%** |
| No Coop Hand, F3–7 | 10–35% | 0–51% (P50 5–31) | **5–40%** |
| No Coop Hand or unmanaged (hand asleep), F8–30 | 10–35% | 5–65% (P50 11–59) | **10–60%** |
| Coop Hand managed (F8+) | ≤ 5% | 0% | **≤ 5%** (keep) |
| Alerts | > 50% or < 2% | | **> 60% at F0–7, > 75% at F8+** (stall). Keep **< 2% with no hand** only for sessions with a median tap gap ≥ 20 s (always-on tappers never fill the coop) |

## Notes and caveats
- **Coop Hand unlock:** the spec calls Farm ≥ 3 "unlocked". In economy.csv F3 unlocks the **Market Hand (w1)**. The **Coop Hand (w2) unlocks at F7**. So "no Coop Hand, F3–7" means pre-unlock for every player. Please re-label the segment.
- **What drives coop-full:** it depends almost entirely on the player's gap between visits, not on the economy. Cap ÷ rate gives about 33–50 s of fill at every level, and one tap clears 5 + 5C eggs. The M4 Hens milestone caps barely move it. Live calibration should therefore cut by observed tap-gap, which `tap` batch timestamps already give.
- **Unmanaged hand:** the Coop Hand falls asleep about 15 min after hire, so the F15+ unmanaged values ≈ no hand. That is by design (B-1 / energy).
- **Bot dispersion:** the deterministic bots have zero seed dispersion (the only randomness is customer demand, which doesn't affect tapping), so a P10–P90 band only exists for the visit model.
- **Hens level:** the M4 candidate run assumes Hens = Farm. With Hens at F+3, caps are up to about 1 milestone higher and coop-full slightly lower.
- **Not computed:**
  - (a) A golden-egg / streak re-sim: no telemetry-sim copy of `run_m4` collectible/streak logic was made in this pass. E-Q6 relies on published figures.
  - (b) Streak mean at cap 0.40: never published. Needs a rerun of the m4-active-checks §6 streak run before the mean target locks.
  - (c) Offline/background time: excluded, matching `fg_ms`.

---
## Addendum (23:20): streak cap 0.40 rerun for E-Q6
**Code:**
- `sim/telemetry/tel_streak.py`: a patched copy of `sim/m4/m4_active.window`. Output in `tel_streak_out.md`, raw data in `tel_streak_raw.json`.

**Setup:**
- Economy: `economy.m4-candidate.csv`, with coop caps × the Hens milestone multiplier and workers read from the CSV.
- Full stack: 36/48 tracks, golden egg v0.3 (×2 price frenzy for 30 s on all sales, eggs paid as cash from F20), focus 0.10, completion bonus and leave penalty 0.05 each, v0.2 abilities ×1.15 (W4 +0.5), all multiplicative.
- Streak per spec: +0.01 per egg-moving tap, at most 1 per second, holds 3 s, then decays 0.03/s, cap 0.40, multiplies price.
- 200 seeds, 60 min at a fixed state per Farm group (F1/5/11/17/24, Hens = Egg value = F, Collection = F−3).
- Idle baseline = the same state with no taps and workers kept refilled (managed idle). In a 60-min window an unmanaged idle player's workers fall asleep, which makes the ratio meaningless.

**Players:**
- optimal: tap 1/s, sell every 3 s.
- seller15.
- casual05: 0.5 taps/s, Poisson, 60% catch.
- visit20/45/90: Poisson visits, 5 taps per visit, catch 35/(G+5).
- cheapest-first is identical to seller15 in a fixed-state window, because it has no buy decisions there.

| player | F8–14 mean / P95 / max | F15–19 | F20–30 | overall mean / P95 / max | P95 ≤ 2.0 |
|---|---|---|---|---|---|
| optimal | 1.72 / 1.78 / 1.80 | 1.71 / 1.76 / 1.79 | 1.71 / 1.73 / 1.75 | **1.71 / 1.76 / 1.80** | PASS |
| seller15 (= cheapest) | 1.71 / 1.76 / 1.79 | 1.71 / 1.75 / 1.77 | 1.71 / 1.73 / 1.75 | 1.71 / 1.75 / 1.79 | PASS |
| casual05 | 1.57 / 1.62 / 1.70 | 1.57 / 1.61 / 1.68 | 1.57 / 1.61 / 1.66 | 1.57 / 1.62 / 1.70 | PASS |
| visit20 | 1.23 / 1.26 / 1.28 | 1.23 / 1.25 / 1.27 | 1.24 / 1.26 / 1.27 | 1.23 / 1.26 / 1.28 | PASS |
| visit45 | 1.16 / 1.20 / 1.24 | 1.16 / 1.20 / 1.23 | 1.17 / 1.21 / 1.24 | 1.16 / 1.20 / 1.24 | PASS |
| visit90 | 1.10 / 1.13 / 1.21 | 1.10 / 1.13 / 1.20 | 1.11 / 1.14 / 1.22 | 1.10 / 1.13 / 1.22 | PASS |

**F0–2 and F3–7: undefined.** Idle income is 0 there, because there is no Coop Hand before F7. A pre-F7 player earns nothing without tapping, so live active/idle should only be computed at F8+.

**Where 1.44–1.55 came from:** `m4-active-checks.md`, "Rerun at adopted values", row "ALL, streak 0.30 (approved)": the optimal player's mean over a 10-min window at F10 / F18 / F24 was 1.44 / 1.48 / 1.55, with 30 seeds. The same table's cap-0.40 row gives 1.54 / 1.58 / 1.65 (worst seeds 1.72 / 1.80 / 1.77). That run had no v0.2 abilities.

**Rerun of that 10-min check with 200 seeds, at today's stack (v0.2 abilities ×1.15):** mean [P95] [worst seed]

| cap | player | F10 | F18 | F24 |
|---|---|---|---|---|
| 0.30 | optimal | 1.53 [1.63] [1.70] | 1.62 [1.71] [1.80] | 1.55 [1.62] [1.66] |
| 0.30 | casual | 1.41 [1.52] [1.61] | 1.43 [1.55] [1.65] | 1.42 [1.52] [1.66] |
| **0.40** | **optimal** | **1.64 [1.73] [1.82]** | **1.72 [1.82] [1.93]** | **1.65 [1.72] [1.77]** |
| 0.40 | casual | 1.50 [1.62] [1.69] | 1.52 [1.65] [1.73] | 1.51 [1.61] [1.76] |

**E-Q6 recommendation (replaces the earlier "mean within ±0.15 of 1.44–1.55"):**
- **Optimal player:** target mean **1.64–1.72** (cap 0.40, 10-min window, today's stack), ±0.15.
- **Casual player:** **1.50–1.52**, ±0.15.
- **P95 ≤ 2.0 holds:** worst P95 is 1.82 and the worst single seed is 1.93 (F18, 10 min). Keep it as the hard cap, but note there is only 0.07 of headroom on the worst seed.
- **Live dashboard:** compare against the casual05 or visit rows, matched by tap-rate bucket (E-Q1). Expected live mean is 1.1–1.6.
