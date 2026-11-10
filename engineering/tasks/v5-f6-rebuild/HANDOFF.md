# F6 rebuild: HANDOFF (Features)

Updated 2026-11-10 ~03:25 CET (Europe/Belgrade). Task HoE/v5-f6-rebuild. Branch `feat/v5-f6-rebuild` (ON ORIGIN), worktree `/workspace/wt-v5-f6-rebuild` (node_modules symlinked from wt-v5-breeds-ui-prB; same package-lock). Base: `origin/rc/v5` @ d65391b (#111 merged).
API: `engineering/tasks/v5-f6-rebuild/API.md`, **v1.0 (all [stable])**. Consumers: Generalist (golden, broody) and Hire 3 dec9a396 (streak).

## Done
- Ported #86's UI layer (2b4abf93 / bundle-f6 6307674) against rc/v5's current APIs. This is a port, not a rebase.
  - `src/ui/overlay-spec.ts`: the named Art constants. AUDIO_MIN_GAP_MS was dropped (no audio yet).
  - `src/ui/overlay-spots.ts`: layoutKey, spotCentres (+ inset), validSpots (viewport inset, then **golden-spots.validSpotIds**, so the R14 rule exists once), DOM_ZONES / domZones.
  - `src/ui/overlay.ts`: the slim attendance exports are unchanged. Added FxBudget, OverlayCtx / OverlayFeature, registerFeature / registeredFeatures / clearFeatures, and mountOverlay (lazy layer, validSpotIds for Game.setSpotProbe, registerZone, registerSheet).
  - `src/ui/features.ts`: empty list.
  - `src/ui/app.ts`: `import './features'`; FxBudget replaces the local `live[]` (same 30 cap, same recycling); `attDialogOpen` is shared by wireAttended and mountOverlay; one `mountOverlay(...)`; `overlay.render(t)` in renderAll.
- Tests: new `tests/v5-f6-overlay.test.ts` (25), covering AC1/2/3/8/11/AC-SHEET via ctx, and AC12 flag-off/no-feature #app hash identity in mountApp.
  - Updated guards: `tests/v5-p8-slim.test.ts` [RF-AC16] now allows exactly one mountOverlay fed by the same dialogOpen as wireAttended, and still forbids AudioHooks/registerFeature in app.ts. `tests/qa-rc1-bugs.test.ts` BUG-4/5 accepts the `fx.release(el); }, 1500)` form. **QA-D-1110-F6-GUARDS: HoQA SIGNED OFF (03:25 CET) with both tightenings applied:** (1) RF-AC16 also asserts `new FxBudget(` appears exactly once in app.ts (one shared budget); (2) BUG-4/5 fx branch tightened to `el\.remove\(\); fx\.release\(el\); \}, 1500\)`. Both files 72/72. The F6 QA bar can start once these are in; no separate QA re-look. Architect sign-off on the guard edits is still to be recorded.
- Focused vitest (36 files that touch overlay/app/attended/golden-spots): 569/569. tsc 0.

## Phase 2 done so far (03:35 CET)
- Audio hooks use the exact #86 2b4abf93 names (AudioHooks.play(hook, {semi}) / sfx, registerAudioHook, AUDIO_HOOKS, AudioLogEntry) plus an additive `register`. `Audio.playFile` / `load` / `qaLog`; `Audio.play(name)` is unchanged for callers.
- `src/ui/qa-seam.ts`: eggfarmQa (audio.log, fx, menu, sheet.stepClose, overlay.spots). app.ts installs it under IOS_FLAG_ENABLED only.
- `ctx.pops` (set / active), shared per host and cleared by destroy(). It feeds streak's CT-AC10.
- tests/v5-f6-overlay.test.ts: 37. Focused set (36 files): 581/581. tsc 0.

## Next (phase 2, ~5 h)
1. Audio hooks (AudioHooks, registerAudioHook, Audio.playFile/qaLog) and the build:qa `eggfarmQa` seam (overlay.spots, fx.setMax, menu/sheet) + the check-release-build `eggfarmQa` guard. Port from 6307674 and finalise API.md v1.0.
2. Flag-off release parity vs rc/v5: build:html on both, release-load #app hash (chromium), plus bundle check-release-build.
3. Spot browser check at 360 / 390 / 1280×800 / 1024×474 (port scripts/v5-f6-browser.mjs). Author evidence only.
4. One full gate at the final head, then HANDOFF + push. No PR (not in scope).

Hours left: **~5 h** (of the 6–8 h budget, ~2 h used).
