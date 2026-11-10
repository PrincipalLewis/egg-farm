# B-1 Coop full: final copy + styling · Art & UX (UI/Visual Designer) · v1.0 · 2026-10-16 19:45 · **SIGNED OFF by Head of Art & UX (2026-10-16 19:44)**
Spec: product/workers/rc1-b1-coop-full-spec.md v0.1, rules 2, 4, 5 (rc1 must-fix, owner PM Workers). Repro: qa/m3-recheck/cut-a-1371305.md B-1. Pattern: rc1-upgrade-value v1.4 §7 asleep/unpaid banner (`--c-danger` = `var(--c-barn-ui)` #B83B37, white bold text, glyph ⚠ + text; never colour-only).
Measurements: real build fonts (game/public/fonts Fredoka 700 / Nunito 700 woff2 → PIL), ±2px.

## 1. One label everywhere: `⚠ Full!`
Used on both the coop badge and the top-bar rate chip. No new badge: the existing coop `Full!` badge is reused.
- Glyph: `⚠` as U+26A0 + U+FE0E (text presentation, inherits `color:#fff`; never the colour emoji), `aria-hidden="true"`; then 3px gap, then `Full!`. Same structure as the asleep banner: `[glyph][text]` on `--c-danger`.

## 2. Coop badge (reuse `.fullbadge`, game/src/ui/styles.css:81, app.ts:68 `#full`)
- Markup: `<div class="fullbadge" id="full" hidden><span aria-hidden="true">⚠&#xFE0E;</span> Full!</div>`. Same show rule (`atCap`, app.ts:431).
- Style unchanged: bg `--c-barn` → **set to `--c-danger`** (both resolve to #B83B37 in the build, so it's a token rename, not a visual change), text #FFFFFF, Fredoka 700 12px, padding 2px 8px, pill. White on #B83B37 = **5.65:1 ✔ AA**.
- Width: `Full!` 24px + ⚠ ≈ 11px + 3px gap + 16px padding ≈ **54px** (was ~40px). Still inside the coop box; QA should add it to the live-rect check (m4-timed-collectible.md line 66).
- Variants (same badge, ⚠ always first):
  - **Frenzy (price ×2, m4-timed-collectible T8 / spec line 54):** "Full!" unchanged, no gold tint → `⚠ Full!` identical; the gold 2× chips sit on prices, not on this badge.
  - **Collect streak (m4-collect-streak K3):** taps credit normally, badge unchanged → `⚠ Full!` identical, streak bar keeps its own colours.
  - **Reduced motion:** `wiggle` off (existing `.rm` rule); ⚠ + text carry meaning.

## 3. Top-bar rate chip (game-rc1-ui src/ui/app.ts:62 `#rate`, styles.css:473)
- Markup: `<span class="rate num" id="rate" …>−$1.25/s</span><span class="ratechip" hidden><span aria-hidden="true">⚠&#xFE0E;</span> Full!</span>` inside `.coins-col`, on the rate line (inline, gap 4px). Number stays visible (rule 2).
- `.ratechip{display:inline-flex;align-items:center;gap:3px;height:14px;padding:0 6px;border-radius:var(--r-pill);background:var(--c-danger);color:#fff;font:700 11px/14px var(--f-display);white-space:nowrap;vertical-align:1px}`. White on #B83B37 **5.65:1 ✔**.
- The rate number itself keeps the existing sign colours (neg #B83B37 on white **5.65:1 ✔**, zero #6B5D52 **6.34:1 ✔**); the chip carries ⚠, so the red number is never the only signal.
- **Fit at 360:** chip = 22 (`Full!` 11px) + 10 (⚠) + 3 + 12 ≈ **47px**. Rate worst `+$1.23M/s` 53px (`−$1.25/s` 44, `+$39.71/s` 50). Line = 53 + 4 + 47 = **104px**. Coins pill = 4 pad + 32 icon + 8 gap + 104 + 12 pad + 4 border = **164px**. HUD: 12 + 164 + 8 + 88 (basket min) + 8 + spacer + 8 + 44 (settings) + 12 = **344px ≤ 360 ✔ (16px spare)**. Coin value line (`$1.23M` Fredoka 18 = 54px) is narrower than the rate line, so it doesn't widen the pill. No wrap, nothing ellipsised. 375/1280 have more room.

## 4. Hints (one line at 360, Nunito 700 14px, ≤4 words + proper noun)
Style = existing hint line: `⚠` 14px + 4px gap + text; text `--c-danger` #B83B37 on `--c-cream` #FFF6E5 = **5.26:1 ✔** (on white 5.65:1). "Coop full" prefix dropped: the badge and chip already say it.
| Case (spec rule 4 / AC-B4) | String | Text px | +⚠ = total | 336px line |
|---|---|---|---|---|
| Before F7, or Coop Hand working/tired | `⚠ Collect eggs` | 81 | ~99 | ✔ |
| Coop Hand unlocked, not hired (best-payback pick) | `⚠ Collect or hire Coop Hand` | 168 | ~186 | ✔ |
| Coop Hand asleep or unpaid | `⚠ Collect or refill Coop Hand` | 173 | ~191 | ✔ |
Placeholders measured for reference: `Coop full: collect eggs or hire a Coop Hand` 278px, `…or refill your Coop Hand` 305px (fit, but 2 words over and repeats the chip).
Word count: "Collect or hire Coop Hand" = 4 words with "Coop Hand" as one name. Alternates if the 4-word rule is strict: `⚠ Collect or hire helper` (137px) / `⚠ Collect or refill helper` (143px); weaker, as "helper" doesn't name the worker.

## 5. Aria
- Rate (`#rate` aria-label): `Net income minus $1.25 per second. Coop full.` / `Net income plus $39.71 per second. Coop full.` / `Net income zero per second. Coop full.` (sentence break so SRs pause; number spoken exactly as T6 requires.)
- Coop badge: the ⚠ span is aria-hidden; visible text reads "Full!". Add `aria-label="Coop full"` on `#full`.
- Hints: read as `Collect eggs.` / `Collect eggs or hire a Coop Hand.` / `Collect eggs or refill your Coop Hand.` (fuller SR text via aria-label; visible text stays short).
- The ⚠ glyph is never announced ("warning sign" noise).

## 6. Tokens summary
| Element | Token | Hex | Text | Contrast |
|---|---|---|---|---|
| Coop badge bg | `--c-danger` (= `--c-barn-ui`) | #B83B37 | #FFFFFF | 5.65:1 |
| Rate chip bg | `--c-danger` | #B83B37 | #FFFFFF | 5.65:1 |
| Rate number, negative | existing `.rate[data-sign=neg]` | #B83B37 on #FFFFFF | — | 5.65:1 |
| Rate number, zero | existing `--c-muted` | #6B5D52 on #FFFFFF | — | 6.34:1 |
| Hint text + ⚠ | `--c-danger` on `--c-cream` | #B83B37 / #FFF6E5 | — | 5.26:1 |

## 7. Open
- The build's `.fullbadge` uses `--c-barn` while the style guide's illustration Barn Red is #D9534F (white text 3.9:1, fails). In the build `--c-barn` resolves to #B83B37, which passes. Switching it to `--c-danger` prevents a future regression.
- PM Collection to confirm the coop-full state flag (spec rule 2); copy doesn't depend on it.

## Changelog
- v1.0 2026-10-16 19:45 written. 19:44 sign-off: 'Coop Hand' counts as one name (4-word rule met), hints kept as §4, `.fullbadge` switches `--c-barn` → `--c-danger`.

### Aria amounts (2026-10-16 20:55, Head of Art & UX)
Spoken amounts spell out the abbreviation suffix: `$12.3K` is read as "$12.3 thousand", M as "million", B as "billion". Example: `Net income minus $12.3 thousand per second. Coop full.`
