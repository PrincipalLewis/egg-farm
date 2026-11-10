# HANDOFF: HoE/v5-tel-envelope (TEL-AC1 envelope sid/fgMs + hidden ≥ 60 s session rotate)

**Owner / builder:** Architect · **Stacks on top:** Generalist `session-end-base` (`engineering/tasks/v5-session-end-base/HANDOFF.md`) · **Reviewers:** Generalist (content, as the stacker), HoQA (TEL bar). Hosted CI and QA are separate from content PASS.
**Status:** paper only until the Thu ~18:00 CET restart. Build starts **after #123 lands** (#123 `74d640d4`, open, rewrites `telemetry.ts`). Push/PR only on Vadim's own go.
**Base:** `origin/rc/v5` `d65391b0868cc993aa39e5bde49d279967c3b8af` · written 2026-11-10 01:56 CET.

## Spec pins
- `product/collection/telemetry-spec.md` v0.6.2 sha1 `d170eb09`:
  - L13-14 session = page load; **hidden split**: a hidden gap ≥ `session_hidden_end_s` (60) ends the session; the return opens a new one (`session_end{reason:"hidden"}` then `session_start{reason:"resume"}`); < 60 s stays in the same session; hidden time excluded from `fg_ms`.
  - L17-20 `sid` = 6-char base36 from `crypto` (not sim RNG) on every event; `sessionMs` dropped; `fgMs` = foreground ms since session start, excluding hidden time.
  - L143 T-AC1 (no event carries `sessionMs`); L150 T-AC8 (`fg_ms` excludes hidden); L164-165 T-AC13 (back-dated `session_end{hidden}` with `ts` = hide time; new `session_start{resume}`, new sid, `prev_hidden_ms` = H ± 1 s).
  - L172 **B3**: no timer while hidden; on visible with gap ≥ threshold emit the back-dated end (fg totals as of the hide) then the resume start; **one `session_end` per sid** (pagehide after a long hide emits the back-dated hidden end, not a second one; after a short hide `reason:"unload"`); open `coop_full` closes at the split with `exit_reason:"hidden"`; read-only/inactive tabs never rotate.
  - L173 **B4**: `session_hidden_end_s` in balance.json `telemetry` block, validateBalance enforces `== offline.offlineMinSeconds`.
- Gate `product/m5-gate-acs.md` sha1 `e485f762` L671 **TEL-AC1**: "Given any exported event, then it has `type` (string, on the allowlist), `ts` (number, ms), `sid` (6-char base36) and `fgMs` (number ≥ 0, non-decreasing within a `sid`). It has no `sessionMs` (telemetry-spec L17–20, T-AC1 L143)." L672 TEL-AC2 `session_start` (needed by the rotate, see T8).

## Current code (d65391b)
| Where | What |
|---|---|
| `src/telemetry/telemetry.ts:17` | `TEvent { type; ts; sessionMs }` |
| `telemetry.ts:46` | `sessionStart = now()` (wall clock, never paused) |
| `telemetry.ts:56-60` | `track()` pushes `{...data, type, ts, sessionMs: t - sessionStart}` |
| `telemetry.ts:78,82,103-104` | summary/tap windows and snapshot also write `sessionMs` |
| `src/telemetry/schema.ts:206` | `ENVELOPE = { ts, sid: /^[0-9a-z]{6}$/, fgMs }` (validator only; `tests/telemetry-schema.test.ts:61-66` already tests it on hand-built events) |
| `schema.ts:78-80,85` | `session_start` requires `session_id`, `reason (load|resume)`, `session_index`, levels, `has_coop_hand`, viewport buckets, `reduced_motion`; `prev_hidden_ms` optional |
| `src/game.ts:67` | the only `session_start`, in the constructor, before load, with `{install_id, build}` only |
| `game.ts:326-330` | `endSession()` (pagehide) → `track('session_end')` with empty payload, save, flush |
| `game.ts:394-417` | `onHidden` / `onShown` / `settleHiddenPeriod` (hidden sim budget, offline grant on ≥ 60 s) |
| `src/main.ts:144` | `watchVisibility(document, Date.now, {onHidden → g.onHidden, onShown → g.onShown + welcome})` |
| `main.ts:146` | `pagehide → g.endSession(); lease.release()`; **no `pageshow` handler** |
| `src/platform/visibility.ts:15-23` | the one visibilitychange hook (`hiddenSince`, `HiddenSpan`) |
| `src/sim/clock.ts:1-40` | the sim's **attended/focus** clock (menus stop it, dt ≤ 1 s) — a different clock; not touched |
| `balance.json` `telemetry` | `ring_size, flush_interval_s, tap_batch_ms, worker_summary_s, bbv2` — **no `session_hidden_end_s`** |

**What #123 (`74d640d4`) changes:** `telemetry.ts` gets `ringPinned` (L72), `TapCredit` and a per-session tap tally `ses = {taps_total, taps_moved_eggs, credited_taps, …}` (L98), `sessionEndContext` set by Game, and `track('session_end')` merges `sessionEndFields()` (L119-145). It **keeps `sessionMs`** (L17, 76, 112, 116, 137-138) and the single constructor `session_start` (`game.ts:68`). So after #123 the tap tally becomes a session accumulator that the rotate must reset.
**#127 (`04add420`) m1 Minor** (`engineering/reviews/telemetry-127-04add420-architect.md` L44): `breedsTel` counters aren't reset after `session_end` and there is no `pageshow`, so a bfcache restore re-reports them cumulatively. **Resolved by this task:** every `session_end` (unload or hidden) is followed by a contributor `reset()`, and a bfcache `pageshow` opens a new sid (rules R5/R6).

## Design

### 1. One shared foreground clock: `src/telemetry/session-clock.ts` (pure, no DOM, no sim imports)
```ts
export interface SessionClockOpts { now: () => number; hiddenEndMs: number; newSid?: () => string } // newSid default: crypto.getRandomValues → 6 base36 chars
export interface Split { prevSid: string; hiddenAt: number; fgAtHide: number; prevHiddenMs: number }
export interface SessionClock {
  readonly sid: string;                // current session id
  readonly hiddenAt: number | null;    // wall ms of the open hide, else null
  readonly ended: boolean;             // a session_end was emitted for this sid (unload); next show must rotate
  nowFgMs(at?: number): number;        // foreground ms of this sid; frozen while hidden; integer; never decreases
  pause(at: number): void;             // visibility→hidden / pagehide; idempotent
  resume(at: number): Split | null;    // visibility→visible / pageshow(persisted); returns Split iff it rotated
  markEnded(): void;                   // called right after session_end{unload}
  rotate(at: number, prevHiddenMs: number): Split; // new sid, fg := 0 (used by resume and by tests)
}
export function createSessionClock(o: SessionClockOpts): SessionClock;
```
- **Owner:** the `Telemetry` instance owns exactly one clock (constructed in Game with the same `now`); everything else reads it via `telemetry.clock` (read-only). Gen's `fg_ms` = `clock.nowFgMs(hiddenAt ?? now)`; **no second accumulator anywhere**.
- **Where it ticks:** it does not tick. It is an accumulator advanced only on edges: `pause`/`resume` from `main.ts` → `Game.onHidden/onShown` (visibilitychange via `platform/visibility.ts`), `pagehide` (→ pause, then `endSession`), `pageshow` with `event.persisted` (bfcache restore → `resume`). A throttled-but-visible tab keeps counting (visibility-based, per spec), unlike the sim focus clock.
- **resume rule:** gap = `at − hiddenAt`; if `ended` or gap ≥ `hiddenEndMs` → rotate and return the Split; else add nothing (hidden time excluded) and keep the sid. Negative gap (clock went back): no rotate, fg stays monotone (clamped).
- **Sim isolation / determinism:** the sim never reads the clock, `sid` or wall time for it; `sid` uses `crypto`, never `state.rng`/`evRngState`; `newSid` is injected in tests. Fixed-step `advance()` and `focusFrameMs` are unchanged. Sim events emitted later (e.g. a hidden < 60 s provisional sim flushed at `settleHiddenPeriod`) are stamped at emit time with the current sid and `nowFgMs()` (≥ fg at hide), so non-decreasing holds.
- **Offline grant order on a ≥ 60 s return:** `Game.onShown(at)` → `clock.resume(at)` → if Split: `session_end{reason:"hidden"}` (sid = prevSid, `ts` = hiddenAt, `fgMs` = `fg_ms` = fgAtHide) → contributors `reset()` → `session_start{reason:"resume", prev_hidden_ms}` (new sid) → **then** `accountHiddenPeriod` (so `offline_grant` belongs to the new session).

### 2. Envelope + consumer migration
- `TEvent = { type; ts; sid; fgMs; [k] }`; `track/tap/sum` windows and `snapshotJSON` stamp `sid` + `fgMs` (window events: sid/fg at window start); `sessionMs` removed everywhere. Aggregated windows that straddle a rotate are closed at the split.
- Stored legacy rings: unchanged rule — no `v` → `legacy:true`, kept; events from a 0.6.2 ring keep their own `sid`.
- Export doc shape unchanged (`schema_version`, `exportedAt`, `events`); `install_id` redaction unchanged.

### 3. Session lifecycle and contributor registry (the stacking contract)
```ts
export interface SessionEndContributor { fields(at: number): Record<string, unknown>; reset(): void }
telemetry.registerSessionEnd(name: string, c: SessionEndContributor): void   // order = registration order
telemetry.endSession(reason: 'unload' | 'hidden', at: number): void            // builds {reason, fg_ms, ...contributors}, stamps envelope, then resets all
telemetry.startSession(reason: 'load' | 'resume', fields: Record<string, unknown>, prevHiddenMs?: number): void
```
Registered: `base` (Gen: taps/eggs/coop_full/managed/levels), `taps` (#123's `ses` tally, moved behind the interface), `breeds` (#127 `sessionEndBreedsFields` + `breedsTel` reset), `present` (Saves). T-AC9's comma-split literal scan: keep `track('session_end', {...})` as one spread-only literal inside `endSession`.

### 4. Rotate rules
- R1 hide < 60 s → same sid, fg frozen during the hide.
- R2 hide ≥ 60 s → on return: back-dated `session_end{hidden}` + `session_start{resume, prev_hidden_ms}` + new sid, then offline grant.
- R3 pagehide after a hide ≥ 60 s that never returned → emit the back-dated `session_end{hidden}` (not `unload`); after a short/no hide → `session_end{unload}`; never two ends per sid.
- R4 open `coop_full` episode closes at the split with `exit_reason:"hidden"` (coordinate with B-1 owner; Gen's `coop_full_ms` reads it).
- R5 every `session_end` → `markEnded()` + contributors `reset()` (fixes #127 m1).
- R6 `pageshow{persisted:true}` (bfcache) → `resume`; because `ended` is set, it always rotates (`session_start{resume}`, prev_hidden_ms = pageshow − pagehide).
- R7 read-only / inactive / resetting / held tabs never rotate and never emit (same guards as `endSession` at `game.ts:327`).
- R8 threshold `telemetry.session_hidden_end_s` = 60 in balance.json; validateBalance enforces equality with `offline.offlineMinSeconds` (B4); `sync-economy` must preserve it (check `fitM4`/telemetry passthrough).

## Tasks and hours
| # | Task | Hours |
|---|---|---|
| T1 | `session-clock.ts` + unit tests (fake `now`, injected `newSid`) | 1.5-2 |
| T2 | Envelope in `Telemetry` (TEvent, track/tap/sum/snapshot), drop `sessionMs`, legacy ring compat | 1-1.5 |
| T3 | Consumer migration: tests asserting `sessionMs` (`tests/telemetry.test.ts:11-13`, `telemetry-ring-export.test.ts:27,52,58`) + ~20 suites reading the ring (`v5-golden-game`, `zg-*`, `ac14`, `onboarding`, `export-global`, …) and `scripts/golden-game-browser.mjs`/`smoke.mjs`; turn TEL-AC1 on real emitted events | 1-1.5 |
| T4a | Wiring for (a): Telemetry owns clock; main.ts pause/resume via existing visibility hook | 0.5-1 |
| | **(a) subtotal** | **4-6** |
| T5 | Rotate in Game (R1-R3, R7, order vs offline grant), `session_hidden_end_s` + B4 validation | 1.5-2 |
| T6 | Contributor registry + reset (R5), move #123 tally behind it, `coop_full` split (R4) | 1-1.5 |
| T7 | `pageshow` bfcache (R6) + jsdom visibility/pagehide/pageshow fake-timer tests | 0.5-1.5 |
| | **(b) subtotal** | **3-5** |
| T8 | **Scope flag:** `session_start` base fields (TEL-AC2: `session_id`, `reason`, `session_index`, levels, `has_coop_hand`, viewport, `reduced_motion`) are absent today (`game.ts:67`) and the resume start must be schema-valid. Needs load-time events deferred until after `session_start` (first event of the sid). Proposed in the same PR. | 2-3 |
| | **Total** | **9-14 h** (7-11 without T8) |

## Tests
- Fake-timer visibility suite (jsdom `visibilityState` + dispatched `visibilitychange`/`pagehide`/`pageshow`): hide 59.9 s → same sid, fgMs excludes it; hide 60 s → back-dated end (`ts` = hiddenAt, `fg_ms` = fg at hide), new sid, `prev_hidden_ms` ± 1 s, `offline_grant` after `session_start`; pagehide after long hide → exactly one end `{hidden}`; bfcache pageshow → new sid, counters reset (re-runs #127 m1 scenario: second `session_end` has `breed_hatches` = only the new session's).
- TEL-AC1 over every exported event of a scripted session: 6-char base36 sid, integer fgMs ≥ 0 non-decreasing per sid, no `sessionMs`; T-AC13; T-AC8 `fg_ms` shared clock equality (`fg_ms` == last `fgMs` of the sid at the hide).
- **Save never contains telemetry ids:** save JSON, `.bak` and IDB mirror payload contain no `sid`, `fgMs`, `session_id`, `fg_ms` keys (the ring lives only under `eggfarm.telemetry`).
- **Determinism / flag-0 byte-identical:** with all `m4.flags` = 0 the save goldens, AC7 flag-off trace `19d4034d`, sim fixtures and DOM goldens are byte-identical before/after; `state.rng` / `evRngState` identical with the clock present (sid via crypto). The telemetry ring itself changes by design (envelope is not flag-gated; TEL-AC10 "0 new event types" still holds).
- Read-only/inactive tab: no rotate, no emits.

## Dependencies
1. **#123 lands first** (same file; its tally moves behind the contributor interface).
2. **Generalist session-end-base stacks on this PR:** uses `telemetry.clock.nowFgMs()` for `fg_ms` (no own accumulator), registers as contributor `base`, gets `reason:"hidden"` from R2/R3 (their "ship `unload` only" fallback is not needed).
3. #127 (breeds) and Saves' present fields re-register as contributors when they merge forward (one-line change each).
4. PMC/HoE open points: (i) does `session_index` increment on a `resume` session (it is `flags.sessions` in the UI key, `ui/app.ts:60`)? Proposal: yes, in-memory +1 persisted with UI flags; (ii) T8 in or out of this task; (iii) `coop_full` `exit_reason:"hidden"` owner (B-1).

## Review gates
- **G0 (paper, now):** Generalist confirms or amends the clock + contributor API above; HoE rules on T8 and `session_index`.
- **G1 (first push, after #123 merge):** T1-T4a; TEL-AC1 + flag-0 goldens green on Node 20.19.2 (focused); Generalist content review.
- **G2 (Ready):** T5-T7(+T8); one full gate run; Generalist content PASS + HoQA TEL bar (TEL-AC1/2, T-AC8/13); hosted CI separate. Gen's stack rebases on G2 head.

## Amendments agreed with Generalist (2026-11-10 01:58 CET)
- A1 (Gen a): endSession order is emit session_end -> emit session_summary -> every contributor reset(). Contributor interface gains optional counts?(at) (pure, read before reset); Gen fills it for 'base' and owns the session_summary producer (schema.ts:99).
- A2 (Gen b): Architect owns closing an open coop_full interval at hide (split time = hiddenAt), so base reads final coop_full_ms / eggs_lost_while_full values. +~1 h to this PR (total 10-15 h incl. session_start fields).
- A3 (Gen c): Gen's interim #127 counter reset + pageshow guard is removed by Gen in the merge-forward after this PR lands; breeds re-registers as a contributor; only the envelope's pageshow handler remains (no double rotate). Test: one rotate per bfcache restore.
- session_index +1 on resume and T8: HoE/PMC to rule.

## Build state (2026-11-10 03:32 CET, Architect, LEAN mode D-CEO-20261110-16)
- **Worktree / branch:** `/workspace/egg-farm-studio/worktrees/v5-tel-envelope` · `v5/tel-envelope` · **local only (not pushed; no PR)**.
- **Base:** #123 head `74d640d46b705d3b22706c4499b43a6b26958c74` (open, unmerged; its base is `f20b918`, 17 commits behind rc/v5) **+ clean merge of `origin/rc/v5` `d65391b0`** → `b1e0cb3` (tree `5fb4b523`), i.e. what #123's merge into rc/v5 gives. Rebase-free: when #123 merges, merge rc/v5 forward.
- **Head:** `4c44090` · tree `c12d9c6341587c06b0036b7b43ace9abb6a85f3a`. Commits: `b2b10d3` T1 session-clock · `4d97957` T2-T7 envelope + rotate · `4c44090` zg tests sid-agnostic.
- **Bundle:** `/workspace/egg-farm-studio/scratch/bundles/v5-tel-envelope-4c44090.bundle` (verified; `--not --remotes=origin`).
- **API as built:** `clock-api.md` rev 2 (sha256 `be95124a…`): `resume(at, rotate?)` (R7), `telemetry.sessionSummary` hook (A1, unset = no summary), Game-only `onPageHidden / rotateDue / onPageShown`.
- **Done:** T1 clock (crypto sid, fg frozen while hidden, monotone, negative-gap clamp); T2 envelope on track / tap & worker_summary windows (sid/fg at window start) / snapshot / export, `sessionMs` gone; T3 consumers (`telemetry.test`, `telemetry-ring-export` incl. balance.telemetry pin + `session_hidden_end_s`, `v5-telemetry-st-ac19-20`, `zg-matrix`, `zg-ui`); T4a/T5 Game wiring (onHidden pause; onShown R2 rotate before the offline grant; pagehide R3; R7 frozen = no rotate); T6 registry (`taps` = #123 tally, A1 order end → summary → reset → markEnded; one end per sid); A2/R4 coop_full closed at hide `{exit_reason:'hidden'}` (telemetry only, reopened in the new sid when still full); T7 `pageshow{persisted}` → `Game.onPageShow` (main.ts); B4 `telemetry.session_hidden_end_s: 60` + validateBalance (absent allowed for pinned fixtures).
- **Tests (Node 20.19.2, flock + nice 10):** new `tests/session-clock.test.ts` (8) + `tests/v5-tel-envelope.test.ts` (12: TEL-AC1 scripted session over ring/export/snapshot, rng determinism, R1, R2/T-AC13/T-AC8, R3 ×2, R7, R6 bfcache + #127-m1 reset, A1 order, R4 split, B4, save has no telemetry ids). Gate at `4c44090`: sync-economy --check 0 · tsc 0 · **vitest 159 files, 2329 passed | 1 skipped (2330)** · `npm run build` + check-release-build ok · check-globals chromium 3/3 PASS. Log `scratch/tel-envelope/full-4c44090.log`. (At `4d97957` the full run had 7 fails: 5 zg sid compares, fixed in `4c44090`; 2 `csr-idb1-mirror` IDB1-5 timing fails under load that pass alone and in the `4c44090` full run.)
- **Not done / next:** T8 `session_start` base fields (TEL-AC2) + deferring load-time events — **pending HoE/PMC ruling**; today start = `{install_id, build, reason, session_id, prev_hidden_ms?}`, so `session_start` is not yet schema-valid (same as rc/v5). `session_index` +1 on resume — pending. B-1 owner confirm for `exit_reason:'hidden'`. Not run: test:slow, golden-game-browser, k10, firefox/webkit globals. G1 push waits #123 merge + Vadim's go.
- **For Gen merge-forward:** register `base` via `registerSessionEnd('base', {fields, counts, reset})`, set `telemetry.sessionSummary`; read `telemetry.clock` only; drop the interim #127 pageshow guard (A3).
