# HoQA interpretation — MR / dead_zone accounting v1

**ID:** QA-D-1105-MRINTERP  
**Completed:** 2026-11-05 22:20 CET (Europe/Belgrade)  
**Ask:** Head of Product — independent call on Economy ADDENDUM `scratch/post-l10/cycle-MR-accounting-audit/ADDENDUM.md` (S01 seed130 sampled 183 s spanning FARM buys at 2406.5 / 2453.6).  
**Write scope:** this file, `qa/m5/interp-mr-evidence/`, one `qa/decisions.md` entry. Read-only elsewhere. No tuning, no harness/semantic edits to Economy or product, no green-run sign-off, no waiver.  
**Evidence folder:** `qa/m5/interp-mr-evidence/`

---

## 0. Verdicts (i)–(iv) at a glance

| # | Question | Verdict |
|---|---|---|
| (i) | Does current harness ordering match the intended acceptance oracle? | **Ambiguous.** It matches the **errata-pinned harness text** of V-2d (1) and the cited `m5mr.ts` order. It does **not** match a player-affordance / continuous-inactivity reading of the product dead-zone rule, and it is **not** evidence of 183 s of continuous inability to buy. |
| (ii) | If not, which correction matches intent? | Prefer **(a) sample after `sellAll`, before buys** (coins available to the purchase decision). Optional strengthen with **(b) close stretch on executed meaningful/exempt purchase**. |
| (iii) | Joint rebaseline / re-screen? | **Yes**, if V-2d sampling is corrected. Scope: all flags-off G4mr / meaningful-row screens that use `m5mr.ts`/`runmr.ts`. Seed-level `mrLongest` is **monotone** under (a) and (b) → prior PASSes stay PASS; FAILs need re-screen. Flags-on CSV `.27` acceptance is a **separate** gate; the same definition change would apply to flags-on G4 when that harness shares this sample order, but `.27` content is not auto-invalidated by flags-off numbers alone. |
| (iv) | Flags-off `streakCap` 0.28 inert? | **Confirmed** (`m5mr.ts` L51, L105; `runmr.ts` `K.on===false`). |

S01 seed130 remains **FAIL183 under the current pinned definition**. No PASS, no waiver.

---

## 1. Hash verification (ADDENDUM table)

| artifact | claimed sha256 | measured | path used |
|---|---|---|---|
| m5mr.ts | `b2deab634bff87a409d3a8bb7f45a409c1c75ad3b8fedeb5eb4209edf30595d0` | **MATCH** | `scratch/post-l10/cand/tools/m5mr.ts` |
| runmr.ts | `2cef8d3a6016b83bc20e0386f797084c8de0534e7dfe4de613438e8c4390a5f3` | **MATCH** | `scratch/post-l10/cand/tools/runmr.ts` |
| errata rev13 | `bc5d9ba1dd60b4f599af8ef95ac3227afc915e9343de4c02a6855b06422bcebe` (sha1 `a0e8f6d7…`) | **MATCH** | `product/collection/telemetry-spec-errata-v5.a0e8f6d7.md` |
| order-probe-S01-seed130.json | `6060a4adea02d387a458e010b6435c7526440d46b9a14e129f1d3ab1bd8a17c2` | **MATCH** | ADDENDUM folder |
| m5trace-order.ts | `d359f240dd415f80dcb7b8cfa249e10386406c20fdfff561b5d54350718543d8` | **MATCH** | `scratch/post-l10/cycle-S01-trace/m5trace-order.ts` |
| S01 csv | `398a989f164e0d46d48327e5d80cb82661de6ea008ac888b82bd931e04dce711` | **MATCH** | `scratch/post-l10/cycle-S1-R04/S01/candidate.csv` |
| R04 csv | `d1cff5ac76e6015f6127d859a9b9c94d5c15da2ac64aad1314f8e7adfd173b65` | **MATCH** | `scratch/post-l10/cycle-2320/R04/candidate.csv` |

**Notes (not table mismatches):**
- Live `telemetry-spec-errata-v5.md` is **byte-identical** to the rev13 pin (same sha256/sha1).
- `cycle-2045/R04/candidate.csv` is a **different** file (`5e56421c…`) — do not use it for the ADDENDUM R04 pin. Correct path is `cycle-2320/R04/`.
- `scratch/post-l10/gate/runmr.ts` (`5b8ef0d1…`) differs from `cand/tools/runmr.ts`; harness of record for this audit is **cand/tools** as cited by errata V-2d.
- EVIDENCE-CORE also pins `m5trace.ts` `7879dc66…` — verified MATCH at `cycle-S01-trace/m5trace.ts` (not in ADDENDUM hash table).

**Cited `m5mr.ts` lines:** L44, L51, L105, L107, L111, L112, L116, L118, L139, L140 — all **MATCH** the ADDENDUM / EVIDENCE-CORE prefixes (exact match on the EVIDENCE-CORE full strings for L44/107/111/112/116/118/139). Order is: taps/collect (L104–105) → integer MR sample (L107–112) → `if (t < sellT) continue` (L116) → `sellAll` (L118) → `pickBuy` (L140–141). Stretch closes **only** on integer `mrAff===true` (L112); purchases do not reset `mrStart`.

---

## 2. Binding definitions — what the oracle intends

### 2.1 V-2d (errata rev13 L94–109; B-1 CLOSED, QA-D-1030-TELERR6)

1. Sample every integer sim second, **after collect taps and before any buy**.  
2. Affordable ⇔ some `candidates()` row with coins≥cost **and** meaningful (FARM|W1–W4 or `optionGain.gain > 0`).  
3. Stretch starts at first non-affordable second; ends at next affordable second; `s = end − start`.  
4–6. Emit filter / P95 / `none_affordable` only — unchanged for this ask.

Harness of record cited in the errata: `scratch/post-l10/cand/tools/m5mr.ts` sampling L106–112.

### 2.2 Product dead-zone rule

- Studio practice / monetisation: **no dead zone >3 min without an affordable useful upgrade** (`product/m4-monetisation-proposal.md` L40).  
- Gate / Card #4 / D-HOP-49: meaningful-row G4 **worst / P95 ≤ 180 s** (blocking on the final all-flags-on RC for the meaningful-row form; flags-off candidate screens report and target the same bar).  
- BBv2 §5(g) / D-HOP-49 (H1)/(H2): “affordable” counts only **meaningful** rows; zero-gain never closes a gap.

### 2.3 Does “after collect taps” include `sellAll`?

**Ambiguous in the V-2d text.**  
- `collect` (tap) moves eggs coop→basket.  
- `sellAll` converts basket→coins.  
- Buys spend coins.  

V-2d (1) names collect taps and buys; it does **not** name `sellAll`. The errata resolves the ambiguity by **citing the harness**, which samples **before** `sellAll`. That is binding for “matches the pinned definition,” but it leaves a gap versus the product sentence “without an **affordable** purchase”: affordability for a check-in purchase is decided on **post-`sellAll` coins**.

**HoQA reading of intent:** the acceptance oracle for dead_zone / G4mr is whether the player (or the check-in bot) has a meaningful row they can **buy** with coins available at the purchase decision. `sellAll` is part of making those coins available. A stretch that remains open across an executed FARM buy is measuring a **sampling hole**, not continuous inactivity.

### 2.4 Client telemetry (if present)

No `dead_zone` emitter in the flags-off baseline tree used by the scratch harness (`scratch/post-l10/baseline/h/src/telemetry/` has no `bbv2.ts`). The BBv2 client design under review (PR evidence `qa/m5/review-pr100-evidence/src.diff`) documents:

- `Bbv2Tel.sample(sec, s)`: “call with the integer sim second just reached (**after collect, before any buy**)”.  
- Sampling is driven from sim-time advance with **current** `GameState` coins (whatever sells already happened). There is no harness-style “sample then `sellAll` then buy” on the same check-in tick.

So the client’s natural integer sample sees **post-sale coins** whenever the player already sold; it does not reproduce the bot’s pre-`sellAll` asymmetry. That supports reading the product oracle as player-available coins, not pre-sale basket state.

---

## 3. Independent reproduction (S01 seed130)

Runner copy: `qa/m5/interp-mr-evidence/run-repro-baseline.ts` + pinned `m5trace-order.ts` (sha256 `d359f240…`).  
CSV: S01 `398a989f…`. Profile `optimal`, flags-off, T=4000, seed 130.

| check | result |
|---|---|
| `mrLongest` | **183** (MATCH ADDENDUM / orig probe) |
| `mrByF[27]` | **183** |
| farm buys | 2263.2 F26→27; **2406.5** F27→28; **2453.6** F28→29; 2510.7 F29→30 |
| mr_sample 2406 | coins 7,639,049 / farmCost 7,659,600 / farmAff **False** / mrAff **False** / F27 |
| after_sellAll 2406.5 | coins 7,904,228 / farmAff **True** / mr still open |
| mr_sample 2407 | coins 244,628 / F28 / mrAff **False** |
| mr_sample 2453 | same pattern at F28 |
| after_sellAll 2453.6 | farmAff **True** |
| mr_sample 2454 | F29 / mrAff **False** |
| mr_sample 2510 | farmAff **True** / mrAff **True** → stretch closes |

**Classification (agreed with Economy’s audit as accounting fact):** under the pinned order, the 183 s gap **legitimately spans** the two FARM check-in buys. It is **not** proof of 183 s continuous inactivity, and **not** a broken FARM exemption. Evidence: `order-probe-S01-seed130.repro.json`.

---

## 4. Counterfactuals (measurement only)

Definitions: `qa/m5/interp-mr-evidence/COUNTERFACTUALS.md`. Buy path unchanged; only the MR meter differs.  
Runner: `run-measure.ts` / `m5trace-measure.ts`.

### 4.1 S01 seed130

| meter | longest (s) |
|---|---|
| current | **183** |
| (a) after sellAll | **79** |
| (b) close on meaningful/exempt buy | **79.5** |

F27 attribution: current 183 → (a) 42 / (b) 79.5 (b closes at the 2406.5 FARM buy; open ≈ 2327).

### 4.2 Worst / P95 over seeds 1–200, profile `optimal`, T=4000

| CSV | meter | worst | P95 (ceil 0.95 nearest-rank) | n > 180 |
|---|---|---|---|---|
| S01 `398a989f…` | current | 183 | 153 | 1 |
| S01 | (a) | **121** | 93 | **0** |
| S01 | (b) | **161** | 133 | **0** |
| R04 `d1cff5ac…` | current | 189 | 160 | 4 |
| R04 | (a) | **121** | 93 | **0** |
| R04 | (b) | **161** | 133 | **0** |

Raw: `measure-S01-seed130.json`, `measure-S01-seeds1-200.json`, `measure-R04-seeds1-200.json`, `counterfactual-summary.json`.

### 4.3 Monotone?

**Seed-level `mrLongest` is monotone** under both (a) and (b): for all 200+200 seeds, `mrALongest ≤ mrLongest` and `mrBLongest ≤ mrLongest` (0 violations).

**Reasoning:** both variants only add (or replace with strictly more permissive) opportunities to observe affordability / close a stretch, without changing buys. Post-`sellAll` coins ≥ pre-`sellAll` coins on the same tick, so (a)’s check-in sample cannot be “less affordable” than the skipped pre-sale sample. (b) only adds close events. Therefore stretches can only shorten or stay; **prior PASSes stay PASS; only FAILs need re-screening.**

Caveat: **per-farm** `mrByF` attribution is not monotone (closing early at F27 surfaces shorter stretches at F28/F29 that were previously swallowed by the open-farm attribution rule). Gate metrics use seed-max `mrLongest`, not per-farm.

---

## 5. Full verdict text

### (i) Match to intended oracle — **ambiguous**

- **Yes vs pinned V-2d-as-harness:** current order matches errata L96 + cited `m5mr.ts` L107–118. Economy’s “legitimate under V-2d” accounting claim is correct.  
- **No vs product dead-zone intent:** “no dead zone without an affordable purchase” / continuous inability to buy. The 183 s figure over-counts wall time relative to a post-sale affordability clock and relative to executed FARM buys inside the gap.  
- Cite: errata L96; `m5mr.ts` L107–112 vs L118 vs L140; product `m4-monetisation-proposal.md` L40; D-HOP-49 meaningful-row G4.

### (ii) Correction that matches intent

1. **Primary — (a):** move (or add) the affordability sample to **after `sellAll` and before buys** on check-in ticks; keep integer samples when there is no check-in. Aligns V-2d (1) with “coins available for the purchase decision,” and with how a client integer sample sees state after prior sells.  
2. **Optional — (b):** also close the stretch when a meaningful/exempt purchase **executes**. Stronger than V-2d §3’s “next affordable second,” but matches “purchase ended the dead zone.” Prefer as a clarifying errata add-on after (a), not instead of fixing the sample order.  
3. Do **not** treat FARM-exemption as broken; do **not** weaken the 180 s bar.

### (iii) Joint rebaseline / re-screen

**Required** before any PASS is claimed under a corrected oracle (HoP + HoQA + Economy).

- **Definition change:** errata V-2d (1) must state where `sellAll` sits relative to the sample (and whether purchase execution closes a stretch).  
- **Harness change:** `m5mr.ts` (and any flags-on twin that shares this order).  
- **Re-screen scope:** all post-L10 G4mr / meaningful-row results produced with `runmr.ts`/`m5mr.ts` (R04, S01, S1-R04, earlier cycles) — today **provisional** under the pinned asymmetry. Because of monotonicity, **re-screen FAILs only** for the seed-max bar; PASSes remain PASS under (a) or (b).  
- **Flags-on CSV `.27`:** acceptance of the **numbers in the CSV** is separate from this flags-off accounting bug. A V-2d sample-order correction **does** affect flags-on G4 when that harness uses the same order — schedule that as part of the joint rebaseline of the **metric**, not as a silent invalidation of `.27` content. Until the errata/harness change lands, do not re-interpret FAIL183 as PASS.

### (iv) Flags-off `streakCap` 0.28 inert — **confirmed**

- `runmr.ts` L10–11: `S.streakCap: 0.28`, `K = { ...S, on: false }`.  
- `m5mr.ts` L105: streak credit gated on `K.on`.  
- `m5mr.ts` L51: sale multiplier extras skipped when `!K.on`.  
Under flags-off screening, 0.28 vs CSV `tc_streak_cap=0.27` cannot change G4mr. Flags-on `.27` acceptance remains a separate concern (unchanged by this audit).

---

## 6. What this does *not* do

- No green-run sign-off.  
- No waiver of FAIL183 / worst≤180.  
- No P-L29 / B4 / tuning authorization.  
- No edit to Economy scratch, product errata, or `m5mr.ts` of record.

---

## 7. Artifact index

| path | role |
|---|---|
| `qa/m5/interp-mr-accounting-v1.md` | this document |
| `qa/m5/interp-mr-evidence/hash-verify.txt` | sha256 checks |
| `qa/m5/interp-mr-evidence/order-probe-S01-seed130.repro.json` | independent repro |
| `qa/m5/interp-mr-evidence/order-probe-S01-seed130.orig.json` | ADDENDUM probe copy |
| `qa/m5/interp-mr-evidence/measure-S01-seed130.json` | CF a/b seed130 |
| `qa/m5/interp-mr-evidence/measure-S01-seeds1-200.json` | CF a/b S01×200 |
| `qa/m5/interp-mr-evidence/measure-R04-seeds1-200.json` | CF a/b R04×200 |
| `qa/m5/interp-mr-evidence/counterfactual-summary.json` | rolled-up numbers |
| `qa/m5/interp-mr-evidence/COUNTERFACTUALS.md` | CF definitions |
| `qa/m5/interp-mr-evidence/m5trace-order.ts` | pinned tracer copy |
| `qa/m5/interp-mr-evidence/m5trace-measure.ts` | measurement-only CF runner |
| `qa/m5/interp-mr-evidence/m5mr.ts.pin` / `runmr.ts.pin` | sha-pinned harness copies |
