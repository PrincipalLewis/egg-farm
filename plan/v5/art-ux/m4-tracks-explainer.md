# M4 three-track migration explainer (Art & UX) · v1.3 · 2026-10-16
v1.1 (Fri Oct 16 2026): aligned with M4-AC-EXP1 (product/farm/m4a-eng-addendum.md): track renamed "Egg value" (was "Egg quality") everywhere, flag `seenTracksExplainer`, trigger is the first load after the v6→v7 save migration, never blocks input, reduced motion = fade only. Copy for track rows and the Balanced-farm strip: m4-tracks-copy.md.
v1.3 (Fri Oct 16 2026 13:55): dismiss on any tap (passes through) + Got it/Esc/8 s; trigger is the first load after migration only, with no Farm-tab condition. Matches HoP rule.
Owner of AC: PM, Farm Upgrades (M4-AC-EXP1).

## Trigger
- Only existing saves: on the first load after the **v6→v7** save migration to the 3-track model (whatever screen is open; no tab condition).
- New players (no migration) never see it.
- Persist `seenTracksExplainer=true` as soon as it is shown (and again on dismiss), so a reload, closed tab or dismissal never re-shows it.

## Pattern: coach mark (not a toast, not a modal)
- Never blocks input: no scrim, nothing dimmed, the game tick and all taps continue (`pointer-events` only on the bubble itself).
- Anchor: the 3-row tracks block (Hens / Egg value / Farm) when it is on screen; otherwise top-centre under the top bar with no arrow.
- Bubble: white card, 2px `--c-outline`, `--r-md`, max-width 296px at 360, arrow pointing at the tracks block, placed above it (below it if it doesn't fit).
- Copy (body Nunito 16/400, title Fredoka 18/700):
  - Title: `Upgrades got an upgrade!`
  - Body: `Hens and Egg value are now separate. Top them up!`
  - Refund line, only if `migrationRefundCents > 0` (omitted at 0): `We refunded +$X for your old upgrades.` ($X = exact refund, standard money format incl. 1.2K/3.4M; coin icon before it).
  - Button: `Got it` (hit area ≥44×44px).
- Dismiss: tap anywhere (the tap still reaches the game, so it is never swallowed), "Got it", Esc, or 8 s.
- If refund > 0, the coin pill gets the standard number pop and coin burst on dismiss (not before, so the refund is noticed).

## Motion
- Default: pop in at scale 0.9→1 over 200ms with `--ease-pop`; fade out over 150ms.
- Reduced motion on (`prefers-reduced-motion: reduce`): no scale; a plain 150ms opacity fade in and out only.

## Accessibility and fit
- role="dialog" aria-modal="false", focus moves to "Got it", Esc dismisses, WCAG AA contrast (#3E2C23 text on white).
- At 360 the longest body with the refund line is 4–5 lines, ~170px tall, and fits above the tracks block.

## v1.2 (2026-10-16 13:53): final body copy (price-matched migration)
- Title: `Upgrades got an upgrade!`
- Body (replaces v1.1 body): `Hens and Egg value are now separate. Top them up!`
- Button: `Got it` (unchanged). Refund line stays as a guard (`migrationRefundCents > 0`), expected to show for no one.
- On dismiss, the existing next-goal highlight applies (best buy will usually be a cheap Hens/Egg value level), so the coach mark doesn't add its own pointer.
- 2 lines max at 360 (Nunito 16px in the 296px card).
