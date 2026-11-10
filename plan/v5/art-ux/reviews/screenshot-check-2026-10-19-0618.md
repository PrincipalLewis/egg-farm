# Screenshot spec check, 2026-10-19 06:18 CEST: NO NEW REVIEWABLE SET, nothing held

## Target
- Final B ffc3dfd on rc/m4-t3-capped; QA set qa/m3-recheck/gate5-final-ffc3dfd/.

## Seen, rejected unreviewed (no manifest.json)
- gate5-final-ffc3dfd/: still in progress at 06:18. chromium/ 68 PNGs, firefox/ 72, webkit/ 60 (exp-final done on all 3 engines: 60 shots each, 4 fails each). A sheet-close probe (exp-sheetclose-chromium.jsonl, 7 rows) was being written at 06:18. No manifest.json, so no shot verdict yet.
- QA's own logs (not a shot finding): C1 natural migrated acdbedc, C2 v1.15 taps, C3 focus (24 cells), C4 refund, C5 hidden, C6 new farm and C7 E3 pass on all 3 engines. Only C5-gate-readonly fails, now on all 3 engines × 4 sizes ("no card after writable"), not just Chromium.

## Checklist item 5: C5-gate-readonly investigated (read-only look at QA's build tree /tmp/qa-final-ffc3dfd @ ffc3dfd)
- QA's shim makes localStorage.setItem throw QuotaExceededError while sessionStorage __ro=1 (gate5-final-prep/exp-ext.mjs:16).
- With storage refused, the tracksV7 commit's V6 backup write throws, and game.ts:206 calls abortTracks(), which clears tracksPending and keeps the save on v6 for the rest of the session (game.ts:176, M4-14). onTracksCommitted never fires, so showTracksExplainer (and its 1 s canPersist retry) is never reached.
- So "no card after writable, without a reload" is the designed behaviour: the session never migrated, and there is nothing to explain until the migration commits on the next load. The test expectation is stale, not the build. **Not a Major.**
- What still has to be proven on the manifest set: after a reload with writable storage, the migration commits and the card shows exactly once. That's QA's pending C5b probe (exp-ro.mjs, shownAfterReload). If C5b shows no card after the reload, or the migrated-save shots lack the card, that's a Major.
- Logged as a Nit (test/spec wording): the checklist and QA's C5 should say "card shows after reload once storage is writable", not "without a reload".

## Watch on the manifest set
- Sheet-close probe: the card's rect overlaps the sheet's close button (360px² at 360, 35px² at 390), but hitIsClose=true, so the close button still takes the tap. Check in the shots that the close X stays visible and tappable at 360.

## Next
- Review gate5-final-ffc3dfd as soon as manifest.json lands. If it's still incomplete at the 07:00 run, give a partial verdict naming the gaps (deadline to Head of Art & UX 07:15).
