# M41-6 QE-LATE-e intake: PR #59 @ 1682a0c (fix/saves-mirror-on-fail), DO NOT MERGE
QA Saves & Release Verification, 2026-10-22 19:26–20:01 CEST. Every check below was run by QA from its own clean checkout. Saves' logs were not used.
Head of QA issues the verdict.

## Recommended verdict: **PASS** (Head of QA issues the verdict). DO NOT MERGE still applies.
Every gate passes on 1682a0c: gate4-explainer **17/17** with QE_LATE_e `reload1:1,total:1`, QEL-7, QEL-8, OQ-2 (offline grant once), and the Chromium QEL-12 (i, i′, iii) and QEL-13 run (58/58). The dd223f5 controls fail where they should. Firefox and WebKit were not run (non-blocking while CI is down).
**Test-file identity:** verified by **sha256 against frozen spec v0.3 §6**: `20b12dc961146ba83359a716f367cb87a2b182f567f73cccb1f6e31a40a5c420`, an exact full match. It was not verified by git blob; the blob is `d4057331c8d8a920f4bc1dd09539c542533f4cf3`. HoQA's "blob 20b12dc9" was a mislabel. On 2026-10-22 at 20:02 CEST the user ruled that the spec itself establishes the identity. History: at 19:26–20:01 CEST the intake was on HOLD because the blob check stopped gate4; it was run after the ruling.

## Provenance
| Item | Value |
|---|---|
| Candidate | 1682a0c0f25f5793d104b11ea391ee28b4c4a719 (parent 95b5a5c; author Senior Engineer, Saves & Persistence, 2026-10-19 10:32 CEST) |
| On remote | `git branch -r --contains` → origin/fix/saves-mirror-on-fail only; origin/fix/saves-mirror-on-fail == 1682a0c. PR #59 OPEN, head 1682a0c, base main, title "DO NOT MERGE: …" |
| Base | merge-base(dd223f5, 1682a0c) = dd223f510e9acabf9b1915b56e39da8b88dcac63; dd223f5 == origin/main; 3 commits: c82685c, 95b5a5c, 1682a0c |
| Worktree | qa/wt-qe-late-e-1682a0c, detached at 1682a0c, `git status --porcelain` = 0 lines (before and after all runs), own `npm ci` exit 0 |
| Control worktree | qa/wt-qe-late-e-base-dd223f5 (detached dd223f5, node_modules symlinked to the candidate's; package.json/lock identical between the two SHAs) |
| Spec | product/farm/qe-late-e-spec.md = product/farm/frozen/qe-late-e-spec.v0.3.md, sha256 **c6a37023eb22ddef3bf0ac6981245ff10d49d348373ee6a1663f4f46c43a421c** ✔; snapshot qa/m41/qe-late-e-spec.v0.3.c6a37023.md |
| gate4 file | qa/m3-scripts/gate4-explainer.qa.test.ts: identity verified by **sha256 20b12dc961146ba83359a716f367cb87a2b182f567f73cccb1f6e31a40a5c420 = spec v0.3 §6** (re-hashed right before the run). Git blob d4057331c8d8a920f4bc1dd09539c542533f4cf3; the "blob 20b12dc9" label was a mislabel (user ruling, 20:02 CEST) |
| Toolchain | node v20.19.2, npm 11.21.0, playwright-core 1.64.1, Google Chrome 155.0.8059.84 |
| Build id | BUILD_PREFIX at 1682a0c = 'm3-rc1-pre' (unchanged) → expect m3-rc1-pre+1682a0c. Static: dist/index.html ×2, dist-qa/index.html ×2, dist-html/egg-farm.html ×3, all m3-rc1-pre+1682a0c. Runtime (Chromium, dist-qa): meta = #app[data-build-id] = telemetry session_start.build = **m3-rc1-pre+1682a0c**, no +dirty |

Diff (git diff --stat dd223f5..1682a0c; 7 files, +440 −11):
```
 src/game.ts                                        |  16 +-
 src/ui/tracks-explainer.ts                         |  12 +-
 tests/fixtures/saves/m4-exp1-committed-unseen.json |  25 +++
 tests/m4-exp1-explainer.test.ts                    |   9 +-
 tests/m41-6-explainer-storage.test.ts              | 190 +++
 tests/m41-6-roundtrip-migrate.test.ts              |  45 +++
 tests/m41-6-save-mirror-canpersist.test.ts         | 154 +++
```
src/save/*, src/main.ts, loadSafe/reconcile/CSR code: untouched (spec §7 holds).

## Results
| # | Check (spec v0.3) | Result | Key values |
|---|---|---|---|
| 1 | Fetch / pushed / base / clean worktree | PASS | see Provenance |
| 2 | Spec v0.3 sha256 c6a37023 | PASS | c6a37023eb22…a421c (working copy = frozen copy) |
| 3 | gate4-explainer 17/17 (QEL-1..6, 10, 11) | **PASS** | 17 passed (17), 1 file, exit 0, run at 20:03 CEST; QE_LATE_e reload1:1, reload2:0, total:1, shownDuringQE 0 (marker below) |
| 4 | QEL-7 byte identity | PASS | see below |
| 5 | QEL-8 `rg mirrorOnFail src` | PASS | exactly 2 hit lines (see below) |
| 6 | OQ-2 only the flag save opts out; offline grant not doubled | PASS | 10/10 vitest; control on dd223f5 fails S5 as expected |
| 7a | QEL-12 (i) variant e, Chromium | PASS | card 0 during quota, IDB at death seen absent, 0 seen=true IDB puts, reload card exactly 1, total 1 |
| 7b | QEL-12 (iii) hidden tab at trigger, Chromium | PASS | canPersist=false hidden, 0 cards, no flag in mem/LS/IDB; on visible card ×1; reload total 1 |
| 7c | QEL-13 working storage, Chromium | PASS | EXP1 and pre-v7 commit-in-session: card exactly 1, never again; fresh save 0 (EXP-b) |
| 7d | Runtime build id | PASS | m3-rc1-pre+1682a0c, not dirty |
| – | tsc / full unit suite at head (extra) | PASS | tsc exit 0; vitest 89 files, **1026/1026** (includes Saves' QEL-7/QEL-9 tests m41-6-*) |
| – | Builds (extra) | PASS | npm run build && build:qa && build:html exit 0; check-release-build ok |
| 8 | Firefox, WebKit | **NOT RUN** | non-blocking while CI is down (HoQA) |

### gate4-explainer (QEL-1..6, QEL-10, QEL-11)
I copied the file into tests/ of the clean 1682a0c worktree and ran `QA_PROFILE=full QA_TAG=1682a0c npx vitest run --maxWorkers=2 --minWorkers=1 tests/gate4-explainer.qa.test.ts`, then removed it. Porcelain was 0 lines before and after. Result: `Test Files 1 passed (1)`, `Tests 17 passed (17)`. The baseline per spec §6 is 16/17 on dd223f5, where e fails.
Marker (gate4-explainer.log):
```
QE_LATE_e {"v":"e","s1":{"mig":null,"coins":123456789,"F":30,"H":30,"V":20,"bid":"b42507d60308d615","newer":null,"recovery":null,"refund":0,"pending":false},"qeHit":true,"storageFailed":true,"mem":false,"lsAtQE":null,"idbAtQE":false,"lsAfter":null,"idbAfter":false,"lsSeqAtDeath":4,"idbSeqAtDeath":5,"reloadSrc":"idb","reload1":1,"s2":{"mig":null,"coins":123456789,"F":30,"H":30,"V":20,"bid":"b42507d60308d615","newer":null,"recovery":null,"refund":0,"pending":false},"reload2":0,"s3":{"mig":null,"coins":123456789,"F":30,"H":30,"V":20,"bid":"b42507d60308d615","newer":null,"recovery":null,"refund":0,"pending":false},"lsSeqs":[4,5,6,7,8,9],"idbSeqs":[4,5,6,7,8,9],"shownDuringQE":0,"total":1}
```
The quota hit the flag write. The IDB copy at QE and at death held seen=false (`idbAtQE:false`, `idbAfter:false`). Reload came via IDB (seq 5 > LS 4) and showed the card exactly once, then never again. Coins, F/H/V and v6BackupId are identical across s1/s2/s3. Saves sequences are monotonic, with no `5,5` duplicate. This matches the spec §3.2 pre-check (`reload1:1,total:1, idbSeqs [4,5,6,7,8,9]`).

### QEL-7 (default save() byte identity)
qa/m3-scripts/qel7-save-bytes.qa.test.ts (sha256 288c36a4…) ran unchanged in both worktrees. Fixtures: EXP1 (+IDB, LS-only), M1-midgame-L18, pre-v7-F30-C30, m1-rc2-v4-12min, m2-rc1-v5-12min/40min/40min-edge, fresh, each with M4 on and off (18 cases). For each case it records the sha256 of every `eggfarm.save*` LS key and of every IDB-mirror write: at load, after a default `save()`, and after a default `save()` with LS throwing QuotaExceededError (the mirror fallback write).
- 19/19 on both SHAs. Output JSONs are byte-identical: qel7-1682a0c.json = qel7-dd223f5.json, sha256 **5d9930417d5958ef…**.
- After a successful default save, IDB main == LS eggfarm.save in every non-pending case. Examples: EXP1 M4 on, LS = IDB = 929f03f7a8cb…; fresh M4 on, 76a461787f05… = 76a461787f05…; m2-rc1-v5-40min M4 off, 463fab9955f1… = 463fab9955f1…
- With LS failing, the default save still writes exactly one mirror fallback, with the same bytes on both SHAs (e.g. EXP1 b0feb02f4f0f…).
- The 6 unmarked-v6 cases with M4 on are pending migration, so the mirror is paused (M4-24) and gets 0 writes. That matches dd223f5.

### QEL-8
```
src/game.ts:253:  save({ mirrorOnFail: mirrorFallback = true }: { mirrorOnFail?: boolean } = {}) {
src/ui/tracks-explainer.ts:28:  g.state = { ...g.state, seenTracksExplainer: true }; g.save({ mirrorOnFail: false });
```
That's 2 lines, as the spec expects. Note: game.ts:253 has the token twice (destructured name and type), so `rg -o` counts 3.

### OQ-2 (only the flag save opts out; the offline grant is credited once)
- Static: every other `save()` call in src is a default save: main.ts:135 autosave, game.ts:87 load save, which persists pendingOfflineEggs; game.ts:139/285/290 (collectOffline/dismissOffline)/310/368; tracks-explainer.ts:34 (revert); debug/panel.ts. The offline-grant path keeps the mirror. I agree with §3.1: no other one-time flag needs `mirrorOnFail:false`.
- qa/m3-scripts/oq2-offline-grant-once.qa.test.ts (sha256 773705bf…), run at 1682a0c: **10/10 PASS**. One simulated browser (LS map plus an IDB store ranked with rankCompare, booted with reconcile then new Game). Gap 2 h:
  - EXP1 (M4 on): grant G = 111,600 eggs; M1-midgame (M4 off): G = 34,200.
  - S1: collect, then reload ×2.
  - S2: tab closed with the modal open. The reload settles pending and gives no new grant.
  - S3: LS full at the grant's load save. The mirror fallback carries pending; the reload comes via IDB and gives no new grant from the stale LS savedAt.
  - S4: collect while LS is full, tab dies, reload via IDB.
  - S5 (EXP1): grant pending, then the explainer flag save fails. The mirror got 1 write (the revert, seen=false, pending intact) and 0 with seen=true. Reload via IDB: no new grant, card exactly once, then never.
  - In every step, coins are unchanged (123,456,789 / 4,567,890) and basket+pending = base + G, exactly once.
- Control: the same file on dd223f5 gives 9/10. S5 fails with "no mirror write with seen=true: expected true to be false", so the test tells the fix apart from the bug.
- Browser corroboration: in the Chromium variant-e run, the reload after closing "Welcome back!" (+111.6K eggs) shows 111.6K eggs, not 223.2K (screenshot qel12-i-variant-e-4-reload1-card.png).

### QEL-12 / QEL-13 (Chromium, qa/m3-scripts/qe-late-browser.mjs v2)
v1 is backed up at qa/scratch/qe-late-browser.mjs.orig-9a1b185b. v2 sha256 847ade7d….
Setup: dist-qa built from 1682a0c, served by vite preview on 127.0.0.1:5961 (strictPort). The control (dd223f5) used :5962. Every run was wrapped in `flock .browser-test.lock timeout 600`. My own holds were about 75 s each; the longer elapsed times were spent waiting for other agents to release the lock. Every scenario uses a fresh context. Cards are counted with a MutationObserver over the whole tab session (sessionStorage), not by sampling. For each old fixture, the 'Welcome back!' modal must appear, is screenshotted, is closed via Collect, must be closed, and must show 0 cards while open. IndexedDB failure is injected asynchronously: put() throws inside the get's onsuccess, the transaction aborts, and the production IdbMirror marks failed. That is the prod failure mode.
Run result: **58/58 checks PASS**, `QE_LATE_BROWSER chromium PASS checks=58 fails=0`.
- (i) variant e (LS quota from the first seen=true write on; the mirror refuses every write after that):
  - Modal appeared and was closed.
  - During quota: tripped, storageFailed=true, mem flag=false, 0 cards.
  - At death: LS seq 6, seen absent; IDB seq 6, seen absent; 0 IDB puts carried seen=true (2 injected aborts).
  - Reload: card exactly 1, LS seen=true. Second reload: total still 1.
- (i′) variant e1 (the mirror accepts the first write after the trip, then refuses): this is the spec §1.2 repro shape.
  - At death: IDB seq 7, seen=false (the revert). 0 seen=true puts. Reload card 1, total 1.
- (iii) hidden at the trigger: modal open, tab hidden (visibilityState override plus visibilitychange), Collect clicked while hidden.
  - canPersist=false. For 4 s: 0 cards, no flag in memory, LS or IDB (IDB seq 7, seen absent).
  - Visible again: card exactly 1, LS seen=true. Reload: total 1.
- QEL-13 EXP1 (working LS+IDB): modal closed, card exactly 1, LS and IDB seen=true, newerSave null, storageFailed false. Reload: total 1.
- QEL-13 pre-v7 F30/C30 (migration commits in session): same, card exactly 1, total 1.
- Fresh farm, no save: 0 cards, flag not set (EXP-b no-regression).
- **Control on dd223f5: 7 FAILs.** e: 1 seen=true IDB put. e1: IDB at death seen=true at seq 7, reload card 0, total 0, so the card is lost in a real browser. iii: canPersist true while hidden. The browser gate tells the fix apart from the bug.

## Anomalies / notes
1. **gate4 file identity (resolved):** the spec pins the sha256 (20b12dc9…c420, matched), but the intake asked for a git blob (d4057331…). The user ruled at 20:02 CEST that this was a mislabel and that the identity rests on sha256 against spec §6. gate4 then ran 17/17.
2. QEL-13 says "a fresh save … shows the card exactly once". A truly fresh M4 farm never shows it (EXP-b, tracks-explainer.ts "fresh M4 farms never fire it"). I read "fresh" as a pre-v7 save that migrates in session (passes) and also checked a fresh farm shows 0 (passes). PM may want to fix the wording.
3. Behaviour change beyond mirrorOnFail, as the spec intends (R6/QEL-9): `canPersist` now returns false while hidden and re-reads newerStoredVersion and mirror.newer. Covered by Saves' unit tests (in the 1026) and Chromium (iii), (ii).
4. QEL-8: 2 lines but 3 tokens (see above). This matches the spec's wording ("hits" = lines).
5. Spec §7: M41-7 (fix/saves-csr-loadsafe) also edits src/game.ts. EXP-SB-QE-LATE a–f plus this browser gate must be rerun on the integrated SHA if M41-7 lands after M41-6.
6. No stale QA servers were found on 5961/5962/4173. I didn't touch the old worktrees (wt-m41-5-b901e84, wt-pr53-4e1252d, wt-pr58-66680eb). Nothing was pushed, merged or tagged.

## Not run
- **Firefox and WebKit** qe-late-browser: NOT RUN (non-blocking while CI is down).
- CI: down. Local runs only.

## Evidence (qa/m41/qe-late-e-1682a0c/)
SHA256SUMS (all evidence files + this report + spec snapshot + QA scripts), gate4-explainer.log, diffstat-dd223f5..1682a0c.txt, provenance.txt, spec-sha256.txt, script-sha256.txt, npm-ci.log, build.log, tsc.log, unit.log, qel8-rg.txt, qel7-{1682a0c,dd223f5}.{json,log}, oq2-offline-grant.{json,log}, oq2-offline-grant-dd223f5-control.log, control-dd223f5-build.log, chromium/ (run.log, qe-late-browser-chromium.json, 23 screenshots), control-dd223f5-chromium/ (run.log, json, screenshots).
