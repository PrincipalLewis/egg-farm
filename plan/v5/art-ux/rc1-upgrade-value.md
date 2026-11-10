# rc1 Upgrade value: effect + payback + "Best buy" (UI-only) · Art & UX · v1.6.1 · 2026-10-16 21:15 (v1.6 SIGNED OFF 19:44; v1.6.1 SIGNED OFF 21:11) (layout+copy only; logic = PM rc1-upgrade-clarity-spec.md)
Owner: Head of Art & UX. Co-owner (copy/rules confirm): PM Farm Upgrades. Build: Engineering. Target: **rc1**. No data changes.
Sources: layout-spec.md §4.5/§4.6b/§4.6c, m3-next-goal-spec.md §1/§4, style-direction.md (M3 AA tokens), product/farm/f1-nonfarm-tweak.md (Collection = best buy 43–46%; recommends UX fix, no data tweak), income model in product/farm/f1_nonfarm.py `inc()` / product/economy_sim.py, values from balance.json ← economy.csv (live F1 table).

## Problem
Vadim felt only Farm is worth buying. Economy: Collection is the best buy 43–46% of purchases. The rows show `current → next` values but never say *how much income* a level adds or *how fast it pays back*, and the next-goal strip picks the **cheapest** upgrade, not the best one. Fix = tell the player value, and point at the best one.

## 0. Source of truth
**All logic is PM Farm Upgrades' product/farm/rc1-upgrade-clarity-spec.md** (income model, gain, single-step payback, bundle best buy = Economy `best_roi`, no hint window and no cheapest fallback (v1.2), 5 s refresh, GoalHold, telemetry, ACs UC1–UC10). This doc only supplies **layout, styling and exact copy** for its "Art & UX to confirm" list. Nothing here redefines payback or highlight logic.

## 1. Tokens (all defined in style-direction.md "rc1 tokens"; no ad-hoc hex)
| Token | Value | Use | Contrast |
|---|---|---|---|
| `--c-meadow-text` (NEW) | #2F6B27 | effect chip text | 5.68:1 on `--c-meadow-tint` |
| `--c-meadow-tint` (NEW) | #E8F4E4 | effect chip bg | — |
| `--c-danger` (NEW alias) | `var(--c-barn-ui)` #B83B37 | asleep/unpaid banner + badge bg | white text 5.65:1 |
| `--c-text` | #3E2C23 | payback / Best buy / Ready! chip text | 12.31:1 on `--c-cream`; 8.6:1 on `--c-yolk` |
| `--c-muted` | #6B5D52 | `No gain yet` chip text, ETA hints | 5.91:1 on `--c-cream`, 6.34:1 on white |
| `--c-cream` | #FFF6E5 | payback / No-gain chip bg | — |
| `--c-yolk` | #FFC93C | Best buy chip bg, Ready! chip bg | — |
| `--c-yolk-dark` | #F29E1F | Best buy card outline (2px) | decorative; meaning carried by chip text |
| `--c-focus` | #2B79A8 | keyboard focus ring only (3px) | — |
(v1.4 removes `--c-surface-2` / `--c-text-muted`, which never existed, and the hex #FFF6E0 → `--c-cream`.)

## 2. Row layout (reuses §4.5 card, chip pill, glow)
Order: fx (before→after) list → chip block → `Level L/max` meta → Buy → hint line(s). Chips (`.vchip`) = the 2× / +18% pill: 20px tall, 12px Nunito 800 (700 acceptable), pill radius, padding 0 8px, gap 4px, `white-space:nowrap`, `pointer-events:none`.
- **Effect chip:** `--c-meadow-text` on `--c-meadow-tint` (5.68:1).
- **Payback chip:** `--c-text` on `--c-cream`, 1px `--c-slot-outline` border, 12px clock icon (`icon-offline-earnings.svg`).
- **No gain chip** (zero/negative gain): `No gain yet`, `--c-muted` on `--c-cream`, no icon.
- **Best buy marker:** chip `★ Best buy` (`--c-text` on `--c-yolk`, 8.6:1) + **2px `--c-yolk-dark` card outline**, offset 2px + the affordable glow when affordable. The 3px `--c-focus` ring stays for keyboard focus only, so the two never look alike (both can show at once: focus ring outside, offset 5px).
- **Unaffordable hint** under Buy (Collection and Farm, PM UC8): build string `Affordable in ~m:ss` (fmtAffordableIn: `Affordable in a moment` < 10 s, `Affordable in ~1:05`, `Affordable in ~1:59:00` ≥ 1 h, `Affordable in —` no income), 12px Nunito 700 `--c-muted`, clock 14px, min-height 16px.
- **"Limited by collecting" link** (Farm row, PM UC12; replaces "Limited by coop · Upgrade Farm →"): 2nd hint line, visual 16px, `--c-wood-text` 12px 700 + 14px `icon-nest.svg` + chevron `›`. Whole line is one `<button class="link">`; the 44px hit area comes from `padding-block:14px; margin-block:-14px` (visual line stays 16px). Safe because the ETA line above always reserves 16px (hidden attr keeps space) and the hint block has 12px bottom padding, so the expanded box never overlaps Buy or the next card; Buy keeps `z-index:1` over it anyway. SR: "Limited by collecting. Go to Collection upgrades."
- Workers/Grader cards: same chip block under the card title.

## 3. Exact strings
| Key | String | Example |
|---|---|---|
| Effect | `+X% income` | `+8% income`, worst `+999% income` |
| Effect fallback (income now ≤ 0) | raw effect | `+5 eggs/tap` |
| Payback | `Pays back in ~{F7}` (fmtTimeToAfford words, PM UC3) | `Pays back in ~1 min 12 s`, worst `Pays back in ~1 h 59 min` |
| Bundle payback | `With next buys: ~{F7}` | `With next buys: ~3 min 11 s` |
| No bundle value, Farm | `Unlocks more customers` (12px `icon-customer.svg`) | — |
| Zero/negative gain | `No gain yet` | — |
| Best buy | `★ Best buy` | — |
| Raw effects (fx line; all widths incl. 360/375/390) | `+12% egg price` · `+N eggs/tap` · `+N eggs/s` | — |
| Card ETA | `Affordable in ~m:ss` (build fmtAffordableIn) | `Affordable in ~1:05` |
| Next-goal label | `★ {Track} L{n}` + `· +X% income` | `★ Collection L5 · +8% income` |
| Next-goal status | Ready → **`Ready!` chip** (`--c-text` on `--c-yolk`, 20px pill); waiting → short `~m:ss`, ≥ 1 h `~1h 59m`; no income `—` | `~1:05`, `~1h 59m` |
| a11y (row) | "{Title}, level {n}. Adds {X} percent income. Pays back in about {t long}. Best buy. Buy for {cost}." | — |
There is **no cheapest fallback label** (void since v1.2): the strip always shows the PM best-buy target; with no candidates it shows m3 *Done*.

## 4. Next-goal label: never truncated (v1.6, Product C-AC26b, product/decisions.md:107)
Label box: **188px** per line at 360 (v1.6.1; was assumed 200px). Measured in Chrome with the build's @font-face (Fredoka 500/700 woff2) at `600 14px Fredoka`, the live `.goal-label` font (v1.6.1; v1.6 used PIL). Gain span ` · +999% income` = 89px; `★ ` = 11px.
Markup: `<span class=g-star>★ </span><span class=g-track>Collection L30</span><span class=g-gain> · +999% income</span>`. **No ellipsis anywhere in the goal label; ★ is kept.**
Overflow steps, in order (Engineering checks `scrollHeight`/`scrollWidth` on render, not per tick):
1. **One line** if it fits the 188px box.
2. **Wrap to 2 lines:** break only before `.g-gain` (`.g-star`+`.g-track` together, `.g-gain{white-space:nowrap}` as an unbreakable unit). CSS: `.goal{height:auto;min-height:var(--goal-h)}` `.goal-label{white-space:normal;overflow:visible;text-overflow:clip;line-height:17px}` (≤2 lines = 34px, fits the 40px strip; the status column stays vertically centred).
3. **Short track name: last resort only.** The full name always wins when it fits on 1 or 2 lines; switch to the short name (table below) only if 2 lines still don't fit (e.g. larger user font size or longer locales); keep 2 lines.
Replaces v1.4 steps (hide ★ → short → ellipsis). Ellipsis now applies **only to effect lines** (`.fx li`, §5).

| Track / tier | Short name | Full track px | Full label px (`★ … · +999% income`) | Full @188 | Short track px | Short label px (no ★) | Short @188 |
|---|---|---|---|---|---|---|---|
| Farm | `Farm` | 59.3 | 172.6 | 1 line | 59.3 | 156.8 | 1 line |
| Collection | `Coll.` | 91.8 | 205.1 | **2 lines** | 55.2 | 152.7 | 1 line |
| Hens | `Hens` | 58 | 171.3 | 1 line | 58 | 155.5 | 1 line |
| Egg value | `Egg val.` | 89.2 | 202.5 | **2 lines** | 77 | 174.5 | 1 line |
| Market Hand | `M. Hand` | 81.2 | 194.5 | **2 lines** | 50.3 | 147.7 | 1 line |
| Coop Hand | `C. Hand` | 67.9 | 181.2 | 1 line | 47.8 | 145.3 | 1 line |
| Hawker | `Hawker` | 47.5 | 160.8 | 1 line | 47.5 | 145 | 1 line |
| Grader tier 1 | `Grader T1` | 79.7 | 193 | **2 lines** | 62.3 | 159.8 | 1 line |
| Grader tier 2 | `Grader T2` | 82.4 | 195.7 | **2 lines** | 65 | 162.4 | 1 line |
| Grader tier 3 | `Grader T3` | 82.3 | 195.6 | **2 lines** | 65 | 162.4 | 1 line |
| Grader tier 4 | `Grader T4` | 82.1 | 195.4 | **2 lines** | 64.8 | 162.2 | 1 line |
| Grader tier 5 | `Grader T5` | 81.3 | 194.6 | **2 lines** | 64 | 161.4 | 1 line |
Notes (v1.6.1, Chrome-measured): label box at 360 = **188px** (live build, QA goal-*.json), line height = **17px** (`600 14px Fredoka`, `line-height:normal`; Chrome resolves 600 → the 700 face), so 2 lines = 34px inside the 40px strip; no strip growth needed. Gain span ` · +999% income` = 94.2px, `★ ` = 12.6px. Levels shown as worst case `L30`; QA's live check of `★ Egg value · +999% income` (no level) = 176px, which matches this method (±0.1px).
**Wrap at 360 (full name, >188px): Collection L30 (205), Egg value L30 (203), Market Hand (195), Grader tier 1–5 (193–196).** One line: Farm L30, Hens L30, Coop Hand, Hawker. Every wrapped label fits on 2 lines (line 1 ≤ 104px, line 2 = 94px), so **no short name is ever needed at 360**; short names stay last resort only.
The build's `.goal-label` (game/src/ui/styles.css:224 and :383) currently has `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`; v1.6 needs both rules changed, and `fitGoalLabelEl` updated to drop the ellipsis step.

## 5. Widths
- **360** (col 2 = 236px): `+999% income` ≈ 84px + `★ Best buy` ≈ 76px ✔; `With next buys: ~1 h 59 min` ≈ 206px ✔. Goal status column 72px: `~1h 59m` ≈ 50px, `Ready!` chip ≈ 52px ✔ (the long F7 form is not used in the status).
- **375 / 390** (col 2 = 251px / 266px): same wrap as 360. Mock: mocks/rc1-upgrade-value-375.png.
- **Effect line on phones (v1.5):** the fx (before→after) effect line stays visible at 360/375/390, matching the build (`.fx` in game/src/ui/styles.css has no width-based hide; `white-space:nowrap` + per-`li` ellipsis). It is never hidden below 960; long values ellipsize at the end of the line. Build note: `text-overflow:ellipsis` on the whole `li` cuts from the right, so the after-value is what gets cut first; nothing in the build protects it. Protecting it would need a build change (e.g. ellipsize only the before-value span), which is not part of v1.5.
- **≥ 960 docked:** one chip line (effect · raw effect · payback · Best buy); Buy right-aligned 160px.
- Tap targets: Buy ≥ 48px, goal 44px, link 44px (above), Refill ≥ 44px (§7). Reduced motion: glow static.

## 6. States (display only; conditions per PM spec)
| State | Effect | Payback | Best buy | Buy |
|---|---|---|---|---|
| Affordable | ✔ | ✔ | if target (chip + yolk outline + glow) | meadow glow |
| Unaffordable | ✔ | ✔ | if target (chip + outline, no glow) + `Affordable in ~m:ss` | disabled |
| Gain 0, bundle/customers | ✔ (or raw) | bundle / customers string | per PM | normal |
| Negative gain (wage) | raw effect | `No gain yet` | never | normal |
| Maxed L30 | hidden | hidden | never | `--c-yolk` MAX pill (`--c-text`, 8.6:1); was "gold" |
| Locked | hidden | hidden | never | locked row |

## 7. Asleep / Unpaid worker (product/workers/rc1-asleep-state-spec.md)
- **Nav badge:** the build nav (`nav.actions`, game-rc1-ui app.ts:81–85) is Market · Upgrades · [Refill, conditional] · Farm. **There is no Workers nav button**; Workers is a tab inside Upgrades (app.ts:73). So: count badge on the **Upgrades** nav button (existing `.badge` slot), 18px min, `--c-danger` bg, white 12px Fredoka count (5.65:1), top-right; plus the same badge on the **Workers tab** inside the Upgrades panel. When the asleep count is 0, Upgrades falls back to the existing affordable dot. Pulse once on first appear (spec (a)); reduced motion = none. *PM Workers: spec line 8 "Workers nav tab" should read "Upgrades nav button + Workers tab" (not edited by Art & UX).*
- **Card banner:** full-width top strip, 32px, `--c-danger` bg, white 14px Nunito 800 + 💤 (⚠ for Unpaid): "Asleep, production stopped" / "Unpaid, production stopped" / Grader "Asleep, bonus down to 15%". Fits 336px at 360 ✔.
- **Dim:** card body children at `opacity:.5` **except the banner and the Refill button** (both 100%, so banner text keeps 5.65:1).
- **Refill button:** `min-height:44px; min-width:88px` (visual unchanged if smaller: inner span + padding).
- Mock: mocks/rc1-asleep-card-360.png.

## 8. HUD income/s
Exists in build: `#rate` under coins (app.ts:62, "$0/s", role=status). AC-R5 "income/s comes back" is verified there. No new element.

## 9. ACs (Art & UX layer, on top of PM UC1–UC12)
- UV-1 Strings match §3 exactly (case, ~, spacing, ★, `Affordable in ~m:ss`).
- UV-2 No clipping at 360×640, 375×667, 1280×720 for the §5 worst cases; goal label follows §4 (gain span never truncated).
- UV-3 Chip/banner/badge text ≥ 4.5:1 with the §1 tokens; Best buy visible in greyscale.
- UV-4 At most one Best buy chip + yolk outline; focus ring is visibly different (3px blue).
- UV-5 Link, Refill, Buy, goal hit areas ≥ 44px (`getBoundingClientRect`).
- UV-6 Asleep badge on Upgrades nav + Workers tab; card dim excludes banner and Refill.

## 10. Open questions
1. PM Workers: update asleep spec wording (nav badge location, §7).
2. Engineering: `.vchip` + tokens in rc1 Cut A.
Mocks: mocks/rc1-upgrade-value-{360,375,1280}.png, mocks/rc1-asleep-card-360.png (source mocks/*.html).

## v1.6.1 (2026-10-16 21:15), §4 re-measured — SIGNED OFF by Head of Art & UX 2026-10-16 21:11
Label box corrected to 188px (QA screenshot check 20:40); all widths re-measured in Chrome at the live `600 14px Fredoka`; line height 17px (2 lines = 34px, no strip growth). Now wrap: Collection L30, Egg value L30, Market Hand, Grader tier 1–5 (Egg value and Market Hand/Grader were 1-line in v1.6). Short names still never needed at 360. Rule unchanged.

## v1.6 (2026-10-16 19:55), goal label never truncated
§4 rewritten per Product C-AC26b (product/decisions.md:107): one line → wrap to 2 lines (break before gain) → defined short track name. ★ kept; ellipsis removed from the goal label, kept only for effect lines. Short-name table with measured px at 360. SIGNED OFF by Head of Art & UX (2026-10-16 19:44). Short names are a last resort only.

## v1.5 (2026-10-16 19:30), phones keep the effect line
Effect (fx before→after / raw effect) line visible on phones 360/375/390 too, not 960+ only; matches build `.fx` (no media hide). §3 raw-effects row + §5 widths updated. Pending Head of Art & UX sign-off.

## v1.4 (2026-10-16 14:30), UX review fixes
Effect chip → `--c-meadow-text` #2F6B27 (5.68:1; 5.3 was wrong, real 4.32); `--c-danger` alias; Best buy outline = 2px yolk-dark (not focus blue); cheapest fallback removed; ETA = build `Affordable in ~m:ss`; goal status short `~m:ss`/`~1h 59m` + `Ready!` chip; goal truncation §4; link 44px hit; Upgrades nav badge (no Workers button); Refill ≥44px; dim excludes Refill+banner; fake tokens replaced; "gold" → `--c-yolk`.

## History (superseded by v1.4 wherever they conflict)
### v1.2 (2026-10-16 13:52) additions
- Zero/negative-gain worker: payback chip replaced by `No gain yet`, same pill, muted (--c-text-muted on --c-surface-2, >=4.5:1), no icon, no % shown, card never hidden. 12px Nunito 800, ~78px wide; fits the 236px chip row at 360 alongside the effect chip. Screen reader: "No gain yet."
- Coop link (now targets Collection): label `Limited by collecting` with existing chevron link style; tap target >=44px. Screen reader: "Limited by collecting. Go to Collection upgrades."
- Hint: no 60s window; goal label `★ {Track} L{n} · +X% income` + existing `Affordable in ~…` ETA. 5s re-pick, switch only at >=10% better payback (PM spec).

### v1.3 (2026-10-16 14:00), Eng questions
- v1.2 + PM spec are binding; the 60 s window and fallback are void.
- ETA string: `Affordable in ~…` (the existing build string) everywhere; it replaces "Affordable in ~…" in this file and the mocks.
- Card order: fx line → chips → `Level L/max` meta → Buy.
- New `.vchip` is OK; muted chips use `--c-muted`; synthetic bold is acceptable for rc1 (use Nunito 700 if shipped).
- Asleep/Unpaid (product/workers/rc1-asleep-state-spec.md): the badge goes on the Workers button in the bottom nav, top-right corner, red with white count, min 18px. The card banner reuses the existing card: full-width strip at the top of the card, red fill with white 14px text plus a 💤 icon (a ⚠ for Unpaid), so it isn't colour-only. The rest of the card is at 50% opacity, and the Refill button stays full opacity. No separate mock is needed.
