# Cut A UX extras (Art & UX request), 2026-10-16 ~23:08 CEST

- **Build:** origin/rc1/ux-clarity-v3 @ **d56033f** (newest Cut A line; rebased successor of rc1/ux-clarity ccd7bf9/8631e94 and -v2 1371305). Fresh detached worktree /tmp/cuta-ux, `npm run build:qa` (dist-qa), `vite preview` on :4396.
- **Runtime build ID:** `m3-rc1-pre+d56033f` (meta[name=build-id], checked in every page, clean, no +dirty). No page errors.
- **Engine:** Chromium (google-chrome via playwright-core), under `flock .browser-test.lock`. Firefox/WebKit NOT run (lock queue took ~15 min for one engine; `capture.mjs firefox|webkit` is ready to run).
- 360x800 = mobile (DPR 2, touch). 1280x720 = docked desktop (DPR 1).

## Files (per viewport W = 360 | 1280)
- `chromium-W-1-closed-nav.png`: sheet closed. At 360 the bottom nav is visible (nav.actions at y=736, 360x64). **At 1280 there is no bottom nav** (nav.actions is display:none in the docked layout; Market/Upgrades are docked panels on the right, as shown).
- `chromium-W-2-workers-sheet.png`: Upgrades > Workers with the banners.
- `chromium-W-2a-unpaid-banner.png`: Market Hand card, "⚠ Unpaid, production stopped" (Coop Hand shows it too).
- `chromium-W-2b-grader-banner.png` (card) / `-2c-grader-viewport.png`: Egg Grader card, "💤 Asleep, bonus down to 15%".
- `chromium-W-rects.json`: getBoundingClientRect for every visible tappable element (button, [role=tab], [role=button], a, [onclick], *chip*, input/select/summary, [tabindex]) with selector, text, aria-label, role, disabled, rect, under44. Two states: `sheetClosed`, `upgradesWorkersOpen`.
- `capture.mjs`: the script (`EXPECT_BUILD=m3-rc1-pre+d56033f node capture.mjs chromium`, run from the worktree).

## Seeding
localStorage before load (addInitScript, once per session): `eggfarm.ui` = {seenSlots:5, onboardingDone, workersIntroA/B, sfx:false}; coach/intro overlays removed.
- Closed/nav: v5 save, Farm L5, Collection L4, $70, one customer (17 eggs).
- Banners: v5 save (migrates to v6), Farm L18, Collection L10, **$0**, `graderTier:1`, workers `market_hand` and `coop_hand` = {energy:80, unpaid:true} (Unpaid; $0 so they can't resume), `grader` = {energy:0} (Asleep → Grader banner). Then Upgrades nav (360) → Workers tab.

## Under-44px targets
Chromium, both viewports, both states: **one hit, and it's not a real target**: `button#goal > span.goal-pill > span.goal-status` "Ready!" 64x20. It's a status pill inside the Goal button (matched the *chip* selector), not tappable by itself. The parent `button#goal` is ≥44px. **No real tap target under 44px** (nav, tabs, Refill, Hire, Sell/Need, close, goal all ≥44).

---
## Update 2026-10-17 02:25 CEST: Firefox + WebKit, nav badge, Asleep card, clipping

**Verdict (Firefox, WebKit; Chromium tap targets from 00:02 run): PASS** — no real tap target <44px, no visible text clipping, 18px badge and Asleep card render in all engines.

Runtime build ID `m3-rc1-pre+d56033f` verified in every page, all engines; 0 page errors. One engine at a time under `.browser-test.lock`, port 4396 (server stopped by script).

### Added files
- `firefox-{360,1280}-{1,2,2a,2b,2c}*.png`, `webkit-…` same set (+ `*-rects.json`).
- 18px nav badge: `{chromium,firefox,webkit}-360-3-nav-badge.png` + `-3a-nav-badge-crop.png`.
- Asleep worker card ("💤 Asleep, production stopped", Market Hand energy 0, $70): `{chromium,firefox,webkit}-{360,1280}-4-asleep-card.png`, `-4a-asleep-viewport.png`, `-asleep-rects.json`.
- `report-firefox.json`, `report-webkit.json` (full results incl. `clip` scan), `run-<eng>.log`, `summary.txt` (resume log).

### Results
| Check | Chromium | Firefox | WebKit |
|---|---|---|---|
| Upgrades nav badge 360 | 18x18 "3" | 18x18 "3", 12px font | 18x18 "3", 12px font |
| Badge aria | — | "Upgrades, 3 workers asleep or unpaid" | same |
| Asleep card 360/1280 | PASS | PASS (banner 328x32 / 366x32) | PASS (same) |
| Unpaid (2) + Grader Asleep banners | PASS | PASS | PASS |
| Tap targets ≥44 | PASS* | PASS* | PASS* |
| Clipping (scrollWidth>clientWidth, text-bearing, non-scroll) | pending rerun | PASS** | PASS** |

\* Only hit is `button#goal > .goal-status` "Ready!" 64x20, a non-interactive pill inside the ≥44px Goal button.
\** Only hits are `h1.sr` and `div#live.sr` (screen-reader-only, 1px by design). Manage-all count badge 16x16 is decoration on a ≥44 button.

### Not run
- Chromium clipping scan (capture.mjs gained the clip scan after the Chromium run; rerun cancelled 02:27 to free the lock queue; out of scope — run `EXPECT_BUILD=m3-rc1-pre+d56033f node qa-out/capture.mjs chromium` from /tmp/cuta-ux if wanted).
- 375/390/430 and 1024x474 / 1366x768 (not requested).
