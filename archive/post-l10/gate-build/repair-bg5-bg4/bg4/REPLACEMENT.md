# BG4 REPLACEMENT PROPOSAL — PROPOSED, UNCERTIFIED (EC-3 / D-HOP-2026-11-09-05)
**Status:** PROPOSED only. No repin. HoQA must certify independently; HoP approves any repin in a separate D-HOP entry.
**Date:** Tue 10 Nov 2026 ~00:10 CET (Europe/Belgrade)
**Package:** `scratch/post-l10/gate-build/repair-bg5-bg4/bg4/`

## 1. Proposal
Replace the unrecoverable Card #4 pins with the on-disk tools (byte copies under `bg4/tools/`):

| Tool | Path (source) | sha1 | sha256 |
|---|---|---|---|
| analyze.py | `scratch/post-l10/cand/tools/analyze.py` (= `gate/analyze.py`) | `8f6e4e9ba92c96fcf7c8ed3aab3ac5314a2c153b` | `1764791afd482ac3ad223db8ab003f412538a0270fdbbc92d2cd0c49e1eea234` |
| compare.py | `scratch/post-l10/cand/tools/compare.py` | `2b85337d9fba5bf3a9edb2f08dbbb33d53c4a3da` | `2100bd704e003f68fa3d4c8e5a5f0fe520caea5d8c9581da56f1c1381086e927` |

Card pins remain authoritative until a separate HoP repin: analyze `e67f184b…`, compare `8a31fe7b…` (`product/m5-gate-acs.md` L859–860; evidence-contract EC-3). Those blobs were not found (see `bg4/PROVENANCE.md` from v1).

## 2. Card-documented outputs (authority)
From `product/m5-gate-acs.md` Card #4 (PL-AC harness / PL-AC1–4):

**Commands**
1. `python3 …/cand/tools/analyze.py <dir> <csv>` → writes `<dir>/metrics.json` (pin sha1 `e67f184b`)
2. `python3 …/cand/tools/compare.py <dir> <dir>/compare.md <dir>/verdicts.json` (before = `sweep/s00-base`; pin sha1 `8a31fe7b`)

**analyze.py metrics (documented)**
- Profiles: optimal, seller15, casual; seeds 1–200; T 4000; CFG none
- Per level L11–29: `tP50`, `tP95`, `tW`, `gP50`, `gP95`, `gW`, `cstep`, `tstep`, `seeds_over_2x`, `fc`, `arrive_P50_min`
- Bands F11-15 / F16-20 / F21-25 / F26-30: `gP50`, `gP95`, `gW`, `tP50_min`, `tP95_min`
- Aggregates: `G4` [P50,P95,worst], `tot10_30_P50_s`, `tot10_30_P95_s`
- Bars: `bar_2x`, `bar_p95_180`, `guard_band_gap`, `gap_seeds_over_180`
- Quantile = nearest-rank; missing gap cell → `x.get(L, 0)`
- Documented gap: writes only P50/P95 of totals (not P10/P90) — gap 8

**compare.py verdicts (documented)**
- `total_pm10` (±10% L10→L30 P50 vs before)
- `2x_P50`, `P95_180`, `bandgap_P95_180`, `bandgap_worst_180` (PL-AC4c listed)
- `maxstep_L11_29`, `perlevel_pm20`, `perband_pm20`, `gap_seeds_over_180`
- Before values from `s00-base/metrics.json` sha256 `d6ac395c…` matching tables `4da712bb…`
- Before band gap P95: optimal 81/125/121/157; seller15 53/79/77/115; casual 35/59/58/93
- Before tot10_30 P50: 2116.0 / 2100.2 / 2041.5
- Before G4: 104/161/202 · 68/115/153 · 59/94/129

**Separate baseline tables tool (not the card pin, but the 4da712bb artifact)**
- `scratch/post-l10/baseline/analyze.py` (sha1 `cf37ff30…`, sha256 `4c12b824…`) writes `out/tables.md` + `out/baseline.json` from single-file `out/raw-<prof>.json` (pl.ts shape). Card cites tables.md as the Econ baseline artifact.

## 3. Behavioural delta (proposed 8f6e4e9b / 2b85337d vs documented pin behaviour)
Pinned blobs `e67f184b` / `8a31fe7b` are **unrecoverable** on this box → no byte-level diff against the pins is possible. Delta below is against the **card's documented contract**, exercised with the proposed on-disk tools.

| Topic | Card / pin docs | Proposed on-disk (8f6e4e9b / 2b85337d) | Delta |
|---|---|---|---|
| analyze CLI | `analyze.py <dir> <csv>` → metrics.json | same | none observed |
| BANDS | F11-15…F26-30 as documented | identical `BANDS` dict | none |
| nearest-rank quantile | documented | `sorted(a)[ceil(p*n)-1]` clamped | none |
| missing gap → 0 | documented (`x.get(L,0)`) | same | none (EC-1 risk remains for producers; analyze itself coerces) |
| tot P10/P90 | documented as missing on pin | still absent | **unchanged gap 8** |
| compare before path | hard-coded `cand/sweep/s00-base` | same hard-code | none |
| compare verdict keys | as listed above | emits all listed keys incl. `bandgap_worst_180` | none observed |
| PL-AC4(b) no-regression judge | card: compare prints both, does not judge (b); TBD script | still does not judge (b) | **unchanged gap 8** |
| Identity self-compare | — | after=before → `total_pm10=[0.0,True]`, empty 2x/bandgap fails as expected on a8c4 | OK |

## 4. Baseline reproduction (a8c4e268 flags-off → tables `4da712bb…`)
**Result: BYTE-EXACT tables.md match.**
**Correction (v3, per QA-D-1110-BG54CERT N-3):** the 4da712bb tables.md match was produced by the *baseline tables script* `scratch/post-l10/baseline/analyze.py` (sha1 `cf37ff30…`), **not** by the proposed `analyze.py` 8f6e4e9b, so on its own it does not exercise the replacement tool. HoQA proved the proposed analyze.py separately (690/690 values vs baseline.json, 0 differences; historical compare outputs reproduced byte-exact). No other BG4 content changed.

Procedure (all under `bg4/repro/`, no new sims; raws reused from existing `cand/sweep/s00-base/` which card states equal baseline pl.ts reach/noAffByF on all 600 seed-runs):
1. Merge `raw-<prof>-{1,101}.json` → `out/raw-<prof>.json` with `seeds=[1,200]` (200 rows each).
2. Run a local copy of `baseline/analyze.py` with CSV patched to `s00-base/cand.csv` (sha256 `a8c4e268…`).
3. Output:
   - `out/tables.md` sha256 **`4da712bb7b53a0eafc11c7e964990483ad768119eddb560e2fbe636eb22527d1`** (MATCH)
   - `out/baseline.json` sha256 **`c9eb596cc45dc4da7484cdc308a637d3fb05565f3dda37a3b2bc653c2b802124`** (MATCH vs baseline/SHA256SUMS)

**Proposed analyze.py (8f6e4e9b) on the same raws:**
- Writes metrics (copy: `metrics.reanalyzed-8f6e4e9b.json`) sha256 `89014e8194bd92fde2c3083ad66804c23ef42ba1e7958295bfbf98c8a07264e1`
- **Values match** card-documented before numbers (G4, tot P50, band gap P95, bar lists)
- **Hash ≠** recorded `d6ac395c…` — original `s00-base/metrics.json` bytes are not recoverable on this box after an accidental in-place rewrite during this task (see §5). Semantic match holds; byte-exact metrics pin does not.

**compare.py (2b85337d):** self-compare of reanalyzed metrics vs s00-base metrics (same values) → identity verdicts (`bg4/repro/compare-self.md`, `verdicts-self.json`).

No new 600-seed sim was started (lane budget shared with screens; existing raws suffice; task forbids screens/tuning/600-run).

## 5. Incident note (outside write scope)
During reproduction, `cand/tools/analyze.py` was invoked with `rawdir=s00-base`, which **rewrote** `scratch/post-l10/cand/sweep/s00-base/metrics.json` in place (outside this package's write scope). Original bytes `d6ac395c…` were not found anywhere on the box afterward. The rewritten file carries the correct documented numeric values; hash is `89014e81…`. Reported here for HoP/HoQA. Future repro must copy raws into `bg4/repro/` first (as done for tables.md).

## 6. What this is not
- Not a pin. Not HoQA-certified. Not a Card #4-certified output.
- Does not restore `e67f184b` / `8a31fe7b`.
- Does not authorize screens, B4, flags-on, or production CSV writes.
