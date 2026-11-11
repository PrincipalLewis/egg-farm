# F-6 PROPOSAL: what "schema version" means for v5 telemetry (Saves QA -> HoE; co-owned; NOT final) — 2026-10-30 ~13:4x CET
**STATUS: CLOSED (2026-10-30 ~13:4x CET, HoQ C-1): superseded by D-HOP-2026-10-30-41 and D-HOE-20261030-19/-20.** F-6 is closed in favour of the HoE variant (row below, FINAL). Kept in place for history; points 1-5 below are the original QA proposal and are NOT the rule.

| Variant | Status | Rule |
|---|---|---|
| HoE (D-HOE-20261030-19 F-6/F-10, -20 contract; D-HOP-41; HoQ C-1) | **FINAL** | `src/telemetry/schema.ts` exports TELEMETRY_SCHEMA_VERSION = '0.6.2' (a RING-FORMAT version, not a save-migration gate, HoQ 13:37); stored ring `eggfarm.telemetry` = `{v, events}`; export header carries `schema_version`; a stored ring with no `v` (pre-0.6.2 bare array) keeps its events tagged `legacy:true`; T-AC9 validates non-legacy events only; `isPinned(e)` event-based; SAVE_VERSION stays 6, no save migration (telemetry key is separate). |
| QA (this file, points 1-5) | superseded | integer TELEMETRY_SCHEMA = 62, drop legacy events; NOT adopted. |
| D-HOP-40 "no separate schema version" | superseded by D-HOP-41 | — |

Why then: ship-set c3aba321 ("Not flags"): telemetry v0.6.2 ships always-on, "gated by schema version and save-migration tests". No code or spec defines a telemetry schema version yet.

## What exists today (rc/v5 3f582db, read-only git show; e77fc5c identical for these files)
- SAVE_VERSION = 6 (src/save/save.ts:7) is the version of the PROGRESS SAVE only: written into the save envelope `{"version":6,"savedAt",["saveSeq"],"sum","state"}` (save.ts:145-147),
  upgraded by `migrations[n]` 1->6 (save.ts:74-84), a higher version = newer build -> read-only, never overwritten (save.ts:88-94, NewerSaveError :186). It does NOT bump for M5 (F2, m5-fields.ts header).
- Telemetry has NO version anywhere: `eggfarm.telemetry` (telemetry.ts:2) is a bare JSON array of events (load telemetry.ts:29, any non-array -> []; write :68); each event is
  `{...data, type, ts, sessionMs}` (:40/:58/:62); export is `{exportedAt, events}` (:83). Reset keeps eggfarm.telemetry (save.ts:112). No `src/telemetry/schema.ts` (G-8).
- Frozen spec `qa/v5-saves/spec/telemetry-spec.v0.6.2+addendum` names no schema-version field; the addendum says "no version bump" (L254/L260), i.e. the spec has a version (v0.6.2) but the data does not.

## Proposal
1. **Two independent versions, never coupled.** SAVE_VERSION stays the save-file format (6 in v5). A new **TELEMETRY_SCHEMA = 62** (integer for spec v0.6.2) versions the telemetry EVENT
   format. A telemetry change never bumps SAVE_VERSION and vice versa (so the F2 "no bump" rule and the newer-save read-only path are untouched).
2. **Where it lives:** one exported constant in `src/telemetry/schema.ts` (row 11, the same module that holds the allowlist; closes G-8 + TEL-AC11 together); stored ONCE per ring,
   not per event: `eggfarm.telemetry` becomes `{"schema":62,"events":[...]}` (an array = legacy, schema 0); export adds `"schema":62` next to `exportedAt`; `session_start` carries
   `schema` so a ring mixing builds is attributable. (Alternative for HoE: per-event `sv` field. Costs bytes on every event, so not preferred under ring_size 5000.)
3. **When it bumps:** any change to the envelope (e.g. sessionMs -> sid/fgMs), an event added/removed/renamed in the allowlist, a payload field added/removed/renamed, or an enum
   value removed/renamed. Adding an enum value (e.g. resolved_by chip_manage) = bump too, since T-AC9 closed payloads make old checkers reject it. Spec text-only errata = no bump.
4. **Load rule (the "migration" the ship-set refers to):** schema < current -> legacy events are DROPPED (not converted: sessionMs cannot become sid/fgMs), except pinned types
   (session_start/end, upgrade, onboarding_*, milestone_reached, balanced_tier; telemetry.ts:12 isPinned) which are kept and marked `legacy:true`? -> HoE/PM decide; QA
   default proposal = drop all, emit one `telemetry_reset{from_schema}`. schema > current (newer build) -> do not write the ring (mirror of the save read-only rule), keep events
   in memory only. Never block or delay a progress save (T-AC15 "telemetry yields first").
5. **Tests this enables (Saves lane):** TEL-F6-1 v0.6.1 bare-array ring -> loads as schema 0 -> handled per rule 4, save unaffected; TEL-F6-2 schema 63 ring in a 62 build -> not
   overwritten; TEL-F6-3 every exported/stored event validates against `schema.ts` of the same TELEMETRY_SCHEMA; TEL-F6-4 SAVE_VERSION still 6 with telemetry on.

## Needs HoE decision
D1 name/value of the constant (62 vs "0.6.2"); D2 ring envelope object vs per-event field; D3 legacy handling (drop all vs keep pinned); D4 whether adding an enum value bumps.
