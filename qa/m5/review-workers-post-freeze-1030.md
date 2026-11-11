# HoQA review: Workers post-freeze errata set (PM Workers, D-PMW-2026-10-30-25…-29) — QA-D-1030-FREEZE-RR2
Reviewer: Head of QA · 2026-10-30 14:28–14:38 CET · Paper only. Baseline: Workers M5 freeze D-PMW-2026-10-30-23, reviewed in `qa/m5/review-workers-freeze-1030.md` (FREEZE-RR1). Rule 23: TASK HoQA/TELERR6 re-read (scope added by the parent 14:28/14:29/14:31). No mismatch.
Every sha was checked with `sha1sum`, live file against the hash-named snapshot, and every file was word-diffed against its freeze sha.

## Verdicts
| Spec | Pin | Freeze | Verdict | "No AC/number/flag change"? |
|---|---|---|---|---|
| failure-cost | v0.3.24 `54b994bd` | v0.3.23 `8c03eb07` | **HOLD (label only; content ACCEPTED)** | **Refuted as worded.** No number or flag value changed, but the **AC-FC9 body (L104)** gained the FZ-1 ruling (a)–(c) and a FZ-2 key path and formula. L52 gained the key path. Toast strings are byte-identical. |
| lighter refill | v0.8.13 `13577395` | v0.8.12 `064c412d` | **ACCEPT** | Confirmed: L1–2, L62 and L109 are cite-only (rev. 5 → rev. 7). L62 cites manifest "L121"; it's L117 now (nit). |
| abilities | v1.3.10 `8034ba7f` | v1.3.9 `133adb21` | **ACCEPT** | Confirmed (see `review-abilities-v1310-erratum.md`). |
| fatigue visibility | **v0.2.5 `7e120786`** (via v0.2.3 `e160a0d3`, v0.2.4 `14ffeb90`) | v0.2 `b88083db` | **ACCEPT** | **Refuted for L98:** it's a **visible-string change**, not copy-only. L99 is a formula text fix (displayed value stays 15). L29 is a pointer. No AC, number or flag changed. |
| rc2 Refill | v1.3.16 `e4d98651` | v1.3.15 `40a1f0b0` (freeze v1.3.14 `944ca78e`) | **ACCEPT** | Confirmed for AC/number/flag. L215/L216/L219 add the closed enum **values** for `rest_toggled.state` and `mood` (B-2). That is a telemetry field-definition change by design. |
| pause | v1.3.15 `4c081f64` | v1.3.14 `74a0122a` | **ACCEPT** | Confirmed for AC/number/flag. §12 L296 and L299 add the `worker_paused.mood` values and the `state` note (B-2). |
| first-hire nudge | v0.1.1 `2786a08f` | `2786a08f` | **ACCEPT** (unchanged) | n/a |
| save shapes | v1.0.4 `963a490b` (via v1.0.3 `fa768d7c`) | v1.0.2 `34123ece` | **ACCEPT** | **"Cite-only" refuted for v1.0.3 L85.** The G-6 PROPOSED drop rule widened from "`paused` absent" to "saved without `paused: true` (false or absent)". This aligns to the existing ruling D-HOE-25 F-8a (eng. L450) and to Saves' case M5S-PAUSE-RESTAUTO (cases L267), which already tests paused absent / false. No case change. L5, L64 and L69 are cites (+10 line shift for abilities E2). v1.0.4 itself is cite-only (L2, L5). |
| gate `m5-gate-acs.md` | live `25e1d859` | `6384eb7d` (14:20 snapshot) | **ACCEPT** | Diff = exactly **L262, L315, L332, L364, L407, L410, L446**, all spec/Art sha cites. L332 is RF-AC8's source cite, not its body. **No QA line touched** (no `- QA:`, Cases, Engines or Gate-ready line). 344a9039 → 25e1d859 = L262 and L315 only. |

**The FC HOLD clears with a relabel only.** PMW re-states D-PMW-25/v0.3.24 as "AC-FC9 clarification (FZ-1/FZ-2): no rule, number, flag or string change". The text itself stays as is. CW authoring can start on `54b994bd` now.

## Details
### failure-cost v0.3.24 (FZ-1, FZ-2)
- **FZ-1 ruled in AC-FC9 L104:** (a) per-onset cadence for all 4 roles wins; (b) all 4 fall-asleep toasts are gated on `m4.flags.clockWage` = 1 only (§5 L89 default). `fatigueCue` and `salesStopped` don't gate them. (c) At clockWage = 0, no fall-asleep toast fires for any role. The rc1 banner, and with salesStopped = 1 the Rule 3 farm banner, remain.
  - The once-per-save toast is M4.2 Rule 5, **not pulled into v5. Checked:** sales-stopped `89dadb43` L218 "Fatigue explainer and first-Asleep toast (Rule 5, not pulled) | n/a in M5.0", and L256 "Rule 5's explainer and first-Asleep toast (M4.2 L26–29, AC-F6) … **not pulled** into M5.0/v5". **Matches.**
- **FZ-2:** `pct = Math.round(workers.grader.asleep_bonus_share × 100)`. **Checked:**
  - code `src/ui/workers-ui.ts:103` (`wt-v5-x1ci` 05d68b1 = rc/v5 65a7443): `pct = Math.round(b.workers.grader.asleep_bonus_share * 100)`;
  - `balance.json:85` `"asleep_bonus_share": 0.15`;
  - `scripts/sync-economy.ts:135` maps `w4_asleep_bonus_share`;
  - `product/economy.csv` column 37 = `w4_asleep_bonus_share` = 0.15. **Matches; 15 is displayed.**
- **PMW's admission (fatigue L99) is confirmed:** v0.2–v0.2.3 L99 read "{pct} = asleep_bonus_share × bonus", which doesn't match the code. Fixed in v0.2.4 `14ffeb90`.

### fatigue v0.2.5 (D-PMW-28/-29)
- v0.2.4 L99: formula = round(`workers.grader.asleep_bonus_share` × 100), with the code cite; matches the code (above).
- **v0.2.5 L98: Hawker effect "fewer customers" → "sales slowed". This is a visible-string change.** It now agrees with:
  - code `workers-ui.ts:107` `['sales slowed', 'Sales are slowed.']`;
  - rc1-asleep-state-spec L54;
  - Art rc2-workers-copy L84/L88;
  - Art fatigue UX `ffb13c19` §4 L107 errata ("Hawker fell asleep: sales slowed. Tap Refill." (replaces `fewer customers`));
  - FC L52/L104;
  - SS §4.8 (SS-25).
  - Art's own L107 template line still shows the struck v1.1 example "Hawker fell asleep: fewer customers", superseded in the same line (Art nit).
- **QA/UIQA assertions of the old string: none.** `rg -i "fewer customers"` over `qa/` and `artifacts/v5-ui/` finds only:
  - the unrelated orders control `'Show fewer customers'` (`src/ui/orders.ts`, worktree copies and built `rc-egg-farm.html` bundles);
  - spec-snapshot history lines ("was v0.2.2 'fewer customers'", sales-stopped snaps L475/L640).
  - Every Hawker case or shot asserts "sales slowed": `artifacts/v5-ui/harness/p1/p1.mjs:152`, `harness/ss/ss-banner.mjs:13/49`, `harness-rc/ss/ss-banner.mjs:13/49`, dryrun `p1-chromium-390-asleep*.jsonl` L51–58, `qa/m5/test-plan-sales-stopped.md` SS-25 L85, FREEZE-RR1 L37. **No re-shoot or case change.**
- AC-F13 (L102, "banner, toast and welcome-back … that role's effect string exactly") is now consistent with the code for all 4 roles.

### rc2 v1.3.16 / pause v1.3.15 vs errata rev. 12 B-2
- rc2 L215: `state: active|paused|resting (the Rest/Pause state just before the toggle: active = paused false or absent; paused = paused:true without restAuto; resting = paused:true with restAuto:true; closed enum)`; `mood` = `working|tired|asleep|unpaid` (WorkerMood, `workers.ts:6`), pre-toggle. L216 types note and L219 G-3 note follow.
- pause L296: `worker_paused.mood` WorkerMood, pre-pause. L299: the `state` note.
- **Identical to errata rev. 12 row #6 L65, row #10 L69, L113 and to D-HOE-33 L520.** This satisfies rev. 12's B-2c follow-up. PMC re-cites in rev. 13.

### HoE manifest `5efb4b73` (14:3x entry, L124)
Pins rc2 `e4d98651`, pause `4c081f64`, FC `54b994bd`, LR `13577395`, abilities `8034ba7f` (rows 15/18/19) and save shapes `963a490b`; telemetry stays rev. 7 `fd7d5921`. All match disk. **Nits:**
- HoE pinned before this review, under the "no AC change" label (see the FC HOLD).
- Table rows 25/26 (L54/L55) still show lighter v0.8.10 / FC v0.3.19 in-cell. The log says it supersedes them; a cell re-cite would help readers.
- Fatigue v0.2.5 and nudge aren't manifest rows (no change needed).

## FZ-1 is ruled: what my CW (clock-wage) cases need (Card #10, AC-FC9)
New or changed rows. Author against FC `54b994bd` AC-FC9 L104 and L52, Art fatigue UX `ffb13c19` §4 L107, and code `workers-ui.ts:103/107`:
1. **Q-CW-T1 per-onset, 4 roles (clockWage = 1):** each energy > 0 → 0 transition fires **exactly one** toast for that role. Refill, then a second onset in the same session, fires a second toast. After a reload, an onset fires again (no once-per-save). Exact strings:
   - MH "Market Hand fell asleep. Auto-selling stopped, wage still running.";
   - CH "Coop Hand fell asleep. Collecting stopped, wage still running.";
   - "Hawker fell asleep: sales slowed. Tap Refill.";
   - "Egg Grader fell asleep: bonus down to 15%. Tap Refill.".
   - MH/CH are coalesced with the existing asleep toast: one toast, not two. aria-live polite with the same text.
2. **Q-CW-T2 {pct} from data:** balance `workers.grader.asleep_bonus_share` = 0.2 → "bonus down to 20%". Use 0.2, not a .x5 value, to avoid Math.round FP ties. Assert no literal "15" in the template (grep `workers-ui.ts`).
3. **Q-CW-T3 clockWage = 0 negative:** an onset for each role → **0 fall-asleep toasts** (no toast node, nothing in aria-live). The rc1 Asleep banner is still shown. With salesStopped = 1, the Rule 3 farm banner still shows.
4. **Q-CW-T4 flag independence:** clockWage = 1 with fatigueCue = 0 and salesStopped = 0 → toasts still fire. clockWage = 0 with fatigueCue = 1 → none.
5. **Q-CW-T5 no Rule 5 in v5:** on a fresh save, the first Tired or Asleep crossing shows **no** fatigue explainer and **no** "first-Asleep" toast (AC-F6 absent). Only Q-CW-T1's per-onset toast appears.
6. **Q-CW-B layout (UIQA):** the 4 strings are ≤ 2 lines, no clipping at 360/390/1280 in 3 engines (FC-N5 / B-1 Art 23:06).
7. **Open questions to PMW (non-blocking, needed before run):** (q1) two roles falling asleep on the same tick: 2 toasts queued, or 1? (q2) an onset that happens offline or while hidden: toast on return, or none (welcome-back covers it)? (q3) an Unpaid worker whose energy reaches 0: toast fires (there's no Unpaid variant)?

## Re-cites needed in QA docs and gate QA lines
- **Card #6a (rc2 Refill), gate L359–361 (my QA lines):**
  - L360 Engines and L361 Gate-ready still say Art `m5-refill-flows` "v1.0 `6173f757` … not signed". Re-cite to **signed v1.0.1 `43828d0b`** (FREEZE-RR1 L102 already asked for this).
  - L361's "spec header is stale / doesn't name its flag": re-check against rc2 v1.3.16 `e4d98651`.
  - Cases L359: U6 AC10 "4 events pinned; `manage_used` alias" → "no `manage_used` alias" (D-HOP-41 (2)). Add `rest_toggled.state`/`mood` closed-enum values (B-2) to the U6 schema check.
- **Card #10 (clock wage), gate L480–482 (my QA lines):**
  - L480 Cases (19): add Q-CW-T1…T5 (+ B row), giving 24 or 25 cases, and update Effort.
  - L481: Art `6173f757` → `43828d0b`.
  - L482: cite FC v0.3.24 `54b994bd` AC-FC9 L104.
  - These are my edits, after BBV2-GATE1, to avoid concurrent gate edits (as FREEZE-RR1 noted).
- `qa/m5/test-plan-abilities.md` v0.10: header freeze set → the shas above (see the abilities review).
- `qa/v5-saves/m5-save-cases-DRAFT.md` (Saves QA): **yes, it cites `34123ece` (12 occurrences**, e.g. L5, L48, L50, L58, L68) and pause v1.3.14 `74a0122a` (L51, L52, L240, L243). Re-cite to shapes **v1.0.4 `963a490b`** and pause **v1.3.15 `4c081f64`**. Line refs are unchanged (the pause diff is in-line only; shapes §3 L66/L67 unchanged). There are no case-value changes: M5S-PAUSE-RESTAUTO L267 already matches the widened G-6 rule.
- `qa/v5-saves/READINESS.md` (`944ca78e`, `34123ece`) and `qa/v5-final-rc-run-plan.md` (`40a1f0b0`): re-cite to rc2 `e4d98651` and shapes `963a490b`. Citation only.
