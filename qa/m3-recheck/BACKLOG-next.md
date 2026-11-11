# QA backlog: next release

## QE-LATE-e: explainer seen-flag left in the IDB mirror when both stores fail (Minor, triaged by HoQ 2026-10-19)
- **Test:** `EXP-SB-QE-LATE-e` in qa/m3-scripts/gate4-explainer.qa.test.ts (evidence: gate4-246de09-evidence/marker.log `QE_LATE_e`).
- **Repro:** EXP1 fixture (committed, unseen) + IndexedDB mirror. localStorage throws QuotaExceededError on the first `eggfarm.save*` write carrying `seenTracksExplainer:true` and on all later ones. The mirror accepts that write (catch path, game.ts:253, seen=true, seq 5) and then fails the revert save's mirror write. The tab dies with no further save. Quota frees. Reload: reconcile picks IDB seq 5 > LS 4 with seen=true, so **the card never shows**.
- **Impact:** a missed one-time coach card. No data loss. Needs localStorage and IndexedDB to fail within a moment of each other.
- **Fix (HoQ):** `save({ mirrorOnFail: false })` on the explainer's flag save in game.ts, so the failed flag write never reaches the mirror.
