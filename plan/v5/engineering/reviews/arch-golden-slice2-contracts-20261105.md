# Architect · Golden slice2 contract rulings · 2026-11-05 21:05 CET
Status: analysis only (no code). For HoE → Features pause on slice2.
Slice1: 2c16832 verified → restack onto e5b3d02 (artifacts/v5-golden-rewards-06bf3cf supersedes). Spec of record: `product/collection/m5-golden-egg-spec.md` v1.3.2.2 (studio sha1 910098bd…). Sizing: `engineering/m5.0-sizing.md` §12 (sha1 42a19857…). API: `engineering/tasks/v5-f1-f3-api-sheet.md`. F1a state: `src/sim/m5-state.ts` (rc/v5 lineage).

## Unambiguous Architect rulings (Features may implement)

### 1. UI valid-spot injection — NOT pure per-tick sim spawn
- **Ruling:** UI measures live rects / R14 zones and **passes the list of valid slot ids** into the sim action; sim draws `pickIndex(u, n)` from `evRng` into that list. Empty list → R15 defer (no lifetime start). Recheck on layout change and every **500 ms focus-clock** (R15).
- **Cite:** sizing §12.2 “UI passes the list of valid slot ids… sim draws an index” (`m5.0-sizing.md` ~L370); `rng.ts` `pickIndex` comment; F1a `GoldenEggOnScreen.slotId` “chosen from the UI-supplied valid-spot list” (`m5-state.ts` L21–22); API sheet §5 L85; golden R14–R15 / GE-AC15–16.
- **Do not:** have the sim itself read DOM/rects each tick, or invent a second spawn path.

### 2. `deferred_ms` / `interval_s` — telemetry (+ ephemeral session), not save, not balance.json
- **`interval_s`:** drawn gap (or 45 first spawn), **excludes** deferral (QA GE-10). Session field `goldenEgg.intervalS` + event payload. Not a CSV key.
- **`deferred_ms`:** focus ms from countdown→0 until egg appears (R15, §8). Emit on `collectible_spawned`. Hold as **ephemeral pending-spawn accumulator** (session); **not** in `M5_SAVED_FIELDS`.
- **R15 500 ms recheck:** code constant (same class as `FOCUS_DT_MAX_S` / `focus_dt_max_s`), **absent from balance.json by design**. Do not add a CSV column or invent a persisted field.
- **Cite:** golden R15 L154, §8 L319, GE-10 L846, GE-AC16; `M5_SAVED_FIELDS` = only `evRngState|nextSpawnRemainingS|frenzyRemainingS` (+broody/abilities) — `m5-state.ts` L64–67 / API sheet §3; balance.json has `m4.tc.frenzy_all_sales` etc., no defer/recheck keys.

### 3. On-screen egg × reload / pagehide — Saves contract already locked
- **Ruling:** on-screen egg is **never saved**. Reload / ≥60 s offline / pagehide: remove with `collectible_expired{reason:"reload"|"offline"}` (R8/R10c); no reward; resolution → fresh R3 gap. Countdown `nextSpawnRemainingS` resumes after welcome-back when no egg was on screen.
- **pagehide:** emit `collectible_expired{reason:"reload"}` in the same flush as `session_end` (best-effort; flush loss accepted under T-AC).
- **Cite:** R8, R10a “An on-screen egg is never saved”, R10c; F1a `goldenEgg` in `M5_SESSION_FIELDS`; F2 `m5Offline` / endSession pattern (streak/ability reload precedents). Owner to confirm wiring: **Saves `3ba38cf3`** if Game.endSession flush needs a seam; Features owns sim expire on load path already sketched by F2.

### 4. Draw / reward order cash → frenzy → eggs
- **Ruling:** Per-spawn evRng draw order is fixed: **gap at resolve → slot at spawn → reward at tap** (R10a L94, GE-AC33). Reward table order **cash / frenzy / eggs** (weights `tc_egg_w_*`); `eggs_cash` replaces eggs grant when F ≥ `tc_egg_eggs_as_cash_from_farm`. Slice1 `rollReward` already matches — keep it.
- **Cite:** golden §3.5 table; R10a; GE-AC7; artifacts slice1 PR-BODY.

### 5. `frenzy_ended` counters + `collectible_id` — session/Game telemetry, not save
- **Ruling:** Accrue `extra_coins`, `eggs_sold`, `sold_by_player`, `sold_by_workers` for the live Frenzy in **session memory**; emit on `frenzy_ended{reason:"timeout"|"reset"}` (no `hidden_end`/`offline` — R23 freeze). `collectible_id` is a **per-session Game counter** shared golden+broody, added when forwarding SimEvents (not a save field; F1a SimEvent omits it).
- **Cite:** golden §8 L322–323, GE-AC12; telemetry-errata-v5 L118–122; API sheet §4 L73–76; F2 note “Game adds collectible_id”.
- **Do not:** persist counters or invent SAVE_VERSION / migration for them.

## Route (do not invent)

### A. `tc_frenzy_all_sales = 0` semantics — **Product**
- Spec R22 only defines **`= 1`**: all sales via `saleMultipliers()` (player, MH/Hawker, Basket-stock). CSV/balance ship `1`. **No authoritative 0 branch.**
- **Route to:** Head of Product **`958f5a66-2e9f-44eb-845a-9bac9bbf1b12`** (cc PM Collection **`6c6b08c7-6035-4f35-8ae5-ab8b32a9d0d5`**). Until ruled: keep slice1 behavior (=1 / all sales in `saleMultipliers`); do **not** invent a player-only path or ignore the column without a Product note.
- **Cite:** golden R22 L172, §5 table L260; economy research “Frenzy = ×2 on all sales”; balance `m4.tc.frenzy_all_sales: 1`.

### B. Saves confirm-only (not a design fork)
- Optional fields / no SAVE_VERSION bump / egg never persisted: already F2 + R10a. Saves **`3ba38cf3-be86-4350-b2c7-5bfaa5863b11`** confirms pagehide flush + load sanitizers if Features touches `game.ts` endSession; no new persisted keys without HoP+Saves+migration.

## Blockers for Features slice2
1. **Product** must rule `tc_frenzy_all_sales=0` (or declare column always-1 / unused) before any branching.
2. Everything else above is **Architect-closed** — Features unblocks on injection + R15 code-constant + session telemetry + never-save egg.

## Constraints restated
Deterministic sim; flags-off parity (goldens f90d1678 / a54c9cf9); no invented balance constants; no new persisted state without migration + Saves; SAVE_VERSION stays 6.

## Product ruling received 2026-11-05 21:10 CET — blocker cleared
Head of Product ruled for v5: `tc_frenzy_all_sales` is a fixed all-sales-scope constant, valid value **1 only**. R22 remains authoritative: Frenzy applies through `saleMultipliers()` to player, Market Hand/Hawker and Basket-stock sales. Value 0 has no defined/supported v5 semantics and must not create a player-only or other alternate branch. Keep slice1/slice2 on the =1 all-sales path; treat 0 as invalid configuration and flag it in validation rather than silently reinterpreting it. Scope clarification only, not a feature change; PM Collection will mirror it in the spec.


---

## ADDENDUM · Golden persist A/B (REVISED — prior A NOT APPROVED) · 2026-11-05 21:29 CET

**Prior A retracted:** clearing live `goldenEgg` before `save()` without a live `drawGap` made B’s egg-conditional a no-op and could persist `nextSpawnRemainingS=0` / stale rng. Forbidden. No bfcache “accept double” alternatives.

**Code verified (rc/v5 lineage `review-rcv5-1a61b36`):**
- `m5Persist(s)` — strip `M5_SESSION_KEYS` only; **no** `drawGap` (`src/save/m5-fields.ts` L42–45). `serialize` → `m5Persist` (`save.ts` L146).
- `drawGap(s,b)` — one `nextRand` on `evRngState`, sets `nextSpawnRemainingS = min + u·(max−min)` (L32–35).
- Egg+gap today only in `m5Offline` (L83–84): delete egg, `collectible_expired{collectible_expired{reload|offline}`, `drawGap`. **No `goldenUnload` symbol exists**; Features must add it (or extract shared helper) mirroring that egg branch with `reason` param.
- `endSession` today: streakPeak(reload) → session_end → save → flush (`game.ts` streak head); **no** golden expire yet.

### B — `m5Persist(s, b)` · APPROVED independently

```
m5Persist(s: GameState, b: Balance): GameState
```

1. **Live `s` never mutated.**
2. If `m5Flag(b,'golden') && s.goldenEgg != null`:  
   `out = { ...s }; delete out.goldenEgg; out = drawGap(out, b);`  
   then strip every `M5_SESSION_KEYS` from `out`.  
   **Atomic on the copy:** one advanced `evRngState` + new `nextSpawnRemainingS` together.
3. Else: strip session keys only (keep F2 same-object identity when none present).
4. **No telemetry** from persist.
5. **Idempotence / repeatability:** for fixed input `s0` (with or without egg), `JSON.stringify(m5Persist(s0,b))` is identical on every call (each call copies from the same live rng; does not feed output back). After a live resolve that removed the egg, `m5Persist` must **not** draw (no egg → step 3).

Owner: Saves `3ba38cf3`.

### A — `endSession` · APPROVED only as live `goldenUnload` then save

**Recommend existing resolve semantics** (same as `m5Offline` egg arm):

```
goldenUnload(s, b, ev, reason: 'reload'|'offline'|'takeover'|…): GameState
  if !golden flag || !s.goldenEgg: return s          // idempotent no-op
  o = { ...s }; delete o.goldenEgg
  ev.push(collectible_expired{ skin:'golden_egg', reason, farm_level })
  return drawGap(o, b)                               // exactly ONE fresh-gap draw on THIS state
```

`m5Offline` egg arm **must** call the same helper (reason `'offline'`) so offline and reload cannot drift.

**Compose (pagehide / `endSession`):**
```
if resetting|inactive|held: return
emit streak_peak{reload} if streak on          // existing #2
if goldenEgg present:
  state = goldenUnload(state, b, ev, 'reload') // live: expire + exactly one drawGap
  emit(ev)                                     // Game may add collectible_id
track session_end
save()                                         // → m5Persist(state,b): no egg ⇒ NO second draw
flush(true)
```

**Compose invariant:** at most one `drawGap` per unload/offline resolution. A draws on live; B then sees no egg and must not draw. Saved `evRngState`/`nextSpawnRemainingS` are exactly post-`goldenUnload` live values (session keys stripped).

**Bfcache / double pagehide:** `goldenUnload` idempotent (no egg → no event, no draw). Second `endSession` must not emit another `collectible_expired` or advance rng. (Streak peak double-emit remains the existing streak n1; out of scope here.)

**Autosave while egg still on screen (no A):** B alone draws on the **persist copy**; live egg + live rng unchanged. Crash-reload loads the copy’s gap. Correct and independent of A.

### Required tests (Saves + Features)

| # | Assert |
|---|---|
| T1 | `m5Persist` with egg: output has no `goldenEgg`; `nextSpawnRemainingS` ∈ [gap_min, gap_max]; `evRngState` = one `nextRand` from input; **input reference unchanged** (egg still present, rng unchanged) |
| T2 | `m5Persist(s0,b)` twice → bit-identical JSON |
| T3 | no egg: persist does not change `evRngState`/`nextSpawnRemainingS` vs strip-only |
| T4 | `goldenUnload` once: one `collectible_expired{reload|offline}|offline}`, one draw; second call no-op |
| T5 | `endSession` compose: one reload expire; live rng/gap match `drawGap(stripEgg(pre))`; `serialize(post)` equals `m5Persist(post)` and has **same** gap/rng as live (B drew nothing) |
| T6 | `m5Offline` and `goldenUnload(...,'offline')` byte-same on egg fields/events reason offline |

---

## ADDENDUM · `fireAbility` API · cooldown clock validated · 2026-11-05 21:29 CET

**Spec v1.3.11** sha1 `12fec4b0…` rule 3: cooldowns run on **sim time** while live (incl. menus / hide <60s); offline/≥60s/reload elapse as wall on return; save form epoch `readyAt`.  
**Code of record F1b/F2:** `readyAt` is **epoch ms**; checks via `wallRemainingMs`/`wallReady` against **injected `nowMs`** (`src/sim/clock.ts`); `step()` never calls `Date.now`. Sizing §13: wall epoch ≡ sim-seconds-remaining with offline wall subtract.

**API final on clock:**
- `nowMs: number` = injected wall epoch (Game:`this.now()`; tests: deterministic).
- On success: `readyAt = nowMs + tc_ability_cd_s * 1000` (not a raw sim-tick counter).
- Eligible cooldown clause: `wallReady(readyAt, nowMs)` / non-finite|absent ⇒ ready (E2); remaining clamped to one cd on read (E2b).
- `t_since_ready_s` from wall remaining at fire. Do **not** pass sim-tick `t` unless it is the same injected clock Game uses for `nowMs`.

Remaining surface (unchanged intent; signatures):

```
fireAbility(s, id, b, { inSheet, viaAll, nowMs }) → ok|blocked result
activateAll(s, b, { inSheet, nowMs }) → { state, events, fired, closeSheet }
```

Order `WORKERS` MH→CH→Hawker→Grader; same-tick partial fire; Activate-all skips emit no `ability_blocked`; `ability_used` includes `combo` (API sheet §4 missing it — amend on land); sheet success → one close, focus start via rule 10 suspend until `sheetCloseComplete`. Owner Features after F5→G5-P on reviewed Wave A tip. UI Shift must not invent.

**API sheet** `fb0fb343…` still has no `fireAbility`; this addendum is the written contract.

---

## ADDENDUM · `fireAbility` combo opts (D-HOE-41) · 2026-11-05 22:11 CET (Europe/Belgrade)

**HoE accepted** Architect combo-guard contract. Amend the 21:29 fireAbility signature:

```
fireAbility(s, id, b, { inSheet, viaAll, nowMs, refillAgoSimMs? }) → ok|blocked result
activateAll(s, b, { inSheet, nowMs }) → { state, events, fired, closeSheet }  // unchanged; never combos
```

**`refillAgoSimMs?` (APPROVE WITH GUARDS):**
1. Sim-ms elapsed since that worker’s last **manual** refill (`refill_used{by:manual}`); **not** wall `nowMs`.
2. Read only when `abilities && rc2Refill && inSheet && !viaAll`; else ignore.
3. Absent / non-finite / `< 0` ⇒ not a combo (no throw).
4. Inclusive SG-3: `refillAgoSimMs <= combo_window_s * 1000`.
5. Activate-all never passes a window / never combos.
6. Owner of the stamp: **rc2 Refill + Game** when Refill lands; until then caller injects. Features must not invent a refill sim clock inside abilities.
7. **`combo_window_s` / `combo_boost_duration_s`:** no prod literals; Econ CSV (proposed 10/45); tests may inject fixtures.

**Persist / combo reload (`durS`) — Product-authorized (v1.3.12 / D-PMW-2026-11-05-04); Saves implements:**
- Spec E2/E7/AC-M5A-12 now use granted `durS`. Saves owns load/endCalls; Features must not leak top-level `abilityDurS`.
- Proposal under discussion: optional `AbilityState.durS` (granted focus duration) alongside `activeS`; end-on-load still `offline`; `effect_s = granted − activeS`; no SAVE_VERSION bump; old saves ⇒ `granted = tc_ability_s`.
- Top-level unsstripped `abilityDurS` remains **rejected** (persist leak). See `arch-abilities-fireAbility-combo-persist-20261105.md` (amended).

Full #112 code review is a separate note; this addendum only locks the API/guard contract HoE accepted.

