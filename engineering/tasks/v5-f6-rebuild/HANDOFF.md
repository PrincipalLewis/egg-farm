# F6 rebuild: HANDOFF (Features)

Updated 2026-11-10 ~03:25 CET (Europe/Belgrade). Task HoE/v5-f6-rebuild. Branch `feat/v5-f6-rebuild` (ON ORIGIN), worktree `/workspace/wt-v5-f6-rebuild` (node_modules symlinked from wt-v5-breeds-ui-prB; same package-lock). Base: `origin/rc/v5` @ d65391b (#111 merged).
API: `engineering/tasks/v5-f6-rebuild/API.md`, **DRAFT v0.2**. Consumers: Generalist (golden, broody) and Hire 3 dec9a396 (streak).

## Done
- Ported #86's UI layer (2b4abf93 / bundle-f6 6307674) against rc/v5's current APIs. This is a port, not a rebase.
  - `src/ui/overlay-spec.ts`: the named Art constants. AUDIO_MIN_GAP_MS was dropped (no audio yet).
  - `src/ui/overlay-spots.ts`: layoutKey, spotCentres (+ inset), validSpots (viewport inset, then **golden-spots.validSpotIds**, so the R14 rule exists once), DOM_ZONES / domZones.
  - `src/ui/overlay.ts`: the slim attendance exports are unchanged. Added FxBudget, OverlayCtx / OverlayFeature, registerFeature / registeredFeatures / clearFeatures, and mountOverlay (lazy layer, validSpotIds for Game.setSpotProbe, registerZone, registerSheet).
  - `src/ui/features.ts`: empty list.
  - `src/ui/app.ts`: `import './features'`; FxBudget replaces the local `live[]` (same 30 cap, same recycling); `attDialogOpen` is shared by wireAttended and mountOverlay; one `mountOverlay(...)`; `overlay.render(t)` in renderAll.
- Tests: new `tests/v5-f6-overlay.test.ts` (25), covering AC1/2/3/8/11/AC-SHEET via ctx, and AC12 flag-off/no-feature #app hash identity in mountApp.
  - Updated guards: `tests/v5-p8-slim.test.ts` [RF-AC16] now allows exactly one mountOverlay fed by the same dialogOpen as wireAttended, and still forbids AudioHooks/registerFeature in app.ts. `tests/qa-rc1-bugs.test.ts` BUG-4/5 accepts the `fx.release(el); }, 1500)` form. **HoQA/Architect: please ack these two guard edits.**
- Focused vitest (36 files that touch overlay/app/attended/golden-spots): 569/569. tsc 0.

## Next (phase 2, ~5 h)
1. Audio hooks (AudioHooks, registerAudioHook, Audio.playFile/qaLog) and the build:qa `eggfarmQa` seam (overlay.spots, fx.setMax, menu/sheet) + the check-release-build `eggfarmQa` guard. Port from 6307674 and finalise API.md v1.0.
2. Flag-off release parity vs rc/v5: build:html on both, release-load #app hash (chromium), plus bundle check-release-build.
3. Spot browser check at 360 / 390 / 1280×800 / 1024×474 (port scripts/v5-f6-browser.mjs). Author evidence only.
4. One full gate at the final head, then HANDOFF + push. No PR (not in scope).

Hours left: **~5 h** (of the 6–8 h budget, ~2 h used).
