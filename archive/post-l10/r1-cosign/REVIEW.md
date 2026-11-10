# R1 parity co-sign review — bot-m5.ts vs pl.ts on CSV a8c4e268

**Task:** HoP/R1-cosign (D-HOP-2026-11-10-12: no re-run; usage-cap lean)
**Reviewer:** Economy / Balance Designer (executor)
**Time:** Tue 10 Nov 2026, ~01:00 CET (Europe/Belgrade)
**Write scope used:** `scratch/post-l10/baseline/out/` (restore only) + this file. Nothing else written. No sim runs. No analyze on pinned dirs.

## Recommendation: **CO-SIGN**

Architect's verdict PARITY (0/600) is accepted for R-1. No objection gap found that would justify OBJECT under the R-1 scope (PL metrics pl.ts emits on CSV a8c4e268, harness of record rc/v5).

## Evidence checked

| Item | Expected / claimed | Observed | OK? |
|---|---|---|---|
| Architect note | sha256 prefix `609799b9…` | `609799b952f935050488767eb7a29760581608a90e09ae56d44e99d3c09b978f` | yes |
| Artifact `SHA256SUMS` | prefix `158fcc05…` | `158fcc053300c73d898ac2d3f5ade830c5ab31924d557786c36ffe9456f04fa1` | yes |
| `sha256sum -c SHA256SUMS` | all OK | all listed files OK (cards, drivers, results.json, out/*) | yes |
| `results.json` | sha256 `da3e0280…` (per note + SUMS) | present; `verdict: PARITY`, `mismatches: 0`, `seed_runs_compared: 600` | yes |
| Seeds × profiles | 1–200 × optimal, seller15, casual (=600) | each profile `seeds: [200,200]`, status PARITY | yes |
| CSV | `a8c4e268…` | `csv_sha256: a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f` | yes |
| Harness of record | `origin/rc/v5` = `f20b918…` | `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`, `moved: false` | yes |
| `tests/bot-m5.ts` | `d7eee2ee…` | `d7eee2ee5d3799c506bf4d19aa092ba7f9bc5dec8ef31c265116311438d943b7` | yes |
| Reference `pl.ts` | `16ea5da9…` | `16ea5da9e126c456b5537b6d6628f44fba7cc5b2bda40a343e13a458a4e7a21c` (m5.ts `29d423c5…`, m5pl.ts `11ff5046…`) | yes |
| Negative control | detected | seller15 seed 42, `noAffByF[13] +1` → MISMATCH, first_gap_diff L13 23 vs 24 | yes |

## Fields compared (from `results.json` metrics + `compare.py`)

Exact equality per seed, both harnesses, CFG none, T 4000:

1. **`reach_0_10`** — reach times for levels 0..10 (PL-AC5(ii) window)
2. **`reach_all`** — full reach map (per-level first-reach times / trajectory over all levels)
3. **`noAffByF_raw`** — raw Gap(L) / noAffByF map "as pinned" (Card L873)
4. **`gap_EC1_L11_29`** — EC-1 view L11..29 (observed when reach(L+1) exists; else unobserved / 0)
5. **`longestNoAff`**
6. **`spanBuy`**
7. **`spanFarm`**

Coverage claim in the Architect note: every metric pl.ts emits; 200/200 seeds per profile. Self-checks also 0/600 (traced vs untraced bot-m5; replicated gap max vs bot-m5 longestNoAff; pl.ts parityMismatches = 0 × 3).

**Not compared (and not claimed as compared):** per-buy / purchase-event sequences; per-event traces; runner-RNG identity. Architect explicitly scopes those to trace10, not R-1. Aggregates `spanBuy` / `spanFarm` are compared.

## Gaps considered for OBJECT

| Candidate gap | Severity for R-1 | Decision |
|---|---|---|
| Purchase-event lists not field-compared | Low — outside pl.ts-emitted PL metrics; spanBuy is compared | not OBJECT |
| Per-event / runner-RNG not checked | Low — Architect scopes to trace10 | not OBJECT |
| Negative-control temp copy not retained in artifact dir | Low — result documented in `results.json.self_checks` with seed/level | not OBJECT |
| `baseline/out/` was missing on disk | Operational — addressed by restore below | not OBJECT |
| Wrong CSV / missing profile / unpinned harness | None observed — CSV a8c4e268, 3/3 profiles, harness + bot-m5.ts + pl.ts all pinned with shas | n/a |

No gap justifies OBJECT under D-HOP-2026-11-10-03 / R-1.

## Restore result (pins 350b87db / 02f0e389 / 4358a9f2)

Copied (not moved) from `artifacts/v5-r1-parity-f20b918/out/pl-raw-*.json` → `scratch/post-l10/baseline/out/raw-*.json`. Artifacts unmodified. No analyze run.

| Pin prefix | Artifact source | Restored path | Full sha256 | Result |
|---|---|---|---|---|
| `350b87db` | `out/pl-raw-optimal.json` | `baseline/out/raw-optimal.json` | `350b87db66f16693cd957569255862255e38b46a4f5fa46cd8b16179b435764d` | **RESTORED — pin match** |
| `02f0e389` | `out/pl-raw-seller15.json` | `baseline/out/raw-seller15.json` | `02f0e38997ba5e32d5f1b3d7118b02f0bc15ff207958c128260987bd51960910` | **RESTORED — pin match** |
| `4358a9f2` | `out/pl-raw-casual.json` | `baseline/out/raw-casual.json` | `4358a9f2b864628fa9ceb72cf4fb5f12785e3b7e929ba24fa5dcb116cc193e94` | **RESTORED — pin match** |

All three pins had a matching artifact. No pin left unrestored.

Note (out of restore scope for this task): `baseline/SHA256SUMS` also pins `out/raw-*.log`, `out/raw-*.exit`, `out/baseline.json`, `out/tables.md`. Matching logs/exits exist under the artifact dir and match those SUMS entries, but this task's pin list was the three raw JSON prefixes only; logs/exits/baseline.json/tables.md were not restored here.

## Shas (summary)

- Architect review: `609799b952f935050488767eb7a29760581608a90e09ae56d44e99d3c09b978f`
- Artifact SHA256SUMS: `158fcc053300c73d898ac2d3f5ade830c5ab31924d557786c36ffe9456f04fa1`
- results.json: `da3e0280b165f2d1d41383bbe30dbbf7a53d8a3f461666bdcb4b59ec732d5ad5`
- CSV: `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f`
- Harness rc/v5: `f20b91839fdf09ba0ed45a890281ccbf7bf2909d`
- bot-m5.ts: `d7eee2ee5d3799c506bf4d19aa092ba7f9bc5dec8ef31c265116311438d943b7`
- pl.ts: `16ea5da9e126c456b5537b6d6628f44fba7cc5b2bda40a343e13a458a4e7a21c`
- Restored raws: optimal `350b87db…`, seller15 `02f0e389…`, casual `4358a9f2…` (full digests in table above)
