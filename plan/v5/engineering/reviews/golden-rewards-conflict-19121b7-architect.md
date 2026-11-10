# #107 golden rewards: Architect content ruling on **proposed** merge resolution (UNPUSHED)

Date: 2026-11-06 01:49 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior PASS tip (still PR head): `golden-rewards-a6d44c2-architect.md` @ `a6d44c250b043250b56885e289fd4210270ad988`  
**Not a pushed head.** Verdict binds to artifact digests + proposed tree only. PR #107 remains `a6d44c25` / base `feat/v5-tapcoins`.  
Artifact dir: `artifacts/v5-107-mergefwd-CONFLICT-19121b7/`  
Writes: this note + `engineering/status.md` (+ evidence under `engineering/reviews/evidence/…`). **No** mutate shared feature WT / commit / push / PR / messages. Architecture advice only — **not** publishing authority.

## Verdict: **APPROVE proposed content** (order as written)

Approve Features’ both-sides keep for conflicts on `effects.ts` + `timers.ts`, with:

`TIMER_SYSTEMS = [seedEvRng, streak, breeds, incomeRef, frenzy, abilities]` (`abilities` last)

and `SALE_EFFECTS` = streak → frenzy → rush → shout (+ Sweep in `LAY_EFFECTS`).

No alternate order required. This is **not** a clean merge / D-HOE-51 inherit (effects/timers intentionally differ from `a6d44c2`); conflict content was reviewed on the proposed tree.

---

## Bound identity (do not cite a PR tip)

| Binding | Value | sha256 of artifact file |
|---|---|---|
| `rcv5.sha` (base) | `19121b75b44199beebf44fdb34a69b1120035cb0` | `38b5e719…cea3` |
| `proposed-tree.sha` | `1dcd12ec1045ba955d255b38aef4273ed9868591` | `c28fc7e9…005b` |
| `head-unchanged.sha` (PR tip) | `a6d44c250b043250b56885e289fd4210270ad988` | `0820c252…fcd9` |
| `proposed-two-dot.patch` | 6 files +204/−3 | `ed3aaf4f…f37b` |
| `resolution-vs-a6d44c2.diff` | effects+timers only | `36c4b5bd…d9cc` |
| `NOTE.md` | conflict aborted; local proposed | `bd05b5fd…10ac` |

Architect re-apply of `proposed-two-dot.patch` onto detached `19121b75` → `git write-tree` **=** `1dcd12ec…` (**MATCH**). Live `origin/rc/v5` observed `19121b75…` (same as artifact).

Proposed file set vs rc (same 6 as prior tip):  
`formulas.ts`, `m5-rules.ts`, `effects.ts`, `golden.ts`, `timers.ts`, `tests/v5-golden-rewards.test.ts`.  
Blobs **identical** to `a6d44c2` for formulas / m5-rules / golden.ts / test; effects+timers differ only by abilities union (expected). Abilities module retained from rc — **no unrelated content loss**.

## Timer pair: `frenzyTick` ↔ `abilitiesTick` — **independent**

| | `frenzyTick` (`golden.ts:52–56`) | `abilitiesTick` (`abilities.ts:101–114`) |
|---|---|---|
| Writes | `frenzyRemainingS` only | `abilities[id]` only (+ `ability_ended`) |
| Same-tick cross-read | **none** | **none** |
| Clock | focusS | focusS |

Proposed order places `frenzy` before `abilities` (`timers.ts:36`); abilities-last matches #112 convention. Probe on proposed tree (flags golden+abilities ON, both near expiry): cross-touch **false**; expiry **order-reversible** (`evidence/…/probe-frenzy-abil.txt`). Same-tick sales/lay use **pre-timer** state (step body before `stepTimers`) — expiry affects **next** tick’s factors, not mutual timer observation.

## Combined sale multipliers (not “multiply commute” hand-wave)

- Registry: streak, frenzy, rush, shout (`effects.ts:26–30`); factors multiply; comment “order documentation only” (`:22`).
- Credit: `saleValueCents` = `Math.round(k * base * Π mults)` **once** (`payout.ts:16–18`). For a fixed factor set, product order does not change the rounded cent — probe `productCommute: true`.
- **Suspended / D-C3:** `saleEffectFactors` returns `[]` when `ctx.suspended` (`effects.ts:40`) → frenzy+rush+shout all off together; probe `suspendedEqualsPlainBasePath: true`.
- **Boost / reward exclusion:** `baseScaled` / `priceDollars` path excludes streak/Frenzy by design (`golden.ts:5`); Sweep not in sale path; Inspect via `inspectTierAdd` on grader, outside `SALE_EFFECTS` product.
- **Cap:** coop Sweep is lay-path + coop fill earlier in `step`; not a sale-product ordering issue.
- I_ref ring still uses suspended BASE sales (rc income-ref) — Frenzy/abilities do not enter the ring.

No alternate SALE_EFFECTS order required for correctness.

## Independent evidence (Node **v20.19.2**, flock, nice 10; isolated WT @ proposed tree)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0** |
| Focused vitest | **87/87**: golden-rewards 21 + abilities-sim 29 + income-ref 27 + f1a 10 |
| Author claim 121/121 | not used as verdict basis |

Evidence: `engineering/reviews/evidence/golden-107-conflict-19121b7/`.

## Limits / next (not cleared here)

1. Proposed tree is **local / unpushed** — after Features commits merge-forward, need exact-head recheck if tree ≠ `1dcd12ec…`.  
2. Hosted / HoQA / Ready / merge = HoE process; Architect does **not** authorize publication.  
3. PR still stacks on `feat/v5-tapcoins`; retarget/base after rc integration is Features’ job.  
4. Full suite / build not re-run (bounded conflict content).

No Ready / push / PR post / merge / messages / source commits by Architect.
