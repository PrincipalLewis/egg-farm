# #108 golden spawn → #107 tip: Architect ruling on the merge-forward conflict (order + save union)

- Date: 2026-11-06 ~02:05 CET (Europe/Belgrade).
- Lane: architect.
- Writes: only this note, the evidence dir and status.md. No feature WT mutation, commit, push, PR post, Ready, merge or message.
- **Architecture advice, not publication authority.**

## Bound identity (NOTE only; no proposal patch exists)
| Binding | Value |
|---|---|
| PR head (unchanged; merge aborted) | 811c7da251ee276f5962557cb90c2871922a7168 (= origin/feat/v5-golden-spawn) |
| Attempted parent (#107 tip) | 27660196a081f379f467499d667fbe4f5ef3bda3 (= origin/feat/v5-golden-rewards) |
| Merge-base | a6d44c250b043250b56885e289fd4210270ad988 |
| NOTE.md (both copies identical) | sha256 09a382fa65130dfe03b6f27ee5c314d36bcc4fa84d7bda9d274bde8d75418a53 |
| Architect reconstruction of the NOTE's text, in an isolated WT (/workspace/wt-arch-review108-mfwd, merge --no-commit) | tree **36a14831871dfd240661c08152056dbd54e60fac** |

- `git merge-tree` conflicts in exactly two files: src/sim/timers.ts and src/save/m5-fields.ts.
- The ruling binds to the **content below**. It does not bind to any tree Features later pushes.
- If Features' committed merge tree ≠ 36a14831…, an exact-head recheck of those two files is required.

## Verdict: **APPROVE**, with the order as proposed in the NOTE
### Approved timers.ts content
- `import { frenzyTick, goldenTick } from './golden'` and `import { abilitiesTick } from './abilities'`.
- `frenzy = (s,_dt,f,b,_c,ev) => frenzyTick(s,f,b,ev)`. This **must** be #108's ev-passing form. #107's `frenzyTick(s,f,b)` would silently drop `frenzy_ended`; the probe saw 4,772 fires.
- `golden = … goldenTick(s,f,b,ev)` and `abilities = … abilitiesTick(s,f,b,ev)`.
- **`TIMER_SYSTEMS = [seedEvRng, streak, breeds, incomeRef, frenzy, golden, abilities]`**

### Why this order (traced, not assumed)
**Write and read sets in one tick** (the step body runs before stepTimers, tick.ts L57, so sales and lays use pre-timer state):

| System | Reads | Writes / emits |
|---|---|---|
| frenzyTick | frenzyRemainingS, frenzyRun | frenzyRemainingS, frenzyRun; `frenzy_ended` |
| goldenTick | goldenEgg, nextSpawnRemainingS, goldenPending, farmLevel, evRngState | goldenEgg, nextSpawnRemainingS, goldenPending, evRngState (one `drawGap` only on timeout resolve); `collectible_expired{timeout}` |
| abilitiesTick | abilities, workers (mood, isPaused) | abilities; `ability_ended` |

- **Shared state:** none of the three writes anything another reads.
- **Clock:** all three use the same focusS.
- **RNG:** only golden draws (evRng, after seedEvRng). Abilities and frenzy use no RNG, and state.rng is never touched.
- **Expiry:** each system's expiry depends only on its own fields.

**Probe** (20,000 random same-tick states with golden, abilities, streak, tapCoins and pause on; near-expiry frenzy, egg, calls, spawn countdowns, asleep/unpaid workers, focus on/off; 5,934 with ≥2 systems firing):
- Final state is identical for all 4 orders tried (NOTE, abilities-before-golden, golden-first, abilities-first): **stateDiff 0**.
- The multiset of events is identical: **multisetDiff 0**.
- **Only the order of events within one tick differs:**
  - Q (abilities before golden): 3,108 of 20,000
  - R (golden first): 1,386
  - S (abilities first): 5,662

So correctness does not pick the order. Convention and minimum churn do, and the NOTE order wins on all three counts:
1. **Abilities stays last.** This is the #112 contract (abilities PR body: "abilitiesTick … last in TIMER_SYSTEMS"), the #107 merge ruling (golden-rewards-conflict-19121b7) and the HoE lean.
2. **#108's tested `frenzy → golden` adjacency is kept** (golden #1 systems contiguous, matching the R23 then R1–R3/R15/R18 doc order).
3. **Same-tick event sequence vs the #107 base is append-only.** On a tick where both fire, `collectible_expired` now comes before `ability_ended`. Note that m5Offline emits the opposite order (endCalls, then goldenUnload). The two are separate paths and neither contract specifies cross-system event order, so this is acceptable. No consumer or test depends on that sequence, and the focused suites are green.

- **Alternative Q is also state-correct, but not chosen:** it splits the golden pair and makes abilities no longer last.
- **Any future system that reads another's state** (for example abilities reacting to Frenzy, or golden spawn gating on calls) needs a new Architect order ruling.

### Approved m5-fields.ts content
- **Kept from #108:** `m5Persist(s, b?)` (Architect B).
- **Kept from #107:** the `endCalls` JSDoc (D-HOE-41 / abilities v1.3.12 granted-seconds wording) and its body (durS, combo cap, clamp).
- **Removed:** #108's stale one-line endCalls JSDoc.
- **#108 patch preserved:** the line-diff of #108's patch (a6d44c2→811c7da) equals the reconstructed merge vs the #107 tip for **all 14 #108 files except timers.ts**, including m5-fields.ts. timers.ts differs only by the abilities union. Nothing from either side was lost.

## Save union: contracts traced on the reconstructed tree (probe-save-union.json)
Input: egg on screen, goldenPending, frenzyRun, frenzyRemainingS 12, hawker {activeS 7, durS 20}, grader {activeS 3}.

**`m5Persist(s, B)`:**
- The golden egg is never persisted: goldenEgg, goldenPending and frenzyRun are absent.
- **Gap and RNG are drawn atomically on the copy:** nextSpawnRemainingS equals the one-draw gap, and evRngState equals one nextRand.
- frenzyRemainingS is kept. abilities is kept verbatim, including durS.
- The live input is unchanged. Two calls produce bit-identical output (T1, T2).

**Other save paths:**
- **Load of that save:** the gap and rng are the copy's. There is no egg and no second draw. `ability_ended{offline}` effect_s is hawker 13 (= durS 20 − 7) and grader 27 (= tc_ability_s − 3). activeS and durS are cleared and readyAt is kept (D-HOE-41).
- **No egg:** persist does not draw (T3).
- **Golden flag off:** strip only, with no draw.
- **m5Offline:**
  - ends calls first, then `collectible_expired{offline}` with one draw
  - a subsequent persist does **not** draw again (compose invariant: at most one drawGap per resolution)
  - the input is unchanged

**Autosave vs live unload:**
- **Autosave with an egg on screen:** B alone draws on the persist copy, and the live egg and rng stay put. This is correct.
- **Live `goldenUnload` before save (contract A):**
  - The helper exists in golden.ts and m5Offline uses it.
  - `Game.endSession` on this tree does **not** call it yet. This is inherited from 811c7da, not introduced by the conflict, and stays the existing Features/Saves item from the 21:29 addendum.
  - Until A lands, a reload after pagehide with an egg emits no `collectible_expired{reload}`. Persisted state is still correct via B.

## Verification (Node v20.19.2, lane-run architect, flock, nice 10, 1 worker; isolated WT at tree 36a14831…)
- `tsc --noEmit`: **0**.
- Focused vitest, run 1, 17 real suites: **254/254 pass**. The suites:
  - v5-golden-spawn, golden-rewards, golden-m5persist, abilities-sim
  - f1a, f1b-clock-rng, f1b-focus-wiring, f1c-effects
  - f2-m5-fields, f2-roundtrip, f2-downgrade, f2-game-settle
  - m5load-pause-sanitize, income-ref, bot-m5
  - flagoff golden (GOLDEN1 f90d1678… matches), m4on golden
- Run 1's only failure was a bug in the Architect probe itself (a destructuring index). It was fixed, and run 2 passed **2/2** at the same tree.
- Not run: full suite, build/build:html, hosted CI.

## Limits / next
1. Features must commit exactly this content.
   - If the tree ≠ 36a14831…, recheck timers.ts and m5-fields.ts at the exact head.
   - Then hosted gate + HoQA at the exact head (full vitest + build). Publication, Ready and merge are HoE process.
2. #111 and the Features hold remain HoE's call. This ruling unblocks only the order and the save-union content.
3. Contract A (`endSession` → live `goldenUnload('reload')` → save) is still open and separate.
