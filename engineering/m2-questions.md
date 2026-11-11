# M2 Workers: questions for PM Workers (Engineering, 2026-10-15)
Built against m2-proposal **v1.0**. Every value is in `balance.workers`, so an answer means a config change, not a code change. My current choice is in [brackets].

1. **v1.1 proposal** (15 min drain, Tired < 30%, yawn at 40%, Manage all at 3+ workers, asleep keep 15%) is awaiting HoP. Do we build v1.0 now and switch on approval? [v1.0. Manage all would be new code, about 0.5 day]
2. **Coop Hand unlock:** v1.0 and M2_V03 say F7, but `M2_REC` in economy_sim.py says F10. Which sim config is the reference for AC parity? [F7. Our medians match run_m2 either way, per the validation note]
3. **Wages:** charged per action interval (Market Hand 1 s / 3 s, Coop Hand 2 s / 4 s), capped at current coins so they never go negative, and also charged when there's nothing to sell or collect. This is how the sim does it. Is that intended? Should a worker stop when the player can't pay? [same as the sim]
4. **Manage cooldown:** one 30 s cooldown shared by all workers, as in the sim, or one per worker? [shared]
5. **Grader tier upgrade:** does buying a new tier refill the Grader's energy? [no, as in the sim]
6. **Rounding:** Hawker demand = round(raw × 1.25), min 1. Grader sale = round(k × price × mult) cents per sale, not per egg. OK? [yes]
7. **AC-W1 (casual):** it needs Poisson arrivals and demand × 0.75. The real sim has neither (fixed intervals, MK-2). Options: (a) add test-only hooks to the sim, or (b) accept the Python result and gate AC-W1 by playtest. [b, test marked todo]
8. **Telemetry:** I added worker_hire, worker_manage, worker_state, grader_tier and coop_hand_tip, and a worker_summary every 60 s (wages, Coop Hand eggs, Market Hand eggs and $). Is anything missing for AC-W5?
9. **Sold-out display:** the brief asked for a placeholder, but v1.0 dropped it along with the Hawker slot. Confirm it's out? [out; M1's existing UI unchanged]
10. **Coop Hand tip:** the 10 s at cap is still [A]. "Once per session" = once per page load? Should it also show when the Coop Hand is asleep? [per page load; only when not hired]
11. **Hidden tab:** the 60 s hidden-tab catch-up runs the normal tick, so workers work, drain and get paid during it. Only true offline is frozen. OK? [yes]
12. **Market Hand Tired "mistake" rule** (from the text) isn't in the sim. Is it in scope for M2? [no]
13. **Handoff gate:** the spec says the Engineering handoff comes after M1 QA sign-off. We're building on a branch in parallel and won't merge before sign-off. OK?
