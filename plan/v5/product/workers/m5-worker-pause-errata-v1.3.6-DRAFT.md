# M5.0 Pause spec errata v1.3.6 · DRAFT rev. 4 for a CEO change request · 2026-10-24 22:01 CEST · PM Workers (co-draft with PM Collection)

> **DRAFT. Paper only. M5.0 is FROZEN: `m5-worker-pause-spec.md` is NOT edited.** G5-P **PASSES** with variant (ii) (D-HOP-2026-10-24-40; CEO approved as D-CEO-20261024-09, M5.0 plan v0.3 re-pinned on paper to the errata). Variant (i) and the cut are no longer needed. Still open before the Pause merge: HoQA's gate (incl. AC-P14-CI seeds) and the PGT build tests for no tap and no ×2 while frozen. No code until Vadim says go.
> **Rev. 4 applies D-HOP-2026-10-24-41 items 2, 4, 5 and 7 (HoQA TESTABLE WITH GAPS) plus its non-blocking a11y note.** It is aligned to PM Collection's golden errata v1.3.3-DRAFT **rev. 5** (`product/collection/m5-golden-egg-errata-v1.3.3-DRAFT.md`, full sha1 `8439752d62fc34fc0fe814a75321975738b2acf2`; R5g(e) mirrors rule 11(g) tick order; re-pointed from rev. 4 569f26ff on 2026-10-24). It replaces rev. 3 (`d4ab134c44fd6b9705bc092effd0d6220fda5f4e`, aligned to golden rev. 3 ba2c7ca4), rev. 2 (`dfeb907`) and rev. 1 (`0f417ed`).

- **Target:** `product/workers/m5-worker-pause-spec.md` v1.3.5, sha1 `d3c1afb`. Frozen and not edited.
- **Golden counterpart:** golden spec v1.3.2 (`f6b3a05e`). The rules live in golden errata v1.3.3-DRAFT **rev. 5** (full sha1 `8439752d62fc34fc0fe814a75321975738b2acf2`), as R5g and `goldenFrozen()`, and are covered by GE-AC37–45 and GE-AC40b.
- **Rulings:**
  - D-HOP-33: the G5-P re-run at lockout 45 fails; D-HOP-16(4) is withdrawn; the Pause merge is blocked.
  - **D-HOP-34 Q1–Q7:** the rules for variant (ii).
  - D-HOP-31(e): CI pause rows use seeds 1–200 on 8dc90e2b.
  - **D-HOP-40:** G5-P passes with (ii); HoP approves the numbers (CEO D-CEO-20261024-09).
  - **D-HOP-41:** HoQA gap rulings; this rev. applies items 2, 4, 5, 7 and the non-blocking label-in-name note.
- **The fail being fixed** (D-HOP-33; economy.md §13.2a, sha256 1e3931c9…2b4e; seeds 1–200, 8dc90e2b, lockout 45): **4** gated seed-checkpoints above +2.0% on the three profiles then reported. On the full four-profile gated set (incl. slow; economy.md §12a baseline, D-HOP-40) the no-fix baseline is **5 of 14,400** above +2.0% and **2 of 14,400** above +2.5% (the fifth is (f) slow s193 F10 +2.25%).
  - (b) seller15 s47 F10 **+2.62%** (worst) and s31 F18 +2.37%
  - (f) optimal s19 F10 **+2.52%** and casual s169 F10 +2.36%
  - Every mean ≤ 0.00%. With golden eggs off, the (b) worst is +0.17%.
  - Cause: stock banked while paused gets sold into a Frenzy ×2.

## 1. Variant (ii), PRIMARY: golden freeze while any hired worker is paused

### 1.1 New rule: add as rule 11 in §5, after rule 10
> **11. Golden freeze (v1.3.6; D-HOP-2026-10-24-33/-34; golden R5g).**
> - (a) **Scope (Q1).** While `m4.flags.pause` = 1, F ≥ `tc_pause_unlock_farm` (10), and **at least one hired worker of any role (Market Hand, Coop Hand, Hawker or Egg Grader)** has `paused: true`, golden `goldenFrozen()` is true.
>   - The Grader counts like every other role. There's no stock-worker subset; the rev. 1 MH/CH/Hawker-only scope is withdrawn.
> - (b) **What freezes (Q2):** the golden spawn/first-spawn countdown, the on-screen egg's focus age, and `frenzyRemainingS` together with its ×2. **Not frozen:** `focusClock`, the streak, Broody accrual, ability calls and cooldowns, the G2 lockout, wages, energy and recovery.
> - (c) **Frozen egg, no collect (Q3; Head of Art & UX 19:09; golden R5g b/i):** an on-screen egg stays visible in the golden frozen style. A pointer, touch or keyboard activation while frozen doesn't collect, roll a reward, start a Frenzy or emit `collectible_collected`. It shows the bubble "On hold while a worker is paused" (golden R5g i). The egg stays a hit target.
> - (d) **No ×2 (Q4):** while frozen, Frenzy ×2 applies to **no sale**, whether player, worker or Basket stock. The gold 2× chip badge on prices is hidden, and the Frenzy pill shows a pause glyph in place of ×2 (golden R5g c; Art 19:09).
> - (e) **Frenzy already active when a pause starts (Q4, verbatim: "timer and effect are suspended together, otherwise pausing extends Frenzy"):** `frenzyRemainingS` holds its value at the freeze tick, and ×2 is off for the whole freeze. ×2 resumes on the tick the last paused worker resumes (golden R5g d/e), for exactly the time it had left, so the freeze neither extends nor shortens the Frenzy (golden R5g c/d; GE-AC41).
> - (f) **Lift and multiple workers (Q1):**
>   - The freeze starts on the tick the first worker is paused while none was.
>   - It lifts on the tick **the last** paused worker resumes, whether by Resume or by Manage (rule 8).
>   - Pausing or resuming other workers in between changes nothing.
>   - **There is no catch-up, no re-draw and no post-Resume wait.**
> - (g) **Tick order (Q5; D-HOP-41 (2)).** Within one tick the order is fixed: **(1) the tick's Pause/Resume toggles apply first, (2) then the golden freeze state (`goldenFrozen()`) is evaluated, (3) then player input is applied.** So a tap on the egg or pill in the same tick as a pause is handled as frozen (on-hold bubble, no collect), and a tap in the same tick as the last resume is handled as unfrozen. The golden update runs under the state from step 2: there's no spawn and no expiry on the pause tick, and a fade already in progress completes (golden R5g e; R18 wins per D-HOP-41 (3)).
>   - **Cross-spec consistency:** golden R5g(e) (PM Collection's file) must state the same three-step order verbatim; the two specs must match before the CEO change request.
> - (h) **Reload and offline (Q6):** the saved `paused` flags keep the freeze on. It stays frozen after the welcome-back modal closes. R8's reload/offline expiry of an on-screen egg is unchanged.
> - (i) **No new save field and no new tunable.** E13 still applies: with the flag off, saved `paused: true` workers are unpaused, so nothing is frozen.
> - (j) **Inert** with the flag off, F < 10, or nobody paused. Traces are byte-identical to v1.3.5 and golden v1.3.2 (AC-P1 pin; GE-AC34 `f90d1678`).

**If the re-run fails:** golden open item **E-1 (Econ)** may reintroduce a post-Resume wait. It would be counted in **sim seconds**, so it ends together with the 45 s `tc_pause_call_lockout_s`. It isn't in this draft. Any wait would come as a new errata.

### 1.2 E14: replace the entry (based on golden errata rev. 3 §4)
> - **E14 Golden egg and Pause (v1.3.6; D-HOP-34 Q4; supersedes D-HOP-06 (e); golden wins):**
>   - While any hired worker is paused, the golden countdown, the on-screen egg age and the Frenzy are frozen (golden R5g). No ×2 applies, and the egg can't be collected: a tap shows the on-hold bubble (golden R5g i).
>   - A Frenzy already active when the pause starts keeps its remaining time and resumes ×2 for exactly that time from the tick the last paused worker resumes; the timer and the effect are suspended together.
>   - Hand-selling while the Market Hand is benched no longer gets ×2.
>   - Pausing the Hawker still ends Shout (G1). That's unchanged, and during a freeze Frenzy is already ×1.
>   - The G2 lockout is unchanged: in the 45 s after a Market Hand resume there's no Rush or Shout. If the freeze lifts on that resume, Frenzy ×2 applies again from that tick.
>   - G5-P patterns (a)–(g) are run with golden eggs on, under rule 11.

### 1.3 §8 paused card
No golden on-hold copy on the paused card and no banner (Head of Art & UX 19:09). The on-hold bubble lives on the frozen egg and pill (golden R5g i).

### 1.4 §12 telemetry (Q7; HoE allowlist [T-sub])
> `worker_paused` adds **`golden_on_screen`** (bool: an egg was visible at the pause tick) and **`frenzy_active`** (bool: `frenzyRemainingS` > 0 at the pause tick).
- `session_end.golden_frozen_s` is golden's field (GE-AC45). Nothing else is added.

### 1.5 ACs (variant ii): add to §13
Golden GE-ACs are cross-referenced; QA PGT ids are in brackets.
- **AC-P20 Freeze start and stop** [PGT-1/2/3/12; GE-AC39, GE-AC42]
  - **Fixture:** F ≥ 10, both flags on, no egg, countdown 100.0.
  - **Start:** pause the Market Hand for 60 s → the countdown stays at 100.0, and there's 0 `collectible_spawned`. `focusClock`, the streak and Broody advance normally.
  - **Stop:** Resume → the spawn comes at +100.0 s ± 1 tick.
  - **Pause tick:** a countdown that would reach 0 on the pause tick doesn't spawn on that tick.
  - **No wait:** the countdown advances on the resume tick itself.
- **AC-P21 Multiple workers** [PGT-13/14/15/16; GE-AC39]
  - Pause the MH, pause the CH, resume the MH → still frozen. Resume the CH → it lifts that tick.
  - A Manage on the last paused worker lifts it on the `worker_resumed{cause:"manage"}` tick.
  - 10 cycles totalling 300 s paused and 150 s unpaused, from a countdown of 200 → 50.0 s left.
  - At F 8–9, no freeze can occur.
- **AC-P22 Grader included** [PGT-1; GE-AC39]
  - Repeat AC-P20 with **only the Grader** paused → identical freeze.
  - Repeat with only the Coop Hand, then only the Hawker → identical freeze.
- **AC-P23 Save and reload** [PGT-6/6b/6c/7/8/9/20; GE-AC43]
  - **No egg:** paused with countdown 80, reload → the save has `paused: true`, and the countdown is still 80 for 120 s after the welcome-back modal closes.
  - **Egg on screen:** reload → `collectible_expired{reason:"reload"}` once, no reward, and the fresh gap is held.
  - **Frenzy:** paused at 12 s, reload → 12 is held. On Resume, ×2 runs for 12.0 s.
  - **Offline, clock, hidden:** 2 h offline, wall clock ±3 h, and hidden for 40 s → nothing moves.
  - **Flag off:** a save with the flag off and `paused: true` → not frozen (E13).
- **AC-P24 Frozen egg: no collect; on-hold bubble** [PGT-4/10; GE-AC40, GE-AC40b]
  - Egg at age 25.0 s, worker paused for 10 min → no expiry, and the age stays 25.0.
  - A pointer tap, a touch tap and Enter/Space each grant nothing (0 `collectible_collected`, 0 `frenzy_started`) and show the on-hold bubble; the egg remains a hit target.
  - After Resume → urgent at +2.0 s, fade at +5.0 s.
- **AC-P25 No ×2; Frenzy already active** [PGT-5; GE-AC41]
  - **Fixture:** Frenzy at 20.0 s left, s = 0.28, Grader working; pause the MH.
  - **While paused:**
    - `frenzyRemainingS` = 20.0 throughout;
    - a manual sale of k = 10 at 150¢ credits `round(10 × 150 × 1.25 × 1.28)` = **2,400¢**;
    - there's no `2×` chip, and `frenzy_extra_cents` +0.
  - **After Resume:** a sale on the resume tick credits **4,800¢** (= 2 × 2,400¢), the same sale later in the Frenzy credits **4,800¢**, and `frenzy_ended{timeout}` fires once after 20.0 ± 0.1 s.
  - **Edge:** a pause on the tick after the grant leaves 29.9 s.
- **AC-P26 Isolation and telemetry** [PGT-17/18; GE-AC44/45]
  - Pause flag 0 → AC-P1 pin and GE-AC34 traces are unchanged.
  - A never-pause bot with the flag on is byte-identical to flag off.
  - **`worker_paused` values:**
    - With an egg visible and a Frenzy live: `golden_on_screen` = true and `frenzy_active` = true.
    - With neither: both false.
  - No other new fields.
- **AC-P27 Label in name (non-blocking; D-HOP-41 a11y note; WCAG 2.5.3)**
  - The paused worker card's state pill: its accessible name **starts with its visible label text** ("Paused"); any extra spoken detail comes after it.
  - The frozen Frenzy pill and frozen egg (golden's, GE-AC40b): the same rule applies; the on-hold string stays in `aria-describedby`, not in the name. PM Collection owns that wording in the golden errata.
  - Check: axe `label-content-name-mismatch` reports 0 on these elements in a paused scene (Chromium, WebKit, Firefox).

## 2. Variant (i), FALLBACK (only if (ii) fails G5-P; golden Appendix A, rev. 1 text, not reviewed against D-HOP-34)
- **E14 replacement:** Frenzy runs during Pause, but ×2 never applies to eggs banked while a stock worker was paused (golden R24b). Banked eggs sell first at 1× of the Frenzy factor. Hand-selling as fast as stock arrives keeps ×2. Shout and lockout lines are unchanged.
  - **Scope (HoP ruling, confirmed):** variant (i) applies only to stock-worker pauses (Market Hand, Coop Hand, Hawker). Variant (ii) applies to any paused worker, Grader included (D-HOP-34 Q1).
- **Two save fields** (golden R10a): `pauseStockSnapshot` and `pausedBankedEggs`. Both are optional integers, with no SAVE_VERSION bump. They must be saved, or a reload clears the bank (an exploit). E13 flag-off clears them.
- **Price truth (Art):** with a live Frenzy and banked eggs > 0, the Sell / Sell all previews show the mixed price, but the `2×` chip still claims ×2. **Art needs a "part at 1×" chip state**, or the chip over-promises.
- **ACs:** golden A.3 (renumbered if used), plus AC-P20i: 800 banked eggs sell without ×2, and a reload keeps `pausedBankedEggs`.

## 3. Either variant: §10 and AC-P14 replacement text

### 3.1 §10 intro: replace "On the T3 economy, seeds 0–99, …" with
> On the M5.0 CSV draft of record **8dc90e2b** (L0–30), **seeds 1–200** (set of record; D-HOP-2026-10-24-31 (e), HoQA agreed), F10/F18/F24, **every profile including slow**, lockout `tc_pause_call_lockout_s` 45, golden eggs on, with the v1.3.6 golden-Pause rule (rule 11, or the fallback (i)).
- **HoQA:** QA case **AC-P14-CI** still says "seeds 0–99" and needs the same fix to 1–200 on 8dc90e2b.
- **PM Collection / Econ:** GE-AC29 (G1) is a separate gate and also states 0–99. Whether it moves is Econ's call (golden E-2).

### 3.2 §10 (f) band (wording per D-HOP-28; D-HOP-41 (7))
(f): mean ≤ +1.0%; AT MOST one seed-checkpoint in (+2.0%, +2.5%]; all others ≤ +2.0%. Anything else blocks. (Rev. 3's single-exception wording is withdrawn.)

### 3.3 §10 "G5-P result": replace the v1.3 block with
> **G5-P result (v1.3.6):**
> - **Lockout-45 run without a golden-Pause rule (baseline): FAIL** (D-HOP-33; economy.md §13.2a / §12a baseline; seeds 1–200, 8dc90e2b, four profiles incl. slow). **5 of 14,400** gated seed-checkpoints are above +2.0% and **2 of 14,400** above +2.5%:
>   - (b) seller15 s47 F10 **+2.62%** (worst) and s31 F18 +2.37%
>   - (f) optimal s19 F10 **+2.52%**, casual s169 F10 +2.36%, slow s193 F10 +2.25%
> - **WITHDRAWN:** the v1.3 text "(f) +2.5% on one optimal F10 seed … accepted as documented variance (D-HOP-16)". D-HOP-33 withdraws D-HOP-16(4), and the outlier was +2.52%.
> - **Variant (ii) re-run: PASS** (D-HOP-2026-10-24-40; Econ FINAL, exact D-HOP-34 rules `GPAUSE=2`; 8dc90e2b, seeds 1–200, patterns (a)–(g) × profiles optimal, seller15, casual, slow × F10/F18/F24; lockout 45; resume wait 0):
>   - count > +2.0%: **0 of 14,400** gated seed-checkpoints (baseline 5 of 14,400)
>   - count > +2.5%: **0 of 14,400** (baseline 2 of 14,400)
>   - mean Δ: every gated mean ≤ 0.00%; (d) ≤ never-pause
>   - worst seed-checkpoint: **+1.35%** ((e) optimal s25 F24); closest cell 0.65 pp under +2.0%; Frenzy carry-over adds ≤ +0.43 pp
>   - cross-check seeds 0–99: **0 of 7,200** above +2.0% / +2.5%, worst **+1.35%**
>   - (f) band check (§3.2): passes with no exception used
> - **G1 with Pause in the stack:** unchanged. G1, the premium and the AC7 trace `19d4034d` are unchanged (D-HOP-40); the G1 output JSON is byte-identical to the record.
> - **Player cost (Econ FYI; HoP accepts as intended, D-HOP-40):** pausing costs engaged players ≈ 8–12 pp more because golden eggs and Frenzy also stop; short (e) pauses are nearly free (−0.03% mean).
> - **Known approximation (A3):** the runner books a caught golden egg at spawn, so "no collect while frozen" isn't simulated directly; HoQA's PGT build tests must verify it.
> - **Evidence:** `product/research/v2-slices/economy.md` §12a / §13.2a. D-HOP-40 cited sha256 `fe24954d72074a218a66bd25659f4d26eae1be6e11ad3f4d3924eee505b934d9`; superseded (HoP 22:01, D-HOP-41 #10, resume-wait tunable removed from §12a, numbers unchanged) by sha256 `8137205cb5d5836287c07c8c136db531c553060f3ad3cac883e77773d6c2edc5` (verified on disk). Logs: `scratch/v2-econ/out/g5p45/d34/`.
> - **Fallback (i):** not run and not needed (D-HOP-40).

### 3.4 AC-P14: replace the "Recorded / Documented variance" sub-bullet with
> - **Recorded (v1.3.6):**
>   - Lockout 45 without a golden rule FAILS (baseline 5 of 14,400 > +2.0%, 2 of 14,400 > +2.5%; worst +2.62%; (f) +2.52%; D-HOP-33).
>   - **No documented-variance exception remains** (D-HOP-16(4) withdrawn).
>   - The v1.3.6 rule (variant (ii)) on seeds 1–200 / 8dc90e2b, every profile including slow, lockout 45: **PASS**, 0 of 14,400 > +2.0% and 0 of 14,400 > +2.5%; worst +1.35%; 0–99 cross-check 0 of 7,200, worst +1.35% (D-HOP-40).
>   - CI band: (f) mean ≤ +1.0%; AT MOST one seed-checkpoint in (+2.0%, +2.5%]; all others ≤ +2.0% (D-HOP-28).
>   - Pause still doesn't merge until HoQA's gate passes in CI on the build.

## 4. Open items
1. ~~**Econ E-2:** run (ii) → fill §3.3~~ **CLOSED (D-HOP-40):** (ii) passes 0/0 of 14,400; §3.3–3.4 filled. E-1 (resume wait) not needed; Econ removed the tunable from §12a (D-HOP-41 #10).
2. **HoQA:** AC-P14-CI seeds → 1–200 / 8dc90e2b; map PGT-1…20 to AC-P20–P27; PGT build tests for no tap and no ×2 while frozen (A3 approximation). Gate still open.
3. Art A-1/A-2/A-3 CLOSED (golden rev. 4).
4. ~~**HoE H-1**~~ **CLOSED (D-HOP-40 addendum, HoE 21:55):** allowlist v0.6.2 and one shared pure `goldenFrozen(state)` with a parity test on seeds 1–200.
5. **PM Collection:** golden R5g(e) must carry the same three-step tick order as rule 11(g) (D-HOP-41 (2)); re-point L4/L7 here to golden rev. 5 sha1 when it lands.
6. ~~**HoP / CEO P-1**~~ **CLOSED:** CEO approved (D-CEO-20261024-09).

## Change log
- 2026-10-24 22:01 CEST, rev. 4 (D-HOP-2026-10-24-41, items 2, 4, 5, 7 + non-blocking a11y): paper only.
  - (2) Rule 11(g): explicit tick order, toggles → freeze state → player input; golden R5g(e) must match (PMC's file, not edited here).
  - (4) L4/L7 re-pointed to golden errata rev. 4, sha1 569f26ffd1538e599ba8ea2697c1ae54c869aeb9 (to be updated to rev. 5 when it lands).
  - Rev. 4 addendum (2026-10-24 22:08): L4/L7 re-pointed to golden errata rev. 5, sha1 8439752d62fc34fc0fe814a75321975738b2acf2 (R5g(e) now states toggles, then goldenFrozen, then input; E22c, GE-AC42). No rule change.
  - (5) §3.3–3.4 filled from D-HOP-40: 0 of 14,400 > +2.0% and > +2.5% (baseline 5 and 2 of 14,400); worst +1.35%; 0–99 cross-check 0 of 7,200, worst +1.35%; lockout 45; G1/AC7 unchanged; 8–12 pp player cost; evidence economy.md fe24954d… → 8137205c…. All Econ placeholders and the old three-profile denominator removed.
  - (7) §3.2 band wording per D-HOP-28 ("AT MOST one" replaces the rev. 3 single-exception wording).
  - New AC-P27 (label in name, non-blocking). Header, rulings and open items updated (E-2, H-1, P-1 closed).
- 2026-10-24 19:13 CEST, rev. 3: PM Collection's 7 review fixes applied verbatim. Aligned to golden errata v1.3.3-DRAFT rev. 3 (sha1 ba2c7ca4; GE-AC37–45 and GE-AC40b) and Head of Art & UX 19:09.
  - 11(c): frozen egg, no collect, on-hold bubble, still a hit target.
  - 11(d): 2× badge hidden, pause glyph on the pill.
  - 11(e) and E14: ×2 resumes on the tick the last paused worker resumes.
  - §1.3: no card copy or banner. Open item 3: A-1/A-2 closed.
  - AC-P24 retitled; AC-P25 gains the resume-tick 4,800¢ sale (checked: 10 × 150 × 1.25 × 1.28 × 2 = 4,800).
  - HoP ruling recorded: (i) is MH/CH/Hawker only; (ii) applies to any paused worker.
  - Card-copy-slot references removed. Paper only.
- 2026-10-24 19:10 CEST, rev. 2: aligned to D-HOP-34 and golden errata rev. 2 (c7ba7e1c).
  - Any hired worker, Grader included; MH/CH/Hawker-only scope dropped.
  - Post-Resume wait and its tunable removed (E-1 note only).
  - No ×2 and no tap while frozen; E14 rewritten from golden §4; an active Frenzy's timer and effect are suspended together (Q4).
  - Seeds 1–200, every profile including slow (D-HOP-31(e)).
  - `worker_paused` gets `golden_on_screen` and `frenzy_active`.
  - ACs renumbered to AC-P20–P26.
  - Paper only.
- 2026-10-24 19:08 CEST, rev. 1 (0f417ed): DRAFT created.
