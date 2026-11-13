# Monetisation Proposal (MON) — Head of Product → CEO
Draft v0.2 · Sat 2026-10-17 · Status: **PARKED: v0.2 frozen 2026-10-17 per Vadim (via CEO), D-HOP-2026-10-17-01**
Inputs: product/m3-proposal.md, product/platform-strategy.md, product/core-loop-spec.md, product/economy.md, product/economy.csv, decisions.md.

> **Every number below is a proposed `economy.csv` row/column (marked `[CSV-P]`) and an assumption until Economy/Balance models it in `economy_sim.py` and the CEO approves.** No market data is cited; where I state a belief about player behaviour or revenue it is labelled **Assumption**.
> **Anything touching external accounts, ad SDKs, store billing or payments needs CEO + Vadim sign-off before any work beyond design and a stubbed (no-network) build.**

> **Rename note (v0.2):** per CEO review, this proposal no longer uses the "M4-A/B/C" labels — **M4-A is the Hens/tracks release**. Items are now **MON-1** (was M4-A, double offline), **MON-2** (was M4-B, timed income boost), **MON-3** (was M4-C, remove ads / starter pack). Existing AC sub-IDs are kept unchanged so cross-references stay valid: **MON-A1…A7 belong to MON-1, MON-B1…B6 to MON-2, MON-C1…C4 to MON-3**; gate AC **MON-G1** is new. The filename keeps `m4-` for link stability only; it does not mean this work is part of milestone M4 or the M4-A release. v0.1 is preserved as `m4-monetisation-proposal.v0.1.md`.

## Changelog
- **v0.2 (Sat 2026-10-17)** — Applied CEO review: renamed M4-A/B/C → MON-1/2/3 (rename note above); added §0a Priority (after Vadim's M4 active-play must-haves, no engineering capacity taken from them); added §0b Scope (design + economy modelling + no-network web stub behind `monetisation_enabled=false` only; SDKs/billing/accounts/network out of scope); added §0c Economy gate and AC MON-G1 before any build; header status updated. No numbers changed.
- **v0.1 (Fri 2026-10-16)** — First draft to CEO.

## 0a. Priority
- MON comes **after Vadim's M4 active-play must-haves**: the Hens track, the 30 s pop-up bonus, the queue penalty/bonus, and focus-vs-sell-all.
- MON takes **no engineering capacity** from those items. No MON engineering work (including the stub) is scheduled while any must-have is unfinished; design and Economy modelling may run in parallel only where they don't draw on the same people's must-have work.

## 0b. Scope (v0.2)
**In scope:** design (specs, ACs, layouts), Economy modelling of all `[CSV-P]` values, and a **no-network web stub** behind `monetisation_enabled=false` (**default false** in every build; enabled only on an explicit stub test build).
**Explicitly out of scope:** ad SDKs, store billing, external accounts (ad networks, portals, Play/Apple/Steam), and any network calls from monetisation code. Any of these needs **CEO + Vadim sign-off** first. Phase 2 material in §4 is background only, not planned work.

## 0c. Gate before any build
Before any MON build work (including the stub), Economy/Balance models **MON-B6** (every-boost cap, +35% progress at 30 min) and **MON-A7** against **both** gates — AC7/early pacing and the L30+ gate — at **100 seeds on QA's TS bot**, with Saves QA verifying. Recorded as AC **MON-G1** (§3).

## 0. Summary
Recommend a **small, fair, opt-in** MON scope, built first as an **in-game, no-SDK "free boosts" layer on web** (rewards granted without an ad — measures demand and pacing impact with zero external dependencies), then wired to real rewarded ads and store billing on Android (TWA/Capacitor) only after rc1, retention evidence, and Vadim's sign-off.
- **MON-1 (recommend):** Rewarded "Double offline earnings" on the welcome-back modal.
- **MON-2 (recommend):** Rewarded "Income boost ×2 for 4 min", with a cooldown and daily cap.
- **MON-3 (recommend, design + stub only):** one-time **Remove ads / Starter pack** (non-consumable).
- **Defer:** premium currency (gems) → M5; cosmetic coops → M5 (Art capacity; no store yet to sell them).
- **Never:** forced/interstitial ads, banners in gameplay, energy walls, paid-only progression, loot boxes.

## 1. Goals and principles
**Goals**
1. Prove a monetisation layer that players *choose* to use without hurting retention (M3-AC6 D1 target ≥35% stays the north star).
2. Keep all pacing targets intact **with zero boosts used** (the non-paying player is the baseline):
   - first upgrade ≤30 s (AC7 / M3-AC2),
   - Farm L10 at ~9 min (F1: 9.2 min),
   - AC7: L18–L22 reached at 30 min (target L20, 30 seeds), L30 within 180–300 min,
   - no dead zone >3 min without an affordable useful upgrade or visible countdown.
3. Keep boost-heavy play inside guardrails: a player using every boost must not exceed **+35% progress at 30 min** (proposed cap, Assumption: beyond that, the non-paying curve feels slow by comparison).

**Principles**
- **Opt-in only.** Every ad is player-initiated, labelled with its reward before it plays, and always skippable by not starting it.
- **No pay-to-win walls.** No content, level, worker or feature is purchasable-only. Boosts accelerate; they never unlock.
- **Core loop first.** collect → sell → upgrade must be fully playable with monetisation disabled (feature flag `monetisation_enabled=false` on Steam and in playtests).
- **Readable value.** Reward shown as an exact number ("Collect 2,700 → 5,400 eggs"), never vague.
- **Data-driven.** All tunables in economy.csv → balance.json; no magic numbers in code.
- **Privacy.** Anonymous `install_id` only; consent flows (GDPR/ATT) before any ad SDK loads.

## 2. Options considered
| # | Option | What | Player value | Pacing risk | External deps | Rec |
|---|---|---|---|---|---|---|
| O1 | Rewarded: double offline | Watch ad on welcome-back → offline eggs ×2 | High (rewards returning = retention loop) | Low; offline is capped at 2 h × 0.25 rate | Ad SDK (mobile) | **MON-1** |
| O2 | Rewarded: timed income boost | ×2 egg price (or production) for N min | Medium–high | Medium; must cap stacking/daily use | Ad SDK | **MON-2** |
| O3 | Rewarded: skip a wait (e.g. Manage cooldown) | Instantly reset cooldown | Low–medium | Undermines Workers' Manage ritual (P4) | Ad SDK | Reject for MON |
| O4 | Premium currency (gems), capped | Earned slowly + purchasable; spent on boosts/cosmetics | Flexible | High: second economy, needs sinks, IAP, store billing, refunds | Store billing | **M5** |
| O5 | Remove ads / Starter pack (one-time) | Rewards granted without ads forever + small bundle | Clear, fair | Low if bundle is modest | Store billing | **MON-3 (design + stub)** |
| O6 | Cosmetic coops | Skins for coop tiers, no stat effect | Pure cosmetic | None | Art; billing if paid | **M5** (earnable-only skin possible in MON if Art has capacity) |
| O7 | Interstitials / banners | Forced ads | Negative | Retention risk | Ad SDK | **Never** |

**Assumption:** in comparable idle games, rewarded ads + a remove-ads/starter purchase are the usual first layer, and gems add most complexity. We have no own data; MON web-stub telemetry is meant to produce it.

## 3. Recommended MON scope

### MON-1 — Double offline earnings (rewarded)
**Behaviour**
- On the welcome-back modal (AC11), when offline eggs ≥ `mon_offline2x_min_eggs`, show a second button: "▶ Watch to get 2× (5,400)". Primary "Collect 2,700" stays and is the default/larger button.
- Web stub (MON phase 1): button labelled "Free 2× (test)" grants immediately after a 3 s fake progress; no network.
- Mobile (phase 2, post-sign-off): plays a rewarded ad; on completed-callback grants 2×; on fail/abort grants 1× and closes.
- Bonus eggs go to the Basket (same as AC11 — bypass coop cap).
**Tunables `[CSV-P]`** (global rows, new `monetisation` section or columns):
| key | proposed | note |
|---|---|---|
| `mon_offline2x_mult` | 2.0 | multiplier on AC11 eggs |
| `mon_offline2x_min_away_s` | 600 | only after ≥10 min away |
| `mon_offline2x_min_eggs` | 100 | hide for trivial grants |
| `mon_offline2x_daily_cap` | 4 | per local day |
**Edge cases**
- Ad fails to load → button hidden or shows "Not available"; never blocks Collect.
- App killed mid-ad → on next load, the base 1× grant is still owed (AC11 "never shown twice", base eggs granted once); the 2× bonus is lost (no double grant). Must reuse D2-style durable save before showing ad.
- Clock set backwards → 0 eggs, no button (AC11).
- Remove-ads owner → button reads "Get 2× (5,400)", no ad, still counts toward daily cap.
- Daily-cap reset at local midnight; clock tamper forward cannot exceed cap more than once per real 24 h (use monotonic play-time sanity as for offline).
**ACs**
- MON-A1 With away ≥600 s and eggs ≥100, the modal shows both buttons; values are exactly 1× and `mult`× AC11 eggs.
- MON-A2 Completed reward adds exactly `mult`× eggs to Basket once; coop unchanged.
- MON-A3 Aborted/failed reward adds exactly 1× once.
- MON-A4 Force-kill during reward → next load grants 1× once, no modal duplication.
- MON-A5 5th use in a local day: button hidden.
- MON-A6 With `monetisation_enabled=false`, the modal is identical to rc1.
- MON-A7 Pacing: with MON-1 used at every eligible return in the casual sim, AC7 still ≤ L22 at 30 min and L30 ≥180 min. (Economy/Balance.)
**Telemetry**: `mon_offer_shown {placement:'offline2x', eggs_base}`, `mon_offer_accepted`, `mon_reward_granted {placement, mult, eggs}`, `mon_reward_failed {placement, reason}`, `mon_offer_declined`.

### MON-2 — Timed income boost (rewarded)
**Behaviour**
- "Boost" button in the HUD (Art & UX places; must not compete with the next-goal strip, M3-AC5). Tap → confirm sheet "Watch to earn 2× egg price for 4:00".
- While active: sale price × `mon_boost_mult`; countdown chip on HUD; boost pauses while app is backgrounded (does not apply to offline earnings — no stacking with MON-1).
- Unavailable before Farm L`mon_boost_unlock_farm` (protect FTUE and first-upgrade ≤30 s).
**Tunables `[CSV-P]`**
| key | proposed | note |
|---|---|---|
| `mon_boost_mult` | 2.0 | on egg sale price |
| `mon_boost_duration_s` | 240 | |
| `mon_boost_cooldown_s` | 900 | between activations |
| `mon_boost_daily_cap` | 6 | |
| `mon_boost_unlock_farm` | 5 | after FTUE + first workers beat |
| `mon_boost_max_stack` | 1 | no stacking/extending |
**Edge cases**: boost active across a level-up (keeps running); boost + sale of a big basket (allowed — capped by duration); quit during boost (remaining time frozen, resumes on return, up to duration); cooldown shown as "Ready in m:ss"; ad failure → no boost, no cooldown consumed.
**ACs**
- MON-B1 Hidden below Farm L5; visible at L5+.
- MON-B2 While active, each sale credits exactly `price × mult` (±rounding rule of economy.md).
- MON-B3 Boost ends after exactly 240 s of foreground time (±1 tick); cooldown 900 s then starts.
- MON-B4 Cannot activate during active boost or cooldown; 7th activation in a day refused.
- MON-B5 Offline earnings are never multiplied by the boost.
- MON-B6 Pacing: casual sim using every boost reaches ≤ +35% progress at 30 min vs no-boost, and **no-boost** AC7/L10/L30/dead-zone targets are unchanged.
**Telemetry**: `mon_offer_shown {placement:'income_boost'}`, `mon_boost_start {farm_level}`, `mon_boost_end {coins_earned_boosted}`, `mon_reward_failed`.

### MON-3 — Remove ads / Starter pack (design + stubbed purchase only)
**Behaviour**
- One-time, non-consumable. Grants: rewarded placements give their reward without an ad (caps still apply), plus a one-off bundle of `mon_starter_coins` coins, granted only once per account.
- Shown in Settings → "Support the farm", and once as a non-blocking card at Farm L`mon_starter_offer_farm`. Never as a pop-up during play.
- MON phase 1: purchase flow is a **stub** (debug-only toggle, compiled out of release like D4) to build UI, entitlement storage and restore logic. No price, no SDK, no account until CEO + Vadim sign-off.
**Tunables `[CSV-P]`**
| key | proposed | note |
|---|---|---|
| `mon_starter_coins` | ≈ cost of next Farm level at L10 (Economy to set) | must not skip >1 level |
| `mon_starter_offer_farm` | 8 | one-time card |
| `mon_starter_price_tier` | TBD (store tier) | needs CEO + Vadim |
**Edge cases**: restore purchases on reinstall (store receipt; on web, no real purchase exists); refund → entitlement revoked, coins kept (Assumption, needs policy decision); save migration keeps entitlement + install_id (ties to platform-strategy save migration).
**ACs**
- MON-C1 With entitlement, all rewarded placements grant without an ad and respect daily caps.
- MON-C2 Starter coins granted exactly once, survive reload, never re-granted by restore.
- MON-C3 Release builds contain no stub purchase toggle (same check as D4).
- MON-C4 Entitlement survives the save-version migration.
**Telemetry**: `mon_store_view {source}`, `mon_purchase_start {sku}`, `mon_purchase_result {sku, status}`, `mon_entitlement_restored`.

### Gate AC (all MON items)
- MON-G1 Before any MON build (stub included): Economy/Balance has modelled MON-B6 (+35% cap) and MON-A7 against both the AC7/early-pacing gate and the L30+ gate at 100 seeds on QA's TS bot, both PASS, verified by Saves QA, and Head of Product has signed off.

### Shared tunables and rules `[CSV-P]`
| key | proposed |
|---|---|
| `monetisation_enabled` | default **false** in all builds (Steam, playtests, release); true only on an explicit no-network stub web test build |
| `mon_daily_reset` | local midnight + 24 h real-time sanity |
| `mon_max_ads_per_day` | 10 (total across placements) |

## 4. Platform notes
- **Web (itch.io / CrazyGames / Poki):** phase-1 stub needs no SDK. Portals ship their own ad SDKs with their own rules (Assumption: each restricts third-party ad networks); any portal SDK is an external account → CEO + Vadim.
- **Android (first, via TWA then Capacitor):** rewarded ads via a mobile ad SDK; digital goods (remove ads, starter pack, any gems) **must use Google Play Billing**; fee model changing in 2026 — re-check before pricing (platform-strategy §5). GDPR/UMP consent before ads in EU; Data safety form must list ad-SDK data. Note TWA has limited native plugin access — real ads/billing likely need the Capacitor path (Engineering to confirm).
- **iOS (Capacitor):** Apple IAP mandatory for digital goods; ATT prompt before tracking-based ads (non-personalised ads without it); privacy labels must match SDK; guideline 4.2 risk unchanged.
- **Steam (Electron, M5):** no ads (platform-strategy §5b). Ship with `monetisation_enabled=false` and boosts either removed or freely earnable; revenue = premium price ± cosmetic DLC. Steamworks microtransactions only if we later add paid cosmetics.

## 5. Risks
| Risk | Mitigation | Owner |
|---|---|---|
| Boosts make non-paying pacing feel slow or tempt us to slow the base curve | No-boost targets are gates; boost-max capped at +35% | Economy/Balance |
| Offline 2× undermines CEO's 0.25 offline rate decision | Model it; cap daily; CEO to rule | Economy/Balance, CEO |
| HUD clutter vs next-goal strip | Art & UX layout review before build | Art & UX, PM Farm Upgrades |
| Durable-save bugs (D2-class) cause lost/double rewards | Save before offer; idempotent grant ids | Engineering, QA |
| Ad SDK / billing pulls in accounts, data collection, legal | Phase 1 has no SDK; phase 2 only after CEO + Vadim | CEO, Vadim |
| Engineering capacity vs Android/iOS port | Stub ~2–3 dev-days (Assumption, Eng to estimate) | Head of Engineering |

## 6. Owners
- **Head of Product:** this proposal, final ACs, priority.
- **Economy/Balance:** model all `[CSV-P]` values in economy_sim.py (no-boost, every-boost, typical) before approval; propose `mon_starter_coins`.
- **PM Market/Customers:** MON-1 welcome-back flow and sale-price boost interaction with queue/P1q.
- **PM Farm Upgrades:** MON-2 unlock level, next-goal coexistence, starter-pack value vs Farm costs.
- **PM Workers:** confirm boosts don't conflict with Manage/Refill tired rituals (O3 rejected for this reason).
- **Art & UX:** HUD boost button, modal variants, store card; tap targets ≥44px.
- **Engineering:** stub layer, entitlement storage, telemetry, flags; SDK/billing estimates for phase 2.
- **QA:** MON-* ACs, release-build stub check, save/force-kill cases.

## 7. Open questions for the CEO
1. Approve the two-phase approach (web stub with no SDK first; real ads/billing only on Android after rc1 + retention evidence)?
2. Approve scope MON-1 + MON-2, with MON-3 as design/stub only; defer gems and cosmetic coops to M5?
3. Is offline 2× acceptable given the 0.25 offline-rate decision, or should the multiplier be lower (e.g. 1.5×)?
4. Accept the +35% boost-max progress guardrail at 30 min?
5. Escalate to Vadim (needs his sign-off): ad network/SDK choice, store billing accounts, pricing, privacy policy, refund policy. Platform accounts ($25 Play, $99/yr Apple, $100 Steam) are already pending his decision per platform-strategy.
6. Steam: drop boosts entirely or make them free there?

## 8. Next steps (if approved)
Economy/Balance model by Wed Oct 21 alongside F1 merge (or after, if capacity) → **MON-G1 gate PASS** → PM specs + Art & UX layouts → Engineering stub after rc1 (Tue Oct 27) **and after Vadim's M4 active-play must-haves ship** → QA MON-* pass → telemetry read on the next playtest.

## PARKED note (2026-10-17)
Vadim parked monetisation and the proposal is frozen at v0.2. The MON-G1 modelling had already finished before the park (scratch/mon-boost/README.md). At max use, only a x1.10 boost keeps early pacing green. The L30+ gate fails from x1.05. No boost size passes every gate. Pick these results up if the proposal is revived.
