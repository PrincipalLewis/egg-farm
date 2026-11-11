# QA recheck: save durability on m3/rc1-save-durability-rebased @ 2959ba0
Date: 2026-10-16, 14:48–15:15 CEST. Fresh clone /workspace/qa-sd/game (gh clone, detached at 2959ba0 = origin branch head; 4aadcbf is an ancestor; 8669522 -> 923ea44 -> 2959ba0 on top). Nothing pushed, merged or tagged. Scripts in qa/m3-scripts used read-only. New QA probes: `save-durability-2959ba0/probe.mjs` (B1/minors/BUG-6) and `claude-items.mjs` (Claude QA Tester findings). Logs: `save-durability-2959ba0/`. Box load during runs: 7–15 (quiet compared with earlier runs).
**Scope cut (steering 15:12):** Engineering is fixing the Majors on a new SHA, so the full regression stopped partway. What did not run is listed at the end.

## Verdict: FAIL (on Claude QA Tester's confirmed Majors). Engineering's own fix items B1, M1, minors, S2-REL-1 and BUG-6 (missing/1e999) PASS.

| # | Check | Result |
|---|---|---|
| 1 | B1: v7 only in IDB, localStorage empty | PASS in C/F/W, release + QA build. Refused, exact text shown, no game. 0 save/.bak/corrupt/lease/IDB writes, 0 BroadcastChannel messages, IDB bytes unchanged. The only localStorage write is `eggfarm.install_id` (not a save key) |
| 1b | v7 only in LS main / only in .bak | PASS C/F/W, same checks |
| 2 | M1 refused tab beside live tab | PASS C/F/W (Eng rc0-browser `newertwotab`: refused tab posts no flush/claim and writes nothing; live tab keeps its lease and keeps saving) |
| 3a | Non-integer version (7.5, 6.5, "7") -> corrupt path | PASS C/F/W (recovery dialog, copy preserved byte-identical, not refused) |
| 3b | Corrupt main + v7 .bak -> refused with the exact text | PASS C/F/W. In Firefox/WebKit my byte-identity check reported FAIL only because the engines return localStorage keys in a different order (key set and values are identical, 0 writes). Harness artefact |
| 4 | BUG-6 missing / 1e999 | PASS C/F/W: 0 offline, saved at once with savedAt≈now, 2 reloads with no reward. Control (valid 1 h old) grants once |
| 4b | BUG-6 null, NaN | **Deviation (QA-SD-5, Medium)**: the save goes down the corrupt path (`wrong_type`/parse), not 0 offline + restamp. See below. A NaN literal is invalid JSON, so the corrupt path is unavoidable for it. null is the real case |
| 4c | String savedAt -> corrupt path | PASS C/F/W |
| 5 | S2-REL-1 release globals | PASS C/F/W: only `eggfarmExportTelemetry` (Eng release-globals-browser incl. the refused boot, plus QA s2-43eb112 globals). Bundle has only `window.eggfarmExportTelemetry=`. check-release-build ok |
| 6 | QA-MONEY-1 | 737c2cf is **NOT included** (not an ancestor of 2959ba0). The 20× Fast Collect run was not done (scope cut) |
| 7 | Units | PASS: clean 414 + 2 skipped (416); with product/economy.csv 415 + 1 skip. Engineering claimed 406/408; the extra tests are in the branch |
| 7 | sync --check / economy CSV | PASS: up to date; check-economy-copy matches (32 lines); data/economy.csv byte-identical to 4aadcbf |
| 7 | rc0-browser | Chromium 68/68, **Firefox 68/68** (first try, no crash). WebKit not run (scope cut) |
| 7 | Eng tab-guard | Chromium 17/17, Firefox 17/17 |
| 7 | Save v6/migrations | Fixtures 9/9 (v6). Browser Chromium 7/7, WebKit 7/7. Firefox 4/4 migrations, then the script errors 4/4 tries (`window.eggfarm` undefined 700 ms after "Tap to start": the fixed wait in s2-43eb112 `start()` is shorter than the new IDB-open + lease boot in Firefox). Likely a harness timing issue, not confirmed |
| 7 | Pacing | Identical to 4aadcbf apart from runtime: L18 at 30:00, L30 at 243.8 min |
| 7 | Offline (browser) | offline-code 17/17. offline-clock 6/6 in Chromium, Firefox and WebKit. **The earlier Firefox ratio miss is resolved** (19800/9905 = 1.999, within ±0.2%) |
| 7 | Exact wage | Chromium 4/4, Firefox 4/4. **WebKit run interrupted** by the scope cut (earlier WebKit wage check still open) |

## Claude QA Tester findings: independent repro (Chromium, dist-qa, `claude-items-chromium.log`)
1. **savedAt 0 / -1 / -1e15 grants the full 2 h cap once** (19800 eggs, awayS 7200, Welcome back). The reload grants 0. CONFIRMED. game.ts:52 checks only `Number.isFinite`. Note: setting savedAt to now-2h, which is a valid value, gives exactly the same reward, so it is not a bigger exploit than editing any timestamp. **Low–Medium** (breaks Product's "invalid -> 0" rule; suggest treating savedAt <= 0, or a savedAt before the save format existed, as invalid).
2. **Two tabs: an old tab overwrites a newer save**: CONFIRMED in the narrow case. A v7 written to main under a live lease-holding tab is overwritten by the next autosave in about 4 s (versions per second: 7,7,7,7,6,6,6,6). `save()` re-checks only .bak, not main. **Realistic case: not reproduced.** When the newer build opens as a new tab and claims the lease through the same protocol, the old tab goes inactive ("open in another tab" notice) and main stays v7 after 6 s and pagehide. Risk exists only if a future build drops or changes the lease/BroadcastChannel protocol. **Medium (latent)**; suggest a newer-version check of main in save() as a cheap guard.
3. **Main missing (LS + IDB), valid .bak -> new game, .bak overwritten**: CONFIRMED. Boot gives farm 0 with no recovery dialog and .bak (farm 10) intact; 9 s later .bak = farm 0 and the progress is gone. loadSafe returns early on `raw === null` before looking at .bak. Already present at 4aadcbf (not a regression). **Major (data loss)**. Repro: localStorage only `eggfarm.save.bak` = a valid save, no IDB, open the game, wait 9 s.
4. **Reset leaves the old progress in .bak**: CONFIRMED (right after Reset, .bak = farm 10; RESET_KEYS = [main] only). Because of item 3 it is overwritten about 9 s later. Until then, a corrupt main would restore the reset progress. **Minor**, already present at 4aadcbf.
5. **null / string savedAt -> corrupt path**: CONFIRMED. With no .bak the player sees "A fresh start…" (farm 0, copy kept). With a .bak it rolls back to .bak. String: that is Product's rule (corrupt). **null: deviates from Product's rule** ("missing or invalid -> 0 offline, stamp now"); the farm is lost from the player's point of view. **Medium (QA-SD-5)**. Fix: treat `savedAt === null` like missing in validate().

## Not run / open
- QA-MONEY-1 Fast Collect 20× (737c2cf is not in 2959ba0 anyway), rc0-browser WebKit, Eng tab-guard WebKit, exact-wage WebKit (interrupted), D2 kill / guard R1–R6 / save_restore suites, a Firefox rerun of save-v6 with a longer wait, Claude repros in Firefox/WebKit. All skipped because of the 15:12 scope cut. Rerun them on Engineering's new SHA.
