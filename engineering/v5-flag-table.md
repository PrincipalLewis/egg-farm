# v5 14-flag critical-path table (HoE → CEO)

**Task:** HoE/v5-flag-table-final (D-CEO-20261110-11 / -08 / -10)
**When:** 2026-11-10 ~02:10 CET (Europe/Belgrade) · paper only · write scope: this file + `engineering/hiring/hire-2-spec.md`
**Parallel-build rulings (plan B):** (1) Hire 2 clockWage builds against refill G0 (Saves publishes day 1), parallel with refill sim; ~2 h rebase; merges after refill; Saves+Architect own `tick.ts`/`workers.ts` seam; Hire 2 day-1 = ramp+pause. (2) Backfill #5b/#11 against `engineering/tasks/v5-ui-ss-fatigue/SIM-API.md` from day 0 (stub→real, ~2 h); Features Shift against refill G0; Saves still does risk-helpers first.
**Single source of truth (sim):** `engineering/v5-sim-build-state.md` sha256 `24dcaa1636b48a093ff730426bb3ef8bf41d4f5ebd954ed1bd382bb0046f29d9` (Architect audit @ rc/v5 `d65391b0`)
**Also cited:** `engineering/tasks/v5-refill-sim/HANDOFF.md` sha256 `c9d13db877e37474c5a96aff212519f5de5f82ad08cf0c0d728106f5ed92b084`; `engineering/v5-ui-build-state.md` sha256 `921482e908a7d059542187c9d6bd49419907e07e57a07fc36ea88563ae56bca9`; `engineering/v5-rc-manifest.md` sha256 `629f6520` (Architect fixed stale rows 12/14/23/31 — gap closed); handoffs `v5-ui-ss-fatigue`, `v5-ui-shift-sheet`, `broody-yard-ui`, `v5-session-end-base`, `v5-tel-envelope`; `engineering/hiring/lane-u-backfill-spec.md`; hire spec `engineering/hiring/hire-2-spec.md`
**QA columns:** filled by HoQA (QA-D-1110-FLAGTABLE, one re-bar risk per sim PR). QA on the pole after last Ready = **13–19 QA h (~1.6–2.4 d)**, replacing the 1-day placeholder.
**Owners:** HoE rulings below; recommended capacity plan **(B)** — Hire 2 = clockWage + pause UI; Hire 3 = streak/tapCoins UI. §Conflicts resolved (see bottom).

Legend: **BUILT** = on `d65391b0` · **IN-PR** = open GitHub PR + head · **ON-BRANCH** = branch, no PR · **MISSING** = nowhere. Hours = engineer hours to Ready.

---

## 14-flag table

| Flag | Sim state | UI state | Spec/Art pin | Owner (sim / UI) | Engineer hours | Dependencies | On critical path? | QA bar owner | QA lead time |
|---|---|---|---|---|---|---|---|---|---|
| golden | **BUILT** `d65391b` (`sim/golden.ts:29`, Game driver via #111) | **MISSING** overlay egg/SFX (helper `ui/golden-spots.ts` only; no `setSpotProbe`/`tapGolden` caller in `src/ui`) | product `m5-golden-egg-spec.md` v1.3.3 sha1 `2eb630e3` (incl. `goldenFrozen`) | sim: — (done) / UI: **Generalist** | sim 0 · UI **9–11.5** if F6 lands first (11.5–14.5 slim-mount fallback; audit ~18 double-counts F6 + greenfield — superseded) | F6 spots/registry (Features 6–8 h) | Y | UI QA edb6ef85 (+QA bot live smoke) | 3–4 h (one UI bar, 3 engines) +2 h re-bar risk |
| streak | **BUILT** (`sim/streak.ts:16,36`); ST-AC19/20 fields **IN-PR #123** `74d640d4` | **MISSING** meter/A2 pops | product `collection/m5-streak-tap-coins-spec.md` v1.3.3 sha1 `b315dea1`; art `art-ux/m5-combo-tiers.md` v0.3 sha1 `ed4ded1d` | sim: land #123 / UI: **Hire 3** (plan B; Features under plan C) | sim ~1 (land #123) · UI **18–24** (plan **20**) | F6; #123 before Gen session-end | Y | Saves QA 33ec1b55 (#123) / UI QA (meter UI) | #123 2–3 h · UI 3–4 h |
| tapCoins | **BUILT** (`sim/tap-coins.ts:17`); credited-tap fields **IN-PR #123** | **MISSING** +$ pop (same UI row as streak) | same as streak | sim: in #123 / UI: **Hire 3** (bundled w/ streak) | sim 0 · UI **in streak 18–24** | Broody extends `incomeRefOn` (`income-ref.ts:13,25`); F6 | Y | in streak row | in streak bars |
| abilities | **BUILT** (`sim/abilities.ts:39,68,89`); combo reads `refillAgoSimMs` only with rc2Refill=1 | **IN-PR #116** `629ab76d` (~3 h conflict+bar); Boost slot in Shift sheet | `art-ux/m5-abilities-flows.md` sha1 `fc1ca17d` (Boost §16) | sim: — / UI: **Features** (#116 + Boost in Shift) | sim 0 · UI ~3 (#116) + Boost in Shift 15–21 | rc2Refill G0 API note; Shift sheet; #116 post-freeze re-bar | Y | UI QA (#116 post-freeze re-bar; Boost in Shift bar) | #116 2–3 h · Boost in Shift bar |
| broody | **MISSING** (save fields/`broodyBpEff` only; no nest sim — audit L20; `broody-yard-ui/HANDOFF.md`) | **MISSING** yard/glow | product broody v1.3.3 sha1 `4441a1d9`; art `4169c17b`; asset `overlay-broody-nest.svg` `7de37176` | sim+UI: **Generalist** (one PR) | sim **6–8** · UI **7–9** (=13–17) | income-ref BUILT; brRng BUILT; stack after Breeds PR-B / #125; import `broodyBpEff` don't edit | Y | Saves QA (sim + save round-trip) + UI QA (yard), joint bar on the one PR | 4–5 h |
| salesStopped | **MISSING** (`econ/income.ts:83` test-only; no stall timers/emitters) | **MISSING** chip #5b | sales-stopped sha1 `cfff3817`; Art `ffb13c19` | sim: **Saves** (risk-helpers, shared w/ fatigue) / UI: **Backfill 1d79672c** | sim **10–14** (shared w/ fatigueCue) · UI **17–25** (incl. SS-36 Manage) | build from day 0 vs pinned `v5-ui-ss-fatigue/SIM-API.md` stub; swap real helpers (~2 h) when Saves merges (helpers first); Shift for Manage; F6 merge-forward after | Y | Saves QA (risk-helpers sim/emitters) / UI QA (#5b incl. SS-36) | sim 3–4 h · UI 4–5 h |
| fatigueCue | **MISSING** (no `fatigueShare`/Rule 2/emitters) | **MISSING** HUD cue #11 | fatigue-ux Art `ffb13c19` | sim: **Saves** (same PR as salesStopped) / UI: **Backfill 1d79672c** | sim in salesStopped 10–14 · UI **16–23** | same Saves sim PR; UI from day 0 vs SIM-API stub (+~2 h swap); SS-37/FC-AC9 needs golden spots | Y | Saves QA (same sim PR) / UI QA (#11) | sim in salesStopped · UI 3–4 h |
| pause | **BUILT (core)**; drift + `worker_resumed` **IN-PR #119** final head **`b65d23c6`** (done; HoQA bar after restart, after CP train, verify-smoke, rc2Refill=0 and =1); **`worker_paused` emitter MISSING** (~1 h, Saves) | **MISSING** toggle/banner (Rest stays in Shift sheet) | pause spec v1.3.17 sha1 `7536acfa` (`product/workers/m5-worker-pause-spec.7536acfa.md`; goldenFrozen absorb) | sim remainder: **Saves** (`worker_paused` only; #119 done) / UI: **Hire 2** (plan B/C; Gen after golden under plan A) | sim ~1 (`worker_paused`) · UI **8–12** (moved OFF Saves) | #119 lands before refill exclusive-emission; Rest ↔ Shift/rc2Refill | Y | Saves QA (#119 rc2Refill=0/1 + verify-smoke; worker_paused) / UI QA (toggle/banner) | #119 3–4 h · worker_paused ~1 h · UI 2–3 h |
| rc2Refill | **MISSING** (flag key + abilities guard only; no charges/Refill/Rest/emitters; 6 rc2 CSV cols not synced — refill HANDOFF) | **MISSING** Shift sheet + nav opener (**Refill UI of record** = Features Shift) | sheet `art-ux/m5-refill-flows.md` v1.0.1 sha1 `43828d0b` + `reviews/m5-refill-axe/sr-markup.md`; Boost `art-ux/m5-abilities-flows.md` sha1 `fc1ca17d`; product rc2 v1.3.16 / lighter `c4c1a5cd` | sim: **Saves** (Architect sizes+reviews 3–4 h; **no SAVE_VERSION bump** — sanitiser defaults + round-trip) / UI: **Features** Shift **15–21** | sim **19–27** (plan **24**; incl. autoRefill) · UI **15–21** | risk-helpers; #119 done; #116 combo; Econ/PMW place `tc_autorefill_at_pct` (30) / `tc_autorefill_reserve` (0); Shift after G0 API note | Y | Saves QA (refill sim; sanitiser defaults + save round-trip, no SAVE_VERSION bump) / UI QA (Shift sheet) | sim 5–6 h · Shift UI 4–5 h |
| autoRefill | **MISSING** (flag key + schema only; requires rc2Refill — AC-LR19) | **MISSING** (Auto-refill rows inside Shift; in rc2Refill UI 15–21) | lighter-refill `c4c1a5cd`; flows `43828d0b` | sim: **Saves** (bundled in refill-sim 19–27) / UI: **Features** (in Shift) | in rc2Refill row | rc2Refill; clockWage U1/U2 (AC-LR20/21) | Y | in rc2Refill row (Saves QA sim / UI QA Shift) | in rc2Refill bars |
| clockWage | **MISSING** (flag key only; tick still no Asleep wage — `tick.ts:65,88-92`) | **MISSING** running-wage UI (captions, welcome-back, yawn tip, toasts) | failure-cost `product/workers/m5.1-worker-failure-cost-proposal.md` **v0.3.24** sha1 `54b994bddc479b5d114e02dbebed04813f007196` (frozen `.54b994bd.md`) | sim+UI: **Hire 2** (not Architect) | sim **10–14** · UI **8–12** (=18–26) | **parallel w/ refill** against G0 (day 1); rebase ~2 h when refill merges; **merges after refill**; Saves+Architect own `tick.ts`/`workers.ts` seam; AC-LR20/21 | Y | Saves QA (sim incl. offline + clock-change) + UI QA (wage UI) | sim 4–5 h · UI ~3 h · +2 h re-bar after refill rebase |
| breeds | **BUILT (PR-A sim)**; **IN-PR** re-cite #120 `0bbcea52`, drift #124 `baf410ff`, traits #125 fix head **`eb92b375`** (F1–F5; HoQA re-bar; F6 Broody → Gen), `familyClamp` #126 `d4b5fdcd`, telemetry #127 restack onto `eb92b375` (was `04add420`) | **ON-BRANCH / local:** PR-A `v5/breeds-ui-a` **`bd5b068a`** (Architect; push+PR waits Vadim yes); PR-B `feat/v5-breeds-ui-prB` (**Features**, ~7 h left) | breeds UI art `art-ux/m5.1-breeds-ui.md` | sim: **Saves** (land stack) + **Generalist** #127 restack ~1–2 h on `eb92b375` (**incl. m1** session-counter reset + pageshow/bfcache guard) / UI: **Architect** PR-A + **Features** PR-B | sim: review/QA + #127 restack **1–2** · UI PR-B **~7** (2 h waits on Saves #126 commit 1 `presentGateOpen` + #100 goal hook) | merge order **#126 → #125 fix (`eb92b375`) → #127 restacked → #100**; UI binds `familyClamp` (#126); PR-B before F6 | Y | Saves QA (#126/#125/#127 stack) / UI QA (PR-A, PR-B) | stack ~5–6 h serial (#126 pacing read ~0.5 · #125 re-bar resume ~2 · #127 restacked ~3) · UI ~5 h (PR-A resume ~2 · PR-B ~3) |
| zeroGainUi | **BUILT** (no sim component; `flags.ts:19`) | **BUILT** `ui/zero-gain.ts:45` | — (flip held D-HOE-38) | — | 0 | flag flip only | N | UI QA (flip smoke) | ~1 h |
| bestBuyV2 | **IN-PR #100** `2e76d0c5` | **IN-PR #100** (same) | `HELD-flip-bestBuyV2.diff` | **Generalist** (merge/QA) | merge/QA ~2 | after #127 restacked; freeze-needed (D-CEO-20261110-06) | Y | Saves QA (#100) | 2–3 h after #127 |

### Non-flag M5.0 telemetry base (gates session_end / TEL-AC1; not a `m4.flags` row)

| Item | State | Owner | Hours | Notes |
|---|---|---|---|---|
| TEL-AC1 envelope `sid`/`fgMs` (drop `sessionMs`) | **MISSING** (validator only — `schema.ts:206`; emitter still `sessionMs` `telemetry.ts:17,56-60`) | **Architect** (CONFIRMED; HANDOFF `engineering/tasks/v5-tel-envelope/`) | **4–6** | one shared fg clock with Gen session-end; land **#123 first**; fits next to RC lead |
| hide ≥ 60 s session rotate | **MISSING** (one `session_start` `game.ts:67`; unload-only `session_end` `game.ts:330`) | **Architect** (CONFIRMED; same `v5-tel-envelope/` HANDOFF) | **3–5** after envelope | Gen `reason:hidden` needs this; also covers part of **#127 bfcache Minor**; ship unload-only if rotate slips |
| session-end-base (+ §8 `session_summary.counts` producer) | **MISSING** | **Generalist** | **10–14** (incl. summary producer) | after #123; excludes TEL-AC1 + rotate (Architect) |
| TEL envelope + hide-rotate (combined) | **MISSING** | **Architect** CONFIRMED | **7–11** after #123 | plus Refill review **3–4** → Architect build+review **10–15** (+ RC lead) |

---

## sim-complete for economy runs

**Condition / sha:** **TBD** — the first `rc/v5` tip where every flag's **sim** has landed (BUILT or merged), including: broody nest sim, salesStopped+fatigueCue (risk-helpers + emitters), rc2Refill+autoRefill (charges/Refill/Rest/auto/emitters; no SAVE_VERSION bump), clockWage sim, pause `worker_paused`, streak/tapCoins tel fields (#123), breeds stack through #127, bestBuyV2 (#100).

**PRs / work that gate it today:**
- In train / open: **#126 → #125 fix (`eb92b375`) → #127 restacked → #100**; **#119** `b65d23c6` (bar after restart, after CP train, verify-smoke, rc2Refill=0 and =1); **#123**; #120/#124 already in path.
- Not yet opened: Saves risk-helpers, Saves refill-sim (`saves/v5-refill-sim`), Gen broody sim, Hire-2 clockWage sim, Architect TEL envelope/rotate (`v5-tel-envelope/`), `worker_paused` (with/after #119).

**Econ's R04 / CSV / B4 / K10 runs of record are gated on this sha** (HoP). Do not treat a partial tip as sim-complete.

---

## (a) Per-lane totals (low–high) — plan B + parallel rulings

~**8 h/day**/lane. New-hire ramp folded into Hire 2 day-1 (ramp+pause). Rebase risk **+2 h** on Hire 2 and Backfill.

| Lane | Work (HoE order) | Hours (low–high) |
|---|---|---|
| **Features** 95daf662 | PR-B ~7 → F6 **6–8** → Shift **15–21** vs refill **G0** (sheet `43828d0b`; Boost `fc1ca17d`) | **28–36** |
| **Generalist** 5a6a207d | port 2–3 → Broody sim 6–8 → golden **9–11.5** → Broody UI 7–9 → session-end **10–14** → #127 restack 1–2 | **35–47.5** |
| **Saves** 3ba38cf3 | risk-helpers **FIRST** 10–14 → refill 19–27 (plan 24; G0 on **day 1**) → `worker_paused` ~1 + re-bar 2; #119/#125 done | **32–44** |
| **Architect** 205f4268 | RC lead; TEL 7–11; Refill review 3–4; owns shared `tick.ts`/`workers.ts` seam w/ Saves | **10–15** |
| **Backfill** 1d79672c | #5b→#11 from **day 0** vs `SIM-API.md` stub; +**~2 h** swap when helpers merge | **35–50** |
| **Hire 2** | day-1 ramp+pause **8–12**; then clockWage **18–26** **parallel w/ refill** vs G0; +**~2 h** rebase; merges after refill | **28–40** |
| **Hire 3** | streak/tapCoins UI **18–24** (plan 20) after F6 | **18–24** |

**Longest lane (hours):** Backfill **35–50** (mid **42.5**). Gen mid **41.25** is close second.

---

## (b) Critical path (plan B, parallel rulings)

Serial waits removed: clockWage no longer waits on refill *start*; Backfill no longer waits on helpers *start*; Shift builds on G0.

**Still true:** Saves risk-helpers first (internal); G0 day 1; clockWage **merges after** refill; streak/golden need F6; HoQA ~1 d on pole; merge/rebase slack ~0.5 d.

**Pole formula:** longest single lane hours ÷ 8 + ~1 d HoQA + ~0.5 d merge/rebase slack.

Merge-train unchanged: **#126 → #125 (`eb92b375`) → #127 restacked → #100**; #119 `b65d23c6` after restart + CP train + verify-smoke.

---

## (c) Plan B — RC day + 5-day test (restart Thu ~18:00 CET)

**Mid hours:** Backfill 42.5 · Gen 41.25 · Saves 38 · Hire2 34 · Features 32 · Hire3 21 · Arch 12.5.
**High hours:** Backfill 50 · Gen 47.5 · Saves 44 · Hire2 40 · Features 36 · Hire3 24 · Arch 15.

| | Eng days (longest lane ÷ 8) | +1 HoQA + ~0.5 slack | **RC working day** |
|---|---|---|---|
| **Mid** | Backfill 42.5/8 = **5.3** | +1.5 | **~6.8 ≈ day 7** |
| **High** | Backfill 50/8 = **6.25** | +1.5 | **~7.8 ≈ day 8** |

(A)/(C) not re-dated here; parallel rulings apply to recommended **(B)** only. Prior serial pole (~8–8.5 mid) is superseded.

### 5-day hours check (40 h/lane)
| Lane | Hours | vs 40 |
|---|---|---|
| Features | 28–36 | OK |
| Generalist | 35–47.5 | **FAIL** mid 41.25 / high 47.5 |
| Saves | 32–44 | OK mid 38 / **FAIL** high 44 |
| Backfill | **35–50** | **FAIL** mid 42.5 / high 50 — **sets the pole** |
| Architect | 10–15 | OK |
| Hire 2 | 28–40 | OK (high at cap) |
| Hire 3 | 18–24 | OK |

**5-day verdict: FAIL.** Pole lane = **Backfill**. Calendar RC ~**day 7** mid / ~**day 8** high with the 1-day QA placeholder; with HoQA's 13–19 QA h on the pole, ~**day 7.6–8** mid / ~**8.6–9** high.

### One-more-move (not applied) — quantify only
Shift **session-end-base 10–14** off Generalist → Architect, or → Hire 3 after streak:
- Gen becomes **25–33.5** (passes 5-day hours).
- Architect would be **20–29**, or Hire 3 **28–38**.
- **RC day unchanged** (pole stays Backfill 35–50 → still ~6.8 / ~7.8).
- **5-day still FAIL** on Backfill unless Backfill is cut or further rebalanced (~3 h mid / ~10 h high over 40).

---

## (d) HoE recommendation

- **Plan (B)** with parallel-build rulings. Specs: `engineering/hiring/hire-2-spec.md` (Hire 3 §3).
- **Lane totals (B):** Features **28–36** · Gen **35–47.5** · Saves **32–44** · Architect **10–15** · Backfill **35–50** · Hire 2 **28–40** · Hire 3 **18–24**.
- **RC day (B):** ~**7** mid / ~**8** high after Thu ~18:00 CET. **5-day: FAIL** (Backfill pole). CEO re-dates from this.
- **sim-complete sha:** TBD (#126→#125→#127→#100; #119; risk-helpers; refill; broody; clockWage; #123; `worker_paused`).
- Refill: Saves; G0 day 1; Features Shift vs G0; Hire 2 clockWage vs G0 parallel; no SAVE_VERSION bump.
- QA columns: **filled by HoQA** (QA-D-1110-FLAGTABLE). With 13–19 QA h on the pole, RC plan B = **~day 7.6–8 mid / ~8.6–9 high**; 5-day still **FAIL**. ~22 PR bars, ~60–75 QA h (Saves QA / UI QA ~30–38 h each), which fits only if Ready dates are spread out. QA's 14-point cap cannot cover this plan, so the CEO sets a QA budget at the restart.
- Hires: Hire 2 821caad7 (clockWage + pause UI), Hire 3 dec9a396 (streak/tapCoins UI), parked until the restart (D-CEO-20261110-13).

---

## §Conflicts — RESOLVED (2026-11-10 ~02:10 CET; parallel-build rulings applied to plan B)

| # | Was | Ruling |
|---|---|---|
| 1 | Golden UI 9–11.5 vs audit ~18 | **Generalist 9–11.5** if F6 first (11.5–14.5 slim mount). Audit ~18 double-counts F6 + treats UI as greenfield. |
| 2 | Streak/tapCoins UI 11 vs audit ~24 | **18–24, plan 20** (engineer reconfirm). Under **(B)** → Hire 3. |
| 3 | Pause UI on Saves 10–14 vs Features ~8 | **OFF Saves; 8–12 h.** Saves keeps `worker_paused` (~1) + #119. Under **(B)/(C)** → Hire 2; under **(A)** → Gen after golden. |
| 4 | autoRefill "unowned" | **Saves sim** (in refill 19–27) + **Features UI** (Shift). Not Hire 2. |
| 5 | Refill UI "unowned" | **Features Shift** is Refill UI of record. Pins: sheet `m5-refill-flows.md` `43828d0b`; Boost `m5-abilities-flows.md` `fc1ca17d`. |
| 6 | Art pin dual citation | Both: sheet=`43828d0b`, Boost=`fc1ca17d`. |
| 7 | Features order F6→Shift→streak vs Shift→F6 | **PR-B → F6 → Shift → streak** (streak off Features under B). F6 plan **6–8**. Baseline Features w/ streak **46–60**; under B **28–36**. |
| 8 | Breeds UI owner gap | PR-A Architect `bd5b068a` (Vadim push yes); PR-B Features ~7 h. |
| 9 | #119/#125 fix hours gap | **Done.** #119 `b65d23c6`; #125 `eb92b375` in HoQA re-bar. Not in Saves remaining 32–44. |
| 10 | Saves long-pole 39–55 vs 30–42 | **32–44** after pause UI removed and #119/#125 done. |
| 11 | Architect for clockWage | **Override → Hire 2** (18–26). |
| 12 | TEL-AC1 / hide rotate | **Architect CONFIRMED 7–11** (+ Refill review 3–4 = 10–15). |
| 13 | Manifest rows 12/14/31 stale | **Fixed by Architect** (`v5-rc-manifest.md` sha256 `629f6520…`). Gap dropped. |
| 14 | UI-build-state tip `f20b918` | Prefer audit on `d65391b` for combined state. |
| 15 | collection-cost / #127 in lane totals only | Kept; #127 restack includes **m1** on `eb92b375`. |

