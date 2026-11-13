# Claude UX pass (advisory): Cut A v3, PR #3 @ eb27707
2026-10-17 · Art & UX · checklist rc1-cutA-checklist.md rev 2 · spec rc1-upgrade-value.md v1.4 (UV), layout-spec.md (LS), m3-next-goal-spec.md (NG), product/workers/rc1-asleep-state-spec.md (AS). Claude calls: **0**.

Inputs:
- **(a)** `/workspace/wt-ui-shots/cuta3/`: 60 PNGs (Chromium/Firefox/WebKit · 360/375/390/1280).
- **(b)** `qa/m3-recheck/cuta-ux-extras/`: QA extras (closed nav, Unpaid/Grader/Asleep banners, rect JSON, README).

## ⚠ Provenance: no screenshot shows eb27707
- **(a)** The HUD tag in every cuta3 shot reads **"build c231c02"**.
- **(b)** The extras are **d56033f**: README, `buildId: m3-rc1-pre+d56033f`, HUD "build d56033f".

So everything below verifies c231c02 / d56033f, **not eb27707**. If eb27707 adds UI commits on top of these, re-capture before sign-off. This is the main open item, not a UI defect.

**Counts:** Blocker 0 · High 1 · Medium 2 · Low 4 · Info/process 3.

## Findings (by severity)

### H1 · High · Goal strip "short-name" state overflows the pill (all engines)
- **Screen/width/engine:** Farm View goal strip · 360 · Chromium, Firefox, WebKit
- **Shots:** `wt-ui-shots/cuta3/cuta3-goal-short-name-360-{chromium,firefox,webkit}.png`
- **Element:** `button#goal` label `★ Coll. L30 · +999% income`
- **Issue:** the label renders at a much larger font than the 14px label. The `· +999% income` gain span wraps to a second line that falls **below the pill outline** and is cut by the Collect button, so it can't be read. The ★ is still shown, although truncation step 1 is to hide it first. Gain text is lost in every engine.
- **Breaks:** UV:53 (gain span never cut; order ★ → short name → ellipsis), UV:83 (UV-2), NG:43 (label 14px, nowrap), NG:82 (label never wraps).
- **Why High, not Blocker:** it only happens at the worst-case `Coll. L30` label. The one-line state is fine, and the two-line state is readable. It fails a UV AC, so I recommend fixing it before rc1 sign-off.

### M1 · Medium · Goal "two-line" state wraps the label
- **Shots:** `cuta3-goal-two-line-360-{chromium,firefox,webkit}.png`, 360, all engines
- **Element:** goal label shown as `★ Collection L30` over `· +999% income`
- **Issue:** the label is readable and inside the pill, but it wraps to 2 lines. The spec says one line, with truncation (drop ★, then use `Coll.`) instead of wrapping. The visual pill also grows past 40px.
- **Breaks:** NG:82, NG:42 (40px visual pill), UV:53.

### M2 · Medium · Market Need/Sell buttons: text overruns the pill, or is auto-shrunk below the floor (all engines)
- **Shots:** `cuta3-order-line-360-*.png`, `cuta3-order-need-360-*.png`, `cuta3-order-sell-360-*.png`, 360
- **Issues:**
  - "Need 1.8M" and "Need 999" touch or overrun the button outline, with no inner padding.
  - "Need 181.2B" and "Need 8.76M" are shrunk to about 9–10px, below the 16px button floor.
  - The Sell row price is ellipsized: "181.2B/181.2B · $1…".
- **Breaks:** LS:220 (Sell button padding 12px, 16px text, inside the card), LS:222 (button floor 16px), LS:124 (never truncate the price line).

### L1 · Low · Chromium arrows render thin and lighter (engine difference)
- **Shot:** `cuta3-farmcard-{affordable,unaffordable}-360-chromium.png`, compared with the firefox and webkit versions
- **Element:** `→` in the Farm card effects list
- **Measured:**

  | Engine | Darkest arrow px | Ratio on white | Green px in the effects block |
  |---|---|---|---|
  | Chromium | (73,135,63) | 4.36:1 | 20 |
  | Firefox | #3D7F33 | 4.90:1 | 55 |
  | WebKit | #3D7F33 | 4.90:1 | 64 |

  Chromium looks non-bold or font-fallback.
- **Breaks:** LS:133 (arrow `--c-meadow-strong` bold), NG:95 (bold 14px = 4.5).

### L2 · Low · Unpaid card: dimmed "Unpaid ⚠" status and body text are low contrast
- **Shots:** `qa/m3-recheck/cuta-ux-extras/{chromium,firefox,webkit}-360-2a-unpaid-banner.png`
- **Issue:** the body is at opacity .5 per UV:74, so the pink "Unpaid ⚠" and the energy/wage lines are faint (visually ~2–3:1). The banner carries the state at 5.65:1, so the state is still clear. This carries over the ccd7bf9 L3 spec decision.
- **Breaks:** LS:199 vs UV:74.

### L3 · Low · Wage units differ between cards
- **Shots:** `extras/*-360-2-workers-sheet.png`, `cuta3-refillbar-360-*.png`
- **Issue:** Market Hand shows "Wage $4.50/min" while Coop Hand shows "Wage $0.15/s". The same screen uses two units, which makes cost comparison harder.
- **Breaks:** no explicit spec line. Consistency issue (LS:2 "numbers from config"; suggest one unit).

### L4 · Low · Raw seconds in the Market empty state at 1280
- **Shot:** `cuta3-full-1280-{chromium,firefox,webkit}.png`
- **Issue:** "Next customer soon… (1000000000s)". This is likely a seeding artifact, but the countdown is unformatted.
- **Breaks:** LS:88 (countdown optional) + the F7 format rule LS:151.

### P1 · Process · 1280 "affordable" and "unaffordable" farmcard shots are byte-identical
- **Shots:** `cuta3-farmcard-{affordable,unaffordable}-1280-{chromium,firefox,webkit}.png` (same md5 per engine)
- **Issue:** the crop stops at "Level 6 / 30", so the docked Buy state and the `Affordable in ~m:ss` line at 1280 are **not evidenced**.

### P2 · Process · 1280 rect JSON has no docked-panel targets
- **File:** `extras/{chromium,firefox,webkit}-1280-rects.json` › `upgradesWorkersOpen`
- **Issue:** it lists only settings, queue, goal and collect (8 items). No docked tabs, Refill, Hire or Buy rects were captured.
- **Also missing:** the 360 JSONs never open the Collection or Farm tab, so there's no rect for **Buy** or the **"Limited by collecting ›" link** (UV:32, UV:86) in any engine.

### P3 · Process · Chromium clipping scan not run
Per the README / summary.txt, the Chromium clipping scan (scrollWidth>clientWidth) was cancelled. Only Firefox and WebKit have it.

## I1–I3 (from rc1-cutA-ccd7bf9.md)
| Item | Status | Evidence |
|---|---|---|
| I1 Upgrades nav badge | **Closed ✔** (d56033f) | `extras/*-360-3a-nav-badge-crop.png`: 18px red badge "3" top-right of Upgrades in all 3 engines; aria "Upgrades, 3 workers asleep or unpaid". Closed nav with count 0 shows the affordable dot (`chromium-360-1-closed-nav.png`) per LS:83. Workers tab badge also present. 1280 has no nav (docked) per LS:53. |
| I2 Unpaid + Grader banners | **Closed ✔** (d56033f) | `extras/*-2a-unpaid-banner.png` "⚠ Unpaid, production stopped", `*-2b-grader-banner.png` "💤 Asleep, bonus down to 15%", in all engines at 360 and 1280. Icon + text, banner full opacity (UV:73–74). |
| I3 Hit areas ≥44 | **Partly closed** | I parsed all 12 rect JSONs myself. The **only** <44 entry is `button#goal > span.goal-pill > span.goal-status` "Ready!" **64×20**, a non-interactive child of `button#goal` (320/560×44). **QA's claim matches the JSON.** Measured ≥44: settings 44×44, close 44×44, tabs 106.7×44, nav 93–120×64 (Refill nav 81×64), Refill 144.9×48, bulk Refill 304×48, Hire 308×48, goal 44 tall, Collect 64, queue chips 56×64. **Not covered:** Buy, "Limited by collecting ›" link, and all 1280 docked-panel targets (P2). UV:86 / D4 / D10 stay open for those. |

## ccd7bf9 findings rechecked
| Item | Status in v3 | Evidence |
|---|---|---|
| M1 Workers tab badge covers label | **Fixed** | `extras/*-360-2-workers-sheet.png`: badge sits outside the "Workers" pill corner, label fully readable (all engines). |
| M2 ▼ instead of ⚠ on ≤0 income | **Fixed** | `cuta3-refillbar-360-*.png` / extras HUD: "⚠ ▼ $0.00/s" in red (AS:14). |
| M3 Raw-effect line at phone widths | **Fixed for Farm card**, Collection card not in v3 shots | `cuta3-farmcard-*-360-*.png`: only "Coop upgrade at L10" (LS:165, allowed). No Collection-tab capture, so it can't be confirmed there. |
| L1 Goal spacing at 1280 | **Fixed** | `cuta3-full-1280-*.png`: "★ Collection L6 · +8% income". |
| L2 Payback chip 1px outline | **Not visibly fixed / unverified** | At 1× in the farmcard crops no slot-outline border is visible around "Pays back in ~3 min 43 s". Needs a 2× crop or DOM style check (UV:28). |
| L3 Dimmed asleep text contrast | **Open (spec decision)** | See L2 above. |
| L4 Build tag contrast | **Unchanged** | Tag still light-on-wood ("build c231c02"). Fine if debug-only. |

## Engine differences
- Rendering is consistent apart from **L1** (Chromium arrows).
- Firefox and WebKit are pixel-similar. Chromium shots are slightly smaller files and glyphs are lighter overall.
- No layout shift between engines. H1, M1 and M2 reproduce in all three engines, so they are CSS/logic issues, not engine bugs.

## Section verdict (checklist rev 2)
| Section | Result |
|---|---|
| A. Clipping/truncation/overlap | **FAIL**: H1, M1, M2 |
| B. Contrast | **PASS with notes**: L1 (Chromium arrow 4.36), L2 |
| C. Not colour alone | **PASS**: banners ⚠/💤 + text, badge count, HUD ⚠ |
| D. Tap targets ≥44 | **PASS for measured targets**; Buy / link / 1280 docked unmeasured (P2) |
| E. Next-goal clarity | **FAIL (worst-case only)**: H1 hides the gain at `Coll. L30`; normal labels clear, Ready chip OK |

**Merge blockers: none at UX level (advisory).** Recommended before rc1 sign-off:
1. Fix H1 (and M1, M2).
2. Re-capture on **eb27707** itself (provenance).
3. Add the Buy / link / 1280 docked rects.
