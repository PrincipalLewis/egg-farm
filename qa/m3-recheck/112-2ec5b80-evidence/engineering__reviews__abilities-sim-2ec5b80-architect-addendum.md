# Architect addendum · PR #112 · 2ec5b803 · Major M1 closed · 2026-11-05 22:20 CET (Europe/Belgrade)

**Prior tip:** `cc0642ae4730335eb79f0d047145d6a9d5770b9e` — CONDITIONAL APPROVE; Major = top-level `abilityDurS` leak.  
**New tip:** `2ec5b803e65bc6c16299202d581114e3cacdebdf`  
**Base:** `rc/v5` `30df38c0…` (unchanged)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/112 (Draft)  
**Spec:** v1.3.12 sha1 `9d521aa83387a6e45866e6ade01f67fac387f3a3` (authorizes `AbilityState.durS`)  
**Contracts:** D-HOE-41 / 41a; `arch-abilities-fireAbility-combo-persist-20261105.md` (Product-authorized durS)  
**Artifacts:** `artifacts/v5-abilities-2ec5b80/` (results SHA256SUMS OK from artifact root; bundle requires `cc0642ae`)  
**Logs:** `scratch/architect/recheck112-2ec5b80/`  
**Scope:** Draft / no Ready / no merge / no push. #112 follow-up delta vs prior full review.

## Verdict: **APPROVE (Features sim)** — prior Major **CLOSED** · **0 new Features Major** · Saves integration **OPEN** (blocks Ready)

Features closed Architect #112 Major M1 and matches v1.3.12 / D-HOE-41a for the sim. **Ready MUST wait** on Saves `endCalls`/m5Load honor of `durS` + full review / hosted gate. Do not mark Ready on this tip alone.

---

## Delta (`cc0642ae`..`2ec5b80`)
4 files, +80/−28: `abilities.ts`, `m5-state.ts` (`AbilityState.durS`), drop `abilityDurS` from `state.ts`, tests.

| Claim | Result | Evidence |
|---|---|---|
| Top-level `abilityDurS` deleted | **PASS** | removed from `state.ts`; grep-clean in abilities/state/m5-state; test asserts no match |
| `AbilityState.durS` on fire (base + combo) | **PASS** | `abilities.ts` L77–80: always writes `{…, activeS: durS, durS}` |
| Clears `durS` with `activeS` on tick end | **PASS** | L111 `{ activeS, durS, …rest }` |
| Fallback no `durS` → `tc_ability_s` | **PASS** | L106; test “older tip / save” |
| `refillAgoSimMs` guards | **PASS** | comments + `comboQualifies`; tests NaN/neg/absent/rc2Refill off; activateAll never passes window |
| No prod 10/45 literals | **PASS** | `tcNum` only; test strips comments and forbids bare 10/45 |
| Fixtures-only combo tc | **PASS** | tests inject `combo_window_s`/`combo_boost_duration_s`; shipping balance still lacks keys |
| `m5Persist` carries entry `durS`, no top-level map | **PASS** | test JSON round-trip of `m5Persist(s)` |
| Session boundary | **PASS** | `durS` lives on saved `abilities` entry (spec); not a SESSION_ONLY orphan |

---

## Major closure

**Prior M1 (top-level `abilityDurS` leak) — CLOSED** at `2ec5b80`.

---

## Residual integration risk (Saves — blocks Ready)

`src/save/m5-fields.ts` `endCalls` **unchanged**:
- `effect_s` still `tc_ability_s − min(activeS, tc_ability_s)`
- destructures **only** `activeS` → **`durS` can remain on the entry after load/offline end**
- Does not clamp `activeS` to granted `durS`

Violates v1.3.12 E2/E7/AC-M5A-12. Features correctly documents Saves ownership. **Ready blocked until Saves lands** matching endCalls/m5Load + HoE full review.

Combo CSV prod keys still missing (D-HOE-41a fixtures-only) — Econ; not a Ready gate for flag-off shipping, but required before `abilities&&rc2Refill` on.

---

## Artifacts / provenance

| Item | Status |
|---|---|
| Bundle | OK (req `cc0642ae`; tip `2ec5b80`) |
| results SHA256SUMS | Verified OK (from artifact root) |
| Author vitest | **2063 passed / 1 skipped** |
| slow | 17 / 1 skip |
| tsc / sync / build / globals | **0** |
| verify-24h | PASS on `2ec5b80`; flagOff **f90d1678…**; m4On **a54c9cf9…**; trace **9c47b11e…** unchanged |
| Independent focused vitest | **LOCK HELD** (rule 21) — not re-run; author evidence + sums accepted for this delta |
| Hosted | Draft **SKIPPED** |

---

## Pending (Ready gate)
1. **Saves:** `endCalls`/m5Load per v1.3.12 (`granted`/`durS` strip + effect_s).  
2. Full review / hosted gate when HoE asks Ready.  
3. Econ combo columns before enabling combo in prod balance.  
4. **Stays Draft — no Ready / no merge.**
