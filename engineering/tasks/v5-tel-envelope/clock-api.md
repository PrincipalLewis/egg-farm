# Shared foreground-clock + session API (for Generalist `session-end-base`)

**From:** Architect · **For:** Generalist (stacker), HoQA (TEL bar) · 2026-11-10 03:05 CET · rev 2 03:25 CET (as built in `v5/tel-envelope` 4d97957: `resume(at, rotate?)`, `sessionSummary` hook, Game-only methods)
**Base:** `origin/rc/v5` `d65391b`; built stacked on #123 `74d640d4` (branch `v5/tel-envelope`). Spec: telemetry-spec v0.6.2 `d170eb09` L13-20, L143, L150, L164-165, L172-173; gate TEL-AC1/2 (`m5-gate-acs.md` L671-672). Design: `HANDOFF.md` §1-4 + A1-A3.

## 1. Module and ownership
- `src/telemetry/session-clock.ts`. Pure TS: no DOM, no `src/sim/*` imports, no timers.
- **Owner: Telemetry.** Exactly one clock per `Telemetry` instance, built with the same `now` as Game. Everyone else reads it via `telemetry.clock` (read-only view). **No second fg accumulator anywhere.**
- **Moved only by page events**, wired in `main.ts` → `Game`:
  - `visibilitychange` → hidden: `pause(at)`; visible: `resume(at)` (via the existing `platform/visibility.ts` hook);
  - `pagehide` → `pause(at)`, then `Game.endSession()`;
  - `pageshow` with `event.persisted === true` (bfcache restore) → `resume(at)`.
  - Nothing else (menus, focus, rAF throttling, sim pause) moves it. A throttled-but-visible tab keeps counting.
- **Sim never reads it** (nor `sid`, nor wall time from it). Fixed-step `advance()`, `src/sim/clock.ts` (attended/focus clock) and `focusFrameMs` are untouched.
- **`sid`**: 6-char base36 `[0-9a-z]{6}` from `crypto.getRandomValues`, never `state.rng` / `evRngState`. Injectable `newSid` for tests only.

## 2. Signatures
```ts
// session-clock.ts
export interface SessionClockOpts { now: () => number; hiddenEndMs: number; newSid?: () => string }
export interface Split { prevSid: string; hiddenAt: number; fgAtHide: number; prevHiddenMs: number }
export interface SessionClockView {
  readonly sid: string;
  readonly hiddenAt: number | null;   // wall ms of the open hide, else null
  readonly ended: boolean;            // session_end already emitted for this sid
  nowFgMs(at?: number): number;       // integer ms, >= 0, frozen while hidden, never decreases within a sid
}
export interface SessionClock extends SessionClockView {
  pause(at: number): void;            // idempotent
  resume(at: number, rotate?: boolean): Split | null;   // Split iff it rotated; rotate:false = R7 frozen tab, same sid
  markEnded(): void;
  rotate(at: number, prevHiddenMs: number): Split;
}
export function createSessionClock(o: SessionClockOpts): SessionClock;

// telemetry.ts (Telemetry)
export interface SessionEndContributor {
  fields(at: number): Record<string, unknown>;   // merged into session_end, registration order
  reset(): void;                                 // called after session_end + session_summary
  counts?(at: number): Record<string, unknown>;  // A1: pure, read before reset (session_summary)
}
readonly clock: SessionClockView;
sessionSummary: ((at: number, counts: Record<string, Record<string, unknown>>) => Record<string, unknown> | null) | null; // A1: Gen sets it; counts keyed by contributor name
registerSessionEnd(name: string, c: SessionEndContributor): void;   // name unique; re-register replaces
endSession(reason: 'unload' | 'hidden', at: number): void;
startSession(reason: 'load' | 'resume', fields: Record<string, unknown>, prevHiddenMs?: number): void; // adds reason, session_id = sid, prev_hidden_ms
// Game-only (@internal): onPageHidden(at), rotateDue(at), onPageShown(at, rotate?)
```

## 3. Semantics
- **`fgMs` / `fg_ms`**: foreground ms since this sid's `session_start`, hidden time excluded. `fg_ms` in `session_end` = `clock.nowFgMs(hiddenAt ?? at)`; equals the last event `fgMs` of that sid (T-AC8). Every event envelope = `{type, ts, sid, fgMs}`; `sessionMs` is gone (T-AC1).
- **`resume(at)`**: gap = `at − hiddenAt`. If `ended` or gap ≥ `hiddenEndMs` → rotate (new sid, fg := 0) and return Split; else keep sid, add nothing. Negative gap → no rotate, fg clamped monotone. `resume` with no open hide → no-op (`null`).
- **`endSession(reason, at)` order (A1)** — inside one call, nothing interleaves:
  1. emit `session_end{reason, fg_ms, ...fields(at) of each contributor}` (sid = ending sid; for `hidden`: `ts` = hiddenAt, `fgMs` = fgAtHide);
  2. emit `session_summary` (Gen's producer, from `counts?(at)`);
  3. `reset()` on every contributor, registration order;
  4. `clock.markEnded()`.
- **Rotate on return (R2)**: `Game.onShown(at)` → `clock.resume(at)` → Split ⇒ `endSession('hidden', split.hiddenAt)` (back-dated) → `startSession('resume', fields, split.prevHiddenMs)` (new sid) → **then** offline grant (`offline_grant` belongs to the new sid).
- **pagehide (R3)**: after an open hide ≥ 60 s → `endSession('hidden', hiddenAt)`; otherwise `endSession('unload', at)`. **One `session_end` per sid**, ever.
- **bfcache (R6)**: `pageshow{persisted}` → `resume`; `ended` is set, so it always rotates exactly once (`prev_hidden_ms` = pageshow − pagehide). Only this handler rotates on bfcache (A3: Gen's interim #127 guard is removed in merge-forward).
- **coop_full (A2/R4)**: Architect closes an open `coop_full` interval at `hiddenAt` before step 1, so `base.fields()` reads final `coop_full_ms` / `eggs_lost_while_full`.
- **R7**: read-only / inactive / resetting / held tabs never rotate and never emit.
- **Threshold**: `balance.json telemetry.session_hidden_end_s = 60`; `validateBalance` rejects any value ≠ `offline.offlineMinSeconds` (B4). `hiddenEndMs = 1000 × session_hidden_end_s`.

## 4. Generalist may / may not
- **May:** read `telemetry.clock.sid` / `nowFgMs()` / `hiddenAt`; `registerSessionEnd('base', …)` once at Game construction with `fields`, `reset`, `counts`; own the `session_summary` producer. `reason` and `fg_ms` are set by `endSession` itself; contributors must not emit them.
- **May not:** call `pause` / `resume` / `rotate` / `markEnded` (not on the view); keep any own fg/hidden accumulator; call `track('session_end' | 'session_start')` directly; call `endSession` / `startSession` outside Game's lifecycle; add a `pageshow` / `visibilitychange` listener.

## 5. Open rulings (pending HoE / PMC — not decided here)
- **(i) `session_start` base fields (T8 / TEL-AC2):** `session_id`, `reason`, `session_index`, levels, `has_coop_hand`, viewport buckets, `reduced_motion`, and deferring load-time events until after `session_start`. In or out of this PR? (+2-3 h)
- **(ii) `session_index` on `resume`:** proposal +1, persisted with UI flags (`flags.sessions`, `ui/app.ts:60`).
- **(iii) `coop_full` `exit_reason:"hidden"` owner (B-1)** — A2 puts the interval close on Architect; the B-1 emitter owner still to confirm.
Until ruled, `startSession` passes caller `fields` through unchanged; the API above does not change either way.
