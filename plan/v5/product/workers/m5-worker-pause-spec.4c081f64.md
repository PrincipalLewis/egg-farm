# M5.0 item 5: Per-worker Pause/Resume (PM, Workers). The ONE reconciled Pause spec
**v1.3.15 (final, pending harness re-measure) · 2026-10-30 14:26 CET (post-freeze dated erratum B-2 (QA-D-1030-TELERR5; D-HOE-33), no AC/number/flag change: §12 `worker_paused.mood` = WorkerMood sampled pre-pause; exclusive-emission note `rest_toggled.state` = `active|paused|resting`; D-HOE-20261030-33 (engineering/decisions.md L519–520); D-PMW-2026-10-30-26); v1.3.14 · 2026-10-30 13:38 CET; v1.3.13 · 2026-10-30 13:34 CET** · **Status: Final — D-HOP-06/16; all gates cleared (HoE, Art, HoQA, Econ G3/G5-P); Economy values pending harness-of-record re-measure.** · build hold stands (code only on Vadim's go)
v1.3.14 (2026-10-30 13:38 CET; HoE D-HOE-20261030-20 M-3 closed; D-PMW-2026-10-30-10; record-only, no rule or number change): E9's 'rc2 `rest`/`resting` saves map to `paused: true`' line is struck. Saves confirmed no rest/resting shape ever shipped (origin/main, rc/v5 e77fc5c, fixtures), so no mapping is built and `paused` is the only shape. Pre-edit sha1 7dcb01bef1232912f3242848ae92ddc3f7d954a5, frozen as `workers/m5-worker-pause-spec.7dcb01be.md`; backup `scratch/m5-worker-pause-spec.v1.3.13-7dcb01be.md`.
v1.3.13 (2026-10-30 13:34 CET; D-HOE-20261030-19 G-3/G-10, D-HOE-20261030-20 G-5/G-6; D-PMW-2026-10-30-10; text only, no rule or number change): (1) B5 lockout lines (§rule 7) and E1/§8 gap rule: a visible-tab stall ≥ 60 s simulates the first 60 s, then freezes (code kept, `src/game.ts:424–425`); hidden gaps ≥ 60 s and offline unchanged. (2) `session_end.paused_worker_s`/`all_paused_s` emitted only when `rc2Refill` = 0; with `rc2Refill` = 1 paused time = `rest_toggled` on:true→on:false pairs (`paused_duration_s`). (3) `worker` = code ids `market_hand|coop_hand|hawker|grader`. (4) Record-only: `restAuto` optional additive v6 key next to `paused: true`, sanitised on load (invalid → absent), no SAVE_VERSION bump. Pre-edit sha1 0fc43b4470a840839198a9c5c23be4552edefb8a, frozen as `workers/m5-worker-pause-spec.0fc43b44.md`; backup `scratch/m5-worker-pause-spec.v1.3.12-0fc43b44.md`.
v1.3.12 (2026-10-30 13:31 CET; D-PMW-2026-10-30-10; HoE H-1 engineering/decisions.md L137; PMC telemetry errata v5 rev. 3 `collection/telemetry-spec-errata-v5.md` sha1 ee70767205689f257b6e5d35186b5a747f857a50; telemetry text only, no rule or number change): §12 `worker_paused` lists the HoE H-1 fields `golden_on_screen` and `frenzy_active` (bool, pre-pause state on the pause tick), which were approved 2026-10-24 but missing from this list, and the exclusive-emission bullet carries them onto `rest_toggled{on:true}` with `rc2Refill` = 1 (rc2-refill-proposal v1.3.6). `rest_toggled{on:false}` carries `paused_duration_s`. Pre-edit sha1 216b31d6133b4444282009156cec50ce021dfa5c, frozen as `workers/m5-worker-pause-spec.216b31d6.md`; backup `scratch/m5-worker-pause-spec.v1.3.11-216b31d6.md`.
v1.3.11 (2026-10-30 13:15 CET; D-PMW-2026-10-30-10, D-HOE-20261030-17/-18; telemetry text only, no rule or number change): §4 L98 and §12 replace "alias to `rest_toggled` from M5.1" with the exclusive-emission rule. With `rc2Refill` = 1 only `rest_toggled` emits (`worker_paused` → `on:true`, `worker_resumed` → `on:false`); with `rc2Refill` = 0 and `pause` = 1 only `worker_paused`/`worker_resumed` emit. Both families stay pinned and no toggle is double-emitted. `worker_resumed.cause` gains `auto_full` (rc2 Rest only, never emitted in the rc2Refill = 0 build). AC-P12's `worker_resumed{cause:"manage"}` stays for the rc2Refill = 0 build. Pre-edit sha1 b4f86ca81ae43ad514ddc0e6151610953598d885, frozen as `workers/m5-worker-pause-spec.b4f86ca8.md`; backup `scratch/m5-worker-pause-spec.v1.3.10-b4f86ca8.md`.
v1.3.10 (2026-10-30 10:34 CET; Saves QA 2026-10-30 `qa/m5/evidence/acp1-a923206/REPORT.md`, HoQA QA-D-1030-ACP1-B; text only, no number change): AC-P1(a) names its input fixture, `tests/fixtures/saves/m4-exp1-committed-unseen.json` `ls["eggfarm.save"]` (file sha256 de6b0297…7961, save-string sha256 8889e669…a9ff). AC-P1(b) is limited to committed (tracksV7) inputs, because older v4–v6 saves migrate lazily at Game boot and the migration rows cover them. Status: (b) passed on the fixture, and (a) stays formally blocked until `engineering/golden/m5-abilities-only` exists. New Pause PR deliverable (§15, and an AC-P13 prerequisite): a committed tracksV7 save fixture with at least one hired worker. No rule changes.
v1.3.9 (2026-10-30 10:27 CET; HoQA request 2026-10-30; text only, no number change): AC-P1's save-byte check is now a fixed-time serialize: validate → m5Load → serialize with a pinned `now` and no `saveSeq`, flag 0, byte-identical to the pinned comparison save. This is the #91 36-case harness path (`qa/v5-saves/trace-reviews/pr91-7d59dda/probe-saves.test.ts`). A real-path clause is added: Game boot plus `save()` with flag 0 gives a `state` byte-identical to the comparison save's, with `savedAt` and `saveSeq` excluded. The 5d9efa61 pin is kept. No rule changes.
v1.3.8 (2026-10-30 10:25 CET; Saves QA report `qa/m5/evidence/acp13-a923206/REPORT.md` on rc/v5 a923206, D-HOP-2026-10-30-05; text only, no number change): AC-P13 step (1) now uses QA's wording: `state` byte-identical to the input with a reload gap < 60 s, `paused` and `callLockoutS` present and unchanged, `savedAt` and `saveSeq` re-stamped as on every save. The setup now gives a reload gap < 60 s. E9 (L275) and E13 (L280) no longer claim whole-file byte identity. A flags-off save matches the save rc/v5 before Pause writes from the same input (#91), and against the input only `state` is byte-identical (gap < 60 s). No rule changes.
v1.3.7 (2026-10-30 10:17 CET; D-HOP-2026-10-30-05, answering D-HOE-20261030-10; text only, no number change): E13 now reads "pause fields (`paused`, `callLockoutS`) are ignored while the flag is off and sanitised on load when it's on". Nothing is cleared on save, so flags-off saves stay byte-identical (#91). Flag off then on re-pauses the worker with its lockout sanitised, as in E9. The "turning the flag back on doesn't re-pause anyone" line is removed. Echoes fixed in rule 1 (L101), rule 7 (L140), E9 (L274), E13 (L279) and AC-P13 (L324). No tunable or bar changed.
v1.3.6 (2026-10-30 08:53 CET; HoP request 2026-10-30, D-HOE-20261030-02, #82; text only, no number change): the `rest_recovery_mult` range reads [0, 0.35] (was (0, 0.35]) in the §6 Boundaries bullet and the §9 Tunables table, matching the "On break · no wage" sub-line at 0, AC-P17, the D-HOE-20261030-02 build (>= 0) and #82 validation. No rule changes.
v1.3.5 (HoQA clarification of the (f) band: exactly one checkpoint may be in (+2.0, +2.5], all others ≤ +2.0, mean ≤ +1.0; anything else blocks).
v1.3.4 (D-HOP-2026-10-24-27, HoQA errata E-1/E-2/E-3, wording only): AC-P9 hide/menu cases read 25 s; AC-P19 moved into §13; the §10 G5-P table gains (e)–(g) with the B-X1b bands; AC-P14 cites the §13.2a oracle. No rule changes.

v1.3.3 (D-HOP-2026-10-24-24): the CSV draft of record is now `scratch/v2-econ/economy.m50-draft.csv` sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b (supersedes edfd8902). No rule changes.

v1.3.2 aligns sizing to HoE `engineering/m5.0-sizing.md` v1.2 §15 "Totals after §11–§14" (with §0 headline, §11 16:40 and §13): Pause **2.5–3.0 dd** (was 2.25–2.75; +0.25 for the P-12 golden, §13). No rule changes.

v1.3.1 (D-HOP-2026-10-24-18): a paused Market Hand with **truly zero sales** now gets the `mh_paused` "Market Hand on break · Sell all" chip after 20 s (`product/market/sales-stopped-spec.md` §7.1, SS-30). This supersedes D-HOP-11's "no chip while paused". §8 and the new AC-P19 carry it. No other rule changes.

v1.3 finalises the spec under D-HOP-2026-10-24-16: the Market Hand call lockout is **45 s** (was 30) everywhere, the G5-P result is recorded in §10 and AC-P14, and the full-coop (f) outlier is accepted as documented variance. Every Economy value is **pending re-measure on the harness of record**.

v1.2.3: HoQA AB-12, text only. The lockout sentence is exactly "Ready in 0:ss after a break" (no comma) in rule 7 and AC-P9. No rule changes.

v1.2.2: P-12 is pinned. HoE agreed the lockout clock. No rule changes. The abilities spec's sheet auto-close (D-HOP-12) doesn't apply to the Pause toggle: it isn't a call, so tapping it never closes the sheet.
v1.2.1 folds in:
- HoQA testability v0.2 (P-10, P-11, P-13, P-14, TEL-14; §17 has the per-ID list)
- HoQA's AC-P16 conditions: a guard AC, AC-P16 deferred, the alias deferred
- TEL-14: in the M5.0 subset if Pause ships
- Art Q7e: the time-only lockout label
- the agreed flag key `m4.flags.pause`, default 0

No game rule changes. The lockout clock rule is made explicit in rule 7.
v1.2 folds in HoE's buildable review (`engineering/m5.0-sizing.md` §9). Changes:
- the gap wording (Ask 1)
- B5: the Market Hand lockout is counted in sim seconds, saved, and frozen offline
- B6: AC-P16 is N/A for M5.0, pending HoQA
- the size is now 2.25–2.75 dd (superseded in v1.3.2: 2.5–3.0 dd, HoE §15)
- `tc_pause_*` column names
- the flag is `m4.flags.pause`
- columns are cited by name
- downgrade-then-upgrade re-pausing is documented

No game rule changes.
v1.1.2 folds in Art's Q7c = (a): the two-row 128 px card, with the toggle in a full-width action row [pause 44] 8 [Manage flex:1] 8 [call flex:1]. Art confirmed the no-yawn-when-paused rule, and the avatar dependency is accepted. No rule changes.
v1.1.1 folds in Head of Art & UX's answers to Q6 (1–5), and Q6 is closed. Changes: no overlay; a 20 px pause chip; the toggle moves into the card action row with no card growth; saturate applies to the avatar only; the coop-full emoji goes to a separate polish ticket. There are no rule changes. · build hold stands (code only on Vadim's go)
v1.1 folds in `art-ux/m5-workers-ui-signoff.md` (Head of Art & UX, 2026-10-24 16:20) §2–§4: icons, toggle position, paused-card look and sub-line copy, and the lockout caption. There are no rule changes. Previously, v1.0.1 recorded the HoP rulings (a)–(e) and closes Q1–Q3. It adds the flag rule and edge case E14 for Frenzy. No rule changes.
**Status: IN SCOPE.** CEO D-CEO-20261024-06 overrides HoP R13's drop (D-HOP-2026-10-24-04 item 9). It's the **last M5.0 PR**, behind its own flag `m4.flags.pause`, and **the first item cut** if the calendar slips (HoE `engineering/m5.0-sizing.md` §5).
Research and PM only. No code or PRs.

**This spec supersedes every earlier Pause text.** Each of those now points here:
- `product/m4-manage-proposal.md` §2.6, §6 row "Pause recovery" and PA-1–PA-3. **These said recovery at 0.5× drain (~1%/18 s). That value is SUPERSEDED: 0.25× is locked** (decisions.md:9, D-HOP-2026-10-24-04 item 9).
- `product/research/slices/workers.md` §3 "Pause/Resume". The values match; this spec adds the rules.
- `product/m4-active-checks.md` §4. That pause-exploit check ran at 0.5×, so it is not valid for this spec. The re-run is G5 here (§10).
- `product/workers/m4-abilities-spec.md` rule 1 ("Paused" caption), carried forward.
- rc2 Rest (`rc2-refill-proposal.md` v1.2 item 4): **not superseded.** Rest is M5.1 and is built on this state (§4).

**Data source of truth:** `product/economy.csv` sha256 `c7bb783fe890928f747c142411503261f0711388e73fe1cdadbfd76cc8d68b44` (**CSV c7bb783f**). **Columns are cited by name only (v1.2).** The game copy has 2 extra `guard_*` columns, so positions differ (HoE §9.5(3)). Every value cited is the same on rows L0–L30.

## 1. Overview
The player can **bench** any hired worker. While paused, a worker produces nothing, is paid nothing and slowly recovers energy. **Resume** puts it back to work at whatever energy it has reached. The mechanic is a manual, open-ended bench. It is the base state that M5.1's Rest extends.

## 2. Player fantasy and purpose
"I run the crew: I can send someone to the break room."

Pause serves two honest uses:
- **Bench the Market Hand to sell by hand.** This is useful for the "serve N yourself" market goals (`v2-slices/market.md` §C).
- **Stop a worker who earns no more than its wage.** For seller15 the Market Hand and Coop Hand roughly break even with their wage, and this is accepted (decisions.md:9).

Pause is **not** designed to be a better way to recover energy. Free Manage, and in M5.1 Refill, always beats it (§6).

## 3. Scope
**In scope:**
- a Pause/Resume toggle per worker card
- the paused state across sim, income, wage and abilities
- the "All workers paused" banner
- the exploit guards G1–G6 (§7)
- telemetry
- the `m4.flags.pause` flag

**Out of scope (M5.1):**
- auto-end at 100% (that is Rest)
- a Shift sheet entry
- charges

Also out of scope: firing, selling back and refunds. Hires stay permanent (m2-proposal §9).

**Not changed:** drain rate, wages, Manage/Refill thresholds and cooldown, the Unpaid rules, and offline (workers already do nothing offline).

## 4. Pause vs Rest (rc2 v1.2): one state, two entry points
| | **Pause (M5.0, this spec)** | **Rest (M5.1, rc2 v1.2 item 4)** |
|---|---|---|
| Entry | Pause toggle on the worker card | Rest action in the Shift sheet row |
| Allowed from | any state: Working, Tired, Asleep, Unpaid, >50% | any state (same) |
| Ends | **only by the player**: Resume, or a Manage/Refill on that worker (rule 8) | **auto at 100%** (`cause:"auto_full"`), or by the player |
| At 100% | stays paused. Recovery stops at 100. The card reads "Paused · Rested 100%" | ends itself |
| Output / wage / action timers / Grader | none / none / frozen / **Grader bonus 0%** | identical |
| Energy | **+0.25 × drain rate** (rule 3) | identical (`rest_recovery_mult`) |
| Calls | blocked "Paused"; pausing ends an active call | Boost blocked "Paused" (rc2 AC-RF4) |
| Save field | `paused: true` | the same `paused` field plus `restAuto: true` |

**M5.1 convergence rule:** Rest = Pause + `restAuto` (auto-end at 100%) + the Shift sheet entry. **Nothing in this spec is rebuilt for M5.1**, which follows HoE's §5 advice. ~~`rest_toggled` replaces `worker_paused` and `worker_resumed`, and the old names stay as aliases for one release.~~ **Exclusive emission (v1.3.11, D-PMW-2026-10-30-10):** with `rc2Refill` = 1, a Rest/Pause toggle emits only `rest_toggled` (rc2-refill-proposal v1.3.1, merged definition); with `rc2Refill` = 0 and `pause` = 1, it emits only `worker_paused`/`worker_resumed` (§12). Both families stay in `isPinned`; nothing is ever double-emitted for one toggle, and there is no alias export.

## 5. Rules
1. **Unlock and flag.**
   - The toggle exists only when `balance.m4.enabled` = 1, `m4.flags.pause` = 1 and `farmLevel ≥ tc_pause_unlock_farm` (**10, ruled** D-HOP-2026-10-24-06 (b)). Pause has its own flag, ruling (d), so it can be cut without touching the abilities.
   - Below that level, no toggle, banner or telemetry exists.
   - A saved `paused: true` loaded where the flag is 0 is ignored, not cleared: the worker works, and the field is written back unchanged (E13). Where the flag is 1 and the level is below the unlock, it is sanitised on load to `false` and is not saved back as true.
2. **Toggle.**
   - Pause and Resume apply in the same tick.
   - There is a 2 s debounce per worker (`tc_pause_toggle_debounce_s`). A second tap within 2 s is ignored and gets the M1 disabled shake.
3. **Energy while paused.**
   - Energy rises by `rest_recovery_mult` (0.25) × (1 / `drain_s_per_pct`) % per second. That is **+1% per 36 s**, so 0 → 100% takes 3600 s.
   - Energy is capped at 100, and there is no drain while paused.
   - Source: decisions.md:9 ("Pause recovery locked at 0.25× drain (~1%/36 s)") and the rc2 v1.1 constants ("Rest recovery 0.25× drain, 36 s per 1%").
   - **Ruled (D-HOP-2026-10-24-06 (a)):** a paused worker **recovers** at 0.25× the drain rate and never loses energy. This supersedes the "drain while paused" wording in D-HOP-2026-10-24-04 item 9.
4. **Output while paused.**
   - Market Hand: no sales.
   - Coop Hand: no collecting. `w2_asleep_collect_share` does **not** apply.
   - Hawker: `hawkerDemandMult` = 1.
   - **Grader: `graderMult` = 1, a 0% bonus.** The asleep 15% (`w4_asleep_bonus_share`) does **not** apply.
   - `incomePerSec` and the rate previews already leave paused workers out (`rc1-asleep-state-spec.md:32`). `workerAtRisk` of a paused worker is 0.
5. **Wage and timers.**
   - No wage accrues or is charged while paused.
   - The Market Hand and Coop Hand action timers (`cdS`) are **frozen**. On Resume they continue from the frozen value; they are never reset to 0 (guard G4).
6. **Calls.**
   - A paused worker is ineligible. Its call button reads "Paused" (abilities v1.0 rule 4).
   - Pausing during an active call ends the effect that tick (`ability_ended{cause:"paused"}`). `readyAt` is unchanged and nothing is refunded (guard G1).
   - Activate-all skips paused workers.
7. **Resume.**
   - The worker returns to the mood its energy implies (`tired_below_pct` 30 / Asleep at 0). If it was Unpaid, it stays Unpaid (guard G3).
   - **Market Hand only:** Rush and Shout can't be started for `tc_pause_call_lockout_s` (**45 s**, D-HOP-16) after the Market Hand resumes (guard G2).
   - **Lockout clock (v1.2, B5; made explicit for P-13 in v1.2.1):** the lockout is a per-save value `workers.market_hand.callLockoutS`, the **sim seconds remaining**.
     - It uses the **sim clock**, the one `step()` advances (HoE F1: `step()` is pure and driven by injected sim time), **not** the focus clock.
     - **It counts down exactly when the sim advances and the Market Hand can sell**, and **freezes whenever the sim isn't advancing**: offline, a hidden gap ≥ 60 s (the provisional sim is discarded), the part of a visible-tab stall beyond its first 60 s, and reload. *(v1.3.13: a **visible-tab stall** (frame gap ≥ 60 s with the tab visible) simulates the first 60 s live and then freezes: the M5 timed systems take the offline path, `advance()` runs `min(gap, 60 s)`, and the rest of the gap is not simulated (code kept as is, `src/game.ts:424–425` at wt-v5-x1ci 05d68b1; D-HOE-20261030-20 G-5, v1.3.13); during those first 60 s the lockout counts down.)*
     - **Under menus and in a hidden period under 60 s, the sim does advance:** RC1's `Game.frame()` calls `advance()` with no menu check (`game.ts` `frame()`, read-only). So Market Hand sales continue there and the lockout keeps counting.
     - **HoE agreed (v1.2.2).**
     - This answers QA's premise that "no sales happen" under menus: sales do happen, so freezing the lockout there would over-lock.
     - The guard's purpose is to let the stockpile drain at base price before Rush or Shout can apply. That draining happens in sim time, so sim time is the matching clock.
     - **Call durations, by contrast, use the focus clock** (abilities rule 10, D-HOP-10). Under a menu a call is suspended, but the lockout runs.
     - Resume sets it to `tc_pause_call_lockout_s`.
     - `step()` decrements it by sim `dt` while the tab is live, including a hidden period under 60 s, which is simulated.
     - It is **saved**, so a reload restores it.
     - It is **frozen while offline**: a hidden gap ≥ 60 s and offline time don't reduce it, because the provisional hidden sim is discarded and the offline grant doesn't touch it. A visible-tab stall ≥ 60 s reduces it by at most the first 60 s simulated, then it freezes (v1.3.13, D-HOE-20261030-20 G-5).
     - Calls are lockout-blocked while it is > 0.
     - Sanitiser on load: a non-finite or negative value becomes 0, and the value is capped at `tc_pause_call_lockout_s`.
     - It is absent from the save when it is 0. While the flag is off it is never set, counted down or removed: a saved value is ignored and written back unchanged (E13).
     - Blocked taps log `ability_blocked{reason:"lockout"}` (coalesced per abilities TEL-9). The disabled Rush and Shout buttons read **[pause] "0:ss"** (Art Q7e, time-only, inside the button, no extra caption). The icon is `aria-hidden`, and `aria-describedby` says "Ready in 0:ss after a break".
8. **Manage/Refill on a paused worker.**
   - The per-card Manage works under its normal rule: energy ≤ `manage_prompt_threshold` (0.5) and the shared `manage_cooldown_s` (30 s).
   - It refills the worker to 100 **and ends the pause** (`worker_resumed{cause:"manage"}`). This matches rc2's "Refill on a resting worker ends Rest".
   - **Manage all skips paused workers**, and N (`needManage`) counts only workers that aren't paused. The player chose to bench them.
9. **All paused.**
   - When every hired worker is paused, a non-interactive line "All workers paused" appears directly under the Workers-tab sticky bar.
   - The bar's slots don't move (abilities §5.1 reservation).
   - Manage all hides under its own N = 0 rule (its slot box stays reserved).
10. **Unpaid ordering.**
    - A paused worker is not in the R9 Unpaid-resume queue.
    - It is not counted in the `resumeNeedCents` coin reserve (`sim/tick.ts:57-66`).
    - On Resume it joins the queue again under the existing rules.
11. **Offline and hidden.**
    - Recovery accrues only in simulated time.
    - **Hidden or frame gap ≥ 60 s (exactly 60.0 counts), v1.2:** the provisional hidden sim is discarded and the whole gap is paid as offline (`settleHiddenPeriod`, HoE §9.1). Recovery is +0, the lockout is frozen and the paused flag is kept.
    - ~~The visible-throttled ≥ 60 s path is treated the same for M5 timed systems (HoE §9.1(a)).~~ *(v1.3.13: superseded; a **visible-tab stall** (frame gap ≥ 60 s with the tab visible) simulates the first 60 s live and then freezes: the M5 timed systems take the offline path, `advance()` runs `min(gap, 60 s)`, and the rest of the gap is not simulated (code kept as is, `src/game.ts:424–425` at wt-v5-x1ci 05d68b1; D-HOE-20261030-20 G-5, v1.3.13). So a paused worker recovers, and a resumed Market Hand's lockout counts down, for those first 60 s only; the paused flag is kept.)*
    - A gap under 60 s is simulated live: recovery continues and the lockout counts down.
    - The paused flag persists through offline time and reload.

## 6. Formulas and boundary checks
- Recovery per tick (10 Hz, dt = 0.1 s): `energy = min(100, energy + dt × rest_recovery_mult / drain_s_per_pct)`, which is +0.002778% per tick.
- From 0% to the Manage threshold (50%): 1800 s. To 100%: 3600 s. Compare free Manage: 100% instantly, every 30 s.
  - So Pause is never the faster recovery while Manage exists. Economy's M4 finding was "Refill makes pause irrelevant", optimal pause/never = 1.000 (m4-active-checks §4). That result was measured at 0.5×, and the slower 0.25× only makes recovery worse.
- Boundaries:
  - `rest_recovery_mult` must be in [0, 0.35]. 0.35 is the fastest value that still loses for every model (decisions.md:9).
  - A value of 0 means no recovery. That is valid, but the card copy must then not say "recovering".
  - `drain_s_per_pct` must be > 0. Validated in `balance.ts`.

## 7. Exploit guards (precise)
**Threat model:** the player pauses, in particular the **Market Hand**, to avoid wages or fatigue while keeping a benefit.

| ID | Threat | Guard | Test |
|---|---|---|---|
| **G1** | Pause during a call to keep the effect, or to bank the call | Pausing ends the active effect that tick. The cooldown keeps running. No refund | AC-P8 |
| **G2** | **Stockpile-and-Rush:** pause the Market Hand while Rush recharges so eggs and the queue build up, then resume and Rush or Shout to sell the backlog at ×1.15–×1.3225 | Market Hand Resume → **Rush and Shout locked for `tc_pause_call_lockout_s` = **45 s** of sim time (D-HOP-16), saved and frozen offline (B5)**. During that time the backlog (≤ `queue_max` customers + basket) clears at normal price | AC-P9; G5 pattern (b) |
| **G3** | **Unpaid laundering:** pause and resume an Unpaid worker to skip the R9 rule (coins ≥ `unpaid_resume_wage_min` × wage) | `unpaid` survives Pause. Resume brings an Unpaid worker back Unpaid. Only R9 clears it | AC-P10 |
| **G4** | **Free action / wage skip on toggle:** reset `cdS` to get an immediate action, or toggle between actions so wages fall outside the window | `cdS` frozen, never reset. Every action still charges its wage for its interval (`tick.ts:77-81`). Resume grants no action. 2 s debounce | AC-P11 |
| **G5** | **Recovery farming:** pause at the yawn and resume at 100 to save about 67% of wages (m4-tracks-model B2 at 0.5×) | Recovery at 0.25× (locked). Economy G5 re-run on T3 (§10) | AC-P14 |
| **G6** | **Grader 15% while benched:** pause the Grader so it recovers while still paying 15% | Paused Grader = 0% bonus (rule 4, D-HOP-2026-10-24-04 item 9) | AC-P4 |

**Accepted, not an exploit:** pausing the Market Hand and selling by hand, and saving its wage by doing its job. This is the seller15 break-even (decisions.md:9). If the deferred MK-33a leave penalty is ever reinstated, a paused Market Hand counts as **not awake**.

## 8. UI
- **Toggle:**
  - A 44 × 44 px icon-only button, the **first item of the card's full-width action row** (row 2 of the two-row 128 px card, abilities §5.2): **[pause 44] 8 px [Manage `flex:1`] 8 px [call `flex:1`]** (Art Q7c = (a), v1.1.2).
  - The card is **128 px** with the flag on or off. The flag only changes Manage and call from 150 to 124 px each.
  - The rc1 `.yawn-ov` stays where it is (`top:6px; right:8px`, `styles.css:188`) in row 1, so it never meets the action row.
  - **Fit, measured:** see abilities §5.2a.
    - At 360, Manage and call are 124 px each.
    - The toggle, "Manage" and "Active 0:ss" fit at 14 px with no wrap.
    - The Manage countdown and "Ready in 0:ss" + icon did not fit. The time-only labels in abilities §5.2 fit, and **Art approved them (Q7e)**.
- **Labels:**
  - Inline `icon-pause.svg` while working and `icon-resume.svg` while paused (24×24, 2px `--c-outline`). No emoji.
  - Because it is icon-only, an `aria-label` is allowed (WCAG 2.5.3): "Pause {role}" / "Resume {role}". `aria-pressed` reflects the state.
- **Paused card (Art Q6.1 and Q6.3):**
  - **No overlay.** No Zzz or yawn art is shown for Paused; this supersedes signoff §4's overlay line. **Confirmed by Art (v1.1.2):** a paused card also shows no yawn cue (`.yawn-ov` and the amber ring) at any energy. The yawn cue is for working workers only.
  - The state is carried by shape and text, so it is colour-blind safe:
    - the avatar art at `filter:saturate(0.4)`
    - the neutral-grey **"Paused"** state pill, never red
    - a **20 px `icon-pause.svg` chip at the avatar's bottom-right**, non-interactive and `aria-hidden`, since the pill text carries the state
  - `saturate(0.4)` applies to the **avatar art element only**. The card's text, pill, chip and buttons aren't desaturated, and all text keeps ≥ 4.5:1 contrast.
  - Dependency: the rc1 placeholder card has no avatar element yet (`workers-ui.ts:70`). Saturate and the chip apply when the m2 avatar ships. **Accepted by Art (v1.1.2; product/decisions.md 2026-10-24 16:25 entry; closes QA P-14):** until then the pill and sub-line carry the state.
- **Sub-line:**
  - **"On break · no wage · recovering"** while recovering.
  - **"On break · no wage"** when the recovery value is 0 (`rest_recovery_mult` = 0).
  - **"Paused · Rested 100%"** at 100%.
- **"All workers paused" line:** 12 px, `--c-ink-2`, non-interactive.
- **Spacing:** ≥ 8 px from every other target on the card and from the Manage all bar. No overlap at 360 px.
- **Coop Hand paused** (**DEFERRED until the coop-full hint ships**. N/A for M5.0 per B6 and HoQA's acceptance; the P-10/TEL-11 alias fix returns with it): the coop-full hint uses its existing `paused` variant (`rc1-b1-coop-full-spec.md:63`), with its rc1 copy unchanged. That copy's emoji is out of this spec; it is the separate polish ticket P-ICON-WARN (status.md). [DEFERRED: the field `coop_hand_state` on the rc1-b1 coop-full start event (`:23`). The `coop_full_start` alias is forbidden by TEL-11, and the correct event name is fixed when this returns.] The Coop Hand nudge AC-CF1 does **not** fire, because the hand is hired.
- **Fatigue chip (M4.2, parked):** paused workers are left out of `fatigueLoss`.
- **Hint priority:** coop-full > nudge > UC25 > badge > M4. Pause adds no goal-bubble hint. The "All workers paused" line is not a hint and doesn't compete.
- **Sales-stopped chip while the Market Hand is paused (D-HOP-2026-10-24-18, supersedes D-HOP-11's "no chip while paused"):** the chip `mh_paused` shows [icon-pause] "Market Hand on break · Sell all" only after `tc_stall_hold_paused_s` (20 s) of **truly zero sales** (no sale of any kind). Any sale resets the timer. Tapping it runs Sell all only and **never resumes** the worker. Spec of record: `product/market/sales-stopped-spec.md` §7.1, causes table, C5 and SS-30. A deliberate pause while any sale still happens shows no chip.

## 9. Tunables
| key | value | source (CSV c7bb783f, by column name) | range | notes |
|---|---|---|---|---|
| `m4.flags.pause` | 0 until release, then 1 | **not a CSV column**: a release flag in `balance.json` `m4.flags`, kept by sync (HoE §9.5(2)) | 0/1 | the cut switch |
| `tc_pause_unlock_farm` | 10 (ruled, D-HOP-06 (b)) | §13 draft column `tc_pause_unlock_farm` (the `tc_` prefix means sync maps it automatically) | 10 (fixed for M5.0) | — |
| `rest_recovery_mult` | 0.25 | CSV `rest_recovery_mult` (exists, but **not synced or read today**, HoE §9.5(1); Economy adds a `tc_` alias or HoE an explicit mapping) | [0, 0.35] | **locked** (decisions.md:9); the one knob shared with M5.1 Rest |
| `drain_s_per_pct` | 9 | CSV `drain_s_per_pct` | — | existing |
| `tc_pause_toggle_debounce_s` | 2 | §13 draft column `tc_pause_toggle_debounce_s` (UI-only) | 1–3 | slices/workers.md §3 |
| `tc_pause_call_lockout_s` | **45** | §13 draft column `tc_pause_call_lockout_s` (counted in **sim seconds**, B5) | 15–60 | G2; set by G5-P (b), D-HOP-16; pending re-measure on the harness of record |
| `manage_prompt_threshold` / `manage_cooldown_s` | 0.5 / 30 | CSV `manage_prompt_threshold` / `manage_cooldown_s` | — | rule 8, existing |
| `unpaid_resume_wage_min` | 1 | CSV `unpaid_resume_wage_min` | — | G3, existing |
| `w4_asleep_bonus_share` | 0.15 | CSV `w4_asleep_bonus_share` | — | **not** applied while paused |
| `tired_below_pct` | 30 | CSV `tired_below_pct` | — | resume mood |
No CSV is edited. Economy drafted the new columns in `research/v2-slices/economy.md` §13 (`scratch/v2-econ/economy.m50-draft.csv`, sha256 8dc90e2b36ae18619b6d870c095e77d09a83043788cbe2154feecbf94378996b, D-HOP-24; verified); `rest_recovery_mult` needs the sync mapping listed there. All Economy values are **pending re-measure on the harness of record**.

## 10. Economy gate G5-P (before build)
On the T3 economy, seeds 0–99, F10/F18/F24, with the models optimal, seller15, casual and slow, using abilities v1.0:

Bands per D-HOP-2026-10-24-27 B-X1b (HoQA; Pause merge gate; HoE owns the pause-pattern harness driver). Scenario definitions for (e)–(g) are Economy's, from `research/v2-slices/economy.md` §12.

| Pattern | Pass if |
|---|---|
| (a) pause W1 and W2 at yawn (50%), resume at 100 | managed income ≤ never-pause +1.0% (mean) and ≤ +2.0% (worst seed) |
| (b) stockpile-and-Rush: pause the Market Hand ≤ 270 s before Rush is ready, resume, Rush as soon as the lockout allows | ≤ +1.0% mean, ≤ +2.0% worst seed (at `tc_pause_call_lockout_s` 45) |
| (c) bench the Market Hand and sell by hand at 1 tap/s | reported only (accepted break-even) |
| (d) pause the Grader at Tired, resume at 100 | ≤ never-pause |
| (e) short pause: pause W1/W2 at yawn only while Manage is on cooldown, resume + Manage when ready | ≤ +1.0% mean, ≤ +2.0% worst seed |
| (f) pause the Coop Hand while the basket holds > 30 s of production, resume when it holds < 10 s | mean across seeds ≤ +1.0%; every seed-checkpoint ≤ +2.0% except **exactly one** allowed in (+2.0%, +2.5%]. Any checkpoint > +2.5%, or a second > +2.0%, **blocks the Pause merge** (HoQA, 17:55) |
| (g) wage-skip: bench the Market Hand **and** the Coop Hand, player collects and sells at check-ins | ≤ +1.0% mean, ≤ +2.0% worst seed |

G1 still holds with Pause in the stack: P95 ≤ 2.0, worst seed ≤ 2.25, judged on the §13.2a oracle (E-3). AC-SC9: the L0–9 trace is byte-identical with the flag on and off.

**G5-P result (v1.3; `research/v2-slices/economy.md` §12, runner `m5g5p.ts`, T3, seeds 0–99, 1800 s per F10/F18/F24 snapshot, Sweep A; SCRATCH, pending re-measure on the harness of record).** Mean Δ vs never-pause (worst seed); + = pausing earns more.
- (a) recovery farming: **PASS** by a wide margin (optimal −4.0 to −6.4%, casual/slow −35 to −62%).
- (b) stockpile-and-Rush: at 30 s it **failed** one optimal F10 seed (+2.5%). **At 45 s: −0.4% (+1.6%) / −0.5% (+0.4%) / −0.6% (+0.1%) → PASS** (60 s: +1.7%, no better). Hence `tc_pause_call_lockout_s` = 45 (D-HOP-16). The 45 s re-run is optimal-profile only; the other profiles already passed at 30.
- (c) and (g) benching: lose money for every profile on the mean; (g) worst seed ≤ +0.2% → **PASS** on its new band.
- (d) Grader: **PASS** (−46 to −56% at F24; not hired at F10/F18).
- (e) short pauses: **PASS** (≤ +0.7% worst).
- (f) full-coop Coop Hand pause (not a §10 row; Economy added it): mean −0.1 to −0.7%, but **+2.5% on one optimal F10 seed** (1 of 1200 seed-checkpoints). Caused by golden-egg Frenzy timing (with golden eggs off: ≤ +0.5%), not by the lockout, which doesn't touch the Coop Hand. **HoP accepted it as documented variance** (D-HOP-16), to be re-checked on the harness of record.
- G1 window gate with Pause in the stack: PASS on the 100-seed checkpoint run (§10.1); the gate of record is §13.2a (E-3).

## 11. Edge cases
- **E1 Hidden gap ≥ 60 s (exactly 60.0 counts), or offline:** the provisional hidden sim is discarded and the whole gap is paid as offline. *(v1.3.13, D-HOE-20261030-20 G-5: a visible-tab stall ≥ 60 s is not paid as offline; it simulates the first 60 s live (recovery, wage and lockout countdown for those 60 s), then freezes for the rest of the gap (`src/game.ts:424–425`, code kept).)* For a hidden gap or offline: There is no recovery, no wage and no lockout countdown (B5). The paused flag is kept. A gap under 60 s is simulated live, so recovery continues and the lockout counts down.
- **E2 Reload mid-pause or mid-lockout:** `paused` and `callLockoutS` are saved. Energy, `cdS` and the remaining lockout are restored, so the timers stay frozen and the lockout continues from its saved value (B5). The debounce is not saved.
- **E2b Clock rollback:** the lockout counts in sim seconds, so wall-clock changes never lengthen or shorten it. The value is capped at `tc_pause_call_lockout_s` on load.
- **E3 Reload mid-call then pause:** the call has already ended on reload (abilities E2), so there is nothing to end.
- **E4 Unpaid:** the player can pause; G3 applies. The card reads "Paused · Unpaid".
- **E5 Asleep (0%):** the player can pause. It recovers from 0. Resume at 1–29% is Tired, at 0% Asleep.
- **E6 Resting:** Rest doesn't exist in M5.0. In M5.1, Rest is this state with `restAuto` (§4), so the two can't conflict.
- **E7 1–2 workers:** each can be paused, and "All workers paused" appears when every hired worker is paused. This is independent of `manage_all_min_workers`.
- **E8 Hire while others are paused:** the new hire starts working. Pause is per worker.
- **E9 Save migration:**
  - New optional field `workers.{id}.paused?: boolean`, default false. **No SAVE_VERSION bump** (tracksV7 pattern, HoE F2).
  - rc1 saves load with nothing paused. No rc2 saves exist in the wild (rc2 was never built).
  - ~~Dev or QA saves with an rc2 `rest`/`resting` field map to `paused: true`.~~ *(v1.3.14 record-only, HoE M-3 closed (D-HOE-20261030-20 M-3; Saves confirmed via PMW 13:37 CET): no `rest`/`resting` save shape ever shipped (origin/main and rc/v5 e77fc5c, fixtures included), so no rest→paused mapping is built. `paused` is the only shape.)* `restAuto` is ignored in M5.0. *(v1.3.13 record-only, D-HOE-20261030-20 G-6: in v5 `restAuto` is an optional additive v6 key saved next to `paused: true` (rc2 Rest), sanitised on load (an invalid value becomes absent); no SAVE_VERSION bump (stays 6). 'Ignored' applies to the `rc2Refill` = 0 build.)*
  - New optional field `workers.market_hand.callLockoutS?: number` (B5). It is absent when 0.
  - **Downgrade then upgrade (v1.2, HoE §9.5):** RC1 preserves unknown fields (`migrate` passes them through, `step` spreads `{...w0}`, `serialize` writes everything).
    - A pre-Pause build ignores `paused` and `callLockoutS`, so the worker **works** there, draining and paying wages normally, but the fields are written back.
    - **On re-upgrade the worker is re-paused,** with the energy the old build left and no recovery credited for that time. The saved lockout resumes (capped). This is accepted.
  - **Flag off then on, in the same build (E13):** the same outcome as the downgrade above. With the flag off, `paused` and `callLockoutS` are ignored and written back unchanged, so nothing is cleared. A flags-off save is byte-identical to the save rc/v5 before Pause writes from the same input (#91). Against the input itself, only `state` is byte-identical (reload gap < 60 s), because `savedAt` and `saveSeq` are re-stamped on every save. On re-enable the worker is **re-paused**, and the saved lockout is sanitised on load (rule 7) and resumes.
  - A sanitiser treats any non-boolean value as false.
- **E10 Hint priority:** unchanged (§8). The badge counts only eligible workers, which excludes paused ones.
- **E11 Second tab:** the single-sim rule applies.
- **E12 Farm level below `tc_pause_unlock_farm` after a CSR fresh start:** every worker is unpaused (rule 1).
- **E13 Flag turned off with saves already paused (D-HOP-2026-10-30-05, D-HOE-20261030-10):** pause fields (`paused`, `callLockoutS`) are ignored while the flag is off and sanitised on load when it's on. While the flag is off the worker works (draining and paying wages normally), calls aren't lockout-blocked and the lockout doesn't count down, with no error. Nothing is cleared on save: both fields are written back unchanged, so a flags-off save is byte-identical to the save rc/v5 before Pause writes from the same input (#91). Against the input itself, only the save's `state` is byte-identical, and only with a reload gap < 60 s: `savedAt` and `saveSeq` are re-stamped on every save, and a gap ≥ 60 s applies the offline grant (`sum`, `pendingOfflineEggs`). When the flag is turned back on, a worker the player had paused comes back paused, as in the E9 pre-Pause downgrade: "On re-upgrade the worker is re-paused, with the energy the old build left and no recovery credited for that time. The saved lockout resumes (capped)." The lockout is sanitised by the rule 7 load sanitiser.
- **E14 Frenzy while paused** (D-HOP-2026-10-24-06 (e)):
  - Golden-egg Frenzy (×2 on all sales) is unaffected by Pause. It applies to manual sales while the Market Hand is benched.
  - Pausing the Hawker during Frenzy ends Shout (G1), so sales drop from ×2.3 to ×2.
  - The G2 lockout also applies during Frenzy: in the 45 s after a Market Hand resume, sales pay Frenzy ×2 but no Rush or Shout.
  - G5-P pattern (b) is run with and without Frenzy overlap.

## 12. Telemetry and KPIs
**Events** (pinned: `worker_paused`, `worker_resumed`). **TEL-14 (D-HOP-2026-10-24-10 (4)): both are in the M5.0 telemetry subset if and only if Pause ships**; HoE confirms the cost:
- `worker` on both events is the code id `market_hand|coop_hand|hawker|grader` (`src/sim/workers.ts:4`; W1–W4 is spec shorthand only; D-HOE-20261030-19 G-10, v1.3.13).
- `worker_paused {worker, farm, energy_pct, mood: working|tired|asleep|unpaid, unpaid:bool, ability_active:bool, golden_on_screen:bool, frenzy_active:bool}` (v1.3.12: the last two are HoE H-1, engineering/decisions.md L137, D-HOP-2026-10-24-40 precondition 3; sampled from the pre-pause state on the pause tick; collection/telemetry-spec.md L36/L220–221) *(v1.3.15 B-2, D-HOE-20261030-33 (engineering/decisions.md L519–520): `mood` is `working|tired|asleep|unpaid` (code `WorkerMood`, `src/sim/workers.ts:6`), a closed enum, sampled from the pre-pause state on the pause tick.)*
- `worker_resumed {worker, farm, energy_pct, paused_duration_s, cause: manage|manual|auto_full}` (v1.3.11: `auto_full` is listed to match rc2 Rest; this build has no auto-end, so it emits only `manual`/`manage`)
- `session_end` additions: `paused_worker_s` (the sum of paused seconds), `all_paused_s`. *(v1.3.13, D-HOE-20261030-19 G-3: emitted **only when `rc2Refill` = 0** (card #T TEL-AC8). With `rc2Refill` = 1 they are absent; paused time comes from `rest_toggled` `on:true`→`on:false` pairs (`paused_duration_s`).)*
- ~~These alias to `rest_toggled` from M5.1 (§4).~~ **Exclusive emission (v1.3.11, D-PMW-2026-10-30-10; D-HOE-20261030-17/-18):** with `rc2Refill` = 1, only `rest_toggled` emits (rc2-refill-proposal v1.3.1): `worker_paused` maps to `rest_toggled{on:true}`, which also carries `farm` (count), `mood` (`working|tired|asleep|unpaid`, WorkerMood; v1.3.15 B-2), `unpaid`, `ability_active`, `golden_on_screen` and `frenzy_active` (bool; the last two added v1.3.12, HoE H-1); `worker_resumed` maps to `rest_toggled{on:false}`, which also carries `paused_duration_s` (count); `cause: manage|manual|auto_full`. *(v1.3.15 B-2, D-HOE-20261030-33: `rest_toggled.state` = `active|paused|resting`, the Rest/Pause state just before the toggle (rc2 v1.3.16 L215).)* With `rc2Refill` = 0 and `pause` = 1, only `worker_paused`/`worker_resumed` emit. Both families stay in `isPinned`, and no toggle is ever double-emitted. QA assert: exactly one event per toggle in each flag config. Field types per HoE: enums, counts and booleans only, `energy_pct` an integer 0–100, no free text; new events go into `isPinned` with schema tests. AC-P12's `worker_resumed{cause:"manage"}` applies to the `rc2Refill` = 0 build; with `rc2Refill` = 1 the same Manage/Refill emits `rest_toggled{on:false, cause:"manage"}`.

| KPI (F10+ sessions) | Target [P] | Why |
|---|---|---|
| Sessions with ≥ 1 pause | reported (no target; it's optional) | measures adoption |
| "Forgotten pause": paused > 10 min of attended time and never resumed | ≤ 10% of pauses | if above, consider auto-end (the M5.1 Rest behaviour) |
| Income at the same F, sessions with pause vs without | ≤ +1% | live exploit monitor (G5) |
| Market Hand resumes followed by Rush or Shout within 35 s | reported | G2 effectiveness |
Baseline: the Critic/Player L10+ reads (HoP ruling). There is no L10+ telemetry.

## 13. Acceptance criteria (debug setters: set paused, energy and mood, simulate a gap)
- **AC-P1 Flag:** with `m4.flags.pause` = 0, a DOM scan at 360 and 1280 finds no pause toggle. The trace matches the abilities-only comparison save, **pinned to `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` (rc/m4.1-rc1)** (P-12, HoE). HoE re-pins it to the main merge SHA if the #67 merge changes game content. **(a) Save bytes, fixed-time serialize (HoQA 2026-10-30):** with `m4.flags.pause` = 0, run the input save (`tests/fixtures/saves/m4-exp1-committed-unseen.json`, save under `ls["eggfarm.save"]` (the IDB copy is the same string); file sha256 de6b02970cd2991630355e6f5a5e499768ae7d06a50f23c74d56cbb9ba6e7961 (git blob f69b576d, the same at 5d9efa61 and a923206); save-string sha256 8889e66980fdf0fc9beec790967db8de41a7e1964de85fa270856bee4472a9ff (562 B, v6, saveSeq 3, tracksV7 1, farm level 30, no hired workers)) through validate → m5Load → serialize with a pinned `now` and no `saveSeq`. Pass: the output is byte-identical to the pinned comparison save. This is the #91 36-case harness path (`qa/v5-saves/trace-reviews/pr91-7d59dda/probe-saves.test.ts`, sha256 c8b8a7d11fca3c963f96b6ecc8502496ec39d79ba4f1aad026f345fb8e586779, pinned `NOW = Date.UTC(2026, 9, 30, 9)`). **(b) Real path:** Game boot plus `save()` with `m4.flags.pause` = 0 and a reload gap < 60 s (no offline grant). Pass: the saved `state` is byte-identical to the comparison save's `state`; `savedAt` and `saveSeq` are excluded, because they are re-stamped on every save. (b) is limited to committed (tracksV7) inputs such as this fixture. Older v4–v6 saves migrate lazily at Game boot (src/game.ts:74-76), so their `state` legitimately differs; the migration rows cover them (QA-D-1030-ACP1-B). **Status (Saves QA `qa/m5/evidence/acp1-a923206/REPORT.md`, rc/v5 a923206):** (b) passed on this fixture. (a), the fixed-time serialize, stays formally blocked until `engineering/golden/m5-abilities-only` exists.
- **AC-P2 Unlock:** at F9 there is no toggle. At F10 there is exactly one toggle per hired worker.
- **AC-P3 Output and wage:** a paused Market Hand or Coop Hand performs 0 actions and is charged 0 wage over 120 s of sim. The Hawker's demand multiplier reads 1.00.
- **AC-P4 Grader:** at tier 2 (×2.0), a paused Grader gives `graderMult` = 1.00. Asleep and unpaused it gives 1.15. Working and unpaused it gives 2.00.
- **AC-P5 Recovery:** from 20%, after 360 s paused the worker is at 30.0% ±0.1. At 100% it stays at 100.0 and stays paused.
- **AC-P6 Timers:** pause with `cdS` = 0.7 s. After 60 s paused, then Resume, the first action happens 0.7 s ±0.1 after Resume.
- **AC-P7 Debounce:** two taps 1.5 s apart produce 1 state change. Taps 2.1 s apart produce 2.
- **AC-P8 Call end:** pausing a worker with 20 s of its call left ends the effect in ≤ 1 tick, logs `ability_ended{cause:"paused"}`, and leaves `readyAt` unchanged.
- **AC-P9 Lockout:** if Rush and Shout are ready, then for 44.9 s after a Market Hand Resume both are `aria-disabled`. Their button text is exactly "0:ss" (counting down from 0:45) after one `icon-pause.svg` inside the button, with no caption outside it. `aria-describedby` reads "Ready in 0:ss after a break". At 45.1 s both are enabled. A Coop Hand Resume causes no lockout.
  - **B5 (v1.2):** the 45 s is sim time. Resume, wait 10 s, reload: the lockout shows 35 ± 0.5 s left.
  - Resume, then hide for 600 s: on return it still shows the value at the hide ± 0.5 s, because it's frozen offline.
  - Resume, then hide for 20 s (under 60, so simulated live): on return it shows 25 ± 0.5 s left (45 − 20, config-relative: `tc_pause_call_lockout_s` − 20).
  - **P-13:** Resume, then open Settings for 20 s: on close it shows 25 ± 0.5 s left (45 − 20), because the sim ran under the menu. Market Hand sales during the menu are at base price.
  - Blocked taps log `ability_blocked{reason:"lockout"}`.
- **AC-P10 Unpaid:** an Unpaid Market Hand paused and resumed with coins < 1 min of wage is still Unpaid after Resume. It clears only through R9 once coins ≥ the requirement.
- **AC-P11 No free action:** 20 Pause/Resume pairs (respecting the debounce) over 60 s produce no more Market Hand actions than an unpaused Market Hand over the same unpaused time ±1. Every action logs its `wage` event.
- **AC-P12 Manage:** Manage on a paused worker at 40% refills to 100 and resumes it (`worker_resumed{cause:"manage"}`). Manage all with 1 paused and 1 unpaused tired worker refills only the unpaused one, and N shows 1.
- **AC-P13 Hidden or frame gap ≥ 60 s (exactly 60.0 counts), and reload:** run through the real hide/show path (abilities §11).
  - Prerequisite (QA-D-1030-ACP1-B): the Pause PR's committed (tracksV7) save fixture with at least one hired worker (§15). AC-P13 can't run without it.
  - A 59.9 s hidden gap while paused gives +1.66% ±0.05.
  - Hidden gaps of 60.0 s and 600 s give +0 (state at the hide plus the offline grant). So does a visible-throttled 60.0 s gap.
  - After a reload the worker is still paused with the same energy (±0.1) and the same `callLockoutS` (±0.5 s).
  - An rc1 save loads with no `paused` fields set to true. SAVE_VERSION is unchanged.
  - Downgrade/upgrade: a save written by a pre-Pause build containing `paused: true` loads paused again (E9). Flag off then on (E13): start from a save written with `m4.flags.pause` = 1 and farm level ≥ `tc_pause_unlock_farm` in which the Market Hand has `paused: true` and `callLockoutS: 30`. (1) Load it with `m4.flags.pause` = 0 less than 60 s after the input's `savedAt` (reload gap < 60 s, so no offline grant applies), and save with no sim step. Pass: there is no pause toggle; `state` byte-identical to the input (gap < 60 s); `paused` and `callLockoutS` present and unchanged; `savedAt` and `saveSeq` re-stamped as on every save. (2) Play 60 s with the flag at 0, then save. Pass: the Market Hand worked (energy drained, wages logged), Rush and Shout were not lockout-blocked, and the save still has `paused: true` and `callLockoutS: 30`. (3) Load that save with `m4.flags.pause` = 1. Pass: the Market Hand is paused, its energy equals the saved value (±0.1) with no recovery credited for the flag-off time, and `callLockoutS` reads 30 (±0.5 s). Repeat (3) with a saved `callLockoutS` above `tc_pause_call_lockout_s` and with a negative value. Pass: they read `tc_pause_call_lockout_s` and 0 (rule 7 sanitiser).
- **AC-P14 (sim, Economy G5-P):** patterns (a), (b), (d), (e), (f) and (g) pass their §10 bands (B-X1b). G1 holds against the X1 oracle in `research/v2-slices/economy.md` §13.2a (seeds 1–200, every window; e.g. worst seed 1.936 optimal/frenzy-holder; ≤ 2.00 P95, ≤ 2.25 worst, ±20% band). The L0–9 trace is byte-identical with the flag on and off.
  - **Recorded (v1.3, §10):** (a), (d), (e) PASS; (b) PASS at 45 s (worst +1.6%); (g) PASS; G1 per §13.2a, not the 100-seed checkpoint figure. **Documented variance:** pattern (f) full-coop Coop Hand pause, +2.5% on one optimal F10 seed from golden-egg Frenzy timing, accepted by HoP (D-HOP-16); the re-check on the harness of record must report it. pending re-measure on the harness of record.
- **AC-P15 Layout:** at 360 × 640 and 1280, the toggle box is ≥ 44 × 44 px, at least 8 px from every other interactive box, and doesn't intersect the avatar's tap area or the sticky bar. With every worker paused, the "All workers paused" line shows and the Activate-all `getBoundingClientRect()` doesn't change.
  - **Two-row layout (v1.1.2):** at 360 and 1280, the toggle is the leftmost box of the full-width action row, which sits below the avatar/name row.
    - Its top equals the tops of Manage and call ±1 px.
    - Toggle → Manage → call are 8 ± 1 px apart.
    - Manage and call compute `flex-grow: 1` and are equal width (124 ± 1 px at 360).
    - Each non-Grader card is **128 ± 1 px** tall with `m4.flags.pause` = 1 and = 0.
    - On a yawning, unpaused card, `.yawn-ov` computes to `top:6px; right:8px` and doesn't intersect the toggle.
  - **No wrap:** in every Manage and call state (abilities AC-M5A-8 list), each action-row label is ≥ 14 px on one line, with `scrollWidth ≤ clientWidth`. The toggle stays 44 × 44.
  - It contains `icon-pause.svg` (working) or `icon-resume.svg` (paused) and no U+23F8 or U+25B6 characters. Its `aria-label` is "Pause {role}" / "Resume {role}", and `aria-pressed` matches.
- **AC-P17 Paused look and copy:**
  - **Layout part:** the paused card is 128 ± 1 px (it doesn't grow). The chip sits inside row 1, does not intersect the action row, and the toggle shows `icon-resume.svg` in the same 44 × 44 box.
  - Until the avatar ships (rc1), the saturate and chip clauses are N/A. The pill and sub-line clauses still apply.
  - A paused card has computed `filter: saturate(0.4)` on the avatar art element only. Its pill, text, chip and buttons compute `filter: none`.
  - The pill text is "Paused" with a neutral-grey background (not `--c-danger`/red), and its text contrast is ≥ 4.5:1. The sub-line and button text are also ≥ 4.5:1.
  - The paused card has exactly one `icon-pause.svg` chip, 20 ± 1 px, whose bottom-right is within ±2 px of the avatar's bottom-right. It is `aria-hidden`, with no tabindex or handler.
  - It has **0** overlay images (no `overlay-yawn.svg` or `overlay-asleep.svg` from Pause). A paused worker at ≤ 50% energy shows no yawn cue, because Pause isn't Working.
  - The sub-line is exactly "On break · no wage · recovering" at 40%, "On break · no wage" with `rest_recovery_mult` = 0, and "Paused · Rested 100%" at 100.0.
  - The "All workers paused" line is 12 px, `--c-ink-2`, and has no tabindex or handler.
- **AC-P16 Coop-full: DEFERRED until the coop-full hint ships** (N/A for M5.0; B6, **accepted by HoQA** with conditions a–c, v1.2.1). When it returns, the P-10/TEL-11 alias fix comes with it: use the TEL-11 event name, not `coop_full_start`. The rc1-b1 coop-full hint, its `paused` variant and `coop_full_start.coop_hand_state` aren't built: RC1's `coop_full` carries only `phase`/`durationMs`. Reinstate it when rc1-b1 ships. Original text, kept for then (no layout part): with the Coop Hand paused and the coop full, the hint shows the existing `paused` variant text (unchanged from rc1), the coop-full start event carries [DEFERRED] `coop_hand_state = "paused"`, and no Coop Hand nudge shows.
- **AC-P18 Coop-full guard for M5.0** (HoQA condition a): with `m4.flags.pause` = 1, the Coop Hand paused and the coop full for 120 s at 360 and 1280:
  - the build shows **no** Pause-specific coop-full UI: no `paused` hint variant and no pause copy in any coop hint. Only the existing RC1 `coop_full` behaviour is allowed.
  - The telemetry ring contains **0** events named `coop_full_start` and **0** events with a `coop_hand_state` field.
  - RC1's `coop_full` event keeps only `phase`/`durationMs`.
- **AC-P19 `mh_paused` chip (D-HOP-2026-10-24-18; sales-stopped-spec §7.1 / SS-30; tested as SS-30):** with `m4.flags.pause` = 1, MH Paused, a non-empty queue and eggs in stock:
  - (1) with no sale of any kind, the chip [icon-pause] "Market Hand on break · Sell all" is absent at 19.9 s and present at 20.1 s;
  - (2) tapping it runs Sell all, and the Market Hand is still Paused afterwards (no resume, no `pause_toggled`);
  - (3) a manual or Hawker sale at 15 s resets the hold, so the chip first appears 20 s after the last sale;
  - (4) it replaces D-HOP-11's "no chip while paused": a paused MH never shows the asleep/unpaid causes, only `mh_paused`, and only under (1).

## 14. Open questions
1. ~~0.25× wording~~ **Resolved (a):** recovery at 0.25× the drain rate (rule 3).
2. ~~Unlock level~~ **Resolved (b):** F10.
3. ~~Auto-end~~ **Resolved (c):** no auto-end in M5.0. The "forgotten pause" KPI (§12) decides it for M5.1 Rest.
4. ~~Art & UX~~ **Cleared** by the signoff (16:20). The icons, position, pill, sub-line and line are folded into §8.
5. ~~HoE sizing~~ **Resolved (HoE §15 v1.2):** 2.5–3.0 dd (§9.2 2.25–2.75 + 0.25 P-12 golden, §13), conditional on B6.
7. **HoQA:** agree to AC-P16 being N/A for M5.0 (B6).
8. **HoE re-check (v1.2):** B5 is answered as HoE proposed (`workers.market_hand.callLockoutS`, sim seconds, saved, frozen offline). Also re-check the B3 card conflict (abilities Q8), since the toggle lives in the two-row card's action row.
9. **Economy:** the `tc_pause_*` renames, and the sync mapping for `rest_recovery_mult` (it exists in the CSV but isn't synced).
6. ~~Art signoff conflicts~~ **Closed (Head of Art & UX answers, v1.1.1):**
   - (a) Overlay: dropped. The state is shown by saturate(0.4) + the grey pill + a 20 px pause chip.
   - (b) Card growth: none. The toggle goes in the action row, and the measured fit is in abilities §5.2a.
   - (c) 40% means `saturate(0.4)`, on the avatar only.
   - (d) "⚠ Collect eggs" is removed from these specs and becomes polish ticket P-ICON-WARN.
   - Coach template: confirmed (abilities Q7a).

## 15. Build size and dependencies
- **Size: S–M, 2.5–3.0 dd eng** (HoE `engineering/m5.0-sizing.md` v1.2 §15 "Totals after §11–§14" (with §0 headline, §11 16:40 and §13): "Pause 2.25–2.75 → 2.5–3.0, P-12 golden"). It includes the G2 lockout and saving it, rule 10 and `assumeWorking` (§9.2), plus the P-12 pinned comparison golden (§13, +0.25). **+1 QA day** (HoE §2: QA ≈ 9.5 → ≈ 10.5 with Pause), **+0.25 Art**. M5.0 with Pause: **≈ 32–40 dd** (§15).
  - **Conditional on B6:** the figure holds only if AC-P16's coop-full variant and the fatigue-chip exclusion stay N/A or descoped for M5.0.
- It's off the critical path: +0 calendar days with 4 engineers, ≈+1 day with 3.
- **Depends on:**
  - abilities v1.0 (`m5-worker-abilities-spec.md`) sim and UI, since it touches eligibility, the card layout and the sticky-bar reservation
  - HoE F1 / F2 / F3
  - Economy G5-P (done, §10; pending re-measure on the harness of record)
  - Art mocks
- **PR order:** last, behind `m4.flags.pause`.
- **Pause PR deliverable (QA-D-1030-ACP1-B):** a committed (tracksV7) save fixture with at least one hired worker. The AC-P1 fixture has no hired workers, so the pause toggle can't be reached, and AC-P13 can't run without this fixture.
- **Used by:** M5.1 #8 Rest.

## 16. Design-doc review log (skill: `/home/box/agent-data/workflows/design-doc-review/SKILL.md`; the lenses were run by me, since I couldn't delegate)
**Review 1 (on the v0.1 stub, 16:05): verdict MAJOR REVISION NEEDED.** Completeness 3/8: Overview, Edge cases and ACs were partial. Player fantasy, Formulas, Dependencies, the Pause-vs-Rest detail and the exploit guards were missing.

Blocking items:
1. "Exploit guard: Economy checks…" isn't a guard. There was no threat model and no Market Hand–specific rule.
2. The Grader paused value was unstated. Sources conflict: "no output" in m4-manage §2.6 vs 0% in rc2.
3. Value conflict: the 0.5× recovery in m4-manage-proposal §2.6 and PA-1 vs the locked 0.25× (decisions.md:9). The 0.5× wasn't marked as superseded.
4. The ACs weren't testable ("resume works").
5. Separability and the flag weren't defined.
6. Interactions with Manage/`needManage`, the Unpaid-resume reserve, abilities, coop-full and the fatigue chip were missing. HoE `m5.0-sizing.md` §5 lists all of them.

Recommended items: the M5.1 Rest convergence, save migration detail, UI placement against the abilities stack, and telemetry fields.

**Fixes in v1.0:**
- §7 adds the threat model and guards G1–G6. G2 (stockpile-and-Rush lockout) and G3 (Unpaid laundering) are Market Hand–specific.
- Rule 4 sets the Grader to 0% (HoP item 9).
- The header and §5 rule 3 supersede 0.5×.
- AC-P1–P16 are measurable.
- `m4.flags.pause` is defined, as are rules 8 and 10 and §8.
- §4 covers convergence, E9 covers migration, §8 covers placement, and §12 covers telemetry.

**Review 2 (on v1.0, 16:58): verdict APPROVED.** Completeness 8/8.
- **Value check against CSV c7bb783f:** the cited columns match (cited by name in v1.2). Four new keys are marked as new.
- **Formula boundaries** pass (§6).
- **Dependencies** run both ways: the abilities spec references `m4.flags.pause` and this spec.
- **Carried, non-blocking:** Q1 (wording of HoP's 0.25×; the source is unambiguous), Q2 and Q3 (HoP calls with recommendations), Q4 (Art) and Q5 (HoE).
- **Disagreements:** HoP's R13 (drop) vs the CEO's override. This is recorded, not resolved; the CEO ruled.
- **Scope signal:** S–M.

**v1.0.1 (17:15) delta check:** no rule changes. Rules 1 and 3, §9, E14 and §14 now match D-HOP-2026-10-24-06 (a)–(e). E14 is consistent with abilities E10 and AC-M5A-17. **Gates before build:** Economy G3 and G5-P, HoE buildable confirmation, Art labels (Q4). The review verdict stands: APPROVED.

**v1.1 (16:18) delta check against `art-ux/m5-workers-ui-signoff.md` (Head of Art & UX, 2026-10-24 16:20):** no rule changes. Signoff §2 lockout caption → rule/AC-P9; §4 → §8, AC-P15 and AC-P17. Conflicts are recorded in §14 Q6. Verdict stands: APPROVED.

**v1.1.1 (16:22) delta check:** Q6 is closed. §8, AC-P15, AC-P16 and AC-P17 match Art's answers 1–4. Answer 2's fit is measured in abilities §5.2a. New dependency: the rc1 placeholder card has no avatar for saturate and the chip. Verdict stands: APPROVED.

**v1.2 (16:30) review delta:** B5 and B6 are answered, and the Ask 1 wording, columns by name, `tc_` renames and downgrade/upgrade behaviour are done.
- B5 adds one save field and the AC-P9/AC-P13 clauses. No rule changed: G2 is still 30 s, now defined in sim seconds.
- The `pause_recovery_mult` name used in v1.1 was a slip for `rest_recovery_mult`, and is fixed.
- Verdict: **APPROVED (spec)**. Build readiness is pending HoE's re-check, HoQA (B6) and Economy G5-P.

## 17. HoQA testability v0.2: resolution per ID (Pause; v1.2.1)
| QA ID | Resolution |
|---|---|
| P-10 / TEL-11 | Closed for M5.0. AC-P16 is kept and tagged **deferred until the coop-full hint ships**. The `coop_full_start`/`coop_hand_state` references are tagged [DEFERRED], and the alias fix returns with them. Guard AC-P18 checks that M5.0 has no coop-full Pause behaviour and emits neither name |
| P-11 | Closed: `rest_recovery_mult` everywhere. `pause_recovery_mult` appears only in the v1.2 change note (verified by text search) |
| P-12 | Closed (HoE v1.2.2): AC-P1 comparison pinned to `5d9efa61c5e6ee31ca9ebdec20ee70167d31d463` (rc/m4.1-rc1). HoE re-pins it if #67 changes game content |
| P-13 | Closed: sim seconds, saved, frozen whenever the sim doesn't advance (offline, ≥ 60 s gap, reload). It keeps counting under menus and short hides, because RC1's sim and Market Hand sales run there. This differs from QA's premise; call durations use the focus clock instead. AC-P9 |
| P-14 | Closed: Art accepted the avatar dependency (decisions.md 2026-10-24 16:25). Until the avatar ships, the pill and sub-line carry the state; AC-P17 saturate/chip clauses are N/A in rc1 |
| TEL-14 | Closed (D-HOP-10 (4)): `worker_paused`/`worker_resumed` are in the M5.0 subset if Pause ships |

**v1.2.1 (16:36) review delta:** no rule changes. Rule 7 states the lockout clock explicitly. There is one new guard AC (AC-P18), the coop-full references are tagged deferred, and the time-only lockout label is folded in. Verdict: **APPROVED (spec)**.

**v1.2.2 (16:39) review delta:** P-12 is pinned, and HoE agreed the lockout clock. No rule changes. Verdict: APPROVED (spec).

**v1.2.3 (16:48) review delta:** AB-12 closed (no comma in rule 7 and AC-P9). No rule changes. Verdict: APPROVED (spec).

**v1.3 (16:51) review delta (final):** D-HOP-16 folded in. Lockout 30 → 45 s in rule 7, G2, E14, §9 and AC-P9 (0:45, 44.9/45.1 s, reload 35 s). G5-P result in §10 and AC-P14, with (f) as documented variance. Tunables cite the §13 draft columns. All Economy values are pending re-measure on the harness of record. Verdict: **APPROVED, FINAL**.

**v1.3.1 (16:53) review delta:** D-HOP-18 `mh_paused` chip folded in (§8 bullet, AC-P19), pointing to sales-stopped-spec §7.1/SS-30. No other rule changes. Verdict: APPROVED, FINAL.

**v1.3.2 (17:17) review delta:** sizing only, aligned to HoE §15 (2.5–3.0 dd; with Pause ≈ 32–40). No rule changes.

**v1.3.3 (17:21) review delta:** CSV draft citation → 8dc90e2b… (D-HOP-24). No rule changes.

**v1.3.4 (17:54) review delta:** HoQA errata E-1 (AC-P9 25 s), E-2 (AC-P19 into §13; G5-P (e)–(g) with B-X1b bands), E-3 (AC-P14 → §13.2a). Wording only. Verdict: APPROVED, FINAL.
