# QE-LATE-e: set the explainer seen-flag only after a confirmed write (v0.3, FROZEN)
Owner: PM, Farm Upgrades. Queue P41-4 (M4.1 scope item 2). Engineering: M41-6, Saves 3ba38cf3, cap 16:00 Oct 19 2026.
Status: **v0.3 FROZEN, 2026-10-19 (CEST).** HoP approved (D-HOP-39). HoQA said GO on freeze, with its edits 1–5 applied. A read-only copy is in product/farm/frozen/. Any change needs a new sha and a HoQA re-check. No economy change. m4a-spec and the frozen CSR spec are not changed by this document.

Baseline code: main **dd223f510e9acabf9b1915b56e39da8b88dcac63** (tag m4b-dd223f5; same game.ts/tracks-explainer.ts as QA's 246de09 run). All "current behaviour" line refs below are on dd223f5 unless marked otherwise.
Requirement source: m4a-spec §11 M4A-33 ("Persist `seenTracksExplainer = true` as soon as it is shown", m4a-spec.md:303) and v1.14 note ("the card shows only when the save is writable … so `seenTracksExplainer` always persists", m4a-spec.md:25). This spec narrows *how* "persisted" is decided under storage failure; it does not change when the card is shown.

## 1. Problem
The one-time tracks explainer can be **lost for good** when localStorage (LS) and the IndexedDB (IDB) mirror fail within a moment of each other. Severity Minor (qa/decisions.md:106: "double LS+IDB failure, missed one-time card, no data loss; fix: set the flag after a confirmed write"). Parked as a next-release item at engineering/triage/parked-pre-m4.1-20261019.md:12; scheduled as M41-6 (engineering/m4.1-backlog.md:12).

### 1.1 Current behaviour (dd223f5)
- src/ui/tracks-explainer.ts:27 sets `seenTracksExplainer: true` in memory and calls `g.save()` **before** knowing whether the write lands.
- src/game.ts:250–253: `save()` tries LS; if LS throws (QuotaExceededError), the catch path still writes the same state, **including seen=true**, to the IDB mirror (game.ts:253, "the IndexedDB copy still gets this save"), at a saveSeq derived from the LS main (`m4SaveSeq(st, b, q)`), then sets the sticky `storageFailed` and fires `save_failed` once (game.ts:254).
- src/ui/tracks-explainer.ts:29: if `storageBlocked()` (wired in main.ts:117 as `lease.storageBlocked || g.storageFailed`) is now true, the explainer reverts the flag to false in memory and calls `g.save()` again, relying on that save's catch path to overwrite the mirror with seen=false. No card is shown.
- If that second (revert) mirror write also fails and the tab then dies, IDB keeps the seen=true copy at a higher seq than LS. On reload `reconcile()` (src/save/idb-mirror.ts) prefers IDB, so `shouldShowTracksExplainer` (tracks-explainer.ts:18) is false forever: **the card is never shown**.
- The production mirror `write()` is asynchronous and never throws: it returns a Promise that resolves on `oncomplete`/`onerror`/`onabort` and records failure in `this.failed` (src/save/idb-mirror.ts:79–85). Game does not await it (game.ts:250, 253). So today nothing in Game "confirms" an IDB write; the only synchronous confirmation is a returning `kv.setItem` in LS.
- `canPersist` (game.ts:129) does not check `this.hidden` or re-run the newer-save guard; see parked item "canPersist hardening" (engineering/triage/parked-pre-m4.1-20261019.md:1–5). It is the gate at tracks-explainer.ts:26.

### 1.2 Repro (QA evidence, qa/m3-recheck/gate4-246de09.md "Residual QE-LATE-e"; qa/m3-recheck/BACKLOG-next.md:3–7)
1. Fixture EXP1 (committed, unseen; qa fixture `EXP1-committed-unseen-4ccb9fd.json`) + IDB mirror (in-memory fake in the test).
2. LS throws QuotaExceededError on the first `eggfarm.save*` write carrying `"seenTracksExplainer":true`, and on every later one.
3. The mirror accepts that flag write (catch path game.ts:253: seen=true, seq 5), then refuses the revert save's mirror write.
4. The tab dies (no further save). Quota frees.
5. Reload: reconcile picks IDB seq 5 > LS 4, seen=true → 0 cards; second reload 0 cards.
Evidence: qa/m3-recheck/gate4-246de09-evidence/marker.log, line `QE_LATE_e …"idbAtQE":true,"idbAfter":true,"lsSeqAtDeath":4,"idbSeqAtDeath":5,"reloadSrc":"idb","reload1":0,…"total":0}`; assertion "exactly once overall after quota frees + reload: expected +0 to be 1". Test: qa/m3-scripts/gate4-explainer.qa.test.ts:141–187 (`EXP-SB-QE-LATE-e`; the IDB failure is injected at :160).
Impact: one missed coach card. Coins, levels, v6BackupId, migration state identical across sessions (same marker line, s1/s2/s3).

## 2. Rule
R1. `seenTracksExplainer = true` lives **in memory only** until a write carrying it is **confirmed**. In M4.1 "confirmed" means the LS main write returned without throwing (synchronous `kv.setItem` success inside `save()`). A successful LS write is then mirrored to IDB as today (game.ts:250); that mirror write is not awaited and need not be confirmed.
R2. If the flag save's LS write fails, the IDB mirror is **not** written by that save (`mirrorOnFail: false`). An IDB-only copy can therefore never carry seen=true unless an LS write carrying it succeeded first.
R3. After a failed flag save the in-memory flag is reverted to false (or never persisted), and no card is shown this session, so the card can show on a later session/load with working storage.
R4. Acceptable cost: under storage failure the player may see the explainer **at most once more** than ideal (i.e. it is shown on a later load instead of never), never twice after a confirmed write. No save data is lost or rolled back by this rule.
R5. All other saves keep today's fallback: when LS fails, the mirror still receives the save (default `mirrorOnFail: true`). The SD durability design is unchanged.
R6. The card is only attempted when `save()` would really persist now: `canPersist` must apply the same guards as `save()` (incl. hidden tab and newer-save check), side-effect free (parked canPersist hardening, game.ts:129).

## 3. Interface
- `Game.save(opts?: { mirrorOnFail?: boolean })`, **default `mirrorOnFail = true`** (behaviour of today's `save()` unchanged for every existing caller).
- `mirrorOnFail: false` only changes the LS-failure catch path: no IDB fallback write. On LS success the mirror is still written. `storageFailed` and `save_failed` behave exactly as for a default save.
- Return type stays `void`; the caller learns the outcome via `storageBlocked()` (`lease.storageBlocked || g.storageFailed`, main.ts:117), as tracks-explainer.ts:29 does today. `storageFailed` is sticky for the session (CCR #49 n1), so after any earlier failure the card waits for the next load (tracks-explainer.ts:24).
- **Only caller passing false:** the explainer flag save (tracks-explainer.ts:27). The revert save (tracks-explainer.ts:29) stays a default save so its catch path refreshes the mirror with seen=false (Saves Q2: a stale mirror copy must not out-rank LS in reconcile).
- `explainer G` type (tracks-explainer.ts:9) widens `save` to accept the options object.

### 3.1 Other one-time flags reviewed (dd223f5)
| Flag | Where set / saved | Needs mirrorOnFail:false? | Why |
|---|---|---|---|
| `seenTracksExplainer` | tracks-explainer.ts:27 | **Yes** (this spec) | The card is shown only after the write; a failed write means "not seen", so a mirrored seen=true loses content. |
| `celebratedTier` | app.ts:519–522 `markCelebrated` → game.ts:280 `save()` | No | The toast/bounce is shown in the same frame regardless of the save outcome, so the player has seen it; mirroring "celebrated" on LS failure is correct (prevents a replay). |
| `celebratedMilestones` | app.ts:525 `markMilestones` (not in the immediate-save list at game.ts:280; persisted by the next save) | No | Same: toasts are queued regardless of save outcome. |
| UI flags `workersIntroA/B`, `iosHomeShown`, `onboardingDone`, `seenSlots`, `onbStep` | `saveFlags()` app.ts:49 → LS key `eggfarm.ui` (app.ts:37) | No | Separate key, never written to the IDB mirror; failure is swallowed (`catch { /* full */ }`), so the flag simply isn't persisted and the tip may show again next load (already R4-like behaviour). |
Conclusion: the explainer is the only one-time flag whose *display* is conditional on the write succeeding; it is the only `mirrorOnFail:false` caller. (Open question OQ-2 for Saves to confirm.)

### 3.2 Implementation status (read from code, not verified by QA)
Saves has a **local, unpushed** branch `fix/saves-mirror-on-fail` @ **95b5a5c4287b38919ebb4c20975ff34f0d2decbd** (worktree /workspace/wt-m41-6; `git ls-remote origin` shows no such branch at the time of writing). It contains: `save({ mirrorOnFail = true })` gating the catch-path write (game.ts:251–263 on 95b5a5c), the explainer flag save passing false (tracks-explainer.ts:27–28 on 95b5a5c), and canPersist matching save() guards incl. `this.hidden` and `newerStoredVersion`/`mirror.newer` (game.ts:128–137 on 95b5a5c). Saves' local gate log /workspace/m41-6-gates/summary.txt (10:20) shows tsc/unit/test-slow/builds exit 0 at that SHA; browser gates (check-globals, rc0) were not yet listed. **Not merged, not pushed, not QA'd.** PM pre-check only (not a QA verdict): QA's gate4-explainer.qa.test.ts (sha256 `20b12dc961146ba83359a716f367cb87a2b182f567f73cccb1f6e31a40a5c420`) run in a clean export of 95b5a5c → 17/17 pass, QE_LATE_e `reload1:1, total:1, idbSeqs [4,5,6,7,8,9]`; same file on dd223f5 → 16/17, e fails. Nothing in this section counts as built until QA reruns it on a pushed SHA.

## 4. Telemetry
No new events. Reuse existing:
- `save_failed {reason}` (game.ts:254): fires once per session on the first failed save, including a failed flag save. Unchanged by `mirrorOnFail`.
- `tracks_explainer_shown {}` / `tracks_explainer_dismissed {method}` are specified in m4a-spec v1.19 (M4A-EXP-B11, m4a-spec.md:328) for M41-9; **not present in src on dd223f5 or 95b5a5c** (rg finds none). If M41-9 lands, `tracks_explainer_shown` must fire only when the card is actually appended (after the confirmed write), never for a reverted attempt. No event for "explainer suppressed by storage failure" is added.

## 5. Out of scope
- Awaiting IDB `write()` confirmation (Promise) to accept the flag when LS is full but IDB works (see OQ-1).
- Any change to reconcile/rankCompare, saveSeq derivation, loadSafe, corrupt.*, v6_backup, `.bak`, or the SD fallback for normal saves.
- Making `storageFailed` non-sticky; retrying the card in the same session after storage frees.
- UI flags in `eggfarm.ui`, celebration flags (§3.1), explainer copy/layout/timing (m4a-spec §11/§17), and the explainer telemetry events (M41-9).
- CCR pr49 m1/n1/n2 items are bundled in M41-6 by Engineering but are not specified here beyond QEL-7.

## 6. Acceptance criteria
Test file: qa/m3-scripts/gate4-explainer.qa.test.ts, sha256 `20b12dc961146ba83359a716f367cb87a2b182f567f73cccb1f6e31a40a5c420` (QA proves it ran this exact file) (`EXP-SB-QE-LATE mirror/reload variants`, :151–187), run as tests/gate4-explainer.qa.test.ts in the candidate worktree. Shared invariants for every a–f variant (asserted at :180–185): quota hit the flag write; 0 cards while quota fails; **exactly one card overall** across session + 2 reloads; saveSeq monotonic in LS and IDB; no newer-save trip (R3), no recovery, no pending/second migration, coins/F/H/V/v6BackupId identical.

| AC | Requirement | Test | Baseline dd223f5 | Required |
|---|---|---|---|---|
| QEL-1 | LS fails on the flag write, quota frees, autosave to LS, reload: shown exactly once, never again (no mirror). | EXP-SB-QE-LATE-a | PASS | PASS (no regression) |
| QEL-2 | LS fails, mirror OK, one more save under QE, reload prefers IDB: IDB never holds seen=true from the failed flag save; shown exactly once. | EXP-SB-QE-LATE-b | PASS | PASS (no regression) |
| QEL-3 | a + mirror: shown exactly once. | EXP-SB-QE-LATE-c | PASS | PASS (no regression) |
| QEL-4 | LS fails, revert save's mirror write succeeds, tab dies, reload with IDB copy: shown exactly once. | EXP-SB-QE-LATE-d | PASS | PASS (no regression) |
| QEL-5 | **QE-LATE-e:** LS fails on the flag write and the mirror then refuses writes, tab dies, reload: the card shows exactly once (on reload), never again. The IDB copy at death must have seen=false/absent. | EXP-SB-QE-LATE-e | **FAIL** (marker.log QE_LATE_e total 0) | **PASS** |
| QEL-6 | d on a pre-v7 save committing in session (migration + refund path): shown exactly once; no double migration/refund. | EXP-SB-QE-LATE-f | PASS | PASS (no regression) |
| QEL-7 | `save()` with no argument behaves byte-identically to today. **Byte-identical** means the default save writes the same localStorage and IDB payloads as dd223f5 on the existing SD/durability fixtures. Also: on LS failure the mirror still receives the save; `mirrorOnFail:false` skips only that fallback write and still mirrors on LS success; `storageFailed`/`save_failed` unchanged. | Saves unit tests `M41-6 Game.save({ mirrorOnFail })` (tests/m41-6-save-mirror-canpersist.test.ts on 95b5a5c) + existing SD/durability suites unchanged; QA confirms flag-off byte identity as in gate4 | n/a | PASS |
| QEL-8 | Only the explainer flag save passes `mirrorOnFail:false` (QA reruns `rg mirrorOnFail src` on the pushed SHA. **Expected: exactly 2 hits in src:** the default in game.ts and the single `false` in tracks-explainer.ts). | code review (HoQA/CCR) | n/a | PASS |
| QEL-9 | `canPersist` is false whenever `save()` would not persist the current state (hidden, newer save in LS/.bak/IDB, lease lost, readOnly/inactive/held/resetting), with no side effects; the card is not shown and the flag not set in those states. | Saves unit tests `M41-6 canPersist matches save()` (same file) | n/a (parked, game.ts:129) | PASS |
| QEL-10 | No regression in the other explainer probes: EXP-a/b/c/EXP1/lookalike, EXP-SB ×2, EXP-SB-QE ×2, EXP-SB-QE-LATE commit-in-session / reload-committed-unseen (:116–139). | same QA file | PASS | PASS |
| QEL-11 | **D-HOP-39: delayed, never lost.** While no localStorage write has been confirmed, the seen-flag is never marked shown or cleared in any store or in memory that persists. With localStorage full, a failed flag write gets no confirmation, so the card can be held back but never dropped. On the next load with localStorage free, the card shows **exactly once**, and the flag is then confirmed in localStorage and never shown again. | EXP-SB-QE-LATE-a (the QEL-1 scenario, no mirror) plus the shared a–f invariants at :180–185: 0 cards while quota fails, exactly one card across the session and 2 reloads. QA asserts that LS/IDB hold seen=false or nothing until the first confirmed LS write. | PASS (a) | PASS |
| QEL-12 | **Real-browser gate (HoQA OQ-4):** one Chromium run of `qa/m3-scripts/qe-late-browser.mjs` on the pushed SHA, because the test mirror throws synchronously and the production IdbMirror fails asynchronously, and canPersist reads the real visibilityState. The run must show: (i) variant e, card shown exactly once on reload; (ii) see QEL-13; (iii) a hidden tab at the trigger point gives no card and no flag set, then the card shows exactly once when the tab becomes visible or on the next load. WebKit and Firefox aren't required. | qe-late-browser.mjs (Chromium) | n/a | PASS (i–iii) |
| QEL-13 | **No regression with working storage (canPersist hardening, the riskiest part):** a fresh save, and EXP1 (committed, unseen) with working LS and IDB, both show the card exactly once in a real browser. A false "newer save" or "hidden" reading must never suppress it. | qe-late-browser.mjs (Chromium) item (ii) + gate4 EXP-a/EXP1 | PASS (vitest) | PASS (vitest + Chromium) |
Gate: the QA file must go from 16/17 (dd223f5) to 17/17 on the candidate pushed SHA, with no regression in a–d or f, **and** the QEL-12/13 Chromium run must pass on that same SHA.

## 7. CSR interaction
- loadSafe(), the recovery order (.bak vs IDB by rankCompare, then v6_backup, then fresh), CSR-13/CSR-17 behaviour and `corrupt.*` preservation are **unaffected**: this change only removes one IDB write on the save path, never touches load/recovery code, and never creates or deletes `corrupt.*` keys. The frozen CSR spec (product/farm/frozen/corrupt-save-recovery-spec.v0.3.3.md, sha256 bca075fe…bae9c) needs no change.
- Effect on reconcile inputs: after a failed flag save, the IDB copy is whatever the last successful mirror write held (older seq, seen=false). This is a state reconcile already handles today (IDB older than or equal to LS). No new seq pattern: QA's pre-check shows idbSeqs `[4,5,6,…]` without the `5,5` duplicate seen in d on dd223f5.
- M41-6 and M41-7 (fix/saves-csr-loadsafe) both edit src/game.ts; Saves owns the merge order. QA must rerun EXP-SB-QE-LATE a–f on the integrated SHA if M41-7 lands after M41-6.

## 8. QA testability notes
- The existing harness already covers the case: armed quota on the first write containing `"seenTracksExplainer":true` (:157), in-memory fake mirror that throws in variant e (:160). No new fixture is needed.
- The fake mirror throws synchronously; production `IdbMirror.write` never throws and fails asynchronously (idb-mirror.ts:79–85). With `mirrorOnFail:false` this difference does not matter for the flag save (no write is issued at all). Recommend one assertion that the mirror received **zero** writes carrying seen=true during the failed flag save (count calls, not only the final IDB content) — Saves' unit test "explainer: a failed flag save sends nothing with seen=true to the mirror" covers this on 95b5a5c.
- Browser matrix: the real-browser probe qa/m3-scripts/qe-late-browser.mjs exists; HoQA to decide whether a Chromium run is needed for M4.1 or the vitest gate suffices (Minor).
- Record the full candidate SHA, the QA test file sha256 and the marker line `QE_LATE_e` with `reload1:1,total:1` as evidence.
- Expected visible change for the player: none in normal play; under double failure the card appears on the next good load.

## 9. Open questions
- **OQ-1 (HoP): RESOLVED, D-HOP-39.** M4.1 uses localStorage confirmation only; awaiting IDB moves to M4.2, on the condition in QEL-11. *Original question:* The P41-4 wording says "confirmed LS **or IDB** write". The built path (and this v0.1) only accepts an LS confirmation because Game never awaits the IDB Promise (idb-mirror.ts:79–85). Accept LS-only for M4.1 (cost: when LS is full but IDB works, the card shows on a later good load instead of now), or require awaiting IDB (bigger change, M4.2)? PM recommendation: LS-only for M4.1.
- **OQ-2 (Saves):** Confirm no other one-time flag needs `mirrorOnFail:false` (PM review in §3.1 found none).
- **OQ-3 (Saves/HoE):** Push 95b5a5c (or its successor) so QA can run the gate on a pushed SHA before 16:00; state merge order with M41-7.
- **OQ-4: RESOLVED by HoQA.** vitest plus one Chromium run (QEL-12/13). *Original question:* (HoQA):** Is the vitest gate (QEL-1..10) enough for a Minor, or is a Chromium qe-late-browser run required?

## Changelog
- v0.1 (2026-10-19, PM Farm Upgrades, P41-4): first draft.
- v0.2 (2026-10-19 10:35, PM Farm Upgrades): OQ-1 resolved by D-HOP-39 (M4.1 uses localStorage confirmation only). Added QEL-11 (delayed, never lost), mapped to EXP-SB-QE-LATE-a and the shared invariants. No test-file change needed. HoP approved v0.1 with QEL-11 included.
- v0.3 (2026-10-19 10:40, PM Farm Upgrades): FROZEN, with HoQA review edits 1–5. QEL-12 is the Chromium run of qe-late-browser.mjs (OQ-4 resolved). QEL-13 is the explicit no-regression check with working storage. QEL-7 now defines byte-identical, QEL-8 expects exactly 2 hits in src, and the gate4 file has its full sha256. HoQA's "QEL-11" became QEL-12, because v0.2 already uses QEL-11 for D-HOP-39.
