# M2 Test Plan: Workers v1.1 (Head of QA, 2026-10-15, rev 2)
Source: product/workers/m2-proposal.md **v1.1** (v1.0 + §10 energy/management, approved by HoP 2026-10-15) (Hawker +1 queue slot dropped; queue_max stays M1 formula min(5, 3+floor(F/10))). Economy validation: m2-economy-validation.md, `run_m2()` in product/sim/economy_sim.py. M1 baseline: m1-rc2 (signed off).
Notation: F = Farm level, E = worker energy %. Expected values are taken from spec §2, §3 and §5 tables; [A] items are marked as assumption-dependent.

## 1. Scope
In: W1 Market Hand, W2 Coop Hand, W3 Hawker (demand ×1.25 only), W4 Egg Grader tiers 1–5, energy/Manage, Coop Hand tip, offline interaction, new CSV columns, telemetry for AC-W5, UI state readability (with Art & UX).
Out: Hawker queue slot / "sold out" display (removed in v1.0), W1 Tired under-fill mistake (not modelled, [A]), prestige, monetization.

## 2. Functional cases per worker (target **v1.1**, approved by HoP 2026-10-15; §8 rules clarifications apply)
**Parameter-driven:** energy, Manage, Grader, wage and Hawker expected values come from `qa/m2_expected.py`, which reads `game/src/config/balance.json` (workers block) + `product/economy.csv`. Values below are its output for v1.1. Any balance change = rerun the script and the cases; no plan edit needed. The script also prints a **CONFIG CHECK** against the approved v1.1 values. The current working-tree balance.json is still v1.0 (drain 6, Tired 50, asleep keep 0.25, no yawn/Manage-all keys) → MISMATCH until Engineering's balance-only change lands.
One worker per type; workers can't be fired or paused; no refunds (§8.9, §8.14).

### W1 Market Hand (F3, $40, wage $0.25 × F/min)
- W1-1 F2: locked. F3: hire enabled with ≥ $40; $39.99 → disabled; after hire, no second hire button; no fire/pause control.
- W1-2 Working: serves queue front-to-back every 1 s (partial fills, Q3/Q7 rules). Basket 100, queue 3×10 → all served within 1 s, +$34.50 at F3/C0 (30 × $1.15).
- W1-3 Tired: one serve event per 3 s (30 s window → 10 ±1).
- W1-4 Asleep or Unpaid: no serves, no wage; manual Sell all works.
- W1-5 Wage accrues continuously while Working or Tired: F3 $0.75/min, F10 $2.50/min, F18 $4.50/min, F30 $7.50/min; 60 s at F10 Working → −$2.50 ±$0.01. Farm upgrade mid-minute → new rate from that moment. HUD shows total $/min.
- W1-6 Unpaid: coins $1.00 at F10 → wage not payable → state Unpaid (acts as Asleep), "Unpaid" warning on portrait, coins never < 0, no debt. Resumes automatically when coins ≥ $2.50 (1 min of wage). Energy does not drain while Unpaid (question R2).
- W1-7 Sale price = sale-time price incl. Collection bonus and Grader multiplier.
### W2 Coop Hand (F7, $150, wage $0.5 × F/min)
- W2-1 Locked at F6; hire at F7 for $150.
- W2-2 Working: collects min(floor(coop), eggs_per_tap) every 2 s; Tired every 4 s; Asleep/Unpaid stops, no wage.
- W2-3 With manual taps: no double count, coop never negative, fractional coop not collected.
- W2-4 Wage F7 $3.50, F10 $5.00, F24 $12.00, F30 $15.00 per min; Unpaid at F10 resumes at coins ≥ $5.00.
### W3 Hawker (F8, $800, no wage)
- W3-1 Locked at F7; hire at F8. Queue size unchanged (M1 formula); no "sold out" state anywhere.
- W3-2 Demand = max(1, round_half_up(M1 draw × m)), m = 1.25 Working / 1.10 Tired / 1.0 Asleep. Draw 8 → 10 / 9 / 8; draw 16 → 20 / 18 / 16. Fixed at spawn: queued customers keep their demand when the state changes.
- W3-3 Distribution check: over ≥ 1,000 seeds, the scaled demand equals the M1 uniform draw mapped through the rounding (chi-square on the underlying draw, Q9 method).
### W4 Egg Grader (one worker, tiers at F18/19/21/22/24, cost 0.5 × Farm cost)
- W4-1 Tier n unlocks at its Farm level only, in order: costs $11,091 / $14,973 / $27,288 / $36,839 / $67,139. After tier 5 → MAX.
- W4-2 Multiplier m **replaces** the previous tier: 1.5 / 2.0 / 2.5 / 3.0 / 4.0. Tired = 1 + (m−1)×0.5; Asleep = 1 + (m−1)×0.15 (v1.1).
- W4-3 Unit price rounded once, half-up to cents: (1+0.05F)×(1+0.12C)×grader. At C10:
  | Tier @F | Working | Tired | Asleep | No grader |
  |---|---|---|---|---|
  | 1 @F18 | $6.27 | $5.23 | $4.49 | $4.18 |
  | 2 @F19 | $8.58 | $6.44 | $4.93 | $4.29 |
  | 3 @F21 | $11.27 | $7.89 | $5.52 | $4.51 |
  | 4 @F22 | $13.86 | $9.24 | $6.01 | $4.62 |
  | 5 @F24 | $19.36 | $12.10 | $7.02 | $4.84 |
- W4-4 State change applies from the next sale; completed sales are never re-priced. One energy bar for all tiers; buying a tier doesn't refill energy (question R4).
### Tips (§8.11)
- T-1 Worker tip shows when the worker is unlocked and affordable. Coop Hand tip also needs coop Full ≥ 10 s: 9.9 s → none; 10.0 s → shown; a dip below the cap at 8 s resets the timer.
- T-2 Once per session; reload = new session → may show again. Never while the welcome-back modal is open (shows after it closes).
- T-3 Two dismissals → hidden until the next worker unlock. Tap → opens hire panel. Never shown once that worker is hired.

### Unpaid / Manage rulings (PM Workers 2026-10-15, §10 R2–R6), at F10: W1 wage $2.50/min, W2 $5.00/min (values from m2_expected.py)
- U-1 (R2) Unpaid = Asleep: no serves/collects, no wage, **no energy drain**. W1 Unpaid at 70% for 5 min → still 70%.
- U-2 (R3) Manage on an Unpaid worker at 20% → energy 100%, state stays Unpaid, cooldown starts, telemetry worker_manage counted for AC-W5. Manage all with an Unpaid worker among 3+ → all refilled, Unpaid one stays Unpaid; counts as one Manage action.
- U-3 (R4) Grader at 37% energy buys tier 2 → energy still 37%, state unchanged (Tired), new multiplier applies at the Tired rate (×1.5).
- U-4 (R5) 3+ workers all at 100% → Manage all disabled; tapping it does nothing and does **not** start the cooldown (single Manage still available immediately). One worker at 99% → enabled. Visibility: <3 workers → Manage all hidden; ≥3 → always visible; all full → disabled, label 'All rested'; during shared 30 s cooldown → disabled with countdown, and single Manage buttons also locked.
- U-5 (R6) Resume check per worker, fixed order W1→W2→W3→W4. A worker resumes if coins − (1 min wage of each worker already resumed in this check) ≥ its own 1 min wage. (W3/W4 have no wage, so never Unpaid.) W1 and W2 both Unpaid at F10:
  | Coins | W1 (needs $2.50) | Remaining after reserve | W2 (needs $5.00) |
  |---|---|---|---|
  | $2.49 | stays Unpaid | — | stays Unpaid (2.49 < 5.00) |
  | $4.99 | resumes | $2.49 | stays Unpaid |
  | $6.00 | resumes | $3.50 | stays Unpaid |
  | $7.49 | resumes | $4.99 | stays Unpaid |
  | $7.50 | resumes | $5.00 | resumes |
  | Only W2 Unpaid (W1 paid), $5.00 | — | $5.00 | stays Unpaid (reserve covers every already-paid worker; R9) |
  | Only W2 Unpaid (W1 paid), $7.50 | — | $7.50 | resumes |
  Order is fixed: with $5.00, W1 takes the slot first and W2 stays Unpaid, even though $5.00 alone would cover W2.

## 3. Energy, failure and active management (v1.1)
- E-1 Hire at 100%. Drain −1% per 9 s for every hired worker that isn't Asleep (Working and Tired, including passive W3/W4): Working through 30% (630 s), Tired at 29% (639 s), Asleep at 0% (900 s = 15.0 min), ±1 tick.
- E-1b Yawn cue (Art & UX, art-ux/m2-workers-layout.md): amber ring on whenever 0% < energy ≤ 40% (from 540 s); yawn animation repeats every 6 s in that range; not shown when Asleep (Zzz + grey instead) or Unpaid (Unpaid state wins); Manage tap clears it immediately; partial refill above 40% clears it, drop back to ≤40% restarts it.
- E-2 Thresholds exact: 30% Working, 29% Tired, 1% Tired, 0% Asleep.
- E-3 Manage (single worker): free; refills that worker to 100%; 30 s **global** cooldown: Manage W1 at t=0, Manage W2 at 29.9 s rejected, at 30.0 s accepted. Cooldown shown on all Manage controls.
- E-3b **Manage all:** hidden with 0–2 hired workers; shown at 3+ (e.g. W1+W2+W3). One tap refills all hired workers to 100% (Asleep and Unpaid included; Unpaid stays Unpaid until coins allow, question R3).
- E-3c Manage all shares the global cooldown: Manage all at t=0 → single Manage at 10 s rejected; single Manage at t=0 → Manage all at 29.9 s rejected, at 30.0 s accepted.
- E-3d Hiring a 3rd worker during cooldown shows Manage all in a disabled state with the remaining cooldown.
- E-4 Manual actions always work regardless of worker state.
- E-5 States readable at a glance (Art & UX): Working / Tired / Asleep / Unpaid each distinct, not colour-only.
- E-6 AC-W3 unmanaged never worse than no workers (v1.1 keep 0.15): seller15 L25 86.0 < 90.8 min; cheapest 100.8 < 109.8.
- E-7 Telemetry events present and exported (Product ruling Oct 15, m-2): worker_hire, worker_manage (single), worker_manage_all, worker_state{working|tired|asleep|unpaid}, worker_summary (includes wages). worker_yawn: post-rc1, not gating rc1.

## 4. Offline and save/load
- OFF-1 Workers don't work, drain or get paid offline; energy and cooldown on return = values at last save.
- OFF-2 Offline eggs unchanged (0.25×, 2 h cap, bypass coop; O1–O14 pass).
- OFF-3 On return an awake, paid W1 sells the offline stock at its cadence.
- OFF-4 Save/load restores hired flags, Grader tier, energy, cooldown remaining, Unpaid state, tip dismissal counts. M1 save (v4) loads with no workers and no crash.
- OFF-5 Hidden tab: < 60 s simulated incl. workers; ≥ 60 s first 60 s then frozen (M1 rule).

## 5. Economy and pacing checks (QA sim + Engineering bot on real build, 100 seeds, 2 h; medians + seed spread)
| Check | Target | Gate? | Spec value (v1.1) |
|---|---|---|---|
| CONFIG CHECK | balance.json = approved v1.1 | gate | currently MISMATCH (v1.0 in tree) |
| AC-W1 casual managed | F10 ≤ 15 min in ≥ 95%; F18 median ≤ 40 | gate | 98%, 30.7 |
| AC-W2 seller15 vs M1 | ≤ +1 min at F10, F18 | gate | +0.8 / +1.0 (edge) |
| AC-W3 unmanaged ≤ none | E-6 | gate | PASS at 0.15 |
| AC-W4 seller15 managed | steps F18→F25 ≤ 6 min; F25 ≤ 70 | gate | 5.8; 62.2 |
| AC-W4b cheapest managed | steps ≤ 8 min | soft | 7.8 (thin) |
| AC-W6 slow tapper | ≥ 4 min at F18, ≥ 15% F21 income vs no Coop Hand | gate | 6.0 min, +45% |
| AC-W5 | ≥ 1 Manage per 15 min while ≥ 1 worker hired | telemetry, not a gate | sim 1.25 / 15 min |
| Active/idle metric | managed/unmanaged income at F21 ≥ 1.5 for active cohorts | playtest, not a gate | seller15 1.67, cheapest 1.86, casual 2.84, slow 2.88 |
| Designer 2× step metric | per seed and medians, all models: step(L) ≤ 2 × step(L−1) for L > 18; steps < 30 s ignored | soft | report only |
| CSV parity | w1–w4 columns on all 31 rows: empty before unlock; w1_cost 40 from F3; wages = formula × F; w4 current tier + mult from F18 | gate | — |
| Sim reproduction | QA sim within ±10% of `run_m2()` | gate | — |
AC-W2 (+1.0 vs ≤ +1 min) and AC-W4b (7.8 vs 8) have no margin: report seed spread; any break goes to Head of Product.

## 6. M1 regression (every M2 build)
- [ ] npm test, build, smoke green; sync-economy check; CSV parity 527/527 + new columns
- [ ] M1 AC1–AC11, Q1–Q9, O1–O14 scripts (qa/rc2-scripts) pass with no workers hired
- [ ] M1 pacing unchanged with no workers: first upgrade 15 s, F10 10.0, F18 28.0 min
- [ ] Manual actions (Collect, Sell, Sell all, upgrades) still work with every worker in every state
- [ ] Onboarding unchanged; welcome-back modal rules unchanged
- [ ] No page errors; autosave ≤ 5 s

## 7. Pre-public-release gate (required before any public release; waived for M1)
- Cross-browser smoke: latest Chrome, Firefox, Safari (macOS), Edge. Full regression checklist on Chrome; smoke (start, collect, sell, buy, hire, Manage, reload, offline modal) on the others.
- Desktop smoke: 1280×800 and 1920×1080 docked layout, mouse + keyboard, no overlaps.
- Real-device smoke: iOS Safari (one recent iPhone), Android Chrome (one mid-range device); touch, rotation, background/foreground resume, real offline gap ≥ 5 min.
- Performance: 60 fps target, no memory growth over 30 min with all workers.
- 0 Blocker/Critical; Majors waived by Product + CEO.

## 8. M1 carry-overs (verify in first M2 build)
- QA-RC2-2: with `?debug=1` at 390 px, the welcome-back Collect button is clickable (debug panel doesn't intercept). Expected: Playwright click succeeds without collapsing the panel.
- QA-RC2-3: engineering/sim-rules.md offline section says 0.25×; state.ts comment matches MK-10.
- Empty-nest art fix (Art & UX 20:01: icon-nest.svg empty + nest-eggs.svg overlay): at coop 0 the nest shows no eggs; overlay visible when coop ≥ 1; alignment matches mockbuild/nest-split.png at mobile and desktop.
- QA-RC2-1 is closed by the AC3 ruling (timeouts before arrivals); keep Q1 in regression.

## 9. Questions for PM Workers: CLOSED 2026-10-15
All 13 questions are answered in product/workers/m2-proposal.md §8 (copy: /workspace/qa-reply.md) and folded into §2–§5 above. Summary: wages continuous in Working/Tired (§8.1); coins never negative, Unpaid = Asleep, resumes at ≥ 1 min wage (§8.2); Hawker multiplies the draw, round half-up, min 1, fixed at spawn (§8.3–4); single price rounding (§8.5); all non-Asleep workers drain, one Grader bar (§8.6–7); Manage free, 30 s global (§8.8); no fire/pause/refund (§8.9); CSV on all 31 rows (§8.10); tip rules (§8.11); 2× metric soft, steps < 30 s ignored (§8.12); AC-W5 telemetry (§8.13).

## 10. Remaining questions (open)
- R1 (pending Designer: economy.csv worker rows) balance.json workers block is "hand-set, not from economy.csv", but §8.10 says w1–w4 columns go into economy.csv. Which is the source of truth, and will sync-economy verify the worker columns? (PM Workers / Engineering)
- ~~R2~~ CLOSED (U-1). Does an Unpaid worker drain energy? Unpaid "acts as Asleep" suggests no; please confirm. (PM Workers)
- ~~R3~~ CLOSED (U-2). Manage / Manage all on an Unpaid worker: refill energy only (stays Unpaid), or is Manage blocked? Does Manage count toward AC-W5 then? (PM Workers)
- ~~R4~~ CLOSED (U-3). Does buying a new Grader tier refill the Grader's energy? (PM Workers)
- ~~R5~~ CLOSED (cooldown U-4; visibility per Art & UX Oct 15, see U-4).
- ~~R6~~ CLOSED (U-5). Unpaid resume threshold "≥ 1 min of wage": with W1 and W2 both Unpaid, is it per worker (W1 resumes at $2.50) or combined ($7.50 at F10), and in which order? (PM Workers)
- ~~R7~~ CLOSED (Art & UX Oct 15, see E-1b).
- R8 New balance.json keys needed for v1.1 (QA script expects `workers.energy.yawn_at_pct`, `workers.energy.manage_all_min_workers`). Please confirm names with Engineering.
- R9 U-5: CLOSED (PM Workers, Oct 15): reserve 1 min wage for every already-paid worker (Working/Tired) plus those resumed earlier in the check. W1 paid, $5.00: W2 stays Unpaid; needs $7.50.

## AC-W1 (PM Workers ruling, m2-proposal §8 item 17, Oct 15)
- Gate: Python sim, casual model, seeds 0–99, one RNG per run: ≥95% reach F10 ≤15 min AND F18 median ≤40 min.
- Build parity (test hooks on: random arrivals, demand ×0.75; off by default): 100-seed medians within ±20% of Python, pass rate within 5 points. Any miss = sim bug, blocks sign-off.
- Check hooks default OFF in shipped config; with hooks off, AC-W4/W4b expected 5.8/7.8 min (±0.1).

## Post-rc1 checks
- m-1 (Art & UX ruling Oct 15): during the shared cooldown, Manage all is greyed out the same way as the single Manage buttons.
- m-2: worker_yawn telemetry event added.
- Workers tab icon uses icon-hire.svg.
- m-3: the Python sim R9 reserve counts only Working/Tired workers.
