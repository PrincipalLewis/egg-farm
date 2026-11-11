# #114 Saves endCalls/durS: Architect addendum at 98e1af5 (final exact head)

Date: 2026-11-05 23:56 CET (Europe/Belgrade, UTC+1)  
Lane: architect · Prior: `saves-endcalls-durs-86973e5-architect-addendum.md` (APPROVE carries) · Root: `saves-endcalls-durs-e4117c4-architect.md`  
Paired: `#112` `abilities-sim-7a492e5-architect-addendum.md`  
**Supersedes intermediate** `9e043c4` as review target — that SHA was rc merge-forward only; live tip advanced.  
Requested final exact: `98e1af5b51d86a7e8b7bd0a6602d91332e3ee32f` · parents `9e043c4…` + `#112` `7a492e5…`  
Writes: this addendum + status only. **No** code / PR post / Ready / push / merge / messages. **Not** publishing authority.

## Verdict: prior **APPROVE CARRIES** to exact `98e1af5` — **content delta PASS**

Tree-neutral merge of `#112` new head into the Saves tip: **ancestry now includes `7a492e5`**; result tree equals clean `git merge-tree` of parents and equals intermediate `9e043c4` tree (abilities/timers already equivalent). D-HOE-41 endCalls/durS patch **unchanged** (stable patch-id). Timers `[…, incomeRef, abilities]` preserved. income-ref offline reset present in `m5Offline`. Flags 0. Hosted **not** SUCCESS (pending).

---

## Identity / live tip

| Check | Result |
|---|---|
| Live `headRefOid` / branch tip | `98e1af5b51d86a7e8b7bd0a6602d91332e3ee32f` **MATCH** |
| Parents | `9e043c4a29ac5b0b44d137b272cc48c75cb8d8a6` + `7a492e5fea47f9bb92ae2d07e82820c64471ec5a` |
| PR base | `feat/v5-abilities-sim` @ `7a492e5…` **MATCH** |
| Contains `#112` new head | **YES** (`merge-base --is-ancestor 7a492e5 HEAD`) |
| Contains intermediate `9e043c4` | **YES** |
| PR | open, not Draft, MERGEABLE, **UNSTABLE** (checks pending) |
| Files vs base | **2**: `src/save/m5-fields.ts` (+14/−5), `tests/v5-f2-m5-fields.test.ts` (+54) |

WT: `/workspace/wt-review-114-98e1af5` · Logs: `scratch/architect/review114-98e1af5/`  
(Intermediate measurements for `9e043c4`: `scratch/architect/review114-9e043c4/` — not a final verdict file.)

## Ancestry vs tree (do not equate)

| Claim | Evidence |
|---|---|
| `9e043c4` contained `7a492e5`? | **NO** (parents were `86973e5`+`f8036e8` only) |
| Abilities file blobs at `9e043c4` vs `7a492e5` | **identical** for abilities feature files + resolved `timers.ts` (tree-similar, **not** ancestry) |
| `98e1af5` tree | `a5bdb0fc…` == `9e043c4^{tree}` == `git merge-tree --write-tree 9e043c4 7a492e5` → **tree-neutral** merge adding `#112` ancestry |
| Diff `7a492e5..98e1af5` | exact Saves 2-file patch only |

## Patch / contracts

- Stable patch-id vs abilities base: `cfd535db029f2c2e121966828d6222b83bffd4c0` — **same** as `c43d2db..86973e5` / historical D-HOE-41 patch.
- Saves blobs @ `98e1af5` == @ `9e043c4` (`m5-fields` / f2 test **same=YES**).
- `endCalls` still honors finite `durS > 0` else `tc_ability_s`, clamp, `ability_ended{cause:"offline", effect_s}` (D-HOE-41).
- `m5Offline` also calls `resetIncomeRef` when `incomeRefOn` (#105) — present; no income-ref regression (`income-ref.ts` / schema blobs == `#112` tip / rc lineage).
- `TIMER_SYSTEMS = [seedEvRng, streak, breeds, incomeRef, abilities]` — blob **same** as `#112` `7a492e5`.
- Flags **all 0**. No top-level `abilityDurS`. No conflict markers.

## Independent evidence (Node **v20.19.2**, flock, nice 10)

| Gate | Result |
|---|---|
| `tsc --noEmit` | **0** |
| `sync-economy --check` | **0** |
| Focused vitest | **155/155**: f2-m5-fields 37 + abilities 29 + f1a 10 + income-ref 27 + telemetry-schema 50 + m4a-flag-off 2 |
| `--maxWorkers=1` | omitted (tinypool; flock lane) |

Author “115 tests” not used as verdict basis.

## Hosted / QA (read-only; no SUCCESS asserted)

Exact `98e1af5` runs: ci **42125193472** pending; pacing **42125193510** queued; k10 **42125193717** queued — **conclusion null**. Formal QA report for `98e1af5` **absent**. Intermediate `9e043c4` hosted (cancelled/in_progress when observed) is **not** evidence for this tip.

## Missing integration / merge gates

1. **`#112` must merge (or stay exact `7a492e5` as base)** before `#114` merges to `rc/v5`; after `#112` lands on rc, `#114` needs retarget/merge-forward + **new** exact-SHA recheck if tip moves.  
2. Hosted gate **SUCCESS** at exact `98e1af5`.  
3. HoQA/Saves formal exact-head PASS.  
4. Pacing policy on this tip.  
5. HoE merge decision — Architect content ≠ merge authority.  
6. If either parent tip moves → re-verify; do not assume tree-neutral again without measurement.

No Ready/push/merge/messages/code by Architect. **`9e043c4` is intermediate only — not the final reviewed head.**
