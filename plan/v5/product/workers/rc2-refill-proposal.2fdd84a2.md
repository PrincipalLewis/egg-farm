# rc2 Refill redesign proposal (PM, Workers) v1.3, 2026-10-30 12:49 CET (errata; old header text: "v0.3, Oct 16 2026", which predated the v1.0–v1.2 content below)
Source: the Game Critic's rc1-pt1 review, which found three Refill buttons on screen and Refill needing no decision. Head of Product asked for a single entry point and a real decision, built on Pause and the abilities.

## Problem
Today Refill appears on each worker card, as the Farm View pill and as the Refill nav button. "Refill tired (N)" refills every tired worker in one tap. Refill is free and only on a 30 s global cooldown, so the right move is always "tap when it lights up". That's a chore, not a choice.

## Proposal
1. **One entry point.** The Refill nav button opens the Shift sheet. Per-card Refill buttons and the Farm View pill are removed. Cards keep their energy bar and state banner, and tapping a card opens the Shift sheet focused on that worker. Bulk "Refill tired (N)" is also removed. Activate-all for abilities moves into the sheet header.
2. **Refill charges.** Refill uses charges.
   - Each charge restores one worker to 100%.
   - Charges regenerate 1 per 60 s up to a cap of 3. Charges don't regenerate offline, and none are granted offline.
   - Refill can still only be used on a worker at ≤40% energy, and asleep workers can be refilled. The 30 s global cooldown is removed, because the charges replace it.
3. **The decision: who gets the charge.** The sheet lists workers sorted by income at risk, and each row shows three things:
   - energy %, plus time until Tired and until Asleep
   - $/s lost if the worker falls asleep, read from the incomePerSec selector
   - its ability's cooldown
   Each row has three actions:
   - **Refill** (uses 1 charge).
   - **Rest**, which is Pause (free). The worker recovers at 0.25× drain, earns nothing and pays no wage.
   - **Boost**, which uses the ability (30 s, 5 min cooldown).
   - Combo rule: Boost on a worker refilled within the last 10 s lasts 45 s instead of 30 s. That rewards timing Refill and Boost together on your best earner.
4. **Why it's a real choice.** Four workers drain about 0.44 refills per minute at a 40% threshold, against a supply of 1 per minute. The supply covers an attentive player. But after a few minutes away you come back to several tired workers and at most 3 charges. Then you choose:
   - Refill the Grader, the highest $/s at risk.
   - Rest a low-value W1, whose wage roughly equals its value for an active seller.
   - Spend Boost on whoever you just refilled.
5. **Telemetry.**
   - refill_used {worker, energy_pct, charges_left, rank_by_risk} *(fields extended in v1.3 Telemetry below)*
   - rest_toggled *(fields in v1.3 Telemetry below)*
   - boost_used {combo: bool}
   - ~~shift_sheet_opened {entry: nav|card}~~ shift_sheet_opened {entry: nav|card|stall_chip, sheet_id, stall_id?} (v1.3)
   - charges_capped_s (session total of time spent at the cap, i.e. wasted regeneration)

## Tunables (for Economy to model)
| Tunable | Proposed | Range |
|---|---|---|
| charge_regen_s | 60 | 30–120 |
| charge_cap | 3 | 2–4 |
| refill_threshold | 40% | 30–50% |
| combo_window_s | 10 | 5–15 |
| combo_boost_duration_s | 45 | 30–60 |

## ACs
- AC-RF1: Exactly one Refill entry point is on screen: the nav button. No per-card or Farm View Refill controls exist, as checked by a DOM scan at 360 and 1280.
- AC-RF2: A refill restores exactly one worker and uses 1 charge. With 0 charges the button is disabled and shows "Next charge in Ns". *(Label, name, disabled-state and width text superseded by v1.3 below.)* Charges regenerate at charge_regen_s up to charge_cap, and don't regenerate offline.
- AC-RF3: Rows are sorted by $/s at risk, descending, and the value shown matches incomePerSec within ±$0.01.
- AC-RF4: Boost on a worker refilled within the last combo_window_s lasts combo_boost_duration_s. Otherwise it lasts 30 s.
- AC-RF5 (sim, seeds 0-99, 4 models):
  - AC-W1 to W7 pass.
  - The F22-24 managed/unmanaged ratio is ≥1.5, and the CEO's 2x cap holds on the worst seed.
  - A managed player makes ≥3 Shift actions per 15 min (this raises AC-W5).
  - Among managed players, at least 25% of refills go to a worker other than the lowest-energy one, which is the proxy for a real decision.
- AC-RF6: A tired worker that gets no refill is never permanently stuck. With 0 charges, a Rested worker still recovers on its own.

## Open questions for Head of Product
- This removes bulk refill, which some casual players may miss. The alternative is to keep "Refill all" but have it cost one charge per worker.
- Does the 40% threshold still pull its weight once charges are scarce?

## v0.2 (Oct 16): Head of Product's calls
- **Refill all stays.** It lives in the Shift sheet header and spends one charge per eligible worker (≤40%). Workers are refilled in descending $/s at risk, so if charges run out, the lowest-risk workers are skipped. The button reads "Refill all (N)", where N = min(eligible, charges).
- **The 40% threshold stays as the tunable default.** Change it only if Economy's sweep finds a dead zone or an idle loss above 10%.
- AC-RF7: With 4 eligible workers and 2 charges, Refill all refills exactly the top 2 by $/s at risk, spends 2 charges, and leaves the other 2 untouched. With 0 charges it's disabled and shows "Next charge in Ns".
- AC-RF8 (sim): at refill_threshold 40%, there's no dead zone (no stretch over 2 min where a managed player has a tired worker and charges but can't act), and idle loss vs the current rc1 is ≤10%. If either fails, the sweep reports the threshold that passes.
- AC-RF5's 25% decision proxy is measured on single-row refills, with Refill all excluded.

## v0.3 (Oct 16): response to Claude Design Reviewer (claude-review/rc2-refill-2026-10-16.md). These rules supersede earlier ones where they conflict.
- **MJ1 (scarcity):** defaults change to charge_regen_s 90 (0.67/min) and charge_cap 2, with a sweep range of 90–150 s and a cap of 2–3. Normal play needs 0.33–0.44/min, and Focus play needs about 0.67/min. So Focus players and anyone returning from a break run short, and the choice of who to refill is real. AC-RF5's 25% proxy (single-row refills not going to the lowest-energy worker) is the gate. If it fails, regen slows.
- **MJ2 (combo):** combo_boost_duration_s is capped at 45 s (range 30–45). The combo is in the AC-RF5 worst-seed check against the 2x cap.
- **MJ3 (definitions):**
  - Offline: workers do nothing offline. Energy and charges are frozen, and ability cooldowns keep ticking in real time (the locked M4 rule).
  - Hidden tab: under 60 s it's simulated normally on return, matching Collection's catch-up rule. At 60 s or more it's offline.
  - Rest: Refill on a resting worker (≤40%) is allowed and ends Rest. Boost on a resting worker is blocked, shown as "Paused".
  - "$/s at risk": the worker's net contribution, meaning its share of incomePerSec minus its wage. For the Grader, it's the 85% of its bonus that it loses when asleep.
  - Sort order: descending $/s at risk. Ties go to lower energy first, then worker order W1→W4.
- **Minor fixes:**
  - The ≤40% state is renamed "Refillable", and "Tired" stays 1–29%.
  - Resting W1 forever amounts to firing it at break-even, which is accepted under the earlier decision (seller15 break-even).
  - The stale problem-statement line is updated.
  - New telemetry event: refill_all_used {eligible, charges_spent, skipped}.
- **ACs rewritten to be testable:**
  - AC-RF1: a DOM scan at 360 and 1280 finds no Refill control outside the Shift sheet and the nav button.
  - AC-RF6: a resting worker with 0 charges goes from 0% to 100% within 100 ÷ (0.25 × drain rate) seconds, ±2 s.
  - AC-RF8 dead zone: a stretch over 2 min where a managed player has a Refillable worker and ≥1 charge but no refill happens. The sim logs these and the count must be 0.
  - AC-RF5 and RF8 are pending Economy's full sim.

## v0.3a (Oct 16 22:46): Head of Product reverses the Refill all call
- **"Refill all" is dropped,** because it brings back the rc1 chore. This removes the v0.2 Refill-all rules, AC-RF7 and the refill_all_used telemetry event.
- Every refill now goes through a single row, and AC-RF5's 25% proxy applies to all refills.
- Supply must stay below demand: Economy tunes regen and cap so that a managed player regularly has more Refillable workers than charges.
- Activate-all for abilities is unchanged.

## v0.4 (Oct 16 22:55): tuned with Economy's results (product/workers-refill-v03-economy.md, 100 seeds)
- charge_regen_s is 150 and charge_cap is 2. This was the only combination that passed every gate.
- A managed player has more Refillable workers than charges 30% of the time (casual players 29%, against a target of ≥20%). AC-RF5 and AC-RF8 pass, and there are no dead zones.
- The worst-seed active/idle ratio with the 45 s combo is 1.88, and income moves by at most ±0.1% vs rc1.
- Still to do, from Economy: re-run AC-W1–W7 at these settings, exercise the offline and hidden-tab freeze, and confirm per-worker risk shares from the live sim instead of fixed estimates.

## v0.5 (Oct 16 23:20): pick after the staggered-worker sim (workers-refill-v04-economy.md, P95, 100 seeds)
- **Settings:** charge_regen_s 150, charge_cap 2, refill_threshold 50%. The "Refillable" state is now ≤50%.
- **Results:**
  - AC-RF5 (revised: the best refill isn't the lowest-energy worker) is 46% for managed and 8% for casual.
  - The shortage share is 66–68%.
  - RF8: the worst-seed loss is -2.8%.
  - 2x cap: P95 is 1.80 and the worst seed is 1.88.
  - Income is -0.3% vs rc1.
- **Rejected:** 240 s with cap 2 (worst-seed casual loss -14.9%) and 150 s with cap 1 (RF5 at 5%).
- **Note:** the sim always picks the best refill, so the real pick rate comes from refill_used.rank_by_risk telemetry after launch.

## v1.0 APPROVED (Head of Product, Oct 16 23:20): regen 150 s, cap 2, threshold 50%. Refill all is dropped. The combo is ≤45 s. ACs RF1–RF6 and RF8 apply, with RF5 revised.

## v1.1 (Oct 16 23:30): final ACs after QA's testability review (qa/m3-recheck/rc2-specs-testability.md). These rules supersede all earlier AC text.
Constants: charge_regen_s 150, charge_cap 2, refill_threshold 50%, combo_window_s 10, combo_boost_s 45, drain 9 s per 1%, and Rest recovery 0.25× drain (36 s per 1%).

**Labels**
| Energy | Label |
|---|---|
| 51–100% | none (Rested) |
| 30–50% | "Refillable" |
| 1–29% | "Tired" |
| 0% | "Asleep" |

Unpaid and Paused workers show their own labels.

**$/s at risk**
- Function: workerAtRisk(state, balance, worker), in src/econ/income.ts next to incomePerSec.
- Formula: incomePerSec(state) − incomePerSec(state with that worker set to Asleep). This one counterfactual covers every worker type: the Grader's retained 15% and wage handling both come out automatically.
- Display: "$X/s at risk", using the normal money format.
- It's exposed in debug.

**Debug setters (Engineering must add these under ?debug=1)**
- Set a worker's energy and state.
- Set charges and the regen timer.
- Simulate a hidden tab or offline for N s.
- Set Rest on or off.
- Reset the nudge.
- Read workerAtRisk.

**ACs**
- AC-RF1: No element with role button or link whose accessible name matches /refill/i exists outside the Shift sheet or the nav button. Checked at 360, 1024 (docked) and 1280.
- AC-RF2: A refill restores exactly one worker to 100% and uses 1 charge. *(Label, name, disabled-state and width text superseded by v1.3 below.)*
  - With 0 charges, the button is disabled (the disabled attribute or aria-disabled="true") and reads "Next charge in {ceil(s)}s", updating every 1 s.
  - Charges come back +1 every 150 s ±1 s, up to 2.
  - Charges and the regen timer are frozen offline or when the tab is hidden ≥60 s. A hide under 60 s is simulated normally.
  - For a worker above 50%, the button is disabled and reads "Rested, refill below 50%".
- AC-RF3: Rows are sorted by workerAtRisk, descending. Ties go to lower energy first, then W1→W4. The value shown matches the debug value within ±$0.01.
- AC-RF4: A Boost started ≤10.0 s after a refill lasts 45 s ±0.5 s. One started at ≥10.1 s lasts 30 s ±0.5 s. Boost on a resting worker is disabled and reads "Paused".
- AC-RF5 (sim, seeds 0–99, staggered start):
  - For the managed model, at least 25% of single-row refills are cases where the top-ranked worker isn't the lowest-energy one. This is the mean over seeds, and v0.5 measured 46%. The casual model is exempt.
  - The F22–24 ratio is ≥1.5.
  - The 2x cap is judged under Head of Product's logged exception: P95 ≤2.15x at F22–24 and the worst seed ≤2.25x.
  - AC-W1–W7 must be re-run at the 50% threshold. Economy is doing this.
- AC-RF6: A Resting worker, including one that's Asleep, goes from 0% to 100% in 3600 s ±2 s with 0 charges. That's 60 min, which is intended: Rest is slow by design.
- AC-RF8 (sim, threshold 50%): there are 0 dead zones per model on every seed, and the worst-seed idle loss vs rc1 is ≤10%. v0.5 measured -2.8%.
- **Telemetry:** refill_used, rest_toggled, boost_used and shift_sheet_opened are added to the pinned, never-trimmed set.

## v1.2 (Oct 16 23:35): decisions after Engineering's buildability review (engineering/reviews/rc2-workers-buildability.md)
- **B1:** rc2 ships the Shift sheet without Boost or the combo. AC-RF4 and boost_used are deferred until abilities ship, and the row's Boost slot is hidden until then.
- **B2:** charges and Rest are for every player. Boost appears only once abilities are live.
1. **Hidden-tab freeze:** use the existing frame-gap rule, so a gap of 60 s or more is treated as offline.
2. **Saving charges:** partial regen progress is saved. Starting charges equal the cap (2) for a new game, at first hire, and when loading an rc1 save.
3. **When charges regenerate:** whenever the game sim is running, including during Rest and with a modal open. A second tab follows the existing single-sim rule.
4. **Rest:**
   - Rest is allowed from any state, including Asleep, Unpaid and above 50%.
   - Rest ends on its own at 100% energy. That end is logged with cause auto_full.
   - While resting, the Market Hand and Coop Hand action timers are frozen, no wage is charged, and the Grader bonus is 0% (Paused earns nothing).
   - A resting worker counts as not working for income and for any picker.
   - On resume, the existing wage and resume order apply (R9).
5. **$/s at risk:** workerAtRisk = incomePerSec(now) − incomePerSec(with that worker set to Asleep), with no separate wage term, because the counterfactual already includes any wage difference.
   - Rows re-sort when the sheet opens and every 5 s, but never within 1 s of a tap, so rows don't jump under the player's finger.
6. **Retired cues:** the yawn cue moves to 50% to match the threshold. The old Manage setting and its cooldown are retired, and manage_cooldown_s stays in the data only until rc2 ships. Coach copy changes from "Tap Manage" to "Open Refill", with final wording from Art & UX.
7. **Telemetry:**
   - rest_toggled {worker, on: bool, energy_pct, state, cause: manual|auto_full}
   - The old manage_* events are retired. refill_used replaces them, and the export aliases manage_used to refill_used for one release.
   - refill_used, rest_toggled, shift_sheet_opened and first_worker_hired are pinned. *(v1.3: the new `sheet_id` / `entry`/`entry_point` / `stall_id` / `by` fields need HoE allowlist approval; see v1.3 Telemetry.)*
8. **Data:** these come from data columns rather than hard-coded values: rest_recovery_mult 0.25, start_charges 2, nudge_rearm_farm 5 and nudge_max_dismissals 2. The nudge's $40/F3 trigger reads W1's cost and unlock level from the data. No SAVE_VERSION bump is needed.
- AC-RF5 note (v1.2): measured from refill_used telemetry after launch, not gated. Economy's caveat is that in full progression workers reach 50% one at a time.

## rc2 goal (approved by Head of Product, Oct 16 23:27, as modelled)
**What rc2 delivers:**
- One entry point for managing workers.
- Less chore.
- One real decision: spend a scarce charge now or save it. Charges are short 66–68% of the time.

**What rc2 does not deliver:** in full progression, workers reach 50% one at a time, so the not-lowest refill share is about 0%. Choosing which worker to refill is rarely a real choice in rc2, and we are not claiming it is. That depth arrives with Boost and the M4 abilities.

**How we measure it:** AC-RF5 becomes a post-launch telemetry check, not a release gate.
- Final copy: art-ux/rc2-workers-copy.md v1.0 overrides placeholder strings (Oct 16 23:55).

## v1.3 (2026-10-30 12:49 CET, 2026-10-30, errata): AC-RF2 labels, names, disabled state, entry point, widths
Record-only: no number changes (regen 150 s, cap 2, threshold 50% unchanged). Sources: D-HOP-2026-10-30-13 (C1), D-HOP-2026-10-30-19 (2) as amended 12:39 and (3), HoQA re-review 12:46, Art sign-off `art-ux/m5-refill-flows.md` v1.0 sha1 6173f75783c5c69c3e417f0bc6d88eb0d4af8148 (HANDOFF 98f19f7b) with Art's DOM-order and `.sr` conditions, D-PMW-2026-10-30-09. The rules below supersede the v1.1 AC-RF2 text ("disabled attribute or aria-disabled", "Next charge in {ceil(s)}s"):
- **0-charge label.** Visible "Next charge in" + the m:ss countdown, rounded up, never "0:00". Markup is the #83 ba398b6 build (`src/ui/app.ts:98`, `src/ui/styles.css:601`), in a fixed DOM order: (1) text node "Next charge in"; (2) an empty, text-free `<span aria-hidden="true" data-cd="m:ss">` drawn by `::after{content:attr(data-cd)}` (or `content: attr(data-cd) / ""`), updated each second; (3) a visually hidden `.sr` span " progress, {Role}". Visible text leads the name (WCAG 2.5.3).
- **Accessible names.** All names come from content via visually hidden `.sr` spans (`src/ui/styles.css:169`: `position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)`), and the button never has `aria-label`.
  - 0 charges: "Next charge in progress, {Role}". No digits, and the name doesn't change while ticking.
  - Above 50%: visible "Rested, refill below 50%" + `.sr` ", {Role}".
  - Enabled (and Unpaid, per failure-cost FC-N1): visible "Refill" + `.sr` ", {Role}".
  - The `.sr` span is `position:absolute`, so it is not a flex item and doesn't affect layout or width.
- **Disabled states** (0 charges, above 50%, Unpaid): `aria-disabled="true"` only, never the `disabled` attribute. An Unpaid row never shows a countdown.
- **Entry point.** Refill exists only in the Shift sheet row and the nav button (AC-RF1 stands). The worker card keeps [pause][Manage][call] and its existing state cue, with no Refill control. Manage opens the Shift sheet focused on that worker (D-HOP-2026-10-30-13; failure-cost AC-FC20).
- **Widths and axe bar (as failure-cost v0.3.19, AC-FC13 / AC-FC17 (b)):**
  - The row Refill's inner text box is ≥ 201px at 360, so the button is `min-width:253px` with `flex:1 1 0`. Every label sits on 1 line with `scrollWidth ≤ clientWidth`, at **constant width (±0.5 px) across all labels at each viewport**. The button is `flex:1`, about 276px at 360 and 316px docked, so it never renders at the 253px floor. There is no "exactly N px wide" figure, and the old 208px / "Refill in" figures don't apply (Art m5-refill-flows v1.0 6173f757 §4 L37, §9 L216–217; HoQA 12:49).
  - axe `label-content-name-mismatch` = 0 for all 3 states, in Chromium, WebKit and Firefox at 360/390/1280.
  - The computed name has no digit in any state (CDP getFullAXTree + Playwright ariaSnapshot), and there is no `aria-label` attribute.
  - Evidence: `art-ux/wireframes/m5-refill-fit-*`, `art-ux/reviews/m5-refill-axe/` (SHA256SUMS; axe 0/0 in 3 engines).
- **Telemetry (v1.3 addition, 2026-10-30 12:53 CET; for PM Market SS-36 (product/market/sales-stopped-spec.md v1.3.16 ed8a177e; D-HOP-2026-10-30-20 addendum 2); D-PMW-2026-10-30-09).** Read-only check (12:53): no refill telemetry is implemented. `refill_used`, `refill`, `charges_after`, `charges_left`, `shift_sheet_opened` and `rest_toggled` appear nowhere in `src/` (v5 worktrees wt-v5-x1ci, wt-m41-p2 ba398b6; `/workspace/egg-farm-studio/src` does not exist), and `src/telemetry/telemetry.ts:12` `isPinned` pins only session_start, session_end, upgrade and onboarding_*. The spec-level name of record is `refill_used` (rc2 L27, rc2 v1.2 decision 7, engineering/reviews/rc2-workers-buildability.md L77/L80). Standardised on `refill_used` with `charges_left`, plus `by`:
  - `shift_sheet_opened {entry: nav|card|stall_chip, sheet_id, stall_id?}`. `sheet_id` is a per-open id. `stall_id` is present only when `entry` = `stall_chip`. `card` = the card's Manage.
  - `refill_used {worker, energy_pct, charges_left, rank_by_risk, by: manual|auto, sheet_id, entry_point: nav|card|stall_chip|auto, stall_id?}`. `sheet_id` is null for `by:auto` outside a sheet. `entry_point` is copied from the open (`auto` for `by:auto`). `stall_id` is present only when `entry_point` = `stall_chip`.
  - `rest_toggled {worker, on, energy_pct, sheet_id, entry_point, stall_id?}` (same rules).
  - **Conversion (deterministic):** Manage→refill conversion = `shift_sheet_opened{entry:stall_chip}` joined on `sheet_id` to `refill_used` (`by:manual`). This replaces SS-36's fallback join once built.
  - **Aliases:** lighter-refill's `refill {by, energy_pct, charges_after}` (v0.8.9 L62) was never implemented, so it is renamed, not aliased (lighter-refill v0.8.10). `charges_after` = `charges_left`. The v1.2 decision 7 one-release alias `manage_used` → `refill_used` stands.
  - **HoE allowlist change:** these events are on rc2's pinned, never-trimmed list (v1.2 decision 7). The new fields and the pin need HoE's allowlist approval, and `isPinned` must add them (gate-card gap).
- **Copy and flow of record:** `art-ux/m5-refill-flows.md` v1.0 6173f757 and `art-ux/rc2-workers-copy.md` (sha1 92ab9a76db26f89342e185c238d8d85909f178b4). Where they differ, the v1.0 flow's rulings win for the strings above.
- **Completed in place within v1.3 at 2026-10-30 12:57 CET** (no version bump; D-PMW-2026-10-30-09 audit): AC-RF2 (v1.1 list, L44) and the §5 `rest_toggled` line marked superseded / extended; the v1.2 decision 7 pinned list flags the HoE allowlist change. Implemented-name check re-run read-only at 12:57: no `refill_used`/`refill`/`charges_*`/`shift_sheet_opened`/`rest_toggled` in `game/src`, `wt-v4/src`, `/workspace/wt-v5-x1ci/src` or `/workspace/wt-m41-p2/src`. Pre-edit sha1 e2acc250db8e3c63ff31f7ae8b050282687a201d, frozen as `workers/rc2-refill-proposal.e2acc250.md`; backup `scratch/rc2-refill-proposal.v1.3-e2acc250.md`.
- Telemetry bullet added in place within v1.3 at 2026-10-30 12:53 CET (pre-edit sha1 fc83b817127008b4ed2b597348e4dd47e206f6a2, backup `scratch/rc2-refill-proposal.v1.3-fc83b817.md`).
- Re-edited in place within v1.3 at 2026-10-30 12:50 CET for HoQA 12:49 (constant-width wording). The pre-re-edit copy (sha1 5ed913b591a41376971fb6132d365949f1ce69eb) is at `scratch/rc2-refill-proposal.v1.3-5ed913b5.md`.
- Previous file frozen as `workers/rc2-refill-proposal.6f0b95ea.md` (sha1 6f0b95ea7cc11e8fa306ecb59bde59e0cec85074). Backup: `scratch/rc2-refill-proposal.v1.2-6f0b95ea.md`.
