# Re-check review: m3/rc1-save-durability-v4 @ aaaa91a
Range reviewed: `git diff 4a25d0d..aaaa91a` (7 files, +133/-36), in worktree /workspace/review-aaaa91a (detached, clean).
Earlier review being re-checked: engineering/reviews/m3-rc1-save-durability-recheck-4a25d0d.md (N1..N8).

**Limit of this review:** I read the code and traced the logic by hand. **I did not run any tests.** The shell was denied part-way through, after the diff and the first source reads. So the new `tests/save-durability-v4.test.ts` and the edited `idb-mirror` / `save-majors-2959ba0` tests were checked by reading only. I traced the main cases (the pre-2020 and skew cases, and the lease tests) and they hold, but none of it has been executed. Browser tests (rc0-browser, check-globals) were not run either.

## Summary
SD4-1 (future-dated savedAt) and SD4-2 (storage-full lone tab) both work for the scenarios they were written for, and N2 and N3 are resolved.
I found no blocker, critical or major issue. Four new minors and two nits are below.
The diff does not touch the older N1, N4, N5, N6, N7 or N8, so they are still open.

## Status of earlier findings
| # | Earlier finding | Status at aaaa91a |
|---|---|---|
| N1 | Reset bypasses the newer-save guard | **Open, unchanged.** `resetProgress` (save.ts:49) and `IdbMirror.clear()` (idb-mirror.ts:51) are untouched. |
| N2 | A future savedAt wins `pickNewest` | **Resolved.** `pickNewest` / `reconcile` / `restoreSource` now rank with `savedAtRank(t, now)`. Missing, null, ≤0, pre-2020 and future beyond 2 min all rank `-Infinity`. The save.ts comment was corrected. See SD4-1 below. |
| N3 | A failed IndexedDB re-read discards the first read | **Resolved.** main.ts:76 is now `idbRaw = (await mirror.read()) ?? idbRaw`. A failed or timed-out re-read keeps the first read. See nit V4-6. |
| N4 | Both IndexedDB reads fail while IndexedDB holds a v7 save | **Open, unchanged.** |
| N5 | Main missing and `.bak` invalid starts fresh silently | **Open, unchanged.** |
| N6 | Reset can come back (the IndexedDB clear races a reload) | **Open, unchanged.** |
| N7 | `debugBackdateSave` (game.ts:152) writes after `save()` returned early | **Open, unchanged.** Dev builds only, nit. |
| N8 | Redundant `owns()` after the claim, redundant `.bak` check, `pending` leak | **Open, unchanged.** Nit. |

## SD4-1: a future-dated savedAt must not win over a newer copy
- **The core logic is correct.** `savedAtRank(t, now)` is `validSavedAt(t, now + 2 min) ? t : -Infinity` (save.ts:97-98).
  - `validate()` already turns missing, null, non-finite and ≤0 into NaN, and NaN ranks `-Infinity`.
  - `validSavedAt` with `now + skew` adds the pre-2020 floor and the future check. The floor is skipped when the clock itself is before 2020.
  - `pickNewest` uses a strict `>`, so when both copies rank `-Infinity` it keeps localStorage.
  - The e3 repro (older localStorage copy with a savedAt of now+1e10 against a newer IndexedDB copy) now picks `idb`.
  - `reconcile` and `restoreSource` pass the same `now`, so they agree.
  - `main.ts:82` calls `reconcile` with the default clock, which is correct.
- **Signature change is safe.** `validate(raw, b, now = 0)` keeps the old behaviour for the other callers (save.ts:164/169/173, idb-mirror.ts:60/62/74). All of them pass two arguments, and none uses `validate` as a bare `.map` callback.
- **Hand-traced tests hold.**
  - A savedAt of now+30 s stays valid.
  - Two future-dated copies tie, so localStorage is kept.
  - A clock of 5000 with savedAts 1000 and 2000 picks `idb`, because the floor is skipped when the clock is before 2020.
  - The 2959ba0 tests now pass `NOW`. They need it, because their savedAt values of 1 and 0 would otherwise depend on the real clock.
- **Remaining behaviours:**
  - V4-3: the displaced localStorage copy is not preserved (minor).
  - V4-5: the skew window is inconsistent with the `Game` check (nit).
  - When the device clock jumps back by more than 2 minutes, both copies look future-dated and tie to localStorage. That is the same as before v4, and it is acceptable.

## SD4-2: a storage-full lone tab shows the storage notice, not the lease or other-tab dialog
- **The claim path is correct for a lone tab.**
  - `claim()` now sets `storageBlocked = !write(...)`. `write` does the `setItem`, catches a throw, then reads the record back and compares both `id` and `at`. A silent drop is caught too.
  - While blocked, `owns()` returns true without reading the lease.
  - So a stale foreign record that the tab cannot overwrite no longer triggers `lose()` and `otherTabModal`. That is the f6 lock-out.
  - `beat()` retries the write while blocked and clears the flag when it succeeds.
  - `main.ts:83` (`!lease.owns()`) passes.
  - A real newer tab still takes over through the channel `claim` message, because `lose()` is called directly from `onmessage`. The unit test covers this.
- **Problems:** V4-1 (dual owners without BroadcastChannel) and V4-2 (the notice and outcome semantics). Both are minor.

## Findings (new)

### V4-1 · Minor · `owns()` skips the lease poll while storage-blocked, so two tabs can both own the save without BroadcastChannel
`src/save/tab-lease.ts:58-59`, `claim()` at :38-43, `beat()` at :64-65.
The file header documents the no-BroadcastChannel mode: "the heartbeat doubles as a poll of the lease record". With `storageBlocked`, `owns()` returns true before reading the record, so that poll is gone.
- **Repro, no BroadcastChannel (for example iOS Safari before 15.4):** tab A owns the save and holds a live lease. Storage fills. The user opens tab B. B's lease write fails, so B is blocked and owns. The record still holds A's id, so A's `owns()` is also true. Both tabs run and write. The IndexedDB mirror has its own quota, so its writes can still succeed, and last-write-wins loses progress.
- **Second path:** if B later frees space and tab C claims normally, B's `beat()` retry rewrites the lease with B's id. That steals ownership back from C, because B never re-read the record.
- With a channel the claim message makes A lose, so this is limited to channel-less browsers. That is why it is minor.
- **Fix:** while blocked, still read the record, and treat a foreign record as another tab only when it is fresh: `l.id !== this.id && now - l.at < staleMs` calls `lose()`. A stale record (the f6 case) stays "not another tab". Also re-read before the `beat()` retry write and skip the overwrite if a fresh foreign record is there.

### V4-2 · Minor · The storage notice and outcome claim more than the lease failure shows
`src/main.ts:87-90` (the new line sits on :90), with art-ux/save-recovery-dialog.md (v2.1 table and the "Can't save" case).
- **The notice can be false.** The failed write may be only the lease key. Adding a brand-new key can hit the quota while replacing the existing save key still fits. The IndexedDB mirror is independent of localStorage quota. In that case `NO_STORAGE_TEXT` says "progress won't be saved" while saves are working. `Game.storageFailed` / `onStorageFail` already report real save failures accurately, and main.ts:101 wires them.
- **The outcome label has the wrong meaning.** `recoveryOutcome === 'storage'` is the spec's "Storage full" row. That row means the corrupt main copy could not be preserved (`copy_failed`), with the "A fresh start / Export it now" copy. Here the farm loaded fine, `g.recovery` is null, and the spec's separate "Can't save / Saving is paused" case is the right one.
  - Today nothing in `src/` reads `recoveryOutcome`; it is only assigned. The window.eggfarm handle exposes the field in QA builds only.
  - The "Saving is paused" dialog is not implemented in `src/`.
  - Any future consumer that keys on `'storage'` would show the wrong dialog for a healthy farm.
- **Fix:** have the lease failure feed only the existing `onStorageFail` path, or show the notice only after a real `storageFailed`. If QA f6 needs an outcome value, add a distinct one rather than reusing `'storage'`. This needs a Product / QA call on the exact expectation, which I could not see.

### V4-3 · Minor · A displaced future-dated localStorage copy is dropped without a copy
`src/save/idb-mirror.ts:72-74`.
`reconcile` preserves the localStorage copy only when `validate(lsRaw, b)` says it is invalid. That call has `now = 0`, so a future-dated copy counts as valid and is simply overwritten by the older IndexedDB copy.
- **Repro:** the device clock runs 10 minutes fast. The player plays, and localStorage is saved with savedAt = now+10 min. The IndexedDB write for that save did not land before the tab closed. The clock is corrected. On the next boot the older IndexedDB copy wins and the newer progress is gone.
- The product rule says a future savedAt is invalid, so picking IndexedDB is intended. Silently deleting the only copy of the newer progress is still more than the rule requires.
- **Fix:** when `w === 'idb'` and the localStorage copy is a valid save displaced only by rank, call `preserveCorrupt(kv, lsRaw, now)` for it too. It would count against the 3-slot cap, so use a separate key or accept that.

### V4-4 · Minor · The new main.ts wiring is tested only by matching the source text
`tests/save-durability-v4.test.ts:65-73`.
The N3 test is `expect(src).toContain('idbRaw = (await mirror.read()) ?? idbRaw')`. The SD4-2 test is a regex on `main.ts`. Both pass if the code is in a comment or a dead branch, and neither exercises the behaviour.
The `TabLease` and `pickNewest` tests are real unit tests and are good.
- **Fix:** add a case to the rc0-browser suite that stubs `localStorage.setItem` for the lease key and checks that the notice appears and the other-tab dialog does not. Add a second case that stubs the second `read()` to fail.

### V4-5 · Nit · The skew window differs between ranking and the `Game` check
`pickNewest` treats a savedAt up to 2 minutes ahead as valid (`SAVED_AT_SKEW_MS`). `Game` (game.ts:38) uses `validSavedAt(f.savedAt, now())` with no tolerance.
A copy at now+1 min wins the pick, is then marked invalid, grants 0 offline and sends a `save_savedat_invalid` event. This is harmless, and it only happens with clock steps of under 2 minutes. Mention the difference in the `SAVED_AT_SKEW_MS` comment, or pass the same tolerance to `Game`.

### V4-6 · Nit · `?? idbRaw` cannot tell "no record" from "read failed"
`read()` returns null for both. If another tab runs Reset between the two reads, the first read comes back and `reconcile` can write the old copy into the emptied localStorage. The window is about 300 ms and needs a Reset in another tab, so I'd leave it. It is related to the open N6.

## Counts
- **New in v4:** Blocker 0, Critical 0, Major 0, Minor 4 (V4-1..V4-4), Nit 2 (V4-5, V4-6).
- **Carried over, unchanged by this diff:** Minor 4 (N1, N4, N5, N6), Nit 2 (N7, N8).
- **Overall:** Blocker 0, Critical 0, Major 0, Minor 8, Nit 4.

VERDICT: no blockers
