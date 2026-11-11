# EXP1 storage-blocked triage, c11e3a0 (07:23 CEST)

**Verdict: a REAL Major, not a mock artefact.** When localStorage writes are refused with a genuine QuotaExceededError, the explainer card shows on the canonical committed-unseen save in all 3 engines. seenTracksExplainer can't be saved at that moment. HoQ confirmed this in code.

## SHAs
- 51351f0 = c11e3a0 + `scripts/rc0-browser.mjs` only (Art reshoot shots). App code is identical, so the triage ran on c11e3a0 only.

## Code refs (c11e3a0)
- `src/ui/tracks-explainer.ts:23` gates on `g.canPersist === false || hidden || modalOpen`. Line 24 sets `seenTracksExplainer: true` and calls `g.save()`, and the card shows whether or not that save landed.
- `src/game.ts:129` `canPersist` = `!resetting && !readOnly && !inactive && !held && !newerSave && canWrite()`. `canWrite` = `lease.owns()` (`src/main.ts:103`).
- `src/save/tab-lease.ts:56` `owns()` returns **true** when `storageBlocked`. The lease write failed, but no other tab holds it, so `canPersist` stays true even though writes fail. `storageFailed` (game.ts:110), which is set only after a save throws, isn't consulted either.
- Trigger: `src/ui/app.ts:704` `if (g.tracksMigratedWithBackup) showTracksExplainer(g)` (the reload fallback for committed-unseen). `app.ts:703` `onTracksCommitted` handles the in-session commit.
- Migrated acdbedc v6 save: the refused write aborts the migration for the session (`game.ts:206` → `abortTracks` → `endTracks`, game.ts:176). So there's no card until a writable reload commits, and then it shows once. That behaviour is correct.

## Method (`gate5-final-prep/exp-blocked.mjs`)
- **real**: on the app origin, before boot, localStorage is filled with 1 MiB to 16 B chunks until the browser refuses. A probe write then throws `QuotaExceededError` (a DOMException) in all 3 engines. Reads are untouched.
- **mock**: `addInitScript` overrides `Storage.prototype.setItem` to throw `new DOMException('quota','QuotaExceededError')` for localStorage only. sessionStorage is exempt.
- To restore writes: remove the filler, or lift the mock. There's no reload; the card retry (EXP_RETRY_MS) gets a chance first. After that comes the reload. Appearances are counted with a MutationObserver into sessionStorage, so the count survives the reload.

## Results, 390x844, 3 engines (exp-blocked-<engine>.jsonl)
| fixture | variant | while blocked | flag while blocked | writes restored (no reload) | after reload | total |
|---|---|---|---|---|---|---|
| canonical committed-unseen | real | **card shown** (count 1) | not persisted | flag persisted by the next autosave, no second card | no card, flag true | 1 |
| canonical committed-unseen | mock | **card shown** (count 1) | not persisted | same | no card, flag true | 1 |
| acdbedc v6 | real | no card | — | no card (migration aborted for the session) | card once | 1 |
| acdbedc v6 | mock | same | | | | 1 |
All 3 engines are identical, and real and mock agree. That's why this is not a mock artefact.
- In the 390 run the step-1 shot was taken 6 s after boot, after the card had already closed, so the count shows it and the shot doesn't. The script now waits for the card and shoots at once. The re-validation in Chromium at 360x800 (`exp1-storage-blocked-c11e3a0/chromium-360-validation/`) shows the card on screen while blocked: `expblk-real-canonical-committed-unseen-1-blocked-360x800.png`.
- Impact: if storage stays refused all session (private mode, or a full disk), the user dismisses a card whose flag never lands, so it shows again on every load. The total stays at 1 here only because writes came back.
- The blocked-step expectation for the fix is no card, `canPersist` false while `lease.storageBlocked || storageFailed`.

## Evidence
`exp1-storage-blocked-c11e3a0/`: `exp-blocked-<engine>.jsonl`, `run-<engine>.log`, `entries-<engine>.jsonl` (tab asserted per shot), `<engine>/expblk-*-390x844.png`, and `chromium-360-validation/`.

## Fix-SHA rerun (ready)
`bash qa/m3-recheck/gate5-final-prep/run-fix.sh <full-sha>` creates a worktree, reuses node_modules via hard links, builds, checks the build-id, and serves on :4821 under the lane rule. Per engine it runs `exp-final.mjs` (EXP1 + C5), `exp-ro.mjs` (C5b), and `exp-blocked.mjs` at 390x844 and 360x800 (real + mock, both fixtures). The canonical 360 cases are the Art & UX reshoots: (1) blocked, no card; (2) writable, card exactly once; (3) reload, gone and flag persisted. Each has the tab asserted and a shot right after the measurement. Output goes to `qa/m3-recheck/exp1-fix-<sha7>/` plus `manifest.json`. Estimated about 15–18 min (about 6 min per engine).
