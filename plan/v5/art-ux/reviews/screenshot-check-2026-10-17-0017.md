# UI screenshot spec check · 2026-10-17 00:17 · UI/Visual Designer
Routine run. New screenshots since the 23:47 run (log: reviews/screenshot-check-log.md).
Build: **d56033f** (origin/rc1/ux-clarity-v3, `m3-rc1-pre+d56033f`, Chromium only) in qa/m3-recheck/cuta-ux-extras/ (re-run 00:02 with two new states, closing two of my 23:25 coverage gaps).

## Verdict: PASS for the new captures. 1 open question for PM Workers (not graded). The 23:25 Minor (sticky Refill bar) is still open: same build; the 00:02 re-render of 2c still shows the issue.
| # | Item | Spec | Result |
|---|---|---|---|
| 1 | Upgrades nav count badge, sheet closed, 360 | rc1-upgrade-value.md:97, layout-spec.md:83 | PASS |
| 2 | Plain `💤 Asleep, production stopped` banner (Market Hand), 360 + 1280 docked | rc1-upgrade-value.md:98 | PASS |
| 3 | Dim 50% except banner and Refill (plain Asleep card) | rc1-upgrade-value.md:99 | PASS |
| 4 | Tap targets ≥44 (asleep state) | rc1-upgrade-value.md:100, style rule | PASS |
| 5 | Refill nav / bulk `Refill 1 tired worker` with a single asleep worker | product/workers/rc1-asleep-state-spec.md:39 (T5), :41 (AC-R9) | QUESTION |
| 6 | Sticky Refill bar backing (from 23:25) | rc1-upgrade-value.md:98 | still FAIL, Minor (unchanged build) |

## 1. Upgrades nav badge: PASS
Evidence: chromium-360-3-nav-badge.png, chromium-360-3a-nav-badge-crop.png; chromium-360-rects.json `upgradesWorkersOpen` (same seed: 2 Unpaid + 1 Asleep Grader).
- Red `3` badge top-right of the Upgrades icon, clear of the label (the 8631e94 "Worker(s)" overlap is gone). Measured 18×18 CSS px (36×36 at DPR 2), white count on `--c-danger` ✔.
- aria `Upgrades, 3 workers asleep or unpaid` ✔. Badge replaces the affordable dot while count > 0 ✔.
- Refill nav shows `1` with aria `Refill 1 tired worker`: the approved tired-count badge (art-ux/decisions.md:8). It differs from the Upgrades `3` on purpose (Unpaid workers aren't tired), counts are correct ✔.
- Nit, not graded: the Refill nav label sits ~2px lower than Market/Upgrades/Farm labels, and the button is 81 vs 93px wide. Both belong to QA-RC1UI-1, deferred to rc2 (decisions.md:98, art-ux/decisions.md:18). Fold the baseline alignment into that fix.
- HUD `$0.00` / `⚠ ▼ $0.00/s` and goal `★ Collection L11 · +6% income ~0:13` (one line, no ellipsis) ✔.

## 2–4. Plain Asleep card: PASS
Evidence: chromium-{360,1280}-4-asleep-card.png, -4a-asleep-viewport.png; chromium-{360,1280}-asleep-rects.json.
- Banner text exact `💤 Asleep, production stopped`, 32px strip (bannerRect 328×32 at 360, 366×32 docked), white bold on `--c-danger`, one line at 360 and in the 1280 docked panel ✔. Icon + text, not colour-only ✔.
- Body dimmed (title, `· Asleep 💤` tag, energy bar, `Energy 0%`, wage); banner and Refill at 100% ✔. `Wage $1.25/min` follows decisions.md:15 ✔.
- Workers tab badge `1`, Upgrades nav aria `Upgrades, 1 worker asleep or unpaid` (singular) ✔.
- Targets: card Refill 145×48, tabs 107×44, close 44×44, nav 120×64, goal 320×44 ✔. Only <44 hit is the `Ready!` pill inside `button#goal` (not its own target), as before.

## 5. QUESTION (PM Workers): no Refill nav and no bulk bar with one asleep worker
- In the asleep seed (Market Hand only, Energy 0%, $70), the nav has 3 buttons (Market, Upgrades, Farm; chromium-360-asleep-rects.json) and the Workers list shows no `Refill 1 tired worker` bar (chromium-360-4a-asleep-viewport.png). In the banner seed (Grader asleep, N=1) both appear (chromium-360-3-nav-badge.png, -2c-grader-viewport.png).
- T5 / AC-R9 say the bulk button reads `Refill 1 tired worker` at N=1 and is hidden only at N=0. If the hide here is intentional (e.g. only one worker hired, so bulk = the card button), please add that rule to rc1-asleep-state-spec.md; if not, it's a bug. Not graded until PM Workers answers. The card's own Refill is visible and enabled, so the player is not stuck.

## 6. Still open from 23:25 (no new build)
Sticky `Refill 1 tired worker` bar floats over the next card's `⚠ Unpaid…` banner at 360 (chromium-360-2c-grader-viewport.png). Fix unchanged: opaque `--c-panel` strip behind `div.refill-wrap`, full sheet width, 8px padding, plus scroll margin. Re-check at 1280 docked after the fix.

## Out of scope / logged only
- qa/m3-recheck/release-confirm-m3-rc1-qa-v4/shots/*.png (33): QA release-confirm run on already-reviewed 7d52952 (build-id, v3/v4/v5 save, core loop, file-URL boot). Release-gate evidence, not a UI spec item.
- qa/scratch/pr7-b1004e7/docs/readme/*.png and qa/scratch/sd5-1-5d636d8/docs/readme/*.png (8): md5-identical to qa/scratch/pr6-594cd59 README copies.

## Remaining coverage asks (d56033f)
- Firefox and WebKit runs (`capture.mjs firefox|webkit`).

## Still waiting on
M4-A sign-off captures (locked `Needs Farm L{n}` row + aria, MAX row, `Balanced farm 5/5 · +30%` + toasts, Farm tab at 360 and 1280 docked, strip text-alternative DOM dump); B-1 Coop full SHA (PM Workers); B-3 compact Farm card SHA (UI engineer); 'Limited by collecting' overlap fix (rc2-notes-b2-b3.md); v1.6.1 goal label (rc1-upgrade-value.md v1.6.1 §4).
