# QA recheck — m3/rc1-save-durability @ 4bf4a22 (release build) — 2026-10-16 (Head of QA)
Worktree /tmp/qa-save-4bf4a22 (clean, detached 4bf4a22; 692ba3d..c472832 not tested separately). `npm run build` OK, build id `m3-rc1-pre+4bf4a22`, check-release-build OK.
QA scripts (independent of Eng's suite): `qa/m3-scripts/rc1-d2-qa.mjs`, `qa/m3-scripts/rc1-guard-save-qa.mjs`. Logs/JSON/screenshots: `qa/m3-recheck/logs-4bf4a22/`.
Follow-up rerun at 780b2d4: `save-durability-780b2d4.md`.

## 1. D2 kill (SIGKILL of the whole browser process tree, relaunch same profile) — PASS
Seeded 40-min fixture, real `button.buy`, kill after D ms. Lost = purchases missing after relaunch.
| D (ms) | rc1 Chromium | rc1 Firefox | rc1 WebKit | rc0 Chromium | rc0 Firefox | rc0 WebKit |
|---|---|---|---|---|---|---|
| 0 | 3/3 kept | 3/3 | 3/3 | 0/3 (lost) | 0/2 **whole save lost** | 0/3 |
| 100 | 3/3 | 3/3 | 3/3 | 0/2 | 0/3 whole save lost | 0/2 |
| 500 | 3/3 | 3/3 | 3/3 | 0/3 | 0/3 whole save lost | 3/3 |
| 1000 | 3/3 | 3/3 | 3/3 | 0/3 | 0/3 whole save lost | 3/3 |
| 2000 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
| 3000 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 | 3/3 |
rc1: **54/54 kept, 0 purchases lost, 0 whole-save losses.** rc0: 29 lost runs, Firefox lost the whole seeded save on every kill ≤1 s (2 rc0 runs errored on harness close, excluded).
- Background tab (other tab brought to front, kill 0/500 ms): 6/6 per engine kept (18/18). Note: headless engines kept `visibilityState=visible`, so this is a true background-*tab* kill but not a hidden-state one; hidden state is covered by the app-switch sim.
- App-switch sim (mobile emulation Pixel 7 / iPhone 13; forced `visibilityState=hidden` + `visibilitychange` + `pagehide`, kill 0/500 ms): Chromium 6/6, WebKit 6/6 kept.
- Kill at the click (same task: click then page task blocked 4 s, kill during it): every engine 3/3 lost **only that purchase**; the save rolled back to the pre-click state, no whole-save loss, no recovery dialog (rc0: same in Chromium/WebKit; Firefox rc0 lost the whole save). Expected/accepted limit.

## 2. Save robustness — PASS (all engines)
- R1 corrupt LS (garbage / truncated / checksum mismatch) + valid IDB: IDB state restored silently, no recovery dialog, corrupt copy preserved (`eggfarm.save.corrupt.<ts>`). 9/9 (3 harness FAILs were my sampling 800 ms after save; loaded coins == IDB copy exactly).
- R2 IDB newer than valid LS: newer wins. 3/3.
- R3 `indexedDB` removed / R3b `open()` throws: buy + reload persisted via localStorage, no warning. 6/6.
- R4 localStorage quota on save key: warning shown, IDB holds latest; reload (with quota still failing) loads the IDB copy and doesn't overwrite IDB with stale state. 6/6.
- R5 v4 (m1-rc2), v5 (m2-rc1 12 min, 40 min edge) load + resave as v5, no recovery; R6 synthetic v1 (float dollars → cents) migrates. 12/12. rc0 writes v5 too (same format as the v5 fixtures); I didn't test a save exported from an rc0 profile separately.

## 3. D3/D4 — PASS
`?debug=1&perf=1&ios=1` in all 3 engines: no panel, no overlay, no `frame-sampler`/`panel` chunk request, no eggfarmPerf/Onb/QaRecovery globals (3 harness FAILs = my regex matched the page URL itself). `check-release-build` rejects sampler/panel chunks + hook names.
Info: `window.eggfarm` (the whole Game object, "debug/QA handle") is still exposed in release and isn't in the check list. Info/Low for rc1, but it should be removed or added to the check before the public build.

## 4. Tab guard TG-1..6, TG-UI-1..8 — PASS (Chromium 33/34*, Firefox 27/33*, WebKit 31/33*; *all FAILs are harness artifacts, listed above/below)
- TG-1/TG-UI-1: notice in old tab ≤0.8 s after the new tab's Tap to start; old money frozen 5 s; new tab owns lease.
- Handover: flush→claim 2–11 ms (≤300 ms); new tab loaded the old tab's *unsaved* 5 purchases exactly (Firefox 8-cent diff = a wage tick between my read and the flush; levels exact).
- Copy exact (title/body/"Play here"/"Loading…"), single button, alertdialog + aria-modal/labelledby/describedby.
- TG-UI-3: focus on Play here, ring 3px solid #2B79A8 (4.77:1 vs white card), offset 3px.
- TG-UI-4: Tab/Shift+Tab/Esc/scrim taps/Back: notice stays, focus stays, money frozen, no write.
- Behind: `#app` inert + aria-hidden, saturate(.6), render loop stopped.
- TG-UI-5/7: card 440 @1280, 312 @360; button 48 px; at 320 the title wraps to 2 lines (no truncation); at 320×300 the card scrolls internally (overflow-y auto), page doesn't; reduced motion → animation none.
- TG-2/TG-UI-6: after 20 s of play in B (not 60 s), Play here in A loaded exactly B's money/levels; B then showed the notice.
- TG-3: buys in B with A inactive: save (LS + IDB) == B state. Only 8 of 20 clicks were buyable on this fixture; rerun with 20 is still open.
- TG-4: forged lease 7 s old → no notice, `tab_guard_takeover{stale}`; 2 s old → newest wins `{new_tab}`; Chromium real renderer crash + reopen after 6.5 s → no notice.
- TG-5: two tabs on a 2 h-old save → exactly 1 offline_grant in the shared log.
- TG-6: single tab: no notice, money ticks, saves.
- TG-UI-9 (mute) @4bf4a22, info only: Chromium/WebKit no sfx starts while the notice is up and sound after Play here; Firefox headless can't start audio. Needs a rerun on Eng's commit (done at 780b2d4).

## 5. AC14d re-baselined
AC14d is now: **the newest tab takes over; the older tab shows the guard notice, stops sim + saving and never writes.** Verified by TG-1 in 3 engines.

## Cross-check
Eng `scripts/tab-guard-browser.mjs` (Chromium, at 780b2d4): ALL PASS.

## Defects
None blocking. Info: shared telemetry log across tabs (as known); `window.eggfarm` exposed in release (Low); real devices = known gap, not a gate.
