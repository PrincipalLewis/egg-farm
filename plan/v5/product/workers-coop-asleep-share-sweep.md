# w2_asleep_collect_share sweep (Economy, 2026-10-16 23:20) — for PM Workers' coop-full-unmanaged-proposal.md
**Status: proposal only.** No CSV was edited.

**Code (all under `sim/telemetry/`):**
- Window sim: `tel_streak.py` and `tel_sweeps.py`. Raw data in `tel_sweeps_raw.json`, table in `tel_sweeps_report.md`.
- ACs: `ac_w2share.py`, a patched copy of the `sim/m4/rf_v04.py` harness (the original file is unchanged). Output in `ac_w2share_out.txt`.

**Model:**
- An asleep (or unpaid) Coop Hand collects every 2 s ÷ share, i.e. at that share of its normal rate.
- Economy: M4 candidate caps, full stack, streak cap 0.40.

**Gates as measured:**
- **Coop-full share:** visit players with an unmanaged Coop Hand, 60 min, 100 seeds. Median pooled over F11, F17 and F23.
- **F22–24 managed/unmanaged:** a proxy, measured as the idle income ratio over a 60-min window (collectibles off in idle).
- **Worst-seed 2× cap:** optimal player vs unmanaged idle, 10-min window (the CEO rule), F10/F18/F24, 100 seeds.
- **AC-W1–W7:** checked at shares 0, 0.15, 0.25 and 0.40 (50 seeds each).

| share | visit20 full % | **visit45 full % (≤35)** | visit90 full % | F22–24 mgd/unm (≥1.5) | worst seed active/idle (≤2.0) | AC-W1–W7 | pass |
|---|---|---|---|---|---|---|---|
| 0 (today) | 14 | 43 | 58 | 4.32 | 1.93 | all PASS | **no** (43%) |
| **0.15** | 2 | **20** | 35 | 4.49 | 1.93 | all PASS | **yes** |
| 0.20 | 0 | 13 | 27 | 4.49 | 1.93 | (bracketed) PASS | yes |
| 0.25 | 0 | 7 | 20 | 4.49 | 1.93 | all PASS | yes |
| 0.30 | 0 | 2 | 12 | 4.49 | 1.93 | (bracketed) PASS | yes |
| 0.35 | 0 | 0 | 6 | 4.49 | 1.93 | (bracketed) PASS | yes |
| 0.40 | 0 | 0 | 0 | 4.49 | 1.93 | all PASS | yes |

**Smallest passing share: 0.15**, the bottom of PM Workers' range. The visit90 player is also at 35% there. Choose 0.20 if the 90 s visitor must also meet ≤35% with margin.

**AC values, identical at every share tested:**
- W1: 98%, 24.7 min.
- W2: +0.00.
- W3: unmanaged F25 at 33.8 min vs 47.0 with no workers.
- W4: 2.00, 32.2 min.
- W5: 4.6.
- W6: 10.8 min.
- W7: L23 / L21.

**Caveats:**
- **The ACs are insensitive to the share.** Their bots tap 1/s, which clears the coop by itself, so an asleep Coop Hand never binds. The ACs show no regression, but they cannot show a benefit.
- **The worst seed (1.93) is unchanged.** Over a 10-min window the idle player's Coop Hand is still awake, so the share never applies.
- **The mgd/unm proxy rises slightly (4.32 → 4.49)** because unmanaged idle income drops about 4% once the asleep hand collects. I haven't traced the cause, but it moves the ratio in the safe direction.
- **The proxy is not the canonical progression-time metric** (2.27 min / 1.67). That metric's harness has 1/s tapping, so it would also be insensitive.

---
## Addendum (23:45): the ~4% drop in unmanaged idle income is traced
**Code:**
- `sim/telemetry/tel_pen_fix.py`: 100 seeds, F22–24, 60-min idle. Output in `tel_pen_fix_out.md`.
- `tel_streak.py` now also reports the end-of-window basket, coop stock, leave-penalty fees and wages.

**Cause: a leave-penalty interaction, not double counting and not a basket cap.**
- In the 60-min unmanaged idle window, every worker is asleep after about 15 min, including the Market Hand (W1). Nobody sells.
- **Share 0:** the asleep Coop Hand leaves eggs in the coop. The coop sits full (73% of the time) and the basket stays at 0.
- **Share > 0:** the Coop Hand moves eggs into a basket that nobody empties. By 60 min it holds 21k eggs at share 0.15 and 28k at 0.20 (F23). The coop stock is the same in both arms.
- The leave-penalty hook (`leave_pen` 0.05: a timed-out customer is charged if basket ≥ 1) then fires on every customer who leaves: $10–13/s at F22–24. Sales are identical in both arms, so the penalty is the whole drop.
- There is no basket cap in this window sim, so no eggs were lost at a basket cap.

| share | leave_pen | unmanaged idle $/s (F22 / F23 / F24) | delta vs share 0 | mgd/unm (F22–24 mean) | unsold basket at 60 min (F23) |
|---|---|---|---|---|---|
| 0 | 0.05 | 243.7 / 269.0 / 389.2 | — | 4.32 | 0 |
| 0.15 | 0.05 | 233.4 / 258.1 / 376.2 | −3.8% | 4.49 | 21,201 |
| 0.20 | 0.05 | 233.4 / 258.1 / 376.2 | −3.8% | 4.49 | 28,341 |
| 0.15 | 0 | 243.7 / 269.0 / 389.2 | **+0.0%** | **4.32** | 21,201 |
| 0.20 | 0 | 243.7 / 269.0 / 389.2 | **+0.0%** | **4.32** | 28,341 |

**Corrected income delta: 0.0%.**
- In this window the asleep collect share gives an unmanaged idle player **no income** at all. The extra eggs only pile up as unsold basket stock, because the Market Hand is asleep too.
- The −3.8% is the leave penalty charging a player who isn't there.
- The window sim follows the leave-penalty rule as written. Whether that counts as a bug depends on the design intent, so the fix is a rule decision.

**Corrected key numbers at shares 0.15 and 0.20** (leave penalty off when no seller is awake):
- **Coop-full share:** unchanged, because it doesn't depend on income. visit45: 20% at 0.15, 13% at 0.20. visit20: 2% / 0%. visit90: 35% / 27%.
- **F22–24 managed/unmanaged:** 4.32 at both shares (it was 4.49). Still ≥ 1.5, PASS.
- **Worst seed active/idle:** 1.93, unchanged. In the 10-min idle window the workers are still awake, so the basket never piles up and there is no penalty. PASS.
- **AC-W1–W7:** unchanged, all PASS. The rf_v04 harness has no leave penalty and its bots tap 1/s.
- **Smallest passing share is still 0.15.**

**Design flags for PM Workers / PM Collection:**
- **(a) Leave penalty:** it should not apply while the player is away and no seller is awake. Otherwise a collecting asleep Coop Hand costs unmanaged players about 4% at F22–24. Suggested rule: the penalty applies only if the player sold manually in the last 30 s, or the Market Hand is awake.
- **(b) The share is cosmetic for income:** it lowers coop-full time but adds no income unless the Market Hand also keeps working while asleep. If an income effect is wanted, pair it with a matching W1 asleep sell share. That would also lower the managed/unmanaged ratio, which needs a re-check.
- **(c) Unsold basket on return:** the basket shows up to about 28k unsold eggs, 60 min worth. That is a real stock the player sells on return. The window doesn't value it, so returning-player income is understated in both the penalty-on and penalty-off rows.
