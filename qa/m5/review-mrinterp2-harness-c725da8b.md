# HoQA review: MRINTERP2 (a) harness diff, cand/tools/m5mr.ts b2deab63 → c725da8b · 2026-11-05 23:10 CET (QA-D-1105-MRHARN)
Verdict: **ACCEPT-WITH-CONDITION**. The flags-off R04 re-screen may use it once C-1 lands and is re-pinned. No flags-on G4 result counts until C-2.
Verified pins: m5mr.ts c725da8b…; runmr.ts 2cef8d3a… (unchanged); m5mr.diff a0a24d08…; RESULT 28f54471…; HANDOFF 6771be15…; errata rev14 d836f118… (live = frozen); R04 CSV d1cff5ac…; v2 2a521102…; D-ECON 36c01a4b…; gate/m5mr.ts b2deab63 (old twin), gate/runmr.ts 5b8ef0d1.
Diff checks against errata rev. 14 V-2d(1):
- (ii) non-check-in integer seconds: sampled at the old site, only when t < sellT. PASS
- (i) check-ins, fractional included: sampled after sellAll+drain, before the buy loop. PASS. Integer check-in dedupe holds because the pre-sale integer sample is skipped when t ≥ sellT. PASS
- predicate unchanged (same mrAff incl. exemptions and the 1e-12 flags-off approximation); stretch start/end/farm attribution and the open-at-T close (L149) unchanged. PASS
- purchases don't touch mrStart; sampler test 3 shows a zero-gain buy doesn't reset. PASS
- measurement only: 23/23 buyLog sha256 identical, non-MR outputs identical. PASS
- The noBuy guard is consistent across both sample sites. PASS
**C-1 (MAJOR for flags-on, no effect flags-off):** the post-sale sample sits before `credit('broody', nest)` (L125). Broody nest coins are a check-in collection credited before any buy, so with K.broody on the sample under-reads coins at the decision point. Move `sampleMR(t)` to directly after the nest-credit line, so it's still before the pause/manage block and the buy loop. Under flags-off nest = 0, so results stay identical; re-run the 23-seed parity and the sampler test to prove it, then re-pin m5mr.ts.
**C-2:** the flags-on G4 run must use the new sampler. Either update gate/m5mr.ts identically, or name the cand/tools driver and its config as the official flags-on G4 driver and pin it. No G4 result from the old twin counts.
n-1: the spot values (seed 3 189→83, 130 182→79, 175 181→92, 176 188→91) are commentary, not a screen result.
Not authorised here: certification, B4, P-L29 or tuning. S01 stays FAIL183 until the official re-screen.
