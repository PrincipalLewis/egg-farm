# #117 F-3 FieldSpec obj re-encode: Architect review

- Date: 2026-11-06 02:52 CET (Europe/Belgrade).
- Lane: architect.
- Writes: only this note, the evidence dir and status.md. No source or shared-WT mutation, PR post, Ready, push, merge or message.
- **Review, not publication authority.**

## Identity (live, read-only, 02:46 CET)
- PR #117 is open and **Draft**.
- Head: saves/f3-fieldspec-obj **87bd8b59e89d90c3c592c19e484fe21526caf9ff**, a single commit "F-3: re-encode nested telemetry records without FieldSpec kind obj".
- Base: rc/v5 **71375901de8b72acfaa49c695c5c18f0d0088080**, mergeable clean.
- Size: 2 files, +65/−21: src/telemetry/schema.ts and tests/telemetry-schema.test.ts. The claimed scope is verified by `git diff --stat`.
- Hosted at the exact head: gate, release-globals, pacing-x1 and k10 are all **completed/skipped** (Draft). **There is no hosted gate evidence.**

## Requirement sources read
- engineering/decisions.md D-HOE-20261030-25 **N-2**:
  - FieldSpec additions float, str{pattern} and arr{of,maxLen}
  - optional?/nullable? (neither set by default)
  - capped-marker variant as its own EVENT_SCHEMA entry
  - dynamicFields
  - unknown keys fail
  - Saves owns the detail
- QA rev 6 N-2 / rev 7 ("Closed").
- D-HOE-20261105-39 **F-3**: re-encode with listed kinds, or HoE logs a PMC errata, before G-8. Prefer re-encode if cheap.
- D-HOE-47: F-3 belongs to Saves.
- engineering/scratch/saves/f3-fieldspec-obj-plan.md.

## Ruling on the records shape: **EventSpec.records ACCEPTED as the F-3 closure.** Flattening the wire is rejected, and a PMC errata for `obj` is not needed.
**Why this is not just a rename of the forbidden kind:**
1. **The FieldSpec value grammar is now strictly N-2.**
   - Head FieldSpec kinds are exactly enum|int|count|bucket|bool|float|str|arr. The probe walked all 75 event types, including record fields and every dynamicFields spec.
   - No FieldSpec can contain an object: `arr.of` is a FieldSpec, and RecordSpec.fields are FieldSpecs.
   - `obj` was recursive (obj inside obj, obj inside arr). RecordSpec is **non-recursive, exactly one level, and attachable only at the EventSpec top level.** That is a tighter contract than an errata `obj` would have legalized.
2. **The tier is the one N-2 already uses for structure.**
   - N-2 itself put event-shape constructs at the EventSpec level: the capped-marker variant and dynamicFields.
   - `records` belongs to that same structural tier (the shape of an event's fields). It is not a new value kind, so the N-2 kind list is not widened.
3. **The wire is fixed by spec.**
   - telemetry-spec v0.6.2 §3.3 defines `session_summary.{start, end, counts, first_upgrade}` and `session_end.breed_family_s` as nested objects.
   - Flattening them would change the wire (keys and JSON), which means a spec errata plus a TELEMETRY_SCHEMA_VERSION decision. That is strictly more cost and risk than validator-only re-encoding, and it is what D-HOE-39's "prefer cheap" rules out.
   - The PR keeps the wire byte-for-byte; validation is all that changes.

**Recommended (non-blocking) for HoE:** log one line in engineering/decisions.md saying that F-3 is closed by `EventSpec.records` (one-level RecordSpec, not a FieldSpec kind; Architect ruling in this file). D-HOE-39 offered "listed kinds or errata", and records is a third, tighter path, so the decision trail should say so. No PMC errata is needed.

## Semantics trace (head vs base)
**Required, optional and nullable:**
- `checkRecordSpec` applies Mods to the **whole record**: undefined → `required` unless optional, null → `null` unless nullable, non-object or array → `not object`. It then runs the same `checkRecord` (fixed fields, dynamicFields, unknown → `unknown field`).
- The messages are identical to the old `checkField` + `case 'obj'` path.

| Record | Rule |
|---|---|
| breed_family_s | optional, not nullable |
| end, first_upgrade | nullable, required |
| start, counts | required |

All of these match base.

**Unknown fields:**
- Record keys are added to the top-level skip list, so they are validated only by records and are not double-reported as unknown.
- No record key overlaps `spec.fields` or the envelope (ts, sid, fgMs, type); the probe shows an empty overlap list.

**Envelope:** ENVELOPE checks skip record keys, which is a no-op for today's keys.

**Capped variant:** neither session_end nor session_summary is capped. On capped events, records are skipped exactly as fields were before.

**`counts` dictionary:**
- A record with zero fixed fields plus dynamicFields /^[a-z][a-z0-9_]{0,39}$/ → count, unchanged.
- It is additionally closed by `RULES.session_summary` (each key must be an EVENT_SCHEMA type), unchanged. Dynamic paths stay `session_summary.counts.<k>`.

**Depth:** one level. RecordSpec.fields cannot hold a record or object kind; this is guaranteed by the type and checked by the probe.

**Pinned, types and version:** EVENT_TYPES and pinned are unchanged, and TELEMETRY_SCHEMA_VERSION is still 0.6.2.

**Emitters, other consumers and saves:**
- No src emitter of these records exists outside schema.ts. telemetry.ts only does an EVENT_SCHEMA membership check.
- No other consumer walks `fields` (git grep).
- Nothing touches save code, so SAVE_VERSION 6 is untouched. Ring and export are unchanged.

## Independent evidence (Node v20.19.2, lane-run architect, flock, nice 10, 1 worker; detached WT /workspace/wt-arch-review117 at 87bd8b5)
- `tsc --noEmit`: 0.
- `sync-economy --check`: OK.
- **Differential probe** (tests/zz-arch-probe-117.test.ts; base schema 71375901 loaded side by side as an untracked copy):
  - 60,000 events: session_summary 20,286, session_end 20,302, plus all 75 types.
  - Generated from the base spec, then mutated: missing, null, junk or array values in records and children; unknown top-level, nested and dynamic keys; bad envelope values.
  - 25,583 valid and 34,417 invalid.
  - **Error sets differ in 0 cases, and even error order differs in 0 cases.**
  - Head kinds are free of obj. Record owners are session_end[breed_family_s] and session_summary[start, end, counts, first_upgrade].
- **Focused vitest:** 7 files, **77/77** pass. telemetry-schema 51/51, telemetry, telemetry-m3, telemetry-ring-export, export-global, zg-telemetry-annotate, plus the probe.
- The author's full-suite claim (2220 passed / 1 skipped) was **not used** as verdict basis and not duplicated.

## Findings
- **No Major.**
- **m1 (nit, non-blocking):** the `[F-3]` kind-walk test does not walk `dynamicFields[].spec`, at either the EventSpec or the records level. A future `obj`-like spec hidden in a dynamic field would escape that test. My probe covers it today. Suggest walking dynamicFields specs in a follow-up or on any re-spin.
- **m2 (info):** the test name claims "records are one-level only". That is enforced by the type, not asserted at runtime. This is acceptable.

## Verdict: **APPROVE** (content) at 87bd8b59e89d90c3c592c19e484fe21526caf9ff, with records ACCEPTED as above

## Remaining before G-8 sign-off / merge (not cleared here)
1. Saves takes the PR out of Draft when its owner decides. The hosted gate must then be SUCCESS at the exact head; it is currently skipped.
2. Saves QA / HoQA verdict at the exact head (Rule 22), including the G-8 row re-check. The wire is unchanged and there are no emitters, so a size re-run is expected to be a no-op, but QA confirms it.
3. HoE decision-log line for the records closure (recommended).
4. Authored/conflict/content changes require a bounded recheck. Identical clean merge-forwards inherit this PASS under D-HOE-51 / D-CEO-20261106-02; hosted and QA evidence remain separate.
