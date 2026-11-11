# chain/valid-main-seq4+newer-idb-seq6 (stale LS) [on]/[off]: classification = EXPECTED, not a finding
- compare.txt: listed under `## valid-identical` (lines 689-690). valid-DIFF section is EMPTY (rows 286: valid-identical 90, valid-DIFF 0, errors 0).
  The status.md checkpoint showed these two ids only because it printed `tail -2` of compare.txt (last lines of the valid-identical list).
- Field check candidate vs dd223f5 (both modes): outcome/recovery/newerSave/dialog null both; stateSha, pick, readOnly, mirrorWritesAtLoad=1, savedMainSha, lsAfterLoad IDENTICAL.
- Only differences (neither is a compare field): telemetry cand [session_start, save_restore, offline_grant] vs base [session_start, offline_grant]; via cand null vs base "idb".
- Why: at dd223f5 the stale-LS restore ran in main.ts (`reconcile()` L93) and main.ts:109 emitted `save_restore {source:'idb'}`; the harness boots dd223f5 the
  same way (reconcile then new Game) but records only Game's telemetry, so the base list lacks the event that the dd223f5 product DID emit.
  At the RC the boot reconcile is gone (3a6eb7b) and Game emits it from loadSafe's staleRestore (34d50a8; src/game.ts:65, src/save/save.ts:309,343).
  => product behaviour unchanged: the newer IDB copy wins silently, exactly one save_restore {source:'idb'}.
- Rulings: D-HOP-35 10:18 amendment (product/decisions.md:394: event keeps the name save_restore {source:"idb"}, emitted since dd223f5, regression test must still fire);
  spec m41-final (530b29d3) line 39/G7 + IDB1-7; D-HOP-2026-10-22-04 (decisions.md:473) for the related no-main case (IDB pick silent + save_restore{source:'idb'}).
