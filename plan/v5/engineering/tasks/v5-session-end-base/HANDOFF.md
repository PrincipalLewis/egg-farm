# HoE/v5-session-end-base — HANDOFF (paper only)

**2026-11-10 01:38 CET · Gen · no commits.** rc/v5 `d65391b0`: `endSession` → `track('session_end')` with **empty** payload.

**Pins:** telemetry-spec v0.6.2 L28 `d170eb09`; errata v5 `5e12a591`; schema blob `e1a5e5dc`; game.ts blob `9469db89`; T-AC9 test blob `46523747`; Saves slice `875771cb`; #127 tip `04add42`.

## Required base fields missing on emit (schema non-opt = spec L28)

| field | schema | spec | emit | source |
|---|---|---|---|---|
| `reason` | enum unload\|hidden | L28, B3 | **n** | needs `endSession(reason)` |
| `fg_ms` | count ≥0 | L28, T-AC8 | **n** | **new** fg accumulator (excl. hidden) |
| `taps_total` | count ≥0 | L28, T-AC8 | **n** | **new** Σ tap/`collect` count |
| `taps_moved_eggs` | count ≥0 | L28 | **n** | **new** taps with eggs>0 |
| `eggs_collected_manual` | count ≥0 | L28 | **n** | **new** Σ `collect.eggs` |
| `coop_full_ms` | count ≥0 | L28, T-AC7 | **n** | partial `coopFullSince`; **need** running total |
| `eggs_lost_while_full` | float ≥0 | L28, T-AC7 | **n** | **new** Game uncapped−capped while full |
| `managed` | bool | L28 §5 | **n** | **new** flags: hire∧manage this session |
| `farm_level` | count ≥0 | L28 | **n** | `state.farmLevel` (exists) |
| `collection_level` | count ≥0 | L28 | **n** | `state.collectionLevel` (exists) |

`coop_full_flapping` is schema-optional (T-AC10) — not in the required 10.

## Gotcha (Saves)
T-AC9 splits `track()` payload literals on **commas**. In the `session_end` literal use **plain keys or `...spreads` only** — no inline comma expressions.

## Overlap
#127 marks `...breedsEnd`; Saves prB adds present fields beside it. Prefer `track('session_end', { ...baseEnd, ...breedsEnd, ...presentEnd })` — base builder first; keep marked blocks.

## Tests / flag-0
Focused: required keys, T-AC7/8, T-AC9 scan, reason unload vs hidden. `session_end` **fires at flag 0** (pinned); required keys are always-on → payload grows. Save/DOM flag-0 goldens stay if they ignore tel payload; refresh any deep-equal on empty `session_end`. `v5-golden-game` checks types/order only today.

## Hours
**6–8 h** — base builder + counters + eggs_lost Game accounting + focused tests. Excludes envelope `sid`/`fgMs` everywhere and hide≥60s rotate.

## Ambiguous
(1) Envelope TEL-AC1 still absent — out unless tasked. (2) Slice `875771cb` once gave base end to Saves; confirm Gen owns it Thu. (3) Ship `unload` only if hidden-rotate slips?
