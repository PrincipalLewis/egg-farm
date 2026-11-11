# SD5-1 recheck — 5d636d8 (fix/saves-sd5-1) vs 5dd0a50
Status: **CHROMIUM-ONLY, SUPERSEDED**. SD5-1 is ON HOLD (CCR M1 rework, new SHA due Sat 2026-10-17 11:00 CEST). Queue killed 01:43 CEST; no FF/WebKit runs. No HOLD trigger on Chromium (R1 PRIMARY 3/3 PASS). Written 2026-10-17 01:32 CEST.
Evidence: qa/m3-recheck/save-5d636d8/ (logs-chromium/, out/, shots/, queue*.log, commit-diff.txt, guard-diff-3da5099e.txt)

## 1. Diff 5d636d8 vs 5dd0a50
- 1 file, +155/-0: `A qa/m3-scripts/rc1-guard-save-qa.mjs` (commit msg: "Head of QA version — R1 PRIMARY = newest persisted copy by savedAt, zero tolerance; SECONDARY = live state minus one 100 ms tick").
- **No product/src change.** The branch adds only a QA guard script. Whatever SD5-1 behaviour is observed is the 5dd0a50 game code. Severity: **Major (process)**: if SD5-1 needs a code fix, it isn't in this SHA. Engineering needs to confirm.
- The guard run is the shared copy, sha 3da5099e179a (verified, identical to qa/m3-scripts/rc1-guard-save-qa.mjs). The branch copy differs; see guard-diff-3da5099e.txt.

## 2. Runtime build-id
- Chromium: PASS. dist and dist-qa both report `m3-rc1-pre+5d636d8` (ports 4500/4501). step.sh aborts any engine without this.
- Firefox/WebKit: NOT RUN yet (queued).

## 3. Chromium (lock held 00:18–00:40 and 01:28–01:31, ports 45xx)
| Check | Result | Sev | Note / repro |
|---|---|---|---|
| R1 PRIMARY (garbage/truncated/checksum LS + valid IDB) | **PASS 3/3** | n/a | silent restore = persisted copy, 0 tolerance, corrupt copy kept |
| R1 SECONDARY ×3 | PASS 3/3 | n/a | shortVsLive 0 |
| Guard overall (16-guard-save, 3da5099e) | 36 PASS / 2 FAIL | | |
| Handover SECONDARY (live, new tab ≥ old tab −1 tick) | FAIL | Minor (SECONDARY) | diffVsLive 8 cents; repro: `DIST=dist-qa ENGINE=chromium PORT=4517 node save-5d636d8/guard-3da5099e.mjs <wt>` |
| D3/D4 ?debug=1&perf=1 inert | FAIL | Triage (likely expected on dist-qa: QA hooks present by design) | guard run with DIST=dist-qa; needs a re-run on dist |
| quota2: storage refuses writes → no-storage notice | FAIL 15/15 | Major | warn=null, no notice shown; logs-chromium/02-quota2.log |
| probe BUG-6 savedAt NaN | FAIL 1/24 | Major | rec:true, corrupt:2 on first load; 05-probe.log |
| save v5→v6 40-min fixture, longwait | FAIL 1/7 | Minor | wageFracCents {}; 09b log |
| recovery-v11 a11y alertdialog (360/960) | FAIL 2/7 | Minor | step exit=1; 15-recovery-v11.log |
| probe3, probe3-rel, globals ×2, save-v6, offline-clock, exact-wage, tab-guard, rc0 (198), d2-kill | PASS | n/a | |
Not baselined against 5dd0a50 here, but with no src diff these must equal the 5dd0a50 results.

## 4. Judgement so far
- No R1 PRIMARY failure on Chromium, so no HOLD trigger yet.
- WebKit R1 SECONDARY = known FAIL (SD5-3, Major, fix before S-4). It will be listed as known, not new.

## Not run (pending)
- Firefox: NOT RUN (all steps). queue3.sh PID 1291897 + flock 1390109 killed 01:43, never got the lock, no servers started
- WebKit: NOT RUN (all steps). WebKit R1 SECONDARY would be listed as known SD5-3
- D3/D4 re-run on dist (release) build
- Side-by-side 5dd0a50 baseline

## Bugs filed
- bugs/SD6-1.md (Major) no-storage notice
- bugs/SD6-2.md (Major) BUG-6 savedAt NaN
- bugs/SD6-3.md (Minor) 40-min migration wageFracCents
- bugs/V4-2-dialog-a11y.md (Minor) 2 failing checks (one check, at 360 and 960)
