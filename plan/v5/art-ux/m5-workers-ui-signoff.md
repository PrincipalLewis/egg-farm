# M5.0 Workers UI: Art & UX sign-off (abilities v1.0 + pause v1.0) · 2026-10-24 16:20 · Head of Art & UX
Signed off with the changes below. These are paper decisions; the build hold stands.

## Global
- **No emoji glyphs in UI strings.** ⚡ ⏸ ▶ render differently on every OS. Use the new inline icons `icon-bolt.svg`, `icon-pause.svg` and `icon-resume.svg` (24×24, 2px `--c-outline`, Art supplies them, about 0.1d). Wherever the specs say "⚡", read it as icon-bolt.
- **WCAG 2.5.3:** a control with visible text gets no `aria-label`. Its accessible name is the visible text, and any longer sentence goes in `aria-describedby`. Icon-only controls may use `aria-label`.

## 1. Sticky bar (§5.1): approved, with one change
- Two fixed slots at 12px margins with an 8px gap, which is 164px each at 360px. Hidden left slot = `visibility:hidden`. Approved.
- Height is **48px** for both slots, because Activate-all is the tab's primary CTA (primary floor 48).
- Right slot: [bolt] **"Shift calls (N)"**, 14px semibold, with yolk fill and `--c-ink` text. The text floor is 12px, then it wraps; numbers never clip. Drop `aria-label="Use N ready shift calls"`; that sentence moves to `aria-describedby`. AC-M5A-10 still passes on the visible name.
- Disabled: [bolt] "Next call m:ss" / [bolt] "No calls ready" at 50% yolk, with text kept at ≥4.5:1 contrast.
- Left short labels under 400px: "Refill (N)" (main) and "Manage all (N)" (RC1). Confirmed.

## 2. Call buttons (§5.2): approved, with the icon swap
- Labels: [bolt] "Rush", "Sweep", "Shout", "Inspect". Active: "Active 0:ss" with a draining yolk fill bar. Blocked captions "Asleep", "Unpaid", "Paused" and "Ready in m:ss" sit outside the tap area.
- Market Hand lockout caption: "Ready in 0:ss" plus a small pause icon, instead of "(after pause)".
- Target ≥44×44 with 8px spacing. Approved.

## 3. Ready badge (§5.4)
- Pill = bolt + N, yolk fill, `--c-ink` 12px bold, 18px tall, min-width 18, with a 2px white ring.
- Workers tab label: right after the label text, vertically centred.
- Upgrades nav button: the **top-left** corner of the icon, offset −4/−4. The existing dot stays top-right, so their boxes never intersect at any nav width.
- `pointer-events:none`. Hint priority coop-full > nudge > UC25 > badge > M4. Approved.
- Reduced motion: no pulse. Otherwise one 300ms scale-in when N goes from 0 to ≥1, never looping.

## 4. Pause toggle and paused state (pause §5)
- The toggle is a 44×44 icon-only button at the card's top-right: `icon-pause.svg` or `icon-resume.svg`, `aria-label` "Pause {role}" / "Resume {role}", with `aria-pressed`. Approved.
- Paused card: art desaturated to 40%, the neutral-grey "Paused" pill (never red), and a sleeping-z overlay reusing `overlay-yawn.svg`.
- Sub-line copy changes from "Benched · no wage · +1% per 36 s" to **"On break · no wage · recovering"**. Use "On break · no wage" if the recovery value is 0, and "Paused · Rested 100%" at 100%.
- "All workers paused" line: 12px, `--c-ink-2`, non-interactive. Approved.

## 5. Coach card (F10)
- Title: **"Shift calls unlocked!"**
- Body: **"Tap [bolt] on a worker for a 30-second boost. Calls recharge on their own."**
- Button: **"Got it"**, the only dismiss, which sets `abilitiesCoachSeen`. It uses the explainer placement rules, so it never overlaps a visible Buy, Collect or Activate-all.

## Amendment 2026-10-24 16:22 (Pause Q6)
- §4 is superseded: no z/yawn overlay on a paused worker. Paused = avatar art saturate(0.4) + grey "Paused" pill + a 20px icon-pause chip at the avatar's bottom-right.
- The toggle moves to the card action row, [pause 44×44] 8 [Manage] 8 [call], so cards stay 112px. Manage narrows first if needed.
- Desaturation applies to the avatar art only; text and controls keep ≥4.5:1 contrast.
- The coop-full '⚠' emoji gets replaced by icon-warning.svg in a separate M5.0 polish ticket.
- Coach "30-second" comes from the duration tunable.
- The sticky-bar slots use 8px side padding (slots only), a 20px icon and a 6px gap.
- 2026-10-24 16:25 Amendment: action row = full-width second row, card 128px (supersedes 'stay 112px').
