# First-hire nudge at F3 (PM, Workers) v0.1.1, 2026-10-30 13:20 CET (v0.1 Oct 16 2026)
**Not in v5; deferred to 5.1 (D-HOP-2026-10-30-36).** v0.1.1 (2026-10-30 13:20 CET, D-PMW-2026-10-30-10): header note only, no rule change. `first_worker_hired` ships in v5 on `flags.rc2Refill` with `via_nudge` = false; `first_hire_nudge_shown`/`_dismissed` stay out of the v5 allowlist. Pre-edit sha1 1c95fc8a907c8eb434a7bbae7bfa7415376a7b2b, frozen as `workers/rc2-first-hire-nudge.1c95fc8a.md`; backup `scratch/rc2-first-hire-nudge.v0.1-1c95fc8a.md`.
Source: product/casual-noworker-pacing.md. Casual players without workers reach only L17 at 30:00, and workers are expected by about L10–18. Head of Product asked for a nudge at F3.

## Rules
1. **Trigger.** The nudge fires when the Market Hand (W1) is unlocked (F3), it isn't hired, and coins are at least its cost ($40). It fires once per save, re-arms when the player reaches F5, and stops for good after 2 dismissals.
2. **Nudge.**
   - The Upgrades nav button and the Workers tab show a "New" dot. This is not the red count badge, which stays reserved for asleep workers.
   - The W1 card pulses once.
   - A one-line hint reads "Hire a Market Hand: it serves customers for you". The copy is a placeholder until Art & UX confirms it.
   - Tapping the hint opens Upgrades on the Workers tab with W1 focused.
3. **Priority.** The nudge never shows alongside the B-1 coop-full hint, which takes priority. Only one hint shows at a time.
4. **Telemetry.**
   - first_hire_nudge_shown {farm_level, coins, t_since_unlock_s}
   - first_hire_nudge_dismissed
   - first_worker_hired {worker, farm_level, t_since_unlock_s, via_nudge: bool}

## ACs
- AC-FH1: At F3 with ≥$40 and no W1, the nudge shows within 1 s and taps through to the W1 card. It doesn't show below $40, and it doesn't show again once W1 is hired.
- AC-FH2: After 2 dismissals it never shows again on that save.
- AC-FH3 (sim, P95 with a worst-seed guard): for the casual model, the median time from F3 unlock to first hire is ≤3 min, P95 is ≤8 min, and ≥90% of runs have a worker by L10. The F22-24 ratio stays ≥1.5, and AC-W1–W7 pass.
- AC-FH4: The nudge never shows on screen at the same time as the coop-full hint.

## v1.0 APPROVED (Head of Product, Oct 16 23:20). AC-FH3 passes: 0.67 min median, 1.33 min at P95, 100% have a worker by L10. The hint copy is still pending Art & UX.

## v1.1 (Oct 16 23:30): final ACs after QA's review
- AC-FH1: The nudge shows within 1 s of the first frame where all of these hold: F≥3, W1 not hired, coins ≥$40, nudge not exhausted, and the coop-full hint not showing.
  - The New dot uses `[data-testid="new-dot"]` with the aria-label "New: Market Hand available".
  - If coins drop below $40 while the hint is showing, it stays until the player dismisses it or hires, so it doesn't flicker.
  - Final hint copy is pending Art & UX. The placeholder is "Hire a Market Hand: it serves customers for you".
- AC-FH2: A dismissal means the hint's close button only. A tap outside or a timeout doesn't count, and a tap-through counts as engagement, not a dismissal. The count covers both F3 and F5 showings, is stored in the save, and Reset clears it. After 2 dismissals the nudge never shows again.
- AC-FH4: While the coop-full hint is showing, the nudge hint is hidden, but the New dot stays. The nudge hint comes back within 1 s after the coop-full hint ends, if it's still eligible.
- Telemetry: first_hire_nudge_shown, first_hire_nudge_dismissed and first_worker_hired are pinned.
- v1.2: The F5 re-arm counts toward the same limit of 2 dismissals. A dismissal is the close button only. Hint priority is coop-full first, then this nudge, then the M4 hints, with only one hint shown at a time. The $40/F3 trigger comes from W1's cost and unlock level in the data.
- Final copy: art-ux/rc2-workers-copy.md v1.0 overrides placeholder strings (Oct 16 23:55).
