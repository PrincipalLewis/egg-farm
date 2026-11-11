# QA pass 3: save durability v3, build 4a25d0d
- **PASS_ID:** rc1-save-v3-4a25d0d. **Branch:** m3/rc1-save-durability-v3 @ **4a25d0d** (build id m3-rc1-pre+4a25d0d).
- **Build:** fresh detached worktree at /tmp/egg-claude-qa-v3. `npm run build` and the check-release-build checks passed. Served on 127.0.0.1:4174.
- **Test setup:** headless system Chrome with playwright-core, at 390x844 and 1280x800. Every case was run at both sizes.
- **Script:** qa/claude-qa/save-durability-4a25d0d/sd3.mjs, adapted from the 2959ba0 sd.mjs. Results are in qa/claude-qa/save-durability-4a25d0d/results-*.json. Each case has a `<case>-<mobile|desktop>.png` screenshot and a `.console.log`.
- **Rules checked against:** product/decisions.md, 2026-10-16 15:15 (Head of Product).
- **Claude:** 1 call through claude-qa.sh. It was wasted: the wrapper's `--add-dir` covers /tmp/egg-claude-qa, not -v3, so Claude couldn't read the source. Root causes below are my own reading of the code.

## Retest of the 2959ba0 findings
| Old bug | Status | Evidence |
|---|---|---|
| BUG-1: savedAt 0 or negative pays 2 h | **FIXED.** 0, negative, 2019-06-01 and future values all give 0 offline earnings, the save is re-stamped with now, and the farm is kept. | b-savedat-{zero,negative,y2019,future}-* |
| BUG-2: a stale tab overwrites a newer save | **FIXED.** The v99 main survives. Tab 1 stops and shows the newer-version dialog. | a4-two-tabs-tab1-*, a4-two-tabs-tab2-* |
| BUG-3: missing main ignores .bak | **FIXED.** The .bak farm is restored (basket 14 and 15) and .bak is never replaced by a fresh state. | e1-main-deleted-bak-ignored-* |
| BUG-4: Reset leaves .bak | **FIXED.** .bak is removed on reset. | e2-reset-leaves-bak-* |
| BUG-5: savedAt null or string goes to corrupt path | **null: FIXED** per the rules (0 offline, re-stamped, farm kept, no banner). **String: UNCHANGED**, still the corrupt path with a .bak restore and 0 offline. The 15:15 rules don't cover strings, so this needs a Product call. | b-savedat-{null,string}-* |

## New bugs (4: 2 Major, 2 Minor)
### NEW-1 Major: a stale localStorage copy with a future savedAt beats a newer IndexedDB copy and overwrites it
Repro (both sizes):
1. Play and copy `eggfarm.save` (A, basket 5).
2. Keep playing until IndexedDB main holds B (basket 15).
3. Close the tab.
4. Write A back to localStorage with savedAt = now + 1e10. The sum stays valid.
5. Reload.

- **Expected:** a future savedAt is invalid (15:15 rule) and must not win against a valid copy. B is loaded.
- **Actual:** A is loaded (basket 5), re-stamped, and mirrored over B in IndexedDB. The progress in B is lost.
- **Cause:** validate() calls validSavedAt(t, 0), which skips the future check. pickNewest (idb-mirror.ts) then compares the raw future timestamp.
- **Evidence:** e3-future-ls-beats-idb-{mobile,desktop}.png and .console.log.

### NEW-2 Major (seen at desktop only, timing-dependent): a single tab is locked out with "Game open in another tab" when localStorage is full
Repro:
1. Play.
2. Fill localStorage to quota with junk keys.
3. Reload in the same, single tab.

- **Expected:** the game plays and shows the storage warning. This is what happened on the 390px run.
- **Actual (desktop run):** the "Game open in another tab… Play here" modal appears and nothing can be played.
- **Cause:** TabLease.claim() swallows the setItem quota error (tab-lease.ts:39). owns() then reads the previous session's lease, which is still fresh, so this tab is treated as the other tab. "Play here" probably fails the same way; that is not verified.
- No data was lost: the newer IndexedDB copy, basket 15, was kept.
- **Evidence:** f6-quota-stale-ls-vs-idb-desktop.png (lockout) and -mobile.png (plays, with warning), each with its .console.log.

### NEW-3 Minor: missing main plus a corrupt or bad-checksum .bak starts a fresh farm with no recovery dialog
Repro (both sizes):
1. Remove `eggfarm.save` and the IndexedDB main record.
2. Set `.bak` to truncated JSON, or to a valid save with a wrong sum.
3. Reload.

- **Expected:** the "A fresh start… we've kept a copy" dialog, as shown when main and .bak are both corrupt (f4).
- **Actual:** onboarding starts silently on a fresh farm. The bad .bak is preserved as eggfarm.save.corrupt.<ts>, but the player is never told.
- **Cause:** loadSafeInner returns recovery:null on the missing-main, bad-.bak branch.
- **Evidence:** f3-main-missing-bak-{corrupt,badsum}-*.png and .console.log.

### NEW-4 Minor: a live tab writes localStorage main once after a newer save appears only in IndexedDB
Repro (both sizes):
1. Tab 1 is playing.
2. Another page puts a v99 copy into IndexedDB eggfarm/save/main.
3. Tab 1 autosaves.

- **Expected:** no writes once a newer copy exists.
- **Actual:** localStorage main is rewritten as v6, with a savedAt after the v99 copy. The v99 IndexedDB copy itself is kept, and the newer-version dialog then appears.
- **Cause:** newerGuard only knows about IndexedDB through the mirror's cached `newer` value. The first in-transaction check happens after kv.setItem.
- **Evidence:** f1-live-newer-in-idb-*.png and .console.log.

## Passed (both sizes)
- Every newer-version check: a live newer .bak stops the tab, the .bak stays v99 and the dialog shows (f2). The newer main in the two-tab case survives (a4). The refused second tab writes nothing.
- Main and .bak both corrupt: both are preserved, and the fresh-start dialog is shown (f4).
- Six rapid reloads after a 30-minute absence: +675 eggs are paid exactly once, the final basket is 679, and IndexedDB matches (f5).
- Under quota on 390px, the newer IndexedDB copy beats the stale localStorage copy and the warning shows (f6-mobile).
- All of the savedAt cases listed in the retest table.
