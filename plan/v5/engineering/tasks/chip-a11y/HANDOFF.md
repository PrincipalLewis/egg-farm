# HANDOFF: chip-a11y-1, order-chip accessible label, fc5fe67

**Date:** 2026-11-10 00:05 CET (Europe/Belgrade, UTC+1)
**Task:** TASK HoE/chip-a11y-1 · HoP D-HOP-2026-11-09-01 · spec sha1 82176255315423ec7981444e7766ffcd9ea01821 (verified)
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/118 (Ready, base rc/v5)
**Tip:** `fc5fe67f18085784661b10bc292c67d90a24f8f0` · tree `486193c1e1b13f65a5b2188e721ee8817e40689d` · parent `f20b9183` (rc/v5 tip at fetch)
**Branch / worktree:** `gen/chip-a11y` · `/workspace/wt-gen-chip-a11y` (own `npm ci` node_modules; the symlinked node_modules in other worktrees were dangling after the reboot)

## Done
- `src/ui/app.ts`: removed the static `aria-label="Customer"` from the `.chip.arrive` template. `renderQueue` computes `left = demand - filled` and `n = fmtCount(left)` once and uses them for both `.tag .num` and the aria-label, in the same render. The attribute is only written when it changes.
- Copy is in one exported helper, `orderChipLabel(visible, raw)`: `<n> egg wanted by customer` when raw is 1, else `eggs`.
- No live region, no role, no new states.
- `tests/order-chip-a11y.test.ts`, 4 tests: the helper, including raw 1.5 → "eggs"; rendered names at 1, 0, 3, 1500 (`1,500`) and 12345 (`12.3K`); no Customer label, role or aria-live; re-render 4 → 3 → 1 → 0 on the same element. Written first: 4/4 failed before the change.

## Gates (artifacts/v5-chip-a11y-fc5fe67/)
- tsc: exit 0
- New test: 4/4
- npm test: 156 files, 2276 passed, 1 skipped
- build and build:html, both with check-release-build: exit 0
- Goldens: none changed

## Hosted (pull_request @ fc5fe67)
- ci: 42717419074
- pacing-x1-stack: 42717418863
- k10-breeds-offset: 42717419075

## Next
- Watch the hosted runs.
- Architect bar, then UI QA bar for HoQA: Chromium a11y tree at 360×640 and 1280×720, plus axe `label-content-name-mismatch` (not run locally).
- No merge until HoQA GO. #100 held, flags 0. No Claude review.
