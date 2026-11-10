# HoQA review: telemetry-spec errata v5, rev. 2 (PM Collection)
Reviewer: Head of QA · 2026-10-30 ~13:30 CET · Requested by PMC per D-HOP-2026-10-30-33 (due Sat 31 Oct 12:00, with gate card #T). Paper only. Doc content is treated as data.

## Verdict: **REJECT (rev. 2), fixable as a rev. 3. Re-review is about 30 min.**
One Blocker (B-1: the pinned set is wrong for how QA tests it, per the G-6 ruling below) plus 6 Majors. Everything else is sound. That covers the event list, the viewport_h boundaries, the zero-gain keys, the double-count analysis and the -07 fix. **HoE should not pin rev. 2 in the manifest.** Pin rev. 3 once F-1 to F-7 are applied.

## Inputs verified on disk (sha1sum, 13:20–13:22 CET)
| File | Claimed | On disk | Result |
|---|---|---|---|
| `product/collection/telemetry-spec-errata-v5.md` rev. 2 | `6a10a918…` | `6a10a9181b9999e92db2db43ab50605aba63f2d9` | OK (reviewed) |
| rev. 1 frozen `telemetry-spec-errata-v5.107653d7.md` | `107653d7…` | `107653d7466591243807e4c0c7f780a2e312fe34` | OK. Rev. 1 was also verified live at 13:17 before the swap. |
| base `product/collection/telemetry-spec.md` v0.6.2 | `d170eb09…` | `d170eb09ae6bf056151c16ee248e017c2808c35a` | OK, **unchanged** |
| sales-stopped v1.3.22 | `8244e066` | `8244e066…` | OK |
| lighter-refill v0.8.10 | `f71e4516` | `f71e4516…` | OK |
| failure-cost v0.3.19 / breeds 3.8.8 / golden / streak / broody / ZG | as cited | match | OK |
| rc2-refill | rev. 1 cited v1.3 `2fdd84a2` | live **v1.3.2 `358c90ba`**. Frozen: v1.3.1 `1216b723` and v1.3 `2fdd84a2`. | Stale in rev. 1. Rev. 2 now cites `358c90ba` (L19). v1.3.2 makes no telemetry change vs v1.3.1. |
| pause | `b4f86ca8` (v1.3.10) | live **v1.3.11 `216b31d6`** | Stale (L23). See F-8. |
| abilities | `06f98b49` (v1.3.3) | live **v1.3.5 `c7062854`**. Card #7 pins v1.3.4 `c65dfbc5`. | §9 text unchanged and the events are identical, but the lines moved to L400–402. Minor (F-12). |
| first-hire nudge | `1c95fc8a` | live v0.1.1 `2786a08f` (header note, D-HOP-36) | Fine |
| gate `product/m5-gate-acs.md` | `2906d372` | `bcf4b484` (it keeps moving; other cards) | Minor (F-12) |
| manifest | `3fe4a98c` | `19cce225`. Rows 11/24 were re-pinned to v5 at 13:20. | G-7 is closed on disk |

**Rev. 1 → rev. 2 diff (complete):**
- header/changelog;
- the D-COL-13 ref;
- source rows L19 (rc2 v1.3.2 `358c90ba` added) and L23 (pause v1.3.11 note);
- V-2 #5 (`refill_used` gains `refillable_n, best_worker, lowest_worker`);
- #6 (cite only);
- #7 (`first_worker_hired` gated on `m4.flags.rc2Refill`, `via_nudge` always false);
- "Not added" L65 (`first_hire_nudge_*` off the allowlist; Boost = `ability_used{in_sheet:true}`);
- session_end L68 (+ `shortage_s`);
- G-2 reworded and still open;
- G-5 and G-9 closed.

**Event counts are unchanged** (18 new: 14 pinned, 4 ring) and the V-3 pinned list is unchanged. PMC's summary left out one change: rev. 2 also added the RF5 fields and `session_end.shortage_s`, which fixes my rev. 1 finding on them. Nothing else moved.

## Findings
### Blocker
- **F-1 (Blocker), V-2 L52–53, V-3 L75–84, G-6 L117: the pinned set must add `ability_ended` and `ability_blocked`.** Blocking gate ACs assert exact counts on both:
  - AB-AC7 (gate L416): "exactly one `ability_ended{cause:"offline"}`" across a mid-call reload. This is the Saves S1 case, read from the persisted store.
  - PAU-AC7 (L276): `ability_ended{cause:"paused"}`.
  - AB-AC3 (L412): ends with `cause:"expired"`.
  - AB-AC10 (L419): "25 taps in 1.0 s … exactly 1 `ability_blocked{count:25}`".
  - AB-AC5 (L414): a tap logs `ability_blocked`.
  - Card #T TEL-AC9 (coalescing is asserted on the export).

  Under the QA rule, a blocking AC that counts exactly needs a pinned event. See the G-6 ruling below. Condition for `ability_blocked`: emission is bounded only by coalescing (1 per worker, per reason, per second). A spammer sustains about 1 event/s per worker, about 288 KB/h. The current session is never compacted (base §3.3 L71), so pinning without a cap breaks the 200 KB pinned cap (T-AC14).
  - **Fix:** pin it with a per-session cap plus a one-off `{capped:true}` marker, the `coop_full` pattern (base L94, T-AC10).
  - **Owner:** PMW (abilities spec) + HoE (sizing, with G-1).
  - **Proposed number:** 50 per session.

### Major
- **F-2 (Major), V-2 L63 ("collectible_*, frenzy_*, streak_* … unchanged") and L67–71: M5 field deltas on existing events are missing.**
  - Golden §8 (`910098bd` L318–323) adds `session_end` `golden_spawned, golden_collected, golden_cents, frenzy_extra_cents`. These are not in the L68 list.
  - `collectible_spawned` gains `collectible_id` and `layout` (enum adds `docked-compact`). Broody §8 adds `restored` (bool), `nest_fill_share`, `slot_id` Y0–Y11 and `reward_type:"broody_cash"`. `frenzy_*` gains `collectible_id`, and `frenzy_ended.reason` drops `hidden_end`/`offline`.
  - Base L37 points schema.ts at the **M4** collectible spec ("per that spec"), so schema.ts built from the errata would reject the M5 fields. GLD-AC6 (L95), BH-AC19 and T-AC12 need them.
  - **Fix:** add these as field rows, or as an explicit "fields per golden §8 / broody §8, superseding m4-timed-collectible" line.
- **F-3 (Major), whole V-2 table: field types, ranges and nullability are not stated (Q3).** The table copies field *names* "verbatim" with no type, range/enum or null rule. TEL-AC8 says "any field or enum value not in the source spec fails", but QA can't write closed-schema negatives from names alone.
  - HoE's types exist for the rc2 family (D-HOE-20261030-18; rc2 v1.3.1 L210–212: `sheet_id` int counter, `stall_id`/`entry_point`/`by`/`state`/`cause`/`mood`/`worker`/`best_worker`/`lowest_worker` enums, counts, `energy_pct` int 0–100). Rev. 2 #5 (L46) adds the RF5 names without those types.
  - Untyped elsewhere:
    - `sales_stall` (`queue_len`, `sellable_eggs`, `coop_eggs`: int ≥ 0? `focus_s_since_last_sale`, `session_s`: number 1 dp?);
    - `fatigue_cue_shown` (`loss_per_s` in cents/s? `loss_share` 0–1? `n_*` int 0–4);
    - `ability_*` (`t_since_ready_s`, `effect_s` number; `hired` array of worker-id enum);
    - `hatch_started` (`breed_id`, `rarity` enums; `cost`, `coinsBefore` int cents);
    - `breed_slotted` (`slot` 0–2; `loadout` string pattern `^P\d A\d B\d$`, no spaces; `settling`/`count` int);
    - `breed_revealed.stars_after` range;
    - `flock_complete` (`hatches` int, `elapsed_since_unlock_s` int).
  - Optional vs null is not defined: `stall_id?` and `prev_stall_id?` are absent, not null; `sheet_id` is null; `prev_slot|null` is null.
  - The worker-id enum isn't stated: `best_worker`/`lowest_worker` are W1–W4, but `worker` is `market_hand|coop_hand|hawker|grader` in code (`sim/workers.ts:4`, Saves `telemetry-check.mjs:38`). Say whether these are the same enum or two.
  - **Fix:** add a Type / range / null column. "Per HoE D-HOE-20261030-18" is fine for the rc2 rows.
- **F-4 (Major), V-2 L43–45 and #5/#6 (L46–47): PM Market's provisional v1.3.23 input (relayed 13:21) is not reflected.**
  - (a) `shift_sheet_opened.entry` has `nav|card|stall_chip` only. The proposed **`fatigue_chip`** (Manage from the fatigue popover) is **absent**. If PMW, PMC and HoE approve it, `refill_used.entry_point` and `rest_toggled.entry_point` must gain it too (they mirror `entry`, TEL-AC6), and TEL-AC7's join scope should say whether `fatigue_chip` sheets count. **Flag:** the errata must carry it as pending, or rev. 3 adds it on approval. Owner PMW + PMC + HoE, by Sat 18:00 (v1.3.23).
  - (b) "`fatigue_cue_tapped` fires once per chip tap that opens the popover; Manage logs only `shift_sheet_opened`." Errata #3 (L44) is silent. The spec and TEL-AC5 say "Popover open/close emits nothing". **Fix:** state that the chip tap emits exactly one `fatigue_cue_tapped`, the popover open/close emits nothing more, and Manage in the popover emits no second `fatigue_cue_tapped`.
  - (c) "When the stall chip suppresses the HUD chip, nothing is logged and the pair isn't resolved." This **contradicts** errata #2 (L43) and sales-stopped §8 L259, which carry `suppressed_by_stall: bool` on `fatigue_cue_shown` "when §5 or §4.7 hides, excludes or replaces them". Also, `fatigue_cue_*` has no shown/resolved pair (no `phase` field), yet §8 L254 says "same shown/resolved pair rules". **Fix:** PM Market rules which one holds in v1.3.23. If (c) holds, `suppressed_by_stall` is either only ever `true` on a cue that *starts* suppressed or is dropped. The errata then follows.
- **F-5 (Major), V-2 L65 vs card #T TEL-AC8/AC10: the `wage` / `worker_summary` fields.** The errata says `wage.state` is not exported but summed into `worker_summary`. FC-G11 (eng. decisions L144) names the export field `worker_summary.wage_<worker>_asleep_cents`, and it isn't in the errata. Card #T TEL-AC8 lists `wage.state` and TEL-AC10 checks that "`wage.state`" is absent flag-off, which tests a field that is never exported.
  - **Fix:** add `worker_summary.wage_<worker>_asleep_cents` (int cents, clockWage=1 only) as an allowlisted dynamic key.
  - **PM Market:** re-point TEL-AC8/AC10 to it, with `wage.state` tested on the SimEvent sink (AC-FC15).
- **F-6 (Major), V-1 L33–34 and Q4 (Saves): "gated by schema version" has no schema version to test.** Ship-set L22 and D-HOE-20261030-16 say telemetry is "gated by the schema version and save-migration tests". Neither the base spec, the errata nor code (`src/telemetry/telemetry.ts`, `TELEMETRY_KEY='eggfarm.telemetry'`, no version) defines a version token. The L2 "header" fix is the document's status line, not an on-wire version. There is also no rule for an upgraded install whose stored ring still holds pre-v0.6.2 events (`sessionMs` envelope, no `sid`/`fgMs`) when T-AC9 validates the export (manifest row 24 "full migration").
  - **Fix:**
    - Either define the version (e.g. `schema_v` on `session_start` or on the store root) and the old-event rule (drop/rewrite on first v5 load, or tolerated by T-AC9), owner HoE + Saves;
    - or HoP rewords the ship-set to "gated by schema.ts / T-AC9 and migration rows 11/24".
  - **QA-side (not an errata defect, logged for Saves):** `qa/v5-saves/v5-saves-cases.md` L63 still says telemetry "moved to 5.1" and runs `--schema shipped`. `telemetry-check.mjs` L102 asserts `sid`/`fgMs` are ABSENT and L86 assumes all flags 0. L129 `resolved_by` lacks `chip_manage`. Rows 11/24 need a v5 re-target to V062 mode plus this errata's schema.
- **F-7 (Major), G-3 L114: the H-1 golden fields have no home in the ship config.** With rc2Refill = 1 (v5), `worker_paused` never fires (V-6), so `golden_on_screen` and `frenzy_active` are never emitted. rc2 v1.3.1 L210 moves only `farm, mood, unpaid, ability_active` to `rest_toggled{on:true}`. GE-AC45 (golden errata v1.3.3 L239–241) can't be authored for the ship config. Card #T TEL-AC8 ties `session_end.paused_worker_s`/`all_paused_s` to rc2Refill = 0, while pause §12 L294 has them unconditional. **Needs a ruling by Sat 31 Oct 18:00 (PMW + HoE, PMC for golden).**

### Minor
- **F-8, #13 L54:** pause v1.3.11 §12 L293 adds `auto_full` to `worker_resumed.cause`, and the errata enum is `manual|manage`. Add it, marked "never emitted with rc2Refill = 0", so the closed schema doesn't reject a valid enum.
- **F-9, V-4 L89–94 (Q3):** boundaries are correct and match TEL-AC3/SS-38 (e): 739 → `'<740'`, 740 → `'740-899'`, 899 → `'740-899'`, 900 → `'>=900'`. "A resize after session_start emits nothing" is stated. Add:
  - (i) rotation/orientationchange is a resize: no re-emit;
  - (ii) a `session_start{reason:"resume"}` after a hidden gap ≥ 60 s **re-samples** innerHeight (it's a new session_start), so a rotate followed by a ≥ 60 s hide may change the bucket;
  - (iii) never null or absent (always one of the 3 strings, including headless/0);
  - (iv) exact wire strings. viewport_w uses `<375 / 375–767 / ≥768` with en-dash and ≥, while viewport_h uses ASCII `'740-899'`/`'>=900'`. Pin the ASCII literals for viewport_h and state the existing viewport_w literals.
- **F-10, V-3 L82:** the `tip_shown && id==="clock_wage"` clause needs the event-based `isPinned(e)` (base §3.2 L60). Code at `05d68b1` `src/telemetry/telemetry.ts:12` is still `isPinned(type: string)`. Add a build note (HoE).
- **F-11, G-4 L115 vs card #T TEL-AC6 L649 / RF-AC10:** the card says `manage_used` "is exported as an alias", but the errata doesn't allow it. A closed schema then fails RF-AC10 by construction. Resolve G-4 before authoring.
- **F-12, citations:**
  - abilities cites `06f98b49` L366–373; live is v1.3.5 `c7062854`, §9 now L400–402, and card #7 pins `c65dfbc5`;
  - card #T sha `2906d372` (now `bcf4b484`);
  - eng. decisions `a0955cce` (now `7a89508c`);
  - manifest `3fe4a98c` (now `19cce225`; G-7 L118 is closed on disk, rows 11/24 read "v5, in build");
  - G-8 L119 owner: D-HOE-20261030-18 makes schema.ts a manifest row-11 deliverable of **Saves (lane S)**, not "HoE / Features";
  - rev. 2's header and the L19 timestamp say 13:24 CET, but the file was written at 13:21:05 CET (mtime). Use the real time.
- **F-13, consistency note (no errata change):** GLD-AC6 (L95) and STK-AC4 (L44) also assert exact counts on ring events (`collectible_collected`, `streak_peak`). These stay ring under base §3.2 / D-HOP-07. QA asserts them on the vitest sim stream and single short fixtures well under `ring_size` 900, with no reload and no long run. That doesn't apply to AB-AC7 (it crosses a reload) or to TEL-AC9 coalescing (asserted on the export), hence F-1.

## Q1 completeness summary
- **AC needs, errata lacks:**
  - F-2: golden `session_end` ×4 and the collectible/frenzy/broody M5 deltas;
  - F-5: `worker_summary.wage_<worker>_asleep_cents`;
  - F-4 (a): `fatigue_chip`, pending;
  - F-8: `worker_resumed.cause auto_full`;
  - F-11: the `manage_used` alias;
  - F-7: the H-1 fields under rc2Refill = 1;
  - F-3: types on the RF5 fields.
- **Rev. 1 gaps closed in rev. 2:**
  - `refill_used.refillable_n / best_worker / lowest_worker` (enum W1–W4 per D-PMW-2026-10-30-10 / rc2 v1.3.1 L208; still untyped, F-3);
  - `session_end.shortage_s`;
  - `first_worker_hired` gate;
  - nudge events excluded.
- **Checked OK:**
  - sales-stopped v1.3.22: pair events, `surface:hud_chip`, no variant field, viewport_h buckets;
  - streak (`tap`, `streak_peak.max_tier`, session_end + §8.1);
  - breeds (4 events + `offline_grant.away_bp` + session_end L698);
  - abilities (4 events + session_end);
  - lighter-refill (`autorefill_toggled` + session_end);
  - clockWage (`tip_shown`, `session_end` ×2);
  - zeroGainUi (keys per V-5; `zero_gain_confirm` never fires at `m4.zeroGain.confirm` = 0);
  - broody `session_end`.
  - Card #4 post-L10 emits no telemetry (data only), so there is nothing to add.
- **Errata entries no v5 spec emits in the ship config:** `worker_paused`/`worker_resumed` (rc2Refill = 0 test config only, correct to keep), `zero_gain_confirm` (never fires in v5, correct to keep). No phantom entries.

## Q2 pinned/ring classification
Every pin carried from an owning spec is right for QA:
- `sales_stall` (SST/SS-36t pair counts);
- `fatigue_cue_*` (FC-AC1 asserts none);
- the rc2 family (RF-AC10/12/14, PAU-AC13, TEL-AC14 exactly-one per toggle);
- `abilities_unlocked`/`ability_used` (AB-AC2 once per save);
- `hatch_started`/`flock_complete` (once per save);
- `tip_shown{clock_wage}`;
- `milestone_reached`/`balanced_tier` (-07, Saves G-TEL-4 HARD).

`breed_revealed`/`breed_slotted` stay ring: no blocking gate AC counts them on the export, and breeds §8 L693–694 says ring.

### G-6 ruling (HoQA)
- **`autorefill_toggled`: PINNED, confirmed.** Low volume (a per-worker settings toggle). AR-AC2 (gate L368) asserts zero of them with rc2Refill = 0, and the §6 KPI needs it after a ring trim. No AR-AC asserts a nonzero count, so this isn't strictly required, but it is cheap and correct.
- **`ability_ended`: PINNED, overruling PMC's ring proposal.** AB-AC7 asserts exactly one across a reload on the persisted store. PAU-AC7 and AB-AC3 assert the cause. Volume is ≤ 1 per call (300 s cooldown, ≤ 4 workers), so the bytes are negligible.
- **`ability_blocked`: PINNED with a per-session cap, overruling ring.** AB-AC10 asserts exactly 1 `{count:25}` and AB-AC5 asserts it is logged. Condition (F-1): PMW + HoE add a cap (proposed 50 per session) plus a one-off `ability_blocked{capped:true}`, sized in G-1. QA adds the cap boundary case (50 logged, 51st → capped marker, totals still in `count`). If HoE rejects a cap by Sat 18:00, the fallback is ring, with AB-AC5/AB-AC10 re-scoped to vitest sim-stream assertions. That fallback needs HoP's sign-off because it amends a blocking AC.
- So the set becomes **16 pinned of the 18 new types, 2 ring** (`breed_revealed`, `breed_slotted`). Card #T TEL-AC11's union must add these, plus PMC's V-3 delta (`fatigue_cue_*`, `autorefill_toggled`, `milestone_reached`/`balanced_tier`).

## Q5 open gaps G-1..G-9
QA authoring deadline: freeze − 24 h = **Sat 31 Oct 18:00** (earliest freeze) or **Sun 1 Nov ~20:00** (pacing freeze, Card #4 only; telemetry authoring follows the earliest).

| Gap | Owner | Blocks QA authoring? | Needed by |
|---|---|---|---|
| G-1 summary sizing | HoE (per errata) | No for most cases. **Yes for the F-1 cap number** and T-AC14/QA-T14 fixture sizes. | Sat 31 Oct 18:00 |
| G-2 rc2 v1.3.x / pause v1.3.11 sha handoff | PMW | Low: fields are on disk (`358c90ba`, `216b31d6`; card #6a already cites v1.3.1 `1216b723`). Needs a sha for the case pins. | Sat 31 Oct 18:00 |
| G-3 H-1 fields with rc2Refill = 1 | PMW + HoE (+PMC golden) | **Yes** (GE-AC45 (b), F-7) | Sat 31 Oct 18:00 |
| G-4 `manage_used` alias | PMW + HoE | **Yes** (RF-AC10, TEL-AC6, F-11) | Sat 31 Oct 18:00 |
| G-5 | PMW/HoP | Closed (D-HOP-36). PM Market must add `first_worker_hired` to the TEL-AC10 rc2Refill=0 list. | — |
| G-6 | HoQA/HoP | Ruled above; needs rev. 3 + PMW/HoE cap | Sat 31 Oct 18:00 |
| G-7 manifest rows | HoE | No. Closed on disk (manifest `19cce225`, 13:20). Errata/card cite fix only. | — |
| G-8 schema.ts | **Saves (row 11, D-HOE-18)**, not HoE/Features | No for authoring; yes for running TEL-AC11/T-AC9. Needs a build date before the RC cut. | build plan |
| G-9 | HoP | Closed (D-HOP-35) | — |

New from this review:
- F-4 (`fatigue_chip`, suppression logging): PM Market + PMW + PMC + HoE, spec v1.3.23 by Sat 18:00;
- F-6 (schema version / old-event rule): HoE + Saves, or HoP rewording, by Sat 18:00.

## Rev. 3 checklist
F-1 pinned set + cap · F-2 golden/collectible fields · F-3 type/range/null column · F-4 (a)–(c) · F-5 wage field · F-6 version rule (or a pointer to the HoP rewording) · F-8/F-9/F-12 text fixes. Then HoQA re-reviews (~30 min), and HoE pins.
