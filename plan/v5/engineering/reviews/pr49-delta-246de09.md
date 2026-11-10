# PR #49 delta review: 8396ed1..246de09 (rc/m4-t3-capped)

Reviewer: Claude Code Reviewer, 2026-10-19 ~08:15 UTC+2. Read-only, quick delta (requested ~10 min).
Commits: 45eb5e3 (failed flag save reverts seen=false), 246de09 (then g.save() so the catch rewrites the IDB mirror with seen=false).
Scope: src/ui/tracks-explainer.ts (1 line) and tests/m4-exp1-explainer.test.ts (+55).

## Verdict: PASS. Blocker 0 · Major 0 · Minor 0 · Nit 2

## Analysis (game.ts save() @ 246de09, lines 243-256)
- **No loop:** the second save() is a plain call. Its catch only writes the mirror and sets storageFailed, and onStorageFail/telemetry are guarded by `!storageFailed`, so they don't fire again. showTracksExplainer is not re-entered on this path: it returns null and schedules no retry.
- **No double show:** the card isn't created on this path, and seen=false means a later load with working storage shows it once. The Q2 test asserts shown once overall across 3 boots.
- **saveSeq, marker and rollback:** the fallback mirror write uses `m4SaveSeq(st, b, q)` with q equal to the unchanged localStorage main. Both fallback writes therefore carry the same seq (ls+1), and the second simply overwrites the first with seen=false. Reconcile then picks the mirror (seq ahead) with seen=false and otherwise identical state, so nothing rolls back. tracksV7, v6BackupId and the v6 backup are untouched. If the second (smaller) save succeeds, localStorage gets seen=false at seq+1, which is also correct.
- **storageFailed already set from an earlier failure (#49 n1):** the flag save may succeed and then be reverted by the next save, so the card waits for the next load. That's safe, and better than before, where seen=true could persist with no card ever shown.

## Gates @ 246de09
- tsc OK
- vitest 980/980 (86 files); explainer file 25/25
- Mutation: dropping the second `g.save()` fails 3 tests (#49b, the Saves/HoQA Major test, Saves Q2), so the tests aren't vacuous.
- Delta is UI-plus-test only. Other gates carry over from the 8396ed1 PASS (pr49-8396ed1.md); I did not re-run slow, golden, build, check-globals or rc0.

## Nits
- n1 tracks-explainer.ts:29: two `//` comments on one long line; split for readability.
- n2 tests/m4-exp1-explainer.test.ts: `import` statements in the middle of the file (reconcile, rankCompare); move them to the top.
