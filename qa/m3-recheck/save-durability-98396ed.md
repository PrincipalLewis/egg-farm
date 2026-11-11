# QA — m3/rc1-save-durability @98396ed (replaces 73178a3) — 2026-10-16

Worktree: `/tmp/qa-save-98396ed` (detached at 98396ed, clean; nothing pushed, branch not touched). 73178a3 was run first (`/tmp/qa-save-73178a3`, logs in `logs-73178a3/`); 98396ed = 73178a3 + c4789c2 (eggfarmOrderList QA-only), 55fcde1 (read-only `snapshotJSON` without install_id), 84d11fd (globals allowlist in check-release-build), 3b3eeda (serveOwn), 98396ed (release-globals-browser).
Logs: `qa/m3-recheck/logs-98396ed/`. Probes: `/tmp/qa73/rel98.mjs` (release), `/tmp/qa73/d1b.mjs`.

**Stale servers / bundle check.** Killed only `vite preview` processes with cwd under `/tmp/qa-*` (qa-s2money incl. :4927, qa-s2money-16d, qa-s2money-10536b4, qa-s27-bd0dc66, my own qa-save-73178a3). Did not touch servers for /workspace/game-rc1-save :5108, game-rc1-ui :4322, /tmp/s3b, /tmp/s16d. Every run uses its own port (56xx/57xx), refuses to start if the port already answers, and checks that the served `index-*.js` matches the worktree's `dist` or `dist-qa` before it tests. That guard is now in rc1-d2-qa / rc1-guard-save-qa / rc1-780-qa (s2-lib already had one), and Eng's scripts use serveOwn. Release bundle `index-zqqnVDoP.js`, QA bundle `index-DMNkAKgy.js`; every served bundle matched.

| # | Check | Chromium | Firefox | WebKit |
|---|---|---|---|---|
| 1 | D1: play, close, reopen ×3 on release: no save_restore | PASS (0) | PASS (0) | PASS (0) |
| 1b | save_restore{source:'idb'} fires once when IDB wins (LS save removed), and not on the next normal reopen | PASS | PASS | PASS |
| 2 | Release globals vs blank same-origin page: only `eggfarmExportTelemetry` | PASS | PASS | PASS |
| 2a | `typeof window.eggfarm` / `'eggfarm' in window` / descriptor | undefined / false / undefined | undefined / false / undefined | same |
| 2b | eggfarm, eggfarmUi, eggfarmOrderList, eggfarmPerf, eggfarmOnb, eggfarmQaRecovery absent | PASS | PASS | PASS |
| 2c | Eng `release-globals-browser.mjs` | PASS | PASS | PASS |
| 2d | `eggfarmExportTelemetry()` returns a fresh string {exportedAt, events[]}, no install_id (key or value), no UA/device fields; localStorage byte-identical before/after (×2 calls, open tap window) | PASS | PASS | PASS |
| 2e | Settings > Export log includes install_id (file `eggfarm-log-<id8>-date.json`, id in body) | PASS | PASS | PASS (+ iOS clipboard/share path) |
| 3 | ?debug=1, ?perf=1, ?debug=1&perf=1&ios=1 inert on release (no panel/overlay/chunk, only index js loaded) | PASS | PASS | PASS |
| 4 | TG-2 / TG-3 full (QA harness + Eng tab-guard FREEZE_S=30, 17/17) on dist-qa | PASS | PASS | PASS |
| 4 | D2 kill: Eng suite 19/19; QA matrix delay/hidden/appswitch all OK; sametask 1-level loss ×3 | PASS* | PASS* | PASS* |
| 5 | Unit tests | 365/365 (364 + new export-global.test.ts) | | |
| 5 | Save migrations (fixtures): v4→v5 and v5 OK; corrupt-* throw or get rejected by loadSafe (save-hardening 28/28) | PASS | | |

Firefox `'eggfarm' in window`: false on release in my runs at both 73178a3 and 98396ed. The `true` Eng saw came from the stale :4927 qa-s2money server serving an old build (fixed by 3b3eeda). The source has no `var eggfarm` and never assigns undefined. The assignment is `if (IOS_FLAG_ENABLED)`-guarded and dead-code-eliminated, and the release bundle has no `eggfarm` own-property writes.

Release bundle grep: no `.eggfarm=`, eggfarmOrderList, eggfarmPerf, eggfarmOnb, eggfarmQaRecovery, perf-ov, dbgInfo, or get("debug")/get("perf")/get("ios"). No frame-sampler/panel chunks. The only window write is `eggfarmExportTelemetry`.

Release check, negative tests (scratch copies only):
- Source re-add of `window.eggfarm` (73178a3) or `window.eggfarmOrderList` (98396ed) → exit 1.
- Appending `window.eggfarm=`, `globalThis.eggfarm=`, `self.foo=`, `window.eggfarmUi=` or `window.eggfarmOrderList=` to the bundle → exit 1.
- **Gaps (static check only):** `window["eggfarm"]=`, `Object.defineProperty(window,"eggfarm",…)`, `Object.assign(window,{…})` and single-quoted `get('debug')` pass the check. The runtime release-globals-browser test catches the first three. Low, not blocking.

## Failure classification (all match the 4bf4a22/780b2d4 reports, no new defects)
- **QA guard D3/D4 FAIL ×3**: expected. The script now runs on dist-qa, where the debug panel and hooks exist by design. D3/D4 on release passes (row 3 and Eng's d2 suite).
- **Firefox Handover FAIL**: harness timing. B loaded …312 vs …320 cents, an 8-cent wage tick between my read and the flush. Levels are exact (same as 4bf4a22).
- **R1 FAIL (FF truncated/checksum, WebKit garbage/truncated)**: harness timing. Loaded coins equal the IDB copy exactly (777777777), with no recovery dialog and the corrupt copy kept. My `want` sample was taken after the save (4bf4a22: "sampling 800 ms after save").
- **Firefox TG-UI-9 / 9b**: the known Firefox audio gap. The box has no audio sink, so the AudioContext stays suspended. sfx start() calls resume.
- **D2 sametask LOSS (1 level, ×3 per engine)**: the kill lands at the same instant as the click. Never a whole-session loss and no recovery dialog, same as 4bf4a22.

## Script changes (qa/m3-scripts)
- rc1-d2-qa, rc1-guard-save-qa, rc1-780-qa: take `DIST` (default dist; use `DIST=dist-qa`), refuse a busy port, and check the served bundle.
- qa-pt1-browser.mjs takes `<worktree>`, DIST, PORT and OUT; uses the worktree's playwright; checks the port and bundle; and waits for install_id. session_start install_id comes from `window.eggfarm.telemetry.exportJSON()` on the QA build or from `localStorage['eggfarm.telemetry']` on release. install_id comes from `localStorage['eggfarm.install_id']`. 8/8 pass, release and QA, chromium/firefox/webkit/ios-webkit. Backup of the old script: /tmp/qa73/qa-pt1-browser.mjs.bak.
- eggfarmOrderList users: no QA script uses it any more (grep qa/, scripts/, tests/). Any future §7.17 check must run on dist-qa.

## Defects
None new. Low (process): the static release check misses bracket, defineProperty and Object.assign global writes. It is covered at runtime by release-globals-browser; suggest wiring that into CI.

## Verdict
**98396ed is OK for Tuesday's merge** from QA. D1 fixed, release has exactly one global and it is read-only and redacted, debug/perf inert, D2/tab-guard full suites green, units 365/365.
