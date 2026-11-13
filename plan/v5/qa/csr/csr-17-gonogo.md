# CSR-17 field-level level repair: DRAFT GO/NO-GO (testability)
HoQA / QA Engineer, Saves & Release Verification · 2026-10-19 10:0x–10:1x CEST · for Head of QA. **DRAFT. Head of QA issues the verdict** (gate 12:00, D-HOP-30).

## Provenance
- **Spec:** product/farm/corrupt-save-recovery-spec.md **v0.3 §6** changed twice while I was reviewing it:
  - 09:54 snapshot `qa/csr/spec-v0.3-snapshot-0954.md` (sha256 `7eaa7a7b…2c06c7`; ACs 17-1..9).
  - **10:03 snapshot `qa/csr/spec-v0.3-snapshot-1003.md` (sha256 `9f3fe7e657f4d0965289bbb30de6c50dab61b75289898f59e403abdbb753ad61`; file mtime 09:58).** It adds ACs 17-10..12, copy ACs 17-C1..C6, the §17.8 formulas/tables/fixtures/fuzz and the §17.9 Saves conditions C1–C6. **This draft is against the 10:03 snapshot.**
  - Its changelog entries are labelled "10:1x / 10:2x / 10:3x", which is later than the box clock (10:03). Treat those labels as approximate.
  - **The spec should be frozen (sha recorded) at the 12:00 gate.**
- **Code:** main dd223f5. Load/recovery code is identical to the ffc3dfd/c11e3a0 refs (csr-v0.2.3-review.md §0). Saves' refs rankOf save.ts:41-45, game.ts:87 load save and app.ts:517-520 were checked and are correct.
- **Unit evidence (vitest, 2 workers, no browser):**
  - `tmp-dd223f5/tests/csr-probe.qa.test.ts`: 41/41 → `probe-out.json`. Today's behaviour per fixture plus a §17.2 oracle.
  - `tmp-dd223f5/tests/csr17-f17.qa.test.ts`: 11/11 → `probe-f17-out.json`. It is a **literal implementation of §17.8's formulas and "Input validity" paragraph**, run against §17.8's own named-fixture table, plus defect probes.
  - Both oracles are QA test code, not product code.
- **Fixtures:**
  - `qa/csr/fixtures/` (33 files + `SHA256SUMS`).
  - `qa/csr/fixtures/f17/`: the 17 §17.8 F17-* files + `SHA256SUMS`. §17.8 asks for them "next to the OQ-1 fixture"; per my brief they're under qa/csr. Moving or copying them is HoQ's call.
  - Generators: `make-fixtures.mjs`, `make-fixtures-q1.ts` and `make-fixtures-f17.ts`. The last two use dd223f5's own `checksum` and `migrateStoredTracksV7`.
  - **Cross-check:** every regenerated "abc" main (F17-BAK-LOWERSEQ/IDB/IDB-UNKNOWN/IDB-SAME/STORAGE) is **byte-identical to the OQ-1 fixture (sha256 7dea4a43…3416ed)**, and F17-3BAD is byte-identical to Q1i (`f9830c4b…`).

## 0. Draft recommendation
**GO-WITH-CONDITIONS (DRAFT).**
- The repair rule is precise enough to compute **L15 by hand** for OQ-1 (§1), and §17.8 now carries its own worked example that matches mine.
- My literal oracle reproduces **every** expected value in §17.8's named-fixture table. Where an input was left open, I chose a value (Q2 below).
- My earlier pre-build blockers are now **resolved in the 10:03 text** via Saves' C1–C6:
  - repair is opt-in and loadSafe-only, so plain validate stays strict (17.1 C4);
  - bound (a) uses this build's capOverFarm (17.2 C6);
  - malformed inputs imply nothing (C6);
  - preTracksRaw = repaired v6 (CSR-17-10);
  - Q-S3: fire both events, and CSR-15/CSR-10 are amended.

**Remaining conditions.** Q1–Q4 are small spec edits that should be in before the build. Q5–Q7 can land with the build. **If Q1–Q3 aren't accepted at 12:00, my draft turns to NO-GO → M4.2** under Saves' cut rule.
- **Q1. Fuzz junk set defect (§17.8).** `2.5` is **not** bad: sanitizeLevel floors finite numbers ≥ 0 (save.ts:206). Probe: of {null, −1, "NaN", "abc", 2.5, "", {}, []}, only `2.5` is not bad. A fuzz case that injects 2.5 produces a *valid* save with a changed level, so assertions (1)/(2)/(5) fail spuriously or get loosened. *Fix:* replace `2.5` with the string `"2.5"`, and add `1e309` (raw-text token → Infinity) and `true`.
- **Q2. Pin the open inputs in the named-fixture table.**
  - **F17-MALFORMED** expects F 0 but doesn't fix hensLevel. With the OQ-1 base (H 18) the oracle gives **15**, not 0. I chose **H 3** to get 0.
  - **F17-GRADER5** expects 24 only if H ≤ 27. I chose a release-reachable F25/H22/V21.
  - **F17-H-ONLY / C-ONLY / UNMARKED-V6:** I chose the OQ-1 base with F18 (+ V12 for H-ONLY; unmarked: tier 2, hawker).
  - *Fix:* the table states every bound-source field, or names my files (sha256 in f17/SHA256SUMS) as the canonical inputs.
- **Q3. Observation point for "byte-equal".** CSR-17-1 ("every other field byte-equal in state") and fuzz assertion (3) hold at **loadSafe's returned state, and in the persisted main right after the game.ts:87 load save**, with clock ≤ savedAt + 59 s. They do **not** hold at Game/UI level:
  - The offline grant changes `pendingOfflineEggs` (probe, +2 h).
  - On the OQ-1 fixture (celebratedTier 0, milestones [] while F is repaired to 15), the first render dispatches `markCelebrated` → tier 2 with a "Coop upgraded!" toast (app.ts:519-521). It also queues milestone toasts for hens:10, grade:5, grade:10, balanced:1 and balanced:2 (app.ts:525).
  - *Fix:* state the observation point. Add an AC that the CSR-17 notice and these toasts share the slot in a defined order (17.4 says "slot shared with CSR-9" but doesn't order it against milestone toasts).
- **Q4. Make 17.8 normative.** The CSR-17-5 AC text still says only "property test: blanking one level field ≤ original". It should say "per §17.8: named-fixture table, boundaries, seeded fuzz seeds 1..500 with assertions (1)–(5)".
  - In the fuzz generator, "balance.json ffc3dfd" → **the build under test**.
  - "A seeded random number of actions" → a named policy (the AC7 bot, seeded stop tick), so saves are reachable and not mostly no-ops.
  - The "fixtures must be release-reachable" rule applies to **property/fuzz saves only**. F17-MALFORMED, -4BAD and -NONLEVEL are deliberately unreachable defensive fixtures.
- **Q5. Precedence gap (HoQ (d)).** No AC asserts that a **valid v6_backup does not beat an eligible repair** (17.6 puts repair before v6_backup). *Add* CSR-17-8(g): OQ-1 + a committed valid v6_backup record → repair, record byte-identical, `recovered_from:'repair'`.
- **Q6. CSR-17-11 queueing** is still "proposed", pending HoP/Saves. It's testable once accepted (browser, per engine).
- **Q7. Schedule.** QA execution is about **21 h** (§3), 4 h of it browser across 3 engines. It must come **after** the 17:15 M41-2 handoff (D-HOP-30). If the M4.1 RC needs CSR-17 sign-off sooner than about 2 QA-days after the build, cut it to M4.2 (Saves' cut rule: M41-7 green by ~15:00).
- **Out of CSR-17 scope, but still open in v0.2.3** (csr-v0.2.3-review.md A1/G1):
  - An **IDB-only corrupt copy** (no LS main) is a **silent new game** today, and its bytes are never preserved (probe `idbOnlyCorrupt`).
  - A **newer bad IDB copy** with a valid LS is never preserved (probe `newerBadIdb`).
  - Neither CSR-1/CSR-15 nor CSR-17 covers these.

## 1. KEY CHECK: compute L15 by hand from the spec text (10:03 snapshot)
Fixture `qa/m3-recheck/oq1/OQ1-farmLevel-abc-nobak.json` (sha256 `7dea4a432f643ad367a34b43428265131a67b7f3a924112156fd9711173416ed`):
- Header: version 6, savedAt 1792378780000, saveSeq 5, sum `c9ece8d1`.
- State: coinsCents 7777777, collectionLevel 12, farmLevel **"abc"**, hensLevel 18, eggValueLevel 11, celebratedTier 0, workers {}, graderTier 0, celebratedMilestones [], customers [], coop 0, basket 55, tracksV7 1, v6BackupId 00112233aabbccdd.

| Step | Spec text used | Fixture value | Result |
|---|---|---|---|
| 1 Eligibility | §17.1: parses; version 1..6 integer; state object; checksum matches when present | v6; FNV-1a(JSON(state)) = c9ece8d1 = sum. Probe: validate reason `invalid_state`, not `checksum`. PM and Saves recomputed it too | passes pre-level checks |
| 2 Bad fields | §17.1/17.2: sanitizeLevel null on 1–3 of LEVEL_FIELDS | "abc" fails `/^\d+$/` (save.ts:206); C 12, H 18, V 11 pass | bad = {farmLevel}, 1 → eligible |
| 3 Order | §17.6: no valid .bak/IDB; IDB not unknown → repair | no .bak, no IDB (status ok/absent) | repair branch |
| 4 Term H − CAP_H | §17.8 `F* = max(0, H − CAP_H, …)`; CAP_H = this build's m4.hens.capOverFarm | H 18 valid; CAP_H = 3 (balance.json:199 ← CSV c7bb783f `hens_cap_over_farm` = 3 on every row, via sync-economy.ts:168) | **15** |
| 5 TIER_MIN | 0→0, 1→5, 2→10, 3→20; integer 0..3 | 0 | 0 |
| 6 UNLOCK | max over valid worker entries | {} | 0 (max ∅ = 0) |
| 7 GRADER_FARM | graderTier 1..5; 0 = no term | 0 | 0 |
| 8 GRADE minFarm / BAL | from celebratedMilestones | [] | 0 |
| 9 Excluded | "Not used: V − 3 for F" | 11 − 3 = 8 ignored | — |
| 10 Value | max(0, 15, 0, 0, 0, 0, 0) | | **farmLevel = 15** ✓ |
| 11 Post-check | §17.1: unchanged :219-:229 path after repair | marked → no migration; coins/coop/basket finite ≥ 0; customers []; workers {} | passes → coins **7,777,777 ($77,777.77)** kept |

- **No CSV cost table is needed.** The rule uses no cost column. The only economy input is `hens_cap_over_farm` (3).
- The spec's own worked example in §17.8 gives the same F* = 15. Both oracles reproduce it.
- **Key check: PASS. L15 is exactly derivable from the spec alone.**
- Caveat: OQ-1 doesn't exercise the V-exclusion (max(15, 8) is also 15). Only F17-MIG-V12 / Q1ii do: F 0, not 9.
- §17.8 table vs my literal oracle (`probe-f17-out.json`):

| Fixture | Spec expects | Oracle | Note |
|---|---|---|---|
| F17-3BAD (= Q1i) | F 10, H 10, V 5 | 10/10/5 ✓ | |
| F17-MIG-V12 | F 0 | 0 ✓ | |
| F17-GRADER5 | F 24 | 24 ✓ | needs H ≤ 27 (Q2) |
| F17-H-ONLY | H 20 | 20 ✓ | |
| F17-C-ONLY | C 0 | 0 ✓ | |
| F17-UNMARKED-V6 | F 10 | 10 ✓ | |
| F17-MALFORMED | F 0 | 0 ✓ **only with H ≤ 3** | H 18 → 15 (Q2) |
| F17-IDB-SAME | F 15 | 15 ✓ | |
| F17-4BAD | no repair | 4 bad ✓ | |

## 2. Per-AC table (10:03: CSR-17-1..12 + copy ACs 17-C1..C6 = 18)
Methods: **U** = vitest (KV stub; fake IDB with status + put counter; fake clock; lease stub); **B** = browser per engine (Chromium/Firefox/WebKit, dist-qa, own ports 5961–5964, browser lock). Effort is QA hours once the build exists.

| AC | Testable | Method | Fixture (sha256 prefix) | HoQ Q-Q2 | Effort |
|---|---|---|---|---|---|
| 17-1 OQ-1 → coins kept, F15, others byte-equal, notice, no AC14b | **partly**: observation point (Q3) | U (loadSafe state + persisted main + events) + B ×3 (notice, no `.recovery-layer`, FTUE not blocked, Export) | OQ-1 `7dea4a43` | (a) ✓ | 2.5 |
| 17-2 three bad → F10 H10 V5, 3 items | **yes** | U | F17-3BAD / Q1i `f9830c4b` | (a) ✓ | 0.5 |
| 17-3 four bad → chain, no save_repaired | **yes** | U | F17-4BAD `4d8d5884`; M4 `8503f077` | — | 0.5 |
| 17-4 non-level failure → chain | **yes** | U | F17-NONLEVEL `7414907f`; N4 `3b2aa41a`; S1 checksum `f76e8eb8`; N6 `707bcd7a` | — | 0.5 |
| 17-5 bounds + never exceeded (+ §17.8) | **partly**: fuzz junk defect (Q1), generator/normative text (Q4) | U table + U boundaries + U seeded fuzz (500 seeds, ≥ 50 migrated) | F17-* set, Q1ii F0/F4/F6 (`4122e158`, `99309925`, `99d5f8e0` + valid controls) | (a)(b)(c) ✓ once Q1/Q4 are fixed | 5.5 |
| 17-6 corrupt.* once, before repaired write; quota → in-memory | **yes** | U (quota KV) | OQ-1 | — | 1 |
| 17-7 save_repaired + save_corrupt{repair} exactly once each | **yes** | U + B 1×/engine (flush via eggfarmExportTelemetry) | OQ-1, F17-3BAD; v5 save with a bad level for `version` (**to craft**, 0.25 h) | — | 0.5 |
| 17-8 (a)–(f) order, no rank check; IDB unknown → defer | **yes** | U | (a) F17-BAK-LOWERSEQ + `.bak` `ccab155e`; (b) F17-IDB + `.idb` `a9f1d8d6`; (c) F17-IDB-SAME (+ `.idb`, both `7dea4a43`); (d) OQ-1 + S1 as .bak + L2 as IDB; (e) F17-IDB-UNKNOWN + fake IDB unknown; (f) N6 | (d) ✓; **missing v6_backup (Q5)** | 2 |
| 17-9 writes only after owns(); none in 2nd tab / refused-newer | **yes** | U | OQ-1; S3 version 7 `35f302b8` (probe: refused, nothing written) | — | 1 |
| 17-10 preTracksRaw = repaired v6; v6_backup.raw validates | **yes** | U + B ×1 (commit + read-back) | F17-UNMARKED-V6 `76ed3f92`; U1 `434bc4b1` (+ `.v6_backup` `67c15156`) | — | 1.5 |
| 17-11 'repaired' outcome + storageBlocked; notice queueing | **partly**: queueing still a proposal (Q6) | U + B ×3 (notice order) | F17-STORAGE (`7dea4a43`) + lease-refusal stub | — | 1.5 |
| 17-12 bakAllowed = true unless .bak copy failed | **yes** | U (2 saves → rotation; copy_failed branch) | OQ-1 + S1 as .bak; quota KV | — | 0.5 |
| 17-C1..C3 exact 1/2/3-item bodies | **yes** | U (formatter) | — | — | 0.5 |
| 17-C4 fixed name order, 14 subsets + 4-item default | **yes** | U (exhaustive) | — | — | 0.25 |
| 17-C5 3-item body ≤ 3 lines at 360 px | **partly**: manual (UI/Visual Designer screenshot). QA can add a B height assert at 360 px if wanted | M (+ optional B) | — | — | 0 (QA) |
| 17-C6 × 44 px, persists, polite live region once, Export | **yes** | B ×3 (DOM + aria) | OQ-1 | — | 1 |
| *(proposed, Q5)* 17-8(g) valid v6_backup + eligible → repair, record untouched | **yes** | U | OQ-1 + committed valid v6_backup record (**to craft**, 0.25 h) | (d) | 0.5 |
| *(proposed, Q3)* notice vs celebration/milestone toast order | **yes** once specified | B ×3 | OQ-1 | — | 0.5 |

**Count:** 18 spec ACs: **14 testable, 4 partly (17-1, 17-5, 17-11, 17-C5), 0 untestable.** I propose 2 more ACs.

## 3. Fixtures and effort
**Q-Q1 (HoQA-built), crafted. Both are quick.**
- **(i) 3 bad level fields:** `fixtures/Q1i-csr17-2-three-bad.json` = `fixtures/f17/F17-3BAD.json`, sha256 `f9830c4b2c50e45be630debf8e197ce4a0cdf4b6c426a32902ad0c494f702a16`. Effort **0.25 h** (done). A no-bounds variant is `M3-three-bad-levels.json` `b939b276…` → F0 H0 V0, coins kept.
- **(ii) MIGRATED save (tracksV7:1 + v6BackupId) with Egg value > F+3.** Built by dd223f5's `migrateStoredTracksV7` from v6 F/C30 (celebratedTier = coopTier(F)), marked, then F corrupted. Effort **0.5 h** (done):

| File | sha256 | True F/H/V | Oracle repair |
|---|---|---|---|
| Q1ii-migrated-F0-V12-farmLevel-abc.json | `4122e158ba6923eff39b0dac5b0da608d77b00192fd82455f0e74f4283e59f3f` | 0/0/12 (spec worst case) | F 0 (not 9) |
| Q1ii-migrated-F0-V12-valid.json | `73c0cd9939a13d2d1fd6443fd4eed5be3c3d2b6d23da43279fe8686d875bf76e` | control | — |
| Q1ii-migrated-F4-V14-farmLevel-abc.json | `9930992543d6cd8a6bd61da78743feeb02ded5c58334a230e7ed28386af24f34` | 4/4/14 | F 1 |
| Q1ii-migrated-F4-V14-valid.json | `2ee0e268ba2aba1db76c9a60f0cb78f48d9946a5e504f69cfc74b825b5c3feb0` | control | — |
| Q1ii-migrated-F6-V14-farmLevel-abc.json | `99d5f8e0744fc869d149ff0f7743e626389cfe1f38921e68c1e9a04801593df3` | 6/6/14, tier 1, balanced:1 | F 5 |
| Q1ii-migrated-F6-V14-valid.json | `f5d431d3813b91d5f0cf6d0aff7dab92a273d6576426241c639cc63f2a610c7c` | control | — |
| F17-MIG-V12.json (farmLevel "x") | `9cb930bd6f4c9468e378d9f91c5268718a2cf5470bd2dfeaa96070929a3f409c` | 0/0/12 | F 0 |

**§17.8 F17-* set:** all 17 files crafted in `fixtures/f17/` (≈ 0.5 h, done). The sha256 values are in `f17/SHA256SUMS`; the open-input choices are in Q2 and in generator comments.

**Other classes** (crafted unless marked; `fixtures/SHA256SUMS`):

| Class | Files | Expected under CSR-17 |
|---|---|---|
| Single bad level, varied junk | L1 null, L2 −1, L3 1e309 → Infinity, L4 H "2.5", L5 V true, L6 C {…} | L1–L3 → F15; L4 → H0; L5 → V0; L6 → C0 |
| Must-not-repair controls | C1 F999 (> maxLevel, M2-valid), C2 12.9 → 12, C3 "12" | unchanged, no notice |
| NaN/negative/oversized NUM_FIELD | N1 coins −5, N2 coins null, N3 basket 1e309, N6 level + coins | chain |
| Wrong type on array/object | N4 customers {} (chain); N5 workers [] (**accepted by validate today**, review A10) | N4 chain; N5 → raise with Saves |
| Integrity | S1 bad checksum (chain), S2 no sum (eligible → F15), S3 version 7 (refused) | as noted |
| Bad field + good .bak / valid IDB | P1, P2, F17-BAK-LOWERSEQ, F17-IDB | backup wins (M1) |
| Bad field in IDB-only copy | OQ-1 as IDB, no LS | **unspecified** (G1); today a silent new game |
| Reconcile with a newer IDB | P3 seq-9 bad IDB + P4 valid LS | LS kept; bad IDB never preserved (G1-adjacent) |
| **To craft** | marked committed valid v6_backup + OQ-1 (Q5); v5 save with a bad level (17-7 `version`); boundary rows (H 0/3/4/30/31, tier 0/3/4, graderTier 0/5/6, hens:30/31) | ≈ 1 h |

**QA effort total ≈ 21 h:** the §2 rows sum to ≈ 20.25 h (18 spec ACs ≈ 19.25 h + 2 proposed ≈ 1 h; ≈ 4 h of that is browser ×3 engines), plus ≈ 1 h of remaining fixtures. The ≈ 2 h of fixtures already crafted are not included. Saves' estimate for engineering is ~11.5 h (§17.9).

## 4. Q-Q2: is "never higher than original" + a bounds table enough proof?
**QA view: agree with Head of QA. Necessary, not sufficient.**
- A repair that always returns 0 passes "≤ original", so the property alone can't catch a missed bound, a wrong max or the wrong field.
- It's sound only on **release-reachable** saves (Saves Q-S1: the debug panel `f-`, panel.ts:30, lowers F in QA builds).
- My extra items: **(e) no-op/idempotence**: C1–C3 and every valid fixture → no repair/notice/event; reloading a repaired save → no second repair or notice. **(f) determinism + seed log**: each failing seed prints its inputs (§17.8 already says this).

Mapping of (a)–(d) onto the 10:03 text:

| HoQ item | Where | Gap |
|---|---|---|
| (a) exact values on named fixtures (OQ-1: coins kept, F15, notice) | 17-1, 17-2, 17.8 named table, worked example | Open inputs (Q2); notice asserted by exact 17-C1 body "Your Farm level was reset. …" |
| (b) 0 / max / max+1 per repairable field | 17.8 Boundaries (H term, celebratedTier, graderTier, milestones; bad-field count 1/3/4) + 17.1 "not repaired: > maxLevel, floats, '12'" | Not referenced by any AC (Q4). Add worker-entry boundary (known id + object vs non-object) and V/H via `grade:20`/`hens:30` alongside unknown ids |
| (c) seeded fuzz: none above bound, nothing else changes | 17.8 fuzz assertions (1)–(5) | Junk `2.5` defect (Q1); observation point (Q3); generator policy and balance ref (Q4); not referenced by an AC (Q4) |
| (d) valid .bak or IDB beats repair | 17-8 (a)(b)(c) + F17-BAK-LOWERSEQ / IDB / IDB-SAME / IDB-UNKNOWN | v6_backup must **not** beat repair (Q5) |

## 5. Risks (status at 10:03)
1. **Repairable fields and defaults.** LEVEL_FIELDS only. C → always 0 (listed in the notice). H/V → 0 without milestones. 3-bad with no sources → F0 H0 V0, coins kept (M3 fixture). Accepted by D-HOP-30.
2. **Corrupt copy preserved.** 17-6 is fine; a repair boot uses 1 of the 3 corrupt.* slots (CSR-7).
3. **Telemetry.** Both events fire (17-7); CSR-10's enum gains 'repair'. Dashboards that sum restores must add it (noted in the spec).
4. **.bak / IDB / v6_backup / reconcile.**
   - 17.6 order plus opt-in validate removes the rotation and reconcile risks I raised at 09:5x (17.1 C4).
   - **Still needed:** the CSR-3 refactor (reconcile moving inside loadSafe) must ship with or before CSR-17. Otherwise today's reconcile (main.ts:93) pre-empts with a silent IDB restore (probe `b1`). F17-IDB then passes for the wrong reason (no M1, no save_corrupt). Assert M1 + save_corrupt{idb}, not just F17.
   - The v6_backup ordering assertion is missing (Q5).
5. **Save version / migration.** No SAVE_VERSION bump. preTracksRaw is handled (17-10). A pre-v6 save is repaired before migrate (needs the v5 fixture).
6. **Never-higher.** Sound in release (Q-S1). The future-cap risk is covered by reading capOverFarm at runtime plus the ADR note (C6). D-HOP-17 staggered caps would need a per-level inverse ("smallest F′ with hensCap(F′) ≥ H"), not `H − capOverFarm`, if the offset ever depends on F. Flag it for that ADR.
7. **UX side effects.** Celebration and milestone toasts after a repair (Q3); ordering against the no-storage notice is a proposal (Q6).
8. **Spec churn.** Three revisions in about 10 minutes. Freeze by sha at the gate.
