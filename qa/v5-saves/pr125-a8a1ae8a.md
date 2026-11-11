# Saves QA: #125 prB traits (Present calm-gate, Away, Broody, present_*, away_bp), HARD exact-head bar @ a8a1ae8a (hoqa/pr125-bar)

TASK hoqa/pr125-bar: one HARD exact-head Saves QA bar on PR #125 at `a8a1ae8a224d69c6b9099f25351ecd6ed1d4361b`.
Date: 2026-11-10 01:26 – 01:40 CET (Europe/Belgrade). Write scope: `qa/v5-saves/pr125-a8a1ae8a.md`, evidence `qa/v5-saves/evidence/pr125-a8a1ae8a/`, scratch `qa/scratch/pr125-a8a1ae8a/` (HANDOFF.md). Nothing merged, pushed, or tagged. `m5-save-cases-DRAFT.md` not edited. One run per check, no re-runs, one hosted read.

## Recommendation: **FAIL**. Saves QA gives **no merge GO**.

Build, tsc, flag-0 goldens, events.ts scope, G2b 10/10, the family clamps and the reload/offline ring rules **PASS**. But the bar fails on **3 MAJOR and 3 MINOR** spec misses in row 32. The QA probes (`qa-pr125-probe.test.ts`, 6 of 13 fail at tip) reproduce each one:

- **F1 MAJOR:** the per-tick `fT` integer-ms share isn't built. Σ fT ≠ F, and BR-AC53's non-whole case gives 12.3 instead of 12.2.
- **F2 MAJOR:** BR-AC53's scripted session gives `present_active_s` **660.3** where the spec says **660.0**. The cause is the stamp/gate tick order.
- **F3 MAJOR:** `offline_grant.away_bp` reports the **post-grant** bp, not the bp that was applied. In the repro it reports 1875 while 1500 was applied.
- **F4 MINOR:** BR-R13 doesn't use the spec's float order. 10,941 of 19.4 M cases are off by ±1 egg.
- **F5 MINOR:** with breeds on, an `offline_grant` is emitted on every load, including gaps under 60 s (for example a 2 s reload).
- **F6 MINOR (blocked upstream):** BR-R14 Broody has no reader. rc/v5 has no Broody nest accrual, so the trait does nothing in game.

Hosted: ci and verify-smoke SUCCESS for both #125 and #126. **Pacing is in_progress for both** (#126's pacing is *not* SUCCESS, so Saves eng's claim didn't hold at the read), so item 7 is **OPEN**. The full vitest shows 0 failed, but the 134 `m41-9-ux-minors` teardown errors **recur** (EXIT=1). k10 is known red and wasn't read (not in the TASK run list).

## Identity (item 0) — **PASS** (evidence: identity.txt, pr-view.json)

- `git ls-remote` 01:26 CET: `refs/pull/125/head` = **a8a1ae8a224d69c6b9099f25351ecd6ed1d4361b**, **unchanged** from the TASK. `refs/pull/126/head` = d4b5fdcd. `rc/v5` = **d65391b0** (#111 merged). GitHub: open, not draft, base `rc/v5`, headRefOid = a8a1ae8a.
- Tip `a8a1ae8` "docs(status): breeds-sim-prB-traits #125 Ready @ e6bd1da" has a single parent, e6bd1da. Tree `6c87c327`.
- Ancestry: d4b5fdcd (#126) **YES**, baf410ff (#124) **YES**, 0bbcea52 (#120) **YES**, f20b9183 **YES**, **d65391b0 (current rc/v5, #111) NO**. #125 is stacked on #124 and is **not** merged-forward onto rc/v5 d65391b0. Before it merges, a merge-forward onto d65391b0 needs a fresh bar.
- #126 arrives via merge `f97be20` (b381998 + d4b5fdc). **The merge was NOT clean.** `git merge-tree` shows CONFLICTs in `engineering/status.md` and `src/config/breeds.ts`, both resolved by hand. I checked the resolution: `--cc` keeps all of #126's keys (`lay_cap_*`, `away_cap_bp`, `broody_cap_bp`) and adds `present_calm_w_s:10`, `present_calm_k:6`. `breeds-family.ts` and the family-caps test are byte-identical to d4b5fdcd. So #126's bar does **not** carry over by the clean-merge rule. The full bar was run anyway.
- Diff vs d4b5fdcd (#125's own delta): **13 files, +526/−10**, A/M only, no reverts. Files: `engineering/status.md`, `src/config/breeds.ts`, `src/game.ts`, `src/save/m5-fields.ts`, `src/sim/actions.ts`, `src/sim/breeds-traits.ts` (A), `src/sim/offline.ts`, `src/sim/state.ts`, `src/sim/timers.ts`, `src/telemetry/v5-fields.ts` (A), plus 3 new tests (`v5-breeds-present`, `v5-breeds-away-broody`, `v5-breeds-away-bp`).
- Diff vs f20b9183: 21 files, +850/−37. Diff vs rc/v5 d65391b0: 32 files, +866/−412 (the −412 is mostly #111 content not in this stack).
- `flags.ts`, `balance.json`, `engineering/golden/*` and `scripts/verify/golden.ts` are identical to d4b5fdcd.
- **tsc** `--noEmit` EXIT=0 (tsc.txt).
- **Build** `npm run build` EXIT=0. Embedded `check-release-build: m4.1+a8a1ae8 ok`. A separate `node scripts/check-release-build.mjs dist` EXIT=0. `dist/index.html` `data-build-id="m4.1+a8a1ae8"`, **no +dirty** (build.txt).
- Worktree `qa/scratch/pr125-a8a1ae8a/wt` (detached at tip). package-lock sha256 `56569550…` is identical to the donor (node_modules symlink chain → `qa/scratch/goldens-111-cf55d44/wt/node_modules`).

## Spec / gate identity (evidence: spec-identity.txt)

| file | sha1 | match |
|---|---|---|
| product/m5-gate-acs.md (gate e485f762) | e485f7624b9760a0b8a54b2472dd2b955b20077e | YES |
| product/m5.1-breeds-spec.md (PMC breeds spec rev 3.8.9) | ea922eb8574740f15c1998cf534689d1259c12a7 | YES |
| product/collection/drift-audit-rc-v5-f20b9183-20261110.md | e328cef1598c39cb9c62ae5af0c8664e8667a53c | YES |
| product/collection/telemetry-spec-errata-v5.md (rev 15) | 5e12a5918a092558a90db8f217a7fdbe2e5f090d | YES |
| qa/v5-saves/m5-save-cases-DRAFT.md (sha256) | 12fe292400eaf18b27d5010c86d7175fdd316a7b879cdcb5d8aa3d9e949f55a5 | YES (not edited) |

Drift-audit row 32 (L61) covers Traits Present / Away / Broody (BR-R12/12b/13/14) and `offline_grant.away_bp`, against breeds §4, §8 L697 and errata L132.

## Item 1: row 32, element by element vs breeds spec ea922eb8 (gate e485f762 Card #3 pins ea922eb8)

Line numbers are at tip a8a1ae8a. "Probe" means `qa-pr125-probe.test.ts` (evidence qa-probe.txt).

| # | element (spec cite) | result | sev | evidence |
|---|---|---|---|---|
| 1.1 | BR-R12 Present term: `prod × focusDt × presentBp/10000`, capped at coopCap, tick only, 4-arg `step()` → 0 Present (BR-AC2d/AC51) | **FAIL** (via F1) | MAJOR | `breeds-traits.ts:122` uses `focusS` (always 0.1 on a focus tick, `clock.ts:17`) instead of spec (5) `fT/1000`. A partial-focus frame is credited as a full 100 ms of Present eggs. Cap, tick-only and the 4-arg default are correct (`timers.ts:30`, `breeds-traits.ts:120-127`). |
| 1.2 | Settled-only plus family clamp (BR-AC4b, BR-AC18, E8, E9, §4.3 L365-368) | **PASS** | — | `breeds-family.ts` (unchanged from #126). `slotTraitBp` returns 0 while `settleMs>0` (`breeds-hatch.ts:84`). Probe P6 (settling → activeMs 0). family-caps 7/7. |
| 1.3 | BR-BB2 / BR-R12b(f): never a planner input | **PASS** | — | Present bp isn't read by `incomePerSec` (eng test `[BR-BB2]`). |
| 1.4 | BR-R12b(a): counted tap = credited tap. The detector runs with breeds on even when streak/tapCoins are off, and pays nothing | **PASS** | — | `actions.ts:80` → `breedsNoteCreditedTap` (`breeds-traits.ts:72-80`). Uses its own 1 s window when both are off. Probes P2a/b/d stamp via the breeds-only path. |
| 1.5 | BR-R12b(b): half-open window `focusMs − t < W×1000`, W=10, k=6, integer-ms ring ≥ k | **PASS** | — | `calmGateOpen` `breeds-traits.ts:43-50` (L48 strict `<`). Ring capacity = k = 6 (`:89`). bc keys `present_calm_w_s:10`, `present_calm_k:6`. |
| 1.6 | BR-R12b(b): per-tick `fT = min(100, F − given)`, Σ fT = F exactly (golden R5f) | **FAIL** (F1) | MAJOR | `breeds-traits.ts:106` sets `fT = Math.round(focusS×1000)`, which is always 100 because `tickFocusS` returns the full dt (`clock.ts:17`). Probe P1b: a frame with F=249 adds 300, so focusMs is **12,300** where the spec wants 12,249. |
| 1.7 | BR-R12b(b) tick order (0)-(5): stamp = this tick's focusMs after fT. Loss on the tap's own tick. Return on the first tick with count = k−1 (BR-AC46/47) | **FAIL** (F2) | MAJOR | The stamp uses the **pre-tick** `calm.focusMs` (`breeds-traits.ts:89`, called from `apply` between ticks). The gate is evaluated on the next tick (`:110-114`). So either the stamp is 100 ms early (gate reopens one tick early) or the loss lands one tick late. Probe P2a/P2b: BR-AC53 gives 660.3, not 660.0. |
| 1.8 | k = 0 disables the gate (BR-AC48) | **PASS** | — | `calmGateOpen` `:44`, eng test. Note: `bc()` ignores balance (`config/breeds.ts:35`), so k=0 can't be driven in-sim and there's no `validateBalance` W/k bound. Inherited CSV-TODO pattern from #126; INFO, not graded. |
| 1.9 | BR-R12b(c): hidden < 60 s / menus hold. A hide ≥ 60 s empties the ring (E22b: 59,999 keeps, 60,000 empties). Not saved / reload starts open (BR-AC50) | **PASS** | — | `offline.ts:35` → `breedsCalmClearRing` (`breeds-traits.ts:132`). Eng test `[E22b]`. `SESSION_ONLY_KEYS` + `breedsCalm` (`m5-fields.ts:36`). Probe P5: saves with 0 and 6 stamps are byte-identical, no `breedsCalm` key. |
| 1.10 | BR-R12b(e) / BR-AC51: deterministic. Flag-off: no ring, no detector | **PASS** | — | `breedsFlag` guards (`:27`, `:73`, `:101`). Eng flag-off test. Goldens byte-identical (item 4). |
| 1.11 | §8 `session_end.present_active_s` (0.1 s) / `present_lost_count` (int): required breeds-on, 0 with no Present, absent flag-off | **FAIL** (values: F1/F2) | MAJOR | Shape is PASS (`breeds-traits.ts:61-69`, `game.ts:321`; schema `S1`/`C`; probe P2c gives 0/0). Values are FAIL per items 2a and F2. |
| 1.12 | BR-R13 Away: `floor(min(min(away,cap) × rate × (10000+awayBp)/10000, maxEggs2h) × mult)` "in exactly that float order". Settled at leaving. Clamp 3000. ≥ 2 h unchanged (BR-AC17) | **FAIL** (F4) | MINOR | `offline.ts:15-16` computes `rate×(1e4+bp)/1e4` first, then multiplies by `min(away,cap)`. Probe P4a: **10,941 / 19,411,425** cases differ by ±1 egg (e.g. H0, mult 1, bp 2500, 2720 s: spec 1291, got 1292). Settled-at-leaving PASS (`offline.ts:29` uses the pre-gap `s`). Clamp PASS. Probe P4b: 3 h = flag-off cap 111,600, bp 3000. |
| 1.13 | BR-R14 Broody: `broodyBp_eff = floor(500 × (10000+broodyBreedBp)/10000)` drives R7 nest accrual (BR-AC14) | **FAIL** (F6) | MINOR, blocked upstream | The getter is correct (`breeds-traits.ts:38-40`; 550/600 tests). But **no reader**: no Broody nest accrual (R7 `num = refCents × broodyBp_eff × dtMs + msRem`) exists in `src/` (`rg broodyBpEff src` hits only its definition). The trait has no in-game effect, and BR-AC14's nest cap and guard can't be tested. Not fixable in #125 until the Broody nest lands; HoQA to rule on scope. |
| 1.14 | §8 L697 / errata L132 `offline_grant.away_bp` int ≥ 0 (0 if none), breeds-on, on every grant including eggs=0 | **FAIL** (F3, F5) | MAJOR | Presence PASS (item 2c). Value FAIL: F3. Over-emission: F5. |
| 1.15 | BR-R15: contexts exclusive | **PASS** | — | Present only in the focus tick (`timers.ts:30`). Away only in `m4OfflineEggs`. Broody not built. |

## Item 2: PMC rulings

| ruling | eng test | QA probe | result |
|---|---|---|---|
| (a) `present_active_s` rounds half-up on integer ms | `v5-breeds-present` "flag-off: absent; breeds-on: present_active_s 0.1 s half-up…" **injects** `activeMs` 12250/12249 directly. The sim can't produce those values. | P1a: `round(ms/100)/10` equals integer half-up for every ms 0..2,000,000 (**PASS**, 0 mismatches). P1b: through `advance()` with a last frame of F=249 the result is focusMs **12,300** and **12.3**, where the spec wants 12,249 → **12.2** (**FAIL**). | **FAIL (MAJOR, F1).** The rounding function is correct. But `activeMs` is always a multiple of 100 in the sim, so the x.5 boundary and BR-AC53's non-whole case can't be reached, and the AC's 12.2 outcome fails. The eng test never covers the sim path. |
| (b) `present_lost_count` counted correctly | `[BR-AC46]` lostCount = 1 | P2a/P2b BR-AC53 script: **3** (spec 3). P2d BR-AC47 steady 1/s 0..59 s: **1** (spec 1). P2c no Present: 0. | **PASS** (count). There is no eng test for the BR-AC53 script; the QA probe covers it. Its `present_active_s` result is F2. |
| (c) `away_bp` on EVERY `offline_grant`, incl. eggs=0 | `v5-breeds-away-bp` "grantOffline emits away_bp when breeds on even if eggs=0" (uses a gap < 60 s) | Emit sites: **one**, `game.ts:123` inside `grantOffline`, which is reached from load (`game.ts:110`) and the hidden ≥ budget restore (`game.ts:404`). No other `offline_grant` track in `src/`. P3a: a 3600 s gap with eggs = 0 (rate forced to 0) still emits `away_bp:1500`. | **PASS** (presence). Value and over-emission are separate FAILs: F3 and F5. |

## Findings (FAIL, with repro)

All repros: `cd qa/scratch/pr125-a8a1ae8a/wt && flock /workspace/egg-farm-studio/.vitest-eng.lock nice -n 10 npx vitest run --root ../probes --pool=forks --poolOptions.forks.singleFork=true` (probe source copied into evidence).

- **F1 MAJOR: fT integer-ms share missing (BR-R12b(b), BR-R12 (5), BR-AC53 non-whole, BR-AC46b sim).** In `breeds-traits.ts:106`, `fT = Math.round(focusS*1000)` and `focusS` is the full tick dt on every focus tick (`clock.ts:17`; `focusTicks` = ceil(F/100) ticks each get 100). Repro P1b: `advance()` with 12 frames of `{focusMs:1000}`, then one frame of 300 ms elapsed and `{focusMs:249}`. Result: `breedsCalm.focusMs = 12300`, `activeMs = 12300`, `present_active_s = 12.3`. Spec: 12,249 → **12.2**. Side effects: Present eggs are over-credited on partial frames (`:122` uses focusS). BR-AC46b's in-sim case (focusMs 10,950 / 11,030) can't happen. Fix direction: give each of the frame's ticks `min(100, F − given)` ms and use `fT/1000` for the Present term.
- **F2 MAJOR: stamp/gate tick order (BR-R12b(b) order (0)-(5), "Loss"/"Return", BR-AC47, BR-AC53).** A counted tap is stamped in `apply` with the pre-tick `calm.focusMs` (`breeds-traits.ts:89`). The gate is evaluated on the next `breedsPresentTick` (`:110-114`). Repro P2a and P2b run the BR-AC53 script: 300 s idle, 3 × 30 taps 1 s apart with 120 s gaps, end at 747 s, settled Leghorn, breeds-only detector. Both alignments give `present_active_s = 660.3`, `present_lost_count = 3`. Spec: **660.0** / 3. Each burst is closed 28.9 s instead of 29 s. Under the P2b alignment, BR-AC47 opens at focusMs 9,900 instead of 10,000.
- **F3 MAJOR: `offline_grant.away_bp` ≠ the bp applied to the grant.** `game.ts:120` reads `awayBp(this.state)` **after** `applyOffline` has changed the state. An offline hatch completion (`breedsOffline` → `revealHatch`) can star up a slotted Away breed. Repro P3b: settled Sussex 0★ slotted, incubator `{breed:'sussex', remainingMs:1000}`, `grantOffline(3_600_000)`. The grant uses 1500 bp (eggs 16,818 = `m4OfflineEggs(...,1500)` × milestone mult), but telemetry reports **`away_bp:1875`**. Fix direction: capture `awayBp(s)` before `applyOffline`, or return the applied bp from it.
- **F4 MINOR: BR-R13 float order.** `offline.ts:15-16` computes `rate' = rate×(1e4+bp)/1e4`, then `min(away,cap)×rate'`. The spec says "in exactly that float order: min(away,cap) × rate × (10000+awayBp)/10000". Repro P4a: 10,941 / 19,411,425 (H × mult × bp × away) cases are off by ±1 egg, e.g. `{H:0, mult:1, bp:2500, a:2720}` gives spec 1291 vs got 1292. With bp=0, goldens are unaffected (item 4).
- **F5 MINOR: `offline_grant` emitted on sub-60 s gaps with breeds on.** `game.ts:121` now emits whenever `away_bp` is defined. `grantOffline` is called on **every** load with `now − savedAt` (`game.ts:110`). Repro P3c: `grantOffline(2000)` emits `{secondsAway:2, eggs:0, away_bp:0}`. With breeds on, every quick reload therefore logs an offline grant, even though offline needs ≥ `offlineMinSeconds` = 60 s (BR-R18). The eng test `grantOffline emits away_bp … eggs=0` encodes this with a 59.999 s gap. If PMC's "every offline_grant incl. eggs=0" was meant to cover sub-60 s loads, HoQA/PMC can overrule. As written, it inflates `offline_grant` counts.
- **F6 MINOR (blocked upstream): BR-R14 not wired.** `broodyBpEff` has no caller in `src/`, and no Broody nest accrual exists on this tree. Repro: `rg -n "broodyBpEff|broodyBreedBp" src` gives definitions only (`breeds-traits.ts:34-40`). Row 32's Broody element is still NOT-WIRED.

## Item 3: full local vitest — **PASS on assertions; process EXIT=1**

`flock .vitest-eng.lock nice -n 10 npx vitest run --pool=forks --poolOptions.forks.singleFork=true` (1 worker), ~221 s:
**159 files passed; 2319 passed | 1 skipped | 0 failed (2320); 134 errors; EXIT=1** (vitest-full.txt).
All 134 errors are "originated in tests/m41-9-ux-minors.test.ts" (uncaught `TypeError: Cannot set properties of null (setting 'hidden')`, UI teardown). **The #126 teardown errors recur at the same count (134).** Not in #125's delta. No re-run (usage cap).
Focused row-32 + G2b suites (family-caps, present, away-broody, away-bp, v5-breeds-state, telemetry-schema): **6 files, 132 passed**, EXIT=0 (vitest-traits-and-d1d6.txt).

## Item 4: flag-0 goldens — **PASS**

GOLDEN1 recomputed at tip with `scripts/verify/golden.ts` `goldens(shipped)` (golden-recompute.txt):
- flagOff **f90d1678c260e1b64c8d1de2afcdaf7608186f37d13ef51970d053b45d349544** pass=true
- m4On **a54c9cf9d6a4c967ef8fc9d2cb741ba2deab042b8cad5097b38d5c192339fda5** pass=true

The `engineering/golden` suites passed inside the full vitest. `m4a-flag-off` + `zg-flagoff-dom` focused: 3/3, EXIT=0. flags.ts and balance.json are identical to d4b5fdcd.

## Item 5: events.ts scope — **PASS**

`src/sim/events.ts`, `src/telemetry/schema.ts` and `src/telemetry/telemetry.ts` are **unchanged** vs d4b5fdcd. Against f20b9183 the only events.ts change is #124's `save_migrated` line. #125's telemetry changes are only:
- `game.ts:120-123`: `offline_grant` + `away_bp`
- `game.ts:321`: `session_end` + `present_active_s` / `present_lost_count`
- the new builder `telemetry/v5-fields.ts`

`schema.ts` already allowlisted all three (`:92`, `:106`). No other telemetry field was added or changed.

## Item 6: G2b 10/10 — **PASS**

M5S-BR-D1-TEL-VALIDATE, D2-ROOT-NULL/-ARRAY/-NUMBER/-STRING/-TICK-NOTHROW, D3-SHAPE-REPAIRS, D4-LOCKED-NORAW, D5-TICKHZ-MOD and D6-RARITY-ENUM all PASS at tip. Test names are in `v5-breeds-state.test.ts:186-264` and `telemetry-schema.test.ts:408`. Suites: v5-breeds-state 53/53, telemetry-schema 51/51.

## Item 7: hosted, one-shot 01:32:58 CET — **OPEN** (hosted-oneshot.txt)

| PR | workflow | run | head | status | conclusion |
|---|---|---|---|---|---|
| #125 | ci | 42726519056 | a8a1ae8a | completed | **success** |
| #125 | pacing-x1-stack | 42726519416 | a8a1ae8a | **in_progress** (optimal / casual / seller15 shards all in_progress; no aggregate yet) | — **OPEN** |
| #125 | verify-smoke | 42726518993 | a8a1ae8a | completed | **success** |
| #126 | ci | 42726279282 | d4b5fdcd | completed | **success** (confirmed) |
| #126 | pacing-x1-stack | 42726279381 | d4b5fdcd | **in_progress** (all 3 shards in_progress) | — **OPEN; NOT SUCCESS as Saves eng reported** |
| #126 | verify-smoke | 42726278976 | d4b5fdcd | completed | **success** (confirmed) |

No second read (usage cap).

## Not run / limits

- No browser serve (ports unused). The UI parts of row 32 (BR-R12c chip, BR-AC52/52b/52c) are outside this Saves bar.
- Not probed: the R3 non-counted taps (menu, golden egg, ready Broody Hen, chip, synthetic) at the Game/UI layer. BR-AC15/16 exact egg counts. BR-AC49 menu/docked/Pause cases (hold holds by construction because fT=0). BR-AC48 Economy-harness legs.
- k10 not read (not in the TASK run list; known red, non-blocking).
- One probe run only (13 probes; 6 FAIL as listed, 7 PASS). No re-runs.
- The tip doesn't contain rc/v5 d65391b0 (#111). A merge-forward will need a new bar.
