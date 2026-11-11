# QA pass 2: save durability, build 2959ba0
- **PASS_ID:** save-durability-2959ba0. **Branch:** m3/rc1-save-durability-rebased @ **2959ba0** (build id m3-rc1-pre+2959ba0).
- **How it was built:** detached worktree at /tmp/egg-claude-qa, `npm run build` (check-release-build passed), served on 127.0.0.1:4173.
- **How it was tested:** headless system Chrome with playwright-core, at 390x844 and 1280x800. Every result below is a real browser run, and every case ran at both sizes.
- **Script:** qa/claude-qa/save-durability-2959ba0/sd.mjs. Results are in qa/claude-qa/save-durability-2959ba0/results-*.json. Each case has a `<case>-<mobile|desktop>.png` screenshot and a `.console.log`. In `results-a_ls,a_idb,a_bak,a_tabs.json`, ignore the a1 entry: it was a test artifact, and the corrected a1 is in `results-a_ls,b,c,d.json`.
- **Claude:** 1 call through claude-qa.sh. It suggested 4 leads: 1 was confirmed (BUG-3), 1 partly (BUG-4), and 2 were not tested.

## Bugs (5: 3 Major, 2 Minor)
### BUG-1 Major: savedAt = 0 or a negative value pays the full 2 h offline grant
Repro (both sizes):
1. Play, then close the tab.
2. Set `eggfarm.save`.savedAt to 0 (or -5e12) in both localStorage and the IndexedDB `eggfarm/save/main` copy. The sum stays valid because it covers only the state.
3. Open the game and tap start.

- **Expected:** an invalid savedAt gives 0 offline earnings (focus b).
- **Actual:** "Welcome back! You were away 2h+ +2,700 eggs", with pendingOfflineEggs=2700. The reward is not paid again on the next reload: pend=0 and the eggs land in the basket. Only Number.isFinite is checked (game.ts:52), so 0, negative and pre-launch timestamps all count as valid.
- **Evidence:** qa/claude-qa/save-durability-2959ba0/b-savedat-zero-{mobile,desktop}.png and b-savedat-negative-*.png, each with its .console.log.

### BUG-2 Major: an older tab that is still open overwrites a newer-version save
Repro:
1. Tab 1 is playing.
2. Another tab writes a v99 `eggfarm.save`, standing in for a newer build saving.
3. Tab 2 boots this build. It correctly shows "This save is from a newer version…".

- **Expected:** no copy of the v99 save is overwritten (focus a, two tabs).
- **Actual:** tab 1's next autosave (every 5 s) or its pagehide save rewrites main and IDB as v6. The v99 save was gone within about 3 s. Game.save() never re-checks newerStoredVersion, and a refused tab doesn't join the lease, so tab 1 keeps owning it.
- **Caveat:** if a real newer build claims the tab lease, tab 1 is frozen first. That depends on the next build keeping the lease protocol.
- **Evidence:** qa/claude-qa/save-durability-2959ba0/a4-two-tabs-tab1-*.png, a4-two-tabs-tab2-*.png and a4-two-tabs-tab1-*.console.log.

### BUG-3 Major: a missing main save ignores a valid .bak, and the fresh game overwrites it
Repro:
1. Play until `.bak` holds progress (basket 15).
2. Remove `eggfarm.save` and the IDB main record.
3. Reload.

- **Expected:** restore from `.bak`, which is the recovery case R.
- **Actual:** a new game starts with basket 0 and the onboarding screen. About 7 s later `.bak` is rotated to the fresh save, so the progress is permanently lost. loadSafe returns {file:null} when main is null and never looks at .bak.
- **Evidence:** qa/claude-qa/save-durability-2959ba0/e1-main-deleted-bak-ignored-*.png and .console.log.

### BUG-4 Minor: Reset save leaves the old progress in .bak
Repro: play with progress, then Settings → Reset save → Reset.

- **Actual:** main is reset, but `eggfarm.save.bak` still holds the pre-reset save (basket 15), because RESET_KEYS contains only the main key.
- I could not make the old save come back from `.bak` by corrupting main afterwards: the valid IDB copy won. It is stale data that a recovery path could revive.
- **Evidence:** qa/claude-qa/save-durability-2959ba0/e2-reset-leaves-bak-*.png.

### BUG-5 Minor: savedAt null or a string is handled as a corrupt save, not as "invalid savedAt"
Repro: set savedAt to null or to "abc", then reload.

- **Actual:** you get the corrupt-save banner ("Something went wrong with your latest save, so we loaded your most recent backup"), and up to the last few seconds of progress are rolled back to `.bak`. Offline earnings were correctly 0.
- **Expected:** handle it the same way as a missing savedAt: load main, pay 0, re-stamp.
- **Evidence:** qa/claude-qa/save-durability-2959ba0/b-savedat-{null,string}-*.png.

## Passed (both sizes)
- (a) A v99 save only in localStorage main is refused, and no save key or IDB copy is written: a1, unchanged=true.
- (a) A v99 save only in IndexedDB is refused, and nothing is written to localStorage: a2 left only install_id behind.
- (a) A v99 save only in .bak is refused, with no writes: a3.
- (a) A second tab on a newer save shows the refusal screen and does not write: a4 tab 2.
- (b) A missing savedAt pays 0 offline and nothing is paid on reload.
- (b) A future savedAt pays 0, and the new timestamp is saved.
- (c) A 30-minute absence pays +675 eggs once, as pendingOfflineEggs. The next reload settles them into the basket and pays no second grant.
- (d) Collected eggs survive a page close and reopen (pagehide save, and IDB matches).

## Not tested
These are Claude leads with no browser repro yet:
- A future-stamped stale localStorage copy beats a newer IDB copy, because savedAt isn't checksummed.
- A localStorage quota error during reconcile lets the stale copy overwrite IDB.
