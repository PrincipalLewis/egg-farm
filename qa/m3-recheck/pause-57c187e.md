# #115 Pause/Resume sim — exact-head Saves QA at 57c187e (HoQA/PR115-57c187e)

Date: 2026-11-06 00:20–00:50 CET (Europe/Belgrade, UTC+1) · Runner: Saves QA (lane saves-qa) · One full run per QA-D-1106-NOREGATE (A1 content fix). **Nothing inherited from a73804d.**
Tip: `57c187e5e2c2b031206497091bff6a89a87e286e` (parent `a73804d4…`; PR base `fix/saves-endcalls-durs` @ `98e1af5b…`) · PR https://github.com/PrincipalLewis/egg-farm/pull/115
WT: `qa/scratch/pause-57c187e/wt` (detached at the exact tip; node_modules → /workspace/wt-v5-telemetry-schema/node_modules, package-lock sha256 56569550… identical). Local Node v24.22.1 (hosted gate Node 20).
Evidence: `qa/m3-recheck/evidence/pause-57c187e/`

## Verdict: **PASS (content, local bar, hosted gate) — pacing OPEN**

Every bar item passes at exact 57c187e except item 6: pacing run 42127874257 at 57c187e was **cancelled** (all 3 shards + aggregate, 00:45:33–00:46:20 CET) when HoE pushed the merge-forward 36f4e88 (00:45 CET). It never produced a verdict, so it is **not** credited. Pacing moves to 36f4e88 (run 42131777415, in progress), see the NOREGATE note at the end. No product defect found. Severity of open item: process/hosted only (non-defect), blocking the merge go until pacing completes.

| # | Bar item | Result | Evidence |
|---|---|---|---|
| 1 | Identity + diff; no reverts; offlineAccrualFrozen gone | **PASS.** HEAD = 57c187e5… = origin/cursor/saves-pause-sim-4c0b. Diff vs PR base 98e1af5 = 9 files (+423/−10): 6 src (m5-rules, income, offline, pause, tick, workers) + v5-f3-config.test = the 7 PR files, + fixture `tests/fixtures/saves/m5-pause-committed-hired.json` + `tests/v5-pause-sim.test.ts`. Tip-only delta vs a73804d: `src/sim/offline.ts`, `tests/v5-pause-sim.test.ts`. Every removed line is an in-place edit of PR code, no reverts of base content. `git grep offlineAccrualFrozen 57c187e` and `rg` in the wt: no hits (exit 1). offline.ts no longer imports isPaused/WORKERS. | identity.txt, diff-src-vs-base.patch, diff-tip-vs-parent.patch |
| — | Inputs | **Verified.** Architect `engineering/reviews/pause-57c187e-architect-addendum.md` sha256 dd627c0c04dd305c266427976bf633dea4dc660abfa1f3a81c330707e1a87520 (A1 CLOSED, content PASS). D-HOP-2026-11-06-01 (a) at product/decisions.md L2337. Pause spec v1.3.15 sha1 4c081f6443a9ecfef4a622bf6018263e845a7bf1 (= m5-worker-pause-spec.4c081f64.md). | inputs.txt |
| 2 | Committed tracksV7+hired fixture: load, pause, resume, round-trip, export | **PASS.** v5-pause-sim `[AC-P13][§15]` 6 cases (validate→m5Load keeps both hires; load→pause→save→reload paused→resume→save→reload; telemetry exportJSON and serialize don't throw). | vitest-pause-focused.txt |
| 3 | Flag-0 parity + goldens | **PASS 7/7.** flagoff-golden.a01faea (pin f90d1678…), m4on-golden.90a9c84 (pin a54c9cf9…), m4a-flag-off, zg-flagoff-dom. Pin-file blobs identical to rc/v5. Shipping `m4.flags.pause` = 0. | vitest-flagoff-golden.txt, identity.txt |
| 4 | tsc, full vitest, build + check-release-build (local, lane-run saves-qa, flock .vitest-eng.lock, nice 10, 1 worker) | **PASS.** tsc --noEmit EXIT 0. Full vitest: 150 files, **2191 passed / 1 skipped / 0 failed**. Focused pause/offline/save set: 8 files 122/122 (v5-pause-sim 21). `npm run build` EXIT 0; check-release-build `m4.1+57c187e ok` and all checks ok. | tsc.txt, vitest-full.txt, vitest-pause-focused.txt, build.txt |
| 5 | Hosted gate 42127874273 at exact head | **PASS.** Job `gate` success at 57c187e (00:13:40–00:24:56 CET). Steps all success, including Unit tests, Slow suites, Release build, Install browser (chromium), **Release globals allowlist (chromium)**, build:html, build-id check. Standalone `release-globals` job **skipped** by design on a non-rc/* PR. Skipped ≠ pass; recorded per QA-D-1105-PR105-GO. | gh-gate-42127874273-jobs.json.txt, gh-checks-poll1-0023.json.txt |
| 6 | Pacing shards SUCCESS (aggregate FAIL only on row 904) | **OPEN at 57c187e.** Run 42127874257: shards seller15/optimal/casual and aggregate all **cancelled** (superseded by the 36f4e88 push). No verdict, nothing credited, no pacing grant. Carried to 36f4e88 (pacing 42131777415 in progress at 00:49 CET). | gh-pacing-42127874257-poll1-0031/poll2/poll3.json.txt |
| 7 | Offline parity (D-HOP-2026-11-06-01 a / AC-P13) | **PASS.** Committed test covers 120 s, under-min and over-cap with applyOffline, and the hide/show grant. QA probe added the full matrix (below), through 3 paths: `applyOffline`, the real `Game.onHidden/onShown`, and save→reload at savedAt+gap. **Mutation check:** the same probe against parent a73804d (offlineAccrualFrozen present) fails 5/16 (`allPaused direct: expected 0 to be 930/9300/111600`), so the probe can detect the defect. | pause-offline-parity.qa.test.ts (sha256 38137335…), vitest-qa-probe.txt, probe-matrix.json, vitest-qa-probe-MUTATION-parent-a73804d.txt |
| 8 | Online freeze / no double-pay | **PASS (per spec v1.3.15).** Online paused: wagesPerSec 0; no wage/worker_collect/market_hand sell events; cdS frozen (rule 5/G4); energy recovers at 0.25× (rule 3, 30 s → +0.833); the B5 lockout keeps counting down online (rule 7 L135). Hidden ≥ 60 s (60 s/600 s/2 h): recovery +0, lockout frozen (20 → 20), paused kept, coins Δ 0 (rule 11). 59.9 s hide: +1.664 % (AC-P13 +1.66 ±0.05). Resume after a paused 2 h hide: coins and energy unchanged, MH lockout = 45, the next 5 s is identical to an open twin (−62 c both). No back-pay. Note: the task's "online recovery/lockout frozen" wording is read against the spec: online recovery runs at 0.25× and the lockout counts down. They freeze only offline or hidden ≥ 60 s, as tested. | vitest-qa-probe.txt, probe-matrix.json, vitest-pause-focused.txt |
| 9 | Paused state survives save/load; legacy loads unpaused | **PASS.** Committed cases, plus the probe: paused MH with callLockoutS 20 reloads paused, energy ±0.1 and lockout ±0.5 at 10 s and 2 h reload gaps; the unpaused CH stays unpaused. The fixture (no `paused` field) loads unpaused and wages run. | vitest-pause-focused.txt, vitest-qa-probe.txt |
| 10 | m2 LOCK=45 pin | **Noted, non-blocking.** `tests/v5-pause-sim.test.ts` `expect(LOCK).toBe(45)` is still an unpinned live balance literal (Architect m2 OPEN). | — |

### Offline-parity matrix (eggs granted; shipping balance m4On = true, cap 7200 s, min 60 s)

Variants: open (both hired, unpaused) / allPaused / mixed MH-paused / mixed CH-paused / none hired. Each cell was identical across all 5 variants **and** all 3 paths (direct, hide/show, reload):

| gap | flag pause=1 | flag pause=0 |
|---|---|---|
| 59.9 s (< min) | 0 | 0 |
| 60 s | 930 | 930 |
| 600 s (under cap) | 9300 | 9300 |
| 2 h (= cap) | 111600 | 111600 |
| 3 h (over cap) | 111600 (clamped) | 111600 |

Flag 0 = flag 1 for each gap. Hide/show left coins Δ 0. pendingOfflineEggs equals the grant.

## Repro
```
cd qa/scratch/pause-57c187e && bash run-all.sh   # tsc, focused, goldens, QA probe, full vitest, build → evidence/pause-57c187e/*.txt
bash run-vitest.sh vitest-qa-probe --dir ../probe --reporter=verbose
```

## Notes
- The merge go still waits for #114 to merge first (not gated here). A clean merge-forward afterwards inherits this run (NOREGATE).
- k10-breeds-offset is a known-red, non-required monitor. Not assessed.
- No push, merge, tag or PR post. All writes are under qa/ only.

---

## Appended 00:50 CET: exact-head retarget note for 36f4e88 (QA-D-1106-NOREGATE / RETARGET). No local re-run.

Body above (pre-append) sha256 `1d4fd01f483c196a3c88694b75d117dc6d584a5698d87f4676d26474f7089e27`.

- HoE merge-forward tip **`36f4e88f335c177163cd34d26398fdbec5a56a28`** has parents 57c187e5 + `66c91844` (#114). 66c9184 has parents 98e1af5 + rc/v5 `49ee46dd` (= origin/rc/v5 now).
- **Clean merge-forward, verified:** `git merge-tree --write-tree 57c187e5 66c9184` = `2db06bca…`, exit 0, and it equals the `36f4e88^{tree}` tree. There are no conflict-resolution edits.
- **Same patch:** `git diff 98e1af5 57c187e5 | git patch-id --stable` = `0ee9872462b1…` = `git diff 66c9184 36f4e88 | git patch-id --stable`. The file lists are identical (9 files, +423/−10).
- `git grep offlineAccrualFrozen 36f4e88`: no hits (still absent).
- **Hosted at 36f4e88, checked once via cursor-github MCP at 00:49 CET:** ci run **42131777400**, job `gate` **in_progress** (started 00:45:18 CET), so **not SUCCESS yet**. Pacing **42131777415**: 3 shards in_progress. k10 42131777335 in_progress (non-required).
- Conclusion: under NOREGATE this single bar at 57c187e stands for 36f4e88 (clean merge-forward, same patch, no second heavy run). **The merge go still needs** ci 42131777400 SUCCESS at 36f4e88 (incl. the Chromium globals step) **and** pacing 42131777415 shards SUCCESS, with an aggregate FAIL allowed only on row 904 NOT-WIRED ×3. The 57c187e pacing was cancelled, so the 36f4e88 run is the only pacing evidence for this patch.

Evidence: evidence/pause-57c187e/retarget-36f4e88.txt, gh-checks-36f4e88.json.txt, gh-ci-42131777400-jobs.json.txt

---

## Appended 01:30 CET: exact-head / NOREGATE note for 9cfd8b17 (QA-D-1106-NOREGATE / RETARGET). No local re-run.

Body above (pre-append) sha256 `71cd8e18c25d6fb8a3b44b2e5d54b3c320317d7f9d62854c096f9785ab25c352`.

- HoE merge-forward tip **`9cfd8b17d07018bd443aeb783347d135e39f4db7`** has parents **36f4e88f…** + **`147e116ca79db38f270189efbb978c7013e7936b`** (#114 tip after #112←rc/v5). Subject: merge-forward for #115 after #114←rc/v5 8253da50.
- **Tree-identical to prior mergefwd tip:** `9cfd8b17^{tree}` = `36f4e88^{tree}` = `2db06bcaf99c049f5dd12fa8dc9ba7bdb5ca8e5b`. `git diff 36f4e88 9cfd8b17` = empty. `git merge-tree --write-tree 36f4e88 147e116c` = same tree, exit 0 — clean merge-forward, no conflict-resolution edits.
- Under the prior NOREGATE note, **36f4e88 stands for 57c187e**; therefore **9cfd8b17 also stands for 57c187e** (same tree as 36f4e88).
- `git grep offlineAccrualFrozen 9cfd8b17`: no hits (still absent).
- **Hosted at 9cfd8b17, checked once via cursor-github MCP at 01:30 CET (no poll):** ci run **42136506858**, job `gate` **in_progress** (Unit tests SUCCESS; Slow suites in_progress; Release build / Chromium globals pending) — **not SUCCESS yet**. Pacing **42136506812**: shards seller15 / optimal / casual all **in_progress**; aggregate not yet scheduled. k10 42136506791 in_progress (non-required).
- Conclusion: under NOREGATE the 57c187e bar still stands for 9cfd8b17 (clean merge-forward, identical tree to 36f4e88, no second heavy run). **The merge go still needs** ci 42136506858 SUCCESS at 9cfd8b17 (incl. the Chromium globals step) **and** pacing 42136506812 shards SUCCESS, with an aggregate FAIL allowed only on row 904 NOT-WIRED ×3 (name them). The 57c187e pacing was cancelled, so **this tip’s pacing 42136506812 is the evidence that matters**.

Evidence: evidence/pause-57c187e/noregate-9cfd8b17.txt, gh-hosted-9cfd8b17-oneshot.json.txt

---

## Appended 01:49 CET: HoQA/pr115-mergefwd-1106 — post-mergefwd tip c29ffdf8 on rc/v5 19121b75. **NO-GO** (hosted open). No local re-run.

Body above (pre-append) sha256 `ea3d2c041be6d0110a21688f59da2c792fb90df53747095df728cfa5443e365d`.

### 1) Live tip + clean check
- `git ls-remote origin refs/pull/115/head` → **`c29ffdf8f10cb608686b200d17b001d79caaeda8`** (exact match).
- Tip parents: **`9cfd8b17d07018bd443aeb783347d135e39f4db7`** + **`19121b75b44199beebf44fdb34a69b1120035cb0`** (rc/v5). Subject: Merge rc/v5 (#114 19121b75) into cursor/saves-pause-sim-4c0b.
- **CLEAN: yes.** `c29ffdf8^{tree}` = `9cfd8b17^{tree}` = `36f4e88^{tree}` = `2db06bcaf99c049f5dd12fa8dc9ba7bdb5ca8e5b`. `git diff 9cfd8b17 c29ffdf8` empty; `git diff 36f4e88 c29ffdf8` empty. `git merge-tree --write-tree 9cfd8b17 19121b75` = same tree (equals tip) — no conflict-resolution / own-code edits.
- `git grep offlineAccrualFrozen c29ffdf8`: no hits (still absent).
- Therefore **content / local / gate PASS at 57c187e CARRIES** under NOREGATE (no second heavy local bar).

### 2) Hosted one-shot at exact tip c29ffdf8 (cursor-github MCP, no poll) — 01:48 CET
| Workflow | Run id | Status | Conclusion |
|---|---|---|---|
| **ci** | **42139212054** (run #905) | **in_progress** | null |
| **pacing-x1-stack** | **42139212027** (run #78) | **in_progress** | null |
| k10-breeds-offset (non-required) | 42139212023 | in_progress | null (not assessed) |

- **ci 42139212054** job `gate` (127634959044): **in_progress**. Unit tests in_progress; Slow suites / Release build / Chromium / **Release globals allowlist (chromium)** / build:html / build-id still pending → **not SUCCESS**.
- Standalone `release-globals` workflow **absent** for this head (skipped on non-rc/* PR). Skipped ≠ pass; noted per QA-D-1105-PR105-GO.
- **pacing 42139212027** per-shard (all **in_progress**, conclusion null):
  - seller15 — job 127635340667 — in_progress
  - optimal — job 127635340815 — in_progress
  - casual — job 127635340347 — in_progress
  - aggregate — not yet scheduled
- Pacing bar requires shards SUCCESS (aggregate FAIL only on row 904 NOT-WIRED ×3 named). **Not met** at one-shot.

### 3) Verdict for HoE merge hold
**NO-GO** at `c29ffdf8`. Clean yes → 57c187e content/local/gate carry. Hosted ci + pacing still **in_progress** at the one-shot; neither SUCCESS. Merge go still needs ci **42139212054** SUCCESS (incl. Chromium globals step) **and** pacing **42139212027** shards SUCCESS (FAIL only on row 904 NOT-WIRED ×3). Prior cancelled 57c187e pacing and superseded tips do not credit.

Evidence: evidence/pause-57c187e/noregate-c29ffdf8.txt, gh-hosted-c29ffdf8-oneshot.json.txt, gh-ci-42139212054-jobs.json.txt, gh-pacing-42139212027-jobs.json.txt

---

## Appended 02:03 CET: HoQA/hosted-followup-0200 — one-shot at tip c29ffdf8. **OPEN / NO-GO** (pacing not settled). No local re-run.

Body above (pre-append) sha256 `50b48bf057d2e3457e33ad8c58fc671e62e17955f658d78b66e3c05f0a850144`.

### Hosted one-shot (cursor-github MCP, no poll) — 02:03 CET Europe/Belgrade

| Workflow | Run id | head_sha | Status | Conclusion |
|---|---|---|---|---|
| **ci** | **42139212054** (run #905) | c29ffdf8 | completed | **SUCCESS** |
| **pacing-x1-stack** | **42139212027** (run #78) | c29ffdf8 | **in_progress** | null |
| k10-breeds-offset (non-required) | 42139212023 | c29ffdf8 | — | not assessed |

- **ci 42139212054** verified SUCCESS @ `c29ffdf8f10cb608686b200d17b001d79caaeda8` (matches HoE note). Gate job 127634959044 success (completed 01:57:43 CET). **Release globals allowlist (chromium)** step SUCCESS (00:57:05–00:57:32Z = 01:57:05–01:57:32 CET). Standalone `release-globals` job 127639467756 skipped-by-design on non-rc/* (≠ pass, not a block).
- **pacing 42139212027** per-shard at one-shot (all still open):

| Shard | Job id | Status | Conclusion |
|---|---|---|---|
| **casual** | 127635340347 | **in_progress** | null |
| **seller15** | 127635340667 | **in_progress** | null |
| **optimal** | 127635340815 | **in_progress** | null |
| **aggregate** | — | not scheduled | — |

- Pacing bar (shards SUCCESS; aggregate FAIL only on row 904 NOT-WIRED ×3) **not met**.
- Clean mergefwd / content/local/gate carry from 57c187e still holds. **Do NOT claim GO.**

### Verdict
**OPEN / NO-GO** at `c29ffdf8`. ci SUCCESS settled; pacing still in_progress. Leave 02:30 CET routine for final GO/NO-GO.

Evidence: `evidence/pause-57c187e/gh-hosted-c29ffdf8-0200.json.txt`, `gh-ci-42139212054-jobs.json.txt`, `gh-pacing-42139212027-jobs.json.txt`


## FINAL hosted check, 02:30 CET (HoQA/hosted-followup-0230, last one-shot) — #115 tip c29ffdf8

Cursor-github MCP, single read, no poll. Tip `c29ffdf8f10cb608686b200d17b001d79caaeda8`.

| Run | Id | Status | Conclusion |
|---|---|---|---|
| ci | 42139212054 | completed | **SUCCESS** (settled 01:57:43 CET; Chromium globals step success) |
| pacing-x1-stack | 42139212027 | **in_progress** | null |

Pacing shards at 02:30 CET:

| Shard | Job id | Status | Conclusion |
|---|---|---|---|
| casual | 127635340347 | **in_progress** (step "Shard casual", started 01:47:17 CET) | null |
| optimal | 127635340815 | completed | SUCCESS (02:20:39 CET) |
| seller15 | 127635340667 | completed | SUCCESS (02:28:32 CET) |
| aggregate | — | not scheduled | — |

Pacing bar (all shards SUCCESS; aggregate FAIL only row 904 NOT-WIRED x3): **not met**. The casual shard is unfinished and the aggregate has not run. k10 42139212023 not required, not assessed.

### FINAL VERDICT #115: FAIL/OPEN — NO-GO (hosted not green)
Per the last-check rule, an unsettled run is NO-GO. ci SUCCESS, optimal and seller15 SUCCESS, but casual shard and aggregate are unsettled. Merge HOLD until the casual shard and aggregate settle and HoQA re-issues GO. For reference, #114's casual shard took about 43 min (00:24Z to 01:07Z); this one is at about 43 min at the time of this check, so it may land shortly. No further scheduled check remains; a manual re-read is the only follow-up. Head of QA issues the verdict.

Evidence: `evidence/pause-57c187e/gh-ci-42139212054-run-0230.json.txt`, `gh-pacing-42139212027-jobs-0230.json.txt`, `gh-pacing-42139212027-run-0230.json.txt`, `gh-pacing-casual-127635340347-job-0230.json.txt`

---

## Final pacing (02:33 CET) — per HoQA read / QA-D-1106-PR115-GO
Pacing `42139212027` @ `c29ffdf8`: all shards SUCCESS; aggregate FAIL only row 904 NOT-WIRED ×3. Saves QA 02:45/03:00 re-reads cancelled (HoQA already issued GO to HoE). No local re-verify by Saves QA.
