# HANDOFF — HoP/PMC-rev15-ZG item (1) · 2026-11-09 23:51 CET

**TASK HoP/PMC-rev15-ZG item (1):** telemetry errata v5 rev. 15 — TELERR7 minors + BBv2 v1.0.4 re-cite (+ TELERR8 n-2 wording). Paper only.

## Restart guard (standing rule 23)
- Task line owner = PMC; write scope = `product/collection/` + PMC own status line in `product/status.md`.
- Matching HANDOFFs re-read: `product/collection/scratch/mrinterp2-errata/HANDOFF.md` (rev. 14 done; TELERR7/BBv2 queued for later — this task); `product/farm/scratch/bbv2-v5/HANDOFF.md` (PMFU-owned; read-only for §8 cite). No owner/scope mismatch.
- Do not touch: ZG-AC10 (item 2), streak held/cap 0.27 rewrite, golden, BR-R5, `product/decisions.md`, harness/CSV/code/build, messages, other specs.

## Verified before write
- Live rev. 14 sha1 `aa9e80faa7428b782a3a4df8d451e20946aca8b8` / sha256 `d836f1184153fccb50c49fa0fabd3d998a01f73c5a7ffc343df54ea39406ed2f` — match task; frozen `telemetry-spec-errata-v5.aa9e80fa.md` byte-identical.
- HoQA TELERR7: `qa/m5/review-telemetry-errata-v5-rev13.md` (m-1…m-4).
- HoQA TELERR8: `qa/m5/review-telemetry-errata-v5-rev14.md` (PASS pinnable; n-2 folded; n-1 deferred).
- BBv2 live + frozen v1.0.4 sha1 `4ea3841a611493aeac821b070b49f694fcc4a29e`.
- eng. decisions.md live sha1 `195e63a191db57e71011d02af0dbc6c88848e676`; D-HOE-33 L519–520 / ZG-AC3 L522 unchanged.
- §8 v1.0.1 ↔ v1.0.3 ↔ v1.0.4: **byte-identical** (sha1 of §8 block `ecc5bf7c…`); line numbers shifted (v1.0.4: §8 L110–117; shown L113; followed L114; zero_gain L115; dead_zone L116; types L117).

## Done
- Live `product/collection/telemetry-spec-errata-v5.md` rev. 15.
- Frozen `product/collection/telemetry-spec-errata-v5.5e12a591.md` (byte-identical, read-only).
- Diff archive: `product/collection/scratch/rev15/rev15.diff` (from `telemetry-spec-errata-v5.pre-rev15.md` = rev. 14).
- Status line appended in `product/status.md`.

## Pins
| Version | sha1 | sha256 | file |
|---|---|---|---|
| predecessor rev. 14 | `aa9e80faa7428b782a3a4df8d451e20946aca8b8` | `d836f1184153fccb50c49fa0fabd3d998a01f73c5a7ffc343df54ea39406ed2f` | `telemetry-spec-errata-v5.aa9e80fa.md` |
| new rev. 15 | `5e12a5918a092558a90db8f217a7fdbe2e5f090d` | `33344f5ed02661147611fd9cf8932998da4d37fe1b0b937eae57e464deaeef9c` | live + `telemetry-spec-errata-v5.5e12a591.md` |

## Minors resolution
| Id | HoQA text | Resolution |
|---|---|---|
| TELERR7 m-1 | row #23 Flag: reword to "0 on every v5 trace (no emitter)" | **Applied** in Flag cell |
| TELERR7 m-2 | G-8: drop schema.ts:171 / test L336 line numbers (or re-cite PR SHA) | **Applied** — dropped line numbers; "Saves WIP encodes all six fields" |
| TELERR7 m-3 | eng. decisions re-cite (was `53369cab` at TELERR7) | **Applied** — live `195e63a1…`; D-HOE-33 L519–522 hold |
| TELERR7 m-4 | BBv2 cite lag v1.0.1→v1.0.3 (§8 identical) | **Applied as task (b)** → v1.0.4 `4ea3841a` (ENFORCE D-HOP-14); §8 unchanged; Sources + rows #19–22 (+ row #21 Type §2 L26→L29) line numbers from v1.0.4 |
| TELERR8 n-2 | one-to-one `s` ≥ 30 at 1 dp both sides | **Applied** (pure wording) |
| TELERR8 n-1 | harness cite → post-sellAll sample site | **Deferred** (Economy) |
| Note "C-2 rc2Refill=0,pause=0 absent vs zero totals" | in earlier task summary, **not** in TELERR7 review text | **Left open** — no HoQA authority text; not invented |

## Open / not this task
1. HoQA exact before/after diff review of rev. 15 + pins.
2. HoE re-pin after pass (rev. 14 `aa9e80fa` stays pin of record until then).
3. Economy harness amendment (TELERR8 n-1 / MRINTERP2 §2.1).
4. Item (2) ZG-AC10 — separate.
5. Streak cap 0.27 rewrite — held for final breeds-on CSV.
6. Optional later: if Engineering owns any "absent vs zero totals" field-semantics ruling for rc2Refill=0/pause=0, not PMC invent.

## Event/field/type/pin/count
**No change.**
