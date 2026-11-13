# First-minute proposal · v0.3 · 2026-10-17 · PM, Collection

> **Status:** APPROVED for build. 10-egg start (alt A) approved: Economy PASS (10.3 / 19.1 / 25.2 s); Head of Product approved FM-AC1–10 on 2026-10-17; copy/UI approved by Art & UX. Pinned to product/economy.csv sha256:9980ec22410b (was 86f0e80e3593) (git: not tracked in git; sha256 is the pin).
Source: qa/m3-recheck/claude-gamer-triage-7d52952.md, feel notes 2–4 (passive first ~12 s; tutorial copy differs by width; "$2 to go" doesn't point to Upgrades). Code read: local tree `ce7d59a` (`game/src/sim/state.ts` initialState, `ui/onboarding.ts`, `ui/app.ts:550-558`), balance.json, economy.csv L0.

## Current first minute (M1 values)
- Start: coop **0**, coins $0, basket 0 (state.ts initialState). Lay rate L0 **1.5 eggs/s**, coop cap 50, eggs_per_tap **5** (5+5L), egg price $1.00, Collection L1 cost **$10** (floor(10×1.6^0)), `first_customer_s` **10**, then every 5 s.
- FTUE step 1 gate opens at `floor(coop) ≥ eggs_per_tap` (onboarding.ts:20) → **first meaningful tap ≥ 3.3 s**, with the hint "Your hens are laying eggs…" until then. Step 2 waits for the first customer at **10 s**. Sim TTFU **15 s** (first Sell-all at 15 s).

## (2) Meaningful tap within 3–5 s
**Approved (alt A):** start the coop at **10 eggs** (2 taps' worth; cap 50), keep `first_customer_s = 10`.
- Collect is enabled and **pulses from 0 s** (§Pulse); the pointer hand appears only if there's no tap within 3 s, replacing the pulse; **tap 1 moves 5 eggs at 0–3 s**. The coop refills 5 eggs in 3.3 s, so taps 2–3 are also meaningful during the customer wait; the step-2 hint shows the countdown ("A customer is on the way… 7 s").
- **TTFU check:** the first sale can't happen before the customer at 10 s, so the earliest TTFU stays ≈ **11–12 s** (tap customer, sell, open Upgrades, buy) → above the **< 10 s bug floor**. Median expected ≈ 15 s (sim unchanged or 1–2 s faster: eggs are ready when the customer arrives) → well inside **p50 ≤ 30 s, p75 ≤ 45 s**. +10 eggs = +$10 of lifetime value at most; negligible against economy.csv pacing (Farm L4/10/18 at 5/10/30 min).
- Alternative B (not taken): also cut `first_customer_s` to 7. Earliest TTFU ≈ 8–9 s → would trip the < 10 s bug flag and need the floor re-based. Only if HoP wants a shorter wait.
- Alternative C (not taken): coop 0, but Collect pulses from 0 s with "Your hens are laying eggs…" and a fill ring; tap 1 still waits until 3.3 s. Fallback if Economy rejects the start value.

## (3) One tutorial copy set at every width
Current differences (app.ts:556-558 override onboarding.ts STEPS captions):
| Step | 390 px (sheet closed) | Desktop/docked or sheet open | onboarding.ts STEPS (unused default) |
|---|---|---|---|
| 1 Collect | "Tap **Collect** to gather the eggs." | same | "Tap Collect to gather eggs from the coop." |
| 2 Sell | "A customer! Tap them to sell eggs." | "Tap **Sell** to earn coins." | "A customer is waiting! Tap them, then Sell your eggs." |
| 3 Upgrade | "Spend coins to collect more eggs per tap." (points at Upgrades nav) | "Tap **Buy**." | "Spend your coins: open Upgrades and buy your first one." |
**Unified strings (all widths; the pointer target still differs by layout):**
1. "Tap **Collect** to gather eggs."
2. "A customer! Tap **Sell** to earn coins." (390 sheet closed: pointer on the customer chip, which opens the sheet showing Sell; desktop: pointer on Sell)
3. "Buy your first upgrade: more eggs per tap." (390: pointer on Upgrades nav, then Buy; desktop: pointer on Buy)
- STEPS captions in onboarding.ts become the single source; app.ts stops overriding text (keeps target selection only). Art & UX approved the wording; step 3 stays "Buy your first upgrade: more eggs per tap." (no price lead in the FTUE).

## (4) "$N to go" becomes a path to Upgrades (approved by Art & UX)
- The step-3 wait hint (onboarding.ts:25) and the next-goal hint read **"$2 to go · Upgrades ›"** (amount live), with a **44 px** min hit area. Tap: opens the Upgrades tab (390) / scrolls the docked Upgrades panel to the target card, and **pulses the target Buy once**.
- When coins ≥ cost the hint reads **"Ready! Tap to buy."**; tapping it does the same open/scroll and pulse.

## Pulse and pointer rules (approved by Art & UX)
- **Pulse:** reuse the existing next-goal pulse: scale 1.0 → 1.06 plus an outline glow, 1.2 s loop; stops on the first tap of that element. **Reduced motion:** a static 3 px outline, no scale/glow animation.
- **One pulsing element on screen at a time** (priority: FTUE target > Buy target > next-goal).
- **Collect pulses from 0 s.** The FTUE pointer hand appears only if there is **no tap within 3 s**, and it **replaces** the pulse; pulse and pointer are never shown together.

## Definitions (from QA testability review, qa/m3-recheck/first-minute-v0.2-testability.md)
- **Fresh save:** empty localStorage/IndexedDB in a new browser context, no `?debug`, build id verified, `session_index=1`.
- **Pulsing:** the element has the pulse class (`.pulse`, or whatever the class is named) or a computed `animation-name` ≠ none. Under reduced motion: `outline-width` 3px and `animation-name` none.
- **t0:** the first frame with `build-id` set and Collect enabled.
- **Viewports:** QA's full 8-viewport matrix: 360×844, 375, 390×844, 430, 1024×474, 1280×720, 1280×800, 1366×768. **Docked = width ≥ 1024 px**; < 1024 is the mobile layout.

## Acceptance criteria
- **FM-AC1** Given a fresh save (G2) on a build with START_COOP=10: at t0 the coop label reads 10, Collect is enabled and pulsing (G3). A tap at t0+1,000 ms sets coop to 5 (±1, because laying continues) and emits `collect.eggs = 5`.
- **FM-AC2** Given a fresh save, the first `tap` window with `eggs > 0` has `fgMs ≤ 5,000` for a player who taps on the prompt (bot: tap at 1 s). Verifiable in the test harness via the event log.
- **FM-AC3** Sim (seller15 and cheapest, seeds 1–30, CSV 9980ec22410b): TTFU p50 ≤ 30 s and p75 ≤ 45 s. Report min TTFU, informational only. < 10 s is a telemetry bug flag, not a QA gate.
- **FM-AC4** At 360×844, 375×844, 390×844, 430×844, 1280×800, 1024×474, 1280×720 and 1366×768, step 1/2/3 caption textContent equals exactly 'Tap Collect to gather eggs.' / 'A customer! Tap Sell to earn coins.' / 'Buy your first upgrade: more eggs per tap.' (bold allowed on Collect and Sell). Wrapping is allowed; no ellipsis; the caption box has scrollWidth ≤ clientWidth and sits fully inside the viewport. Only the pointer target differs: customer chip or Upgrades nav at <1024 with the sheet closed, Sell or Buy when docked.
- **FM-AC5** With coins < cost, the hint text equals '$N to go · Upgrades ›', where N = cost − coins in the game money format and updates within 250 ms of a coin change. Hit area ≥ 44×44 CSS px. Tap: at <1024, the Upgrades tab is active; when docked, the target card is ≥ 90% inside the panel viewport within 600 ms. The target Buy gets exactly 1 pulse cycle (1.2 s ±0.1 s), then none.
- **FM-AC6** When coins ≥ cost, the hint equals 'Ready! Tap to buy.' within 250 ms; the tap behaves as in AC5.
- **FM-AC7** Pulse: peak scale 1.06 ±0.01 (computed transform), period 1,200 ms ±50 ms, and an outline/box-shadow present. It stops (no pulse class/animation) within 100 ms of the first tap and does not return. Under prefers-reduced-motion: reduce, animation-name is none, the transform stays identity, and there is a 3 px outline.
- **FM-AC8** At any moment at most one element on screen is pulsing (sampled every 100 ms through the FTUE and first 2 min).
- **FM-AC9** From fresh load t0, Collect pulses at t0 (≤ 100 ms). No tap: the pointer hand is visible (G-strict visibility) at 3,000 ±150 ms, and the Collect pulse is gone within 50 ms of the pointer appearing. Tap at 1,000 ms: no pointer for step 1 through t0+6 s. In 100 ms samples, pulse and pointer are never both visible.
- **FM-AC10** When no FTUE step is active and the next-goal hint shows, it meets FM-AC5/6 for the card it names (next affordable upgrade per goal logic).

## Telemetry (already specced in telemetry-spec v0.6.2; no new events)
- **TTFU:** `upgrade.is_first_upgrade` fgMs on `session_index=1` (M2; p50 ≤ 30 s, p75 ≤ 45 s, < 10 s = bug).
- **First tap time:** fgMs of the first `tap` window with `eggs > 0`; `tap.empty` shows taps on an empty coop.
- FTUE funnel: first `tap` → first `sell` → first `goal_tap` → first `upgrade`; `onboarding_step`/`_skip` (and `timeout`). Optional: `goal_tap.target` already distinguishes a tapped "$N to go".

## Open questions
- None. ~~Economy + HoP: 10-egg start~~ **Closed 2026-10-17:** Economy PASS (10.3 / 19.1 / 25.2 s), HoP approved FM-AC1–10. ~~[A&UX] copy, pulse, affordance~~ **Closed 2026-10-17.**

## v0.2 (2026-10-17 08:30)
- Art & UX approved: step 3 copy kept; next-goal pulse reused (1.0→1.06 + glow, 1.2 s, stops on first tap; reduced motion static 3 px outline); one pulse at a time; hint "$2 to go · Upgrades ›" (44 px) opens/scrolls and pulses target Buy once, "Ready! Tap to buy." when affordable; Collect pulses from 0 s, pointer only after 3 s with no tap and replaces the pulse. ACs FM-AC4–10 updated/added. (10-egg start approved in v0.3.)

## v0.3 (2026-10-17 08:35)
- QA's wording adopted verbatim for FM-AC1, 3, 4, 5, 6, 7, 9, 10 (alt-C clause dropped from AC1; alt A approved). Definitions block added (fresh save, pulsing, t0, viewport matrix; docked ≥ 1024 px). Single status line: approved; Economy PASS 10.3/19.1/25.2 s; HoP approved FM-AC1–10. Pin: economy.csv not tracked in git; sha256 86f0e80e3593 is the pin.

## Definitions addendum (v0.3.1, 2026-10-17, from QA edb6ef85)
- **G-strict visibility:** an element counts as visible only when ALL of these hold: getBoundingClientRect width and height > 0; offsetParent is not null (no display:none ancestor); computed opacity > 0 on it and all its ancestors; computed visibility is not hidden; and its rect intersects the viewport. "Not visible" means any one of these fails.
- **Viewport matrix (8):** phones at 360, 375, 390 and 430 wide (844 tall); 1280×800; and docked at 1024×474, 1280×720 and 1366×768.

## Re-pin (v0.3.2, 2026-10-17 08:41): economy.csv sha256 9980ec22410b96c1ca4025eb994b8ab131937302cac123e1f86b3847b97e974b (start_coop_eggs=10, on top of 6dca24cd). FM-AC1/AC3 unblocked once Features' CSV PR and UI's consumer land.
