# M3 FTUE + Workers intro (AC3, AC4) — Art & UX · v1.1 · 2026-10-15
Sources: product/m3-proposal.md M3-AC3/AC4 (+ HoP acceptance of art-ux/m3-review.md: 2-part Workers intro, step 4 pointing at the next-goal strip), layout-spec.md §3.7, m2-workers-layout.md, product/workers/m2-proposal.md v1.1 §8.11 (tip rules), economy.md (start state). Builds on: m3-next-goal-spec.md.

## 1. Coach-mark component (all steps)
- Scrim `--c-scrim` over the app; **spotlight** = a ring around the target (`box-shadow:0 0 0 9999px var(--c-scrim)`, `--r-md`, 6px padding, 3px `--c-yolk` border). Only the spotlit target and "Skip" are tappable; other taps are ignored (no shake).
- **Bubble:** max-width 280px (portrait) / 320px (≥960), bg `--c-white`, 2px outline, `--r-md`, padding `--s-3`, Nunito 16px `--c-text`, a 12px tail pointing at the target. Placed above the target if there's ≥ 120px room, else below. Step dots "● ○ ○" 8px under the text (`--c-muted` / `--c-text`).
- **Pointer:** `assets/ui-pointer-hand.svg` 40px, bobbing 6px every 1 s toward the target (reduced motion: static).
- **Pointer anchoring rule:** the anchor is the fingertip — `ui-pointer-hand.svg` tip at top-centre (24,0 of 48), `ui-pointer-hand-down.svg` tip at bottom-centre (24,48). The fingertip points at the **edge** of its target (never its centre) with a gap of **≥ 8px** to that edge, measured at the furthest point of the bob (place the rest position 8px + 6px bob away). The hand must **never cover label, value or meter text** (e.g. the coop meter text): if it would, approach from the opposite side (switch up/down variant) or offset sideways. Use the up variant for targets above the hand, the down variant for targets below; never mirror or CSS-rotate the up asset.
- **Skip:** text button top-right under the HUD, 44×44 hit area, "Skip" 14px `--c-text`. Skipping ends steps 1–4 (not the Workers beats).
- Desktop ≥960: same component; spotlight targets in the docked column work without opening a sheet.
- FX: pointer + spotlight are not FX-layer elements; each step's success uses ≤ 6 sparkle dots.
- Focus management: on each step focus moves to the target; Esc = Skip. Bubble has `role="dialog"`, `aria-live="polite"`.

## 2. Onboarding steps (new save only, once, skippable — AC3)
Start state: coins 0, coop 0, eggs/sec 1.0, eggs_per_tap 5, first customer at 10 s (economy.md).
| # | Trigger | Spotlight | Copy | Advances when |
|---|---|---|---|---|
| 0 | game start (after "Tap to start") | coop scene (no scrim, bubble only, 3 s) | "Your hens are laying eggs!" | coop ≥ eggs_per_tap (≈5 s) |
| 1 | step 0 done | Collect button | "Tap **Collect** to gather the eggs." | first Collect with k > 0 |
| 2a | first customer arrives (t ≈ 10 s) | the customer chip | "A customer! Tap them to sell eggs." | Market opens |
| 2b | Market open | that customer's "Sell k/N" button | "Tap **Sell** to earn coins." | first sale |
| 3a | coins ≥ cheapest upgrade cost (Collection L1 = $10) | Upgrades nav button (desktop: the Collection row) | "Spend coins to collect more eggs per tap." | Upgrades opens |
| 3b | Upgrades open | Collection row Buy | "Tap **Buy**." | first purchase |
| 4 | step 3 done | next-goal strip (no scrim, toast-style bubble, 4 s auto-hide) | "Your next goal is always shown here." | auto / tap |
- Between 2b and 3a (coins < $10) there's **no overlay**: free play. The next-goal strip appears from step 4 only (it's hidden during 1–3).
- Step 0 has no pointer; it's not counted as a step in the dots (dots show 1–3; step 4 has none).
- Persist `ftue_step` in the save; a reload resumes the current step (step 0/2a/3a wait for their triggers again). After step 4 or Skip: `ftue_done = true`; never shown again.
- The welcome-back modal never appears in a new save, so no conflict. If any modal opens mid-FTUE (Settings), the overlay pauses and resumes after.
- Timing for AC3 (≥80% finish or skip within 90 s): seller-like play reaches step 4 in ≈ 25–35 s (first upgrade ≤ 30 s, AC7).
- Telemetry (names proposed; Engineering/Product own the schema): `ftue_step {step, t}` on each step shown and done, `ftue_skip {step, t}`, `ftue_done {t}`.

## 2.1 Event gating (v1.1, PT1 fix) — overrides any fixed-order build
PT1 (m3-pt1+0345680) ran the steps in fixed order: "Tap Sell" pointed at an empty queue for ~7 s and "Tap Buy" showed while $2 short. Rules:
- A step's coach mark is shown **only when its action is possible**: Collect needs coop ≥ eggs_per_tap; **Sell** needs a customer at the stall **and** basket ≥ 1; **Buy** needs coins ≥ cost of the spotlit upgrade. If the condition becomes false while shown (customer leaves, coins spent), hide the pointer and return to the wait hint.
- Otherwise show a neutral, non-blocking **wait hint** (no scrim, no pointer, bubble near the queue / coins pill): "A customer is on the way…" (with the countdown if ≤10 s) or "Sell a few more eggs to afford it" (with "$X to go"). Player keeps free play.
- **Timeouts:** wait hint auto-hides after 15 s and re-shows when the gate opens; if a gate stays closed 60 s, skip that step silently (log `ftue_step {step, timeout:true}`). Skip button visible on every step and hint; Esc = Skip.
## 2.2 Collect label (v1.1)
- The label always shows the real per-tap value: "Collect +${eggs_per_tap}" (balance.json `collection.eggsPerTapBase` = 5, +5 per level → L0 = +5). Never a hardcoded number.
- Finding: the code is not hardcoded; app.ts:397 shows `min(coopWhole, eggsPerTap)`, so with 1 egg in the coop it read "Collect +1" while the card said "Eggs per tap 5". Balance (5) is correct; the label is the mismatch. Fix: label = eggs_per_tap; when coop < eggs_per_tap show the capped amount as secondary text ("Collect +5 · 1 ready") or keep the FTUE from spotlighting Collect until coop ≥ eggs_per_tap (step 0 rule). The floater still shows the real amount collected.

## 3. Workers intro — two parts (AC4)
### Part A — "New helper!" (first worker unlock)
- **Trigger:** Market Hand unlocked (Farm L3) **and** affordable ($40), FTUE done or skipped, no modal open. Shown **once per save** (AC4 "one-time"); see ambiguity §5.
- **Look:** a banner card under the HUD on the Farm View, 336px at 360 (full width − 24), `--c-yolk` bg, 2px outline, `--r-md`, `char-market-hand.svg` 40px left, title Fredoka 16px "New helper!", body 14px "Hire a **Market Hand** to sell to customers for you.", Primary small button "See workers" (44px tall) and a 44px ✕.
- **Tap "See workers":** opens Upgrades → Workers tab, spotlights the Market Hand Hire button (coach mark, no scrim on desktop), bubble: "Hire them for $40. They work while you play." The spotlight ends on hire or after tapping outside.
- **✕:** dismiss (counts as shown). Never during the welcome-back modal.
- Telemetry: `workers_intro_a {action: shown|open|dismiss}`.
### Part B — energy & Manage (after the first hire, any worker)
- **Trigger:** first hire completes (any type).
- Coach mark on the new worker card's **energy bar**, bubble: "Workers get tired over time." → tap/3 s → spotlight **Manage**: "Tap **Manage** to perk them up!". If the worker is at 100%, Manage is disabled ("Full"), so the bubble adds "…when their energy drops." and the step completes on tap anywhere.
- One-time per save. No scrim on the rest of the panel; non-blocking after 6 s.
- Telemetry: `workers_intro_b {action: shown|done}`.
### Relation to existing tips
- The **Coop Hand full-coop tip** (m2-workers-layout §5, v1.1 §8.11 rules) and per-worker unlock tips stay as specced. Part A **replaces** the generic Market Hand unlock tip for the first unlock.
- Only one tip/banner at a time; priority: welcome-back modal > FTUE > Part A > Coop Hand tip > other unlock tips. A queued tip waits until the higher one closes.

## 4. Layouts
- **390 / 360 portrait:** banners under the HUD (top 64px), never covering Collect or the next-goal strip; coach bubbles max 280px, tails clamp 16px from screen edges.
- **≥ 960 landscape:** banners top-centre of the farm column (max 480px); Workers spotlights in the docked column.
- Reduced motion: no bob/pulse; spotlight and bubbles appear instantly.

## 5. Ambiguities in the proposal (for Head of Product / PM Workers)
1. **AC4 "one-time tip" vs m2 v1.1 §8.11 "once per session; two dismissals hide it until the next worker unlock".** Assumed: Part A is once per save; the §8.11 rules apply to the other worker tips.
2. **AC4 trigger "when the first worker unlocks" vs §8.11 "unlocked and affordable".** Assumed unlocked **and** affordable (at F3, $40 is usually affordable within seconds).
3. **AC4's success metric (hire within 5 min) for players who skip FTUE:** assumed Part A still shows (it's not part of the skippable 3-step overlay).
4. **AC3 "3-step overlay"** vs my step 0 (bubble) and step 4 (toast): neither blocks input; counted outside the 3 steps.
5. **AC5 "always visible" vs FTUE:** the strip is hidden during FTUE steps 1–3 (introduced at step 4). Please confirm this is acceptable for AC5 sim/playtest measurement.

## Changelog
- v1.1 2026-10-15 23:45: §2.1 event-gated steps (Sell/Buy only when possible, wait hints, 15 s/60 s timeouts, skip); §2.2 Collect label uses real eggs_per_tap. From PT1 player notes.
- v1.0 2026-10-15: first version.
