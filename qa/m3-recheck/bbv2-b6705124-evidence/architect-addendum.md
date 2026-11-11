# v5-m51-bbv2 (#100): Architect addendum, merge-forward with a real conflict at b6705124

- Head: b67051248fef08351327fe9e8f42690cebcda610 (= origin/v5-m51-bbv2 = pull/100/head; PR open, not draft, base rc/v5 49ee46ddce010f0087515c173d34c6076d47ea44, mergeable=true/unstable, 31 files +1129/-68)
- Parents: ae12da452fa00443a1d12078cd8f9468d34c3591 (prior Architect PASS) + 49ee46ddce010f0087515c173d34c6076d47ea44 (rc/v5 tip: #106 tapCoins 9f74296 + #113 ring export 49ee46d)
- Scope: the authored conflict in src/telemetry/telemetry.ts plus related content only. The inherited unchanged patch is carried from the ae12da4 addendum.
- Verdict: **PASS (delta). The conflict is resolved correctly, and both sides are retained.** Flip stays HELD with no change.

## Identity and merge-tree
- The tree differs from `git merge-tree` of the two parents in exactly one file, src/telemetry/telemetry.ts, which was the only conflict. The resolution removes 4 conflict lines.
- ae12da4..b6705124 touches exactly the 13 rc-delta files: formulas.ts, m5-rules.ts, actions.ts, events.ts, streak.ts, tap-coins.ts, telemetry.ts, plus 6 #106/#113 tests. Nothing else changed.
- There is no change to src/game.ts (frame I_ref reset and bb telemetry), src/econ, src/ui, src/sim/breeds-hatch.ts (M1 ignoreQE2 hatch), src/config/flags.ts, scripts/ (dual release hooks and check-release-build) or balance.json (`git diff --quiet`). So the M1, M2 (zeroGainUiOn), F3 and release-hook content is byte-identical to ae12da4.
- The PR patch excluding telemetry.ts is identical between f8036e8f..ae12da4 and 49ee46dd..b6705124, and the telemetry.ts +/- lines are identical too. Nothing was lost or clobbered.

## Conflict content (telemetry.ts)
- **TelemetryConfig:** keeps #100's interface (ring_size, flush_interval_s, tap_batch_ms, worker_summary_s?, and `bbv2?: {shown_min_gap_s, zero_gain_eta_max_s, dead_zone_min_s, zero_gain_purchase_cap}`). rc's duplicate declaration, which has no bbv2, was dropped. That is correct, because it is a strict subset.
- **#113 content retained verbatim:**
  - the TELEMETRY_SCHEMA_VERSION import
  - `tagLegacy`
  - `readRing`, with four load paths:
    - bare array → tagged legacy
    - `{events}` with no v → tagged legacy
    - versioned → loaded as-is
    - corrupt → []
  - `exportDoc` (schema_version)
  - the constructor loads via readRing
  - flush writes `{v, events}`
  - snapshotJSON and exportJSON go through exportDoc
- **#100 content retained:**
  - isPinned keeps `zero_gain_purchase` and `dead_zone`
  - the bbv2 config reads that bbv2 gating uses
- **Always-on telemetry:** the ring and export paths are not flag-gated, the same as on rc. BBv2 emitters are still gated in game.ts, which is unchanged.
- **#100 tests:** none read the raw ring storage shape, so #113's storage shape change cannot break any of them. zg-ui reads only eggfarm.save.
- **#106 tap-coins:** imports refCents (live I_ss), m4On and tcNum. It is not coupled to Q-E2 or BBv2.

## New-head evidence (Node v20.19.2, lane-run architect, flock, nice 10, maxWorkers 1, clean detached worktree)
- tsc --noEmit: EXIT 0
- sync-economy --check: up to date, EXIT 0
- Focused vitest: 23 files, 291/291 pass, EXIT 0. Files:
  - telemetry-ring-export, telemetry, telemetry-m3, telemetry-schema, export-global, zg-telemetry-annotate
  - bbv2-telemetry, bbv2-m1-hatch-qe2, bbv2-m2-ship-nopick, bbv2-parta, bbv2-qapicker, bbv2-qe2, bbv2-sim
  - v5-tap-coins, v5-income-ref
  - v5-f3-config, v5-f3-is-paused, v5-f2-game-settle, v5-f3-qa-seam
  - m4a-flag-off, zg-ui
  - flagoff-golden.a01faea, m4on-golden.90a9c84
- build and build:html: check-release-build all ok (m4.1+b670512; build id matches HEAD; the only global is eggfarmExportTelemetry). Porcelain was clean afterwards.
- ring-probe.ts (not committed), run with the real balance and its bbv2 block present:
  - Load paths: bare and v-less loads are tagged legacy, versioned loads untagged, corrupt → 0 events.
  - Flush: stores `{v:"0.6.2", events}`.
  - Pinned events: with ring_size 5 plus 20 fillers, both pinned events (zero_gain_purchase and dead_zone) survive the trim (7 stored).
  - Reload: no legacy tag.
  - Export: schema_version equals TELEMETRY_SCHEMA_VERSION.

## Carried (not re-run; the logic is byte-unchanged per the above)
- M1 probe 129,024/0 diffs
- M2 probe pathBad 0
- Slow 200-seed sim (CONFIRMATORY 0 / DECISIVE 25,297 / AC9 0)
- ae12da4 game.ts conflict audit

## Hosted (read-only, once, at 00:47 CET)
- Every run is at the exact head b6705124 and still in_progress: gate run 42131797413, 3 pacing-x1 shards (run 42131797369), and k10 KNOWN-RED (non-required).
- **No SUCCESS claimed.**

## Remaining gates
1. Hosted gate 42131797413 and all 3 pacing shards SUCCESS at b6705124.
2. QA exact-head verdict. telemetry.ts now overlaps #113, so QA needs local tsc plus a full vitest run. Rule 22 applies.
3. rc/v5 still at 49ee46dd at merge time, or else re-merge and refresh required hosted/QA evidence. Under D-HOE-51 / D-CEO-20261106-02, an identical clean merge-forward inherits this PASS; only authored/conflict/content changes require another Architect review.
4. The flip stays HELD with no change. Still open:
   - D-HOE-38 SIM-only flag list
   - N1 BR-BB4 hatch target
   - N2 18-state dump or a HoP/QA AC5 ruling
   - N3 copy plus m1 360 px on 3 engines
   - Econ/HoQA flag-on goldens
   - HELD-flip diff / seam pin
   - m1, m3 and m4

No code or PR mutations, pushes or messages were made.
