# #116 Architect CHANGES — abilities UI sheetCloseComplete + ability_blocked

Date: 2026-11-06 (Europe/Belgrade, UTC+1)
Author: Senior Engineer, Features & Economy Wiring <features@egg-farm.local>
PR: https://github.com/PrincipalLewis/egg-farm/pull/116 (stay **Draft**)
Branch: feat/v5-abilities-ui
Old tip: `dc3c60f390fd2da4cebf0cc9075df9a59d17dbc0` (dc3c60f)
New tip: `a3c6dc510b5f0126a437fc13b9a5788ef8d34206` (a3c6dc5)
Content commit: `11f6b551a288825c64c161882192f3202cd30c94` (11f6b55) — same tree
Tree: `639662d15dc13703f4aad4a6d3aef0ccdea235f4`
Base: rc/v5 (unchanged; no merge-forward this pass)

## What changed

Architect review `engineering/reviews/abilities-ui-dc3c60f-architect.md` CHANGES (blocking 1–2):

1. **Sheet close clock (AB-14 / AC-M5A-22):** portrait successful `fireAbility` / `activateAll` no longer clears attendance via sync `openPanel(null)`. UI calls `registerSheet('upgrades').opened()`, starts the visual close (drop `#panel-layer.open`, keep `#p-upgrades` visible through transform), and holds `makeDialogOpen` via `anySheetOpen()` until `sheetCloseComplete` (transitionend, reduced-motion immediate, or harness `ui.sheetCloseComplete()`). Sim still stores no pending-close. Docked path unchanged (`abilityInSheet` false).

2. **ability_blocked telemetry:** removed `aria-disabled` early returns on `onFireAbility` / `onActivateAll`. Always dispatch through sim eligibility; blocked taps shake via `afterAbilityFire(!ok)` and emit `ability_blocked`.

Non-blocking minors 3–6 left out of scope (refillAgoSimMs / workersHtml wall default / assets preload fine; closeSheet proxy already equivalent via state-changed `ok`).

## Files

- `src/ui/app.ts` — registerSheet hold, `sheetCloseComplete` harness export, dispatch-then-shake
- `tests/v5-abilities-ui.test.ts` — fire+activateAll close-transition regressions + asleep aria-disabled telemetry

No `balance.json` / flags / `abilities.ts` sim / save schema changes. Flags stay shipping 0.

## Verify (lane features, flock .vitest-eng.lock, nice 10)

- `tsc --noEmit` → 0
- `vite-node scripts/sync-economy-cli.ts -- --check` → 0
- `vitest run tests/v5-abilities-ui.test.ts tests/v5-abilities-sim.test.ts tests/m4a-flag-off.test.ts` → **44/44**

## Push / attribution

Plain push only (no force). Stay Draft. #108/#111 untouched.
Content landed in `11f6b55` (shared worktree `user.*` raced to Architect identity). Empty follow-up `a3c6dc5` sets Features author/committer explicitly; tree unchanged.
