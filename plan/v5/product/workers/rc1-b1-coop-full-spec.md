# B-1 (rc1 must-fix): real net rate and Coop-full stall (PM, Workers) v1.0.6, Oct 24 2026 (v0.1 approved by Head of Product; final copy is art-ux/b1-coop-full-copy.md v1.0)
Sources: decisions.md 2026-10-16 19:40 plus the CEO amendment. Repro: qa/m3-recheck/cut-a-1371305.md.
Consulting: PM Collection on the coop state, Art & UX on final copy. Builder: Senior Engineer, UI & rc1 Fixes. Verifier: QA.

## Problem
When the coop is full, laying stops, but the top-bar rate and the goal ETA still show theoretical production, so the player sees a positive rate and a frozen ETA while earning nothing.

## Rules
1. **Rate definition.** The top-bar rate is realized net income per second: coins actually credited from sales over a trailing 5 s window, divided by 5, minus wages per second. It is never theoretical lay or production rate. It uses the shared incomePerSec selector (src/econ/income.ts) that the HUD, cards, ETA, payback and bestBuy already read, so all of them agree. The 5 s window size is tunable.
2. **Coop full.** (Confirmed by PM Collection 2026-10-16.) "Coop full" is `state.coop >= coopCapacity(state.farmLevel, balance)`, which is the existing check in `Game.checkCoopFull()` (game/src/game.ts:63). Production is clamped at the cap and any excess is lost (M1 decision). Use that one check everywhere; don't add a second flag. A full episode ends when the coop drops below the cap or the cap rises: a manual Collect tap that moves at least 1 egg (taps remove only whole eggs), a Coop Hand collect, or a cap increase from a Farm upgrade. Save load/import and debug edits re-evaluate the same check. The welcome-back/offline grant does NOT end it, because offline eggs go to the Basket and the coop is unchanged. A tap on a full coop always moves eggs, so it always ends the episode unless production refills it in the same tick. While it's true:
   - The coop shows a "Coop full" badge.
   - The top-bar rate shows a "Coop full" chip beside the number, with the number still visible.
   - The number decays toward its real value as the 5 s window rolls, and it's never held at the last positive figure.
3. **Goal ETA.** The goal ETA is (goal − coins) ÷ real net rate. If the rate is ≤0, it shows "—", never a frozen or stale value. It's recalculated every tick.
4. **Hint.** While the coop is full, show the hint "Coop full: collect eggs or hire a Coop Hand".
   - "Hire a Coop Hand" appears only when it's unlocked (F7) and not already hired, chosen by the existing best-payback picker.
   - If the Coop Hand is hired but asleep or unpaid, the hint reads "Coop full: collect eggs or refill your Coop Hand".
   - Otherwise it reads "Coop full: collect eggs".
   - The hint clears within 1 s of the coop dropping below capacity.
   - Final copy comes from Art & UX; the strings above are placeholders until they confirm.
5. **Accessibility.** Each state keeps its text and ⚠ icon, so colour is never the only signal. The aria label of the rate reads "Net income plus/minus $X per second, coop full".
6. **Telemetry.**
   - coop_full_start {farm_level, coop_cap, coop_hand_state: none|working|tired|asleep|unpaid|paused, t}
   - coop_full_end {duration_s, resolved_by: manual_collect|coop_hand|upgrade|other}
   - Each fires once per transition.

## ACs
- AC-B1: Fill the coop with no Coop Hand. Within 1 s the coop shows "Coop full" and the rate shows the "Coop full" chip. Within 6 s, with no sales, the rate equals −wages/s (0 with no workers), shown in red with ⚠.
- AC-B2: With the coop full and the rate ≤0, the goal ETA shows "—". With the coop not full and the rate >0, the ETA equals (goal − coins) ÷ rate within ±1 s and counts down.
- AC-B3: The rate equals realized sales minus wages, checked against the telemetry or ledger over 6 samples, within ±$0.01. The HUD, the cards and the ETA all read the same value at the same tick (same as AC-R7).
- AC-B4: The hint variant matches the Coop Hand state. Before F7 it reads "collect eggs" only. With the Coop Hand unlocked but not hired, it includes "hire a Coop Hand". With the Coop Hand asleep or unpaid, it reads "refill your Coop Hand". The hint clears within 1 s after a manual collect.
- AC-B5: coop_full_start and coop_full_end each fire exactly once per full episode, with correct fields. duration_s matches wall time within ±1 s.
- AC-B6: The text, the ⚠ icon and the aria label are present in every state, at 360 and 1280.
- AC-B7: Regressions all pass: the rc0 suite, S2-8 (net = income − wages once), T6 (HUD text matches the aria number), and AC-R1 through R9.

## Offline
Offline earnings are unchanged. On return, the rate and the ETA use live values once the 5 s window refills. Until then, the rate uses whatever partial window exists.

## v0.2 changes (Oct 16): PM Collection input and Head of Product's added AC
- **Coop-full flag (PM Collection, per collection/feature-spec.md):**
  - The coop is full when floor(coop) ≥ cap. Anything laid above the cap is lost.
  - The state ends when a tap brings the coop back under the cap. A tap removes only whole eggs.
  - Returning from the background after under 60 s catches up at most to the cap. After 60 s or more, the offline/Basket path applies, which bypasses the cap.
- **Badge:** reuse the existing coop "Full!" badge and its frenzy/streak variants instead of adding a second "Coop full" badge. Art & UX will decide one label for the badge and the rate chip.
- **Telemetry (this replaces rule 6):**
  - coop_full_enter {farm_level, coop_cap, coop_hand_state, t}
  - coop_full_exit {duration_ms, exit_reason: tap|coop_hand|cap_upgrade}
  - Two session totals: coop_full_ms and eggs_lost_while_full.
  - AC-B5 applies to these names.
- **AC-B8 (Head of Product):** within 5 s of the coop filling, the top-bar rate stops showing positive income. The test case is no Coop Hand and no other sales source, such as a Market Hand selling eggs already collected. If real sales do continue, the rate shows their real net value, because rule 1 still applies.

## v0.3 (Oct 16): reconciled with existing code, per PM Collection. These rules supersede earlier ones where they conflict.
- **Flag:** use the existing Game.checkCoopFull() (game/src/game.ts:63, `state.coop >= coopCapacity(...)`) everywhere, with no new flag. Use state.coopFullS for durations.
- **Episode end:** a manual Collect tap, a Coop Hand collect, or a cap increase from a Farm upgrade. Save load or import and debug edits re-evaluate the flag. The offline grant goes to the Basket and does not end an episode.
- **Telemetry:** extend the existing `coop_full` event (phase start/end, durationMs) instead of adding new events. Add these fields: farm_level, coop_cap and coop_hand_state on start, exit_reason (tap|coop_hand|cap_upgrade|reload) on end, and the session totals coop_full_ms and eggs_lost_while_full. Each transition fires exactly once, so there's no double-firing. AC-B5 checks this event.
- **Badge:** one badge only. It's the existing coop badge (ui/app.ts:68), relabelled to Art & UX's final label, never shown twice.
- **Hint:** the new B-1 hint replaces the Coop Hand tip in workers-ui.ts ("Coop full! Hire a Coop Hand to collect eggs for you."). Remove that tip and its coop_hand_tip_full_s trigger.
- AC-B9: while the coop is full, exactly one badge and one hint are on screen, and the old tip never appears.

## v1.0 (Oct 16): final copy from Art & UX (art-ux/b1-coop-full-copy.md v1.0). This supersedes the placeholder strings in rules 2, 4 and 5.
- **Rule 2:** the badge and the rate chip both read "⚠ Full!". The badge reuses the existing .fullbadge, including its frenzy and streak variants. The chip is the new .ratechip, white on --c-danger #B83B37, and the rate number stays visible.
- **Rule 4 (hints):**
  - "⚠ Collect eggs" before F7, or when the Coop Hand is working, tired or paused.
  - "⚠ Collect or hire Coop Hand" when it's unlocked but not hired.
  - "⚠ Collect or refill Coop Hand" when it's asleep or unpaid.
- **Rule 5 (aria):** "Net income minus $1.25 per second. Coop full." The plus and zero forms are in the copy file. All contrast is AA.
- **QA note:** the badge grows from about 40 px to 54 px, so add it to the coop live-rect check.
- AC-B4 and AC-B6 now use these exact strings.

## v1.0.1 (Oct 16 20:55): answers to Engineering's build questions
- **Hire hint:** shows when the Coop Hand is unlocked and not hired. The code has no best-payback picker, and for a full coop the Coop Hand is the only relevant hire, so this condition gives the same result.
- **Paused:** rc1 has no paused state (Pause is an M4 feature), so ignore the paused variant until M4.
- **exit_reason:** add "other" as the fallback for unknown exits. "reload" stays for save load or import.
- **Partial window:** after an offline return or a fresh start, divide realized sales by the elapsed time, min(5 s, t), not by a fixed 5 s, so the rate doesn't start low.
- **Open with Art & UX:** the aria money format, the hint's placement at 360, and the PENDING marker in the copy doc.
- Aria (Art & UX, 21:00): spell out the suffix, e.g. "Net income minus $12.3 thousand per second. Coop full." The visible text stays "$12.3K". The copy doc is confirmed SIGNED OFF (19:44).
- v1.0.2 (Oct 16 22:50): exit_reason gains 'hidden' for an episode left open when a hide of 60 s or more splits the session. The pinned coop_full end event is capped at 100 per session (M3-AC7). Totals keep counting past the cap, and capped:true is logged once. Agreed with PM Collection.

- **Proposed (PM, Collection, 2026-10-16, telemetry-spec v0.4) — needs PM Workers ack:** add `hidden` to `exit_reason` (tap|coop_hand|cap_upgrade|reload|hidden|other) for an episode closed when a hidden tab ≥ session_hidden_end_s splits the session. Also: only `coop_full{phase:end}` is pinned, cap 100 episodes/session, totals keep counting past cap, one `capped:true` event.

## v1.0.3 (Oct 16 23:30): addendum from Player session 3 (pain #1, workers fall asleep silently)
- **AC-B10 (offline return):** load a save where the coop is full and the Coop Hand went Asleep while offline. Within 1 s of the welcome-back sheet closing:
  - the "⚠ Full!" badge, the rate chip and the "⚠ Collect or refill Coop Hand" hint all show
  - the Asleep banner (rc1 R-spec) is visible
  - coop_full_start fires once, with coop_hand_state=asleep
  The welcome-back sheet also names the cause: "Your Coop Hand fell asleep. Coop filled up." The exact string comes from Art & UX.
- **AC-B11 (Market Hand asleep while the coop isn't full):** sales stop, and the rate shows the real net value, which is negative or equal to −wages, within 6 s. The Asleep banner names the Market Hand within 1 s.
- **Polish P-1:** the "Manage all" control must not overlap Market Hand's Manage/Refill button at 360 or 1280, with at least 8 px between them and both hit targets 44 px or larger. In rc2 the Shift sheet replaces Manage all altogether.
- Final copy: art-ux/rc2-workers-copy.md v1.0 overrides placeholder strings (Oct 16 23:55).

## v1.0.4 (2026-10-24 16:46 CEST): D-HOP-2026-10-24-14 (fix/m41-patch1 asleep-signal copy)
- **Market Hand, hired and Asleep or Unpaid:** the card banner and farm banner read **"Market Hand asleep: sales stopped"**. This supersedes "{Role} asleep: sales slowed" and "{Role} unpaid: sales slowed" (art-ux/rc2-workers-copy.md rows 83 and 86) for the Market Hand only. It is true because automatic sales are 0 and the §4.2 HUD rate now shows it.
  - Unpaid uses the same string, per the ruling as written. Recommend "Market Hand unpaid: sales stopped" for Unpaid. **HoP to confirm.**
  - Hawker rows stay unchanged (Hawker sales aren't 0 while it's off). Coop Hand rows stay unchanged.
  - Art: re-check the copy and update rc2-workers-copy.md rows 83/86 in the same pass. PM Workers does not edit Art's file. Existing visuals only.
- **AC-B11 (revised):** the Asleep banner reads exactly "Market Hand asleep: sales stopped" within 1 s, and no MH surface shows "slowed". Add **AC-B11u:** the same for Unpaid (string per HoP's confirmation).
- **Surface map vs m4.2 fatigue spec:** "Market Hand asleep: sales stopped" is the **card/farm banner** in patch1 (rc1 banner). The m4.2 effect string "auto-selling stopped" belongs to the **M5.0** Rule 3 asleep toast and welcome-back line (`{Role} fell asleep: {effect}. Tap Refill.`). **Conflict to rule:** sales-stopped-spec SS-20 also puts "auto-selling stopped" on the card and farm banner in M5.0. Recommend keeping the D-HOP-14 banner string in M5.0 and using "auto-selling stopped" only in the toast and welcome-back line. **HoP/PM Market to rule.**

## v1.0.5 (2026-10-24 16:52 CEST): Art §6 copy + D-HOP-2026-10-24-17
- **Copy mirrors `art-ux/rc2-workers-copy.md` §6 (amended 16:52, D-HOP-14) and D-HOP-2026-10-24-17.** Icons are SVG (moon = asleep, warning = unpaid), 14 px, no emoji; the banner never wraps. **Drop the role name only if the full string doesn't fit** (not always at 360); aria always keeps the full sentence with the role. Art checks the fit on the patch SHA.
  | State | Banner | Aria | Role-drop (only if the full string doesn't fit) |
  |---|---|---|---|
  | Market Hand Asleep | Market Hand asleep: sales stopped | Market Hand is asleep. Auto-sales have stopped. | Asleep: sales stopped (Art-confirmed) |
  | Market Hand Unpaid | Market Hand unpaid: sales stopped | Market Hand is unpaid. Auto-sales have stopped. | Unpaid: sales stopped (Art-confirmed) |
  | Hawker Asleep / Unpaid | Hawker asleep: sales slowed / Hawker unpaid: sales slowed | Hawker is asleep. Sales are slowed. / Hawker is unpaid. Sales are slowed. | unchanged |
- **Surface rule (D-HOP-17):** the banner always says "sales stopped" for the Market Hand. "Auto-selling stopped" appears **only** in the asleep toast and the welcome-back line. A Market Hand stall never uses "production stopped". This closes the v1.0.4 Unpaid question and the SS-20 banner conflict.
- AC-B11 / AC-B11u / AC-R1m: the banner text, aria and role-drop (only when the full string doesn't fit) match the table exactly; no Market Hand banner contains "slowed" or "auto-selling".
- 2026-10-24 16:53 CEST (v1.0.5 amend): Art confirmed the role-drop strings exactly ("Asleep: sales stopped" / "Unpaid: sales stopped"; aria unchanged). Drop condition = only if the full string doesn't fit.

## v1.0.6 (2026-10-24 16:56 CEST): Coop Hand rows from art-ux/rc2-workers-copy.md §6 (Art update)
| State | Banner | Aria | Role-drop (only if the full string doesn't fit) |
|---|---|---|---|
| Coop Hand Asleep | Coop Hand asleep: collecting stopped | Coop Hand is asleep. Auto-collecting has stopped. | Asleep: collecting stopped |
| Coop Hand Unpaid | Coop Hand unpaid: collecting stopped | Coop Hand is unpaid. Auto-collecting has stopped. | Unpaid: collecting stopped |
- **Why "stopped":** in M5.0 the asleep collect share is 0, and `workers.ts` `isOff` treats Unpaid the same as Asleep, so automatic collecting really is 0. Hens keep laying; only collecting stops. If the 0.15 fallback (`w2_asleep_collect_share`) ever ships, these two rows go back to "collecting slowed".
- Replaces every "collecting slowed" used for an Asleep or Unpaid Coop Hand (the earlier rc2-copy rows 84/87). "Slowed" stays for **Tired** only.
- The Coop Hand's rc1 "Asleep, production stopped" / "Unpaid, production stopped" (AC-R1, AC-R3) becomes the row above. **AC-R1c:** let the Coop Hand fall asleep; within 1 s the banner reads exactly "Coop Hand asleep: collecting stopped" with the aria above, and no Coop Hand banner contains "slowed". Unpaid is the same with its row.
