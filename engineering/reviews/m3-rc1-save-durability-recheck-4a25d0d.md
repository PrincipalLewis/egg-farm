# Advisory re-check: m3/rc1-save-durability-v3 @ 4a25d0d
Read-only. New worktree /workspace/review-4a25d0d (detached; it didn't exist yet). Fix range reviewed: 2959ba0..4a25d0d.
Claude: 1 of 5 calls via ops/claude/claude-code-review.sh (sonnet/high, RECHECK=1). Its sandbox denied shell commands, so it only read code; I re-checked each claim myself.

**Verdict: PASS.** No blocker. Six minors and two nits.

## Focus areas
1. **Write guard: OK.**
   - `Game.save` runs `newerGuard()` (game.ts:103, 116-121) over main, .bak and the mirror's cached result.
   - `save()` throws `NewerSaveError` as a backstop (save.ts:79), and game.ts:107 turns it into a refusal.
   - `endSession`, `flushForHandover` and the save on load all go through `save()`.
   - The IndexedDB write does get + check + put inside one readwrite transaction, with the put in the get's onsuccess (idb-mirror.ts:42-49). Once a newer copy is seen, later writes are skipped (:43).
   - After a live refusal, main.ts stops autosave, releases the lease, freezes the game and shows the newer-save screen.
   - Reset is the exception (see N1).
2. **Invalid savedAt: mostly OK.**
   - The 2959ba0 minor is fixed: a missing or invalid savedAt now ranks oldest (idb-mirror.ts:63-65).
   - The game recheck with the real clock treats ≤0, pre-2020 and future as invalid: 0 offline earnings, then re-stamped (game.ts:38, save.ts:93).
   - But `validate` calls `validSavedAt(x, 0)`, which skips the pre-2020 and future checks (save.ts:116), so `pickNewest` still trusts a future savedAt (N2).
3. **.bak restore with main missing: OK.** A valid .bak is restored as case R, reason 'missing' (save.ts:153-158). The first save doesn't rotate over it because main is null. An invalid .bak is preserved, but see N5.
4. **Start-up check before the lease: OK.**
   - The first check runs before the lease (main.ts:62-65).
   - The 2959ba0 race minor is fixed: IndexedDB and localStorage are re-read after the flush and before the claim (main.ts:76-78). The claim is at :79.
   - There's no await between the claim and `new Game`. The leftover window is synchronous and the Game refusal at :85-87 still catches it.

## Findings
- **minor N1: Reset bypasses the newer-save guard.** app.ts:254 / debug/panel.ts:37 → `resetProgress` (save.ts:49-55) removes main and .bak with no newer check. `IdbMirror.clear()` (idb-mirror.ts:51-54) deletes without the in-transaction check. The newer-save screen shown after a live refusal doesn't make the app inert or trap focus (save-recovery.ts:115-124).
  - Repro: v6 tab live → a v7 save lands in main/.bak without a lease claim → the next v6 save refuses → keyboard to Settings → Reset → Reset → the v7 main and .bak are deleted.
  - Claude rated this major. I rate it minor: a v7 build that uses the same lease claims on boot, which freezes the v6 tab behind the inert tab-guard screen first. The path needs a writer that skips the lease, plus a deliberate Reset.
  - Fix: block Reset when `newerStoredVersion` or `g.newerSave` is set, add the in-transaction check to `clear()`, and make the layer inert.
- **minor N2: a future savedAt wins `pickNewest`** (save.ts:116 + idb-mirror.ts:63-65).
  - Repro: `reconcile` with localStorage savedAt = now+1 day and a valid IndexedDB copy at now keeps localStorage. The game then marks that savedAt invalid, so the player loses the newer IndexedDB state and gets 0 offline earnings.
  - Fix: rank with `validSavedAt(x, now)` and pass `now` from `reconcile`. Also fix the save.ts:114 comment, which claims validate catches pre-2020.
- **minor N3: a failed second IndexedDB read throws away a good first read** (main.ts:76). `read()` returns null on timeout or error, so the older localStorage copy loads.
  - Repro: stub the second `read()` to time out while the first one returned a newer IndexedDB copy.
  - Fix: `idbRaw = (await mirror.read()) ?? idbRaw`.
- **minor N4: if both IndexedDB reads fail while IndexedDB holds v7 and localStorage doesn't, the boot check passes.** The save on load writes a v6 main to localStorage before the in-transaction check fires. IndexedDB itself stays protected.
- **minor N5: main missing + invalid .bak starts fresh silently** (save.ts:159-160). It returns `recovery: null`, so there's no dialog and no `save_corrupt` telemetry, unlike the corrupt-main path.
- **minor N6: Reset can come back** (game.ts:154). The IndexedDB clear races a 1 s timer. If the reload wins, `reconcile` restores the IndexedDB copy into the empty localStorage.
- **nit N7:** `debugBackdateSave` (game.ts:152) writes even when `save()` returned early (inactive/held/canWrite false). Dev builds only.
- **nit N8:** the `owns()` check at main.ts:83 can never fail now (no await after the claim). The .bak newer check at save.ts:82 is redundant after the :79 throw. `pending` leaks if `os.get` throws (idb-mirror.ts:45).

## Tests
Run in a /tmp copy made with `git archive` (node_modules symlinked from game-rc1-save; the worktree was not touched).
- Targeted run (newer-save, bug6-savedat, save-majors-2959ba0, idb-mirror, save, save-hardening, tab-guard-tg, offline, offline-modal): 106/106 passed.
- Full vitest run: 435/436 passed. The only failure is telemetry-m3 BUILD_ID, because the copy has no .git (test environment, not code).
- Not run: browser tests (rc0-browser, check-globals).
