# REPAIR REVIEW v3 — HoP/gate-build-BG5-BG4 round 3 · Tue 10 Nov 2026 ~00:35 CET (Europe/Belgrade)
**PROVISIONAL-UNCERTIFIED scratch. ac_claim NONE. No pin, no repin, no screen. Synthetic TEMP fixtures only.**
**Basis:** HoQA review **QA-D-1110-BG54CERT** (qa/reviews/bg5-bg4-cert-20261110/REVIEW.md sha256 bca888bd94fe440145fcc8bb09309813a90163d6c6c4fd193f2d6df968f927a6; fix list D-1 MAJOR, D-2/D-3 MINOR, N-1, N-3) and HoP ruling **D-HOP-2026-11-10-06** (authority = the file an ID is defined in). Earlier rule D-HOP-2026-11-09-05 still applies.
**CHANGED-FILES-ONLY package.** v2 frozen before any v3 write: `manifest.v2.sha256` (= v2 manifest 6dca41fa…a668), `REPAIR-REVIEW.v2.md` (0cf96653…519b), `HANDOFF.v2.md` (db0e2c7a…3314). v1 copies left untouched.

## 0. Integrity
| Package | manifest sha256 | `sha256sum -c` at start / at end of v3 |
|---|---|---|
| gate-build (original) | f07f8e4202b212eab59b764a6b078afbf5930c3f07f44bb5e25d01b2a3e3e168 | 0 failures / 0 failures |
| repair-bg12 | 0cb318de456c120f88b3614881d9f64f8feb9604a8e8c7981194e659f805bfb6 | 0 failures / 0 failures |
| repair-bg5-bg4 v2 (frozen) | 6dca41fa8d791b2545a1ef257f26c458245214cb5870bd2a759a85d94069a668 | 0 failures at start; copied to `manifest.v2.sha256` |
`baseline/` is still byte-identical to `repair-bg12/pkg`. `cand/sweep/s00-base/metrics.json` = 89014e81… (checked; not touched). No analyze.py/compare.py run in v3.

## 1. Verification rule as implemented (pkg/csvcheck.py `verify_ref`)
A ref is VERIFIED only if ALL hold, otherwise NOT VERIFIED → CONDITIONAL-UNMET (structural errors still FAIL):
1. **Ref ID.** The ref cites exactly one distinct ID of the required family: D-HOP for bc_ approval_ref and FAM authority, QA-D for b4_run_ref. The ID must be an exact token, not glued to other ID characters, so `XQA-D-…`, `…-R2x` and `D-HOP-…-77x` do not match. The `path=` part is ignored when the ID is looked up.
2. **Entry definition (D-1 + D-HOP-2026-11-10-06).** An entry is the **entire leading token** of a level-2 `## ` heading at column 0, outside ``` / ~~~ fences:
   - Fences follow CommonMark: up to 3 spaces of indent; the closer must use the same character and be at least as long; an unclosed fence runs to EOF.
   - Other heading levels, indented or blockquoted headings, mid-line or co-mentioned IDs, and glued punctuation (`## D-HOP-…:`) do not define an entry.
   - The entry body runs to the next `#`/`##` heading outside fences.
3. **Single definition.** If an ID is defined by more than one heading, in one file or across files, it is NOT VERIFIED. There is no first-wins.
4. **File authority (D-HOP-2026-11-10-06).** The defining file must be the ID's own authority file:

   | Prefix | Authority file |
   |---|---|
   | D-HOP | `product/decisions.md` |
   | QA-D | `qa/decisions.md` |
   | D-CEO | root `decisions.md` |
   | D-HOE | `engineering/decisions.md` |
   | D-PMW | `product/workers/decisions.md` |

   - Located read-only. `product/workers/decisions.md` does not exist today, so D-PMW never resolves; the live D-PMW headings sit in product/decisions.md. D-PMW is never a verification authority here.
   - Defaults are those live paths. `decisions_paths` may be a {role: path} dict, or a list classified by layout position (`<root>/decisions.md`, `product/`, `qa/`, `engineering/`, `product/workers/`). A bare `<tmp>/decisions.md` therefore counts as the ROOT file.
5. **Artifact hash.** The entry body contains the full 64-hex sha256 of the artifact on disk.
   - bc_/FAM: the artifact is the candidate CSV.
   - B4: the artifact is the run manifest (`path=`).
6. **B4 manifest (D-2).** It must contain:
   - csv_sha256 (64-hex) == candidate
   - **seeds: a non-empty list of integers** (`[]`, missing, `''`, non-int or bool → NOT VERIFIED)
   - config
   - harness_sha (64-hex) **plus harness_path, whose on-disk file must hash to harness_sha** (a relative path resolves from the manifest's directory)
   - Recommended follow-up from HoQA: once D-HOP-2026-11-10-03's RC sha is pinned, also require harness_sha == the harness-of-record sha. Not implemented, because no pin exists yet.
7. **Hermetic synthetic mode (D-3).** With `synthetic=True` and no `decisions_paths`, the default is `{}`: no live decisions file is read. Real mode uses the authority layout above.

Live read-only check (`logs/live-resolve-v3.log`):
- `QA-D-1106-GATEBUILD-R2` now resolves to exactly one definition: its own `## QA-D-1106-GATEBUILD-R2` heading in **qa/decisions.md**. It no longer resolves to HoP's D-HOP-2026-11-06-02 body.
- `QA-D-1030-FC0321` and `D-HOP-2026-10-30-42` resolve to nothing (they previously went to PMW bodies).
- `D-HOP-2026-10-24-11` has 2 headings, so it is NOT VERIFIED (duplicate).

## 2. Changed files only
### 2a. v2 → v3 (this round)
| File | old sha256 (v2) | new sha256 (v3) | Change |
|---|---|---|---|
| pkg/csvcheck.py | 0daf74f6945276b84171ddd237e042eaa9d9396bc3d62777633589afdbfccd5f | f3fab56e6e04c30ab70f06b2acddae8f3faf85a3137278f80bf07800ffece828 | D-1/D-2/D-3 + D-HOP-2026-11-10-06 (`csvcheck-v3.diff`) |
| pkg/mutate.py | aea6993b86f378341c1217fcf3ca6fffd56b611aca13a148e826dd829555853e | 1efbda556b16d40f2a3c77667a6c6e352ffbd5744b144884497772fd566183e6 | 2 v2 mutants re-targeted to the new code, 16 v3 mutants added (`mutate-v3.diff`) |
| tests/test_bg5_verify.py | b2d28e3e67302ee6e05403aeab70b5dbf76abaaa277b49356ad6b96ec8b0fef1 | 8f0850d9a340d73f7a48a7cd871e186689dfbb58ff92ea1889e506ab247637b2 | mirrored TEMP layout; manifests carry harness_path; live-reading guard replaced by a hermetic D-3 test (`test_bg5_verify-v3.diff`) |
| tests/test_bg5_v3.py | — (new) | 6798e2882884831148099533406e2ad811dd03d7a2c3e8f8512de683de5c9236 | 84 tests: all 27 QA probes, file-authority, prefix-spoof, code-fence, B4 manifest, hermetic |
| tests/decfix.py | — (new) | 4ffc8d89c4ce3a00bb2dc2d4c30ee77605ea4469ecda191c77bca62b15a88a44 | TEMP decisions layout that mirrors the live paths |
| bg4/REPLACEMENT.md | cb1d1397b66e2e8c6866f52e99b1846f929c3ec7f7c5fc324b466c02012a070b | 68a71099f7217bc2db9244fb3052782126023dc67e6946f77831d7360fe0315e | N-3 correction note in §4 only; no other BG4 change |
| REPAIR-REVIEW.md / HANDOFF.md | 0cf96653…519b / db0e2c7a…3314 | see `manifest.sha256` | v3 rewrite (v2 preserved as *.v2.md) |
New evidence files (no old version):
- `manifest.v2.sha256`, `REPAIR-REVIEW.v2.md`, `HANDOFF.v2.md`
- `csvcheck-v3.diff`, `mutate-v3.diff`, `test_bg5_verify-v3.diff`
- `logs/{bg5-v3-red, green-v3-1, green-v3-2, mutate-v3-1, mutate-v3-2, bg12suite-v3, proof-v3, qa-probes-v3}.{log,exit}` and `logs/live-resolve-v3.log`
- `proofs/proof-v3-{baseline,pkg}.json`

Hashes are in `manifest.sha256`. Unchanged since v2: everything else, including pkg/tests/*, tests/test_bg5.py, run.sh, baseline/, bg4/tools, bg4/repro and proofs/prove_bg5.py.

### 2b. Cumulative pkg delta vs repair-bg12/pkg (what HoQA re-reviews; N-1 fixed)
| File | repair-bg12 sha256 | v3 sha256 |
|---|---|---|
| pkg/csvcheck.py | 6eb6a38f30c3e41a7229a1375c0fef275c9d613df8184074fe29be65b6aede6f | f3fab56e6e04c30ab70f06b2acddae8f3faf85a3137278f80bf07800ffece828 |
| pkg/mutate.py | d687297ca21d8d59cfc127c674eabeaeabf630d25b0f0403c584417e222cb443 | 1efbda556b16d40f2a3c77667a6c6e352ffbd5744b144884497772fd566183e6 |
| **pkg/tests/test_csvcheck.py** | 441a7171af30944f04d2f67213f94fd14465609f7c4aeacbbaf7e04a1f249408 | 28b9b8476f9248e6dedcb8fdcd9c7666725ec45387614a483a7bdd3249471686 (unchanged since v1/v2; 2 assertion flips PASS→CONDITIONAL-UNMET at L209/L266, see §3) |
All other pkg files are byte-identical to repair-bg12/pkg (`cmp` checked).

## 3. Assertion changes justified
| Assertion | v2 | v3 | Why |
|---|---|---|---|
| pkg test_csvcheck L209 `test_allowlist_needs_authority_ref` and L266 `test_bc_listing_requires_approval_and_b4_refs` | CONDITIONAL-UNMET | unchanged | free-text refs never verify (D-HOP-2026-11-09-05); repair-bg12 verbatim suite still 108/110 with exactly these 2 |
| test_bg5_verify positive tests (P5IB/FAM PASS) | single TEMP decisions file | TEMP **mirrored layout** (D-HOP in product/, QA-D in qa/) + harness_path | D-HOP-2026-11-10-06; D-2 |
| test_bg5_verify `test_real_decisions_paths_not_written_by_tests` | hashed live decisions files | **removed**, replaced by `test_synthetic_default_reads_no_live_decisions` (TEMP only) | D-3: no live reads in tests |
| test_bg5_verify `test_b4_manifest_csv_mismatch_not_verified` | manifest without harness | valid harness + csv mismatch | otherwise the mismatch mutant survived (caught in mutate-v3-1; fixed in v3-2) |
| QA probe controls P01/F01/P16/P20/P23 in **HoQA's script** | PASS | CONDITIONAL-UNMET | that script writes D-HOP + QA-D into one `<tmp>/decisions.md` (= root file), which D-HOP-2026-11-10-06 makes fail-closed. The mirrored-layout ports in test_bg5_v3 PASS as intended |

## 4. Tests, mutations, probes (serial; each run via `ops/tools/lane-run.sh econ`)
| Log | Exit | Result |
|---|---|---|
| bg5-v3-red | 1 | test_bg5_v3 on v2 code: 81 run, failures=43, errors=1 → RED (test-first) |
| green-v3-2 | 0 | pkg 110 OK + top-level 109 OK (13 test_bg5 + 12 test_bg5_verify + 84 test_bg5_v3) = **219 tests OK** |
| mutate-v3-1 | 1 | 46/47: mutant 28 (B4 csv mismatch) survived, test fixed (see §3) |
| mutate-v3-2 | 0 | **47/47 mutants killed** (31 prior incl. 2 re-targeted + 16 new v3) |
| bg12suite-v3 | 1 | repair-bg12 tests verbatim: 110 run, 108 pass / 2 fail (same 2 as v2); BG1/BG2 pass |
| proof-v3 | 0 | baseline 6 defects / pkg 0 |
| qa-probes-v3 | 1 | HoQA probe_verify_ref.py (a12ac3f8) on a temp copy of pkg/: **22/22 NOT-PASS probes fail-closed** (P02–P05, F02, P22 now CONDITIONAL-UNMET; F03/F04 still input errors). **0 NOT-PASS→PASS bypasses.** Script reports 5 "bypasses" = the 5 expect-PASS controls going fail-closed (see §3). Temp copy deleted |

New v3 mutants (all KILLED):
- b4_run_ref accepts the D-HOP family
- co-mention in a heading registers an ID (P02/P03/F02)
- leading token only needs to *contain* an ID
- first-wins duplicates (P04)
- authority by prefix, not by file (cross-file)
- fences not skipped (P05)
- `~~~` fences not recognised
- a fence closes on any marker
- other heading levels define entries
- D-HOP ref regex unanchored
- QA-D ref regex unanchored
- a multi-ID ref uses its first ID
- the root file is treated as product
- empty/non-int seeds accepted (P22)
- harness sha not checked against disk
- synthetic mode falls back to the live decisions files (D-3)

Re-targeted v2 mutants (still KILLED):
- missing entry verifies
- authority family dropped

## 5. Record correction (N-3)
The 4da712bb tables.md byte match was produced by the **baseline tables script `baseline/analyze.py` cf37ff30**, not by the proposed analyze.py 8f6e4e9b. HoQA proved analyze.py separately (690/690 values, 0 differences; historical compare outputs byte-exact). The v2 review §2/§5 implied the match supported the replacement tools; that is withdrawn. `bg4/REPLACEMENT.md` §4 now carries the same correction. BG4 content is otherwise unchanged, and s00-base is untouched. BG4 + s00-base were re-pinned by HoP in D-HOP-2026-11-10-07 (not by this package).

## 6. Open items
- **Process for HoQA/HoP:** a real B4 ref verifies only if the QA-D entry is a `## QA-D-…` heading, with the manifest sha256 in its body, in qa/decisions.md. Most QA-D entries there are bullets today.
- No harness-of-record pin yet (D-HOP-2026-11-10-03), so harness_sha is checked against the manifest's own harness_path, not against an RC pin.
- **D-HOP-2026-11-10-06 says "FAIL"** for a ref that does not match. The tool keeps v2's mapping: NOT VERIFIED → CONDITIONAL-UNMET, and only structural errors give FAIL. Both are fail-closed (overall NOT-PASS). HoP to say if the verdict string must be FAIL.
- `--decisions` overrides are a test hook. In real mode, an operator who passes custom paths controls the authority files. The defaults are the live layout.
- BG3 trace producer absent → PL-AC5(iii) = FAIL. No R04 screen, 600-run, flags-on or production CSV in this package.

## 7. Manifest
`manifest.sha256` (v3) lists every file in this folder except itself. `manifest.v2.sha256` and `manifest.v1.sha256` preserve the earlier freezes.
