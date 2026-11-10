# #112 abilities sim: Architect merge-forward addendum at 7a492e5

Date: 2026-11-05 23:56 CET; **amended** 2026-11-06 00:02 CET (Europe/Belgrade, UTC+1) — QA-D-1105-PR112-TIMERS  
Lane: architect · Prior: `engineering/reviews/abilities-sim-c43d2db-architect-addendum.md` (**PASS delta** at `c43d2db…` on rc `844f8e15`) · Root: `abilities-sim-cc0642a-architect.md`  
Artifact: `artifacts/v5-112-mergefwd-7a492e5/NOTE.md` + `timers-vs-rcv5.diff` + `gates.log` (read)  
Requested exact: `7a492e5fea47f9bb92ae2d07e82820c64471ec5a` · parents `c43d2db…` + rc `f8036e8…` (#105)  
Writes: this addendum + status only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Verdict: **PASS (content delta)** — prior sim APPROVE / c43d2db PASS **carries** with expected `timers.ts` conflict resolution

Clean merge-forward onto post-#105 `rc/v5`. Feature set remains **9 files +402/−10**. Eight of nine blobs identical to `c43d2db`; `timers.ts` intentionally differs to keep **both** `incomeRef` (from rc) and `abilities` (**last**). No income-ref regression. Flags 0. Hosted on this SHA **not** SUCCESS (queued/pending at observation).

**QA-D-1105-PR112-TIMERS (flags-ON):** the `incomeRef` → `abilities` TIMER pair is classified **independent** (not one-way, not bidirectional). Manual union / abilities-last covers structural merge (a); this ruling is (b) same-tick semantics under flags-ON — **replaces** any “clean merge-tree ⇒ OK” shortcut for this pair.

---

## Identity

| Check | Result |
|---|---|
| Live head / `origin/feat/v5-abilities-sim` | `7a492e5fea47f9bb92ae2d07e82820c64471ec5a` **MATCH** |
| Parents | `c43d2db5dd56f90096a6ba5c509d33ccef69117d` + `f8036e8f0826ca76fcc0ee13092d575533d4969b` |
| PR base / `origin/rc/v5` | `f8036e8…` **MATCH** |
| PR | open, not Draft, MERGEABLE, mergeStateStatus **UNSTABLE** |
| Subject | `Merge origin/rc/v5 (f8036e8, #105) into feat/v5-abilities-sim` |

WT: `/workspace/wt-review-112-7a492e5` · Logs: `scratch/architect/review112-7a492e5/`

## Patch / conflict resolution

- `git diff f8036e8..7a492e5 --stat` = **9 files, +402/−10** (abilities, effects, events, m5-state, payout, timers, workers, v5-abilities-sim.test, v5-f1a-fields.test).
- Blobs vs `c43d2db`: **same=YES** for all except `src/sim/timers.ts` (**same=NO** — expected).
- Conflict resolution (Architect-verified against tip + artifact diff):  
  `TIMER_SYSTEMS = [seedEvRng, streak, breeds, incomeRef, abilities]` with both imports; **abilities last** (per `abilities-sim-cc0642a-architect.md`); incomeRef retained from rc (blob `income-ref.ts` tip == rc `4746dbf9…`).
- No conflict markers. Diff vs rc does **not** touch `income-ref.ts`, `game.ts`, `m5-fields.ts`, config, telemetry, UI.
- Schema tip == rc (`e1a5e5dc…`). Shipping flags **all 0**. No top-level `abilityDurS` (M1 stays closed).



## QA-D-1105-PR112-TIMERS — flags-ON tick order (`incomeRef` then `abilities`)

**Classification: independent** (within this TIMER pair). **Not** one-way. **Not** bidirectional.  
Order `[…, incomeRef, abilities]` at `src/sim/timers.ts:33` remains correct; abilities-last is structural preference + prior Architect rule, **not** required to break a same-tick data hazard between these two systems.

### Dispatch (exact `7a492e5`)

1. `advance` → many `step(dt)` (`src/sim/tick.ts:101–105`).  
2. Inside `step`: energy → coop/`prodEggsPerSec` → customers → `workerActions`/`sellTo` → **then** `stepTimers` if any M5 flag on (`tick.ts:14–57`).  
3. `stepTimers` computes one `focusS = tickFocusS(dt, clock)` then runs systems **in array order** (`timers.ts:35–38`).  
4. Wrappers: `incomeRef` uses **sim `dt`**, ignores focus (`timers.ts:30` → `incomeRefTick`); `abilities` uses **focusS only**, ignores dt (`timers.ts:32` → `abilitiesTick`).

### Read/write / transitive trace — `incomeRefTick`

| | |
|---|---|
| Entry | `income-ref.ts:62–68` |
| Gate | `incomeRefOn` = `m4 && tapCoins===1` (`:26`); identity if off |
| **Writes** | `irefRingCents`, `refWarmS` only (`:65–68`); `ensure` may create those fields (`:37–39`) |
| **Reads** | those fields + window W; **does not** call `refCents` / `issDollars` / `incomePerSec` |
| Transitive | **no** import of `abilities` / `effects` / `abilityActive` |
| Sales into ring | `recordSale` from `sellTo` **before** timers (`actions.ts:33–34`) with `saleValueCents(…, { suspended: true })` — BASE only |

On-read `refCents` (not in the tick body): warm-up uses `issDollars` → `incomePerSec` + `wagesPerSec` (`income-ref.ts:30,49–52`; `econ/income.ts:73–76`). That path uses `prodEggsPerSec(s,b)` **without** lay ctx → `layFactor` = 1 (`tracks.ts:16–18`); `priceDollars` → `graderMult(…)` **without** `inspectTierAdd` (`income.ts:21–24`; Inspect only via `payout.ts` + `abilities.ts:117–119`). Spec: **no ability uplift in I_ss** (`m5-streak-tap-coins-spec.md` §4.1a; ring exclusions §4.1 L135).

### Read/write / transitive trace — `abilitiesTick`

| | |
|---|---|
| Entry | `abilities.ts:101–114` |
| Gate | `flagOn(abilities)` + `s.abilities`; identity otherwise |
| **Writes** | `s.abilities[id]` only (clear `activeS`/`durS` on early/expiry, else countdown `activeS`); may push `ability_ended` |
| **Reads** | `abilities`, `workers`/`mood`, `isPaused`, `focusS`, `tc_ability_s` |
| Transitive | **no** read of `irefRingCents` / `refWarmS` / `refCents` |

Effects (Rush/Shout/Sweep/Inspect) read `abilityActive` from **sale/lay/payout paths in the step body**, which run **before** `stepTimers` (`effects.ts:26–30`; `tick.ts:28–56`). They are **outside** this TIMER pair.

### Same-tick semantics / boundary expiry

- On a focus tick where `activeS - focusS ≤ 0`, `abilitiesTick` expires the call **after** this tick’s laying/sales already consulted pre-expiry `abilityActive`.  
- `incomeRefTick` has already advanced the ring/warm clock and **never observed** that expiry.  
- **Next** tick: effects off; I_ref continues on sim dt.  
- Probe (scratch, flags tapCoins+abilities ON, call with `activeS=0.05`, dt/focusS=0.1): `irefTouchedAbilities=false`, `abilitiesTouchedIref=false`, expiry occurs, **iref fields and expiry identical if pair order reversed** (`scratch/architect/review112-7a492e5/timers-pair-probe.txt`).

So swapping the pair would not change I_ref fields or ability expiry outcomes; there is **no** same-tick “incomeRef must see post-expiry abilities” or “abilities must see post-incomeRef ring” requirement.

### Within-pair vs earlier systems vs future ticks

| Scope | Coupling |
|---|---|
| **This pair** (`incomeRef`↔`abilities` in `stepTimers`) | **Independent** — disjoint writes; no cross-reads in tick bodies |
| **Earlier in same `step`** (energy, Sweep lay, MH sales, `recordSale`) | Ability effects may apply to coins/lay; ring still BASE-only (`actions.ts:34`; spec §4.1). Happens **before** both timers |
| **Earlier TIMER systems** (`seedEvRng`, `streak`, `breeds`) | Run before both; streak SALE_EFFECTS also excluded from ring via suspended BASE path — not a incomeRef↔abilities hazard |
| **Future ticks** | Expiry this tick → effects off next tick; ring/warm continue independently on sim dt |

**Do not** infer independence from shipping flags-0: the flag-0 path makes both systems identity (`income-ref.ts:63`, `abilities.ts:102`), which hides coupling. The ruling is from flags-ON traces + probe above.

### Spec fit

- I_ref must not include ability multipliers (streak-tap-coins §4.1 / §4.1a) — satisfied by suspended BASE `recordSale` and I_ss without M5 lay/sale/Inspect uplifts.  
- Abilities timer only owns call countdown/early end (abilities spec rules 6/10) — does not consume I_ref.  
- Therefore **independent** + listed order is **semantically correct**; abilities-last remains the required append convention, not a dependency break for this pair.

## Independent evidence (Node **v20.19.2**, flock `.vitest-eng.lock`, nice 10)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0** |
| `sync-economy --check` | **0** |
| Focused vitest | **118/118**: abilities-sim 29 + f1a 10 + income-ref 27 + telemetry-schema 50 + m4a-flag-off 2 |
| `--maxWorkers=1` | omitted (tinypool; flock lane) |

Author NOTE 66/66 (abilities+f1a+income-ref) consistent; Architect set adds schema + flag-off.

## Hosted / QA (read-only; no SUCCESS asserted)

Exact head runs observed queued/pending (e.g. ci **42124942241**, pacing **42124942275**, k10 **42124942367**) — **conclusion null**. Formal QA report for `7a492e5` **absent** at observation. Prior `c43d2db` hosted/QA does **not** transfer.

## Missing merge gates

1. Hosted gate **SUCCESS** at exact `7a492e5`.  
2. HoQA/UI exact-head verdict.  
3. Pacing shards SUCCESS + aggregate policy (row-904 class if applicable).  
4. HoE merge — Architect content ≠ merge authority.  
5. `#114` endCalls/durS still required before any abilities flag flip (stacked; see paired addendum).  
6. If rc moves past `f8036e8` → merge-forward + recheck.

No Ready/push/merge/messages/code by Architect.
