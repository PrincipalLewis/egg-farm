# Corrupt-save recovery when there is no valid .bak · v0.3 DRAFT · 2026-10-19 · PM, Farm Upgrades
Decision: product/decisions.md D-HOP-2026-10-19-18 (07:12), next release. Owners: PM Farm Upgrades (spec/ACs), HoE/Saves (build), HoQA (test).
Code baseline: build ffc3dfd (`git show ffc3dfd:…` in /tmp/qa-rc/ffc3dfd, the HoQA gate worktree, qa/reports/final-ffc3dfd-gates.md). Note: `game/src` in the studio workspace is an older tree (SAVE_VERSION 5, no IDB, no v6_backup) and is NOT the baseline.
> **v0.3 (2026-10-19 ~10:0x, D-HOP-30):** adds §6 CSR-17 field-level level repair, **STRETCH**, gate 12:00 today (PM, Saves, HoQA). §6 is self-contained: if it misses the gate it moves to M4.2 and **v0.2.3 (= this file minus §6 and this line) is the shipping baseline**. No v0.2.3 AC changes.
> **v0.3 update (10:3x, Saves CSR-17 pre-assessment GO-with-conditions vs dd223f5):** C1–C6 applied (no rank check; preTracksRaw = repaired v6; IDB unknown → CSR-13 defer, withdrawing the 09:54 clause; opt-in repair, CSR-15 lists the notice; 'repaired' outcome + storageBlocked queueing; malformed inputs/capOverFarm/Collection 0); new ACs CSR-17-10..12 and fixtures; Q-S1..S4 answers; refs rankOf save.ts:41-45, app.ts:517-520; effort ~11.5 h + cut rule.
> **v0.3 update (10:2x):** §6 17.8 hand-computable formulas, inline lookup tables, worked OQ-1 example (F = 15), named-fixture expected values, 0/max/max+1 boundaries, seeded fuzz (seeds 1..500), .bak/IDB-beats-repair fixtures, and a not-hand-computable list (HoQA).
> **v0.3 update (10:1x):** CSR-17 notice → Art & UX final copy (csr17-partial-repair-copy.md); copy ACs CSR-17-C1..C6; 4-item body marked unreachable/defensive.
> **v0.3 update (09:54, PM decision):** CSR-17 order: any valid .bak/IDB beats repair regardless of rank; repair only when both invalid/absent, before v6_backup/fresh; IDB unknown → repair + mirror nulled. CSR-17-8 rewritten; Q-S5 resolved; Q-S4 narrowed.
> **v0.2 changelog (2026-10-19 07:3x):** applied Saves review engineering/reviews/corrupt-save-recovery-saves.md (GO-WITH-CHANGES, B1–B4 + lease/newer/storageBlocked/wording) and HoE OQ-7 ruling (07:14) + HoQA OQ-1 note. loadSafe() owns order/telemetry; .bak vs IDB ranked by rankCompare; IDB-unknown proposal (pending HoP); v6_backup never copied to corrupt.*; dedupe; message list reusing AC14b; writes after owns(). Resolved: OQ-1 (partial), OQ-2, OQ-4, OQ-6, OQ-7.
> **v0.2.1 (2026-10-19 07:4x):** CSR-9 takes final copy from art-ux/copy/csr9-recovery-copy.md; new CSR-9a (M2 variants per HoP OQ-5), CSR-9b ({age} + boundaries; per Art & UX), CSR-9c (explainer after M2, post-freeze M4, not B). OQ-5 and copy resolved.
> **v0.2.2 (07:5x):** Saves v0.2 re-check notes: CSR-13 mirror nulled + CSR-13a no-IDB-write AC; CSR-13b defer copy rule; 'pure' → 'single owner'; dedupe is new loadSafe code. OQ-3 resolved (HoP 07:19).
> **v0.2.3 (08:0x):** CSR-9a prevLevel rule (main → .bak → unset/age), ACs CSR-9a-1..4, lastKnownLevel rejected with reason; Saves full GO; M2 level-source item resolved.
> **v0.2.3 fix (no bump, 08:1x):** CSR-9/9b aligned to art-ux/copy/csr9-recovery-copy.md (template without "about", "about {n} hours", singulars + ACs); Art & UX age item resolved; lastKnownLevel rejection now cites Saves' 07:20 reasons.
> v0.1 (07:20): first draft.

Baseline note (Saves review): /tmp/qa-rc/ffc3dfd is checked out at c11e3a0; `git diff ffc3dfd c11e3a0 -- src` is empty, so line refs hold.

Status: DRAFT, not approved. Player copy is a PLACEHOLDER for Head of Art & UX.

## 0. What ffc3dfd does today (facts, cited)
- Boot order (src/main.ts:72-96): `IdbMirror.openForBoot()` reads IDB `eggfarm/save/main` → re-read after the tab-lease flush → `reconcile(localStorage, idbRaw)` → `new Game` → `loadSafe()`.
- **IDB main mirror already exists** (rc1 D2, src/save/idb-mirror.ts): every save is also written to IDB `save/main` (durability strict). `reconcile()`/`pickNewest()` already replace a corrupt localStorage main with a *valid* IDB main, preserving the bad LS bytes as `corrupt.<ts>` first, and `save_restore {source:'idb'}` fires (main.ts:109). So step (a) is partly built, but only via reconcile, and only when the mirror opened.
- **IDB `save/v6_backup` is never written in M4-A** (ADR M4-24, m4a-spec M4A-31(a), (g)4 "zero IDB writes"). Only the localStorage `eggfarm.save.v6_backup` record `{migrationId, raw}` exists (save.ts:13-25).
- The mirror is **paused** (no IDB writes) in a session where an unmarked v6 farm has a pending tracks migration, until the commit is confirmed (game.ts:60-64, :225, :249; M4-24/M4-20), and stays off after an IDB-unknown deferral (N6). IDB main can therefore be older than LS main.
- `loadSafe()` (save.ts:267+): main valid → load; main bad → `preserveCorrupt(main)` → valid `.bak` → restore (case R); else bad .bak preserved too → fresh (F, or Q when the copy failed). **`eggfarm.save.v6_backup` is never consulted on the corrupt path.**
- "Corrupt" = `validate()` (save.ts) returns `{ok:false, reason}` with reason ∈ `empty | parse | wrong_type | version | missing_state | checksum | invalid_state` (`missing` = no main, only on the .bak-without-main path). `version` covers version >6, <1, non-integer, or a migration throwing. Checksum = FNV-1a over state JSON, only checked when `sum` is present.
- A **newer-version** copy anywhere (main, .bak, IDB) is NOT corrupt: it refuses the load before any write (M4A-31(b), `newerStoredVersion`).
- `corrupt.<ts>` preserved via `preserveCorrupt` with index `eggfarm.save.corrupt.index`, `CORRUPT_KEEP = 3`, oldest removed, one attempt, never retried.
- Telemetry today: `save_corrupt {reason, had_backup, restored_from_backup, build, copy_failed?}` (game.ts:68); `save_restore {source:'idb'}`.
- Player message today: the AC14b dialog (art-ux/save-recovery-dialog.md v2.1; src/ui/save-recovery.ts, app.ts:692) has Restored / Fresh / Storage-full copy keyed by `recoveryOutcome`. **This conflicts with D-HOP-18's "no message"** — see OQ-1.
- A fresh farm on an M4 build is committed at creation with a new `v6BackupId` and never touches an existing v6_backup (game.ts:73-75, M4-22). Fresh start sets `bakAllowed = false` until progress (game.ts:70).

## 1. Definitions
- **Valid copy**: `validate(raw, b, now)` returns ok (incl. sanitizeLevels and the normal migrate path) and the copy is not newer than this build.
- **Sources**: (0) localStorage `eggfarm.save` (main); tier A = the newer of {`eggfarm.save.bak`, IDB mirror `eggfarm/save/main`} by `rankCompare` (version, committed, saveSeq) then savedAt (idb-mirror.ts:95-104), **tie → .bak**, then the other; tier B = localStorage `eggfarm.save.v6_backup` → `raw`; tier C = fresh farm (last resort). This is D-HOP-18's "newest first" made concrete: v6_backup is by construction the oldest (pre-migration snapshot).
- **IDB tier status** (OQ-2): `ok` only if `openForBoot` returned `ok` (main.ts:72-74) AND the post-lease re-read did not fail (main.ts:87). `absent` = no global or SecurityError/InvalidStateError/private mode (idb-mirror.ts:42, :51). Anything else (`idb_blocked`, `idb_timeout`, `idb_read_error`) = `unavailable`. A **paused** mirror (game.ts:60-65; N6 game.ts:177-179) is still a valid read source; its lag (older bytes) is accepted.
- **Ownership** (OQ-7, HoE 07:14): one single-owner `loadSafe(kv, b, now, idb: {status, raw, reason})` owns order, preservation and returns `{source, tried[], recovery}`; Game only emits telemetry from it. (Not pure: it writes — preserveCorrupt and the LS main restore — inside `new Game` after the owns() check, main.ts:94-95; Saves v0.2 re-check note 2.) `reconcile()` shrinks to a step loadSafe calls for the non-corrupt stale-LS case (`save_restore`); it never restores a corrupt main silently. Target: next release (M4/B frozen); Saves builds.

## 2. Acceptance criteria
- **CSR-1 Trigger.** Recovery runs when main exists and `validate` fails (`empty|parse|wrong_type|version|missing_state|checksum|invalid_state`), including a **sanitizeLevel failure** (level null, negative, NaN, junk string → `invalid_state`, save.ts:208/:218/:223), or main is missing and .bak is invalid. A missing main with no other source = normal new game. A newer-version copy in main/.bak/IDB follows M4A-31(b) first (save.ts:272, :95; main.ts:75-76, :88-89) and never enters recovery. **A v6_backup raw with version > 6 is `invalid (version)`, not "newer"** (newerStoredVersion does not check v6_backup).
- **CSR-2 Order.** Corrupt main → tier A (.bak vs IDB by rankCompare, tie → .bak, then the other) → tier B v6_backup → tier C fresh; first valid wins. Test matrix (KV stub + fake IDB + fake clock): {.bak, IDB, v6_backup} × {valid, invalid, absent} plus IDB {unavailable, absent}, with rank cases IDB newer / .bak newer / tie; each yields the expected `recovered_from`.
- **CSR-3 Corrupt LS + valid IDB (B1).** Today `reconcile` writes IDB into main before loadSafe (main.ts:93; idb-mirror.ts:113-114), loadSafe then sees a valid main → `recovery: null` (save.ts:284-285) → no dialog, no `save_corrupt`: a silent restore. Required: this case is a recovery — corrupt bytes preserved, Restored message (M1), `save_corrupt {recovered_from:'idb'}`. IDB bytes identical to the corrupt main count as invalid.
- **CSR-4 v6_backup tier.** Decoded with `decodeBackup` (null = invalid). `raw` goes through `validate()` → sanitizeLevels → `migrate()`; with M4 on the unmarked raw is `tracksMigrated` → pending, mirror paused (game.ts:60-65) → normal `startTracksMigration` (main.ts:134; game.ts:203-206) with all M4A-27–34 / M4-24 rules (new migrationId, LS write + read-back, defer/abort, M4A-30 ×1.0 grant). No shortcut code.
- **CSR-5 v6_backup record lifecycle.** The record is **replaced only by a committed migration** (new migrationId, same raw); it is **byte-identical on defer/abort** (M4A-31(h)). Recovery never deletes it. The M4A-33 explainer re-shows after such a restore (marker absent) — accepted.
- **CSR-6 Fresh only as last resort.** Fresh only when tiers A and B are all invalid/absent and IDB is not `unavailable` (else CSR-13). Never silent: Fresh message (M3) + `save_corrupt {recovered_from:'none'}`.
- **CSR-7 Preserve corrupt bytes.** Each invalid main, .bak and IDB copy read in recovery is preserved once via `preserveCorrupt` as `eggfarm.save.corrupt.<ts>` (≤ 3 per boot). **Identical bytes are preserved once** (dedupe, e.g. IDB == LS main). The v6_backup record is **never** copied to corrupt.* (it stays in its own key, CSR-5). Dedupe is **new code in loadSafe, per boot** — preserveCorrupt has no byte check (save.ts:241-250) and stays unchanged (Saves note 3). Oldest-first eviction (save.ts:247), `CORRUPT_KEEP` stays 3, no pinning. No other path deletes corrupt.*.
- **CSR-8 Lease / multi-tab.** All recovery writes (preserveCorrupt, LS main write, any IDB write) happen only after `lease.claim` and the `owns()` check (today reconcile writes at main.ts:93, before :94 — move after). A tab that loses the claim preserves and writes nothing (byte-identical save keys).
- **CSR-9 Messages (B4) — FINAL copy: art-ux/copy/csr9-recovery-copy.md (Head of Art & UX, 2026-10-19).** Reuses and extends the AC14b recovery dialog (art-ux/save-recovery-dialog.md v2.1; src/ui/save-recovery.ts:30-38) — no new system. Rules: one title + one line + one primary button (≥ 48px); optional secondary link only when a corrupt copy exists; calm egg/farm icon, no red, no warning triangle, no error codes.
  | ID | When | Title | Body | Button | Link |
  |---|---|---|---|---|---|
  | M1 | restored from .bak/IDB | Your farm is back! | We fixed a hiccup and restored your latest save. | Continue | — |
  | M2 | restored from v6_backup | Your farm is back! | see CSR-9a | Continue | — |
  | M3 | fresh farm | A fresh start | We couldn't recover your save, so we started a new farm for you. | Start farming | Export old save file |
  | M4 | CSR-13 defer | Couldn't load your farm | Your save is safe. Let's try that again. | Try again | Export save file |
  | M5 | restored + storage blocked (CSR-14) | Your farm is back! | Saving is paused on this device right now, so progress may not be kept. | Continue | — (AC14b storage-full layout) |
- **CSR-9a M2 variants (HoP OQ-5 ruling, product/decisions.md:299: auto-restore, state roughly how much was lost).** Priority: level → time → fallback.
  1. Level known and different from the pre-corruption level → "We restored an earlier save, from Farm level {level}." ({level} = restored copy's farmLevel.)
  2. Else, time known (restored copy has a valid savedAt) → "We restored a save from {age} ago."
  3. Else → "We restored an earlier save. A little recent progress may be missing."
  - Test: fixtures for each of 1–3 (incl. level equal → falls to 2; NaN/invalid savedAt → falls to 3).
  - **prevLevel (Saves recommendation, full GO).** loadSafe derives `recovery.prevLevel?: number` best-effort, in order: (1) `JSON.parse` the corrupt main bytes and take `state.farmLevel` only if it is a number that is a finite integer ≥ 0 (levels above `maxLevel` are accepted per the level-tolerance rule, save.ts LEVEL_FIELDS comment / M2; no string or float coercion, i.e. stricter than `sanitizeLevel`); (2) else the same check on the `.bak` bytes; (3) else unset → variant 1 is skipped and M2 uses the age variant from the v6_backup record's own timestamp (the restored raw's `savedAt`), else the fallback. **Never show an unvalidated number.** No new save key, no IDB read for this.
  - **ACs CSR-9a-1..4:** (1) corrupt main = valid JSON with farmLevel 17, v6_backup restores level 12 → prevLevel 17, body "…from Farm level 12."; (2) main unparseable, .bak bytes (invalid elsewhere) carry farmLevel 15 → prevLevel 15, level variant; (3) main and .bak unparseable/absent → prevLevel unset, age variant from the v6_backup raw savedAt (fallback if savedAt invalid); (4) farmLevel in main = 12.5, NaN-producing/`null`, `-1`, `"17"` → rejected, falls to .bak, then unset; 31 with maxLevel 30 → accepted.
  - **Rejected: a `lastKnownLevel` key (Saves, 07:20).** (a) When M2 is reached, tier A (.bak and IDB) has already failed, so the IDB mirror is unreliable by construction; (b) lastKnownLevel would be a new write path in the same localStorage that just broke; (c) it could drift from the real save; (d) it would need its own migration and tests, for one line of copy. *Supporting note (PM):* a new key would also have to join every pinned key list (RESET_KEYS save.ts:112, M4A-31(f)5 byte-identical set, (f)6 no-write-while-refused, second-tab rules).
- **CSR-9b {age} format (art-ux/copy/csr9-recovery-copy.md:37, :41).** Template "We restored a save from {age} ago." ("about" lives only in {age}, never in the template). age = load clock − restored savedAt, rounded down, never seconds: < 5 min → "a few minutes"; < 60 min → "{n} minutes"; < 48 h → "about {n} hours"; else "{n} days". Singulars: "1 minute", "about 1 hour", "1 day". Boundary ACs: 4:59 → "a few minutes"; 5:00 → "5 minutes"; 59:59 → "59 minutes"; 1:00:00 → "about 1 hour"; 47:59 h → "about 47 hours"; 48:00 h → "2 days". Singular ACs: render function given 1 minute → "1 minute" (unit test; unreachable in M2 since < 5 min shows "a few minutes"); 1:00:00–1:59:59 → "about 1 hour"; 24–47 h never yields "1 day"; a "{n} days" input of 1 day → "1 day" (unit test of the formatter). Full sentence e.g. "We restored a save from about 3 hours ago."
- **CSR-9c Explainer after M2 (post-freeze M4 work, NOT part of B).** The M4A-33 tracks explainer may show again after M2 if the restored save lacks `seenTracksExplainer`; it queues behind the recovery dialog (same rule as Welcome back) and never shows on M5 (save not writable).
- **CSR-10 Telemetry.** `save_corrupt` once per recovering boot (flushed): existing `reason, had_backup, restored_from_backup, build, copy_failed?` plus `recovered_from: 'bak'|'idb'|'v6_backup'|'none'|'deferred'`, `tried: [{source:'bak'|'idb'|'v6_backup', result:'valid'|'invalid'|'absent'|'unavailable', reason?}]` in order — `reason` is the CorruptReason for invalid, and for `unavailable` one of `idb_blocked|idb_timeout|idb_read_error` (for absent IDB: `no_global|security`); `restored_version`, `migrated: boolean`. Plus `save_recovery_notice_shown/_dismissed {outcome, source}`. `save_restore {source:'idb'}` stays for the non-corrupt stale-LS case only. No save bytes.
- **CSR-11 Every source corrupt.** Corrupt main plus all 3 sources (.bak, IDB, v6_backup) invalid → main/.bak/IDB preserved (deduped, ≤ 3), v6_backup left in place, fresh farm, M3, `tried` lists the 3 sources `invalid`.
- **CSR-12 Storage unavailable / private mode.** IDB `absent` → tier skipped (`absent`), continue. localStorage throwing SecurityError/InvalidStateError on read → nothing readable: existing v2.2 "Can't save"/storage outcome; never autosave a fresh farm over unread data.
- **CSR-13 IDB unknown (B3; APPROVED HoP 07:19, product/decisions.md:297-298).** No extra waiting beyond existing bounds (1500 ms open + 1500 ms read, 300 ms flush, 1500 ms re-read, ≤ ~4.8 s; lease stale 6 s, tab-lease.ts:3-5). If IDB is `unavailable` and .bak is valid → restore .bak (LS-only write), mirror off for the session: **Game sets `mirror = null`** (not paused, not via N6 `mirrorResumeOnSave`, which only covers migration deferrals, game.ts:175-179), because `openForBoot` returns a live mirror with status unknown (idb-mirror.ts:55; main.ts:87) and the first save would write IDB (game.ts:250). **AC CSR-13a:** fake IDB with status unknown + valid .bak → after restore and ≥ 1 autosave/purchase/pagehide save, the fake IDB records zero puts. If .bak is also invalid/absent → **DEFER**: no v6_backup or fresh commit, no save write of any kind, M4 "Try again" notice, `recovered_from:'deferred'`. Rationale: a fresh M4 farm committed at creation (game.ts:75) could outrank the real IDB farm next boot (idb-mirror.ts:95-104). During a defer the only allowed write is copying the corrupt bytes to corrupt.* (HoP 07:19): capped at 3, skipped if identical to the newest corrupt.* entry, and a failed copy (quota) never blocks the defer or the M4 notice. **AC CSR-13b:** defer with quota-failing KV → M4 shown, no other key changed.
- **CSR-14 Quota / storage blocked.** preserveCorrupt failure → existing case Q / storage outcome (Export from memory). Restored + lease write refused (`storageBlocked`): today main.ts:102 sets 'storage' only when `recoveryOutcome === null`, so it shows Restored with no Can't-save. Required: show M5 (Restored outcome with the Can't-save line/Export of the current farm). Notice ordering follows **engineering/decisions.md:52 (HoE, 2026-10-17 08:13): the no-storage notice is deferred while the dialog is open and shown on close** — this is the later ruling, made to settle the conflict with SD6-1 ("never held", engineering/status.md:368, raised at :448), so it wins. If writing the restored copy to LS fails, play continues from memory with NO_STORAGE_TEXT (main.ts:50); the restored state is never discarded.
- **CSR-15 No silent zero.** Any boot where stored main was non-null and invalid ends with a message (M1–M5, or the CSR-17 repair notice when §6 ships — C4) and a `save_corrupt` event. Property test over validate() mutations, incl. HoQA's sanitizeLevel fixtures (qa/m3-recheck/gate4-0ee8831.md).
- **CSR-16 .bak rotation after recovery.** Unchanged: after fresh start rotation waits for progress (game.ts:70); after restore it rotates normally.

## 3. Open questions
- **OQ-1 remainder (HoQA/Saves QA).** Confirm with the fixture that the sanitizeLevel path is the silent fresh farm (and/or B1 silent IDB restore); CSR-1/CSR-3 cover both.

## 4. Resolved
- Copy / {age} (Art & UX): template without "about", "about {n} hours", singulars "1 minute" / "about 1 hour" / "1 day" (CSR-9b).
- M2 level source (Saves, v0.2.3): best-effort `recovery.prevLevel` from corrupt main, then .bak bytes, else age variant (CSR-9a); `lastKnownLevel` key rejected.
- OQ-3 (HoP 07:19, product/decisions.md:297-298): approved as proposed; corrupt.* copy allowed during defer (CSR-13). With OQ-5, these were Saves' only remaining items.
- OQ-5 (HoP, product/decisions.md:299): v6_backup auto-restores with M2 stating roughly how much was lost; no choice dialog.
- Copy (Art & UX, art-ux/copy/csr9-recovery-copy.md): M1–M5 final incl. M2 variants; explainer re-show after M2 allowed, queued behind dialog, never on M5.
- OQ-1 (partial, HoQA 07:1x): silent fresh farm comes from the sanitizeLevel path (qa/m3-recheck/gate4-0ee8831.md); CSR-1 treats it as `invalid_state` through the full order. Saves also identified B1 as a silent IDB restore path.
- OQ-2 (Saves review): IDB tier gating, private mode = absent, paused mirror valid; IDB v6_backup NOT pulled forward (LS v6_backup covers pending migration).
- OQ-4 (Saves review): v6_backup never copied to corrupt.*; dedupe; oldest-first; cap 3.
- OQ-6 (Saves review): restore re-runs the normal migration; CSR-5 reworded; explainer re-show accepted.
- OQ-7 (HoE 07:14): loadSafe() owns order and telemetry; reconcile() is a step it calls; next release; Saves builds.
- B2: order = rankCompare(.bak, IDB), tie → .bak, then v6_backup, then fresh (= D-HOP-18 "newest first").

## 5. Reviewers
- **HoE / Saves** — buildability: GO-WITH-CHANGES on v0.1 (engineering/reviews/corrupt-save-recovery-saves.md); v0.2 re-check **GO-pending-HoP** → GO now that OQ-3/OQ-5 are resolved (same file, 'v0.2 re-check'); notes 1–3 folded in v0.2.2.
- **HoQA** — testability: CSR review after the 08:30 B verdict; matrices CSR-2/11–13, property test CSR-15, OQ-1 fixture.
- Head of Art & UX — copy delivered; confirm CSR-9b nits. Head of Product — final approval.

## 6. CSR-17 Field-level level repair — STRETCH (D-HOP-30, product/decisions.md:361) — CUTTABLE
*Separable: deleting this section restores v0.2.3 exactly. Cross-references that apply only when §6 ships: CSR-2 gains the 17.6 step, CSR-10's `recovered_from` gains 'repair', CSR-15 lists the CSR-17 notice, recoveryOutcome gains 'repaired'. (17.7 intentionally unused; questions moved to 17.9.)*
Code tree: **ffc3dfd**, re-checked by Saves against **main dd223f5** (CSR-17 pre-assessment, engineering/reviews/corrupt-save-recovery-saves.md): src/save/*, src/sim/*, game.ts and formulas.ts unchanged, so all refs hold except rankOf = save.ts:41-45 and the celebratedTier dispatch = app.ts:517-520. Original (read via `git show ffc3dfd:…` in /tmp/qa-rc/ffc3dfd, which is checked out at c11e3a0; Saves confirmed `git diff ffc3dfd c11e3a0 -- src` empty). Lines below are ffc3dfd.

### 17.1 Eligibility (all must hold, else the existing chain, CSR-2)
- Main parses and passes every `validate()` check **before** the level step: not `empty|parse|wrong_type|version|missing_state|checksum` (save.ts:211-217), i.e. version 1..6 integer, state is an object, checksum matches when present.
- The only failure is `sanitizeLevel` returning null (save.ts:205-208) for 1–3 fields of the enumerated list (17.2). The migrate step (save.ts:219) and the post-migrate checks (NUM_FIELDS coinsCents/coop/basket finite ≥ 0, customers array, workers object; save.ts:220-226) must pass **after** the repair; any failure there → existing chain.
- All 4 enumerated fields bad (> 3) → existing chain. Any non-level field failing → existing chain.
- Checksum (save.ts:217) runs before the level step and every current save carries `sum` (save.ts:143), so CSR-17 only repairs app-written bad values or pre-rc0 saves without a sum; bit-rot fails `checksum` and takes the chain (Saves).
- **C4 — opt-in:** repair is an opt-in mode of validate (`validate(raw, b, now, {repair: true})`, at save.ts:218: per-field `badLevels(st)`, bounds from the original `d.state`, then the unchanged :219-:229 path), called **only by loadSafe for main**. pickNewest/reconcile (idb-mirror.ts:96-99), save rotation (save.ts:176) and the v6_backup tier keep plain validate and still see `invalid_state`.
- Not repaired (valid today): levels > maxLevel, floats (floored), whole-number strings ("12") (save.ts:199-206).

### 17.2 Enumerated fields (the only callers: `sanitizeLevels` at save.ts:208, used at :218 pre-migrate and :223 post-migrate; list = `LEVEL_FIELDS`, save.ts:204)
| Field | Implied lower bounds from the rest of the save (only from fields that were valid on load; no chaining) | Source |
|---|---|---|
| `farmLevel` (F) | (a) `hensLevel − capOverFarm` (**this build's** `m4.hens.capOverFarm`, 3 today, not a literal; C6): Hens buy cap min(maxLevel, F + hens.capOverFarm), enforced at purchase (formulas.ts:115; balance.json:199), migration sets H = F (migrate-v7.ts:26-28), F never decreases. (b) `celebratedTier` t → F ≥ 5/10/20 for t = 1/2/3 (coopTier, state.ts:52; set from coopTier(F), app.ts:517-520, actions.ts:88). (c) hired workers → F ≥ unlock_farm: market_hand 3, coop_hand 7, hawker 8, grader 18 (workers.ts:30; actions.ts:63; balance.json workers). (d) `graderTier` n ≥ 1 → F ≥ grader.tiers[n−1].farm = 18/19/21/22/24 (actions.ts:66, :70). (e) `celebratedMilestones` `grade:20` → F ≥ 15 (minFarm; tracks.ts:33); `balanced:t` → F ≥ balanced[t−1].level = 5/10/15/20/25 (formulas.ts:126). | |
| `hensLevel` (H) | `celebratedMilestones` `hens:L` → H ≥ L (10/20/30, tracks.ts:32); `balanced:t` → H ≥ 5·t. Nothing from F (H can stay 0 while F rises). | balance.json m4.milestones |
| `eggValueLevel` (V) | `celebratedMilestones` `grade:L` → V ≥ L (5/10/20, tracks.ts:33); `balanced:t` → V ≥ 5·t. | balance.json m4.milestones |
| `collectionLevel` (C) | **none** (Saves confirmed) → always 0, a visible loss, so the notice always lists Collection when it is repaired. | best-buy.ts:52, actions.ts:28 (no cap/unlock links) |
- **Excluded bound: F ≥ `eggValueLevel` − 3.** The Egg value cap (formulas.ts:116, capOverFarm 3, balance.json:303) is purchase-only, and migration grandfathers V above F + 3 (M4A-28, worst F0 → V12; migrate-v7.ts:7). `v6BackupId` alone can't tell migrated from new M4 farms (M4-22), so using it could repair **above** the true value. Excluded to honour "never higher".
- **C6 malformed inputs imply no bound:** graderTier must be an integer in 1..tiers.length, celebratedTier an integer in 0..3, a worker entry a known id with an object value, milestones per the regex below; anything else contributes nothing (these fields are not validated today: save.ts:79, :81). Any future capOverFarm increase must note CSR-17 bound (a) in its ADR (a save from a higher-cap build could otherwise repair F slightly high).
- Milestone ids are trusted only if `celebratedMilestones` is an array of strings matching `hens:\d+|grade:\d+|balanced:\d+` with a level present in balance.json; anything else implies nothing (it is not validated today).
- Repair value = max(0, all applicable bounds), integer. Fields that are absent (`k in st` false, e.g. H/V in an unmarked v6 save) are not "bad" and not repaired; migration derives them from the repaired F.

### 17.3 ACs
- **CSR-17-1 QA fixture** `qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json` (v6, farmLevel "abc", coinsCents 7,777,777, hensLevel 18, eggValueLevel 11, collectionLevel 12, celebratedTier 0, workers {}, graderTier 0, celebratedMilestones [], no .bak, no IDB): loads with **coinsCents 7,777,777 ($77,777.77)**, **farmLevel 15** (= 18 − 3; V bound excluded, other bounds 0), every other field byte-equal in state; the CSR-17 notice shows; no fresh farm, no AC14b dialog.
- **CSR-17-2 Three bad fields**: F "abc", H null, V −1, C valid, celebratedMilestones ["hens:10","grade:5"], celebratedTier 2, workers {coop_hand} → F = max(7, 10) = 10 (H bound not used: H was bad), H = 10, V = 5; repaired, notice lists 3 items.
- **CSR-17-3 Four bad fields** → no repair; existing chain (CSR-2) with `save_corrupt` and CSR-9 messages; no `save_repaired`.
- **CSR-17-4 Non-level failure**: one bad level plus `coinsCents: "x"` (or customers not an array, or checksum mismatch) → existing chain, no repair.
- **CSR-17-5 Bounds used and never exceeded**: table-driven over each bound in 17.2 (each alone, and combined → max); property test: for random valid saves, blanking one level field and repairing yields a value ≤ the original. Includes a migrated fixture with V > F + 3 (F0/V12) where F repairs to 0, not 9. Property saves must be release-reachable (generated by action sequences); **debug-panel saves are excluded** (panel.ts:30 `f-` lowers F, dev/QA only, main.ts:120-124).
- **CSR-17-6 corrupt.* copy**: the original bytes are written once via preserveCorrupt with the CSR-7 dedupe and cap 3, before the repaired save is written; quota failure → repair still applies in memory, notice shows, Export available (CSR-14 rules).
- **CSR-17-7 Telemetry**: exactly one `save_repaired {fields: ['farmLevel', …] (LEVEL_FIELDS order), count, version: <stored save version>}`; no values, no bytes. **Plus exactly one** `save_corrupt {reason:'invalid_state', recovered_from:'repair', tried, restored_from_backup:false, had_backup}` (Q-S3 answered: fire both; keeps the CSR-10/15 one-event-per-invalid-main contract). Dashboards that sum restores must add 'repair' to `recovered_from`; CSR-10's enum gains 'repair' when §6 ships.
- **CSR-17-8 Order vs .bak/IDB (C1, 17.6) — no rank check against the corrupt main:** (a) valid .bak with a lower saveSeq than the corrupt main → .bak restored (M1), no repair, no `save_repaired`; (b) valid IDB copy, any saveSeq/savedAt → IDB restored (M1), no repair; (c) IDB bytes identical to the corrupt main are invalid (CSR-3) → with no valid .bak, repair runs; (d) .bak and IDB both invalid or absent (IDB status ok or absent) → repair; (e) IDB unknown + no valid .bak → **CSR-13 defer** (M4 "Try again", no repair write, no save; fake IDB zero puts), regardless of eligibility (C3); (f) not eligible → v6_backup → fresh, as v0.2.3.
- **CSR-17-9 Writes**: only after owns() (CSR-8); none in a read-only/second tab or refused-newer session.
- **CSR-17-10 preTracksRaw (C2):** an unmarked v6 save with a bad F, M4 on → after repair, `preTracksRaw` = the serialized **repaired** v6 file (save.ts:220), so the v6_backup record written at game.ts:206 (from game.ts:61) has `raw` that passes plain `validate()` and contains no bad level; the original bytes exist only in corrupt.*. The migration price-matches from the repaired F. A marked save keeps tracksV7/v6BackupId untouched.
- **CSR-17-11 'repaired' outcome + storageBlocked (C5):** `recoveryOutcome` gains `'repaired'`. With the lease write refused (storageBlocked; dd223f5 main.ts passes `storageBlocked: () => lease.storageBlocked || g.storageFailed` to mountApp): repair applies in memory; preserveCorrupt fails → case-Q semantics, Export takes the original bytes from memory; the CSR-17 notice and the no-storage notice (NO_STORAGE_TEXT) both show. **Proposed queueing (CSR-14/M5 pattern, engineering/decisions.md:52):** the CSR-17 notice first; the no-storage notice is held while it is open and shows when it is dismissed (or on Export). main.ts:102's `recoveryOutcome === null` guard must not suppress the no-storage notice for 'repaired'.
- **CSR-17-12 bakAllowed (Q-S4):** after a repair `bakAllowed = true` (rotation per save.ts:176 only once main validates, i.e. from the second save; it copies the repaired main over an invalid .bak already preserved by CSR-7). **Exception:** if preserving the invalid .bak failed (`copy_failed`), keep `bakAllowed = false`.

### 17.4 Notice (non-blocking) — FINAL copy: art-ux/copy/csr17-partial-repair-copy.md (Art & UX, 2026-10-19 10:15)
- Toast/banner slot shared with CSR-9 (not the AC14b modal); FTUE not blocked; no red, no error codes.
- **Title:** We fixed your save · **Body:** `{list} {was|were} reset. Your coins and everything else are safe.` · **Link:** Export save file (same action and label as CSR-9 M4, ≥ 44px hit area), shown when the original bytes exist.
- **Dismiss:** × button, 44px. Persists until dismissed (or the Export link is used); aria-live="polite", read once.
- **Names, fixed order:** Farm, Hens, Egg value, Collection (NBSP inside "Egg value"); no serial comma; "level" singular for 1 item, "levels" for 2–3.
  | Count | Body |
  |---|---|
  | 1 | Your Hens level was reset. Your coins and everything else are safe. |
  | 2 | Your Hens and Egg value levels were reset. Your coins and everything else are safe. |
  | 3 | Your Farm, Hens and Egg value levels were reset. Your coins and everything else are safe. |
  | 4 | Some of your levels were reset. Your coins and everything else are safe. — **unreachable** (4 bad fields go to the fallback chain, 17.1); kept only as a defensive default. |
- **Copy ACs:**
  - **CSR-17-C1** 1 item (Hens bad) → exactly "Your Hens level was reset. Your coins and everything else are safe."
  - **CSR-17-C2** 2 items (Hens + Egg value) → exactly "Your Hens and Egg value levels were reset. …"
  - **CSR-17-C3** 3 items (Farm + Hens + Egg value) → exactly "Your Farm, Hens and Egg value levels were reset. …" (no serial comma).
  - **CSR-17-C4 Ordering:** names always render Farm, Hens, Egg value, Collection regardless of `save_repaired.fields` order or detection order (e.g. bad {collectionLevel, farmLevel} → "Your Farm and Collection levels were reset."); unit test over all 14 non-empty subsets of ≤ 3, plus the 4-item default via a direct formatter call.
  - **CSR-17-C5 Fit:** the longest 3-item body fits in ≤ 3 lines at 360px (Nunito 14, ≤ 296px). Checked by the UI/Visual Designer with a screenshot.
  - **CSR-17-C6 Behaviour:** × dismisses (44px), notice persists otherwise for the session, polite live region announces once, Export runs the CSR-9 export action.
### 17.5 Writes after repair
- The repaired state is written by Game's load save (game.ts:87) via serialize → new `sum`, saveSeq + 1. bakAllowed per CSR-17-12.

### 17.6 Order (PM decision 09:54 + Saves C1/C3)
Corrupt main → **any valid `.bak` or IDB copy wins, with no rank check against the corrupt main** (if both are valid, CSR-2 tier A picks between them) → else, if IDB is **unknown**, **CSR-13 defer** (HoP APPROVED 07:19, product/decisions.md:297-298): no repair write, because a repaired save gets saveSeq + 1 (save.ts:155) and would outrank a possibly valid unread IDB copy next boot (rankCompare, save.ts:47-51) → else, if eligible (17.1), **repair** → else v6_backup → fresh, as v0.2.3.
- *Rationale:* a valid .bak is lossless apart from about one save interval, while repair lowers levels to implied minimums, which can be a large loss; it also avoids the .bak-overwrite problem.
- *Change vs 09:54:* the earlier clause "IDB unknown → repair still runs with the mirror nulled" is **withdrawn** under C3; IDB unknown follows CSR-13.

### 17.8 Hand-computable repair formulas (for HoQA)
All inputs come from fields that were **valid on load** (a bad field contributes nothing; no chaining). `max()` of an empty set = 0. Constants are from ffc3dfd `src/config/balance.json` and must be re-read from it at build (not hard-coded); maxLevel = 30.

**Lookup tables (inline)**
| Table | Values | Source |
|---|---|---|
| TIER_MIN[celebratedTier] | 0→0, 1→5, 2→10, 3→20 | coopTier, state.ts:52 |
| UNLOCK[worker] | market_hand 3, coop_hand 7, hawker 8, grader 18 | workers.ts:30; balance.json workers.*.unlock_farm, grader.tiers[0].farm |
| GRADER_FARM[graderTier] | 1→18, 2→19, 3→21, 4→22, 5→24 | balance.json workers.grader.tiers[n−1].farm; actions.ts:70 |
| HENS_MS[`hens:L`] | L ∈ {10, 20, 30} → L | balance.json m4.milestones.hens; tracks.ts:32 |
| GRADE[`grade:L`] (V bound, F bound) | 5 → (5, 0), 10 → (10, 0), 20 → (20, 15) | balance.json m4.milestones.grades (level, minFarm); tracks.ts:33 |
| BAL[`balanced:t`] | 1→5, 2→10, 3→15, 4→20, 5→25 | balance.json m4.milestones.balanced; formulas.ts:126 |
| CAP_H | this build's `m4.hens.capOverFarm` (3 in ffc3dfd/dd223f5) — read at runtime, never a literal (C6) | balance.json:199; formulas.ts:115 |

**Input validity (else the term is ignored, never guessed):** celebratedTier integer in 0..3; graderTier integer in 1..5 (0 = no term); a worker counts only if `workers[id]` is a non-null object and id ∈ UNLOCK; milestone ids must match `hens:L`, `grade:L`, `balanced:t` with a key present in the table; H used only if valid (integer ≥ 0, above-max tolerated).

**Formulas**
- `F* = max(0, H − CAP_H, TIER_MIN[celebratedTier], max_w UNLOCK[w], GRADER_FARM[graderTier], max_{grade:L} GRADE[L].minFarm, max_{balanced:t} BAL[t])`
- `H* = max(0, max_{hens:L} L, max_{balanced:t} BAL[t])`
- `V* = max(0, max_{grade:L} GRADE[L].level, max_{balanced:t} BAL[t])`
- `C* = 0`
- Not used (by design): V − 3 for F (grandfathered V, 17.2); F for H/V; C for anything.

**Worked example: OQ-1 fixture** (`qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json`; checksum c9ece8d1 verified). Bad: farmLevel "abc". Valid inputs: H = 18, celebratedTier 0, workers {}, graderTier 0, celebratedMilestones [].
`F* = max(0, 18 − 3, TIER_MIN[0]=0, (no workers)=0, (graderTier 0)=0, (no grade)=0, (no balanced)=0) = max(0, 15, 0, 0, 0, 0, 0) = **15**` ✓. V = 11 is valid but contributes no F term (excluded). coinsCents stays 7,777,777; H 18, V 11, C 12 unchanged. Notice C1-style body: "Your Farm level was reset. Your coins and everything else are safe."

**Named fixtures and expected values** (HoQA to create the F17-* files next to the OQ-1 fixture; valid checksums; no .bak and no IDB unless stated)
| Fixture | Bad fields | Key valid inputs | Expected |
|---|---|---|---|
| OQ1-farmLevel-abc-nobak | F "abc" | H 18, V 11, tier 0, no workers/ms | repair; F 15; coins 7,777,777; fields [farmLevel] |
| F17-3BAD | F "abc", H null, V −1 | tier 2, workers {coop_hand}, ms [hens:10, grade:5] | repair; F max(10, 7) = 10; H 10; V 5; count 3 |
| F17-MIG-V12 | F NaN-string "x" | migrated, H 0, V 12 | repair; F max(0, 0−3) = 0 (not 9) |
| F17-GRADER5 | F "?" | graderTier 5, workers {grader, hawker}, tier 3, ms [grade:20, balanced:4] | F max(24, 18, 8, 20, 15, 20) = 24 |
| F17-H-ONLY | H "" | ms [hens:20, balanced:2] | H max(20, 10) = 20; F unchanged |
| F17-C-ONLY | C −5 | anything | C 0 |
| F17-4BAD | F, H, V, C all bad | — | no repair → CSR-2 chain; no save_repaired |
| F17-NONLEVEL | F "abc" + coinsCents "x" | — | no repair → chain |
| F17-BAK-LOWERSEQ | F "abc" (seq 5) | valid .bak seq 4 | .bak restored (M1), no repair |
| F17-IDB | F "abc" | valid IDB copy (any seq) | IDB restored (M1), no repair |
| F17-IDB-UNKNOWN | F "abc" | IDB status unknown, no .bak | **CSR-13 defer** (M4 Try again), no repair, no save write, zero IDB puts (C3) |
| F17-IDB-SAME | F "abc" | IDB bytes identical to main, no .bak | IDB invalid (CSR-3) → repair, F 15-style formula |
| F17-UNMARKED-V6 | F "abc" | unmarked v6, H/V absent, tier 2, workers {hawker}, M4 on | F max(10, 8) = 10; migration from F 10; v6_backup.raw = repaired v6 (CSR-17-10) |
| F17-MALFORMED | F "abc" | graderTier "5", celebratedTier 9, workers {foo:{}, hawker:1}, ms "hens:20" (string, not array) | every term ignored → F 0; Collection etc. untouched |
| F17-STORAGE | F "abc" | storageBlocked (lease write refused) | repair in memory; CSR-17 notice then no-storage notice (CSR-17-11); Export = original bytes |

**Boundaries (0 / max / max+1, maxLevel 30)**
- H term: H = 0 → 0 (not −3); H = 3 → 0; H = 4 → 1; H = 30 → 27; H = 31 (tolerated above max) → 28.
- celebratedTier: 0 → 0; 3 → 20; 4 (max+1) → term ignored (0 contribution, not an error, no fallback).
- graderTier: 0 → no term; 5 → 24; 6 (max+1) → term ignored.
- Milestones: `hens:30` → H* 30; `hens:31` / `balanced:6` / `grade:15` (unknown ids) → ignored.
- Repaired values are never clamped to maxLevel (they can't exceed it from these tables except via H − 3 with H > 33, which then stays tolerated per the level rule).
- Bad-field count: 1, 3 → repair; 4 → chain (F17-4BAD). 0 → not CSR-17 (save is valid).

**Seeded fuzz (property test)**
- Seeds 1..500 (fixed, listed in the test): play the deterministic sim (balance.json ffc3dfd, M4 on) for a seeded random number of actions to get a valid save S; pick 1–3 of LEVEL_FIELDS (seeded) and replace each with a seeded junk value from {null, −1, NaN-as-string, "abc", 2.5, "", {}, []}.
- Assert: (1) result == oracle (the 17.8 formulas computed independently in the test); (2) every repaired field ≤ its value in S; (3) coins and all non-level fields byte-equal to S; (4) one corrupt.* copy (dedupe/cap per CSR-7); (5) `save_repaired.fields` = the corrupted set in LEVEL_FIELDS order, count = its size, version = 6. 4-field corruptions assert the fallback.
- Include ≥ 50 seeds run through the tracksV7 migration first (grandfathered V) so assertion (2) covers the excluded V − 3 bound.

**.bak / IDB beat repair** — see CSR-17-8 and fixtures F17-BAK-LOWERSEQ, F17-IDB, F17-IDB-SAME, F17-IDB-UNKNOWN.
**Fixture rule:** no debug-panel saves (panel.ts:30); fixtures must be release-reachable.
**Saves cross-check:** Saves recomputed the OQ-1 checksum (`c9ece8d1`), confirmed the save is marked (no migration runs) and that F → 15 is consistent, and that excluding F ≥ V − 3 is correct.

**Not hand-computable (stated honestly)**
- Fuzz expected values come from an oracle, not by hand; each failing seed must be printed with its inputs so it can be hand-checked with the formulas above.
- Assertion (2) "≤ original" is only as sound as the bounds. Saves answered Q-S1: safe in release (only the debug panel lowers F), so it holds for release-reachable saves only; a save from a future build with a higher capOverFarm could repair F slightly high (C6 ADR note).
- Table values are config, not code: if balance.json changes (e.g. a new worker or grader tier), the tables and fixture expectations must be regenerated from it.

### 17.9 Gate status (12:00) — Saves pre-assessment: GO-with-conditions (vs main dd223f5)
**Conditions (all applied in this version, for acceptance at 12:00):**
- C1 any valid .bak/IDB wins, no rank check → 17.6, CSR-17-8 (old 17-8(b) removed).
- C2 preTracksRaw = repaired v6 → CSR-17-10, fixture F17-UNMARKED-V6.
- C3 IDB unknown follows CSR-13 (HoP APPROVED 07:19) → 17.6, CSR-17-8(e), F17-IDB-UNKNOWN (09:54 "repair under IDB unknown" withdrawn).
- C4 opt-in repair in validate at save.ts:218, loadSafe-for-main only; CSR-15 lists the CSR-17 notice → 17.1, CSR-15.
- C5 'repaired' outcome + storageBlocked combined case, queueing proposed → CSR-17-11, F17-STORAGE.
- C6 malformed tier/milestone/worker fields imply nothing; bound (a) uses this build's capOverFarm; Collection → 0 and listed → 17.2, 17.8, F17-MALFORMED.
**Answers recorded:**
- Q-S1 SAFE (Saves): Hens refused at min(max, F + capOverFarm) (actions.ts:34-35), F only rises (actions.ts:31); debug panel can lower F → exclude debug saves from fixtures.
- Q-S2 YES: opt-in repair at save.ts:218 in the single-owner loadSafe (M41-7), plus C2.
- Q-S3 fire both `save_corrupt {recovered_from:'repair'}` and `save_repaired` (CSR-17-7).
- Q-S4 MOOT: bakAllowed = true after repair unless the corrupt.* copy of the .bak failed (CSR-17-12).
- Q-S5 resolved by the PM order (17.6).
- Q-Q1 OQ-1 fixture F = 15 confirmed by PM hand-calc (17.8) and Saves.
**Effort / cut rule:** ~11.5 h on top of M41-7 (Saves' own share ~9 h; table in the Saves review §5: validate split + bounds 3, loadSafe step + preTracksRaw + telemetry + bakAllowed 2, unit + property tests 3, review fixes 1, UI toast/Export ~1.5, rc0 fixture ~1). **Cut to M4.2** (v0.2.3 ships without §6) if M41-7 isn't green by ~15:00, or if C1–C6 aren't accepted at 12:00. Must not put the 17:15 handoff at risk (D-HOP-30).
**Still open:** HoQA testability sign-off at 12:00 (Q-Q2 property test as the "never exceeded" proof; create the F17-* fixtures); HoP/Saves acceptance of the C5 queueing proposal; UI/Visual Designer 360px fit (CSR-17-C5).
