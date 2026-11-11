# HoQA/PR116-firstbar-1106 — local exact-head bar @ 9ee76a0

Owner UIQA. Explicit NEW approved task HoQA/pr116-firstbar-1106. Write scope `qa/m3-recheck/` report `abilities-ui-9ee76a0.md` + evidence; lane/disposable worktree exceptions. TASK/HANDOFF re-read before writes; no genuine mismatch (prior 112/100/107 HANDOFF content intentionally superseded for this new 116 scope). No merge-go. Do not read PR107 CI/pacing (reserved 03:00/03:25/03:40 separate routine).

## Identity (independent tip / tree)
- **PASS** live `refs/pull/116/head` = `refs/heads/feat/v5-abilities-ui` = **`9ee76a0aa1d9e83fd28a7196844d2a00c32c1a86`** (fresh `git ls-remote` + `gh` PR read).
- **PASS** tip tree **`c914276c901a0c780689abc336fab87356595eb5`** MATCH Architect APPROVE bound tree `c914276…`. **No identity drift; no stale GO inheritance.**
- Base: `19121b75b44199beebf44fdb34a69b1120035cb0`. Ancestry vs base: ahead5 / behind0. Parent tip lineage includes `a3c6dc5` (prior CHANGES) → `9ee76a0` (O1/O2 fix). Draft=true; changed_files=13 MATCH file list.
- Evidence: `abilities-ui-9ee76a0-evidence/identity-check.json` sha256 `65e32c466f083ff82976e65ad87a5bbc4b88c87214b155e5a5e7565daccd84a1` · `ls-remote-fresh.txt` sha256 `87c4288a4e861ea44886f8e7599f5d69eb8df3734423c1c1f0a06b5577797918` · `ls-remote.txt` sha256 `c9c59561d0a5bef05c445ff3a274515998a31a05a7d0e518b21b2483b26dfb44` · `tree.txt` / `run-tree.txt` sha256 `b8bbb2fb9f7f95c0fc88617d14e4bfb1896f54c1c5b2bf1c52df25da84f9814f` · `run-head.txt` sha256 `2cf4ac41dd9e176599ab0b9feeaba73e5447c1fb985b8c7fc81ead81f096d465` · `merge-base.txt` sha256 `38b5e719ec60a6cdd11c382b3772a4a7ab2ea3db994f8885f3759dad4ea8cea3` · `ancestry.txt` sha256 `f455d3363ce5cdcee21866a63e420d20abce4acef2a3cfa71278f62372fd91e6` · `identity.txt` sha256 `15493c2a7862b1608da2fc830b46a81cf65fc0f32c6fdd64949f66308a00b2b6`

## Diff / no reverts
- **PASS** base→head = **13 files**, +694/−10, matching live PR `changed_files`. Paths: 6 public ability/boost SVGs; `src/main.ts`, `src/sim/actions.ts`, `src/ui/abilities-ui.ts`, `src/ui/app.ts`, `src/ui/styles.css`, `src/ui/workers-ui.ts`, `tests/v5-abilities-ui.test.ts`.
- **PASS** no `Revert` commits in range; tip delta vs prior CHANGES parent `a3c6dc5` is bounded **2 files** (`src/ui/app.ts` +5/−1, `tests/v5-abilities-ui.test.ts` +34) — O1/O2 only, matches Architect addendum.
- Evidence: `files.txt` sha256 `2d4fd0506b5b452f95d8ecba367ae521fbdde3ad7bcb444bd568fc80b3abb047` · `stat.txt` sha256 `fc24bcf49ef50ca09f9db3c7837c634aad8f5f5b0c534679f152ec5f2f58631f`

## Architect exact-head
- **PASS** Architect addendum verdict **APPROVE** (content) at exact tip/tree; O1 and O2 closed. Draft stays Draft; not merge/publication authority.
- Evidence: `architect-addendum.md` sha256 `fd8894caef27c7d13550dc9c89f5c63b92b9c1abccd9000e5fa737040c6a3bee` · `architect-addendum.sha256` sha256 `b44fea8f44b7e9de4c4fd9cb3226fc5dbbacad01fd135d03d9e3e6cbff7efcc7` · `architect-o1o2-excerpt.md` sha256 `192358745693afb8105e770cf604b55b136f990572f76e57d47224ec3654a537`

## Local exact-head regression (fresh; this tip only)
Disposable detached worktree `qa/m3-recheck/abilities-ui-9ee76a0-run` @ exact `9ee76a0`; existing node_modules copied; no fetch/clone/source edits. Lane `uiqa-pr116` PIDs 1722796 (main) + 1736749 (O1/O2 verbose).
- **tsc PASS** exit 0 — `tsc.log` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Full vitest PASS** `vitest run --minWorkers=1 --maxWorkers=2`: **152 files, 2213 passed, 1 skipped, 0 failed**, exit 0 — `full-vitest.log` sha256 `057b17af4190f689c1107156898106feafba57d16d84b8b59356ae3980e9787c`
- **Flag-0 goldens PASS** (parity pins): GOLDEN1 flag-off `f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544`; M4-on `a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5` — `golden-hashes.txt` sha256 `a3cfd2beedff165cebcf16168051bb4162a2b288233b26f3f623de0485076603`
- **build PASS** `npm run build` exit 0; runtime build id **`m4.1+9ee76a0`** — `build.log` sha256 `e8303519d0e08275c47e1f8a7fca6d7d7e027c517f995f5eefe285b876e8573a` · `build-id-lines.txt` sha256 `7d7d96500781396553043d005a017e9b569bb8aa84ed06cd396e9145501899d3`
- **check-release-build PASS** explicit second invocation exit 0 — `release-build.log` sha256 `e3bdd5823b5a844db46d69fa568c1e3ad6cadef43fa3dae18c056457ef6d0be9`
- Local Node `v24.22.1` (not a substitute for hosted Node20). Worktree status after empty — `status-after.txt` sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` · `exit-codes.txt` sha256 `d5dc2c7aa79d53332d5a75fe9ead01d95c8438657afaa91f80fc25c5bc0c0d5e`

## O1 / O2 sheet lifecycle (Architect claim ≠ proof)
Approved AC meanings (AC-M5A-22 / AB-14 / Architect O1/O2): dock mid-close must `sheetCloseComplete` (clear `anySheetOpen`, restore attendance); reopen Upgrades while pending must complete pending before open (no stale `transitionend` hide).
- **PASS — product behavioral vitest** (mountApp + fake matchMedia; real `sheetCloseComplete`/`openPanel` paths on tip UI — not fixture-only): `tests/v5-abilities-ui.test.ts` **15/15** exit 0 — `o1o2-vitest.log` sha256 `269a4418d69d066350398e312ecb6974f602b32624964c05cc6cdd529fd352d8`
- **PASS — named verbose O1/O2 capture**: `-t 'O1:|O2:|sheetCloseComplete hold'` → **4 passed | 11 skipped**, exit 0:
  - `O1: docking mid-close completes pending sheet and restores attendance`
  - `O2: reopen Upgrades during pending close cancels stale listener before open`
  - AB-14 fireAbility / activateAll hold until `sheetCloseComplete`
  Evidence: `o1o2-verbose.log` sha256 `7e4a40394c69b75d81a5a2f7b304ac360eea51818b410f9f66850e6d8479df29` · method `o1o2-verification-method.txt` sha256 `a024941b184a770d94923e2aa473b1c4e846492d625b50583c1bf21a1be924ae` · test bodies `o1o2-test-body.ts.txt` sha256 `247d167b9ba394ced6191e5677d6391e5ee7133c0999c598c6e73f9ae3ddf600` · `ab14-sheetclose-test-body.ts.txt` sha256 `0836da15d4cffaa4a8bad57328fc60bd263f8ac644db2e19c30611955365867e` · plan excerpt `plan-acm5a22-excerpt.txt` sha256 `d78a9caae3a98a6bc9ba37489efc02066247dcb4225873d70a9557e68ab369cf`
- **NOT RUN — Chromium/Playwright GUI O1/O2 + screenshots**: no tip-local browser harness for these edges; no Shell desktop driving. Screenshots: **none**. If HoQA requires actual GUI: parent computerUse on exact tip, one engine at a time, own port ≠4173, browserlock timeout 600, active-tab assertion + shots immediately after measurement, open verify shots. Scope: O1 dock mid-close sheet lifecycle + O2 reopen-during-pending only (no unrelated 116 golden/other features).

## Hosted gate / pacing
- **NOTRUN** (intentionally). PR #116 is **Draft**; hosted gate/pacing skipped until Ready + final tip hosted gate. No CI dispatch; no hosted poll. Recorded **NOTRUN / not PASS**, not credited. PR107 hosted slots not read.
- Evidence: `hosted-not-run.txt` sha256 `9d03e44b68c15ea84129a760fe945cb4b12264f2b2bda19a84e27fa821b95287`

## Cleanup
lane-kill `uiqa-pr116 1722796` → rc0 exact `GONE 1722796`; lane-kill `uiqa-pr116 1736749` → rc0 exact `GONE 1736749`. Owned-tag survivors: none. No custom signals / ps-derived filters / Claude process changes. `cleanup-lane-kill.txt` sha256 `1a4d2437ce28e44ec952884e3d865138cc23277880c1a4dbbf27449b42935b9f` · `cleanup-lane-kill-verbose.txt` sha256 `fbdd025aa8735ef73cf9b7ad7c130fd51a899e9ea958198be0d22b0efe74eda9` · `cleanup-survivors.json` sha256 `a114da66ac3b44bdfb9bf914badfb28bb9dbbeeebbe5659a7dd272175f9e6c7c` · `lane-pidfile.txt` (both PIDs recorded).

## Overall / GO–NO-GO input to HoQA
| Check | Verdict |
|---|---|
| Tip/tree vs Architect bound `c914276` | PASS (no drift) |
| Clean PR diff / no reverts | PASS (13 files) |
| Flag-0 golden parity | PASS |
| tsc | PASS |
| Full vitest 152/2213+1skip/0fail | PASS |
| build + check-release-build / build id `m4.1+9ee76a0` | PASS |
| O1/O2 product vitest lifecycle | PASS |
| O1/O2 Chromium GUI + screenshots | **NOT RUN** |
| Hosted Node20 / pacing / release-globals | **NOTRUN** (Draft) |
| FF/WK | **NOTRUN** (Draft; feature-PR skip expected when Ready — not PASS) |

**Local first-bar input: GO** on identity + local suites + O1/O2 vitest behavioral evidence at exact `9ee76a0` / tree `c914276`.  
**Overall / merge input: NO-GO** until Draft→Ready hosted gate SUCCESS at final tip (+ pacing per process) and HoQA ruling on whether GUI O1/O2 screenshots are required. **No merge-go from UIQA.**

Evidence manifest: `qa/m3-recheck/abilities-ui-9ee76a0-evidence/manifest.json`  
sha256 `cf5826af3a56897d6a6e292af8915f55e1eced82e020814534f081c8c81a1441`

## Addendum 2026-11-06 02:54 CET — QA-D-1106-PR116-GUI targeted prep (server READY; O1/O2 pending path FLAG-0 limited)

TASK/HANDOFF re-read; explicit NEW GUI-prep scope under firstbar-1106. No genuine mismatch. Remote tip reconfirmed via ls-remote: `9ee76a0…` / tree `c914276…` MATCH; **no drift**. #107 hosted slots not read. No fetch/clone/source fixes. **GUI not run here.**

### Server (leave up for parent computerUse)
- **URL:** `http://127.0.0.1:5216/?marketSeed=3`
- **Build:** existing `dist` only; served build-id **`m4.1+9ee76a0`**; chunk `index-B2JjHXU9.js` MATCH.
- **Lane/PID:** `uiqa-pr116` **1746941** (`LANE_RUN_TAG=uiqa-pr116:6e8aba12e8ce29cd`); `vite preview --outDir dist --port 5216 --strictPort --host 127.0.0.1`
- Evidence: `abilities-ui-9ee76a0-evidence/gui-prep-ready.txt` · `gui-prep-identity.txt` · `gui-prep-ls-remote.txt` · `gui-prep-build-id-served.txt` · `gui-prep-server-pid.txt` · `gui-prep-lane-pidfile-tail.txt` · `gui-prep-server.log` · `gui-prep-chunk-served.txt`

### Browser lock (parent; prep does not hold)
`.browser-test.lock` + `timeout 600` per ops/locks.md; one Chromium engine; lock was free at prep. Server not under flock — no deadlock from waiting.

### Access + expected O1/O2 (for parent Chromium 360×640)
- Open Upgrades: nav `[data-nav=upgrades]` → `#p-upgrades`. Workers tab: `[data-tab=workers]`. Close: `.close` / scrim / Esc / Farm nav. Switch panels / reopen / reload-while-open: exercise via nav while sheet open; reload with sheet open and re-check boot.
- **O1:** dock mid ability-close-pending → sheet hidden + attendance restored.
- **O2:** reopen Upgrades during pending close → panel stays open; late `transitionend` must not hide it.

### FLAG-0 limitation
Release balance `m4.flags.abilities=0` → ability chrome off → `upgradesClosePending` path (only set after in-sheet fire/activateAll) **unreachable** without flag-on/QA rebuild (not authorized). Parent can still screenshot open/close/reopen/switch/reload. True Architect O1/O2 pending edges = **blocked on this build** until HoQA authorizes flag-on path.

### Cleanup
Parent after GUI: `lane-kill.sh uiqa-pr116 1746941` → rc0 exact GONE/TERM only. Server left running now.

**Prep verdict: READY** for parent computerUse on URL above. **Do not claim GUI ran.** No merge-go.

## Addendum 2026-11-06 02:56 CET — GUI handoff BLOCKED (not FAIL)

TASK/HANDOFF re-read for GUIhandoffblocked finalize. Backup `abilities-ui-9ee76a0.md.bak-88e5ef03`. computerUse sand-subagent-708da0bb-6291-5299-8ea4-44d47d9fc775. No setViewport workaround. No new tests/browsers/processes. #107 hosted not read. Prior local PASS sections above unchanged / not re-run.

### computerUse outcome
- **BLOCKED:** `setViewportSize` not sanctioned → cannot set 360×640. Actual tool viewport **1920×1072**.
- Loaded `http://127.0.0.1:5216/?marketSeed=3` only to **Tap to start** visible. No gameplay flows. Build-id **not** UI-verified by computerUse. **No screenshots.**
- Browser lock **not held**. Notes: `abilities-ui-9ee76a0-evidence/NOTES.md`.

### GUI checklist — all NOTRUN (not FAIL)
| Check | Verdict |
|---|---|
| Open / close / reopen Upgrades | **NOTRUN** |
| Closing mid-animation | **NOTRUN** |
| Switch panels while open | **NOTRUN** |
| Reload while open | **NOTRUN** |
| O1 dock mid-close (pending) | **NOTRUN** (+ flag-0 unreachable) |
| O2 reopen during pending close | **NOTRUN** (+ flag-0 unreachable) |
| Chromium 360×640 screenshots | **NOTRUN** |
| Runtime build-id UI verify (computerUse) | **NOTRUN** |

### Additional blocker (content path)
Release `m4.flags.abilities=0` → Architect O1/O2 `upgradesClosePending` edges unreachable without HoQA-authorized flag-on path (unchanged from GUI prep).

### Cleanup
`lane-kill.sh uiqa-pr116 1746941` → **rc0** exact **`TERM 1746941 (group)`**. Own-tag `uiqa-pr116:6e8aba12e8ce29cd` survivors: **none** (`signals_sent_by_scan: false`). Port 5216 gone. Evidence: `gui-cleanup-lane-kill.txt` · `gui-cleanup-survivors.json` · `gui-handoff-blocked.txt`.

### Overall input to HoQA
- Prior local first-bar @ 9ee76a0 / c914276: **PASS** (separate).
- GUI / computerUse: **BLOCKED** (viewport tooling + flag-0 pending path) — **not** a product FAIL.
- Hosted Draft: still **NOTRUN**. **No merge-go.**

Current evidence manifest sha256 `c4656cf5b7a5790c57fff6c77beb479e303915583eb436aef0dc639c48fe4cca` (GUI handoff finalize).

## Addendum 2026-11-06 03:22 CET — hoqa/pr116-ovf-close review → **OVF OPEN**

Explicit NEW approved review scope (QA-D-1106-PR116-OVF). Prior HANDOFF was GUIhandoffblocked finalize @ 9ee76a0 — intentional supersession for this OVF review, not a genuine TASK/HANDOFF mismatch. **Write scope this turn: this report append only** (backup `abilities-ui-9ee76a0.md.bak-8768d792`). No evidence-dir writes, no source/remote mutations, no browser/GUI/CI poll, no #107 pacing read. Earlier **local first-bar PASS** and **GUI BLOCKED** remain separate historical records at tip `9ee76a0` / tree `c914276` — **no head inherit** of those local results onto `182face`/`a1f5c232` without fresh content proof. **No merge-go.**

### Live head binding (no fetch/clone)
- `git ls-remote` + `gh` PR #116: live head **`a1f5c232fa54113549ee70a11e9a2a7508bee682`** MATCH HoQA report.
- Product fix: **`182face7470a2889a5e907a3acf0dc5aa227c7ee`** tree **`63010a43ca5693627a600bfd7ebce25c3c414642`** (parent `fcf76237…`).
- `a1f5c232` = parent `182face` + **only** `engineering/status.md` (+1/−1). Product tree of `182face` unchanged by the status chore. `gh` shows `draft:false` / `mergeable_state:unstable` at observation — Ready status noted; **hosted final-tip gate/Chromium/pacing not observed this turn** (parent will schedule one head check later). Do not credit hosted SUCCESS here.

### Browser-test diff `fcf7623..182face` (sanctioned object reads)
`scripts/abilities-ui-browser.mjs` (+product `workers-ui.ts` / `styles.css` / status):
- **Before (`fcf7623`):** F1-1i was **`console.log` INFO only** — measured `#p-upgrades .body` scrollWidth vs clientWidth; suite still exited ALL PASS while overflow YES (`scrollWidth:417`). Proven by artifact log `/workspace/artifacts/v5-116-browser-ci-fcf7623/browser-run.log` L18.
- **After (`182face`):** INFO replaced by hard gates via shared `ok()` → increments `bad` → `process.exit(bad ? 1 : 0)`:
  - **F1-1a:** `document.scrollingElement||documentElement` **and** `documentElement` `scrollWidth <= window.innerWidth` (body `.body` scrollWidth still returned in payload for diagnostics — **not** the gate alone).
  - **F1-1b:** every visible `[data-testid^="call-"]` (w/h>0) `getBoundingClientRect()` with `left >= -0.5 && right <= innerWidth+0.5`.
- **Reachable path:** Chromium context `viewport: {360,640}`; flag-on test-only overlay `abilities=1`; `openWorkers()` → Workers tab → assert **before** fire/O1. Not dead code.
- Product delta matches NOTES: `.wk-manage` column under Manage|call row; `min-width:0` containment; no `@media` stack; ship `balance.json` abilities stays 0.

### Artifacts / images read (no invented visual PASS)
Paths opened with Read:
- `/workspace/artifacts/v5-116-overflow-fix-182face/NOTES.md`
- `/workspace/artifacts/v5-116-overflow-fix-182face/shots/flag1-workers.png` (also duplicate root `…/flag1-workers.png`) — sha256 `ecb5d18fde2c2d1cc5ca68438c0fa5eff031733cac20df69cfff050fff47b51a`, **360×640**
- `/workspace/artifacts/v5-116-overflow-fix-182face/shots/flag0-open.png`
- Pre-fix contrast: `/workspace/artifacts/v5-116-browser-ci-fcf7623/shots/flag1-workers.png` sha256 `a6c8d712…` + `browser-run.log` / `NOTES.txt`

**Visual observation (not a PASS grade):** post-fix `flag1-workers.png` shows Manage|Rush and Manage|Sweep side-by-side; energy bars appear within card width; call labels “Rush”/“Sweep” fully visible — no obvious horizontal clip of call chrome. Pre-fix NOTES documented body scrollWidth 417 and clipped call/Active text; pre/post shot digests **differ** (`a6c8d712…` → `ecb5d18f…`). Vertical crop of a third worker at sheet bottom is expected scroll, not the F1-1a page-width failure mode. **Not** substituted for machine F1-1a/b PASS.

### Flag-0 “unchanged” baseline
Compared fcf7623 CI artifact shots vs 182face OVF artifact shots (actual digests):
| shot | result |
|---|---|
| flag0-open / reopen / switch / reload / reload-reopen | **SAME** byte sha |
| flag0-closed / flag0-close-mid | **DIFF** |

→ **Cannot** claim full flag-0 visual unchanged; partial identity only. No stronger baseline proof present.

### Why **OVF OPEN** (assert/artifacts insufficient to CLOSE)
1. **Assert design at `182face` is correct and reachable** (F1-1a scrollingElement/documentElement vs innerWidth + F1-1b call bboxes via `ok()` hard-fail) — necessary but not sufficient.
2. **Missing machine execution proof bound to `182face`:** overflow artifact has NOTES prose (“ALL PASS … seScrollWidth=360; calls left=184 right=334”) and PNGs, but **no** `browser-run.log` / stdout transcript listing `PASS [chromium] F1-1a` / `F1-1b` / final `ALL PASS` at build-id `m4.1+182face` (contrast: fcf7623 artifact **does** ship `browser-run.log`). Features NOTES alone ≠ HoQA execution proof.
3. **Hosted Ready final-tip proof not observed** (and not requested this turn): need parent-scheduled exact-head gate + Chromium `abilities-ui-browser` artifact + pacing when Ready. Live head is `a1f5c232` (status chore on `182face`). Do not inherit prior 9ee76a0 local/GUI outcomes.
4. Independent note for parent (not duplicated here): an earlier **03:00** gate SUCCESS *record* may exist, but **Node20 actual LOG proof** was called missing — parent owns that retrieval; out of OVF append scope.

### Precise missing proof to CLOSE later
- `browser-run.log` (or equivalent) from `npm run abilities-ui-browser` at **`182face`** (or content-identical tree) showing **PASS F1-1a**, **PASS F1-1b**, `seScrollWidth <= 360`, call bboxes in-view, exit `ALL PASS`, build-id `m4.1+182face`.
- When Ready: one scheduled hosted head=`a1f5c232` (or successor) gate SUCCESS with Chromium abilities-ui-browser artifact + pacing per process.
- Optional: flag-0 closed/close-mid DIFF explanation or accepted residual.

### Verdict
**OVF OPEN.** Test gate code review PASS (hard-fail correct). Close blocked on missing bound run transcript + hosted final-tip evidence. Prior local PASS / GUI BLOCKED @ 9ee76a0 stay separate. **No merge-go.**

## Addendum 2026-11-06 03:52 CET — hoqa/pr116-ovf-close scheduled check → **HEAD DRIFT, OVF OPEN (no old-head GO)**
Backup of prior report: `abilities-ui-9ee76a0.md.bak-9f09aa1d` (prior sha256 9f09aa1da988d0ff…). Write scope this turn: this append only. No browser/CI/source/remote mutation.

- `git ls-remote origin refs/pull/116/head` (game/ checkout, read-only) at 03:5x CET → **`629ab76d0c529497591498bd0c716e82b405bcf6`**, NOT the expected `a1f5c232fa54113549ee70a11e9a2a7508bee682`. `gh api pulls/116`: head 629ab76d, draft=false, state open, mergeable_state unstable, updated 2026-11-06T02:47:17Z (03:47 CET).
- `gh api compare a1f5c232…629ab76d`: ahead_by 20, status ahead. Newest commit `629ab76d` "Merge rc/v5 into feat/v5-abilities-ui (#116 mergefwd onto eed62687)" at 2026-11-06T02:45:35Z (03:45 CET), i.e. a merge-forward after #107 (eed62687) and #115 merged into rc/v5. Files changed vs old head: src/config/formulas.ts, m5-rules.ts, src/econ/income.ts, src/sim/{effects,golden,offline,pause,tick,timers,workers}.ts, tests/fixtures/saves/m5-pause-committed-hired.json, tests/v5-f3-config.test.ts, tests/v5-golden-rewards.test.ts, tests/v5-pause-sim.test.ts.
- Per standing order: head changed → drift reported; **no GO is issued on the old head `a1f5c232` / `182face`**. Hosted runs gate 42149634652, pacing 42149634758, verify-smoke 42149634703 belong to the old head and were **not read or credited** for the new head. Product fix `182face` (F1-1a/b hard-fail asserts) is not proven present/unchanged at 629ab76d by this check (not content-diffed; the compare shows no change to workers-ui.ts / styles.css / scripts/abilities-ui-browser.mjs, which is a file-list observation only, not execution proof).
- Not run this check: Node20 gate log read, Chromium abilities-ui-browser artifact/browser-run.log, flag1-workers screenshot inspection at new head, pacing 3/3, flag-0 baseline. Reason: exact head moved; one-shot check does not poll.

### Verdict
**OVF OPEN (head drift).** Need hosted gate + Chromium abilities-ui-browser run (F1-1a/b PASS lines, build-id `…629ab76d`) + pacing on `629ab76d` or its successor before any close. Prior local first-bar PASS and GUI BLOCKED @ 9ee76a0 stay separate historical records. HoQA owns merge-go; **no merge-go from this lane.**

## Addendum 2026-11-06 03:56 CET — hoqa/pr116-ovf-close @ 629ab76d → **OVF OPEN** (hosted pending)

Explicit NEW scheduled hosted+artifact OVF check. TASK line re-read before write; owner UIQA; write scope **append-only** this report (backup `abilities-ui-9ee76a0.md.bak-52168488`, pre-image sha256 `52168488b02b918bb4741f1962de50d5b063315e45064a2db14ce798a5c90e80`). Supersedes 03:52 head-drift OPEN off `a1f5c232`. Disposable notes under `/tmp/uiqa-pr116-ovf-629ab76d/` only. No evidence-dir writes, no Shell Playwright/GUI/computerUse, no CI mutations, no #107, **no polling loop**. Prior local first-bar PASS + GUI BLOCKED @ `9ee76a0` stay separate historical records. **Do not credit** old a1f5c232 runs 42149634652 / 42149634758 / 42149634703 or 182face/a1f5c232 artifact sets. **No merge-go.**

### Independently verified identity
| Claim | Result |
|---|---|
| `ls-remote` `refs/pull/116/head` | **PASS** `629ab76d0c529497591498bd0c716e82b405bcf6` (= `feat/v5-abilities-ui`) — **no tip drift** |
| Tree | **PASS** `6cae6f7651027f87ee55a27a716d8f0f4c685e32` (short `6cae6f76` MATCH claim) |
| Parents | `a1f5c232fa54113549ee70a11e9a2a7508bee682` + `eed62687db4aa05167e5e7f8b14e1674715dfc4a` (`rc/v5`) |
| Clean merge-forward `merge-tree --write-tree a1f5c232 eed62687` | **PASS** exit 0, computed tree **equals** tip tree `6cae6f76…` (no conflicts) |
| Content identity vs `182face` / `a1f5c232` | **PASS** blob-identical: `src/ui/workers-ui.ts` (`c67fad3a…`), `src/ui/styles.css` (`6409473c…`), `scripts/abilities-ui-browser.mjs` (`c4856c58…`) |

Inherit of prior local bar + Architect/Art for the OVF product delta is therefore eligible **if** hosted+artifact close conditions later pass. Tip vs `a1f5c232` also brings rc merge files (pause/golden/etc.) — unrelated to abilities-ui OVF blobs above.

### Assert hard-fail still present (tip script)
At `629ab76d:scripts/abilities-ui-browser.mjs` (same blob as `182face`): **F1-1a** / **F1-1b** still go through `ok()` → `bad++` → `process.exit(bad ? 1 : 0)` (not INFO `console.log`). Script review **PASS** for gating design; **not** a substitute for a bound run transcript.

### Hosted one-shot (exact head `629ab76d…`) — PENDING
| Run | id | headSha | Observation |
|---|---|---|---|
| gate | **42152531705** | MATCH `629ab76d…` | **`in_progress`**, conclusion **null**. Job `gate` 127678907762 in_progress (slow suites running; Chromium / abilities-ui-browser / artifact upload still pending). **Node20 log NOT retrieved** (no completed job log). Chromium check-globals **NOT RUN** this observation. Artifacts **total_count 0**. |
| pacing | **42152531746** | MATCH `629ab76d…` | **`in_progress`**, conclusion **null**. Shards seller15 / optimal / casual all **in_progress**. No shard SUCCESS/FAIL; no aggregate / row904 line available. |

FF/WK release-globals: not yet concluded this run; when it skips on feature PR, record as **skipped by design, feature-PR exception, enforced on RC PR** — not PASS, not a blocker (same standing rule). Not observed as SKIPPED yet because gate job unfinished.

URLs: https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531705 · https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531746

### OVF close conditions (both required) — unmet this check
1. **Bound PASS transcript** for F1-1a + F1-1b + `ALL PASS` at build-id ~`m4.1+629ab76`: **MISSING** (abilities-ui-browser step pending; no artifact / no `browser-run.log`).
2. **NEW `flag1-workers.png` bound to this head/run**, Read-inspected, no clipped calls / overflowing energy bars: **MISSING** (no downloadable artifact). Image path/sha256: **N/A this check**.

### Verdict
**OVF OPEN.** Identity + merge-tree + abilities-ui blob inherit + hard-fail asserts in tip script are green. Hosted gate/pacing/artifacts **pending** at one-shot observation — cannot CLOSE. One check only; no wait/retry. Parent may re-dispatch after SUCCESS. No merge-go from this lane.

### Clarification (HoQA steering, same check — no new hosted poll)
Clean merge-forward + abilities-ui blob identity vs `182face`/`a1f5c232` already independently **PASS** above. **Inherit** prior `9ee76a0` local first-bar PASS (tsc / full vitest / flag0 goldens / build+check-release-build) — **not re-run** this turn (no tsc, no full vitest, no goldens, no release build). Do **not** credit `a1f5c232` hosted runs. One-shot hosted observation above remains: gate `42152531705` and pacing `42152531746` were **in_progress** with **no** artifacts; **OVF stays OPEN**. No loop.


## Addendum 2026-11-06 04:02 CET — hoqa/pr116-ovf-close follow-up @ 629ab76d → **OVF CLOSE**

One scheduled check only (no loop) of the finished hosted gate + browser artifacts. TASK line re-read before write; owner UIQA; write scope **append-only** this report. Backup **`abilities-ui-9ee76a0.md.bak-2c463416`** (pre-image sha256 `2c46341686fb5c298d5341fc0f7343db092b61e09eeed55f8795a52166eb92c9`). Disposable under `/tmp/uiqa-pr116-ovf-629ab76d/` + inspection copies under `artifacts/v5-ui/pr116-629ab76d/` (leave on disk). **Inherit** prior `9ee76a0` local first-bar PASS (no tsc / vitest / goldens / release rebuild this turn). **Do not credit** a1f5c232 runs 42149634652 / 42149634758 / 42149634703. **No merge-go.** Did **not** start #100 hosted check (04:15 CET slot).

### Independently verified identity (this check)
| Claim | Result |
|---|---|
| `ls-remote` / `gh api pulls/116` head | **PASS** `629ab76d0c529497591498bd0c716e82b405bcf6` — **no tip drift** |
| Gate `42152531705` headSha | **MATCH** `629ab76d…` |
| Pacing `42152531746` headSha | **MATCH** `629ab76d…` |

Prior addendum (03:56) already locked clean mergefwd + abilities-ui blob identity vs `182face`/`a1f5c232` + hard-fail `ok()`→`process.exit` at tip script — reconfirmed hard-fail still present (`F1-1a`/`F1-1b` via `ok()`, exit path line 121).

### Gate 42152531705 — completed SUCCESS (exact head)
| Item | Result |
|---|---|
| Run | **completed SUCCESS** · https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531705 |
| Job `gate` | **SUCCESS** · https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531705/job/127678907762 (id 127678907762) |
| Checkout | `HEAD is now at f0910fd Merge 629ab76d0c529497591498bd0c716e82b405bcf6 into eed62687…` |
| Node 20 (from completed gate log) | **PROVEN** setup-node: `node-version: 20` · `Acquiring 20.20.2` · `node: v20.20.2` |
| Chromium check-globals | **PASS** (ran): `PASS [chromium] B-4 release ?perf=1…`; release globals allowlist lines PASS |
| `release-globals` job | **skipped by design, feature-PR exception, enforced on RC PR** — not PASS, not a blocker |
| Artifact `abilities-ui-browser` | present · id **13474011455** · downloaded |

Bound transcript: gate step log saved as `artifacts/v5-ui/pr116-629ab76d/browser-run.log` (sha256 `d205242af5601497b44e7eaf3833f94084dc68292864c7a849d65ccbff895673`) + `/tmp/uiqa-pr116-ovf-629ab76d/browser-run.log`. Full run logs zip `/tmp/uiqa-pr116-ovf-629ab76d/gate-run-42152531705-logs.zip`.

### Bound PASS lines (abilities-ui-browser @ this head's CI build-id)
Build-id observed: **`m4.1+f0910fd`** (CI synthetic merge short of tip into `rc/v5`; F0-0 affirms bid matches HEAD build-id — “or similar” to `m4.1+629ab76`).

Quotes from bound log:
- `abilities-ui-browser: dist-qa m4.1+f0910fd on port 43047`
- `PASS [chromium] F0-0 QA build boots at 360x640 with shipped abilities flag 0 and HEAD build-id — {"flag":0,"bid":"m4.1+f0910fd"}`
- `PASS [chromium] F1-1a Workers @360 flag-on: no horizontal page scroll (scrollingElement/documentElement scrollWidth <= innerWidth) — {"innerWidth":360,"innerHeight":640,"seScrollWidth":360,…,"calls":[{"id":"call-market_hand","left":184,"right":334,…,"inView":true},{"id":"call-coop_hand",…},{"id":"call-hawker",…}]}`
- `PASS [chromium] F1-1b Workers @360 flag-on: every visible call button fully inside the viewport — {"calls":[…],"innerWidth":360}`
- `ALL PASS`

Hard-fail path still tip-script: `ok('F1-1a'…)` / `ok('F1-1b'…)` → `process.exit(bad ? 1 : 0)`.

### Visual: NEW `flag1-workers.png` (bound to this head/run)
| Field | Value |
|---|---|
| Path (leave on disk) | `artifacts/v5-ui/pr116-629ab76d/flag1-workers.png` (also `/tmp/uiqa-pr116-ovf-629ab76d/abilities-ui-browser/flag1-workers.png`) |
| Dims | 360×640 |
| sha256 | `ca9bca9608d76dc7351eeb2f6938bbbef5aafabc2d20fc87a6c5c6cfbdbb2f7e` |
| Diff vs prior 182face shot | different blob (`ecb5d18f…` @ 182face) — **new** for this run |

**Opened and inspected (Read):** Workers tab @360; Market Hand + Coop Hand cards on screen; yellow call/action buttons fully inside the card/viewport right edge (**not clipped**); energy bars solid teal **within** card bounds (**no overflow** past sheet/card); third worker (hawker) below fold = vertical sheet scroll only (not OVF). No horizontal page overflow visible. **Visual PASS** for OVF close criteria.

### Pacing 42152531746 — one look (does not block OVF CLOSE)
| Item | Result |
|---|---|
| Run | **`in_progress`**, conclusion **null** · https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531746 |
| Shards | seller15 / optimal / casual — all **`in_progress`** |
| Aggregate / row904 | **N/A** (not finished) |
| Record | **PENDING** separately — **does not** by itself block OVF CLOSE per TASK |

### OVF close conditions — all met
1. Node 20 proven from completed gate log — **YES** (`node: v20.20.2`)
2. F1-1a + F1-1b PASS lines bound — **YES**
3. ALL PASS at this head's build-id (`m4.1+f0910fd`) — **YES**
4. `flag1-workers.png` Read-inspected, no clipped calls / overflowing energy bars — **YES**

### Verdict
**OVF CLOSE** at exact head `629ab76d0c529497591498bd0c716e82b405bcf6`. Pacing remains **PENDING** (recorded separately; non-blocking for this CLOSE). Chromium-in-gate PASS; FF/WK release-globals **skipped by design, feature-PR exception, enforced on RC PR**. Local first-bar PASS @ `9ee76a0` inherits. Parent may visually re-check `artifacts/v5-ui/pr116-629ab76d/flag1-workers.png` before telling HoQA CLOSE. **No merge-go from this lane.**

### Not run this check
tsc; full vitest; goldens; release build; Shell Playwright / local GUI / computerUse / product servers; source/remote/CI mutations; push/merge/tag; #100 hosted; pacing wait/re-poll; credit of a1f5c232 runs.

## Addendum 2026-11-06 04:37 CET — pacing 42152531746 finished @ 629ab76d (same look as hoqa/pr100-hosted)

One look only (no extra loop / no poll), recorded because the run had finished. Backup pre-image: `abilities-ui-9ee76a0.md.bak-7c23504e` (sha256 `7c23504e23c9d8e511320283d7f567c0d3bb5ad580b8531789dd4a4d341e0e80`). OVF CLOSE from 04:02 addendum unchanged. **No merge-go.**

| Item | Result |
|---|---|
| `ls-remote` / `gh pulls/116` head | **PASS** `629ab76d0c529497591498bd0c716e82b405bcf6` — no tip drift |
| Pacing `42152531746` | **completed** · conclusion **failure** · headSha **MATCH** · https://github.com/PrincipalLewis/egg-farm/actions/runs/42152531746 |
| Shard seller15 `127679079302` | **SUCCESS** |
| Shard optimal `127679079580` | **SUCCESS** |
| Shard casual `127679079726` | **SUCCESS** |
| Aggregate `pacing-x1-stack` `127693345742` | **FAILURE** |
| Raw row-904 evidence | `45 PASS, 0 FAIL, 1 WARN, … 12 NOT-WIRED (3 blocking)`; `FAIL: blocking row 904 optimal NOT-WIRED`; `FAIL: blocking row 904 seller15 NOT-WIRED`; `FAIL: blocking row 904 casual NOT-WIRED` — **only blocking fail = row 904** |
| WARN L897 | `WARN L897 optimal N / H: worst 191 > 180 s (pre-existing L0–30 dead zone, known risk)` — **non-blocking** |
| Checkout | `HEAD is now at f0910fd Merge 629ab76d0c529497591498bd0c716e82b405bcf6 into eed62687…` |

Record: **3 shards SUCCESS / aggregate FAIL only row 904** (+ WARN L897 non-blocking). Prior PENDING pacing line from 04:02 is superseded by this finished look. Evidence: `abilities-ui-9ee76a0-evidence/obs-629ab76d-pacing-42152531746.txt` sha256 `6404f29dfb06e824012ca9b3c2a9f92e6490da470399078ccf289ab4f5f71ee8`
