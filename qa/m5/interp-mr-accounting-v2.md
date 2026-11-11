# HoQA interpretation — MR / dead_zone accounting v2

**ID:** QA-D-1105-MRINTERP2  
**Completed:** 2026-11-05 22:28 CET (Europe/Belgrade)  
**Supersedes for operative rulings:** v1 (`qa/m5/interp-mr-accounting-v1.md`, sha256 `feec9f11…`) — **kept unchanged as history**.  
**HoP input (binding for this rev):** supports correction **(a)** — observe actual post-sale coins before purchases; meaningfulness/exemptions and the **180 s** bar **unchanged**. Does **not** support adding **(b)** (close-on-purchase) for now.  
**Write scope:** this file, `qa/m5/interp-mr-evidence/`, `qa/decisions.md` entry. Read-only elsewhere.  
**Status:** **Awaiting Economy countersign** before any errata/harness activation. S01 remains **FAIL183** under the current pin. Tuning / P-L29 / B4 remain **paused**. No green-run sign-off, no waiver, no official re-screen run in this task.

---

## 0. Verdicts at a glance (v2)

| # | Ruling |
|---|---|
| (i) | **Ambiguous** (unchanged from v1): current order matches V-2d-as-pinned-harness; does not match player-affordance intent; 183 s is not continuous inactivity. |
| (ii) | Adopt **(a) only** (HoP). Precise definition in §2. **(b) deferred** — not proposed for activation. |
| (iii) | Joint rebaseline required. **No PASS inheritance.** Full re-screen proposal in §5 (not executed here). |
| (iv) | Flags-off `streakCap` 0.28 **inert** — confirmed (v1 §5.(iv); still holds). |
| Mono | **Withdrawn** as a universal proof. See §3. |

---

## 1. Withdrawal of v1 monotonicity / PASS-inheritance

v1 claimed seed-level `mrLongest` is monotone under (a) and that prior PASSes stay PASS. **That claim is withdrawn as a proof.**

### 1.1 When (a) can lengthen a stretch

**(a) adds samples** (post-`sellAll` at check-in times, often fractional). A new sample with `mrAff===false` while the stretch is **closed** **opens** the stretch at that earlier `t`. If the next current open would have been at a later integer second, (a)’s stretch start is earlier by `t_int − t_checkin`. If the close time is unchanged, duration **lengthens** by that delta. A new stretch that current never opened can also appear.

**Structural channel:** post-sale sample, stretch closed, `mrAff===false`, before the next current integer open.

SellAll weakly **increases** coins, so post-sale unaffordable usually implies the prior integer in the same interval was also unaffordable (costs/candidates unchanged) — stretch already open. The remaining theoretical channel is **coin sinks between an affordable integer sample and a still-unaffordable post-sale check-in** (e.g. wage drain exceeding the basket sold), or a candidates/cost change without a buy.

**(a) cannot lengthen via “worse” coins at the same check-in `t`:** post-sale coins ≥ pre-sale coins, so replacing a pre-sale integer sample with post-sale on an exact-integer check-in can only make affordability weakly easier (close earlier / avoid opening) — never harder.

### 1.2 Empirical quantification (existing + v2 instrumented runs)

Instrument: `run-measure-v2.ts` / `m5trace-measure.ts` — logs (a) open tags (`after_sellAll` | `int_nocheckin`), fractional opens, earlier-open events vs current, and seed-max lengthening.

| Corpus | seeds | traj mismatches | seed-max lengthened | earlier-open events | fractional opens | after_sellAll opens |
|---|---|---|---|---|---|---|
| S01 optimal 1–200 | 200 | **0** | **0** | **0** | **0** | **0** |
| R04 optimal 1–200 | 200 | **0** | **0** | **0** | **0** | **0** |
| S01 seller15 1–20 | 20 | **0** | **0** | **0** | **0** | **0** |
| S01 casual 1–20 | 20 | **0** | **0** | **0** | **0** | **0** |
| **Total** | **440** | **0** | **0** | **0** | **0** | **0** |

Worst (optimal): S01 current 183 → (a) 121; R04 current 189 → (a) 121.  
S01 seed130: current 183 → (a) 79; opens current 48 / (a) 62 (**+14 reopenings after early closes**, not earlier opens).

**Interpretation:** 0/440 is **empirical evidence** that lengthening did not occur on these CSVs/profiles under this bot — **not a proof** that (a) never lengthens. Therefore **prior PASSes must not inherit certification** under (a).

Evidence: `qa/m5/interp-mr-evidence/v2-*.json`, `v2-analysis-summary.json`.

---

## 2. Precise definition (a) — recommended errata text

HoP: post-sale coins before purchases; meaningfulness/exemptions and 180 s unchanged; no (b).

### 2.1 Operational definition (harness)

| Tick class | Order | MR samples |
|---|---|---|
| **Check-in** (`t ≥ sellT`) | `step` → collect taps → **`sellAll`** → **MR sample** → buys | One sample at this `t` (**fractional allowed**) on **post-sale** coins, before any buy. |
| **Non-check-in integer** (`t` integer, `t < sellT`) | `step` → collect taps → (no sellAll) → continue | One sample at integer `t` on current coins (unchanged from today). |
| **Non-check-in non-integer** | unchanged | **No** MR sample. |

**Dedup:** if a check-in lands on an exact integer second, **do not** also emit a pre-sale integer sample; the only sample at that `t` is the post-`sellAll` one.

**Predicate (unchanged):** affordable ⇔ some `candidates()` row with coins≥cost and meaningful; meaningful = FARM|W1–W4 or `optionGain.gain > 0` (harness flags-off approx `> 1e-12` stays Econ’s RC note).

**Stretch (unchanged mechanics, new sample set):**  
- **Start** = first sample with not-affordable; `farm` = farm level at that sample.  
- **End** = next sample with affordable (or max / unload flush rules unchanged).  
- **`s = end − start`** (sim seconds; fractional starts/ends allowed when the opening/closing sample is a fractional check-in).  
- Open stretch at T closed at T; telemetry `open:true` flush unchanged.  
- **Purchases do not themselves close** a stretch (**no (b)**).

**Why fractional check-in samples:** the FAIL183 artifact is sellAll+buy at **2406.5 / 2453.6**. Integer-only sampling, even if reordered on integer check-ins, **misses** those post-sale windows. Sampling at the actual check-in `t` after sellAll is what observes coins available to the purchase decision.

### 2.2 Proposed errata replacement for V-2d item (1)

> **V-2d (1) — revised:** The emitter (and the harness of record) samples meaningful affordability as follows:  
> (i) on every check-in / sell tick: **after collect taps and `sellAll`, before any buy**, at that sim time (fractional sim times allowed);  
> (ii) on every integer sim second that is not a check-in tick: at that integer second with current coins.  
> When a check-in falls on an integer second, only the post-`sellAll` sample is taken (no pre-sale sample at the same `t`).  
> Affordable / meaningful / stretch start–end / `s` / `farm` attribution otherwise remain as in V-2d (2)–(3). Purchases do not themselves end a stretch. The 30 s emit floor, P95 rule, and `none_affordable` reason are unchanged. The **180 s** gate bar is unchanged.

Harness cite would move from “L106–112 before sellAll” to the post-`sellAll` sample site once Economy lands the harness change.

### 2.3 Out of scope for activation now

- **(b)** close-on-purchase — deferred per HoP.  
- Changing meaningfulness, exemptions, or the 180 s limit.  
- Flags-on CSV `.27` **content** acceptance (separate); flags-on G4 **metric** must use the same sample-order once activated (§5).

---

## 3. Trajectory identity — (a) is measurement-only

**Method:** sha256 of the ordered buy log  
`[t, kind, costCents, farmLevel, hensLevel, eggValueLevel, collectionLevel, farmAfter, hensAfter, eggValueAfter, collectionAfter]`  
from `m5trace-measure` (a) vs `m5trace-order` (current MR meter only), same CSV/seed/profile/T/flags-off.

| Run | compared | mismatches |
|---|---|---|
| S01 `398a989f…` optimal seeds 1–200 | 200 | **0** |
| R04 `d1cff5ac…` optimal seeds 1–200 | 200 | **0** |
| S01 seller15 seeds 1–20 | 20 | **0** |
| S01 casual seeds 1–20 | 20 | **0** |
| **Total** | **440** | **0** |

Spot hashes (S01 optimal): seed1 `67e499c1…`, seed130 `1015d66b…`, seed200 `d85dc5c5…` — measure == order.

**(a) as instrumented does not change purchases, timestamps, or RNG draws.** Activation in the official harness must preserve that (MR sample is read-only w.r.t. state).

---

## 4. Repro / hash carry-forward

v1 hash table and S01 seed130 snapshot repro remain valid (see v1 §1–§3). No ADDENDUM hash regressions re-found in v2 work.  
v1 file sha256 still `feec9f113c3b9abee93f7b89c4be456208b0eed4d2ce779fd1cfe1bffb1ab279`.

---

## 5. Re-screen proposal (do **not** run until errata + harness change)

**Activation gate:** Economy countersign of this v2 → PMC errata V-2d (1) revised as §2.2 → harness `m5mr.ts` (and flags-on twin if shared) implements §2.1 → then re-screen.

**Keep** all prior G4mr / meaningful-row results as **history** under the old pin. **No inherited PASS/FAIL certification** under (a).

### 5.1 Flags-off (selected unchanged CSV)

- Seeds **1–200**, profiles **optimal, seller15, casual**, T as today (4000).  
- CSV: the selected unchanged candidate under test (e.g. current pin under discussion — not chosen here).  
- Metric: seed-max meaningful-row stretch under definition (a); report worst, P95, `n>180` per profile.  
- Compare to historical current-definition numbers as commentary only.

### 5.2 Flags-on G4 (applicable)

- Same seed/profile grid on Econ’s flags-on harness config of record, once it shares the §2.1 sample order.  
- Blocking bar unchanged: meaningful-row P95 / worst ≤ 180 s per D-HOP-49 / Card #4 rules as applicable.  
- Does **not** by itself re-open `.27` CSV content acceptance.

### 5.3 Run-cost estimate (box, one lane, order-of-magnitude)

| Block | Seed-runs | Est. wall @ ~0.6–1.0 s/run |
|---|---|---|
| Flags-off 200×3 | 600 | **~6–10 min** |
| Flags-on G4 200×3 | 600 | **~10–20 min** (heavier stack) |
| **Total one CSV** | **~1200** | **~20–30 min** one lane |

Plus report write-up ~30–60 min Economy+HoQA. Multi-CSV campaigns multiply linearly.  
**This task does not execute the official re-screen.**

---

## 6. Countersign / pause

- **Economy countersign required** on definition §2 and the re-screen plan §5 before PMC errata edit or harness change.  
- Until then: current pin stands; **S01 FAIL183** stands; **tuning / P-L29 / B4 paused** (unchanged).  
- HoQA will not certify PASS under (a) from v1’s monotone argument.

---

## 7. Artifact index (v2 additions)

| path | role |
|---|---|
| `qa/m5/interp-mr-accounting-v2.md` | this document |
| `qa/m5/interp-mr-accounting-v1.md` | history (unchanged) |
| `qa/m5/interp-mr-evidence/v2-S01-seeds1-200.json` | S01 opt 200 + traj + lengthening |
| `qa/m5/interp-mr-evidence/v2-R04-seeds1-200.json` | R04 opt 200 + traj + lengthening |
| `qa/m5/interp-mr-evidence/v2-S01-seller15-seeds1-20-traj.json` | traj sample |
| `qa/m5/interp-mr-evidence/v2-S01-casual-seeds1-20-traj.json` | traj sample |
| `qa/m5/interp-mr-evidence/v2-S01-seed130.json` | seed130 summary |
| `qa/m5/interp-mr-evidence/v2-S01-seed130-events.json` | open/close dump |
| `qa/m5/interp-mr-evidence/v2-analysis-summary.json` | rolled-up v2 numbers |
| `qa/m5/interp-mr-evidence/DEFINITION-A-v2.md` | short (a) pointer |
| `qa/m5/interp-mr-evidence/run-measure-v2.ts` | instrumented runner |
