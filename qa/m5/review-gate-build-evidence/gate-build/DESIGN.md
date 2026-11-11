# DESIGN — Economy/R04-gate-build scratch validators (PROVISIONAL, for independent review)

No interactive design approval was possible (executor run). The design is recorded here for HoQA / Engineering review; every
interpretation not fixed by authority is marked PROVISIONAL and evaluated fail-closed.

## Approaches considered
1. **Extend existing analyze.py / compare.py / celldiff.py** — rejected: forbidden (preserve existing validators; pin drift unresolved), and would mix certified-path code with new logic.
2. **One monolithic gate script** — rejected: harder to review/pin per AC; one defect blocks all.
3. **Chosen: small single-purpose stdlib tools + shared helper + authority.json**, each with a JSON report (`ac_claim: NONE`, `status: PROVISIONAL-UNCERTIFIED`), exit 0/1/2, synthetic-only self-tests and a mutation self-check.

## Units
| File | AC scope (Card #4) | Inputs | Notes |
|---|---|---|---|
| gatecommon.py | shared | — | nearest-rank q (L867), strict JSON (rejects NaN/Infinity), exact Decimal parsing, raw loader with identity/provenance checks |
| authority.json | constants | — | every threshold transcribed with a source line; QA must re-verify |
| csvcheck.py | PL-AC5(i), (i-b), new columns; PL-AC6(a)(b)(c-report)(d); E-G9; D-HOP-11-05-15 W4 + cap exception; D-HOE-30/31 rename | before/after CSV, --breeds, optional rename map / bc listing / allowlist / --b4-ref | |
| reachdiff.py | PL-AC5(ii) | pl.ts raws before/after | reach(0..10) exact equality |
| bandguard.py | PL-AC4(a)(b), (c) report | pl.ts raws before/after | |
| tailstats.py | PL-AC3 (+P10/P90/P95), PL-AC7 dual-path, per-level tail ratio report | pl.ts raws after (+before) | PL-AC1/2 deliberately not re-implemented |
| trace10cmp.py | PL-AC5(iii) COMPARATOR only | two JSONL traces | producer NOT implemented |
| mutate.py | self-check | copies under .tmp | proves the suite kills 13 deliberate defects |

## Decisions fixed by authority
- Rows 0–10 string-identical to a8c4e268 on all 152 columns; sole numeric exception tc_streak_cap = 0.27 with breeds=1 (D-HOP-2026-11-05-15 (1)); rename only via explicit map + byte-identical values + HoE confirm (Card L916–920).
- breeds=0 → literal a8c4 0.28 (D-HOP-2026-10-29-08 addendum); v5 ships breeds=1 (D-HOP-2026-10-30-27, product/decisions L1728) — the tool requires `--breeds` explicitly and never defaults.
- W4 rows 21–30 = a8c4 (2.5 / 3.0 / 4.0) (D-HOP-11-05-15 (2)); bc 700 unapproved, 2000 not endorsed (3).
- PL-AC6(b) exact unrounded 1.00 < step ≤ 1.30 for L11–29 (L946–948); row 30 = 624316; no L31+.
- PL-AC3 refs 2116.0/2100.2/2041.5, ±10% on P50; P10/P90 reported (D-HOP-37 D).
- PL-AC4 bands/levels, before gP95 values, zero tolerance (L887–895).
- PL-AC7 bands reach(11→16), (16→21), (21→26), (26→30) (L960–961).

## PROVISIONAL interpretations (fail-closed; need QA agreement)
1. **trace10 cut = INCLUSIVE reach(10) tick** (all events with tick index ≤ first BEFORE event with F ≥ 10). Card says "up to the reach(10) tick".
2. **Cap exception string form:** "0.27" string-identical; a numerically equal variant ("0.270") → AMBIGUOUS (not PASS).
3. **tc_streak_cap rows 11–30** follow the breeds mode (0.27 / 0.28), constant; outside PL-AC5(i) proper.
4. **B4 condition**: breeds=1 cap verdict is CONDITIONAL-UNMET unless `--b4-ref` cites the final combined B4; overall NOT-PASS.
5. **Rows 11–30 change policy**: fail-closed — only farm_cost L11–29 (PL-AC6) may differ; any other family needs an allowlist entry with an authority reference; rows 0–10, W4, tc_streak_cap, bc_*, renamed columns and farm row 30 can never be opened by an allowlist. W4 rows 0–20 fail-closed (no approval located).
6. **E-G9 tracks**: farm_cost, hens_cost, egg_value_cost, collection_cost (collection included as a per-level cost track; hire constants excluded).
7. **Missing noAffByF[L]** counted as 0 (analyze.py convention) but counted/reported.
8. **PL-AC7 rounding**: both rounded-minutes (compare.py style) and unrounded paths; disagreement → AMBIGUOUS; no before raws → UNASSESSED. Minute rounding replicates analyze.py float `round(x/60,2)`.
9. **PL-AC3 boundary**: exact Decimal |P50/ref − 1| ≤ 0.10 (inclusive).
10. **Rename map** must be empty or exactly the approved two-entry set, with semantics fields equal to authority.json (units/clocks/trigger/flags) and `hoe_confirmation_ref` D-HOE-20261030-31.

## Verdict vocabulary
PASS / FAIL / AMBIGUOUS / CONDITIONAL-UNMET / UNASSESSED / REPORT. Overall PASS only if every non-REPORT check is PASS; everything else is NOT-PASS. `--synthetic` relaxes only the a8c4/before-sha pins and allows test overrides; such reports say SYNTHETIC and are never evidence.
