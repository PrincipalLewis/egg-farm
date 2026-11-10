# AC14b Save-recovery dialog: final spec · v2.0 · 2026-10-16 · Head of Art & UX
> Superseded by save-recovery-dialog.md v2.1 (2026-10-16 15:20).
Source: engineering/m3-rc0-save-hardening.md. This file consolidates m3-save-recovery-dialog.md v1.2 (copy and behaviour unchanged) and adds 1280×800 docked mocks. Mocks: `mocks/ac14b.html` (`#r-m`, `#f-m`, `#q-m` = 360; `-w` = 1280) → `mocks/ac14b-{r,f,q}-{360,1280}.png`.

## 1. Cases and copy (final)
No blame and no jargon: never "corrupt", "checksum", "parse", "quota" or "error" in player text.
| Case | Trigger (save_corrupt) | Icon | Title | Body | Note | Primary | Export |
|---|---|---|---|---|---|---|---|
| (a) R: restored | `restored_from_backup:true` | icon-coop.svg 72 | Welcome back! | Something went wrong with your latest save, so we loaded your most recent backup. You might be a few moments behind. | – | Keep farming | text link "Export old save" |
| (b) F: started fresh | `restored_from_backup:false` (incl. backup also bad) | char-chicken.svg 72 | A fresh start | We couldn't open your saved farm, so a new one is ready for you. We've kept a copy of the old save, just in case. | – | Start farming | text link "Export old save" |
| (c) Q: storage full | `copy_failed:true` | char-chicken.svg 72 | A fresh start | We couldn't open your saved farm, so a new one is ready for you. Your device is low on space, so we couldn't keep a copy. | Export it now if you'd like to keep it. | Start farming | **secondary outlined button** "Export old save" (exports from memory) |
R + copy_failed (rare): R title/body + note "Your device is low on space. Export the old save now if you'd like to keep it." and the secondary Export button.
"Export old save" = the brief's "Export corrupt save", renamed for players. It's shown only when the raw bytes are available. It downloads `eggfarm-old-save-<YYYYMMDD-HHmm>.json` through the pt1 export path. Result line (aria-live polite, 14px, under the export button): "Saved a copy." or "Couldn't save a copy. Try again." The dialog stays open either way. In Q, the bytes stay in memory for the session, and Settings shows "Export old save" until reload. Never retry storage writes.

## 2. Layout
- Scrim `--c-scrim` (#3E2C23 @55%) over the whole app, including docked panels at ≥960.
- Card: #FFFFFF, 3px border `--c-outline`, radius `--r-lg` 16, shadow 0 4px 0 rgb(62 44 35/.3), padding `--s-5` 24, text centred.
- Stack: icon 72 → 8 → title Fredoka 24/700 → body Nunito 16/1.4 (≤4 lines at 360) → note Nunito 14 `--c-muted` → 16 → primary (full width, 48px, pill, `--c-meadow-strong` bg, white Fredoka 18/600) → export.
- Export in R/F: `<button>` text style, Nunito 14 underlined, `--c-wood-text` #8A5528, min-height 44, 8px above. In Q: full width, 44px, 12px above, white bg, 2px #8A5528 border, #8A5528 Nunito 16/700, pill.
- Width: 360–959 → `min(440px, 100vw − 48px)` (312 at 360). ≥960 → 440px, centred in the **full window** (not in the farm column). Height <480 → top-aligned with a 16px margin, and the card scrolls inside.

## 3. Tokens and contrast
`--c-scrim`, surface #FFF, text `--c-text` #3E2C23 (14:1), muted `--c-muted` #6B5D52 (6.4:1), primary `--c-meadow-strong` #3D7F33 with white (5.1:1), link `--c-wood-text` #8A5528 (6.4:1), focus `--c-focus` #2B79A8 3px ring offset 3 (4.9:1, ≥3:1 non-text). All pass AA.

## 4. States
Entering: pop-in 200ms ease-out-back (reduced motion: 150ms fade). Primary has hover, :active (translateY 2px, scale .97) and focus-visible. Export goes idle → exporting (label stays, `aria-busy`) → "Saved a copy." / "Couldn't save a copy. Try again." No sound and no particles.

## 5. Behaviour, focus, Esc, a11y
- Shown before the game is interactive, above everything (FTUE waits for it). `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`=title, `aria-describedby`=body+note. App background `inert`.
- **Focus trap:** initial focus on the primary button. Tab/Shift+Tab cycle primary ↔ Export only (wrapping). Enter/Space activate. On close, focus goes to Collect.
- **Esc does nothing**, and so do a scrim tap and Android Back/back-gesture. Only the primary closes the dialog: the player must acknowledge it, and nothing is lost by staying.
- 200% text zoom: the card scrolls and nothing clips. Every hit target is ≥44px.

## 6. QA checks
1. R/F/Q fixtures show the exact copy above and no jargon. 2. Esc, scrim and Back don't close it. 3. Focus starts on the primary, stays trapped, and returns to Collect. 4. Matches `mocks/ac14b-*-360.png` / `-1280.png` with no clipping. 5. Export works in all three cases (Q from memory). 6. In Q, both buttons have getBoundingClientRect height ≥44. 7. In Q, there's at most one QuotaExceededError (no loop), and Settings re-export works until reload.
