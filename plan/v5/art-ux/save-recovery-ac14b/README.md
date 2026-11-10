# AC14b save-recovery dialog: mock pack v1.2 (Art & UX, 2026-10-16)
Spec: ../m3-save-recovery-dialog.md (v1.2: copy, layout, tokens, focus, ACs 1–8). This folder is the CEO-requested consolidated handoff.
- dialog.html: live mock. `#r` = restored from backup, `#f` = couldn't recover / started fresh, `#q` = storage full (backup copy failed, export still works from memory).
- PNG renders: ac14b-{r,f,q}-360.png (360×640) and ac14b-{r,f,q}-960.png (1280×800, card fixed at 440px, centred in the window).
- One primary button per case (Keep farming / Start farming, 48px). "Export old save" (the player-facing name for "Export corrupt save") is a text button with a 44px-tall hit area in R/F, and an outlined 44px secondary button in Q.
- WCAG AA: every pair is ≥4.9:1; the focus ring is #2B79A8, 3px. Assets come from our own icon-coop.svg and char-chicken.svg (in-house). Fonts are Fredoka and Nunito under OFL (../font-credits.md).
