# engineering decisions

## 2026-10-16 19:30 Engineering team expansion
CEO approved 4 hires from engineering/hiring/eng-team-specs-2026-10-16.md, now live:
- Senior Software Architect (205f4268): first job is the M4 design doc and task split, at engineering/m4-design.md.
- Senior Engineer, Saves & Persistence (3ba38cf3): SD5-1/2, V4-1..4, SD4-4, N1/N6.
- Senior Engineer, UI & rc1 Fixes (e80556fd): the rc2 UI list.
- Senior Engineer, Features & Economy Wiring (95daf662): M4-A follow-ups, then M4-B onward.
Each has a worktree at /workspace/wt-<area>. Head of Engineering keeps the in-flight rc1 releases, MK-24-1/TUT-1 and the M4-A v2 playtest build. Merges still need a Code Reviewer pass and QA verdict.

- 2026-10-16 22:12 HoE: Adopted §3d for M4-A: the commit writes localStorage only, IndexedDB is read-only during the attempt, and the boot read is still required. Conditions: a quota headroom precheck (defer, never evict the main save), the mirror resumes after the read-back is confirmed, and S-4 brings back the IndexedDB backup. Supersedes the per-store abort path in M4-12/13. The IndexedDB variant is kept as the alternative.

## 2026-10-17 00:29 L30+ extra-level pricing: max(row cost, extra formula)
Replaces spec v0.2's 'replace', which let players buy ahead below the row cost (Code Reviewer finding). Approved by HoP at 00:28 on Economy's ruling. Shipping CSV b59c4e0d, no fallback: if it regresses with max(), the L30+ release is held.

## 2026-10-17 00:36 Shipping economy data moves to the F1 CSV; the workers gate flip follows
The shipping balance.json fails the WORKERS_GATE (L18 at 30:00). On F1 data all 30 seeds reach L21. econ/f1-cost-overrides syncs from 86f0e80e. The gate flip is a separate PR, merged after QA's ac7-l18-25 rerun with workers passes.

## 2026-10-17 01:19 Close save in a separate key eggfarm/save/unload (PR #10)
The M1 fix and the Firefox SD5-1 fix can't share one IndexedDB transaction. On load, the newer valid save by seq wins, it's promoted with read-back, then the unload key is deleted. An older or corrupt unload save is never promoted. Rejected (a), because it brings back data loss in Firefox.

## 2026-10-17 01:49 Flag-off sim-trace golden re-pinned for F1 (#17)
The approved F1 data switch changes shipping balance by design; the bisect at c75b6dc still equals 50a87ddb. New pin is f90d1678, approved by the Architect as golden owner. The storage-bytes golden is unchanged.

## 2026-10-17 02:23 Economy drift guard (from the PR #24 review)
Decision: every Economy change to the game CSV or sim reaches the game as a repo PR, which is enforced in review. A `--strict` drift check against product/ goes on the pre-release checklist and blocks rc tags. Owner: Architect, in the 06:00 vendor follow-up.

## 2026-10-17 03:55 M4-19 rev 3: close-time save key eggfarm/save/unload (SD5-1 option b), transitive ranking
Approved by HoE and the Architect; built on `fix/saves-sd5-1b` (852de8c, 56b3692). Owner: Saves.
- The close save (pagehide, beforeunload, endSession) is an unconditional put plus commit(), durability 'relaxed', to IDB `eggfarm/save/unload`. It never touches `main` or the diverged slots. visibilitychange→hidden stays the normal strict checked write to `main`. cad7fde's in-transaction get+abort on the close path is reverted.
- Boot reads `main` and `unload` and validates both. The newer-build check covers `unload`. `unload` is ranked against localStorage main and IDB main under one rank mode (F2-EQ). A corrupt or older `unload` never overwrites main.
- When `unload` wins, it is promoted to `main` (strict put with the in-transaction newer check, then read-back), and `unload` is deleted only after a verified promote. A failed promote keeps `unload`. main === unload (a crash between promote and delete) means delete only, which makes it idempotent.
- Flag on (M4/SQ-1): an F2-EQ loser takes the normal diverged-slot path. Flag off: a losing or diverged `unload` copy stays in `unload` and main is not overwritten. **Known flag-off limit (accepted, same loss class as rc1):** the next close does an unconditional put to `unload` and overwrites the kept copy.
- Ranking is transitive across 3+ copies. Among copies with equal version and committed status (m4-design.md:99): if any of all valid copies lacks a saveSeq, all valid copies rank by savedAt; otherwise by saveSeq, then savedAt. The mode is computed once over all valid copies (LS main, IDB main, unload) and reused by the later LS-vs-winner reconcile step. Rank ties use a fixed order: LS main > IDB main > unload. A tying unload copy is 'diverged' and is never promoted. This replaces pairwise "seq only when both have it" (rankCompare in #12), which cycles: A seq5@t1, B no-seq@t2, C seq3@t3.
- §3b zero-writes list: add IDB `eggfarm/save/unload`. The newer-save refusal path writes nothing to it, and pre-fix builds never touch it. Reset clears it.

## 2026-10-17 04:05 Economy drift check: final ruling
product/economy.csv is the single canonical file. After #17 merges, Economy promotes 86f0e80e into it byte for byte; the strict check compares against it. The manifest-source comparison is rejected. This replaces the 04:03 back-and-forth.

- 2026-10-17 05:17: M4-A flag-off: merges after #17 and takes #17 costTable (F1 not a leak; F1 gating reverted); grader-tier and M4 save-field gates kept; Fredoka 700 preload drop limited to M4 build (flag-off index.html matches main). -- HoE

- 2026-10-17 06:32: M4-A v4 7621153 pushed (m4/m4a-tracks-v4); grader-tier gate dropped too (same rationale as F1 cost: #17 data is main flag-off behaviour). Merges after #17. -- HoE

- 2026-10-17 07:17: data/economy.f1.csv gets .gitattributes `-text` (keep CRLF bytes, hash 4ad1349a = product copy) instead of renormalizing to LF + re-pin. Rationale: no data/hash change, no Economy re-approval. -- HoE

- 2026-10-17 07:30: #17 had merged into stale base arch/f1-globals-devonly-r1 (3f2ac38), not main. Re-landed same head 8fcd177 via #32 -> main 97a57c1 (tree == 3f2ac38). Retargeted #18, #12 to main. product/economy.csv promoted to 86f0e80e (Economy; strict EXIT 0). Process: verify PR base==main before every merge. -- HoE

- 2026-10-17 07:35: #12 L30+ depends on M4 code; cannot land standalone. Order: #18 -> #31 (M4-A v4) -> #12 (merge main forward, delta QA/CCR). -- HoE

- 2026-10-17 08:11: AC7 variance acaceee: bands PASS; L18-25 workers worst-seed 493s > 480s (L21). HoE: rc tag requires AC7 VERIFIED; recommended L21 trim; HoP to rule. -- HoE

- 2026-10-17 08:13: sd5-1b AC14b vs SD6-1: no-storage notice deferred while Saving-paused dialog is open, shown on close (option a). -- HoE

- 2026-10-17 08:30: market_hand_min_wait_s (2s) in CSV but not in src/sim -> ruled missing implementation, required before rc (game must match AC7 model). Owner Features, own PR feat/market-hand-min-wait. -- HoE
- 2026-10-17 08:48 HoE: Every CSV change runs the full gate set (AC7, L10, L18-25, L30+) before merge. The L30+ gate failure holds only L30+ content, not builds without L31+ rows.
- 2026-10-17 08:49 CEO/HoE: The L30+ gate holds only L30+ content (#12). M4-A ships on Saves QA's delta PASS.

## D-HOE-2026-10-17-RC-SCOPE (13:45 CEST) — RC dd52bfd scope confirmed
- RC = main dd52bfdc1c695cfc7695b3d63ba6a7883c5fd49b, published exactly as-is.
- #5 (a56b3a2) deferred: CCR Major (lost milestone toast at Farm L15, M4 on). Freeze rule: B/C/M holds the item.
- #35 (3fa3781) deferred: conflicts with the rc1 chain vs M4-A. Freeze: no rework.
- C2 / #12 / #37 dropped: Features not cleared by 12:30 (CEO approval 12:07; #37 dropped by the CEO).
- m4.enabled=0 is deliberate: M4 ships flag-off by design (golden flag-off trace holds). No flag flip in this release.
- CEO approval (13:45 CEST msg): #5/#35 drops confirmed deliberate. Ref D-HOE-2026-10-17-RC-SCOPE.
- D-CEO-20261017-03 (CEO, 13:45): M4 ships default ON. PR #41 rc/m4-default-on @90a9c84 (flag only).
- D-CEO-20261017-05 (14:52): M4-on pacing fails (L10 P95 15.3 vs 12 min); #41 PARKED. Freeze complete; Latest = main = dd52bfd.

## D-HOE-20261019-01 (03:21): L30+ pack src changes brought in whole from 6809f8e (no split); separate src/data commits; full CCR + Saves review of migrate-v7; flag-off byte-identical.

## D-HOE-20261019-03 (08:55): M4 B released
- M4 B (capped at farm L30, D-CEO-20261019-10) is published as Latest on HoQA PASS 08:31 @ 246de09, with CCR PASS and Saves GO.
- Merges: #49 → rc/m4-default-on 9b2ef4004f65876445d2a8d70df2e4f5451256d0. #41 → main dd223f510e9acabf9b1915b56e39da8b88dcac63. The tree is identical to 246de09.
- Tag m4b-dd223f5. Release: https://github.com/PrincipalLewis/egg-farm/releases/tag/m4b-dd223f5
- The asset egg-farm.html is built from 246de09 so the build id reads exactly m3-rc1-pre+246de09 (sha256 0bc5bb72…a4c, 511108 B).

## D-HOE-20261019-04 — OQ-7 / M41-7 (CSR v0.2.3 loadSafe) buildable; split (10:10)
- Saves confirms M41-7 buildable on dd223f5 (engineering/reviews/corrupt-save-recovery-saves.md §"M41-7 buildability"). OQ-7 closed: buildable.
- Size ~14 h > single-engineer 20:00 cap. Split: Saves builds core (tests first, loadSafe single owner, main.ts/Game wiring, gates, ~10 h); UI e80556fd builds M1–M5 dialog copy, M2 variants, age text, notice telemetry (~3 h) against engineering/reviews/m41-7-copy-interface.md. M41-7 (scope #3) outranks M41-8/9 (scope #4) for UI.
- Fallback: M2 age/level variants slip to M4.2 if not green by 20:00. CSR-17 is M4.2 unless M41-7 is green by 15:00.
- Gap defaults G1–G10 accepted as Saves proposed; G1 (Art) and G4/G7 (HoP) stand unless overruled by 12:00.

## D-HOE-20261019-05 (10:32) D-HOP-36 fit
RV-4 (tracks-ui strings, about 1 h) goes into M4.1, built by UI after the M41-7 copy as its own PR, as a late QA intake by 20:00. RV-2 (shared ETA formatter) goes into M4.1 only if UI is ahead at the 17:00 cap check; otherwise it goes to M4.2. RV-5 A goes to M4.2 along with the real fix (5 s realized-net window, 74512ea port, EtaHold).

## D-HOE-20261019-06 (10:33) D-HOP-44 fit
MK-60 (wage lines) and MK-63 (spend pop) do NOT fit the M4.1 cut because UI capacity is full until 22:00. Both move to M4.2 and come first in the M4.2 UI queue, with MK-64 sim parity as an AC.

## D-HOE-20261019-07 (10:35) UI order, superseding -05 timing
UI order: #54 D-HOP-40 follow-up (about 11:30), then RV-4 + RV-2 bubble label (string-only, one PR, pushed by 15:00 per HoQA, otherwise M4.2), then the M41-7 copy (before 17:15), then M41-8 F4 including the D-HOP-42 unlock label (20:00), then M4A-34 and the rest of M41-9 (22:00). The shared ETA formatter moves to M4.2, and RV-5 is listed as KI-RV5.

## D-HOE-20261019-08 (10:37) single M4.1 UI cut, superseding -05/-07 timing
Every M4.1 UI PR must be pushed by 20:00 hard (HoQA rule), or it moves to M4.2. RV-4 and RV-2b are separate small PRs off the integrated head; the RV-2b go/no-go is at 17:00. M41-8 is due by 20:00; anything left of M41-9 after 20:00 moves to M4.2 (22:00 cap removed). Telemetry: the copy interface wins; save_recovery_notice_shown/_dismissed are the notice events, and save_restore is used only for the silent IDB restore. PR #58 (M41-7 copy) is at 66680eb.

## 2026-10-22 21:10 HoE: CSR-8 8b race fix
The tab that loses the lease must never boot silently. Required: a tab that boots with no main but finds an IDB corrupt.* takes the IDB1 path (M3 dialog, save_corrupt {store:idb}, Export). Optional: re-check owns() inside the copy transaction, only if it can be done synchronously. Reason: B-side detection holds whatever the timing; an in-transaction check alone leaves a window.

## 2026-10-22 22:12 — #63 reset_at minors
Architect review of eggfarm.save.reset_at at b986cd3: no Blocker or Major (engineering/reviews/pr63-reset-at-b986cd3.md). Decision (HoE): no new SHA for #63, so the HoQA single full gate on b986cd3 stays valid. Minors m1–m4 (use the newest corrupt key instead of wall clock, the RESET_KEYS prefix comment and test, a quota-throw test, clamping a future-dated reset_at) move to an M4.2 follow-up owned by Saves. If HoQA or Art force a fix SHA, fold m2–m4 into it.

- 2026-10-24 16:24 HoE (M5 paper): (1) M5 systems treat any hidden or frame gap >=60 s as offline (legacy 60 s catch-up for coop/customers/wages unchanged). (2) M5 release flags live in balance.json under m4.flags, not CSV. (3) Remaining ability cooldown is clamped to its max on every read (clock-rollback guard). (4) No save version bump for M5.0; optional fields only.
- 2026-10-24 16:29 HoE (M5 paper): focusClock += min(frame dt, 1.0 s) only while visible and no menu, driven by injected sim time; 0 offline. frenzyRemainingS and the egg timer freeze offline.
- 2026-10-24 16:33 HoE (M5 paper): FX cap is tunable m4.fx.maxActive=8 in balance.json; ability end causes expired|paused|offline; ability_blocked coalesced 1/worker/reason/1 s sim with count; flags m4.flags.abilities and m4.flags.pause default 0.

## 2026-10-24 16:38 — HoE: worker specs v1.2.1 (abilities 3e0a0bb, pause 22dcc18)
- Rule 10 (D-HOP-10/AB-9) confirmed buildable; activeS optional save field, clamped on read [0,duration], no version bump.
- Ability end causes = expired | paused | offline | asleep | unpaid (supersedes the 16:2x 3-cause list).
- Q10: accept call-starts-suspended under Upgrades sheet at 360 for M5.0 + `in_sheet` bool on ability_used; sheet-exemption costed ~0.25 dd if HoP rules otherwise.
- P-12 abilities-only comparison save pinned to 5d9efa61c5e6ee31ca9ebdec20ee70167d31d463; re-pin to main merge SHA if #67 merge changes content.

## 2026-10-24 16:40 — CEO rulings on M5 sizing + S2 hotfix (relayed by CEO)
- Seat 95daf662 re-activated as 4th engineer (no hire), effective on Vadim's go.
- Telemetry v0.6.2 full = M5.0.1 on that seat, before any wide release; M5.0 carries only the gate subset.
- S2 Market Hand asleep-signal hotfix NOT in #67; ships as a post-Latest patch (like #69), same gates. Plan: branch off new main after #67 merges; sequence after #69 v2 unless sizing says otherwise.

## 2026-10-24 16:45 — HoE: fix/m41-patch1 approach
- Do not merge 7380b86; targeted port of rc1 AC-R1–R9 only (UI estimate ~9–11 h dev + ~2 h gates = 2 full gate runs incl. CCR round trip, ~1 h each; revised 16:47 to ~12 h dev + ~1 h first gate run + 2–3 h fix-ups/re-run). 3 CCR Majors resolved by not porting p3coll375 / cuta3 goal-pill CSS and keeping HEAD goal code.
- §4.2 live-income fix (D-HOP-13) confirmed ≤0.25 d, estimator-only: incomePerSec callers on main (best-buy, goal-label) use assumeWorking:true; earnings come from customer sim. Gated to !assumeWorking.
- Copy 'slowed' vs 'stopped' pending HoP ruling; HoE recommends 'stopped' for hired MH asleep/unpaid (+1 h).
- M5.0 sizing: + sales-stopped-spec v1.1 (1.75–2.0 dd).

## 2026-10-24 16:50 — HoE: M5.0 sizing v1.2 decisions (m5.0-sizing.md §12–§15)
- D-C1 flags m4.flags.{golden,streak,tapCoins,broody,salesStopped}; D-C2 event RNG seeded once from mixSeed(state.rng^0x6576526E), saved; D-C3 long-frame ticks beyond first 1.0 s run with Frenzy/streak/calls suspended; D-C4 brRng derived, unsaved; D-C5 broodyNestCents/broodyHenIdx; D-C6 I_ss = incomePerSec+wagesPerSec.
- QA hooks under window.eggfarmQa (dev + build:qa only; release check forbids). empty_credited counts only while Coop Hand hired (ST-AC20 swap flag computable).
- M5.0 total ≈29.5–37 dd (32–40 with Pause), ≈13–15 working days on 4 engineers, QA ≈11 d.

## 2026-10-24 16:52 — HoE: event RNG (Broody Q4)
- evRngState seeded on first tick golden OR broody flag on; only golden advances it; brRng derived (unsaved) from evRngState, used only by Broody. Golden draws invariant to broody flag (new AC).

## 2026-10-24 17:05 — HoE: sales-stopped testability (HoQA)
- m4.flags.salesStopped gates chip + Rules 2–4; off = patch1 baseline (SS-21). Lane selector injectable (SS-14). Pinned pairs deduped by (role,cause). eggfarmQa.set.{basket,queue,coopEggs,coins,manageCdS}. Tap coins integer bp: floor((cents*bp+5000)/10000). Chip/banner taps stopPropagation (no Collect leak) — also checked in patch1.

## 2026-10-24 17:10 — HoE: M5 money math
- All M5 money (tap coins, Broody, golden cash/eggs-cash) in integer bp: floor((cents*bp+5000)/10000); BigInt when product > MAX_SAFE_INTEGER; no float round_half_up in money paths.
- 17:13 Golden reward math: baseScaled in 1/100¢ (Math.round(E×P¢×100)), single floor at payout ((x+500000)/1e6), BigInt guard on full product. BigInt switch for 10000 bp = 9.0e11¢/s ($9.0e9/s; corrected).
- 17:18 I_ss warm-up rounding: refCents = Math.round(I_ss×100) on the game's float I_ss; tests use same expression (ST-AC2b).

- 2026-10-24 21:58 (Budapest) · HoE H-1 (paper only, no code until Vadim go): APPROVE telemetry allowlist session_end.golden_frozen_s (focus-clock sim seconds summed while goldenFrozen() true, emitted rounded to 0.1 s), worker_paused.golden_on_screen and worker_paused.frenzy_active (bools sampled from pre-pause state on the pause tick). No PII; lands in telemetry v0.6.2 schema with the rest of M5.0. Design: one pure goldenFrozen(state) in the sim layer (true iff Pause flag on and any hired worker paused), imported by the build tick and the G5-P driver alike; a parity test asserts identical results on seeds 1-200. Sizing ~0.25 dd, inside the Pause 3.0-3.5 dd estimate. Specs: golden errata rev.4 569f26ff, pause errata rev.3 d4ab134c.
- 2026-10-24 22:01 (Budapest) · HoE H-1 amendment (HoQA, D-HOP-41): goldenFrozen() and the pacing-x1-stack driver use D-HOP-41 tick order: Pause/Resume toggles first, then freeze state, then player input (NOT the Econ scratch runner m5g5p-gp.ts end-of-tick order, which is one tick late). Parity test on seeds 1-200 asserts that order; PGT-26/36 cover the toggle-tick boundary in the build. Pause merge gated on pacing-x1-stack green on the PR final SHA. Paper only until Vadim go.
- 2026-10-24 23:12 (Budapest) · HoE M5.1 Workers buildability (paper only, no code until Vadim go; D-HOP-2026-10-24-45 gate "HoE buildable"). Verified sha1: failure-cost v0.3.1 f206d0313dcf9425d6f56b8e3ee5026ec23412c1, lighter-refill v0.4 5acbe08dd8f83e03218dc219402d620849e33279 (both match). Checked against code 30b29d3 (tick.ts, workers.ts, game.ts, telemetry.ts, save.ts, engineering/golden/*).
  - Failure-cost v0.3.1: BUILDABLE, 2.5–3.0 dd (sim rule in workerActions behind m4.flags.clockWage incl. R9 reserve counting asleep payers 0.5; session counters + schema 0.25; caption/toast/welcome-back window/yawn tip 0.75; AC-FC13 label on the shared guard predicate 0.25; B-1..B-4 CSS + aria 0.25; tests/goldens/AC-FC14 harness 0.5). Depends on #8 rc2 Refill (charges not built) and the M5.0 m4.flags + schema.ts plumbing. Text fixes: AC-FC13 format must follow D-HOP-45 addendum 23:12 (m:ss everywhere); AC-FC15 is testable on the SimEvent sink (telemetry aggregates wage into worker_summary); asleep_s scope to define (MH+CH worker-seconds).
  - Lighter-refill v0.4: BUILDABLE, 2.0–2.5 dd on top of rc2 3–4.5 dd. Open non-eng: AC-LR11 FAIL (Econ), AC-LR17 placement (Art). AC-LR2/LR13 guard = charges >= 1 once rc2 ships (no cooldown term).
  - ~~SUPERSEDED by D-HOE-20261030-20 G-1 (13:45 correction) and D-HOE-20261030-25 for load defaults; the sim-clock timer rule still holds~~ Ruling (3) Refill cooldown/charge timers offline: stored as remaining integer ms in sim state, decremented only by step() (sim clock, never wall clock or absolute timestamps). Frozen offline and on hidden >= offlineMinSeconds (provisional sim dropped, reverts to hide snapshot); hidden < 60 s simulated live; visible frame gap uses the existing 60 s rule; no catch-up. On load clamp cooldown to [0, cooldown_ms], charges to integer [0, charge_cap], regen progress to [0, charge_regen_ms); NaN/absent -> 0 (charges absent -> start_charges per rc2 dec 2). Clock tamper is a no-op (no wall time read). Optional fields, no SAVE_VERSION bump. Unlike M4 ability cooldowns, these do not tick offline. 60 s threshold to economy.csv per D-HOP-45 23:10 (sync maps to offline.offlineMinSeconds/hiddenSimMaxSeconds).
  - Ruling (4): rc2 v1.2 decision 6 (product/workers/rc2-refill-proposal.md) retires the Manage cooldown when rc2 ships in M5.1 (#8). HoE keeps no shared cooldown in the rc2 path: AC-FC13 t = next-charge remaining when charges = 0, else Refill enabled. manageCdS/manage_cooldown_s remain only for the pre-rc2 / rc2-flag-off path, then removed from data.
  - FC-G11 allowlist: wage.state enum working|tired|asleep (flag-on only; telemetry sums worker_summary wage_<worker>_asleep_cents); session_end.wage_paid_asleep_cents int cents; session_end.asleep_s number 0.1 s; tip_shown{id:"clock_wage"} enum id, pinned, once per save. No PII. M5.1 additions to the v0.6.2 schema (not v0.6.2 fields); asleep_s shared with lighter-refill, emitted if clockWage or autoRefill on.
  - m4.flags.clockWage: flag-off parity feasible if wage events gain `state` only when the flag is on and no new GameState/save fields are written flag-off; tested by engineering/golden/flagoff-golden.a01faea.test.ts (f90d1678, m4.enabled forced 0) and m4on-golden.90a9c84.test.ts (a54c9cf9) run with clockWage 0, plus storage pins, unchanged hashes required (or the M5.0 re-pinned values if M5.0 moves them).
- 2026-10-24 23:30 (Budapest) · HoE M5.1 Workers rulings, follow-up (paper only, no code until Vadim go). Docs re-verified sha1: failure-cost v0.3.5 acbdc2be5f51a4b765f722d03c4301842c615861, lighter-refill v0.7 b5f164d49463ea5e55078a76667fdc7e65be7130 (both match).
  - Flag `m4.flags.rc2Refill` CONFIRMED (balance.json, default 0, requires m4.enabled; fitM4 preserves m4.flags per D-C1). It gates all of rc2 v1.2 Refill (charges, Shift sheet, per-worker Refill) including retiring the 30 s Manage cooldown (rc2 v1.2 decision 6). `m4.flags.clockWage` stays a separate flag; clockWage's AC-FC13 countdown and autoRefill need rc2Refill = 1 (AC-FC16, AC-LR19).
  - Legacy save field `manageCdS` (GameState, src/sim/state.ts; added by the v4→v5 migration, save.ts:82 on rc/v5 65a7443) with rc2Refill ON: not read, not ticked, preserved verbatim on write-back, no SAVE_VERSION bump, so flag-off rollback stays save-compatible. Removed by a migration only when rc2 ships and the flag is retired. Build note: today step() decrements it unconditionally (tick.ts:55 on rc/v5 65a7443), so the rc2Refill-on path must skip that decrement.
  - economy.csv validation: scripts/sync-economy.ts (run with --check by npm test/build/build:html via sync-economy-cli.ts) rejects `charge_regen_s` >= 600 (must also be constant > 0) and fails the build (AC-FC17). validateBalance mirrors the rule on load.
  - Telemetry allowlist additions (M5.1, session_end, no PII), emitted only with `m4.flags.autoRefill` on: `refills_manual` int count; `refills_auto` int count; `charge_starved_s` sim seconds at 0 charges, rounded 0.1 s, excluding offline and frozen hidden (>= 60 s). NOTE for PMW/HoQA: lighter-refill v0.7 §6 LR-G3 defines charge-starved as "refillable workers > charges available", not "0 charges"; reconcile to one definition before build (AC-LR10 depends on it).
  - At build: HoE pins the rc2Refill = 1 flag-on sim trace hash (AC-FC16(c)); it is also AC-LR7's baseline. Recorded here and in the PR body.

- 2026-10-24 23:32 CEST HoE correction: charge_starved_s adopts lighter-refill v0.7 §6 LR-G3 definition (sim seconds while refillable workers > charges available, 0.1 s, flag-on only, excludes offline/frozen hidden); supersedes "at 0 charges" above. AC-LR10 tests against LR-G3.

- 2026-10-24 23:44 CEST HoE (PMC Q-COL-9/12, breeds M5.1 rev3.6 sha1 3725d8ba, paper only): APPROVED allowlist session_end.present_active_s (focus-clock sim s, 0.1 s rounding) and session_end.present_lost_count (int); required when breeds flag on (0 if no Present slotted), absent flag-off; no PII. CONFIRMED credited-tap detection (streak-counted, max 1/s) runs whenever breeds is on, independent of streak feature state: one pure sim-layer detector, counted-tap timestamps as integer focus-clock ms in a bounded ring (>=6 entries), state exists only flag-on (flag-off goldens unchanged), cleared on load/offline/hidden>=60 s snapshot restore; Present gate = paused while >=6 counted taps in trailing 10000 ms; boundary unit tests at 5/6 taps and the 10000 ms edge.

- 2026-10-25 02:55 CET HoE (PMC Q-ZG-E1, zero-gain UI 62f0210c, D-HOP-2026-10-25-08, paper only): m5.flags.zeroGainUi confirmed (default 0, requires m4.enabled and bestBuyV2); m5.zeroGain.confirm is a balance.json tunable, or an optional save setting if player-facing. Telemetry hook in the UI purchase handler via the telemetry layer, not sim/actions.ts or the sim event stream; optional zero_gain bool flag-on; new zero_gain_confirm{upgrade_id,outcome}; AC7 and goldens unchanged. Reuse of the single-step income fn approved: pure/read-only, capacity delta from the same balance data, parity vs BB/BBv2 over seeds 1-200, gain<=0 by big-number compare.

- 2026-10-25 02:58 CET HoE (D-HOP-2026-10-25-09): zeroGainUi requires only m4.enabled (independent of BBv2). The star filter is UI-only: zero-gain candidates are dropped before the ui/goal-label bestBuyMark / DualPicker pick, so the star goes to the best positive row and there is none if every row is zero-gain. econ/best-buy.ts and the pacing bot stay untouched, so AC7/goldens are unchanged.

- 2026-10-25 03:02 CET HoE (Q-ZG-E2/E3, zero-gain spec v0.2 e8c4e706): ZG-AC20 has no big-number comparator, since at 30b29d3 economy values are plain JS numbers (integer cents). Zero-gain iff after <= before, both from the same single-step income fn on the same inputs, with no epsilon. Build adds a dev assert that the compared values are Number.isSafeInteger or finite <= 2^53. A real big-number type is a separate future decision. zero_gain_confirm.upgrade_id uses the sim UpgradeEvent enum (src/sim/events.ts): collection|hens|eggValue, plus farm if the picker offers it. The 02:55 and 02:58 confirmations are logged above (BBv2-independent flag, filter before the pick).

- 2026-10-25 03:19 CET HoE (Q-ZG-E4/E5, zero-gain v0.3 b367918c): Corrects 03:02. The comparison uses the unrounded $/s from the same single-step income fn, with no rounding to cents (any gain > 0 counts, D-HOP-09). The dev assert is Number.isFinite(x) && Math.abs(x) <= 2**53. M5.1 kickoff base: not pinned yet. It will be main HEAD after M5.0 merges, which includes the bb-stopgap (bestBuyMark(pick,s,b), SG-1/3/8), and HoE pins that SHA here at M5.1 kickoff. Current main d1fb206b has no stopgap and no M5 code (paper only until Vadim go).

- 2026-10-25 03:21 CET HoE (Q-ZG-Q3): ACCEPTED as an engineering kickoff task (on Vadim go, not before). Port the Econ scratch PROFS map plus bot loop (scratch/v2-econ/h/m5.ts / m5x.ts, exact file sha from Econ) to tests/bot-m5.ts next to bot-m4.ts. Owner Features 95daf662, HoE accountable, ~0.5 dd. Profile named m5x-casual to keep it distinct from pacing-acw1 AC-W1 casual. Seeded/deterministic. Parity test against the Econ F27-29 outputs at the handed-over sha, using the build tick order (D-HOP-41); any delta from scratch end-of-tick order goes to Econ to re-baseline before ZG-AC7 cites numbers.
- 2026-10-25 03:52 CET (Budapest) · HoE M5.1 kickoff items (D-CEO-20261025-02, product/m5.1-kickoff-package.md; paper only, no code until Vadim go). Specs verified on disk: lighter-refill v0.8.6 1e414854ceb6ca7c41d14c0c1bee22aba629a88c, failure-cost v0.3.11 5651632e612493f1fa9de2f6a88bef466f688bd3, breeds rev. 3.8.5 5dde4b62ddaf03570a732d628e9b78b72c627940, zero-gain v0.3.2 2254c92b4d6f0c3fb47ccb6c461a00405f6cc8e8 (all match the package).
  - (1)(2) Pinned at build. They cannot exist yet: origin/main = d1fb206b8f59a1a1f19623526fdbf3003d12efce (merge of PR #70, M4.1 patch 1); no M5 merge or M5 branch on origin. The M5.0-merged main SHA and the m4.flags.rc2Refill flag-on trace hash (AC-FC16(c) = AC-LR7 baseline) are recorded here and in the PR body when they exist.
  - (3) worker_state unpaid: at 30b29d3 it is pushed to the sim event Sink in src/sim/tick.ts workerActions(), wage step, line 80 (wage > coinsCents -> unpaid:true, no charge, no action); Game.emit (src/game.ts:113) forwards it to telemetry via track(). Asleep workers exit at tick.ts:73 (isOff -> continue). Flag-on (m4.flags.clockWage): an Asleep MH/CH skips that early exit, ticks cdS on the every_s schedule and goes through the SAME wage step, so a short wage takes the same line-79/80 path and emits the same SimEvent (no second emit site, no telemetry-only emit); it then skips the action. Toasts key off the energy-to-0 onset, never worker_state (AC-FC9: no toast on Asleep<->Unpaid). Flag-off: the branch is never reached, the event stream and state are unchanged, goldens f90d1678 / a54c9cf9 hold; the flag-on trace is re-pinned at build.
  - (4) Reserve counting (R9 auto-resume, tick.ts:62, today `!w.unpaid && w.energy > 0`). Open question (Econ shipping re-run §3.1): do Asleep wage-drawers count in the reserve? Ruling: with clockWage on, the reserve counts every hired MH/CH that is drawing a wage = not Unpaid and not Paused, whatever its energy (Asleep included). Unpaid workers are the resume candidates (added one by one as today); Paused is wage-free (D-HOP-45) and excluded. Flag-off keeps today's expression byte for byte. Rationale: the reserve is 1 min of wage for everyone being paid (R9), and FC-R1 makes Asleep paid; otherwise a resumed worker is re-flipped by another worker's wage within the minute. The rule can only reduce flips, so the FC-R4 / AC-FC15 bounds (<= 12 per 30 min trickle; neglect P95 0, max <= 1) still hold; Econ re-confirms toggle counts on the flag-on trace at build.
  - (5) BR-AC31e hook. The Present modifier does NOT plug into any income function: BR-BB2 / BR-AC21 keep incomePerSec breed-free (breeds spec §4.6, L388/L428/L430). The single shared single-step income fn stays incomePerSec, src/econ/income.ts:72 (the zero-gain spec's :62-65 and breeds' :95 cite RC1 5d9efa6; at 30b29d3 secondsToAffordSteady is :110). The BR-AC31e hook is a debug-only seam on the two ETAs, not on incomePerSec: `debugIncomeOverride({ defaultCentsPerSec?, assumeWorkingCentsPerSec? })`, integer cents/s, read only by secondsToAffordSteady (default income) and the planner's assumeWorking time-to-afford through one helper. Set from the ?debug=1 panel chunk (src/debug/panel.ts) or test import; never read by incomePerSec / optionGain / bestBuy / zero-gain; absent from release (check-release-build.mjs asserts it). With integer needCents / integer cents/s, a fixture with needCents = 90 x centsPerSec gives exactly 90.0 s (boundary divides exactly; 85 / 95 / 90.1 cases are off-boundary).
  - (6) K10 = known limit in the package: breeds B4 offset margin 0.04 pp (g1max under R6 63.58% vs no-breeds 63.62%, D-HOP-2026-10-25-02); any change adding active coins at F20-29 must re-run the D-HOP-47 offset test. CI step: job `k10-breeds-offset` in .github/workflows/ci.yml, npm script `test:k10` (slow vitest config, seeds 1-200, Econ-owned harness ported next to tests/bot-m5.ts). Mechanical trigger (scripts/k10-trigger.mjs): diff touches tc_* / bc_* columns in data/economy.csv or the streak / tap-coins / Broody / golden / breeds sim code; otherwise the job passes as a no-op so the status check always reports. Fails if the breeds premium exceeds the no-breeds premium. Non-required until Vadim's go, like pacing-x1-stack; making it required is a later branch-protection change, not done by HoE now. Note: tests/bot-m5.ts does not exist at 30b29d3 (m5x-casual port is the kickoff task, Features 95daf662, on go).
  - (C1) Q-ZG-C1 held-Enter: no rate limit; one press = one action. Strip buttons act on native click only and ignore keydowns with event.repeat === true. The shipped PL-1 guard (src/ui/app.ts:291-295, document keydown: Enter/Space with e.repeat on a button -> preventDefault) already covers this; the strip adds no own key activation, and any strip keydown handler returns early on e.repeat. No ancestor may stopPropagation before the document listener (or register the guard in capture). Test: synthetic keydown Enter/Space repeat:true on Buy/Confirm -> 0 purchases; CDP held Enter 2 s -> exactly 1 action; device QA per UI-ZG-18 (UI v1.3 d2fbd927).

- 2026-10-27 20:46 CET D-HoE: VER-1 standard verify command approved to build under D-CEO-20261027-02. Tooling only (scripts/, package.json, CI); no src/sim/economy/save diff; CI on ready-for-review + dispatch only; owner Architect 205f4268; DoD engineering/tasks/verify-cmd/HANDOFF.md.

## 2026-10-27 D-HOE-20261027-VER1a
Merged PR #72 despite CCR F1 (Major) because the default and CI path is correct and F1 only shows up with a non-default --flags. F1, N1 and N2 go to follow-up VER-1b (Architect), tooling only.

## 2026-10-28 D-HOE-20261028-01
Applied D-CEO-20261028-02 to Engineering from PR #76 on. PRs that fix only Minor findings or Nits merge on the engineer's self-review (in the PR body and engineering/reviews/) plus green CI. Any Blocker, Critical or Major finding still needs a CCR re-review.

## 2026-10-28 07:52 CET ADR VER-1 Standard verify command `npm run verify` (PRs #71-#76; D-CEO-20261027-02; recorded by Senior Software Architect)
- **Command.** `npm run verify -- --hours N [--seed S] [--profile idle|m5x-casual] [--flags k=v,...] [--out dir]` (`vite-node scripts/verify.ts`, helpers in `scripts/verify/`: `cli.ts` args/sanitise, `sim.ts` run, `golden.ts`, `roundtrip.ts`, `shot.mjs`). `--hours` must be in (0, 720]. Defaults: seed 1, profile `idle`, flags from `src/config/balance.json`, out `verify-out/<buildId>/` (git-ignored). User doc: `scripts/README.md`. Approved as studio tooling only under D-CEO-20261027-02 (outside the game-code freeze); PRs #71 (VER-1), #72 (1a), #73 (1b), #74 (1c), #75 (1d), #76 (1e).
- **Boundary.** Tooling only. It reads `src/` (config/balance, sim, save `save()`/`validate()`) and `tests/` bots (`bot-m4.ts`, `bot.ts`) and never changes them. It writes only `dist-html/` (via `build:html`), `<out>/verify.json` + `verify.png`, and a temp `verify-*` dir for the browser save. No src/, sim, economy or save diff was part of VER-1.
- **Steps.** (1) `npm run build:html` from HEAD (dirty tree: the same steps minus `check-release-build`, recorded in `asset.build`); (2) N hours of seeded play through the real fixed-step sim (`src/sim/tick.ts` `advance()` then input, build order), headless, no wall clock; profile `idle` = AC7 workers bot (`tests/bot-m2.ts` `runM2` seller15), `m5x-casual` exits 2 ("needs tests/bot-m5.ts (M5.1, on Vadim go)"); (3) `verify.json`; (4) end state saved marked like a fresh M4 farm (`tracksV7: 1`, fixed `v6BackupId` `7e51f1ed00000001`, saved state only, so the trace is unchanged), loaded into the built html in headless Chromium with a paused clock and fixed steps, Settings build label shot as a 390x844 `verify.png`.
- **Reference.** Determinism proof is `verify.json`: same SHA, seed and flags give byte-identical JSON (no timestamps, durations or absolute paths). Both GOLDEN1 hashes are recomputed on the shipped balance every run and enforced: flagOff `f90d1678` always, m4On `a54c9cf9` unless `--flags` changes a shipped flag (`scripts/verify/golden.ts`). The run's AC7 trace hash is **reported but not enforced**: it is written to `trace.sha256` and no check compares it with a pinned value. The 24 h seed-1 value `2c0d3ec37be16e6e20460581f84bc8ade30049680d50d701085bd288e268883d` is the reference cited in reviews #71-#76; pinning it in verify-smoke is VER-1g (parked). (Corrected 2026-10-28 08:10 CET, Architect: wording made explicit.)
- **Exit codes.** 0 PASS; 1 a check failed (build id, non-finite/negative values, golden, build label, `no-private-data`) or an uncaught throw, or a run that would pass but whose report can't be written; 2 usage (incl. repeated `--flags` or a duplicate key, #74) or unavailable profile; 3 build failed or html missing; 4 the saved end state doesn't `validate()` back to the end state under the **shipped** balance (migrated, F/H/V/C, tier, workers or coins differ) or `--flags` changes a shipped flag (#72, #73); no browser step, no PNG. **4 wins over 1**; `checks[]` still lists every failure.
- **`verify.json` schemaVersion 4** (#74): `complete: true` = full report; `complete: false` = early-exit FAIL report `{schemaVersion, tool, complete, result: "FAIL", exit, stage: usage|build|run, reason, sha, screenshot: {file: null}}`, never PASS, never names a PNG.
- **No stale output** (#74): `verify.json`/`verify.png` are removed from the out dir before anything can fail; every early exit (2, 3, throw) writes the FAIL report. Without `--out`, the HEAD build-id dir is cleared first (FAIL json only if it exists), then the html's own dir; a non-plain html build id maps to `verify-out/invalid-build-id/` (#76).
- **Guarded writers** (#75, #76): a failing FAIL-report write or full-report write is caught and logged as one sanitised stderr line; the original exit code (2, 3, 4) or crash error is kept; a would-be PASS without a report exits 1.
- **Test-only hooks:** `VERIFY_OUT_ROOT=<dir>` (parent of default out dirs, so tests never write into the worktree; #75) and `VERIFY_TEST_THROW=1|after-shot` (forced crash before the run / after the browser step, always exit 1; #74, #75); also `VERIFY_TEST_SKIP_MARKER=1`, `VERIFY_HTML=<file>`, `--skip-build`, `--no-shot`. Not for QA evidence.
- **CI.** `.github/workflows/verify-smoke.yml` runs `--hours 1` on the PR head only on `pull_request: ready_for_review` (job also guarded on that action) or `workflow_dispatch`; never on push/opened/synchronize; uploads `verify-out` (14 days). Not a required check until HoE flips it.
- **No secrets.** Repo is public: `verify.json` is sanitised (repo `.`, home `~`, user/host) and the `no-private-data` check fails the run if anything token-, e-mail- or home-path-like remains; stderr path lines are sanitised the same way (#76).
- Consequences: PRs attach `verify.json`/`verify.png`; QA, CCR and UI QA cite it. Re-pinning a golden needs HoE OK (golden test headers). Review rule since #76: D-CEO-20261028-02 (D-HOE-20261028-01 above).

## 2026-10-28 D-HOE-20261028-02: parked PR revive-or-kill (PARK-RK-1)
Accepted the Architect's sheet (parked-revive-or-kill-2026-10-31.md). KILL #45 (superseded by #52; targets the removed unit job) and #51 (its harness is on main via #71). KEEP PARKED, closed with branches kept: #50 and #52 until Vadim's M4.2 go (re-cut #52 as small PRs if revived), and #57 until after M5.0 ships (economy.csv is frozen until then). The re-check date for all three is that trigger, not a calendar date. No GitHub branch deletes. #68 N1 is already on main (bb9c2de) and comes off the parked list. Doc drift: fix the ADRs and the stack doc to match the code (docs only). Adding ESLint/Prettier config and pinning the 24 h trace in CI are code/CI changes, parked as LINT-1 and VER-1g until code PRs reopen.

## 2026-10-28 08:10 CET Corrections to ADR M4-3 and ADR M4-7 (HoE ruling relayed 2026-10-28; recorded by Senior Software Architect)
Both ADRs are from 2026-10-16 19:45 / 19:29. They appear in the repo copy `engineering/decisions.md` at 22eac98, not in this file. The repo copy is unchanged (docs-only ruling, no repo changes), so it still shows the original text until it is next synced.
- **ADR M4-3 corrected.** Original text: "Migrations live in `save/migrations/`, take `balance`, and are pure; `econ/` is pure read-only derived economics that `sim/` never imports." Correction: no `save/migrations/` dir exists at 22eac98. The v7 migration is `src/sim/migrate-v7.ts`, and the load-time migrate path is in `src/save/save.ts`. The rest of the ADR stands: migrations take `balance` and are pure, and `sim/` never imports `econ/`.
- **ADR M4-7 corrected.** Original text: "CI runs locally via scripts/gate-all.sh. No hosted Actions minutes without CEO approval." Correction: CI is the GitHub Actions `gate` job in `.github/workflows/ci.yml` (CI diet, D-CEO-20261024-02, PR #68). It runs on push to main and on non-draft PRs; the Firefox/WebKit `release-globals` matrix runs only on main or `rc/*`. `scripts/gate-all.sh` is not on main.
- Also recorded today: the ADR VER-1 trace-hash wording (above) now says "reported but not enforced".

## D-HOE-20261029-01 (08:21 CET): rule 19 artifacts branch (D-CEO-20261028-04/-06)
- Orphan branch `artifacts` pushed at fcd65b0b1e6e5726f022fb7c3544151d8390c0eb: m51-o1a (MANIFEST a840b84d…) and m52-o1a (MANIFEST 94e19f2d…); both manifests verified with sha256sum -c before commit. The twelve m52 pr.*.jsonl files (~6.8 MB each, over 5 MB) are stored gzip -9n with MANIFEST.gz.sha256; gunzip output matches the original manifest. Scanned for tokens/emails/names/home paths: none.
- CI skip needs no workflow change: ci.yml pushes trigger on main only; verify-smoke/release-asset run only on PR, release or dispatch. Verified: 0 runs and 0 PRs for the branch after push. Never open a PR from it.

## D-HOE-20261029-02 (19:45 CET): v5 build kickoff under D-CEO-20261029-01
- One RC branch `rc/v5` cut from main 22eac98; the Architect owns integration and v5-rc-manifest.md (piece, PR, SHA, flag state). All pieces go into rc/v5 as Draft PRs behind m4.flags.* (default 0), in m5.0-sizing.md §3 order.
- Lanes: the Architect takes F1/F3/#1 sim/#3/#5 sim and pacing-x1-stack CI. Saves takes F2, the hidden/offline wiring, fixtures, #2 sim, the telemetry subset and the Pause sim. UI takes p2 (m4.1-p2-scope.md) and then the M5.0 UI. Features takes bot-m5.ts port + parity FIRST (it unblocks HoQA's o1a check), then F5/G5-P, #4, the full telemetry v0.6.2 (folded in from M5.0.1) and the Pause UI.
- Cut rules per the CEO: Pause is built last and cut first; BBv2 ships flag-off; farm_cost r27-29 are reverted if their gates fail; two gate failures means the piece is cut and the CEO and HoQA are told the same turn.
- Open: HoP is to supply the paths for M5.1 package 0ceb56e7 and p2 d32b73fc (no box file matches those hashes).

## D-HOE-20261029-03 (19:48 CET): v5 scope pins (with HoP's D-HOP-2026-10-29-01)
- p2: re-pinned to engineering/m4.1-p2-scope.md sha1 f0524447e8a5710a662fa78910647e83122d3256, the Oct 25 frozen scope as last amended at 06:17 CET (P2a + P2b in scope). The d32b73fc text is not on disk, and nothing in the file is newer than Oct 25. The doc's standalone merge/tag/Latest line is superseded: p2 gates and ships in the single v5 RC.
- M5.1: product/m5.1-kickoff-package.md sha1 5107f8c6…; lighter refill from product/workers/m5.1-lighter-refill-proposal.08d12ac7.md. The one mismatch is the lighter refill: the live file ddbb5ee9 only adds an o1a addendum; build from the frozen .08d12ac7.md copy. The other 5 specs match their pins.
- M5.1 CSV: Econ's single PR, farm_cost r27/28/29 = 160,000 / 175,000 / 190,000 (reverted if its gates fail).

## D-HOE-20261029-04 (19:52 CET): what the "o1a on QA's TS bot" gate means, and who owns the M5.1 src
- The o1a references were made by m5l/m5lx and m5p/m5px on a scratch src snapshot with the Refill and wage-clock rules, not by m5.ts/m5x.ts. A plain port can't reproduce them.
- Plan: (A) tests/bot-m5.ts m5x-casual, with exact parity against m5x.ts. (B) Port the m5p/m5px profiles too. The Architect owns the M5.1 src piece: rc2Refill and clockWage from lighter-refill 08d12ac7, behind flags. The gate is bot-m5 on rc/v5 with the flags on, o1a a8c4e268, seeds 1-200, an exact match to §10 of 43ecbda1, with results in artifacts/m5-o1a-ts/results/. A mismatch counts as a gate fail.
- Econ is to say which of the scratch src diffs are spec and which were measurement-only. HoQA is to confirm this gate definition.
- 19:56 amendment, after HoQA: the gate is judged on the spec bars from bot-m5's own output (LR v0.8.8 AC-LR10/11, failure-cost v0.3.14 393e69f6, pressure v0.3.1 9c58e58c: PM1 at least +6 pp, PM2 at least 1.25, PM3 P5 at least 20%; optimal/seller15/casual). Also TG-LR10-G at or below 1.02, M5.2 against m52-o1a §10.3 seed sets (pause=false, waive0=false), and flag-off 2x plus goldens on the same SHA. Parity with 43ecbda1 §10 is a target; a mismatch is a finding, not an automatic fail. A failing bar fails the gate.

## D-HOE-20261029-05 (20:00 CET): v5 order, flags and interim owners (answering the Architect)
- Order: bot-m5 and p2 first, in parallel. The Econ CSV PR (8dc90e2b + r27-29) as early as possible. M5.1 src after F1/F3. Full telemetry after F2. #5c with #5. Pause last, before the F5 and RC gates.
- Flags: p2 is exempt (CSS/a11y on live UI, goldens plus Art gate it). #5c is exempt (follows m4.enabled per spec). All release flags live in one namespace, m4.flags.* (zeroGainUi and bestBuyV2 included, deviation noted in the PRs). BBv2 defaults to 0.
- Interim owners while Features is stopped: UI takes zero-gain UI and BBv2. Saves takes breeds and k10-breeds-offset. The Architect takes #5c. I rebalance when Features resumes.
- X1 is wired without the G5-P pause rows until Features delivers them. Econ supplies §13.2a in machine-readable form.
- 20:04 amendment: Saves takes the breeds sim/save and k10 only (option a). Breeds UI waits for Features. If it misses the RC, I'll propose to the CEO that breeds ships flag-off or moves to 5.1. 8dc90e2b = economy.m50-draft.csv (scratch/v2-econ, product/farm/scratch/e10). It's the M5.0 G3 CSV and must land on rc/v5 through Econ/HoP's CSV PR.
- 20:08 amendment: X1 enforces §13.2a of record sha256 1cf6da7c (D-HOP-30). The newer economy.md text c0d9492b only counts if HoP re-records it. U1/U2 are built as in the scratch, pending HoP errata, which must be recorded before the RC gate. Econ's DO-NOT-PORT items are excluded. If Econ can't confirm the inferred pool2 cwd, the pool runs count as parity findings, not passes.
- 20:10 amendment: HoP ruled under D-HOP-2026-10-29-02. U1/U2 are adopted exactly as the scratch has them, behind clockWage, and are no longer pending. X1 stays on §13.2a 1cf6da7c, and Econ confirms c0d9492b's rows are identical. The M5.1 package is re-pinned to sha1 46562507a1b0d17c0e9eb3c17e8685b976a50d0c, with lighter refill pointing to the .08d12ac7.md copy.
- 20:14 correction: the claim that the §13.2a rows are identical doesn't hold. 1cf6da7c is a whole-file hash of economy.md and no copy of it exists on the box. The Architect's diff (artifacts/x1-13.2a-diff/results/diff.md, 2166fca1) shows differences on G5-P, the G4 rows and row (f). HoP owns the re-record and the (f) ruling. X1 has no table of record until then, which adds a blocker but no schedule change.
- 20:17 amendment: under D-HOP-2026-10-29-03, X1 enforces §13.2a from economy.md c0d9492b (sha256 8137205c…). Row (f) is one band: mean ≤ +1.0%, at most one point in (+2.0, +2.5], all others ≤ +2.0%. Econ's pred CSV/JSON is used as-is. The X1 blocker for §13.2a is cleared.
- 20:20 amendment: U2-e is added to clockWage scope (Architect), under D-HOP-2026-10-29-04 addendum 20:18. worker_state:'unpaid' fires exactly once on every Unpaid flip, including the Asleep branch, with a unit test, and it is excluded from any parity event hash. HoE commits QA results folders under 5 MB (v5-rc-saves, v5-rc-ui, m5-o1a-ts) to the artifacts branch after QA marks each final, with sha256sum -c and a no-secrets scan first, as in D-HOE-20261029-01.
- 20:47: bot-m5 port A parity PASS, byte-identical (PR #78, head 0951aefa). Ruling: v5 pieces go Ready and squash-merge into rc/v5 once CI is green and CCR finds no B/C/M issues. The gate runs once on the assembled RC SHA, and stacked PRs rebase onto rc/v5.
- 20:50: owners for UI-QA seams. Q4 (observe hook in bot-m4/m5, AC7 byte-identical) and Q8 (flag/tunable paths plus row 34 ship values) go to the Architect. Q3 (p2 SHAs in row 3) and Q9 (stall.force through the real chip, plus the pause seam check) go to UI. Q10 is a required item in the #5b PR body; owner Features is stopped, so it's at risk. Q11: Breeds UI is not in rc/v5. Seams are dev/build:qa only, and check-release must reject eggfarmQa.
- 20:48: #5b is reassigned from Features (stopped) to UI e80556fd, placed after #5 Broody UI, and the Architect reviews the Rule 2 share function. The PR body must name the function and its ≤0 guard for SS-15. Normal cut rules apply.
- 20:52: The Rule 2 chip gets its own flag, m4.flags.fatigueCue (default 0, gated with salesStopped). fatigueShare(s,b) stays as the shared pure function, and Rule 4 ships per D-HOP-05. F3 (Architect) adds an isPaused(w,b) gate: income.ts read paused raw with no flag check, and that's now fixed with a unit test.
- 21:12: #81 F2 is merged, and rc/v5 is now 406e4558efc645cbdd5e57fcadb321d8ad61b810. Row-34 ship values: every in-scope v5 flag is 1, bestBuyV2 is 0, and breeds is 0 unless Breeds UI lands. A cut piece goes to 0 and is logged the same turn. HoP rules on Q-F1b-1, Q-F1c-1 and Q-F1c-2 before the RC gate, and until then the defaults are marked pending. A release-globals skip on feature PRs into rc/v5 is expected (ci.yml L62).
- 21:15: HoP ruled under D-HOP-2026-10-29-06. evRng is seeded at the end of the first flag-on tick. The Market sheet is a play surface: it's excluded from dialogOpen() and suspended only when the attended probe is false. Sweep is excluded from golden E. Pending marks are cleared, and merging rc/v5 into stacked PRs (no rebase or force-push) is approved.
- 21:35: #78 bot-m5 A is merged, and rc/v5 is now d3b5a536cc7b049ab701e33756e502f15bfe14b7 (CCR PASS 0/0/0). CCR O-3 (bot-m5 duplicating M5 mechanics in a flags-on run) is owned by the Architect: B adds a switch that fails loudly if both are active, and it's required before any flags-on gate run.
- 21:48: box load cap for engineering, so UI QA's browser lane can run below load 12 on 8 cores. At most 2 heavy sims at a time across all engineering (nice 10), plus 1 vitest (--maxWorkers=2), queued serially. Breeds UI is not in rc/v5 (reconfirmed to HoQA).

### 2026-10-29 22:32 CET: HoE adopts QA-D-1029-V5SCAP (AC-traced unit tests) as part of the engineering done-definition
- Every M5.0/M5.1 PR into rc/v5 ships unit tests named or tagged by AC id (SS-n, AC-FC/LR/PM, T-AC, BH-AC and so on), plus a trace table in the PR body (AC id → test file::name).
- Saves QA (33ec1b55) reviews the trace table before merge and re-runs it on the RC. I don't merge a PR that has no trace table, or whose table Saves QA hasn't checked.
- Foundations #77/#79/#80/#82: CCR PASS at 008bcca/6ece3e0/1a64e95/ecf8297 with 0 B/C/M, so no re-review. The Architect adds trace tables to those PR bodies, then I merge them in order #77→#79→#80→#82.
- CCR Minors, for the Architect's self-review:
  - #77: F2's session-only key list duplicates F1a's with no check. Add a test, or import M5_SESSION_FIELDS, so the two lists can't drift.
  - #80: the Sell-all preview doesn't match the credit when attended=false. Fix it, or add a guard test, before the effect registers.
- This applies to Architect, UI and Saves. Features is stopped; when they resume, the rule applies to their rows.

### 2026-10-29 22:45 CET: HoE merge-owner rulings after Saves QA returned #77/#79/#80/#82
- **Review basis for the post-review delta (restated 2026-10-30 08:38 per rule 22, D-CEO-20261030-01):** the delta past 008bcca/6ece3e0/1a64e95/ecf8297 merges on a rule 22 non-Claude review (Architect self-review), green CI and the Saves QA trace PASS. The earlier "manual CCR review" was no Claude review (0 calls) and is not cited as a pass. That holds only while the delta is limited to: the rc/v5 merge, the review Minors and nits, Saves QA's test gaps, AC tags and trace tables.
  - The Architect lists the delta commits in each PR body under "Post-CCR delta".
  - Any change to production code beyond those fixes, or any change to goldens or trace 2c0d3ec3, gets a fresh non-Claude review (HoE or Architect) on the final head before merge; a Claude review is optional and never a gate.
- **"Re-base" is a merge, not a force-push:** #80 and #82 merge their updated parent heads and rc/v5 in. #82 is retargeted to rc/v5 after #80 merges. History is never rewritten (standing rule).
- **QA gates each PR once,** on its final head. I merge only after Saves QA passes that head and CI is green on it. Order: #77→#79→#80→#82.

### 2026-10-29 22:51 CET: HoE adds QA selectors and hooks to the done-definition for the M5.0 UI PRs (rows 16-19, 21, 22, 32; HoQA ask)
- **(a) Stable `data-testid` selectors on:**
  - the frenzy pill and chip, the reward pop, the streak bar and pill, the coin pop
  - Activate-all, the call badge, Full! and the hens pill
- **(b) `window.eggfarmQa` hooks, build:qa only,** behind the same IOS_FLAG_ENABLED guard as #5b, and check-release must reject them:
  - tc.spawn/state, frenzy.start, streak.set, audio.log
  - broody.set/eligible, sheet.stepClose, fx.setMax
  - ability.state/set, menu.open/close, tapCoins.force/setRef
- Each PR body lists the selectors and hooks it adds. UI QA dry-runs each head as it lands.
- **Owners:**
  - UI e80556fd: rows 16, 17 and 22.
  - Architect: row 21, plus the check-release rejection test that covers every hook.
  - Features (stopped): rows 18, 19 and 32 pick this up when they resume.
- A row missing these isn't merged.

### 2026-10-29 22:54 CET: SG-12 qaPicker (bb-stopgap v1.2.2, sha1 d4c590ad, D-HOP-2026-10-29-08) goes to the Architect inside row 21 #5c
It is read-only, AC7 stays identical, and qaPicker is added to the check-release-build.mjs debug-globals list. It is sized as fitting before the RC gate.

### 2026-10-29 23:03 CET: Manifest spec pin updated (HoQA ask, verified by sha1)
- Zero-gain UI 1098f14e → cf21747e (v0.3.6, D-HOP-08 gap 8), in row 28 and the m4.zeroGain.confirm row.
- The manifest has no pins for the golden-egg spec (now 3793715b) or the streak spec (now acb4cdbb). PR bodies cite the current sha1s.

### 2026-10-29 23:07 CET: Spec re-pin, and the QA audio-log contract (PMC + HoQA)
- **Re-pins (sha1 verified):**
  - Manifest row 28 and the m4.zeroGain.confirm row: zero-gain v0.3.7 f86de04e0638e3019f81b1e829321c65ff8f4f98. v0.3.6 cf21747e is frozen.
  - Golden egg is now v1.3.2.2 910098bdc4b4a7906078c06510e06ac95757ee43. It isn't pinned in the manifest; UI PR bodies cite it.
- **QA audio-log contract (GE-AC24, golden §9.2):**
  - `eggfarmQa.audio.log` is build:qa only and holds one `{hook, file, tMs, semi}` entry per sound actually started.
  - `semi` is 0 by default and +2 only on Frenzy sells with by:'player', never market_hand.
  - The sell asset of record is sfx-sell-01..03 (feat/ui-audio-juice-v1). Until those land, sfx-sell-coin is the accepted stand-in. Don't rename it; note the mismatch in the PR body.
  - ACs check the hook and semi, not the filename.

### 2026-10-29 23:18 CET: HoE signs off on box load for 3 parallel UI QA browser lanes in the RC window (D-CEO-20261029-03, V5UCAP (a))
- **Measured at 23:16:** 8 cores, load 6.9. That was 2 bot-m5lx sims and 1 vitest (2 workers), all at nice 10, plus 1 Firefox QA lane with its harness.
- **Budget:** one browser lane plus its harness costs about 1.5–2 load. Three lanes is about 5–6, so engineering's normal 2 sims + 1 vitest (about 4) would put the box at about 10–11. That's too close to 12.
- **Sign-off is conditional.** From RC handoff until UI QA finishes:
  - Engineering runs at most 1 heavy sim at nice 10 and no full vitest suite; targeted vitest only, maxWorkers=1.
  - QA lanes take priority. If load averages above 11 over 5 min, engineering pauses its sim first (exact PID, SIGSTOP).
  - The RC is frozen, so engineering only needs fix-and-retest work in that window.
- **bb-stopgap pin:** v1.2.3, sha1 5e9fdfbf (heldMs = t − keySinceT). The Architect has it for #5c.

### 2026-10-29 23:20 CET: Art calls on p2 #83 @76390f2
- (b) scroller padding: OK.
- (c1) CHANGE: aria-label becomes "Upgrades, N available" (WCAG 2.5.3, visible text first). No DOM reorder.
- (c2) OK: keep the shake, and under prefers-reduced-motion use a static refused flash with no translate.
- (c3) accepted for v5 as a Minor; it is V51-UI-1 in engineering/v5.1-backlog.md.
- Art release sign-off still comes from the UI QA rule-19 set.

### 2026-10-30 07:42 CET HoE: post-restore pushes
- x1-13.2a was committed unchanged to origin/artifacts at 530956b57e16903262b0a45880885f8a05872b2d, with pins MANIFEST 0c085729, csv e4369888 and json 40cd8289.
- F3 feat/v5-f3-config was pushed at b0b5c7c (#82). Saves feat/saves-v5-streak-sim-2 was pushed at 5d2aa04 and opened as a Draft PR into rc/v5.
- rc/v5 is b563c75 (#77 squash-merged).

## 2026-10-30 07:50 CET HoE: #82 rulings (D-HOE-20261030-01/02)
- D-HOE-20261030-01 [F3-no-literal]: BROODY_NEST_MAX_CENTS=1e15 and BROODY_SLOTS=12 (src/save/m5-fields.ts) are save-schema bounds, not economy tunables. Allowlist them as named constants in the test (test-only change, no CCR delta). Saves cc'd.
- D-HOE-20261030-02 rest_recovery_mult guard: build to the spec. Pause spec §6 says 0 is valid, and AC-P17 tests the card text at 0. So relax 10d1e28 to `>= 0` (still rejects negative and non-finite values) with a merge-safe follow-up commit, plus a test for 0. This supersedes my earlier > 0 ruling.
- Rule 22 as amended (D-CEO-20261030-01, 07:40): Claude is never a gate. #82 and #83 merge on non-Claude review plus green checks; CCR runs afterwards as an optional extra, or is recorded as "no Claude review".
- D-HOE-20261030-03 (07:47 CET): the tests/bot-m5.test.ts windowGate harness-equivalence test pins its own fixture copy of the b48be8a4 CSV instead of reading data/economy.csv (option a; no re-pin to a8c4e268). Owner: Architect, test-only PR into rc/v5. This unblocks V5-HOP-1 head bb3f633.
- D-HOE-20261030-04 (07:57 CET): #79 squash-merged at 02e7ede, so rc/v5 is 2fa7318. Architect lane-harness findings: M1 (scripts/serve-own.mjs process.kill(-pid) without an identity check) and m7 (scripts/d2-kill-browser.mjs /proc walk + SIGKILL) are fixed in one small test-infra PR into rc/v5 after #82 and the bot-m5 fixture fix, before the RC cut, because rc0 and check-globals use serve-own. m6 (lane-kill.sh leftover-member check) goes to HoO as ops-tools owner.

## D-HOE-20261030-05 (2026-10-30 08:12 CET): tests pin balance data to fixtures, not shipped files
Tests that assert on specific balance values (bot-m5.test.ts csvBalance/csvRaw, tests/bot-m5-trace.slow.test.ts:11, tests/verify.test.ts:70-72) read a committed fixture under tests/fixtures/ with a sha256 assert, never the live data/economy.csv or shipped balance.json, so a retune can't break them. Only tests whose job is to check the shipped data (CSV->balance.json mapping, schema) read live files. bot-m5 change lands as its own commit after B's parity run; the trace/verify fixes go in a small follow-up PR after the RC cut unless a retune lands first. Owner: Architect. Context: PR #88 (ce88448).

## D-HOE-20261030-06 (2026-10-30 08:44 CET): #89 (M1/m7 test-infra) no longer blocks the RC cut
Amends -04. HoQA ruled (QA-D-1030-PR89) that N-M2 is covered for the RC by option (a), excluding serve-own.test.ts from local vitest, logged, with CI covering it. #89 at 58ad41b merges when UI QA passes it and CI is green on an rc/v5 merge head, before or after the cut. The firefox and webkit d2 smoke runs wait on HoO's rule-21 ruling about the d2 browser-group signal.

## D-HOE-20261030-07 (2026-10-30 09:14 CET): Basket stock owner for the streak sale path
v5 has no Basket sale path, so the #87 trace row for Basket stock is N/A for v5 (QA-D-1030-STAC7). Owner: Saves (3ba38cf3). Before any Basket sale path ships, Saves adds the streak/SALE_EFFECTS handling for it with AC-tagged tests and a Saves QA trace. Context: PR #87 at 22b6db4, report qa/m3-recheck/pr87-22b6db4.md.

## D-HOE-20261030-08 (2026-10-30 09:20 CET): triage of CCR rcv5-vs-main-1a61b36 follow-ups (not RC-blocking; Claude is never a gate, rule 22)
Verified: Claude Code Reviewer (Claude, 1 call) FAIL 0/1/3/1 on rcv5-vs-main-1a61b36; PASS on pr87-22b6db4 and pr82-48b6857 (1 call each); FAIL on lane-tools-be13625 (1 call, routed to HoO). With all flags off, determinism, save compat incl. rollback, and offline/clock reported clean.
- F-1 (bot-m5 O-3 loud-fail guard): downgraded to minor-latent. Must merge before any M5 flag ships at 1. Owner: Architect, small PR after #89.
- F-2 (sale previews skip playerSaleCtx; attended probe unwired): latent while streak is off. Must land before the streak flag flips. Owner: UI, after #83; not in #83.
- F-3 (1e15 nest cap x10000 past 2^53): Owner: Saves, assess and fix or clamp; 5.1 unless it reaches a flags-off path.
- F-4 (m5Load doesn't sanitize pause/callLockoutS): Owner: Saves, small PR into rc/v5 after #87 with a tampered-save test; lands before the cut if ready, otherwise first 5.0.x.
- F-5 / #82 minor (missing tc key becomes 0): folded into Saves' approved follow-up (streak tc keys into M5_REQUIRED_TC, flagOn), after the cut.

## D-HOE-20261030-09 (2026-10-30 09:33 CET): #89 (M1/m7 test-infra) moves to 5.1
#89 failed its UI QA gate twice (58ad41b, then a32faeb with new Major NF1: Playwright's exit hook can SIGKILL a live browser outside recorded-pid on a d2 halt; qa/m3-recheck/pr89-a32faeb-static.md). Per D-CEO-20261029-01 (fails its gate twice goes to 5.1) it leaves v5; it was already not RC-blocking (D-HOE-20261030-06), and N-M2 stays covered for the RC by HoQA's option (a). Until it lands, nobody runs the d2 firefox/webkit smoke through the #89 helpers, and HoO's F5 conditions (a)-(c) apply to any Playwright run. Architect: park a32faeb, take NF1/NF2 and the Minors in 5.1 after HoO rules; B and CCR F-1 come first. Owner: Architect.

## D-HOE-20261030-10 (2026-10-30 10:15 CET): pause spec E13 vs flags-off byte-identical saves
#91 (CCR F-4) merged at a923206 on Saves QA PASS (qa/v5-saves/trace-reviews/pr91-7d59dda.md), CI 41029765991, no Claude review. Ruling: save compatibility wins. While the pause flag is off, the game never rewrites saved pause fields; flags-off save bytes stay identical to rc/v5 before Pause. Stale pause fields are inert while the flag is off and are sanitised on load (m5Load, #91) when the flag is on. So spec E13 ("flag off clears saved pause fields on next save") is not built as written; HoP to amend E13 to "ignored while off, sanitised on load when on", or object before the Pause PR. Owner: Saves (Pause PR). Follow-ups after the cut, Saves: Saves QA M1 (allowlist must also require f.endsWith('sim/pause.ts')), N1 (m5Load doesn't mutate its input), N2 (unknown worker ids pass through), as one small test-only PR.
- 2026-10-30 12:20 CET · D-HOE-20261030-11 (answers D-HOP-2026-10-30-10): no commit applies the Row 34 ship values, and none can. rc/v5 3f582db has M5 plumbing only: F1a/b/c, F2, F3 flags/rules, the isPaused selector, the pause load sanitiser, and streak sim #2 (#87) with no UI. There is no gameplay code for golden, tapCoins, abilities, broody, fatigueCue, rc2Refill, autoRefill, clockWage or zeroGainUi (each is referenced only in balance.json/flags.ts or as save/state fields). Pause has no sim or UI (manifest rows 31-32). No open PR or remote branch carries any of them. Under D-CEO-20261029-01 and D-CEO-20261030-03 (a feature that fails its gate ships flag-off), the RC ships every m4.flags value at 0, which is the current balance.json. Pacing of record for the shipped game is X1 row 905, flag-off. HoP owns scope and the CEO rules.

## D-HOE-20261030-12 (2026-10-30 12:23 CET): lighter-refill re-pin
- Per PMW: rc2Refill/autoRefill build against product/workers/m5.1-lighter-refill-proposal.md v0.8.9 sha1 3b64af39abfeccc9ac5b14c924f1e934244cd8a9 (verified), superseding the .08d12ac7 v0.8.8 copy. Record-only: adds AC-LR20/21 (U1/U2 errata), no bar change. Pause spec of record v1.3.10 b4f86ca8. Re-pinned in v5-rc-manifest.md (row 25 + spec pins) and m5-build-plan.md. Kickoff package (product/) re-pin is HoP/PMW's file.

## D-HOE-20261030-13 (12:36 CET) — Features 95daf662 restarted per D-CEO-20261030-08
- Per D-CEO-20261030-08 (plan 2e32b078, ranking bfdfd73e) / D-HOP-2026-10-30-18: Features restarted, no hire. Hire spec goes to the CEO if Wave A build-complete (Mon 2 Nov 05:00) slips >12 h.
- Features takes lane-A Wave A sim work so the Architect stays on v5 RC: income-ref.ts + tapCoins sim (row 1), then golden sim. Later: abilities UI + telemetry v0.6.2 (Risk 4). Architect reviews; HoE pushes bundles.
- Pause-built-last retired; dependency gating per D-HOP-16. Each wave ships as its own QA-passed Latest release; flags to 1 only per D-CEO-07. v5 RC keeps priority on shared lanes until handoff.

## D-HOE-20261030-14 (12:38 CET) — breeds RNG/tick rulings (Saves Q1–Q4)
- Breeds uses its own saved breeds.rng, not brRng (BR-R9: no re-roll on reload).
- Q1 salt K = ASCII 'brds' 0x62726473. Q2 breeds state created at end of first flag-on tick (same as event RNG, Q-F1b-1). Q4 E15: reveal resolves before Farm-purchase unlock in the same frame; the auto-slot can't use the newly unlocked slot.
- Q3 provisional: match Econ roll() (free = 1 draw; paid = rarity then breed; an empty rarity drops its weight). Econ (dea51801) owns confirming it against the breeds spec and K10; if Econ differs, the code follows Econ.
- Lane A fallback: Features declined to restart without Vadim's own go, so income-ref + tapCoins stay on Architect lane A after the v5 handoff until Vadim clears Features.

## D-HOE-20261030-15 (13:05 CET) — single attended probe; #85 retarget; #93 pushed
- One attended probe only: F6 (overlay.wireAttended/dialogOpen) lands first, then F-2 is reworked on top of it using F-2's broader dialog definition (DIALOG_SEL, explainer, Upgrades sheet). ui/attended-probe.ts is removed or folded in. This must land before the streak flag flips (ST-AC13, GE-AC19, BH-AC9 depend on it).
- #85 retargeted from feat/v5-f3-config (already merged) to rc/v5.
- #93 final head 05d68b1e pushed (fast-forward on 37eb91d) and body patched (018b48ad), now with HoQA for delta review. K10 harness PR goes to the Architect after #93/#94, with a non-required CI job; the 0.02 pp miss on a8c4e268 is HoP's call, with no tuning.

## D-HOE-20261030-16 (13:10 CET) — breeds A pushed; Saves Q5–Q7; v5 ship-set; telemetry has no flag
- Breeds A Draft #95 at 464aea1 (SUMS 2edb5ba6). Under D-CEO-10, development PRs get unit tests + Econ model + Architect review only; QA gates run on the final RC.
- Q6: a NaN remainingMs clamps to the 60,000 max (no free reveal). Q7: sanitising re-derives an invalid rng and forces hatches/pity/freeHatchUsed to valid values. Q5 (E10 persist-null vs this-load-only): built as Saves proposed, but PM Collection owns the ruling (downgrade data-loss concern).
- v5 ship-set (for HoQA G1): m4.enabled=1, every M5 m4.flags.*=1 including salesStopped and breeds, zeroGain.confirm=0, bestBuyV2=0, tunables = CSV at the RC. HoP owns the product sign-off; HoE pins the balance.json sha256 at the RC cut.
- Telemetry v0.6.2 has no flag: it's always on, gated by the schema version and save-migration tests.

## D-HOE-20261030-17 (13:15 CET) — refill re-pin v0.8.10; workers telemetry allowlist
- Manifest re-pinned (D-PMW-2026-10-30-09): lighter-refill v0.8.10 f71e4516 (event renamed `refill_used`), kickoff package rev 6 d9125b12, failure-cost v0.3.19 4f5bbc5c, rc2 refill v1.3 2fdd84a2. This pin supersedes the refill pin inside the CEO-approved plan 2e32b078; the plan file is left unedited so its approved sha holds.
- Approved for the v5 build (refill is in v5 under D-CEO-09): telemetry allowlist adds refill_used, shift_sheet_opened and the extra rest_toggled fields. Every field must be an enum, bucket or count with no free text, and is added to telemetry.ts isPinned alongside schema tests.
- PMC ruled breeds E10 spec-literal (runtime null, raw id round-trips on save), plus Q7 conservative values; Saves follows PMC.

## D-HOE-20261030-18 (13:20 CET): viewport_h approved; workers allowlist fields; telemetry rows re-pinned to v5
- **viewport_h** (approved 13:03 to PM Market, logged now). Telemetry field `viewport_h` = window.innerHeight bucketed '<740' | '740-899' | '>=900'. One threshold constant (single source) and a 739/740 boundary AC. Spec v1.3.22 8244e066, gate #11/#T d7a38ba4.
- **Workers allowlist** (extends D-HOE-17, rc2 v1.3 2fdd84a2 L173, PMW rc2 v1.3.1 D-PMW-2026-10-30-10):
  - Approved: sheet_id, entry_point, stall_id on shift_sheet_opened, refill_used and rest_toggled.
  - Types: sheet_id is a per-session monotonic int counter (no UUID/string); entry_point is an enum; stall_id is a per-session int counter ≥1 (SUPERSEDED enum, see D-HOE-20261030-24); energy_pct is int 0–100; state/cause/entry/by are enums; rank_by_risk and charges_left are counts. No free text.
  - rest_toggled.cause gains `manage`.
  - Emission is exclusive: rc2Refill=1 emits rest_toggled only, rc2Refill=0 emits worker_paused/resumed only. Both families are in isPinned.
  - boost_used is retired, not pinned (ability_used{in_sheet} covers it).
- **Flag namespace:** the code uses m4.* (src/config/flags.ts: zeroGainUi/bestBuyV2 as m4.flags.*, confirm as m4.zeroGain.confirm, the single-namespace ruling, manifest row 28). Spec text saying m5.* maps to m4.*.
- **Manifest rows 11/24** (telemetry v0.6.2 subset and full migration) are re-pinned to v5 under D-CEO-20261030-09/-10. The 'CUT to 5.1' wording is removed. src/telemetry/schema.ts is a row-11 deliverable (Saves, lane S).
- **13:16 addendum (PMW rc2 v1.3.1, D-PMW-2026-10-30-10; PMFU D-HOP-34):**
  - refill_used gains refillable_n (count), best_worker and lowest_worker (enums W1–W4). Approved.
  - session_end gains shortage_s. Approved: an int count of whole seconds of active (attended, unhidden) time with refillable_n > floor(charges). The sim accumulates it on ticks (deterministic, no wall clock) and it isn't saved beyond the session. Owner: Saves (row 11); the refill owner exposes refillable_n.
  - The flags-0 golden (D-HOP-29) is pinned on data/economy.csv at the RC cut: the post-merge sha of the v5 CSV PR, which is the same file the build reads. Column renames in that PR need a rename map and byte-identical values. HoE confirms on the PR that sync-economy and balance.json read the new names.
- **13:21 addendum (PM Market, HoQA SS-G36, PMW rc2 v1.3.x, PMC errata rev 3):** the enum value `fatigue_chip` is approved for shift_sheet_opened.entry, refill_used.entry_point and rest_toggled.entry_point. It's emitted when the Shift sheet opens from the fatigue cue (the <740 popover Manage button, or the ≥740 sub-line if that opens the sheet). It carries no stall_id; sheet_id as usual. It's an enum, not free text. Saves adds it to schema.ts.

## D-HOE-20261030-19 (13:35 CET): v5 save version; telemetry errata rev 3 calls; refill a11y markup; Shift sheet close
- **Save:** SAVE_VERSION stays 6 with no M5 migration (verified: src/save/save.ts:7 at a452dd0; breeds is the optional `breeds?` in M5_SAVED_FIELDS, src/sim/m5-state.ts:67; no migrations[] entry). Breeds Q2 wording for the spec: "created at the end of the first tick with m4.flags.breeds on" (the code; D-HOE-14). Any future shape change that isn't an optional additive key is a bump trigger and goes to PMC/HoP first.
- **Errata rev 3 (PMC ee707672 / HoQA review 957f194c):**
  - G-1 cap approved: ability_blocked pinned, max 50 per session, then one `{capped:true}` marker, totals still in `count`. The 200 KB pinned cap stays. Saves sizes the session_summary and pinned budget for the 19 new pinned entries with a worst-case-session test in schema.ts; if it exceeds 200 KB, it comes back to HoE (no silent raise).
  - G-3 confirmed: with rc2Refill = 1, Pause's toggle-time fields (golden_on_screen, frenzy_active, farm, mood, unpaid, ability_active) ride rest_toggled{on:true}. session_end.paused_worker_s/all_paused_s exist only with rc2Refill = 0 (TEL-AC8). The pause spec text follows that.
  - G-4: NO alias. The schema is closed: wire and export are `refill_used` only. Card TEL-AC6/RF-AC10 read `refill_used` (name-only amendment; HoP signs).
  - G-10 wire worker ids = code ids `market_hand|coop_hand|hawker|grader` (src/sim/workers.ts:4; ability_used already emits them). W1–W4 is spec shorthand only. This supersedes "enum W1–W4" for refill_used.best_worker/lowest_worker in D-HOE-18.
  - F-4 `fatigue_chip`: approved (D-HOE-18 13:21).
  - F-6 version: src/telemetry/schema.ts exports TELEMETRY_SCHEMA_VERSION = '0.6.2'. The stored ring is {v, events} and the export header carries schema_version. A stored ring with no v (pre-0.6.2) keeps its events, tagged legacy:true on load; T-AC9 validates non-legacy events only. The telemetry key is separate from the save, so there's no save migration. Owner: Saves (row 11).
  - F-10: isPinned(e: TEvent), event-based (for tip_shown{id:'clock_wage'}). Owner: Saves, in the schema.ts PR.
  - Pin rev 3 in the manifest only after HoQA passes it; rev 2 6a10a918 is not pinned.
- **Refill a11y:** the final RC ships Art's .lbl + inline .sr-in markup (art-ux/reviews/m5-refill-axe/sr-markup.md; refill flows v1.0.1 43828d0b) for RF-UI-9/19/20, replacing the .sr markup that computes 'Refill , {Role}'. It's in refill UI scope (UI, lane U) and gated by QA-D-1030-NAME-FINAL.
- **Shift sheet close (abilities v1.3.5 eb33aad0, D-HOP-35):** the Shift sheet isn't in src yet (no sheetCloseComplete at 6307674). Its build AC: one sheetCloseComplete callback at every width, docked included. A Boost tap closes the sheet and the call starts on sheetCloseComplete. The sheet registers with F6 overlay (not-attended until close-complete).

## D-HOE-20261030-20 (13:40 CET): v5 Workers save shapes (PMW db679323) and the telemetry schema.ts contract
- **G-10 (first):** first_worker_hired.t_since_unlock_s is sent only when the unlock happened in the current session. No save field.
- **G-1 approved:** refillCharges + chargeNextMs. A missing or bad value never grants a charge: refillCharges missing/NaN/negative loads as 0 (clamped to [0, max]); chargeNextMs missing/NaN loads as the full regen period, and valid values are clamped to [1, regen]. This supersedes my earlier ruling 3 (load missing as 0).
- **G-5:** keep the code (simulate-first-60 s on a visible stall, game.ts:425). PMW fixes the pause spec E1 L261 and L132/141; no code change.
- **G-6/G-8/G-9 approved** as optional additive v6 keys: restAuto (next to paused:true), clockWageTipSeen?, and asleepWindow? (sanitised on load; invalid → absent). SAVE_VERSION stays 6 (D-HOE-19 rule: optional additive keys aren't a bump).
- **M-3:** Saves checks the committed save fixtures and any shipped shape for rest/resting. If one exists, map it to paused on load with a test; if none ever shipped, PMW drops the note.
- **M-5:** build AC for the rc2 refill implementer: tick.ts:55 skips the Manage cooldown when rc2Refill = 1, with a test.
- **schema.ts contract (Saves, row 11, for HoQA TEL-AC11/G-8):** `src/telemetry/schema.ts` exports:
  - `TELEMETRY_SCHEMA_VERSION = '0.6.2'`
  - `EVENT_SCHEMA: Readonly<Record<string, { pinned: boolean | ((e: TEvent) => boolean); fields: Readonly<Record<string, FieldSpec>> }>>`, where FieldSpec is `{kind:'enum', values} | {kind:'int', min?, max?} | {kind:'count'} | {kind:'bucket', values} | {kind:'bool'}`, with no free text
  - `EVENT_TYPES = Object.keys(EVENT_SCHEMA)`
  - `validateEvent(e: TEvent): string[]` (errors; [] = valid)
  - `isPinned(e: TEvent): boolean`
  - Envelope v0.6.2: {type, ts, sid, fgMs, …}.
- **13:45 correction to G-1 (PMW):** a MISSING refillCharges key (new game, first hire, pre-refill v6 save) loads as the starting value of 2. A PRESENT but invalid value (NaN, negative, non-integer, or over max) loads as 0, so a corrupt value never grants. chargeNextMs is unchanged (missing/bad loads as the full regen; valid values clamped [1,regen]). This supersedes "refillCharges missing loads as 0" above. Saves' subset re-dates noted: schema.ts likely Fri 21:00 / high Sat 03:00; subset likely Sat 14:00 / high Sat 22:00.

## D-HOE-20261030-21 (13:50 CET): breeds save findings (HoQA OQ-2/3/7 on a452dd0)
- **OQ-2:** a MISSING freeHatchUsed on an existing breeds object loads as 0 (PMC table default; the free hatch is kept). A PRESENT invalid value loads as 1 (PMC Q7, conservative). This is the same missing-vs-invalid rule as refillCharges (D-HOE-20 correction).
- **OQ-7:** the breeds save_migrated carries refund_cents, farm_level and backup_stores, matching game.ts:255.
- **OQ-3:** intended. A null or non-object breeds is treated as absent and re-created on the first flag-on tick, offline catch-up included (Q2). The load must log save_migrated breeds_sanitise with reason 'invalid_root'; a silent recreate isn't allowed.
- Owner: Saves, in the #95 follow-up PR (RC scope), with tests for each.

## D-HOE-20261030-22 (2026-10-30 13:38 CET): Saves order swap, and asleep_cents in schema.ts
- Saves' order is now (1) #96 fix → (2) schema.ts → (4) subset → (3) #95 follow-up. This supersedes my earlier no-swap call: M1 added 2 h to (3), and (3) can't be RC-final until Econ's combined CSV PR (likely Sat 16:00 / high Sat 22:00) brings the bc_* values anyway. Running the subset first meets HoQA's Sat 12:00 telemetry need (shortage_s, asleep_cents) on the likely path. Saves re-dates (3) and confirms.
- Saves adds worker_summary.wage_<id>_asleep_cents to schema.ts as an int count, min 0. The field name follows errata rev 3. If rev 4, once HoQA passes it, renames or drops the field, the code follows rev 4 under the rename-map rule in D-HOE-18.
- Saves confirmed that salesStopped and fatigueCue are never persisted on rc/v5 e77fc5c, so SAVE_VERSION stays 6.

## D-HOE-20261030-23 (2026-10-30 13:40 CET): allowlist calls on telemetry errata rev 4 (9e02ac3a)
- (a) The ability_blocked cap marker keeps the key `events` (count of discrete blocked taps). coop_full keeps `episodes`. Each event family has its own key, and the schema tests check each one separately.
- (b) Added: session_end.ability_blocked_taps, an int count, min 0, covering every blocked tap in the session, including the ones after the 50 cap. No free text.
- Types for the schema tests (PMW sign-off): t_since_unlock_s is int sim-seconds, min 0, emitted only for an unlock in the current session. farm_level is int, min 1. ability_used.t_since_ready_s is int wall-clock seconds, min 0.
- Owner: Saves, in schema.ts (likely Fri 21:00 / high Sat 03:00). Rev 4 gets pinned in the manifest only after HoQA passes it.

## D-HOE-20261030-24 (2026-10-30 13:48 CET): stall_id type (errata rev 7, N-1)
stall_id and prev_stall_id are int, min 1, a per-session monotonic counter (not saved, restarts each session), with pairs keyed by (sid, stall_id), as in PM Market spec v1.3.26 §8/G-13 and the same as sheet_id in D-HOE-18. Saves already has it in schema.ts.
Merges at 13:47: #93 → d716e7e8, then #95 (breeds A, flag 0) → rc/v5 65a74439. #96 is retargeted to rc/v5.

## D-HOE-20261030-25 (2026-10-30 13:52 CET): batch of save and telemetry rulings (HoQA, PMW, PMC, UI, Art)
**Saves shapes (Saves QA review 36089df6 on PMW v1.0.1). All PMW proposals approved:**
- F-1: L142 Ruling (3) is marked superseded for load defaults (done in place).
- F-4: when charges == cap, chargeNextMs is absent and the timer is stopped. A value present at the cap is dropped on load. The first spend below the cap starts the timer at the full regen.
- F-5a: a non-integer chargeNextMs is bad and loads as the full regen.
- F-5b: refillCharges over the max clamps to the max. NaN, negative and non-integer values load as 0. A missing value loads as start_charges (2).
- F-6: the missing default cites the start_charges data column (save shapes v1.0.2).
- F-8a: restAuto without paused:true is invalid and loads as absent. F-8b: asleepWindow is sanitised as a whole key.
- F-9: m5-fields.ts gets sanitiser hooks for refill, autoRefill and clockWage, with unit tests per F-4/F-5/F-8. Owner: Saves, in the #95 follow-up or a split PR; Saves dates it.
**Breeds:**
- OQ-13: a breeds_sanitise save_migrated carries backup_stores: [], because sanitising writes no backup (compare ['ls'] at game.ts:255 for the tracks migration).
- N-5: PMC's proposal is approved. Every breeds_sanitise carries reason 'invalid_root' | 'invalid_values', one event per load, with invalid_root taking priority. v-bump migrations have no reason key.
**Telemetry:**
- N-1: int counter (D-HOE-24). The enum wording at L380 is superseded in place.
- N-8: ability_used.combo is a bool, always present when abilities=1 (D-HOP-42).
- N-2, FieldSpec additions for schema.ts:
  - float{min?,max?,step?}, for example asleep_s at step 0.1;
  - str{pattern}, for patterns only, with no free text;
  - arr{of: FieldSpec, maxLen};
  - each field carries optional?: true (absent allowed) and nullable?: true (null allowed). Neither is set by default, so absent and null both fail;
  - capped marker as its own EVENT_SCHEMA entry variant, {capped: bool, <counterKey>: count}, where counterKey is per family (events, episodes);
  - dynamic keys through dynamicFields: [{keyPattern: RegExp built from the code worker ids, spec}]. Unknown keys fail.
  - Saves owns the detail.
- Pins: rev 6 (83424120) gets pinned in the manifest only when PMW abilities v1.3.8 lands and HoQA's G-14 condition is met (QA-D-1030-TELERR3). Revs 4 and 5 are never pinned. If rev 7 lands with N-1/N-5 and HoQA passes it, it replaces rev 6.
**UI and Art:**
- Inspect copy (Art Q7): "grade bonus +0.5" is the base m4.tc.ability_w4_tier_add (CSV tc_ability_w4_tier_add = 0.5) and is not mood-scaled.
- Coach-mark steps register with the overlay as sheets (not attended), per the API sheet. UI does this in C.
- The ability.call sound (audio-hooks v1.5) is owned by UI e80556fd, because Features is stopped. It depends on #86 and the Shift sheet.

## D-HOE-20261030-26 (2026-10-30 13:53 CET): temporary --strict drift waiver on product/economy.csv
- check-economy-copy --product --strict may fail on product/economy.csv (studio file c7bb783f vs the repo's a8c4e268) **only** until Econ's combined v5 CSV PR lands. A's product/economy.csv half goes into that PR under the same go from Vadim (no separate ask).
- The build is unaffected, since it reads only src/config/balance.json, which is generated from data/economy.csv a8c4e268.
- Hard stop: the RC is not cut while the waiver is open. At the cut, the strict check is green with no waiver.
- Econ's B (SOURCE col 3 → frozen product/economy.m51-o1a.csv = a8c4e268) clears the m4cols error. It needs Vadim's own go to push.
- HoQA co-sign pending.
- Standing rule 23 (restart guard) applies to my helper briefs from now on: a TASK line plus write scope, re-read on resume, no cross-department writes.
- **D-HOE-20261030-26 amendment (13:56 CET):** replaced by B plus HoQA's QA-D-1030-ECONDRIFT (4 conditions) under HoP's amended D-HOP-44. The waiver excuses only studio product/economy.csv c7bb783f. It is re-pinned to the combined CSV PR's sha before the RC cut. A goes on the post-cut list, owned by Econ, due cut + 1 day. No RC is cut on a8c4e268, because it has no tc_combo_* keys. If Vadim's go is late, the schedule slips and nothing is cut. At the cut, HoE pins the data/economy.csv and balance.json shas in the manifest. CI's sync check proves balance.json regenerates byte-identical.

## D-HOE-20261030-27 (2026-10-30 13:58 CET): observable sheet-close hook (HoQA N16, AC-M5A-24)
- The hook lives in src/ui/overlay.ts (UI #86 6307674). Each SheetHandle.closeComplete() call dispatches a DOM CustomEvent named `egg:sheetclosecomplete` on `document`, with detail `{ id: string, docked: boolean }`.
- It fires exactly once per close, at every width, docked included, and after the close animation ends. opened() dispatches `egg:sheetopened` with the same detail. Calling closeComplete() a second time on a sheet that's already closed is a no-op and dispatches nothing.
- Tests and UI QA probes listen on document for these events. No window globals.
- Owner: UI e80556fd, in the Shift-sheet work after #86, with a unit test (one close gives exactly one event; docked and 360 px).
- Also: decisions.md L148 now cites tick.ts:55 and save.ts:82 on rc/v5 65a7443.

## D-HOE-20261030-28 (2026-10-30 14:00 CET): breeds_sanitise at breeds=0 (HoQA M-2)
- With m4.flags.breeds = 0, the sim never reads, sanitises or writes the breeds key, and never emits breeds_sanitise or any breeds save_migrated. The key is kept verbatim on write-back, the same as the pause-fields rule E13. This keeps the flags-0 reference golden byte-identical.
- Sanitising, and its single save_migrated{migration:"breeds_sanitise", reason, backup_stores:[]}, happens only on the first flag-on load or tick. Owner: Saves, in the #95 follow-up, with a flag-off test that shows no event and an unchanged key.
- Telemetry errata rev 7 fd7d5921 is pinned in the manifest (G-14 met by abilities v1.3.8).

## D-HOE-20261030-29 (2026-10-30 14:08 CET): Saves QA N5-Q1, N5-Q2 and F-5; BBv2 telemetry types
- **N5-Q1:** at most one breeds_sanitise event per load, and its reason is a single value, never both. The reason is invalid_root when the loaded breeds value is not a plain object (an array, null or a primitive); the values are then not inspected and the key resets as a whole. Otherwise it is invalid_values. On a .bak fallback, the sanitiser runs only on the state actually loaded (the .bak) and logs that one event. The main store's failure is reported by the existing load path, never as breeds_sanitise.
- **N5-Q2:** yes. On rc/v5 65a7443 the only save_migrated without a reason is tracksV7_marker (game.ts:255, backup_stores ['ls']). The v4 to v5 manageCdS default (save.ts:82) emits no event. Any new reasonless migration needs a new HoE ruling.
- **F-5:** the max charge cap comes from the loaded balance.json, never a code constant. With rc2Refill at 0 it is not read.
- **BBv2 telemetry (PMFU v1.0.1 / rev 9):** key is an enum of row keys, using str{pattern} as an anchored alternation of the BUY_ORDER keys. payback_s and eta_s are nullable floats, with null meaning infinite or unreachable. This fits the N-2 FieldSpec. No new FieldSpec kind is needed.

## D-HOE-20261030-30 (2026-10-30 14:12 CET): the combo tunables get one name (HoQA FZ-4)
- The CSV columns are **tc_combo_window_s** (10) and **tc_combo_boost_duration_s** (45). sync-economy.ts:185 maps them automatically to **balance.json m4.tc.combo_window_s** and **m4.tc.combo_boost_duration_s**. They are not added to M5_MAPPED_COLS.
- Code reads only those two paths, which match abilities spec §7.
- In Econ's combined CSV PR, the studio product/economy.csv columns 112 and 113 (combo_window_s and combo_boost_s) are renamed to the names above. Values are unchanged.
- PMW changes the copy in rc2 L111, `combo_boost_s`, to `combo_boost_duration_s`.
- A sync test asserts both keys exist when abilities and rc2Refill are on. No other alias is accepted.

## D-HOE-20261030-31 (2026-10-30 14:15 CET): Econ's combo rename confirmed; telemetry rows G-15 and G-17
- **Combo rename (Econ 14:11):** confirmed. In the combined PR, combo_window_s becomes tc_combo_window_s and combo_boost_s becomes tc_combo_boost_duration_s, with byte-identical values and the same column positions. The PL-AC5 rename map has those 2 entries. HoE confirms the build reads **m4.tc.combo_window_s** and **m4.tc.combo_boost_duration_s** and only those keys. The combo code in the abilities lane reads them, there is no fallback constant, and a sync test asserts they are present.
- **G-15 allowlist:** BBv2 rows #19 to #23 are approved as proposed. #19 best_buy_shown is ring, #20 best_buy_followed is ring, #21 zero_gain_purchase is pinned, #22 dead_zone is pinned, and #23 best_buy_suppressed_zero_gain is ring, gated on m4.enabled. PMFU's 14:10 field rulings (1) to (6) are accepted, including dead_zone open:true as a bool and meaningful_eta_s as a non-null float ≥0. Saves' G-8 size test includes dead_zone.
- **G-17:** the 5/60/30 s thresholds are not CSV data and **not under m4**. sync-economy keeps only m4.enabled, flags and zeroGain, so it would delete m4.telemetry. They go in the hand-set top-level **balance.json `telemetry` block**, which the sync preserves, as `telemetry.bbv2.<name>_s` (PMC names them in rev 10). The code reads them from there, with no magic numbers.

## D-HOE-20261030-32 (2026-10-30 14:22 CET): rev 10 rulings (HoQA QA-D-1030-TELERR5) and combo ordering
- **M-1:** see D-HOE-31. Allowlist rows #19 best_buy_shown ring, #20 best_buy_followed ring, #21 zero_gain_purchase pinned, #22 dead_zone pinned, #23 best_buy_suppressed_zero_gain ring (needs m4.enabled).
- **M-2:** zero_gain_purchase is capped at **50 per session**. Over the cap, nothing is emitted and **session_end.zero_gain_purchase_dropped** (int ≥ 0) counts them, the same pattern as ability_blocked in D-HOE-23. The cap is the hand-set key telemetry.bbv2.zero_gain_purchase_cap = 50. Saves also adds a buy-spam fixture to the G-8 worst-case size test.
- **G-17:** the names are those in rev 9, in the top-level hand-set telemetry block (not m4.telemetry; see D-HOE-31): **telemetry.bbv2.shown_min_gap_s = 5**, **telemetry.bbv2.zero_gain_eta_max_s = 60**, **telemetry.bbv2.dead_zone_min_s = 30**.
- **B-2:** rest_toggled.mood and worker_paused.mood use WorkerMood exactly: 'working'|'tired'|'asleep'|'unpaid'. rest_toggled.state is the rc2 energy band of energy_pct just before the toggle: 'normal' (>40), 'refillable' (30-40), 'tired' (1-29), 'asleep' (0). Whether the worker is resting is carried by `on`, not by state. PMW may amend the band labels by Fri 18:00, otherwise this stands for schema.ts.
- **Combo ordering (Econ 14:13):** the combo code and its sync-presence test merge in or after Econ's combined CSV PR, never before it.
- **rc2** is re-pinned to v1.3.15 40a1f0b0 (the L111 name only).

## D-HOE-20261030-33 (2026-10-30 14:28 CET): D-HOE-32 B-2 amended per PMW, plus the zeroGainUi #97 open items
- **B-2 amended (PMW 14:17):** rest_toggled.state = **'active'|'paused'|'resting'**. It is the Rest/Pause state just before the toggle: active means paused is false or absent; paused means paused:true without restAuto; resting means paused:true with restAuto:true. This replaces the energy-band enum in D-HOE-32, which repeated energy_pct and conflicted with the 50% refill_threshold. The mood fields stay WorkerMood. Both are closed enums.
- **#97 zeroGainUi (row 28):** pushed at 53ef5b5. Before merge it needs the Generalist's bestBuyV2 × confirm 2×2 matrix commit and the Architect's review.
  - **ZG-AC3:** no M5.0 bestBuyMark stopgap is built for v5. Both flags ship at 1, and BBv2 Part A's meaningful-row filter enforces "★ only if meaningful". AC3 is verified on the row 29 merge. The flag-on RC needs both.
  - **ZG-AC11 traces:** owned by the Architect, after #94 merges.
  - **ZG-AC14, ZG-AC19 and ZGU-UI1:** QA's, at the build handoff.
  - **Confirm=1 strip issues** (tab switch or re-tap drops the strip without a cancel; an unaffordable Buy opens the strip): sent to PMFU for a ruling. confirm ships 0, so these do not block v5.

## D-HOE-20261030-34 (2026-10-30 14:31 CET): ability tunable paths and qaPicker in BBv2
- **Ability paths (HoQA, for abilities plan v0.10 8d897096):** the CSV column tc_ability_s maps to **m4.tc.ability_s** (30) and tc_ability_cd_s to **m4.tc.ability_cd_s** (300). Both are in game/src/config/balance.json on rc/v5 65a7443 (L387 and L385) and auto-map through sync-economy.ts:185. There is no fallback constant.
- **qaPicker (PMFU, BBv2-AC15 and the B1/B3 checks):** it was only ever part of the unbuilt stopgap #5c, so it is not in rc/v5. The **BBv2 bundle (row 29) ships the SG-12 qaPicker QA hook** unchanged, behind IOS_FLAG_ENABLED, listed in check-release-build, and compiled out of release. Card #12 keeps reading it on build:qa.

### D-HOE-35 (2026-10-30 14:3x UTC+1): #97 strip rulings, BBv2 field and flag-flip rulings
- I adopt PMC's D-COL-2026-10-30-29 for #97. Every strip that opens ends in exactly one confirm or one cancel: a re-tap, a tab switch, a hiding re-render or the panel closing gives one cancel. An unaffordable ZG row keeps its disabled Buy, with no strip and no event. The Generalist built this at 546de85 (commits 7 and 8, plus the 2×2 matrix in commit 6), and I pushed it as a fast-forward. Docked desktop mode never hides the panel, so the strip stays open there and no cancel is emitted. That is correct.
- BBv2 dead-zone ETA field: Card #12 / D-PMFU-BB8 wins. The field is `meaningful_eta_s`, a non-null float ≥0, as already accepted in D-HOE-31. This supersedes any nullable `farm_eta_s` / `eta_s` wording for this field in D-HOE-29 and D-HOE-34. `payback_s` stays nullable.
- Flag flip: every feature's own PR flips its own balance.json flag 0→1 as that PR's last commit, and only once its gate ACs are demoable (HoO rule: a flag never ships at 1 on an unbuilt feature). bestBuyV2 flips in the BBv2 PR, together with the v5-f3-qa-seam pin, and zeroGainUi flips in #97 or its follow-up.
- Gate-ACs pin: m5-gate-acs.md is a living file (it went ff02c1e1 → 344a9039 → 25e1d859 today). Build reads Card #12 from the gate-ready hash-named snapshot that PMFU sends, and I re-pin only to that snapshot, never to the live file.

### D-HOE-36 (2026-10-30 14:4x UTC+1): breeds RC blockers, owners and the BR-AC2b boundary
- #96 at 204cabe: Architect re-review PASS-with-Minors (reviews/v5-breeds-b-204cabe-architect-rereview.md, sha256 3dcb9849), no Claude review. It merges at flag 0 once CI is green. It was a draft, so CI skipped it; I've now marked it ready, and #94 as well.
- Owner for every breeds flag-on RC blocker: Saves (3ba38cf3).
  (1) PR C telemetry: hatch_started, flock_complete, and setting flockCompleteLogged so that sinceUnlockMs freezes.
  (2) The BR-AC2b import-boundary test.
  (3) #95 M1: bc() reads the bc_* columns, which land with Econ's combined CSV PR. Ship it with D-HOE-05 sha256 fixtures and a share fixture at a value other than 10000 bp, so B11 can be killed.
  (4) #95 M2: with the flag on and no hatch, the state must be identical to flag-off, s.rng included.
  (5) Traits are not in the v5 manifest flag table. If HoP adds them, cost and the Farm-step estimate read the breed-neutral state, and Saves owns that.
- BR-AC2b ruling: bots/ may not import any breeds module directly, transitively or by path. Reaching breeds through the public sim/actions dispatch is allowed, because that is the same seam the player's UI uses. The test asserts on the module graph: no import edge from bots/** to src/sim/breeds* other than through sim/actions.
- Before the RC: Minor A (cover the empty-onto-unknown-id case, or drop the argument), Minor 5 (hatchEstimate calls secondsToAffordSteady), #95 Minor 3 (cap the refund), plus the NaN guard and the Math.round nits. After the RC: Minor 3 (sim imports econ) and nits 2 and 4.

### D-HOE-37 (2026-10-30 14:4x UTC+1): #94 F1 owner and date
- HoQA's verdict on #94 B at a8e703a is PASS-WITH-NOTES (qa/m5/review-pr94b-a8e703a.md, bcd4b70b). F2 is fixed: I re-PATCHed the PR body so the VERDICT and SUMS hashes now read aad8bfb8 and 3475cfb6. The PR merges once CI is green.
- F1 (Major, forward): with all 14 ship-set flags at 1, bot-m5.test.ts fails 14 of 24 tests. Nine come from the O-3 guard; the rest are because m4.tc.pause_unlock_farm is missing. Owner: the Architect. The fix is an explicit flags-0 config for the Stack.on and rc2 tests, so they no longer read the live balance.json flags. Add a CI step that runs the suite under the ship-set flags. Due Sat 31 Oct 18:00 CET, high Sun 1 Nov 12:00, which is before the Thu 5 Nov 05:00 freeze. pause_unlock_farm itself arrives with Econ's combined CSV PR; the test must not depend on it.

### D-HOE-38 · 2026-10-30 15:1x CET · #97 merged; SIM-only flag list; P8 QA hooks owner
- #97 (546de85) has the Architect's PASS with Minors at ship values: reviews/v5-zerogain-546de85-architect.md, sha256 1f8c0337. No Claude review. Gate passed. Merged at flags 0 as rc/v5 0ad018ded37c2b3b3cfc3b213601d7a53cef5be7. Minor 1 (a 2-event annotateLast test) and the nits go to the Generalist's ZG follow-up. Minor 2 (a re-render moves focus without re-arming the 350 ms guard) **blocks any confirm=1 build or test** until it is fixed with a test.
- **anyM5FlagOn must count SIM flags only.** UI-only flags (zeroGainUi, bestBuyV2) must never change sim behaviour. The Architect owns a small separate PR: an explicit SIM-only flag list used by anyM5FlagOn (timers.ts:27, flags.ts:8-10), plus a golden re-run. It is due Sat 31 Oct 12:00 CET, high Sat 18:00, and goes after F1. It is a **prerequisite for the zeroGainUi and bestBuyV2 flip commits** (D-HOE-35 (2)). Each flip PR rebases onto it.
- HoQA's P8 request (qa/m3-recheck/HOE-PORT-REQUEST-groupC.md, sha256 a9248210): the build:qa hooks, data-testids and the docked golden-spot source of truth all go to UI (e80556fd) as TASK HoE/p8-qa-hooks. Dates are set when UI confirms them. The dependent rows stay UNVERIFIED until then.

## D-HOE-20261105-39 (22:00 CET): #103 schema QA-D-1105-SCHEMA — F-1 blocks merge; F-2 named follow-up; F-3 before G-8
- Source: HoQA FAIL on schema tip c7937c9 (qa/m3-recheck/schema-c7937c9.md, QA-D-1105-SCHEMA). Saves ask on F-2 scope.
- **F-1 MAJOR (blocks #103 merge):** `validateBalance` must accept a *missing* `telemetry.bbv2` block on older sha-pinned fixtures; a *present* value ≤0 stays rejected. Fix in code, not fixtures. Unit tests for both cases. After tip lands, Saves QA re-runs the 4 files + telemetry-schema on the exact new head. Do not merge until that re-pass.
- **F-2 MAJOR (RC-cut blocker, not #103 merge):** ring `{v,events}`, `legacy:true` on load, export `schema_version` header (errata V-0 / D-HOP-41 / D-HOE-20 F-6). Not in #103 tip today. **Named Saves follow-up PR is enough** for #103 to merge on F-1 alone. Saves opens `fix/saves-telemetry-ring-export` (or equivalent) after the F-1 tip lands; ETA **~12–24 h CET**, must land before the Wed 11 Nov freeze. Without that named PR + ETA confirmation this would have blocked #103 too — confirmation accepted here.
- **F-3 minor (before G-8 sign-off, not #103 merge):** FieldSpec kind `obj` is outside the D-HOE-25 N-2 list. Saves either re-encodes with listed kinds or HoE logs a decision for PMC errata. Prefer re-encode if cheap; otherwise ping HoE for the errata decision before G-8.
- Owner: Saves 3ba38cf3. #103 stays open/unmerged until F-1 QA re-pass. F-2 follow-up is the RC-cut gate for telemetry ring/export.

## D-HOE-20261105-40 (22:08 CET): abilities #112 @ cc0642a unblocks Saves Pause
- Features Draft [#112](https://github.com/PrincipalLewis/egg-farm/pull/112) tip `cc0642ae4730335eb79f0d047145d6a9d5770b9e` (feat/v5-abilities-sim, base rc/v5, flag abilities 0) is the Pause base. Architect review queued; stay Draft until Architect asks ready.
- Saves Pause sim (manifest row 31 / sizing §15b) starts now from that tip; ETA ~36–48 h CET. Parallel with finishing #109 + #103 F-1 QA. Features owns row 32 UI + G5-P after Pause.
- Saves also strips `abilityDurS` via M5_SESSION_KEYS and fixes load clamp so a 45s combo is not crushed to 30s — folded into Pause PR or a tiny stacked Saves fix on the same tip.
- Architect must ratify or reject optional `refillAgoSimMs` before Ready.

## D-HOE-20261105-41 (22:11 CET): fireAbility refillAgoSimMs + AbilityState.durS (Architect contract)
- Source: `engineering/reviews/arch-abilities-fireAbility-combo-persist-20261105.md` on #112 tip cc0642a. **Not** full #112 approval.
- **`refillAgoSimMs?`:** APPROVED WITH GUARDS — only when `abilities && rc2Refill && inSheet && !viaAll`; absent/nonfinite/<0 ⇒ no combo; inclusive `<= combo_window_s*1000`; Activate-all never combos; Features does not invent refill clocks. Architect amends the fireAbility addendum.
- **Tunables:** no prod literals 10/45. Economy lands `combo_window_s` / `combo_boost_duration_s` (proposed 10/45); F3 require both when both flags on. Fixtures OK until CSV.
- **Persist:** top-level `abilityDurS` REJECTED (leaks). Extend `AbilityState` with optional `durS` (granted focus duration); clear with `activeS` on load/offline end; clamp/`effect_s` use granted. **No unilateral save change** — PMW errata E2/E7/AC-M5A-12 first, then Saves, then Features #112 follow-up. Reload still ends the call (`cause:"offline"`), never resumes. No SAVE_VERSION bump.
- Owners: Architect (addendum); PMW (errata); Economy (CSV columns); Saves (endCalls/m5Load + SESSION strip until removed); Features (#112 follow-up under guards); Game/rc2 Refill later owns manual-refill stamp.

## D-HOE-20261105-41a (22:12 CET): combo tc_* names + fixtures-only until HoP
- Economy: canonical names are `tc_combo_window_s` / `tc_combo_boost_duration_s` (proposed 10/45) in combined scratch CSV only — **not** in repo `data/economy.csv`. Combined CSV remains blocked (MR accounting audit). No canonical/push/PR from scratch.
- Engineering stays **fixtures-only** for those keys until HoP authorizes a keys-only split or the combined CSV lands. validateBalance require-both when abilities&&rc2Refill still stands once keys exist.
- Features M1 restored: #108 @ 90fb447, #111 @ 2261670 — Architect recheck queued; both Draft.

## D-HOE-20261105-42 (22:13 CET): PMW abilities v1.3.12 unlocks Saves/Features durS
- Product errata up: `product/workers/m5-worker-abilities-spec.md` **v1.3.12** sha1 `9d521aa83387a6e45866e6ade01f67fac387f3a3` (D-PMW-2026-11-05-04), mirroring Architect persist contract §4 / D-HOE-41.
- **Unlocked:** Saves implements endCalls/m5Load + save-shapes v1.0.5 L65 update; Features #112 follow-up writes `abilities[id].durS` and removes top-level `abilityDurS`. No SAVE_VERSION bump.
- Combo keys remain fixtures-only `tc_combo_window_s` / `tc_combo_boost_duration_s` (HoP / D-HOE-41a). Spec may still say combo_boost_duration_s generically — Engineering wires `tc_*`.

## D-HOE-20261105-43 (22:20 CET): #112 Features APPROVE; Ready blocked on Saves endCalls durS
- Architect addendum on tip `2ec5b80`: prior Major (top-level abilityDurS) CLOSED; Features sim APPROVE; refillAgoSimMs/fixtures-only fit D-HOE-41a.
- **Ready/merge blocked** until Saves lands v1.3.12 `endCalls`/m5Load (`granted`/`durS` strip + effect_s) on tip 2ec5b80 (Pause PR or stacked fix). Then full review + hosted gate before Ready.


## D-HOE-44 (2026-11-05 22:26 CET) — #103 MERGE-WITH-NOTES
HoQA cleared #103 at exact tip daee4c1aa5bc; go effective when required hosted gate run 42111018380 SUCCESS for that sha. Auto-merge armed; hold+ping HoQA if gate fails or tip changes. Notes: (1) no pacing grant; (2) F-2 = PR #113 fix/saves-telemetry-ring-export (RC-cut blocker, 12–24h/Wed freeze); (3) F-3 before G-8. Evidence: Saves QA schema-daee4c1.md sha256 1d1a11c5….

## D-HOE-45 (2026-11-05 22:32 CET) — #100 Architect PASS-with-Minors; flip Majors routed
Architect PASS with Minors @ b6dec409 for flags 0 (review v5-m51-bbv2-b6dec409-architect.md). Ready/merge held for merge-forward onto rc/v5 844f8e15 resolving check-release-build.mjs:74 preserving both eggfarmQa and qaPicker, then gate + Architect delta. Flip Majors (not flag0 merge blockers): M1 Q-E2→breeds-hatch cost drift → Econ+Collection; M2 BB-AC14 Farm≥30 affordable-no-star → PMFU+HoQA.

## D-HOE-46 (2026-11-05 22:35 CET) — #100 flip M1 adopted (a); M2 held for HoP
M1: Product/Econ/PMC adopt (a) — hatchCostCents BR-R5 stays bestBuyV2-invariant via incomePerSec(neutral(s), b, {assumeWorking:true}); isolate only Q-E2 from hatch caller; not live mood income. Flip prerequisite; flag-0 merge unaffected. Generalist implements on #100 line.
M2: HoQA recommends ENFORCE (v1.0.4, eng empty→no-pick after L30); PMFU filed v1.0.5 adc051cd + Card #12 a3eaacb8 (post-L30 mark-null net intentional). Escalated to HoP; no eng until ruling.

## D-HOE-47 (2026-11-05 22:39 CET) — HoP M2 ENFORCE v1.0.4; #114 Ready; F-3=Saves
HoP Product ruling M2: ENFORCE v1.0.4 for BBv2 flip; v1.0.5/v1.0.6 not approved. No income-zero capacity recommend → no-pick/BR-BB4; suppressedAffordable===0 every Farm CONFIRMATORY; 18-state dump; flag-0 unchanged. Generalist implements after #100 merge-fwd with M1.
#114 @ e4117c4 Architect APPROVE → #112+#114 marked Ready (hosted gate+HoQA still required for merge).
#113 @ 560b4d4 Ready for Architect+Saves QA per HoQA F-2 bar. F-3 FieldSpec obj owner = Saves (before G-8).

## D-HOE-48 (2026-11-05 22:41 CET) — M2 operative pins; #105 tip; golden Ready-rec
Operative M2 refs per D-HOP-14: BBv2 v1.0.4 4ea3841a; Card #12 9f900304; live gate-acs c2610288. Rejected acecb898/05bca92d. HoQA flip bar (1–6) incl UI QA @ 360×640.
#105 merge-fwd tip d9539a5 (8 income-ref files on 844f8e15) → Saves QA.
Golden: Architect Ready-rec #108@811c7da + #111@a3169ec; merge after QA+hosted Node20 green; order 108→111.
#113 Architect PASS @ 560b4d4.

## D-HOE-49 (2026-11-05 22:45 CET) — Golden merge chain includes #107; #115 Ready
HoQA: merge order #105→#106→#107→#108→#111 (not 108→111 alone). #107 taken Ready @ a6d44c25 (not folded into #108). Each child merge-fwds onto rc/v5 after parent. #115 Pause @ 409fa6a Architect PASS+Minor → Ready; m1 tracksV7+hired fixture or HoQA waiver before merge.

## D-HOE-50 (2026-11-05 22:51 CET) — No force-push on restacks
Studio PRs restack/update onto newer parents via ordinary **merge-forward + normal push** only. `--force` / `--force-with-lease` forbidden for publishing restacks (Architect flagged #114 86973e5). One already-published force tip may stay; subsequent #114/#115/others must not force. Exact-head Architect APPROVE does not carry across parent-only restacks without recheck.

## D-HOE-51 (2026-11-06 00:20 CET) — Compliance with D-CEO-20261106-02 (no mergefwd-only recheck)
- **In force:** standing rule 24 / D-CEO-20261106-02. Clean merge-forward onto newer rc/v5 (identical PR patch / same PR files, no author commits, no conflict-resolution edits, no content fixes, no reverts) **inherits** prior Architect PASS and QA PASS. Do **not** queue Architect delta or QA re-gate solely because the base moved. Hosted CI may still run for branch health.
- **Still requires fresh Architect/QA:** any own-code change — author commits, conflict-resolution edits (e.g. #100 `game.ts`, #112 `timers.ts`), or intentional content fixes (e.g. #115 A1 `57c187e`). Full feature QA on the complete RC unchanged.
- **Supersedes** the last sentence of D-HOE-50 (“Exact-head Architect APPROVE does not carry across parent-only restacks without recheck”) for **clean** parent-only restacks. D-HOE-50 merge-forward + no force-with-lease remains.
- **Operational:** stop queuing merge-forward-only delta tasks. Architect and HoQA refuse them. Engineering still merge-fwds before merge when behind tip; then merge on inherited PASS + hosted green when clean.
- **Immediate:** #113 @ `9083c9a` clean mergefwd — PASS inherited from `560b4d4` (Saves QA / QA-D-1106-NOREGATE); GO after #106 in stack. #100/@ae12da45 and #112/@7a492e5 remain conflict-resolution reviews (not mergefwd-only).

## D-HOE-52 (2026-11-06 01:48 CET) — HoQA go required before merge; #114 post-merge bar
- Accept HoQA correction (Build): clean mergefwd inherits only an *existing* QA PASS. Saves QA local/content PASS ≠ HoQA go.
- **#114:** already merged @ rc/v5 `19121b75` without HoQA go (breach). Retro PASS only if pacing `42136450016` is SUCCESS or FAIL solely on row 904; else revert/hotfix before #115 merge; escalate to CEO if red.
- **#115 and later:** no merge until hosted SUCCESS at exact tip **and** HoQA GO (pacing SUCCESS or FAIL-only-row904 when HoQA requires it). Merge ask only after HoQA GO.

## D-HOE-53 (2026-11-06 02:53 CET) — F-3 FieldSpec obj CLOSED via EventSpec.records
Architect APPROVE #117 @ 87bd8b5: nesting moves to `EventSpec.records` (one-level); FieldSpec stays on D-HOE-25 N-2 value kinds only. Wire JSON / schema 0.6.2 nested shape preserved; no `obj` PMC errata. Closes D-HOE-39 F-3 / D-HOE-47. Nit: kind-union test should inspect dynamicFields (non-blocking). Review: engineering/reviews/f3-fieldspec-obj-87bd8b5-architect.md.

## D-HOE-54 (2026-11-10 00:10 CET) — trace10 read-only harness hooks approved (G-1/G-2)
HoE approves the Architect's 3-hook patch to the test harness tests/bot-m5.ts (design engineering/design/trace10-harness-of-record.md sha256 9f375d5f…adcf): read-only onRunnerDraw, onTick, onVariance. Conditions: hooks only observe (no RNG draw, no state write, no ordering change); default no-op when no tracer is attached; src/, ship CSV and balance untouched; observer proof P1–P4 (traced vs untraced identical reach maps, buy order, RNG consumption) is the acceptance test and a failure is non-PASS; the harness byte change is re-pinned in the trace10 manifest. HoQA concurrence requested; static zero-draw proof for CFG none is kept as an extra check, not a substitute. R-1 (harness of record = rc/v5 tests/bot-m5.ts) goes to HoP/Econ for ruling. Generalist starts implementation now rather than at 08:00.

## D-HOE-55 (2026-11-10 00:15 CET) — Workers drift D1 worker_resumed emit
Saves' D1/D2 branch saves/workers-drift-d1d2 @ 8ee3db1 (off rc/v5 f20b9183). Saves' write scope is extended to src/sim/events.ts for the worker_resumed SimEvent entry only, with one emitter shared by manual Resume and Manage (cause 'manual'|'manage'). paused_duration_s comes from a non-persisted pause start in sim state; after a reload it resets to load time (known undercount, documented in the PR). No save-shape change at RC; a persisted optional field + migration follows only if PMC/HoQA require it. A Manage-resume keeps the 45 s Market Hand lockout pending a PM Workers ruling. The AC-P11 test uses 20 × 1.5 s pairs (the AC as written can't be met) pending a PMW AC fix. workers-ui.ts drift goes to Features as a stacked PR (HoE/workers-ui-drift).

## D-HOE-56 (2026-11-10 00:30 CET) — breeds ships 1, routing
Breeds ships at flag 1 (HoP), so the manifest row-34 value is now 1. The Breeds UI isn't built and the lane-U UI engineer can't be reached, so it's queued as TASK HoE/breeds-ui-1 with the Generalist after the trace10 Ready PR; it's at risk for code-complete and gets escalated on sizing. Saves: #119 (pausedForS sim seconds, never saved; scope pause.ts/m5-state.ts/tick.ts), then HoE/breeds-drift-d1-d6 (D2 CRITICAL, D1 MAJOR, then D3–D6). ST-AC19/20 telemetry moves from Saves to Features (HoE/tel-st-ac19-20).

- 2026-11-10 00:40 HoE amendment to D-HOE-56: Breeds UI moves to the Architect (parallel with trace10); Generalist reviews it. Gate card of record is now da3de91c.
- 2026-11-10 00:42 HoE amendment to D-HOE-56: Breeds UI PR-B moves to Features (free after #121/#123), starting now. Architect reviews PR-B, Generalist reviews PR-A. R-2 (trace10): guarded runtime read of the mt/mti fields, no getter in src/.

## D-HOE-57 (2026-11-10 03:11 CET): refill G0 §7 rulings (G0-API.md b456e6eb; Architect review 03b4cb58)
- 7.1: tc_autorefill_at_pct (30) and tc_autorefill_reserve (0) are new economy.csv columns mapped into balance.json (agrees with HoP D-HOP-2026-11-10-20). **D-HOE-30 still stands.** The combo keys are tc_combo_window_s and tc_combo_boost_duration_s, renamed in Econ's CSV PR. R1 adds **no** combo_boost_s alias. My 03:05 relay was wrong about this.
- 7.3: rank_by_risk is the 1-based position in shiftOrder among hired workers.
- 7.6 and 7.8: build the Saves proposals (the Architect confirmed them).
- 7.7: Refill builds session_end.asleep_s, and clockWage (Hire 2) adds its time to the same counter.
- 7.2, 7.4, 7.5 and 7.9: per HoP D-HOP-2026-11-10-20. charges_capped_s is dropped from emission. Paused workers at ≤50% are refillable. Rest is gated on pause plus unlock, with B5 on every resume. A card at rc2Refill=1 opens Manage, which leads to the Shift sheet with entry:card.
- 2026-11-10 03:27 HoE amendment to D-HOE-57 §7.7: Hire 2 ships first, so Hire 2 builds session_end.asleep_s (gated on clockWage, independent of rc2Refill), and Refill adds autoRefill time to the same field later. It stays one field.

## D-HOE-58 (2026-11-10 03:42 CET): git identity in the shared repo
- Nobody writes user.name or user.email to the shared game/.git/config. Shared config holds a neutral fallback: "Egg Farm Studio (shared fallback)" <bots@eggfarm.studio>.
- Each engineer sets their own identity per worktree (extensions.worktreeConfig=true) with `git config --worktree user.name ...`, or passes `-c user.name=... -c user.email=...` on commit.
- A commit under the fallback identity is a process miss; report it to HoE.

## D-HOE-59 (2026-11-10 03:48 CET): entry enum gets 'asleep_banner'
- Engineering approves 'asleep_banner' for shift_sheet_opened.entry and refill_used/rest_toggled.entry_point (the Rule 3 banner Manage on #5b). It goes live only with the PMW/PMC errata plus an RF-AC13 test update.
- 2026-11-10 04:10 HoE amendment to D-HOE-59: 'fatigue_bubble' (the Rule 4 goal-bubble Manage) is approved the same way, pending errata rev 16.
## D-HOE-60 (2026-11-10 04:10 CET): refill countdown display
- The sim value stays max(0, ceil(nextChargeMs/1000)). The UI displays a floor of 0:01 and never shows 0:00 (Art RF-UI-4). Art can overrule this at the restart.
