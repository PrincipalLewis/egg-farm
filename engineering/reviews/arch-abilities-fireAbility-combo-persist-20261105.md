# Architect contract · fireAbility combo opts + persist · 2026-11-05 22:08 CET (Europe/Belgrade)

**Request:** Features Draft #112 `cc0642ae4730335eb79f0d047145d6a9d5770b9e` asks ratify `opts.refillAgoSimMs?` (beyond addendum `{inSheet,viaAll,nowMs}`) and documents `abilityDurS` / E7 clamp vs 45 s combo.  
**Scope:** Immediate **contract ruling only** — not full #112 approval, no source/save implementation this turn.  
**Authority:** `product/workers/m5-worker-abilities-spec.md` **v1.3.11**; addendum `engineering/reviews/arch-golden-slice2-contracts-20261105.md` § fireAbility (21:29 CET); code inspected read-only on #112 tip.  
**Logs:** `scratch/architect/contract112-fireAbility/`

---

## Verdict (actionable)

| Topic | Ruling |
|---|---|
| `refillAgoSimMs?` on `fireAbility` | **APPROVE WITH GUARDS** — amend the fireAbility addendum; not an invented tunable |
| Hardcoded / test-only 10 s / 45 s | **APPROVE fixtures only** until Econ CSV; **reject** prod hardcodes |
| Top-level `abilityDurS` unsstripped | **REJECT as shipped shape** — leaks persist today (must SESSION-strip or fold) |
| Reload mid-call | Spec unchanged: **end on load**, cause `offline` (not resume) |
| Persist / effect_s for combo | **`AbilityState.durS` Product-authorized (v1.3.12)** — Saves to implement; Features must not ship unsstripped top-level `abilityDurS`. |

---

## 1. Clocks and owners (authoritative)

| Quantity | Clock | Owner |
|---|---|---|
| Cooldown `readyAt` | **Wall epoch ms** vs injected **`nowMs`** (`wallReady`) | Features / Game (`this.now()`) — addendum already final |
| Call duration `activeS` | **Focus seconds** (rule 10) | Features `abilitiesTick` |
| Combo **window** (rule 11 / SG-3) | **Sim milliseconds** since that worker’s **manual** `refill_used{by:manual}` (inclusive ≤ `combo_window_s*1000`) | **rc2 Refill + Game** when Refill exists; until then **caller injects elapsed** |
| Combo **duration** | Focus seconds = `combo_boost_duration_s` (45 proposed) from `sheetCloseComplete` | Features fire path; values from **balance / Econ** |

`nowMs` must **not** be used as the combo window. Window ≠ wall.

---

## 2. `refillAgoSimMs?` — APPROVE WITH GUARDS

**Ratify** optional field on the addendum signature:

```
fireAbility(s, id, b, { inSheet, viaAll, nowMs, refillAgoSimMs? })
```

**Why approve (not reject):** Spec measures the window in sim ms from a manual refill that **rc/v5 does not implement**. Injecting elapsed is the same class of seam as `nowMs` (caller-owned measurement). Rejecting it would force Features to invent a refill sim clock inside abilities — worse and out of scope.

**Guards (non-negotiable):**
1. Read **only** when `abilities && rc2Refill && inSheet && !viaAll`; else ignore.
2. Absent / non-finite / `< 0` ⇒ **not** a combo (no throw).
3. Inclusive SG-3: `refillAgoSimMs <= combo_window_s * 1000`.
4. **Activate-all never combos** (do not pass a window; `viaAll:true` forces non-combo) — already matches rule 11 / D-HOP-42.
5. Features **must not** invent or persist refill timestamps inside the abilities module; when Refill lands, Game/Refill owns per-worker last-manual-refill sim stamp and passes elapsed at Boost tap.
6. Amend the written addendum text to include `refillAgoSimMs?` (API sheet still empty — addendum remains contract of record).

---

## 3. `combo_window_s` / `combo_boost_duration_s` — no invented tunables

- Spec v1.3.6+: **proposed** columns, defaults **10** / **45**, Econ to model (schedule slip → HoP, nothing cut).
- Shipping `balance.json` on rc/v5: **keys absent**; flags `abilities`/`rc2Refill` = 0.
- **Reject** baking `10`/`45` literals into prod `abilities.ts`.
- **Allow** test/balance fixtures to inject the proposed values until CSV lands.
- **Economy (route):** land `tc_combo_window_s` / `tc_combo_boost_duration_s` (names per CSV convention) with proposed defaults; Features then reads via `tcNum` only.
- **validateBalance (when `abilities && rc2Refill`):** require both keys (F3). Until flags stay 0, no prod load path needs them.

---

## 4. Reload / persist — spec behavior + combo hole

### Spec (still authoritative for non-combo)
- Running call saves remaining focus seconds as `abilities.{id}.activeS` (E2).
- **On load the call ends** (reload ≡ ≥ 60 s gap): one `ability_ended{cause:"offline"}`, then clear active call fields. **No resume.** No `reload`/`pagehide` cause (TEL-8).
- E2 / AC-M5A-12 today: `effect_s = tc_ability_s − activeS` with activeS clamped to `[0, tc_ability_s]` (E7).

### Combo hole (must fix in contract + Saves; not Features-only)
A 45 s combo with e.g. 40 s remaining cannot be expressed under clamp/formula keyed only to `tc_ability_s` (30): effect_s and clamp are wrong.

### Proposed persist shape (**PROPOSAL — not final**; Product + Saves must agree)

> **D-HOE-41 / HoE 2026-11-05 22:11 CET:** Architect forwards `refillAgoSimMs` APPROVE WITH GUARDS as accepted. The `durS`-on-`AbilityState` persist design below is a **proposal for Product errata + Saves**, not an approved final shape. Do not implement Saves migration as if Architect already locked `durS`.


**Proposed** extension of F1a / E7 (pending agreement):

```ts
AbilityState { readyAt?: number; activeS?: number; durS?: number }
// durS = granted focus duration of the running call (tc_ability_s or combo_boost_duration_s)
```

| Field | Persist? | Notes |
|---|---|---|
| `readyAt` | yes | unchanged |
| `activeS` | yes while running | remaining focus s |
| `durS` | yes while running | granted duration; **cleared with activeS on load/offline end** |
| Top-level `abilityDurS` | **no** | reject as long-term / unsstripped session map |

**Load / offline end (Saves) — proposed once Product agrees:**
- `granted = fin(durS) && durS > 0 ? durS : tc_ability_s`
- Clamp `activeS` to `[0, granted]` (replace E7’s hard `[0, tc_ability_s]` when `durS` present; cap `granted` at `max(tc_ability_s, combo_boost_duration_s)` when that key exists)
- `effect_s = granted - activeS` (then clear `activeS` **and** `durS`)
- **No SAVE_VERSION bump** (E7 pattern). Saves without `durS` ⇒ `granted = tc_ability_s` ( today’s behavior).

**Live sim:** prefer writing `abilities[id].durS` at fire (combo or base). A top-level `abilityDurS` mirror is optional sugar only if also listed in `SESSION_ONLY_KEYS` — **default: delete top-level; use `durS` on the entry**.

**#112 tip today:** `abilityDurS` on `GameState` is **not** in `SESSION_ONLY_KEYS` → **will leak into save JSON** via `m5Persist`. That is a contract defect for any tip that keeps the field.

---

## 5. Exact owner tasks (no implementation here)

| Owner | Task |
|---|---|
| **Architect** | This note; amend fireAbility addendum with `refillAgoSimMs?` + guards; point persist to `AbilityState.durS` |
| **Product (PMW)** | Errata v1.3.11→next: E2/E7/AC-M5A-12 `effect_s` / clamp use **granted `durS`**, not always `tc_ability_s`; document `durS` on AbilityState |
| **Economy** | Land `combo_window_s` / `combo_boost_duration_s` (proposed 10/45) in economy.csv → balance; notify Features/F3 |
| **Saves** | `endCalls` / m5Load: honor `durS`; strip `durS` with `activeS`; clamp per §4; if any tip still has top-level `abilityDurS`, add to `SESSION_ONLY_KEYS` until removed |
| **Features (#112 follow-up)** | Keep `refillAgoSimMs?` under guards; **stop** unsstripped top-level `abilityDurS` (use `abilities[id].durS` or SESSION strip); no prod literals 10/45; combo only with flags+tc keys; not a full merge ask until Saves/Product errata sequenced for combo reload |
| **Game / rc2 Refill (later)** | Own per-worker last **manual** refill sim timestamp; pass elapsed into `fireAbility` on Shift Boost |

---

## 6. What this is / is not

- **Is:** ratify combo injection seam + fix persist/reload contract for 45 s calls.  
- **Is not:** full #112 code approval, UI Shift, Refill implementation, or merge/Ready.  
- Draft #112 may continue sim work under these guards; **combo reload correctness is Saves+Product**, not a silent Features persist leak.

---

## Amendment · 2026-11-05 22:11 CET (Europe/Belgrade) · D-HOE-41

- HoE accepted the combo-guard contract; owners already routed via HoE.
- **`refillAgoSimMs?` APPROVE WITH GUARDS** stands (no prod literals for 10/45).
- **`AbilityState.durS` / granted-duration persist is PROPOSAL only** until Product (PMW) errata and Saves agree. Prior wording that read as Architect-final for `durS` is retracted to proposal status.
- Top-level unsstripped `abilityDurS` remains **rejected** for ship (leak); interim SESSION strip is Features hygiene, not a persist-shape decision.

---

## Amendment · 2026-11-05 22:17 CET · PMW v1.3.12 authorizes `durS`

Product **D-PMW-2026-11-05-04** / spec **v1.3.12** (sha1 cited by HoE as `9d521aa8…`) accepts Architect §4: optional `AbilityState.durS`, granted-duration clamp/`effect_s`, clear with `activeS` on load, no SAVE_VERSION bump, reject top-level `abilityDurS`.  

**Status:** Product-authorized shape. **Saves** still owns implementation; **Features #112** still must not leak top-level `abilityDurS`. Combo `combo_window_s` / `combo_boost_duration_s` remain Econ CSV pending (fixtures only in prod absence). Prior “PROPOSAL only” wording for `durS` is superseded by v1.3.12 for Product; Saves agreement = implement to that errata.
