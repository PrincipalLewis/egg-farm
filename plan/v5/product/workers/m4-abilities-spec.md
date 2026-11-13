# M4 Worker Abilities spec (PM, Workers) v0.1, Oct 16 2026
> **Superseded for M5 by `product/workers/m5-worker-abilities-spec.md` v1.0 (2026-10-24).** The sizes here (v0.3) are carried into it unchanged. Pause rules: `product/workers/m5-worker-pause-spec.md` v1.0.
The base is 30 s active with a 5 min cooldown (from the Economy model). Each worker gets one ability, and there's an Activate-all button. The magnitudes below are proposals that Economy/Balance needs to model.

| Worker | Ability | Effect for 30 s |
|---|---|---|
| W1 Market Hand | Rush | Eggs it sells earn ×1.15 price |
| W2 Coop Hand | Sweep | Hens lay ×1.15 (more eggs) |
| W3 Hawker | Shout | Sale price ×1.15 |
| W4 Egg Grader | Inspect | Current price tier +0.5 (for example, ×2.0 becomes ×2.5) |

## Rules
1. Paused: the ability can't be used. The button is disabled with the caption "Paused". Confirmed.
2. Tired (1–29%): the ability works but doesn't restore energy. Confirmed. While it's active, the drain is the normal 1× (no extra drain).
3. Asleep or Unpaid: the ability can't be used, and the caption reads "Asleep" or "Unpaid". This is an addition to your note.
4. If a worker falls asleep or goes unpaid mid-ability, the effect ends and the cooldown keeps running.
5. Cooldowns tick in real time, including while paused and offline. Abilities have no effect offline.
6. Activate-all fires every eligible worker, skipping any that are paused, asleep, unpaid or on cooldown. It's disabled with the caption "Nothing ready" when no worker is eligible. It has no cooldown of its own.
7. Abilities are free and are separate from the Refill cooldown.
8. Telemetry events: ability_used {worker, energy_pct, via_all} and ability_blocked {worker, reason}.

## ACs
- AC-A1: Using an ability on a paused, asleep or unpaid worker does nothing, and the correct caption is shown.
- AC-A2: Using an ability on a tired worker applies the effect, and energy is unchanged apart from the normal drain.
- AC-A3: Activate-all applies to exactly the eligible set. A mixed state of one worker each paused, asleep, on cooldown and ready results in exactly one activation.
- AC-A4: The cooldown is 300 s ±1 s, and it keeps counting while the worker is paused and while the game is offline.
- AC-A5 (sim, seeds 0-99): The managed/unmanaged ratio averaged over F22-24 is ≥1.5. Using abilities on cooldown raises managed income by at most 15% over the M4 baseline. All of AC-W1 through AC-W6 still pass.
- AC-A6: An ability ends early when its worker falls asleep or goes unpaid.

v0.2 (Oct 16): Economy found W1-W3 added about 0% because egg supply is the limit. Their abilities now raise price (W1, W3) or supply (W2). W4 stays at +0.5 tier. Sizes are pending Economy's sweep.
v0.3 (Oct 16): Sizes set to Rush, Sweep and Shout at ×1.15 and Inspect at +0.5, per Economy's sweep on seeds 0-99. Together they add +9.9-13.6% to managed income, and the F22-24 ratio is 2.34-4.22. Provisional until Economy confirms the full stack stays under the CEO's 2x active/idle cap on the worst seed. If it doesn't, the fallback is 1.1/1.15/1.15.
v0.3 confirmed (Oct 16): the full stack passes the CEO's 2x cap. The mean is 1.64-1.73 and the worst seed reaches 1.95 at F18. The ceiling is x1.20 (worst 1.98); x1.25 fails (2.01). Source: m4-active-checks.md. Sizes are final, pending Head of Product's approval.
APPROVED by Head of Product (Oct 16): v0.3 is locked at x1.15 plus +0.5 tier. Any increase needs an Economy rerun and Head of Product's sign-off.

## Pacing AC (Oct 16, HoP-approved band, decisions.md 14:58)
- AC-W7 (sim): At 30:00, a run with workers (three hires at unlock, v0.3 abilities, Grader) is at farm level L20-24, and a run without workers is at L18-22. The current model gives L23 at 30:00 with workers, F30 at 40.75 min and a worst gap of 90 s (product/sim/m4/m4_workers_prog_out.md).
