# QA recheck: save durability on m3/rc1-save-durability-v3 @ 4a25d0d
Date: 2026-10-16, 15:38–16:05 CEST. Fresh clone /workspace/qa-sd3/game, detached at 4a25d0d (= origin branch head). 737c2cf is an ancestor (rebase confirmed). Nothing was pushed, merged or tagged. Artifacts: `save-durability-4a25d0d/`.
Servers: every browser run used `serveOwn` (vite preview `--strictPort`, checks that the page serves this outDir's own hashed chunk) on QA ports 64xx/65xx/67xx. Nothing ran on :4173. Both bundles embed build id 4a25d0d (`dist/assets/index-BaD00qyu.js`, `dist-qa/assets/index-D9pzI9sc.js`).
**Scope cut (steering 15:54):** Engineering already reproduces both claimed Majors and will ship v4 at about 17:00, so after I reproduced item 1 I stopped. Only Chromium ran. The full 3-engine regression moves to v4.

## Verdict: FAIL. Claude QA Tester's NEW-1 (a future savedAt wins reconcile and overwrites the newer copy) reproduces in Chromium. Major.

## Bugs
### SD4-1 (= Claude NEW-1), Major, data loss: a future-dated copy wins reconcile and overwrites the other copy
`pickNewest()` (idb-mirror.ts) relies on `validate()`, which calls `validSavedAt(t, 0)`. With a clock of 0, the future check and the pre-2020 check are both skipped. A savedAt in the future therefore counts as valid and as the newest copy, which breaks Product's rule (15:15: future is invalid, so it is the oldest copy).
Repro (Chromium, dist-qa, probe3 item 5):
1. localStorage `eggfarm.save` = a farm-12 save with savedAt = now + 1 day. IndexedDB main = a valid farm-10 save with savedAt = now − 60 s.
2. Open the game. Result: farm **12** loads, and the IndexedDB copy is rewritten to match. Expected: farm 10.
3. Reversed (IndexedDB future farm 12, localStorage valid farm 10): farm **12** wins and is written back into localStorage.
Offline correctly grants 0 and re-stamps now, so this is not a reward exploit. The problem is that a stale or clock-skewed copy beats newer progress. Fix: run the future and pre-2020 checks in pickNewest with the boot clock.

### SD4-2 (= Claude NEW-2), claimed Major: localStorage full locks a single tab out ("another tab"). NOT reproduced (0/12 in Chromium)
`quota.mjs`: boot a farm-10 save, fill localStorage until setItem throws (42–45 junk keys), wait 0.5–4.5 s, reload. Run 6 times each at 1280 and 390 px. The tab played every time. In my harness the lease write still succeeded (the lease key is small and already existed). The game also did not show the storage warning within 3 s. That is a separate observation and was not followed up. Claude QA Tester saw it at desktop only, so it is timing- or fill-dependent. Engineering reports a test that reproduces it, and the root cause is plausible: `TabLease.claim()` swallows the quota error at tab-lease.ts:39 and `release()` fails the same way. **Rated Major if confirmed.** Recheck on v4 using Engineering's test plus quota.mjs in all 3 engines.

### SD4-3 (= Claude NEW-3), Minor: main missing + bad .bak starts a fresh farm with no recovery notice
Confirmed in Chromium. The bad .bak is kept byte-identical as `eggfarm.save.corrupt.*` (PASS). No dialog appears (`recovery: null` in loadSafeInner), so the player never learns their save was lost. Product's rule is met. The missing notice is a UX gap. Art & UX v2.1 Fresh-state copy would apply here.

### SD4-4, Minor (documented gap): a newer copy only in IndexedDB lets the live tab write localStorage once
Chromium: about 2.8 s after a v7 was put into IndexedDB under the live tab, one write each of `eggfarm.save.bak` and `eggfarm.save` (v6) happened. After that the in-transaction check refused the put and the newer-save screen showed. The **IndexedDB v7 survived**, and the reload refuses. Because the newer copy is intact and the next boot refuses, no newer data is lost; only the older v6 in localStorage is refreshed. **Minor.**

### SD4-5, Minor (copy): restore banner text differs from art-ux/save-recovery-dialog.md v2.1
Shown (Restored): "Something went wrong with your latest save, so we loaded your most recent backup. You might be a few moments behind." v2.1 says: "We loaded your backup. You may be a few moments behind." Fresh: shown "We couldn't open your saved farm, so a new one is ready for you. We've kept a copy of the old save, just in case." v2.1 says: "We couldn't open your farm. Your old save is kept safe." The titles and buttons match. Main-missing restores have no Export link because there is no corrupt raw; that is correct.

## Results (Chromium, dist-qa unless noted; `probe3-chromium.log`)
| # | Check | Result |
|---|---|---|
| 1 | BUG-7: main missing (localStorage + IndexedDB), valid .bak | PASS: "Welcome back!" banner, farm 10. .bak stayed farm 10 for 92 s (sampled every 4 s), then rose to 11 after a purchase and never became a fresh farm. Reload keeps progress with no second banner |
| 1b | Bad .bak | PASS (kept as a corrupt copy). No notice: SD4-3 |
| 2 | savedAt null / 0 / −1 / −1e15 / 2019 / +1 day / +1 year / missing | PASS all: 0 offline, farm 10 kept, re-stamped to now (within 0.65 s), 2 reloads with no reward. Control (valid 1 h old) grants once |
| 2b | String savedAt | PASS: corrupt path ("A fresh start", copy kept) |
| 3 | Write guard, v7 into main / .bak under a live tab | PASS: newer-save screen, 0 save writes after injection, injected copy byte-identical, reload refuses |
| 3b | Write guard, IndexedDB only | Gap confirmed as documented: 1 localStorage write (main + .bak), IndexedDB copy survives (SD4-4, Minor) |
| 4 | Reset | PASS: main, .bak and IndexedDB all empty right after Reset. 8 s later only a fresh farm-0 copy exists |
| 5 | Reconcile: invalid savedAt (0, null, missing, pre-2020) treated as oldest | PASS: the valid copy wins (farm 10). The probe flagged these 4 as FAIL only because its "no welcome" check was wrong: a 60 s-old valid save correctly grants offline |
| 5b | Reconcile, future savedAt | **FAIL: SD4-1** |
| 6 | No "open in another tab" flash (new + returning player, load + reload) | PASS (MutationObserver: 0 hits) |
| 7 | Units | 434 passed + 2 skipped (436), matching Engineering's 436 |
| 7 | sync --check | balance.json up to date. `npm run build` OK, check-release-build OK (only `eggfarmExportTelemetry` in the bundle) |
| 7 | Offline code checks | 17/17 |
| 7 | Save migration fixtures | 9/9 (v6) |
| 7 | Pacing | Unchanged: src/sim, src/config and data have no diff vs 737c2cf. f1-pacing output is identical to the 2959ba0 run (L18 at 30:00, L30 at 243.8 min) |
| — | Claude NEW-2 quota lockout | Not reproduced, 0/12 (SD4-2) |

## Not run (scope cut, moves to v4)
Firefox and WebKit for everything above. The release-build probe (items 2 and 6 on dist). B1 / M1 / version-minor probe (probe.mjs). claude-items.mjs. S2-REL-1 runtime globals (on this SHA, `eggfarmOrderList` is behind IOS_FLAG and absent from the bundle; not checked at runtime). Offline browser checks including the Firefox ratio. Exact wage in 3 engines. rc0-browser. Tab-guard. save-v6 browser plus the Firefox long-wait variant (`s2-43eb112-save-globals-longwait.mjs` prepared). 20× Fast Collect. d2-kill, R1–R6 guard-save, recovery-v11 / save-restore. Quota repro in Firefox and WebKit. The runner `run.sh` (in /workspace/qa-sd3) is ready to rerun on v4.
