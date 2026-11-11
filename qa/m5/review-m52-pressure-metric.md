# HoQA testability review: M5.2 charge-pressure metric v0.3 [QA-D-1025-PM1]
2026-10-25 08:30 CET (Europe/Budapest). Requested by PM Workers for OI-5. This is a QA gate for **M5.2 only**. Paper review, plus a QA re-run of the analysis and a 3-seed re-run of the harness.

## Pins (all verified)
| Item | Hash | Note |
|---|---|---|
| Spec v0.3 `product/workers/m5.2-pressure-metric-spec.md` | 7a5928b542c1bc49c00d3a5af6ad77051c84e2d6 **MATCH** | snapshot `/workspace/snap/pressure-metric-7a5928b5.md` |
| CSV `scratch/f27-verify/csv/o1a.csv` | sha256 a8c4e268…eeeeb07f **MATCH** | |
| Econ-PM `reviews/m5.2-pressure-metric-econ.md` | 8e8603089b67… MATCH | |
| LR v0.8.8 | 08d12ac7… MATCH | |
| Harness `scratch/m51-refill/h2/m5p.ts` / driver `m5px.ts` / runner `press-o1a.sh` | 9eed2879 / c20ad937 / 29db7fae | not pinned in the spec (P7) |
| Analysis `scratch/m52-press/pool2.py` / `press.py` | c0e99c3a / edd65d81 | not pinned |
| Reference output `scratch/m52-press/out/o1a/pool2.json` | 679049195c7b… | 12 × 200-line `pr.*.jsonl` present |

## What QA ran
1. **Analysis reproduction.**
   - I ran `pool2.py` (copy, `PDIR` pointing at symlinks to Econ's o1a p0 files, written to /tmp; Econ's files untouched). It reproduced `out/o1a/pool2.json` **bit-for-bit**, including the bootstrap SEs.
   - I also wrote an independent recompute from the raw series: P_on / P_off / D / R / P5 = 33.12 / 15.16 / **17.96 pp** / 2.185 / 23.98% (optimal); 32.40 / 17.06 / **15.34** / 1.900 / 22.20% (seller15); 30.66 / 19.44 / **11.23** / 1.578 / 21.58% (casual). These match §10.2.
   - Paired-bootstrap SE_D = 0.58 / 0.54 / 0.53 pp, matching §5.
2. **Harness re-run.** `m5px.ts` on o1a, casual, both arms, seeds 146–148 (s148 is the K-W3 seed): 6 sessions in 11 s. Every field (`t10`, `t30`, `start`, `st`, `ex`, `el`) is **byte-identical** to the o1a run of record. The harness is deterministic, and a full gate run (1,200 sessions, ≤ 2 sims) takes about 35–40 min.
3. **Edge census on o1a (1,200 sessions):**
   - F30 never reached: 0;
   - F10 never reached: 0;
   - window K: 1,139–1,504 s;
   - per-second counts are 0–10;
   - sessions with an integer `t30`: 34–44 per profile. Handled correctly: the tick ending at t belongs to second ceil(t)−1, so `K = ceil(t30)−1−start` excludes exactly the second in which F reaches 30.
4. **P5 bootstrap SE** (QA-computed, same paired bootstrap, Random(1), 2,000 resamples): 1.09 / **1.24** / **0.65** pp. PM3 margins in SE: 3.7 / **1.8** / **2.4**.

## PMW's questions
### (a) Can the TS bot emit per-second starved-tick counts for both arms on the same seeds?
**Not today.** Here's what exists and what has to be built.
- **Committed game repo** (`game/` main 737c2cf, d1fb206b, 30b29d3):
  - no Refill charges (rc2 #8), no auto-refill, no clock wage. "Charges held" doesn't exist in `src/`; workers still use the M4 Manage model;
  - `tests/bot-m4.ts` has only the models `seller15` / `cheapest`, with no per-second series and no optimal/casual profiles;
  - there's **no `tests/bot-m5.ts`** yet.
- **Econ scratch harness only:** `scratch/m51-refill/h2/m5p.ts`. It's real `src` step/apply from an **a05bc74 snapshot**, with rc2 charges, auto-refill, clock wage and the M5.0 stack layered on in scratch. Its `PROFS` holds optimal {tap 3/s, check-in 5 s, catch 1}, seller15 {tap 'ac7', 15 s, 0.75} and casual {tap 0.5/s, 30 s, 0.6}. It emits exactly the series §10.3 describes.
- **To build, before the TS bot can be the gate:**
  1. M5.1 rc2 Refill, lighter-refill auto-refill and the clock wage merged (on Vadim's go). Owner: HoE.
  2. The `tests/bot-m5.ts` port, already accepted by HoE (`engineering/decisions.md` 03:21; Features 95daf662, ~0.5 dd, as a kickoff task with Econ parity). It must be **extended** for this spec with:
     - all three `PROFS` profiles, not only `m5x-casual`;
     - the MANAT-32 best-manual off arm and the auto-only on arm (at 30, reserve 0);
     - the M5.0 stack settings of `m5px.ts` (P1);
     - an observe-only per-second `st` series over W.
     
     Owner: HoE/Features; Econ supplies `m5p.ts` / `m5px.ts` at sha.
  3. Parity: per-seed `st` against Econ's reference on the same CSV (P5).
- **Until then,** the run of record is the Econ reference harness. QA can re-run it read-only, as shown above.

### (b) Can the pooled share, ratio, difference and P5 be computed per §10.1?
**Yes, unambiguously.** Pooling = Σ starved ticks ÷ Σ ticks, ratio-of-sums, not the mean of per-seed shares. Nearest-rank P5 = the 10th of 200, ascending. Both match the code.

Two gaps in the text:
- the denominator is **10 × K whole seconds**, so the first partial second at F10 counts as 10 ticks (≤ 0.9 s bias per seed);
- the handling of a seed that never reaches F10 isn't defined (s_i = 0/0).

Neither happens on o1a, but a TS-bot reimplementation needs both stated (P2).

### (c) Is "2 SE reproduction vs the o1a references" workable?
**Only if it's split.**
- On the same harness, CSV and code, the run is deterministic, so reproduction must be **exact**. 2 SE would hide a real change.
- 2 SE is the right parity tolerance for a **different implementation** (the TS-bot port).
- §10.4 defines the SE (paired seed bootstrap) for P_on, P_off, R and D, but **not for P5**, which the report asks for.
- The tolerance applies to the measured values, not to the gate. The gate uses the point values (§10.2 fail rule), and that should be said in one place.
- Thin margins (K-W3 context): PM3 seller15 is 1.8 SE and casual 2.4 SE. So a port within 2 SE of the references can still fail PM3 on the point value. That is correct behaviour (FAIL → HoP), but the text should anticipate it (P5).

## Verdict: **TESTABLE with text fixes** (7)
The gates are testable today on the Econ reference harness; QA reproduced the analysis exactly and the harness byte-for-byte. The TS bot can replace the harness only after the M5.1 code and the extended `tests/bot-m5.ts` port plus parity. That's a named dependency, not a blocker, since this gate is M5.2-only.

**P1 (§10.1 Arms): session config isn't self-contained.**
*Wording:* "Both arms also use the M5.0 stack of `h2/m5px.ts` (sha1 c20ad937), lines 8–10:
- `__clockWage` on, `__payWage` off;
- streakCap 0.28, tapShare 0.03;
- Broody on; golden gap 120–300 s; abilities on;
- sweep A ×1.15;
- hold (frenzy-holder) on, warm on, ssZero on;
- RC2 call cost 10, manual `manAt` 32 (off) / auto {at 30, reserve 0, rest off} (on);
- 12,000 s per session.

A replacement harness must match every item."

**P2 (§10.1 Window, Per-seed share): tick accounting and missing F10.**
*Wording:* "Second index k = ceil(t) − 1 − start for the tick ending at sim time t; start = the second of the first tick at F ≥ 10. **Ticks in W = 10 × K** (whole seconds; the first partial second counts as 10). If a seed never reaches F10 in an arm, the run is reported to Econ and HoP before a verdict (0 / 1,200 on o1a). If F30 is never reached, W runs to session end (0 / 1,200 on o1a)."

**P3 (§10.1 Profiles): the parameters aren't listed, and the call policy's scope is unclear.**
*Wording:* "Profiles (`m5p.ts` sha1 9eed2879 `PROFS`): optimal {tap 3/s, checkBase 5 s, catchP 1}; seller15 {tap 'ac7', checkBase 15 s, catchP 0.75}; casual {tap 0.5/s, checkBase 30 s, catchP 0.6}. Frenzy-holder call policy (`hold` on) for **all three**. Not `pacing-acw1` 'AC-W1 casual'."

**P4 (§10.4): P5 has no SE method.**
*Wording:* "P5: the same paired seed bootstrap applied to the nearest-rank P5 of s_i(on). QA o1a values: 1.09 / 1.24 / 0.65 pp."

**P5 (§10.2 Reproduction tolerance): split it.**
*Wording:*
- "(i) Same harness, CSV and code (`m5p.ts` 9eed2879, `m5px.ts` c20ad937, `pool2.py` c0e99c3a): per-seed series must be **byte-identical** to `out/o1a/`, and `pool2.json` identical.
- (ii) A different implementation (the TS-bot port): parity is accepted if each of P_on, P_off, D, R and P5 is within 2 paired-bootstrap SE of the o1a references. **Per-seed `st` parity on a 10-seed smoke (incl. s148, s116) comes first.** Larger drift → Econ and HoP before a verdict.
- In both cases the gate is decided on the run's point values (fail rule). A port within 2 SE can still FAIL PM3 (seller15 1.8 SE, casual 2.4 SE margins; K-W3) and goes to HoP."

**P6 (§10.3 TS bot): replace the one-liner with the concrete dependency.**
*Wording:* "The committed game has no Refill charges, auto-refill or clock wage, and `tests/bot-m4.ts` has only seller15/cheapest. The TS bot becomes the gate harness after: (1) the M5.1 rc2 Refill, auto-refill and clock-wage code merges (HoE, on Vadim's go); (2) `tests/bot-m5.ts` (HoE 03:21 port; Features 95daf662) carries all three `PROFS` profiles, both arms per P1 and an observe-only per-second `st` series over W; (3) parity per §10.2 (ii). Until then the Econ reference harness is the run of record, re-run read-only by QA."

**P7 (§10.3): pin the method files and the outputs.**
*Wording:* add the sha1s for `m5p.ts` 9eed287938ee…, `m5px.ts` c20ad937fbfd…, `press-o1a.sh` 29db7faef234…, `pool2.py` c0e99c3ace3f…, `press.py` edd65d81555b… and `out/o1a/pool2.json` 679049195c7b…. Also note that `pool2.py` overwrites `{PDIR}/pool2.json`, so QA re-runs write to a copy.

## Record notes (no fix needed)
- The report's "build/commit of the sim" is the a05bc74 snapshot plus scratch layers, until the port exists.
- The o1a −1 runs are partial; that's already stated (R6).
- AC-PM4 re-run list is consistent with K-W3 (LR v0.8.8).

## Spot-check v0.3.1 (9c58e58c5e04a9437929e3ba737bce6c2d695fdf) [QA-D-1027-PM2] 2026-10-27 21:30 CET
- The hash is verified. Snapshot: /workspace/snap/pressure-metric-9c58e58c.md. Diffed against /workspace/snap/pressure-metric-7a5928b5.md (equal to PMW's backup scratch/m5.2-pressure-metric-spec.v0.3.md, sha1 7a5928b5).
- P1-P7 are applied in QA's wording: P1 §10.1 session stack; P2 tick accounting and the never-F10/F30 rules; P3 PROFS; P4 P5 SE (also added to §5 PM3 as 3.7 / 1.8 / 2.4 SE); P5 the split tolerance; P6 the TS-bot dependency; P7 the pins and the pool2 overwrite note. OI-5 is closed.
- **No bar changed:** PM1 ≥ +6 pp, PM2 ≥ 1.25, PM3 P5 ≥ 20%, the 30% tracked target, and AC-LR10/11 still in force. The only change to the PM3 line is the added SE.
- **Pins:** all 12 sha1s match the files on disk (m5p 9eed2879, m5px c20ad937, press-o1a 29db7fae, pool2.py c0e99c3a, press.py edd65d81, pool2.json 67904919, and the 6 per-profile jsonl files).
- **PMW note:** m5px.ts line 9 has `pause: false` in S, and line 10 has `auto: {at 30, reserve 0, rest false, waive0: false}`. Both are true, so QA agrees to fold them into the P1 list. They're already in the spec as a P1 parenthetical, which is enough.
- **Verdict: TESTABLE, nothing to do.** Accepted in the handoff; no message.
