# M3 AC14b: Save-recovery dialog — v1.2 (Head of Art & UX, 2026-10-15; v1.2 2026-10-16)
Source: engineering/m3-rc0-save-hardening.md, CEO ruling (no silent wipes). Mock: mockbuild/m3-save-recovery.html → .png (cases r/f/q at 360 and 960); storage-full close-ups mockbuild/m3-save-recovery-q-{360,960}.png. `m3-save-recovery.html#qm` / `#qw` renders a single case.

## Changelog
- v1.2 (2026-10-16): consolidated mock pack in save-recovery-ac14b/ (dialog.html + R/F/Q PNGs at 360 and 960). No copy or behaviour change.
- v1.1 (2026-10-16): Q variant rendered (it was cut off in the v1.0 PNG). In Q (`copy_failed:true`) Export becomes a **secondary outlined button** (full width, 44px), because it's the only way to keep the old save. Export is a `<button>`, never an `<a>` without href (that isn't focusable). The mock uses `role="alertdialog"` + labelledby/describedby. Added the export failure copy, the Q in-memory lifetime and Settings re-export, and QA ACs 6–8.
- v1.0 (2026-10-15): first release.

## Goals
The player always learns what happened, feels it isn't their fault, and gets back to play in one tap. No jargon (no "corrupt", "checksum", "parse", "storage quota" in player-facing text).

## Cases → copy
| Case (trigger) | Icon | Title | Body | Note | Primary button |
|---|---|---|---|---|---|
| R: restored (`restored_from_backup:true`) | icon-coop.svg | Welcome back! | Something went wrong with your latest save, so we loaded your most recent backup. You might be a few moments behind. | – | Keep farming |
| F: started fresh (`restored_from_backup:false`, incl. backup also bad) | char-chicken.svg | A fresh start | We couldn't open your saved farm, so a new one is ready for you. We've kept a copy of the old save, just in case. | – | Start farming |
| Q: started fresh + `copy_failed:true` | char-chicken.svg | A fresh start | We couldn't open your saved farm, so a new one is ready for you. Your device is low on space, so we couldn't keep a copy. | Export it now if you'd like to keep it. | Start farming |
(If R ever coincides with copy_failed: R copy, plus Q's note line replaced by "Your device is low on space. Export the old save now if you'd like to keep it.")

Optional link (all cases): **"Export old save"** (the brief's "Export corrupt save", renamed for players). Downloads the raw bytes as `eggfarm-old-save-<YYYYMMDD-HHmm>.json` via the existing pt1 export path (WebKit fallback: new tab / clipboard). In Q it exports from memory. Show the link only if the raw bytes are available. After export: inline text "Saved a copy." (aria-live=polite); the dialog stays open. If the export fails or is cancelled: "Couldn't save a copy. Try again." (same live region, #3E2C23); the button stays enabled.
**Element:** always a `<button type="button">`. R/F: text-style button (Nunito 14 underline, #8A5528, min-height 44px). **Q: secondary button**: full width, min-height 44px, 12px below the primary, white bg, 2px border #8A5528, text #8A5528 Nunito 700 16 (6.16:1), pill, same focus ring.
**Q lifetime:** the raw bytes stay in memory for the rest of the session. Settings shows "Export old save" under Export until the page is reloaded (copy is the same; no storage write). Never write it to storage again in a loop (hardening: no retry).

## Layout
- Scrim: Soil Brown #3E2C23 @55% over the game. Card: Warm White, 3px border Soil Brown @80%, radius 16, 4px toy shadow, padding 24, centred, text centred.
- Stack: icon 72×72 → title (Fredoka 24 bold) → body (Nunito 16/1.4, max 4 lines at 360) → optional note (Nunito 14, Hay Gray #6B5D52) → primary button → link.
- 360px: card width = viewport − 48 (312 at 360), button full width, 48px tall. Vertically centred; if the viewport height is under 480 the card is top-aligned with 16px margin and scrolls internally.
- 960px+: card fixed 440px wide, centred in the full window (not inside the side panel). Between 361 and 959: min(440, vw−48).
- Button: pill, bg Meadow Strong #3D7F33, white Fredoka 18 semibold. Link: Nunito 14 underlined, Wood Text #8A5528, tap area ≥44px tall.

## Tokens
scrim `#3E2C23/0.55` · surface `#FFFFFF` · text `#3E2C23` · muted `#6B5D52` · btn-bg `#3D7F33` · btn-text `#FFFFFF` · link `#8A5528` · focus `#2B79A8` 3px ring, 3px offset · radius-panel 16 · radius-pill 999 · shadow 0 4px 0 rgba(62,44,35,.3).

## Contrast (WCAG AA)
White on #3D7F33 ≈ 5.1:1 · #3E2C23 on white ≈ 14:1 · #6B5D52 on white ≈ 6.4:1 · #8A5528 on white ≈ 6.4:1 · focus ring #2B79A8 vs white ≈ 4.9:1 (≥3:1 non-text). All pass.

## Behaviour, focus and keyboard
- Shown before the game is interactive, on top of everything (incl. the FTUE overlay; onboarding waits until the dialog closes; on fresh start, onboarding then runs as normal).
- Modal: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`=title, `aria-describedby`=body+note. Background `inert`.
- **Not dismissable** by tapping/clicking the scrim, by Esc, or by back-gesture; only the primary button closes it. (Esc does nothing.)
- Initial focus: primary button (visible focus ring). Tab order: button → link; focus is trapped and wraps. Enter/Space activate. On close, focus goes to the game's first control (Collect).
- Motion: card pop-in 200ms ease-out-back; reduced motion → 150ms fade. No sound, no particles.
- Telemetry: the existing `save_corrupt` event; optionally `save_recovery_export` on link tap (Engineering's call).

## ACs for QA
1. Each fixture shows the right case (R/F/Q) with the exact copy above; no jargon terms appear.
2. Scrim tap, Esc and Back don't close it; the button does.
3. Focus starts on the button, is trapped, and returns to the game afterwards; works keyboard-only.
4. Layout matches the mock at 360×640 and 1280×800 with no clipping; text 200% zoom is still readable (scrolls).
5. Export produces a file (or the WebKit fallback) in all three cases, including Q.
6. Q fixture (`copy_failed:true`, quota full): the copy and note match exactly, Export is the outlined secondary button ≥44px tall, and getBoundingClientRect of both buttons is ≥44px; matches m3-save-recovery-q-360/960.png.
7. Q: after "Start farming", Settings shows "Export old save" and it still exports the same bytes; after a reload it's gone. No repeated storage writes (DevTools: one QuotaExceededError max).
8. Accessibility tree: role alertdialog, aria-modal true, name = title, description = body (+note); Tab cycles primary ↔ Export only.
