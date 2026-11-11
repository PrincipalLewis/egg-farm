# REVIEW PACKAGE — Economy/R04-gate-build (Fri 6 Nov 2026 ~00:15 CET)
**Status: PROVISIONAL-UNCERTIFIED scratch build artifacts for independent HoQA/Architect review. ac_claim NONE. No AC PASS, no screen GO, no trace10 production GO.**
All self-tests use synthetic fixtures only; no simulator/production run, no real raw or CSV used as test input, no existing validator or historical output touched.

## 1. Manifest
See `manifest.sha256` (verify: `cd gate-build && sha256sum -c manifest.sha256`). Logs are included in the manifest; `.tmp/` is empty scratch (test temp dirs, removed after runs).

## 2. Explicit review inputs (read-only; sha256 at build time)
| Input | sha256 | Lines used |
|---|---|---|
| product/m5-gate-acs.md (Card #4) | 7e698b6d5906883f0134dd6183b842c9b0ea6d7af2efa18ab3982475b5331b32 | L867 quantile; L882–895 PL-AC3/4; L916–938 PL-AC5(i)(i-b)(ii)(iii); L940–953 PL-AC6/E-G9; L955–961 PL-AC7; D-HOP-15 amendment |
| product/decisions.md | read at 5ee3372e…; now d034cbf782e2205caf5b8281a06357a4bc74e59f68d816d670eed8c7ac55df32 (appended D-HOP-2026-11-06-01, #115 Pause — unrelated) | L1364 D-HOP-2026-10-29-08 addendum; L1699/L1727–1728 D-HOP-2026-10-30-27; L2327–2335 D-HOP-2026-11-05-15 |
| engineering/decisions.md | 1f17247912a5ce7e622b36869d41e78ed2b15031be51192803b7529f27385468 | L499–510 D-HOE-20261030-30/-31 (combo rename) |
| product/economy/gates.md | 5e76eee5dbd35493ab41a609878ba72989e8761e495f8df7f26c0c75e3049568 | L22 E-G9 |
| product/queue.md | 05d77f7ea16bbc39751504faf35b291905aaf4d6ea366a51fa23f54eda0119ac | nothing Card #4-related |
| before CSV /workspace/scratch-econ-m51pr/data/economy.csv | a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f | 152 cols, rows 0–30 (pinned, not used as test input) |
| prerequisites package scratch/post-l10/cycle-R04-prerequisites/RESULT.md | 28ae643d4786aa0a81e08b922e497e4cffc4329032d941b7cb451df7bd2a6bb1 | provenance matrix, trace10 plan, combo map, repair proposal |
Reviewer note: D-HOP-15 (1) also cites D-HOP-2026-10-30-32 (correction); authority.json does not transcribe it separately — reviewer should confirm it changes nothing for the cap value.

## 3. Commands and outcomes (all via `ops/tools/lane-run.sh econ --`, 1 lane at a time)
| Tag | Command | Exit | Outcome |
|---|---|---|---|
| red-1 | run-tests.sh red-1 | 1 | tests import missing modules (no implementation) |
| red-2 | run-tests.sh red-2 | 1 | csvcheck tests green; reachdiff/bandguard/tailstats/trace10cmp missing |
| green-1 | run-tests.sh green-1 | 0 | Ran 84 tests, OK |
| mutate-1 | run-mutate.sh mutate-1 | 1 | 11/13 killed; survivors #4 rename-without-map, #10 quantile round-vs-ceil |
| green-2 | run-tests.sh green-2 | 0 | Ran 85 tests, OK (targeted tests added for #4, #10) |
| mutate-2 | run-mutate.sh mutate-2 | 0 | 13/13 killed |
| green-3 | run-tests.sh green-3 | 0 | Ran 88 tests, OK (adds tests/test_cli.py exit-code contract) |
TDD honesty: RED was observed at module level only; test_cli.py and the two mutant-killing tests were written after the implementation and passed first run. The mutation self-check is the evidence that tests discriminate.

## 4. What is covered by tests (synthetic)
- **csvcheck**: before pin; structure (BOM/CR/trailing LF, duplicate headers, ragged rows, non-consecutive levels, NaN/inf/empty/malformed cells); breeds must be given (0|1); strict 0–10 parity incl. scoped cap exception (breeds=1 "0.27" CONDITIONAL-UNMET without --b4-ref; "0.270" AMBIGUOUS; breeds=0 literal a8c4 0.28; 0.28 under breeds=1 FAIL); approved rename (positions, values all rows, semantics, HoE ref), unapproved/partial/stale-alias/value-changed rename FAIL; new columns empty 0–10; bc_ listing (approval_ref + B4 ref, constant); W4 rows 0–30 identical + approved L21–30 values; fail-closed rows 11–30 families + allowlist validation; PL-AC6 a/b (boundaries 1.00 exclusive, 1.30 inclusive, exact Decimal)/c report/d; E-G9 strict rise (ties FAIL).
- **gatecommon/raws**: nearest-rank (incl. ceil≠round case), strict JSON, missing/duplicate/unexpected seeds and profiles, duplicate profile across files, runner/cfg/T/parity provenance.
- **reachdiff**: equality of reach 0..10, missing key FAIL, sha pin in non-synthetic mode.
- **bandguard**: ≤180 inclusive, after ≤ before, missing gap key counted, negative/nonfinite FAIL, (c) report.
- **tailstats**: PL-AC3 ±10% inclusive boundary, P10/P50/P90/P95; no reach30 FAIL; PL-AC7 dual path AMBIGUOUS / UNASSESSED; tail ratio report.
- **trace10cmp**: identical PASS; divergence at cut tick (inclusive) FAIL; divergence after cut ignored; first divergence per stream (tick/buy/event/state/rng); missing/extra events; no reach10 FAIL; duplicate/missing manifest; malformed/nonfinite lines; decreasing ticks; flags-on manifest FAIL; streakCap mismatch FAIL; balance_tc diff outside allowed keys FAIL; SYNTHETIC producer rejected in real mode.

## 5. Limitations
1. **trace10 producer NOT implemented** — comparator only, exercised on synthetic JSONL. PL-AC5(iii) remains *not measured = FAIL*.
2. PL-AC1/PL-AC2 not rebuilt; analyze.py stays the card tool. **Unresolved analyzer pin drift** (from Task D VALIDATOR-PROVENANCE 93829962…): analyze.py card-pinned e67f184b… vs on-disk 8f6e4e9b…; compare.py 8a31fe7b… vs 2b85337d…. Not resolved here; no repin.
3. Tools never run on real CSVs/raws; real-mode behaviour (a8c4 pin, before-value cross-checks) is tested only via the reject path.
4. authority.json values were hand-transcribed; QA must verify each against the cited lines.
5. **CSV cap vs runtime:** the CSV cell tc_streak_cap (0.27 breeds=1 / 0.28 breeds=0, historical a8c4 = 0.28 literal; historical R04 CSV .27) is distinct from pl.ts L12 runtime `streakCap: 0.28`, which is inert because pl.ts runs `K = {...S, on:false}`. Tools never infer one from the other; trace10cmp only requires runtime_streakCap equal on both sides.
6. No evidence inheritance: nothing here re-certifies or re-uses R04 measurements.

## 6. QA handoff (decisions needed before any tool can be pinned)
- Agree/replace PROVISIONAL rules in DESIGN.md §PROVISIONAL (1–10): inclusive cut; "0.270" handling; cap rows 11–30; B4 ref form; fail-closed rows 11–30 + allowlist form; E-G9 track list; missing gap key = 0; PL-AC7 rounding (dual path); PL-AC3 boundary; rename-map form.
- Independently review code + tests, re-run `run-tests.sh` / `run-mutate.sh`, then pin by sha256 in a QA-owned record (not done here).

## 7. Engineering handoff (trace producer — not built, no harness touched)
Needs a non-interfering observer in the harness of record (`scratch/post-l10/baseline/h/m5pl.ts` / pl.ts; Econ+Architect own the hash) emitting the JSONL schema in trace10cmp.py docstring:
- events: every `apply(...)` with its action and `drain(t)` SimEvents (m5pl.ts L101 collect, L112 sellAll, L130 manage, L134 buys via pickBuy), tick index i and time t, post-event Farm level F;
- buys: kind + cost/level from the L134 loop (reach set at L135);
- RNG: draws from `R()` (golden egg L90–92) and SellerVariance `V` (checkInterval/tapInterval/delay/cheapFirst L67/99/111/133), plus any engine-internal RNG state carried in sim state (poisson arrivals) — producer must expose a cursor/count per stream;
- state: agreed canonical subset (cash, farmLevel, levels, workers) serialized deterministically;
- manifest: producer id + sha, csv_sha256, cfg, K_on, runtime_streakCap, balance_tc.
Integration gaps: observer must not change RNG consumption or ordering (prove by identical reach maps with observer on/off); harness-of-record hash changes need Architect+QA; trace volume to reach(10) × 600 runs needs sizing; QA must certify producer before any (iii) measurement.
