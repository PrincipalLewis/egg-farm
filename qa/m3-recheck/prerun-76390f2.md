# Legacy UI pre-run, P2_HEAD 76390f2 (m4.1+76390f2), PROVISIONAL, NOT an RC gate

Author: UI QA (QA Engineer, UI/Layout & Gameplay Verification). Written 2026-10-30 ~10:45 CET from a read-only look at the finished run. Verdict is Head of QA's; this report gives none.

- SHA: 76390f2834b98e981ef52a3e165436acd9170654, runtime build-id `m4.1+76390f2` (bid ok true in every p1 load; mrc1/rc0 logs print the same id).
- Run: run-rc MODE=prerun, lane uiqa-run-76390f2, main PID 831383 (start 717437), 09:19:51 to 10:36:32 CET. Main has exited; manifest step done (MERGED.json 10:36:32, all three engine markers DONE).
- Evidence: `/workspace/egg-farm-studio/artifacts/v5-rc-ui/prerun-p2/` (SHA256SUMS sha256 7d68dff5…6e8630, 2226 lines, matches MERGED.json main_manifest).
- Status: PROVISIONAL per QA-D-1030-PRERUN-CIACK (CI partial: unit green in 40964655139, slow/release cancelled; verify-smoke 40964655585 green; local gates 17/17). It stands for the RC only through carry-over.py and is never a verdict on its own. NOT an RC gate.
- Harness: no HALT, no STOP-LIST-for-HoO.txt. lane-kill.log: 125 entries, all rc=0; 10 planned `TERM <pgid> (group)` each followed by `GONE`, every other entry a plain `GONE` post-exit check. No anomalies. Every run/*/ step dir has a pid file.
- Load: lane B paused 4 times at 1-min load >= 12 (10:22-10:33) and resumed each time; final 1-min load 10.69.

## Known limitation (HoQ ruling QA-D-1030-HARNESS-RC-2)
The frozen harness/lib/lane-step.sh can record -1 as a step's exit code after a TERM-interrupted wait; a -1 means "halted, status lost" and its real code must not be guessed. In prerun-p2 no step recorded -1 (every run/*/exit is 0 except rc0-chromium = 1).

## SUMS sweep finding (for HoQ, SUMS not edited) — ruled, see 'SUMS carry-over' below
`ac-r15-r17/` (8 files) and `NOT-PRERUN.txt` WERE swept into prerun-p2/SHA256SUMS (lines 1, 4-11), although NOT-PRERUN.txt says they must be excluded from the pre-run SHA256SUMS / PRERUN.json evidence set (QA-D-1030-PRERUN-CIACK). HoQ to rule whether carry-over.py must drop these 9 lines.

## Results per suite (rule QA-D-1029-V5UCAP2: p1, tap, sweep, mrc1, axe62, rc0-mrc1 full in all engines; p64, csr, p62 Cr full + FF/WK 375)

| Suite | Chromium | Firefox | WebKit |
|---|---|---|---|
| p1 (360/375/390/430/1280) | FAIL 5 per width (140-144 pass; 430 80 pass) | FAIL 5 per width | FAIL 5 per width |
| tap (360/375/390) | PASS errs=0 | PASS | PASS |
| sweep | PASS (summary: 0 overlaps, 0 dismiss-only, 0 nothing, every engine x width) | PASS | PASS |
| mrc1 | PASS (0 overlap frames) | PASS | PASS |
| axe62 | PASS (axe 4.14.0, fails 0, negative control flagged 360/375/390) | see NOT-RUN | see NOT-RUN |
| rc0 full (Cr) / rc0-mrc1 (FF/WK) | FAIL 390/392 | PASS 28/28 | PASS 28/28 |
| check-globals | PASS 3/3 | n/a | n/a |
| p64 (Cr 360/375/390, FF/WK 375) | PASS | FAIL 10 | PASS |
| csr (Cr 360/390, FF/WK 375) | PASS 132/132 | PASS 132/132 | FAIL 1 of 132 |
| p62 (Cr 360/375/390, FF/WK 375) | PASS | PASS | PASS |

## Findings (severity provisional, all need HoQ triage; none checked against spec yet)
1. **p1, all engines, all widths, 5 identical FAILs.** Repro: `p1/logs/p1-<engine>-<w>.log`.
   - `asleep: mh-asleep` and `mh-unpaid`: HUD shows `▼ $0.00/s`, red, aria ends ", sales stopped"; the check wants ⚠. 
   - `ss15` (SS-15/P-1): same, ▼ instead of ⚠ in 6/6 samples.
   - `hoe`: unpaid Market Hand at energy 70: caption is "Resumes at $2.50", check wants "Rested, refill below 50%" (check itself notes v1.0.8 AC-R10 targets next patch).
   - `ss28` (SS-28/P-4): ETA stays "Affordable in —"; the check logs drift KI-SS1/KI-RV5.
   Hunch, to verify: legacy expectations vs current M4 copy (▼ glyph, caption), i.e. possibly known/expected drift rather than regressions. Severity Minor pending triage. **Triaged 11:0x CET: all 5 = (i) stale test expectation, see Triage below.**
2. **p64 Firefox 375, 10 FAILs (5 cases x 2 checks), QA4-1 sell button label clipped.** Cases 999.9K#900, Dc-999.9#900, Qa#901, huge-max#901, sci-1.00e36#901: scrollWidth exceeds clientWidth by 1-2 px (e.g. "Sell 876.4K+$876.4K" sw 86 vs cw 84; "Sell 8.00e37+$8.00e37" 94 vs 92), text-overflow clip. Chromium and WebKit pass. Repro: `p64/logs/p64-firefox-375.log`, shots in `p64/`. Severity Minor (Firefox-only 1-2 px clip), layout FAIL.
3. **csr WebKit 375, 1 FAIL:** `exp-sheet-farm-refund: keyboard focus visible on Got it []` (focus= empty, while exp-sheet-collection-plain/refund get focus on BUTTON.btn.tracks-exp-ok). Repro: `csr/logs/csr-webkit-375.log`. Severity Major candidate (a11y focus), pending triage.
4. **rc0 Chromium, 2 FAILs** (`rc0-mrc1/logs/rc0-chromium.log`):
   - L29 `pt1 threw — ENOENT /tmp/axe/node_modules/axe-core/axe.min.js`: environment, the box's /tmp/axe copy is missing (seen before when /tmp was wiped). Not a product finding; the pt1 axe checks after the throw did not run (see NOT-RUN).
   - L209 `AC14b cantsave 360: Export save exports the CURRENT farm (basket 33, not boot 15) — null`: the export downloaded (`eggfarm-save-20261030-0957.json`, "Saved a copy.") but the content check returned null. Could be the probe failing to read the file or a real stale export; needs a rerun before any severity. Severity unassigned.

## NOT-RUN
- rc0 Chromium pt1 checks after the axe ENOENT throw (needs /tmp/axe restored and a Chromium rc0 rerun).
- rc0 full suite in Firefox and WebKit (only the rc0-mrc1 subset is in scope under QA-D-1029-V5UCAP2).
- axe62 ran once on lane B (Chromium); I did not confirm Firefox/WebKit axe62 output in axe62/, although legacy-overlap lists axe62 as full in all engines. HoQ to confirm whether that matches the ruled matrix.
- p64/csr/p62 at FF/WK widths other than 375 (reduced by rule).
- Desktop docked sizes 1024x474, 1280x720, 1366x768: not part of this pre-run.
- No reruns or triage done; screenshots not yet opened against manifests.

## Triage (HoQ ruling QA-D-1030-PRERUN-TRIAGE, 10:41 CET; UI QA, 2026-10-30 ~11:05 CET)
Bug/proposal files: `qa/m3-recheck/prerun-76390f2-bugs/`.
1. **p1 x5: all (i) stale test expectations; no code bug, no source conflict.** Trace with file:line citations: `prerun-76390f2-bugs/p1-trace.md`; proposed test change (NOT applied, needs HoQ sign): `prerun-76390f2-bugs/p1-test-fix-proposal.md`.
   - asleep mh-asleep / mh-unpaid / ss15 / ss28 (HUD glyph): the checks want a painted `⚠` at the start of `#rate` text. HoAUX m6 option A (SIGNED 2026-10-25 02:26, art-ux/decisions.md:374-375; AC UI-M6-1 art-ux/m4.1-ui-minors.md:413) makes ⚠ a model marker shown as an inline WARN_SVG (`.warn`), with ▼ in an aria-hidden `.tri`; m6 is in v5 scope (m4.1-p2-scope.md:11, D-HOE-20261029-03). Build = `▼ $0.00/s` + SVG icon, red, ", sales stopped" (src/ui/app.ts:73, :546-547; s2-economy-ui.ts:27/30/35). ss28's ETA part is informational only (SS-28 sales-stopped-spec.md:317, KI-SS1/KI-RV5); its FAIL is only the glyph.
   - hoe: the check wants "Rested, refill below 50%" for an Unpaid MH at 70%. rc1-asleep v1.0.12 AC-R10 (product/workers/rc1-asleep-state-spec.md:103; P2b in v5 scope, engineering/decisions.md:216) requires exactly "Resumes at $2.50", not "Rested". Build matches (src/ui/workers-ui.ts:45, :83, :133).
   - harness-rc/p1/p1.mjs is byte-identical, so these 5 FAILs recur at the RC unless the signed fix is folded into the harness-rc re-freeze.
2. **p64 Firefox 375 Sell-label clip: Minor, non-blocking** (fold into #83 if cheap): `prerun-76390f2-bugs/bug-p64-ff375-sell-label-clip.md`.
3. **csr WebKit 375 Got it focus (exp-sheet-farm-refund): Major, fix requested for v5, re-verify on the RC SHA**: `prerun-76390f2-bugs/bug-csr-wk375-gotit-focus.md`. New detail: focus never reached Got it and the focus screenshot shows the card hidden (likely `data-place=none` after the Tab-scroll; hypothesis). Also flagged for HoQ: all 6 Firefox explainer focus "passes" have `:focus-visible` false and outline none; they pass only because csr-spot.mjs:47 counts the resting drop shadow as a ring, so FF focus visibility is UNVERIFIED.
4. **rc0 Chromium**: pt1 ENOENT = environment, NOT-RUN; AC14b cantsave null = rerun before severity. Rerun plan (not run; after the harness-rc re-freeze/self-test): `prerun-76390f2-bugs/rc0-rerun-plan.md`.
c. **axe62 Chromium-only accepted**: axe rules are DOM-based (ruling (c)). harness-rc plan rows already carry the text (harness-rc/plan/plan.md:134 and :183, case-index.md:228); frozen harness/ plan rows unchanged (plan.md:133, :182).

## SUMS carry-over (HoQ ruling QA-D-1030-PRERUN-TRIAGE (a), 10:41; run-rc.log re-record per HoQ ruling 10:49)
- The original `prerun-p2/SHA256SUMS` is NOT edited: sha256 7d68dff5c0ab2dfb6658fbec9b1c181b6f6834de95dd91cd150901bd836e8630, 2226 lines (= MERGED.json main_manifest).
- New file `prerun-p2/SHA256SUMS.carryover`: sha256 **373204afa7e86156a2d892926b676e27ab247e147ca95c3e3e71991c9f6bf164**, 2217 lines. It is the original minus exactly the 9 swept lines (`./NOT-PRERUN.txt` and the 8 `./ac-r15-r17/*` files, original lines 1 and 4-11; NOT-PRERUN.txt says they're outside the pre-run evidence, QA-D-1030-PRERUN-CIACK), with one more change: the `./run-rc.log` line is re-recorded at its current hash (below). `diff`: 10 lines removed, 1 added (the run-rc.log line).
- **Carry-over (carry-over.py at the RC) uses `SHA256SUMS.carryover`, not `SHA256SUMS`.**
- `sha256sum -c SHA256SUMS.carryover` from prerun-p2/: **2217/2217 OK, exit 0.**
- run-rc.log (12 ms append): the frozen harness/run-rc.sh:410 writes SHA256SUMS (mtime 10:36:32.270 CET) and THEN echoes "prerun results: … (2226 files)", which tee appends to run-rc.log (mtime 10:36:32.282, 12 ms later). So `sha256sum -c SHA256SUMS` on the original fails on ./run-rc.log only. Read-only check before re-recording: sha256 of run-rc.log minus its last line (`head -n -1`, first 1024 bytes) = ccf9f44a8e0786bc44e32a78467220a48084f4324274630fbf403fe4361d1227 = the original SUMS entry; the only difference is the appended last line `prerun results: /workspace/egg-farm-studio/artifacts/v5-rc-ui/prerun-p2/ (2226 files)`; current run-rc.log sha256 2a4bd077a9000c5ed197507b87f980ac05608fe3f106a90fa03040b686ce2f37 (1110 bytes), re-recorded in .carryover per HoQ 10:49. run-rc.log itself is not edited.
- This is the harness/ manifest-ordering issue that Architect B4 fixed in harness-rc for MODE=r17base (harness-rc/run-rc.sh:302-304: SUMS exclude the live run-rc.log, then -c). Open for the re-freeze: harness-rc's other manifest paths still have the old order: prerun :474 (SUMS, then the "prerun results" echo), m5dry :477 (SUMS, then `tee -a summary.txt`), and the RC manifest :497/:499 (per-dir SUMS and SHA256SUMS.all include run-rc.log, then the "results:" echo is appended). The RC's SHA256SUMS.all would fail -c the same way.

## Evidence manifest (QA-D-1030-HARNESS-RC-6, HoQ 10:53 CET)
The evidence manifest for this pre-run is `artifacts/v5-rc-ui/prerun-p2/SHA256SUMS.carryover` (sha256 373204afa7e86156a2d892926b676e27ab247e147ca95c3e3e71991c9f6bf164, 2217 entries, `sha256sum -c` clean), accepted by HoQ. The original `SHA256SUMS` (7d68dff5…6e8630) is kept unedited; it fails `-c` only on `run-rc.log`, whose recorded hash equals the file minus its final 'prerun results' line (12 ms append).
