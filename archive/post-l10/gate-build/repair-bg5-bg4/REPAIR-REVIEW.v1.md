# REPAIR REVIEW — HoP/gate-build-BG5-BG4 · Mon 9 Nov 2026 ~23:55 CET (Europe/Belgrade)
**PROVISIONAL-UNCERTIFIED scratch. ac_claim NONE. No pin, no repin, no screen. Synthetic fixtures only (gap option A — explicit measured 0 valid — used in synthetic fixtures only).**

## 0. Location discrepancy (recorded per brief)
HoP's message named `product/scratch/post-l10/gate-build/` — **does not exist** (`ls: No such file or directory`). The real package is `scratch/post-l10/gate-build/` next to `repair-bg12/`; this repair lives in `scratch/post-l10/gate-build/repair-bg5-bg4/`. No other ambiguity.
Box event: the box was replaced at ~23:46 CET (new boot_id); the first copy of this folder was lost before any test ran and was recreated; integrity re-verified after.

## 1. Integrity (before and after)
| Package | manifest sha256 | `sha256sum -c` before | after |
|---|---|---|---|
| gate-build (original) | f07f8e4202b212eab59b764a6b078afbf5930c3f07f44bb5e25d01b2a3e3e168 | 0 failures | see §8 |
| repair-bg12 | 0cb318de456c120f88b3614881d9f64f8feb9604a8e8c7981194e659f805bfb6 | 0 failures | see §8 |

## 2. Authority
`product/scratch/r04-pacing-checkpoint/evidence-contract.md` sha256 fc6a938214c8914dde5fed7b6b51fb770b93e66c3472f10e1836b30a0c4b6c99 (dispatch prefix fc6a9382 ✓). "Item 4" = **EC-4 BG-5/BG-5b**: approval_ref / b4_run_ref / FAM authority free text cannot unlock P5IB/FAM PASS; without independently verified approval artifact + B4 evidence pin → CONDITIONAL-UNMET; invalid inputs → structural FAIL; documentary strings = metadata only.
**Verification mechanism:** EC-4 defines none. A self-supplied `path + sha256` only proves the named file exists and is unchanged — anyone can create such a file, so it is not *independent* verification, and B4 evidence cannot be verified in-tool at all (BG2). Choosing it as a PASS route would reopen the bypass, so no ref is treated as verified; a hash-matching existing-file ref is tested and stays CONDITIONAL-UNMET. A real mechanism needs a HoP/QA spec (open item).

## 3. Changed files only (vs repair-bg12/pkg)
| File | repair-bg12 sha256 | new sha256 | Change |
|---|---|---|---|
| pkg/csvcheck.py | 6eb6a38f30c3e41a7229a1375c0fef275c9d613df8184074fe29be65b6aede6f | 3fd789442cdc354cb499cbe9a58f093d3b125414e78c7c36ec9dc761b2747ebd | P5IB: `FAIL if structural errors else CONDITIONAL-UNMET if bc_ columns present else PASS`; FAM: `FAIL if unapproved else CONDITIONAL-UNMET if any change accepted via allowlist else PASS`; refs recorded as `documentary_refs` / `allowlisted` + `ref_verification: NOT VERIFIED …` (csvcheck.diff) |
| pkg/mutate.py | d687297ca21d8d59cfc127c674eabeaeabf630d25b0f0403c584417e222cb443 | e69be65def86b6b1d69a80479311ba11f34c135b57ab4ed0c52f99ea8aa9e07e | +6 BG5 mutants; each mutant also runs top-level tests/ (mutate.diff) |
| pkg/tests/test_csvcheck.py | 441a7171af30944f04d2f67213f94fd14465609f7c4aeacbbaf7e04a1f249408 | 28b9b8476f9248e6dedcb8fdcd9c7666725ec45387614a483a7bdd3249471686 | 2 assertions that encoded the bypass (P5IB PASS / FAM PASS with free-text ref) → CONDITIONAL-UNMET (test_csvcheck.diff) |
| tests/test_bg5.py (new) | — | cd04bd310d631839a2f51e7b70b0d72aa592d1cca39c903da72a2fa247721949 | 13 BG5/5b tests (free text, JSON-looking, "PASS", hash-matching existing file, metadata, structural FAIL, unapproved still FAIL, unused allowlist, farm envelope, invalid allowlist, CLI exit 1) |
| proofs/prove_bg5.py (new) | — | e3dabdf75eb919f2179b6f27fc7992c21eefed197ec567390a34f145c192ebdb | before/after reproduction |
| run.sh (new) | — | f23be8fd73e3a9ba95f001b1aec74473ef98cd5f3e34f312060ff3792bb5e6f7 | runner |
All other pkg files byte-identical to repair-bg12/pkg (bandguard, gatecommon, reachdiff, tailstats, trace10cmp, authority.json, fixtures, test_bg1/2, test_cli, test_raws, test_trace10cmp). `baseline/` = byte copy of repair-bg12/pkg (pre-BG5 code, proof target).

## 4. Before / after reproduction (`logs/proof-pre-fix.log`, `logs/proof-post-fix.log`)
Pre-BG5 code (baseline): **6/6 defects** — bc_broody_cap_bp=700 with refs "SYN-A", "I-am-not-an-approval", or `path=<existing file> sha256=<matching>` → P5IB **PASS, overall PASS**; hens_cost L20 +1 with the same strings as allowlist authority → FAM **PASS, overall PASS**.
Repaired pkg: **0 defects** — all six → CONDITIONAL-UNMET, overall NOT-PASS.

## 5. Tests and mutations (all via `ops/tools/lane-run.sh econ -- repair-bg5-bg4/run.sh …`)
| Log | Exit | Result |
|---|---|---|
| bg5-red-old | 1 | test_bg5 on pre-BG5 code: 13 tests, failures=15 (subtests) errors=2 — bypass reproduced (RED) |
| green-1 | 1 | after fix: 110 pkg tests, 2 failures = the 2 bypass-encoding assertions (tests/ not reached) |
| green-2 | 0 | after correcting those 2 assertions: 110 OK + 13 OK |
| mutate-1 | 0 | **29/29 mutants killed** (23 from repair-bg12 + 6 BG5: original P5IB bypass, original FAM bypass, hash-looking ref verifies P5IB, hash-looking authority verifies FAM, missing/invalid ref no longer structural FAIL, allowlisted change silently accepted) |
| bg12suite-on-new | 1 | repair-bg12/pkg/tests **verbatim** (sha256s logged) vs new code: 110 run, **108 pass**; the 2 failures are exactly the bypass-encoding assertions (test_bc_listing_requires_approval_and_b4_refs, test_allowlist_needs_authority_ref). **All BG1/BG2 tests (test_bg1, test_bg2) pass unchanged.** |
| green-final | 1 | invalid run: launched concurrently with `proofs`; that job's cleanup deleted the shared pkg/.tmp mid-suite (FileNotFoundError in fixtures.write_json) — runner race, not a code fault |
| green-final-2 | 0 | **final: 110 + 13 = 123 tests OK** |
| proof-post-fix | 0 | baseline 6 defects / pkg 0 |
| bg4-search, bg4-search2 | 0 | BG4 search (see bg4/PROVENANCE.md) |
Runner caveat: run.sh deletes pkg/.tmp at the end of each mode; do not run two modes in parallel.

## 6. BG4
**Not found.** See `bg4/PROVENANCE.md` (search scripts, 250 + 45 + 317 file candidates, 90 git object stores incl. all-objects scan, 67 historical blobs, 7 archives — 0 matches by plain sha1 or git blob id for e67f184b / 8a31fe7b). Only 8-hex prefixes exist in authority. The "4701dbf8" copy is a different script (R04-MR14-off diagnostic), not a version of analyze.py. No copy, no repin. Escalation per EC-3.

## 7. Open items
- **BG3** trace producer still absent → PL-AC5(iii) not measured = FAIL.
- **BG4** pinned analyze/compare unrecoverable here → separate replacement approval needed.
- **EC-4 mechanism**: no machine-checkable approval / B4 evidence verification is specified; with this repair csvcheck can never PASS when bc_ columns exist or an allowlist is relied on (by design until specified).
- EC-5 collection_cost hygiene, trace10 EC-2 self-tests: not in this brief.
- R04 / no-screen / C-2 / B4 holds unchanged.

## 8. Manifest
`repair-bg5-bg4/manifest.sha256` lists every file here (`sha256sum -c` from this folder). Final integrity results for the original and repair-bg12 manifests are recorded in HANDOFF.md STATUS.
