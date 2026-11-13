# HoQA review: telemetry-spec errata v5, rev. 3 (PM Collection)
Reviewer: Head of QA · 2026-10-30 ~13:35 CET · Paper only; doc content treated as data. Checklist: `qa/m5/review-telemetry-errata-v5-rev2.md` (sha1 c915d911, F-1..F-13, G-6 ruling, G-1..G-9).

## Verdict: **NOT PINNABLE — superseded by rev. 4.**
Rev. 3 fixes most of the rev. 2 findings, including the Blocker (F-1). But it conflicts with HoE's D-HOE-20261030-19 (logged after rev. 3 was written) on three points, and HoP has to rule on those (C-1..C-3). **HoE must not pin rev. 3 in the manifest.** Rev. 4 should adopt HoP's rulings and close R-1..R-8 below in one pass. The re-review is about 20 min.

## Inputs verified on disk (13:32 CET)
| File | Claimed | On disk | Note |
|---|---|---|---|
| errata rev. 3 | ee707672 | `ee70767205689f257b6e5d35186b5a747f857a50` (mtime 13:29:40) | OK |
| rev. 2 frozen | 6a10a918 | `6a10a918…` | OK; rev2→rev3 diff 256 lines, read in full |
| base telemetry-spec v0.6.2 | d170eb09 | `d170eb09…` | OK, unchanged |
| ship-set | sha256 05da2130 | sha256 `05da2130…61ee` / sha1 `2a455d72` | OK; L23 wording = D-HOP-40 (product/decisions.md L1833) |
| abilities v1.3.5 | eb33aad0 | frozen `m5-worker-abilities-spec.eb33aad0.md` = `eb33aad0…` | OK. §3 W1–W4 L95–98 and §9 L409–416 match. **Live is now v1.3.6 `8797f5ff` (13:29)**; §9 is byte-identical (now L420–427) |
| rc2 | v1.3.5 5a2982ee | frozen = `5a2982ee`; **live v1.3.6 `2e477a03` (13:31)** | stale |
| sales-stopped | v1.3.22 8244e066, "v1.3.23 not on disk" | **v1.3.23 `2bafd9b3` FINAL on disk (13:28)** | stale |
| failure-cost | v0.3.19 4f5bbc5c | live v0.3.20 `2f830cb0` | telemetry lines L138/L165–169 unchanged |
| pause v1.3.11 | 216b31d6 | `216b31d6` | OK |
| eng. decisions | ba52827b | **`58169952` (now contains D-HOE-19)** | stale |
| manifest | 19cce225 | `19cce225` | OK |

## Conflicts for HoP to rule (rev. 3 vs D-HOE-20261030-19)
- **C-1 (F-6) Schema version.** Rev. 3 L14 and D-HOP-40 say there is no separate schema version and no on-wire `schema_v`. HoE's D-HOE-19 says `TELEMETRY_SCHEMA_VERSION='0.6.2'`, the stored ring is `{v, events}`, and the export header carries `schema_version`. Under HoE's rule, a pre-0.6.2 ring keeps its events tagged `legacy:true` and T-AC9 validates non-legacy events only. QA needs whichever rule wins written into the errata: the store/export shape and the legacy rule, or an explicit "none". **Owner HoP (+HoE, Saves row 11).**
- **C-2 (F-7/G-3) Scope of `session_end.paused_worker_s`/`all_paused_s`.** Rev. 3 V-2b and V-6 (PMW 13:25; rc2 v1.3.5/1.3.6 L218) emit them in both builds. HoE emits them only with rc2Refill = 0, per TEL-AC8. The rest of G-3 is consistent: `golden_on_screen`/`frenzy_active`/`farm`/`mood`/`unpaid`/`ability_active` ride on `rest_toggled{on:true}`, which is now on disk in rc2 v1.3.6 L215–216. **Owner HoP (PMW vs HoE).**
- **C-3 (F-11/G-4) `manage_used` alias.** Rev. 3 L76 (and rc2 v1.3.6 L173/L221) keep an export-only alias. HoE says there is no alias: wire and export use `refill_used` only. Card TEL-AC6/RF-AC10 then needs a name-only amendment, which HoP signs. **Owner HoP (PMW vs HoE).**

## Rev. 2 findings: status in rev. 3
| F | Status | Note |
|---|---|---|
| F-1 Blocker | **Fixed** | 16 pinned / 2 ring; `ability_ended` and `ability_blocked` pinned; cap 50 + one `{capped:true}` marker (V-3 L116). HoE accepted the cap (D-HOE-19). See R-4 for the marker shape. |
| F-2 | **Fixed** | V-2b covers golden/broody/collectible/frenzy deltas, removed fields and session_end. `golden_frozen_s` is already in base L219. |
| F-3 | **Fixed** | Type/range/null column and null rule (L46). Unstated types are marked *proposed* with owners (G-13). The no-space `loadout` pattern is accepted. |
| F-4 (a) | **Text stale** (R-2) | Still says "`fatigue_chip` pending HoE", but HoE approved it (D-HOE-18 13:21 addendum, eng. L390) and SS v1.3.23 §8 L296–312 records that. |
| F-4 (b) | **Fixed** | Matches SS v1.3.23 L281/L285. |
| F-4 (c) / G-12 | **Not closed** (R-1) | V-2c (c) is still "OPEN", but SS v1.3.23 is now final. |
| F-5 | **Fixed** | `worker_summary.wage_<worker>_asleep_cents` added. TEL-AC8/AC10 re-point routed to PM Market. |
| F-6 | **Conflict C-1** | |
| F-7 | **Conflict C-2** | The field-home part is resolved on disk (rc2 v1.3.6). |
| F-8 | **Fixed** | `auto_full`, never emitted with rc2Refill = 0. |
| F-9 | **Fixed** | ASCII literals, rotation, resume re-sample, never null, boundaries. |
| F-10 | **Fixed** | Build note. HoE confirms event-based `isPinned(e)`, owner **Saves** (schema.ts PR), not HoE (R-6). |
| F-11 | **Conflict C-3** | |
| F-12 | **Mostly fixed; new drift** (R-5) | Rev. 2 time corrected to 13:21 by mtime; G-8 owner is Saves. |
| F-13 | n/a | Consistency note only. |

## Other checks
- **G-12 vs PM Market's 13:25 ruling (QA log L707) and SS v1.3.23 §8 L281–285.** These agree on the following: keep `suppressed_by_stall`; fire once per episode when the cue becomes eligible, with `true` if the stall chip is up then; a mid-episode stall logs nothing and doesn't re-fire; no resolved event; tap and Manage logging as in F-4 (b). **Two differences for PM Market to settle:**
  - (i) **Episode end.** The ruling says the episode ends when "the worker is no longer Tired/Asleep". v1.3.23 L283 says it ends when "the cue condition clears (Rule 2 clear: share < `tc_fatigue_cue_clear_share` held `tc_fatigue_cue_clear_hold_s`)". These diverge under hysteresis and with more than one worker. QA will case the v1.3.23 text unless PM Market says otherwise.
  - (ii) **Popover on a mid-episode stall.** The ruling and SS-G35 say the popover closes. v1.3.23 L284 only says "logs nothing, episode continues". Confirm the popover-close behaviour is in §4/SS-47.
  - Editorial: v1.3.23 L291 has a stray leftover fragment ("…and `fatigue_cue_tapped {surface, loss_per_s}` (M4.2, unchanged). New field `suppressed_by_stall`… when §5 or §4.7 hides…") inside the viewport_h bullet. PM Market should remove it so it can't be read as a second rule.
- **D-HOP-39 (Boost combo in v5): no new telemetry field needed for the gate.** AC-M5A-24 (abilities v1.3.6) asserts the 45/30 s duration on the sim/focus clock and exactly one `ability_used{in_sheet:true}`. Rule 11 in v1.3.6 says "no new event". `ability_ended.effect_s` (expired ≈ 45 vs 30) gives indirect evidence. Rev. 3 L61 and L75 state this correctly. *Note:* no spec defines a combo-uptake KPI. If HoP or PMW want one, it needs a new field (e.g. `ability_used.combo: bool`) by HoE allowlist before the Sat 18:00 authoring deadline. It's not a QA requirement.
- **Abilities citations:** the eb33aad0 lines are correct. Live v1.3.6 changes no §9 text; re-cite at rev. 4 (R-5).

## Rev. 4 checklist (beyond C-1..C-3)
- **R-1 (G-12):** replace V-2c (c) with SS v1.3.23 §8 L281–285 (cite `2bafd9b3`). Carry PM Market's answer on (i) and (ii).
- **R-2 (F-4a/G-11):** `fatigue_chip` is **approved** (D-HOE-18 L390; SS v1.3.23). Drop "pending" in rows 4–6 and V-2c (a). Close G-11.
- **R-3 (G-10):** wire worker ids = code ids `market_hand|coop_hand|hawker|grader` (D-HOE-19; W1–W4 is spec shorthand only). Fix L48, rows 5, 8 and 9 (`hired`), and the `<worker>` key in V-2b. **PMW** aligns rc2 v1.3.6 L213/L218 ("W1–W4 enum") to that. Close G-10.
- **R-4 (F-1 marker):** define the `capped:true` marker fully. Does it carry `worker`/`reason`/`count`? HoE says "totals still in `count`", so state where the post-cap tap total goes, or that it is dropped. State that the cap counts emitted (post-coalescing) events. Close G-1/G-6 for the cap. The byte sizing moves to Saves (worst-case-session test; over 200 KB goes back to HoE).
- **R-5 (citations):** abilities v1.3.6 `8797f5ff` (§9 L420–427, identical to eb33aad0); rc2 v1.3.6 `2e477a03` (G-2 PMW sha handoff still open); SS v1.3.23 `2bafd9b3`; failure-cost v0.3.20 `2f830cb0`; eng. decisions `58169952`; gate file at rev. 4 time.
- **R-6 (F-10/G-8):** isPinned(e) and schema.ts owner = Saves (D-HOE-19).
- **R-7 (G-3 text):** after C-2, rewrite V-8 G-3. The "on-disk rc2 L213 does not add golden_on_screen" line is stale, because rc2 v1.3.6 L215–216 adds them as bools.
- **R-8 (G-13):** proposed types still need owner sign-off (PM Market #1–3, PMW #7/#10, PMC #15/#17). Rev. 4 can stay pinnable with them marked *proposed* if each owner confirms by Sat 31 Oct 18:00.

## Remaining blockers for QA authoring (deadline Sat 31 Oct 18:00 CET)
| Item | Owner | Due |
|---|---|---|
| C-1 schema version / legacy rule | HoP (+HoE, Saves) | ruling ASAP; rev. 4 by Sat 31 Oct 12:00 |
| C-2 paused_worker_s/all_paused_s scope | HoP (PMW vs HoE) | same |
| C-3 manage_used alias | HoP (PMW vs HoE); card TEL-AC6/RF-AC10 name amendment HoP | same |
| G-12 (i)/(ii) episode end, popover close | PM Market | Sat 31 Oct 12:00 |
| Rev. 4 (R-1..R-7) | PMC | Sat 31 Oct 12:00 (review due date D-HOP-33) |
| G-2 rc2 v1.3.6 / pause v1.3.11 sha handoff | PMW | Sat 31 Oct 18:00 |
| G-13 proposed types | PM Market / PMW / PMC | Sat 31 Oct 18:00 |
| G-8 schema.ts + worst-case size test | Saves (row 11) | before RC cut (needed to run TEL-AC11/T-AC9) |
