# Architect review: #127 breeds §8 telemetry emitters @ 04add420 (Generalist)
Reviewer: Senior Software Architect. 2026-11-10 01:45 CET. Read-only: no push, no PR comment, no GitHub mutation.
PR: https://github.com/PrincipalLewis/egg-farm/pull/127 (Ready, base `saves/breeds-drift-d1-d6`).
Head verified: `gh pr view` headRefOid = fetched `pull/127/head` = **04add420ffcf001139938ec0ebeac5297fd6ee17** (tree 332824f6473d4e9c2a58846a6ee0f3c1f006634b). Base #124 `baf410fff30cb6a66e8565693f84ade2250719c2` = merge-base. Delta reviewed: `baf410f..04add42` only (db83f12, 04add42; 12 files, +402/−28; no `src/ui`, `product/`, CSV, balance, schema or golden changes).
Spec of record: `product/m5.1-breeds-spec.md` rev 3.8.9 sha1 ea922eb8 §8 L689–698; telemetry errata v5 rev 15 `product/collection/telemetry-spec-errata-v5.5e12a591.md` sha1 5e12a591 rows #15–18 (L74–77). Both sha1sum-verified. Schema rows `src/telemetry/schema.ts` L91–92/L190–194 already on base.

## Verdict: **APPROVE** (content PASS) at 04add420
No Blocker, no Major. One Minor (m1) and three Nits, none gating. Content PASS is separate from hosted CI and the HoQA/Saves QA verdict at the exact head.

## (a) Sink plumbing (events / timers / offline / state / game)
- Sim-only: every event is pushed to the sim `Sink` (`startHatch`, `revealHatch`, `tickSlotWindows`) and forwarded by `Game.emit`'s generic `track(type, rest)` branch. The UI emits nothing (no `src/ui` diff); `Game.dispatch` → `apply(…, ev)` is the only action path.
- Fixed-step: `breedsTick` runs inside the 100 ms timer pipeline (`timers.ts` passes `ev`); windows count down on sim dt only (window opened by an action closes after 10 ticks; one opened by the auto-slot inside a tick isn't decremented that tick). Order inside the tick: close windows → family seconds (settled at tick start) → settle → incubator/reveal (+ flock_complete) → sinceUnlockMs → auto-slot window. Deterministic, no RNG draw, no wall clock.
- Architect test: the same input script at 20/50/100/200/400 ms frames gives byte-equal breeds event payload sequences, and a rerun is identical.
- Offline: `applyOffline(…, ev)` → `breedsOffline` reveals once with `offline:true`, `wait_ms` capped, `preMs` (away ms up to completion) counted into sinceUnlockMs before the freeze, auto-slot window opened and every window closed in the grant step (away ≥ offlineMinSeconds > 1 s). `grantOffline` emits the grant events once.
- No double-emit: reload mid-incubation emits nothing; reload past completion emits exactly one `breed_revealed{offline}` + one `flock_complete`; further reloads and a ≥ 60 s hidden return add none (`flockCompleteLogged` is saved and set in the same state the boot `save()` writes; `incubator: null` after reveal). Hidden ≥ offlineMin drops the provisional hidden sim and its events (state rolls back to `h.state`) and pays the reveal once in the grant step. Hidden < offlineMin emits the held `h.ev` once. Architect tests cover all three.

## (b) Session-only `breedsTel`
- `GameState.breedsTel?` (state.ts), listed in `m5-fields.ts` `SESSION_ONLY_KEYS`, stripped by `stripSession` inside `m5Persist`, which `serialize` always runs (so main save, `.bak`, IDB mirror and the hidden-snapshot save all go through it).
- Architect save round-trip test (flag on, a live `breedsTel` with hatches = 1, family ms and an open window): the raw save string contains no `breedsTel`; `serialize(state)` is byte-equal to `serialize(state without breedsTel)`; a reload has `breedsTel === undefined`; re-saving the reloaded farm gives the same `state` JSON. The hidden-tab save path also carries no `breedsTel`.
- Absent until the first hatch / slot change / settled tick, so flag-on/no-hatch states are unchanged (PR test, 1,000 ticks).

## (c) Flag 0
- Every emitter is gated: `on(s,b)` (startHatch/placeBreed/breedsTick/breedsOffline), `breedsFlagOn` (flushBreedsTel, sessionEndBreedsFields → `{}`). `track('session_end', {})` is the same as the old `track('session_end')` (default arg `{}`).
- Goldens unchanged (test files untouched by the PR): `flagoff-golden.a01faea` GOLDEN1 f90d1678…, `m4on-golden.90a9c84` GOLDEN1 a54c9cf9… + GOLDEN2 storage bytes, `m4a-flag-off` trace hash = main, `zg-flagoff-dom` 9c4b6439…, K10 breeds-offset seed 1 = harness of record, bot-m5 parity rows: all pass.
- Architect test: at breeds = 0 the Game script (hatch, place, 200 frames, endSession) emits no breeds event, creates no `breedsTel`, and `session_end` has no `breed*` key.

## (d) Names and payloads vs spec
| event | spec §8 / errata | code | result |
|---|---|---|---|
| `hatch_started` (pinned) | breed_id, rarity, cost, coinsBefore, pity_before, free, farm_level; never track/cost_cents; no event on refused press | same 7 fields, cents, pushed only after every BR-R7 guard; not an `upgrade`; `isPinned` += | match |
| `breed_revealed` (ring) | breed_id, rarity, dupe, stars_after, offline, wait_ms (Σ ticks×100 + capped offline decrement); once, in revealHatch | same; wait_ms = hatch_time×1000 − remainingMs (= Σ dt on the tick path; offline decrement clamped at 0) | match |
| `breed_slotted` (ring) | slot, prev_slot, breed_id, prev_breed_id, cause, loadout (incl. settling), settling, count; move = 1; no-op/sanitise = 0; 1 per slot per 1,000 ms; first prev_*, last rest | same, window per destination slot, merge rule as spec (HoQA N2) | match |
| `flock_complete` (pinned) | hatches, farm_level, elapsed_since_unlock_s = floor(sinceUnlockMs/1000), backfilled; once per save | same; `flockCompleteLogged` 0→1 freezes sinceUnlockMs; `isPinned` += | match (n1) |
| `session_end` | breed_hatches, breed_spend_cents, breed_present/away_eggs, breed_broody_cents, breeds_owned, breed_slots_used, breed_loadout_end (settled), breed_family_s {P,A,B}; absent at flag 0 | same 9 keys, schema-valid (PR test merges into full fixture) | match (dev. 3/4) |
Every emitted event in the PR suite is checked with `validateEvent` against `schema.ts`.

## (e) PR-body deviations
1. Out-of-scope one-liners (events/timers/offline/state/m5-fields/game grantOffline): **ACCEPTED**; each is needed to reach the sink or keep the field unsaved. The `SESSION_ONLY_KEYS` line conflicts trivially with Saves prB `breedsCalm`; whoever merges second keeps both keys.
2. `GameState.breedsTel` session-only, same pattern as `breedsRawSlots`: **ACCEPTED**, proven by the round-trip test above.
3. `breed_present_eggs`/`breed_away_eggs`/`breed_broody_cents` always 0 on this base: **ACCEPTED**; the traits PR (Saves, BR-R12/13/14) must feed `breedsTel.presentEggs/awayEggs/broodyCents`, and `breed_away_eggs` must be credited in the grant step (spec: the session in which the grant is applied). Track it on the traits PR.
4. Live `session_end` has no M5.0 base payload and `session_summary.counts` isn't built on rc/v5 (no emitter outside schema.ts): **ACCEPTED as a tracked dependency**, not this PR's scope (telemetry v0.6.2 rows 11/24). The RC can't claim the `flock_complete` count in `session_summary.counts` until that lands.

## Findings
- **m1 (Minor, non-blocking): session accumulators aren't reset after `session_end`.** `endSession` (pagehide) emits the cumulative `breedsTel` counters, but nothing clears them, and `main.ts` has no `pageshow` handler. A bfcache-restored page keeps the same telemetry session and a later pagehide re-reports `breed_hatches`/`breed_spend_cents`/`breed_family_s` cumulatively, so summing `session_end` rows double-counts. Fix: reset the counters (keep the closed windows) after the `session_end` track, or record "last `session_end` per session wins" in the PR body/telemetry notes. A follow-up is fine.
- **n1 (Nit):** tick path: the completing tick's dt (≤ 100 ms) isn't added to sinceUnlockMs before the freeze; offline: the away ms up to completion is. After the floor to seconds the difference is ≤ 0.1 s. A code comment is enough.
- **n2 (Nit):** a save whose flock was already complete with `flockCompleteLogged: 0` (written before this PR) never emits `flock_complete`, and its sinceUnlockMs keeps running. No player has such a save (breeds shipped 0 everywhere), so no action.
- **n3 (Nit):** `addFamilyMs` / `noteSlotChange` allocate a new `breedsTel` every settled tick; fine at 10 Hz, just noting it for the bot/K10 harness cost.

## Evidence (worktree `/workspace/egg-farm-studio/worktrees/rev-127` @ 04add420, Node 20.19.2, flock `.vitest-eng.lock` + nice 10; worktree removed afterwards)
- `tsc --noEmit`: exit 0.
- `sync-economy --check`: "balance.json up to date with economy.csv", exit 0.
- Focused run 1: 25 files / **350 passed, 0 failed**: v5-breeds-telemetry (29), v5-breeds-hatch, v5-breeds-state, k10-breeds-offset, telemetry, telemetry-schema, telemetry-m3, telemetry-ring-export, zg-telemetry-annotate, save, save-fixtures, save-hardening, save-durability-v4, save-recovery-v21, m4a-save-migrate, m4a-saveseq-carry, hidden-save-paths, bug6-savedat, v5-f2-m5-fields, v5-golden-m5persist, m4a-flag-off, zg-flagoff-dom, engineering/golden flagoff-golden.a01faea + m4on-golden.90a9c84, and the architect test (6).
- Focused run 2: bot-m5 + v5-f1b-clock-rng (+ v5-breeds-telemetry again): 3 files / **70 passed, 0 failed**.
- Unique totals: PR tree 385 tests in 26 files pass; architect tests 6/6.
- Architect test (local only, not committed): `scratch/rev-127/zz-arch-rev127.test.ts` sha256 3e030bcba6b35d3e7c56663b4e481fd5c22b8a9855bbd7a961ae341c361badee. It was moved out of the tree before the release build.
- Release check: `npm run build` on a clean tree (sync --check, tsc, vite build, `check-release-build.mjs dist`): all four check lines ok, exit 0.
- check-globals: `node scripts/release-globals-browser.mjs` (chromium): 3/3 PASS, only `eggfarmExportTelemetry`.
- No full `npm test` run by the Architect (budget). The PR body reports a full run of 2320 pass / 1 skip at 04add42; that's not re-verified here.

## Remaining before merge (not cleared here)
1. Hosted CI green at exactly 04add420 (or the same tree after an identical merge-forward).
2. HoQA / Saves QA verdict at the exact head.
3. m1: fix or document it (owner Generalist), either in this PR or a follow-up.
4. Merge order with Saves prB: keep both `breedsTel` and `breedsCalm` in `SESSION_ONLY_KEYS`.

sha256 of this note above this line (all bytes before this final line): 4c87d076d5d25975b2ca68242bf2ff550af3611dfe8fd7864fe49a34b011f2eb
