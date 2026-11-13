# #116 abilities UI: Architect overflow fix review (QA-D-1106-PR116-OVF)

Date: 2026-11-06 03:18 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior tooling APPROVE: `abilities-ui-fcf7623-architect-addendum.md`  
**Product tip (content):** `182face7470a2889a5e907a3acf0dc5aa227c7ee` · tree `63010a43ca5693627a600bfd7ebce25c3c414642`  
**Live Draft HEAD:** `a1f5c232fa54113549ee70a11e9a2a7508bee682` · tree `dca78ec…` — **status chore only** (`engineering/status.md` ±1 line vs `182face`; product/browser blobs **identical**)  
Parent of product tip: tooling `fcf7623…`  
Artifact: `/workspace/artifacts/v5-116-overflow-fix-182face/` · shot digest **MATCH** `ecb5d18fde2c2d1cc5ca68438c0fa5eff031733cac20df69cfff050fff47b51a`  
Art: `art-ux/m5-abilities-flows.md` §6 / AB-UI-2 (`[Manage] 8 [call]` ≈ 124+8+124 at 360)  
Writes: this addendum + studio `engineering/status.md` only. **No** source / PR / Ready / push / merge / messages. **Not** publication authority.  
**Did not** drive Playwright; HoQA owns browser verdict. Author browser claim not independently executed.

## Verdict: **APPROVE** (content @ `182face`; HEAD `a1f5c23` product-identical)

Root-cause fix (cap out of the Manage|call flex min-content row) matches Art §6 side-by-side; no stack MQ; flag0 structure preserved when no call; browser asserts upgraded INFO→hard-fail with meaningful viewport checks. Screenshot review consistent. Limits below — not CHANGES.

## Expand identity

| Ref | SHA / tree | Role |
|---|---|---|
| Tooling APPROVE | `fcf7623` / `ec0bf3bb…` | parent |
| Product OVF tip | `182face` / `63010a43…` | **content bind** |
| Live `origin/feat/v5-abilities-ui` | `a1f5c23` / `dca78ec…` | chore status only; `workers-ui.ts` `styles.css` `abilities-ui-browser.mjs` blobs **same=YES** vs `182face` |
| PR #116 | Draft MERGEABLE CLEAN; hosted **skipping** | not green |

Delta `fcf7623..182face`: `workers-ui.ts`, `styles.css`, `abilities-ui-browser.mjs` (+ repo `engineering/status.md`). `balance.json` untouched; shipped `abilities: 0`.

## Architecture

**HTML (`workers-ui.ts`):** with call → `.wk-actions` > `.wk-manage` (Manage + cap/sr column) + `.wk-call` (call). Without call (flag0 / locked chrome) → Manage+cap only, **no** `.wk-actions` — flag0 card shape unchanged.

**CSS:** `.wk-actions` `flex-wrap:nowrap`; equal `flex:1 1 0; min-width:0` Manage|call; cap ellipsis under Manage; call `.lbl` ellipsis; containment `min-width:0; max-width:100%` on `.wk` / `.wk-body` / `.wk-refill` / `#uRow` + ebar. **No** new `@media` stack. Aligns Art §6 wireframe 124·8·124 / AB-UI-2 equal Manage|call widths (pause slot still absent in this Draft — pre-existing; not introduced here).

**App-wide risk:** `#uRow{min-width:0;max-width:100%}` is containment only — acceptable; no Collection/Farm layout rewrite observed in diff.

**Browser (`abilities-ui-browser.mjs`):** F1-1a page `scrollingElement`/`documentElement` scrollWidth ≤ innerWidth; F1-1b every **laid-out** `call-*` (w/h>0) bbox horizontally inside viewport (`±0.5`). Replaces INFO. Collects `bodyScrollWidth` but **does not gate** it — residual HoQA check if sheet-body internal scroll is in scope. Does not use offscreen-only children without size (filtered).

## Visual (artifact PNG)

Read `shots/flag1-workers.png` (digest match): Workers @360 flag-on — Activate-all full width; Market Hand / Coop Hand show **side-by-side** Refill|Rush and Refill|Sweep; captions under Refill; energy bars within card; no horizontal clip visible in frame. Third card partially below fold (vertical scroll OK).

## Independent gates (no browser)

| Gate | Result |
|---|---|
| tsc / sync-economy | **0** |
| vitest `v5-abilities-ui` | **15/15** |
| `npm run build` (release @ live HEAD) | **0** (`m4.1+a1f5c23` check-release-build ok) |
| Playwright | **not run** — HoQA / Ready hosted |
| Hosted | Draft **skipping** — not SUCCESS |

## Limits / remaining

1. **Browser:** Architect did not execute Chromium; author NOTES “ALL PASS / F1-1a·b green” is **not** independent evidence. HoQA owns actual browser verdict.  
2. F1-1a is page-level; body internal h-scroll not hard-failed (mitigated by F1-1b).  
3. Optional Ready hosted SUCCESS + HoQA GO (D-HOE-52). Stay Draft.

Evidence: `engineering/reviews/evidence/abilities-ui-116-ovf-182face/` · WT `/workspace/wt-review-116-overflow`
