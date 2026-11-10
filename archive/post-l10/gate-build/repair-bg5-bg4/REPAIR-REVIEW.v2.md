# REPAIR REVIEW v2 — HoP/gate-build-BG5-BG4 round 2 (D-HOP-2026-11-09-05) · Tue 10 Nov 2026 ~00:15 CET (Europe/Belgrade)
**PROVISIONAL-UNCERTIFIED scratch. ac_claim NONE. No pin, no repin, no screen. Synthetic fixtures only for gate tests.**
**CHANGED-FILES-ONLY review package** vs (a) BG1/2-closed baseline (gate-build `f07f8e42…` + repair-bg12 `0cb318de…`) and (b) v1 of this folder (`manifest.v1.sha256` = `fbb92cb4…`, preserved as `REPAIR-REVIEW.v1.md`).

## 0. Integrity
| Package | manifest sha256 | `sha256sum -c` after v2 work |
|---|---|---|
| gate-build (original) | f07f8e4202b212eab59b764a6b078afbf5930c3f07f44bb5e25d01b2a3e3e168 | 0 failures |
| repair-bg12 | 0cb318de456c120f88b3614881d9f64f8feb9604a8e8c7981194e659f805bfb6 | 0 failures |
| repair-bg5-bg4 v1 (frozen) | fbb92cb482ece07e02817cdb0bdf627b9e012638b203614af4aa2b42c83ee432 | preserved as `manifest.v1.sha256` / `REPAIR-REVIEW.v1.md` before any v2 write |

## 1. Authority
- evidence-contract.md EC-4 + **D-HOP-2026-11-09-05** BG5 verification rule and BG4 replacement route.
- Verification mechanism (now implemented): VERIFIED iff (i) entry ID exists in decisions files (default `product/decisions.md` + `decisions.md`; tests pass TEMP fixtures via `decisions_paths` / `--decisions`), (ii) authority matches (D-HOP for bc_ approval_ref + FAM authority; QA-D for b4_run_ref), (iii) entry contains full 64-hex sha256 of artifact and on-disk file matches (bc_/FAM = candidate CSV; B4 = run manifest listing csv sha256, seeds, config, harness sha, with manifest csv sha == candidate).

## 2. Changed files only (vs repair-bg12/pkg + new v2 files)
| File | repair-bg12 / v1 | v2 sha256 | Change |
|---|---|---|---|
| pkg/csvcheck.py | r12 `6eb6a38f…` / v1 `3fd78944…` (bytes not retained after overwrite; see v1 review) | `0daf74f6945276b84171ddd237e042eaa9d9396bc3d62777633589afdbfccd5f` | +`verify_ref` / `_read_entries` / `_b4_manifest_ok`; P5IB/FAM PASS only when refs VERIFIED; `--decisions`; else CONDITIONAL-UNMET (csvcheck.diff) |
| pkg/mutate.py | r12 `d687297c…` / v1 `e69be65d…` | `aea6993b86f378341c1217fcf3ca6fffd56b611aca13a148e826dd829555853e` | 8 BG5/5b v2 mutants (skip-verify, missing-entry forge, authority drop, hash skip, B4 csv mismatch, structural, silent allowlist) |
| tests/test_bg5.py | v1 `cd04bd31…` | `1b23b95598bbf7fabb98c6035982df072935ca1f87976e44be54e85f9e1b0a14` | docstring only (free-text still CONDITIONAL; PASS path moved to test_bg5_verify) |
| tests/test_bg5_verify.py | — (new) | `b2d28e3e67302ee6e05403aeab70b5dbf76abaaa277b49356ad6b96ec8b0fef1` | 12 tests: rejects (prefix, missing, wrong authority, hash mismatch, other CSV, free text, FAM unverified, B4 csv mismatch) + accepts (P5IB PASS, FAM PASS) + helper exists + real decisions.md untouched |
| bg4/REPLACEMENT.md | — (new) | `cb1d1397b66e2e8c6866f52e99b1846f929c3ec7f7c5fc324b466c02012a070b` | EC-3 replacement proposal |
| bg4/tools/analyze.py | — (copy) | `1764791afd482ac3ad223db8ab003f412538a0270fdbbc92d2cd0c49e1eea234` | proposed replacement (sha1 8f6e4e9b) |
| bg4/tools/compare.py | — (copy) | `2100bd704e003f68fa3d4c8e5a5f0fe520caea5d8c9581da56f1c1381086e927` | proposed replacement (sha1 2b85337d) |
| bg4/repro/out/tables.md | — | 4da712bb7b53a0eafc11c7e964990483ad768119eddb560e2fbe636eb22527d1 | byte-exact baseline reproduction |
All other pkg files remain byte-identical to repair-bg12/pkg except csvcheck/mutate. `baseline/` still = pre-BG5 proof target (repair-bg12/pkg copy).

## 3. Assertion changes justified
| Assertion | Was (v1) | Now (v2) | Why |
|---|---|---|---|
| test_csvcheck `test_bc_listing_requires_approval_and_b4_refs` (pkg copy) | CONDITIONAL-UNMET for SYN-A | unchanged CONDITIONAL-UNMET | free-text still NOT VERIFIED under D-HOP-09-05 |
| test_csvcheck `test_allowlist_needs_authority_ref` | CONDITIONAL-UNMET | unchanged | same |
| repair-bg12 verbatim suite (2 failures) | expected: those 2 still encode pre-BG5 PASS | still 2 failures, 108/110; BG1/BG2 tests pass | intentional; do not edit repair-bg12 tests |
| test_bg5 free-text / path+sha256 | CONDITIONAL-UNMET | unchanged | still NOT VERIFIED |
| test_bg5_verify accepts | n/a (new; RED on v1) | P5IB/FAM **PASS** when TEMP decisions + artifact sha match | implements D-HOP-09-05 positive path |
No other production assertions flipped from FAIL↔PASS except the new verified-PASS path.

## 4. Tests and mutations (lane-run econ)
| Log | Exit | Result |
|---|---|---|
| bg5-verify-red | 1 | 12 tests on v1 code: FAILED (failures=1, errors=11) — RED |
| green-v2-1 | 0 | pkg 110 OK + top-level 25 OK (13 test_bg5 + 12 test_bg5_verify) = **135 tests OK** |
| mutate-v2-1 | 0 | **31/31 mutants killed** (23 prior + 8 new BG5 v2) |
| bg12suite-v2 | 1 | repair-bg12 tests verbatim: 110 run, **108 pass / 2 fail** (bypass-encoding assertions only); BG1/BG2 pass |
| proof-v2 | 0 | baseline 6 defects / pkg 0 |

## 5. BG4 replacement evidence
See `bg4/REPLACEMENT.md`. Summary: proposed tools copied with hashes; behavioural delta vs card docs recorded; **tables.md reproduced byte-exact to 4da712bb…**; metrics reanalysis values match card, hash ≠ d6ac395c (original metrics bytes lost — incident noted). Everything PROPOSED / uncertified.

## 6. Open items (unchanged ownership)
- BG3 trace producer absent → PL-AC5(iii) unmeasured = FAIL until Eng builds it.
- BG4 repin needs HoQA certify + separate HoP entry.
- R04 screens / 600-run / flags-on / production CSV: not in this package.

## 7. Manifest
`manifest.sha256` (v2) lists every file in this folder. `manifest.v1.sha256` preserves the pre-round-2 freeze.
