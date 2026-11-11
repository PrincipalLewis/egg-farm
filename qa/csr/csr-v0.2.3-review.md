# CSR v0.2.3 testability review: corrupt-save recovery with no valid .bak
HoQA / QA Engineer, Saves & Release Verification · 2026-10-19 ~10:00 CEST · for Head of QA (12:00 gate; due 11:45)
Status: **REVIEW. Testability only.** No product or engineering position. Head of QA owns the verdict.

## 0. What was reviewed, and provenance
- **Spec:** product/farm/corrupt-save-recovery-spec.md. At 09:54 PM bumped the file to **v0.3** (header "v0.3 DRAFT"; §6 CSR-17 added). Line 4 says "v0.2.3 = this file minus §6 and this line".
  - Snapshot of v0.3 as read: `qa/csr/spec-v0.3-snapshot-0954.md`, sha256 `7eaa7a7b43b946e9a34566d4a156a2bb8738449def14764467077248942c06c7`.
  - Baseline I reviewed: `qa/csr/spec-v0.2.3-reconstructed.md` (v0.3 minus lines 4–5 and §6), sha256 `c335507899ac940f8d4de24db6239b2bf00f3248ab44efadfe166481d6cde622`. It matches what I read at 09:52 from the pre-bump file: §2 CSR-1…CSR-16 text unchanged, 88 lines plus 1 trailing blank.
  - **Version note:** before the bump the header read "v0.2 DRAFT", but the changelog's top entry was v0.2.3 (08:0x) plus a "v0.2.3 fix (no bump, 08:1x)". That file's mtime was 07:21, which looks wrong next to 08:xx changelog entries. Content = v0.2.3 + fix. Suggest PM fix the header so the shipped baseline carries an unambiguous version string.
- **Later change (10:03 snapshot `qa/csr/spec-v0.3-snapshot-1003.md`, sha256 `9f3fe7e6…`):** v0.3 now **edits v0.2.3's CSR-15** to read "(M1–M5, or the CSR-17 repair notice when §6 ships — C4)". That contradicts line 4's "No v0.2.3 AC changes" and "minus §6 restores v0.2.3 exactly". The edit is conditional on §6, so the shipped-without-§6 baseline is unaffected, but PM should keep v0.2.3 byte-recoverable (or name the CSR-15 delta). This review is against the 09:54-derived baseline above.
- **Code:** main = **dd223f5** (origin/main; merge #41, QA PASS 246de09).
  - The spec cites ffc3dfd/c11e3a0 lines. I checked: `git diff c11e3a0 dd223f5 -- src/save src/game.ts src/ui/save-recovery.ts` is **empty**. The `src/main.ts` / `src/ui/app.ts` diffs touch only the explainer `storageBlocked` arg (#EXP1). So every `save.ts`/`idb-mirror.ts`/`game.ts` line ref in the spec holds at dd223f5. I spot-checked save.ts:205-208/:218/:223/:241-250/:267-292, idb-mirror.ts:95-117 and main.ts:72-109.
  - Code copy used: `qa/csr/src-dd223f5/` (git show) plus a full `git archive dd223f5` at `qa/csr/tmp-dd223f5/` (node_modules symlinked to my own wt-l30plus).
- **Probe (vitest, 2 workers, no browser):** `qa/csr/tmp-dd223f5/tests/csr-probe.qa.test.ts`, **41/41 passed** at 09:57 CEST. Output: `qa/csr/probe-out.json`. It records today's behaviour per fixture, plus a hand-rule oracle for CSR-17 (used in the GO/NO-GO doc).
- **Fixtures crafted:** `qa/csr/fixtures/` (33 files, `SHA256SUMS`, `sha256sum -c` all OK). Generators are `make-fixtures.mjs` and `make-fixtures-q1.ts`.

## 1. AC table (v0.2.3 §2: 25 ACs incl. sub-ACs)
Legend: Testable = yes / partly / no. Methods: **U** = vitest unit (KV stub + fake IDB + fake clock); **B** = browser per engine (Chromium/Firefox/WebKit, dist-qa, own ports 5961–5964, browser lock); **M** = manual/visual. Existing coverage is for *today's* behaviour that the AC builds on. No CSR AC is implemented yet, so no existing test asserts any CSR AC as written.

| AC | Paraphrase | Testable | Why / caveat | Method | Existing coverage | Fixture needed (exists?) | Engines |
|---|---|---|---|---|---|---|---|
| CSR-1 | Recovery triggers on any validate() failure incl. sanitizeLevel; main missing + bad .bak; newer copy never enters recovery; v6_backup v>6 = invalid(version) | **yes** | Reasons are enumerable (save.ts:197). Probe confirms each fixture's reason today. **Gap G1:** an IDB-only corrupt copy (no LS main, no .bak) matches neither trigger (see §3) | U | tests/save-level-tolerance.test.ts, save-hardening.test.ts, qa/m3-scripts/gate4-sanitize.qa.test.ts | L1–L6, N1–N5, S1–S3, OQ-1 (**exist**, qa/csr/fixtures); v6_backup raw with version 7 (**missing**) | U only |
| CSR-2 | Order: tier A (.bak vs IDB by rankCompare, tie→.bak) → v6_backup → fresh; full matrix | **yes** | Matrix is finite: {bak,IDB,v6b}×{valid,invalid,absent} = 27, plus IDB {unavailable,absent}, plus 3 rank cases ≈ 40 cases. Needs a fake IDB with `status` injection (loadSafe signature changes per OQ-7) | U (table-driven) | idb-mirror.test.ts (pickNewest/rankCompare only) | P1 (.bak F20), P2 (IDB F17) (**exist**); valid/invalid **v6_backup records** for a marked save (**missing**; U1 v6_backup exists for unmarked); rank-tie pair (**missing**) | U; 1 B smoke per engine for real IDB |
| CSR-3 | Corrupt LS + valid IDB = recovery (preserve, M1, save_corrupt{idb}); IDB bytes identical to main = invalid | **yes** | Probe confirms today's B1 silent restore: reconcile→'idb', recovery null, no dialog, corrupt copy kept (1) | U + B | idb-mirror.test.ts (reconcile today) | OQ-1 main + P2 IDB (**exist**) | C/F/W (real IDB) |
| CSR-4 | v6_backup tier decoded, validated, migrated via normal startTracksMigration with all M4A rules; "no shortcut code" | **partly** | "No shortcut code" is a code-review statement, not observable | U + B (commit, read-back) | m4a-v3-backup.test.ts, hidden-save-paths.test.ts (decode/commit today) | Unmarked v6 raw in v6_backup with corrupt main (U1 + U1.v6_backup **exist**); a valid marked-save v6_backup with corrupt main and .bak (**missing**) | C/F/W for commit |
| CSR-5 | v6_backup replaced only by committed migration; byte-identical on defer/abort; never deleted by recovery | **yes** | Byte compare of the key before/after. Explainer "re-shows — accepted" is a note, not an AC (see A3) | U | m4a-v3-backup.test.ts | as CSR-4 + defer/abort KV stub (quota-failing KV) | U |
| CSR-6 | Fresh only when A and B all invalid/absent and IDB not unavailable; M3 + save_corrupt{none} | **yes** | Today's fresh path observed (OQ-1) | U + B (M3 copy) | save-hardening.test.ts, qa/m3-scripts/oq1-nobak.mjs | OQ-1 (**exists**) + bad .bak + bad v6_backup (**missing**) | C/F/W |
| CSR-7 | Each invalid main/.bak/IDB preserved once, deduped, ≤3, v6_backup never copied, oldest-first eviction, nothing else deletes corrupt.* | **partly** | Dedupe/cap/eviction are unit-testable. "No other path deletes corrupt.*" is a code-review/grep claim (true at dd223f5: RESET_KEYS has no corrupt.*). "≤ 3 per boot" vs a global CORRUPT_KEEP=3 is ambiguous (A2) | U + grep | save-hardening.test.ts, save-majors-2959ba0.test.ts | 3 distinct bad copies + 2 pre-existing corrupt.* entries (**missing**, trivial) | U |
| CSR-8 | Recovery writes only after lease.claim + owns(); losing tab writes nothing | **yes** | Byte-identical key snapshot on the losing tab | U (two Game/lease instances on one KV) + B optional | save-durability-v4.test.ts, tab-guard-tg.test.ts | OQ-1 + P2 (**exist**) | U; B two-tab optional |
| CSR-9 | M1–M5 copy per art-ux/copy/csr9-recovery-copy.md; 1 title/line/button ≥48 px; link only when corrupt copy exists; calm icon, no red/triangle/codes | **partly** | Strings and structure: U/DOM. ≥48 px: B per engine. "Calm icon, no red, no warning triangle" is visual: M (or a computed-colour assert) | U + B + M | save-recovery-v21.test.ts (today's AC14b copy) | one fixture per M1–M5 (OQ-1, P1/P2 combos **exist**; M2 v6_backup **partly**; M4 defer, M5 storageBlocked need KV/IDB stubs) | C/F/W |
| CSR-9a | M2 variant priority level → time → fallback; prevLevel derivation | **yes** | Pure function of (corrupt main bytes, .bak bytes, restored raw, clock) | U | none | see 9a-1..4 | U |
| CSR-9a-1 | main JSON F17, v6_backup F12 → "…from Farm level 12." | **yes** | | U | none | **missing**: main F17 made invalid by a non-level field (e.g. N1-style coins −5) + v6_backup raw F12 | U |
| CSR-9a-2 | main unparseable, .bak (invalid elsewhere) farmLevel 15 → level variant | **yes** | "invalid elsewhere" is undefined (A4) | U | none | **missing**: truncated main + .bak F15 with bad checksum | U |
| CSR-9a-3 | main & .bak unparseable/absent → age variant from v6_backup savedAt; fallback if savedAt invalid | **yes** | | U (fake clock) | none | **missing**: v6_backup raw with valid / invalid savedAt | U |
| CSR-9a-4 | farmLevel 12.5 / null / −1 / "17" rejected for prevLevel; 31 with max 30 accepted | **yes** | "NaN-producing" can't be stored in JSON (it serialises to null); use `null` and `1e309` (→ Infinity) | U | none | L1/L2/L3 shapes (**exist**; reuse as main bytes), 12.5, "17", 31 (**missing**, trivial) | U |
| CSR-9b | {age} formatter + boundaries + singulars | **yes** | Pure formatter. Negative/future age unspecified (A5) | U | none | none (clock only) | U |
| CSR-9c | Explainer may show after M2; queued behind dialog; never on M5 | **no** (for this release) | Marked "post-freeze M4 work, NOT part of B"; "may" is not assertable (A3) | (B later) | m4-exp1-explainer.test.ts (today's explainer) | — | — |
| CSR-10 | save_corrupt fields recovered_from/tried/restored_version/migrated; notice shown/dismissed; save_restore only for stale-LS; no bytes | **yes** | Snapshot via telemetry store / eggfarmExportTelemetry. "No save bytes" = scan payload for `"state"` / `sum` | U + B (flush) | save-hardening.test.ts (save_corrupt today) | reuse CSR-2 matrix | U; B 1×/engine |
| CSR-11 | All 3 sources invalid → preserved (≤3, deduped), v6_backup untouched, fresh, M3, tried lists 3 invalid | **yes** | | U | none | OQ-1 + bad .bak + bad IDB + bad v6_backup (**missing** bundle) | U |
| CSR-12 | IDB absent → skipped; LS read throws → storage outcome, no autosave over unread data | **partly** | Throwing KV is unit-testable. Real private mode differs per engine (WebKit private, Firefox PB IDB): B/M | U + B/M | hidden-save-paths.test.ts, idb-mirror.test.ts (SecurityError) | throwing-KV stub (**missing**, code-only) | W private, F private |
| CSR-13 | IDB unknown + valid .bak → restore, mirror=null; + bad .bak → DEFER (no writes, M4); time bounds | **yes** | Fake IDB with blocked/timeout/read error. "No extra waiting ≤ ~4.8 s" needs fake timers (U) | U (+B timing smoke) | idb-mirror.test.ts (openForBoot statuses) | OQ-1 + P1 (**exist**) + fake IDB | U |
| CSR-13a | fake IDB unknown + valid .bak → zero puts after ≥1 save | **yes** | | U | none | as CSR-13 | U |
| CSR-13b | defer with quota-failing KV → M4, no other key changed | **yes** | | U | none | quota KV stub | U |
| CSR-14 | preserveCorrupt quota → Q; restored + storageBlocked → M5; notice deferred while dialog open; LS write fail → play from memory | **yes** | Today main.ts:102 shows Restored without Can't-save when storageBlocked (confirmed in code) | U + B | save-durability-v4.test.ts, save-recovery-v21.test.ts | quota KV + lease refusal stub | C/F/W for notice order |
| CSR-15 | No silent zero: any boot with non-null invalid main ends with M1–M5 + save_corrupt; property test over validate() mutations | **partly** | Mutation domain and generator are unspecified (A6). Scope excludes IDB-only corrupt (G1). Must be amended if CSR-17 ships (its notice is not M1–M5) | U (property) | qa/m3-scripts/gate4-sanitize.qa.test.ts (example-based) | all L/N/S fixtures (**exist**) as seeds | U |
| CSR-16 | .bak rotation unchanged (fresh waits for progress; restore rotates) | **yes** | | U | save-hardening.test.ts, hidden-time.test.ts (bakAllowed) | OQ-1, P1 (**exist**) | U |

**Count:** 25 ACs. **19 testable**, **5 partly** (CSR-4, -7, -9, -12, -15), **1 not testable this release** (CSR-9c).

## 2. Ambiguities and suggested rewrites
- **A1 (CSR-1 / CSR-15, gap G1) IDB-only corrupt copy.** The case is: LS main missing, no .bak, IDB main invalid. Today: reconcile → 'ls' (idb-mirror.ts:97), loadSafe → `{file:null, recovery:null}` (save.ts:277) → **silent new game**; nothing is preserved (probe `idbOnlyCorrupt`).
  - The corrupt IDB copy outranks the fresh save (saveSeq 5 > 1), so mirror writes are skipped until the fresh farm passes it. After that the IDB bytes are overwritten without ever being copied to corrupt.*.
  - *Rewrite:* "CSR-1: … or main is missing and any of .bak / IDB main is present and invalid → recovery (preserve, then the order in CSR-2). CSR-15: '…where any stored copy (main, .bak, IDB main) was non-null and invalid…'."
- **A2 (CSR-7) "≤ 3 per boot"** vs `CORRUPT_KEEP = 3` overall with oldest-first eviction. A boot that preserves 3 copies evicts every older corrupt.* entry. *Rewrite:* "At most 3 corrupt.* entries exist after any boot (oldest evicted first); a single boot preserves at most 3 distinct byte strings."
- **A3 (CSR-5 vs CSR-9c)** CSR-5 says the explainer re-show is "accepted"; CSR-9c says it "may" show and is not part of B. *Rewrite:* "In this release the explainer is not asserted after M2 (CSR-9c, deferred); CSR-5 asserts only the v6_backup bytes."
- **A4 (CSR-9a-2) ".bak bytes (invalid elsewhere)"**. *Rewrite:* ".bak = valid JSON with farmLevel 15 and a checksum mismatch".
- **A5 (CSR-9b)** Behaviour when restored savedAt > load clock (within the 2-min skew) is unspecified. Game turns a future savedAt into NaN (save.ts:187, game.ts:52), which suggests the fallback. *Add:* "age < 0 or savedAt invalid → fallback variant 3."
- **A6 (CSR-15) "property test over validate() mutations"**. *Rewrite:* "For each of N=500 seeded mutations of fixtures M1-midgame-L18 / OQ-1 base (field deletion, type swap, null, −1, 1e309, string junk, truncation at random offset, 1-char flip — checksum kept consistent for half of them), the boot ends with a non-null recoveryOutcome (or the CSR-17 notice) and exactly one save_corrupt. Seed logged."
- **A7 (CSR-4) "No shortcut code".** *Rewrite:* "The v6_backup restore reaches `startTracksMigration` (spy) and emits the same migration telemetry as a normal pending boot."
- **A8 (CSR-9) visual rules.** *Rewrite:* "rc-badge class is `ok`/`new` (never `warn`) for M1–M3; no element with a red computed colour; no '⚠'." That makes it a DOM assert instead of manual.
- **A9 (§0 facts vs observation).** §0 bullet "Player message today … **conflicts with D-HOP-18's 'no message'**", OQ-1 remainder (§3) and the D-HOP-18 07:12 line "Today (ffc3dfd): fresh farm … no message" all describe the sanitizeLevel fresh path as silent. **That is wrong.** The dialog fires (see §4). Only the B1 IDB path (and G1) is silent.
- **A10 (N5, observation)** `workers: []` passes validate (`typeof [] === 'object'`, save.ts:224). Probe: loads fine. Not a CSR AC, but if CSR-17's "any non-level failure → chain" relies on validate, an array `workers` is never caught. *Suggest:* `Array.isArray(s.workers)` → invalid_state (Saves call; the backlog is fine).

## 3. Missing fixtures (exact list to craft)
Already crafted (qa/csr/fixtures, sha256 in SHA256SUMS): L1–L6, C1–C3, M3, M4, N1–N6, S1–S3, U1 (+ v6_backup), P1–P4, Q1i, Q1ii×6.
Still needed (all small JSON or stub work, ≈ 2–3 h total):
1. Marked-save **v6_backup record** pair: a valid record `{migrationId=live v6BackupId, raw=valid v6}` and an invalid one (`raw` checksum flip; `raw` version 7 → CSR-1 "invalid(version)"; non-16-hex migrationId → decodeBackup null).
2. CSR-11 bundle: OQ-1 main + bad .bak (S1 shape) + bad IDB (L2 shape) + bad v6_backup (item 1 invalid).
3. CSR-9a-1: main JSON F17 invalid via coinsCents −5 + v6_backup raw F12 (savedAt T−1 d).
4. CSR-9a-2: truncated main + .bak F15 with checksum mismatch.
5. CSR-9a-3: v6_backup raw with valid savedAt, and with savedAt null / pre-2020 / future.
6. CSR-9a-4 extras: farmLevel 12.5, "17", 31 (maxLevel 30).
7. Rank-tie pair for CSR-2: .bak and IDB with identical rank and savedAt (tie → .bak).
8. IDB-identical-to-main pair (CSR-3/CSR-7 dedupe).
9. Two pre-existing corrupt.* entries plus an index (CSR-7 eviction).
10. Stubs (code, not JSON): fake IDB with `status ∈ {ok, absent(no_global|security), unknown(idb_blocked|idb_timeout|idb_read_error)}` and a put counter; quota-failing KV; read-throwing KV; lease stub with owns()=false.

## 4. OQ-1 status
- **Spec v0.2.3 says:** §3 "OQ-1 remainder: confirm with the fixture that the sanitizeLevel path is the **silent** fresh farm (and/or B1 silent IDB restore)". §4 "Resolved: OQ-1 (partial) … silent fresh farm comes from the sanitizeLevel path".
- **Observed (my run at c11e3a0, Chromium dist + dist-qa, qa/m3-recheck/oq1-corrupt-level-nobak.md). The load/recovery code is identical at dd223f5 (diff empty, §0). The dd223f5 unit probe reproduces it:**
  - validate → `invalid_state`.
  - loadSafe → case **F**, outcome `fresh`; the **AC14b dialog fires** ("A fresh start" / "We couldn't open your farm. Your old save is kept safe." / Start farming + Export old save).
  - `save_corrupt {reason:'invalid_state', had_backup:false, restored_from_backup:false}` fires (game.ts:68).
  - Corrupt bytes are kept in corrupt.<ts> (1 entry).
  - Then a fresh farm with **0 coins**, all levels 0. The $77,777.77 / C12 / H18 / V11 farm is lost to the player except via Export.
- **So:** the sanitizeLevel path is **not silent**. It is a *loud* total loss. The silent paths are **B1** (corrupt LS + valid IDB → silent restore, confirmed by the probe; CSR-3 addresses it) and **G1** (IDB-only corrupt → silent new game, *not addressed* by v0.2.3; A1).
- **Status:** the OQ-1 remainder can be **closed as "confirmed: not silent; data loss"**. Its loss case is **addressed only by CSR-17** (v0.3 §6). Under v0.2.3 alone, OQ-1 with no .bak/IDB/v6_backup still ends in M3 + fresh farm, now with the M3 copy and `recovered_from:'none'`. CSR-17-1 makes this exact fixture its primary AC (coins kept, F15).
- *Action for PM (via HoQ):* fix §0, §3/§4 and the D-HOP-18 "no message" line as in A9, and add G1.
