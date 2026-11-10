# trace10 — harness-of-record event-trace producer (PL-AC5(iii)) — DESIGN ONLY

Author: Senior Software Architect, Egg Farm Studio. Written Mon 9 Nov 2026 23:55 – Tue 10 Nov 00:06 CET.
Decision context: D-HOP-2026-11-09-04 (HoP → Architect: own the harness-of-record design for BG3 trace10). HoE scope ruling: **Architect = design + review; Generalist = implementer.**
Status: **DESIGN. Nothing here is implemented, run or certified.** PL-AC5(iii) stays "not measured" = FAIL (Card #4 L942, `economy/gates.md` L5) until the run of record passes under a separate Eng+Architect+QA GO. This doc makes **no PL-AC5(iii) PASS claim** and authorizes no 600-run, no producer run of record, no CSV/balance edit, no flags-on, no push/PR.

---

## 0. Pinned inputs (sha256, read Mon 9 Nov 2026 23:55–Tue 10 Nov 00:10 CET)

| Input | sha256 | Notes |
|---|---|---|
| `product/scratch/r04-pacing-checkpoint/evidence-contract.md` | `fc6a938214c8914dde5fed7b6b51fb770b93e66c3472f10e1836b30a0c4b6c99` | **matches required hash.** EC-1 + EC-2 binding. |
| `product/scratch/r04-pacing-checkpoint/HANDOFF.md` | `11bc96773c8a66fdce013874613954d91bbaead600fc81a905dbae1e61ad8a46` | D-HOP-2026-11-06-02: Option A gaps; TRACE10-PLAN accepted as build contract. |
| `scratch/post-l10/cycle-R04-prerequisites/TRACE10-PLAN.md` | `727ac646e544277dcd378fa2c7b109658b9ab7cc30c7e85a28725be93be1dab1` | = contract's `727ac646…dab1`. |
| `scratch/post-l10/cycle-R04-prerequisites/HANDOFF.md` | `8a6a6577c228fad1d2ff188ca5b1f41dc75b704e5fe5905306a15dfb89352e96` | |
| `scratch/post-l10/cycle-R04-prerequisites/RESULT.md` | `28ae643d4786aa0a81e08b922e497e4cffc4329032d941b7cb451df7bd2a6bb1` | |
| `scratch/post-l10/cycle-R04-prerequisites/VALIDATOR-PROVENANCE.md` | `93829962c7c5c1aed77343a34823f54ff1356232c581ad25c5a57ebdc9c34bcb` | |
| `scratch/post-l10/cycle-R04-prerequisites/pins.sha256` | `6311df53debce2e4183c8b10571c25057702bce900c07872f8d48a0fa5a99432` | `sha256sum -c` → 8/8 OK. |
| `product/m5-gate-acs.md` (Card #4, PL-AC5(iii) at **L942–945**) | `907d206aab28c9bd30fedd141a2d557280c27fd28014be5a73a23087af394306` | Re-hashed Tue 10 Nov ~00:05 CET after the file changed under me (mtime Tue 10 Nov 00:00:35 CET; at 23:55 CET it hashed `7891bfbc…`; RESULT/VALIDATOR-PROVENANCE cite `7e698b6d…`). PL-AC5(iii) text unchanged; it moved down one line. See R-3. |


**Harness of record** — repo `game`, ref `origin/rc/v5` = `f20b91839fdf09ba0ed45a890281ccbf7bf2909d` (Merge PR #108, 2026-11-09 23:50 CET). Read with `git show origin/rc/v5:<path>`; the live worktree (`f1/cost-segments`, ce7d59a) was not touched.

| Path @ f20b9183 | sha256 (blob content) | Role |
|---|---|---|
| tests/bot-m5.ts | d7eee2ee5d3799c506bf4d19aa092ba7f9bc5dec8ef31c265116311438d943b7 | `run()` = port of Econ m5.ts 29d423c5 — **the runner traced** |
| tests/bot-m4.ts | e1c669c0d62370388ee9178abc52b7a83d96eb1f10118274eeabea1a5271c6aa | pickBuy / pickAction |
| tests/seller-variance.ts | 0ec8a96dcb2a83ef99d4559ee6c01af5941f8fd5ce70aafd5a0a4aefaa95ca1a | SellerVariance V |
| tests/py-random.ts | 995f425476b22948812957244dd3ef99e3b7e481f763c0a6bbcbb6089f19386d | MT19937 under V |
| tests/pacing-guards.ts | 5115abcf99db9104552600d056458aa7311b5534fb0dd4b820baf4f5dd731875 | |
| tests/bot-m5.test.ts | 2d836611c70143c9e8ce24c3a8ace79831440dd3baf477b032455653189aafb9 | existing observer read-only tests (L44, L107, L116) |
| src/sim/tick.ts | 426b325d6174827fb52625a44f2b769a262957ccfc7274ad742564c2383f45a2 | step() |
| src/sim/actions.ts | d6de064c6be3db32da5223077a2a32ced1c1f9dcd13da2763fcb08fbc73ca917 | apply()/sellTo/buy |
| src/sim/state.ts | 66b6c31cf4dcc7922e8468d621d18aa8d7f8d67691eb9975d0f6849f185319c0 | GameState, nextRand (engine RNG) |
| src/sim/rng.ts | ff62fce07c3984f7949b2510a9803d280462a5a38953562ba4449ee9c423382b | evRng/brRng |
| src/sim/workers.ts | 4b1699b480b5676ea9311902768a05c151ce6335872c2b8ef24b5319854986c2 | |
| src/sim/events.ts | 612c52381d0e135c2be64338bc8aaa5325268bbd15a8fd0f2434af32cf4c9469 | SimEvent union |
| src/sim/tracks.ts | f2fc14f2eb417ade4fb673a895152c1b472d7766f66b8651a339982fb3c6a1ab | |
| src/sim/m5-state.ts | c87277960a6753c22b385f77b7fdb0896301643048dff852c65dbe5490895579 | |
| src/ui/next-goal.ts | 3dc3a944477a20bac8ca9a99e07207c806578de67ab03de804998bbb00c5653e | candidates() (affordability) |
| src/econ/best-buy.ts | 4b93ceb3c0aeba7dd4141c24781d95b657a692b50cddbe0d5c5c5167955b9153 | |
| src/config/balance.ts / balance.json | f8ad9873…c8aecc65 / ddd02fbaea437e14c55f1df3251c2331b60e33697512a4e5107b69cd5f34b41a | |
| scripts/sync-economy.ts / -cli.ts | ac69202508c988f714e0a4b1b6d03db43abf8784b7830e9c396f8a966b2fac02 / 54fdb47a1c2e7da6ecb741dcd2e6f1d58f83949ba12c7950cb441bd00488712e | CSV→balance |
| data/economy.csv | **a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f** | ship CSV on rc/v5 **is** the "before" a8c4e268 |
| data/economy-config.json | 5540ab9567505aaa1b0e399fbb3cce32411abf083c92a32588228a0c4b4e3cdd | |
| package-lock.json / package.json | 56569550486f3450a31b435e94b807a7dc95d1e7ee7d3e9d5e09606e0ff6f75e / 7ec20f8aaab1062afa94c6274da1bda9bdb646d7cbb562701fc26a3c367bc027 | lock = Card #4 harness pin 56569550 |
| scripts/measure-l30plus.ts, scripts/bot-m5-diverge.ts | cfccf525…aa1 / ed8f7c15…fdf | prior art (firstDivergence, bot-m5.ts L359) |
| prior art: scratch/v2-econ/h/scripts/l30plus-trace.ts | 909de3d14257a9a65c162224b583ae2d3dc9d968b7444a6b4509a4f72986a484 | = TRACE10-PLAN §1 |

Node: `/workspace/tools/node-v20.19.2-linux-x64/bin/node` (v20.19.2). Box default `node` is v24 — **never** use it for evidence.

---

## 1. What is measured (bar, restated, no new behaviour)

Card #4 L942: *"per seed, the event-trace hash up to the reach(10) tick is identical before and after. The harness logs, for each seed, the first divergence tick, event and Farm level. A first divergence before reach(10) is a FAIL."* EC-2 sharpens: inclusive whole reach(10) tick, same reference cutoff, CFG none, 5 streams, separate input-diff manifest, observer proof, self-tests a/b/c.

"before" = CSV a8c4e268, "after" = the final combined CSV (does not exist yet; run of record is out of scope). Same code, same harness, same seeds (1–200) × profiles (optimal, seller15, casual), T = 4000 s (Card L869).

---

## 2. Producer location and module boundary

```
game/ (branch off rc/v5; path names are binding for review)
  tests/bot-m5.ts                 ← +3 optional read-only hooks ONLY (§2.2). No other change.
  tests/trace10/                  ← NEW. Library. Inside tsconfig "include" (src, tests) so `tsc --noEmit` covers it.
    encode.ts      canonical number/record encoder (§6.1)
    record.ts      stream record types + builders S1–S4 (§5)
    observer.ts    the hook set given to run(); builds records; owns no sim state
    rngcursor.ts   engine xorshift replay, V cursor read, runner counter (§7)
    gaps.ts        EC-1 per-level gap export (§12)
    manifest.ts    manifest + input-diff builders, schema validation (§8, §9)
    compare.ts     cut + first-divergence comparator + verdict (§4, §10)
    *.test.ts      fast self-tests (vitest run → part of `npm test`)
    *.slow.test.ts observer proof + a8c4 identity on modest seeds (vitest.slow.config.ts)
  scripts/trace10.ts              ← NEW thin CLI: produce one side (before|after) → OUT dir
  scripts/trace10-compare.ts      ← NEW thin CLI: compare two OUT dirs → verdict.json, exit code
```
Why `tests/trace10/` and not `tools/`: `tsconfig.json` includes only `src` and `tests`; anything under `tools/` would escape `tsc --noEmit` (a gate). Scripts stay thin (no logic) because `scripts/` is not type-checked either (existing `scripts/bot-m5x.ts` pattern).

### 2.1 Boundary rules (review-enforced, §14)
- **src/sim/** and **src/** : **zero bytes changed.** The producer imports only pure functions for reading (`nextRand` state.ts L63, `candidates` next-goal.ts, cost functions) and never calls `step`/`apply` itself.
- **data/economy.csv, src/config/balance.json**: zero bytes changed. "After" balances are built **in memory**: `validateBalance(buildBalance(parseEconomyCsv(csvText), <rc/v5 balance.json>, readEconomyConfig()), false)` — the same expression as the scratch harness `pl.ts` L11.
- **tests/bot-m5.ts**: only the hook patch in §2.2; diff ≤ ~12 lines, every added line is either a type declaration or an `opt.<hook>?.(…)` call / a counter local used only by that call.
- The observer may not hold a reference to live run state: every state it sees is a `structuredClone` (existing pattern bot-m5.ts L101); runner/V values are primitives.
- Determinism: no `Date`, `Math.random`, `performance`, env reads, or `Map`/object iteration of unsorted keys inside record building. Wall-clock appears only in the manifest `produced_at`.

### 2.2 The hook patch (the ONLY harness edit) — needs HoE + HoQA OK (gap G-1)
The harness as pinned cannot expose three things the contract needs (file:line evidence):
1. **Runner RNG `R`** is a closure: `const rng = (seed) => {…}` (bot-m5.ts L37), instantiated `R = rng(seed)` (L82), never returned. Its only call sites are L176–L180, inside `if (K.on)` (L163). No observer can see it.
2. **SellerVariance `V`** is a local (L82), never returned; its `trace?` hook (seller-variance.ts L20, L30) is never wired by `run()` (global `TRACE` L33–34 is used by other bots only).
3. **Per-tick state**: `run()` exposes state only at whole seconds (`onSecond`, L72/L138) and after bot actions (`onObserve`, L77/L101). Ticks without an action are invisible; `step()` events (L141) have no post-event state.
Also: buys/manage are applied **without the sink** (L229 `apply(s, pickAction(kind), b)`, L225 `apply(s, a, b)`), so no `upgrade`/`worker_hire`/`grader_tier`/`worker_manage` SimEvents exist in the harness of record. They are derived (§5 S2) — no patch needed for that.

Proposed patch (illustrative; review checks semantics, not exact text):
```ts
// RunOpts additions (after L77)
  /** trace10 (observe-only): phase 'step' = deep clone right after step()+drain of tick i (L141);
   *  phase 'end' = deep clone at the end of tick i (emitted at the top of tick i+1, and once after the loop). */
  onTick?: (phase: 'step' | 'end', i: number, t: number, s: GameState) => void;
  /** trace10 (observe-only): n-th draw (1-based) of the runner stream R and its value. */
  onRunnerDraw?: (n: number, u: number) => void;
  /** trace10 (observe-only): the run's SellerVariance, once, right after construction (before any method call). */
  onVariance?: (V: SellerVariance) => void;
// in run(), L82:
  const V = new SellerVariance(VAR_DEFAULT, seed), R0 = rng(seed); let rN = 0;
  const R = opt.onRunnerDraw ? () => { const u = R0(); opt.onRunnerDraw!(++rN, u); return u; } : R0;
  opt.onVariance?.(V);
// loop top (beside L138): if (opt.onTick && i > 1) opt.onTick('end', i - 1, prevT, structuredClone(s));
// after L141:            if (opt.onTick) opt.onTick('step', i, t, structuredClone(s));
// after the loop (beside L233): if (opt.onTick && n > 0) opt.onTick('end', n, prevT, structuredClone(s));
```
Consumption argument: `R` returns exactly `R0()`'s value and calls it exactly once per call; `onVariance` runs after the constructor's skill draw (seller-variance.ts L23) and before any method; `onTick` receives clones. With no hooks set, the code paths are byte-for-byte the old behaviour except the `R0`/`R` aliasing (identical function when `onRunnerDraw` is unset).

**Fallback if G-1 is refused (no harness bytes changed):** run the producer under vitest with module interception (`vi.mock('../src/sim/tick')` wrapping `step` to observe its return; `vi.mock('./seller-variance')` with a recording subclass). This covers (2) and (3) but **not (1)**: runner R stays unobservable, and S4 can only carry `runner: {status:"STRUCTURAL_ZERO_UNMEASURED"}` backed by the static proof (L176–L180 ⊂ `if (K.on)` L163; CFG none ⇒ `on:false`, L242). Under EC-2 ("explicit 0 ≠ omitted") that is **not** a measured 0 → the verdict must be non-PASS unless HoQA explicitly rules the static proof acceptable. Hence G-1 is **blocking** for a PASS-capable design.

---

## 3. Config: CFG none, and the two streak caps

- Stack = `M5X_STACKS.none` = `{ ...M5X_BASE, on: false }` (bot-m5.ts L241–242). Profile from `PROFS` (L36). `poisson_arrivals: true` is set on a copy (L81).
- Producer asserts before running, and records in the manifest: `K.on === false`, `K.rc2 === undefined`, and `flagOn(b, f) === false` for every `M5Flag` (flags.ts L15) on **both** balances (so `assertNoDoubleModel` L65 is trivially satisfied and combo — `abilities && rc2Refill` — is off). Any flag on ⇒ producer exits 3 (INVALID).
- `runtime_streakCap` = `K.streakCap` = **0.28** (L241), recorded as `cfg.runtime_streakCap`, with `cfg.runtime_streakCap_inert: true` and evidence `"bot-m5.ts L115 (!K.on → continue), L163, L188"`.
- `ship_tc_streak_cap` = the CSV column `tc_streak_cap` as read into `balance.m4.tc.streak_cap` (sync-economy.ts L185), recorded **per side** (`before.ship_tc_streak_cap` = 0.28 in a8c4/balance.json L435; `after.ship_tc_streak_cap` expected 0.27). Never merged into one field; never compared by the trace comparator.

---

## 4. The reach(10) cut rule

Definitions (harness of record): tick `i` = loop index 1..n, `n = Math.round(T·tickHz)` (bot-m5.ts L83, L136). reach(L) is set in the buy loop at the Farm purchase that makes `farmLevel === L`: `if (kind === 'f') reach.set(s.farmLevel, t)` (L230). The **reach(10) tick** `i10` = the tick in whose iteration that purchase happens.

Rule:
1. Each side records **every record produced in ticks 1..i10_self inclusive** — i.e. the whole iteration i10 (the rest of the buy loop at L229 after the F10 buy, e.g. a same-check-in Collection buy) **plus** the `onTick('end', i10)` record (emitted at the top of tick i10+1), then a `cut` record `{i10, t10}`. If a side never reaches F10 by T, it records to i = n and writes `cut: null`.
2. Reference cutoff `C = i10_before` (the before run's). The comparator compares all records with tick ≤ C on both sides — the **same C for before and after**.
3. Records after C are ignored.
4. If after's own F10 buy is at a tick ≠ i10_before, that is a divergence (it necessarily shows up at or before min(i10_before, i10_after) as a differing S2 purchase record). If the after trace ends (its own cut) before C while before still has records → divergence `"after_truncated_at_own_cut"`, never MATCH.
5. Before has no reach(10) by T ⇒ that seed is **UNASSESSED** (no reference cut) ⇒ non-PASS.
6. Producer records continue the full T=4000 run (never stop the sim early) so the observer proof compares full-run outputs; recording just stops after the cut.

---

## 5. The 5 required streams

All files are UTF-8 JSONL, one record per line, `\n`-terminated, written per (side, profile) in `OUT/<side>/<prof>/`. Every record is a **positional JSON array** (fixed field order; no objects except the manifest). First element = record tag, second = seed, third = tick i.

| Stream | File | Record | Engine units / precision (source) |
|---|---|---|---|
| **S1 tick + time** | `s1-ticks.jsonl` | `["T", seed, i, t]` one per tick 1..cut | `i`: integer tick, dt = 1/`b.tickHz` (bot-m5.ts L83; balance.json L3 `tickHz: 10`). `t`: sim seconds **as the harness computes it**, `Math.round(i·dt·10)/10` (L137) — the existing 0.1-s grid; producer adds no rounding. Producer asserts `tickHz === 10` (else t does not identify i; exit 3). |
| **S2 ordered events** | `s2-events.jsonl` | `["E", seed, i, seq, kind, …fields]` | see §5.1 |
| **S3 post-event state digest** | `s3-state.jsonl` | `["S", seed, i, seq, at, digestHex, …fields]` | §6 |
| **S4 RNG** | `s4-rng.jsonl` | `["R", seed, i, seq, source, …]` | §7 |
| **S5 manifest** | `manifest.json` (+ `input-diff.json`, separate, §9) | object | §8 |

`seq` = per-seed monotone counter over S2+S3+S4 records (one shared counter) so the global interleaving order is part of the trace.

Each JSONL file ends with a footer `["END", "<stream>", nRecords, seedsCovered[], sha256OfBodyLines]`. Missing footer, count mismatch, body-hash mismatch, a seed listed in the manifest but absent from the stream, or an empty stream ⇒ INVALID (non-PASS).

### 5.1 S2 event kinds (all present; none excluded)

| kind | Source | Fields (order) | Units |
|---|---|---|---|
| `sell` | SimEvent via `onEvents` (bot-m5.ts L71, L112); emitted by sellTo actions.ts L32 | id, k, N, price, value, by | k, N eggs (int); price **cents/egg**, value **cents** (actions.ts L31 `salePriceCents`/`saleValueCents`); by ∈ player\|market_hand |
| `collect` | SimEvent (actions.ts L76) | eggs, credited\|null, bonus_cents\|null | eggs; absent optional fields → `null` |
| `worker_collect` | SimEvent (tick.ts L96) | eggs | eggs (int, `Math.floor`) |
| `worker_state` | SimEvent (tick.ts L26, L78, L90) | worker, state | mood enum (workers.ts L17) |
| `worker_yawn` | SimEvent (tick.ts L27) | worker_id, energy_pct, farm_level | energy % rounded to 0.1 **by the engine** (L27) |
| `wage` | SimEvent (tick.ts L93) | worker, cents | cents |
| `customer_arrive` / `_served` / `_partial` / `_lost` | SimEvent (tick.ts L40–57, actions.ts L33) | as in events.ts L5–8 | ids, eggs |
| any other SimEvent type | SimEvent | `JSON` of the event via the canonical encoder with **sorted keys** | — (unknown kinds are recorded, never dropped) |
| `buy` | derived: `onObserve('action','buy:'+kind)` (L229) + the preceding clone | pick, action, track, rowPaid, costCents, coinsBefore, coinsAfter, newLevel | pick ∈ bot-m4.ts L14 (`c f hens eggValue W1..W4`); action per `pickAction` (bot-m4.ts L16–17); rowPaid = level **before** the buy; costCents = the engine's own expression for that action (actions.ts L42 `farmCost/collectionCost(L)·100`, L50 `trackCost·100`, hire L89–93, grader L95–100) evaluated with the same pure functions; producer asserts `coinsAfter === coinsBefore − costCents` bit-exactly, else INVALID |
| `hire` / `grader_tier` | derived from the `buy` state diff (new key in `workers`, `graderTier` change) | worker\|tier, cost | cents |
| `manage` / `manageAll` | derived: `onObserve('action', 'manage'\|'manageAll')` (L225) | targets[], energyBefore[] | % |
| `sellAll`, `buyCheck`, `collect_action` | `onObserve` action markers (L187, L206, L228) | — | marks bot decision points |
| `pause` | **structurally none in CFG none** (pause policy only under `K.on`, L212; `paused` map never filled) | producer emits one `["E",seed,0,0,"pause_policy","off_cfg_none"]` per seed so absence is explicit, not omitted | — |
| `cut` | producer | i10, t10 \| null | — |

Ordering inside a tick = harness order: `onTick('step')` → step events (drained L141) → collect actions + their events (L187) → `sellAll` + events (L206) → manage (L225) → `buyCheck` (L228) → buys (L229) → `onTick('end')`.

---

## 6. State digest

### 6.1 Canonical encoding (no new quantization)
- Numbers: ECMAScript `Number::toString` (shortest round-trip, what `JSON.stringify` emits) — exact for every double. Exceptions handled explicitly: `-0` → `"-0"` (string), `NaN`/`±Infinity` → `"NaN"`/`"Infinity"`/`"-Infinity"` (strings; producer then flags INVALID because the engine should never hold them).
- Absent optional field → JSON `null` at its fixed position. `0` stays `0`. Absent ≠ 0 is therefore positional and unambiguous.
- Booleans → `true/false`; absent boolean → `null`.
- Strings verbatim. Objects (only in "other SimEvent" and in `sfull`) → keys sorted by UTF-16 code unit.

### 6.2 Fixed field order (`S` record after `digestHex`)
```
 0 coinsCents          cents, double (state.ts L11)
 1 farmLevel F         int
 2 collectionLevel C   int
 3 hensLevel H         int (state.ts L23)
 4 eggValueLevel V     int
 5 coop                eggs, double (tick.ts L33)
 6 basket              eggs
 7 graderTier          int 0..5 (state.ts L18)
 8 manageCdS           s
 9 workers             4-tuple in WIDS order market_hand, coop_hand, hawker, grader (bot-m5.ts L38);
                       each null | [energy %, cdS s, unpaid|null, paused|null, callLockoutS|null] (workers.ts L14)
10 wageFracCents       [market_hand|null, coop_hand|null] cents (state.ts L21)
11 customers           [[id, demand, filled, waitedS], …] in array order
12 nextCustomerInS, 13 nextCustomerId, 14 coopFullS
15 rng                 uint32 engine xorshift32 cursor (state.ts L14, L63)
16 evRngState|null, 17 brRngState|null   (m5-state.ts; absent while golden/broody off)
18 sfull               sha256 hex of the canonical encoding of the ENTIRE cloned GameState (sorted keys)
```
Fields 0–17 are the contract's list (coins, F/C/H/V, workers+energy, grader, coop, basket) plus timers/queue/RNG cursors; `sfull` guarantees no state key escapes the digest (no exclusions, EC-2). `at` ∈ `step | end | after:<action>`.
`digestHex` = sha256(UTF-8 of the canonical encoding of fields 0–18 as one JSON array).
**Trace hash** per seed = sha256 over the concatenation of all S1–S4 body lines with tick ≤ C, in file order S1, S2, S3, S4 (each line incl. `\n`). Also a rolling chain `h_k = sha256(h_{k-1} ‖ line_k)` stored every 1000 lines per stream (localisation aid only, not a verdict input).

---

## 7. RNG capture per source (explicit 0 ≠ omitted)

Each seed gets one `["R",seed,0,seq,"init", …]` record listing all six sources, then per-tick and per-draw records. Every source appears in **every** per-tick summary record, with numeric 0 when it did not draw — never omitted.

| Source | Where | Captured as | How |
|---|---|---|---|
| `engine` (state.rng) | state.ts L14; drawn in tick.ts L50, L53 (Poisson gap + demand) | cursor value (uint32) at every S3 point + draws Δ since previous point | Δ computed by replaying pure `nextRand` (state.ts L63) from the previous cursor until equal (cap 10⁶ steps; not found ⇒ INVALID). Exact count, no sim change. |
| `ev` (evRngState) | m5-state.ts; rng.ts L22 | value or `null` (absent) | from clones; CFG none expects `null` throughout; any non-null ⇒ recorded, and divergence if sides differ |
| `br` (brRngState) | rng.ts L27 | value or `null` | same |
| `runner` R | bot-m5.ts L37, L82, calls L176–L180 | per draw `["R",seed,i,seq,"runner",n,u]`; per-tick cumulative n (0 explicit) | hook `onRunnerDraw` (§2.2). CFG none ⇒ expected n = 0 measured. |
| `variance` V | seller-variance.ts L17–31 | init record: `skill`, `mti`, sha256(mt) after constructor; per call `["R",seed,i,seq,"variance",callN,kind,value,mti,mtSha]` | `onVariance(V)` then `V.trace = fn`; cursor = PyRandom `mti` + sha256 of `mt` Uint32Array (py-random.ts L6) read at each call. Note `V.cheapFirst()` result is drawn and discarded (bot-m5.ts L228) — it is still recorded. |
| `breeds-hatch` | breeds-hatch.ts L40–46 (uses state.rng) | covered by `engine` cursor | no separate cursor exists |

Per-tick summary: `["R",seed,i,seq,"tick", engineCursor, engineDrawsCum, runnerCum, varianceCallsCum, evOrNull, brOrNull]`.
Private-field coupling: `mt`/`mti` are TS-`private` (not `#private`) so readable at runtime; a fast test asserts they exist and are of the expected type (fails closed if py-random.ts changes).

---

## 8. Manifest (S5) — JSON schema (draft 2020-12, abbreviated; implement as a validator in manifest.ts)

```json
{
  "$id": "egg-farm/trace10/manifest/v1", "type": "object", "additionalProperties": false,
  "required": ["schema","producer","side","run","inputs","harness","runtime","cfg","units","streams","per_seed","produced_at"],
  "properties": {
    "schema": {"const": "trace10-manifest-v1"},
    "producer": {"type":"object","required":["id","git_commit","files"],
      "properties": {"id":{"const":"trace10-producer"}, "version":{"type":"string"},
        "git_commit":{"type":"string","pattern":"^[0-9a-f]{40}$"}, "tree_dirty":{"const":false},
        "files":{"type":"object","description":"path → sha256 for tests/trace10/*.ts, scripts/trace10*.ts","additionalProperties":{"type":"string","pattern":"^[0-9a-f]{64}$"}}}},
    "side": {"enum":["before","after"]},
    "run": {"type":"object","required":["cmd","argv","env","seeds","profile","T","tickHz","synthetic"],
      "properties": {"cmd":{"type":"string"}, "argv":{"type":"array"}, "env":{"type":"object","description":"CSV, SEEDS, S0, T, PROFS, OUT only"},
        "seeds":{"type":"array","items":{"type":"integer"}}, "profile":{"enum":["optimal","seller15","casual"]},
        "T":{"const":4000}, "tickHz":{"const":10}, "synthetic":{"type":"boolean"}, "selftest_id":{"type":["string","null"]}}},
    "inputs": {"type":"object","required":["csv_path","csv_sha256","balance_base_sha256","economy_config_sha256","card_sha256","contract_sha256"],
      "properties": {"csv_sha256":{"pattern":"^[0-9a-f]{64}$"}, "balance_built_sha256":{"description":"sha256 of canonical JSON of the in-memory balance"},
        "contract_sha256":{"const":"fc6a938214c8914dde5fed7b6b51fb770b93e66c3472f10e1836b30a0c4b6c99"}}},
    "harness": {"type":"object","description":"path → sha256 for every file in §0 harness table (bot-m5/m4, seller-variance, py-random, pacing-guards, src/sim/*, next-goal, best-buy, balance.ts, sync-economy*.ts, package-lock.json) + rc commit","required":["commit","files"]},
    "runtime": {"required":["node","vite_node","vitest","platform"],"properties":{"node":{"pattern":"^v20\\."}}},
    "cfg": {"required":["name","stack","runtime_streakCap","runtime_streakCap_inert","ship_tc_streak_cap","src_flags_on"],
      "properties":{"name":{"const":"none"}, "runtime_streakCap":{"const":0.28}, "ship_tc_streak_cap":{"type":["number","null"]}, "src_flags_on":{"type":"array","maxItems":0}}},
    "units": {"type":"object","description":"field → {unit, precision, source file:line} for every S1–S4 field (copy of §5/§6/§7 tables)"},
    "streams": {"type":"object","required":["s1","s2","s3","s4"],
      "additionalProperties":{"required":["file","sha256","records","seeds"]}},
    "per_seed": {"type":"array","items":{"required":["seed","i10","t10","trace_sha256","records","reach","rng_end"]}},
    "gaps_export": {"required":["file","sha256","schema"],"properties":{"schema":{"const":"EC-1-optionA-v1"}}},
    "produced_at": {"type":"string","description":"ISO-8601 with offset; informational, never hashed into traces"}
  }
}
```
Plus `OUT/<side>/MANIFEST.sha256` (`sha256sum` format) over every file in OUT/<side>, checked with `sha256sum -c`.

## 9. Balance/header input-diff manifest (separate; cannot mask)

`OUT/input-diff.json`, written by `scripts/trace10-compare.ts` **after** the verdict is computed, from (before CSV, after CSV, before balance, after balance):
```json
{"schema":"trace10-input-diff-v1",
 "csv": {"header_renames":[{"old":"combo_window_s","new":"tc_combo_window_s"}, …],
         "cells":[{"row":L,"col":"…","before":"…","after":"…","class":"APPROVED_CAP|APPROVED_RENAME|POST_L10_ROW|UNAPPROVED"}]},
 "balance": {"leaves":[{"path":"m4.tc.streak_cap","before":0.28,"after":0.27,"class":"…"}]},
 "approved_basis":"D-HOP-2026-11-05-15; D-HOP-2026-10-30-34(2); EC-2 Exclusions",
 "unapproved_rows_0_10": n, "input_check":"PASS|FAIL"}
```
Non-masking by construction (review item): the comparator **does not read** this file and has no parameter for field/event/key exclusions; `verdict.json` is computed first and its sha256 is written into input-diff.json, not vice versa. The final report shows both side by side: a stream divergence is a divergence even if it "explains" by an approved input diff (TRACE10-PLAN §5: expected exclusion set is **empty**; flags-off the cap and combo are inert). Any rows 0–10 cell difference other than `tc_streak_cap` 0.28→0.27, or a rename not in the approved map ⇒ `input_check: FAIL` (separate failure, does not change the trace verdict).

---

## 10. Comparator and verdict

`scripts/trace10-compare.ts BEFORE_DIR AFTER_DIR OUT_DIR` (logic in tests/trace10/compare.ts):
1. Validate both manifests (schema, same harness hashes, same producer files, same runtime, same seeds/profile/T/cfg; `side` correct; MANIFEST.sha256 OK; footers OK). Any failure ⇒ **INVALID** (exit 3).
2. Per seed: C = before.i10 (null ⇒ UNASSESSED). Walk S1..S4 line-by-line up to C in both; first unequal line ⇒ `{seed, profile, stream, line, tick i, t, farmLevel (from the latest S3 ≤ i, before side), before_record, after_record}`.
3. Verdict per seed: MATCH | DIVERGED | UNASSESSED. Aggregate: `MATCH_ALL` only if every required seed MATCH and nothing INVALID; any DIVERGED ⇒ FAIL; any UNASSESSED/INVALID/missing seed ⇒ non-PASS.
4. Output `verdict.json` (+ sha256) with per-seed table, counts, first-divergence table. Exit: 0 MATCH_ALL, 1 DIVERGED, 2 usage, 3 INVALID/UNASSESSED.
5. Label: if either manifest has `run.synthetic: true` or seeds ≠ 1–200×3, the verdict header reads `"label":"SYNTHETIC/SELFTEST — not PL-AC5(iii) evidence"`. The tool never prints "PL-AC5(iii) PASS"; certification is HoQA's.
Reuse: `firstDivergence` (bot-m5.ts L359) is for m5px rows; write a new comparator but mirror its null-on-identical contract.

---

## 11. Observer proof (traced vs untraced)

Run in `tests/trace10/observer-proof.slow.test.ts` on a modest set (seeds 1–5 × 3 profiles, T = 4000, a8c4 balance), and as a CLI mode `--observer-proof` for the witness run:
- **P1 untraced vs traced, whole-run outputs:** `run(b, seed, P, none, T)` with **no opts** vs the same call with the full observer. Assert canonical-encoded equality of the entire return object (bot-m5.ts L236): `reach` map, `final` GameState (incl. engine `rng` cursor ⇒ same engine RNG consumption), `longestNoAff`, `g4m`, `rm`, `base`, `collTap`, `collW`, `src`, `baseF/srcF`. Any difference ⇒ FAIL.
- **P2 buy order + runner/V consumption:** traced-full vs traced-minimal (only `onObserve` buy markers + `onVariance` reading the final V cursor at run end + `onRunnerDraw` counter). Assert identical buy sequence `[i, pick, rowPaid]`, identical runner count (0) and identical final `(mti, sha256(mt))`. (The untraced harness returns neither `buys` nor V, so P2 is the strongest hook-light reference available without further harness edits; P1 covers everything the untraced harness exposes.)
- **P3 hook-mutation robustness** (pattern of bot-m5.test.ts L107/L116): hooks that mutate / `Object.freeze` what they receive and append junk to V.trace logs ⇒ P1 still equal.
- **P4 reach cross-check (informational):** reach maps 0..10 from the traced run vs scratch `baseline/out/raw-<p>.json` (pl.ts, SHA256SUMS 444c8b35…) for the same seeds; mismatch is **reported** as a harness-of-record finding (R-1), not an observer failure.

---

## 12. EC-1 legacy gap export (Option A)

`tests/trace10/gaps.ts` emits `OUT/<side>/<prof>/gaps.json`: `{"schema":"EC-1-optionA-v1","rows":[{"seed":s,"observed":{"11":g,…},"unobserved":{"27":"unreached"|"window_incomplete"}}]}`.
- Definition mirrors scratch m5pl.ts L106/L137 (gap keyed by the Farm level at which the nothing-affordable run starts; affordability = `candidates(s,b).some(c => s.coinsCents >= c.costCents)` exactly as bot-m5.ts L191, evaluated on the state at that point of the integer-second tick = last of {`onTick('step')`, `after:collect`} clones in that tick).
- L ∈ 11..29 **fully observed** ⇔ reach(L) and reach(L+1) exist within T and no gap that started at L is still open at T. Then value = max gap started at L in seconds, or **`0`** if none (measured zero, present key).
- Otherwise L goes to `unobserved` with a reason; never coerced to 0.
- Cross-check (INVALID on failure): `max(observed ∪ open-gap lengths) == run().longestNoAff` (same as pl.ts L21–22).
- Legacy raws (`scratch/post-l10/baseline/out/raw-*.json`) are never rewritten.

| Test (fast, synthetic traces) | Maps to | Pass condition |
|---|---|---|
| gaps: fully observed L, no gap ⇒ key present = 0; a bandguard-style consumer stub treats it PASS-eligible | **T-EC1a** | key `"L"` present, `=== 0` |
| gaps-consumer: required L with missing key / `null` / `[]` / `NaN` / wholesale empty map ⇒ FAIL or UNASSESSED, never subset-PASS | **T-EC1b** | verdict ∈ {FAIL, UNASSESSED} |
| gaps: unreached L (seed never gets to L+1) ⇒ in `unobserved`, not `0` | **T-EC1c** | key absent from `observed`, reason `unreached` |
| provenance: `sha256sum -c scratch/post-l10/baseline/SHA256SUMS` unchanged before/after the test run; manifest carries `gaps_export.schema` + producer sha | **T-EC1d** | OK + fields present |

---

## 13. Self-tests (synthetic GO under EC-2) — required before any run of record

| Id | File | Setup | Pass condition |
|---|---|---|---|
| **(a) identity a8c4↔a8c4** | `identity.slow.test.ts` + CLI witness | Two **separate processes** produce `before` and `after` from the same a8c4 CSV (`data/economy.csv`, sha a8c4e268), seeds 1–5 × 3 profiles (witness may extend to 1–20). | comparator exit 0, every seed MATCH, `trace_sha256` byte-equal, input-diff empty, `input_check: PASS`. |
| **(b) negative control** | `negative.slow.test.ts` | Fixture CSV (written only under the test tmp dir / `artifacts/`) = a8c4 with **one** rows 0–10 cell changed that the bot reads before F10. Selection rule: first candidate from a fixed list (e.g. `farm_cost` row 5, then customer-interval / demand cells on rows 1–5) that passes `buildBalance+validateBalance` and changes exactly one balance leaf; the chosen cell is asserted in the test. Plus a pure unit variant: mutate record k of a synthetic in-memory trace. | comparator exit 1; reported first divergence (seed, stream, line, i, t, F, records) equals an independent naive line-by-line diff; divergence tick ≤ C; for the unit variant reported index === k. |
| **(c) truncated / missing stream** | `invalid.test.ts` (fast, on a tiny synthetic OUT dir) | Variants: delete s4; drop the footer of s2; truncate s1 mid-file; footer count off by one; one seed missing from s3; manifest missing `cfg.ship_tc_streak_cap`; empty stream; `runtime.node` = v24; `src_flags_on` non-empty. | each ⇒ exit 3 (INVALID/UNASSESSED), never 0; verdict text never "MATCH_ALL". |
| observer P1–P3 | `observer-proof.slow.test.ts` | §11 | all equal |
| encoder | `encode.test.ts` | -0, NaN, 1e21, 0.1+0.2, absent vs 0 | round-trip exact, `-0` distinct, absent→null≠0 |
| rng cursor | `rngcursor.test.ts` | known xorshift sequences; PyRandom private fields exist | exact Δ counts; replay cap → INVALID |

---

## 14. CI / gate commands (Node 20 only)

```bash
export PATH=/workspace/tools/node-v20.19.2-linux-x64/bin:$PATH; node -v   # must print v20.*
npm ci
npx tsc --noEmit                                     # gate: tsc (covers tests/trace10)
npm test                                             # gate: sync-economy --check + vitest run (fast trace10 tests incl. (c), encoder, EC-1)
npm run check-globals                                # gate
npx vitest run --config vitest.slow.config.ts tests/trace10 --poolOptions.forks.maxForks=1   # (a), (b), observer proof
# witness CLI (long jobs only via lane-run, nice 10, 1 worker; lane-run redirects stdout to /dev/null, so redirect inside):
/workspace/egg-farm-studio/ops/tools/lane-run.sh <lane> -- nice -n 10 bash -c \
 'CSV=data/economy.csv SIDE=before SEEDS=5 S0=1 T=4000 PROFS=optimal OUT=<dir> node node_modules/.bin/vite-node scripts/trace10.ts > <dir>/before.log 2>&1'
# … same for SIDE=after (separate process), then:
node node_modules/.bin/vite-node scripts/trace10-compare.ts <dir>/before <dir>/after <dir>; echo "exit $?"
sha256sum -c <dir>/before/MANIFEST.sha256 <dir>/after/MANIFEST.sha256
```
Hosted CI: fast tests ride the existing `npm test` job; slow tests ride the existing `slow` job (vitest.slow.config.ts header: "Always run in CI (ci.yml job `slow`)"). No new workflow. Never use `pkill`/`killall`; stop lane jobs by recorded PID only.

---

## 15. Task breakdown (implementer: **Generalist**; reviews: Architect; witness: HoQA)

| # | Task | Owner | Est. | Depends |
|---|---|---|---|---|
| G-0 | Ruling on the §2.2 hook patch (or fallback) + harness-of-record = rc/v5 `tests/bot-m5.ts` (R-1) | HoE + HoQA (+ Econ for R-1) | ≤1 h wall | — |
| T1 | Hook patch in tests/bot-m5.ts + tests that hooks unset ⇒ existing bot-m5 tests unchanged | Generalist | 1.5 h | G-0 |
| T2 | encode.ts + record.ts + digest (§5–§6) + encoder tests | Generalist | 2.5 h | — (parallel to T1) |
| T3 | rngcursor.ts (§7) + tests | Generalist | 1.5 h | T1 |
| T4 | observer.ts + scripts/trace10.ts + manifest.ts (§8) | Generalist | 3 h | T1–T3 |
| T5 | compare.ts + scripts/trace10-compare.ts + input-diff (§9–§10) | Generalist | 2 h | T2 |
| T6 | Self-tests (a)(b)(c) + observer proof P1–P3 (§11, §13) | Generalist | 3 h | T4, T5 |
| T7 | EC-1 gaps.ts + T-EC1a–d (§12) | Generalist | 2 h | T4 (parallel to T6) |
| T8 | Gates green (tsc, npm test, sync --check, check-globals, slow trace10) + artifacts + local commit/bundle per HoE norms | Generalist | 1 h | T6, T7 |
| R1 | Architect review against §16 checklist | Architect | 1.5 h | T8 |
| Q1 | HoQA review + pins + witnessed self-tests | HoQA | 2 h | R1 |
| — | Run of record (600 × before/after) on the final combined CSV | separate Eng+Architect+QA GO | TBD (see R-5) | Q1 + final CSV |

**Critical path to self-tests PASS:** G-0 (1 h) → T1 (1.5) → T3 (1.5) → T4 (3) → T6 (3) → T8 (1) ≈ **11 h of implementer time**, plus R1 1.5 h ⇒ **≈12.5 h to "self-tests PASS, Architect-reviewed"**, ≈14.5 h incl. HoQA witness. Starting Tue 10 Nov 08:00 CET (with G-0 ruled by then) ⇒ self-tests PASS ≈ Tue 19:00 CET, Architect review ≈ Tue 20:30 CET, HoQA ≈ Tue 22:30 CET. That leaves ≈8 h before the Wed 11 Nov 07:00 CET CSV-acceptance freeze for the final CSV + 600-run — **only if** G-0 is ruled early and the final combined CSV exists; see R-5.

---

## 16. Architect review checklist for the producer PR

1. Diff touches only: tests/bot-m5.ts (hook patch), tests/trace10/**, scripts/trace10*.ts. `git diff --stat origin/rc/v5 -- src data src/config/balance.json` is empty.
2. Hook patch: each added line is a type, an `opt.<hook>?.(…)` call on a clone/primitive, or the `R0/R/rN` alias; no write to run locals; `R` calls `R0` exactly once per call; `onVariance` after constructor, before first method.
3. Existing `tests/bot-m5.test.ts` (incl. L44, L107, L116 observer tests, parity hashes) and `tests/bot-m5-trace.slow.test.ts` (trace 07139bdd) pass unchanged.
4. Producer never calls `step`/`apply`, never mutates balance, reads no env other than the documented ones, no wall-clock in records.
5. Encoder: -0 / non-finite / absent handled per §6.1; record arrays positional; S3 field order exactly §6.2; `sfull` over full sorted-key state.
6. All 5 streams emitted, footers + MANIFEST.sha256; units table present with file:line; no rounding added anywhere (grep for `toFixed|Math.round|Math.floor` in tests/trace10 — each hit justified).
7. Cut: inclusive whole tick i10 incl. `end` record; same C (before) for both sides; after-truncation ⇒ divergence; no-F10 before ⇒ UNASSESSED.
8. RNG: six sources in every tick summary with explicit 0/null; engine Δ via replay with cap; V cursor = mti + mt sha; runner via hook.
9. CFG none asserted; runtime_streakCap and ship tc_streak_cap separate fields per side; src flags vector empty.
10. Comparator has no exclusion parameter; input-diff written after verdict and not read by it.
11. Self-tests (a)(b)(c) + P1–P3 + T-EC1a–d present, each failing when its subject is broken (reviewer mutates one thing locally: e.g. drop a stream, flip -0, skip a V call — test must go red).
12. Exit codes 0/1/2/3 as §10; synthetic label; no "PL-AC5(iii) PASS" string anywhere in code or output.
13. Manifest validates against §8 schema; Node v20 asserted; harness/producer hashes recomputed from disk, not hardcoded.
14. Gates green on the PR head: tsc, npm test, sync-economy --check, check-globals, slow trace10; artifacts + sha256 listed in the PR body.
15. Performance note: measured wall time for 5 seeds × 3 profiles and an extrapolation for 600 × 2 sides.

---

## 17. Blocking gaps, risks, open questions

- **G-1 (BLOCKING for a PASS-capable design): runner RNG R is not observable** in the harness as pinned (bot-m5.ts L37/L82; calls only L176–L180 under `if (K.on)` L163). Exposing it needs the read-only hook (§2.2) in tests/bot-m5.ts — a harness byte change (re-pin), src/sim untouched, consumption unchanged. HoE + HoQA must approve the patch, or HoQA must rule the static structural-zero proof acceptable. Without either, S4 runner ≠ measured 0 ⇒ non-PASS.
- **G-2 (BLOCKING, same patch): no per-tick / post-step state and no V handle** (bot-m5.ts L72/L77/L82/L138; seller-variance.ts L20 unwired). Covered by `onTick`/`onVariance` in the same patch; fallback = vitest module interception (§2.2).
- **G-3 (design-handled, not blocking): purchases/manage are applied without the event sink** (bot-m5.ts L225, L229) ⇒ no `upgrade/worker_hire/grader_tier/worker_manage` SimEvents. Derived from observe clones + engine cost expressions with a bit-exact coins assertion (§5.1).
- **G-4 (design-handled): t is rounded to 0.1 s** (L137); i is only recoverable because tickHz = 10. Producer records i from the hook and asserts tickHz = 10.
- **R-1 harness of record not yet ruled** (Card L861 "TBD (Econ + Architect)"). This design proposes rc/v5 `tests/bot-m5.ts` (runs the shipping src/sim). Before raws for PL-AC5(ii) come from scratch `pl.ts`/`m5pl.ts` with its own src snapshot; P4 reports any reach mismatch. Econ + Architect ruling needed alongside G-0.
- **R-2** PyRandom `mt`/`mti` are TS-private; producer reads them at runtime (guard test). Alternative: a read-only `cursor()` getter in tests/py-random.ts as part of the same patch (HoE choice).
- **R-3 Card hash drift:** product/m5-gate-acs.md is being edited live: `7e698b6d…` (RESULT/VALIDATOR-PROVENANCE, 5 Nov) → `7891bfbc…` (23:55 CET 9 Nov) → `907d206a…` (00:00:35 CET 10 Nov). The PL-AC5(iii) text (now L942–945) is unchanged, but HoQA must name the card version of record, and the producer must hash the card at run time into `inputs.card_sha256`.
- **R-4** `f1/cost-segments` (ce7d59a, not on rc/v5) changes sync-economy (economy-config, farm_cost row verify). If it merges before the RC, harness hashes and possibly the negative-control cell choice change ⇒ re-pin and re-run self-tests.
- **R-5 schedule:** the 600 × 2-side run time is unmeasured (T8 measures it). The final combined CSV (rows 11–29 repair + bc_* + tc_* + rename map, B4) does not exist yet; EC-3 analyze/compare pins (BG-4) and BG-5 are separate. The Wed 07:00 CET freeze is at risk unless G-0 is ruled by Tue ~08:00 CET.
- **R-6** Volume: S1–S4 up to reach(10) ≈ 10⁶ lines/profile/side (estimate); gzip artifacts allowed (hash the uncompressed bytes).
- **Q-1** HoQA: is P2 (traced-full vs traced-minimal) acceptable for "buy order + RNG consumption" given the untraced harness returns neither buys nor V? If not, the patch must also return `buys` with kinds — a further harness change.
- **Q-2** E-G7 divergence logger (harness blob `75c864752b5a`, Card L942) was not located or reviewed; this design does not depend on it.
