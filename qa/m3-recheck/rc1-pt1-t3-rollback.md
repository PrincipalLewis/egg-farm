# rc1-pt1 (2490c79): T3 sale-popup repro, M4A-31 testability, newer-save behaviour
QA, 2026-10-16. Build: /tmp/rc1pt1/rel (rc1-pt1 asset, build tag 2490c79), served with vite preview. Scripts and raw JSON: qa/m3-recheck/t3-rollback/ (t3.mjs, fixture.mjs, t3-*.json, fixture-result.json, fixture-v6-*.json).

## 1. T3: "+$101.40" popup stuck for minutes. Verdict: NOT reproduced -> rc2 (no rc1 bug)
Method: a MutationObserver (init script) times every `.floater` node from insert to removal and lists any node still attached after more than 1 s. Each loop does: 10 rapid Collect taps, then open the Market chip, up to 4 Sell / Sell all taps, re-open and close the panel every 3rd loop, resize 390<->1280 every 5th loop, and an upgrade buy every 4th loop. The FX budget has at most 30 nodes.

| engine | mode | dur | sells | floaters (sale) | max life | p99 | >1 s |
|---|---|---|---|---|---|---|---|
| chromium | foreground | 300 s | 694 | 3468 (280) | 782 ms | 752 | 0 |
| firefox | foreground | 300 s | 495 | 2430 (215) | 906 ms | 757 | 0 |
| webkit | foreground | 300 s | 592 | 3539 (267) | 948 ms | 756 | 0 |
| chromium / firefox / webkit | prefers-reduced-motion | 120 s | 176/137/154 | 1054/717/1001 | 781/805/852 ms | ≤763 | 0 |
| chromium / firefox / webkit | tab backgrounded 20 s every 3rd loop (2nd tab in front + visibility hidden) | 150 s | 72/60/62 | 194/158/184 | 768/761/824 ms | ≤814 | 0 |
| chromium | page frozen 30 s via CDP Page.setWebLifecycleState, mid-popups (up to 9 live) | 150 s | 48 | 125 | 793 ms* | 763 | 0 |
| chromium | CPU throttled 20x | 120 s | 66 | 221 (29) | 1370 ms | 1334 | yes (≤1.4 s, all removed) |

\* performance.now() also stops while frozen. In wall-clock time, a popup created just before a freeze stays on screen for the whole freeze and is removed within about 1 s of resuming.

No popup node ever outlived about 1.4 s, and none was left behind at the end of any run. Two removal paths exist: animationend, with the 750 ms setTimeout as a backstop. A minutes-long stuck popup therefore needs both timers and animations to be suspended while the page is still painted. That fits a backgrounded or occluded window, a frozen or discarded tab, a screenshot of a suspended page, or a scripted or headless critic harness. It does not fit a normal foreground tab. Suggested rc2 hardening: also sweep floaters older than 1 s on visibilitychange/pageshow/resume.

## 2. M4A-31 rollback AC: testability review
Testable once these gaps are closed:
1. **Backup write failure, how to simulate:** name the seam. Suggested: unit tests use a KV stub whose setItem('save_v6_backup') throws QuotaExceededError (and IDB put rejects). Browser test: pre-fill localStorage to quota, or stub Storage.prototype.setItem through an init script. State whether *either* store failing aborts the migration, or only both. Recommended: localStorage failure aborts; IDB-mirror failure is logged but does not abort. Also state what the player sees on abort (silent, or a message) and whether the migration is retried on the next load.
2. **Backup key namespace:** every other key is `eggfarm.*`. Is it literally `save_v6_backup`, or `eggfarm.save_v6_backup`? Also name the IDB database and store. rc1-pt1 has **no IndexedDB at all** (indexedDB.databases() = [] before and after), so "byte-identical IDB" there means "no DB is created".
3. **What "newer" means:** `version` is an integer > SAVE_VERSION. Spell out the other cases. Non-integer, missing, negative or NaN versions, unparseable JSON and bad checksums should stay on the existing corrupt path (preserve copy, then .bak, then fresh start). Only a *well-formed, integer, higher* version is refused. A higher version with a bad checksum or invalid state: is it refused (recommended, because the newer build may use a different schema/checksum), or treated as corrupt? Checksum validation must not run before the version check.
4. **Message:** the copy is given. Also give placement and role (status/toast or dialog), whether it persists, the test selector, and that no "Tap to start" leads into a playable game.
5. **"Session" and autosave off:** also cover pagehide/visibilitychange/beforeunload save hooks, the `.bak` rotation, the load-time save, telemetry and eggfarm.ui writes. Is the whole of localStorage byte-identical, or just the save keys? Telemetry and `eggfarm.ui.sessions` change on every load today. Recommend: the *save keys* (`eggfarm.save`, `.bak`, `.corrupt.*`, backup) are byte-identical; telemetry/ui may change; list them.
6. **(c) Restore:** "reopening the v7 build continues from the v7 save" needs a fixture pair and a check (coins/levels equal, no explainer re-shown).
7. **Multi-tab:** a refusing build in tab 2 while v7 is open in tab 1 must also not write (read-only KV path already exists).
8. Already-shipped builds (e): see §3. rc1-pt1 does **not** comply. The AC's 3-engine test can only pass on builds that contain the guard, so state that rc1-pt1 and m2 are documented as known-destructive, with the release note telling playtesters not to open rc1-pt1 after a v7/v6 build.

## 3. rc1-pt1 opening a save one version newer. Result: REFUSED AS CORRUPT, THEN RESET AND OVERWRITTEN (copy kept)
rc1-pt1 bundle: `SAVE_VERSION = 5` (src/save/save.ts:4; the bundle contains migrations up to version 5). Fixture: a real v5 save from the build, with version changed to 6, `wageFracCents: 0`, coins 123456 and F7, and a valid FNV checksum so only the version differs. The fixture was written to localStorage, the build loaded, Tap to start pressed, then a 70 s wait (more than the autosave interval). Results were identical in chromium, firefox and webkit:
- validate() returns reason `version`. loadSafe copies the raw v6 save **byte-identical** to `eggfarm.save.corrupt.<ts>` and adds it to `eggfarm.save.corrupt.index`.
- No valid `.bak` (the fixture had none), so case F: **a fresh game starts** (code path: "A fresh start" dialog, "We couldn't open your saved farm… We've kept a copy of the old save"). My DOM probe didn't capture the dialog text, so that line comes from the code path and the keys.
- **`eggfarm.save` is overwritten** with a new v5 save (coins 0, F0). Autosave then writes `eggfarm.save.bak` = the fresh v5 game. eggfarm.ui loses progress flags (onbStep), sessions = 2. Telemetry is appended.
- IndexedDB: none before or after.
- Implication: if a valid v5 `.bak` existed, case R would **restore the older v5 backup** over the newer save (silent rollback of progress). The v6 bytes survive only in the corrupt slot, which keeps the last 3 entries, so 3 more bad loads evict it. Opening a newer save in rc1-pt1 is destructive to the live save, but the data is recoverable by hand from `eggfarm.save.corrupt.*`. That's exactly why the M4A-31(b) guard has to ship before rc1.
