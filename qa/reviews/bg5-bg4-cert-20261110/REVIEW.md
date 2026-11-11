# HoQA certification review: Econ BG5/BG5b + BG4 repair package (repair-bg5-bg4 v2)
TASK hoqa/bg5-bg4-cert · D-HOP-2026-11-09-05 (combined changed-files-only review, rules 24/25) · D-HOP-2026-11-10-03 (s00-base overwrite check)
Reviewer: Head of QA · Tue 10 Nov 2026 ~00:20 CET (Europe/Belgrade)
Write scope used: only `qa/reviews/bg5-bg4-cert-20261110/`. All runs were on byte copies inside this folder. The package content is treated as data (rule 18).
Gate graded: `product/m5-gate-acs.md`. The pin of record moved to da3de91c (D-HOP-2026-11-10-05) during this review. Card #4 L840–1010 is byte-identical between 6269b126 (`scratch/m5-gate-acs.6269b126.pre-p11.bak`) and da3de91c (diff empty), so every line cited here holds for both.

## Verdicts
| Item | Verdict | One-line reason |
|---|---|---|
| 0. Package integrity / changed-files scope | **PASS** (1 doc nit) | Manifest hash and `-c` verified; the baselines are intact; the changed-file set is as claimed, plus one undisclosed-in-§2 test file |
| BG5 (P5IB approval_ref + b4_run_ref) | **FAIL** (narrow repair) | D-1 MAJOR: a PASS is reachable with no D-HOP and no QA-D entry at all, because authority is inferred from any heading that *mentions* the ID |
| BG5b (FAM --allow-families authority) | **FAIL** (same defect) | D-1: FAM PASS credited to a PMW-authored heading that co-mentions a D-HOP ID |
| BG4 tool replacement (analyze 8f6e4e9b / compare 2b85337d) | **CONDITIONAL PASS** (certifiable as a *replacement*, not a restoration) | tables 4da712bb reproduced independently; 690/690 values cross-checked; historical d6ac395c-era compare outputs reproduced byte-exact; no delta vs the card's documented contract |
| s00-base metrics.json (d6ac395c → 89014e81) | **CONDITIONAL PASS**: numerically equivalent, no regeneration needed | 18/18 card-cited values match; compare.py "before" consumption is byte-identical to a pre-incident run that hash-checked d6ac395c; the d6ac395c bytes are unrecoverable (0 matches box-wide) |
| **Overall** | **NOT CERTIFIED as one package.** BG4 + s00-base: **CERTIFIED WITH CONDITIONS** (HoP may re-pin them). BG5/BG5b: **FAIL**; fix D-1 and re-review the changed files only | |

## 0. Integrity (claims 1–2)
- `sha256sum manifest.sha256` = `6dca41fa8d791b2545a1ef257f26c458245214cb5870bd2a759a85d94069a668` ✔. `sha256sum -c`: 122/122 OK, 0 failures. Every file on disk is listed and every listed file exists (comm diff empty). No symlinks.
- REPAIR-REVIEW.md `0cf96653…9b` ✔, HANDOFF.md `db0e2c7a…14` ✔, bg4/REPLACEMENT.md `cb1d1397…be` ✔, manifest.v1.sha256 `fbb92cb4…ee432` ✔ (= claimed v1). REPAIR-REVIEW.v1.md `a7c9d5b1…` = the v1 manifest's REPAIR-REVIEW.md entry ✔ (v1 preserved byte-exact).
- Baselines: gate-build `manifest.sha256` = `f07f8e42…e3e168`, 32/32 OK. repair-bg12 = `0cb318de…bfb6`, 76/76 OK. Re-checked after all QA runs: still 0 failures.
- `baseline/` vs `repair-bg12/pkg`: byte-identical (`diff -rq` empty) ✔.
- `pkg/` vs `repair-bg12/pkg`: 3 files differ: csvcheck.py, mutate.py, **tests/test_csvcheck.py**. **Nit N-1 (doc, MINOR):** REVIEW §2 says "byte-identical … except csvcheck/mutate". test_csvcheck.py also differs (2 assertion flips PASS→CONDITIONAL-UNMET at L209/L266, carried from v1 and listed in §3). It is disclosed in §3, but not in the §2 changed-files table.
- v1→v2 manifest delta: only the expected files (csvcheck, mutate, test_bg5 docstring, new test_bg5_verify, the bg4/ tree, logs/proofs, diffs). No baseline or BG1/BG2 file changed.

## BG5 / BG5b: verify_ref review
### What holds (verified)
- Code (`csvcheck.py` 0daf74f6): (i) the ID must be a key in `_read_entries` over product/decisions.md + decisions.md (`--decisions` overrides); (ii) the ref ID family is chosen by kind (D-HOP for bc_/FAM, QA-D for B4); (iii) `_HEX64 = \b[a-f0-9]{64}\b` must contain the sha256 of the on-disk artifact. For B4, the manifest must parse and carry csv_sha256 (64-hex, == candidate), seeds, config and a 64-hex harness_sha. Structural errors still FAIL, and anything not verified is CONDITIONAL-UNMET.
- Suites re-run by QA on copies (`logs/`):
  - pkg suite: 110 OK.
  - top-level suite: 25 OK, so **135 OK** ✔.
  - test_bg5_verify on v1 code (`baseline/`): 12 run, failures=1, errors=11. That is RED ✔, though 11 of the 12 are TypeErrors from the missing `decisions_paths` kwarg, not behavioural fails.
  - test_bg5 on v1: FAILED ✔.
  - mutate.py: **31/31 KILLED** ✔ (log byte-identical to Econ's mutate-v2-1.log, `53480a2b`).
  - repair-bg12 suite verbatim against v2 code: **110 run, 108 pass / 2 fail** ✔.
- The 2 repair-bg12 failures are **justified**: `test_bc_listing_requires_approval_and_b4_refs` (L266) and `test_allowlist_needs_authority_ref` (L209) assert PASS for the free-text refs `SYN-A` / `SYNTHETIC-GO-REF`. D-HOP-2026-11-09-05 says "Free text and prefixes never verify". All BG1/BG2 tests pass.
- Adversarial probes (`probes/probe_verify_ref.py` a12ac3f8, log `logs/qa-probes.log` ffbdc184), 27 cases. These correctly stay NOT PASS:
  - 8-hex prefix sha, 63-hex sha, sha inside a 65-hex run, sha split by whitespace, uppercase sha (fail-closed)
  - lowercase ID, ID prefix of a real ID, swapped authorities, QA-D as approval / D-HOP as B4
  - IDs only in body text or a blockquote, level-4 headings
  - B4 manifest missing, no `path=`, uppercase csv sha in the manifest
  - FAM authority as a list or as an empty string (input error)
  - A symlinked manifest verifies on content, which is acceptable.

### Defects
**D-1 MAJOR: entry/authority binding is spoofable by heading co-mention (rule (i)/(ii) not enforced).** `_read_entries` registers *every* D-HOP/QA-D ID found anywhere in a `#`–`###` heading as an entry key, mapped to that heading's body. It does this with first-wins `setdefault`, including headings inside fenced code blocks. Authority is then inferred purely from the ID prefix. Repro: `GB_TARGET=<copy of pkg> python3 probes/probe_verify_ref.py`:
- P02: one `## D-PMW-… · PMW note (re D-HOP-2099-01-01-77; QA-D-2099-B4RUN)` heading whose body holds both shas → **P5IB PASS** with no HoP and no QA entry.
- P03: a HoP-authored heading mentioning the QA-D ID → b4_run_ref verified by a HoP entry → **PASS**.
- P04: a spoof heading earlier in the file shadows the genuine HoP entry, which has no sha → **PASS**.
- P05: headings inside a ``` block in another entry → **PASS**.
- F02: FAM authority credited to a PMW heading → **FAM PASS**.
- It also occurs on real data (read-only check of product/decisions.md):
  - `QA-D-1106-GATEBUILD-R2` resolves to the body of HoP's `D-HOP-2026-11-06-02`.
  - `QA-D-1030-FC0321` resolves to PMW's `D-PMW-2026-10-30-20`.
  - `D-HOP-2026-10-30-42` resolves to PMW's `D-PMW-2026-10-30-18`, because that HoP ID has no heading of its own.
- Exploiting it still needs the full candidate sha written into the misattributed body, but rule (ii) "the entry belongs to the owning authority" is not implemented.
- Fix (narrow, csvcheck.py only):
  - the entry ID is the **leading token** of a heading, `^#{1,3}[ \t]+(D-HOP-\d{4}-\d{2}-\d{2}-\d+|QA-D-[A-Z0-9-]+)\b`
  - skip fenced code
  - an ID defined by more than one heading → NOT VERIFIED
  - `\b`-anchor the ref-side ID regexes
  - add P02–P05/F02 as tests plus matching mutants (e.g. "co-mention registers ID", "first-wins kept").

**D-2 MINOR: B4 manifest completeness is presence-only.** `seeds: []` passes (P22 → PASS), because only `None`/`''` count as missing. seeds/config/harness are not validated against anything, so harness_sha can be any 64-hex. Fix: require a non-empty seeds range, and (recommended) harness_sha == the harness-of-record sha once D-HOP-2026-11-10-03's RC sha is pinned.

**D-3 MINOR: tests are not hermetic.** `tests/test_bg5.py` (refs include the real IDs `D-HOP-2026-11-05-15` and `D-HOP-2026-11-06-02`), pkg/tests/test_csvcheck.py, test_bg2.py and proofs/prove_bg5.py call `check()` without `decisions_paths`, so they **read** the live product/decisions.md and decisions.md. No writes: QA hashed both before and after, and the only changes were concurrent HoP/HoQA entries. Their outcomes therefore depend on live data. Only test_bg5_verify uses TEMP fixtures. Fix: in synthetic mode default `decisions_paths=[]`, or have the fixtures pass an empty temp file.

**N-2 (process note, HoP):** the rule (i) scope is product/decisions.md or decisions.md, but QA-D entries live in qa/decisions.md, mostly as bullets (root decisions.md has 0 QA-D headings). A real B4 ref can only verify if HoQA logs the B4 QA-D entry as a `##` heading in product/ or root decisions.md, or if HoP widens rule (i) to qa/decisions.md. The tool matches the rule as written; this is not a code defect.

## BG4: analyze.py / compare.py replacement
- Tools: `cand/tools/analyze.py` = `gate/analyze.py` = `bg4/tools/analyze.py`, sha1 `8f6e4e9ba92c96fcf7c8ed3aab3ac5314a2c153b`, sha256 `1764791a…a234`. compare.py sha1 `2b85337d9fba5bf3a9edb2f08dbbb33d53c4a3da`, sha256 `2100bd70…e927` ✔.
- **tables.md independently reproduced:**
  - copied the s00-base raws (6 files, `bg4/s00-copy.inputs.sha256`)
  - merged the two halves into 200-seed `raw-<p>.json`
  - ran a copy of `baseline/analyze.py` (cf37ff30; only the CSV path was changed to the copied a8c4e268 `cand.csv`)
  - result: `tables.md` = **`4da712bb7b53a0eafc11c7e964990483ad768119eddb560e2fbe636eb22527d1`** ✔ MATCH, and `baseline.json` = `c9eb596c…2124` ✔ MATCH vs baseline/SHA256SUMS
- **Correction to Econ's framing (N-3, MINOR doc):** the 4da712bb reproduction uses the *baseline tables tool* cf37ff30, not the proposed analyze 8f6e4e9b. On its own it does not exercise the replacement. QA therefore added two checks that do:
  1. **Cross-check:** analyze 8f6e4e9b metrics vs baseline.json from the same raws. 690 values compared (G4, and per level L11–29: time P50/P95/worst, gap P50/P95/worst, fc, cstep, tstep, seeds_over_2x, arrival; per band: gap P50/P95/worst, tP50/tP95_min): **0 differences** (`logs/qa-crosscheck-analyze-vs-tables.log`).
  2. **Historical reproduction:** `cycle-R04-full-constraint-diagnosis/validators/` was produced before the incident by this exact analyze (1764791a) and compare (2100bd70). Its `inputs-check-pre/post.txt` show `s00-base/metrics.json: OK` against `d6ac395c…f19997`, and its outputs are pinned in that folder's pins.sha256. QA reran both tools on copies of its R04 raws + candidate.csv, with compare's hard-coded before path pointed at a copy of 89014e81 (only line 4 `C=` changed). Result: **compare.md `3feefa03…bf57`, verdicts.json `eb392381…65f8` and analyze stdout `f7a8556d…4885` are byte-identical to the historical files.**
- **Behavioural delta vs the card's documented contract:** none found.
  - CLI matches; `BANDS` matches; nearest-rank quantile matches (the min/max clamp is a no-op at n=200); missing gap → 0; tstep is round 3; there is an all-seeds-reach-L30 assert.
  - The compare verdict keys are exactly the 9 documented.
  - Identity self-compare gives `total_pm10=[0.0, True]` with empty perlevel/perband. QA's self-compare outputs are byte-equal to Econ's (`aff6b0e4`, `a56ee34c`).
  - Known gaps unchanged (card gap 8): no tot P10/P90; PL-AC4(b) is not judged; analyze checks neither `runner` nor `parityMismatches` (the card already makes the `runner` check the guard).
- **Provenance caveat (must be stated in the re-pin):** this is a *replacement*, not a recovered e67f184b/8a31fe7b.
  - Evidence of drift: `s00-base/summary.txt` (the stdout of the run that wrote d6ac395c) lacks the `G4 […] G4mr` print that 8f6e4e9b emits. Across `cand/sweep/*/summary.txt`, 123 use the old format and 126 the new.
  - So s00-base was written by an earlier analyze version than 8f6e4e9b. Whether that version was e67f184b is unknowable on this box.
  - Equivalence is proven only for the fields the card and compare.py consume.
- **Hazards (MINOR, procedural):**
  - (H-1) analyze writes `<rawdir>/metrics.json` in place. That is the root cause of the incident; QA reruns copied inputs first.
  - (H-2) metrics.json embeds the CSV path argument (`csv`), so its bytes depend on the invocation path. QA reruns of identical data gave `a4769acd…` and `b00f8f5c…`, and equal 89014e81 except for `csv`.
  - (H-3) compare.py hard-codes the mutable scratch path `cand/sweep/s00-base/metrics.json` as "before".

## s00-base metrics.json overwrite (d6ac395c → 89014e81)
- Current file `cand/sweep/s00-base/metrics.json` sha256 `89014e8194bd92fde2c3083ad66804c23ef42ba1e7958295bfbf98c8a07264e1` (= Econ's two copies in bg4/repro/). `sha256` field = a8c4e268…07f ✔. Regenerated by QA from the copied raws: identical except the path-dependent `csv` key.
- Card-cited values (gate L855, L887–888, L895–899 PL-AC4(b), L966–969 PL-AC7, plus the info lines in PL-AC1/AC2): **18/18 match**.
  - G4: 104/161/202 · 68/115/153 · 59/94/129
  - tot10_30_P50_s: 2116.0 / 2100.2 / 2041.5 (exact)
  - band gap P95: 81/125/121/157 · 53/79/77/115 · 35/59/58/93
  - band tP50_min: 5.53/11.22/10.75/7.15 · 5.69/10.31/10.79/7.44 · 5.48/9.02/11.13/7.65
  - bar_p95_180 levels: optimal 17/20/21/27; seller15 17/18/20/21/22/26/27; casual 17/18/20–24/26/27
  - bar_2x: casual L15 ×2.454, L17 ×2.004
  - CSV sha a8c4e268
- Every field compare.py reads from "before" (fc, tP50, tP95, tstep, gP95 per level; band gP50/gP95/gW/tP50_min; tot P50; G4; sha256) reproduces the pre-incident d6ac395c-era compare.md/verdicts.json byte-exact (see BG4).
- Search for any copy of d6ac395c (`probes/search_d6ac.sh` faefd3e2, run via lane-run qa, read-only, outputs in `logs/d6ac-search/`):
  - 211,515 files of 1 KB–5 MB under /workspace, /home/box, /tmp and /cursor/stores: sha256, **0 matches**
  - 111 git object stores, all blobs of 15–40 KB (incl. unreachable): content sha256, **0 matches**
  - 7 archives: no `*metrics*.json` members
  - 594 re-serialisations of 89014e81 with alternative `csv` path strings / indents: **0 matches** (consistent with d6ac395c coming from an older analyze version)
- The same d6ac395c sha appears only as a *reference* in docs, manifests and card backups. **The original bytes are unrecoverable.**
- **Ruling: certified as numerically equivalent; no regeneration is required.** Not byte-equivalent, so the gate citations must be re-pinned. Fields that no surviving record of d6ac395c covers (`G4_worst_seeds`, `gap_seeds_over_180`, `maxstep_L11_29`, `guard_band_gap`) are not cited by the card and not read by compare.py. They are deterministic from the unchanged raws.

## Conditions for HoP's re-pin (BG4 + s00-base)
1. Pin by full sha256 in one D-HOP entry:
   - analyze `1764791afd482ac3ad223db8ab003f412538a0270fdbbc92d2cd0c49e1eea234` (sha1 8f6e4e9b)
   - compare `2100bd704e003f68fa3d4c8e5a5f0fe520caea5d8c9581da56f1c1381086e927` (sha1 2b85337d)
   - s00-base metrics `89014e8194bd92fde2c3083ad66804c23ef42ba1e7958295bfbf98c8a07264e1`, replacing d6ac395c at L855/L887–888/L895/L966
   - the 6 s00-base raws + cand.csv (sha256s in `bg4/s00-copy.inputs.sha256`), so the metrics can be regenerated
2. State plainly: "replacement of unrecoverable e67f184b/8a31fe7b; equivalence proven on the documented contract and on all card-cited / compare-consumed values, not byte-level against the original pins". Also: the L864–865/L965 "sha1 e67f184b/8a31fe7b" text gets re-cited.
3. Procedure: every analyze run of record runs on a copy of its raw dir (H-1). Before compare, check `sha256sum` of `cand/sweep/s00-base/metrics.json` == 89014e81 (H-3; it is a mutable scratch path). Metrics byte pins must record the exact command line, or else compare on JSON minus `csv` (H-2).
4. No certified Card #4 outputs from before the re-pin. Card gap 8 (P10/P90, PL-AC4(b) judge) stays open.

## Conditions for BG5/BG5b re-review (changed files only, rule 25)
Fix D-1 (required) and D-2/D-3 (should). Add QA probes P02–P05, F02 and P22 as permanent tests, with mutants that reintroduce co-mention registration, first-wins and empty seeds. Then re-run the pkg + top suites, mutate, and the repair-bg12 suite verbatim (expect 108/110 with the same 2). QA re-reviews only csvcheck.py, the tests and mutate.py.

## Writes and side effects
- QA wrote only inside this folder. No writes in scratch/post-l10/**, product/, economy files or any decisions.md. The three package manifests still pass with 0 failures after all runs.
- Concurrent changes by others during the review, not by QA: product/decisions.md (D-HOP-2026-11-10-04/-05), product/m5-gate-acs.md (re-pin → da3de91c) and qa/decisions.md (QA-D-1110-PAUDUR/COLDRIFT).
- One long job (d6ac search) ran via `ops/tools/lane-run.sh qa` (pid 131978) and exited on its own. No kills.

## Evidence index (this folder)
- `logs/qa-pkg-suite.log` 2c4dfb71 · `logs/qa-top-suite.log` cc731157 · `logs/qa-verify-on-v1.log` 801b2fd7 · `logs/qa-bg5-on-v1.log` a11985f1 · `logs/qa-bg12-verbatim.log` 73542dc3 · `logs/qa-mutate.log` 53480a2b · `logs/qa-probes.log` ffbdc184
- `logs/qa-tables-rebuild.log` 4da712bb · `logs/qa-crosscheck-analyze-vs-tables.log` b9c2817a · `logs/qa-d6ac-pathbrute.log` 480640bb · `logs/d6ac-search/` (fs-sha256.tsv.gz, *-MATCHES.tsv all empty)
- `bg4/tables/out/{tables.md 4da712bb, baseline.json c9eb596c}` · `bg4/xcheck/{compare.md 3feefa03, verdicts.json eb392381}` · `bg4/run-analyze/metrics.json` a4769acd
- `probes/probe_verify_ref.py` a12ac3f8 · `probes/search_d6ac.sh` faefd3e2 · `work/` (byte copies of pkg/tests/baseline/proofs and the repair-bg12 tests; `logs/src-hashes.txt`)
