# m3-rc0 save hardening: design notes (Head of Engineering, 2026-10-15)
Source: CEO ruling on AC14b (no silent wipes), QA edge cases, Art & UX dialog due Tue Oct 20 EOD.
- On load: parse, checksum and state validation. On failure, copy the raw save to `eggfarm.save.corrupt.<ts>` (keep the last 3).
- Restore from the rolling backup `eggfarm.save.bak` if it's valid. Otherwise start fresh.
- Always show the dialog: "restored" or "started fresh", with an optional Export corrupt save link.
- Log `save_corrupt` with `{reason, had_backup, restored_from_backup, build}`.
- QA case 1: backup also corrupt. Show the started-fresh dialog, log `had_backup:true, restored_from_backup:false`, keep both bad files (the backup goes to corrupt.<ts> as well).
- QA case 2: after a fresh start, autosave must NOT rotate into `.bak` until the new save is valid and the player has made progress (at least 1 purchase or 60 s). A preserved corrupt or old backup is never overwritten by a fresh-start save.
- QA case 3: storage full while writing the corrupt copy. Catch QuotaExceededError, still show the dialog (with export available from memory), never retry in a loop, log `reason` plus `copy_failed:true`.
- `install_id` lives in its own key `eggfarm.install_id` and is never touched by any of these paths.

## 2026-10-17 rev: unload key (SD5-1 b), SD6-1/2/3
- IDB keys: `main` (normal checked writes), `unload` (close-time put plus commit, relaxed). Boot runs bootUnload before reconcile. See decisions.md, M4-19 rev 3.
- The no-storage notice is shown at once and never held behind the recovery dialog (SD6-1).
- A bare NaN or ±Infinity savedAt in the header parses as null, which is the missing path (SD6-2).
- v5→v6 keeps a valid wageFracCents that the save already has (SD6-3).
