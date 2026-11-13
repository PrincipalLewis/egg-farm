# trace10 HANDOFF (Generalist) — TASK HoE/bg3-trace10-impl — PAUSED (D-CEO-20261110-04)

Updated Tue 10 Nov 2026 00:55 CET. PR #122 (Ready), branch `gen/trace10` off rc/v5 f20b9183. Pushed tip **6490bde**, which has no uncommitted WIP. Worktree: /workspace/wt-gen-trace10.
Pins: design sha256 9f375d5f…; contract fc6a9382…; card sha1 **e485f762…** in `tests/trace10/pins.ts` (single config value; `--card-sha1=` override for re-pins).

**Done (committed):**
- 3 hooks in tests/bot-m5.ts (D-HOE-54 / QA-D-1110-TRACE10-G0), with cond. (c) tests.
- R-2 = HoE: runtime read of the private mt/mti behind a guard test, no getter. The guard fails loudly, naming the exact field problem.
- Producer: observer.ts + producer.ts + scripts/trace10.ts. Writes all 5 streams (S1–S4 JSONL with footers, plus the S5 manifest checked by the §8 validator). Buys are derived from state, with a bit-exact coins assertion. Engine draws by replay, V cursor, runner measured 0. Card/harness/producer hashes are taken at run time; Node v20 asserted; dirty tree → INVALID.
- EC-1 gaps.ts: T-EC1a–c as fast tests. T-EC1d is only partial: the manifest carries gaps_export + producer files. The scratch baseline `out/` is absent on disk, so `sha256sum -c` fails identically before and after the run (artifact).
- Real (a): 2-process identity slow test. Real (b): negative control, farm_cost row 5 +1 → farm.costTable.5. Both pass locally.
- P1–P3: slow test plus the CLI `--observer-proof` mode, all equal (15 seed-profiles). P4 is implemented and reports UNAVAILABLE because the raws are missing.
- input-diff.json is written after the verdict (§9), with unit tests.
- Witness @6490bde: before/after MATCH_ALL 15/15, input_check PASS, both MANIFEST.sha256 OK, observer proof P1–P3 EQUAL. 31 s per side for 5×3 seeds. Extrapolation: about 21 min per side for 600 seed-profiles (200 seeds × 3 profiles), single process. Artifacts: /workspace/artifacts/v5-trace10-6490bde/witness/.

**Left:**
1. Full gates @ final tip (tsc, npm test, build, check-globals, slow trace10). At 6490bde only tsc, fast trace10 61/61 and slow trace10 5/5 have run.
2. Update the PR #122 body: M2 scope, the R-2 line, witness results, the perf note.
3. Hosted ci + pacing ids at the final tip → HoQA bar.
4. Optional: P4 once the baseline raws are restored; Architect §16 review.
Estimate: about 1.5–2 h to the final head (gates ~25 min, PR body, CI wait), assuming no review fixes.

No PL-AC5(iii) PASS claim, no run of record, no 600-run.
