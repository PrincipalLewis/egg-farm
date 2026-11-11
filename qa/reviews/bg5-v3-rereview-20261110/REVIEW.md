# HoQA re-review (INTERIM): Econ BG5/BG5b v3 repair — pending v3.1

TASK hoqa/bg5-v3-rereview · QA-D-1110-BG54CERT (changed-files only, rule 25) · graded against **D-HOP-2026-11-10-10** (amends -06; verified as a leading `##` heading at col 0 in `product/decisions.md`)
Reviewer: Head of QA · Tue 10 Nov 2026 ~00:43 CET (Europe/Belgrade)
**Status: v3 interim — final verdict deferred until v3.1 delta lands.** No `## QA-D-1110-BG5V3` decisions entry written this turn.

Write scope: only `qa/reviews/bg5-v3-rereview-20261110/`. All runs on byte copies under `work/v3-freeze/`. Package content treated as data (rule 18). Long jobs via `ops/tools/lane-run.sh qa`.

Prior review: `qa/reviews/bg5-bg4-cert-20261110/REVIEW.md` sha256 `bca888bd94fe440145fcc8bb09309813a90163d6c6c4fd193f2d6df968f927a6`; probe `probes/probe_verify_ref.py` a12ac3f8. Defects to close: **D-1, D-2, D-3**.

Gate pin of record while grading: `product/m5-gate-acs.md` sha1 **e485f7624b9760a0b8a54b2472dd2b955b20077e**.

---

## Interim picture (not a certification)

| Item | Interim result vs D-1/D-2/D-3 (-06 intent) | vs D-HOP-2026-11-10-10 |
|---|---|---|
| 0. Package integrity at review start | **PASS** (see §0; mid-review drift noted) | — |
| D-1 verify_ref leading-token / fence / dup / file authority | **CLOSED on v3 code** (probes 0 hard fail) | Authority table still **-06** (workers for D-PMW) → **expected gap G2** |
| D-2 seeds + harness-on-disk | **CLOSED on v3 code** | Harness can still **PASS** with no R-1 pin → **expected gap G3** |
| D-3 synthetic hermetic | **CLOSED on v3 code** | — |
| Ref verdict wording | fail-closed overall (NOT-PASS) | Reports **CONDITIONAL-UNMET** not **FAIL** → **expected gap G1** |
| Mutate (47 mutants) | **47/47 KILLED** on freeze | — |
| pkg suite | **110 OK** on freeze | — |
| **BG5/BG5b certifiable?** | **Deferred** — v3 closes D-1/D-2/D-3 behaviourally; -10 gaps G1–G3 must close in v3.1 before certification | |

---

## 0. Integrity

### At review start (frozen as v3-of-record)
- `sha256sum manifest.sha256` = `fbc2a4f58bf39da1562b74885cba9a43a79c5c9bbffcdb26213f0be9579f525e` ✔ (Econ claimed; matched).
- `sha256sum -c`: **149/149 OK**, 0 failures. Econ said 148 entries; actual **149** (nit N-1, doc only).
- Claimed changed-file shas (verified at start):
  - `pkg/csvcheck.py` `f3fab56e6e04c30ab70f06b2acddae8f3faf85a3137278f80bf07800ffece828`
  - `pkg/mutate.py` `1efbda556b16d40f2a3c77667a6c6e352ffbd5744b144884497772fd566183e6`
  - `tests/test_bg5_verify.py` `8f0850d9a340d73f7a48a7cd871e186689dfbb58ff92ea1889e506ab247637b2`
  - `tests/test_bg5_v3.py` `6798e2882884831148099533406e2ad811dd03d7a2c3e8f8512de683de5c9236`
  - `tests/decfix.py` `4ffc8d89c4ce3a00bb2dc2d4c30ee77605ea4469ecda191c77bca62b15a88a44`
  - `bg4/REPLACEMENT.md` `68a71099f7217bc2db9244fb3052782126023dc67e6946f77831d7360fe0315e`
  - `pkg/tests/test_csvcheck.py` `28b9b8476f9248e6dedcb8fdcd9c7666725ec45387614a483a7bdd3249471686` (unchanged since v2) ✔
- v2→v3 manifest delta: only the claimed code/tests/docs plus new logs/diffs/`*.v2` backups. No other common-file hash change.
- `bg4/REPLACEMENT.md`: reconstructed v2 bytes (strip the single Correction paragraph) hash to `cb1d1397…070b` ✔; unified diff is **one added paragraph in §4** only (N-3 correction: 4da712bb came from baseline tables cf37ff30, not analyze 8f6e4e9b).
- Baselines re-checked after QA runs: gate-build `f07f8e42…e168` 32/32 OK; repair-bg12 `0cb318de…bfb6` 76/76 OK.
- s00-base metrics still `89014e8194bd92fde2c3083ad66804c23ef42ba1e7958295bfbf98c8a07264e1` ✔.

### Mid-review package drift (v3.1 WIP landing in the same folder)
While this review was running, Econ began editing the live package (mtimes ~00:36–00:39 CET). After ~00:39, `sha256sum -c manifest.sha256` reported **5 FAILED**: `tests/decfix.py`, `tests/test_bg5_v3.py`, `tests/test_bg5_verify.py`, `tests/test_bg5.py`, `pkg/tests/test_csvcheck.py`. Shortly after, `pkg/csvcheck.py` also moved to `bc464c98…` (v3.1 docstring + authority rewrite visible in diff).

**Freeze used for all QA runs:** `work/v3-freeze/pkg/` holding the **start-of-review** bytes:
- csvcheck `f3fab56e…ece828`, mutate `1efbda55…183e6`, test_csvcheck `28b9b847…1686`.
- Claimed top-level test bytes (`decfix` 4ffc8d89 / `test_bg5_v3` 6798e288 / `test_bg5_verify` 8f0850d9) were **not recoverable** after the overwrite (no remaining copy on the box). Suite/mutate therefore used **pkg/tests only** plus QA's own probe script. Econ's green-v3-2 log (110+109=219 OK) is treated as Econ's claim, not re-executed on the lost bytes.

---

## D-HOP-2026-11-10-10 (requirement of record)

Verified: leading `## D-HOP-2026-11-10-10 · … verify_ref rulings (amends -06)` at column 0 in `product/decisions.md`.

1. Failed refs report **FAIL**; no CONDITIONAL-UNMET state for refs.
2. Authority by exact path: D-CEO → `decisions.md`; D-HOE → `engineering/decisions.md` only (evidence copies never count); QA-D → `qa/decisions.md`; **D-HOP, D-PMW, D-COL, D-ECON, D-PMFU, D-PMM → `product/decisions.md`** (corrects -06's `product/workers`); unknown prefix FAILs.
3. Until R-1 harness pin exists: report harness **UNPINNED**; that never counts as PASS.

---

## D-1 / D-2 / D-3 on v3 code (f3fab56e)

### D-1 CLOSED (behaviour)
- Entry ID = exact leading `\S+` of a `##[ \t]+` heading; `_ENTRY_ID.fullmatch`; fences (``` / ~~~) skipped; duplicate definitions → NOT VERIFIED; ref-side IDs `\b`-anchored.
- File authority (-06 layout): D-HOP→product, QA-D→qa, D-CEO→root, D-HOE→engineering, **D-PMW→workers**.
- QA probes (`probes/probe_verify_ref.py`, reusable: `probe_verify_ref.py <pkg_dir>`): **56 probes, 0 hard fails**.
  - PASS controls P01/F01/P16/P20/P23/X03/X04/X09 OK on multi-file layout.
  - All should-not-pass (P02–P15, P17–P22, F02–F04, D2_*, X01–X17, D3) fail closed.
  - Extra adversarial: indented heading, `###`, CRLF, tab-after-`##`, trailing `:`/punctuation, unclosed fence, mismatched ~~~/```, symlink authority, path-traversal role path, lowercase heading, Cyrillic-О lookalike, cross-file, workers-only, duplicate heading.

### D-2 CLOSED (behaviour)
- `seeds` must be non-empty `list` of `int` with `bool` excluded; empty / None / float / string / non-list rejected (probes OK).
- `harness_path` must exist; `harness_sha` must equal sha256 of that file (probes OK).
- Relative harness_path resolved from manifest dir (covered by Econ's test claim; not re-run here).

### D-3 CLOSED (behaviour)
- `synthetic=True` with `decisions_paths is None` → `{}` (no live defaults). Probe D3: never PASS ✔.
- No absolute live-path reads required for the freeze pkg suite (110 OK, hermetic fixtures).

### Mutate
- `work/v3-freeze/pkg` mutate.py: **47/47 KILLED**, exit 0 (`logs/qa-mutate.log` e527ff01…).
- Spot-check of new mutants (meaningful): 32 co-mention registration; 35 cross-file authority-from-prefix; 44 empty seeds; 45 harness sha unchecked; 46 synthetic→live fallback. All killed.

### pkg suite
- 110 tests OK (`logs/qa-pkg-suite.log` d3f63b52…).

---

## Expected gaps vs -10 (for v3.1 to close)

| ID | Severity vs -10 | Evidence | What v3.1 must do |
|---|---|---|---|
| **G1** | MAJOR (wording) | Probe T10-1: failed ref → `CONDITIONAL-UNMET` not `FAIL`. Code L486/L555. Overall still NOT-PASS. | Map unverified refs to **FAIL**; remove CONDITIONAL-UNMET for P5IB/FAM ref path. |
| **G2** | MAJOR (authority table) / NOTE for B4 kinds | `_ROLE_OF_PREFIX['D-PMW']='workers'`; default path `product/workers/decisions.md` **missing**. Live: **43** `## D-PMW-*` headings in `product/decisions.md`. -10 routes D-PMW/D-COL/D-ECON/D-PMFU/D-PMM → product. | Implement -10 `_AUTHORITY_FILE` table; stop reading workers; unknown prefix FAIL. |
| **G3** | MAJOR (harness pin) | Probe T10-3: valid refs+manifest with no R-1 pin → **PASS**. No `UNPINNED` state in v3. | Without R-1 pin, P5IB must be **UNPINNED** (never PASS). |

**D-PMW note (task item 3):** under -06 as written, v3's workers path is a faithful implementation of a non-existent file (D-PMW never verifies). Under -10 and factual location (`product/decisions.md`), that is G2. **B4/BG5 verify_ref kinds only accept D-HOP (approval/FAM) and QA-D (b4_run)**, so a wrong D-PMW path does not by itself break a B4 ref today — recorded as authority-table debt, still required for -10 compliance before certification.

---

## Live read-only checks

- `D-HOP-2026-10-24-11`: **two** `##` headings in `product/decisions.md` (one with `(part)` suffix after the ID token; both register as the same leading ID). v3 `_read_entries` returns **2 defs → NOT VERIFIED**. **Not cited** in `m5-gate-acs.md` (0 hits). No HoP flag required for the gate; cleanup of the duplicate heading is still advisable.
- `QA-D-1106-GATEBUILD-R2`: resolves only in `qa/decisions.md` (1 def); 0 in product. ✔
- Gate sha1 e485f762 ✔; s00-base 89014e81 ✔; baselines OK ✔.

---

## Reusable probe

```
qa/reviews/bg5-v3-rereview-20261110/probes/probe_verify_ref.py <pkg_dir>
```
Prints a per-probe OK/GAP/BAD table. Exit 0 iff no hard fails (-10 probes may print GAP without failing the exit). sha256 `51ebf5e728eeac1f0455f22ed7e78acb30fe575008277eabc899c73a1865792c`.
v3.1 re-run: same command against the v3.1 pkg; expect G1–G3 GAPs to become OK.

---

## Writes / side effects

- Wrote only under `qa/reviews/bg5-v3-rereview-20261110/`.
- No writes to `scratch/`, `product/`, or any `decisions.md`.
- No `## QA-D-1110-BG5V3` entry.
- lane-run pids for suite (370529) and mutate (370596); both exited on their own. No kills.

## Evidence index
- `work/v3-freeze/pkg/csvcheck.py` f3fab56e… · `mutate.py` 1efbda55… · `tests/test_csvcheck.py` 28b9b847…
- `logs/qa-probes-v3.log` a7347a7f… · `logs/qa-pkg-suite.log` d3f63b52… · `logs/qa-mutate.log` e527ff01…
- `logs/integrity-snapshot.txt` · `probes/probe_verify_ref.py` 51ebf5e7…
- `work/v2/` prior v2 bytes for diffs

## Next (parent / Econ)
1. Land v3.1 delta closing G1–G3 under -10.
2. Resume this review: re-run `probes/probe_verify_ref.py` + suite + mutate on v3.1 freeze; then write `## QA-D-1110-BG5V3` and the final PASS/FAIL verdict.
