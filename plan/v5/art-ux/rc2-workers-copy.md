# rc2 Workers copy: first-hire nudge, Shift sheet, welcome-back cause · Art & UX (UI/Visual Designer) · v1.2 · 2026-10-17 00:36 · v1.0 **SIGNED OFF by Head of Art & UX 2026-10-16 23:55**; §5 v1.1 SIGNED OFF 00:26; §5 v1.2 dismiss × SIGNED OFF 00:34
Sources: product/workers/rc2-first-hire-nudge.md (v1.0 approved + v1.2), rc2-refill-proposal.md v1.1 (labels, AC-RF2/RF3), rc1-b1-coop-full-spec.md AC-B10, art-ux/b1-coop-full-copy.md (signed off). Widths measured in Chrome (playwright-core, build woff2 fonts) under `flock .browser-test.lock`.
House number formats: money `$39.71` / `$1.2K` / `$999.9M`; time `12s`, `1m 05s`, `2m 30s` (≥60 s → `{m}m {ss}s`).

## 1. First-hire nudge hint (one line, same style as the B-1 hint: Nunito 700 14px, 336px line at 360)
| | String | Words | px | 360 |
|---|---|---|---|---|
| **Pick** | `Hire a Market Hand to sell` | 6 | 171 | ✔ |
| Alt 1 | `Hire Market Hand to sell eggs` | 6 | 195 | ✔ |
| Alt 2 | `Hire a seller: Market Hand` | 5 | 171 | ✔ |
Rejected: `Hire a Market Hand to sell for you` (8 words, 221px; fits but over the 6-word rule).
- Glyph: Workers nav icon 14px before the text (not ⚠: this is an opportunity, not a warning; ⚠ stays reserved for B-1). Colour `--c-wood-text` #8A5528 on cream (existing hint).
- Aria (whole hint is one button): `Hire a Market Hand to sell for you. Opens Workers.`; close button `Dismiss tip`.
- Matches B-1 structure (`Collect or refill Coop Hand`, 173px): verb first, worker named in full, no colon prefix.

## 2. New dot aria-label
`New: Market Hand available` → **`New helper: Market Hand can be hired`**. Testid unchanged `[data-testid="new-dot"]`. Dot is decorative (`aria-hidden` on the visual) and the label sits on the Upgrades nav button / Workers tab name: e.g. `Upgrades, new helper: Market Hand can be hired`. Not the red count badge.
(If QA's AC-FH1 must keep the literal, `New: Market Hand available` is acceptable; the change is optional.)

## 3. Shift sheet strings (rc2-refill-proposal v1.1)
Row layout at 360 (328px content): line 1 = name + state pill + at-risk; line 2 = full-width action button (280px).
| Key | String | Font | px | Notes |
|---|---|---|---|---|
| State pill 30–50% | `Refillable` | Fredoka 600 11px | 48 | amber pill like "Tired" (26px) |
| At risk | `⚠ $1.2K/s at risk` (worst `⚠ $999.9M/s at risk`) | Nunito 700 12px | 94 / 110 | ⚠ U+26A0 U+FE0E + text, never colour-only |
| Button, 0 charges | `Next charge in 12s` / `Next charge in 2m 30s` | Fredoka 700 14px | 115 / 140 | house time format; updates every 1 s |
| Button, >50% | `Rested, refill below 50%` | Fredoka 700 14px | 150 | disabled, secondary style |
| Button, ready | `Refill` | Fredoka 700 14px | 33 | primary |
All fit the 280px button and a ≥120px line-1 slot ✔.
- **At-risk token:** text + ⚠ in `--c-danger` #B83B37 on sheet `--c-cream` #FFF6E5 = **5.26:1** (on white 5.65:1), same as the B-1 hint. Rows with $0 at risk: `$0/s at risk` in `--c-muted` #6B5D52 (5.91:1), no ⚠.
- **Consistency with B-1:** the hint `Collect or refill Coop Hand` → the sheet button is `Refill` (same verb), the state is `Refillable`.
- **Aria:**
  - Row: `Coop Hand, Refillable, 42% energy. 1.2 thousand dollars per second at risk.` (suffixes spelled: K → thousand, M → million, B → billion; e.g. `$1.2K/s` → `1.2 thousand dollars per second`).
  - Button 0 charges: `Refill unavailable. Next charge in 2 minutes 30 seconds.` (aria-disabled="true").
  - Button rested: `Refill unavailable. Coop Hand is rested; refill below 50 percent.`
  - Ready: `Refill Coop Hand. Uses 1 charge.`
- QA note: AC-RF2 says `Next charge in {ceil(s)}s`; with the house format that becomes `Next charge in 2m 30s` above 59 s; the AC regex should accept both forms.

## 4. Welcome-back cause line (AC-B10; card 320px, content 268px at 360; `.wb-sold` style 400 14px/1.35 Nunito, #6B5D52 on cream 5.91:1)
| | String | Lines @268px (px per line) |
|---|---|---|
| **Pick** | `Coop Hand dozed off and the coop filled.` ⏎ `Refill to keep earning.` | 2 (256 / 137) ✔ |
| Alt 1 | `Coop Hand napped, coop filled.` ⏎ `Refill to keep earning.` | 2 (249 / 84 when run-on) ✔ |
| Alt 2 | `Coop Hand took a nap and the coop filled.` ⏎ `Refill to keep going.` | 2 (263 / 125) ✔ (263 leaves only 5px; risky in other engines) |
Placeholder `Your Coop Hand fell asleep. Coop filled up.` = 268px, exactly the box (1 line, no margin).
- Break between sentences with a `<br>` (or two spans, display:block) so the fix is always line 2.
- Blame-free: the worker "dozed off" (not "you let"), and the line points at the fix with the same verb as the hint (`Refill`).
- Prefix glyph 💤 not used here (the card already has the hero number); the Asleep banner on the card carries the icon.
- Aria: same text, read as one sentence: `Coop Hand dozed off and the coop filled. Refill to keep earning.`

## 5. L25 hire nudge (v1.1 signed off 00:26, v1.2 signed off 00:34; product/farm/l30plus-spec.md L30-19b)
- Trigger: Farm at L25 and 0 workers hired. Precedence (one hint line at a time): coop-full > this nudge > UC25 > M4 hints.
- Placement: hint line under the Farm upgrade card's Buy button, alongside the New dot (new dot on Upgrades nav / Workers tab, as §2).
- Copy: `Busy farm! · Hire a worker ›` (non-breaking spaces around `·`; `›` U+203A chevron glyph). Worker icon (Workers nav icon) 14px + 4px gap before text.
- Aria (whole hint is one button): `Your farm is busy. Hire a worker. Opens Workers.` New dot aria: `New: workers can be hired` (e.g. `Upgrades, new: workers can be hired`).
- Style = UC25 (rc1-upgrade-clarity-spec UC25 / mock `.hint.link`): Nunito 700 12px/16px, `--c-wood-text` #8A5528, 44px hit area (`::before` inset −14px 0 on 16px line), tap opens Workers.
- Width at 360: hint box = Farm card text column **240px** (360 − 2×12 frame − 2×(12 pad + 2 border) − 56 icon − 12 gap). Text **152px** + icon 18px = **170px** → **fits one line ✔** (70px spare). Measured from Nunito 700 woff2 advance widths (build font, fontTools); Chrome/playwright confirmation `mocks/l25-nudge-measure.cjs` queued on the browser lock (see status).
- Fallback (if ever < 170px, e.g. larger text settings): drop `Busy farm! · ` first → `Hire a worker ›` (83px + 18 = 101px). Never truncate or ellipsize; never drop `›`; wrap to 2 lines only as a last resort.
- Contrast: text #8A5528 on white card 6.16:1, on cream #FFF6E5 5.74:1 (≥4.5 ✔). Icon in same colour ≥3:1 ✔. Not a warning: no ⚠, no colour-only signal.


### 5a. Dismiss × (v1.2, signed off 00:34; per-session dismiss per HoP 00:04)
- A separate sibling button, NOT nested in the hint button. The hint remains one button → opens Workers.
- Glyph ×, 12px, --c-wood-text #8A5528, in a 44×44 hit area, flush right in the hint row; 8px gap between the hint and × hit areas (no overlap).
- aria-label: `Dismiss hire hint`. After dismiss, focus moves to the Farm Buy button. Hidden for the rest of the session.
- Width maths at 360: hint 170 + gap 8 + × 44 = 222px. Measured build row is 224px (not 240; corrected 00:44 from PR #12 @ 282e7b2): fits with 2px spare. 1280 docked row is 262px.
- Drop rule: reserve 52px (× 44 + gap 8) first; if the remaining width < 170px, drop `Busy farm! · ` (leaves `Hire a worker ›`). Never squeeze or drop the ×; never ellipsize; › never dropped.

## Changelog
- v1.2 (2026-10-17 00:36): §5a dismiss × (sibling 44px button, 8px gap, 52px reserve in drop rule). SIGNED OFF 00:34.
- v1.1 (2026-10-17 00:40): added §5 L25 hire nudge (copy, aria, New dot aria, UC25 style, 360 width 170/240px). PENDING sign-off.
- v1.0 (2026-10-17 00:10): signed off 23:55.

## Sign-off rulings (2026-10-16 23:55, Head of Art & UX)
- Nudge final: "Hire a Market Hand to sell".
- The Shift sheet spec width is 328px (360 minus 16px on each side).
- AC-RF2 must accept the "2m 30s" format as well as "{N}s"; sent to the UI QA engineer.

## §6 Worker status banners (SIGNED OFF by Head of Art & UX 2026-10-17 07:19; aria always uses the full string with the role name)
Rule: name the role first (PM Workers ruling (a)), then a colon and the effect. Use the SVG icons (moon = asleep, warning = unpaid), not emoji glyphs (see the ⏱ emoji failure on PR #16). Icon 14px; text Nunito 700 12px minimum; the banner never wraps. If it doesn't fit at 360, drop the role name first.
| State | Copy | Aria |
|---|---|---|
| Asleep, sales (Market Hand) | Market Hand asleep: sales stopped | Market Hand is asleep. Auto-sales have stopped. |
| Asleep, sales (Hawker) | Hawker asleep: sales slowed | Hawker is asleep. Sales are slowed. |
| Asleep, collect | Coop Hand asleep: collecting stopped | Coop Hand is asleep. Auto-collecting has stopped. |
| Asleep, Grader | Grader asleep: bonus down to N% | Grader is asleep. Bonus down to N percent. |
| Unpaid, sales (Market Hand) | Market Hand unpaid: sales stopped | Market Hand is unpaid. Auto-sales have stopped. |
| Unpaid, sales (Hawker) | Hawker unpaid: sales slowed | Hawker is unpaid. Sales are slowed. |
| Unpaid, collect | Coop Hand unpaid: collecting stopped | Coop Hand is unpaid. Auto-collecting has stopped. |
| Unpaid, Grader | Grader unpaid: bonus down to N% | … |
| True zero, asleep | {Role} asleep: production stopped | … |
| True zero, unpaid | {Role} unpaid: production stopped | … |

Amended 2026-10-24 16:52 (D-HOP-2026-10-24-14): Market Hand Asleep/Unpaid reads 'sales stopped' because live auto-sales are 0. Hawker keeps 'slowed'. A Market Hand stall never uses 'production stopped'. At 360 the role-drop rule gives 'Asleep: sales stopped'.

Amended 2026-10-24 16:57: Coop Hand Asleep reads 'collecting stopped' (its share is 0 in M5.0). Unpaid Coop Hand also reads 'collecting stopped' (confirmed true 0, workers.ts isOff).
