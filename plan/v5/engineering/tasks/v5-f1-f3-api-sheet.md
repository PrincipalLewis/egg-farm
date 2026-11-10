# v5 F1a/F1b/F1c/F3 API sheet (for the UI engineer)
Author: Senior Software Architect, 2026-10-29 (CET). Repo PrincipalLewis/egg-farm, base `rc/v5` 22eac98.
All `file:line` refs are at the F3 head (`feat/v5-f3-config`, ecf8297; rc/v5 406e455 with #81 F2 merged in), which contains F1a+F1b+F1c+F3. Paths are relative to the repo root.

## PRs
| piece | PR | branch | head SHA | base | depends on |
|---|---|---|---|---|---|
| F1a fields/types | #77 https://github.com/PrincipalLewis/egg-farm/pull/77 | feat/v5-f1a-fields | 008bcca045e225f03a6f1a9e601a0fd977557898 | rc/v5 | — |
| F1b clock + evRng | #79 https://github.com/PrincipalLewis/egg-farm/pull/79 | feat/v5-f1b-clock-rng | 6ece3e0ad194b2b4b086cc30cd8ff673c2bf73b2 | rc/v5 | #77 |
| F1c effects registry | #80 https://github.com/PrincipalLewis/egg-farm/pull/80 | feat/v5-f1c-effects | 1a64e95c99a00606d40816f0184d4613ef968366 | rc/v5 | #79, #77 |
| F3 config + flags | #82 https://github.com/PrincipalLewis/egg-farm/pull/82 | feat/v5-f3-config | ecf8297 | feat/v5-f1c-effects | #80, #79, #77 |
All are Drafts; CI `gate` skips Drafts (ci.yml), so CI runs when each is marked Ready.

## 1. Flags and tunables (balance.json, all under `m4`; flag-off = goldens f90d1678 / a54c9cf9 byte-identical)
Every flag is a 0/1 number, default 0, and needs `m4.enabled` (= 1 shipped). Read flags ONLY with `flagOn(b, name)`.
The specs' `m5.flags.*` / `m5.zeroGain.*` names live under `m4` (single namespace, manifest rule 5 / rows 28–29).

| exact path | default | notes |
|---|---|---|
| `m4.enabled` | 1 | master switch (unchanged) |
| `m4.flags.golden` | 0 | #1 golden egg; also seeds evRng |
| `m4.flags.streak` | 0 | #2 |
| `m4.flags.tapCoins` | 0 | #3 |
| `m4.flags.abilities` | 0 | #4 |
| `m4.flags.broody` | 0 | #5; also seeds evRng/brRng |
| `m4.flags.salesStopped` | 0 | #5b |
| `m4.flags.fatigueCue` | 0 | Rule 2 chip's own cut flag (D-HOP-2026-10-29-05) |
| `m4.flags.pause` | 0 | #4b Pause; gates `isPaused()` |
| `m4.flags.rc2Refill` | 0 | M5.1 lighter refill |
| `m4.flags.autoRefill` | 0 | M5.1 |
| `m4.flags.clockWage` | 0 | M5.1 failure cost |
| `m4.flags.breeds` | 0 | M5.1 |
| `m4.flags.zeroGainUi` | 0 | spec `m5.flags.zeroGainUi`; read once at boot (spec) |
| `m4.flags.bestBuyV2` | 0 | spec `m5.flags.bestBuyV2`; ships 0 |
| `m4.zeroGain.confirm` | 0 | spec `m5.zeroGain.confirm` (default false, off in M5.1); 0/1 number, not boolean |
| `m4.tc.leave_attended_window_s` | 30 (CSV) | non-`tc_` CSV column mapped into tc (F3) |
| `m4.tc.rest_recovery_mult` | 0.25 (CSV) | ditto; validateBalance: ≤ 0.35 |
Ship values: engineering/v5-rc-manifest.md, "Row 34 ship values".

Code: `src/config/balance.json:165` (`flags` block), `:172` (`fatigueCue`), `:181-182` (`zeroGain.confirm`).
- `M5_FLAGS`, `M5Flag` — `src/config/flags.ts:8`, `:12`
- `flagOn(b, f)` = `m4.enabled && m4.flags[f] === 1` — `src/config/flags.ts:15`
- `evRngFlagOn(b)` (golden || broody) — `src/config/flags.ts:17`
- `zeroGainConfirmOn(b)` = `flagOn(b,'zeroGainUi') && m4.zeroGain.confirm === 1` — `src/config/flags.ts:19`
- `M4Params.flags?` / `M4Params.zeroGain?` types — `src/config/formulas.ts:48`, `:51`
- Validation: `validateM5()` — `src/config/m5-rules.ts:13` (called from `src/config/balance.ts:44`); sync keeps the blocks: `keepFlags()` `scripts/sync-economy.ts:158`, `keepZeroGain()` `:168`, mapped cols `M5_MAPPED_COLS` `:155`.

## 2. Selectors the UI should read
- `isPaused(w, b)` — `src/sim/pause.ts:10`. The ONLY way to read `Worker.paused`; returns false whenever `m4.flags.pause` = 0. Pause sim (Saves) and the UI QA setter both use it. A grep test fails on any other `paused` read in src/.
- `saleMultipliers(s, b, ctx = PLAYER_SALE)` — `src/sim/payout.ts:10` → `[grader, ...live timed factors]`.
- `saleValueCents(s, k, b, ctx = PLAYER_SALE)` — `src/sim/payout.ts:15` (preview == credit; rounded once). Used at `src/ui/app.ts:607`.
- `sellAllPreview(s, b)` — `src/sim/payout.ts:20` (used at `src/ui/app.ts:613`).
- `saleEffectFactors(s, b, ctx)` — `src/sim/effects.ts:26` → `[{id, factor}]` for chips/attribution (empty while flags off).
- `layFactor(s, b, ctx?)` — `src/sim/effects.ts:33`; `prodEggsPerSec(s, b, ctx?)` — `src/sim/tracks.ts:16` (no ctx = base rate; UI income previews pass no ctx).
- `SaleCtx {by: 'player'|'market_hand', suspended?}` — `src/sim/effects.ts:16`; `PLAYER_SALE` `:24`. Registries `SALE_EFFECTS` `:22`, `LAY_EFFECTS` `:23` (empty in F1c; feature PRs append one entry each).
- `marketHandStalled(s, b)` — `src/econ/income.ts:44` (now reads `paused` via `isPaused`).
- `sellTo(s, id, b, ev?, by = 'player', suspended = false)` — `src/sim/actions.ts:18`.
- `apply(s, a, b, ev?, attended = true)` — `src/sim/actions.ts:57`. `Game.dispatch` passes `attendedNow()`; a player `sell`/`sellAll` is suspended (no Frenzy/streak) only when not attended. The UI never passes `suspended: true` for the sheet (Q-F1c-1, D-HOP-2026-10-29-06).
- `goldenEEggsPerSec(s, b)` — `src/sim/tracks.ts:19`: golden reward E's egg rate = base `prodEggsPerSec` with no ctx; Sweep excluded (Q-F1c-2, D-HOP-2026-10-29-06).

## 3. GameState fields (all optional, ABSENT while their flags are off) — `src/sim/m5-state.ts`
`GameState extends M5Fields` (`src/sim/state.ts:9`). `M5Fields` at `src/sim/m5-state.ts:27`.
Saved (`M5_SAVED_FIELDS`, `:65`): `evRngState`, `nextSpawnRemainingS`, `frenzyRemainingS`, `broodyNestCents`, `broodyHenIdx`, `abilities` (`Partial<Record<WorkerId, AbilityState{readyAt? epoch ms, activeS?}>>`, `:15`), `abilitiesUnlocked`, `abilitiesCoachSeen`.
Session only (`M5_SESSION_FIELDS`, `:67`): `goldenEgg` (`GoldenEggOnScreen {ageS, slotId, intervalS}`, `:18`), `streakS`, `streakHoldS`, `tapCreditCdS`, `irefRingCents`, `refWarmS`, `broodyNestScaled`, `brRngState`.
Worker (`src/sim/workers.ts:11`): optional `paused?` (read via `isPaused` only), `callLockoutS?`.

## 4. SimEvent members — `src/sim/events.ts`
- `collect` gains optional `credited?: boolean`, `bonus_cents?: number` (`:10`; only with streak/tapCoins).
- `M5SimEvent` (`:29-40`), emitted only with their flag on:
  - `collectible_spawned {skin: 'golden_egg'|'broody_hen', farm_level, collection_level, slot_id, interval_s, deferred_ms}` (`:30`)
  - `collectible_collected {skin, reaction_ms, in_warning, reward_type: 'cash'|'frenzy'|'eggs'|'eggs_cash'|'broody_cash', reward_value, reward_duration_s, farm_level, nest_fill_share?}` (`:31`)
  - `collectible_expired {skin, reason: 'timeout'|'offline'|'reload'|'takeover'|'reset', farm_level}` (`:32`)
  - `frenzy_started {mult, duration_s, farm_level, grader_tier}` (`:33`); `frenzy_ended {extra_coins, eggs_sold, sold_by_player, sold_by_workers, reason: 'timeout'|'reset'}` (`:34`)
  - `streak_started {farm_level, collection_level}` (`:35`); `streak_peak {value, duration_s, credited_taps, time_at_cap_s, extra_coins, frenzy_overlap_s, reason, max_tier}` (`:36`)
  - `abilities_unlocked {farm, hired: WorkerId[]}` (`:37`); `ability_used {worker, farm, energy_pct, mood, via_all, t_since_ready_s, in_sheet}` (`:38`); `ability_blocked {worker, reason: 'cooldown'|'asleep'|'unpaid'|'paused'|'lockout', count}` (`:39`); `ability_ended {worker, cause: 'expired'|'paused'|'offline'|'asleep'|'unpaid', effect_s}` (`:40`)
- Game adds UI-only telemetry fields when forwarding: `collectible_id`, `layout`, Broody `slot_id`/`restored`.

## 5. Clock / timer APIs (F1b)
- `Game.setAttendedProbe(fn: () => boolean)` — `src/game.ts:393`; the one attended read is `attendedNow()` `src/game.ts:395` (= `!readOnly && probe()`), used for frame focus and for player-sale suspension. **UI must wire this** (F6 `dialogOpen()` → `() => !dialogOpen()`); default `() => false` = no focus time accrues, M5 timers stay frozen. Frame focus computed at `src/game.ts:413`. **The probe must return true while the Market sheet is open** (Market sheet = play surface, Q-F1c-1, D-HOP-2026-10-29-06); false only for menus/modals/explainers/onboarding/coach or a hidden tab.
- `FOCUS_DT_MAX_S = 1.0` — `src/sim/clock.ts:11`; `StepClock {focus, nowMs?}` `:13`; `FrameClock {focusMs, nowMs?}` `:15`.
- `focusFrameMs(gapMs, attended, offlineMinS)` `:19` (min(gap, 1 s); 0 if not attended or gap ≥ 60 s); `focusTicks` `:24`; `tickClock` `:33`; `tickFocusS` `:17`.
- Wall-clock timers (absolute epoch ms vs injected now): `wallRemainingMs(atMs, nowMs, capMs)` `:27` (clamped to [0, cap] on every read; NaN = ready), `wallReady` `:31`. UI cooldown rings should read these with `Date.now()` passed in; the sim never calls Date.now.
- `step(s, dt, b, ev?, clock?)` — `src/sim/tick.ts:14`; `advance(s, elapsedMs, accMs, b, ev?, clock?)` — `src/sim/tick.ts:101`.
- `stepTimers` / `TIMER_SYSTEMS` / `anyM5FlagOn` — `src/sim/timers.ts:18`, `:16`, `:17` (runs only while some flag is on).
- RNG: `evDraw` `src/sim/rng.ts:22`, `brDraw` `:27`, `pickIndex(u, n)` `:33` (UI passes the valid-spot list; sim draws the index), `ensureEvRng` `:18`.

## 6. Rulings (D-HOP-2026-10-29-06; were open questions)
- Q-F1b-1: evRngState is seeded once, at the END of the first flag-on tick, after that tick's customer draws (= GE-AC33 for initialState). One seeding path: `ensureEvRng` in `src/sim/rng.ts`, re-exported by Saves' `src/save/m5-fields.ts`.
- Q-F1c-1: Market sheet is a play surface; see `apply`/`attendedNow` above.
- Q-F1c-2: Sweep excluded from golden E; see `goldenEEggsPerSec` above.

## 7. F2 (#81, merged into rc/v5 406e455) touchpoints
`src/save/m5-fields.ts` (`m5Load`, `m5Offline`, `m5ShortGap`, `m5Persist`, `M5_SESSION_KEYS`) now uses F1a's `GameState`/`M5SimEvent` declarations; its own inline copies were dropped in the F1a merge.
