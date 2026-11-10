# M4-on UI checklist (QA shot plan input) · Art & UX (UI/Visual Designer) · v1.0 · 2026-10-19 00:11 CEST
Decision: D-CEO-20261019-01 (M4-on). Build under test: PR #41, latest pushed head (90a9c84 = `balance.m4.enabled 0→1`, flag only, 1 file: src/config/balance.json; superseded by the post-fix SHA — review the SHA in the manifest).
Severity: **Blocker / Critical / Major = holds the release.** Minor / Nit = logged in art-ux/reviews/, does not hold. Per Head of Art & UX: Majors are fixed now only if the fix is trivial; otherwise escalate.
Paths: specs in `art-ux/`, code refs at `game @ 90a9c84`.

## A. What QA shoots
- **Manifest required** (screenshot-manifest-template.md v1.0 §Rules 1–5): full 40-char `sha`, `pushed:true`, `build_label_checked:true`, `rev`, one entry per PNG (`file, engine, size, docked, save, seed, state`). No manifest / mismatch = whole set rejected unreviewed.
- **Engines:** chromium, firefox, webkit.
- **Sizes:** 360x800, 375x800, 390x844, 1280x800 docked (`docked:true`).
- **States (save fixtures):**
  1. `fresh` (new save, M4 on from first load; no explainer).
  2. `mid-L10` (Farm ~L10, Hens/Egg value around L7–10, one track capped at F+3, Balanced 1/5–2/5, Hens L10 milestone just reached).
  3. `L30+` (Farm 30, Hens/Egg value at MAX or capped, Balanced 5/5, money ≥ $1T so the T tier shows).
  4. `migrated-acdbedc` (pre-M4 v6 save from the acdbedc build loaded on the M4-on build; first-load frame with the explainer AND a frame after dismiss).
- **Screens per state:** Farm (HUD + build label in frame), Market (order list + Sell / Sell all), Upgrades — every tab, including the M4 tracks block (Hens / Egg value / Farm rows + Balanced strip), Settings (build label visible).
- Total: 3 engines × 4 sizes × 4 states × (Farm, Market, each Upgrades tab, Settings) + 2 extra migrated frames (explainer, post-dismiss). Pause animations for toasts/mid-fade frames (`document.getAnimations().forEach(a=>a.pause())`) and note it in `state`.

## B. Checklist
| # | Item | Spec (file §) | Check in shots | Sev if fails |
|---|---|---|---|---|
| H1 | Hens row present when M4 on, track names exactly `Hens`, `Egg value`, `Farm` | m4-tracks-copy.md header; m4a-spec M4A-2 | all states, Upgrades tracks tab | Major (missing/wrong track) |
| H2 | Hens effect line `Eggs/s {cur} → {next}` 1.2K/3.4M format | m4-tracks-copy.md §v1.1 track row strings | mid-L10, L30+ | Minor (format), Major if value missing/0 |
| H3 | Capped row: `Needs Farm L{F+1}`, lock glyph, Dust colour, full opacity, no Buy, no ETA; aria `Hens, level {H}, locked. Needs Farm level {n}.` | m4-tracks-copy.md §1 (tracks-ui.ts:10) | mid-L10 capped row | Major if Buy shown on a capped row or n≠F+1; Minor styling |
| H4 | At maxLevel 30: `MAX` pill, no cost, no button, not focusable | m4-tracks-copy.md §1; styles.css:39 | L30+ | Major if buyable past cap; Minor style |
| H5 | Milestone hint only ≤5 levels away, muted 13px: `Next at L{n}: bigger coop · offline ×{mult}`; none at MAX | m4-tracks-copy.md §v1.1; balance.json m4.milestones.hens (L10/20/30) | mid-L10 (L5–9), L30+ (absent) | Minor |
| H6 | Hens milestone toast `Hens L{n}: bigger coop · offline ×{mult}`, non-blocking | m4-tracks-copy.md §2 (M4A-12) | mid-L10 at L10 reach | Minor |
| V1 | Egg value row, effect `Egg price {cur} → {next}` | m4-tracks-copy.md §v1.1 | all states | Major if missing/0 |
| V2 | Grade hint/toast `Next at L{n}: {grade} ×{mult}` / `Egg value L{n}: {grade} ×{mult}`, grade = Grade A / Large / Jumbo (L5/10/20) | m4-tracks-copy.md §2, §v1.1; balance.json m4.milestones.grades | mid-L10 | Minor (copy) |
| V3 | Egg value capped/MAX same as H3/H4 | m4-tracks-copy.md §1 | mid-L10, L30+ | as H3/H4 |
| B1 | Balanced strip strings: `Balanced farm {k}/5 · next +{x}% at all ≥ {N}`; 5/5 `Balanced farm 5/5 · +30%`; toast `Balanced farm {k}/5: +{x}% income` | m4-tracks-copy.md §2 (M4A-19) | fresh (0/5), mid-L10, L30+ (5/5) | Minor copy; Major if % wrong vs balance.json m4.milestones.balanced |
| B2 | Weakest segment = 2px `--c-yolk-dark` outline (not colour alone); text alt incl. 5/5 `Balanced farm 5 of 5. Top tier, +30% income.` | m4-tracks-copy.md §2 v1.1 | mid-L10, L30+ | Minor |
| M1 | **M4-A highlight rule:** one picker for hint and highlight = best payback with 3-buy look-ahead (not cheapest), 2 s hold, switch only at ≤0.9×; highlight ranks Farm-tab rows only and must match the hint when best is a Farm-tab row | product/farm/m4a-spec.md v1.3–v1.5 (M4A-18/22/41); rc1-upgrade-value.md §0 | fresh: hint = highlight = **Hens** (Eng 16:27 example); mid-L10 | Major if hint ≠ highlight on a Farm-tab pick, or cheapest picked |
| M2 | Highlight styling: `★ Best buy` chip (`--c-text` on `--c-yolk` 8.6:1) + 2px `--c-yolk-dark` outline offset 2px; 3px `--c-focus` ring for keyboard only | rc1-upgrade-value.md §2 | all states | Minor |
| M3 | Next-goal label `★ {Track} L{n} · +X% income`, never truncated, wraps before gain, ★ kept, no ellipsis | rc1-upgrade-value.md §3, §4 (v1.6.1, 188px box) | 360 all states (Egg value L30 wraps to 2 lines) | Major if cut/overlapping; Minor wrap |
| N1 | Numbers abbreviated K/M/B/**T**; never `1000B`, `1000M`, `1000K` (format.ts TIERS 1e12 T at 90a9c84) | rc1-upgrade-value.md §3; layout-spec §1; decisions.md (PR #22) | L30+ HUD, Market totals, costs | Major if `1000B` or raw 13-digit number; Minor format drift |
| N2 | Money < $10K = `$1,234.50`, ≥ $10K = `$12.3K` | format.ts fmtMoney | all | Minor |
| N3 | Order `Wants N` line: value never cut; drop " eggs" → "/{want}" → count; aria full | rc2-order-sell-preview.md §9, §9.1, v1.1 amendment | L30+ Market at 360 (`Wants 181B · $1.78T` 159px fits 170) | Major if $ value cut |
| T1 | All interactive targets ≥44×44 (Buy, Sell, Sell all, Got it, tabs, Refill, ×) | m4-tracks-copy.md header; decisions.md 2026-10-16 02:20 | all | Major only if a primary action is untappable/overlapped; else Minor |
| T2 | **Known Minor:** Upgrades tabs 36px tall on phones, must fill the 44px strip | decisions.md 2026-10-17 14:43; styles.css:117/316 | 360/375/390 | Minor (logged, no hold) |
| T3 | **Known Minor:** `Upgrade Farm →` / Collection link hit area 93×16, needs 44px padding (`padding-block:14px; margin-block:-14px`) | decisions.md 2026-10-17 12:21; rc1-upgrade-value.md §2 | Upgrades Collection card | Minor (logged, no hold) |
| C1 | Contrast tokens only, AA: `--c-meadow-text` #2F6B27 on `--c-meadow-tint` 5.68:1; `--c-text` #3E2C23 12.31:1; `--c-muted` #6B5D52 5.91:1; `--c-danger` #B83B37 white 5.65:1; wood-text #8A5528; capped row at full opacity | rc1-upgrade-value.md §1; m4-tracks-copy.md §1; style-direction.md | all | Major if text < 3:1 / unreadable; Minor if 3–4.5:1 |
| W1 | Track rows one line per state at 360 (Nunito 14, ≤296px); effect lines may ellipsis (`.fx li` only); no ellipsis on goal label, `Wants` value, or prices | m4-tracks-copy.md header; rc1-upgrade-value.md §4–5; rc2-order-sell-preview.md §3 | 360 all states | Major if a price/value is cut; Minor wrap |
| W2 | Worker banners one line, 12px+ Nunito 700, role dropped first at 360, SVG icons, no emoji | rc2-workers-copy.md §6 | mid-L10/L30+ with asleep worker | Minor |
| W3 | Toasts held under `#modal-layer.open`; Welcome-back above toasts | rc2-notes-b2-b3.md §rc2 Minors (M-Toast-layer) | migrated (welcome-back + explainer) | Minor; Major if a toast hides a primary button |
| G1 | **Migration (acdbedc):** M4 tracks UI visible on first load; coach mark `Upgrades got an upgrade!` / `Hens and Egg value are now separate. Top them up!` / refund line only if > 0 / `Got it` ≥44; non-blocking, no scrim | m4-tracks-explainer.md §Trigger, §Pattern, v1.2 | migrated frame 1 | Major if M4 UI absent or input blocked |
| G2 | Migrated values carry over: coins, Farm level, prior levels mapped to Hens/Egg value, workers intact; no row shows L0/$0.00/NaN/undefined/blank; refund `We refunded +$X…` matches log | m4-tracks-explainer.md §Pattern; decisions.md 13:06; qa/m3-recheck/player-m4a-triage/P3/P4-acdbedc logs as baseline | migrated frames vs pre-migration acdbedc shot | **Major** if anything zeroed/broken/lost |
| G3 | Explainer shows once: reload → not shown again; no milestone toasts for milestones already reached (TR-MIG-MS) | m4-tracks-explainer.md §Trigger; m4-tracks-copy.md §2 | migrated after reload | Minor (re-show); Major if toast storm blocks play |
| G4 | Fresh save never shows the explainer | m4-tracks-explainer.md §Trigger | fresh | Minor |
| S1 | Settings + HUD build label visible and equal to manifest short SHA | screenshot-manifest-template.md §Rules 3 | every engine/size, Settings | Set rejected (MANIFEST MISMATCH) |
| D1 | 1280 docked: tracks block, Balanced strip, coach mark anchored and not under the side panel / tab bar | m4-tracks-explainer.md §Pattern; rc2-notes-b2-b3.md B-2 | 1280x800 docked all states | Major if overlapping a primary control; else Minor |

## C. Out of scope / parked (log only)
N3 hens-over-goal at 360×420, 'Sold out!' paused frame, v1.6.1 full set, Refill nav fix, #16 cap line, B-3 compact card (rc2) — decisions.md / prior rulings.

## D. Review procedure (Art & UX)
On post: validate manifest → HUD label → diff the head vs 90a9c84 / dd52bfd for src/ui, styles.css, index.html, copy → walk table B per engine × size × state → verdict to Head of Art & UX; Major+ straight to HoE and Head of QA.

## L31–55 rows (added 2026-10-19 03:35, from econ/l30plus 6809f8e; see l30plus-6809f8e-prereview.md)
- **Clamps:** Farm max L50 (MAX state at 50), Hens/Egg value max L55 (MAX at 55). The track meta reads `Level 55 / 55`, and the Farm row shows MAX at 50.
- **Caps:** F+3 for F<40, F+5 for F≥40 (cap row `Hens & Egg value up to L45 → L46` at F40). Above F+3, the 2nd extra level costs a surcharge of 0.15×farm_cost(F) (×1.10 for the 2nd extra level). The buy button must show the surcharged price, and the hint/highlight must agree with that price.
- **Worst-case strings at 360 (must not clip, $ never cut, §9.1):** buy `$160.7B` (Collection L50), `$100.4B`; track buy about `$1.99M` (F50, 2nd extra level); `Level 55 / 55`; `Hens & Egg value up to L49 → L50`.
- **Tier boundaries:** $999.9M → $1B; $999.9B → **$1T** (never "1000B"); 999.95B rounding must give 1T. Coins ≥ $1T at L50 all-MAX.
- **Shots QA needs (3 engines × 360/375/390/1280 docked):** L30+ (F31, H/V at cap F+3, highlight on); F40 (cap F+5, surcharge price visible on a track buy); L50 Farm MAX + Collection L49 cost $100.4B; L55 H and V both MAX; coins at $999.96B and $1.68T in the HUD.

## Addendum 2026-10-19 03:25 (Head of Art & UX)
- **MAJOR, top level:** at the highest level the Buy button shows `MAX`, is disabled (aria-disabled, can't be tapped or keyed), and shows no price. Check Farm, Hens, Egg value and Collection at max, at 360 and 1280 docked, in 3 engines.
- **MAJOR, next-goal hint:** never points at a level that can't be bought, whether MAX or past the cap.
- **Cap still open:** farmMaxLevel is 50 and cost rows go up to 55. HoP is setting it in the D-HOP-08 amendment. Shoot both the L50 and L55 states until HoP rules, then drop whichever becomes unreachable.

## Addendum 2026-10-19 03:51: caps set by HoP (farm max 50, Hens and Egg value max 55 = F+5)
Keep both the L50 and L55 shots.
- **MAJOR C1:** at farm 50, the Farm Buy button shows `MAX`, is disabled and has no price. Hens and Egg value can still be bought and show their L51–55 prices in B or T, with nothing cut off at 360 (all 3 engines).
- **MAJOR C2:** at farm 50, the next-goal hint points to a track, never to the farm.
- **MAJOR C3:** at farm 50 with Hens 55 and Egg value 55, every Buy shows `MAX`. The hint goes into a done or empty state with no stale price.
- Product note, not a Major: if the build caps the tracks at 50 instead of 55, flag it to HoP.
- **MAJOR C4 (03:52):** at farm 50, buying a Hens or Egg value level from 51 to 55 must visibly raise the income or egg-value readout. On 6809f8e, levels 51–55 could be bought but had no effect; the Architect is fixing it in a separate commit. Shots: the readout before and after one L50→51 purchase of each track, in 3 engines at 360 and 1280 docked.

## Addendum 2026-10-19 04:13: final SHA additions (HoE build, UI engineer e80556fd). Shoot in all 3 engines at 360/375/390/1280 docked.
- **EXP1, the tracks explainer (M4-AC-EXP1, m4a-spec §11). MAJOR if broken:**
  - One dismissable card that shows once and doesn't come back after reload.
  - 'Got it' is at least 48px tall.
  - It doesn't block buys.
  - Nothing is clipped at 360.
  - Follow m4a-spec: a fresh farm never sees it, absent is correct. Shots: migrated acdbedc on first load with the card shown, then after dismiss, then after reload with it gone. Fresh: it's absent.
- **F2, Upgrades tabs:** the visible tab is at least 36px tall, and the tap target is at least 44px. Measure the hit box.
- **F3, Best buy chip:** shows both the ★ and the 'Best buy' label, on the same row as the next-goal hint and highlightPick.

## Addendum 2026-10-19 04:34: tracks explainer EXP1 (D-CEO-20261019-07; source m4a-spec §11)
Shoot from HoQA's EXP1 fixture in 3 engines at 360/375/390/1280 docked, with and without a refund.
- **MAJOR EXP-a:** the tap that dismisses the card doesn't pass through. The first tap after migration never buys anything; check coins and levels before and after.
- **MAJOR EXP-b:** when the card opens, focus goes to Got it. Enter or Esc closes it, and focus then returns to the Upgrades tab.
- **MAJOR EXP-c:** at 360 the card fits with the refund line showing, nothing cut off, and Got it is at least 48px tall.
- **MAJOR EXP-d:** the card never appears on a new save or with the flag off.
- Also check:
  - The §11 copy is verbatim.
  - The 8s auto-dismiss works.
  - Reduced motion gives a 150ms fade only.

## Addendum 2026-10-19 04:47: rulings
- **EXP-a:** checked against the CEO's 04:46 D-07 amendment (b). The dismissing tap is swallowed and only closes the card; the next tap registers. A buy that passes through is a MAJOR. If the CEO switches to HoP v1.15 (non-modal), only the 'Buy tap while the card is up' case changes.
- **EXP-b focus return (P46-M1) is a MAJOR.**
- **Cap (D-CEO-20261019-10, option B):** M4 ships capped at farm L30, so 'Level N / 30' is correct. The L30+/L31–55 section, C1–C4 and the $999.96B/$1.68T shots MOVE TO THE FOLLOW-UP and are out of scope for this release.
- **Review target:** the B SHA on rc/m4-t3-capped (around 05:30), not #46. Use the reshoot list in reviews/pr46-24e3674.md.

## Addendum 2026-10-19 05:27: HoA&UX rulings
- **B-M1 focus order on close:** (1) the bottom-nav Upgrades button when the sheet is closed, (2) the active [data-tab] when the sheet is open, (3) #collect as the last resort. MAJOR until fixed, with a test for the sheet-closed case.
- **B-M2:** MAJOR until refund-line-360 shows the card alone with readable text on all 3 engines and the check log is attached.
- **C:** rejected. No reshoot unless the CEO adopts v1.15.
- **Sign-off:** on the final rc/m4-t3-capped head SHA only.

## Addendum 2026-10-19 06:05: v1.15 FINAL (CEO via HoA&UX)
- The explainer card is non-modal and taps outside it register, so an outside-tap buy is CORRECT. This supersedes EXP-a swallow. v1.16 is withdrawn.
- Review ffc3dfd against v1.15 only. B-M1 focus order is the only open Major. Verdict due to HoA&UX by 07:15.

## Backlog Minor 2026-10-19 07:36
- At 360 the "can't save" toast partly covers the Collect button. Pre-existing, not EXP1.
