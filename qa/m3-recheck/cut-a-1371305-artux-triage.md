# Cut A @ 1371305 (rc1/ux-clarity-v2): Art & UX triage
QA · 2026-10-16 ~20:30 CEST · evidence: `cut-a-1371305-artux-triage/` (probe.mjs, per-SHA/engine .log/.json, screenshots)
Setup: fresh detached worktrees `scratch/artux-1371305`, `scratch/artux-8932a01`, `scratch/artux-main` (main = 737c2cf); `npm run build:qa` in each (dist-qa); `vite preview` on :4391 only (never :4173); engines run one at a time (Chromium = /usr/bin/google-chrome, Playwright Firefox, Playwright WebKit). Served bundle build-id checked before every run (`m3-rc1-pre+1371305` / `+8932a01` / `+737c2cf`); HUD reads "build 1371305" at runtime on Cut A (main/8932a01 have no HUD build tag; there the bundle id check is the only one). Phone contexts: hasTouch, DSF 2, height 800. Nothing pushed, merged or tagged.

| # | Item | Chromium | Firefox | WebKit | Severity |
|---|---|---|---|---|---|
| 1 | Farm card: "Limited by collecting ›" overlaps payback chip (360/375/390) | **FAIL** | **FAIL** | **FAIL** | **Major** |
| 1b | Same on main 737c2cf / 8932a01 | not present | not present | not present | n/a. The feature doesn't exist there |
| 2 | Goal label "★ Egg value · +999% income" at 360: 1 line, no wrap/clip, same in all 3 | PASS | PASS | PASS | (spec notes below) |

## 1. Limiter link overlaps the payback chip: FAIL, Major
**Root cause (confirmed at runtime):** the link's wrapper is `<div class="hint coop">` (app.ts:489). It inherits the farm-scene sprite rule `.coop{position:absolute;width:46%;left:27%;bottom:38%}` (styles.css:76). That rule pulls it out of flow and positions it at 38% from the bottom of the card, which lands on the chip row. Computed `.hint.coop` = `position:absolute` in all 3 engines. The line came in with 62345fc (the Cut A rebase onto main 737c2cf).
**The trigger is NOT "time-to-afford line missing".** The overlap is identical with and without the ETA line. It happens in every Farm-card state where the limiter link renders, i.e. `!max && eggsPerTap(C) <= 0.5 * coopCapacity(F)` (app.ts:488). The missing-ETA screenshot in the evidence is just the affordable state, where the ETA is replaced by an empty placeholder.
**Repro:** new context at 360x800 (touch). Load a save with farmLevel 6, collectionLevel 5 (coins $50K or $9.95, either works). Open Upgrades → Farm tab. The "Limited by collecting ›" text is drawn over "Pays back in ~3 min 43 s".
**Measurements (CSS px, getBoundingClientRect, all 3 engines identical to ±0.1px):**

| width | link glyph rect (range) | payback chip rect | glyph ∩ chip | link hit box (72px tall) ∩ chip |
|---|---|---|---|---|
| 360 | x 97.2–237.8, y 530.8–546.8 | x 102–270.8, y 531–551 | **135.8 × 15.8** | 135.8 × 20 |
| 375 | x 101.3–241.8 | same | **139.8 × 15.8** (FF 139.9) | 139.8 × 20 |
| 390 | x 105.3–245.9 | same | **140.6 × 15.8** | 140.6 × 20 |

Cases per width: affordable (no ETA), unaffordable (ETA "Affordable in ~0:41") and C25. All three have the same overlap. My C25 "control" still showed the limiter, so C≥25 at F6 doesn't clear the condition; I didn't find a non-limited state. The ETA line still renders correctly below Buy, and the link no longer sits there. The link's 72px tap area also covers the chip, though the chip has `pointer-events:none`. The link is also no longer in reading/layout order (it's above the Buy button visually and below it in the DOM).
**Severity Major:** overlapping, unreadable text on the main upgrade card, at every phone width, in all engines, for every early-game player (the condition is true from the start).
**Suggested fix (for Eng):** rename the hint modifier (e.g. `.hint.limit`), or scope the sprite rule (`.scene .coop`/`#coop`). Then recheck that the 44px hit area doesn't collide with `.meta`.
**Main 737c2cf / 8932a01:** "Limited by collecting" isn't in the source (`grep` count 0) and doesn't render (hasLink=false, 9 states × 3 engines each). So it doesn't reproduce there because the feature is Cut A–only. The `.coop` sprite rule exists on both (styles.css:73), so any `.coop` class reused in UI there would hit the same thing.
Screenshots: `1371305-<engine>-farmcard-<case>-<w>.png`, `737c2cf-…`, `8932a01-…`.

## 2. Goal label "Egg value" at 360: PASS
"Egg value" (an M4-A track) isn't a goal in this build, so the probe painted the real `.goal-label` markup (`.g-star "★ "`, `.g-track "Egg value"`, `.g-gain " · +999% income"`) into the live goal strip at 360 (save F12) and measured it with the build's Fredoka woff2 (500/700 loaded, `document.fonts` = loaded).

| engine | natural width | ★ / track / gain | label box | scrollW | lines | track or label clipped | ellipsis |
|---|---|---|---|---|---|---|---|
| Chromium | 176.17 | 12.56 / 62.14 / 97.47 | 188 | 188 | 1 | no / no | no |
| Firefox | 176.13 | 12.55 / 62.13 / 97.45 | 188 | 188 | 1 | no / no | no |
| WebKit | 176.17 | 12.56 / 62.14 / 97.47 | 188 | 188 | 1 | no / no | no |

Cross-engine spread is 0.04px. The text stayed "★ Egg value · +999% income" after the screenshot (no fit/rerender rewrite). Screenshots: `1371305-<engine>-goal-eggvalue-360.png`; data in `goal-<engine>.json` / `goal-<engine>.log`.
Notes for Art & UX / Eng (info, not a fail):
- Measured full label = **176px, not 200px** as in v1.6 §4's table (the table looks ~24px high, and "Egg value" gives the widest result in it). The Collection-row "201px → wraps" conclusion is probably also overstated. Worth re-measuring the table.
- The label box available at 360 is **188px**, not the 200px budget.
- The build still has the v1.4 behaviour (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`, `fitGoalLabelEl` hides ★ → short name). v1.6 wrap-to-2-lines isn't implemented in 1371305, so the 2-line path couldn't be tested.

## Not run
- 2-line wrap / short-name fallback of v1.6 (not implemented in build); "Egg value" via a real M4-A game state (track not in build, so DOM injection was used).
- Item 1 at 1280/desktop, or on 8932a01/main beyond the 3 phone widths.
- A non-limited Farm-card state (didn't find C/F values that turn the limiter off).
- No unit tests, check-release-build or rc0 run (out of scope).
## Ops note
The first attempt (~19:50) timed out launching Chromium because the box was saturated (load ≈78). The box then restarted around 20:03 and restored `/workspace` from a snapshot, which wiped `game/node_modules` and my first evidence folder. Everything above was re-run after 20:07. `npm ci` went into `scratch/artux-1371305` only, and the other two worktrees symlink to it; `game/` was left untouched, but its node_modules is now missing for other jobs.
