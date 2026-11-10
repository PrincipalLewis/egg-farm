# F6 rebuild: HANDOFF (Features)

Updated 2026-11-10 ~04:10 CET (Europe/Belgrade). Task HoE/v5-f6-rebuild. Branch `feat/v5-f6-rebuild` (ON ORIGIN), worktree `/workspace/wt-v5-f6-rebuild` (node_modules symlinked from wt-v5-breeds-ui-prB; same package-lock). Base: `origin/rc/v5` @ d65391b (#111 merged).
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

## ⚠ GUARD EDITS (reviewers: these change existing QA guards, not just add tests)
1. `tests/v5-p8-slim.test.ts` [RF-AC16]: was "no mountOverlay in app.ts"; now allows **exactly one** `mountOverlay(` call site, `attDialogOpen` used **exactly 3x** (declaration, `wireAttended(g, attDialogOpen)`, `dialogOpen: attDialogOpen`), exactly one `new FxBudget(`, and still forbids AudioHooks/registerFeature in app.ts.
2. `tests/qa-rc1-bugs.test.ts` BUG-4/5: the FX cleanup regex now requires `el.remove(); fx.release(el); }, 1500)` (FxBudget replaced `live[]`).
- Sign-off: **HoQA QA-D-1110-F6-GUARDS (d1f40d6)** for the FxBudget=1 and BUG-4/5 tightenings. mountOverlay=1 / attDialogOpen=3 tightening added at the commit after 6bca887 (mutation-checked: a 4th attDialogOpen use or a 2nd mountOverlay call fails). **Architect sign-off on the guard edits: still to be recorded.**

## F6 READY-EVIDENCE HEAD: 7a72faa (full gate 04:25 CET, ALL 14 steps rc=0)
- /workspace/artifacts/v5-f6-rebuild-7a72faa/gate-summary.txt: steps 1–8 rc=0 (test, slow, build, globals ×3, build:qa, golden, F6 browser ×3 at 122/122, build:html, release-load). Step 9 flag-0 parity vs rc/v5 d65391b via scripts/v5-f6-release-parity.mjs is rc=0, PARITY OK 7455aae9…. Tree clean (porcelain 0).
- Commits after 7a72faa are HANDOFF-only.

## Step-9 flake: root cause + fix (04:10 CET)
- **Root cause.** The old dump (`scripts/breeds-ui-prB-release-browser.mjs`, which lives on the PR-B branch, NOT on rc/v5) runs `click("Tap to start"); clock.runFor(2500)` as ONE fake-clock call. After the tap, boot awaits REAL IndexedDB / storage-lease I/O (`bootPreserveIdb`, lease). The Game is constructed at whatever fake instant the clock has reached when that real I/O resolves, anywhere in ~[310, 2500] ms or even after the window. The first egg lands ~700 ms of sim after construction. So the egg count at the dump depends on real I/O latency vs runFor speed, i.e. on machine load. Shown in `/workspace/artifacts/v5-f6-step9-flake/`: same 3.5 s of fake time gives `0 / 50` (single runFor) or `2 / 50` (runFor in 250 ms slices, diag-chunked-runFor.log); with fine stepping boot completes at fake 300–320 ms and the first egg 700–720 ms later.
- **Fix (F6 branch): `scripts/v5-f6-release-parity.mjs`.** Clock stays paused during the tap. It then advances in 10 ms slices until the HUD exists, and dumps exactly 100 ms of fake time after boot is observed, so sim progress at capture is 100–110 ms, far below the first lay. Same idea as zg-flagoff-dom / #111: capture at a fixed sim point and compare the full `#app` markup. Only the build id is normalised; no counters are masked.
- **Proof.** 6/6 runs under parallel load (full `npx vitest run` + 4 CPU burners) → PARITY OK `7455aae9…` every time (summary.txt). Negative check: one added attribute on `#meterText` in a copy of the head html → rc=1, `PARITY FAIL at node 81` (negative.log).
- Gate step 9 now runs this script (base = rc/v5 d65391b build).

## Phase 2 result (03:55 CET)
- Full gate at **6bca887** (/workspace/artifacts/v5-f6-rebuild-6bca887/gate-summary.txt): steps 1–8 all rc=0 (test, slow, build, globals ×3 engines, build:qa, golden, F6 browser ×3 engines 122/122 each, build:html, release-load chromium).
- Step 9 flag-0 parity vs rc/v5 d65391b: **rc=1 in the gate run**. The diff (step9-gate-diff.txt) is game state only: the f6 dump had laid 1 egg (`1 / 50`, Collect enabled) in the 3.5 s paused-clock window, the base dump had not; no markup/structure difference. Rerun idle right after (step9-rerun/hashes.txt): base, f6, f6 → **all 03a81bbf…** (build-id normalised), identical. So it is a load-timing nondeterminism in the release-load dump harness (something advances on wall time under load despite page.clock pause), NOT an F6 diff. Not root-caused; recorded as a harness flake to fix (open item), and the gate is reported as 13/14 + idle rerun of step 9 green, not as all-green.
- Browser spot check (author evidence only): chromium/firefox/webkit 122/122 at 360 / 390 / 1280×800 / 1024×474. WebKit audio.log is informational (no GStreamer mp3 decoder, QA-D-1030-WKDEPS).
- API.md v1.0, all [stable], sha256 82164ad8… (unchanged since a78c719).

## Open
- Architect sign-off on the guard edits.
- Release-load dump flake (step 9): pin it, e.g. install the clock before any script/timer (addInitScript) or compare structure with sim fields masked.
- No PR (not in scope).
