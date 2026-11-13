# M4 Collect streak UI (Art & UX, 2026-10-16). Spec: product/collection/m4-collect-streak-spec.md
## U-S1 Meter
- 8px-tall rounded bar directly under the Collect button, the same width as the button, with a 4px gap and a 2px `--c-outline` border. The fill is `--c-meadow` from left to right, and 0–40% maps to 0–100% width. A label sits right-aligned above the bar's end, reading "+18% price" (Nunito 14/700, tabular-nums). The meter is hidden at 0% (fades in on the first streak tap).
- Same at 360/375/1280. On desktop it goes under the scene's Collect button, never in the docked column.
- Build: each step eases the fill over 120ms. The number pops at a scale of 1 to 1.1 to 1.
- Cap (+40%): the fill turns `--c-gold`, the label reads "MAX +40%", and the bar pulses at a scale of 1 to 1.05 to 1 once per second while capped. A one-shot sparkle plays on reaching the cap.
- Cooling (3s or more without a tap, then decaying): the fill switches to `--c-muted` with diagonal stripes (so colour isn't the only cue) and drains smoothly. The label keeps showing the live %. It fades out at 0.
- Reduced motion: no pulse or sparkle. Cap and cooling are shown by colour plus "MAX" and stripes, and the fill changes instantly in 1% steps.
- No-spawn: the bar's box plus 16px is added to the golden-egg exclusion list (m4-timed-collectible.md runtime rule 2).
## U-S2 Price chip
- Yes. When streak > 0, every visible egg price (card price line, Sell value, Sell all) gets a `--c-meadow` chip "+18%" and the value shown includes the bonus.
- With frenzy, the gold "2×" chip comes first, then the meadow "+18%" chip, 4px apart, both 14px tall. The value shows the combined price. At 360, if the row overflows, the chips collapse into one gold chip "2×+" whose aria-label lists both.
## U-S3 Label and sound
- "+18% price" is approved (whole %, rounded down). At the cap it reads "MAX +40%".
- Cap sound defaults to ON (a short, soft chime once per reaching the cap, not looping) and always respects mute. There's no per-tap streak sound beyond the existing Collect sound, plus a subtle pitch step-up per 10% reached.
