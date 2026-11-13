# MK-60 wage copy + MK-63 spend pop (Head of Art & UX, 2026-10-19 10:55; v1.1 11:00, aligned with Audio & Juice and HoQA; moved to M4.2, first in the UI queue), for product/market/rv6-coin-drop-investigation.md §5 (D-HOP-44)

## MK-60 wage copy (no ellipsis at 360/375)
- Hired card meta line: `Wage $5.75/min` (approved as written).
- Unpaid card: two lines, never one joined line. Line 1 `Wage $5.75/min`. Line 2 `⚠ Unpaid · needs $12.50`, in the danger style used by the rc1 Unpaid banner, with icon plus text and never colour alone. One joined line is 37+ characters and won't fit the meta column at 360.
- Hire row: the button stays `Hire $40`. Under it, a caption in --c-muted reads `Wage $5.75/min`. "paid $X/min" is dropped because it reads as already paid; "Wage" is the single word for this everywhere.
- Aria: `Market Hand, wage 5.75 dollars per minute.` / `… unpaid, needs 12.50 dollars.` / `Hire Market Hand for 40 dollars. Wage 5.75 dollars per minute.`
- Values come from data and the money formatter. NBSP before `/min`.

## MK-63 spend pop
- **Trigger.** Every purchase shows `−$X` (U+2212) in the same frame as the coin change. v1.1: one pop per purchase, equal to that card's price in the #56 format. A new pop instantly replaces any pop still showing, so pops never merge, stack or overlap (HoQA condition).
- **Wage charges: MK-62, M4.2 (D-HOP-44), next after MK-60/63.** each wage charge also pops `−$1.25 wages` at 80% size. The invisible wage drain is the RV-6 complaint, so a purchase-only pop leaves the original cause unexplained.
- **Position.** Anchored under the coin pill, right-aligned to its number. It moves **down** 12 px (v1.1, Audio & Juice's value) with no overshoot and fades, while gain qpops rise. Direction plus the minus sign carry the meaning, never colour alone. It never covers the rate or the fatigue chip slot: it renders above them on z-index 31 and lives only 650 ms, and its start position sits on the pill's lower edge.
- **Style.** Reuse `.qpop` with a new token `--c-spend: var(--c-cream)` (#FFF6E5) as the fill. Keep the same #3E2C23 stroke and shadow so contrast stays at the qpop level. Size 14 px against the gain pop's 16 px, so spending reads quieter than earning. Never red: spending is not an error.
- **Motion.** 650 ms ease-out, translateY(0 → +12 px), opacity 1 → 0 from 70%. Reduced motion: a static `−$X` at the anchor, fading over 650 ms linear (like qpopRm).
- **Aria.** No live announcement for each spend (too chatty). The coin pill's aria value updates as today.
- **Sound.** None (Audio & Juice, v1.1): each purchase already plays its own sound.
