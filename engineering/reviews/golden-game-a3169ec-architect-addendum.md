# Architect addendum · PR #111 restack · a3169eca · 2026-11-05 22:17 CET (Europe/Belgrade)

**Prior tip reviewed:** `2261670206ee9538b1e16cb1818a4f66ec6deef1` (M1 CLOSED; CONDITIONAL/FAIL-integration cleared for abilities keys).  
**New tip:** `a3169eca3aaa224de337fb92205f6f8f47468cba`  
**New base:** `feat/v5-golden-spawn` `811c7da251ee276f5962557cb90c2871922a7168` (#109 merged into spawn)  
**Parents:** `2261670` + `811c7da`  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/111 (Draft)  
**Artifacts:** `artifacts/v5-golden-game-a3169ec/` (SHA256SUMS OK; bundle OK)  
**Logs:** `scratch/architect/recheck111-a3169ec/`  
**Scope:** Restack delta only. No Ready / no merge / no full-suite re-run.

## Verdict: **PASS (restack)** — 0 Blocker / 0 Major / 0 Minor on this delta

**Tree-neutral vs prior reviewed tip:**  
`a3169ec^{tree} == 2261670^{tree} == d679701ee0bc142d337d2684385a841b6a3a69e5`.  
Ordinary merge only; **no source regression** on Game A / refuseNewer / m5Persist / M1.

---

## Checklist (delta)

| Item | Result |
|---|---|
| M1 `M5_TC_KEYS.abilities` preserved | **PASS** — real entry + pin test still present |
| Ancestor `90fb447` / `2261670` | **PASS** |
| Base retarget to spawn `811c7da` (#109 MERGED) | **PASS** — PR baseOid matches |
| `goldenUnload(s,b,ev,reason)` | **PASS** — unchanged vs 2261670 |
| `refuseNewer` no mutation/RNG/write | **PASS** — body unchanged |
| `m5Persist` vs spawn+#109 (`811c7da`) | **PASS** — function body byte-identical; only m5Offline arg order remains A-side |
| endSession compose | **PASS** — unchanged |

---

## Artifacts / provenance

| Item | Status |
|---|---|
| `tested-sha` | `a3169eca…` = PR head |
| tsc | exit **0** |
| vitest targeted | **88/88** (`results/vitest-targeted.log`) |
| Author claim tree-neutral | **Confirmed** independently |
| Full suite / hosted | **Not re-run**; Draft checks **SKIPPED** — qualify pending fullsuite/hosted |

---

## Side note (not #111 scope) · abilities persist

PMW **v1.3.12** (`m5-worker-abilities-spec.md`, D-PMW-2026-11-05-04) now **authorizes** `AbilityState.durS` (granted duration) for E2/E7/AC-M5A-12 — Product accepted the Architect proposal. Top-level `abilityDurS` still rejected. Combo CSV still **fixtures-only / prod keys missing** → future **#112** + Econ + Saves; do **not** conflate with this Game restack.

## Pending
- Draft stays; no Ready until HoE asks + hosted/fullsuite as required.  
- #112 follow-up (abilityDurS strip / durS implementation) remains separate.
