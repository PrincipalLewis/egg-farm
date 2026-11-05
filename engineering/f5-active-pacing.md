# F5 source-only pacing harness, review unit 1

Owner: Senior Engineer, Features & Economy Wiring. Base: rc/v5 `30df38c0a0bd5d48db96d0705abccc6db197d161`.
Scope: sizing F5 / §3; manifest rows 2, 33 and X1. No release flag changes, production changes, pushes or PR creation.

## Design / implementation

Extend the existing `tests/bot-m5.ts` port rather than fork its buying, timing or worker-management paths.
`runSource()` selects its **off** stack (no synthetic M5 or rc2 mechanics), injects focused 10 Hz ticks and
relative wall-clock milliseconds, and validates profile/seed/horizon. The legacy `run()` omits that clock by
default and retains its pins. `never` means strictly zero Collect actions, unlike the existing `idle`, which
collects before the first Coop Hand hire. The three active profiles are unchanged: optimal 3 tap/s and
100% catch, seller15 variance timing / 75% catch, casual 0.5 tap/s / 60% catch. Catch rates are metadata
until the source golden API is integrated; this PR does NOT simulate catch rewards, nest pops or calls.

`activeWindow()` measures paired 600-second runs from independent copies of the same snapshot and seed,
with purchases disabled and management enabled (the existing windowGate convention). Its numerator and
denominator are **net coin deltas after wages**, not theoretical multipliers. A non-positive denominator
is retained as a null ratio and a failure; it is never silently dropped. `summarizeActiveWindows()` reports
raw nearest-rank P95, worst ratio/seed, per-profile/per-farm P95/worst, invalid inputs and missing coverage.
Bounds are the F5 task's P95 2.0 / worst 2.25, without rounding or the older F22–24 exception.
The summary ALWAYS says `DEPENDENCY-BLOCKED`: passing flags-off samples cannot certify full-stack G1.

## TDD and controls

- Behavioral red tests preceded implementation: strict never-tap, real focused streak decay, unknown profiles,
  paired windows and fail-closed metrics. A second red control prevents a high F18 P95 hiding in pooled data.
- Existing model/parity tests remain unchanged. Source-only flags-off casual results equal the old off-stack bytes.
- Slow suite runs seeds **0–99** and reads shipping CSV via the existing `x1Balance('shipped-tree')` builder,
  recording file hashes/flags. It captures natural seller15 snapshots at **F10/F18/F24**, then all three profiles:
  900 measured windows, each 600 seconds. Horizon to capture snapshots: 7200 seconds. These are **checkpoint
  samples**, NOT every rolling 10-minute window or a per-profile independent progression gate.
- G0 control: from each natural F10 snapshot, 600 seconds of never-tap with real customer sales, streak off/on.
  Full event JSON (all events), full per-second state JSON and final state are hashed without field projection.
  This proves the **currently implemented streak** no-tap isolation only, not the entire ship stack.
- AC-SC9 control: abilities flag off/on, seller15, all events until first F10 reach and full L0–9 per-second states,
  seeds 0–99. It is explicitly an **inert-flag baseline**; abilities do not exist on this base. Re-run after abilities
  land. This does not promise tapCoins/streak off/on identity at F8–9, where those features intentionally unlock.

## Acceptance gaps / follow-up gates (not closed by this unit)

1. Merge reviewed income-ref/tapCoins, golden spawn/reward, Broody and abilities APIs. Add real catch/pop/call
   dispatch at the source seams and review RNG/timing policy. Do NOT use the legacy overlay as a substitute,
   invent `fireAbility`, change `m5Persist`, or alter Architect #105's ring/refCents decisions.
2. Repeat G0 and AC7/AC-SC9 against the final enabled/unused stack and baseline of record, including raw-tick
   state coverage if required. The current 600s/per-second-state controls are NOT the full AC7 Python gate.
3. Expand checkpoint samples into the agreed continuous/every-window G1 protocol, both on-cooldown and
   hold-for-Frenzy policies where required. Run against enabled shipping systems with final RC flags and
   each flag delta, seeds 0–99, with Economy cross-check. This PR intentionally makes no full G1 PASS claim.
4. Connect these source-only outputs to Architect's flags-on X1 rebuild after its API contracts land.
   Existing #93/#94 X1/model paths are untouched: their O-3 guard remains authoritative. G5-P is separate.

## Reproduction

```sh
npm ci
npx vitest run tests/bot-m5-active.test.ts tests/bot-m5.test.ts --maxWorkers=1 --minWorkers=1
F5_RESULTS=/absolute/artifact/results npx vitest run --config vitest.slow.config.ts tests/bot-m5-active.slow.test.ts --maxWorkers=1 --minWorkers=1
npm run test:slow
npm run build
```

Run all gates through `ops/tools/lane-run.sh features -- ...` in the studio environment, redirecting logs to
artifacts. `F5_RESULTS` is optional; CI still runs the suite through the existing `*.slow.test.ts` glob and
`npm run test:slow` gate, with no workflow/config change needed.

Reuse evidence read this turn: studio `artifacts/bot-m5-parity/results/VERDICT.md` (port A 200-seed byte
parity), `artifacts/v5-botm5-0951aef/results/` (gates), and
`artifacts/pacing-x1-stack/dryrun-pr92-8411c50/results/summary.md` (old modeled-stack windows every 300s).
Those historical model results are provenance, NOT evidence for the new source full-stack G1.
