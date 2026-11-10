# v5 schedule of record (restart) — HoP
Thu 5 Nov 2026 20:26 CET (UTC+1) · Head of Product · under D-CEO-20261105-01 (resume), D-CEO-20261105-02 (prior operative scenario), D-CEO-20261105-03 (all lanes resumed) and D-CEO-20261030-09/-10 (one release, no cuts, one full QA gate). Decisions: **D-HOP-2026-11-05-01**, revised by **D-CEO-20261105-02/-03** and **D-HOP-2026-11-05-04**. Supersedes the Oct 30 schedule (pre-edit sha256 c9cc560b…; D-HOP-45/54).

## 0. Why this rewrite
- Studio STOP D-CEO-20261030-13 ran Fri 30 Oct 15:10 → Thu 5 Nov 20:10 CET. The prior freeze (Thu 5 Nov 05:00) and every Oct 30 calendar date are stale.
- Resume clock: **Thu 5 Nov 20:10 CET**. Next usage reset: Thu 12 Nov 17:53 CET.
- Build evidence (disk, not memory): `engineering/v5-rc-manifest.md` tip **rc/v5 518de304** (#98 K10 KNOWN-RED). Most M5 pieces remain `flag-only` / `not started` (golden, tapCoins, abilities, broody, refill, clockWage, pause, salesStopped, fatigueCue, breeds UI). Landed before STOP and still valid: #83 p2, #92 CSV a8c4e268, #93 X1 CI, #94 bot-m5, #95/#96 breeds sim, #97 zeroGainUi (flag 0; flip held on SIM-only flag-list), open **#99** (c4a1a76f) and **#100** (d654afda BBv2 flag 0).
- Method: scenario **(iii)** is operative under D-CEO-20261105-03. HoE confirmed Features + Generalist capacity on Thu 5 Nov 20:24 CET; Features evidence ETA is Fri 6 Nov 03:00. Scenario (i) remains the fallback if confirmed capacity changes. Shift the documented hour-deltas from the Fri 30 Oct 15:00 start onto the resume clock (exact: (iii) likely freeze was S0+5d14h). Critical path stays lane U, so #97/#100 progress on lane H does not shorten freeze unless HoE reports otherwise. QA estimate **v4** sha256 **147f273a…** (18.5 / 30 / 42.5 h likely; high 19 / 30.5 / 44 h) replaces v3.
- **HoE must confirm** remaining lane-A/U/S/H hours by **Fri 6 Nov 08:00 CET**. If remaining load is >8 h above the prior (iii) totals, freeze and every later column slip by the same amount (no cuts).

## 1. Rules used (unchanged)
- 24/7 lanes, 3 dd per calendar day, +15% review/integration buffer (HoE draft 805be727 assumptions).
- Code freeze = last build-complete + final serial pin. QA handoff = freeze + 4 h (RC build + smoke + flags-0 / pre-M5 reference golden pin, D-HOP-29).
- Full QA gate runs **once**, on the complete RC: **~18.5 h best / ~30 h one fix + targeted re-gate / ~42.5 h full re-run** (HoQA v4 147f273a; high bound 19 / 30.5 / 44 h).
- Authoring-change cut-off = freeze − 24 h.
- Nothing in v5 is cut (D-CEO-10 / D-CEO-20261105-01). A failed row is fixed and re-gated; the schedule moves. A second gate failure is reported to the CEO as a slip.

## 0. RE-BASELINE D-HOP-2026-11-09-03 (Mon 9 Nov 23:55 CET) — supersedes §2 dates for scenario (iii)
Inputs: HoE estimate (23:51), HoQA estimate (23:50). Critical path = accepted final combined CSV (R04 certified FAIL PL-AC1/2), not Eng/QA capacity.
- Eng merge train (#111→#117→#116→#100 + order-chip a11y slot): code-complete ~Tue 10 Nov 12:00 (contingency +1 d).
- **Economy gate (new):** passing repair candidate OR feasibility verdict by **Tue 10 Nov 22:00**; then HoP content approval → HoQA TS gate → HoE sha → CEO go (per D-CEO-20261109-02; CEO cites Vadim's 2026-10-24 delegation); CSV PR review+pacing ~3 h.
- **Freeze / RC tip: Wed 11 Nov 10:00 (unchanged target)** — valid only if the accepted CSV PR is merged by Wed 11 Nov 07:00 and K10/B4 green. Earliest possible: Tue 10 Nov 18:00 if the CSV lands by 15:00.
- **QA handoff:** at RC tip (Wed 11 Nov 10:00). **Verdict:** Wed 11 Nov 18:00 best / Thu 12 Nov 18:00 with one full re-run (~8 h QA gate).
- If Econ reports infeasible or misses 22:00 Tue: immediate CEO escalation; freeze moves day-for-day with the CSV. No cuts, no waivers.

## 2. Dates per scenario (CET) — rebased from resume Thu 5 Nov 20:10
| | (i) 3 lanes (A, U, S) = fallback | (ii) + Features = fallback | **(iii) + Features + hire = OPERATIVE** |
|---|---|---|---|
| Code freeze (likely; low / high) | **Fri 13 Nov 22:00** (Thu 12 Nov 16:00 / Sun 15 Nov 04:00) | **Thu 12 Nov 05:00** (Wed 11 Nov 13:00 / Thu 12 Nov 20:00) | **Wed 11 Nov 10:00** (Tue 10 Nov 23:00 / Wed 11 Nov 21:00) |
| Authoring-change cut-off (freeze − 24 h, likely) | Thu 12 Nov 22:00 | Wed 11 Nov 05:00 | **Tue 10 Nov 10:00** |
| QA handoff (freeze + 4 h) | **Sat 14 Nov 02:00** | **Thu 12 Nov 09:00** | **Wed 11 Nov 14:00** |
| Release verdict: best / one fix / full re-run (QA v4 147f273a) | Sat 14 Nov 20:30 / Sun 15 Nov 08:00 / Sun 15 Nov 20:30 | Fri 13 Nov 03:30 / Fri 13 Nov 15:00 / Sat 14 Nov 03:30 | **Thu 12 Nov 08:30 / Thu 12 Nov 20:00 / Fri 13 Nov 08:30** |
| Critical path | lane A (serial sims → rc2Refill → autoRefill → clockWage) | lane A, U ~3 h behind | lane U (streak → golden → breeds → pause → broody UI → #5b + fatigueCue) |
| Needs | nothing new | Features running under D-CEO-20261105-03 | (ii) + hire already on roster as Generalist 5a6a207d (D-CEO-11) |

Deltas vs Fri 30 Oct 15:00 start (reused exactly): (iii) 5d14h / 5d3h / 6d1h; (ii) 6d9h / 5d17h / 7d0h; (i) 8d2h / 6d20h / 9d8h. Rounded to the hour. Verdict ranges sit on the likely freeze; high freeze adds the same offsets as before (+30 h (i), +15 h (ii), +11 h (iii)).

## 3. RC pacing-gate prerequisites (model inputs in repo by freeze)
| # | Prerequisite | Owner | Date (CET, restarted) |
|---|---|---|---|
| a | Econ tc_* / streak-cap (0.27) / tapCoins model (X1COV part 1) + combined CSV for Engineering | Econ → HoP approves PR | scratch **Fri 6 Nov 17:00**, land + review ~+2–6 h |
| b | Econ broody model (X1COV part 2) | Econ | **Sat 7 Nov 23:00**; lands **Sun 8 Nov ~01:00** earliest |
| c | Lane-A item 1: bot driving real src mechanics + per-flag O-3 guard + flags-on X1 rows | HoE / Architect (Features if loaded) | likely **Fri 6 Nov 11:00**, high **Fri 6 Nov 19:00** (HoE to confirm) |
| d | B4 / K10 green on D-HOP-52 bar (red at cut blocks cut, D-HOP-53) | Econ + Architect | before freeze; first retune target **Fri 6 Nov 18:00** |
| e | BBv2 flip + AC13 re-baselines (probe on #100: m4on golden a54c9cf9→4af31e48; bot-m5 hashes; zg-flagoff DOM→6757f235; L10 7.5 min; **acw1 9 seeds over, ≤5 allowed**; m2b AC-W6 0; p4 Manage +0.75) | Econ + HoQA sign-off; HoE merges #100 after Architect + SIM-only flag-list | numbers with harness **Sat 7 Nov 18:00**; merge likely **Fri 6 Nov 20:00** / high **Sat 7 Nov 12:00** (bundle already at d654afda) |

**Earliest possible freeze** ≈ later of (b) land and (c) = **Sun 8 Nov ~01:00**. Scenario (iii) likely freeze Wed 11 Nov 10:00 clears that by ≥3 days. Risk: Economy verified that no final post-L10 + bc_* + cap-0.27 CSV exists and the current candidate fails D-HOP-52 B4. The combined CSV cannot proceed until a passing candidate exists; then HoP approval → QA TS gate → HoE integration. Local a7dd71b is rebased and in QA TS-gate review; no push or history replacement has occurred. A late result slips the schedule, never cuts scope. No RC is cut on a8c4e268 alone (D-HOP-46).

## 4. Product / Econ / Art items before freeze (restarted dates)
### Product (HoP / PMs)
- Ship-set of record: `product/v5-ship-set.md` sha256 **b726201f…** (BBv2 spec cite corrected to v1.0.4; values unchanged) (bestBuyV2 = 1 required; zeroGain.confirm = 0; tc_streak_cap = 0.27).
- Streak errata v1.3.3 (cap 0.27): PMC, **Fri 6 Nov 20:00**.
- GLD-AC2: Econ re-posts golden model **Fri 6 Nov 18:00**; HoP approves by **Fri 6 Nov 20:00**; PMC errata by **Fri 6 Nov 21:00**. (Oct 30 model/approval never closed before STOP — treat as open, not assumed done.)
- Post-L10 candidate + Card #4 line: Econ candidate **Fri 6 Nov 18:00**; HoP review same evening; CSV PR target **Sat 7 Nov 12:00** (high 22:00).
- BBv2 paper is gate-ready (spec v1.0.4 4ea3841a, Card #12). Pin live gate-acs + manifest to v1.0.4; numbers after Econ CSV. PMFU HANDOFF paper items are complete.
- Telemetry errata rev 13 **a0e8f6d7** PASS (TELERR7): waiting HoE re-pin + Saves schema.ts merge (restart target **Fri 6 Nov 12:00**).
- Shift-sheet Boost + refill→Boost combo stay in v5 (D-HOP-35/39/42); Econ models combo tunables **Sat 7 Nov 12:00**.
- Flags-0 and pre-M5 reference configs still run inside the handoff window (D-HOP-29).

### Economy (Econ)
- Flag-on bot policies: **Fri 6 Nov 08:00**.
- B4 retune on D-HOP-52 bar: **Fri 6 Nov 18:00**.
- Combined CSV PR (post-L10, breeds bc_*, cap 0.27, tc_combo_*): **target Sat 7 Nov 12:00, now at risk**; Economy must first produce a B4-passing candidate. HoP approval → QA TS gate → HoE integration; no PR has been opened.
- All-flags-on harness config: **Sun 8 Nov 18:00**, validated only for features already merged; freeze ≥ 6 h after last merge.
- BBv2 AC13 re-baseline package with the Sat/Sun harness.

### Art (HoA&UX)
- Refill flows / Fatigue UX / Abilities flows: still SIGNED (43828d0b / ffb13c19 / 3d238b6b). No re-sign required unless UI rects conflict.
- Icons and #5 pause gap 5: **Sat 7 Nov 12:00**.
- Final-RC screenshot window: 4 h after UI QA posts, inside the QA gate.

## 5. Stale approvals / blockers — resolved vs still open
### Cleared by current artifacts (do not re-ask)
1. Features restart → **cleared** (D-CEO-20261105-03). HoE confirmed Features + Generalist capacity Thu 5 Nov 20:24 CET; fallback (i) applies only if that capacity changes.
2. Hire approval → **cleared** (D-CEO-20261030-11; Generalist 5a6a207d on roster, already shipped #97/#100 work).
3. BBv2 in/out of v5 → **cleared** (D-CEO-11 / D-HOP-47/-51; ship-set bestBuyV2 = 1).
4. Separate Vadim go on Econ CSV / a7dd71b / X1COV as a studio-wide hold → **cleared as a Vadim blocker** (CEO focus 20:15). They proceed on the normal review path; HoP still approves the CSV PR content.

### Still open (owners / new caps)
| ID | Item | Owner | Cap (CET) |
|---|---|---|---|
| O1 | GLD-AC2 numbers (Econ model → HoP → PMC errata) | Econ → HoP → PMC | Fri 6 Nov 18:00 / 20:00 / 21:00 |
| O2 | B4-passing final CSV, then combined PR content approval | Econ → HoP → HoQA → HoE | Sat 7 Nov 12:00 target AT RISK; new ETA from Econ |
| O3 | BBv2 AC13 / acw1 pacing re-baseline sign-off | Econ + HoQA | Sat 7 Nov 18:00 harness |
| O4 | K10 green on D-HOP-52 before RC cut | Econ + Architect | before freeze |
| O5 | HoE remaining-load confirm (lanes A/U/S/H) | HoE | Fri 6 Nov 08:00 |
| O6 | Architect reviews #99/#100 + SIM-only flag-list (unblocks flips) | HoE / Architect | Fri 6 Nov 12:00 |
| O7 | Telemetry rev 13 re-pin + schema.ts | HoE + Saves | Fri 6 Nov 12:00 |
| O8 | Art icons / pause gap 5 | Art | Sat 7 Nov 12:00 |

## 6. Recommendation / critical-path ETA
**Operative schedule = scenario (iii), under D-CEO-20261105-03 and HoE capacity confirmation at 20:24 CET.**
- **Code freeze:** Wed 11 Nov 10:00 CET (low Tue 10 Nov 23:00 / high Wed 11 Nov 21:00)
- **QA handoff:** Wed 11 Nov 14:00 CET
- **Critical-path ETA (release verdict):** **Thu 12 Nov 08:30** best · **Thu 12 Nov 20:00** with one fix · **Fri 13 Nov 08:30** full re-run (QA v4 147f273a)
- Scenario (i) is the fallback if Features/Generalist capacity becomes unavailable. HoE is still checking remaining-load hours and may refine the build/freeze ETA.
- All dates remain provisional on the B4-passing CSV and HoE remaining-load confirmation; a slip moves the schedule.
- No feature cuts. One full QA gate on the complete RC.
