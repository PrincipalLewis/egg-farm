# QA review: streak/tapCoins spec v1.3.3 + live-plan rewrite — PASS-WITH-NOTES (PENDING-NUM)
2026-11-05 20:33 CET. Reviewer: Head of QA. Decision id **QA-D-1105-STREAK133**. Follows QA-D-1105-AC7CSV (single-token 0.28→0.27 correctly refused).

## Inputs verified
| file | claimed | measured |
|---|---|---|
| `product/collection/m5-streak-tap-coins-spec.md` v1.3.3 | sha1 `b315dea1…3627` | **match** `b315dea1a900432433fce7b6c05d3672ed453627` |
| `product/collection/m5-streak-tap-coins-spec.acb4cdbb.md` v1.3.2 | sha1 `acb4cdbb…5c4e` | **match** `acb4cdbba293db639a409d1c197589b97b1a5c4e` |
| Live plan pre-edit | sha1 `5bfc664b` | **match** `5bfc664b803caf92422a15e854e29e275ab1f6a6` (ST-AC21 at L71) |

## Spec diff v1.3.2 → v1.3.3
- 33 hunks; every changed line is cap / tier / derived-number / status / history wording for the **0.27 breeds-on** erratum (D-HOP-2026-10-30-27 / -31).
- **§9.1 layout table:** byte-identical (sha256 of section `cf37aca3ddf12934…` both sides). No build/CSV edits in the errata (confirmed: no CSV paths or column lists added beyond the existing tunables table value change).
- ST-AC11 0.40 config test **kept**.
- ST-AC23: scratch G3 at 0.28 (P95 1.77) retained as **history only**; model gate required at 0.27.
- Frozen predecessor v1.3.2 left on disk unchanged.

## Independent arithmetic (matches claimed v1.3.3)
| quantity | formula | result | claimed |
|---|---|---|---|
| T1..T4 | `round(cap×k/4, 2)` at cap 0.27 | **0.07 / 0.14 / 0.20 / 0.27** | same (T3 raw 0.2025 → 0.20 half-even) |
| taps to cap | 0.27 / 0.01 | **27** | 27 |
| hold+decay | 3 + 0.27/0.03 | **12.0 s** | 12.0 |
| peak | (1+0.27)×2 | **2.54×** | 2.54 |
| ST-AC21 fill | 0.187/0.27 × 100 | **69.259…% → 69.26%** | 69.26% |
| MAX label | floor(0.27×100) | **+27%** | MAX +27% |
| ST-AC10 | T3=0.20, hysteresis < T2 | oscillate **0.19/0.20**, reset **<0.14** | same |
| ST-AC11 | unchanged | 0.40 / 0.10…0.40 / MAX +40% | kept |

Old-at-0.28 cross-check: tiers 0.07/0.14/0.21/0.28; fill 66.79%≈66.8%; hold+decay 12.33 s; peak 2.56× — all removed from live oracles.

## Live plan rewrite
- Bak: `qa/m5/test-plan-streak-tap-coins.md.bak-5bfc664b` (sha1 `5bfc664b…`).
- New plan: `qa/m5/test-plan-streak-tap-coins.md`
  - sha1 `faebfbb33fb79cdba5f8de905b20a1fcf4537936`
  - sha256 `e9f93f88391dac8e6455b13774b350ece4e4081ab6c4dcdcfe814a41cfd09360`
- Header re-pinned to spec **v1.3.3 b315dea1**; v1.3.2 predecessor named; **FINAL NUMERIC VERIFICATION PENDING** against Economy's B4-passing CSV (does not exist yet).
- Every rewritten oracle tagged `[PENDING-NUM: Econ B4-passing CSV @ tc_streak_cap 0.27; QA-D-1105-STREAK133]` — **not verified**.

### Rows / bullets changed (coordinated)
| location | change |
|---|---|
| Header / Testable now? | re-pin v1.3.3; PENDING-NUM policy |
| Economy lane | model gate at 0.27; B4 CSV PENDING |
| §1 Build / Decay / Sale | cap 0.27, 27 taps, tiers 0.07/0.14/0.20/0.27, 12.0 s, 2.54× |
| ST-AC4 | 28→**27** s / taps; s=0.27; empty_credited=27 |
| ST-AC5 | 12.33→**12.0**; peak value 0.27 |
| ST-AC7 | x∈{…,**0.27**}; 2.54× note |
| ST-AC9 | 0→0.27; pops **0.07/0.14/0.20/0.27** |
| ST-AC10 | **0.19↔0.20**; reset <0.14; re-cross 0.20 |
| ST-AC11 | **unchanged** (0.40) |
| ST-AC12a / 12 / 13 | s=0.27 freeze cases |
| ST-AC16b / 16d(d) | s=0.27 |
| ST-AC17 | tier glow at s=0.27 |
| ST-AC21 | fill **69.26%**; MAX **+27%**; cap s=0.27 |
| ST-AC22 | s ≤ 0.27 |
| ST-AC23 | model gate at 0.27; scratch 0.28 history only |
| ST-AC28 | run at **0.27 and 0.40** |
| Edges: Offline, Long frame, Reload mid-state (0.21→**0.19**), Streak vs Pause | s=0.27 |
| §4 Cap sensitivity | 0.27 and 0.40 |
| ST-5 gap | reopened as PENDING-NUM |
| Change log | v0.9 entry |

Grep after rewrite: no operational leftovers of `66.8`, `+28%`, `12.33`, `2.56`, `0.07/0.14/0.21`, or bare ship-set `0.28` (remaining `0.28` mentions are breeds-off / history / changelog only).

## Verdict
**PASS-WITH-NOTES** on spec v1.3.3 (tuning-only erratum accepted; arithmetic checks out; §9.1 untouched).  
**Live plan rewritten and pinned** to v1.3.3 under QA-D-1105-STREAK133.  
**NOTE (blocking for verification, not for the rewrite):** all `[PENDING-NUM]` rows stay **unverified** until Economy lands the B4-passing CSV at `tc_streak_cap` 0.27 and HoQA re-checks the numbers. ST-AC23 does **not** inherit the historical 0.28 scratch pass.
