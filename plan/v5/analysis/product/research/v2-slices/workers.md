# v2 slice: Workers. What the player does after automation (PM, Workers). v0.1, 2026-10-24
Task: D-CEO-20261024-05, staffed by HoP in D-HOP-2026-10-23-02. This is research and PM writing only. It has no code, no PRs and no game/ edits, and the M4.2 hold is unchanged.
Problem (Vadim's playtest): at Farm L10, once all 3 workers are bought, the player has nothing to do.
Builds on: `product/research/slices/workers.md` (the v1 slice, M1–M7, not repeated here), `workers/m4-abilities-spec.md` v0.3 (APPROVED sizes, never built), `workers/rc2-refill-proposal.md` v1.2, `workers/m4.2-fatigue-visibility-spec.md` v0.2.2 (parked), `workers/coop-full-unmanaged-proposal.md`, `game/src/sim/workers.ts`, and `game/data/economy.csv`.
Every number below is a **PM proposal**. Economy models it and HoP approves it. Nothing goes into economy.csv before that.

## 0. Why L10 is dead for workers (from our own data)
- **All three hires are done by F8.** W1 Market Hand unlocks at F3 ($40), W2 Coop Hand at F7 ($150) and W3 Hawker at F8 ($800). W4 Grader's first tier isn't until **F18** (economy.csv, w4_tier 0 through L17). So from **F8 to F17 the worker system offers nothing new to buy or decide.**
- **Refill isn't scarce with 3 workers.** drain_s_per_pct is 9, so a worker goes from 100% down to the 50% threshold in 450 s and down to Asleep in 900 s.
  - Demand: 3 workers each need a refill about every 450–630 s, which is about **0.29–0.40 refills/min**.
  - Supply: 1 charge per 150 s is **0.40/min**, with a cap of 2.
  - So supply ≥ demand. The only "decision" is to tap Refill when it lights up, which is the chore rc2 set out to remove. rc2 already conceded this: "choosing which worker to refill is rarely a real choice… depth arrives with Boost and the M4 abilities" (rc2 goal, v1.2).
- **Abilities were designed, sized and approved, but never built.** m4-abilities-spec v0.3 sets Rush, Sweep and Shout at ×1.15 and Inspect at +0.5 tier, each 30 s on a 300 s cooldown, plus Activate-all. HoE's buildability review (B1) found no ability sim code, so rc2 hid the Boost slot. **The post-automation verb we already designed is the missing piece.**
- **Speed effects do nothing.** Abilities v0.2 found that W1–W3 speed effects added about 0%, because egg supply is the limit. Any active effect has to raise price or supply, not throughput.

## 1. Precedents (mechanic → what keeps it meaningful → lesson)
v1 already covers IMT cooldowns and Mr. Turner, AdCap managers, Egg Inc RCB, drones and boosts (`slices/workers.md` M1–M7). This pass adds **assignment, passives and levels, prestige, timed-boost stacking, and fatigue as management.**

| # | Game · mechanic | What keeps play meaningful | Lesson for us | Source |
|---|---|---|---|---|
| P1 | **Idle Miner Tycoon: managers automate, and their active is a separate tap.** Junior/Senior/Exec effects last 1/3/10 min on 5/15/50 min cooldowns, multiplying ×2–8 speed or load, or cutting cost 40–80%. "Activate" in Mine Overview fires every manager in that mine (not across a continent). Managers sell back for 50%. | Automation removes the chore, but the multiplier only reaches a player who is present. Rank decides *where* a manager goes ("use Executive managers in your most productive shafts"). | Automation and active play coexist when the active part is a **timed multiplier on top of** automation. One Activate-all per screen keeps it to one tap. | [IMT wiki: Managers](https://idleminertycoon.fandom.com/wiki/Managers), [Kolibri help: Activate all](https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/176-how-do-i-activate-all-managers-in-a-mine/) |
| P2 | **IMT: assignment and swap.** From launch, players "could move them between different mineshafts, optimizing their effects & placement". Super Managers are restricted to a job type, have one timed active plus passives unlocked by promotion (L10/30/50), and can be moved to any mine. | Placement becomes a decision, because the community writes stage strategies around it (Balanced, Shaft-Ahead, Elevator-Ahead). People move managers between shafts when an active is on cooldown, and assign idle-boost passives before going offline. | Assignment only matters when there are **several stations to choose from**. We have one station per role, so assignment is low-fit until we have multiple coops or farms. **Passives that pay offline** are a good reason to "set up before you leave". | [Kolibri: Super Manager 2.0](https://kolibrigames.com/blog/introducing-super-manager-2-0/), [IMT wiki: Super Managers](https://idleminertycoon.fandom.com/wiki/Super_Managers) |
| P3 | **IMT: stacking timed boosts.** Kolibri's own tip is to "use a combination of boosts, instant cash items and Super Manager abilities, and go idle while your SMs are on cooldown". | A short, dense active burst followed by guilt-free idle time. The skill is in **timing and overlap**, not tapping. | Our deferred refill→Boost combo (45 s) is exactly this kind of overlap. Design the session as burst → idle, not continuous upkeep. | [Kolibri: Let's Dig In](https://www.kolibrigames.com/blog/lets-dig-in/) |
| P4 | **AdVenture Capitalist: managers end tapping, so spending and reset take over.** After the manager, "the player's attention moves from tapping to spending". Milestones at 25/50/100… units halve cycle time and keep changing the best buy. The wall is fixed by a reset for angels at +2% profit each, kept across resets. | AdCap goes flat after managers on purpose, and the active role becomes **buy choice plus prestige**. Pecorella: multiplier milestones are "the moments that pull the player back in". | Workers alone can't fix L10. If we automate fully, a **spending or prestige layer** has to take over (PM Farm Upgrades' slice: breeds, research, prestige). The workers' part is to give the *session* a verb, not the long arc. | [Game Design Lab: core loop](https://teemo.dev/game-design/adventure-capitalist/systems/core-loop/), [Game Design Lab: managers](https://teemo.dev/game-design/adventure-capitalist/systems/managers-and-upgrades/), [AdCap wiki: Angel Investors](https://adventure-capitalist.fandom.com/wiki/Angel_Investors) |
| P5 | **Egg, Inc.: timed boosts with slots and research.** By default 2 boosts can be active at once (5 with Pro Permit). Effects are large and time-boxed: 3× earnings for 20 min, 10× for 15 min, 50× for 10 min. Beacons multiply other active boosts. Research tiers unlock only after enough purchases in earlier tiers, and all research compounds. | Choosing **which boosts to combine, and when** (prestige combos, contract boosting) is the late-game decision. Research is a long buy list where the best next buy keeps rotating. | (a) A **slot or concurrency limit** turns abundance into choice. (b) Tiered research is the right shape for "worker training". That's PM Farm Upgrades' research slice; we'd plug worker perks into it rather than build our own tree. | [Egg Inc wiki: Boosts](https://egg-inc.fandom.com/wiki/Boosts), [Egg Inc wiki: Research](https://egg-inc.fandom.com/wiki/Research) |
| P6 | **Cookie Clicker: golden cookies.** Spawns come 300–900 s apart (about 447 s on average) and stay on screen 13 s. Frenzy is ×7 for 77 s and Click Frenzy ×777/click for 13 s. Overlapping two buffs is the combo (Frenzy + Click Frenzy ≈ ×5439/click). Upgrades double frequency and duration. | A **rare, telegraphed, time-limited** window, and the decision is to bank or buy so that Lucky pays out. Missing one costs little (the "missed" stat was even hidden after complaints). | Failure and opportunity should be **forgiving**: missing a window loses upside, never principal. PM Collection owns golden eggs. Our abilities shouldn't compete with them for the same moment (§4 E10). | [Cookie Clicker wiki: Golden Cookie](https://cookieclicker.fandom.com/wiki/Golden_Cookie) |
| P7 | **Two Point Hospital: fatigue as management.** Staff "get tired as they work" and go on break when energy is low, limited by a player-set break policy. A Staff Room restores energy, and returning at ≥80% grants **Energised**. Traits (1–3, permanent, visible on the hiring screen) include Tireless (slower drain) vs Lazy, and Cheap/Expensive (±10% salary). | Fatigue is a **readable system with player policy**, not a fail state. Traits make *hiring* a choice between two candidates. | (a) Our Rest already is a "staff room". An **Energised** bonus for resting to full gives Rest a reason to exist besides being slow. (b) **Traits at hire** are the cleanest way to make the hire a decision, but they need a candidate pool and save fields (L). | [TPH wiki: Staff](https://two-point-hospital.fandom.com/wiki/Staff), [Energy](https://two-point-hospital.fandom.com/wiki/Energy), [Traits](https://two-point-hospital.fandom.com/wiki/Traits) |

**Not researched this pass (gap):** Idle Mining Empire, Melvor Idle and Leek Factory Tycoon had no source gathered in time, so they're left out rather than guessed. Hay Day is still a gap from v1.
**Cross-precedent rule:** in every title, the late-game active verb is a **choice about timing and combination on a cooldown**, and never upkeep that idle play would punish. Our fatigue has to stay the *cost* of the active verb, not the reason to log in.

## 2. Proposed behaviour
### Recommended primary package (L10+): "Shift Calls". Abilities with an energy cost, through the Shift sheet
1. **Ship the approved M4 abilities unchanged in size.** Market Hand **Rush** sells eggs at ×1.15 price. Coop Hand **Sweep** makes hens lay ×1.15. Hawker **Shout** raises sale price ×1.15. Grader **Inspect** adds +0.5 tier and arrives at F18. Each lasts 30 s on a 300 s cooldown. They live in the rc2 Shift sheet's hidden Boost slot, and Activate-all goes in the sheet header (m4-abilities rules 1–8 and AC-A1–A6 stand).
2. **New: each call costs energy** (ability_energy_cost 10 points, which is 90 s of normal drain). **This makes fatigue the price of playing.** A player who uses every call pushes refill demand from about 0.29–0.40/min to about **0.37–0.51/min**, against a supply of 0.40/min. With 3 workers that brings back the rc2 shortage the design depends on.
   - A call is blocked if energy is no more than the cost (caption "Too tired"), so a call can never put a worker to sleep.
3. **New: the scarce charge gets a real fork.** "Refill now and keep base output" vs "refill + call inside 10 s to get the 45 s combo" (the deferred AC-RF4, now live) vs "save the charge for the worker about to fall asleep". The row shows ability readiness next to $/s at risk, so the trade-off is visible.
4. **New: Energised after Rest (TPH P7).** A worker that Rests to 100% (cause auto_full) gets +50% call duration on its next call (30 → 45 s, never stacking with the combo past combo_boost_s 45). This gives Rest a purpose beyond "slow free refill". The trade is to bench a worker now for a stronger call later.
5. **One telegraphed ready cue, no nagging.** When ≥1 call is ready and the player is attended (MK-33a definition: input in the last 30 s), the Refill nav button gets a small "⚡N ready" badge. There's no toast and no hint-bubble takeover (priority in §4 E9).
6. **Unlock:** the calls unlock at **F10** with a one-time coach card ("Your workers can make Shift Calls. Each costs energy."), for the workers already hired. This depends on P41-6 (§7 Q1).
7. **Offline:** calls never fire offline and there's no auto-call. Cooldowns keep ticking in wall-clock time (locked M4 rule 5). Fatigue offline follows the existing rules: energy and charges are frozen.

Why this package: it's the precedent with the best evidence (IMT P1/P3). It reuses the approved sizes and the rc2 sheet. It fixes the specific "supply ≥ demand at 3 workers" hole we measured, and it turns the existing failure system into a cost instead of a chore.

### Stretch items (ranked)
| ID | Item | Mechanic | Why / risk |
|---|---|---|---|
| S1 | **Overtime** (charge → call reset) | Spend 1 Refill charge to reset one worker's call cooldown instead of refilling it. Max 1 per worker per 10 min. | Makes the charge a three-way decision (refill / reset / save). Risk: raises call uptime, so the 2× cap must be re-checked first. |
| S2 | **Worker levels** | Each call used gives the worker 1 XP. At 10/30/60 XP it gains +0.02 call multiplier or −5% drain. Levels show on the card. | Gives a per-worker goal across F10–F17, where nothing else happens (IMT promotion P2). Needs save fields, M. |
| S3 | **Traits at hire** | The hire offers 2 candidates, each with 1 trait (Tireless −20% drain, Hustler +10% call effect with +20% drain, Thrifty −10% wage). | Makes the hire a decision (TPH P7). L: candidate UI, save, a balance sweep per trait. Best as an M5 item paired with re-hire or second-farm content. |
| S4 | **Shift rota (assignment)** | Pick which 2 of the 3 workers are "on shift". The off-shift worker Rests at 2× recovery. | Assignment with one station per role is shallow (P2 lesson). Only revisit if multi-coop or multi-farm ships. |
| S5 | **Wake-up tap** | Tapping an Asleep worker's sprite 3× gives +20% energy, free, once per 10 min per worker. | A cheap, telegraphed, recoverable mini-task. Risk: becomes a chore. Gate it behind telemetry showing asleep_share > band. |

## 3. Tunables (PM proposals → Economy models → HoP approves)
| key | proposed | range | notes |
|---|---|---|---|
| ability_unlock_farm | 10 | 8–12 | Below 12 touches the P41-6 L0–11 guardrail, so it needs a re-run |
| tc_ability_s / tc_ability_cd_s | 30 / 300 | locked | Already approved (m4-abilities v0.3), columns exist in economy.f1-m4cols.csv |
| ability multipliers Rush/Sweep/Shout · Inspect | ×1.15 · +0.5 tier | locked | Approved; any increase needs Economy + HoP |
| **ability_energy_cost** | **10** pts | 5–15 | Gate: managed refill demand > supply ≥20% of L10–17 time |
| ability_min_energy | cost + 1 | — | "Too tired" block |
| combo_window_s / combo_boost_s | 10 / 45 | locked | Deferred AC-RF4, now active |
| **energised_duration_mult** | **1.5** | 1.0–1.5 | Capped at combo_boost_s 45; doesn't stack with the combo |
| ready_badge_attended_s | 30 | — | Reuses leave_attended_window_s (MK-33a) |
| S1 overtime_per_worker_cd_s | 600 | 300–900 | Stretch |
| S2 xp_thresholds / per-level gain | 10/30/60 · +0.02 mult or −5% drain | — | Stretch |
| S3 trait values | Tireless −20% drain · Hustler +10%/+20% drain · Thrifty −10% wage | ±50% | Stretch |
| S5 wake_tap_gain / cd | 20 pts / 600 s | — | Stretch |
**Gates for Economy (seeds 0–99, staggered, existing 4 models):** F22–24 managed/unmanaged ≥1.5, P95 ≤2.0× and worst seed ≤2.25× (HoP 2026-10-16 23:16). The previous ability stack measured a worst seed of 1.95 at F18 *without* the energy cost, so the cost should lower it. AC-W1–W7 must pass. L10–17 managed active/passive income uplift is 1.3–1.8×. There are 0 RF8 dead zones.

## 4. Edge cases
- **E1 Hidden tab or offline (frame gap ≥60 s):** an active call ends at the gap (ability_ended cause offline). Its energy cost is not refunded and its cooldown keeps running in wall-clock time. A gap under 60 s is simulated normally, so the call continues.
- **E2 Reload mid-call:** active effects aren't saved. On load the call has ended (cause reload), and the cooldown is restored from the saved `readyAt` wall-clock value, clamped to [now, now + cd_s] to guard against clock skew.
- **E3 Unpaid:** the call is blocked with "Unpaid". If a worker goes Unpaid mid-call, the call ends (AC-A6).
- **E4 Resting:** the call is blocked with "Resting". Starting Rest mid-call ends the call. Energised is granted only on auto_full, not on a manual stop.
- **E5 Asleep mid-call:** this can't be caused by the cost (min-energy gate), but normal drain can do it. The call ends and the cooldown continues.
- **E6 1–2 workers hired:** calls exist per hired worker. Activate-all shows once ≥1 call is ready. It's separate from the rc1 bulk-refill ≥3 rule (manage_all_min_workers), which is unchanged.
- **E7 Save migration:** new optional fields `abilities.{id}.readyAt`, `xp` (S2) and `energisedNext`, with defaults ready/0/false. **No SAVE_VERSION bump** (same pattern as the rc2 charges, HoE review). Older builds ignore them. On first load ≥F10 every call is ready.
- **E8 Grader before F18:** no row, no badge, and Inspect is absent, not shown as locked.
- **E9 Hint priority:** coop-full > nudge > UC25 > **calls-ready badge** > M4. The badge is a nav badge, never a bubble, so it can't displace any hint. When the coop is full and Sweep is ready, the coop-full hint may add a secondary "Sweep" CTA (Art & UX to decide).
- **E10 Golden egg overlap (PM Collection):** a call and a golden-egg Frenzy stack multiplicatively, so Economy has to include the overlap in the 2× worst seed.
- **E11 MK-33a:** using a call counts as an input, so the player is attended.
- **E12 M4.2 fatigue chip:** if it ships, call-driven fatigue shows as real loss. That's correct, because calls cost energy. fatigue_explainer_suppress_after_refill_s also suppresses for 10 s after a call.
- **E13 Flag scoping (HoE B2):** calls appear only where abilities are live. Flag-off players keep rc2 behaviour.

## 5. Telemetry and KPIs
**Events** (proposed pinned: ability_used, ability_ended):
- ability_used {worker, energy_pct_before, energy_cost, via_all, combo, energised, farm}
- ability_blocked {worker, reason: cooldown|asleep|unpaid|resting|too_tired}
- ability_ended {worker, cause: duration|asleep|unpaid|rest|offline|reload, effect_s}
- calls_ready_unused_s (session total, like charges_capped_s)
- abilities_unlocked {farm}
- boost_used: retire it, and alias it to ability_used for one release (the rc2 placeholder)

| KPI (sessions at F≥10) | Target | Notes |
|---|---|---|
| Management actions/session (refill_used + rest_toggled + ability_used) | ≥4 per ~7 min session | Session benchmark from slice v1 §1 |
| Ability uses/session | ≥1.5 | 300 s cooldown × 7 min allows about 1.4 per worker |
| % sessions with zero management actions | ≤25% | Needs a baseline from current builds (Q3) |
| Active vs passive income ($/min, managed vs no action) | 1.3–1.8×, hard cap P95 2.0× | CEO cap |
| Failure band: share of active time with ≥1 worker Tired/Asleep | 10–30% | Below 10% fatigue is invisible, above 30% it punishes |
| Asleep share of worker-time | ≤10% | Gate for S5 |
| Combo rate (ability_used.combo) | 15–40% | Proxy for the refill-vs-call decision |
| refill_used.rank_by_risk ≠ 1 | ≥25% managed | The existing AC-RF5 telemetry check |

## 6. Build size (no ability code exists today)
| Item | Size | Dependencies |
|---|---|---|
| Ability sim (state, timers, effects, offline/cooldown rules) | **M** (HoE: 1.5–2 dev-days) | rc2 Shift sheet on main; balance.workers.ability_* already in balance.json |
| Energy cost + min-energy gate + Energised | **S** (~0.5 d) | Ability sim |
| Shift sheet Boost slot, Activate-all, ready badge, combo (AC-RF4) | **S–M** (~1 d) | rc2 sheet; Art & UX copy |
| Telemetry + debug setters | **S** (~0.5 d) | — |
| Economy re-run (2× cap, AC-W1–W7, demand>supply gate, L10–11 guardrail) | **S–M** | Economy harness |
| **Primary package total** | **M (~3.5–4.5 dev-days + QA)** | M4.2 hold lifted |
| S1 Overtime | S | Primary |
| S2 Worker levels | M | Primary, save fields |
| S3 Traits at hire | L | Hire UI, save, per-trait sweeps |
| S4 Shift rota | M | Low fit until multi-station content exists |
| S5 Wake-up tap | S | Art sprite tap target; gated on telemetry |

## 7. ACs (primary package, short)
- **AC-SC1:** at F≥ability_unlock_farm, each hired worker's Shift row shows its call with its cooldown. Below that level, no call UI exists (DOM scan at 360/1280).
- **AC-SC2:** a call costs ability_energy_cost ±0 energy, applies the approved effect for 30 s ±0.5, and sets cooldown 300 s ±1.
- **AC-SC3:** with energy ≤ cost, the call is disabled (disabled/aria-disabled) and reads "Too tired". It never takes a worker to 0%.
- **AC-SC4:** a call started ≤10.0 s after a refill on that worker lasts 45 s. An Energised call lasts 45 s. Having both still gives 45 s (no stacking).
- **AC-SC5:** blocked states (Asleep, Unpaid, Resting, cooldown) show the matching caption and log ability_blocked with the reason. A mixed state of one each plus one ready worker means Activate-all fires exactly 1 call.
- **AC-SC6:** a frame gap ≥60 s or a reload ends active calls (ability_ended cause offline/reload) with no refund. Cooldowns persist in wall-clock time. No call fires and no call effect accrues offline.
- **AC-SC7:** the ready badge shows only when ≥1 call is ready and the player is attended. It never changes hint priority (coop-full > nudge > UC25 > M4, checked with every pair active).
- **AC-SC8 (sim):** the §3 gates pass. In L10–17, a managed player has more Refillable workers than charges ≥20% of the time.
- **AC-SC9:** an L0–9 economy trace is byte-identical with the feature on and off (the AC-F11 pattern).

## 8. Open questions for HoP
1. **P41-6 guardrail:** unlocking at F10 changes L10–11 play. Approve F10 with an Economy re-run, or use F12 to stay outside L0–11?
2. **Energy cost vs approved spec:** m4-abilities v0.3 made calls free. Adding a 10-point cost changes an approved rule. Accept it as part of v2?
3. **Baseline:** do we have current-build telemetry for "% L10+ sessions with zero actions"? If not, Player and Critic's L10+ read is the baseline.
4. **Ownership with PM Farm Upgrades:** S2 worker levels could live in their research tree (Egg Inc P5) rather than a worker-local XP track. Who owns that?
