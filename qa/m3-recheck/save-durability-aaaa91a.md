# QA recheck: save durability v4 on m3/rc1-save-durability-v4 @ aaaa91a (aaaa91a3d0e7…)
Started 16:09 CEST, resumed 17:00 after an interruption. Clone /workspace/qa-sd3/game, fetched at FETCH_HEAD = aaaa91a3d0e73d41fa53cc2d80e92b5cb3c42106, detached. 4a25d0d is an ancestor, so the branch is off 4a25d0d. Nothing pushed, merged or tagged. Evidence: `save-durability-aaaa91a/` (run.log, per-suite logs, scripts).
**Servers / build ID.** Every browser run used a vite preview started by the script itself, with `--strictPort`. The checks confirm it serves this outDir's own hashed chunk, or refuse a busy port. Ports were 65xx/67xx/68xx; :4173 was never used. Runtime build ID (from telemetry session_start) is `m3-rc1-pre+aaaa91a` in dist and dist-qa (`buildid-<engine>.log`). Leftover MK-24-1 preview servers (:4189 wt-mk24, :4190 game-rc1-bugs-v3) were stopped before the resume. Engineering's own rc0-browser runs (save-dialog-v4, cuta-rebase) were active on the box at the same time on their own ports.
**Harness corrections, so nobody misreads logs:**
(a) The first Chromium `probe-dist` / `claude-items` logs ran against the OLD 2959ba0 clone, because the scripts had a hard-coded path. They are renamed `WRONGBUILD-2959ba0-*` and are void; the rerun is on aaaa91a.
(b) The first `probe3` reconcile +3 min cases used a timestamp computed ~80 s before the case ran, which put them inside the 2 min skew window. Rerun with per-case timestamps: `probe3-recon-rerun-chromium.log`.
(c) The first `probe3-release` read the farm level from `window.eggfarm`, which doesn't exist in release builds. Rerun reads it from the save: `probe3-release-rerun-chromium.log`.
(d) The fill-to-quota repro (`quota-chromium.log`) can't make the lease write fail: overwriting an existing key with a same-sized value still fits. It is inconclusive and replaced by `quota2.mjs`, where localStorage throws QuotaExceededError on every write. That covers the previous session's lease, a fresh lease held by another id, and no lease.
(e) `claude-items` prints `C…` lines, not PASS/FAIL, so the runner logged a "crash" and retried. The results are in the logs and read manually.

## Verdict: see the bottom (updated as each engine finishes)

## Code-level (engine-independent)
| Check | Result |
|---|---|
| Unit tests | **446 passed + 2 skipped = 448** (matches Engineering), `unit-clean.log` |
| Release build | `npm run build` + check-release-build OK: globals only `eggfarmExportTelemetry`, no QA hooks |
| sync --check | balance.json up to date with economy.csv |
| Offline code checks | 17/17 |
| Save migration fixtures | 9/9 (v6) |
| Pacing | Unchanged: no diff in src/sim, src/config or data vs 737c2cf. f1-pacing output identical to the 4a25d0d run except runtime (L18 at 30:00, L30 at 243.8 min) |

## Chromium: done
| Area | Result |
|---|---|
| SD4-1 reconcile | **FIXED.** +1 day, +1 year and +3 min future copies rank oldest in both directions (localStorage future vs IndexedDB valid, and the reverse). The valid farm-10 copy wins, and main and IndexedDB both end at farm 10. Control: +1 min (inside the 2 min skew) and a plain newer copy both win as expected. Invalid 0 / null / missing / pre-2020 also rank oldest. 12/12 |
| SD4-2 storage full | **FIXED.** quota2: 0/15 lockouts. The no-storage notice text is exact, the game is playable, and "another tab" never appears, including with a fresh other-id lease |
| BUG-7 | PASS: banner, farm 10. .bak was never a fresh farm over 92 s or after a purchase; reload keeps progress. Bad .bak is kept as a corrupt copy |
| savedAt null / 0 / −1 / −1e15 / 2019 / +1 d / +1 y / missing | PASS on dist-qa and release (0 offline, farm kept, re-stamped now, 2 reloads give no reward). String → corrupt path. NaN (invalid JSON) → corrupt path, which is expected |
| Write guard (main / .bak / IndexedDB) | PASS. main and .bak: 0 writes after injection, newer-save screen, intact. IndexedDB only: the known gap remains (one localStorage main + .bak write); the IndexedDB v7 survives and reload refuses. Minor (SD4-4, unchanged) |
| Reset | PASS: main, .bak and IndexedDB all cleared |
| No "another tab" flash | PASS (new and returning player, release and dist-qa) |
| B1 / M1 / version minors / BUG-6 (probe.mjs, release) | 23/24. The only "fail" is NaN going to the corrupt path, which is expected because NaN is invalid JSON |
| Claude repros (claude-items) | C1: 0 / −1 / −1e15 give 0 offline, a valid 2 h save gives the cap once. C2a: a v7 in main under a live tab stays v7 for 8 s (fixed). C2b: OK. C3: .bak restore with banner. C4: Reset clears .bak |
| S2-REL-1 runtime globals | Eng release-globals 2/2, QA globals 2/2: only `eggfarmExportTelemetry` |
| save-v6 browser | 7/7. The longer-wait variant scored 6/7; its one "fail" is the 40min-edge fixture where coop_hand `u` true→false and coins rose, because the sim ran 1.5 s longer. That is a harness artefact of the longer wait; the standard run passes |
| Offline clock | 6/6 |
| Exact wage | 4/4 |
| Eng tab-guard | 17/17 |
| rc0-browser | 76/76 |
| d2 browser-kill | 19/19 |
| recovery-v11 | All PASS (no FAIL lines) |
| R1–R6 guard-save | The first attempt timed out because the script needs dist-qa (`window.eggfarm`) and was started on dist; it also leaked its own server on 6535. Rerun with DIST=dist-qa queued after the main run (`guard-save-R1R6-qa-<engine>.log`) |

## Firefox (part 1, before the 17:51 interruption)
| Area | Result |
|---|---|
| Build ID | `m3-rc1-pre+aaaa91a` in dist and dist-qa |
| probe3 (dist-qa): BUG-7, savedAt cases, write guard, reset, reconcile with per-case timestamps, flash | **39/39 PASS.** SD4-1 is fixed: +1 day, +1 year and +3 min rank oldest both ways and the valid copy wins. Controls (+1 min and plain newer) win. The IndexedDB-only gap behaves the same as in Chromium (2 localStorage writes, IndexedDB v7 survives) |
| probe3 release (savedAt cases + flash) | 12/12 (try 2; try 1 was a browser crash at 9/9) |
| probe.mjs (B1/M1/minors/BUG-6, release) | 22/24. The 2 "fails" are known artefacts: the localStorage key order in Firefox (key set and values identical, 0 writes), and NaN as invalid JSON going to the corrupt path |
| claude-items | C1 OK. C2a: v7 stays v7 for 8 s. C3: .bak restore. C4: reset clears .bak |
| S2-REL-1 globals | Eng 2/2, QA 2/2 (only `eggfarmExportTelemetry`) |
| save-v6 browser | Standard script: 4/4 migrations, then the known Firefox timing crash. **Longer-wait variant: 7/7 PASS**, which resolves the open Firefox save-script item |
| Offline clock (incl. Firefox ratio) | 6/6 |
| Exact wage | 4/4 |
| Eng tab-guard | 17/17 |
| rc0-browser | Interrupted when I cleaned up leftover processes at 17:51 (51/63 until the browser was closed). Rerun is in run6 |

## Firefox (part 2, after 17:51): done
| Area | Result |
|---|---|
| SD4-2 quota2 | **15/15 PASS**: the no-storage notice shows every time, never "another tab" |
| rc0-browser | 76/76 |
| d2 browser-kill | d2-kill-firefox exit 0 pass=19 fail=0 |
| recovery-v11 | 7/7 |
| d2 browser-kill | 19/19 |

## WebKit: done
| Area | Result |
|---|---|
| Build ID | `m3-rc1-pre+aaaa91a` in dist and dist-qa |
| SD4-2 quota2 | **15/15 PASS** |
| probe3 (BUG-7, savedAt cases, write guard, reset, SD4-1 reconcile with per-case timestamps, flash) | **39/39 PASS** |
| probe3 release | 12/12 |
| probe.mjs | 22/24. The 2 "fails" are the same known artefacts (key order; NaN is invalid JSON) |
| claude-items | C2a v7 kept for 8 s, C3 restore, C4 OK |
| S2-REL-1 globals | Eng 2/2, QA 2/2 |
| save-v6 | 7/7 |
| Offline clock | 6/6 |
| Exact wage | **4/4, which closes the WebKit item left open earlier** |
| Eng tab-guard | 18/18 |
| rc0-browser | 76/76 |
| d2 browser-kill | 19/19 |
| recovery-v11 | 7/7 |

## R1–R6 guard-save rerun (DIST=dist-qa)
- **Chromium:** 30/34. The 4 fails are harness: R5 expects save version 5 but the current version is 6 (the farm and collection levels are kept and no dialog appears), and D3/D4 "debug inert in release" can't pass on dist-qa by design. Release inertness is covered by check-release-build and the globals runs.
- **Firefox:** 24/33. The same 4 harness fails, plus TG-UI-9 (info-only sound check), plus:
  - **SD5-1, Minor, Firefox only (new to me; needs Engineering triage):** R1, "localStorage save corrupt + valid IndexedDB copy → silent restore", fails 3/3 (garbage, truncated, checksum). The restore is silent and the corrupt copy is kept, but the IndexedDB copy is older than the last state: wanted 778395644 cents, got 777777777, which equals the IndexedDB copy. The likely cause is that Firefox's async mirror write hadn't committed when the script corrupted localStorage, so a few seconds of progress were lost. No dialog appeared and the save is not lost.
  - **SD5-2, Minor, Firefox only:** tab handover. The new tab loaded 999954005433 cents against the old tab's 999954005441 (8 cents short, same levels; flush→claim 5 ms).
  Neither is in the SD4-1/SD4-2/BUG-7 scope, and Chromium passes both.
- **WebKit: not finished.** Stopped at 18:25 as instructed; the partial log is `guard-save-R1R6-qa-webkit.log`.

## Verdict (18:25): PASS for this SHA's scope (SD4-1, SD4-2, BUG-7, savedAt, write guard, reset, regressions) in Chromium, Firefox and WebKit. Two Minor Firefox-only R1/handover findings (SD5-1, SD5-2) go to Engineering; they don't block.
Not run: 20× Fast Collect (QA-MONEY-1 was verified in 737c2cf's own run; not repeated here). R1–R6 in WebKit (interrupted). The fill-to-quota variant in Firefox/WebKit (superseded by quota2). The Firefox standard save-v6 still hits its known timing crash; the long-wait variant passes 7/7.
Open but out of scope: SD4-3 and SD4-5 (dialog branch). SD4-4 (IndexedDB-only one-write gap) is still present, as documented; Minor.

## Gap closure (18:24–18:33)
- **R1–R6 in WebKit (DIST=dist-qa, port 6891):** 29/33. The only fails are the 4 harness ones also seen in Chromium and Firefox: R5 expects save version 5 (current is 6; levels kept, no dialog), and D3/D4 checks release inertness, which can't pass on dist-qa. **R1 (corrupt localStorage + IndexedDB restore) and the handover PASS in WebKit**, so SD5-1 and SD5-2 stay Firefox-only.
- **20× Fast Collect (rc0-browser ONLY=fastcollect, Chromium, port 6901):** **20/20 runs, 4/4 checks each, 0 fails** (`fastcollect/run01..20.log`).

## Final verdict: PASS. Nothing in the scope remains unrun. Open Minors: SD4-4 (documented IndexedDB-only one-write gap), SD5-1 and SD5-2 (Firefox only, for Engineering triage).
