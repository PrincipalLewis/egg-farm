# Architect sign-off: F6 rebuild guard-test edits at `origin/feat/v5-f6-rebuild` 7810680
**Reviewer:** Architect · 2026-11-10 03:35 CET · read-only. A detached worktree (`worktrees/rev-f6-7810680`) was used only to run tests. No push, no PR action.
**Head:** `7810680bb3f33448b4465a4fab2ef0ab778dee9d` (fetched 03:24 CET), base `d65391b` (rc/v5). Production delta checked: `src/ui/app.ts` (+12/-10), `overlay.ts`, `features.ts` (empty), `overlay-spots.ts`, `overlay-spec.ts`.
**Run (Node 20.19.2, flock .vitest-eng.lock, nice 10):** `vitest run tests/v5-p8-slim.test.ts tests/qa-rc1-bugs.test.ts tests/v5-f6-overlay.test.ts` → **3 files, 97/97 pass** (p8-slim 27, qa-rc1-bugs 45, f6-overlay 25).
**Mutation probe:** I evaluated the exact guard regexes against mutated `app.ts` text. The guards are pure source-text checks, so this is equivalent to rerunning the tests.

## Edit 1: `tests/v5-p8-slim.test.ts:117-122` [RF-AC16]: **SIGN-OFF** (1 Minor, non-blocking)
- **Original intent** (bd641ff, 2026-11-05, slim scope D-HOP-2026-11-05-06): app.ts installs **one** shared attended probe and **no** F6 engine, so the overlay can never hold a second, divergent attended or dialog source.
- **Why the loosening is justified:**
  - HoE/v5-f6-rebuild now puts the mount host in scope.
  - The production code really does share the closure: `app.ts:185-186` `const attDialogOpen = makeDialogOpen(...)`, `wireAttended(g, attDialogOpen)`, and `app.ts:873` `mountOverlay({..., dialogOpen: attDialogOpen, ...})`.
  - The overlay's `ctx.attended` is `attendedProbe(doc) && !d.dialogOpen()` (`overlay.ts:112`), the same signal as `wireAttended` (`overlay.ts:55-56`).
  - `FxBudget` comes off the forbidden list. That is justified: it replaces `live[]` with the same cap (`FX_MAX_LIVE = 30`, `overlay-spec.ts:33`) and the same oldest-first recycling (`overlay.ts:65`). The goal sparkle check `fx.count <= fx.max - 4` equals the old `live.length <= 26`.
  - Flag-off and no-feature `#app` identity is now held by a behavioural test (`v5-f6-overlay.test.ts:196-201`, F6-AC12). That replaces the old "no engine" text guard.
- **The guard still catches the regression it was written for:**
  - A second `mountOverlay({…})` → FAIL (caught).
  - `dialogOpen: () => false` (a divergent dialog source) → FAIL (caught).
  - `registerFeature` or `AudioHooks` in app.ts → FAIL (caught).
  - `wireAttended(g,` still counts exactly 1.
- **Exactness: Minor m1.** The count is on `/mountOverlay\(\{/` only. A second call through a variable (`mountOverlay(deps2)`) **passes**, and so would a divergent `dialogOpen` with `dialogOpen: attDialogOpen` left in a comment (probe confirmed both). Suggested tightening, probe-checked to catch both while base passes:
  `expect(app.match(/\bmountOverlay\(/g)).toHaveLength(1); expect(app.match(/\battDialogOpen\b/g)).toHaveLength(3); expect(app).toMatch(/mountOverlay\(\{[^}]*dialogOpen: attDialogOpen[,\s}]/);`
  This is not blocking: the code is correct today, and F6-AC12 covers behaviour. Fold it into phase 2.

## Edit 2: `tests/qa-rc1-bugs.test.ts:119` BUG-4/5: **SIGN-OFF**
- **Intent** (#31): the leaving customer ghost lives **1500 ms** (past the 300 + 240 ms wave and slide) and leaves the FX live list on expiry, with no bubbled `animationend` kill (`:120` unchanged).
- **The edit is exact.** It adds only the literal alternative `fx\.release\(el\); \}, 1500\)`, which is `fx.release` specifically, not any `fx.*`. It matches the one production site, `app.ts:399` (`setTimeout(() => { el.remove(); fx.release(el); }, 1500)`). The general `expire()` uses `}, ms)` and cannot match.
- **Regression probe:**
  - Ghost timer 1500 → 500: FAIL (caught).
  - `fx.release` dropped: FAIL (caught).
  - `fx.release` → `fx.admit`: FAIL (caught).
- **The production change justifies it:** `live[]` became the shared `FxBudget`, and `release` is the same `indexOf`/`splice` (`overlay.ts:66`).
- nit: the two old alternatives (`spawn(el, 1500)`, `live.splice(i, 1); }, 1500)`) no longer match anything in app.ts. Dropping them would make the guard tighter. Optional.

## Summary
Edit 1 SIGN-OFF (m1 tightening recommended in phase 2). Edit 2 SIGN-OFF. HoQA's ack is separate.
