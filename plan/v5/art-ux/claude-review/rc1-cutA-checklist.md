# rc1 Cut A screenshot review checklist (360 / 375 / 1280 px) · rev 2 (rc1-upgrade-value v1.4)
Prepared 2026-10-16 for the rc1 Cut A screenshots (not posted yet). Viewports: 360×640, 375×667, 1280×720 (rc1-upgrade-value.md:52).
Abbreviations: **UV** = art-ux/rc1-upgrade-value.md (**v1.4**, line numbers below refer to v1.4) · **SD** = art-ux/style-direction.md · **LS** = art-ux/layout-spec.md · **NG** = art-ux/m3-next-goal-spec.md (v1.0.1) · **AS** = product/workers/rc1-asleep-state-spec.md · mocks = art-ux/mocks/rc1-upgrade-value-{360,375,1280}.png + rc1-asleep-card-360.png (UV:57, UV:76, UV:92). Known mock flaw: the 3rd card "Worst case (no gain)" shows +999% chips; follow UV:29/43/67 (`No gain yet`), do not flag the mock.
Mark each item: ✅ pass · ❌ fail (attach crop) · ⚠ spec unclear · n/a. Check every item at each width unless a width is named.

## A. Text clipping / ellipsis
| # | Check | 360 | 375 | 1280 | Source |
|---|---|---|---|---|---|
| A1 | No horizontal scroll on any screen (scrollWidth == innerWidth) | ☐ | ☐ | – | LS:218 |
| A2 | Worst case `+999% income` effect chip shows in full, no ellipsis | ☐ | ☐ | ☐ | UV:52, UV:36 |
| A3 | `★ Best buy` chip shows in full, star included | ☐ | ☐ | ☐ | UV:52, UV:36 |
| A4 | `With next buys: ~1 h 59 min` (≈206px) and `Pays back in ~1 h 59 min` show in full in the 236px (360) / 251px (375) column | ☐ | ☐ | ☐ | UV:52, UV:36–37 |
| A5 | `No gain yet` chip (≈78px) fits next to the effect chip, not clipped | ☐ | ☐ | ☐ | UV:64 |
| A6 | Chips use nowrap and wrap as whole chips (flex-wrap), never break mid-chip | ☐ | ☐ | ☐ | UV:12, UV:36 |
| A7 | ≥960: one chip line (effect · raw · payback · Best buy) inside the 560px column, Buy right-aligned at 160px | – | – | ☐ | UV:38 |
| A8 | Raw-effect chips hidden at 360/375 (the before→after list carries them) | ☐ | ☐ | – | UV:36 |
| A9 | Before→after effect lines (`Egg price $12.34 → $13.82`) on one line, no ellipsis | ☐ | ☐ | ☐ | LS:132 |
| A10 | Goal label `★ Collection L5 · +8% income` (≈190px) shows in full within the 200px budget | ☐ | ☐ | ☐ | UV:36, NG:44 |
| A11 | Worst goal label `★ Collection L30 · +999% income`: no clipping; ellipsis only on the track part, only at 360 | ☐ | ☐ | ☐ | UV:52 (see gap G4) |
| A12 | Goal status (Ready chip / ETA) not clipped; status ≤72px | ☐ | ☐ | ☐ | NG:43–44, NG:47 |
| A13 | Goal chevron hidden below 380px, shown at 1280 | ☐ | ☐ | ☐ | NG:44 |
| A14 | Goal label never wraps | ☐ | ☐ | ☐ | NG:82 |
| A15 | Hint lines (`Affordable in ~…` / `Limited by collecting`) on one line each, both visible when both apply | ☐ | ☐ | ☐ | UV:16, LS:171 |
| A16 | Asleep/Unpaid banner text ("Asleep, production stopped", "Unpaid, production stopped", "Asleep, bonus down to 15%") in full at 14px, with icon | ☐ | ☐ | ☐ | AS:5–6, UV:73 |
| A17 | Refill disabled caption "Rested, refill below 40%" / "Ready in Ns" in full | ☐ | ☐ | ☐ | AS:35–37 |
| A18 | Tab labels Collection / Farm / Workers ≥13px, never ellipsized | ☐ | ☐ | ☐ | LS:219 |
| A19 | Nav Workers badge count inside the viewport, not clipped by the nav edge | ☐ | ☐ | – | UV:73, LS:221 |

## B. AA contrast (text ≥4.5:1, UI/non-text ≥3:1)
| # | Check | 360 | 375 | 1280 | Source |
|---|---|---|---|---|---|
| B1 | All chip text ≥4.5:1 | ☐ | ☐ | ☐ | UV:53 |
| B2 | Effect chip #3D7F33 on #E8F4E4. **The spec says 5.3:1, but my measurement is 4.32:1, which FAILS.** Sample the shipped colours | ☐ | ☐ | ☐ | UV:13 (contradiction C1) |
| B3 | Payback chip #3E2C23 on #FFF6E0 (≈12.3:1; the spec says 13:1) | ☐ | ☐ | ☐ | UV:14 |
| B4 | Best buy chip #3E2C23 on #FFC93C, 8.6:1 | ☐ | ☐ | ☐ | UV:15 |
| B5 | `No gain yet` muted chip ≥4.5:1 (uses --c-muted #6B5D52) | ☐ | ☐ | ☐ | UV:64, UV:72 |
| B6 | Best buy card outline #2B79A8 ≥3:1 on cream (4.44) / white (4.77) | ☐ | ☐ | ☐ | UV:15, NG:96–97 |
| B7 | Affordable Buy: white on #3D7F33, 4.90:1 | ☐ | ☐ | ☐ | LS:105 |
| B8 | Hint text --c-muted #6B5D52 (5.91 on cream / 6.34 on white) | ☐ | ☐ | ☐ | LS:148, NG:89–90 |
| B9 | Asleep banner: white 14px text needs barn-ui #B83B37 (5.65). Plain --c-barn #D9534F gives 3.96 and FAILS | ☐ | ☐ | ☐ | UV:73, NG:92 |
| B10 | Asleep card at 50% opacity: the banner and Refill button stay at full opacity, and banner text keeps ≥4.5:1 | ☐ | ☐ | ☐ | UV:73 (gap G7) |
| B11 | Nav badge: white count on red ≥4.5:1 (barn-ui) | ☐ | ☐ | – | UV:73 |
| B12 | HUD income ≤0 shown in red with ⚠, text ≥4.5:1 | ☐ | ☐ | ☐ | AS:14, LS:199 |
| B13 | Goal Ready chip white on #3D7F33 (4.90) | ☐ | ☐ | ☐ | NG:43, NG:91 |
| B14 | Focus ring visible (3px #2B79A8) on the goal button and the target Buy | ☐ | ☐ | ☐ | LS:109, NG:50 |

## C. State is never shown by colour alone (affordable / locked / asleep)
| # | Check | 360 | 375 | 1280 | Source |
|---|---|---|---|---|---|
| C1 | Global rule: colour is never the only state signal | ☐ | ☐ | ☐ | LS:199 |
| C2 | Best buy readable in a greyscale screenshot (★ + text + outline) | ☐ | ☐ | ☐ | UV:15, UV:53 |
| C3 | At most one `★ Best buy` chip and outline, on the goal-hint target row | ☐ | ☐ | ☐ | UV:54 |
| C4 | Affordable: glow + outline on the target; unaffordable: outline only + `Affordable in ~…` text | ☐ | ☐ | ☐ | UV:44–45 |
| C5 | Unaffordable Buy: disabled grey with a text hint (time/need), not just a grey fill | ☐ | ☐ | ☐ | LS:109, LS:135, UV:16 |
| C6 | Maxed shows gold + "MAX" text; locked shows a locked label; chips hidden in both | ☐ | ☐ | ☐ | UV:48, LS:109 |
| C7 | Negative-gain worker: raw effect + `No gain yet`, no Best buy, card never hidden | ☐ | ☐ | ☐ | UV:47, UV:64 |
| C8 | Asleep banner has the 💤 icon + text; Unpaid has ⚠ + text | ☐ | ☐ | ☐ | UV:73, AS:30 |
| C9 | Asleep card dimmed (50% opacity), so it doesn't rely on hue | ☐ | ☐ | ☐ | UV:73, AS:5 |
| C10 | Nav badge shows a count (a number, not a dot), hidden at 0 | ☐ | ☐ | – | AS:8, UV:73 |
| C11 | HUD income ≤0 has ⚠ + red; never shows a positive number while production is stopped | ☐ | ☐ | ☐ | AS:14, AS:30 |
| C12 | Goal Ready state = "Ready!" chip text + border (not just the border colour) | ☐ | ☐ | ☐ | NG:61, NG:65 |
| C13 | Refill disabled has a reason caption | ☐ | ☐ | ☐ | AS:35 |

## D. Tap targets ≥44px
| # | Check | 360 | 375 | 1280 | Source |
|---|---|---|---|---|---|
| D1 | Global: hit areas ≥44px | ☐ | ☐ | ☐ | LS:199, LS:222, LS:26 |
| D2 | Upgrade Buy ≥48px tall | ☐ | ☐ | ☐ | UV:39, LS:105 |
| D3 | Goal button hit area ≥44px (40px pill inside) | ☐ | ☐ | ☐ | NG:4, NG:42, UV:39 |
| D4 | `Limited by collecting` link hit area ≥44px | ☐ | ☐ | ☐ | UV:65 (gap G8) |
| D5 | Upgrades tabs ≥44×44 at 1280 | – | – | ☐ | LS:90 |
| D6 | Chips are not tappable (pointer-events:none), so they can't look like buttons that need a target | ☐ | ☐ | ☐ | UV:12 |
| D7 | Refill button ≥44px at full opacity on an asleep card | ☐ | ☐ | ☐ | UV:73, LS:199 |
| D8 | Panel close / Settings 44×44 | ☐ | ☐ | – | LS:67, LS:85 |
| D9 | Market Sell button ≥44px when stacked at ≤375 | ☐ | ☐ | – | LS:124 |

## E. Next-goal clarity
| # | Check | 360 | 375 | 1280 | Source |
|---|---|---|---|---|---|
| E1 | Goal strip visible on the Farm View (not hidden; covered only by a modal / FTUE 1–3) | ☐ | ☐ | ☐ | NG:26 |
| E2 | When the best buy differs from the cheapest: label `★ {Track} L{n} · +X% income` | ☐ | ☐ | ☐ | UV:30, UV:66 |
| E3 | The goal target and the `★ Best buy` row are the same row | ☐ | ☐ | ☐ | UV:54 |
| E4 | Status `Ready!` chip or the ETA; no dead zone without either | ☐ | ☐ | ☐ | NG:37, NG:80, UV:66 |
| E5 | ETA string is the build's `Affordable in ~…` with F7 format (not m:ss) | ☐ | ☐ | ☐ | UV:70, UV:33, LS:150 (contradiction C2) |
| E6 | The 60 s hint window and the cheapest fallback are not shown (void) | ☐ | ☐ | ☐ | UV:69 (contradiction C3) |
| E7 | Card order: fx line → chips → `Level L/max` → Buy | ☐ | ☐ | ☐ | UV:71 |
| E8 | Strings match §2 exactly (case, ~, spacing, ★) | ☐ | ☐ | ☐ | UV:51, UV:20–33 |
| E9 | 1280: goal strip in the left column, max 560px, 44px tall, label 16px | – | – | ☐ | NG:46 |
| E10 | Reduced motion: glow is static and Ready is shown by chip + border | ☐ | ☐ | ☐ | UV:39, NG:65 |
| E11 | Screenshots match the mocks (360/1280); report differences | ☐ | – | ☐ | UV:61 |

**Total: 66 items** (A19 + B14 + C13 + D9 + E11).

## Spec contradictions and gaps found
- **C1 Contrast claim is wrong:** #3D7F33 on #E8F4E4 measures **4.32:1** (WCAG 2.x), not the 5.3:1 in UV:13. That fails UV:53. Fix: darken the text or lighten the chip bg (e.g. white bg = 4.90).
- **C2 ETA string:** UV:70 says `Affordable in ~…` "replaces 'Affordable in ~…'". The two strings are identical, so the sentence says nothing. LS:150/155 and the 360 mock use "Ready in ~…", and NG:37 uses a bare "~1 min 5 s". The intended final string is unclear.
- **C3 Fallback:** UV:31 keeps a "Next-goal fallback (cheapest)", but UV:69 says the fallback is void. NG:18–19 (cheapest selection) was never updated for best buy.
- **C4 Best buy chip placement:** UV:13 puts it on line A with the effect chip. The 360 mock puts it on its own 3rd line, which UV:36 allows. Fine either way, but say so in the review.
- **C5 Badge:** UV:73 / AS:8 put the badge on a Workers nav button, but LS:82 defines the bottom nav as Market / Upgrades / Farm (no Workers) with a 12px dot badge. LS:219 mentions a Workers *tab*. Where the badge goes is unclear.
- **C6 "Gold":** UV:15 calls #FFC93C "gold", but in the tokens #FFC93C is --c-yolk and --c-gold is #E8B020 (LS:10, LS:14).
- **C7 Goal label length:** NG:28 caps labels at 27 chars / 200px, but `★ Collection L30 · +999% income` is 31 chars. UV:52 allows ellipsis on the "track part only", but NG:43 is a plain trailing ellipsis that would cut the `+999% income` end. Nothing implements middle truncation.
- **C8 Mock goal strip:** the 360 mock renders "· Ready!" as inline label text, not the meadow Ready chip from NG:43/61.
- **G1** No 375 mock (UV:61 lists 360/1280 only), and no asleep mock (UV:73 says none is needed).
- **G2** The ETA prefix ("Affordable in ~1 h 59 min") is much wider than the 72px status budget (NG:44). Status clipping risk at 360.
- **G3** `--c-surface-2` (UV:64) is not a defined token. `--c-text-muted` is superseded by `--c-muted` (UV:72).
- **G4** Item A11 can't be passed or failed cleanly until C7 is resolved.
- **G5** The banner "red" has no token. It must be --c-barn-ui to pass AA (B9).
- **G6** The HUD has no income/s element in LS:60–68, but AS:12–14 require one (shown red ≤0).
- **G7** It's unclear whether the banner sits inside the 50%-opacity area (UV:73). AS:5 says "greyed out", not opacity.
- **G8** The `Limited by collecting` link needs a ≥44px tap target (UV:65), but it lives in a 16px hint line (LS:148, LS:171). How it reaches 44px isn't specified. LS:169 copy ("Limited by coop · Upgrade Farm →") also conflicts with UV:65.
- **G9** The Best buy outline and the goal-tap highlight are both a 3px --c-focus outline (UV:15, NG:53), and the focus ring is the same colour (LS:109). Three meanings share one visual.
- **G10** The Refill button size isn't specified anywhere (D7 relies on the global rule only).

---
## Rev 2 delta (v1.4): these rows override the rows above where they conflict
| # | Check | Source |
|---|---|---|
| A2–A4 | Worst cases per UV §5 (`+999% income`, `★ Best buy`, `With next buys: ~1 h 59 min`) not clipped | UV:56, UV:83 |
| A5 | `No gain yet` chip, `--c-muted` on `--c-cream`, no icon | UV:29, UV:43 |
| A8 | Raw-effect chips are "960+ only"; at 360/375 the before→after list carries them | UV:45, UV:58 |
| A11 | Goal label truncation order: drop ★ → short track (`Coll.`) → ellipsis on track only; `· +X% income` never cut | UV:53, UV:83, NG:29 |
| A12 | Goal status short `~m:ss` / `~1h 59m` / `Ready!` chip, fits 72px | UV:48, UV:56, NG:38 |
| A15 | Card ETA `Affordable in ~m:ss` (fmtAffordableIn) | UV:31, UV:46, LS:151 |
| A19 | Asleep count badge on the **Upgrades** nav button + Workers tab (no Workers nav button) | UV:72, LS:83 |
| B2 | Effect chip `--c-meadow-text` #2F6B27 on `--c-meadow-tint` #E8F4E4 = 5.68:1 | UV:14, UV:27, SD:31 |
| B3 | Payback chip `--c-text` on `--c-cream` (12.31:1) **with 1px `--c-slot-outline` border** | UV:28, UV:17 |
| B6 | Best buy card outline = 2px `--c-yolk-dark` (not focus blue) | UV:21, UV:30 |
| B9/B11 | Banner + badge `--c-danger` (#B83B37), white text 5.65:1 | UV:16, UV:72–73, SD:31 |
| B10 | Dim (opacity .5) excludes banner and Refill | UV:74, UV:87 |
| B15 | Ready! chip `--c-text` on `--c-yolk` (8.6:1) | UV:48, NG:38 |
| B16 | MAX pill on `--c-yolk` with `--c-text` (8.6:1) | UV:68 |
| C14 | Focus ring (3px blue) visibly different from the Best buy outline | UV:30, UV:85 |
| C15 | Unpaid banner uses ⚠, Grader banner reads "Asleep, bonus down to 15%" | UV:73 |
| C16 | HUD `#rate` ≤0 in red **with ⚠** (never colour only) | AS:14, AS:30, UV:79 |
| D4 | `Limited by collecting ›` hit area 44px via padding-block 14px / margin-block −14px | UV:32, LS:170 |
| D7 | Refill `min-height:44px; min-width:88px` | UV:75, UV:86 |
| D10 | Hit areas measured with getBoundingClientRect (Link, Refill, Buy, goal) | UV:86 |
| E2 | Label `★ {Track} L{n} · +X% income` (spaces exactly as written) | UV:47, UV:82 |
| E6 | No cheapest fallback label ever; no candidates → m3 Done | UV:50, NG:18 |
| E11 | Compare with the mocks at 360/375/1280 + asleep 360 | UV:92 |
Rev 2 total: 66 + 6 new (B15, B16, C14, C15, C16, D10) = **72 items**.

> Rev 2 note: v1.4 resolves contradictions C1–C3, C5–C8 and gaps G2, G3, G5–G10 above (UV:95). C4 (Best buy line) remains "either wrap OK". G1 resolved by the new mocks.
