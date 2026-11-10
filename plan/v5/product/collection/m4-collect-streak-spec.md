# M4 Collect Streak: draft spec · v0.3 · 2026-10-16 · PM, Collection
Status: **v0.1 approved by Head of Product (13:06). v0.3 (13:12): cap raised to 0.40 [HoP] after the Economy rerun; Art & UX confirmed `MAX +40%` and the 0–40% meter.** v0.2 folds in Art & UX U-S1–U-S3 (`art-ux/m4-collect-streak.md`) and Head of Product's 13:06 decisions (end of file). M4 scope, shipping last after the golden egg (m4-manage-proposal §2.5 and build order item 7).
Sources:
- `product/m4-manage-proposal.md` §2.5 (applied to price) and ST-1. The cap was 0.30 there; Head of Product raised it to **0.40** on 2026-10-16.
- `product/m4-active-checks.md` §6 (Economy: streak on price gives 1.25 flat at cap 0.25; on laying only 1.00–1.17 because demand caps it. The full stack at cap 0.30 gives 1.51–1.62×, the stress case at 0.40 gives 1.73×).
- `decisions.md` 2026-10-16 12:51 (the CEO rule: active ≤ 2× idle over 10 min) and 13:00 (cap 0.30 on price).
- Research slice §3: the Egg Inc. running chicken bonus (RCB). Tapping builds a bonus that decays when you stop, the bonus has a cap, and community practice is hold-and-release rhythm.
- Related: `m4-timed-collectible-spec.md` v0.4 (frenzy), `feature-spec.md` (Collect tap).

> **[HoP]** = set by Head of Product (m4-manage-proposal / decisions.md). **[P]** = PM proposal for the Economy/Balance Designer to model and Head of Product to approve. Approved values live in `economy.csv` as constant `streak_*` columns, with the formula in `economy.md`. Nothing is hard-coded (S-AC14). Visuals: per `art-ux/m4-collect-streak.md` (Art & UX, 2026-10-16), which is the source of truth for tokens and motion.

## 1. Goal
Make the existing Collect verb worth more when played actively, without nerfing idle (idle income is unchanged). Economy: today, once workers are hired, active play earns 1.00× idle. The streak is one of the M4 sources of the active premium.

## 2. Rules
2.1 **Unlock:** at Farm L ≥ `streak_unlock_farm` = **8 [HoP 13:06]**, the same as the golden egg. Below the unlock, the streak is always 0 and hidden.
2.2 **Streak value** `s` runs from 0 to `streak_cap` = **0.40 [HoP]** (was 0.30).
2.3 **Build-up:** a *credited tap* is a player Collect tap that moves ≥ 1 egg. Each credited tap adds `streak_step` = **0.01 [P]**. At most one credited tap counts per `streak_credit_interval_s` = **1.0 [P]** s; extra taps inside that second still collect eggs but add nothing. So the cap takes **40 s** of steady 1 tap/s play (PM arithmetic). This matches Economy's "optimal active" model (tap 1/s, keeps the streak). It also means auto-clickers and fast tapping gain nothing extra.
2.4 **Hold:** a tap that moves 0 eggs (empty coop) doesn't build, but **does reset the grace timer**, so the player isn't punished when the coop is momentarily empty. The welcome-back modal Collect and worker (Coop Hand) collections never build or hold.
2.5 **Decay:** if there is no credited or holding tap for `streak_grace_s` = **3 [P]** s, `s` falls by `streak_decay_per_s` = **0.03 [P]** per second until it is 0 (from the cap to 0 in about 13.3 s after the 3 s grace, about 16.3 s in total). Any credited tap during decay stops the decay and adds a step again. This is the "release and catch it again" rhythm from Egg Inc.'s RCB, in a simpler form.
2.6 **Effect:** sale price × (1 + s). It applies to price only, never laying (ST-1). It applies to **all sales while s > 0** **[HoP 13:06]**: player, worker and Basket stock. It is evaluated at the moment of each sale, using the current s.
2.7 **Stacking [HoP 13:06]: multiplicative.** Effective price = base egg price × Collection/Egg-value factor × Grader multiplier × (1 + s) × frenzy (2 while active). Economy is folding the streak into the M4 rerun. **If active income goes over 2× idle over 10 min, `streak_cap` is lowered first.** The M4-B boost never coexists with a frenzy (HoP 13:10). How the streak combines with the boost is open (S-Q2).
  - **Peak sale multiplier** (streak at the cap during a frenzy) = 2 × 1.4 = **2.8×** (before the Grader), for up to 30 s, about every 2–5 min.
  - **Economy rerun (multiplicative), at cap 0.40 [HoP]: worst seed 1.80× active/idle**, under the CEO's 2× over 10 min rule. For reference, cap 0.30 gave 1.69× worst and means of 1.44–1.55×, below the 1.5× floor.
2.8 **Not affected:** offline earnings, the golden egg cash payout (it ignores the streak **[HoP 13:06]**, so the streak doesn't feed back into the egg), eggs per tap, the coop cap.

## 3. Offline / background
3.1 **Background < 60 s:** on return, apply the elapsed time in one step: grace first, then decay (e.g. hidden 5 s at s = 0.40 gives 0.40 − 0.03 × 2 = 0.34). No sales happen while hidden beyond the existing catch-up rules.
3.2 **Background ≥ 60 s, reload or offline:** s = 0. No streak bonus is applied to offline eggs or to sales of the offline stock after return, unless the player builds it again. `streak_peak` fires with `reason="offline"` (or "reload") if s was > 0.
3.3 **Save:** don't persist s (it is always 0 after the ≥ 60 s path); persist only the streak's best (`best_streak` lifetime stat, optional).
3.4 A negative clock delta counts as 0 elapsed (no decay, no build).

## 4. UI (Art & UX, `art-ux/m4-collect-streak.md`)
4.1 **Meter:** an 8 px-tall rounded bar **directly under the Collect button**, the same width as the button, with a 4 px gap and a 2 px `--c-outline` border. The fill is `--c-meadow`, left to right, with **0–40%** mapping to 0–100% width (Art & UX confirmed 13:10).
4.2 **Label:** right-aligned above the bar's end, reading `+18% price` (whole %, **rounded down**; Nunito 14/700, tabular-nums).
4.3 **States:**
  - **Hidden** at s = 0. It fades in on the first credited tap.
  - **Build:** each step eases the fill over 120 ms, and the number pops 1 → 1.1 → 1.
  - **Cap:** the fill is `--c-gold`, the label reads **`MAX +40%`** (confirmed by Art & UX; the label follows `streak_cap`, so the text is "MAX +" + floor(cap × 100) + "%"), the bar pulses 1 → 1.05 → 1 at **1 Hz** while capped, and a one-shot sparkle plays on reaching the cap.
  - **Cooling** (from 3 s without a tap, while decaying): `--c-muted` fill with **diagonal stripes**, draining smoothly. The label shows the live %, and the meter fades out at 0.
  - **Reduced motion:** no pulse or sparkle. Cap and cooling are shown by colour plus `MAX` and the stripes, and the fill changes instantly in 1% steps.
4.4 **Layouts:** the same at 360, 375 and 1280. On desktop the meter goes under the scene's Collect button, never in the docked column.
4.5 **Price chips:** while s > 0, every visible egg price (the customer card price line, the Sell value and Sell all) shows a `--c-meadow` chip `+18%`, and the value shown includes the bonus.
  - With a frenzy, the **gold `2×` chip comes first**, then the meadow `+N%` chip, 4 px apart, both 14 px tall. The value shown is the **combined** price.
  - At 360, if the row overflows, the chips **collapse into one gold `2×+` chip**, whose aria-label lists both bonuses.
4.6 **Sound:**
  - A **cap chime, ON by default**: short and soft, played **once** each time the cap is reached (not looping), and it always respects mute.
  - A subtle pitch step-up on each 10% reached.
  - No other per-tap streak sound beyond the existing Collect sound.
4.7 **No-spawn:** the **streak meter box + 16 px** is a golden egg exclusion zone, **including while the meter is hidden** (Art & UX confirmed 13:10) (m4-timed-collectible-spec §6.2, M4-AC15).

## 5. Telemetry
| Event | Properties |
|---|---|
| `streak_started` | `farm_level`, `collection_level` (fires when s goes from 0 to > 0) |
| `streak_peak` | `value` (the peak s in this streak; name from m4-manage-proposal), `duration_s` (time s > 0), `credited_taps`, `time_at_cap_s`, `extra_coins` (sales above the no-streak price), `frenzy_overlap_s`, `reason` ("decay", "offline", "reload"). Fires once when s returns to 0 |
- No per-tap event (`collect_tap` already exists). No personal data.
- **KPIs for review [P]:** share of active sessions past L8 with a streak ≥ 0.15; median time at cap; streak share of active income.

## 6. Edge cases
| # | Case | Expected |
|---|---|---|
| K1 | 10 taps/s | Eggs collected per feature-spec; streak +0.01 per second at most |
| K2 | Coop empty while tapping | No build; grace resets; no decay |
| K3 | Coop full ("Full!") | Taps credit normally |
| K4 | At cap, keeps tapping | s stays 0.40, `time_at_cap_s` grows |
| K5 | Stops tapping at 0.40 | Holds for 3 s, then 0 after about 13.3 more s; `streak_peak` fires with value 0.40, reason "decay" |
| K6 | Frenzy starts at s = 0.20 | Sales earn 2 × 1.20 (per 2.7, pending S-Q1); the streak keeps building and decaying normally |
| K7 | Worker sells while s > 0 | Gets the (1 + s) price |
| K8 | Farm drops below L8 | Not possible (levels don't go down). If a prestige or reset is added later, re-lock and set s = 0 |
| K9 | Tab hidden 5 s at 0.40 | Returns at 0.34 |
| K10 | Tab hidden ≥ 60 s / reload | s = 0, `streak_peak` reason offline/reload |
| K11 | Menu or sheet open | Decay keeps running (the player isn't tapping) **[P]**. Unlike the golden egg, nothing pauses |
| K12 | Welcome-back modal Collect | No build |
| K13 | Two fingers on Collect at once | Counts as at most one credited tap in that second |
| K14 | Clock backward | 0 elapsed; s unchanged |

## 7. Acceptance criteria (Given / When / Then)
All numbers are read from config/CSV; the values below are the defaults.
- **S-AC1** Given Farm L < 8, when the player taps Collect at any rate, then s stays 0, no meter shows, and prices are unchanged.
- **S-AC2** Given Farm L ≥ 8, s = 0 and coop ≥ 1, when one Collect tap moves ≥ 1 egg, then s = 0.01, `streak_started` fires, and the meter shows `+1% price`.
- **S-AC3** Given steady tapping at 1 tap/s with eggs available, then s rises by 0.01 per tap and reaches exactly 0.40 at the 40th credited tap, then stays at 0.40.
- **S-AC4** Given 10 taps/s for 10 s, then s = 0.10 (±0.01), and every tap still moves eggs per C-AC5.
- **S-AC5** Given s = 0.40 and no taps, then s stays 0.40 for 3 s, then falls 0.03/s, reaching 0 at 16.3 s (±1 tick). `streak_peak{value:0.40, reason:"decay"}` fires once.
- **S-AC6** Given s is decaying, when a credited tap lands, then decay stops and s increases by 0.01 on that tap.
- **S-AC7** Given the coop is empty, when Collect is tapped, then s doesn't increase and the 3 s grace restarts.
- **S-AC8** Given s = x > 0, when any egg is sold (by the player, a worker or from Basket stock), then it earns price × (1 + x), rounded per AC4, using x at the moment of sale.
- **S-AC9** Given s = x and a frenzy is active, then each sale earns base effective price × (1 + x) × 2 (multiplicative; **pending Economy S-Q1**).
- **S-AC10** Given a golden egg cash reward while s > 0, then the payout ignores s (per M4-AC8).
- **S-AC11** Given s = 0.40 and the tab is hidden for 5 s, then on return s = 0.34. Given it is hidden ≥ 60 s or the page reloads, then s = 0, offline eggs equal AC11 exactly, and `streak_peak` fires with reason "offline"/"reload".
- **S-AC12** Given a Coop Hand collects or the welcome-back Collect is tapped, then s doesn't change.
- **S-AC13** Given any streak returns to 0, then `streak_peak` is in the export with all §5 properties non-null, and `extra_coins` equals the sum over sales of price × s.
- **S-AC14** Given any `streak_*` value is changed in config/CSV, then the behaviour follows with no code change.
- **S-AC15 (pacing and cap; Economy to run)** Given the full M4 optimal stack (streak at cap, golden egg at 100% catch with frenzy, abilities, focus), then active income ≤ 2.0× idle over every 10-minute window (CEO rule), with the target band 1.5–2×. With the streak never used, AC7 pacing is unchanged.
- **S-AC16** Given reduced motion, then there is no pulse or sparkle, the fill changes instantly in 1% steps, and cap and cooling show colour plus the `MAX` text or the stripes.
- **S-AC17 (meter states)** Given s = 0, then the meter is hidden. Given s = 0.187, then the fill is at 47% width (0.187 / 0.40; `--c-meadow`) and the label reads `+18% price`. Given s = 0.40, then the fill is gold at 100%, the label reads `MAX +40%`, and the bar pulses at 1 Hz (±0.1) while capped. Given 3 s with no tap, then the fill is `--c-muted` with diagonal stripes and drains, the label shows the live %, and the meter fades out at 0.
- **S-AC18 (layout)** Given viewports of 360, 375 and 1280 px, then the meter is 8 px tall, as wide as the Collect button, 4 px below it, with a 2 px outline. At 1280 it sits under the scene's Collect button and never in the docked column.
- **S-AC19 (price chips)** Given s > 0, then every visible egg price (card price line, Sell value, Sell all) shows a meadow `+N%` chip, and the value includes the bonus. Given a frenzy is also active, then the gold `2×` chip comes first, the meadow chip second (4 px apart, both 14 px tall), and the value equals base × 2 × (1 + s). Both chips go away within 1 tick of their bonus ending.
- **S-AC20 (360 overflow)** Given a 360 px viewport where both chips overflow a price row, then they collapse into one gold `2×+` chip whose aria-label names both bonuses, and the combined value is still shown.
- **S-AC21 (cap sound)** Given default settings, when s reaches 0.40, then the cap chime plays exactly once (not again while it stays capped; again after s drops and returns to the cap). Given the game is muted, then it never plays. No per-tap streak sound plays other than the 10% pitch step.
- **S-AC22 (no-spawn)** Given any layout, then no golden egg hit area comes within 16 px of the streak meter box, including while the meter is hidden (M4-AC15).
- **S-AC23 (cap-driven label)** Given `streak_cap` is changed in config (e.g. to 0.35), then the meter maps 0–cap to the full width and the cap label reads `MAX +35%` with no code change.
- **S-AC24 (peak stack)** Given s = 0.40, a frenzy and Grader multiplier g, then each sale earns base × g × 1.4 × 2 (= 2.8 × g × base), rounded per AC4.

## 8. Open questions
**Economy / Head of Product**
- S-Q1 (answered by the 13:09 rerun, below) Did the "ALL, cap 0.30" run (1.51–1.62×) **multiply** the streak and frenzy (2 × 1.3 = 2.6× peak) or **add** them (2.3×)? Please re-check under the multiplicative rule against the 2× over 10 min rule. Model build +0.01/s (cap in 30 s), grace 3 s and decay 0.03/s.
- S-Q2 How does the streak combine with the M4-B boost (multiply, or exclude while boosted)? This only matters once the boost has CEO and Vadim sign-off.
- S-Q3 Unlock at F8 like the golden egg, or from F0 (is it a teaching moment, given the AC7 risk)?
- S-Q4 Should the streak apply to worker sales (proposed yes, for consistency with the frenzy), or to player sales only (a stronger "active" signal, but less visible value)?
- S-Q5 Should the golden egg cash payout exclude the streak (proposed), so the two don't feed each other?

**Art & UX: answered 2026-10-16** in `art-ux/m4-collect-streak.md` (U-S1 meter, U-S2 chips, U-S3 label and sound); folded into §4 and S-AC16–S-AC22.

**Still open:** S-Q1 is answered by the 13:06 decision (multiplicative, pending the Economy rerun). S-Q2 (ad boost) is gated on CEO/Vadim sign-off.

## Head of Product decisions (2026-10-16 13:06)
- S-Q3: unlocks at Farm L8, the same as the golden egg. [HoP]
- S-Q4: applies to all sales, including worker sales. [HoP]
- S-Q5: the golden egg cash payout ignores the streak. [HoP]
- Stacking stays multiplicative (streak × frenzy × Grader). Economy is folding the streak into the M4 rerun; if active play goes over 2× idle over 10 min, the streak cap is lowered first. [HoP]
- Status: v0.1 is approved, pending the Economy rerun. Art & UX U-S1–U-S3 are answered (v0.2). Still open: S-Q2 (ad boost, gated on CEO/Vadim sign-off).

## Economy rerun (2026-10-16 13:09)
- S-Q1 answered. With streak × frenzy (×2 price) × Grader multiplied, using this spec's build-up and decay, the worst seed reaches 1.69× active/idle at cap 0.30, under the 2× rule (cap 0.50 peaks at 1.91×). Means are 1.44–1.55×.
- Economy proposed raising the cap to 0.40 to reach the 1.5× floor. **Approved by Head of Product (13:10): cap 0.40 [HoP]; peak sale multiplier 2.8×; worst seed 1.80× active/idle** (under 2×).

## Note: CEO 2× check at cap 0.40 (2026-10-16)
- Economy's cap-0.40 rerun verified the 0.40 cap against the CEO rule (active ≤ 2× idle over 10 min): worst seed 1.93× at F18, only **0.07 headroom**. Any further active-income buff (streak, golden egg, frenzy, tap upgrades) must re-run this check before approval.
