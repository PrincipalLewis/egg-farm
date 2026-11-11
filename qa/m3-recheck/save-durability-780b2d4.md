# QA rerun — m3/rc1-save-durability @ 780b2d4 (release build) — 2026-10-16 (Head of QA)
780b2d4 = 4bf4a22 + 1f34739 (save_restore telemetry), f4f1377 + 780b2d4 (Eng test changes only), 78b6066 (economy parity test). Note: **no audio/UI source changed** since 4bf4a22; TG-UI-9 behaviour is the same code (`Audio.mute()` → enabled=false + ctx.suspend()).
Worktree /tmp/qa-save-780b2d4, `npm run build` OK, id `m3-rc1-pre+780b2d4`, release check OK. Script `qa/m3-scripts/rc1-780-qa.mjs`; logs `qa/m3-recheck/logs-780b2d4/`.

| Check | Chromium | Firefox headless | Firefox headed (xvfb-run) | WebKit |
|---|---|---|---|---|
| TG-UI-9a no audio while notice up (0 new sfx starts after 2 s + input; AudioContext suspended) | PASS | PASS | PASS | PASS |
| TG-UI-9b sound back after Play here + Tap to start (ctx running, sfx start) | PASS | KNOWN GAP | KNOWN GAP | PASS |
| Focus ring 3px solid #2B79A8, 4.77:1 vs card | PASS | PASS | PASS | PASS |
| 320 px: button 48 px, title wraps, no truncation | PASS | PASS | PASS | PASS |
| save_restore once per load, only when copies differ | PASS | see D1 | see D1 | see D1 |
| D2 spot check (kill 0/100/1000 ms ×2 + app-switch 0/500 ×2) | 10/10 kept | 6/6 | – | 10/10 |

Firefox audio: even headed under Xvfb the AudioContext stays `suspended` (the box has no audio sink), but sfx `start()` calls resume after Play here (4 starts). No sound plays while the notice is up. Whether sound actually comes back in Firefox is a **known gap**; please check it on a desktop with audio.

save_restore detail (per-load deltas): Chromium: fresh 0, identical reload 0, corrupt LS → 1×`idb`, identical 0, LS newer → 1×`localStorage`. Correct.
**D1 (Low, telemetry):** in Firefox and WebKit, closing a page normally leaves the IndexedDB copy one save behind localStorage (the pagehide IDB write doesn't commit before close). So `save_restore{source:localStorage}` fires on **ordinary reloads** (on both plain reloads tested), and the event is noisy as a metric. `source:idb` (the real silent restore) fired exactly once, correctly. No save loss, because localStorage holds the newest copy.
Repro: Firefox, open game, play, close tab, reopen, then `eggfarmExportTelemetry()` shows a `save_restore {source:"localStorage"}` with no corruption. Suggest: count only `idb`, or skip the event when the IDB copy is merely older than a valid LS.

Flag: **78b6066 makes the csv-vs-sim parity test ignore `guard_heartbeat_s`/`guard_stale_s`. Remove that exclusion after the Wed Oct 21 F1 CSV merge** (QA will check).
Cross-check: Eng tab-guard-browser.mjs Chromium ALL PASS (ring 4.77, btn 4.9, body 13.21).
