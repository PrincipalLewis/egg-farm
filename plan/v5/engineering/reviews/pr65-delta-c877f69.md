# CCR delta review: PR #65 (`fix/m41-9-ux-minors`) `7779088..c877f69a407ec844a4d10612030584be42e34bdf`
- **Reviewer:** Claude Code Reviewer (read-only)
- **Date:** 2026-10-23 04:22 CEST (`Europe/Belgrade`, UTC+2)
- **Worktree:** `/workspace/review-pr65-7779088` (detached at `c877f69a407ec844a4d10612030584be42e34bdf`)
- **Delta:** 1 commit (`c877f69`) directly on `77790883c2d6b0e6bd0db8e786d04bb87579c68a` (fast-forward). 6 files changed (`+375 / -34`): `src/ui/tracks-explainer.ts`, `src/ui/styles.css`, `scripts/rc0-browser.mjs`, `scripts/m41-9-scroll-sweep.mjs` (new), `tests/m41-9-ux-rulings.test.ts`, `tests/m41-9-ux-ccr-m1.test.ts` (new).
- **Scope check:** 0 changes to `src/sim`, `src/econ`, `src/save`, `src/config`, `data`, `src/main.ts`, `src/ui/app.ts`, or `engineering/golden`.
- **Claude calls:** 0

**Verdict: PASS — 0 Blocking / 0 Major / 0 Minor / 2 Nits.**
Prior Major `M1` (scrolled-sheet Buy overlap at 360/375 px) and prior Nits `n1`, `n2`, `n3` are all resolved and verified by unit tests, 18/18 killed mutants, and a 940-position live Chromium scroll sweep + first-tap verification.

---

## Claims vs. Evidence

| Claim | Verdict | Evidence |
|---|---|---|
| Every `placeExplainer` candidate (including main's `top: 72` fallback) is clear-checked against visible Buy rects and hittable `#collect` | **Verified** | `src/ui/tracks-explainer.ts:46-53` builds `cands` (`above`, `inside`, `default`, `band`, `below`, `nav`) and requires `clear(top)` on every entry (`:52`). Property test exemption in `tests/m41-9-ux-rulings.test.ts:35-46` is removed (`>500` placed cases + `none` cases, 0 overlaps). |
| `.btn.buy` rects are clipped to clipping ancestors (`#p-upgrades .body`) and the viewport; off-screen / zero-size / fully-clipped buttons are dropped | **Verified** | `buyRects` (`src/ui/tracks-explainer.ts:60-71`) clips each visible `.btn.buy` rect to `view` (`0..innerWidth`, `0..innerHeight`) and to every ancestor up to `body` whose `overflow`/`overflowX`/`overflowY` matches `/^(auto|scroll|hidden|clip|overlay)$/`. Partially visible buttons (even 1 px exposed below the sheet header) remain in `buyRects()`; fully clipped buttons (`bottom <= top`) are dropped (`nonEmpty(r)`). |
| `#collect` is included in `blockRects` iff a tap at its center lands on it (`elementsFromPoint` skipping the card) | **Verified** | `collectRect` (`src/ui/tracks-explainer.ts:73-77`) calls `doc.elementsFromPoint(cx, cy).find(e => !e.closest('.tracks-exp,.tracks-exp-out'))` and checks `top === c || c.contains(top)`. When covered by the open Upgrades sheet on phones, `#collect` does not falsely block sheet slots; when uncovered, it is protected. |
| When no candidate slot is clear (`place: 'none'`), the card is kept out of the way (`visibility: hidden`), intercepts 0 taps, skips `fadeOut` on dismiss, still plays `refundPop`, and re-places cleanly on scroll/resize/click | **Verified** | `.tracks-exp[data-place=none]{visibility:hidden}` (`src/ui/styles.css:516`) suppresses paint and pointer hit-testing. `fadeOut` (`src/ui/tracks-explainer.ts:108`) returns early when `el.dataset.place === 'none'`. In live Chromium (`dist-qa`) at `360x640`, `375x667`, and `360x560` with `scrollTop = 200` and refund line (`123450`), `place` is `'none'`, `elementFromPoint(cx, cy)` hits the Hens `.btn.buy`, first tap (mouse & touch) increments `hensLevel` `0 -> 1` while keeping the card connected, scrolling back to `0` restores `place: 'default'` (`visibility: visible`), and `Escape` closes with `+$1.2K` pop and focus on `[data-tab=farm]`. |
| Prior surviving mutants (`n1`) and `off()` listener cleanup (`n2`) covered | **Verified** | `tests/m41-9-ux-ccr-m1.test.ts:76-177` covers all 7 `n1` mutants (`above` clear check, all Buys checked, `buyRects` viewport/ancestor clip, `GOAL_COVER_MAX_W = 390` at 390 vs 391/412, `trackToastSafe` passing `win.innerWidth` and observing `#goal`, and `refundPop` using `fmtMoneyShort` at `123_456_789` cents) plus `n2` (`off()` removing all 6 `document`/`window` listeners with matching capture flags on both `Escape` and `timeout`). |

---

## Resolution of Prior Findings (`pr65-delta-7779088.md`)

| ID | Prior Severity | Summary | Status at `c877f69` |
|---|---|---|---|
| **M1** | Major | Fallback `default` (`top: 72`) skipped `clear()`, covering scrolled Farm Hens Buy at 360/375 px and eating the first tap | **RESOLVED.** `placeExplainer` (`src/ui/tracks-explainer.ts:46-53`) clear-checks `default` along with `above`, `inside`, `band` (`minTop..under` step 4 px), `below`, and `nav`, falling back to `place: 'none'` (`visibility: hidden`) when no clear slot fits. Verified across 940 live Chromium scroll positions (`360x640`, `360x560`, `375x667`, `390x844`, `412x915`, `430x932` × `farm`/`collection`/`workers` × refund off/on) with 0 overlaps and 0 card hits, plus UI's 3-engine sweep (`576/576` first-tap buys, 0 overlaps). |
| **n1** | Nit | 7 surviving mutants in placement, `toast-safe`, and `fmtMoneyShort` pop | **RESOLVED.** All 7 killed by `tests/m41-9-ux-ccr-m1.test.ts:76-110, 150-177`. |
| **n2** | Nit | `off()` listener removal untested on dismiss | **RESOLVED.** Killed by `tests/m41-9-ux-ccr-m1.test.ts:130-148`. |
| **n3** | Nit | `#collect` not in clearance set despite "Buy or Collect" claim | **RESOLVED.** `collectRect` + `blockRects` (`src/ui/tracks-explainer.ts:73-79`) include `#collect` whenever its center is hit-testable; killed by `tests/m41-9-ux-ccr-m1.test.ts:112-128`. |
| **n4** | Nit | Default card covers the 3 tab pills at 360/375 with the refund line when unscrolled | **By design** (explicitly permitted by Art ruling (1)). |
| **n5** | Nit | Refund pop fires on 8 s timeout if card auto-dismisses | **By design** (consistent with Art ruling (3) "on dismiss"). |

---

## Findings at `c877f69`

- **Blocking:** None.
- **Major:** None.
- **Minor:** None.
- **Nits:**
  - **n1 (`src/ui/tracks-explainer.ts:52`):** `if ((place === 'default' || fits(top)) && clear(top))` exempts `'default'` (`top = 72`) from `fits(top)` (`top >= minTop && top + h <= vh`) so pure unit tests without `vh` or with synthetic `minTop` keep `'default'` eligible. On all real viewports (`vh >= 560`, `minTop = 64`), `fits(72)` is true anyway, and `clear(top)` always runs.
  - **n2 (`src/ui/tracks-explainer.ts:159`):** While the card is in `place: 'none'` (`visibility: hidden`, e.g., when a 360/375 px Farm sheet with the refund line is parked around `scrollTop = 140..235`), the 8 s `EXP_MS` timer keeps running rather than pausing. Since the card was already visible before the player scrolled (and reappears immediately if they scroll ~50 px further or switch tabs), and `fadeOut` is suppressed on `'none'`, this is benign.

---

## Verification Gates & Mutation Summary

- **`npx tsc --noEmit`:** PASS (0 errors).
- **`npx vitest run`:** PASS — 89/89 test files, **1024/1024** tests green (including `engineering/golden/flagoff-golden.a01faea.test.ts` `f90d1678…` and `engineering/golden/m4on-golden.90a9c84.test.ts` `a54c9cf9…` unchanged).
- **Release & QA builds (`npm run build`, `check-release-build.mjs`, `npm run build:html`, `npm run build:qa`):** PASS (`m3-rc1-pre+c877f69`, single-file `dist-html/egg-farm.html` 518,744 bytes).
- **`npm run check-globals` (Chromium):** PASS (3/3 checks).
- **`scripts/rc0-browser.mjs chromium` (`AXE_PATH=/tmp/ccr-axe/node_modules/axe-core/axe.min.js`):** PASS — **352/352** checks (including new `G5 refund card on screen (place default, not none) with the sheet at the top` at 360/375/390/1280 and PT1 axe `[]`).
- **Independent Chromium M1 repro & 6-viewport scroll sweep (`/tmp/p65d-c877f69/repro-sweep.mjs`):** PASS — 6/6 exact `scrollTop = 200` mouse + touch first-tap repros at `360x640`, `375x667`, `360x560` (`hensLevel` `0 -> 1` on first tap, card hidden at 200 px and visible again on scroll to 0, `Escape` closes with `+$1.2K` pop); **940/940** 4 px scroll positions across 6 viewports × 3 tabs × refund off/on with **0 overlaps** and **0 card hits** (`default: 685, above: 80, band: 43, below: 12, nav: 1, none: 119`).
- **Targeted mutation testing (`/tmp/p65d-c877f69/mutants.mjs`):** **18/18 mutants killed (0 survived)** across `src/ui/tracks-explainer.ts`, `src/ui/toast-safe.ts`, and `src/ui/styles.css`. Worktree verified clean (`git status -s` empty).
