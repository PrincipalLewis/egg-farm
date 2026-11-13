# M4 Timed Collectible ("Golden Egg"): draft spec · v0.5 · 2026-10-16 · PM, Collection
Status: **DRAFT for review** (due Thu 2026-10-22). v0.2 folded in Art & UX U1–U6. **v0.5 (13:12)**: from Farm L20, the eggs reward pays its cash equivalent [HoP]; popup copy confirmed by Art & UX. **v0.4 (13:15)** applies Head of Product's 13:10 decisions (decisions.md): no frenzy/boost stacking, frenzy on all sales, the `collectible_collected` event name, and the ratio-gate scope. **v0.3 (13:05)** applies Head of Product's M4 values from `product/m4-manage-proposal.md` (§2.3, source of truth; it overrides Economy's E6 and the old gap), Economy's E1–E7 answers (`product/m4-tracks-model.md`, "Market, worker modes and golden egg"), and Art & UX's confirmed frenzy copy. Frenzy approval is verified in `decisions.md` 2026-10-16 13:00 (Product) and m4-manage-proposal §2.3. `economy.md`/`economy.csv` don't carry the `tc_*` values yet. Head of Product made this an M4 must-have. Research basis: `product/research/slices/collection.md` §1 (Cookie Clicker Golden Cookie), §2 (Egg Inc. drones), §7 (TT2 fairies).

> **Numbers:** every number marked **[P]** is a *proposal*. The Economy/Balance Designer models it in the sim, and Head of Product approves it. Once approved, the values live in `economy.csv` (the source of truth) as constant `tc_*` columns (same on every row; Economy E2), with the formulas in `economy.md`. Values marked **[HoP]** are set by Head of Product in m4-manage-proposal; **[P]** values still need Economy to re-confirm. No value may be hard-coded (M4-AC20).
> **Visuals:** Art & UX decided U1–U6 on 2026-10-16 (§10). Still pending: spawn-spot coordinates and the mock in `art-ux/m4-timed-collectible.md`, due Tue 2026-10-20 EOD.

## 1. Problem and goal
In the playtest the game plays itself by about Farm L10 (about 10 min, economy.md AC7 pacing). The only active verb is Collect, and Collect clears the coop easily. Goal: an occasional, optional, rewarding reason to look at the screen and tap, that never punishes idle players.
**Non-goals:** no backlog, no offline spawns, no ads (M4-B owns the rewarded boost), no premium currency.

## 2. Core behaviour
2.1 **What it is:** one tappable **golden egg** (Art & UX U1: golden egg only; the "special hen" skin moves to M5+). Only **one** may be on screen at a time.
2.2 **Unlock:** spawns start when Farm L ≥ `tc_unlock_farm` = **8 [HoP]** (m4-manage-proposal §2.3; replaces L6). Once unlocked, spawning never re-locks. The level check applies even after a Farm reset or prestige, if one is added later.
2.3 **Spawn timing (online, visible tab only):**
  - First spawn comes `tc_first_spawn_s` = **45 [P]** s after unlock.
  - After that, the next spawn timer starts when the previous collectible *resolves* (tapped or expired). The gap is uniform random in [`tc_gap_min_s`, `tc_gap_max_s`] = **[120, 300] [HoP]** s, i.e. every 2–5 min (mean 210 s).
  - Expected rate: about one every 215 s (210 s gap plus about 5 s to tap), so about **17 per hour** of active play (PM arithmetic).
  - The timer counts real elapsed time while the tab is visible, using the same tick as the coop (feature-spec §2). It is **paused** while the tab is hidden.
2.4 **Lifetime and despawn:** a collectible stays for `tc_lifetime_s` = **30 [HoP]** s of visible time, then expires with no reward and no penalty.
2.5 **Despawn states (Art & UX U3; Art & UX owns the exact look):**
  - **Idle** (0–20 s).
  - **Warning** from `tc_warn_at_s` = **20 [P]** s.
  - **Urgent** from `tc_urgent_at_s` = **27 [P]** s.
  - **Fade** at 30 s. It is not tappable during the fade.
  - **Reduced-motion variant:** no blinking; it uses a non-motion timer cue such as a ring.
  - No modal or toast. The warning must not rely on colour alone.
  - **Sound (U5):** spawn, warning and tap cues are **on by default** and respect the game's mute setting. Engineering adds the audio hooks.
2.6 **Tap:** the first valid tap grants the reward on that frame. The collectible disappears and a reward popup shows (§3). A second tap on the same collectible does nothing.

## 3. Rewards
Weighted random roll at tap time (not at spawn, so it can't be "scouted"):
| reward_type | weight | Size | Destination |
|---|---|---|---|
| `cash` | `tc_p_cash` = **0.45 [P]** | coins = round(`tc_cash_prod_s` × eggs_per_sec × egg_price_effective, 2), `tc_cash_prod_s` = **45 [P]** | Coins, immediately |
| `frenzy` | `tc_p_frenzy` = **0.35 [P]** | sale price × `tc_frenzy_mult` = **2 [HoP]** for `tc_frenzy_s` = **30 [HoP]** s. Laying is unchanged | Every sale during the window |
| `eggs` | `tc_p_eggs` = **0.20 [P]** | eggs = floor(`tc_eggs_prod_s` × eggs_per_sec), `tc_eggs_prod_s` = **60 [P]** | Basket directly (bypasses the coop cap, like offline eggs). **From Farm L ≥ `tc_eggs_cash_from_farm` = 20 [HoP]: pays coins instead (`eggs_cash`, below)** |
- **Eggs reward from L20 [HoP]:** at Farm L ≥ 20, an `eggs` roll pays **coins = round(`tc_eggs_prod_s` × eggs_per_sec × egg_price_effective, 2)**, i.e. 60 s of production × the current price. This uses the same price definition as `cash`: Grader included, M4-B boost excluded, streak excluded. Nothing goes to the Basket. The weight stays `tc_p_eggs`. Telemetry `reward_type = "eggs_cash"`. It uses the existing cash popup and fly-to-money feedback (Art & UX confirmed, below).
- **egg_price_effective** = the current sale price per economy.md, **including the Grader multiplier [HoP]**, the Collection/Egg-value bonus, **excluding the streak** (HoP 13:06) **and the M4-B 2× ad boost** (Economy E3). It is used for the `cash` and `eggs_cash` payouts; frenzy sales use the live price, which includes the streak.
- **Frenzy scope [HoP 13:10]:** the 2× applies to **all sales** during the 30 s: player and worker sales (Market Hand/Hawker), and eggs from Basket stock (including `eggs`-reward eggs). It multiplies the effective price; it does not add to it.
- **Frenzy vs M4-B boost [HoP 13:10]: they never stack.**
  - If `frenzy` is rolled while the boost is active, the roll becomes `cash`, and `collectible_collected.rerolled_from = "frenzy"`.
  - While a frenzy is active, the M4-B boost button is **disabled with the caption `Frenzy active`**, and it re-enables when the frenzy ends.
  - Note: the M4-B ad boost itself still needs **CEO and Vadim sign-off** before it ships. Without the boost these rules are inert, and every frenzy roll stays a frenzy.
- **No banked-coin cap on cash** (Economy E7).
- Reward sizes are formulas on the row's eggs_per_sec × price, with no per-level payout columns (E2).
- **Rough EV (PM arithmetic, recomputed for the 2–5 min gap; Economy to re-confirm):**
  - cash: 0.45 × 45 s = 20.3 s of production value;
  - frenzy: 0.35 × about 30 s = 10.5 s. It adds one extra price on 30 s of sales, and sales ≈ production because demand is about 1.2× supply;
  - eggs: 0.20 × 60 s = 12.0 s.
  - Total ≈ **43 s of production value per spawn**. One spawn per ~215 s gives about **+20% income at 100% catch**, about **+12% at a 60% catch rate** (Economy's realistic active rate, E1), and **0% idle**.
  - Economy's E1 figures (+29–30% at 100%, +14–22% at 60%) were simmed on the old 90–180 s gap with a 3× laying frenzy, so **both need a re-sim**.
- **Popup copy (Art & UX, confirmed 13:02):** cash `+$1.2K!` (amount in the standard short form), frenzy **`Frenzy! 2× price`**, eggs `+25 free eggs!` (the real count; singular "egg" when it is 1). **From L20 the eggs slot uses the cash popup `+$X!`** (e.g. `+$1.2K!`), with coins flying to the money pill. X is exactly the amount credited, in the standard short form. Never `+$X coins` (Art & UX confirmed 13:10).
- **Frenzy pill (confirmed):** **`2× 0:30`** counting down. Same position and style as before, immediately left of the M4-B boost timer (or in that place when no boost shows). Frenzy and the boost never run together, so the pill shows on its own.
- **Price display during frenzy (Art & UX):** every visible egg price shows the doubled value with a **gold `2×` chip**: the customer card price line, the Sell button value and Sell all. It reverts when the frenzy ends. "Full!" keeps its normal style (the v0.2 gold tint is dropped).
- **Overlap:** a second frenzy can't overlap under defaults (30 s < min gap 120 s). If tunables ever allow it, the new frenzy refreshes the duration and doesn't stack the multiplier (m4-manage-proposal edge case 5).

## 4. Offline and background (Head of Product lean, specified)
4.1 **No spawns offline and no backlog.** Time away never creates collectibles or "missed" rewards.
4.2 **Background < 60 s** (the existing catch-up path): the spawn timer and an on-screen collectible's lifetime are both **paused** while hidden, and resume on return. The coop catch-up is unchanged. Rationale: a hidden tab can't be tapped, so it shouldn't lose a collectible.
4.3 **Background ≥ 60 s or reload** (offline path): any on-screen collectible is removed silently. Fire `collectible_expired` with `reason=offline`, show no warning, give no reward. The spawn timer restarts from a fresh [120, 300] s gap after the welcome-back modal closes. Nothing spawns while the modal is open.
4.4 **An active frenzy** keeps running on wall-clock time; it does not pause. If it ends while the app is hidden, it simply ends, with no catch-up bonus. Offline eggs (AC11) and offline sales are **never** priced at frenzy rates. Customers don't queue while away.
4.5 **Save:** we persist only `next_spawn_remaining_s` and the frenzy end timestamp. An on-screen collectible isn't saved (see 4.3). A negative clock delta counts as 0 elapsed (same rule as feature-spec E13).

## 5. Interaction with coop cap, Basket, frenzy overflow
5.1 **Frenzy and the coop cap:** frenzy changes price, not laying, so it causes **no extra coop-cap loss**. Economy's 17% peak-loss figure (E5) was for 3× laying and no longer applies, and **no cap increase is needed**. Ordinary "Full!" loss (M1 Q1) is unchanged, and "Full!" keeps its normal style.
5.2 **Frenzy value depends on selling:** the gain is the extra price on eggs sold during 30 s. Sales are limited by customer demand (about 1.2× production) and Basket stock, so the player benefits most by tapping customers / Sell all during the window. Telemetry records `extra_coins` and `eggs_sold` (§7) so Economy can see how much of a frenzy is captured.
5.3 **`eggs` reward** goes to the Basket, bypassing the coop cap (same path as offline eggs). It uses the same fly-to-Basket feedback and never touches the coop.
5.4 **Cash reward** goes straight to coins, the same frame as the tap. The upgrade rows re-evaluate affordability right away.
5.5 Collect taps work normally during everything above. A collectible never blocks or consumes a Collect tap (§6).
5.6 **M2 Workers:** worker sales during a frenzy get the 2× price **[HoP]**. Workers never tap collectibles.

## 6. Tap target and anti-misclick (360 px layout)
6.1 **40 px visual centred in a 56×56 CSS px hit area** (Art & UX U3; `tc_hit_px` = 56, `tc_visual_px` = 40). This is above the 48 px minimum and replaces the v0.1 48 px rule.
6.2 **Spawn exclusion zones.** The collectible's hit area plus a **16 px** (`tc_margin_px` = 16, Art & UX U2) margin must not overlap:
  - the Collect button and coop sprite hit area;
  - the upgrade rows (Collection and Farm);
  - the customer queue cards and the Market panel / Sell buttons;
  - the HUD (coins, basket, next-goal strip, boost chip);
  - worker cards / Manage buttons (M2);
  - any open modal or sheet;
  - the bottom nav;
  - the **streak meter box + 16 px** (m4-collect-streak-spec §4.7; this applies regardless of the general margin);
  - the OS safe areas (notch and home indicator).
6.3 **Spawn region:** **8 fixed spawn spots per layout** (360×640, 375, desktop; Art & UX U2). Coordinates will be in `art-ux/m4-timed-collectible.md`, due Tue 2026-10-20. At spawn, pick a random slot that is valid for the current layout. If no slot is valid (e.g. at 360×640 with a sheet open), **defer the spawn** until a slot is free. The lifetime doesn't start until it is shown.
6.4 **Stationary:** no movement across other controls. A gentle bob within its own hit area is fine.
6.5 **Fresh-spawn grace:** a tap that lands within `tc_spawn_grace_ms` = **250 [P]** ms after appearing (or that started before it appeared) is ignored, so rapid Collect tapping can't hit it by accident. Pointer-down must start inside the target.
6.6 **Menu/modal open (Art & UX U6):** the lifetime and the spawn timer **pause**. The collectible stays **frozen under the scrim**: visible, not animating, not tappable. Both resume when the menu closes. Taps go only to the top-most layer.
6.7 **Input:** pointer events, so one physical tap = one action (as feature-spec E8). Multi-touch: one grant only.
6.8 **Accessibility:** the collectible is focusable with an aria-label ("Golden egg, tap to collect") and can be activated with Enter/Space on desktop.

## 7. Telemetry
Uses the existing local event log and export (M3). Common fields are added by the logger as today (timestamp, session, save version). Event-specific properties:
| Event | Properties |
|---|---|
| `collectible_spawned` | `collectible_id` (per-session counter), `skin` ("golden_egg"…), `farm_level`, `collection_level`, `slot_id`, `interval_s` (gap actually waited), `deferred_ms` (time held by §6.3) |
| `collectible_collected` | `collectible_id`, `reaction_ms` (visible time from spawn to tap), `in_warning` (bool, tapped after 20 s), `reward_type`, `reward_value` (coins, or eggs, or multiplier 2), `reward_duration_s` (30 for frenzy, else 0), `rerolled_from` (null, or "frenzy" when the boost rule converted it), `boost_active` (bool), `farm_level` |
| `collectible_expired` | `collectible_id`, `reason` ("timeout", "offline", "reload"), `farm_level` |
| `reward_type` | Not a separate event: an enum property on `collectible_collected` with values `cash` / `frenzy` / `eggs` / `eggs_cash` (the eggs slot at Farm L ≥ 20; `reward_value` = coins) |
| `frenzy_started` | `collectible_id`, `mult` (2), `duration_s` (30), `farm_level`, `grader_tier` |
| `frenzy_ended` | `collectible_id`, `extra_coins` (coins above the non-frenzy price), `eggs_sold`, `sold_by_player`, `sold_by_workers`, `reason` ("timeout", "hidden_end", "offline") |
- **Naming [HoP 13:10]:** the event is `collectible_collected`, replacing `collectible_tapped` everywhere. `frenzy_started`/`frenzy_ended` match m4-manage-proposal. Its `{spot, outcome, payout}` map to `slot_id`, `reward_type` and `reward_value` here.
- No personal data; install_id handling stays as in M3.
- **KPIs for review [P]:** tap rate (tapped / spawned) ≥ 60% in active sessions; median reaction < 10 s; the active/idle ratio for the full M4 stack stays within the CEO cap (§9 M4-AC24).

## 8. Edge cases
| # | Case | Expected |
|---|---|---|
| T1 | Farm L7 → L8 bought | First spawn 45 s later; never before |
| T2 | Tapped at 29.9 s | Reward granted (tap processed on input frame) |
| T3 | Tapped during poof (≥ 30 s) | Nothing; expired already fired |
| T4 | Double / multi-touch tap | Exactly one reward |
| T5 | Collect tapping at 10/s when it spawns | No collectible grant within 250 ms grace; Collect taps unaffected |
| T6 | Tab hidden 40 s with collectible at 25 s | Returns at 25 s, same warning state; timer resumes |
| T7 | Tab hidden ≥ 60 s / reload | Removed, `expired reason=offline/reload`, no reward, new gap after modal |
| T8 | Frenzy while coop full | Normal "Full!" (no gold tint); frenzy doubles sale price only; laying unchanged |
| T9 | Frenzy then Farm or Grader upgrade | The 2× applies to the new effective price from that tick; the end time is unchanged |
| T10 | Cash reward while M4-B boost active | Price excludes the boost and includes the Grader |
| T10b | `frenzy` rolled while the boost is active | Granted as `cash` instead; `rerolled_from="frenzy"` |
| T10c | Player tries to start the boost during a frenzy | Boost button disabled with the caption `Frenzy active`; it re-enables at frenzy end |
| T10e | Ad boost not shipped (pending CEO/Vadim) | No re-roll; frenzy always granted as rolled |
| T10d | Frenzy, basket empty and no customers | The frenzy runs out with `extra_coins` = 0; no compensation |
| T11 | No free spawn spot (all 8 blocked) | Spawn deferred, lifetime not started |
| T11b | Menu opens over a live collectible | Frozen under the scrim, not tappable, lifetime paused; it resumes at the same second when the menu closes |
| T12 | Device clock jumps backward | That tick counts as 0 elapsed: the spawn timer and lifetime don't move, and nothing spawns or expires. The frenzy keeps its saved end timestamp and is never lengthened |
| T13 | Clock jumps forward while visible (> 60 s in one tick) | Treated as the offline path (4.3) |
| T14 | Two tabs (single-tab guard) | Only the active tab spawns; guarded tab spawns nothing |
| T15 | Reduced motion | Art & UX reduced-motion state: no blinking |
| T17 | Game muted | No collectible sounds; visuals unchanged |
| T16 | Basket very large / eggs reward huge | Number short form per C-AC25(e) |

## 9. Acceptance criteria (Given / When / Then)
All numbers below are the **[P]** defaults. QA reads them from config/CSV.
- **M4-AC1** Given Farm L < `tc_unlock_farm`, when any amount of time passes, then no collectible spawns and no `collectible_spawned` fires.
- **M4-AC2** Given Farm reaches `tc_unlock_farm` at time t, then the first collectible spawns at t + `tc_first_spawn_s` (±1 tick), if a valid slot exists.
- **M4-AC3** Given a collectible resolves at time t, then the next spawns in [t+120, t+300] s of visible time. Over 200 spawns in a sim or test harness, the gaps are within that range and their mean is 210 ± 15 s.
- **M4-AC4** Given a collectible is on screen, then no second one spawns.
- **M4-AC5** Given a collectible is untouched, then the idle state shows from 0 s, the warning state at 20 s, the urgent state at 27 s, and the fade at 30 s, after which it is gone, `collectible_expired{reason:"timeout"}` fires, and coins, coop and Basket are unchanged.
- **M4-AC6** Given a collectible is visible, when it is tapped once at any time < 30 s (after the 250 ms grace), then exactly one reward is granted on that frame and `collectible_collected` fires with `reward_type` and `reward_value` that match the state change.
- **M4-AC7** Given 10,000 seeded reward rolls, then with no boost active the shares of cash/frenzy/eggs are 45/35/20 ± 1.5 points (weights [P], Economy to re-confirm), and changing the weights in config changes the shares.
- **M4-AC8** Given eggs_per_sec E and effective price P (including the Grader multiplier, excluding the M4-B boost), with or without a boost active, when a `cash` reward is granted, then coins increase by exactly round(45 × E × P, 2) (half-up).
- **M4-AC9** Given Farm L < 20 and eggs_per_sec E, when an `eggs` reward is granted, then the Basket increases by floor(60 × E), the coop is unchanged, and the coop cap is ignored.
- **M4-AC9b (eggs → cash from L20)** Given Farm L ≥ 20, eggs_per_sec E and effective price P (Grader included; boost and streak excluded), when the eggs slot is rolled, then coins increase by exactly round(60 × E × P, 2) (half-up), Basket and coop are unchanged, `collectible_collected.reward_type = "eggs_cash"` with `reward_value` = that amount, and the popup reads `+$X!`, where X is that amount in short form (never `+$X coins`), with coins flying to the money pill. At Farm L19 the same roll gives eggs per M4-AC9.
- **M4-AC10** Given a `frenzy` reward at time t, then every egg sold in [t, t+30 s), whether by the player, a worker or from Basket stock, earns exactly 2 × the effective price (rounded per AC4), and laying, coop and coop cap are unchanged. The pill `2× 0:30` counts down in the usual position, and at t+30 s (±1 tick) prices revert and the pill disappears.
- **M4-AC10b** Given a frenzy is active, then every visible egg price (the customer card price line, the Sell button value and Sell all) shows the doubled value with a gold `2×` chip. When the frenzy ends, every one reverts to the normal value with no chip within 1 tick. "Full!" shows its normal style throughout.
- **M4-AC11** Given the M4-B boost is active, when a reward roll gives `frenzy`, then a `cash` reward is granted instead (per M4-AC8), no frenzy starts, and `collectible_collected.rerolled_from = "frenzy"`. Given a frenzy is active, then the M4-B boost button is disabled and shows `Frenzy active`, and within 1 tick of the frenzy ending it is enabled again with its normal caption. Given the boost feature is off, then `frenzy` rolls are never converted.
- **M4-AC11b** Given a frenzy ends, then `frenzy_ended.extra_coins` equals the sum over sales in the window of (frenzy price − normal price), and `eggs_sold` = `sold_by_player` + `sold_by_workers`.
- **M4-AC12** Given the player is offline for any time ≥ 60 s, then on return no collectible is on screen, no reward or backlog is granted, the offline eggs equal AC11 with no frenzy price, and the next spawn comes ≥ 120 s after the welcome-back modal closes.
- **M4-AC13** Given a collectible at 25 s and the tab is hidden for 40 s, then on return it is still visible at 25 s and expires 5 s of visible time later. With no collectible on screen, the spawn timer doesn't advance while the tab is hidden.
- **M4-AC14** Given the tab is hidden ≥ 60 s or the page reloads with a collectible on screen, then `collectible_expired{reason:"offline"|"reload"}` fires once and no reward is granted.
- **M4-AC15** Given each layout (360×640, 375, desktop), for 500 spawns, then every spawn uses one of that layout's 8 spots from art-ux/m4-timed-collectible.md, the visual is 40 px, the hit area is 56×56 CSS px, and no hit area comes within 16 px of any §6.2 zone, **including the streak meter box** (also when the meter is hidden, so spots stay stable).
- **M4-AC16** Given no valid slot exists, then the spawn is deferred, the lifetime doesn't run, and `collectible_spawned.deferred_ms` records the wait.
- **M4-AC17** Given the player taps Collect at 10 taps/s, when a collectible appears under the finger path, then no tap within 250 ms of appearing (or any pointer-down that started before it appeared) grants it, and every Collect tap is still processed (C-AC5 still passes).
- **M4-AC18** Given a double tap, a two-finger tap, or mouse plus touch on one collectible, then exactly one reward and one `collectible_collected` result.
- **M4-AC19** Given any spawn, tap, expiry or frenzy end, then the matching telemetry event appears in the export with every property in §7 non-null.
- **M4-AC20** Given every `tc_*` value is changed in economy.csv/config, then the behaviour follows with no code change.
- **M4-AC21** Given a negative clock delta, then nothing spawns, expires or extends. Given a forward jump > 60 s while visible, then the offline path (M4-AC14) runs.
- **M4-AC22** Given reduced-motion is on, then the Art & UX reduced-motion states show (no blinking), and the collectible is still keyboard-activatable with an aria-label.
- **M4-AC25** Given default settings, then the spawn, warning and tap sounds play. Given the game is muted, then none play.
- **M4-AC26** Given a collectible at 12 s, when a menu or modal opens for 60 s and then closes, then it stayed visible and frozen under the scrim and couldn't be tapped during that time. After closing it resumes at 12 s, and no spawn-timer time passed while the menu was open.
- **M4-AC27** Given the reward popups, then the copy matches `+$<short>!`, `Frenzy! 2× price` and `+<n> free eggs!` ("egg" when n = 1; below Farm L20) / `+$<short>!` for the eggs slot from L20, with amounts equal to the granted values.
- **M4-AC23** Given the single-tab guard has blocked a tab, then that tab spawns nothing.
- **M4-AC24 (pacing; Economy to re-run)** Given the canonical sim with the full M4 active stack (golden egg at 100% catch, streak at its 0.30 cap, abilities, focus, M4-B boost), then active income is ≤ 2.0× idle income over every 10-minute window (CEO rule, decisions.md 2026-10-16 12:51; Economy E4, one combined guardrail; target band 1.5–2×). **Collectible income is included** in this check. With zero collectibles caught, AC7 pacing is unchanged.
- **M4-AC24b (ratio gate)** Given the managed/unmanaged worker ratio gate (m4-manage-proposal / m2 W ACs), then it is computed with **collectible income excluded from both arms** [HoP 13:10]. The sim reports both the excluded value (the gate) and the included value (info only).

## 10. Open questions
**Economy E1–E7: answered 2026-10-16 (m4-tracks-model.md), with Head of Product overrides from m4-manage-proposal**
- E1 Realistic catch rates: active 60%, idle 0%. Economy measured +29–30% at 100% catch and +14–22% at 60%, **on the old 90–180 s gap and 3× laying frenzy**. **Re-sim needed** for the 2–5 min gap and the 2× price frenzy; my estimate is about +20% / +12% (§3).
- E2 Formula plus constant `tc_*` columns: `tc_unlock_farm`=8 [HoP], `tc_first_spawn_s`=45, `tc_gap_min_s`=120 [HoP], `tc_gap_max_s`=300 [HoP], `tc_lifetime_s`=30, `tc_p_cash`=0.45, `tc_p_frenzy`=0.35, `tc_p_eggs`=0.20, `tc_cash_prod_s`=45, `tc_frenzy_mult`=2 [HoP], `tc_frenzy_s`=30 [HoP], `tc_eggs_prod_s`=60. (Economy proposed 6 / 90 / 180 / 3 / 20 for the [HoP] ones; Head of Product overrode them.)
- E3 Cash excludes the 2× boost and includes the Grader. **Decided (HoP 13:10):** frenzy and boost never stack; a rolled frenzy re-rolls to cash; the boost button shows `Frenzy active` while disabled. The boost itself is gated on CEO and Vadim sign-off.
- E4 One combined guardrail: active ≤ 2× idle over 10 min (CEO rule) → M4-AC24.
- E5 Economy found 17% peak loss under 3× laying and no cap increase. With a price frenzy there is no frenzy-driven cap loss, so it's moot; still no cap increase.
- E6 Economy said keep L6. **Overridden to L8** by Head of Product (m4-manage-proposal).
- E7 No banked-coin cap.

**Still open (Economy / Head of Product)**
- O1 Re-sim the EV and AC7 pacing with the gap 120–300 s, unlock F8 and 2× price frenzy. Re-confirm the weights 45/35/20 and the cash 45 s / eggs 60 s sizes. Economy's note: "Lucky at 90 s in the full stack gives 1.48–1.60".
- O4 Streak × frenzy stacking for the 2× cap check (see m4-collect-streak-spec.md).
- Closed 13:10 by Head of Product: the boost re-roll and disabled button, frenzy on worker sales, the event name, and the ratio gate (M4-AC11, M4-AC10, §7, M4-AC24b).

**Art & UX: decided 2026-10-16 12:37 (art-ux/decisions.md)**
- U1 Golden egg only; the special hen moves to M5+. Popups: `+$1.2K!`, **`Frenzy! 2× price`**, `+25 free eggs!`. Frenzy pill: **`2× 0:30`** (re-confirmed 13:02 after the frenzy change).
- U2 8 spawn spots per layout, 16 px margin from no-spawn zones. Coordinates in `art-ux/m4-timed-collectible.md` by Tue 2026-10-20 (**pending**; M4-AC15 is blocked until then).
- U3 40 px visual in a 56 px hit area; idle, warning (20 s), urgent (27 s), fade and reduced-motion states as Art & UX specified.
- U4 The frenzy pill sits left of the M4-B timer. During a frenzy, egg prices get a gold `2×` chip; the "Full!" gold tint is **dropped** (13:02).
- U5 Sound on by default and respects mute; Engineering adds the hooks.
- U6 Menus pause the timer, with the collectible frozen under the scrim.

**Engineering (FYI):** audio hooks (U5), freeze-under-scrim pause (U6), pause semantics on hidden, saving the frenzy end timestamp, the frenzy price multiplier on every sale path (player, worker, Sell all) and the `2×` chip on price displays, and slot-validity checks against live layout rects.

## 11. Later candidates (not M4)
- **Collect streak: M4 scope, not "later"** (m4-manage-proposal §2.5, owned by PM Collection). Steady Collect tapping builds a decaying multiplier, **cap 0.30, applied to sale price** (not laying). It ships last in M4, after the golden egg, with the full-stack ratio check (target 1.51–1.62×). **Separate spec to follow.** It is listed here so this spec's price formula includes the streak (§3).
- **Flying tap targets** (research slice §2/§7, Egg Inc. drones / TT2 fairies). Moving targets every 30 s–2 min paying a share of farm value, with a catch-up factor. Build M. Risk of prompt fatigue on top of the collectible, and of misclicks on 360 px. Only consider it if the collectible tap rate is healthy and the share of active income is still low.

## Art & UX reference (delivered 2026-10-16)
- Spawn coordinates (360, 375, 1280) and full state specs (idle, warning, urgent, fade, reduced motion): `art-ux/m4-timed-collectible.md`, with diagrams in `art-ux/mocks/m4-spawn-*.png`. They are the source of truth for M4-AC5, M4-AC15 and M4-AC22.
- On phones, an open sheet covers all 8 spawn spots. While a sheet is open, a due spawn is deferred and appears when the sheet closes (this matches the menus-pause-spawn-timer rule).

## Economy rerun (2026-10-16 13:09)
- E1 re-run on v0.3 values, up to F18: managed players get +17% at 100% catch and +11% at 60%; unmanaged get +12% and +8%. At F24 it's +11% and +7%. Weights 45/35/20 and cash 45 s are confirmed. The frenzy on all sales is confirmed and stays under the cap.
- The free-eggs reward earns nothing from about F20, because the extra eggs can't sell. Economy proposes paying it as cash from F20 on. This is pending Head of Product.
- The constants are in product/economy.m4-candidate.csv (tc_frenzy_all_sales=1). The canonical economy.csv gets them after F1.


## Backlog
- M4.x: market-rush variant: queue-strip golden egg, same timer and payout, about 30% of golden spawns (per HoP, see product/market/customer-type-roadmap.md). (added 2026-10-16)
