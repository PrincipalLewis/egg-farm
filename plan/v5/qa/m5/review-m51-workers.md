# QA review: M5.1 Workers proposals (failure cost v0.2.2, lighter Refill v0.3, caption order) + rc1-asleep v1.0.11
**2026-10-24 23:05 CEST · Head of QA · paper only (M5.1, no code; build hold stands) · [QA-D-1024-M51FC]** · no messages sent.

**Inputs (QA `sha1sum`, all match):**
- `product/workers/m5.1-worker-failure-cost-proposal.md` v0.2.2 — `7f83801796fb66d46cf81cdf7223bed75b127162` (replaces v0.2 dcb50b1e / v0.2.1 8768336b)
- `product/workers/m5.1-lighter-refill-proposal.md` v0.3 — `889b2394e5ad06a0fc9750cb4aa3e3b24a545832`
- `product/workers/rc1-asleep-state-spec.md` v1.0.11 — `b1f85dca996ba272f3875bdedc1f44e80d37a365`
- Cross-checked: `product/workers/rc2-refill-proposal.md` v0.3 (`6f0b95ea…`), `m5-worker-abilities-spec.md`, `m5-worker-pause-spec.md` v1.3.5, `m2-proposal.md` §8, golden errata rev. 5 (Frenzy pill "0:20").

## Verdicts
| Doc | Verdict | One line |
|---|---|---|
| (A) Failure cost v0.2.2 | **TESTABLE WITH GAPS** | FC-R1/R2 and AC-FC1–5, 8, 9 are measurable. AC-FC13 is testable once the rounding rule is amended (below) and three cross-doc conflicts are settled (FC-G1…G4). AC-FC6 has no tolerance yet; AC-FC7 has no flag or trace pin; AC-FC12's trigger is undefined |
| (B) Lighter Refill v0.3 | **TESTABLE WITH GAPS** (AC-LR11 currently an open FAIL, which is a result, not a testability gap) | Auto-rest cut is clean (no `autorest`/Resting text left; AC-LR6 marked withdrawn, number not reused). AC-LR2/LR13 ignore the shared cooldown; AC-LR7/10/12 lack a pin or a metric definition; edge cases 5, 6, 8 and the toggle have no AC |
| (C) Caption order Unpaid > Still paid > Ready in > Rested | **CONSISTENT, with 3 conditions** | Matches rc1 v1.0.8 rule 2 (L90) and Unpaid > Asleep; UI-only so no sim-trace effect if stated; needs the Refill accessible-name rule fixed (C-2) and the rc1 Addendum 2 contradiction retired (C-1) |
| (D) rc1-asleep v1.0.11 AC-R17 | **TESTABLE** | Verified; cases TP1-R17a…e added to `qa/m41/test-plan-patch1.md`; queue P2a now cites the spec |

## (A) AC-FC13 rounding: QA ruling
**CONFIRM ceil, with six amendments (all needed for a deterministic oracle):**
1. **Integer arithmetic.** Compute from integer milliseconds: `t = ceil(remaining_ms / 1000)` with `remaining_ms` an integer (or the tick count × 100). Floating sim seconds drift (30 − 0.1·n in floats gives 29.000000000004 → ceil 30 on the tick it should read 29). Without this, case (iv) "59.0 s → 59s" is not reproducible across engines.
2. **Format on the ceiled value.** Choose the form from the integer t: t ≥ 60 → "m:ss", t ≤ 59 → "Ns". So "60s" can never appear; remaining 59.4 s → t 60 → "Refill in 1:00"; 59.0 s → "Refill in 59s"; 60.0 → "1:00"; 60.4 → "1:01". The text "from 60 s" (L62) is ambiguous between raw and rounded and must say "t ≥ 60".
3. **Enabled exactly at 0.** The button is enabled on the first tick where `remaining_ms ≤ 0` for every blocking timer, i.e. the same predicate the tap guard uses (one shared function, label and guard cannot disagree). With ceil, a positive remainder always shows ≥ "1s", so "Refill in 0s" is impossible by construction; add an assert that the string "in 0s" / "in 0:00" never renders. "Refill in 1s" shows for remaining in (0, 1000] ms = 10 ticks at 10 Hz.
4. **"At most once per second" (L62) is redundant and risky.** ceil already changes the value once per 1,000 ms. A render throttle could delay the switch to the enabled "Refill" past the tick it becomes tappable (breaks case (v)). Replace with: "the label changes only when t changes; the switch to enabled is never delayed".
5. **Monotonic, with one stated exception.** t is non-increasing while nothing else happens. It may **increase** when another worker's Refill (manual, or C2 auto) consumes the shared charge or restarts the shared cooldown. State that, and add case (vii) below.
6. **Clock.** State which clock `manage_cooldown_s` and charge regen count (sim/focus). rc2 AC-RF2 says charges don't regenerate offline; the manage cooldown's offline/hidden behaviour is unstated. Required: the label is derived from the same state value as the guard, never from wall clock; a wall-clock change moves nothing; after a hidden ≥ 60 s / offline return the first rendered label equals the guard's remaining (no stale value, no catch-up jump beyond what the timers did).
**Not chosen:** floor/round would show "0s" while disabled or under-state the wait; ceil is right.
**aria-live churn:** the button must sit outside any `aria-live` region (and the card banner, if live, must not contain it), so nothing is announced per tick. Screen-reader users get the time on focus. Optional, Art/HoP call: one polite announcement when the button becomes enabled. Test with NVDA + Chromium and VoiceOver + WebKit: focus the button 10 s → at most 1 announcement.

**Extra cases QA adds to (i)–(vi)** (same fixture: F12, MH Asleep at energy 0, coins high):
- (vii) **Shared consumption:** charges 1, cooldown 5 s, MH label "Refill in 5s"; player refills the CH (charges 1→0, cooldown restarts 30 s, next charge 150 s) → MH label becomes "Refill in 2:30" the same tick (t increased, allowed by amendment 5).
- (viii) **Float boundary:** cooldown 30.0 s stepped at 10 Hz → "30s" for remaining 30.0 down to 29.1 (10 ticks), "29s" from 29.0 (integer ms, no float drift), …, "1s" from 1.0 down to 0.1, enabled with label "Refill" at 0.0; no frame ever shows "0s".
- (ix) **Two asleep workers:** MH and CH asleep, same shared timers → both labels identical text; accessible names distinguishable (see FC-G2).
- (x) **Hidden/offline:** cooldown 20 s, hide 40 s (< 60) and, separately, offline 10 min → label after return per amendment 6.
- (xi) **Auto-refill on (lighter-refill C2):** worker on auto with 0 charges → when t reaches 0 auto refills on that tick; the label goes "Refill in 1s" → worker awake (enabled "Refill" may never paint; not a failure).
- (xii) **aria:** at each label change `aria-describedby` text unchanged (no "Ready in"), no `aria-live` ancestor, axe `label-content-name-mismatch` 0.

## (A) Gaps, failure cost v0.2.2 (line refs to the proposal)
| # | Line | Gap | Fix needed |
|---|---|---|---|
| FC-G1 | L61, L70–76 vs rc2 AC-RF2 (`rc2-refill-proposal.md` L44) | rc2 says a 0-charge Refill shows **"Next charge in Ns"**; AC-FC13 says "Refill in {t}". Two labels for the same state | Say AC-FC13 supersedes AC-RF2's label in M5.1 (or scope AC-FC13 to Asleep only and say what a non-asleep 0-charge button shows) |
| FC-G2 | L66 vs rc1 v1.0.9 table (Refill accessible name "Refill {Role}", AC-R10) | "Accessible name equals the visible label" drops the role: two asleep cards both named "Refill in 42s"; enabled per-worker button is "Refill Market Hand" elsewhere | Name = visible label first, then role: "Refill in 42s, Market Hand" / enabled "Refill Market Hand". Satisfies 2.5.3 (name starts with visible text) and keeps names unique |
| FC-G3 | L61 "the Refill button" | Per-card Refill vs nav Refill / "Refill N tired workers" not named | Scope AC-FC13 to the per-worker card button; state the nav button is unchanged (AC-R9, AC-R17) |
| FC-G4 | L62 format vs abilities §5.2 / pause AC-P9 ("0:ss" time-only, Art Q7e) and golden pill "0:20" | Same card shows Rush "0:45" (always m:ss) next to "Refill in 42s" | Art confirms the mixed formats are intended (or aligns); QA tests whatever is ruled |
| FC-G5 | L62–63 | Rounding amendments 1–6 above | Fold into AC-FC13 |
| FC-G6 | L47, L54 (AC-FC7) | No flag named for the clock wage (FC-R1 changes the sim); "AC7 Δ = 0" is a gate value, not a trace pin | Name the flag (e.g. `m4.flags.clockWage`, default 0); flag-off byte-identical to goldens `f90d1678` / `a54c9cf9`; flag-on AC7 trace re-pinned by Econ |
| FC-G7 | L19, L53 (AC-FC6) | Tie tolerance and non-redundant definition are "not set" | Econ sets both numerically before AC-FC6 can pass/fail |
| FC-G8 | L32, L59 (AC-FC12) | "Welcome-back after a tab-open gap": welcome-back appears after hidden/offline; with FC-R5 an offline/hidden ≥ 60 s gap adds no wage, so when does a "was paid" line ever show? | Define the trigger (e.g. hidden < 60 s, or the next open after a session with asleep time) and the window Y sums over |
| FC-G9 | L14, L52 (AC-FC5) | Hidden < 60 s not covered (is the wage charged?) | Add a case: hidden 40 s with CH asleep → wage per the sim rule for < 60 s |
| FC-G10 | L13, L56 (AC-FC9) | Broke asleep player toggles Asleep↔Unpaid each wage interval (auto-resume). "One toast per onset" doesn't say whether Unpaid→Asleep is an onset | Onset = energy reaching 0; Unpaid↔Asleep toggles fire no toast; caption swap "Resumes at"↔"Still paid" is not announced |
| FC-G11 | L58 (AC-FC11), §6 L78–81 | New event `tip_shown{id}` and fields `wage.state`, `wage_paid_asleep_cents`, `asleep_s` have no ACs and need the HoE allowlist | Add a telemetry AC + allowlist entry |
| FC-G12 | L57 (AC-FC10) | "Accessible name starts with the visible label" — of which element? The card is not a control | Name the elements (pill? Refill?) |
AC-FC1–4, 8, 9 are measurable as written (AC-FC8's fallback depends on the pending fit check, which is fine).

## (B) Gaps, lighter Refill v0.3
| # | Line | Gap | Fix needed |
|---|---|---|---|
| LR-G1 | L55 (AC-LR2), L66 (AC-LR13) | "auto fires on the first tick a charge regenerates" ignores the shared cooldown ("same gates", L18) | "first tick on which a manual Refill would be allowed (charge ≥ 1 and shared cooldown 0)", i.e. AC-FC13's t = 0 |
| LR-G2 | L60 (AC-LR7) | "byte-identical to rc2 v1.2 traces": no pin | Name the trace hash / harness (as rc1 AC-R17 does) |
| LR-G3 | L63 (AC-LR10), §6 L50 | `charge_starved_s` / "charge-starved share" undefined | Define (e.g. time with 0 charges while ≥ 1 worker is ≤ T% or Asleep) |
| LR-G4 | L65 (AC-LR12) | "best manual play" bot and "over windows" window undefined | Name the manual bot/profile and window length |
| LR-G5 | L41, L42, L44 (edges 5, 6, 8) | Coalesced toast "Auto-refilled N", manual-wins-same-tick, save field: no AC | Add ACs (toast copy exact, after menu close; same-tick order; save round-trip/default false/flag-off ignore) |
| LR-G6 | L18, L70 | Toggle UI location open (row vs Manage sheet) and no AC for it (label, aria-pressed/switch role, 44 px) | Art places it; add AC |
| LR-G7 | L58 (AC-LR5) | Tie rule (edge 4, lower slot index) not in the AC | Add the tie case |
| LR-G8 | L64 (AC-LR11) | Open FAIL (casual 230 vs 216 s) | Not a testability gap; blocks approval until Econ's re-run passes |
Auto-rest cut verified: no `tc_autorest_on_empty`, `autorest_started`, Resting copy or AC-LR6 text remains (AC-LR6 line reads "withdrawn in v0.3 (number not reused)"). AC-LR10–13 were added in v0.2 (changelog L77), not v0.3.

## (C) Caption slot order Unpaid > Still paid > Ready in > Rested
- **Consistent with rc1:** rc1 v1.0.8 rule 2 (L90) is Unpaid > "Ready in" > "Rested" > none, and Unpaid > Asleep (v1.0.10). "Still paid" applies only while Asleep (energy 0 ≤ T), so it never meets "Rested" (> T); Unpaid + Asleep → Unpaid. The only live overlap is Still paid vs Ready in, resolved by moving the countdown onto the button (AC-FC13). D-HOP-17 banner copy is untouched (the banner is a separate row; "Auto-selling stopped" stays toast/welcome-back only, proposal L31).
- **C-1 (rc1 internal contradiction):** rc1 Addendum 2 (L38) "When both apply, show the energy reason" (Rested beats Ready in) contradicts v1.0.8 rule 2 (L90) and m2-proposal L189 (cooldown wins). PM Workers marks L38 superseded so the M5.1 order has one source.
- **C-2 (aria):** see FC-G2. The Refill accessible name must start with the visible label and keep the role; describedby carries the caption sentence (Unpaid sentence, or the Asleep "still paid" sentence), never `aria-label`. Consistent with AC-R17 / m-P1-1 (label in name) and the v1.0.9 rule "never aria-label".
- **C-3 (trace / determinism):** caption choice and the countdown label are UI-only. Require: (a) derived from sim state each render, never `Date.now()`; (b) sim trace byte-identical with the caption/label code on vs off (same pattern as AC-R15); (c) the clock wage itself is a sim change, so its trace is governed by the flag in FC-G6, not by the caption order. Deterministic render check: harness steps N ticks, renders, snapshots caption + label text (no pixel goldens needed).
- Paused stays above all of these (rc1 v1.0.8 rule 5: Paused > Unpaid); the §4.2 Paused rewording is an M5.1 CEO change request and is not tested until approved.

## (D) rc1-asleep v1.0.11 AC-R17
Verified sha1 `b1f85dca…a37a365`. AC-R17 is measurable: three named controls, scenes, widths, engines, axe rule = 0 with the repro command, frozen `#rate` suffix kept, sim trace byte-identical (goldens `f90d1678…` / `a54c9cf9…`). One note: the queue row P2a lists 375 px; AC-R17 lists 360/390/1280. QA runs 360/375/390/1280 (superset). Cases TP1-R17a…e in `qa/m41/test-plan-patch1.md`.


## Re-check 2026-10-24 23:15 CEST ([QA-D-1024-M51FC2]): failure cost v0.3.1, lighter Refill v0.4
Hashes (QA `sha1sum`, match): failure cost v0.3.1 `f206d0313dcf9425d6f56b8e3ee5026ec23412c1`; lighter Refill v0.4 `5acbe08dd8f83e03218dc219402d620849e33279`; rc1-asleep unchanged `b1f85dca996ba272f3875bdedc1f44e80d37a365`.

### Failure cost v0.3.1 — **TESTABLE WITH GAPS**
| Item | In text? | Where |
|---|---|---|
| AC-FC13 amendments 1–6 | **Yes**, all six | L84 clock, L85 integer-ms ceil, L86 format on rounded t, L87 enable = guard predicate + "0s" assert, L88 no throttle, L89 monotonic + shared-consumption exception |
| No `aria-live` | Yes | L92 |
| Cases (vii)–(xii) | Yes, verbatim | L104–109; (i)–(vi) restated in integer ms L97–103 |
| FC-G1 supersedes rc2 AC-RF2 | Yes | L82 (all timer-blocked per-worker Refills; "Rested" label unchanged) |
| FC-G2 name | Yes | AC-FC10 L76 "Refill in 42s, Market Hand" / "Refill, Market Hand"; L92 |
| FC-G3 scope | Yes | L81 per-worker control (rc2 Shift-sheet row, or pre-rc2 card); nav unchanged |
| FC-G6 flag | Yes | FC-R7 L16, AC-FC7 L72: `m4.flags.clockWage` default 0, flag 0 byte-identical to `f90d1678…` / `a54c9cf9…`; flag-1 AC7 hash at build |
| FC-G8 welcome-back | Yes | §4.3 L45–48, AC-FC12 L79 |
| FC-G9 hidden < 60 s / 60.0 | Yes | FC-R6 L15, AC-FC5 (b)(c) L69–70. **Consistent** with pause E1 (L255 "exactly 60.0 counts"), sales-stopped §7.2 (L215), offline-popup v2 C-AC36 and the built `settleHiddenPeriod` (`gap < offlineMinSeconds*1000` → live, else offline grant; seen in the m41-7 worktree `qa/wt-m41-7-b986cd3/src/game.ts` L356–363) |
| FC-G10 toast onset | Yes | AC-FC9 L74 (onset = energy 0 from > 0; flips fire no toast; test 10 intervals ≥ 2 flips → 1 toast) |
| FC-G12 elements | Yes | AC-FC10 L76–77 |
| C-3 → AC-FC14 | Yes | L43, L110 |
| FC-G11 → AC-FC15 | Yes (AC written); allowlist still OPEN | L111, L117 |
| C-1 | Recorded, deferred | L42 superseded for M5.1; rc1 L38 left for the next rc1 revision (L126) |

**Name form (asked):** no axe risk. `label-content-name-mismatch` compares the visible text with the name after dropping punctuation and case, so "Refill, Market Hand", "Refill Market Hand" and "Refill in 42s, Market Hand" all pass (visible text is a prefix). Patch1 (M4.1, pre-rc2) keeps rc1 AC-R10 "Refill Market Hand"; TP1-R10 stays as is. **But M5.1 is internally inconsistent:** AC-FC13 L93 keeps "the rc1 Unpaid aria, AC-R10–R12" for an Unpaid worker, i.e. "Refill Market Hand", while AC-FC10 L76 makes the same button "Refill, Market Hand" in every other state. One control would change name format when the worker flips Asleep↔Unpaid (FC-R4). → **FC-N1.**
**Constant width ±0.5 px (asked):** testable per engine (`getBoundingClientRect().width` after `document.fonts.ready`, same engine/width/zoom). Not comparable across engines (different text shaping). Two conditions for a valid test: the final `min-width` px value (pending UI/Visual, L95/L58) and `min-width` ≥ the natural width of the widest label in every engine (else the content overflows `min-width` and the width jumps); add `scrollWidth ≤ clientWidth` to the case. → FC-N4.

**Remaining gaps, failure cost:**
| # | Line | Gap | Owner |
|---|---|---|---|
| FC-G4 | L121 | mixed countdown formats on one card (Rush "0:45" vs "Refill in 42s") | Art (OPEN) |
| FC-G7 | L71, L123 | tie tolerance + non-redundant definition; AC-FC6 can't pass/fail | Econ (OPEN) |
| FC-G11 | L111, L117, L124 | allowlist for `wage.state`, `session_end.wage_paid_asleep_cents`, `asleep_s`, `tip_shown` | HoE (OPEN) |
| FC-H1 | L84, L124 | shared cooldown's offline/hidden rule, and whether rc2 decision 6 (rc2 L169) retires it in M5.1 | HoE (OPEN) |
| FC-N1 (new) | L76 vs L93 | Unpaid name "Refill Market Hand" vs others "Refill, Market Hand" on the same M5.1 control | PMW: use ", {Role}" in all M5.1 states (AC-R10 form stays for patch1 only) |
| FC-N2 (new) | L82 vs L40, L65 | AC-FC13 now covers every timer-blocked worker ≤ threshold, not only Asleep. For a Tired (not Asleep) worker the caption order gives "Ready in Ns" (no "Still paid") **and** the button reads "Refill in 42s": two countdowns. Also its `aria-describedby` content is unstated (the wage sentence is Asleep-only) | PMW + Art: drop "Ready in" wherever the button carries the countdown; state the Tired describedby |
| FC-N3 (new) | L83, L97–109 | If rc2 decision 6 retires the shared cooldown (L83 note), cases (i), (iii-a/b), (vi), (vii), (viii) and (x a) cannot be set up as written. Add next-charge-only variants (e.g. (viii) on a 150 000 ms next-charge timer) | PMW (after FC-H1) |
| FC-N4 (new) | L95 | constant width: final px pending; add `scrollWidth ≤ clientWidth` and per-engine comparison only | UI/Visual (px), PMW (case text) |
| FC-N5 (new) | L74 | toast "≤ 2 lines, no clipping at 360 and 390 (… 1280 per the approved rule)": 1280 has no stated oracle and Art's 320 px cap was not measured (L55) | PMW: state "≤ 2 lines, no clip at 360/390/1280" |
| FC-N6 (record) | `engineering/sim-rules.md` L11, L43 | still says a hidden ≥ 60 s gap simulates the first 60 s with no grant (pre-C-AC36 text, file header "2026-10-15"); the build and FC-R6 follow C-AC36 | HoE (doc refresh) |

### Lighter Refill v0.4 — **TESTABLE WITH GAPS**
| Item | In text? | Where |
|---|---|---|
| LR-G1 manual-allowed tick | Yes | AC-LR2 L56, AC-LR13 L67 (= AC-FC13 t 0, same guard predicate) |
| LR-G2 AC-LR7 pin | Yes, deferred | L61: hash recorded at build with the rc2 PR (rc2 not built) |
| LR-G3 charge-starved | Yes | §6 L51 (Econ to confirm vs harness metric) |
| LR-G4 manual bot / window | Yes | AC-LR12 L66 (`MANAT=32`, 10-min windows every 300 s) |
| LR-G5 toast / same tick / save | Yes | AC-LR14 L68, AC-LR15 L69, AC-LR16 L70 |
| LR-G7 tie | Yes | AC-LR5 L59, edge 4 L40 = rc2 AC-RF3 (rc2 L144: "lower energy first, then W1→W4") — matches |
| AC-LR14–17 | LR14/15/16 **testable**; LR17 testable once placed | LR14 copy "Auto-refilled N" is proposal copy (Art final pending); LR17 placement OPEN |

**Remaining, lighter Refill:** LR-G6 toggle placement + "Auto-refilled N" final copy (L71, L75; Art, OPEN); AC-LR11 open FAIL, casual G4 230 vs 216 s (L65, L76; Econ re-run); AC-LR7 hash at build (L61; HoE/rc2 PR); charge-starved metric match (L51; Econ confirm). New, minor: **LR-N1** L51 uses `refill_threshold_pct` (50%), a name not in rc1 (`manage_prompt_threshold`) or rc2 text — PMW to cite the actual column.

### rc1-asleep v1.0.11 — unchanged, TESTABLE (TP1-R17a–e stand).

## Re-check 3 · 2026-10-24 23:22 CEST ([QA-D-1024-M51FC3]): failure cost v0.3.4, lighter Refill v0.6, rc1-asleep v1.0.12
Hashes (QA `sha1sum`, match): failure cost v0.3.4 `e7bd0778b5288cca56166195ef2ccc6839bb6dac` (v0.3.3 `5d5da3ec…` superseded; diff v0.3.3→v0.3.4 = FC-N2 closure, Rested move, name note only); lighter Refill v0.6 `04078edde56fbf43ed46501cea731c3a17f3895a`; rc1-asleep v1.0.12 `666e8fd54e90e054dcde2c28aa76560e50f78223` (diff vs v1.0.11 backup `scratch/…v1.0.11.md` = b1f85dca: header, rule 2 at L90, new v1.0.12 section only; AC-R1–R17 unchanged, so TP1-R17a–e stand).

### Failure cost v0.3.4 — **TESTABLE WITH GAPS**
- **FC-N1 closed:** ", {Role}" in every M5.1 state incl. Unpaid (AC-FC13 L102; §4.1 L46). Art 23:17 "just its visible label" reconciled in favour of ", {Role}" (L46); passes `label-content-name-mismatch`.
- **FC-N2 closed (Art 23:17):** M5.1 caption order Unpaid > Asleep "Still paid" > "Rested, refill below T%" > none (L41); Rested moves from the rc2 AC-RF2 button label to the caption (L45, L91); button reads only "Refill" / "Refill in m:ss"; describedby = caption only, never the countdown. **Consistent with rc1 v1.0.12 rule 2** (L90: Unpaid > Rested > "Ready in" > none): "Still paid" (energy 0) never meets Rested (> T); in M5.1 the only timer is the next charge and it sits on the button, never above Rested (above T the button is plain disabled "Refill").
- **FC-N3 / FC-H1 closed:** no Manage cooldown on the rc2 path (HoE ruling 4, `engineering/decisions.md` L142); t = next charge at 0 charges (L92); cases (i)–(xii) rewritten next-charge-only (L104–115) and every one can now be set up (0 charges + regen ms, or charges 1 for (vi)/(vii)).
- **Amendment 2 superseded (accepted):** HoP 23:12 / Art 23:10 make every M5.1 countdown **m:ss** ("Refill in 0:42", "0:59", "1:00"); my Ns/m:ss split is withdrawn. Its intent holds: "60s" cannot exist, "0:00" is asserted never rendered (L96). No leftover "Ns"/"42s" in AC text (only in history L89, changelog L142). Patch line keeps rc1 "Ready in Ns" (rc1 v1.0.12, L50) — a deliberate M5.1/patch format split, recorded.
- **FC-N4:** `min-width:203px`, no tabular-nums (HoP-ruled, B-4 L65). Constant width is still achievable without tabular figures because `min-width` dominates as long as every label's natural width < 203 px: widest reachable with regen 150 s is "Refill in 2:30"; the fit case "Refill in 9:59" measured 199.64 px (3.4 px margin). The accessible name (", Market Hand") is not visible and does not affect width. Test per engine, after `document.fonts.ready`, plus `scrollWidth ≤ clientWidth` (L100): testable.
- **FC-N5 closed:** toast ≤ 2 lines, no clipping at 360/390/1280, 3 engines (AC-FC9 L83; B-1 cap `min(320px, 100vw − 32px)` measured 2 lines at 1280, L63).
- **60 s threshold keys:** `offline.offlineMinSeconds` = 60 and `offline.hiddenSimMaxSeconds` = 60 exist in the current build lineage's balance.json (`qa/wt-m41-7-b986cd3/src/config/balance.json`; the Oct 16 `game/` checkout has only `offlineMinSeconds`). Telemetry `session_hidden_end_s` (60) is in `product/collection/telemetry-spec.md` L14. `offline_min_s` is **not** in `product/economy.csv` yet (proposed; Econ open, FC-R8 L16) — correctly labelled as proposed.

**Remaining / new, failure cost:**
| # | Line | Gap | Owner |
|---|---|---|---|
| FC-G7 | L80 (AC-FC6), §7 Econ | tie tolerance + non-redundant definition | Econ (OPEN) |
| FC-R8 row | L16, §7 Econ | add economy.csv `offline_min_s` + sync mapping | Econ (OPEN, M5.1 kickoff batch) |
| FC-N7 (new) | L41, L92; rc2 `rc2-refill-proposal.md` L169 (decision 6) | **Cooldown removal is a sim change with no flag, AC or trace statement anywhere.** Shipped 30b29d3 has the 30 s `manageCdS` and rc1 v1.0.12 still shows "Ready in Ns"; M5.1 drops it "when rc2 ships" on an "rc2-flag-off path" (HoE L142), but the rc2 proposal names **no flag** and has no "no cooldown" AC or trace re-pin. AC-FC13 depends on it | PMW (rc2 spec: name the flag, add AC "no Manage cooldown with rc2 on; `manageCdS` absent from state/save", flag-off byte-identical to `f90d1678…`/`a54c9cf9…`, flag-on trace pinned at build) + HoE |
| FC-N8 (new, minor) | L99 (range), L100 | constant-width margin holds only while `charge_regen_s` < 600 ("10:00" is wider and unmeasured) | PMW: state the bound, or re-measure if regen tuning goes ≥ 600 s |
| FC-N6 | `engineering/sim-rules.md` L11/L43 | stale hidden-gap text (record) | HoE |

### Lighter Refill v0.6 — **TESTABLE WITH GAPS**
- **AC-LR2 / LR13 (L56, L67):** guard "charges ≥ 1" = "first tick a manual Refill would be allowed" on the rc2 path with no cooldown: consistent with LR-G1 and AC-FC13 t = 0. Minor: auto-refill only exists with rc2 on, so the pre-rc2 cooldown path never meets it — say so (LR-N3).
- **LR-N1 closed:** `refill_threshold_pct` is a real economy.csv column (header col 111) (L51).
- **AC-LR17 (L71):** switch row 304×52 at 360, role `switch`, `aria-checked`, name "Auto-refill, {Role}". WCAG 2.5.3 is met (name starts with the visible label "Auto-refill"). **But** the whole row is the switch and its visible text is "Auto-refill" + "Uses a charge at 20%" + "On"/"Off": axe `label-content-name-mismatch` (the rule QA runs for m-P1-1) compares the element's full visible text with the name and will likely flag it → **LR-N2**.

**Remaining / new, lighter Refill:**
| # | Line | Gap | Owner |
|---|---|---|---|
| AC-LR11 | L65 | open FAIL, casual G4 230 vs 216 s | Econ re-run |
| AC-LR7 | L61 | trace hash recorded at build (rc2 PR) | HoE |
| LR-G3 | L51 | Econ to confirm charge-starved matches its harness metric | Econ |
| LR-N2 (new) | L71 | name via `aria-labelledby` on the "Auto-refill" text (+ role text), sub-line via `aria-describedby`, "On"/"Off" `aria-hidden` (state is `aria-checked`); add AC: axe `label-content-name-mismatch` 0 on the row, 3 engines | PMW + Art |
| LR-N3 (new, minor) | L56 | state that auto-refill requires rc2 on (no cooldown term exists there) | PMW |

## Change log
- 2026-10-25 02:50 CEST: re-check 7 (failure cost v0.3.9 TESTABLE, lighter Refill v0.8.4 TESTABLE; per-seed guards s148/s116 PASS) ([QA-D-1025-M51FC7]).
- 2026-10-25 01:58 CEST: re-check 6 (failure cost v0.3.8 TESTABLE, lighter Refill v0.8.2 TESTABLE) ([QA-D-1025-M51FC6]).
- 2026-10-25 01:50 CEST: re-check 5 (failure cost v0.3.7 NEEDS FIX, lighter Refill v0.8/v0.8.1 NEEDS FIX) ([QA-D-1025-M51FC5]).
- 2026-10-24 23:22 CEST: re-check 3 (failure cost v0.3.4, lighter Refill v0.6, rc1 v1.0.12) ([QA-D-1024-M51FC3]).
- 2026-10-24 23:15 CEST: re-check of failure cost v0.3.1 and lighter Refill v0.4 ([QA-D-1024-M51FC2]).
- 2026-10-24 23:05 CEST: first review ([QA-D-1024-M51FC]).

## Re-check 4 (2026-10-24 23:27)
failure-cost v0.3.5 acbdc2be, lighter-refill v0.7 b5f164d4: all QA items closed (FC-N7/N8, LR-N2/N3). TESTABLE pending items owned by others (HoE flag confirm and hash pin; Econ FC-G7, offline_min_s, AC-LR11, LR-G3; HoE FC-N6). Width headroom 0.42 px, so test every label.

## Re-check 5 · 2026-10-25 01:50 CEST ([QA-D-1025-M51FC5]): failure cost v0.3.7, lighter Refill v0.8 (+ v0.8.1 on disk)
Paper only. No messages sent.

**Hashes (QA `sha1sum`):**
- failure cost v0.3.7 `product/workers/m5.1-worker-failure-cost-proposal.md` = `48e756121b594f7918d75da0e631e20fcbe62ec2` **MATCH**. Intermediate v0.3.6 `scratch/…v0.3.6.md` = `b6f4fe5f01a6acad08a1b7d3ef65897be4681c0e` MATCH. Base v0.3.5 backup = `acbdc2be…` MATCH.
- lighter Refill v0.8 `scratch/m5.1-lighter-refill-proposal.v0.8.md` = `8bbcfd19d2525e448330bcfc44b6001ae5b0bfa5` **MATCH**. Intermediate v0.7.1 = `9b857b61dd3992787b6e738b87fdf0f1f3454cc6` MATCH; base v0.7 = `b5f164d4…` MATCH.
- **The live `product/workers/m5.1-lighter-refill-proposal.md` is now v0.8.1 = `420ae9d01f67fabbbcf2fdcddcfdf4522675f700`** (01:28; HoP re-pinned it in D-HOP-2026-10-25-01 01:30). Diff v0.8 → v0.8.1: status line, AC-LR11 (at-30 PASS figures, 0 s margin), §8 note and changelog only. Everything below applies to both.
- Econ evidence cited by both docs and by D-HOP-2026-10-25-01 / D-PMW-2026-10-25-01: `m5.1-shipping-rerun-econ.md` sha1 `05f8e193…`. **No file with that hash is on disk**; the current file is `41e654910cfef0e0bd15a3a30558f99deacf312c` (01:26:45). v0.8.1 cites both. Every figure the docs quote matches the current file, so this is a pin item, not a testability gap.

**Diff scope (v0.3.5 → v0.3.7 and v0.7 → v0.8, full `diff`):** only the claimed changes plus header, §7 open items, changelog and a new FC §8 "Parked: Silkie" (not in M5.1, no AC). No other AC text moved. AC-FC1–5, 7–12, 14 and AC-LR4–7, 9, 13, 14, 16, 18 are byte-identical apart from flag-status words.

### Claimed changes: verified
| Claim | In text? | Where / note |
|---|---|---|
| Refill min-width 208px (Art 23:31) | Yes | B-4 L68, §4.1 L42, AC-FC13 format L97 and constant width L102, AC-FC17 (b) L126. Art `art-ux/decisions.md` L342–358 confirms 208px, 5.4 px headroom |
| AC-FC17 (b): every label, every engine, after `document.fonts.ready`, ≥ 4 px headroom (5.42 today), fallback font past 208 fails | Yes | L126 |
| AC numbering | Consistent | AC-FC13 = countdown label (constant-width check inside it, now 208); AC-FC17 = (a) `charge_regen_s` ≤ 599 validation + (b) all-label width sweep. Both rules still exist. (My earlier note "AC-FC13 = 203px rule, AC-FC17 = regen cap" was a shorthand; FC17 always held both (a) and (b).) |
| AC-FC16 (a): `manageCdS` not read or ticked, preserved verbatim, no version bump | Yes | L121; matches HoE `engineering/decisions.md` L148 (incl. build note tick.ts:50) |
| rc2Refill CONFIRMED | Yes | FC-R9 L18, LR edge 9; HoE L147 |
| Flag-on hash / AC-LR7 baseline pinned? | **No, still "at build"** | AC-FC16 (c) L123, AC-LR7, AC-LR19; HoE L151 commits to pin at build in decisions + PR body. HoE-owned open item. Not a blocker: no M5.1 build exists, and the ACs say exactly which trace to pin |
| FC-G7: τ = $0.005/s, non-redundant G > $0.05/s | Yes | §3 L21–24, AC-FC6 L82. Matches Econ §4 (max redundant \|G\| $0.0024/s, min real G $0.367/s) |
| Tired held to ≤ only; Unpaid tested as transient | Yes (wording, see FC5-3/R5-1) | §3 L24 |
| Broke test ≤ 12 toggles/30 min; neglect P95 0, max ≤ 1/30 min | Yes, but fixtures not cited (FC5-2) | FC-R4 L13, AC-FC15 L119 |
| LR: at_pct 30 | Yes in §3 C2 L18 and §4 table; **not carried into the ACs** (LR5-1) | |
| AC-LR11: worst ≤ off worst, P95 ≤ max(180, off P95 + 10) | Yes | AC-LR11; = HoP 01:27 addendum. v0.8.1 PASS figures re-checked against Econ §1.3 L73–75: optimal 292 ≤ 308, 244 ≤ 254; seller15 277 ≤ 277, 183 ≤ 184; casual 219 ≤ 219, 163 ≤ 180. Correct; 0 s margin on two profiles |
| AC-LR10: on median ≥ 30%, P5 ≥ 20% at 30, off median ≥ 15%, per seed on ≥ off − 2 pp | Yes (wording, LR5-4) | Econ at 30: medians 36.5/35.7/35.2, P5 26.0/24.2/24.3, off medians 23.1/24.8/26.6 → pass. **Per-seed worst Δ at 30 not reported** (only on ≥ off counts 195/191/179) |
| Band/guard 85–97%/≤ 1.00 or 98%/≤ 1.01 by sweep; how recorded | **Choice rule missing** (LR5-3) | §4 D1 says "TBD pending the sweep"; nothing says where the chosen bar and lever are pinned |
| AC-LR12 GROSS (sales + mechanics, wages not subtracted, m5rx.ts:38); net diagnostic | Yes | AC-LR12; flag threshold > 0.5 pp. The 0.018 pp max is Econ §2.4's measurement (at 20 and 30), not a doc bound. Consistent |

### Failure cost v0.3.7: **NEEDS FIX** (3 text fixes, PMW)
| # | Where | Gap | Fix |
|---|---|---|---|
| FC5-1 | AC-FC13 constant width L102 | Stale and contradictory: it says all 600 labels fit "min-width:208px (width exactly 208…)" "but the margin is **0.42 px**". The sweep (`scratch/fcn8-remeasure/sweep.mjs` L17) measured at 203px, not 208, and 0.42 px was the 203 margin. AC-FC17 (b) says 5.42 px | Say "measured at 203px (v0.3.5 sweep, natural widths); at 208 the headroom is 5.42 px; UI/Visual re-confirm at 208 pending" |
| FC5-2 | AC-FC15 flip bound L119, FC-R4 L13 | "Broke-trickle test" and "200-seed neglect run" have no fixture, profiles, seeds or CSV in the doc, so ≤ 12 and P95 0/max ≤ 1 can't be reproduced from the AC | Cite Econ `41e65491` §3.3 C (1,800 s, CH pinned Asleep, MH Working, start 0 coins or just under one 2 s wage, drip = 2/3 CH wage every 30 s, F, CSV 8dc90e2b, `h2/offtest.ts`) and §3.2 (`CFG=neglect`: rc2 on, no refills, clock on; seeds 1–200; optimal/seller15/casual; per 30-min window) |
| FC5-3 | AC-FC6 L82 vs §3 L24 | AC-FC6 still lists Unpaid in the held map; §3 carves it out. A literal run fails: held Unpaid beats Working + τ in every redundant cell (Econ §4) | AC-FC6: "Tired/Asleep … (Unpaid excluded; transient, covered by AC-FC4 + AC-FC15)" |
| FC5-4 | AC-FC17 (b) L126 headroom | "natural width ≤ 204 px" has no method. With `min-width:208px` applied, `getBoundingClientRect` reads 208 and `scrollWidth ≤ clientWidth` can't see 204–208 | Add: natural width = the label's button width with `min-width` removed (as `sweep.mjs` `natural`), same font/engine, after `fonts.ready` |
**Record-only (no re-check needed):** R5-1 §3 "Tired … strict only where net(W) − net(Tired) > τ" is circular (that is the strict condition itself); effectively Tired is ≤ + τ only. Likewise the Asleep strict clause is implied by the G > $0.05/s definition (G = W − A > 0.05 > τ), so in the AC-FC6 run the real checks are the ≤ τ bars; QA tests both clauses as written. R5-2 FC-R5 L14 still says "[Econ to confirm]" (§7 says CLOSED). R5-3 §7 HoP D2 "at 30: re-measure pending" (now PASS per D-HOP 01:29). R5-4 Econ pin `05f8e193` → `41e65491`. R5-5 Econ's "share of time Unpaid" transient metric has no bound (only toggles are bounded); fine unless HoP wants one.

### Lighter Refill v0.8 / v0.8.1: **NEEDS FIX** (PMW, + Econ for LR5-3)
| # | Where | Gap | Fix |
|---|---|---|---|
| LR5-1 | AC-LR1, LR3, LR8, LR15, LR17, LR19 (b); edges 3, 7; §3 L19 | **at_pct 30 is not carried into the ACs.** AC-LR1 "auto at 21% … drains to 20%" and AC-LR3 "worker at 21%" fail as written at 30 (auto fires at once at 21%); AC-LR8 "call at 25%" starts already below 30; AC-LR15 "crosses 20%"; AC-LR17 "set it to 30 → 30%" now equals the default and no longer proves no hard-coding | Parameterise on A = `tc_autorefill_at_pct`: AC-LR1 A+1 → A; AC-LR3 A+1; AC-LR8 call at A+5 (−10 → A−5); AC-LR15 crosses A; AC-LR17 test a non-default value (e.g. 25 → "Uses a charge at 25%"); AC-LR19 (b) ≤ A; edges 3/7 and §3 "fires at 20% … 30→20%" text updated. §3 option A "Early whistle 20 → 30%" is now moot (PM Farm FYI) |
| LR5-2 | §4 gates (Scarcity, G4 bullets) | Stale bars contradict the ACs: Scarcity "per session ≥ flag-off" (retired by D3); G4 "P95 ≤ 180 … Open FAIL 230 vs 216" (superseded by D2) | Replace with pointers to AC-LR10 / AC-LR11 |
| LR5-3 | §4 D1, AC-LR12 | **No rule for how the band choice is recorded**, so QA can't know which bar to test. If the sweep picks the restore lever, AC-LR1/LR2/LR13 "worker at 100%" also change, and the lever has no tunable name | State: Econ records the sweep (review file + sha), the chosen lever as a named economy.csv tunable and value (e.g. `tc_autorefill_restore_pct`), and the bar (primary 85–97% / ≤ 1.00, or fallback 85–98% / ≤ 1.01 "known limit") under a HoP decision id; PMW then writes the single bar into AC-LR12 in the next rev and re-pins. QA tests only that pinned bar. If restore < 100 ships, AC-LR1/LR2/LR13 read "to restore %" |
| LR5-4 | AC-LR10 | Two P5 numbers in one line ("P5 ≥ 25% (P5 ≥ 20% at at_pct 30…)"); no CSV/harness pin | One bar at the shipping value: "P5 ≥ 20% at at_pct 30"; add CSV 8dc90e2b, share = F10–29 starved s ÷ sim s per seed (one 12 000 s session), Econ §2.1 metric |
**Record-only:** LR §6 still says "Econ to confirm it matches its harness metric": Econ §2.1 confirms `m5s.ts` = LR-G3 exactly → **LR-G3 CLOSED**, text stale. AC-LR9 evidence in §4 is the at-20 G1; Econ §1.4 has G1 PASS at 30 too (update cite). Econ pin `05f8e193` → `41e65491`.

### Results to flag (not testability gaps)
- **AC-LR12 currently FAILS at plain at_pct 30 under both bars.** Econ `41e65491` §1.3/§1.4: band 99.73–100.13% (> 98%), window guard 1.002 / 1.007 / **1.015** (casual > 1.01). So the 98% / 1.01 fallback alone does not pass at 30. D-HOP-2026-10-25-01's "fallback … M5.1 is not blocked" holds only if the sweep finds a lever that brings the band to ≤ 98% and casual's guard to ≤ 1.01. Owner: Econ (sweep), HoP (ruling if nothing passes).
- AC-LR11 PASS at 30 has 0 s margin on seller15 and casual worst; must be re-run with whatever lever the sweep picks (v0.8.1 says so).
- AC-LR10 per-seed "on ≥ off − 2 pp" at 30 is unreported (casual on ≥ off only 179/200 seeds). Econ to report the worst paired Δ at 30 (and with the lever).

### Remaining open items, by owner
| Item | Owner | Status |
|---|---|---|
| Pin `m4.flags.rc2Refill` = 1 flag-on trace hash (AC-FC16 (c) = AC-LR7 baseline) | HoE | At build (rc2 PR #8). Not a paper blocker |
| Emit `worker_state: unpaid` from the clock-wage branch | HoE | Open (Econ §3.1). Needs an AC (AC-FC15 or AC-FC4) when ruled |
| Do Asleep wage-drawers count in the auto-resume reserve? (tick.ts:62) | HoE | Open. If changed, Econ re-measures the AC-FC15 flip bounds |
| Flag-on AC7 trace re-pin (flag-off stays 19d4034d) | HoE/Econ | At build |
| `offline_min_s` row in economy.csv + sync mapping | Econ | **Still OPEN**: not a column in `product/economy.csv` (sha1 35672cfe). `engineering/sim-rules.md` L10 already names it |
| Band sweep at at_pct 30, chosen lever and bar pinned (LR5-3), AC-LR11 re-run with lever, AC-LR10 per-seed Δ | Econ (+ HoP) | Open |
| LR-G3 metric match | Econ | **CLOSED** (Econ §2.1) |
| FC-N6 sim-rules.md hidden-gap text | HoE | **CLOSED, verified**: `engineering/sim-rules.md` L10–13, L45, changelog L52 (23:30). Nit: L43 "none while Asleep" needs a clockWage flag-on note at build |
| Refill fit re-confirm at 360px with 208px | UI/Visual | Open (FC §7) |
| Text fixes FC5-1…4, LR5-1, LR5-2, LR5-4; Econ pin → 41e65491 | PMW | Open; QA re-checks on the next sha |

## Re-check 6 · 2026-10-25 01:58 CEST ([QA-D-1025-M51FC6]): failure cost v0.3.8, lighter Refill v0.8.2
Paper only. No messages sent.

**Hashes and snapshots (checked 01:57:10 CEST, re-checked 01:57, unchanged):**
- failure cost v0.3.8 = `e030ff1cc94d699fd481bb622ced1fa593cba89b` **MATCH** (live). Snapshot `/workspace/snap/failure-cost-v0.3.8-e030ff1c.md`.
- lighter Refill v0.8.2 = `c4a058f7ee41f99035b2870cebf9f871c4926678` **MATCH** (live). Snapshot `/workspace/snap/lighter-refill-v0.8.2-c4a058f7.md`.
- Diff bases: `scratch/…v0.3.7.md` = `48e75612…` and `scratch/…v0.8.1.md` = `420ae9d0…`, both match.
- **Econ evidence moved again.** At 01:52 Econ appended §9 (band sweep, in progress) to `m5.1-shipping-rerun-econ.md`. It is now `6fdb205bfb12836daf729e3884d193fd8cf6fdac`, so the `41e65491` both docs pin has no file on disk. §0–§8 are still lines 1–256 (the same length as `41e65491`; §9 starts at L257), and every figure the docs quote is still present. Snapshot `/workspace/snap/shipping-rerun-econ-6fdb205b.md`. Record-only (N6-1).

**Diff scope:** v0.3.7 → v0.3.8 and v0.8.1 → v0.8.2 change only the re-check 5 items listed below, plus the header, §7 open items, changelog, an LR §6 KPI line re-pointed to the AC-LR10 bars, and the UI/Visual 208px full-row PASS citation. No other AC text moved. Both docs pin `41e65491` throughout (7 hits each), with 0 hits left for `05f8e193`.

### Re-check 5 items
| Item | Status | Evidence |
|---|---|---|
| FC5-1 | **FIXED** | AC-FC13 constant width: "That sweep measured … at the then min-width 203px (`sweep.mjs` L17) … 0.42 px. At 208px … 5.42 px"; UI/Visual 208px full-row PASS cited (`art-ux/reviews/m51-clock-wage-fit-30b29d3.md` L199, 23:37; `cw4.mjs` exists) |
| FC5-2 | **FIXED** | AC-FC15 lists the broke-trickle setup (Econ §3.3 C: 1,800 s, CH Asleep, MH Working, 0 coins, drip 2/3 CH wage every 30 s, clock on, CSV path + sha256) and the neglect setup (§3.2 `CFG=neglect`, seeds 1–200, 3 profiles, per 30-min window); FC-R4 points there |
| FC5-3 | **FIXED** | AC-FC6 is split into (a) held map Tired + Asleep, ≤ τ (operative); (b) strict clauses, definitional, tested as written; (c) Unpaid out of the map, tested as a transient via AC-FC4 entry + AC-FC15 flip bounds. Consistent with §3 and Econ §4 |
| FC5-4 | **FIXED** | AC-FC17 (b): natural width = button width with `min-width` removed, as `scratch/fcn8-remeasure/sweep.mjs` `natural` (L15–16: clone of `.wk .btn.manage`, label set, `getBoundingClientRect().width` after `fonts.ready`). **The path exists**, and L15–16 do exactly that. Note N6-3 |
| R5-1 | FIXED | §3 "Operative checks" + AC-FC6 (a)/(b) |
| R5-2 | FIXED | FC-R5 CONFIRMED (Econ §3.3 B) |
| R5-3 | FIXED | §7 HoP D2 records AC-LR11 PASS at 30, band pending |
| R5-4 | FIXED | Both docs on `41e65491` (then superseded by Econ's 01:52 append, N6-1) |
| LR5-1 | **FIXED** | AC-LR1 (A+1 → A; 31 → 30), AC-LR3 (A+1; 31%), AC-LR8 (A+5 → A−5; 35 → 25), AC-LR15 (crosses A), AC-LR19 (b) (≤ A), edges 3 and 7, §3 C2 rationale; **AC-LR17 tests 25** ("Uses a charge at 25%", "no hard-coded 30"). A grep for 20/21/25% finds only history (§1 retired SC8, §3 struck "Early whistle", §4 "was 20", the at-20 G1/AC-LR11 evidence) and AC-LR8's A−5 = 25. AC-LR4's 5% is threshold-independent. All other ACs (LR2, LR5, LR13, LR14, LR16, LR18) have no energy threshold |
| LR5-2 | **FIXED** | §4 Scarcity → AC-LR10, G4 → AC-LR11; the retired bars are gone; G1 at 30 added (Econ §1.4, matches) |
| LR5-3 | **FIXED** | §4 "Band-sweep record": (1) Econ records the sweep (review file + sha1), the winning lever as a named economy.csv tunable + value, and the chosen bar (85–97% / ≤ 1.00 or 98% / ≤ 1.01 known limit) under a **HoP decision ID**; (2) PMW writes **that single bar** into AC-LR12 in the next rev and re-pins, and **QA tests only that pinned bar**; (3) restore < 100% changes AC-LR1/2/13; (4) AC-LR11 re-run with the lever must add 0 s. AC-LR12 points to the rule. Note N6-4 |
| LR5-4 | **FIXED** | AC-LR10: one bar (on median ≥ 30%, **P5 ≥ 20%** at 30; off median ≥ 15%; paired per seed on ≥ off − 2 pp), metric Econ §2.1 / `m5s.ts`, F10–29, one 12 000 s session per seed, CSV path + sha256 |
| LR record-only | FIXED | LR-G3 CLOSED in §6 (Econ §2.1); AC-LR11 at-30 cite corrected §1.2 → §1.3 |

**AC-FC17 (b) check:** the method is now deterministic (natural width with min-width removed, ≤ 204 px; plus 208 ± 0.5 px, `scrollWidth ≤ clientWidth`, 1 line, 3 engines × 360/390/1280, after `fonts.ready`, all 601 labels).

### PMW's claims
1. **`data/economy.csv` does not exist** in `/workspace/egg-farm-studio`: **TRUE** for this workspace. (Game-repo checkouts such as `/workspace/wt-m41-patch1/data/economy.csv` do have one; that is the build's runtime CSV, not the M5.1 draft.) **8dc90e2b is the sha256 of `scratch/v2-econ/economy.m50-draft.csv`**: **TRUE** (`8dc90e2b36ae…8378996b`). My earlier "CSV 8dc90e2b" references (G5-P recount, AC-P14-CI, the test plans, re-checks 5–6) all mean this draft by its sha256 prefix. No QA file calls it a sha1 or points it at `data/economy.csv`, so they are **consistent**. Side note: Econ's "`product/economy.csv` stays c7bb783f" is that file's sha256 (`c7bb783f…8b44`); re-check 5 quoted its sha1 `35672cfe`. Same file, different algorithm.
2. **AC-LR10 notes the per-seed paired Δ at 30 is owed by Econ**: **TRUE** ("per-seed paired Δ at 30 not yet reported (Econ)").

### Verdicts
- **Failure cost v0.3.8: TESTABLE.** No QA fixes outstanding.
- **Lighter Refill v0.8.2: TESTABLE.** No QA fixes outstanding. AC-LR12 can't be run until Econ and HoP pin the bar under the §4 rule; that is a pending input with a defined path, not a gap. Its current result is FAIL at plain 30 under both bars.

### Record-only (no re-check needed)
- **N6-1** Econ: the shipping re-run file is edited in place, so each pin dies with the next append (`05f8e193` → `41e65491` → `6fdb205b`). Ask Econ to keep frozen per-revision copies, or PMW to re-pin `6fdb205b` (or later) in the next rev. Figures are unchanged.
- **N6-2** The historic changelog entries v0.3.7 (FC) and v0.8 (LR) were rewritten from `05f8e193` to `41e65491`. The v0.3.8 / v0.8.2 entries explain the change, but history should stay as written. D-HOP-2026-10-25-01 and D-PMW-2026-10-25-01 in `product/decisions.md` still cite `05f8e193` (HoP / PMW log).
- **N6-3** At build, `min-width:208px` will be in the stylesheet, so a clone of `.wk .btn.manage` inherits it. The natural-width probe must set the clone's `min-width` to `0`/`auto` explicitly. (The 30b29d3 sweep had no stylesheet min-width.) QA puts this in the test plan.
- **N6-4** `product/economy.csv` is frozen until Vadim says go (Econ). So the lever's "named economy.csv tunable + value" can only be recorded in Econ's review + the HoP decision now, and lands in the CSV with the kickoff batch (like `offline_min_s`). QA pins the bar from the doc revision.

### Sweep status (Econ §9, informational)
Lever (a), the auto restore %, is out on casual: ARES 90 gives band 99.22% (fails even the fallback), and ARES 80 fails D2 (worst 232 vs 219, P95 189 vs 180). Levers (b) `charge_regen_s` and (c) max charges are pending. Plain 30 still fails both band bars.

### Open items, by owner (none block TESTABLE)
| Item | Owner |
|---|---|
| Band sweep levers (b)/(c); record winning lever + bar under a HoP decision ID (§4 rule); AC-LR11 re-run with the lever (+0 s) | Econ, then HoP ruling |
| If no lever passes either bar: ruling (the 98% / 1.01 fallback also fails at plain 30) | HoP |
| AC-LR12 single bar written in + doc re-pinned | PMW (after the above) |
| AC-LR10 per-seed paired Δ at 30 (and with the lever) | Econ |
| `offline_min_s` row + sync mapping: queued for the M5.1 kickoff CSV batch (`product/economy.csv` frozen until Vadim's go) | Econ (open, not a blocker) |
| Frozen per-revision copies of the shipping re-run / re-pin `6fdb205b` | Econ / PMW (record) |
| Pin `m4.flags.rc2Refill` = 1 flag-on trace hash (AC-FC16 (c) = AC-LR7 baseline); flag-on AC7 re-pin | HoE (at build) |
| `worker_state: unpaid` from the clock-wage branch (+ AC); asleep-in-auto-resume-reserve rule (re-measure flip bounds if changed) | HoE |

### Re-check 6 addendum · 2026-10-25 02:45 CEST: AC-LR10 per-seed bar (D-HOP-2026-10-25-05 + 02:38 addendum)
**Live docs (sha1 at 02:38):** failure cost v0.3.8 `e030ff1c…` (unchanged). **Lighter Refill is now v0.8.3 `7f720e65d3977dc65045ebaa293e55d0ab6fe6bf`** (02:37), snapshot `/workspace/snap/lighter-refill-7f720e65.md`, backup of v0.8.2 at `scratch/…v0.8.2-c4a058f7.bak.md`. v0.8.3 records B3 (AC-LR12 parity ≤ 100.5% + guard ≤ 1.02, K-W1), the new AC-LR10 bars (i)/(ii), K-W2, and pins Econ `2cd50d95` (frozen copy present). Econ now keeps frozen per-revision copies (`reviews/m5.1-shipping-rerun-econ.<sha8>.md`, incl. `41e65491`), so **N6-1 is resolved**. The live Econ file is `9b918dff` (§9.5 (ii) result appended after `2cd50d95`).

**Independent recompute** from Econ's per-seed dumps: `scratch/m51-ship/out/ps-at30.auto.{p}.json` (on) vs `ps-clk1.base.{p}.json` (flag-off, clock on), column `sc29`, paired by seed, 200/200 seeds each.
| Profile | (i) on ≥ off − 2 pp | (i) ≥ 90% | worst gap | (ii) min on share | seeds < 15% | (ii) |
|---|---|---|---|---|---|---|
| optimal | 196/200 = 98.0% | PASS | −8.7 pp (s80) | 19.89% (s134) | none | PASS |
| seller15 | 195/200 = 97.5% | PASS | −9.9 pp (s172) | **12.52% (s148)** | s148 | **FAIL** |
| casual | 185/200 = 92.5% | PASS | −19.6 pp (s148) | **12.04% (s148)** | s148, s116 (14.21%) | **FAIL** |
This matches Econ `out/minon-at30.json` and §9.5 exactly. On medians 36.5 / 35.7 / 35.1% (harness quantile 35.0 on casual).

**v0.8.3 text vs facts:** AC-LR10 says "(ii) PENDING Econ verification", but Econ §9.5 and the HoP 02:38 addendum already record (ii) **FAIL** on seller15 and casual, with a conditional ruling (A) floor 12% + K-W2, or (B) fix and keep 15%. PMW's next rev must record the (ii) result and the branch HoP applies. AC-LR10 stays measurable either way: (i) and (ii) are numeric, per profile, seeds 1–200, CSV pinned.

**Defect check on the worst seeds (step 3).** I re-ran the seeds on Econ's harness (a temporary instrumented copy of `h2/m5s.ts`, measurement-only counters, same config as `m5sx` `CFG=base` vs `CFG=auto`, AT 30, RES 0, REST 0, CLOCK 1, MANAT 32, T 12 000, CSV 8dc90e2b). It reproduces Econ's `sc29` to 5 decimals (casual s148: 0.31686 / 0.12042). The probe files were removed afterwards. F10–29 window figures:
| Seed | cfg | starved | charges at cap | charges 0 | refills F10–29 | mean energy at refill | min energy | Tired worker-s | bb5 / t29 / income |
|---|---|---|---|---|---|---|---|---|---|
| casual s148 | off | 31.7% | 18.7% | 30.5% | 10 | 35.6 | 28.1 | 37 | 57 / 1474.8 / = |
| | on | 12.0% | 24.3% | 12.8% | **8** | 29.8 | 30.0 | 0 | identical |
| casual s116 | off | 29.1% | 20.5% | 42.7% | 10 | 41.4 | 30.1 | 0 | 219 / 1689.6 / = |
| | on | 14.2% | 32.0% | 18.7% | **8** | 30.0 | 29.9 | 1 | identical |
| seller15 s148 | off | 21.2% | 13.8% | 36.6% | 10 | 38.8 | 30.5 | 0 | 105 / 1510.9 / = |
| | on | 12.5% | 24.5% | 15.9% | **8** | 28.9 | 30.0 | 0 | identical |
| optimal s134 (min, passes) | off / on | 3.3 / 19.9% | 14.4 / 33.6% | | 9 / 7 | 44.6 / 30.0 | | 0 / 0 | identical |
| controls casual s1, seller15 s1 | on > off (40.4 vs 23.0 / 30.0%) | | on cap 25.8 / 28.2% vs 12.4 / 14.9% | | 10→9 | | | | identical |

**Findings:**
- **No logic bug and no harness miscount found.**
  - Auto fires at energy ≤ 30 exactly (min energy 30.0 when charges are available; below 30 only while charges are 0).
  - The charge histogram sums to 1; regen stops at cap per the rc2 rule; each refill decrements one charge.
  - The starved predicate (`#(hired, not Paused, not Unpaid, energy ≤ 50) > charges`) is the LR-G3 definition.
  - Both configs give identical play: G4 bb5, t29 and F10–29 income match to the cent on these seeds. Output only differs in the Tired band, which neither config enters here.
- **Mechanism.** The low on-share is **not** "earlier refills". Auto refills **later** (at 30 vs the manual bot's ≤ 32 / ≤ 50-at-cap) and therefore **fewer times** in the window: 8 vs 10, or 7 vs 9 on optimal s134. So charges sit idle at the cap (regen wasted) 24–32% of the window vs 14–21% for the manual bot. With 1–2 charges held, the workers in the 30–50% band rarely outnumber charges, so few ticks count as starved.
  - The same pattern (fewer refills, more cap time) appears on every seed probed. The share drops below off only where, on that seed, the manual bot's at-cap ≤ 50% spending kept charges at 0 for long stretches.
  - The F10–29 window is short (~1,415–1,690 s), so a 2-refill difference moves the share by 10–20 pp.
- **HoP (A) conditions:**
  - no new dead zone: met (bb5 identical);
  - no AC-LR11 impact: met (identical worst stretches);
  - no neglect payoff: met (per-seed F10–29 income 100.0% of manual on s148/s116). The per-seed window guard was not computed (NOWIN runs); the profile guard is 1.007 / 1.015 ≤ 1.02.
- **But the mechanism differs from (A)'s wording** ("earlier refills keep workers topped up"). It is later, fewer refills with charges idle at cap, i.e. scarcity is lower on these seeds because auto under-spends supply in that window. QA does not class it as (B): not a harness artifact or logic bug. It is not a clean (A) either. Under D-HOP-2026-10-25-05 "anything else comes back to me", **this is HoP's call.** QA can test whichever floor is ruled (15% or 12% with named seeds).

## Re-check 7 · 2026-10-25 02:50 CEST ([QA-D-1025-M51FC7]): failure cost v0.3.9, lighter Refill v0.8.4
Paper only. No messages sent.

**Hashes and snapshots:**
- failure cost v0.3.9 = `8d212d8bd7a0b86a693503d0b548a7ad33814801` **MATCH** (live, 02:38:49). Snapshot `/workspace/snap/failure-cost-8d212d8b.md`. Backup of v0.3.8 = `e030ff1c` MATCH.
- lighter Refill: v0.8.3 `f1202ac9136019c58b2d5ea139aaa80af3e79ac4` MATCH (snapshot at 02:40:43; PMW backup `scratch/…v0.8.3.md` = `f1202ac9`). It was then superseded live by **v0.8.4 = `a2798d3ae85630f4e54642d4cf07aa9200fd21f0`** (02:41:06), snapshot `/workspace/snap/lighter-refill-a2798d3a.md`. Reviewed version: v0.8.4.
- **7f720e65 was a transient live state, not a wrong hash.** At 02:38 I ran `sha1sum` on the live file (mtime 02:37:32), and it returned `7f720e65d3977dc65045ebaa293e55d0ab6fe6bf`. The snapshot copied then (`/workspace/snap/lighter-refill-7f720e65.md`) still hashes to `7f720e65…`. Diff `7f720e65` → `f1202ac9` is **one line**: the v0.8.3 changelog wording ("'pending sweep' / 'TBD' status removed" → "sweep-pending band status removed everywhere…", "Bare CSV 8dc90e2b cites" → "Bare draft-CSV hash cites"). So `7f720e65` was the live v0.8.3 from 02:37:32 until PMW's in-place changelog edit at 02:38:49, which produced `f1202ac9`. PMW kept no backup of it; QA's snapshot is the only copy.

**Diffs (only the claimed changes):**
- lighter Refill `f1202ac9` → `a2798d3a`: header (v0.8.4 entry) + AC-LR10 + new changelog line. `c4a058f7` → `a2798d3a` hunks: header; §3 C2 rationale (B3/K-W1); §3 Option A → M5.2; §4 D1 + Band-sweep record (B3, levers failed); §6 LR-G3/KPI pins; AC-LR9–12; §8 AC-LR11 note; changelog. All are claimed in the v0.8.3/v0.8.4 entries.
- failure cost `e030ff1c` → `8d212d8b` hunks: header/status ((1) met), FC-R5 and §3 τ pins, §4 table + B-5 contrast, AC-FC6 and AC-FC15 CSV cites, §7 Art/Econ/HoP, changelog. All are claimed in v0.3.9. No AC logic changed.

**Econ pins:**
- Every current Econ cite is `2cd50d95` (6 in each doc). Frozen copies exist as `reviews/m5.1-shipping-rerun-econ.<sha8>.md` (`2cd50d95`, `41e65491` and 6 others, each hashing to its name). No cite to `05f8e193`/`6fdb205b`/`9b918dff`.
- Diff `41e65491` → `2cd50d95`: the 02:05 correction changed only §1.3 income/starved columns (rows L73–75 and the at-25 rows), the §2.2 table + correction note, the §2.2 proposed-target text, §2.3 table and §8 D3 text; §9 was added.
- Every place that still cites `41e65491` as "unchanged" is correct:
  - FC: §3.2, §3.3, §4;
  - LR: §2.1 (LR-G3 / AC-LR10 metric), §1.2 (AC-LR11 at 20), §1.3 "worst/P95 columns identical" (true: only the income and starved columns moved).
- The historical changelog cites point to the frozen copy, which is correct for what was read then.

**CSV:** `sha256sum scratch/v2-econ/economy.m50-draft.csv` = `8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b`, **MATCH**. Both docs carry the full hash with the path at every current cite (LR 5, FC 3). The only abbreviated `8dc90e2b…996b` left is in each doc's re-check-5 changelog entry (history). No bare `8dc90e2b` remains.

**AC-LR12 (single bar):** parity = harness median auto-only F10–29 income ÷ best-manual median ≤ 100.5%, and window guard P95 auto/manual ≤ 1.02, per profile, seeds 1–200, GROSS (net diagnostic, flag > 0.5 pp), known limit K-W1 quoted. The old bars are struck as superseded. Figures 100.01 / 99.73 / 100.14% and 1.002 / 1.007 / 1.015 match Econ `2cd50d95` §1.3 (corrected) and §1.4. **Testable.**

**AC-LR10 (v0.8.4):**
- **12% floor:** stated (D-HOP-2026-10-25-05 addendum 02:42).
- **Named seeds:** s148 (seller15, casual) and s116 (casual) are in the AC and in K-W2.
- **Per-seed guard condition:** "P95 ≤ 1.02 … computed by QA … any guard > 1.02 returns to HoP".
- Figures match §9.5 and QA's recompute (i) 196/195/185 = 98/97.5/92.5%; (ii) min 19.9 / 12.52 / 12.04% (+ s116 14.21%) → (ii) PASS at 12%.
- **Testable.**

**Per-seed window guard (D-HOP 02:42 condition), computed by QA:**
- **Method:** Econ's **unmodified** driver `h2/m5sx.ts` (no copy needed), the same config as `g1-at30` (`AT=30 CLOCK=1 RES=0 REST=0 MANAT=32 CFG=base WIN=man,auto,idleA`), one seed each (`PROFS=<p> S0=<seed> SEEDS=1`). Outputs went to /tmp and were deleted.
- **Window definition:** 600 s windows from the manual run's snapshots every 300 s, F10 → max; guard = P95 of auto/man.

| Seed | windows | guard P95 (auto/man) | max | median | ≤ 1.02 |
|---|---|---|---|---|---|
| seller15 s148 | 5 | **1.000** | 1.000 | 1.000 | PASS |
| casual s148 | 5 | **1.003** | 1.003 | 1.000 | PASS |
| casual s116 | 6 | **1.005** | 1.005 | 1.000 | PASS |
| (control casual s1) | 5 | 1.000 | 1.000 | 1.000 | — |

With 5–6 windows per seed, P95 = max. All three are ≤ 1.02, so the condition holds and nothing returns to HoP.

**Contrast 12.53 / 2.87:**
- **Source:** `art-ux/decisions.md` 02:00 HoAUX ("asleep name/state line goes from 2.87 to 12.53:1 (not 2.94 and 12.71)") and `art-ux/m4.1-ui-minors.md` L94–99, L124.
- **QA recompute (WCAG 2.x):**
  - #3E2C23 on #FFF8EE = 12.53:1;
  - the 50% composite #9F9289 on #FFF8EE = 2.87:1 (my own 50% mix #9E9288 gives 2.88);
  - on #FFFFFF 13.21.
- FC v0.3.9 §4 table, B-5 and §7 match. **Verified.**

### Verdicts
- **Failure cost v0.3.9 (`8d212d8b`): TESTABLE.**
- **Lighter Refill v0.8.4 (`a2798d3a`): TESTABLE.**

### Text nits for PMW's next rev (no re-check needed)
- **LR status line:** still says "(ii) pending Econ verification".
- **AC-LR10:** "Guard on s148/s116 pending QA's test" → record QA's values 1.000 / 1.003 / 1.005 (PASS).
- **FC §7 HoP D3:** still says "(ii) PENDING Econ verification", with the 15% floor (v0.3.9 predates 02:42) → 12% PASS, K-W2 seeds.

### Open items
| Item | Owner |
|---|---|
| Fold the three nits above (12% floor / guard values) into the next revs | PMW |
| M5.2 steadier pressure metric (e.g. starved s per worker-hour, longer window) before any new bar | PMW + Econ |
| `offline_min_s` row + sync mapping: M5.1 kickoff CSV batch (CSV frozen until Vadim's go) | Econ (not a blocker) |
| rc2Refill flag-on trace hash (AC-FC16 (c) = AC-LR7 baseline); flag-on AC7 re-pin | HoE (at build) |
| `worker_state: unpaid` from the clock-wage branch (+ AC); asleep-in-auto-resume-reserve rule | HoE |
| Record correction: 7f720e65 was a real transient v0.8.3 state (02:37:32–02:38:49), superseded in place by f1202ac9 | Parent / PMW record |

## Spot-check: text fixes, lighter-refill v0.8.6 / failure-cost v0.3.11 (2026-10-25, Europe/Budapest)
- **Hashes:** `m5.1-lighter-refill-proposal.md` is 1e414854ceb6ca7c41d14c0c1bee22aba629a88c; `m5.1-worker-failure-cost-proposal.md` is 5651632e612493f1fa9de2f6a88bef466f688bd3. Both **MATCH**.
- **Snapshots:** `/workspace/snap/lighter-refill-1e414854.md`, `/workspace/snap/failure-cost-5651632e.md`.
- **Word-diff vs a0b580cc (LR):**
  - the status line now reads "AC-LR10 RULED and PASS (… (i) ≥ 90% of seeds, (ii) 12% floor, s148/s116 guard ≤ 1.02 PASS)";
  - in AC-LR10, "Guard on s148/s116 pending QA's test" becomes "seller15 s148 1.000, casual s148 1.003, casual s116 1.005, all ≤ 1.02: PASS";
  - there are v0.8.6 changelog lines.
- **Word-diff vs 580b31ea (FC):**
  - §7 D3 reads "(ii) no seed's on share < 12% (02:42 addendum; was 15%): PASS (lowest 12.04%), with per-seed guard … 1.000 / 1.003 / 1.005 ≤ 1.02";
  - K-W2 is extended to name s148 (seller15, casual) and s116 (casual), and "AC-LR10 closed";
  - there are v0.3.11 changelog lines.
- **No AC, bar or number changed.** The AC count is the same, and the figures match re-check 7. All three re-check-7 nits are closed.
- **Verdicts:** both remain **TESTABLE**. No message to PMW.
