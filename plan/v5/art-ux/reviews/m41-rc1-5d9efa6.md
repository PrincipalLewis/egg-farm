# RC-SHA spec check — M4.1 RC1, PR #67 (`rc/m4.1-rc1`) @ 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463

**Verdict: PASS.** 0 Blocker / 0 Critical / 0 Major / 0 Minor / 0 new Nits. 2 pre-existing #64 Nits are carried unchanged (see below).
UI/Visual Designer · 2026-10-24 16:40 CEST (UTC+2) · merge-result focus, not a full re-review · engines Chromium 155.0.8059.84 / Firefox 157.0 / WebKit 27.2 (playwright-core 1.64.1) · all renders under `flock /workspace/egg-farm-studio/.browser-test.lock`, one at a time, short per-engine runs.
Baselines: m41-pr60-pr61, m41-pr62-09cee47, m41-pr63-8694222, m41-9-7779088-3110e88, m41-9-c877f69.

## Build identity
- Clean worktree `art-ux/scratch/rc1-5d9efa6`, HEAD = 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463. `npm ci` + `build:qa` + `build:html` OK. Build-id `m4.1+5d9efa6`.
- `dist-html/egg-farm.html` sha256 = `ccb87daa60b5b8f722504642561f8a6061c8335555fd669a16872add2e88d5e1`. **✓ Starts ccb87daa and ends 88d5e1.** It matches `gates-m41-rc1-5d9efa6/dist-html-sha256.txt`.
- Unit tests 148/148: m41-9-ux-ccr-m1, m41-9-ux-rulings, m41-9-ux-minors, m4-exp1-explainer, m41-7-explainer-recovery, m41-7-csr-copy, m41-9-big-number, m41-9-art-rulings.

## Shot sets
- `/workspace/wt-ui-shots/gates-m41-rc1-5d9efa6/` — **REJECTED: no `manifest.json`.** It has 34 files and 0 PNGs (build logs, rc0 logs, sweep jsonl/summary, sha txt). I used it as context only.
- `/workspace/wt-ui-shots/m41-9-5d9efa6/` — **ACCEPTED.** `manifest.json` is present: 180 shots, 60 per engine, all @5d9efa6, 0 missing. The per-shot entries lack sha256 (minor process note). I reused it for the WebKit 375/390 sweep and tap cells instead of re-rendering.
- `qa/m41/rc1-5d9efa6-ui/` had no manifest when I checked, so nothing from it was reused.
- Own: `art-ux/shots/m41-rc1-5d9efa6/`: 469 PNG (Cr 177 / Fx 166 / WK 126). The top-level `manifest.json` has full SHA, engine, size, state and sha256 per shot, plus the sub-manifests for pr60-61, pr62, pr63, pr64-65 and sweep. Results JSON sit alongside. Scripts: `art-ux/scratch/rc1/*.mjs` and `rc1-5d9efa6/scripts/art-sweep.mjs` (an untracked copy of the repo sweep with OUT under art-ux).

## Check 1 — `src/ui/tracks-explainer.ts` merge of #63 + #65
The merge is clean. The diff against c877f69 is only the #63 inserts:
- `:18` modalOpen includes `.recovery-layer`.
- `:22` restoreBoot.
- `:137–150` onDismiss / markSeen gates.
- `:170` `markSeen` unless `how === 'timeout'`.
- `:172` kbd-focus only for `'key'`.
- `styles.css:529` `[data-place=none]{visibility:hidden}`.
- `styles.css:561` nav ring `outline-offset:-3px`.

**(a) Restore boots, 360x640, Cr/Fx/WK** (`pr63/`, 45 PNG):

| | M1 | M1cf | M2 | M2cf |
|---|---|---|---|---|
| card frames while `.recovery-layer` up (sampled 194–276 rAF) | 0 | 0 | 0 | 0 |
| card after Continue + Welcome back (≈1.75–1.83 s) | ✓ | ✓ | ✓ | ✓ |
| seen at show / after the 8 s auto-hide | null / null | null | null / null | null |
| reload 1 → card again (no dialog) | ✓ | — | ✓ | — |
| Got it → seen = true; reload 2 → no card | ✓ | ✓ (in the restore session) | ✓ | ✓ (in the restore session) |

M3/M4/M5 never show the card (fresh / failed / storage-blocked, same as baseline 8694222). 0 page errors.

**(b) Scrolled sheet** (own rerun with `art-sweep.mjs`):
- Cr 360/375/390, Fx 360/375/390, WK 360. 40 states + 4 fine-scroll sweeps per cell, scroll 0/100/200/300/end, mouse + touch, Farm/Collection, refund off/on.
- **0 overlaps** of the card with any Buy or Collect in every cell.
- Places: inside / default / band / none. `none` occurs only at 360 (Farm, refund, scroll 200; 6 per engine) and stays `visibility:hidden`.
- **p65-tap: 56/56/72 first taps = BUY per cell, 0 DISMISS-ONLY, 0 NOTHING, 0 page errors.**
- WK 375/390 come from the accepted engineer set m41-9-5d9efa6 (same SHA, 0 overlaps, 56/72 BUY, 0 dismiss-only).

## Check 2 — per-PR smoke at 360/390/1280 (Cr/Fx/WK unless noted)
- **#62** (`pr62/`, 108 PNG): `#goal` across 12 states × 3 widths × 3 engines.
  - Name = visible label + status, no `aria-label`. Chromium CDP names are byte-identical to baseline 09cee47 (0 diffs).
  - **axe 0** in all 108 renders. 0 clip.
  - The Fx/WK ariaSnapshot returns null for names containing ':' (known harness limit). Covered by axe + DOM.
- **#63** (`pr63/`):
  - M4/M5 badge '!' (`rc-badge warn`, no ✓); M1/M2 ✓ ok; M3 ★.
  - Export aria names "Export save file, downloads a copy of your old save file / current farm" and "Export old save file, …".
  - `#rcGo` 48 / `#rcExport` 44 at 360 (Cr/Fx/WK), 390 and 1280 (Cr).
- **#64** (`pr64-65/`):
  - Sell name starts 'Sell 12.9K' (`Sell 12.9K · +$17,612.00`).
  - The 75-egg line `74/75 eggs · $1,682.25` is 14px on 1 line at 360 (16px on 1 line at 390/1280).
  - Forced overflow `999Dc/999.9Dc eggs · $2.24e37` wraps at 12px on 2 lines at 360, with 0 ellipsis, 0 clip and no line overflow. 0 small targets.
- **#65:**
  - m1 save-warn notice shows and never covers Collect (it covers #goal ≤390 by spec, `toast-safe.ts:5`).
  - m2 refund pop `+$1.2K` with 3 coins and 1 ghost, and none under reduced motion. Chromium only, identical to baseline 7779088.
  - `.kbd-focus`/`:focus-visible` only on Enter/Space/Escape, never on mouse or touch.
  - Nav ring 3px at `-3px`, fully inside the viewport (360/375/390).
  - M3 card placement at 360–1280: 0 overlaps.
- **#60/#61** (`pr60-61/`, 42 PNG):
  - 'Needs Farm L7' (1 line); 'MAX' at F30; 'Max for this farm' override (aria "…Max for this farm.", contrast 7.83).
  - Build-id 'Egg Farm m4.1+5d9efa6', 12px, contrast 5.91, clear of every 44px target (gap ≥12px). In viewport, 0 errors.

## Check 3 — clipping and targets
- 0 text clipping across the #62/#64/#60/#61 probes and dialogs.
- Every probed target is ≥44px. Primaries ≥48 (`#rcGo` 48, Collect 64 high, Buy 48+).
- 0 small-target hits in the #64 scan.

## Findings
None new. Carried pre-existing Nits (unchanged vs 3110e88; axe counts equal or lower):
- n-a `src/ui/orders.ts:43` exact-money label-in-name on Sell.
- n-b `src/ui/orders.ts:62` exponent progress value (`aria-valid-attr-value` only on the forced 1e37 case).

## Gaps / notes
- #65 m2 pop probe and the #63 390/1280 dialog metrics are Chromium only. They are DOM/CSS-identical to the 3-engine baselines and the merge diff doesn't touch them.
- No servers of mine are left running.
