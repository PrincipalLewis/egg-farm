# HANDOFF — HoP/R04-repair-screen (D-HOP-2026-11-09-04, updated D-HOP-2026-11-09-05) · Mon 9 Nov 2026 ~23:58 CET
TASK (reread before writes): prep (candidate generator + invariant validator + tests, ENVELOPE.md for (a)/(b)/(c), a8c4e268 flags-off pl.ts control with PL-AC1/2) THEN, per update -05, screens GO: STRATEGY.md "de-stack and relocate", envelope = option (a) (steps L11..29 in (1.00,1.30]; L29→30 excluded; anchors L10=1368, L30=624316; no sawtooth within L11–29), tunables farm_cost L11–29 + hens_cost/egg_value_cost rows 14–29, ≤30 candidates/round, ≤2 rounds, then STOP and report. INFORMAL (VALIDATOR-RUN) only. Early stop + report on joint PL-AC1/PL-AC2 infeasibility evidence.
WRITE SCOPE: scratch/post-l10/cycle-R04-repair-screen/ only. Everything else read-only.
Handoffs reread: cycle-R04-full-constraint-diagnosis/HANDOFF.md (diagnosis complete; STRATEGY proposal-only; next step needed HoP authorization → now given by D-HOP-2026-11-09-04/-05, product/decisions.md L2374–2381) and gate-build/repair-bg5-bg4/HANDOFF.md (BG5/BG4 ready for review; tools uncertified). Owner Economy. No task/owner/scope mismatch.
Noted discrepancies (not blocking, reported):
 1. "Record PL-AC1/PL-AC2 with the repaired gate tools": repair-bg5-bg4/pkg does NOT implement PL-AC1/2 (tailstats deliberately omits them; analyze.py is the card tool, pin drift BG4). PL-AC1/2 are computed by a scratch script here (metrics.py) that imports pkg/gatecommon (nearest-rank q, strict raw loader with identity/provenance checks) and follows Card #4 definitions; PL-AC3/4/7 via pkg tailstats/bandguard. All INFORMAL.
 2. R04 base CSV d1cff5ac carries w4_price_mult rows 21–30 = 2.25/2.5/2.5/2.75… (unapproved); HoP FIXED w4 at a8c4 (2.5/3.0/3.0/4.0×7). Generator applies the a8c4 w4 cells as an explicit FIXED overlay (only non-tunable diff vs R04) and validates them; flagged for HoP.
 3. Card #4 file sha256 now 0305d5c0… (was 7e698b6d… at gate-build time); PL-AC1/2/6 text read at current sha.
 4. Seeds/profiles: STRATEGY.md names no seed count; Card #4 / AC-MATRIX harness protocol = SEEDS=200 S0=1 T=4000, profiles optimal/seller15/casual, CFG none, pl.ts. Used for control and screens. This is NOT the "600-run of record" (D-HOP-04: one best candidate after BG4/BG5 closure under separate GO).
FORBIDDEN: product/repo CSV writes, 600-run of record, flags-on, breeds arm, B4, pins, publication, messages; kills by name/pattern. Lanes: econ, 1 by default, 2 only when no other econ job is live.

## Progress log (CET)
- 2026-11-09 23:55 first control launch failed instantly: baseline/h/node_modules is a symlink to scratch/m51-pr/gates/h/node_modules,
  which no longer exists after the 9 Nov box replacement. Nothing outside this folder was changed. Fix: h/ = byte copy of
  baseline/h without node_modules (274 files, h-source.sha256, 0 mismatches) + node_modules symlink -> /workspace/wt-v5-golden-game/node_modules
  (vite-node 2.1.9, same version as INSTALL.md). Runtime node v24.22.1 (INSTALL.md recorded v20.19.2).
- 23:57–00:00 control a8c4e268 (control/run): parity 0 ×3; 600/600 reach maps byte-identical to cand/sweep/s00-base-mr (read-only
  compare); tot10_30 = 2116.0/2100.2/2041.5 = card refs; PL-AC1/2 fail sets identical to the card's before values → env validated.
- 00:0x equivalence: R04 reference (bc_*, tc_streak_cap 0.27, combo rename, a8c4 w4 overlay) with a8c4 farm/hens/EV → 600/600 reach maps
  identical to the control (diag/equiv) → the gen.py reference is sim-equivalent to a8c4 flags-off; the control is the true base.
- 00:08 HoP steering (no tool writes into pinned dirs): metrics.py now imports a VENDORED copy tools/vendor/gatecommon.py + authority.json
  (sha fe9c179f / 5ec50ad5 = repair-bg5-bg4 manifest). Earlier imports from gate-build/repair-bg5-bg4/pkg were read-only; no __pycache__ or
  other file was written there (checked). analyze.py/compare.py never run. NOTE: gate-build/repair-bg5-bg4 is being modified by someone
  else (csvcheck.py/mutate.py mtimes 00:01–00:02, manifest.v1.sha256 present) — not by this task.
- Diagnostic (not screens): tools/trace.ts (unmodified m5.run with 1 s snapshots) on the control, tools/surrogate.py (first-order, fixed
  purchase phase) and tools/opt.py (surrogate search). Brief lane overrun: 00:13–00:15 three econ lane jobs were live (2 light python
  surrogate searches + 1 trace); no pl.ts overlap.
- 00:21 round 1 launched (10 candidates, 2 lanes; no other econ job live).
- 00:42 D-CEO-20261110-02 usage cap: STOPPED after round 1 (10 candidates). No further screens or diagnostics. See RESULT.md.
