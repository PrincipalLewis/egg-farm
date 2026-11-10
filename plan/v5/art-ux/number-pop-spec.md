# Number pop visual spec v1.0 (2026-10-16), UI/Visual Designer
SIGNED OFF by Head of Art & UX 2026-10-16. Motion timing follows Audio & Juice Designer's juice-spec (scale-up 0 to 120 ms, 0.6 to 1.1 to 1.0 ease-out-back; rise and hold to 500 ms; fade 500 to 800 ms; starts on the same frame as the event; reduced motion: 150 ms fade-in, hold, 200 ms fade).

## Type
- Fredoka 700, tabular numerals, abbreviated (`+1.2K`, `+3.4M`). Always a sign (`+`).
- Size: tap 18px, collect 22px, sell 26px (desktop docked: same px; never below 16px).
- Outline: 2px Soil Brown #3E2C23 text stroke (paint-order stroke) so it reads on any farm art.

## Colour per event
- Tap: Warm White #FFFFFF fill. No icon.
- Collect: Yolk Yellow #FFC93C fill plus a 16px egg icon on the left.
- Sell: Coin Gold #E8B020 fill plus a 16px coin icon. Above 10x the median sale (big sale; median sale = median of the last 20 sales, or the current order value if fewer than 5 sales): 1.25x size and a one-shot Deep Yolk #F29E1F glow.

## Motion details (layer on the shared timing)
- Rise: 32px upward over 0 to 500 ms (ease-out); hold is position-only. Tap drift: random ±8px x.
- Stacking: at most 4 live pops per source; a fifth merges into the newest by summing the value and restarting the 0 to 120 ms scale. A tap burst faster than 60 ms reuses one pop.
- Origin: tap at the touch point; collect above the coop; sell above the coin counter, which ticks up on the pop's first frame.
- Never cover a Buy button or the next-goal bar: clamp so the pop stays at least 8px from their bounds.
- Reduced motion: no rise, no drift, no scale, no glow; use the opacity curve only.
