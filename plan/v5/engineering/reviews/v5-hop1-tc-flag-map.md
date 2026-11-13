# V5-HOP-1: missing `tc_*` columns → `m4.flags.*` map (for the RC flag cut)

Author: Economy/Balance Designer, 2026-10-30 10:20 CET
Asked for by: HoE (Build room, deadline 11:00 CET). HoP confirms the resulting flags-off set by 12:00 under D-HOP-2026-10-30-04 (no placeholder values ship).

## Provenance

| item | value |
|---|---|
| rc/v5 (code read for this map) | `a923206b80f2c301341d100d9eaa34554e948fb9` (#91 merged) |
| V5-HOP-1 local head | `2d15dacdb45884bf1aabce48ea20e7571fb69d66` at 10:37 CET (a test-only commit on top of `33e775e18599a163b434982ef464741f3ebf87f6`, whose CSV and balance.json are identical). `33e775e` on `econ/m51-farm-cost-r27-29` = merge of rc/v5 a923206 into the branch. Not pushed. The previous head `72419a69272868f3632a8e597b2611bcaa5dde2e` (merged onto d52f35b) has byte-identical `data/economy.csv` and `src/config/balance.json` (git blobs `bbee8760` and `766ee7f3` in both). |
| rc/v5 `data/economy.csv` | sha256 `b48be8a4f920940876168abac57c0b353c661dfeb355e627f3436d5acb83f857` (sha1 `26a626d6…`, git blob `a566fb87`) |
| V5-HOP-1 `data/economy.csv` | sha256 `a8c4e26836bf7af98cb51f8e3e8a646750e82a4cdc18be450afe2f86eeeeb07f` (sha1 `67d7d48c…`, git blob `bbee8760`) = CSV of record 8dc90e2b + farm_cost r27-29 |
| Flag list | `src/config/flags.ts:8-11` (14 flags) and manifest `engineering/v5-rc-manifest.md` (sha1 79344818) "Row 34 ship values" |
| Method | `git archive origin/rc/v5 src` to a read-only temp copy; `rg` for every key name (with and without `tc_`) across `src/**` excluding tests and JSON; read every `tc(b, …)` / `tcNum` call site and the gate around it. |

## How keys reach the code at rc/v5 (the three mechanisms)

1. **Mapping.** `scripts/sync-economy.ts:185` copies every `tc_<name>` CSV column into `balance.json` `m4.tc.<name>` (the value is constant on every row).
2. **Load-time requirements (validateBalance).** There are two lists. If a flag is on and one of its keys is missing, the bundle throws at module load (`src/config/balance.ts:49`, `export const balance = validateBalance(raw)`). That means the game does not start, so it never ships quietly with a missing key:
   - `src/config/formulas.ts:145-148` `M5_TC_KEYS`, enforced at `src/config/balance.ts:46` through `tcNum` (`formulas.ts:151` throws `balance.m4.tc.<k> missing`). Entries: golden = egg_gap_min_s, egg_gap_max_s, frenzy_s; abilities = ability_s, ability_cd_s; **streak = streak_unlock_farm, streak_per_tap, tap_credit_min_s, streak_hold_s, streak_decay_per_s, streak_cap, streak_tier_count**.
   - `src/config/m5-rules.ts:12-14` `M5_REQUIRED_TC`, enforced at `m5-rules.ts:31`. Its only entry is **pause = pause_unlock_farm, pause_call_lockout_s**.
   - The other rules in `m5-rules.ts:33-51` are **range checks that run only when the key is present** (`has(tc, …)`). A missing key skips them silently; it never fails the build.
3. **Readers.** At rc/v5 only two files read tc values: `src/sim/streak.ts` and `src/save/m5-fields.ts`. Both use `tcNum` (it throws on a missing key, never returns 0, undefined or NaN). Every call site is behind a flag gate (details under "Ungated readers").

## (1) Column table

"Required?" means the bundle refuses to load if that flag is on and the key is missing. "Spec owner" is the feature spec that defines the column (from `product/**`). It is not read from code; I list it so HoE can see which flag the key belongs to even where no code reads it yet.

| # | CSV column | balance.json key | V5-HOP-1 value | consuming flag (code at a923206) / spec owner | validateBalance requires? (file:line) | ungated readers |
|---|---|---|---|---|---|---|
| 1 | tc_ability_energy_cost | m4.tc.ability_energy_cost | 0 | code: none / spec: lighter-refill proposal 08d12ac7 (rc2Refill/autoRefill C2; proposal value 10) | no | none |
| 2 | tc_ability_unlock_farm | m4.tc.ability_unlock_farm | 10 | code: none / spec: abilities (also cited by breeds spec) | no | none |
| 3 | tc_ability_w2_mode | m4.tc.ability_w2_mode | 0 | code: none / spec: abilities | no | none |
| 4 | tc_broody_cap_s | m4.tc.broody_cap_s | 150 | code: none / spec: broody | no (range check only if present, m5-rules.ts:44) | none |
| 5 | tc_broody_income_share | m4.tc.broody_income_share | 0.05 | code: none / spec: broody | no (range if present, m5-rules.ts:45) | none |
| 6 | tc_broody_max_on_screen | m4.tc.broody_max_on_screen | 1 | code: none / spec: broody | no | none |
| 7 | tc_broody_ready_share | m4.tc.broody_ready_share | 0.5 | code: none / spec: broody | no (range if present, m5-rules.ts:45) | none |
| 8 | tc_broody_unlock_worker | m4.tc.broody_unlock_worker | 2 | code: none / spec: broody | no | none |
| 9 | tc_fatigue_cue_clear_hold_s | m4.tc.fatigue_cue_clear_hold_s | 2 | code: none / spec: fatigueCue (sales-stopped spec Rule 2) | no | none |
| 10 | tc_fatigue_cue_clear_share | m4.tc.fatigue_cue_clear_share | 0.12 | code: none / spec: fatigueCue | no (pair check if both present, m5-rules.ts:51) | none |
| 11 | tc_fatigue_cue_hold_s | m4.tc.fatigue_cue_hold_s | 5 | code: none / spec: fatigueCue | no | none |
| 12 | tc_fatigue_cue_min_share | m4.tc.fatigue_cue_min_share | 0.15 | code: none / spec: fatigueCue | no (pair check if both present, m5-rules.ts:51) | none |
| 13 | tc_first_spawn_s | m4.tc.first_spawn_s | 45 | code: none (comment only, sim/m5-state.ts:23) / spec: golden | no (> 0 if present, m5-rules.ts:36) | none |
| 14 | tc_pause_call_lockout_s | m4.tc.pause_call_lockout_s | 45 | **pause**: save/m5-fields.ts:82 (pauseLoad, gated at :74) | **YES**: m5-rules.ts:13 + :31 | none |
| 15 | tc_pause_toggle_debounce_s | m4.tc.pause_toggle_debounce_s | 2 | code: none / spec: pause | no | none |
| 16 | tc_pause_unlock_farm | m4.tc.pause_unlock_farm | 10 | **pause**: save/m5-fields.ts:82 (gated at :74) | **YES**: m5-rules.ts:13 + :31 | none |
| 17 | tc_spawn_grace_ms | m4.tc.spawn_grace_ms | 250 | code: none / spec: golden (also broody, timed-collectible) | no | none |
| 18 | tc_stall_hold_nomh_s | m4.tc.stall_hold_nomh_s | 20 | code: none / spec: salesStopped | no | none |
| 19 | tc_stall_hold_paused_s | m4.tc.stall_hold_paused_s | 20 | code: none / spec: salesStopped (pause interaction) | no | none |
| 20 | tc_stall_hold_s | m4.tc.stall_hold_s | 8 | code: none / spec: salesStopped | no (0 or > max(tired_every_s)+1 if present, m5-rules.ts:47-50) | none |
| 21 | tc_stall_rearm_s | m4.tc.stall_rearm_s | 5 | code: none / spec: salesStopped | no | none |
| 22 | tc_stall_tap_guard_ms | m4.tc.stall_tap_guard_ms | 500 | code: none / spec: salesStopped (also cited by golden/broody) | no | none |
| 23 | tc_streak_tier_count | m4.tc.streak_tier_count | 4 | **streak**: sim/streak.ts:24 (streakTier) | **YES**: formulas.ts:147 via balance.ts:46 (integer >= 1, m5-rules.ts:40) | none |
| 24 | tc_streak_unlock_farm | m4.tc.streak_unlock_farm | 8 | **streak**: sim/streak.ts:35 (creditTap, gated at :34) | **YES**: formulas.ts:147 via balance.ts:46 | none |
| 25 | tc_tap_bonus_income_window_s | m4.tc.tap_bonus_income_window_s | 60 | code: none / spec: tapCoins | no (>= 1 if present, m5-rules.ts:41) | none |
| 26 | tc_tap_credit_min_s | m4.tc.tap_credit_min_s | 1 (CSV "1.0") | **streak**: sim/streak.ts:38 (creditTap, gated at :34) | **YES**: formulas.ts:147 via balance.ts:46 | none |
| 27 | tc_tap_income_share | m4.tc.tap_income_share | 0.03 | code: none / spec: tapCoins | no (<= 1 if present, m5-rules.ts:42) | none |
| 28 | tc_urgent_at_s | m4.tc.urgent_at_s | 27 | code: none (comment only, sim/m5-state.ts:19) / spec: golden (R18 focus clock) | no (ordering check if warn/urgent/despawn all present, m5-rules.ts:35) | none |
| 29 | tc_warn_at_s | m4.tc.warn_at_s | 20 | code: none (comment only, sim/m5-state.ts:19) / spec: golden (R18) | no (m5-rules.ts:35, as above) | none |
| 30 | tc_streak_cap (in both) | m4.tc.streak_cap | **0.28** (rc/v5: **0.4**) | **streak**: sim/streak.ts:24, :36, :61 | **YES**: formulas.ts:147 via balance.ts:46; (0, 1] at m5-rules.ts:39 | none |

**Ungated readers:** none. I checked every reader of these keys at a923206:
- `sim/streak.ts` `creditTap` (:34) and `streakTick` (:57) return early unless `streakOn` (`m4.enabled && flags.streak === 1`). `streakTier` runs only from `streakPeak`. `streakPeak` runs from `game.ts:304` (behind `streakOn`) or from `endStreak` (`m5-fields.ts:102`, behind `m5Flag('streak')`). `streakAfter` with dt = 0 (`m5-fields.ts:109`, behind the streak flag) returns before it reads `streak_decay_per_s`.
- The sale factor in `sim/effects.ts:23` reads no tc key and is applied only `if (flagOn(b, e.flag))` (`effects.ts:33`).
- `save/m5-fields.ts` `pauseLoad` (:82) runs only when `m5Flag('pause')` (:74). `m5Load` returns at once when `anyFlag` is false (:57, :23).
- No debug panel, UI or URL path in `src/**` sets `m4.flags` at runtime (rg `flags` in `src/debug/panel.ts`, `src/ui/app.ts` and `src/game.ts` finds UI preference flags only).

So with every M5 flag at 0, a missing key is never read: no undefined, no NaN, no silent default. Even if a reader were reached, `tcNum` throws rather than returning 0.

## (2) Per-flag result at rc/v5 a923206

"Code keys" are the keys that code reads or that validateBalance requires. "Spec keys" are the tunables the feature's spec defines in the CSV.

| flag (row 34 ship value) | code keys at rc/v5 | spec keys only in V5-HOP-1 | feature code at rc/v5 | if turned on at rc/v5 without V5-HOP-1 | result |
|---|---|---|---|---|---|
| m4.enabled (1) | none | none | yes (M4.1) | n/a | **ships on (1)** |
| golden (1) | egg_gap_min_s, egg_gap_max_s, frenzy_s: all present at rc/v5 | first_spawn_s, warn_at_s, urgent_at_s, spawn_grace_ms | save-load sanitise only (m5-fields.ts:60-61, :99-100). No spawn sim or UI in src | loads (the required keys are there). The spec's first spawn, warn/urgent states and tap grace have no values | **needs V5-HOP-1 (spec keys) → off.** Not a load failure. See ambiguities |
| streak (1) | 7 keys; streak_unlock_farm, tap_credit_min_s, streak_tier_count are missing; streak_cap is 0.4 | streak_unlock_farm, tap_credit_min_s, streak_tier_count, (cap 0.28) | sim/streak.ts, effects.ts:23, actions.ts:64 | **build refuses to load**: balance.ts:46 → formulas.ts:151 `balance.m4.tc.streak_unlock_farm missing` | **needs V5-HOP-1 → off** |
| tapCoins (1) | none | tap_bonus_income_window_s, tap_income_share | none (only listed in anyFlag, m5-fields.ts:23) | loads, but there's no tap-coins behaviour; m5Load simply starts running | **needs V5-HOP-1 → off** |
| abilities (1) | ability_s, ability_cd_s: present | ability_unlock_farm, ability_w2_mode, ability_energy_cost | save-load sanitise only (m5-fields.ts:66-72, :98) | loads. No unlock level and no W2 mode value | **needs V5-HOP-1 → off** |
| broody (1) | none | all 5 broody_* | save-load sanitise only (m5-fields.ts:61-65) | loads | **needs V5-HOP-1 → off** |
| salesStopped (1) | none | all 5 stall_* | none | loads, no behaviour | **needs V5-HOP-1 → off** |
| fatigueCue (1) | none | all 4 fatigue_cue_* | none | loads, no behaviour | **needs V5-HOP-1 → off** |
| pause (1) | pause_unlock_farm, pause_call_lockout_s: both missing | + pause_toggle_debounce_s | sim/pause.ts, m5-fields.ts:74-90, workers/income | **build refuses to load**: m5-rules.ts:31 `tc.pause_unlock_farm is required while flags.pause is on` | **needs V5-HOP-1 → off** |
| rc2Refill (1) | none | ability_energy_cost (C2, per lighter-refill 08d12ac7) | none | loads, no behaviour | **ambiguous**, see below |
| autoRefill (1) | none | its proposal keys (tc_autorefill_at_pct, tc_autorefill_reserve, tc_autorest_on_empty, tc_lab_drain_cut) are in **neither** CSV | none | loads, no behaviour | **ambiguous**, see below |
| clockWage (1) | none | none found | none | loads, no behaviour | not a tc question: off unless its code lands |
| zeroGainUi (1) | none (uses m4.zeroGain.confirm, not tc) | none | flags.ts:19 helper only | loads | not affected by V5-HOP-1 |
| bestBuyV2 (0) | none | none | none | n/a | **off (0)** by ruling |
| breeds (0) | none | ability_unlock_farm and broody_income_share are cited by the breeds spec | none | n/a | **off (0)** unless Breeds UI lands |

## (3) Proposed sets if V5-HOP-1 is not in the RC (HoP to confirm by 12:00)

- **Flags off (keys arrive only with V5-HOP-1): golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue, pause.** Two of these, streak and pause, would also stop the build from loading if switched on, so for them it's a hard requirement, not just policy.
- **Flags on:** `m4.enabled` = 1 only. None of the M5.0 flags in row 34 has all of its spec keys at rc/v5.
- **Off by existing ruling, unchanged:** bestBuyV2 = 0, breeds = 0, `m4.zeroGain.confirm` = 0.
- **Ambiguous (HoP/HoE to rule; not decidable from tc keys):**
  - **golden.** Its validateBalance key set is complete at rc/v5, so switching it on would load. But 4 of its spec tunables (first_spawn_s, warn_at_s, urgent_at_s, spawn_grace_ms) exist only in V5-HOP-1. Under "no placeholders" I count it as off.
  - **rc2Refill / autoRefill.** No `tc_*` column in either CSV is read by refill code, and no refill code is at rc/v5. Refill uses the non-tc columns charge_regen_s, charge_cap, refill_threshold_pct, start_charges, which are identical in both CSVs. autoRefill's proposal keys are missing from **both** CSVs, so **V5-HOP-1 doesn't unblock autoRefill either**. HoE's "rc2Refill/autoRefill timers" are, by the specs, golden's R18 focus-clock keys (warn_at_s, urgent_at_s), not refill keys.
  - **clockWage, zeroGainUi.** They don't depend on these tc keys. Whether they ship on depends on their code being in the RC, which is outside this map.
- **If V5-HOP-1 merges green:** all 30 keys are present. golden, streak, tapCoins, abilities, broody, salesStopped, fatigueCue and pause then pass validateBalance with their spec values (streak at the B4-measured 0.28). Turning them on still needs each feature's code to be in the RC. At a923206 only streak and pause have sim code; the others have save-load sanitising only.

## (4) Notes

- **Streak cap.** rc/v5 has `tc_streak_cap = 0.4` on all 31 rows; V5-HOP-1 has 0.28. B4 measured and passed only 0.28 (63.58 vs 63.62). 0.4 was never measured. rc/v5 also lacks 3 of streak's 7 required keys, so streak can't be switched on at rc/v5 at all (load failure). The 0.4 value is never read with streak off.
- **Shared tc columns (27 in both CSVs), value by value:** only `tc_streak_cap` differs (0.4 vs 0.28). The other 26 are identical: ability_cd_s 300, ability_s 30, ability_w1_price_mult 1.15, ability_w2_lay_mult 1.15, ability_w3_price_mult 1.15, ability_w4_tier_add 0.5, complete_bonus_share 0.05, egg_cash_s 45, egg_despawn_s 30, egg_eggs_as_cash_from_farm 20, egg_eggs_s 60, egg_gap_max_s 300, egg_gap_min_s 120, egg_unlock_farm 8, egg_w_cash 0.45, egg_w_eggs 0.2, egg_w_frenzy 0.35, focus_premium 0.1, frenzy_all_sales 1, frenzy_price_mult 2, frenzy_s 30, leave_penalty_share 0.05, streak_decay_per_s 0.03, streak_hold_s 3, streak_max_taps_per_s 1, streak_per_tap 0.01. So **golden's present keys are the same in both; tapCoins has no present keys at rc/v5** (both of its keys are in the missing 29). `m4.tc.leave_attended_window_s` (30) and `rest_recovery_mult` (0.25) come from non-tc columns (sync-economy.ts:186) and are identical in both.
- **Non-tc CSV differences (surprise: these aren't all in the "r27-29 + tc keys" description):**
  - `farm_cost` r27-29 (the M5.1 change).
  - `w2_asleep_collect_share` is 0.20 at rc/v5 and 0.15 in V5-HOP-1, on all rows.
  - The columns `guard_heartbeat_s` (2) and `guard_stale_s` (6) are in rc/v5's CSV and **dropped** in V5-HOP-1's.

  All three non-farm_cost changes come from the M5.0 CSV of record 8dc90e2b ("w2_asleep_collect_share 0.15, guard_* dropped", tests/economy.test.ts:73, D-HOP-2026-10-29-01 addendum). **None of them reaches balance.json:** the full rc/v5 vs V5-HOP-1 `balance.json` diff is exactly `farm.costTable` r27-29, `m4.tc.streak_cap` 0.4→0.28 and the 29 added `m4.tc.*` keys. My earlier "nothing is deleted" holds for balance.json, not for the CSV. `w2_asleep_collect_share` is read by tests/staging-f1-m4cols.test.ts:26-29, which passed in the local full run.
- **Current flags.** Both rc/v5 and V5-HOP-1 ship `balance.json` with `m4.enabled = 1` and all 14 `m4.flags.*` = 0 (dev defaults). Shipping "flags off" at the RC therefore means *not* applying the row 34 ship values for the flags above. It doesn't need a data change.

## Sim reference for the flags-off RC

Added 2026-10-30 10:37 CET for HoQA. **Every number in this section is SCRATCH**: it comes from the scratch harness `m5.ts`, not from a harness of record. The X1 harness of record (`measure:l30plus` + bot-m5) isn't wired yet; it runs once on the RC SHA after B.

### What the current §13.2a targets assume
Source: `product/research/v2-slices/economy.md` sha1 6718538c, §13.2a. Machine copy: `artifacts/x1-13.2a/pred-13.2a.{csv,json}` (sha256 e4369888 / 40cd8289).

- **The §13.2a targets do not assume the flags are off. They assume the whole M5.0 stack is on.** They come from `scratch/v2-econ/h/m5x.ts` (sha256 196e8ed5) on top of `m5.ts` (sha256 29d423c5). The stack config is `AssZ` (N) or `AssZhold` (H), defined at `m5x.ts:13-14`:
  - streak, cap 0.28;
  - tap coins, share 0.03;
  - Broody;
  - golden egg + Frenzy, gap 120–300 s;
  - abilities/calls, Sweep A ×1.15;
  - warm-up I_ss and the I_ss = 0 stall rule.
- The setup is 8dc90e2b, L0–30, seeds 1–200, T 4000.
- Pause is **off** in the G1/step/G4 rows (`pause: false`). It is on only in the G5-P rows (`m5g5p.ts`, GPAUSE=2, lockout 45).
- sales-stopped and fatigueCue are UI-only. The harness has no reader for them, and the SS-21 row predicts identical traces.
- M5.1 flags (rc2Refill, autoRefill, clockWage, breeds, zeroGainUi, bestBuyV2) are not modelled.
- §13.2a's only flags-off numbers are the **"no-mechanics baseline"** values quoted inside the step and G4 rows (`CFG=none`), plus the AC7 "every M5.0 flag off = byte-identical" row.
- `pred-13.2a.json` is sourced from economy.md sha1 **c0d9492b**, not 6718538c. I diffed §13.2a between the two: one cell differs, the G5-P (f) absolute-gate wording (6718538c adds the "one seed-checkpoint in (+2.0, +2.5]" allowance). No predicted number differs.

### What I ran
All runs used the same seeds and profiles as §13.2a: seeds 1–200, T 4000, optimal / seller15 / casual.

- **Harness.** A copy of `scratch/v2-econ/h` at `scratch/m51-pr/flagsoff/h/`. The pinned `m5.ts` and `m5x.ts` are unchanged (sha256 verified). `node_modules` is a symlink to the game worktree's, which has the same lock (56569550). I added one new runner, `lv-flagsoff.ts`. It imports `m5.ts` unchanged and records per-level P10/P50/P90.
- **Flags-off config.** `CFG=none` (`{ on: false }`) turns every M5 mechanic off. That is the flags-off set from part (3): golden, streak, tapCoins, abilities, broody, pause off, plus the UI-only salesStopped/fatigueCue.
- **CSVs.**
  - rc/v5 a923206 `data/economy.csv` (b48be8a4): this is what the flags-off RC ships.
  - 8dc90e2b (§13.2a's CSV).
  - V5-HOP-1 a8c4e268 (for the later merge).
- **Commands** (in `scratch/m51-pr/flagsoff/runall.sh`, run through `lane-run.sh econ`):
  - `CSV=<csv> SEEDS=200 S0=1 T=4000 CFG=none vite-node lv-flagsoff.ts`
  - the unchanged `m5x.ts` with `CFG=none NOWIN=1 STEP_FROM=11`
  - a stack-on control: `CFG=AssZ` on 8dc90e2b and on rc/v5.
- **Raw outputs.** In `scratch/m51-pr/flagsoff/out/`, with `SHA256SUMS`. The per-level table is also there as `perlevel-table.md`.

### Checks that the harness reproduces the record
- **Flags-off, rc/v5 CSV.** `m5x.ts CFG=none` reproduces §13.2a's no-mechanics baselines exactly:
  - step P95 2.989 / 3.392 / 3.589;
  - step worst 3.453 / 3.927 / 4.687;
  - G4 P50/P95/worst 129/260/381, 110/196/305, 103/149/226.
- **Stack-on control.** `AssZ` on 8dc90e2b reproduces the §13.2a N rows:
  - step P95 2.41 / 2.42 / 2.66, worst 2.608 / 2.913 / 3.147;
  - G4 84/160/234, 77/126/294, 70/126/196.
- **rc/v5 CSV and 8dc90e2b give byte-identical flags-off per-level times.** The harness reads neither the tc_* columns, `w2_asleep_collect_share` nor guard_*. farm_cost is the same in both up to r29. rc/v5 src doesn't read `w2_asleep_collect_share` either.
- **Stack-on on rc/v5 equals stack-on on 8dc90e2b.** The harness hardcodes `streakCap: 0.28` (`m5x.ts:13`), so it **cannot model rc/v5's 0.4 cap**. That's one more reason streak can't ship on rc/v5's value.

### Flags-off reference (SCRATCH), rc/v5 a923206 CSV, seeds 1–200, minutes from start

| metric | optimal | seller15 | casual | §13.2a target (stack on, N) | flags-off vs target |
|---|---|---|---|---|---|
| F10 P50 (P10–P90) | 10.25 (9.10–11.36) | 10.40 (9.20–11.81) | 12.34 (10.88–13.94) | stack-on control 9.65 / 9.84 / 11.90; G5 row = L10 P95 11.05 / 11.37 / 14.11 | +4 to +6% (inside ±20%) |
| F18 P50 (P10–P90) | 21.09 (20.32–21.88) | 20.74 (19.43–21.80) | 21.33 (20.07–22.89) | stack-on control 15.79 / 15.74 / 17.32 (no §13.2a row) | **+23 to +34% (outside ±20%)** |
| L30 P50 (P10–P90) | 49.85 (49.04–50.54) | 49.64 (48.76–50.54) | 50.63 (49.55–51.99) | 34.4 / 35.2 / 37.2 (§10, seeds 0–99); control 33.01 / 34.07 / 36.27 | **+36 to +45% (outside ±20%)** |
| Step ratio P95 / worst, L11–30 | 2.989 / 3.453 | 3.392 / 3.927 | 3.589 / 4.687 | 2.407 / 2.418 / 2.655 (stack) | equals §13.2a's own no-mechanics baseline |
| G4 any-row P50 / P95 / worst (s) | 129 / 260 / 381 | 110 / 196 / 305 | 103 / 149 / 226 | 84/160/234, 77/126/294, 70/126/196 | equals §13.2a baseline; **P95 ≤ 180 fails on optimal (260) and seller15 (196)** |

Per-level P10 / P50 / P90 for L1–30 (all three profiles, next to the stack-on and V5-HOP-1 P50) is in `scratch/m51-pr/flagsoff/out/perlevel-table.md` and the `perLevelMin` blocks of `out/lv-none-rcv5.json`.

### What this means for X1 on the flags-off RC
1. **The §13.2a prediction table can't be the pacing oracle for a flags-off RC.** Its rate rows assume the full M5.0 stack. The flags-off game is slower by +23 to +45% from F18 to L30, so every L30/F18 comparison would fail ±20% by construction. That gap would be the cut itself, not a defect.
   - The window-ratio, premium and G5-P rows are undefined with every mechanic off (there are no calls, streak or pause to measure).
   - **The flags-off reference is the no-mechanics baseline above**, which is the same as §13.2a's quoted baselines. The matching X1 row is "AC7 with every M5.0 flag off vs c7bb783f: byte-identical". I propose that flags-off check as the pacing gate for this RC. HoP must sign this off, because §13.2a says Economy re-predicts only with HoP sign-off.
2. **Gate surprise for HoQA/HoP.** §13.2a's Y row "G4 P95 ≤ 180 s" was set for the stack. On flags-off rc/v5 it fails on optimal (260 s) and seller15 (196 s). This is the pre-existing L0–30 dead zone the stack was covering. HoP needs to rule whether that row applies to a flags-off RC: N/A, or a known-risk warning like the worst-seed row.
3. **For the later V5-HOP-1 merge, flags off** (SCRATCH, a8c4e268, same seeds):
   - F10 and F18 are unchanged.
   - L30 P50 is 45.50 / 45.34 / 46.27 (−4.3 min), because of farm_cost r27-29.
   - G4 is 104/161/202, 68/115/153, 59/94/129 (P95 ≤ 180 passes everywhere).
   - Step P95 is 2.989 / 3.392 / 3.575.
   - Outputs: `out/lv-none-hop1.json` and `out/m5x-none-hop1.json`. With the stack on, V5-HOP-1 still has to be measured against §13.2a by the harness of record at the 0.28 cap. HoQA's note stands: it doesn't inherit the RC verdict.
4. **Limits.**
   - `m5.ts` runs the harness copy's own game `src/` (an older M4.1-era copy). It isn't rc/v5 src: core sim files differ by 4–74 lines each, mostly M5 additions behind flags.
   - With the flags off, rc/v5 is claimed play-equivalent to M4.1 by the AC7 byte-identical row. I didn't re-verify that here.
   - I recorded P10/P90, not P95. The §13.2a G5 L10 row is a P95.
