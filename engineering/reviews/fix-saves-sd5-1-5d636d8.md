# Review: PR #10 fix/saves-sd5-1 @ 5d636d8 (SD5-1: 5dd0a50 + QA script; base main a01faea)
This was a read-only review in the detached worktree /workspace/review-5d636d8. Claude made 1 call through the wrapper (PASS_ID=pr10-5d636d8; the wrapper counted it as 1/15). Claude only read the code, because Bash was denied. I checked every point against the code myself.

**Verdict: CHANGES REQUESTED.** Nothing blocks. There are 2 major findings, 3 minor and 1 nit.
- The guards (lease, newer-save, refusal) still run on unload.
- The weak spot is that the unload put no longer does the in-transaction newer-build check, and that put now runs on every tab switch, not just on close.

## The questions asked
1. **Do the guards still run on unload? Yes.**
   - `saveForUnload()` and `endSession()` both call `save(true)` (src/game.ts:102-106). That passes the same `resetting/readOnly/inactive/held`, `canWrite()` (lease) and `newerGuard()` checks before any write.
   - `refuseNewer` sets the mirror to null (game.ts:128), so a refused tab can't write on pagehide.
   - Pagehide order (src/main.ts:119-120): `endSession` runs, then `lease.release()`, then autosave's `onHide`. `release()` only sets `at:0` and keeps our id, so `owns()` stays true. Two saves happen and `.bak` rotates twice; that was already the case before this PR.
   - "Kept on normal saves" refers only to the in-transaction IDB check. That gap is M1 below.
2. **Does it follow the M4 ranking and the read-modify-write transaction? No.** See M1.
3. **Can dedupe or retry write stale bytes or write twice?**
   - No stale bytes: `raw` is the exact string `save()` just wrote (game.ts:110).
   - Duplicate writes happen in practice. `savedAt` changes every ms, so hidden, pagehide and beforeunload each produce a separate put, and the dedupe almost never kicks in. That's harmless, because transactions run in order and the last one wins.
   - There is no retry in the code, despite the PR description; see the nit.
   - One dedupe edge case is m2.
4. **Is relaxed durability acceptable, and is the commit() fallback right?** Acceptable, with one caveat (m1). The fallback when commit() is missing is correct: a put-only transaction auto-commits (idb-mirror.ts:56).
5. **pagehide, visibilitychange, bfcache:** the data paths are fine. There is a bfcache issue from before this PR, listed as m3.
6. **Do the tests assert this? Only partly.** See M2.

## Findings
### M1 MAJOR: the unload put skips the BUG-2 in-transaction newer-build check (src/save/idb-mirror.ts:56; autosave.ts:6)
- `write(raw,{unload})` does an unconditional `put`. The only guard is the cached `this.newer` (:49), which only boot `read()` and normal writes set (:57). So `newerGuard`'s IndexedDB arm (game.ts:121) is stale between autosaves, and the comment at game.ts:117-118 ("never puts over a newer copy") is no longer true.
- This also goes against m4-design §M4-19 ("The IDB main put becomes conditional inside its transaction on the same rank"). SQ-1/M4 will have to build `saveSeq`/base ranking into exactly this put.
- `onHide` also runs on `visibilitychange→hidden`, so the unchecked path runs on every tab switch and mobile app switch, not only on close.
- Repro (narrow, worked out from the code):
  1. Old tab A boots and reads IDB.
  2. Newer-build tab B saves, but its localStorage write throws (quota), so the newer copy exists only in IDB (game.ts:110-111).
  3. A's lease doesn't stop it: localStorage refused the lease write (`storageBlocked`, so `owns()` is always true, tab-lease.ts:56), or the 6 s stale-lease takeover hasn't happened yet.
  4. A is hidden, and the put overwrites B's v7 copy.
- If B's save also reached localStorage main or `.bak`, the existing guard stops this.
- Fix:
  - Use the normal checked write on `visibilitychange→hidden`, where the page survives, and keep the immediate put for pagehide/beforeunload only.
  - Or check the version in the same transaction while still issuing the put at once: queue a `get` before the put, and in its onsuccess `abort()` the transaction if the copy is newer. The abort undoes the put.
  - Add a test for each.

### M2 MAJOR: the tests don't assert the data-loss properties (tests/sd5-1-unload-write.test.ts)
- The Game test (:63) uses a mock mirror and only checks that the `unload` flag is passed through. It doesn't check that a lease loss, `readOnly` or a newer copy blocks an unload save.
- The newer-copy test (:59) presets `m.newer = 99`, which is the case that already works. Nothing covers a newer copy that sits in IDB but isn't cached (M1).
- Not covered either: commit() being absent; a normal write still in flight followed by an unload write (m2); the pagehide → release → onHide order.
- rc0 `unloadmirror` (scripts/rc0-browser.mjs:510-524) is a real end-to-end check but only for one tab with no contention. On WebKit it also passes when only `.bak` matches, so it doesn't prove IDB there. My WebKit run had idb=777777777, the old value.

### m1 MINOR: relaxed durability on every hidden event (idb-mirror.ts:53)
- For a tab close, relaxed is fine: once the write reaches the OS it survives a browser kill.
- But D2 (the idb-mirror.ts:1-7 header, still saying "strict") was built for the kill window. Hidden events now use relaxed for every tab switch, so a power loss or OS crash after app-switching can lose that save.
- Fix: limit relaxed to pagehide/beforeunload, which goes with the M1 fix, and update the header.

### m2 MINOR: the dedupe key is set when a write is queued, and a normal write sets it too (idb-mirror.ts:51,55)
- A normal write that is queued but not committed, for example still waiting on its get at teardown (the very Firefox case), suppresses an unload write with the same bytes.
- An unload put that sits behind a stuck normal readwrite transaction can't commit before it either. That's unverified, and neither the fake IDB nor rc0 models it; rc0 waits 800 ms after the explicit save.
- If put or commit throws synchronously, `failed` is set but `lastRaw` stays.
- Fix: set `lastRaw` only on the unload path, and only in oncomplete or after the put is issued; clear it in the catch.

### m3 MINOR (pre-existing): bfcache
- The pagehide handler ignores `persisted` and there is no `pageshow` handler (main.ts:119).
- A restored page has a released lease (`at:0`) until its next heartbeat, so another tab can take over and the restored tab deactivates.
- No data is lost (the guards block it), but it can show "Game open in another tab" by mistake.

### n1 NIT
- The PR says it "retries", but there's no retry. After a failure, the next write simply isn't deduped (idb-mirror.ts:54).
- Either fix the wording or add one retry on abort for unload writes.

## Tests run (in /tmp git-archive copy)
- Vitest: 467 passed, 2 skipped, 1 failed. The failure is telemetry-m3 BUILD_ID, because the copy has no .git; that's a test-environment issue.
- rc0 `ONLY=unloadmirror`, headless:
  - Chromium: PASS (ls = bak = idb).
  - Firefox: PASS (ls = bak = idb).
  - WebKit: PASS only through `.bak` (idb stale).
