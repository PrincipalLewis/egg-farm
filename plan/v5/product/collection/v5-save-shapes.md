# v5 save shapes: Collection (streak/tapCoins, breeds), D-HOP-2026-10-30-38
PMC, 2026-10-30 13:25 CET. Status: FINAL. HoE confirmed SAVE_VERSION 6, no M5 migration, breeds created at end of first tick with m4.flags.breeds on (D-HOE-20261030-19, 13:32). Read-only check of code at rc/v5 e77fc5c and PR #95 a452dd0.

## 1. Streak / tapCoins (spec v1.3.2 acb4cdbb)
NOT saved. There is no streakBest field. Spec: L65 (R11), L136, L161, L254 (K9), L495.
Code: streakS, streakHoldS, tapCreditCdS, irefRingCents, refWarmS (src/sim/m5-state.ts L67, M5_SESSION_FIELDS) and streakRun (src/save/m5-fields.ts L33, SESSION_ONLY_KEYS) are stripped before save (save.ts L146) and dropped on load if hand-edited in.
QA check: a v5 save written with streak and tapCoins on contains none of these keys.

## 2. Breeds (spec rev 3.8.8 254acea3 §6 L657-676; code a452dd0)
One optional key `breeds?` inside the v6 save.
| Field | Type | Default for old save | Sanitize on load (flag on) |
|---|---|---|---|
| breeds? | object, optional | absent | not an object, or an array: left alone |
| owned | Partial<Record<BreedId,{stars:0\|1\|2}>> | {} | stars clamped [0,2], non-finite→0; unknown id kept as-is and ignored (E10) |
| slots | (BreedId\|null)[3] | [null,null,null] | at or past the unlocked count→null whatever the id (E12 wins over E10, D-COL-2026-10-30-16); 2nd duplicate→null; E10: unknown id is null at runtime, raw id written back on save until the slot really changes |
| incubator | {breed, remainingMs:int, costCents}\|null | null | unknown breed→dropped, costCents refunded; remainingMs clamped [0,60000] and rounded; Q6: NaN/±Inf/null/non-number→60000 |
| settleMs | [n,n,n] | [0,0,0] | not a non-negative int→0; capped settle_s×1000 |
| hatches | number | 0 | Q7: invalid→0 |
| pity | number | 0 | Q7: invalid→0 |
| rng | uint32 | mixSeed(s.rng^K) | Q7: fails isRngState→mixSeed(s.rng^K) |
| freeHatchUsed | 0\|1 | 0 (key absent, or field missing on an existing breeds object; D-HOE-20261030-21) | Q7: present but not 0/1→1 |
| flockCompleteLogged | 0\|1 | 0 | not 0/1→1 if flock complete, else 0 |
| sinceUnlockMs? | int, optional | absent (=0) | not a non-negative int→0 |
| sinceUnlockBackfilled? | 0\|1, optional | 1 if created at F≥10, else absent | other values→1 |
Not saved: focusMs, counted-tap stamps, pendingReveal, breedsRawSlots (session-only).
Telemetry: a load fixed only by E10 logs no save_migrated. Any other repair logs exactly one save_migrated{breeds_sanitise, 6→6}. With the breeds flag off, breeds data is never read, written or changed (E11).

## 3. SAVE_VERSION stays 6, no M5 migration
Code: SAVE_VERSION = 6 (save.ts L7) on rc/v5 and a452dd0, and no migrations[] entry is added. Spec L657 + BR-AC1b. Old saves load as {...initialState, ...d.state}, so they have no breeds key and get the defaults. A bump would make M4.1 builds refuse the save (L88-96, L100, L218), which is spec R5 (L674). Nothing found forces a bump.

## Spec catch-up queued for the next breeds rev (not blockers)
Q6/Q7 rules; the E12 NaN wording; when breeds is created (code: first tick with the flag on, Q2, HoE may re-rule; spec says first load; same saved shape); incubator.costCents validation; code header cites rev 3.8.6; the hatchEstimate hook lands in PR B.

## Rulings on Saves QA open questions (D-COL-2026-10-30-16/-17, 13:37 CET; fold into breeds E12 at next rev)
- OQ-2 (amended by D-COL-2026-10-30-18 / D-HOE-21): a missing freeHatchUsed → 0; a present invalid value → 1. OQ-6: a locked slot becomes null whatever the id (E12 over E10). OQ-1 and OQ-3 are intended (see D-COL-16). OQ-7: save_migrated gets refund_cents, farm_level, backup_stores (D-HOE-21). OQ-3: a null/non-object root is re-created on the first flag-on tick, logged breeds_sanitise reason invalid_root (D-HOE-21).
- OQ-4: `owned` that isn't a plain object (including null or an array) → {}. `slots` that isn't an array of length 3 → [null,null,null]; a length-3 array whose entries aren't strings or null → those entries null. Each repair is covered by the one save_migrated{breeds_sanitise}.
- OQ-5: intended. stars is a level (non-integer → floor, then clamp [0,2]). hatches and pity are counters, so a non-integer means corruption → 0 (Q7, conservative).
- OQ-8: incubator.costCents that isn't a non-negative integer → 0. It's only ever refunded when the breed is unknown, so a bad cost refunds 0 (anti-exploit).
- sinceUnlockMs absent: reads as 0 and isn't written until the timer starts; backfill per sinceUnlockBackfilled.
- Cite: save_migrated shape is at src/game.ts:255 (a452dd0); the spec's :246 and the config's :252 references are stale and get fixed at the next breeds rev, along with Q6/Q7.
