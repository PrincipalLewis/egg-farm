# fix/saves-sd5-1b: close-time save key, save majors SD6-1/SD6-2, transitive ranking, deferred no-storage notice

Owner: Saves & Persistence. Base: origin/main 8e6d53e (merged forward twice, acaceee then 8e6d53e; no rebase).

## What changes
- **SD5-1 (option b, ADR M4-19 rev 3):** the close save (pagehide / beforeunload / endSession) goes to its own IndexedDB key `eggfarm/save/unload`. Boot ranks it against localStorage main and IndexedDB main under one rank mode for the whole set. It is promoted to main only when it wins, then deleted. An unload copy byte-identical to localStorage main takes LS main's tie precedence. An unload copy that loses or ties but holds the same farm as a kept copy is 'redundant' and is deleted, never promoted (Firefox fires visibilitychange->hidden after pagehide, so main is re-saved with the same farm). **Architect: please confirm this addition to M4-19 rev 3.**
- **SD6-1:** when the browser refuses writes, the player always gets the "no storage" notice (see below for timing).
- **SD6-2:** a save with a NaN or Infinity `savedAt` keeps the farm and gets `savedAt = now`. There is no recovery dialog, no corrupt copies and no offline reward.
- **Ranking:** ranking is transitive over 3+ copies. If any valid copy lacks a `saveSeq`, all copies rank by `savedAt`. The fixed tie order is LS main > IDB main > unload.

## For Art & UX: deferred "no storage" notice (HoE AC14b ruling (a))
When storage refuses writes at boot, the game opens the **"Saving is paused"** dialog (v2.2 `cantsave`: "Your farm is fine, but your browser won't let us save right now. Export a copy to keep your progress." with **Keep farming** and **Export save**).

- **While that dialog is open, no bottom toast is shown.** This keeps v2.2 fix 2: nothing sits under or competes with the modal.
- The bottom notice *"Your browser isn't letting us save right now (low space or private mode), so progress won't be saved."* is **deferred and appears as soon as the dialog closes** (Keep farming or Export), and stays as a persistent status for the session.
- **Order doesn't matter:**
  - dialog first, then a refusal: the notice waits, then shows on close;
  - refusal first (toast already on screen), then the dialog opens: the toast is taken down while the dialog is open and comes back on close.
- It is shown once, never stacked or duplicated. Other save notices follow the same rule (first one wins).
- Visual spec unchanged: same `.save-warn` toast, same copy, same position. Only the timing changes.

Why: SD6-1 (Major) showed players losing progress silently. The dialog already explains the problem, so the toast is the persistent reminder after the player dismisses it.

## Tests
- `tests/notice-queue.test.ts`: dialog→refusal, refusal→dialog, boot order, no-dialog.
- rc0 AC14b cantsave (no toast while the dialog is open), all 3 engines.
- QA `quota2.mjs`: **needs a QA script update.** As written it never closes the dialog, so under ruling (a) it fails by design (15/15 'warn: null'). The ruling-aligned variant (`/workspace/scratch/sv1b-qa/quota2-ac14b.mjs`) checks that the dialog is open with no toast, clicks Keep farming, then expects the notice: 0/15 bad.
- `tests/sd5-1b-unload-key.test.ts`: unload key, promotion, 6-placement mixed-seq ranking, LS-identical tie.
- `tests/sd6-save-majors.test.ts`.

Gate results: see the commit/status entry for the final SHA.
