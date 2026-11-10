# AC-W1 BBv2 investigation

Verified SHA: `fbce499480568e4b0364a0ff0baa0543e4921d19` (`gen/bbv2`), 2026-11-05, Europe/Belgrade (CET).

**Verdict: expected faster flag-on re-baseline, not a D-CEO-20261019-06 pacing miss. Econ + HoQA sign-off remains required (BB-AC13); no baselines/assertions changed.**

The failure `expected 9 to be <= 5` is **absolute percentage-point deviation**, not late-seed count: `abs(100 - 91) = 9 pp`, exceeding the symmetric ±5 pp regression band [86%,96%]. It is an improvement of 18/200 seeds over the 900 s boundary, not a fall to 86.5%. At most 192/200 fits that old upper band; 200/200 is eight seeds above it.

| Config | Seeds | F10 ≤900 s | F10 ≤960 s | Median F10 (s; min) | Median F18 (s; min) | Design gate |
|---|---|---|---|---|---|---|
| off | 1–200 | 182/200 (91%) | 196/200 (98%) | 820; 13.666667 | 1500; 25 | PASS |
| off | 201–299 | 90/99 (90.909091%) | 96/99 (96.969697%) | 840; 14 | 1500; 25 | PASS |
| on | 1–200 | 200/200 (100%) | 200/200 (100%) | 620; 10.333333 | 1180; 19.666667 | PASS |
| on | 201–299 | 99/99 (100%) | 99/99 (100%) | 620; 10.333333 | 1200; 20 | PASS |
| parta | 1–200 | 200/200 (100%) | 200/200 (100%) | 640; 10.666667 | 1240; 20.666667 | PASS |
| parta | 201–299 | 99/99 (100%) | 99/99 (100%) | 640; 10.666667 | 1240; 20.666667 | PASS |

`on` = bestBuyV2=1, zeroGainUi=0 (decisive); `off` = both 0. `parta` = BBv2 ranking/ties enabled but planner income evaluated with legacy Q-E2-off collection (test-only mock). All other flags unchanged.

## Boundary crossings
No flag-on seed exceeds 900 s (worst F10 = 760 s in each cohort: 140 s below 900 and 200 s below the 960 s design limit). No seed crosses from passing to failing. Below are all flag-off >900 s seeds; all cross to passing with BBv2. Margins are F10 minus 900 s (negative = early). Full 299-seed F10/F18 evidence: `acw1-seeds.csv`.

| Seed | F10 off → on (s) | Margin off → on (s) |
|---|---|---|
| 6 | 980 → 680 | +80 → -220 |
| 11 | 940 → 700 | +40 → -200 |
| 17 | 940 → 600 | +40 → -300 |
| 28 | 1000 → 760 | +100 → -140 |
| 39 | 940 → 620 | +40 → -280 |
| 48 | 920 → 700 | +20 → -200 |
| 68 | 1020 → 680 | +120 → -220 |
| 71 | 960 → 660 | +60 → -240 |
| 81 | 940 → 700 | +40 → -200 |
| 106 | 980 → 760 | +80 → -140 |
| 115 | 960 → 720 | +60 → -180 |
| 129 | 920 → 660 | +20 → -240 |
| 134 | 920 → 580 | +20 → -320 |
| 140 | 920 → 560 | +20 → -340 |
| 146 | 920 → 640 | +20 → -260 |
| 172 | 920 → 760 | +20 → -140 |
| 173 | 920 → 680 | +20 → -220 |
| 183 | 920 → 500 | +20 → -400 |
| 231 | 940 → 620 | +40 → -280 |
| 240 | 940 → 740 | +40 → -160 |
| 242 | 920 → 640 | +20 → -260 |
| 250 | 980 → 680 | +80 → -220 |
| 251 | 1000 → 760 | +100 → -140 |
| 257 | 920 → 680 | +20 → -220 |
| 278 | 980 → 720 | +80 → -180 |
| 282 | 920 → 560 | +20 → -340 |
| 298 | 920 → 700 | +20 → -200 |

## Mechanism and scope
Part A alone already yields 100% at both thresholds in both cohorts, median F10 640 s and F18 1240 s. Thus Part A is sufficient to explain the 900 s percentage-band failure: the seller15 bot calls pickM4All → bestPaybackAmong; the flag filters zero-gain rows from ranking and resolves all-infinite-payback ties FARM-first rather than cheapest-first. This changes purchases and avoids zero-gain spending. Q-E2 then changes planner collect from 1.5×eggs/tap to eggs/tap / coop_hand.every_s after hiring; with Part A retained it further advances F10 median by 20 s and F18 by 60/40 s (cohorts 1–200/201–299). Live collection is unchanged. No Q-E2-only run was needed because neither design gate failed; do not infer an isolated Q-E2-only effect.

The old median regression bands also move faster: first-cohort F10 10⅓ min is below 13.67×0.8=10.936; F18 19⅔ min is below 25×0.8=20. The original test stops at its first assertion, so those comparisons are calculated from captured results, not additional reported assertion failures. This verdict is limited to the stated AC-W1 design gate, not approval of other final-RC pacing gates.

## Reproduction / evidence
Waited for lane-H full gates PID 727726 to complete (`DONE`, 20:42:53 CET). Ran sequentially via lane-run.sh H, checking uptime below 11 before each launch. Temporary harness dynamically imports the unchanged `tests/pacing-acw1.test.ts`, mutates only the in-process balance, and wraps runM2 to record reach times; original 7200 s simulations and assertions are unchanged. Commands: `ACW1_VARIANT=on|off|parta npx vitest run tests/acw1-investigation-probe.test.ts --minWorkers=1 --maxWorkers=2` (one invocation per variant).

Evidence retained here: `acw1-{on,off,parta}.{log,json,exit}`, `acw1-probe-template.ts` (copy to the temporary tests path to rerun). Off: 3/3 tests PASS; on and parta: 2 PASS/1 expected regression-band FAIL. Both design gates independently verified from all captured rows. Temporary harness removed from worktree; balance.json was never edited; no push, merge, commit or flag flip.
