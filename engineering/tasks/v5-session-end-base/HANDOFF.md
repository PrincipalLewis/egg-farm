# HoE/v5-session-end-base — HANDOFF

**2026-11-13 00:22 CET.** `gen/session-end-base` off `origin/rc/v5` `0755a284`. Tip `b9fa9e88` (merge #119). **Not** stacked on tel-envelope or #138.

**Files:** `src/telemetry/session-base.ts`, `tests/v5-session-end-base.test.ts`. No Game / `telemetry.ts` wiring.

**Pins:** telemetry-spec v0.6.2 L28, §3.3, T-AC1–10; TEL-AC2/3; schema.ts; D-HOP-2026-11-10-21; clock-api.md sha256 `be95124a` (contract only, not imported).

## Shipped (pure, no side effects)

- `sessionEndBaseFields` — required 10 keys; **no** `reason` / `fg_ms`. `coop_full_flapping` only when true.
- `sessionStartBaseFields` — T8 TEL-AC2/3; `prev_hidden_ms` on resume only; does not invent `session_id`.
- `sessionSummaryPayload` + `createSessionSummaryProducer` — §3.3, `start.viewport_h`, present counts only, ≤ 1 KB, no sid/ts/fgMs.
- `allocateSessionIndex` — one helper; load and resume both `prev+1`. Returns `{session_index, flags}` to persist with UI flags. Never reuse: persist and pass `flags` back in.
- `createSessionEndBase()` — `{fields, reset, counts?}` for later `registerSessionEnd('base', …)`: tap / collect / coop_full (100-cap, A2 close), managed, first_upgrade. `eggsLostWhileFull`. Viewport buckets from schema; `VIEWPORT_H_CHIP_MAX_PX = 740`.

**T-AC9:** a test locks `game.ts` `track('session_end', …)` to a helper or plain keys / `...spreads`.

## Wired vs pending #138

**Wired:** nothing. Telemetry is always-on; adding fields would break flag-off goldens. `fg_ms`, `reason`, `sid`, rotate, and `sessionSummary` need the envelope.

**Pending #138, then mergefwd `rc/v5`:**

1. `registerSessionEnd('base', {fields, reset, counts})`. Do not double-count `taps_total` with #123's `sessionEndFields` or the envelope `'taps'` contributor.
2. `telemetry.sessionSummary = createSessionSummaryProducer(...)`. Close over the start snapshot; `end.reason` / `fg_ms` from Game. Event-type `counts` is a ring tally passed in.
3. `startSession(..., sessionStartBaseFields(...))`. `session_id` / `reason` / `prev_hidden_ms` come from `startSession`.
4. Persist `allocateSessionIndex` on resume with UI flags; move the `ui/app.ts` load bump onto the helper.
5. Game records taps/collects, coop_full totals, hire/manage. Architect closes an open `coop_full` at hide (A2) before `fields()`.
6. `track('session_end', { ...baseEnd, ...pauseEnd, ...presentEnd })` — spreads only (T-AC9). `#119` already spreads pause and present.

## Gates

`b9fa9e88` tree `9b6f48e2`, Node 20.19.2, 00:17–00:20 CET:
- tsc 0; focused 26/26; flag-off goldens 23/23 (GOLDEN1 `f90d1678…` byte-identical).
- `npm test`: 2493 pass, 1 skip, 1 fail — **pre-existing on rc/v5 `0755a284`**. #123's ST-AC20 test forbids `paused_*`; #119 now emits them. This PR only adds two unwired files.
- build + `check-release-build`: re-run after commit.

## Open questions

1. **managed:** dashboard §5 — hired worker present ∧ ≥1 `worker_manage*` this session. The 11-10 paper HANDOFF said "hire∧manage this session".
2. Who walks the ring for `session_summary.counts`? Producer takes the map as input.
3. First-upgrade `fgMs` needs the envelope clock; the accumulator is ready, Game wiring waits.
