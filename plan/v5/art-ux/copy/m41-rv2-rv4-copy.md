# RV-2a/b and RV-4 copy (Head of Art & UX, 2026-10-19 10:50), for product/farm/m4b-rv-rootcause.md. M4.1 if HoE/HoQA fit it before 17:15, otherwise M4.2.

## RV-4 Farm-tab balance strip (one line at 360 px, Nunito 14, ≤296 px)
Lead with the bonus (so it reads as a bonus, not a count), then say the rule (PM's option 3). The N/5 counter is dropped.
| State | Visible | Chars |
|---|---|---|
| Working toward next | `Balance +10% · all 3 at L10 → +15%` | 34 |
| k = 0 | `Balance bonus · all 3 at L5 → +10%` | 34 |
| Top tier | `Balance bonus +30% (max)` | 24 |
| Toast | `Balance bonus now +15% income` | 29 |
Aria (strip): `Balance bonus: plus 10 percent income. Get Farm, Hens and Egg value all to level 10 for plus 15 percent. Weakest: {track}.` (keeps today's "Weakest" part). Toast aria: same as visible, with "percent" spelled out.
Values come from data (tier levels and %). NBSP between L and n, and around → and ·. The UI/Visual Designer measures the worst case (`Balance +25% · all 3 at L25 → +30%`, 34) at 360 in 3 engines.

## RV-2a one ETA formatter (bubble, Farm card, track cards)
One formatter, `fmtTimeToAfford`, everywhere; `fmtAffordableIn` and "Affordable in a moment" are retired.
- < 60 s: `~{s} s` (ceil, counts down to `~1 s`; no "a moment").
- 60 s – 59:59: `~{m}:{ss}`.
- ≥ 1 h: `~{h} h {mm} m`.
- Income ≤ 0: `—` (B-1 rule 3).
- Card label, every card: `Ready in {eta}` (the track cards drop "Affordable in"). Affordable now: no ETA; the Buy button's enabled state says it.

## RV-2b bubble status wording
The clash comes from the word "Ready" meaning two things. The bubble no longer says "Ready!".
- Bubble target affordable: `{label} · Buy now`.
- Bubble target not affordable: `{label} · ~13 s` (same formatter).
- The bubble always names its target (it already does via the F4 label), so "Collection L11: +5/tap · Buy now" next to a Farm row reading "Ready in ~13 s" reads as two different things, not a contradiction.
- Aria: `Next goal: Collection level 11, plus 5 per tap. You can buy it now.` / `… Ready in about 13 seconds.`
- The status suffix is outside the F4 label's 27-char budget and is never truncated.
The picker rule (RV-2c wait rule) stays M4.2 with HoP; this copy works with either rule.
