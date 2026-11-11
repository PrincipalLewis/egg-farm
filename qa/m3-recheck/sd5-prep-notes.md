# SD5-1 / SD5-2 recheck prep (code-level only, written 19:3x CEST, 16 Oct)
Source: `save-durability-aaaa91a.md`, its folder (`run.log`, `guard-save-R1R6-qa-firefox.log`, `buildid.mjs`) and the runner scripts `/workspace/qa-sd3/run4.sh`/`run6.sh`. Nothing was run, and no server or browser was started. Fix SHA: **TBD (from Senior Engineer, Saves & Persistence)**.

## 1. Findings as recorded on aaaa91a (Firefox only; Chromium and WebKit PASS)
Repro: build dist-qa at the SHA, then `cd <worktree> && DIST=dist-qa ENGINE=firefox PORT=4391 node /workspace/egg-farm-studio/qa/m3-scripts/rc1-guard-save-qa.mjs <worktree>`. The script starts its own `vite preview --strictPort` and refuses to run if the port is busy (exit 3) or if the served bundle isn't the worktree's `index-*.js` (exit 4).

**SD5-1 (Minor): R1, corrupt localStorage save + valid IndexedDB copy → silent restore.** Script lines 102–106, fails 3/3:
1. Seed the `m2-rc1-v5-40min.json` fixture and start.
2. Set `coinsCents = 777777777`, call `eggfarm.save()`, wait 800 ms, then `want = st(A)` (LIVE in-memory state) and close the tab.
3. Open a new page and corrupt `eggfarm.save` (garbage `{{{not json` / truncated to half / `coinsCents` replaced by 5), then remove the lease.
4. Start. Assertion: `got.coins >= want.coins && got.L === want.L && rec === 0`.
Recorded: `{"want":778395644,"idb":777777777,"got":777777777,"rec":0,"keys":["eggfarm.save.corrupt.<ts>","eggfarm.save.corrupt.index"]}` for garbage, truncated and checksum alike. The restore is silent and the corrupt copy is kept, but it restored the IndexedDB copy from the explicit save and lost about 6.2 M cents of later progress. The likely cause is that Firefox's async IndexedDB mirror hadn't committed. Note: `want` is live state, so even a perfect fix can come in below it by unsaved ticks. See §4.

**SD5-2 (Minor): tab handover.** Script lines 38–45:
1. Seed and start tab A. Set `coinsCents = 1e12`, buy 5 times (unsaved, under the autosave interval), record `aBefore = st(A)`.
2. Open tab B in the same context and start it. A flushes, then B claims.
3. Assertion: `bLoaded.coinsCents === aBefore.coins && farm/collection equal && flush→claim ≤ 350 ms` (the label says ≤300).
Recorded: `aBefore.coins 999954005441`, `bLoaded.coinsCents 999954005433` (8 cents short, F19/C22 match), flush→claim 5 ms, A sent `["flush","claim","flushed"]`, `lsBefore.savedAt 1792167640987`, B `savedAt 1792167642030`. The old assertion compared against A's live state. The new one is §4: exact against A's final persisted copy.

Known harness fails in the same script on all engines (not bugs): R5 ×3 (line 132 was already bumped to v6, so these should now PASS, and that's worth checking), D3/D4 (release inertness can't pass on dist-qa by design), TG-UI-9 (info only, Firefox).

## 2. Save-suite regression list (from the aaaa91a report), one engine at a time
Setup (code checks, once):
```
G=<fresh worktree at FIX_SHA>; cd $G && npm ci && npm run build && npm run build:qa
npx vitest run                      # expect 446 passed + 2 skipped (+ any new tests)
node scripts/check-release-build.mjs   # globals only eggfarmExportTelemetry
npx vite-node scripts/sync-economy-cli.ts -- --check
# offline code checks (17), save-migration fixtures (9, v6), pacing diff vs 737c2cf: as in aaaa91a (unit-clean/offline-code/save-migrations logs)
```
Variables: `Q=/workspace/egg-farm-studio/qa/m3-scripts; C=$Q/combined; S2=/workspace/egg-farm-studio/qa/m3-recheck/s2-8-wage-rate.mjs; L=/workspace/egg-farm-studio/qa/m3-recheck/save-<sha>; O=/workspace/egg-farm-studio/qa/m3-recheck/save-durability-aaaa91a`. **Copy** `buildid.mjs probe3.mjs probe.mjs claude-items.mjs quota2.mjs` from $O into $L, and `sed` the hard-coded `/workspace/qa-sd3/game` to $G. Otherwise they test the aaaa91a clone (the same trap as the void WRONGBUILD-2959ba0 logs). Run everything from `cd $G`. Ports: base 4391; for engine E use the offsets below with B=4400 (chromium), 4430 (firefox), 4460 (webkit). Never use 4173.

| # | Check | Command (E = chromium / firefox / webkit) | Port |
|---|---|---|---|
| 1 | Build ID | `PORT=$B node $L/buildid.mjs E` (serves dist on B, dist-qa on B+1) | B, B+1 |
| 2 | SD4-2 quota2 | `PORT=$((B+2)) node $L/quota2.mjs E` | B+2 |
| 3 | probe3 (BUG-7, savedAt, write guard, reset, reconcile, flash) | `DIST=dist-qa PORT=$((B+3)) node $L/probe3.mjs E` | B+3 |
| 4 | probe3 release | `DIST=dist ONLY=2,6 PORT=$((B+4)) node $L/probe3.mjs E` | B+4 |
| 5 | probe.mjs (B1/M1/minors/BUG-6) | `DIST=dist PORT=$((B+5)) node $L/probe.mjs E` | B+5 |
| 6 | claude-items | `PORT=$((B+6)) node $L/claude-items.mjs E` (prints C… lines; read by hand) | B+6 |
| 7 | Eng release globals | `PORT=$((B+7)) node scripts/release-globals-browser.mjs E` | B+7 |
| 8 | QA globals | `MODE=globals DIST=dist ENGINE=E PORT=$((B+8)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G` | B+8 |
| 9 | save-v6 | `MODE=save DIST=dist-qa ENGINE=E PORT=$((B+9)) OUT=$L/out node $Q/s2-43eb112-save-globals.mjs $G` (Firefox: known timing crash) | B+9 |
| 9b | save-v6 longwait | `MODE=save DIST=dist-qa ENGINE=E PORT=$((B+10)) OUT=$L/out node $Q/s2-43eb112-save-globals-longwait.mjs $G` (the Firefox pass criterion) | B+10 |
| 10 | Offline clock | `DIST=dist-qa ENGINE=E PORT=$((B+11)) OUT=$L/out node $C/offline-clock.mjs $G` | B+11 |
| 11 | Exact wage | `DIST=dist-qa ENGINE=E PORT=$((B+12)) OUT=$L/out FARM=3 REAL_S=60 node $S2 $G` | B+12 |
| 12 | Eng tab-guard | `PORT=$((B+13)) node scripts/tab-guard-browser.mjs E` | B+13 |
| 13 | rc0-browser | `PORT=$((B+14)) SHOTS=$L/shots node scripts/rc0-browser.mjs E` | B+14 |
| 14 | d2 browser-kill | `PORT=$((B+15)) node scripts/d2-kill-browser.mjs E` (dist-qa on P, dist on P+1) | B+15, B+16 |
| 15 | recovery-v11 | `node scripts/recovery-v11-browser.mjs E`: **no PORT env**, picks random 5700–5899 (never 4173) | random |
| 16 | **R1–R6 guard-save, covers SD5-1 and SD5-2** | `DIST=dist-qa ENGINE=E PORT=$((B+17)) OUT=$L/out/qags-E.json node $Q/rc1-guard-save-qa.mjs $G` (use the patched private copy from §4 for the SD5 verdict) | B+17 |
| 17 | 20× Fast Collect (Chromium only) | `for i in $(seq -w 1 20); do ONLY=fastcollect PORT=4391 SHOTS=$L/shots node scripts/rc0-browser.mjs chromium > $L/fastcollect/run$i.log 2>&1; done` | 4391 |

Concrete example, Firefox SD5 checks: `cd $G && DIST=dist-qa ENGINE=firefox PORT=4447 node $Q/rc1-guard-save-qa.mjs $G`.
**Caution:** the old run6.sh helper ran `pkill -f "qa-sd3/game/node_modules/.bin/vite"` after every check. Don't reuse it as is; it could kill other people's preview servers. Kill only your own PID/port. rc1-guard-save leaks its server if it times out (seen on 6535), so check `ss -ltnp | rg 44[0-9][0-9]` between engines.

## 3. Verifying the build ID at runtime
- `buildid.mjs` (copy with the path fixed to $G and the expected string changed from `aaaa91a` to the fix short SHA). It serves dist and dist-qa via `serveOwn` (strictPort plus a check that the port serves this outDir's hashed chunk), clicks "Tap to start", waits 2.5 s, and reads `localStorage['eggfarm.telemetry']` → `"build":"m3-rc1-pre+<sha>"` from session_start. Expect `PASS [E dist] runtime build id m3-rc1-pre+<sha>` and the same for dist-qa, per engine.
- Also check the `bundle ok: <port> serves <G>/dist-qa index-XXXX.js` line at the top of each script log, and that the `index-*.js` hash matches `ls $G/dist-qa/assets`.
- The release alternative is `window.eggfarmExportTelemetry()`, which parses to session_start's `build`.

## 4. Proposed assertions (HoQA decisions, 19:32). Patches NOT applied to shared scripts
Both patches are against the current `qa/m3-scripts/rc1-guard-save-qa.mjs` (line 132 already v6). Each dry-runs cleanly on its own, both apply together on a scratch copy, and `node --check` is OK for each and for the combined copy.
To apply on a private copy: `mkdir -p $L/s/qa/m3-scripts && cp $Q/rc1-guard-save-qa.mjs $L/s/qa/m3-scripts/ && cd $L/s && patch -p1 < ../../sd5-1-assert.patch && patch -p1 < ../../sd5-2-assert.patch`, then run `node $L/s/qa/m3-scripts/rc1-guard-save-qa.mjs $G`.

**`sd5-1-assert.patch` (R1, now 2 result lines per variant):**
- PRIMARY: `persisted` = newest of the localStorage and IndexedDB save copies by `savedAt`, read right before tab A closes. Pass = `got.coins >= persisted.coins` (**zero tolerance**), same levels (L), `rec === 0`, corrupt copy kept (`keys.length > 0`). Logs the source (ls/idb), savedAt, `shortVsPersisted`.
- SECONDARY: `got.coins >= live.coins − tickIncome` (live = `st(A)` at close; tickIncome = measured cents per 100 ms from two samples 1 s apart), same levels.
- Expectation vs the aaaa91a data: PRIMARY FAILs if the localStorage copy at close was about 778.39 M and got 777777777.

**`sd5-2-assert.patch` (handover, 2 result lines):**
- Before tab B opens, tab A's own `localStorage.setItem('eggfarm.save')` and IndexedDB `put('main')` (on success) are hooked into `window.__aWrites`. After B has started and A's notice is up, plus 300 ms, `aFinal` = A's newest persisted write by `savedAt`, i.e. its final persisted state after release.
- PRIMARY: `bLoaded.coinsCents === aFinal.coins` and F/C equal **exactly**, and flush→claim ≤ 350 ms. 8 cents short = FAIL. Logs `diffVsPersisted`.
- SECONDARY (live): `bLoaded.coinsCents >= liveAtOpen − one 100 ms tick` (tick measured over 500 ms just before B opens), same levels.
- Caveats: the 500 ms income sample delays B's open a little (still under the autosave interval, so the purchases stay unsaved). If A writes nothing during handover, `aFinal` is null and PRIMARY FAILs; inspect `aWrites` before calling that a product bug.

## Open / blockers
- Fix SHA is unknown; I need it from the Senior Engineer (Saves & Persistence). No worktree exists for it yet.
- Box busy until about 20:25 (Cut A). No runs before then.
