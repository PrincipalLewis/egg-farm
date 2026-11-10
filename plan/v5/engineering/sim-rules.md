# Sim rules as implemented (game/, 2026-10-15)
Config: `game/src/config/balance.json` (names follow economy.md where defined). Validated at load.

## Config / economy (M1-R1)
- `npm run sync-economy` fits the formula params in balance.json (collection, farm, customers incl. queue_max_base/step/cap, offline rate) from product/economy.csv and checks that **every CSV cell** is reproduced by `src/config/formulas.ts`. If any cell doesn't match, it fails with the row and column. `npm test`/`npm run build` run it with `--check`. Parity: `npm run gen-fixtures` runs product/sim/economy_sim.py, and tests compare all 31 levels, all 31×31 sale prices and the offline values.
- Sale price = round half-up to cents of (1.00 + 0.05F) × (1 + 0.12C) at sale time. Demand = uniform int [ceil(0.8k), ceil(1.6k)], k = eggs/s × interval. Queue = min(5, 3 + floor(F/10)).

## Time & tabs
- Fixed 10 Hz tick driven by the wall-clock delta between frames (robust to throttling).
- Threshold (60 s): one tunable, economy.csv row `offline_min_s`, synced to balance.json `offline.offlineMinSeconds` and `offline.hiddenSimMaxSeconds` (HoP, D-HOP-2026-10-24-45 addendum 23:10). "60 s" below means that value; exactly 60.0 counts as ≥ 60.
- Hidden tab < 60 s: simulated live (normal ticks, coop cap applies, customers arrive/leave, workers work and are paid; Refill cooldown/regen tick).
- Hidden tab ≥ 60 s: treated as offline. The provisional hidden sim is dropped and state is restored to the hide snapshot, so Refill timers and charges are frozen at their hide values, with no catch-up; the whole span is paid through the offline grant (AC11 rules below). Visible but frame-starved gap ≥ 60 s: first 60 s simulated, then frozen; no in-session grant. Negative gap / clock went back: nothing.
- Refill timers (Manage cooldown pre-rc2; rc2 charge regen): stored on sim state as remaining whole ms, decremented only by sim ticks, never derived from wall clock or an absolute timestamp, so a clock change moves nothing. Offline (closed game) they are frozen like hidden ≥ 60 s. On load: cooldown clamped to [0, cooldown ms], charges to an integer in [0, charge_cap], regen progress to [0, charge_regen ms); NaN/absent → 0 (absent charges → start_charges). Unlike M4 ability cooldowns, they do not tick offline.
- Closed/unloaded game: last save → next load ≥ 60 s goes through the offline grant (AC11). Autosave runs on hidden/pagehide/beforeunload.

## Offline (AC11 / §3.6)
- On load: eggs = floor(min(gap, 7200) × 0.25 × eggs_per_sec (`offline.offlineRateMultiplier`)(saved Farm L)); gap < 60 s or negative → 0.
- Goes to Basket via welcome-back modal: Collect **or close** both grant. Coop untouched. Customers frozen.
- At most one grant per load: a pending grant left from a previous load (tab closed with modal open) is settled into the Basket first.

## Market
- First arrival `first_customer_s`; interval for the Farm level at timer restart; an arrival to a full queue is lost (`customer_lost` full_queue), no backlog.
- **MK-10:** every customer not fully served leaves `customer_patience_s` after arrival. That includes partly served customers (the timer is never reset; they keep remaining = N − k until then). Partly served leavers log `customer_partial`; never-served ones log `customer_lost` (timeout).
- **Tick order (AC3, QA-RC2-1):** worker energy → coop fill → timeouts → arrivals → Coop Hand → Market Hand. Timeouts run before arrivals, so a customer leaving on the same tick frees its slot for the newcomer (locked by `tests/tick.test.ts` "AC3 tick order").
- Sale k = min(basket, remaining) at the price at sale time; Sell all goes front-to-back and stops at an empty basket.

## Telemetry
`src/telemetry/telemetry.ts`: ring buffer (`telemetry.ring_size` 5000), each event {type, ts, sessionMs}. Taps batched per `tap_batch_ms` (1 s) as {count, eggs}. Storage write only on flush (autosave/upgrade/pagehide), never per tap. Export: "Export telemetry" button / `window.eggfarmExportTelemetry()`.
Events: session_start/end, tap, sell{k,N,price}, customer_arrive, customer_served{partial}, customer_partial, customer_lost{reason timeout|full_queue}, upgrade{upgrade,newLevel,cost,coinsBefore}, offline_grant{secondsAway,eggs}, onboarding_step/skip (hooks only), coop_full{phase start|end}.
M2: sell also carries {value, by player|market_hand}; worker_hire{worker,cost,farm}, worker_manage{worker,energyBefore}, worker_state{worker,state tired|asleep|working}, grader_tier{tier,mult,cost}, coop_hand_tip{phase shown|tap}. Wages, Coop Hand collects and Market Hand sales are summed into one `worker_summary` per `telemetry.worker_summary_s` (60 s).

## UI (src/ui/, layout-spec v1 + M1-R1)
DOM/CSS only; the sim stays UI-free. The UI reads Game state and listens to `Game.on()` events for sfx and FX. Tap combine (`feel.tap_combine_window_ms`) merges the "+k" floater; at most `feel.max_flying_eggs` egg flyers are live at once; ≤30 FX elements overall. "Queue full!" walk-off at most once per `feel.queue_full_cue_min_gap_ms`; under reduced motion only the bubble fades. Fonts self-hosted (OFL) in public/fonts. SFX unlock on "Tap to start".

## Onboarding, debug, AC7
- Onboarding: new games only (no save at load). 3 steps collect → sell → upgrade, each advanced by the real game event. Skippable; shown once (`eggfarm.ui.onboardingDone`). Telemetry: `onboarding_step` {step, name} for steps 1–3 plus step 4 `complete`; `onboarding_skip` {atStep}. The overlay lets taps through, so the highlighted control keeps working.
- Debug panel: `?debug=1` only, loaded as a separate code chunk. It can add coins/eggs, fill the coop, skip +60 s / +10 min through the normal tick path, spawn or clear customers, change Farm/Collection levels, simulate 1 h / 3 h offline (backdates the save, then reloads), replay onboarding, export telemetry, and reset.
- AC7: `tests/pacing.test.ts` runs the seller15 and cheapest bots (tests/bot.ts) on the real sim, 20 seeds, medians: first upgrade ≤ 30 s, ≥ 9 upgrades by 5 min, Farm L10 at 8–12 min, L18 at 24–36 min, cheapest-first ≥ 70% of seller15.

## M2 Workers (branch m2-workers, spec v1.0)
`src/sim/workers.ts`, tunables in `balance.workers`. Workers: market_hand (F3), coop_hand (F7), hawker (F8), grader (tiers F18/19/21/22/24, cost floor(0.5 × farmCost(F))).
- Energy −1% per 6 s while Working/Tired; Tired < 50%, Asleep at 0 (stays 0 until managed). Manage = 100%, one shared 30 s cooldown.
- Market Hand serves the queue front-to-back every 1 s (3 s Tired); Coop Hand collects eggs_per_tap every 2 s (4 s Tired). Wage = rate × F × interval/60, charged per action, capped at current coins (never negative); none while Asleep.
- Hawker: new demand × 1.25 (1.10 Tired), rounded, ≥ 1. Queue cap stays 5. Grader: sale value = round(k × price × mult); half bonus Tired, 25% Asleep.
- Offline: workers frozen (no work, drain or wage). Hidden < 60 s runs the normal tick, so workers do work (and draw wages) there; hidden ≥ 60 s restores the hide snapshot (frozen, see Time & tabs).
- Save v5 adds workers/graderTier/manageCdS/coopFullS.

## Saves: close-time copy (M4-19 rev 3, 2026-10-17)
Closing the tab (pagehide, beforeunload, endSession) writes the save to IndexedDB `eggfarm/save/unload`, never to `main`. Hiding the tab writes `main` as usual. At the next load the close copy counts as one more stored copy. It is used only when it is valid and strictly newer than every other copy, and offline time is measured from its savedAt. A save whose savedAt is NaN or ±Infinity loads like a missing savedAt: progress is kept, there is no offline grant, and the save is re-stamped now (SD6-2).

## Changelog
- 2026-10-24 23:30 (Budapest) · HoE · HoQA FC-N6: Time & tabs hidden-gap text updated to the HoE 23:12 ruling (hidden < 60 s live; hidden ≥ 60 s / offline freezes Refill timers and charges at the hide snapshot, no catch-up; timers as remaining whole ms on sim ticks, clamp on load; threshold = economy.csv `offline_min_s` → offline.offlineMinSeconds / hiddenSimMaxSeconds). M2 Workers offline line aligned. Offline-earnings (AC11) rules unchanged.
