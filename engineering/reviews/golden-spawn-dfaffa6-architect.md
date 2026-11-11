# Architect review · PR #108 golden spawn + GE-AC26 merge-forward · dfaffa6e
**Date:** 2026-11-05 22:02 CET (Europe/Belgrade)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/108 (Draft)  
**Head:** `dfaffa6e2d2f2d3f05d5f617d43b982383658dd8`  
**Parents:** `b0d7e8526c8a21f0688b338b4dec2a460bc257e7` + `a6d44c250b043250b56885e289fd4210270ad988`  
**Branch:** `feat/v5-golden-spawn`  
**Contract:** `engineering/reviews/arch-golden-slice2-contracts-20261105.md` (+ Product D-HOP-2026-11-05-11 / GE-AC26)  
**Reviewer:** Architect · worktree `/workspace/wt-review-109-ca04b06` @ exact head  
**Artifacts:** `artifacts/v5-golden-spawn-dfaffa6/` (SHA256SUMS verified OK; tested-sha = head)  
**Logs:** `scratch/architect/review108-dfaffa6/`  
**Scope:** Stays Draft / no merge. Not conflated with #109 / Game restack.

## Verdict: **FAIL** — 0 Blocker / **1 Major** / 1 Minor / 1 nit

Merge-forward GE-AC26 is clean. Slice-2 spawn/lifetime/tap/events match the corrected contracts **except** an accidental F3 regression in `M5_TC_KEYS` introduced on `b0d7e85` and still present at this tip. Fix Major before Architect re-review / any Ready.

---

## Diff summary

### Merge tip vs `b0d7e85` (this PR’s merge commit only)
1 file, +11/−1: `tests/v5-golden-rewards.test.ts` — GE-AC26 `validateBalance` cases (0/2 throw, shipped =1 OK).  
`src/config/m5-rules.ts` all_sales≠1 guard was **already** on `b0d7e85` (byte-identical to `a6d44c2`); merge is tree-neutral on that path.

### Slice-2 stack vs rewards tip `06bf3cf8` (full #108 content)
11 files, +339/−25: `golden.ts` spawn/tick/tap/unload, `actions` spawnGolden/tapGolden, `timers` goldenTick, `m5-fields` drawGap re-export + goldenUnload offline, `state` goldenPending/frenzyRun, `formulas` M5_TC_KEYS golden keys, `m5-rules` GE-AC26, tests spawn+rewards.

---

## Contract checklist (spawn / lifetime / tap / events)

| Requirement | Result | Evidence |
|---|---|---|
| UI passes valid spot ids; sim `pickIndex` (R14, sizing §12.2) | PASS | `spawnGolden(s, spots, …)`; `spots[pickIndex(u,n)]` (`golden.ts` L122–128); test L69–72 |
| Empty list = R15 deferral; no egg, no draw; `GOLDEN_RECHECK_S=0.5` | PASS | L83, L125; test L78–87 |
| Focus clock for first spawn / gap / lifetime / recheck | PASS | `goldenTick` + TIMER_SYSTEMS (`timers.ts` L34–37); tests GE-AC13/21 |
| evRng order gap→slot→reward (never `state.rng`) | PASS | `drawGap` / spawn / `tapGolden`; GE-AC33 test L142–148 |
| Reward table cash→frenzy→eggs / eggs_cash | PASS | `rollReward` unchanged; slice1 + spawn tests |
| `tapGolden` R19 grace, R20 one grant, R25b not credited tap | PASS | L131–140; GE-AC6/18/35 |
| Session-only: egg, pending, frenzyRun never saved (R10a) | PASS | `SESSION_ONLY_KEYS` +test L182–186 |
| `goldenUnload(reason)` reload/offline/takeover/reset; no reward; draw gap | PASS | L143–146; m5Offline→unload offline L101; tests L170–180 |
| Sim events carry no `collectible_id` (Game adds) | PASS | `events.ts` note; spawned/collected/expired shapes |
| `tc_frenzy_all_sales` must be 1 (GE-AC26 / D-HOP-11) | PASS | `m5-rules.ts` L39; rewards+spawn validateBalance tests |
| Flag off identity; no UI / SAVE_VERSION bump on this PR | PASS | flag tests; no save.ts version change in stack |
| No invented APIs vs contracts | PASS | `spawnGolden` / `tapGolden` / `spawnDue` / `goldenUnload` / `drawGap` / `GOLDEN_RECHECK_S` only |

---

## Major (FAIL)

**M1 · `M5_TC_KEYS.abilities` deleted** — `src/config/formulas.ts` L145–150  
When extending golden’s tc key list on `b0d7e85`, the sibling entry `abilities: ['ability_s', 'ability_cd_s']` was swallowed into the golden line’s end-of-line comment:

```ts
golden: […, 'frenzy_all_sales'], // #1 slice 2 readers + R22 scope abilities: ['ability_s', 'ability_cd_s'],
streak: […],
tapCoins: […],
// ← no `abilities:` key
```

`validateBalance` (`balance.ts` L46) only requires keys for flags present in `M5_TC_KEYS`. With `abilities: 1`, `ability_s` / `ability_cd_s` are **no longer** F3-required. Shipping default `abilities: 0` hides this in current gates; it is still a validateBalance regression vs slice-1 / F3.  

**Fix:** restore a real object entry `abilities: ['ability_s', 'ability_cd_s']` (and keep the golden key list). Add/keep a pin test so this cannot re-vanish. Re-run targeted golden + any abilities/validateBalance tests.

---

## Minor

**m1 · GE-AC33 test comment** (`tests/v5-golden-spawn.test.ts` L142) says “slot → reward → gap”; authoritative order is **gap at resolve → slot → reward**. First-spawn cycle correctly skips a gap draw (uses `tc_first_spawn_s`); comment is easy to misread. Clarify in a follow-up; not a logic defect.

## Nit

**n1 · `goldenUnload` arg order** on this tip is `(s, b, reason, ev?)` (`golden.ts` L143; `m5Offline` matches). Features Game FINAL A prefers `(s, b, ev, reason)`. Consistent inside #108 + Saves base; reconcile is Game/#111’s job when stacking — do not churn #108 for that alone.

---

## Artifacts / gates

| Item | Status |
|---|---|
| Artifact SHA256SUMS | Verified OK |
| Author `tested-sha` | `dfaffa6e…` = PR head |
| Author tsc / vitest | exit 0 / **45/45** (24 spawn + 21 rewards) — evidence inspected, not re-run |
| Independent local vitest | **LOCK PENDING** — `.vitest-eng.lock` held (rule 21; flock waiters present) |
| Independent tsc in review wt | **N/A** — no `node_modules` in this worktree |
| Hosted CI on Draft #108 | All required checks **SKIPPED** (draft) |
| Remote head | `dfaffa6e…` (matches tip) |

## Pending QA / gates
1. Features fix **M1** on a new tip; Architect re-review.  
2. When lock free: exact-head vitest spawn+rewards (or trust hosted gate after Ready).  
3. HoQA / product AC pass still pending for slice-2 as a whole.  
4. **Stays Draft — no Ready / no merge** until M1 closed + gates.

## Non-scope (do not conflate)
- #109 Saves B @ `98d2cbe` (m5Persist copy-draw) — separate.  
- Game restack / #111 onto 98d2cbe+dfaffa6 — separate review.  
- #104 F1 accepted / gates pending — not this PR.
