# F-3 FieldSpec `obj` — planning note (planning started)

**Decision:** D-HOE-20261105-39 / D-HOE-47. Owner: Saves. Before G-8 sign-off; not a #103/#113/#114 merge blocker.
**Trigger:** [#113](https://github.com/PrincipalLewis/egg-farm/pull/113) merged 2026-11-06 ~00:41 CET → `rc/v5` merge `49ee46ddce010f0087515c173d34c6076d47ea44` (head `9083c9a77ab831962ba7b7055d3abe2b550a9b31`, prior base parent `9f74296b06e0d33b619916f18c04736379302f6b`).
**Start coding:** after #114 clears (still open @ `98e1af5`); planning only until then.

## Problem
`src/telemetry/schema.ts` defines FieldSpec kind `obj` (helper `O(...)`) for nested records. D-HOE-25 N-2 allowlist is: enum | int | count | bucket | bool | (+ later float/str/arr). `obj` is outside that list.

## Enumerated `O(` call sites (rc/v5 @ merge 49ee46d / schema tip)
1. Type + `O` helper (`kind: 'obj'`, `checkField` case `'obj'`)
2. `breed_family_s: opt(O({ P: F(0), A: F(0), B: F(0) }))` — nested three floats
3. `session_summary.start: O(START_FIELDS)` — nested start record
4. `session_summary.end: nul(O({ reason, fg_ms, taps_total, taps_moved_eggs, eggs_collected_manual }))`
5. `session_summary.counts: O({}, [{ keyPattern: /^[a-z]…$/, spec: C }])` — empty fixed fields + dynamicFields
6. `session_summary.first_upgrade: nul(O({ fgMs, upgrade, newLevel, cost, taps_before }))`

## Options (prefer cheap re-encode per D-HOE-39)
1. **Re-encode** nested shapes with listed kinds only (validator schema change preferred; keep emitted JSON wire shape):
   - `breed_family_s` → three optional top-level floats `breed_family_s_P/A/B` **or** keep wire key `breed_family_s` as opaque and validate children without `kind:'obj'` (needs Architect/PMC check).
   - `session_summary.start/end/first_upgrade` → flat dotted keys in the schema map, or a one-level record check that does not introduce a new FieldSpec kind.
   - `counts` with `dynamicFields` is the hard case: N-2 has no dynamic map kind; flattening to a fixed allowlist of event-name keys may be large; errata for `obj`+dynamicFields may be cheaper.
2. **HoE PMC errata** adding `obj{fields, dynamicFields?}` to N-2 — ping only if re-encode is expensive or breaks G-8 size/contract.

## Tentative lean (planning, not coding)
- Spike re-encode for `breed_family_s` + fixed nested `start`/`end`/`first_upgrade` **without** changing wire JSON (validator-only).
- If `counts` dynamicFields cannot stay wire-compatible without `obj`, stop and ask HoE for PMC errata covering `obj` (+ optional dynamicFields) rather than inventing a new kind name.

## Next (after #114 merge / HoE go)
1. Open tiny PR on post-#114 `rc/v5` tip; G-8 worst-case size re-run.
2. HoQA before G-8 sign-off.
