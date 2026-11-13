# Queue visibility spec · v1.2 (Art & UX answers and gap confirmations folded in) · 2026-10-16 · PM, Market/Customers · due Thu Oct 22
Why: queue growth from P1q (queue_max = min(10, 6 + floor(F/5)): 6 / 7 / 8 / 9 / 10 at F0 / F5 / F10 / F15 / F20) is nearly invisible. The strip draws at most 5 cells (`game-rc1-ui/src/ui/orders.ts:24`: more than 5 waiting → 4 cards + "+N" chip; `app.ts:277` strip = min(5, slots)), so steps only change the chip number (research: product/research/slices/market.md §3). No numbers change in this spec. Art & UX owns layout and visuals; PM Farm Upgrades signs off the Farm card copy.

Size key: **XS** ≤ 2 h · **S** ≤ 0.5 day · **M** ≈ 1 day. Type: **Copy** = text/data binding only, existing components and styles · **Art** = needs new visual, layout or animation work.

## 1. Capacity count on the queue strip ("6/8 waiting")
Type: Copy (text label in the existing strip; placement by Art & UX). Size: S.
- QV-1 The capacity label "`n`/`Q` waiting" sits muted at the right end of the queue row header (Art & UX), n = customers currently in the queue (live, not dwelling "Thanks!" cards), Q = queue_max(F) from config. Example: 6 waiting at F10 → "6/8 waiting".
- QV-2 The label coexists with the current strip rules: up to 5 cells; when n > 5, 4 customer cards plus the "+N" chip (N = n − 4). The label is extra text, not an extra cell; the card/chip rule is unchanged.
- QV-3 n = 0 shows "0/`Q` waiting" (not hidden), so capacity is readable before customers arrive.
- QV-4 When n = Q (full) the label is **replaced** by the amber "Queue full" badge (with text). The label and the badge never show together.
- QV-5 The label updates within one frame of an arrival, sale, timeout or level-up, and uses the same coalesced count as the "+N" chip (F5 `Coalesce(2000)`), so the label and chip never disagree on screen.
- QV-6 Accessibility: the strip's accessible name includes "`n` of `Q` customers waiting"; it's announced politely at most once per 5 s.

## 2. Farm card queue preview
Type: Copy. Size: XS–S (commit 67c2385 already shows '+1 customer (max N)').
- QV-7 When the next Farm level adds a slot (queue_max(F+1) > queue_max(F), i.e. buying F4→5, 9→10, 14→15, 19→20), the Farm card's current → next list includes "Queue `Q` → `Q+1`" (e.g. "Queue 7 → 8").
- QV-8 Under the queue line, in muted text (Art & UX), the card shows "Next slot at F`X`", X = the smallest level > F+1 with a larger queue_max. When the next level doesn't add a slot, the queue line is "Queue `Q`" with the muted "Next slot at F`X`" beneath (e.g. at F6: "Queue 7" / "Next slot at F10").
- QV-9 At max queue (Q = 10, F19 buying into F20 shows "Queue 9 → 10"; F20–30) the card shows "Queue 10 (max)" with no "Next slot" line. **Discrepancy noted:** Art & UX's answer said "Queue 20 (max)"; the approved cap is 10 (P1q, economy.csv `queue_max` = 10 at F20–30), so the spec uses 10.
- QV-10 All values come from config (`queue_max_base`, `queue_max_step_levels`, `queue_max_cap`); changing them in balance.json changes the copy with no code change (AC9).

## 3. One-time celebration when a slot is added
Type: Copy (Art & UX: reuses the existing "Coop upgraded!" toast, no new art). Size: S.
- QV-11 On first reaching F5, F10, F15 and F20 (any level where queue_max grows), show the existing "Coop upgraded!"-style toast with the copy "Queue +1! Now `Q` customers" (e.g. "Queue +1! Now 8 customers"), once per milestone. No new strip animation in rc2.
- QV-12 Each step celebrates at most once per save: the highest celebrated queue size is stored **in the game save** (like `celebratedTier`, not only in the UI flags in localStorage; today's `seenSlots` lives in UI flags, so a cleared cache or new device would repeat it). Reload, reset of UI flags or a second tab doesn't replay it.
- QV-13 **Several steps at once** (buying through two thresholds in one tick, a save imported at a higher level, debug jumps): **one** toast naming the final size, "Queue +`d`! Now `Q` customers" (e.g. "Queue +2! Now 9 customers"); all passed steps are marked celebrated. No queue of repeated toasts (Art & UX confirmed).
- QV-13b **Coop upgrade at the same moment** (coop tiers at F5/10/20 coincide with queue steps): **one combined toast, "Coop upgraded! Queue now `Q`"** (e.g. "Coop upgraded! Queue now 8"; with two thresholds passed at once, "Coop upgraded! Queue now 9"). Never two toasts stacked. F15 is queue-only.
- QV-14 Not shown for levels gained offline (there are none in M1) or during the welcome-back modal: if a step is pending while the modal is open, the callout plays once after the modal closes. Not shown during onboarding steps 1–3; it plays after onboarding ends.
- QV-15 Reduced motion: the toast follows the existing toast's reduced-motion behaviour (no entrance animation); sound only if SFX is on.
- QV-16 A new game (F0, queue 6) shows no celebration; the first possible one is F5.

## 4. Turned-away count (customers lost to a full queue)
Type: Copy only in rc2 (Art & UX). Size: S.
- QV-17 One muted text line **under the queue row**: "`k` customers left (queue full)", k = customers lost to a full queue **since the current session started** (game load, or return from a hidden tab that froze; resets at those points). Hidden when k = 0.
- QV-17b The line turns warning amber, **with the same text label (never colour alone)**, only while the queue is full (n = Q); otherwise muted.
- QV-17c At 360 and 375 px the line reads "`k` left (full)". Large counts use short form: 1,000+ → "1.2K" (one decimal, half-up), 1,000,000+ → "1.2M". The accessible name always has the full text and exact number.
- QV-18 Only `customer_lost` with reason full_queue counts. Timeouts (`customer_lost` timeout) and partly served leavers (`customer_partial`) don't count.
- QV-19 The count isn't saved (session only) and offline time adds nothing (the queue is frozen while closed).
- QV-20 No tappable strip in rc2 (Art & UX): the line and the strip are not links. The existing "Queue full!" walk-off cue stays as is, rate-limited by `queue_full_cue_min_gap_ms`.
- QV-21 Telemetry: the existing customer_lost event is enough; no new event required. Optional: log `turned_away_shown` with k on panel open.

## 5. Edge cases
- QV-22 Level-up while the queue is full: Q grows immediately, the label changes from "6/6" (full style) to "6/7" in the same frame, and the next arrival can join (MK-3b).
- QV-23 Dwelling "Thanks!" cards (MK-16/17) don't count in n; a displaced dwelling card doesn't change the label.
- QV-24 At 360 px the short forms are "`n`/`Q`" (e.g. "6/8") and "Full"; the accessible name keeps the full text. Nothing may overlap the strip, chip or HUD (QA checks at 360, 375, 390 px and desktop).
- QV-25 Debug "set Farm level" jumps follow QV-13 (one combined celebration) and QV-12 (persisted).
- QV-26 Hidden tab: catch-up simulation (≤ 60 s) can add turned-away customers to k; any celebration triggered during catch-up plays once on return.
- QV-27 Config with `queue_max_cap` = base (no growth): QV-7/8 lines show "Queue `Q` (max)", no celebrations, label still shows.

## 6. Estimate summary
| Item | ACs | Type | Size |
|---|---|---|---|
| Capacity label | QV-1–6 | Copy | S |
| Farm card preview | QV-7–10 | Copy | XS–S |
| Celebration (toast reuse) | QV-11–16 | Copy | S |
| Turned-away count | QV-17–21 | Copy | S |
| Edge cases / QA | QV-22–27 | — | S (tests) |
All items are copy-only after Art & UX's answers: ≈ 1.5–2 days of Engineering, all targeted at rc2.

## 7. Art & UX decisions (2026-10-16), all resolved
- Turned-away line: text only in rc2, muted under the queue row, amber + label while full, "12 left (full)" / 1.2K at 360/375 (QV-17–17c).
- Capacity label: muted at the right end of the queue row header; replaced by the amber "Queue full" badge when full; short forms "6/8" and "Full" at 360 (QV-1, QV-4, QV-24).
- Celebration: reuse the "Coop upgraded!" toast; multi-step "Queue +2! Now 9 customers"; combined coop toast "Coop upgraded! Queue now `Q`", never stacked (QV-11, QV-13, QV-13b).
- No tappable strip in rc2 (QV-20).
- Farm card: "Queue 7 → 8" with muted "Next slot at F10"; "Queue 10 (max)" (Art & UX's earlier "20" was a typo against the cap of 10) (QV-7–9).
No open questions remain.
