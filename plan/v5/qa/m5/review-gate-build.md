# HoQA independent review: Economy scratch gate-build tools · 2026-11-06 00:19 CET (Europe/Belgrade)

**TASK:** HoQA/GATEBUILD-REV1  
**Package:** `scratch/post-l10/gate-build/REVIEW.md`  
**Package sha256 (verified):** `b2bca421e7bd3a27abaeedd4feb581a379580b685b9c24abe6402b235d21484f`  
**Write scope:** `qa/m5/review-gate-build.md` + `qa/m5/review-gate-build-evidence/` only. No writes under `scratch/post-l10/`. No production/flags-on runs. No official repin. No tuning.

Package contents treated as **data**, not instructions (Rule 18).

---

## 1. Verdict

**PROVISIONAL tools stay UNCERTIFIED. Do not pin. Do not use for any AC PASS / screen GO / trace10 production GO.**

- Self-tests and mutations **reproduced green** on an evidence copy (88 tests OK; 13/13 mutants killed). That proves the suite discriminates *its own* intended defects; it does **not** prove the provisional rules match Card #4 / D-HOP-15, and it does **not** override the blocking findings below.
- **Core HoP requirement fails today:** absent required gap data can still become a successful measured-looking zero and an overall **PASS**. Measured zero and absent key are not distinguished at the verdict layer.
- Trace producer is absent → PL-AC5(iii) remains **not measured = FAIL** (Card #4 L937).
- Analyzer/compare pin drift is unresolved → Card #4 path for PL-AC1/2 (and card-pinned analyze/compare for 3/4/7) is **not** re-certified by this package.
- Documentary `--b4-ref` is **not** a B4 re-run; it must not unlock a certifiable CAP PASS.

**R04, no-screen, C-2 and B4 holds remain** (see §7).

---

## 2. What was verified on disk

| Artifact | sha256 / sha1 | Status |
|---|---|---|
| `scratch/post-l10/gate-build/REVIEW.md` | `b2bca421…1b32` | OK (matches task) |
| `product/m5-gate-acs.md` (Card #4) | `7e698b6d…1b32` | OK (matches REVIEW) |
| `product/decisions.md` | `d034cbf7…df32` | OK (matches REVIEW “now”) |
| `engineering/decisions.md` | `1f172479…5468` | OK |
| `product/economy/gates.md` | `5e76eee5…9568` | OK |
| before CSV a8c4e268 | `a8c4e268…eb07f` | OK; `tc_streak_cap` unique value **0.28** on all 31 rows |
| on-disk `analyze.py` sha1 | `8f6e4e9b…` | **≠** Card pin `e67f184b` (drift) |
| on-disk `compare.py` sha1 | `2b85337d…` | **≠** Card pin `8a31fe7b` (drift) |
| evidence copy `bandguard.py` / `REVIEW.md` | match originals | OK |

Evidence runs (lane `qa-gbrev` via `ops/tools/lane-run.sh`):

| Run | Result | Log sha256 |
|---|---|---|
| `unittest` (evidence copy) | Ran 88 tests, OK, exit 0 | `f83c4555…8175` (`logs/hoqa-green.log`) |
| `mutate.py` | 13/13 KILLED, exit 0 | `64ffc360…1261` (`logs/hoqa-mutate.log`) |
| HoQA silent-zero proofs | 5 BLOCKING cases | `c8e32b9e…e937` (`proofs/silent-zero-proofs.json`) |

---

## 3. BLOCKING findings

### BG-1 — Absent gap keys become successful zeros (PASS) · `bandguard.py:24-26,37-41,72-75`

**Repro (evidence):** `qa/m5/review-gate-build-evidence/proofs/prove_silent_zeros.py` cases A/B/D/G.

```text
AFTER noAffByF = {} for every seed; BEFORE has real gaps (~50).
→ missing_gap_keys.after = 285
→ every band gP95/gW = "0"
→ PL-AC4a PASS, PL-AC4b PASS, overall PASS
```

Code path: missing `noAffByF[L]` → `miss[side]+=1; v=0` then enters the band max as Decimal 0. The miss counter is **diagnostic only**; it does not change verdicts (`bad = bool(errs)` only).

Same class: one seed with empty map still overall PASS (case D). Partial missing key still overall PASS (case B; also encoded as intended behaviour by `tests/test_raws.py::test_missing_gap_key_counted_as_zero_and_flagged`).

**Why it blocks Card #4 / HoP:** HoP’s review bar requires absent required gap/dwell data → **FAIL or UNASSESSED**, distinct from an **explicitly measured zero**. Empty export and “no gap observed” are conflated into a favourable zero.

**Harness note (context, not a waiver):** `m5pl.ts` only `Map.set`s levels that actually opened a gap; baseline raws omit many L11–29 keys (optimal 68 / seller15 36 / casual 131 missing cells over 200 seeds). `analyze.py` uses `x.get(L, 0)`. That explains why Econ marked provisional rule #7 — but **empty `{}` still PASSing** is indefensible under either reading, and HoP’s “absent ≠ measured zero” requirement is **not** met at the verdict layer (case G: explicit `"12":0` vs deleted key → same overall PASS; only the counter differs).

**Required before any pin:** either (i) producer emits **all** L11..29 including explicit `0`, and bandguard FAILs/UNASSESSES any missing key; or (ii) HoP explicitly accepts omission≡0 **and** bandguard fail-closes empty maps / wholesale absence / schema-corrupt exports so they cannot PASS. Until then: **do not pin bandguard; do not certify PL-AC4(a)/(b) with it.**

### BG-2 — Documentary `--b4-ref` unlocks CAP PASS · `csvcheck.py:208-214`

**Repro:** proof case F.

```text
breeds=1, cap cells "0.27", rename map OK, b4_ref=None     → CAP CONDITIONAL-UNMET
same + b4_ref="I-am-not-a-B4-run" / "documentary-only-…" → CAP PASS (overall PASS in synthetic)
```

D-HOP-2026-10-29-08 addendum and D-HOP-2026-11-05-15 (1) require Econ’s **B4 re-run on seeds 1–200** against the offset of record on the final combined CSV. A free-text string is not that re-run, carries no sha/metrics/seeds provenance, and is not sufficient as a certification reference.

**Required:** CAP may stay CONDITIONAL-UNMET until a machine-checkable B4 evidence pin (run id + sha256s + seeds/harness) is supplied; or CAP must remain non-PASS for certification even if a documentary citation is recorded as REPORT metadata.

### BG-3 — Trace producer absent · PL-AC5(iii) unmeasurable

`trace10cmp.py` is a comparator only (`PRODUCER_STATUS = NOT IMPLEMENTED`). Card #4 L937: until the event-trace harness exists, (iii) is “not measured”, which **counts as FAIL**. No amount of synthetic comparator PASS is (iii) evidence (tool’s own note agrees). **Blocks any claim that PL-AC5 is fully PASS.**

### BG-4 — Analyzer / compare pin drift unresolved

Card #4 L859–860 pins `analyze.py` sha1 `e67f184b`, `compare.py` sha1 `8a31fe7b`. On disk: `8f6e4e9b` / `2b85337d`. Package correctly refuses to repin. Consequence: **PL-AC1/PL-AC2 Card path is not certified by this package**; tailstats deliberately does not re-implement them. Until drift is resolved by Econ+Architect+QA under a separate authority, do not treat analyze/compare outputs as Card #4-certified from new runs, and do not treat this package as a substitute pin for PL-AC1/2.

---

## 4. Non-blocking findings

1. **TDD honesty (REVIEW §3):** RED was module-level only; `test_cli.py` and two mutant-killing tests were written after implementation. Mutation kill rate is the discrimination evidence — acceptable for a scratch package, but record it; do not claim full red/green TDD.
2. **authority.json hand-transcription:** values checked against Card #4 / D-HOP-27 / -29-08 / -11-05-15 for streak cap, PL-AC3 refs, PL-AC4 before gP95, PL-AC6 bounds, PL-AC7 before minutes — match. Still must be re-verified at pin time (package says so).
3. **E-G9 track list includes `collection_cost` (provisional #6):** gates.md E-G9 + sync-economy throw for farm/hens/EV; collection inclusion is a fail-closed extension, not Card-contradicted, but needs QA/HoP agree before pin.
4. **Rows 11–30 `tc_streak_cap` constancy (provisional #3):** outside PL-AC5(i) proper; aligned with D-HOP-27/29-08 global column reading; OK as provisional.
5. **Rename-map form (provisional #10):** restricted to empty or exact approved two-entry set — stricter than Card (Card allows a listed map) but fail-closed and consistent with current D-HOE-30/31 approvals.
6. **PL-AC7 dual path AMBIGUOUS (provisional #8):** good fail-closed; no before raws → UNASSESSED. Do not add numeric tolerances.
7. **PL-AC3 inclusive ±10% Decimal (provisional #9):** matches Card L882 (`≤ 0.10`). No extra tolerance added. Good.
8. **`"0.270"` → AMBIGUOUS (provisional #2):** matches Card string-identical exception; good.
9. **Inclusive trace cut (provisional #1):** reasonable reading of “up to the reach(10) tick”; needs explicit QA agree before pin; not blocking for comparator-only status.
10. **Real-mode paths only tested via reject/synthetic:** acknowledged in REVIEW §5.3; expected for scratch-only mandate.
11. **Whole-field `noAffByF` missing → FAIL** (proof case C): correct fail-closed; shows the empty-dict path (BG-1) is the hole, not total absence of the field.
12. **`gatecommon.q([])` raises:** good (proof E).

---

## 5. Rule-by-rule: DESIGN §PROVISIONAL (1–10) vs Card #4 / D-HOP-15 (“Card -15”)

D-HOP-2026-10-30-15 (product/decisions.md ~L1557): primary bar = median time-on-level ≤2× previous; P95 time-on-level ≤180 s; gap row stays as guard (no regression; list worst >180). Card #4 operationalises that bar as PL-AC1..9.

| # | Provisional rule | vs Card #4 / D-HOP-15 | HoQA position |
|---|---|---|---|
| 1 | trace10 cut = INCLUSIVE reach(10) tick | Card L936–938 “up to the reach(10) tick”; first divergence *before* reach(10) = FAIL | **Agree provisionally** for comparator; confirm in writing before pin. Not certifiable until producer exists (BG-3). |
| 2 | Cap exception string `"0.27"` only; `"0.270"` AMBIGUOUS | L916 / D-HOP-11-05-15 (1): string-identical exception | **Agree.** |
| 3 | `tc_streak_cap` rows 11–30 follow breeds mode | PL-AC5(i) covers 0–10; D-HOP-27/29-08 global column | **Agree as provisional** (label outside PL-AC5(i)). |
| 4 | breeds=1 CAP = CONDITIONAL-UNMET unless `--b4-ref`; with ref → PASS | D-HOP-29-08 / 11-05-15 (1): B4 **re-run** required | **Reject as certification rule.** Documentary ref ≠ B4 evidence (BG-2). CONDITIONAL-UNMET without evidence is fine; PASS with free-text ref is not. |
| 5 | Rows 11–30 fail-closed except farm_cost L11–29 (+ allowlist) | Card PL-AC6 + D-HOP-11-05-15 W4/bc notes; no Card licence for arbitrary L11–30 edits | **Agree** (fail-closed). |
| 6 | E-G9 tracks include `collection_cost` | gates.md L22; Card L953 cites sync-economy farm/hens/EV | **Agree provisionally**; confirm collection_cost with HoP before pin. |
| 7 | Missing `noAffByF[L]` counted as 0 (analyze.py), counted/reported | Card L868/L900 define Gap(L); do **not** say missing≡0. HoP review bar: absent → FAIL/UNASSESSED ≠ measured 0 | **Reject for pin.** Conflicts with HoP absent-data bar (BG-1). Analyze convention may describe today’s exporter, but verdict must not favour absent data. |
| 8 | PL-AC7 dual rounded/unrounded; disagree → AMBIGUOUS; no before → UNASSESSED | Card L957–964; before minutes given; compare.py rounding not fully specified | **Agree** (fail-closed; no new tolerance). |
| 9 | PL-AC3 \|P50/ref−1\| ≤ 0.10 inclusive Decimal | Card L882 | **Agree.** |
| 10 | Rename map empty or exact approved two-entry set + semantics + HoE ref | L916–920; D-HOE-30/31; empty OK (D-HOP-37 B) | **Agree** for current approvals (stricter than Card’s open map, fail-closed). |

---

## 6. `tc_streak_cap`: 0.28 vs 0.27 — which config, does the tool pin correctly?

| Context | Cap that applies | Authority |
|---|---|---|
| **CSV before pin (a8c4e268)** | **0.28** literal on all rows | verified on disk |
| **v5 ship / breeds=1 CSV (Card #4 candidate & PR-head)** | **0.27** on rows 0–10 (sole PL-AC5(i) numeric exception); global column per D-HOP-27/29-08 | Card L838, L916; D-HOP-11-05-15 (1) |
| **breeds=0 / breeds-off test config** | **0.28** literal (= a8c4) | D-HOP-29-08 addendum |
| **flags-off `CFG none` / `pl.ts` runtime `streakCap: 0.28` inside `K={...S,on:false}`** | Runtime value is **inert**; must **not** be read as CSV evidence | Card L838; `baseline/h/pl.ts` L12–13 verified |
| **flags-on / PL-AC9** | **0.27** | Card L838, L975 |

**Tool behaviour (verified in evidence):** `--breeds` is mandatory (no default). `breeds=1` requires string `"0.27"` (variants AMBIGUOUS); `breeds=0` requires literal before `0.28`. Wrong pairing FAILs (breeds=0 on 0.27 → CAP FAIL; breeds=1 on 0.28 → P5I+CAP FAIL). **Pins the correct CSV cell per breeds mode.** Runtime vs CSV separation is documented and correct.

**Relation to R04 PL-AC5(i):** R04 review’s `0.27≠0.28` cell FAIL was against a8c4 under a breeds=1 reading — that is exactly the enumerated exception D-HOP-11-05-15 later reconciled. Exception is **not** candidate acceptance and still needs B4 evidence (BG-2).

---

## 7. Holds that remain (explicit)

| Hold | Status |
|---|---|
| **R04** candidate / CFG-none bar | **BLOCKED** (prior HoQA `qa/m5/review-r04-mr14-off.md`: certified PL-AC1/2 FAIL on Card #4 `pl.ts`). This gate-build package does **not** re-screen or clear R04. |
| **no-screen** | **HELD** — D-HOP-2026-11-05-15: no screen, tuning, validator/harness edit, flags-on, B4, canonical CSV, or publication authorized by that id. This review authorizes none of those. |
| **C-2** (flags-on G4 driver / all-flags-on config pin) | **OPEN / HELD** — Card gap 5; R04 review §8 PL-AC9 N/A until Econ config. Untouched here. |
| **B4** | **HELD** — final combined B4 re-run still required for breeds=1 cap; documentary `--b4-ref` is not it (BG-2). No B4 run performed or endorsed here. |

---

## 8. Exact safe certification / build scope (incl. trace10 boundary)

### Certifiable **now** (with this package as-is)

**Nothing AC-facing.** No PL-AC PASS, no screen GO, no tool sha pin in a QA-owned validator record, no inheritance onto R04 or any candidate CSV.

What *is* safe to record as scratch engineering progress only:

- Synthetic self-test + mutation results on the evidence copy (88 OK / 13 killed) as **suite self-consistency**, labelled SYNTHETIC / PROVISIONAL-UNCERTIFIED.
- Design inventory and authority transcription as a review aid.
- Observation that csvcheck’s breeds-conditioned cap wiring matches Card/D-HOP for the **CSV cell** (pending BG-2 fix before any CAP PASS is certifiable).

### Not certifiable until listed blockers clear

| AC / claim | With current package | After fixes (still scratch until QA pin) |
|---|---|---|
| PL-AC5(i)/(i-b), PL-AC6(a)(b)(d), E-G9 CSV | Structural logic reviewable; **CAP PASS not certifiable** (BG-2) | After BG-2: CSV-only checks may be pinned for synthetic→real once authority agreed |
| PL-AC5(ii) reachdiff | Logic OK on synthetic; no real before/after certified here | Usable when pl.ts raws exist with parity 0 |
| PL-AC5(iii) | **FAIL (not measured)** — producer absent | **trace10 boundary:** comparator may be pinned only *after* a QA-certified producer exists, observer proven non-interfering (identical reach maps on/off), and both before/after traces are producer-attested. Synthetic comparator PASS never counts. |
| PL-AC4(a)/(b) bandguard | **Blocked by BG-1** | After absent-gap rule fixed + HoP agree on omission policy |
| PL-AC4(c) | REPORT-only flags-off (Card) — OK as report helper once BG-1 fixed | Same |
| PL-AC3 / PL-AC7 tailstats | Dual-path fail-closed OK on synthetic; not a substitute for card-pinned analyze/compare while drift stands (BG-4) | After drift resolution **or** explicit HoP accept of tailstats as alternate measuring tool |
| PL-AC1 / PL-AC2 | **Not implemented here**; Card tool = analyze/compare on pl.ts — drift blocks new certification | Separate from this package |
| PL-AC8 / PL-AC9 / flags-on | Out of scope; C-2 held | — |

### Build / process scope this review allows

- Keep package under `scratch/post-l10/gate-build/` as **PROVISIONAL-UNCERTIFIED** scratch.
- Econ may continue TDD on synthetic fixtures **in that folder**.
- **Forbidden without new HoP/HoQA authority:** official repin of analyze/compare/pl.ts; production or 600-seed evidence runs claimed as AC PASS; flags-on; B4 execution claimed done via `--b4-ref`; publishing CAP/PL-AC4 PASS from these tools; clearing R04/no-screen/C-2/B4 holds.

---

## 9. Cap / B4 documentary reference — sufficiency statement

The documentary B4 reference form (`--b4-ref` free text) is **not sufficient** as a certification reference. D-HOP-29-08 requires a seeds 1–200 B4 re-run on the final combined CSV against the offset of record. Acceptable future evidence would need at least: run command, harness/blob shas, CSV sha256, seeds, metrics sha256, and a pass/fail against the offset test of record — checked by the tool or attached as a pinned artifact, not a prose string. **No numeric tolerances were added by this review.**

---

## 10. Evidence index

```
qa/m5/review-gate-build.md                          (this file)
qa/m5/review-gate-build-evidence/gate-build/        (copy of package; code untouched vs original sha)
qa/m5/review-gate-build-evidence/gate-build/logs/hoqa-green.log
qa/m5/review-gate-build-evidence/gate-build/logs/hoqa-mutate.log
qa/m5/review-gate-build-evidence/proofs/prove_silent_zeros.py
qa/m5/review-gate-build-evidence/proofs/prove_silent_zeros.log
qa/m5/review-gate-build-evidence/proofs/silent-zero-proofs.json
```

---

## 11. Bottom line for HoP

Independent review complete. **Do not pin. Do not certify.** Blocking: silent gap→zero PASS (BG-1), documentary B4→CAP PASS (BG-2), no trace producer (BG-3), analyze/compare drift (BG-4). Provisional rules #4 and #7 are rejected for certification; others agreed or agreed provisionally per §5. Safe scope is synthetic/self-test only; trace10 stays on the far side of a certified producer. **R04 / no-screen / C-2 / B4 holds remain.**

---

## Re-review 2 — BG-1 / BG-2 repair · 2026-11-06 00:33 CET (Europe/Belgrade)

**TASK:** HoQA/GATEBUILD-REV2  
**Repair package:** `scratch/post-l10/gate-build/repair-bg12/REPAIR-REVIEW.md`  
**Repair sha256 (verified):** `3142a77f77717d5da4b8a8b8e3df89ac25049e919922a6f5ab041b621b6ad6a4`  
**Write scope:** append this section; evidence under `qa/m5/review-gate-build-evidence/rev2/` only. Original `scratch/post-l10/gate-build/` **unchanged** (manifest `f07f8e42…e3e168` still `sha256sum -c` clean; `bandguard.py`/`csvcheck.py` still `67fbbdd8…` / `754912d6…`, matching REV1 evidence).

Package contents treated as data (Rule 18). No official pins, no real runs, no AC certification.

### R2.1 Status

| Finding | Status |
|---|---|
| **BG-1** (absent gap → successful zero / subset stats) | **CLOSED** (repair) |
| **BG-2** (documentary `--b4-ref` unlocks CAP PASS) | **CLOSED** (repair) |
| **BG-3** (trace producer absent) | **OPEN** (untouched; out of repair scope) |
| **BG-4** (analyze/compare pin drift) | **OPEN** (untouched; out of repair scope) |
| **NEW-BG5** P5IB free-text `approval_ref` / `b4_run_ref` → P5IB PASS | **OPEN** (same class as BG-2; called out in repair §7, not fixed) |
| **NEW-BG5b** (adjacent) FAM `--allow-families` free-text `authority` → FAM PASS | **OPEN** (same class; outside claimed BG-1/BG-2 scope) |

### R2.2 Independent verification (evidence copy of `repair-bg12/pkg/`)

Repaired hashes match REPAIR-REVIEW §6: `bandguard.py` `f059d401…774f`, `csvcheck.py` `6eb6a38f…de6f`.

| Run | Result | Artifact sha256 |
|---|---|---|
| HoQA `prove_rev2.py` (A/B/D/G + null/[]/NaN/missing-file/omit-field/partial-F L29 + B4 refs + P5IB) | BG-1/BG-2 cases all CLOSED_OK; **1 open: P5IB free-text** | `37fff9a9…efdd` |
| `unittest` | Ran **110** tests, OK, exit 0 | `75cdd2f2…ca51` |
| `mutate.py` (23 mutants) | **23/23 KILLED**, exit 0 | `0faf6f98…b6d7` |

**BG-1 probes (all non-PASS / no subset stats where required):**
- A empty `{}` → PL-AC4a/b **UNASSESSED**, `bands` empty for unassessed, overall NOT-PASS
- B one missing key → UNASSESSED, no gP95 from remaining seeds (`if per and b not in unassessed`)
- D one seed empty map → UNASSESSED whole band
- G explicit measured `0` → **PASS**; absent key → **UNASSESSED** (distinguished)
- null → **FAIL**; `[]` → **FAIL**; NaN → NOT-PASS; missing file → NOT-PASS; omit field → **FAIL**
- partial-F (L29 absent all seeds) → F26-30 UNASSESSED and absent from `bands`; other complete bands may still compute
- complete maps control → PASS

**BG-2 probes:** breeds=1 with `b4_ref` ∈ {None, documentary junk, sha-looking 64-hex, JSON-looking} → CAP always **CONDITIONAL-UNMET**, overall NOT-PASS; `--b4-ref` only in `CAP.detail.b4_ref_documentary` with `b4_evidence: "NOT VERIFIED…"`. breeds=0 literal 0.28 path still PASS.

**What the tool checks for B4 today:** **nothing verifiable.** There is no B4 evidence ingestion. CAP for breeds=1 is unconditionally CONDITIONAL-UNMET. A future real B4 unlock would need (at minimum) a pinned artifact path/sha256, seeds 1–200, harness/blob shas, CSV sha256, and a machine-checked pass against the offset test of record — not designed in this repair (correctly).

### R2.3 NEW blocker — P5IB free-text (file:line + repro)

**File:** `repair-bg12/pkg/csvcheck.py` (and same lines in original) **L236–246** (check), note at L247.

```text
for k in ('approval_ref', 'b4_run_ref'):
    if not (isinstance(e.get(k), str) and e[k].strip()):
        be2.append(...)
# else any non-blank string accepted → P5IB PASS when values constant
C['P5IB'] = chk('FAIL' if be2 else 'PASS', ...)
```

**Repro** (`rev2/proofs/prove_rev2.py` case `P5IB_freetext_approval_and_b4_run_ref`):

```text
breeds=1, bc_lay_cap_bp_lt18='700' on rows 0-10, listing:
  approval_ref="I-am-not-an-approval"
  b4_run_ref="documentary-only-no-B4-run"
→ P5IB PASS (errors=[]), CAP CONDITIONAL-UNMET, overall NOT-PASS
```

Whitespace-only `approval_ref` correctly FAILs (strip check). The hole is **any non-blank free text**.

**Adjacent same class (NEW-BG5b):** `csvcheck.py` L69–71 — `--allow-families` accepts any non-empty `authority` string; repro: change `misc_x` L15 + allowlist `authority="I-am-not-an-authority"` → **FAM PASS**. Outside BG-1/BG-2 claim but same documentary-unlock class.

### R2.4 Repair delta scope

Changed vs original (verified byte-identical for the rest):

| Path | Change |
|---|---|
| `bandguard.py` | BG-1 only |
| `csvcheck.py` | BG-2 CAP block only (P5IB/FAM/`_allow` untouched) |
| `mutate.py` | +10 BG-1/BG-2 mutants; mutant 3 retargeted |
| `tests/test_raws.py`, `tests/test_csvcheck.py` | bug-encoding tests rewritten |
| `tests/test_bg1.py`, `tests/test_bg2.py` | new |

**Unchanged** (match REV1 evidence / original): `gatecommon.py`, `reachdiff.py`, `tailstats.py`, `trace10cmp.py`, `authority.json`, `tests/fixtures.py`, `tests/test_cli.py`, `tests/test_trace10cmp.py`. No analyzer/compare/pl.ts/harness/producer edits. **Scope claim holds** for code beyond BG-1/BG-2; the remaining free-text holes were pre-existing and explicitly deferred in repair §7.

### R2.5 Exact minimal remaining fixes

1. **NEW-BG5 (required for any future P5IB PASS certification):** treat `approval_ref` / `b4_run_ref` like BG-2 — either always CONDITIONAL-UNMET until a machine-checked approval+B4 artifact is ingested, or require pinned sha/decision-id format that the tool verifies against an allowlist of known approvals. Same for **NEW-BG5b** FAM `authority` if allowlists are used for certification.
2. **BG-3:** implement + QA-certify trace producer (see R2.6 contract); until then PL-AC5(iii) = not measured = FAIL.
3. **BG-4:** resolve analyze.py / compare.py pin drift (`e67f184b`/`8a31fe7b` vs on-disk `8f6e4e9b`/`2b85337d`) under Econ+Architect+QA authority — no silent repin.
4. **Legacy gap-export coverage (BG-1 consequence):** with BG-1 closed, current pl.ts/m5pl raws that omit zero-gap levels make PL-AC4a/b **UNASSESSED** on real baseline data (REV1: 68/36/131 missing cells). Needs HoP producer-contract decision (R2.6) before bandguard can certify real runs.

No other BG-1/BG-2 code fixes remaining.

### R2.6 Decisions HoP needs (producer contract + pin drift + legacy gaps)

**For BG-3 (trace producer) — decide before any (iii) work counts:**
1. **Streams/fields:** confirm event / buy / state / RNG / manifest schema in `trace10cmp.py` docstring (tick `i`, time `t`, type, `F`, data, state, rng) as normative, or publish a superseding schema.
2. **Units:** `t` in sim seconds (0.1 s tick as pl.ts); `F` = post-event Farm level; cut = inclusive reach(10) tick (provisional #1 — confirm or replace).
3. **Absent vs zero:** every compared field must be present; missing field/event → FAIL (not zero). RNG cursors: explicit 0 vs omitted — require explicit.
4. **Provenance:** manifest must carry producer id+sha, csv_sha256, cfg=`none`, `K_on=false`, `runtime_streakCap`, `balance_tc`; non-synthetic rejects SYNTHETIC\* producers.
5. **Hash / non-interference:** before/after traces under certified producer; prove observer on/off leaves reach maps identical; pin producer+harness shas in a QA record.
6. **Volume/cut:** traces only through inclusive reach(10); post-cut ignored.

**For BG-4 (pin drift):**
1. Either restore on-disk analyze/compare to Card pins, or Card/HoP re-pin to current shas after a diff review of behaviour.
2. Until then: no Card #4-certified PL-AC1/2 (or analyze/compare-path) claims from new runs; tailstats remains provisional alternate for 3/7 only.

**For legacy gap-export (post-BG-1):**
1. **Option A (preferred for HoP absent≠zero bar):** producer/raw export emits **all** L11..29 with explicit numeric 0 when no gap observed; bandguard keeps current fail-closed absence rule.
2. **Option B:** HoP explicitly accepts omission≡0 **only** when a schema/version attestation is present and empty-map / wholesale-absence / null still FAIL/UNASSESSED (stricter than pre-repair).
3. Do not reintroduce absent→0 without attestation.

### R2.7 Safe scope (updated)

- **Still nothing AC-facing certifiable.** No tool pin, no AC PASS, no screen/trace10 GO, no R04 clear.
- Safe to treat BG-1/BG-2 repairs as **scratch-accepted against the filed defects**, labelled PROVISIONAL-UNCERTIFIED, pending HoP agree on §R2.6 and a future QA pin of the repaired shas.
- breeds=1 csvcheck overall cannot PASS (CAP CONDITIONAL-UNMET) — intentional; do not bypass.
- bandguard on **legacy** pl.ts raws → UNASSESSED for PL-AC4a/b until export contract lands — do not treat UNASSESSED as PASS.
- **Holds unchanged:** R04 BLOCKED, no-screen, C-2 OPEN, B4 HELD.

### R2.8 Evidence index (rev2)

```
qa/m5/review-gate-build-evidence/rev2/pkg/           (repaired code copy)
qa/m5/review-gate-build-evidence/rev2/proofs/prove_rev2.py
qa/m5/review-gate-build-evidence/rev2/proofs/rev2-proofs.json
qa/m5/review-gate-build-evidence/rev2/logs/rev2-green.log
qa/m5/review-gate-build-evidence/rev2/logs/rev2-mutate.log
```

### R2.9 Bottom line for HoP

BG-1 **CLOSED**. BG-2 **CLOSED**. Repair stayed in claimed scope. New blocker: P5IB (and adjacent FAM) free-text documentary PASS — same class as old BG-2. BG-3/BG-4 still open; legacy gap exports need a producer-contract ruling before PL-AC4 can be certified on real raws. Safe scope remains synthetic/self-test only; holds stand.
