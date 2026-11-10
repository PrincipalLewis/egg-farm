# AC14b Save-recovery dialog · v2.1 · 2026-10-16 · Head of Art & UX
Source: engineering/m3-rc0-save-hardening.md. This version replaces ac14b-save-recovery.md v2.0. Layout, focus and Esc rules are unchanged. The copy is shorter: titles are 4 words or fewer and bodies fit in 2 lines at 360px.
Mock source: `mocks/save-recovery.html` (`#r|f|storage` + `-m` for 360 or `-w` for 1280), rendered with headless Chrome to `mocks/save-recovery-{restored,fresh,storage}-{360,1280}.png`.

## 1. Strings (final)
Player text never uses the words "corrupt", "error", "checksum" or "quota", and never blames the player.
| Case | Trigger (`save_corrupt` log) | Icon + badge (not colour alone) | Title | Body | Primary | Export |
|---|---|---|---|---|---|---|
| Restored | `restored_from_backup:true` | coop + ✓ badge (`--c-meadow-strong`) | Welcome back! | We loaded your backup. You may be a few moments behind. | Keep farming | text link "Export old save" |
| Fresh | `restored_from_backup:false` (including when the backup is also bad) | chicken + ★ badge (`--c-focus`) | A fresh start | We couldn't open your farm. Your old save is kept safe. | Start farming | text link "Export old save" |
| Storage full | `copy_failed:true` | chicken + ! badge (`--c-wood-text`) | A fresh start | We couldn't open your farm. Export it now to keep a copy. | Start farming | outlined secondary button "Export old save" (exported from memory) |
- Restored + `copy_failed` (rare): use the Restored title. Body: "We loaded your backup. Export the old save now to keep it." Use the outlined Export button.
- Export result line (aria-live polite, Nunito 14, `--c-muted`, 8px below the export control): "Saved a copy." / "Couldn't save a copy. Try again." The dialog stays open either way.
- File name: `eggfarm-old-save-<YYYYMMDD-HHmm>.json`. The export control is shown only when the raw bytes exist. Never retry storage writes.

## 2. Layout (px)
- Scrim `--c-scrim` covers the whole viewport, docked panel included. The card is centred in the full window.
- Card: `--c-white`, 3px `--c-outline` border, radius 16, shadow 0 4px 0 rgb(62 44 35/.3), padding 24, text centred.
- Width: `min(440, 100vw − 48)`, which gives 312 at 360 and 440 at 1280. Viewport height under 480: top-aligned with a 16px margin, and the card scrolls.
- Stack: icon 72×72 (badge 28 circle, 2px white ring, bottom-right −6/−4) → 8 → title Fredoka 700 24/1.2 `--c-text` → 8 → body Nunito 400 16/1.4 `--c-text`, max 2 lines → 16 → primary.
- Primary: full width, min-height 48, pill, `--c-meadow-strong` bg, `--c-white` Fredoka 600 18.
- Export text link (Restored/Fresh): 8px above, min-height 44, hit area ≥ 44×120, Nunito 14 underlined, `--c-wood-text`.
- Export secondary (Storage): 12px above, full width, min-height 44, `--c-white` bg, 2px `--c-wood-text` border, Nunito 700 16 `--c-wood-text`.
- Focus ring: 3px `--c-focus`, offset 3.

## 3. Tokens and contrast (all existing tokens)
| Pair | Ratio |
|---|---|
| `--c-text` #3E2C23 on white | 14:1 |
| `--c-muted` #6B5D52 on white | 6.4:1 |
| white on `--c-meadow-strong` #3D7F33 | 5.1:1 |
| `--c-wood-text` #8A5528 on white | 6.4:1 |
| `--c-focus` #2B79A8 ring | 4.9:1 (needs ≥3:1) |
| badge glyphs (white on meadow-strong / focus / wood-text) | ≥4.9:1 |
All pass WCAG AA.

## 4. Behaviour
- Shown before the game becomes interactive, above everything, and the FTUE waits for it. The background is `inert`.
- Enter: 200ms pop-in (with reduced motion, a 150ms fade). No sound and no particles.
- The primary button closes the dialog and focus moves to Collect. Export does not close it: it shows the busy state (`aria-busy`, same label) and then the result line.
- **Esc does nothing.** Neither do a scrim tap or Android Back. The player has to acknowledge the dialog, and nothing is lost by staying.
- Storage case: the bytes stay in memory for the session, and Settings shows "Export old save" until reload.

## 5. Focus order and screen reader
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` = title, `aria-describedby` = body (+ result line).
- Initial focus is on the primary button. Tab and Shift+Tab move between primary and Export and wrap around (with no Export, focus stays on the primary). Enter and Space activate.
- The icon and badge are `alt=""` / `aria-hidden` because the title carries the meaning.
- Announced labels: "Welcome back! We loaded your backup…", buttons "Keep farming" / "Start farming", and "Export old save, downloads a copy of your old save file" (`aria-label`).
- At 200% zoom the card scrolls and nothing is clipped.

## 6. QA checks
1. Each fixture shows the exact strings above. 2. Esc, a scrim tap and Back don't close the dialog. 3. Focus starts on the primary button, stays trapped and returns to Collect. 4. Every control's height is ≥44. 5. Export works in all 3 cases (Storage exports from memory). 6. There's at most one QuotaExceededError (no retry loop). 7. Matches the mocks with no clipping at 360 and 1280.

## v2.2 note (2026-10-16)
Restored case: show the Export link only when an old (corrupt) main save exists. When main was missing and the .bak restored, there's nothing to export, so no link. Focus ring is keyboard-only (:focus-visible), 3px solid (#2B79A8 in build), contrast at least 3:1; matches v2.1.

### Case: Can't save (storage full, farm loaded OK), added 2026-10-16 17:10
Icon: barn with ! badge. Title: Saving is paused. Body: Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress. Primary: Keep farming. Secondary: outlined button Export save. Card fully opaque; the persistent no-save toast is suppressed while the dialog is open.
