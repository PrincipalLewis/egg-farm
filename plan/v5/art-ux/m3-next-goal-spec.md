# M3 Next-goal hint strip (AC5) — Art & UX · **v1.0.1** (v1.0 frozen 2026-10-15; v1.0.1 = tap-target correction only, QA D5)

## Changelog
- v1.0.1 (2026-10-16): **D5 fix** (spec error, Low for rc0, fix in rc1): the portrait `button.goal` hit area is `min-height:44px` (was 40px, below the 44px standard). The visual pill stays 40px (2px transparent padding-block, pill drawn on an inner span), so the look and layout are unchanged: 44 + 4px margin-bottom = the same 48px row budget.
Source: product/m3-proposal.md **M3-AC5**: "A 'next goal' hint (the cheapest useful upgrade or the next unlock) is always visible. No dead zone longer than 2 min without an affordable action or a visible countdown." Goal sources: product/economy.md (Collection, Farm), product/workers/m2-proposal.md v1.1 (hires, Grader tiers). All costs/effects read from config; nothing hard-coded.

## 1. Goal-selection rule (deterministic)
**Candidates** (every purchase that raises income or capacity, i.e. "useful"):
| Key | Candidate | Exists when |
|---|---|---|
| FARM | Farm L→L+1 | F < 30 |
| COLL | Collection C→C+1 | C < 30 |
| W1 / W2 / W3 | Hire Market Hand / Coop Hand / Hawker | unlocked (F ≥ 3 / 7 / 8) and not hired |
| W4 | Next Egg Grader tier | its tier level reached (F ≥ 18/19/21/22/24) and not bought |
Manage / Manage all are not candidates (no cost, not upgrades).

**Selection, evaluated in this order:**
**rc1 (2026-10-16): steps 1–2 are replaced by the PM best-buy rule (product/farm/rc1-upgrade-clarity-spec.md, Economy `best_roi`, 5 s re-pick + GoalHold). No cheapest fallback. Label `★ {Track} L{n} · +X% income` (rc1-upgrade-value.md §3–4). Steps 3–4 (unlock suffix, Done) and the tie order stay.** Legacy M3:
1. **Affordable useful upgrade:** A = candidates with coins ≥ cost. If A is non-empty → target = **cheapest in A** (state *Ready*).
2. **Otherwise, nearest with countdown:** target = **cheapest candidate overall** (with one shared income rate this is also the shortest time-to-afford) (state *Waiting*, or *No income* if rate = 0).
3. **Next unlock** is shown as a suffix on a FARM target when F+1 unlocks something (see §2). "Next unlock" is therefore always visible when Farm is the target, and Farm is always a candidate until F30.
4. **No candidates** (F30, C30, all hired, all Grader tiers) → *Done* state.
**Tie-break** (equal cost): FARM > COLL > W1 > W2 > W3 > W4.
**Comparison:** coins at 2 dp vs integer cost, after rounding (M1 rule); coins = cost counts as affordable.
**Re-evaluation:** immediately on any purchase, hire, unlock or level change; otherwise on the 1 Hz UI tick. **Anti-flicker:** without a purchase, a target change (or Ready ↔ Waiting) is applied only after the new result holds for **2 consecutive ticks** (wages can make coins hover around a cost).
**Income rate:** the same rolling 60 s coin income as the Farm time-to-afford hint (layout-spec §4.6b); time = (cost − coins) / rate, same format and rounding to nearest (~45 s · ~1 min 5 s · ~23 min · ~1 h 5 min); rate 0 → "—".
**Visibility (AC5 "always visible"):** the strip is never hidden on the Farm View. It's only covered while a modal is open (welcome-back, settings, confirm) or during FTUE steps 1–3 (it's introduced at step 4; see m3-ftue-spec.md). In portrait it sits under an open Upgrades/Market sheet like the rest of the Farm View; desktop shows it at all times.

## 2. Copy templates (rc1 truncation: rc1-upgrade-value.md §4 — drop ★, then short track name, then ellipsis on track; `+X% income` never cut. Label ≤ 27 chars; longest real label: "Farm L3: unlock Market Hand" = 27)
| Target | Template | Example |
|---|---|---|
| FARM | `Farm L{F+1}` + first matching suffix: `: unlock {Worker}` (F+1 ∈ 3/7/8), `: new coop` (5/10/20), `: Grader tier {k}` (18/19/21/22/24) | "Farm L7: unlock Coop Hand" |
| COLL | `Collection L{C+1}: +{Δtap}/tap` | "Collection L4: +5/tap" |
| W1–W3 | `Hire {Worker}` | "Hire Market Hand" |
| W4 | `Grader tier {k}: ×{m}` | "Grader tier 3: ×2.5" |
| Done | `All upgrades done!` | — |
Suffix priority when several apply: unlock > new coop > Grader tier. (The +1 customer slot at L10/L20 coincides with "new coop" and isn't named separately.) Worker names: Market Hand, Coop Hand, Hawker, Egg Grader.
Right-side status: *Ready* → chip **"Ready!"** (`--c-text` on `--c-yolk`, 20px pill); *Waiting* → **rc1 short `~m:ss` ("~1:05"), ≥1 h `~1h 59m`** (fits the 72px status column; legacy "~1 min 5 s"); *No income* → **"—"**; *Done* → none.
Screen-reader (v1.25 / D-HOP-2026-10-22-02, Art 2026-10-22): **no `aria-label`**. The accessible name is the visible label + status ("Farm L7 Ready!", ★/… excluded, WCAG 2.5.3); the description (`aria-describedby` → #goalDesc) spells out the level: "Next goal: Farm level 7, unlock Coop Hand. Ready in about 1 minute 5 seconds."; `aria-live="off"` (the countdown would spam); announce only on target change (`polite`).

## 3. Layout
Farm View grid becomes `grid-template-rows: auto 1fr auto auto auto` = queue strip · coop scene · coop meter · **goal strip** · Collect.
**Portrait 360–959px (ref 390):** `button.goal` width 100% (390 − 24 = 366px; 336px at 360), **hit area `min-height:44px` with `padding-block:2px`; visual pill 40px on an inner `span.goal-pill`** (v1.0.1, D5), margin-bottom `--s-1` (4px; row budget still 48px), `--r-pill`, bg `--c-white`, 2px `--c-outline`, `--shadow`. Grid `24px 1fr auto 16px`, gap `--s-2`, padding 0 `--s-3`:
- `icon-goal.svg` 24px · label Fredoka 14px 600 `--c-text`, `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` · status (Nunito 13px 700 `--c-muted`, tabular nums; Ready chip: 24px pill, `--c-meadow-strong` bg, white 12px Fredoka) · chevron "›" 16px `--c-muted`.
- 360px fit: chevron hidden below 380px width. 336 − 24 (pad) − 24 (icon) − 72 (status max; "~1 h 59 min" at 13px ≈ 70px) − 16 (2 gaps) = **200px label**; 27 chars × ~6.9px (Fredoka 14px 600) ≈ 186px ✔. At 390: chevron shown, label 366 − 24 − 24 − 72 − 16 − 24 = 206px ✔.
- Collect stays 64px tall below; total added height 48px (the coop scene's 1fr absorbs it; scene min-height 260px still holds at 640 tall: 56 HUD + 64 nav + 24 pad + 72 queue + 24 meter + 48 goal + 64 Collect + 3×12 gaps = 388 → 252px scene ⚠ → **reduce queue strip to 64px at heights < 700px** → 260px ✔).
**Desktop ≥ 960px landscape (ref 1280×720):** same component in the left farm column, centred `max-width:560px`, height 44px, label 16px, status 14px. Docked Upgrades column on the right stays as is.
Tokens: `--goal-h:40px` (visual pill only) `; --goal-hit:44px; --goal-h-lg:44px; --goal-icon:24px; --goal-status-max:72px;`

## 4. Tap behaviour
`<button class="goal">` (keyboard: Enter/Space; focus ring `--c-focus`). Tap **never buys**. It:
1. opens the Upgrades sheet (portrait) or focuses the docked column (desktop) on the target's tab: FARM → Farm, COLL → Collection, W1–W4 → Workers;
2. scrolls the target row into view (`scrollIntoView({block:'center'})`);
3. highlights the row: 3px `--c-focus` outline + 2 glow pulses (1.2 s total), and moves keyboard focus to that row's Buy button.
*Done* state: tap opens the Workers tab (Manage stays useful). Telemetry (proposal): `goal_tap {target, state}`.

## 5. States & animation (≤ 30-element FX budget)
| State | Visual | Motion |
|---|---|---|
| Waiting | icon + label + muted countdown | countdown text updates 1 Hz, no animation |
| No income | countdown → "—" | none |
| Ready | "Ready!" chip; strip border `--c-meadow-strong` | on entering Ready: chip pop (scale 0→1, 240 ms `--ease-pop`) + **4 sparkle dots** from the pooled FX layer (skipped if live FX > 26) — total ≤ 4 elements; then a soft glow every 4 s (CSS on the strip itself, 0 extra elements) |
| Target change | — | label cross-fade 200 ms (same element) |
| Done | "All upgrades done!" + gold flag | one-time 4-dot sparkle |
| Covered | n/a (modal / FTUE 1–3) | — |
**Reduced motion:** no pop, sparkle or glow; instant text swap; Ready shown by chip + border only.

## 6. Assets
| File | Use |
|---|---|
| assets/icon-goal.svg | strip icon (48×48 viewBox, shown at 24px) |
Everything else is CSS. Mock: mockbuild/m3-next-goal.png (360×640, Waiting) and mockbuild/m3-next-goal-ready.png (Ready).

## 7. QA notes
1. Start state (coins 0, C0, F0): target COLL "Collection L1: +5/tap" ($10 < Farm $100), status "—" until the first sale, then a countdown.
2. Ready picks the **cheapest affordable**; Waiting picks the **cheapest overall**; verify tie-break order with a crafted save where two costs are equal.
3. F+1 = 3/7/8 shows "unlock {Worker}"; F+1 = 5/10/20 shows "new coop"; F+1 = 18/19/21/22/24 shows "Grader tier k".
4. Hired workers never appear; unlocked unhired workers appear as soon as they're the cheapest.
5. Anti-flicker: with wages draining coins around a cost, the strip doesn't toggle faster than every 2 s; a purchase updates it immediately.
6. Countdown format and rounding match layout-spec §4.6b; "—" at 0 income.
7. Dead zone (AC5): at no time on the Farm View is there neither a Ready chip nor a countdown (except "—" at zero income, which only happens before the first sale or with no selling).
8. Tap opens the right tab, scrolls, highlights, focuses Buy; never buys.
9. 360×640: label never wraps; ellipsis only beyond 27 chars (none in templates); chevron hidden < 380px; scene ≥ 260px.
10. FX: ≤ 4 elements per Ready entry; reduced motion removes them.
11. Done state after F30, C30, all hires, all Grader tiers.

## A. AA contrast swaps (M3 review items, recomputed 2026-10-15, WCAG 2.x)
| Pair | Before | Ratio | After | Ratio | Need | Pass |
|---|---|---|---|---|---|---|
| Muted text on cream | #8A7B6E | 3.81 | #6B5D52 | 5.91 | 4.5:1 | ✅ |
| Muted text on white | #8A7B6E | 4.09 | #6B5D52 | 6.34 | 4.5:1 | ✅ |
| White label on button bg (Buy/Manage/toast) | #6BBF59 | 2.28 | #3D7F33 | 4.90 | 4.5:1 | ✅ |
| White text on barn (Full!, Danger, close) | #D9534F | 3.96 | #B83B37 | 5.65 | 4.5:1 | ✅ |
| Wood hint text on cream | #A86B3C | 4.05 | #8A5528 | 5.74 | 4.5:1 | ✅ |
| Wood hint text on white (row cards) | #A86B3C | 4.34 | #8A5528 | 6.16 | 4.5:1 | ✅ |
| Arrow → on white (non-text 3:1; bold 14px = text 4.5) | #6BBF59 | 2.28 | #3D7F33 | 4.90 | 4.5:1 | ✅ |
| Focus ring on white (UI 3:1) | #8FD3F4 | 1.64 | #2B79A8 | 4.77 | 3:1 | ✅ |
| Focus ring on cream (UI 3:1) | #8FD3F4 | 1.53 | #2B79A8 | 4.44 | 3:1 | ✅ |
| Empty-slot outline on cream (UI 3:1) | #CFC6BA | 1.57 | #6B5D52 | 5.91 | 3:1 | ✅ |
| '+k' floater vs white (now Soil fill, decorative) | #F29E1F | 2.17 | #3E2C23 | 13.21 | 4.5:1 | ✅ |

Unchanged pairs re-verified:
- Soil text on cream: 12.31
- Soil on yolk (Primary): 8.60
- Soil on gold (MAX): 6.71
- Soil on yolk-dark (Tired pill, Queue full): 6.09
- Soil on disabled btn: 7.83
- New muted on disabled btn (disabled label, exempt): 3.76
- Soil on sky: 8.05
- White on wood (n/a: HUD pills are white): 4.34
