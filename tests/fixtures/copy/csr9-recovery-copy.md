# CSR-9 recovery copy (extends AC14b dialog) - Head of Art & UX, 2026-10-19
Rules: one title + one line + one primary button (>=48px). Optional secondary link "Export save file" (only when a corrupt copy exists). Calm icon (egg/farm), no red, no warning triangle. No error codes in UI.

M1 restored, no loss
  Title: Your farm is back!
  Body:  We fixed a hiccup and restored your latest save.
  Button: Continue

M2 restored older backup, some loss
  Title: Your farm is back!
  Body:  We restored an earlier save. A little recent progress may be missing.
  Button: Continue

M3 fresh farm
  Title: A fresh start
  Body:  We couldn't recover your save, so we started a new farm for you.
  Button: Start farming
  Link:  Export old save file

M4 couldn't load
  Title: Couldn't load your farm
  Body:  Your save is safe. Let's try that again.
  Button: Try again
  Link:  Export save file

M5 restored, saving unavailable
  Title: Your farm is back!
  Body:  Saving is paused on this device right now, so progress may not be kept.
  Button: Continue
  Link:  Export save file  (exports the current restored farm; secondary, 44px target; shown always on M5. Confirmed 2026-10-19 10:10, CSR v0.2.3 G1)
  (Reuse storage-full variant layout from AC14b.)

Explainer after M2: YES, it may show again if the restored save lacks seenTracksExplainer. It queues behind the recovery dialog (same rule as Welcome back) and never on M5 (save not writable).

## M2 update (HoP: show progress lost)
  Title: Your farm is back!
  Body (level known):  We restored an earlier save, from Farm level {level}.
  Body (time known):   We restored a save from {age} ago.
  Body (can't estimate): We restored an earlier save. A little recent progress may be missing.
  Button: Continue
  Priority: level if it differs from the pre-corruption level, else time, else the fallback.
  {age} format: "a few minutes" (<5m), "{n} minutes" (<60m), "about {n} hours" (<48h), "{n} days". Singular: "1 minute", "about 1 hour", "1 day". Round down; never show seconds. "about" lives in {age} only, never in the template.
