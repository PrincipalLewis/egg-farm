# Collection Feature Spec — M1 · v2 · 2026-10-15 · PM, Collection
Status: draft for Head of Product review → Engineering → QA. Art & UX consulted on feedback visuals.
Sources: core-loop-spec.md (AC1, AC2, AC5, AC6, AC8, AC9, AC11), economy.md / economy.csv (numbers come only from there). This spec doesn't change any number. Proposals are in §9.

## 1. Scope
In: the Collect tap (Coop → Basket), tap feedback, coop-full state, the "Collect per tap" upgrade's effect on tapping, and how collection interacts with the offline/Basket modal.
Out (M1): auto-collect (M2 Workers), sound/audio (out of scope per core-loop-spec, so audio hooks are only reserved), haptics beyond the optional item in §9.

## 2. Rules (owned by Head of Product, restated)
- Collecting is manual tap only.
- `eggs_per_tap` = 5 + 5L (Collection level L, 0–30). Each Collection level also raises egg sale price by +12% (M1-R1). The upgrade costs floor(10 × 1.6^L) coins. The upgrade row's next-level preview shows both effects, e.g. "+5 eggs/tap, +12% egg price".
- Coop fills at `eggs_per_sec` and never exceeds `coop_capacity` (50 + 50 × Farm L).
- One tap moves `moved = min(coop, eggs_per_tap)` from Coop to Basket. The Basket is unlimited in M1.
- Offline eggs go straight to the Basket through the welcome-back modal, bypassing the coop cap. The coop stays as it was at the last save.
- Coop count is stored as a float. Display and taps use floor(coop). A tap removes only whole eggs: `moved = min(floor(coop), eggs_per_tap)`, and the leftover fraction stays in the coop. (Decided by Head of Product, confirmed by Engineering.)
- Production while the coop is full is **lost**. It isn't banked and doesn't count toward anything. (Decided by Head of Product.)
- The tick measures real elapsed time (wall-clock delta), not the timer count, because browsers slow timers on background tabs. Each tick adds `elapsed × eggs_per_sec`, capped at coop_capacity.
- Return from background/hidden: gap < 60 s catches up in one step, `coop = min(cap, coop + gap × eggs_per_sec)` (full online rate). Gap ≥ 60 s goes through the offline/Basket path (AC11). Negative clock delta counts as 0 elapsed (no production, no loss, no modal). (Confirmed by Engineering.)

## 3. Tap interaction & feedback
3.1 Hit target: the Coop sprite and the Collect button both trigger Collect (at least 48×48 CSS px on a 360×640 layout). Art & UX owns the layout.
3.2 Each tap that moves eggs does all of the following:
  - Number popup "+{moved}" rises from the tap point and fades in about 600 ms. The number is exactly `moved`, not `eggs_per_tap`.
  - Coop squash/bounce (about 100 ms) and an egg icon flies to the Basket counter (about 300–400 ms, at most `max_flying_eggs` = 5 on screen, economy.md).
  - The Basket counter "pops" (scale pulse) and the coop fill bar updates in the same frame as the state change. The state changes on the tap, not when the animation ends.
  - Audio: none in M1. Engineering exposes a `onCollect(moved)` event so sound can be added in M2 without logic changes.
3.3 Rapid tapping: every tap is processed in order with no cooldown and no lost taps (input queued per frame). Popups combine. If a new tap lands within `tap_combine_window_ms` (250 ms, economy.md) of the last one, the live popup updates to the running total ("+15", "+20"…) rather than spawning a new one, with at most 3 popups visible. The animation never throttles the logic.
3.4 Tap at an empty coop (floor(coop) = 0): nothing moves. Light "empty" shake on the coop, no popup or "+0", and the button stays enabled. Taps still count for analytics (`collect_tap`, moved=0).
3.5 Partial tap (0 < coop < eggs_per_tap): moves everything in the coop. The popup shows the real amount (e.g. "+3"). The coop goes to 0, never negative.

## 4. Coop-full behaviour
4.1 At coop = coop_capacity, production stops and excess production is lost and the coop shows a "Full!" badge with a gentle pulse/glow on the Collect target. The fill bar reads "cap/cap".
4.2 "Full!" shows as soon as coop reaches the cap and clears the first time a tap brings coop below the cap.
4.3 Overflow is impossible by construction: production clamps at the cap. A tap can never move more than the coop holds.
4.4 No modal or toast for coop-full in M1, only the badge, so active tapping isn't interrupted.
4.5 Analytics: log `coop_full_start` / `coop_full_end` with the duration. This feeds the "coop-full idle time" success metric.

## 5. Offline / Basket interaction
5.1 On return (≥60 s away) the welcome-back modal comes first, before the farm view takes input. Taps on the coop underneath are blocked while the modal is open.
5.2 The modal's Collect adds the offline eggs to the Basket in one step, with the same popup/fly-to-basket feedback, showing the full offline number. It ignores eggs_per_tap and coop_capacity.
5.3 The coop value after the modal equals its value at the last save. Production resumes from there on return.
5.4 The modal can't be collected twice (double-tap on Collect grants once).

## 6. Upgrade interaction
6.1 Buying Collection L→L+1 deducts exactly the economy.csv cost and changes eggs_per_tap to the new value right away. The very next tap uses it.
6.2 The upgrade row shows current → next ("Collect per tap 10 → 15") and the cost. It's disabled if coins < cost. At L30 it shows "MAX" and is disabled.
6.3 A tap and a purchase in the same frame are processed in input order. No tap uses a half-applied state.
6.5 'Limited by coop' hint: when eggs_per_tap at the **next** Collection level is more than 50% of the current coop_capacity, the Collection row shows a small hint "Limited by coop. Upgrade Farm for more". The upgrade stays purchasable. The hint re-evaluates on any Collection/Farm level change.
6.4 Farm upgrades raise coop_capacity right away. The coop keeps its current eggs, "Full!" clears if coop < new cap, and production resumes.

## 7. Edge cases
| # | Case | Expected |
|---|---|---|
| E1 | L=0 | tap moves min(coop,5); upgrade cost 10 |
| E2 | Very high L (L30, tap 155) at low Farm L (cap 50) | one tap empties the coop; popup shows the real amount (≤ cap) |
| E3 | Levels above 30 / corrupted save | clamp to [0,30]; values above 30 are never read from the CSV |
| E4 | Overflow | coop ≤ cap always; basket and coin counters handle values up to 2^53 safely (JS numbers), and the display abbreviates ≥ 10,000 (format owned by Art & UX) |
| E5 | App backgrounded / tab hidden mid-tap | a tap that registered input is fully applied; no half-applied state. Return < 60 s: no modal; coop catches up in one step at the full online rate, capped by the coop |
| E6 | Background ≥ 60 s | treated as offline per AC11 (save on hide). No double counting of online and offline time |
| E7 | Multi-touch (2+ fingers at once) | each touchstart on the target counts as one tap, processed in order (no bonus beyond the per-tap rule). Pinch/zoom is disabled on the play area |
| E8 | Mouse + touch duplicate events | one physical tap is exactly one Collect (pointer events, no ghost click) |
| E9 | Cap decreases (not possible in M1; only via debug or save edit) | coop is clamped to the new cap on load |
| E10 | Cap increases while full | see 6.4 |
| E11 | Fractional coop (e.g. 2.6) | tappable = floor → moves 2; remainder stays |
| E12 | Reload mid-session | coop, basket, and Collection L are restored (AC8). Tap feedback never replays |
| E13 | Clock backward (negative delta) on tick, on return < 60 s, or on load | elapsed = 0: coop, basket, and level unchanged, no modal, no negative production. The next positive tick resumes normally; offline = 0 (AC11) |
| E14 | Throttled background timers (tab hidden, timers firing ≤1/s or less) | production uses the real elapsed time, so the result equals unthrottled play over the same period (capped) |
| E15 | Fractional remainder after a tap | coop 7.6, tap 5 → moves 5, coop 2.6, shows 2 |

## 8. Acceptance criteria (Given/When/Then)
- C-AC1 Given Collection L0 and coop=20, when the player taps Collect once, then the basket gets +5, coop=15, and the popup shows "+5".
- C-AC2 Given L0 and coop=3, when tapped, then the basket gets +3, coop=0, and the popup shows "+3".
- C-AC3 Given coop=0, when tapped, then basket and coop don't change, no number popup appears, the empty shake plays, and the button stays enabled.
- C-AC4 Given any L in 0–30, when tapped with coop ≥ eggs_per_tap, then moved = 5+5L, matching economy.csv.
- C-AC5 Given coop=40 and L0, when the player taps 10 times within 1 s, then exactly 40 eggs move (8 taps × 5), coop=0, no taps are lost or double counted, and the combined popup totals match.
- C-AC6 Given coop reaches coop_capacity, then "Full!" is visible within 1 tick, coop doesn't increase further, and the fill bar reads cap/cap.
- C-AC7 Given coop is full, when one tap moves ≥1 egg, then "Full!" disappears and production resumes on the next tick.
- C-AC8 Given L=30 and Farm L0 with a full coop (50), when tapped, then exactly 50 move and coop=0.
- C-AC9 Given coins ≥ cost at Collection L, when the upgrade is bought, then coins drop by floor(10×1.6^L) (per CSV), the next tap moves 5+5(L+1), and egg sale price rises by the +12% per-level step in economy.md.
- C-AC10 Given coins < cost, then the Collection upgrade is disabled. Given L30, it shows "MAX" and is disabled.
- C-AC11 Given a full coop, when a Farm upgrade is bought, then "Full!" clears, the cap shows the new value, and the coop egg count is unchanged.
- C-AC12 Given a return after ≥60 s with the welcome-back modal open, when the coop is tapped, then nothing happens. When modal Collect is tapped (even twice quickly), the basket gets exactly the AC11 offline eggs once, and the coop equals its last-saved value.
- C-AC13 Given two fingers touch the target at once, then exactly 2 Collects are processed. Given one mouse click on a touch-capable device, exactly 1.
- C-AC14 Given a tap, then the coop/basket numbers update in the same frame as the input, before the animation finishes.
- C-AC15 Given the tab is hidden right after a tap and reopened after 40 s at Farm L0 (1 egg/s) with coop=0, then that tap's eggs are in the basket exactly once, no modal shows, and coop=40 on return (one-step catch-up). Given the same with coop=30, coop=50 (capped). Given a gap of exactly 60 s, the offline/Basket path runs instead.
- C-AC16 Given a save with Collection L=45 or coop > cap, when loaded, then L is clamped to 30 and coop to cap.
- C-AC17 Given any tap, then a `collect_tap` event fires with moved, and full-state changes fire `coop_full_start`/`coop_full_end`.
- C-AC19 Given coop=7.6 and L0, when tapped, then exactly 5 move, coop is 2.6 internally, and the display shows 2. Given coop=0.9, a tap moves 0 (empty-coop behaviour).
- C-AC20 Given a full coop (cap 50) left for 30 s more, then coop=50 and the basket is unchanged. The excess is lost and doesn't appear on the next tap, offline, or anywhere else.
- C-AC21 Given the device clock is moved back 5 min during play (or between hide and return), when the next tick or return runs, then the elapsed time counts as 0: coop, basket, and coins are unchanged, no modal shows, and production resumes on the next positive tick.
- C-AC22 Given the tab is hidden for 50 s while the browser throttles timers, then on return the coop has gained min(cap - coop, 50 × eggs_per_sec) (±1 tick).
- C-AC23 Given Collection L and Farm F where 5+5(L+1) > 0.5 × (50+50F), then the Collection row shows "Limited by coop" and is still purchasable if affordable. Given the condition is false (e.g. L0, F0: 10 vs 25), no hint shows.
- C-AC24 Given `tap_combine_window_ms` and `max_flying_eggs` changed in config, then the popup combine window and on-screen egg cap follow the new values.
- C-AC18 No collection value is hard-coded. Changing eggs-per-tap or cost in the config changes behaviour (AC9).

## 9. Decisions (Head of Product, 2026-10-15) and remaining questions
- P1 Accepted: economy_sim.py now flags any level where eggs_per_tap > 50% of coop_capacity at the paired Farm level (paired = the Farm level the sim bot holds alongside each Collection level), and also checks same-index CSV rows. Current result: **no levels flagged** on either check. Combinations outside the sim path do trip it (e.g. Collection L5 with Farm L0: 30 > 25).
- P2 Accepted: the "Limited by coop" hint (§6.5, C-AC23).
- Q1 Decided: production at full coop is lost (§2, C-AC20).
- Q2 Decided: `tap_combine_window_ms`=250 and `max_flying_eggs`=5 are Collection-owned tunables listed in economy.md (C-AC24).
- Q3 Decided and confirmed by Engineering: float storage; floor for display and taps; the remainder stays (C-AC19).
- Q4 Decided: vibration is out of M1 (see §10).
- Q5 Decided and confirmed by Engineering: < 60 s gap catches up in one step at the full online rate, capped; ≥ 60 s goes to offline; negative delta gives 0; tick uses real elapsed time (C-AC15, C-AC21, C-AC22).
- Open: none.

## 10. Backlog (post-M1)
- Light haptic on Collect (navigator.vibrate ~10 ms, mobile web). Out of M1 per Head of Product, 2026-10-15.
- Collect sound via the `onCollect(moved)` hook (sound is out of M1).
- Auto-collect (M2 Workers).

## 11. rc1 copy fix: offline popup (S2-4c, 2026-10-16)
- The offline popup shows the gross offline gain. Engineering confirmed nothing sells during the offline calculation (game/src/sim/offline.ts). All pending eggs go into the Basket on Collect or dismiss, and normal market ticks then sell them, so stock can read lower within seconds.
- rc1 copy: "+{N} eggs added to your basket" (replacing wording that implied the eggs are in stock).
- C-AC25 (approved by Head of Product 2026-10-16) Given an offline gain of N, when the popup shows, then:
  (a) it reads "+N eggs added to your basket", with N formatted with thousands separators (e.g. "+2,278");
  (b) for N = 1 it reads "+1 egg added to your basket";
  (c) N is the number actually added to the Basket. The Basket is unlimited in M1, so this equals the gross gain; if a basket cap is ever added, it is the clipped amount;
  (d) after Collect, the Basket increases by exactly N before any market tick.
  (e) Layout (Art & UX approved 2026-10-16): always two centred lines, never truncated or ellipsised. Line 1 is the hero number "+N" (Fredoka bold, with the number pop). Line 2 is "eggs added to your basket" ("egg added to your basket" when N = 1) in body text. N above 9,999,999 uses the standard short form (e.g. "+12.3M"). It is verified with a 360px-wide screenshot at N = 1,234,567.
- Backlog (rc2, needs design): a summary after Collect showing eggs sold and coins earned in the first seconds.

## 12. rc1 copy fix: Collection upgrade effect (QA rc1-pt1-pass1 #2, 2026-10-16)
The Collection upgrade's main benefit is +12% egg price per level (M1-R1); +5 eggs/tap is secondary. Every label must lead with price.
- Upgrade row, before→after list: "Egg price +{12·L}% → +{12·(L+1)}%" first, then "Eggs per tap {5+5L} → {5+5(L+1)}".
- Upgrade row, next-level summary (where a short raw label is shown): "+12% egg price · +5/tap".
- Goal strip: uses the rc1 upgrade-clarity format "★ Collection L{n} · +X% income" (art-ux/rc1-upgrade-value.md; X from incomePerSec). If the clarity work is cut (Cut B), the fallback label is "Collection L{n}: +12% price, +5/tap". "+5/tap" alone is never shown.
- C-AC26 Given any surface that describes the next Collection level (upgrade row, goal strip, tooltips), when it renders, then the price effect (+12% egg price, or the +X% income chip) is shown first, and no surface shows "+5/tap" without the price effect.
- Fit at 360 (Art & UX, 2026-10-16): the short label (~156px) and goal strip L5 (~188px) fit the 200px budget. If a goal label goes over budget (e.g. "★ Collection L25 · +12% income" ≈ 204px), drop the ★, since the Best buy outline already marks it. Never truncate the %. The Cut B fallback is shortened to "Collection L{n}: +12% price" (+5/tap stays on the card); it isn't needed, because Engineering is building Cut A. Engineering checks final widths with Fredoka in the build.
- C-AC26b Given a goal-strip label wider than 200px at 360, when it renders, then the ★ is dropped and the label is never truncated or ellipsised.
