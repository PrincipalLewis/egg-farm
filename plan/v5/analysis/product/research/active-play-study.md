# Active-play study: why the game plays itself by ~Farm L10, and what M4 does about it
Head of Product · 2026-10-16 · for the CEO
Sources (only): `product/research/slices/collection.md`, `market.md`, `upgrades.md`, `workers.md`; `decisions.md` entries dated 2026-10-16; `product/market/queue-visibility-spec.md`. Every external fact below comes from those slices, which link the original pages. Fit and cost scores are the PMs' judgement, not sourced facts. All other games' numbers are reference values. None of them goes into `economy.csv` until Economy has simulated it.

---

## 1. Exec summary
1. **Cause:** one Farm button decides everything, and from F3 to F8 workers automate collecting and selling. After L10 every choice has one dominant answer and tapping adds nothing.
2. **Evidence:** the closest titles (Egg, Inc. and Idle Miner Tycoon) split capacity, production and value into tracks that bottleneck each other. They hand out automation gradually, and it comes with active abilities.
3. **M4 core (already set):** the 3-track Farm/Hens/Egg value split, a timed golden-egg pop-up (30 s despawn), and per-worker Pause/Resume. Already decided around them: completion bonus 5%, focus premium ≤10% on manual taps, no unserved penalty, no Sell-all combo.
4. **Recommend adding to M4:** one cooldown ability per worker with Activate-all (fit 5, M) and per-track milestones (fit 5, S). Ship the collect streak / decaying multiplier only if Economy's sim shows active play beats idle by a bounded margin. Otherwise move it to M5.
5. **Gaps:** no sourced active-to-idle income benchmark, no Hay Day management/worker sources, and no first-party session data for the reference titles. Economy's pacing checks for every new mechanic are still pending.

## 2. Why the game plays itself
**a) The bundled Farm button** (upgrades.md §1)
- One Farm level covers hens, coop cap, egg price, customer speed, order size and queue slots. The AC7 model is literally "buy Farm when affordable, Collection only if ≤50% of the next Farm cost". When the best strategy is a fixed rule, there is no decision.
- Demand is pinned at about 1.2× production at every level. Selling never becomes a constraint, as Economy's P1-L16 check confirmed today: 81–100% of orders are fully filled across L10–20 (decisions 12:50).
- Queue growth (6→10 slots) can't be seen. The strip always draws 4–5 cards, so each step only changes a "+N" chip (market.md §3b, queue-visibility-spec). Even the one capacity reward doesn't register.

**b) Workers automate everything** (workers.md, collection.md)
- The only active verb is Collect, which moves `min(coop, eggs_per_tap)`. Tap rate barely matters down to 0.25 taps/s (L10 +0.2 min), because eggs per tap far exceeds production.
- Market Hand (F3) serves the whole queue every 1 s. Coop Hand (F7) collects and the Hawker (F8) adds sales. By L10 the player's remaining role is Refill.
- This follows the AdVenture Capitalist pattern: one-off purchases remove tapping for good. AdCap gets away with it because spending on milestones and prestige takes over as the active role. **We have no such layer yet** (workers.md M3; collection.md §4).

## 3. Comparison: titles × mechanics
| Title · mechanic | Trigger | Prompt frequency | Payoff vs idle | Unlock timing | Source (slice) |
|---|---|---|---|---|---|
| Cookie Clicker · Golden Cookie | Random spawn, 13 s on screen | 300–900 s (avg ≈447 s); 75–225 s with upgrades | Lucky: min(15% bank, 15 min CpS). Frenzy ×7 for 77 s. Click Frenzy ×777/click for 13 s. Wiki estimate ≈+470% CpS if every cookie is caught | From start; Lucky Day after 7 clicks | collection §1, market 1a, upgrades S15 |
| Egg, Inc. · Drones | Random flyovers, tap | Avg 23.4 s (~154/h), clustered; 8% Elite | 0.04–1% of farm value × √RCB × catch-up; Elite ≈20% (≈5% late). Nerfed in v1.9 | From first farm | collection §2, market 1a |
| Egg, Inc. · Running Chicken Bonus | Hold/tap hatch; decays when stopped; only while habs not full | Continuous | Research-raised cap ("+200x" / x400+); drones scale with √RCB | Basic from start; Hold to Hatch is Epic Research | collection §3 (403, unverified), workers M5, upgrades S1 |
| Idle Miner Tycoon · Manager ability + Activate all | Tap ability or Activate all | Junior 1/5 min, Senior 3/15, Executive 10/50 | ×2–8 speed/load on one station; ≈17–20% uptime; cost cuts 40–80% | Managers at Mine Shaft L5 | workers M1, collection §5, upgrades S20 |
| IMT · Mr. Turner (store-then-multiply) | Ability | 30 s / 15 min | Output withheld, paid ×10 | Super Manager | workers M2 |
| Clicker Heroes · cooldown skills | Skill button | 30 s/10 min to 8 h cooldowns | Auto-clicker, +100% DPS or gold | Gradual, through hero levels | collection §6 |
| Tap Titans 2 · Fairies | Fly across, tap | ~2 min (Japanese wiki only) | Gold, spell activations | Not sourced | collection §7 |
| AdCap · Managers | Cash purchase per business | Never again (one-off) | Full idle income; removes the active role | Cash price ($1,000 →) | workers M3, upgrades S10 |
| AdCap · Count milestones / Capitalist unlocks | Owning N units (all businesses for Capitalist) | Every few buys | ×2 speed or ×N profit; cross-business boosts | 25/50/100… owned | upgrades S11, S17 |
| Hay Day · Visitors | NPC asks for ⅓–½ of the stock held | Not sourced; ≤2 at once, wait forever | 1.7–2.2× base price | XP L2 | market 1a [HD-V] |
| Hay Day · Boat / Truck board | Timed crates / pinned orders | Boat 18 h; replacement orders 6–30 min | Coins, XP, completion bonus | XP L17 / L3 | market 1b, 1d |
| AdCap · event goals | Task list, replaced when claimed | Continuous; golden goals expire in 3 h | Points → reward ladder; scaled to income | Events | market 1b, 1e |
| Egg, Inc. / IMT · split tracks | Separate buy rows that cap each other | Every purchase | Strategy choice (Balanced / Shaft-ahead) | From start | upgrades §2.1, §2.3 |

## 4. Answers to the CEO's four questions
**Q1. Which active mechanics work in the mid and late game?**
- *Random timed pickups* (golden cookie, drones, fairies) work at any level because the payout is a share of income or farm value, so they scale without per-level tuning.
- *Cooldown abilities* (IMT managers, Clicker Heroes skills) sit on top of automation without removing it, and the best ones arrive gradually through a run.
- *Decaying multipliers* (Egg Inc RCB) make continuous presence pay.
- *Capacity tension:* Egg Inc's RCB only builds while habs aren't full, so advanced players leave a hab level unbought on purpose. A cap becomes a decision.
- Late game, every source points to prestige (reset when the run stalls). That is after M4.

**Q2. When does the player add value over idle?**
- In the references, active play adds value at timed windows: a short effect on a long cooldown (IMT ≈17–20% uptime; Golden Cookie 13–77 s every 2–15 min). The player decides *when*, not whether.
- **Gap:** no slice found a sourced active-to-idle income ratio for any title. The +470% Golden Cookie figure is a wiki calculation, and the "active 10× faster isn't idle" quote is an anecdotal Reddit post (403, unverified).
- So the ratio is ours to set. Proposal: Economy targets a bounded active premium and reports it explicitly as active/idle $/min alongside AC7.
- Also from our own sim (market.md §3e): the Sell-all combo rewarded checking in *less* often (+23% for a 30 s seller, +3% for a 5 s seller). That's why it was dropped.

**Q3. Upgrade and progression structure**
- Split tracks that bottleneck each other create decisions; a bundle removes them (Egg Inc habs/chickens/shipping/value; IMT shaft/elevator/warehouse with named strategies).
- Caution from upgrades.md §6: three independent "+income" buttons would play themselves just like one. The caps have to bind: Hens ≤ F+3, demand follows Farm, coop cap.
- Uneven per-track milestones plus "all tracks ≥ N" bonuses (AdCap) change the best next buy. Proposed metric: the best buy changes at least every 3 purchases in L5–20.
- Automation should be earned and partial, and it should come with active abilities (IMT).

**Q4. Session pacing** (GameAnalytics, Q3 2018–Q2 2019, 1.2B monthly players, cited in workers.md §1 and market.md §2)
- Idle average: **5.3 sessions/day, ~8 min/session**, stickiness 18%.
- Top 10%: 5.82 sessions, 7 min, 34.9 min/day, D1 45.6%. Top 25%: 5.03 sessions, 6 min, 21 min/day, D1 39.4%.
- Design target: 6–8 min sessions, about 5 a day. Each active prompt should fire at least once per session to be noticed.
  - A golden egg every ~2–4 min gives 2–4 per session.
  - Worker check-ins every ~2.7 min (current AC-W5 sim) give 2–3 meaningful prompts.
  - An IMT-style 5–10 min cooldown gives 1–2 activations per session.
- Kongregate (GDC 2016): returns should be "celebratory moments", and offline play shouldn't be punished.
- **Gap:** no first-party session data for Egg Inc, AdCap, IMT or TT2.

## 5. Top mechanics ranked (fit ÷ build cost; fit and cost are PM judgement)
| # | Mechanic | Model | Fit | Cost | Why |
|---|---|---|---|---|---|
| 1 | **3-track split Farm/Hens/Egg value**, with binding caps (must-have) | Egg Inc, IMT | 5 | M (+ v5→v6 migration ~2 days plus tests) | The root fix for "one dominant rule" |
| 2 | **Per-track milestones plus "Balanced farm" cross-track bonus** | AdCap, IMT | 5 | S | Cheap; rotates the best buy; uses the same tab (Art & UX Option A strip) |
| 3 | **Timed golden-egg pop-up**, 30 s despawn (must-have) | Cookie Clicker, Egg Inc drones, TT2 | 5 | M | Rewards presence at any level; Frenzy outcome makes the coop cap and Collect matter again |
| 4 | **Cooldown ability per worker plus Activate-all** | IMT managers | 5 | M | Bursts only reach a present player; builds on existing energy/Refill |
| 5 | **Per-worker Pause/Resume** (must-have, spec approved) | Our design | — | S | A management choice, not a chore; exploit check pending |
| 6 | **Collect streak / decaying active multiplier** | Egg Inc RCB | 4 | S–M | Makes our only verb worth more than idle without nerfing idle; pairs with #3 |
| 7 | **VIP bulk-buyer customer** (asks for ⅓–½ of the Basket) | Hay Day visitors | 5 | M | Answers the big-basket/after-offline case (S2-3a) |
| 8 | **Mini-goals** ("serve 10 customers"), replaced on claim | AdCap event goals | 4 | M | Gives active players a target; doubles as onboarding |

Not recommended now: AdCap-style full automation (makes the problem worse); skill bars (L); calendar events and ad boosts (need live ops or ads; M4 Phase 1 has no ad code); multi-layer resets.

## 6. Recommendation: M4 vs later
**M4: must-haves (set by Vadim and the CEO)**
- 3-track split. Demand follows Farm, Hens capped at Farm+3, identity migration, M4 AC7: L18 within ±10% of the F1 time (≈19.8 min), L18–22 at 30:00, no dead zone over 3 min.
- Timed golden-egg pop-up, 30 s despawn. Note: this isn't logged in `decisions.md` yet; log it with the M4 proposal.
- Per-worker Pause/Resume, as specced in workers.md §3.

**M4: already decided (carry as is)**
- No unserved-customer penalty.
- `complete_bonus_share` 0.05, pending Economy re-sim.
- Sell-all combo dropped.
- Focus premium ≤10%, manual taps only (0% on workers). Market Hand Bulk is the default, and Focus is +5% at 1.5× drain.
- Queue-visibility copy (QV-1–27) ships in rc2 *before* M4, at ≈1.5–2 Engineering days.

**M4: add**
- **Per-track milestones plus Balanced-farm bonus** (S). This is what makes the split create decisions, so it ships with the split.
- **Cooldown ability per worker plus Activate-all** (M). Recommended as the main active layer on top of automation, and the fix PM Workers ranks first. Gate: Economy shows the uptime premium stays inside the M4 AC7 band for a no-ability player.

**M4 if Economy clears it, else M5:**
- **Collect streak / decaying multiplier** (S–M). It overlaps with the golden-egg Frenzy and the focus premium, which stack. Take it only if the combined active premium stays bounded. Otherwise ship whichever Economy scores better and defer the other.

**Later (M5+)**
- VIP bulk buyer and mini-goals. Strong fits, but they add market scope on top of a rebalanced economy.
- Coin-bought queue slot.
- Achievement multiplier.
- **Prestige** after M4, triggered where the run stalls (steps over 10 min from about L23–25), with a since-run flat-exponent yield and a spend-or-keep currency.

## 7. Open questions, risks, pending Economy checks
**Pending Economy/Balance checks (gate the M4 spec)**
1. 3-track model, M4 AC7 and the L30 band (Q7), plus the first 10 minutes after the identity migration.
2. `complete_bonus_share` 0.05 re-sim (AC7 + AC-W).
3. Focus vs Bulk pacing (4 models, active/idle ratio). Focus should beat Bulk only for a player who is actively refilling.
4. Pause exploit check: does pausing at the yawn, or pausing waged W1/W2 in low demand, beat never pausing?
5. Golden-egg payout and cadence in the AC7 sim player model (the Egg Inc drone nerf shows the risk).
6. Cooldown-ability uptime and the streak multiplier: their combined active premium.
7. Whether the Collection +12% bonus moves to Egg value (confirm with PM Collection, Thu Oct 22). Combined V growth.
8. Offline rate: 0.25 vs 0.15. A higher price per egg also raises offline income, and session 3 decides.

**Open questions**
- What active-to-idle ratio do we target? There's no sourced benchmark, so this is a CEO call. Economy proposes a number.
- Are cross-track bonuses multiplicative with worker multipliers (Q6)? Does "L18" mean Farm level?
- Migration (b)/(c): grant the refund inside the migration or in a modal, and migrate silently or with an explainer.
- Prompt fatigue: on desktop web, golden egg + abilities + Refill + streak could be too many prompts. Cap the total prompts per session.

**Risks**
- Three independent income rows still play themselves if the caps don't bind.
- A bigger M4 scope slows delivery. M4 starts only after rc1 (decisions 08:31).
- Boost stacking against the monetisation cap (an all-boost player at most 35% ahead at 30 min).

**Source gaps**
- No Hay Day management or worker sources. workers.md skipped Hay Day, so only Hay Day market facts exist (market.md).
- No first-party session data for the reference titles.
- Egg Inc RCB and TT2 fandom pages are 403/unverified, and the TT2 fairy cadence comes from the Japanese wiki only.
- No first-prestige play-time data.
- No GDC or YouTube talks reviewed beyond Pecorella's written series and the Kongregate GDC 2016 talk.
