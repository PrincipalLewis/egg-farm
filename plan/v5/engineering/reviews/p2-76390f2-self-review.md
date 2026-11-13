# v5 M4.1 patch 2 self-review: fix/m41-p2 @ 76390f2834b98e981ef52a3e165436acd9170654
Senior Engineer, UI & rc1 Fixes · 2026-10-29 · D-CEO-20261028-02 (self-review; CCR re-review only after a Blocker/Critical/Major).
Base: origin/rc/v5 = 22eac98 at branch time; origin/rc/v5 (d3b5a53: #81 v5 F2, #78 bot-m5) merged in clean at 23d2b78 (no conflicts; no force-push). Scope: engineering/m4.1-p2-scope.md (sha1 f0524447…), P2a + P2b in scope (D-HOE-20261029-03).
Specs: art package acfe36a7 (m8/m9/m5/m6/m1/m10), rc1-asleep-state-spec v1.0.12 (sha1 666e8fd5…, P2a AC-R17, P2b R10-R16/U1-U3),
qa/m41/test-plan-patch1.md (a34ace59…), art-ux/reviews/m41-pr70-30b29d3.md (Art nit n1), engineering/reviews/pr70-30b29d3.md (CCR n1/n2).
Size: 17 files, src 8 files (~170 changed lines), tests 8 files, scripts 2 (rc0 s28rate assertion, new m41-p2-browser.mjs).
No sim / save / economy behaviour diff: src/sim, src/save, src/config, data/ untouched; src/econ/income.ts is comment-only (CCR n1).
Gate: /workspace/egg-farm-studio/artifacts/m41-p2/results/ (SHA256SUMS + MANIFEST.sha256). Shots: /workspace/wt-ui-shots/m41-p2-76390f2/.

## Findings (all Minor / Nit; none Blocker/Critical/Major)
| # | Sev | Finding | Disposition |
|---|---|---|---|
| m1 | Minor | Flag rule 5 ("every piece behind a flag") vs a CSS/a11y/copy patch: no flag added (none in scope; v5-rc-manifest: "HoE to rule"). | Flag default 0 is moot (no flag). Flagged for HoE; not inventing one. |
| m2 | Minor | src/econ/income.ts appears in `git diff --stat` (economy path) | Comment-only (CCR n1 asks for it); gate 12 prints 0 non-comment lines; both goldens pass with pins unchanged. |
| m3 | Minor | WCAG 2.4.11: a straight port of the rc1 measure (bar + 8px) still left a Shift+Tab-focused Refill 8px under the stuck bar in all 3 engines: sticky top:0 sits at the scroller's content edge, scroll-margin at its padding edge (16px). | Fixed in 5683b49: --refill-bar-h = bar + scroller padding-top + 8px; browser sweep now passes Tab and Shift+Tab at 360/390/1280. Deviation from the 7380b86 port noted for HoE/Art. |
| m4 | Minor | AC-R17 lists a "Refill, no tired workers" state for the nav Refill; that state does not exist in code (nav Refill is hidden at N = 0, AC-R9). | Tested what exists (hidden at 0; "Refill N" otherwise). Spec owner to drop or define the state. |
| m5 | Minor | AC-R17 Upgrades: visible order is badge then label, so the name became "N Upgrades, …" (name starts with visible text) instead of a DOM reorder. | Chosen as the smaller change (no layout diff). Flagged for Art/a11y to confirm wording. |
| n1 | Nit | rc0 s28rate assertion changed (m6 changes the #rate DOM: ▼ in aria-hidden .tri, icon via .warn). | Updated to the signed behaviour (expects "▼ " start, icon shown on neg, none on pos). |
| n2 | Nit | s2-economy-ui.ts comment-only change (Art risk (a): model strings keep the ⚠ marker, never painted). | No behaviour change; the 10 model assertions unchanged. |
| n3 | Nit | m6 edit had merged two import comments onto one line in app.ts. | Fixed in d790cd0. |
| n4 | Nit | Unpaid Refill tap: spec says dispatch nothing; I kept the refused-tap shake (cantAfford) as feedback. | Telemetry/state unchanged (test). Art may prefer no shake; one-line change. |
| n5 | Nit | --refill-bar-h measure calls getComputedStyle on the scroller when the Upgrades HTML changes or after resize/dock, not per frame. | Acceptable cost; same cadence as rc1. |
| n6 | Nit | m41-p2-browser freezes the sim (QA build `g.frame` override) for the AC-R17 snapshot scenes, otherwise coins 0 turns every hired MH/CH Unpaid. | QA handle only (compiled out of release; check-globals passes). |
| n7 | Nit | Coop tip at 360 sits over the top of the Collect row (position unchanged; m8 is typography/width only). | Observation for Art (shot coop-tip-360); not in p2 scope. |
| n8 | Nit | TDD: tests written alongside the code, not strictly red-first. | Every item has a unit/jsdom test plus a browser check (below). |

## Test map
- tests/m41-p2-ui-minors.test.ts (17): m8, m9, m5 incl. UI-M5-8 + asset sha1 pins, m6 CSS, m1 RM CSS, m10 token/contrast, CCR n1/n2, Art n1 geometry, WCAG 2.4.11 source.
- tests/m41-p2-ui-dom.test.ts (jsdom): m6 #rate DOM, m1 keyed diff (no node discarded, popin only on new hens, cap = 0 mutations), P2b tap guard, P2a AC-R17 in 8 scenes.
- tests/m41-p2-unpaid.test.ts (11): AC-R10..R16, TP1-U1..U3.
- scripts/m41-p2-browser.mjs × chromium/firefox/webkit at 360/390/1280: computed styles, contrast, icon boxes, axe 4.14 label-content-name-mismatch, AC-R16 fit, 2.4.11 Tab/Shift+Tab sweep, refund pop vs #rate per frame, m1 trace incl. reduced motion; shots + sha256 manifest.

## Added after d790cd0
| # | Sev | Finding | Disposition |
|---|---|---|---|
| n9 | Nit | m41-p2-browser UI-M8-1 compared the line-height string; WebKit serialises 14px × 1.3 as 18.199999px (3 false FAILs on d790cd0, product correct). | 83ae316: numeric compare ±0.01px. |
| n10 | Nit | rc/v5 moved (#81, #78) after the branch was cut. | Merged origin/rc/v5 at 23d2b78 (clean); all gates re-run on 23d2b78 with node v20.19.2 (CI version). |
| n11 | Nit | QA-D-1029-V5SCAP: p2 test titles lacked AC ids in places. | 76390f2: every p2 it() title starts with its AC id (titles only); trace table in the PR body. |
| n12 | Nit | Box restore at ~21:56 wiped /tmp/axe, node_modules and the Playwright cache; rc0 chromium's first run on 76390f2 failed pt1 (ENOENT axe) only. | Gate sets AXE_PATH to the pinned axe-core 4.14.0 (artifacts/v5-ui/tools); rerun 394/394. WebKit system libs reinstalled from deb.debian.org (apt via proxy returned 500). |
