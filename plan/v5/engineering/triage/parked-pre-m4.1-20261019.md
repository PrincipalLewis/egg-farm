
- **canPersist hardening (game.ts:129)**, parked by HoE on 2026-10-19 at 05:32 (UTC+2).
  - What: `Game.canPersist` should check `this.hidden` and re-run `newerGuard()` at save time, so the explainer's `seenTracksExplainer` write can never be skipped.
  - Source: Saves' review of rc/m4-t3-capped @ 0ee8831.
  - Why parked: changing game.ts would force a Saves rerun.
  - Owner: Saves (with UI). Logged by Senior Engineer, UI & rc1 Fixes.

- [2026-10-19 07:36] EXP-SB-QE-LATE (Minor, HoQA): in tracks-explainer.ts, revert seenTracksExplainer when g.save() fails, and add a QE_LATE unit test. Next release. Evidence: qa gate4-8396ed1-evidence/qe-late/.

- [2026-10-19 07:58] CCR pr49-8396ed1: m1 is a unit test for the retry keeping storageBlocked and for the app.ts opts wiring. n1 is a comment that storageFailed is sticky for the session. n2 is a test that the tick and Market Hand keep running while the card is open. All three go to the next release.

- [2026-10-19 08:12] QE-LATE-e (proposed Minor): if IDB accepts the flag write but refuses the revert while LS is full, and the tab then dies, the card is missed. The fix belongs to Saves in game.ts: save({mirrorOnFail}), with the explainer's flag save passing false. Next release.

## 2026-10-19 09:00 HoE - from HoP (D-HOP-22), next release (L30+ pack)
- ECON-DEADCOL: economy.csv has a `farm_ms_price_mult` column that nothing reads (not src, scripts or the vendored sim). Either wire it up or drop it in the L30+ pack. Also add a sync-economy check that fails if the CSV has a column the game doesn't read.
- L30+ candidate to measure on real code: S2 caps + C2 costs + fixed-3 surcharge, scratch/m4-retune/handoff-T3h/cand/b.csv (sha256 84bd0b70bf40b8dfa8be223a0356f2cddbf025c532fe4da3ab5adf11d9088faa). Collection smoothing may still change on top of it. Owner: Architect, using the harness.
- (Art & UX, 09:00) M4.1 UI Minors are ranked in art-ux/m4.1-ui-minors.md (UX-M1 to M5). If L30+ ships, the "Level N / 30" label must read its cap from balance data, not a literal; this goes into the L30+ pack. Corrupt-save recovery copy is final in art-ux/copy/csr9-recovery-copy.md, for OQ-7 and Saves.
