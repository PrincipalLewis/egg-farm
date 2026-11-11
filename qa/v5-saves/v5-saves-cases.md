# v5 RC Saves gate: cases, oracle, fixtures (queue row V5-S)

Owner: Saves QA (33ec1b55). Prepared 2026-10-29 CET. **Prep only. The gate runs once, on HoE's RC SHA.**
v5 = M4.1 p2 + M5.0 + M5.1 + telemetry v0.6.2, one RC (D-CEO-20261029-01).
Results (rule 19 + engineering/v5-rc-manifest.md "Gate artifacts"): `artifacts/<gate-id>/results/` + `SHA256SUMS` (`sha256sum -c` must pass). Gate-id **`v5-rc-saves`** (HoQ ruling 2026-10-29 20:12): results go to `artifacts/v5-rc-saves/results/` + `SHA256SUMS`, and the `sha256sum -c` output goes to `SHA256SUMS.check.txt`. HoE commits the artifacts-branch copy; Saves QA leaves only the folder and the check output.

## Target save version
**SAVE_VERSION stays 6.** Sources: m5.0-sizing F2 and m5.1-breeds-spec §6 ("no SAVE_VERSION bump").
The M5 fields are optional and absent while their flag is off:
`tc, streakBest, abilities.{id}.readyAt, abilitiesCoachSeen, workers.{id}.paused, broodyNestCents, broodyHenIdx, frenzyEndAt, nextSpawnRemainingS, breeds{…}`.
The driver reads SAVE_VERSION from the RC source and passes it as `--expect-version`. If it is not 6, that is a finding to report to HoQ and HoE before anything else.

## No-loss oracle (lib.mjs `noLoss`, applied before → after)
- **N1** `version` equals the expected version.
- **N2** Every non-volatile leaf in the before-save is identical after: levels, workers, flags, tracks, M5 fields when present.
- **N3** No key in the before-save is dropped. This includes the M5 keys: an older build must not strip them, and neither may the RC.
- **N4** `coins` ≥ before − max(100¢, 1%).
- **N5** Eggs (basket + pending) ≥ before − max(50, 1%).

Volatile, excluded from N2: `savedAt, sum, seq, lastTick*, session*, lease, telemetry`, plus the timers listed in `lib.mjs VOLATILE`.
Every case also requires: build-id = `<prefix>+<rc7>` with no `+dirty` (meta and `#app`), no recovery dialog unless the case expects one, and 0 page, console or HTTP errors.

## Fixtures (`fixtures/`, read-only; pins in `FIXTURES.sha256`, which itself has sha256 25e4e603…b6dc; fixed 2026-10-30, was a stale 64562c33…86cf cite)
| id | file | sha256 | state |
|---|---|---|---|
| l41-A | 5d9efa6/l41-A-fresh-F0-C1.save.json | 380e422d…84d8 | 5d9efa6 fresh |
| l41-B | 5d9efa6/l41-B-workers-F10-C12.save.json | 8b39d8eb…7e05 | 57,518¢, F10 C12 H10 EV9, 3 workers |
| v5 | v5/m2-rc1-v5-12min.json | 7ae75247…b6aa | M2 RC1 12-min save (migration) |
| p1-A | p1-30b29d3/p1-A-fresh-F0.save.json | 72fd7f41…18bb | p1 fresh, 700¢ |
| p1-B | p1-30b29d3/p1-B-workers-F10.save.json | 617f3534…9123 | 39,094¢, F10 C11 H12 EV10; workers coop_hand, hawker, market_hand |
| p1-C | p1-30b29d3/p1-C-late-F30.save.json | 84cd0b0c…22e1 | 114,898,714¢, F30 C30 H30 EV24 |
| html | src-m4.1-5d9efa6.egg-farm.html | ccb87daa…d5e1 | published asset (537,287 B) |
| html | src-m4.1-p1-30b29d3.egg-farm.html | dd919d61…979b | published Latest asset (547,466 B) |

The p1 fixtures were generated today from the published Latest asset, in Chromium on :5961 under the lock, by `scripts/gen-fixtures.mjs`. The log is in gen.log; each fixture also has its full LS dump (`.ls.json`), metadata (`.meta.json`) and a screenshot.

## Cases: `scripts/saves-browser.mjs` (one engine per run; the gate runs Chromium, then Firefox, then WebKit)
| id | what | pass |
|---|---|---|
| S-COLD-{l41-A,l41-B,v5,p1-A,p1-B,p1-C} | seed LS with the fixture and cold-load the RC | N1–N5; no recovery; offline grant only when savedAt is ≥ 60 s old |
| S-UP-{l41-B,p1-B,p1-C} | same origin: old build loads, plays and saves, then the RC loads the same LS and IDB | N1–N5 vs the old build's last save; no recovery |
| S-RT-p1-B | round trip: load → play → save → reload → export/import (if the UI exists) → reload | N1–N5 at each hop; coins move only by play. Export/import is N/A on M4.1 (auto-detects `#sImport`, `#sExportSave` and `[data-act=import-save]`) |
| S-OFF-30s / -2h / -3h | savedAt moved back 30 s, 2 h and 3 h (sum covers state only) | 30 s: no grant, no welcome. 2 h: grant > 0 and welcome shown. 3 h: grant equals the 2 h grant (2 h cap) |
| S-CLK-back-1d | savedAt 1 day in the future (clock rollback) | grant 0, no welcome, N1–N5 |
| S-OFF-cap | 2 h and 3 h grants compared | equal |
| S-BAK-p1-B | corrupt main with a valid .bak | restored from .bak, notice shown, N2 vs .bak |
| S-IDB-p1-B | LS cleared, IDB mirror (eggfarm/save/main) present | restored from IDB, N1–N5 |
| S-LEASE-p1-B | two tabs in one context | the newer tab claims; the older tab shows "Game open in another tab" and does not overwrite |

### M5 additions to check at the RC (fields not yet on main; confirm the names in the RC source first)
- Every S-UP and S-RT case asserts N3 over the M5 keys in `lib.mjs M5_KEYS`. A flag-on save → reload must keep `abilities.*.readyAt`, `workers.*.paused`, `breeds`, `broodyNestCents` and `streakBest`.
- Rollback direction (release-checklist 8e): a save written by the RC must load on the restored build (5d9efa6 or p1) without data loss on the shared fields. The restored build may ignore the M5 keys, but it must not lock the save read-only or open recovery. To check this, run `publish-verify.sh rollback --bad-save <RC save>`.

## Existing suites the driver also runs (`qa/m3-scripts`, copied into the RC worktree)
- `oq2-offline-grant-once.qa.test.ts`: the grant is credited once across collect, reload, reconcile and the IDB mirror.
- `m41-7-save-noreg.qa.test.ts` + `-compare.mjs`: the RC vs base 30b29d3 (same fixtures, both worktrees).
- `csr-m41-7-b8-14.mjs csr8`: two-tab lease against `dist-qa`.
- `csr-m41-7-resetat.mjs`: Reset plus clock rollback, AC1–4 and CLK.

These were written for M4.1, so they may need small adapting to M5 APIs. Triage any FAIL before calling it a defect.

## Telemetry v0.6.2: `scripts/telemetry-check.mjs` (Chromium)
**v5 RE-TARGET (2026-10-30 ~13:3x CET, HoQ; supersedes the -04 note below):** telemetry v0.6.2 ships IN v5, always on, with no flag (D-CEO-20261030-09; ship-set of record `product/v5-ship-set.md` sha256 d71ed8cf… (re-pinned 14:5x from 56090a61; D-HOP-2026-10-30-51: L19 `m4.flags.bestBuyV2 = 1` REQUIRED, the only change), L23, D-HOP-2026-10-30-41: "telemetry v0.6.2 (telemetry-spec.md d170eb09) + telemetry-spec-errata-v5.md (sha of record at gate): no flag, ships always-on, TELEMETRY_SCHEMA_VERSION "0.6.2" per D-HOE-20261030-19 (pre-0.6.2 rings marked legacy:true), gated by the #T card and save-migration tests"). F-6 CLOSED by D-HOP-41 (HoQ C-1): TELEMETRY_SCHEMA_VERSION is a ring-format version, not a save-migration gate; SAVE_VERSION stays 6. Errata v5 rev 3 (sha1 ee707672, sha256 5a3c04fc…) is input only until HoQ freezes it: differences in `changes-20261030/errata-v5-vs-v062-INPUT.md`. Manifest rows 11 (v0.6.2 M5.0 subset: sid/fgMs, session_end, schema.ts; lane S) and 24 (full migration) are `v5, in build` (D-CEO-20261030-09/-10, D-HOE-20261030-18) but NOT YET LANDED: rc/v5 3f582db and the tip e77fc5c have no `src/telemetry/schema.ts` and the envelope is still {type, ts, sessionMs} (telemetry.ts:40/:58/:62).
- **v5 RC gate target:** T steps run `--schema v062` (sid ^[0-9a-z]{6}$ + fgMs required, sessionMs forbidden: `spec/telemetry-v062.schema.json` envelope) with flags read from the build's committed balance.json (`--balance`, new; must equal the ship-set flags-on set, which G1 already enforces). Switching the gate's T steps from `--schema shipped` to `v062 --balance` is a gate change NOT made here (G1 pin untouched): it waits for row 11 to land and for HoE's answer on Q-TEL-1..3 (READINESS).
- **Until row 11 lands:** `--schema shipped` = rehearsal only on a pre-row-11 build; v0.6.2 checks recorded `NOT-YET-IN-BUILD` (not counted, not a waiver).
- **sales_stall `resolved_by`** = the 14 values of `product/market/sales-stopped-spec.md` L249, now including `chip_manage` (conversion metric L270-273). No schema.ts enum to cross-check yet (G-8).
- **Row 11 / G-8 (Saves, this lane):** case **TEL-G8** below (FINAL, HoQ C-1). **Row 24:** cases **TEL-R24-*** below (FINAL, HoQ C-1). Contract: D-HOE-20261030-20 (schema.ts) + D-HOE-20261030-19 F-6/F-10 (ring {v, events}, export schema_version, legacy:true, T-AC9 non-legacy only, isPinned(e)). schema.ts lands with the Saves PR after breeds #96 (draft ~Fri 21:00, Sat 03:00 latest; merge ~4 h later); no PR-head QA (D-CEO-20261030-10).
- **TEL-R24-1 (HARD):** a legacy bare-array `eggfarm.telemetry` ring (pre-0.6.2: `[{type, ts, sessionMs, ...}]`) loads as `{v: '0.6.2', events}` with every old event tagged `legacy:true` and kept (none dropped); the next flush writes the object form. Checker: telemetry-check `ringProblems` (TS1 under --schema v062) + G8-12; self-tests row24 ring ±.
- **TEL-R24-2 (HARD):** the ring never blocks a progress save: with storage near quota, telemetry shrinks/yields first and `eggfarm.save` (+ .bak) is still written (v0.6.1 Saves rule, m5.0-sizing §10.2, T-AC15); quota_headroom uses telemetry's real bytes.
- **TEL-R24-3 (HARD):** SAVE_VERSION stays 6 (save.ts:7) with telemetry v0.6.2 on; the telemetry key is separate from the save, so no save migration (D-HOE-20261030-19).
- **TEL-R24-4 (HARD):** the export header carries `schema_version: '0.6.2'` (G8-13; self-test G-8 export header ±).
- **T-AC9 (HARD, owner Saves QA):** under --schema v062 only NON-legacy events are validated: an event with `legacy:true` is skipped; a non-legacy event (no tag, or `legacy:false`) that fails validation FAILS. telemetry-check `tAc9Problems`; self-tests T-AC9 ×3. C-3 (HoQ): `refill_used` only, any `manage_used` FAILS. C-2 (HoQ): `session_end.paused_worker_s/all_paused_s` only with rc2Refill = 0; with rc2Refill = 1 `rest_toggled` on/off pairs are used: **now asserted** (TEL-C2-* below, errata rev 13 PINNED).
- **TEL-G8 (row 11, FINAL hard, HoQ C-1):** probe `probes/telemetry/g8-schema-ts.mjs` (static `git show`/`git grep` at the RC SHA): G8-1 schema.ts exists; G8-2 `TELEMETRY_SCHEMA_VERSION = '0.6.2'`; G8-3 `EVENT_SCHEMA`; G8-4 `EVENT_TYPES = Object.keys(EVENT_SCHEMA)`; G8-5 `validateEvent(e): string[]`; G8-6 `isPinned(e)` event-based (F-10); G8-7 FieldSpec kinds only enum|int|count|bucket|bool; G8-8 every type of the frozen spec (61) declared; G8-9 sid + fgMs; G8-10 sales_stall resolved_by 14 (L249, incl. chip_manage); G8-11 no `manage_used`, `refill_used` present (C-3); G8-12 telemetry.ts ring `{v: TELEMETRY_SCHEMA_VERSION, events}` + `legacy: true`; G8-13 export `schema_version`. **TEL-AC11:** (a) every `.track('<type>')` call site in src is in EVENT_SCHEMA; (b) with `--events <export>` every exported type is; (c) runtime "each emitted event passes validateEvent" = the gate T steps under --schema v062. Self-test `g8-selftest.sh` **61/61** (rev12-tel: 7 positive, 50 negative fixtures, absent file, 3f582db / e77fc5c / rc/v5 tip 65a7443 fail closed, which is correct until row 11 lands; + G8-14..23).
- **Errata rev 13 PINNED (TASK saves-qa/rev12-tel, re-pinned 2026-10-30 14:5x CET):** `product/collection/telemetry-spec-errata-v5.md` rev 13 sha1 **a0e8f6d7085939756021856c25429a55d8a8d847** (frozen `telemetry-spec-errata-v5.a0e8f6d7.md` = live; read-only), pinned by HoE in `engineering/v5-rc-manifest.md` **L131** (14:5x; HoQA PASS QA-D-1030-TELERR7, review `qa/m5/review-telemetry-errata-v5-rev13.md` sha256 fbd422bb…), replacing rev 12 0cfe168a (L127, CONDITIONAL PASS TELERR6). Rev 12 -> 13 (21 hunks, all in-place, so every line ref below holds; only L192-194 and the changelog end grow): row #3 `fatigue_cue_tapped` = the six SS §8 fields (C-1 closed); row #23 `best_buy_suppressed_zero_gain` not built in v5, any emission is a defect (new check TEL-SG8-NONE); B-2c closed; re-cites (SS -> c29c9285 in the errata; SS of record is now cfff3817, errata-only, note 3 at L868; rc2 e4d98651, pause 4c081f64, fatigue 7e120786, eng. 95b2e26c, gate 34373a10). No change to the V-3 pinned set, counts 23/18/5/21, the `telemetry.bbv2` block, V-2d `dead_zone`, the zero_gain cap, the ability_blocked marker or V-6 C-2. The checker reads the FROZEN copy (`--errata` overrides). Expectations below are HARD unless noted; flag-conditional rows follow the build balance.json (`--balance`).
  - **TEL-REV13-PIN (HARD, every mode):** errata file sha1 = a0e8f6d7 (rev 12 0cfe168a now FAILS this self-test); checker pinned set == the V-3 L143-152 block (20 types incl. `dead_zone`, `zero_gain_purchase`, + `tip_shown{id:clock_wage}`); 5 ring types (L154) not pinned. Self-tests: sha1, set ==, block without dead_zone FAILS, block with an extra type FAILS.
  - **TEL-C2-RC2ON (HARD, rc2Refill = 1, the ship config; V-6 L175-178, exclusive emission L176, D-HOP-41; HoQ 14:56):** `session_end` carries NO `paused_worker_s` / `all_paused_s` (both must be ABSENT; negative fixtures: each one alone, and both together); NO `worker_paused` / `worker_resumed`; every `rest_toggled{on:false}` closes an open `{on:true}` of the same worker (an `on:true` still open at unload is OK); `on:true` carries the H-1 fields `farm, mood, unpaid, ability_active, golden_on_screen, frenzy_active` and no `paused_duration_s`; `on:false` carries `paused_duration_s` >= 0 and none of the H-1 fields. Self-tests: 2 positive, 7 negative.
  - **TEL-C2-RC2OFF (HARD, rc2Refill = 0 kill-switch build):** no `rest_toggled`; with pause = 1 BOTH `session_end.paused_worker_s` and `all_paused_s` present, numbers >= 0; `worker_resumed.cause` never `auto_full`. **rc2Refill = 0 + pause = 0 (HoQ 14:56): unspecified in rev 13 -> reported UNVERIFIED, never FAIL, pending PMC rev 14** (`c2Unverified`, printed as `UNVERIFIED C-2 …`; the old "absent with pause = 0" FAIL is removed). Self-tests: 1 positive, 3 negative, plus 4 UNVERIFIED fixtures (totals present -> not FAIL; present -> UNVERIFIED; absent -> UNVERIFIED; no note for rc2=1 or pause=1).
  - **TEL-ZG-CAP (HARD, bestBuyV2 = 1; row #21 L80, L90, L155, D-HOE-32 M-2):** <= `telemetry.bbv2.zero_gain_purchase_cap` (50, read from the build balance) `zero_gain_purchase` per session; NO capped marker ("over the cap nothing is emitted, no marker"); `session_end.zero_gain_purchase_dropped` int >= 0 present, and 0 unless exactly cap events were emitted. bestBuyV2 = 0: no `zero_gain_purchase`, no `zero_gain_purchase_dropped`. Self-tests: 2 positive, 7 negative (incl. cap read from balance).
  - **TEL-AB-EVENTS50 (HARD, abilities = 1; L156-157, D-HOE-23 (a)):** `ability_blocked` capped marker `{capped:true, events:50}`: `events` is always 50, exactly 50 events before it, no `worker`/`reason`/`count`/`episodes` on it, nothing after it; > 50 without a marker FAILS. Self-tests: 2 positive, 6 negative. (Rev 12 "`events` is always 50" is the ability_blocked marker; the zero_gain_purchase cap of 50 has NO marker: see READINESS, unclear-text note.)
  - **TEL-DZ-SHAPE (HARD, bestBuyV2 = 1; row #22 L81, V-2d):** `dead_zone` closed `{farm int 10..29, s float 1 dp >= telemetry.bbv2.dead_zone_min_s (30), reason 'none_affordable', open?: true}`; registered as a v062 closed validator when bestBuyV2 = 1. Self-tests: 2 positive, 9 negative (reason cap/max, farm 30/9, s 29.9, s 2 dp, open:false, extra field, min read from balance).
  - **TEL-DZ-PIN + G8-20/G8-21 (HARD static, G-8 probe):** schema.ts pins `dead_zone` and `zero_gain_purchase` and exactly the V-3 set; a worst-case pinned-size test in `src/**/*.test.ts` ("worst" + `dead_zone` + the 200 KB cap) includes `dead_zone` (V-3 L160). **G8-23:** `dead_zone.reason` only 'none_affordable'; `zero_gain_purchase` has no capped variant; `session_end.zero_gain_purchase_dropped` declared.
  - **TEL-SG8-NONE (HARD, every flag config; rev 13 row #23 L82, D-HOE-20261030-33 eng. L522):** no `best_buy_suppressed_zero_gain` in any captured log (no SG-8 emitter in v5). Self-tests: 1 positive, 1 negative.
  - **TEL-BBV2-KEYS (HARD iff bestBuyV2 = 1, else INFO; L86-92, G-17):** the build balance.json has a TOP-LEVEL `telemetry.bbv2` block with exactly `shown_min_gap_s 5, zero_gain_eta_max_s 60, dead_zone_min_s 30, zero_gain_purchase_cap 50`; none under `m4.telemetry`; none as an economy.csv column (`--economy-csv`). The runtime thresholds (cap, dead_zone min) come from that block. rc/v5 tip 65a7443 has no block (INFO-FAIL with bestBuyV2 = 0 there). Self-tests: 1 positive, 6 negative.
  - **TEL-G8-C1 (G-8 / T-AC9, C-1 RULED D-PMM-2026-10-30-TAPFIELDS, closed in errata rev 13 row #3 L62; SS **cfff3817** note 3 **L868** (moved from c29c9285 L866, text unchanged; QA-D-1030-SS4), §8 L290-294). Expectation: FAIL closed on rc/v5 today (no schema.ts at 65a7443); EXPECTED PASS once the schema.ts PR lands on rc/v5** (no PR-head run, D-CEO-20261030-10). Asserts, against the RC's own `validateEvent` (`probes/telemetry/g8-validate-c1.mjs`, runtime) and declarations (G8-22, static): **(a)** `fatigue_cue_tapped` validates with all six SS §8 fields `surface, loss_per_s, loss_share, n_tired, n_asleep, n_paused`, and is rejected when any one is missing; **(b)** `n_tired + n_asleep + n_paused <= 4`: sum 4 accepted, **sum 5 REJECTED** on tapped and shown (new FAIL fixture `nosum`); **(c)** `suppressed_by_stall` is REJECTED on tapped (shown only; shown requires it). The same rules are in telemetry-check `fatigueCueProblems` for emitted events (self-tests 2 positive, 13 negative incl. sum 5 and the two-field `{surface, loss_per_s}` shape). Self-test `g8-validate-selftest.sh` 7/7.
    - **schema.ts PRE-MERGE BLOCKERS (HoQ 14:56; verify in the PR diff, paper read, no PR-head run; any one missing = do not merge):** (a) `validateEvent` has an `n_tired + n_asleep + n_paused <= 4` check (sum-5 rejected); (b) NO capped marker on `zero_gain_purchase` (no `capped`/`events` field, rev 13 row #21); (c) `dead_zone.reason` pinned to the single value `none_affordable` (rev 13 L105). Runtime probe G-8 asserts all three at the RC: G8V-C1b (a, FAIL fixture `nosum`), G8V-ZG (b, FAIL fixture `zgmarker`), G8V-DZ (c, FAIL fixture `dzcap` = reason 'cap' accepted).
    - **Stale cite (rev 14 minor m-2):** G-8's `schema.ts:171` / "test L336" cite is stale; it is logged as PMC rev 14 minor m-2. Keep using **L211 / L338** below until rev 14 lands.
    - **Pre-merge check (Saves QA, paper):** before the schema.ts PR merges, read its updated tests at **L211 and L338** (HoQA TELERR7 i-1; rev 13 G-8 row says "test L336") and confirm they cover (a) six fields, (b) the sum <= 4 bar with a sum-5 rejection, (c) suppressed_by_stall rejected on tapped. Record the PR head sha and the two line quotes; this is a read of the diff, not a PR-head run.
- Superseded (kept for history): **v5 RC re-target (D-CEO-20261030-04; schema APPROVED QA-D-1030-SAVES-RC-2):** telemetry v0.6.2 (manifest rows 11/24) moved to 5.1. The gate runs `--schema shipped`: the shipped rc/v5 schema in `changes-20261030/rc1-DRAFT-SCHEMA-3f582db.md` (sha256 083fcc11…, every field with src file:line at 3f582db), same depth, HARD on all 3 engines. The v0.6.2 checks below stay in the script, reported `N/A-BY-SCOPE` (never counted, not a waiver). S-AC5 (RC-2 amendment): the number of `upgrade` events must EQUAL the purchases the harness made (>= 1), with 6 self-tests incl. 2 count-mismatch negatives.
- Spec frozen: `spec/telemetry-spec.v0.6.2.b7a85e53.md`, sha256 b7a85e533f8738598eb93dfab1d2361167b39deaf8cd6d8fc874abc2a0767f23.
- Machine schema: `spec/telemetry-v062.schema.json`, hand-transcribed (61 events).

Checks:
- **TS1** T-AC1 (session_start, sid on all events, no sessionMs), T-AC3 (tap batching and fields), T-AC5 (is_first_upgrade), T-AC8 (session_end on pagehide), T-AC9 (schema, allowlist and privacy over the whole log).
- **TS2** T-AC2 hidden split, **deterministic** (HoQ 2026-10-29 20:12):
  - Mechanism: `document.hidden`/`visibilityState` are stubbed with Object.defineProperty, `visibilitychange` is dispatched (bubbles) and the Playwright fake clock is advanced by exactly 30 s and 61 s. No real tab hiding.
  - The run is done twice and the session sequences must match.
  - Harness checks: the stub applied, the clock spans are exact, and the two runs are identical.
  - **HARD on Chromium.** Firefox and WebKit run TS2 only (`--only TS2`). They are HARD unless the stub cannot be applied; in that case the result is INFO and the logged reason is kept in `ts2InfoReason`.
- **TS3** CSR-10: save_corrupt with bak, plus save_recovery_notice_shown and _dismissed.
- **TS4** IDB1-7: save_restore with source idb.
- **TS5** CSR-6: fresh M3.
- **TS6** offline_grant: once, with schema. **G-TEL-3** (HoQ correction 20:14): `secondsAway` is required and any `awayS` FAILS T-AC9, with no fallback. A built-in SELFTEST proves this: `{awayS}` and `{secondsAway, awayS}` must fail, `{secondsAway}` must pass, and an unlisted event must still fail.
- **T-AC9 is HARD per D-HOP-2026-10-29-04** (spec addendum 20:20; frozen `spec/telemetry-spec.v0.6.2+addendum-20261029.6d504570.md`, sha1 d170eb09). The four G-TEL-1/2 events are allowed, but only with **closed payloads**:
  - `save_recovery_notice_shown/_dismissed`: `{notice, source, store, variant?}`, all enums or null;
  - `milestone_reached`: `{id, track: hens|egg_value, level, mult}`;
  - `balanced_tier`: `{id, tier, min_level}`.

  `id` must be in the milestone enum, which the driver reads from the RC balance.json (`hens:<l>`, `grade:<l>`, `balanced:<t>`), and it must match its track, level or tier. An extra field or any other string FAILS. Unverified M5 fields and flags are **TRIAGE-ON-RC** (logged, never fail). Every rule has a SELFTEST negative (21 synthetic cases).
- Spec vs code note (G-TEL-4, report only): the addendum says milestone_reached/balanced_tier are "ring-trimmed, not pinned", but Latest `src/telemetry/telemetry.ts` `isPinned` pins both. The checker does not assert retention.
- **TS7 SS-19/§8** (QA-D-1029-Q9TEL; build:qa served with `--qa-dir`; HoQ FYI 21:37):
  - `eggfarmQa.stall.force(cause)` is called for the six causes **excluding `other`**, which is HoE's vitest fault fixture only. **Any `sales_stall` event after a force() FAILS.**
  - The §8 checks run on the live path only: Market Hand asleep via `worker.set` with basket and queue set, the 8 s hold, then woken. Expected: ≥ 1 shown, exactly one resolved per `stall_id`, no `reuse_count`, closed §8 field list and enums, cause `mh_asleep`.
  - HARD when `m4.flags.salesStopped` is on at the RC. Otherwise INFO, because the seam is absent on main.
  - **v5 RC: HARD (HoQ Q-TEL-4, 2026-10-30: salesStopped = 1 in v5, ship-set d71ed8cf, was 56090a61).** All TS7 checks are HARD when the build balance.json has salesStopped = 1: no `--qa-dir`, missing seam, live path not run, pairing (≥ 1 shown, exactly one resolved per stall_id, no reuse_count), §8 schema, cause mh_asleep, 0 page errors. Self-tests: TS7 pairing 1 positive + 3 negatives. Q-TEL-3 (HoQ: intended): a salesStopped = 1 build without v0.6.2 FAILS `--schema shipped` (sales_stall not in the shipped allowlist; self-test).

Flagged events (breeds, zeroGainUi, pause, abilities) are checked when `--flags` names them. The driver reads `m4.flags.*` = 1 (and `m4.enabled`) from the RC's balance.json. **v5 RC: every m4.flags value ships 0 (D-CEO-20261030-06)**, so every M5 flag-gated event FAILS if it fires; gate step G1-flags-ship-set enforces the flag set (see How to run).

## SS-15 Rule 2 share guard (Q10): `scripts/ss15-share-guard.mjs`
Parametrised by `--module/--export/--sig` (loss,income | income,loss | obj). **v5 RC: N/A**, cited in `scripts/gate-na.txt` (QA-D-1030-SS15-NA / D-CEO-20261030-04: #5b not in RC, manifest row 23, HoE 11:08 Oct 30); results show `U-ss15-share-guard | N/A | HARD | <cite>`, never an unset env. An uncited NOT RUN still hard-fails (preflight refuses).
**SS-15 live path (patch1 regression), v5 RC:** no Saves step. Coverage is FO-1..FO-10 plus UI QA's `ss15` sample on the final RC SHA; the Saves step is deferred to 5.1 (QA-D-1030-SAVES-RC-2).

38 cases. Denominator values: < 0, −MIN_VALUE, −0, 0, NaN, −Infinity, MIN_VALUE (boundary), 1e-12, 1 and 100; fatigueLoss values: 0, 5 and 0.001. Two defensive inputs are added: loss −1 and loss NaN.

Pass condition: finite, ≥ 0 and no throw, with an exact spec value (denominator ≤ 0 → 1 if loss > 0, else 0; else loss/denominator). A −0 result is logged as INFO.

Dry-run on stubs (`scripts/stubs/`):
- good impl in .mjs, obj signature and .ts via vite-node: 0 FAIL;
- naive impl, as the negative control: 21 FAIL, so `--expect-fail` exits 0.

## TP1-C2 offline fixture (Q2, shared with UI QA)
- Fixture: `fixtures/offline/tp1-c2-base.p1-B-mh-hired.save.json`, sha256 617f3534991811cf8f93da41f808ab6085a8e95be1fbaadad0daec7cd70f9123. Read-only and pinned in FIXTURES.sha256. It is p1-B: Market Hand hired, F10.
- Helper: `scripts/offline-seed.mjs`. `loadPinned()` checks the pin, `seedOffline(page, raw, {agoS: 7200})` sets savedAt from the page clock once per tab, and `captureSave(page)` returns the game's last save.
- Proof: `scripts/offline-seed-proof.mjs`.

## Publish and rollback: `scripts/publish-verify.sh`
Modes: `prepublish`, `postpublish` and `rollback`. Checks:
- **G1** tag peel, merge ancestry, tree diff (shipping files only).
- **G2** clean worktree build: sha256, size, build-id, no +dirty.
- **G3** release state and Latest; asset download vs the GitHub digest, the expected sha256 and a `cmp` against the clean build; asset build-id; the release-asset.yml run, its check-release-build step and the "matches expected" log line.
- **G4** CI check runs on the SHA.
- **G5** runtime smoke (`runtime-smoke.mjs`): build-id, collect/sell, save → reload no-loss, 0 errors. In rollback mode, also RB-8e (load a save from the bad build).

Rollback mode needs the restored release's logged sha256 and build-id. A mismatch prints a priority Blocker message draft.

## Flags-off rows FO-* (D-HOP-2026-10-30-04: RC without V5-HOP-1) — drafted 10:42 Oct 30; pinned 2026-10-30 under D-CEO-20261030-06 (v5 RC ships every m4.flags value at 0)
**FO pin (QA-D-1030-SAVES-RC-2 (4), D-CEO-20261030-06):** FO-1..FO-10 are pinned against the final RC SHA's committed `src/config/balance.json`, which must have every `m4.flags` value = 0 (3f582db: sha256 9a73bd8a6ebb936792c9c5fc667f37d295ecb9f8b74149112d50b297d228bb89, 14 flags all 0). If the ship-flag ruling changes, the FO rows are re-pinned in one change set.
Source of the set: Econ map `engineering/reviews/v5-hop1-tc-flag-map.md` (sha256 6506a8e9…, §(3)), used instead of HoE's list. Differences: the map adds **golden** (validateBalance keys present at rc/v5, but 4 spec tunables only in V5-HOP-1; Econ counts it off under "no placeholders") and **tapCoins**; HoE's **stall** = `salesStopped`; HoE's **refill timers** (rc2Refill/autoRefill) are **ambiguous** in the map (no tc key read by refill code, no refill code at rc/v5; autoRefill's keys are in neither CSV; per the map HoE's "timers" are golden's warn/urgent keys). The probe checks all 10 (map 8 + rc2Refill, autoRefill) so either ruling is covered; drop rows HoP rules out of the set.
Every row checks: (i) `src/config/balance.json` `m4.flags.<f>` is 0 or absent (shipped off); (ii) `validateBalance` passes on the flags-off balance (prod=false and prod=true); (iii) on that flag set, `state` is byte-identical to the 458f74c baseline (savedAt, saveSeq excluded) for the committed tracksV7 fixture `tests/fixtures/saves/m4-exp1-committed-unseen.json` ls["eggfarm.save"] (save sha256 8889e669…) on both paths: real Game boot + `save()` (gap 5 s), and fixed-time validate → m5Load → serialize(NOW = Date.UTC(2026,9,30,9), no saveSeq). Info only: the 5 unmarked fixtures on both paths vs 458f74c (deferred-migration path, QA-D-1030-ACP1-B).
| id | flag | source | shipped at a923206 | (i) off | (ii) validateBalance | (iii) state vs 458f74c (Game / fixed) | prelim a923206 |
|---|---|---|---|---|---|---|---|
| FO-1 | streak | HoE + map (load failure if on: formulas.ts:151) | 0 | PASS | PASS | = / = | PASS |
| FO-2 | pause | HoE + map (load failure if on: m5-rules.ts:31) | 0 | PASS | PASS | = / = | PASS |
| FO-3 | broody | HoE + map | 0 | PASS | PASS | = / = | PASS |
| FO-4 | salesStopped (HoE "stall") | HoE + map | 0 | PASS | PASS | = / = | PASS |
| FO-5 | fatigueCue | HoE + map | 0 | PASS | PASS | = / = | PASS |
| FO-6 | abilities | HoE + map | 0 | PASS | PASS | = / = | PASS |
| FO-7 | golden | map only (ambiguous in map) | 0 | PASS | PASS | = / = | PASS |
| FO-8 | tapCoins | map only | 0 | PASS | PASS | = / = | PASS |
| FO-9 | rc2Refill | HoE only (map: ambiguous) | 0 | PASS | PASS | = / = | PASS |
| FO-10 | autoRefill | HoE only (map: ambiguous; V5-HOP-1 doesn't unblock it) | 0 | PASS | PASS | = / = | PASS |
Probe: `probes/flagsoff-probe.test.ts` (dc2ab34c…), `probes/flagsoff-compare.mjs` (89cd26d4…), runner `probes/run-flagsoff.sh` (28888be8…; own worktrees + npm ci under qa/scratch, removed after, vitest 1 worker). Run: `/workspace/egg-farm-studio/ops/tools/lane-run.sh saves-qa -- qa/v5-saves/probes/run-flagsoff.sh <rc full sha> <outdir> <flag,list>`; exit of compare = 0 and `VERDICT PASS`. Prelim 10:41 on a923206: `probes/out-a923206-prelim/` (SHA256SUMS 472d9d09…), 10/10 PASS; exp1 fixed-path file 4c2f88a2… (= #91 base), state c0ad82c5… on both paths and both SHAs; all 5 info fixtures equal on both paths. Shipped `m4.flags` at both SHAs: all 0, `m4.enabled` 1. **One-save limitation (QA-D-1030-SAVES-RC-1 (6)):** (iii) is set-level: ONE save on the whole flags-off set, so FO-1..FO-10 share it and it does not isolate a single flag's effect on `state`. Per-flag isolation is (i) + (ii) only. FO-4 salesStopped=0 is kept because (i) proves the flag ships off (D-CEO-20261030-04 (3)), even though #5b has no code. Re-run 11:15 on rc/v5 3f582db vs 458f74c: `probes/out-3f582db/` (SHA256SUMS 53020762…), 10/10 PASS, exp1 state c0ad82c5… on both paths, all 5 info fixtures equal.

## How to run (at the RC)
**Gate rules (QA-D-1030-SAVES-RC-1 / -RC-2, D-CEO-20261030-06), pinned 2026-10-30:**
- Ship-flag set: G1-flags-ship-set (HARD) reads the COMMITTED `src/config/balance.json` at the run SHA (git show) into `rc-balance.json`; its sha256 is logged in status.log and signed in STATUS.sha256 on every run. Any `m4.flags` value != 0 = HARD FAIL `flags≠ship-set`.
- NOT RUN of a required step is a hard fail in both modes (unselected engines, missing RC html, unbound SS-15). N/A only from `scripts/gate-na.txt` (cited, pinned); `GATE_NO_NA=1` ignores it (stricter only).
- Port preflight: the gate refuses to start (exit 2, nothing written) if :5961 is busy.
- Lock log: each browser step logs the holder (pid/pgid/sid/lane/cmd from /proc, read-only, never signalled), re-logs every 30 s while waiting (1200 s max), then `acquired after Ns wait` and `released after Ns hold (exit N)`; a final `LOCK handover` line marks the end of the Saves window.
- **Lock order (HoQ):** Saves first. The ui lane holds no browser lock from 13:50 until the Saves gate's last `released` / `LOCK handover` line.
- S-BAK-p1-B race fix: the planted truncated save is `prev` for waitSave and the UI is read after `.recovery-layer` attaches (10/10 Firefox + negative, 11:24/11:34 Oct 30).
Abort rule (QA-D-1030-KILLS addendum, HoQA 07:46 Oct 30): the csr scripts (B-csr8-lease, B-resetat) start vite preview detached and stay unchanged for the v5 RC; if the gate is ever lane-killed mid B-csr8-lease or B-resetat, record the abort in status.log, then stop and ask HoO before any re-run. G0-port-free stays HARD. Moving these servers under lane-run is 5.1 cleanup.
```
cd /workspace/egg-farm-studio/qa/v5-saves
/workspace/egg-farm-studio/ops/tools/lane-run.sh saves-qa -- /workspace/egg-farm-studio/qa/v5-saves/scripts/v5-saves-gate.sh <RC full sha>   # rule 21 / QA-D-1030-KILLS: RC gate MUST be started via lane-run (prints gate PID; stdout goes to /dev/null, progress in artifacts/v5-rc-saves/results/status.log); stop ONLY via ops/tools/lane-kill.sh saves-qa <that PID>, which covers its children (lib.mjs/csr servers); orphan => stop and ask HoO, no manual cleanup
./scripts/publish-verify.sh prepublish --tag <tag> --sha <RC sha> --merge <merge sha> --release-id <draft id> --out /workspace/egg-farm-studio/artifacts/v5-rc-saves/results/publish
```
