# rc2 Workers buildability review: Refill v1.0 + First-hire nudge v1.0
Engineering, Oct 16 2026, about 23:30 Europe/Belgrade. A read-only review against `m4/m4a-tracks-v3` @ e38cf76 (/workspace/wt-features-v3) and origin/main @ a01faea.
Specs: product/workers/rc2-refill-proposal.md (the v0.3 to v1.0 sections win), product/workers/rc2-first-hire-nudge.md v1.0, product/economy.f1-m4cols.csv (it exists in egg-farm-studio/product, but not in the repo yet).

## Verdict
**Buildable, with 2 blockers and 9 rules that need a decision before code starts.**
Estimate: about 3–3.5 dev-days for Refill (charges, Rest, Shift sheet, telemetry, tests) plus about 1 day for the nudge (4–5 days in total), not counting Boost. **Boost depends on the M4 abilities, which have no sim code in either branch.** Only `balance.workers.ability_*` exists in balance.json. Abilities add about 1.5–2 days if they aren't already on someone's plate.

## What exists today (what this replaces)
- `sim/actions.ts` `manage` / `manageAll`: refill to 100% at ≤ `manage_prompt_threshold` (0.4), with a shared `manageCdS` cooldown of 30 s. `manageAll` needs 3 or more hired workers.
- UI: Manage buttons on each card in `workers-ui.ts`, plus the Farm View / nav "Manage all" button (one moved element, B8, in `app.ts:164-171`). The onboarding coach "Tap Manage" is at `app.ts:602-612`.
- Energy: `tick.ts` drains working and tired workers. Asleep stays at 0, and Unpaid doesn't drain. Moods are working (≥ `tired_below_pct` 30), tired, asleep and unpaid. There is **no Pause/Rest state** and **no abilities**.
- Hidden tab / gaps (`game.ts` frame): a gap under 60 s is simulated in full. A gap of 60 s or more **simulates the first 60 s, then freezes**. A closed game that's away 60 s or more goes through the offline grant, and workers aren't touched offline.
- Save: `SAVE_VERSION = 6`. M4-A adds fields to v6 without a bump (tracksV7 marker). `manageCdS` is persisted.
- `incomePerSec(s, b, opts)` exists in `econ/income.ts` and takes a `working` override, which you can use for a "what if this worker is asleep" diff.

## Blockers
- **B1. Boost / abilities don't exist.** The combo rule (45 s when used within 10 s of a refill), the Boost row action, "Boost blocked while Paused", the ability cooldown on the row, Activate-all in the sheet header and `boost_used {combo}` all need the m4-abilities-spec sim: ability state, timers, effects and the cooldown that ticks in real time offline. One of these is needed:
  - (a) abilities ship in rc2 first, as their own task, or
  - (b) the Refill sheet ships without the Boost column and the combo rule (RF4 deferred).

  PM/HoP need to choose.
- **B2. Flag scoping is undefined.** Abilities are an M4 feature, and the M4 flag (`balance.m4.enabled`) gates the tracks today. Does Refill v1.0 (charges, Rest, one entry point) ship to **flag-off** players too, or only with M4 on? If it's only M4-on, flag-off keeps Manage and its 30 s cooldown, and we maintain two worker UIs. Recommendation: Refill and Rest ship regardless of the flag, and Boost/combo appear only when abilities are live. Needs a ruling.

## Ambiguous rules (please answer in v1.1)
1. **Hidden-tab freeze and the code's 60 s rule.** The spec says "Hidden <60 s is simulated normally, ≥60 s is offline". The current engine simulates the **first 60 s** of a long gap online, then freezes. Does a 10-minute hidden gap give 60 s of regen and drain, or 0? Recommendation: keep the engine rule, so the first 60 s count and the rest freeze. It's one code path and matches Collection.
2. **How to measure "hidden".** Do we use `visibilitychange` timestamps, or the wall-clock gap between frames, which is what the engine uses? A throttled but visible tab (low-power mode, a background window) also produces long gaps. Recommendation: the frame gap only, with no separate visibility timer.
3. **Charges across save/load.** Should the partial progress (seconds into the current 150 s) persist? Recommendation: persist `refillCharges` and `chargeProgressS`, and on load after a gap of 60 s or more resume from the saved progress with no catch-up, so offline is frozen. Confirm.
4. **Does Pause/Rest stop regen?** Read as "the player has the sheet open, or a worker is resting". Recommendation: charge regen is global, keeps running while online, and has nothing to do with Rest. Also, what does `game.held()` do (the tab-guard / second tab), and does a modal like the offline popup pause regen? Recommendation: regen runs only when `advance()` runs.
5. **Starting charges.** What does a new game, a first hire, and an existing rc1 save after the update get? Recommendation: charges start at cap (2) on the first hire and on migration.
6. **Rest details.**
   - Recovery is 0.25× drain. Does it work from Asleep (0%) and from Unpaid? Can a worker be Rested above 50%?
   - What ends Rest: only the player, or auto at 100%? Recommendation: manual only, with a "Rested 100%" banner.
   - Does a resting Market Hand or Coop Hand keep its `cdS`? Is its wage frac frozen?
   - The Grader's bonus while resting: 0, or `asleep_bonus_share`?
   - Is a resting worker counted in `incomePerSec`, the best-buy and the M4 picker?
7. **"$/s at risk".** "Share of incomePerSec minus wage" is clear for the Hawker and Grader with a diff. For the Market Hand and Coop Hand, "share" needs a definition. Recommendation: risk = incomePerSec(all as they are) − incomePerSec(this worker forced asleep) − wage/s. It's computed live, so the ±$0.01 in RF3 needs the same function in the UI and in tests. The "85% of the Grader's bonus" should fall out of the diff (asleep_bonus_share 0.15), not be hard-coded. How often is the sort recomputed? Sorting every frame makes rows jump. Recommendation: re-sort when the sheet opens and after each action, with a 1 s refresh of the values.
8. **Threshold naming.** "Refillable" means ≤50%, and Yawn stays at 40 (`yawn_at_pct`). Does the yawn cue/SFX still fire at 40, and does anything else (badges, coach copy) key off the old 0.4 `manage_prompt_threshold`? Recommendation: replace `manage_prompt_threshold` with `refill_threshold_pct` and leave yawn alone.
9. **The card tap and "Next charge in Ns" at cap.** Tapping a card opens the sheet focused on that worker. Is a focused row scrolled to and highlighted, or moved to the top, which breaks the sort? What does the timer show at cap? Does `charges_capped_s` count while the sheet is closed, or only in a session where the player has at least 1 worker?

**First-hire nudge:**
- (a) "Re-arms at F5" while W1 is still unhired: does it fire once more and count toward the 2 dismissals? Is it "once per save" plus one re-arm?
- (b) What counts as a dismissal: a close button, tapping elsewhere, or a timeout?
- (c) $40 is `w1_cost` at the current level row. Read it from `hireCostCents('market_hand')`, never a literal.
- (d) The trigger is "W1 unlocked" (`w1_unlock_farm` = 3), not a hard-coded F3, and the re-arm level (F5) needs a CSV column.
- (e) Coop-full hint priority: our B-1 coop tip (`shouldShowCoopTip`) and the M4 DualPicker hint already share one slot (M4A-41). The nudge must go into that arbiter too. Rank: coop-full > nudge > M4 picker hint?
- (f) The "New" dot sits on the Upgrades nav and the Workers tab. The nav is also where the Refill button lives. Art & UX layout is needed.

## Missing persistent state and SAVE_VERSION
New fields on GameState (additive, defaulting on load):
- `refillCharges` (int 0..cap)
- `chargeProgressS`
- `workers[id].resting?: true`
- `workers[id].refilledAtS?` (combo window, session-only is fine). Recommendation: don't persist it, and a reload ends the window.
- abilities state (from B1)
- `nudge: { shown, dismissals, rearmed }`
- `manageCdS` becomes dead, so keep it read-tolerant.

**No SAVE_VERSION bump is needed** if these are optional fields with defaults in `load()`, which is the same pattern as `tracksV7` / `wageFracCents`. A bump to 7 would collide with the pending save-durability v7 work and the M4-A migration (CEO hold), so recommend **no bump**. Clamp on load: charges to [0, cap], and progress to [0, regen). Older builds just ignore the new fields. A downgrade loses Rest and charges, which is acceptable.

## Values that must be in CSV / balance.json (no magic numbers)
Already in economy.f1-m4cols.csv: `charge_regen_s` 150, `charge_cap` 2, `refill_threshold_pct` 50, `combo_window_s` 10, `combo_boost_s` 45, `tc_ability_s` 30, `tc_ability_cd_s` 300.
Missing columns:
- `rest_recover_mult` (0.25)
- the hidden-tab freeze threshold, which should reuse `offlineMinSeconds` (60) and not get a new column
- the nudge's `nudge_rearm_farm` (5) and `nudge_max_dismissals` (2)
- the starting charges, if not the cap

Also needed:
- `sync-economy.ts` must map the new columns: they're one value repeated per row, via `one()`, and validated.
- `balance.ts` must validate them: cap ≥ 1, regen > 0, threshold 1..100, combo ≤ ability_s × 1.5.
- The CSV must land in the repo's product/economy.csv, not a side file.
- `manage_cooldown_s`, `manage_prompt_threshold` and `manage_all_min_workers` get retired. They stay read-tolerant until flag-off stops using them (B2).
- `focus_premium` in the CSV isn't in either spec. Is it unused for rc2?

## Telemetry
- New events: `refill_used {worker, energy_pct, charges_left, rank_by_risk}`, `rest_toggled` (add `{worker, on, energy_pct}`), `boost_used {worker, combo}`, `shift_sheet_opened {entry: nav|card}`, the session field `charges_capped_s` (fits in `session_end` or the worker summary), `first_hire_nudge_shown {farm_level, coins, t_since_unlock_s}`, `first_hire_nudge_dismissed`, and `first_worker_hired {worker, farm_level, t_since_unlock_s, via_nudge}`.
- `t_since_unlock_s` needs the persisted unlock timestamp or play-seconds, which is **one more save field**.
- Retire `worker_manage` / `worker_manage_all`, or keep them as aliases for the dashboards.
- Decide which events are pinned (`isPinned`) so the ring doesn't evict them. Recommendation: pin `refill_used` and `first_worker_hired`.
- `eggfarmExportTelemetry` stays the only global, with no new debug globals.

## M4 flag interaction
- See B2.
- The M4 picker uses `incomePerSec` with a `working` set, so a resting worker has to be modelled as not working there too.
- Refill risk uses the M4 price path (Egg value track) when the flag is on, and the Farm curve when it's off. `incomePerSec` already branches, so reuse it.
- The migration boot (M4-14: a pending migration runs the session as flag-off) means a session can flip between flag-off and flag-on worker UI across reloads. If the UI is flag-gated, the charges state must still be valid in both.

## Test/AC plan (engineering side)
- Unit tests:
  - regen and cap
  - freeze on a gap of 60 s or more (and the first-60 s rule)
  - persist and clamp on load
  - Refill at 0 charges is a no-op
  - Refill ends Rest
  - Boost is blocked while Paused
  - combo at exactly 10 s, and at 10.01 s
  - sort order with ties (energy, then W1→W4)
  - risk equals the incomePerSec diff within ±$0.01
  - RF6: Rest takes 0→100 in 100 / (0.25 × drain) s, ±2 s
  - nudge trigger, dismissal cap, re-arm and hint arbitration
- DOM scan for RF1 at 360 and 1280, with no Manage controls left, including the onboarding coach copy, which still says "Tap Manage".
- RF5 and RF8 are Economy's sim, so the sim fixtures (`gen-sim-fixtures.py`) need the new rules mirrored. Who owns keeping sim and game in parity?

## Rough estimate
| Item | Days |
|---|---|
| Sim: charges, Rest, refill action, persistence, balance/sync | 1.5 |
| Shift sheet UI, one entry point, removing Manage/Manage-all and the coach copy | 1–1.5 |
| Telemetry + unit/DOM tests | 0.5–1 |
| First-hire nudge (state, arbiter, UI, telemetry, tests) | 1 |
| Abilities + Boost/combo (if not already built), B1 | 1.5–2 |
| **Total** | **4–5 without abilities, 5.5–7 with them** |

Art & UX are needed for the Shift sheet layout, the "New" dot and the hint copy. Rows can use placeholder UI, as in M2.
