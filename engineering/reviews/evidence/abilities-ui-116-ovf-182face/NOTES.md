# #116 Workers overflow fix (QA-D-1106-PR116-OVF / HoE/116-workers-overflow)

- **Tip:** `182face7470a2889a5e907a3acf0dc5aa227c7ee` (`182face`)
- **Tree:** `63010a43ca5693627a600bfd7ebce25c3c414642`
- **Branch:** `feat/v5-abilities-ui` — **Draft** (not Ready)
- **Author:** Senior Engineer, Features & Economy Wiring
- **Date:** 2026-11-06 (Europe/Belgrade)

## Problem
Workers tab @ 360×640 with `m4.flags.abilities=1` had horizontal overflow (scrollWidth ~417). Call buttons clipped; energy bars overrun. Root cause: when a call was present, `workersHtml` put Manage + `.wk-cap` (nowrap caption) + `.sr` + call inside `.wk-actions` flex row, so the caption blew min-content width.

## Fix (side-by-side — no stack)
- Restructure: Manage + cap live in `.wk-manage` (column); Manage|call stay a row via `.wk-actions` (`.wk-call` wraps the call control). Matches Art §6 (~124+8+124 in 328 content).
- CSS containment: `min-width:0; max-width:100%` on `.wk`, `.wk-body`, `.wk-refill`, `#uRow`; ebar max-width 100%; call `.lbl` + under-Manage `.wk-cap` ellipsis.
- No `@media` stack — side-by-side fits after structure fix.
- `balance.json` untouched (abilities stays 0 in ship).

## Browser asserts (hard-fail, was INFO)
- F1-1a: `scrollingElement` / `documentElement` scrollWidth ≤ innerWidth @ 360
- F1-1b: every visible `[data-testid^="call-"]` bbox fully inside viewport (left ≥ 0, right ≤ innerWidth)

## Local verify
- `npx tsc --noEmit` — pass
- `npx vitest run tests/v5-abilities-ui.test.ts` — 15/15
- `npm run build` — check-release-build green (`m4.1+182face`)
- `npm run build:qa && npm run abilities-ui-browser` — ALL PASS (F1-1a/F1-1b green; seScrollWidth=360; calls left=184 right=334)

## Art glance
- SHOTS dir (repo convention): `/workspace/wt-v5-abilities-ui/artifacts/abilities-ui-browser/`
- Artifact shots: `/workspace/artifacts/v5-116-overflow-fix-182face/shots/`
- **flag1-workers.png:** `/workspace/artifacts/v5-116-overflow-fix-182face/shots/flag1-workers.png`
- **SHA256:** `ecb5d18fde2c2d1cc5ca68438c0fa5eff031733cac20df69cfff050fff47b51a`
- (same bytes as repo SHOTS copy: `ecb5d18fde2c2d1cc5ca68438c0fa5eff031733cac20df69cfff050fff47b51a`)

## Files
- `src/ui/workers-ui.ts`
- `src/ui/styles.css`
- `scripts/abilities-ui-browser.mjs`

## Branch tip
- Product fix commit: `182face7470a2889a5e907a3acf0dc5aa227c7ee` (tree `63010a43ca5693627a600bfd7ebce25c3c414642`)
- Current Draft HEAD (status chore only): `a1f5c232fa54113549ee70a11e9a2a7508bee682`
- PR #116 remains **Draft** (`isDraft: true`)
