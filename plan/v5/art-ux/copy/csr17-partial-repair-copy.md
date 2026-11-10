# CSR-17 partial-repair notice: copy, Art & UX FINAL 2026-10-19 10:15 (D-HOP-30)
Non-blocking notice, sharing the toast/banner slot with CSR-9. No red and no error codes, consistent with CSR-9 M1–M5.

- **Title:** We fixed your save
- **Body:** `{list} {was|were} reset. Your coins and everything else are safe.`
- **Link:** Export save file. Same action and label as CSR-9 M4, with a ≥44px hit area.
- **Dismiss:** a × button (44px). The notice stays until dismissed or the Export link is used, because it carries a link. aria-live="polite", read once.

**Item names:** Farm, Hens, Egg value, Collection. Order is always Farm, Hens, Egg value, Collection.

**List format:**
| Count | Body |
|---|---|
| 1 | Your Hens level was reset. Your coins and everything else are safe. |
| 2 | Your Hens and Egg value levels were reset. Your coins and everything else are safe. |
| 3 | Your Farm, Hens and Egg value levels were reset. Your coins and everything else are safe. |
| 4 (fallback, shouldn't happen) | Some of your levels were reset. Your coins and everything else are safe. |
There's no serial comma. The body starts with "Your", and "level" or "levels" is singular/plural to match. Names use NBSP inside "Egg value".

**Fit:** the 3-item body must fit in ≤3 lines at 360 (Nunito 14, ≤296px). The UI/Visual Designer will confirm with a shot.
