# QA re-review: failure-cost v0.3.19, rc2-refill v1.3 and lighter-refill v0.8.10 (D-PMW-2026-10-30-09)
**2026-10-30 13:12 CET · Head of QA (executor) · paper only · QA-D-1030-FC0319 · no messages sent, no product/ files edited.**
This review checks PMW's fixes against HoQA's 12:45/12:46 points (QA-D-1030-M5QA: Major 1 markup, Major 2 name source, Minor AC-FC17 (b) figures) and the 12:48/12:49 points (253px floor, constant-width wording, AC-FC13 L121).

## Overall verdict: **ACCEPT-WITH-NOTES**
Both Majors and the width Minor are fixed. Two notes don't block acceptance:
- Lighter-refill's ACs still spell the event `refill{…}` (FAIL, Minor). A normative mapping at L62 covers them.
- Telemetry v0.6.2 doesn't list the refill events yet. That's HoE's allowlist gap 9.

## Hashes (sha1 computed on disk 13:07–13:11 CET)
| File | Claimed | On disk | OK |
|---|---|---|---|
| product/workers/m5.1-worker-failure-cost-proposal.md v0.3.19 | 4f5bbc5c18f04bf3c1952ce9b2d6ef4f313d5984 | 4f5bbc5c18f04bf3c1952ce9b2d6ef4f313d5984 | yes |
| product/workers/rc2-refill-proposal.md v1.3 | 2fdd84a21a9a20ce095f540ce154293eab6ac1a4 | 2fdd84a21a9a20ce095f540ce154293eab6ac1a4 | yes |
| product/workers/m5.1-lighter-refill-proposal.md v0.8.10 | f71e45161c14382772e8f76f543452164c51b3b1 | f71e45161c14382772e8f76f543452164c51b3b1 | yes |
| frozen lighter v0.8.9 `.3b64af39.md` | 3b64af39… | 3b64af39abfeccc9ac5b14c924f1e934244cd8a9 | yes |
| product/m5.1-kickoff-package.md rev 6 | d9125b12… | d9125b120ec68b1f9542296d193036b3fb423ce2 | yes |
| product/m5-gate-acs.md, Workers section only | 56446be6… | 56446be633a24bf6f0d9a709c5ce20cfcc46402c | yes |
| product/m5-gate-acs.md, whole file | d1a021ff at PMW write | now 016641d8ada1bbd3f8e4e31f33e1d6a1f1a01e98 | moved, see below |

The whole gate file has been rewritten by other sections since PMW's write: c86a93f8, then f8c85fe0 (PMC), then 0b049c1b (PMC header), now 016641d8. Its Workers section still matches PMW's claimed 56446be6.

Diffs reviewed:
- failure-cost: `.5ffe4103.md` vs live, plus the v0.3.18 `.af9850b5.md` text.
- rc2: `.6f0b95ea.md` vs live.
- lighter: `.3b64af39.md` vs live.
- gate file: frozen `m5-gate-acs.3ae96752.md` Workers section vs live.

## Verdict per point

### 1. Major 1, refill accessible name uses the exact #83 markup: **PASS**
- failure-cost L106 (AC-FC10), L113 (AC-FC13 Rule) and L163 (AC-FC20) give a fixed DOM order:
  1. the text node "Next charge in";
  2. an empty, text-free `<span aria-hidden="true" data-cd="0:42">` drawn by `::after{content:attr(data-cd)}`;
  3. a `.sr` span " progress, {Role}".
- The resulting name is "Next charge in progress, {Role}".
- The v0.3.18 "aria-hidden ::after span" wording is struck in all three places.
- rc2 v1.3 L190 says the same thing.
- I checked the citations read-only in /workspace/wt-m41-p2 @ ba398b6aeb0f:
  - `src/ui/app.ts:98` has `span.nav-cd aria-hidden="true"`.
  - `src/ui/styles.css:601` has `.nav-cd[data-cd]::after{content:attr(data-cd)…}`.
  - `src/ui/styles.css:169` has `.sr{position:absolute;…clip:rect(0 0 0 0)}`.
- No aria-label: L55 and L106 restate "Never `aria-label`", and the markup has none.
- #83's `tabular-nums` is explicitly not adopted (B-4, L106).
- **Note N1 (non-blocking):** #83 puts the separator inside `data-cd`. `navManageView` (workers-ui.ts:176) returns `` ` ${fmtCooldown(cd)}` ``, which has a leading space and needs `white-space:pre`. The spec's example is `data-cd="0:42"` with no space, and it doesn't say where the space between "in" and the digits comes from. The visible text must be exactly "Next charge in 0:42". QA will assert the rendered visible string, so either form passes, but PMW should say which form is meant at the next touch.

### 2. Major 2, names come from `.sr` content, with a no-digit check: **PASS**
- L106 gives the name source:
  - no `aria-label` attribute;
  - 0 charges: "Next charge in" + the aria-hidden data-cd span + `.sr` " progress, {Role}";
  - Rested: visible text + `.sr` ", {Role}";
  - Enabled and Unpaid: "Refill" + `.sr` ", {Role}" (FC-N1, also L123).
- L106 also adds the check: no digit in the computed name in any state, read via CDP `Accessibility.getFullAXTree` and Playwright `ariaSnapshot`, and no `aria-label` attribute. L163 and L190 say the same, and so do rc2 L191–L201.
- `.sr` is `position:absolute`, so it is not a flex item and doesn't count toward width (L106, L148, rc2 L195). That meets Art's condition.
- **Note N2 (test design, not a spec defect):** axe `label-content-name-mismatch` only applies to widgets that have `aria-label` or `aria-labelledby`. With no aria-label, the "= 0" bar in L106, L163 and the gate rows holds trivially, because the rule is inapplicable. QA's cases must therefore also assert the exact computed name string (CDP + ariaSnapshot) in all 3 engines and record the axe rule as "inapplicable, not passed". This goes into the RF B4 and CW B5 cases. No spec change is needed.

### 3. Minor, width bar and the stale figures: **PASS**
- The bar is stated consistently in five places: AC-FC13 Format (L116), Constant width (L121), AC-FC17 (b) (L148), B-4 (L84) and rc2 L199. Each says:
  - `min-width:253px` (inner ≥ 201px at 360; 201 + 48 padding + 4 border = 253);
  - `flex:1 1 0`;
  - 1 line, `scrollWidth ≤ clientWidth`;
  - constant width ±0.5 px across all labels at each viewport (about 276 px at 360, 316 px docked);
  - measured after `document.fonts.ready`, 3 engines × 360/390/1280.
- **AC-FC13 L121 is fixed.** The v0.3.19 bar leads the item. The old 208 px "Refill in 0:00" reference test is struck. The v0.3.16 erratum's "label widths and the 208px min-width still hold" is struck with the v0.3.19 note. The label list is now "Next charge in 0:01 / 0:42 / 2:22 / 2:30 / 9:59", "Refill" and "Rested, refill below 50%".
- **AC-FC17 (b) at L148:** "exactly 208 px wide (±0.5 px)", "Refill in 2:22" 202.58 px and "≤ 204 px natural / ≥ 4 px headroom" are struck, and the text says they no longer apply.
- Other 208 references:
  - L120 Range: the 209.34/208 width clause is struck, and the ≤599 s cap is kept for m:ss.
  - §7 L174, L176 and L181: marked historical or superseded.
- **Note N3 (non-blocking, residual stale text):**
  - The AC-FC13 test cases L125–L135 still quote "Refill in m:ss". The blanket v0.3.17 mapping at L124 maps them to "Next charge in m:ss".
  - Case (iv) at L128 still ends "Width equals the 'Refill in 0:00' reference (B-4)". That reference test no longer exists (L121), so it should read "width constant ±0.5 px per L121".
  - L120 still quotes "Fit PASS … 'Refill in 9:59'" from the old card fit.
  - Clean these up at the next touch. QA cases L121/L148 govern.

### 4. rc2-refill v1.3: AC-RF2 superseded, telemetry fields: **PASS (with note)**
- AC-RF2 is marked superseded at both places: L44 (v1.1 list) and L139. Both read "Label, name, disabled-state and width text superseded by v1.3 below."
- The v1.3 errata section (L188–L201) lists what replaces it: the label, the names, `aria-disabled` only (never `disabled`), the entry point (sheet row + nav only, card [pause][Manage][call]) and the widths and axe bar.
- The header is bumped to v1.3 (L1), which closes gate gap 3.
- Telemetry, L203–L209:
  - `refill_used {worker, energy_pct, charges_left, rank_by_risk, by, sheet_id, entry_point, stall_id?}`;
  - `shift_sheet_opened {entry: nav|card|stall_chip, sheet_id, stall_id?}`;
  - `rest_toggled {…, sheet_id, entry_point, stall_id?}`;
  - a deterministic `sheet_id` join;
  - the `manage_used` alias kept.
  - These are consistent with lighter v0.8.10 L62 and with gate RF-AC10.
- **Consistency with telemetry v0.6.2** (`product/collection/telemetry-spec.md` v0.6.2): there is no conflict, but none of these events are in v0.6.2. They're missing from the §3.1 schema allowlist (L45–L53) and from the `isPinned` set (L60–L67). rc2 L210 and gate gap 9 already route the allowlist and pin change to HoE.
  - **Note N4:** these events won't pass T-AC9 (export against schema.ts) until HoE adds them to the allowlist. Track it as a v5 gate prerequisite, owned by HoE.
- **Note N5 (pre-existing, not a v1.3 regression):** Econ's `product/workers-rf5-telemetry-addendum.md` asks for `refillable_n`, `charges` (before the tap), `chosen_worker`, `best_worker` and `lowest_worker` on `refill_used`. They were never folded in, and v1.3 lists only `rank_by_risk`. PMW and Econ should decide whether AC-RF5's playtest check still needs them before the allowlist is frozen.

### 5. Lighter-refill v0.8.10, `refill` renamed to `refill_used` everywhere: **FAIL (Minor, non-blocking)**
- What's done: L62 strikes the old line and defines `refill_used{…}` with `charges_left` replacing `charges_after`. It also says "Every `refill{…}` in this spec's ACs … reads `refill_used{…}`". The changelog is at L107, and gate rows AR-AC2, AR-AC3, AR-AC5 and AR-AC6 now read `refill_used{…}`.
- What's not done: the AC bodies still use the old event name 7 times:
  - L69 AC-LR1 `refill{by:"auto"}`
  - L84 AC-LR13 `refill{by:"auto", energy_pct:0}`
  - L86 AC-LR15 `refill{by:"manual"}` and "exactly one `refill` event"
  - L90 AC-LR19 `refill{by:"auto"}`
  - L91 AC-LR20 `refill{by:"auto", energy_pct:0}`
  - L94 AC-LR21 (b) `refill{by:"auto", energy_pct:0}`
- That doesn't meet "renamed everywhere". The L62 mapping is normative, so the ACs can still be tested, which is why this doesn't block acceptance. Fix: rename in place at the next touch.
- Sweep of product/ (live files, excluding frozen `.<sha>.md` and bak files): the only other hits are rename records. Those are in rc2 L203/L208, product/decisions.md L1744, the m5-gate-acs.md lighter Spec line (L357), kickoff L12 and sales-stopped-spec L268. None is a live use.
- Sweep of qa/: one hit. QA's own `qa/m5/test-plan-sales-stopped.md` L187 SS-G29 says the name differs between lighter v0.8.9 and rc2 v1.3, and that's now resolved. **HoQA follow-up:** close or update SS-G29. PMW supplied `sheet_id`/`entry_point`/`stall_id`, and SS-36 switches from the 60 s fallback once built (spec v1.3.22).

### 6. Gate file Workers section (RF-AC3 / RF-AC8 / RF-AC10 / CW-AC10 / CW-AC11), and HoQA lines unchanged: **PASS**
- RF-AC3 and RF-AC8 have the #83 DOM order, no `aria-label`, names from `.sr`, the Unpaid name, the axe bar and the no-digit check. They cite failure-cost v0.3.19 4f5bbc5c and rc2 v1.3 2fdd84a2.
- RF-AC10 has the v1.3 telemetry fields and the join.
- CW-AC10 has the same markup and names plus the 253/201/`flex:1` width bar with constant width ±0.5 px. CW-AC11 has the card and sheet flow with the same names.
- Art is now cited as signed v1.0 6173f757 (L69), and gate gap 9 (HoE allowlist) was added.
- **HoQA QA lines are byte-identical.** I extracted the 5 Workers `- QA: (HoQA …)` blocks (20 lines) and they hash the same in all three versions: `m5-gate-acs.525435d0.md` (HoQA's 12:51 write), the frozen pre-PMW `m5-gate-acs.3ae96752.md`, and the live file. sha1 of the extract: cb6d48985e0a3c90b3781f583e9726a89baba1ca. The full Workers-section diff, 3ae96752 vs live, touches only PMW lines.
- **HoQA follow-up:** being untouched, those QA lines are now stale. HoQA re-cites them, since PMW must not edit them:
  - The RF block cites spec `6f0b95ea` + failure-cost v0.3.18 `af9850b5` and "Art flow v1.0 not yet signed".
  - The AR block cites v0.8.9 `3b64af39` and "Art flow pending".
  - The CW block cites v0.3.18 `af9850b5` and AC10/11 "Art sign final after AC-RF2 errata".
  - New targets: 4f5bbc5c / 2fdd84a2 / f71e4516, Art refill flow: NO signed revision yet (6173f757, 580bfb50, b7b467e2 and 7c038716 are unsigned drafts, per Art 13:14). Pin only the sha that art-ux/decisions.md records as signed (target ~13:45, cap 15:00), plus Note N2 in the RF B4 and CW B5 cases.

## Other observations
- **Art's flow file has moved on.** `art-ux/m5-refill-flows.md` is now v1.0.1, sha1 580bfb50fdff1cff425e2962548f22d7879cd011 (errata only). Its §8.2/L176 now says names come from `.sr`, with no aria-label. That closes PMW open item (1).
  - The specs and gate file still cite v1.0 6173f757. That's fine for a record-only erratum, but re-pin at the next touch.
  - The v1.0.1 header is stamped "2026-10-30 13:30 CET", which is later than the time it was found on disk (about 13:10). Treat the stamp as unverified.
- The old #83 nav cooldown still uses `aria-label="Refill tired workers"` (app.ts:98). That's the nav button, not the sheet-row button, so it's out of scope here, and the "never aria-label" rule covers the sheet-row Refill only.

## Harness and probe follow-ups for UI QA
I swept `artifacts/v5-ui/harness`, `harness-rc` (frozen bb28040f) and `harness-rc-next`, excluding out/results/test-results and self-test copies:
- **Old event name:** no probe emits or asserts the event `refill`, `refill{` or `charges_after`. The `'refill'` hits in `tests/p2-r17-rules.test.mjs` L65/L67 (all three trees) are visible-text checks on the rc1 nav cooldown, not event names. No change.
- **Old width or name figures:** no probe uses 208 / 202.58 / ≤204 / "Refill in m:ss" / "Next charge pending". That's because the rc2Refill (P4), autoRefill (P5) and clockWage (P6) probes aren't authored yet.
- **To do (UI QA):**
  1. `harness-rc-next/plan/case-index.md` L218–L220 (AC-LR14 / LR17 / LR18) cite lighter-refill `3b64af39`. Re-pin them to v0.8.10 `f71e4516`. The line refs L85/L88/L89 are unchanged in v0.8.10.
  2. Author P4 (rc2Refill) and P6 (clockWage) against failure-cost v0.3.19 L106/L121/L148/L163 and rc2 v1.3 L188–L201:
     - the #83 DOM order;
     - no `aria-label` attribute;
     - the exact computed name via CDP getFullAXTree + ariaSnapshot;
     - the no-digit regex in all 3 states;
     - axe rule recorded as inapplicable (N2);
     - `min-width:253px`, `flex:1`, inner ≥ 201px at 360;
     - constant width ±0.5 px per viewport across "Next charge in 0:01/0:42/2:22/2:30/9:59", "Refill" and "Rested, refill below 50%";
     - the visible string "Next charge in 0:42" exactly (N1).
  3. Author P5 (autoRefill) against `refill_used{by:"auto"…}` with `charges_left`, using lighter v0.8.10 L62 and gate AR-AC2/3/5/6, not the stale AC bodies at L69/L84/L86/L90/L91/L94.
  4. `wk51.mjs` (cf8d8ff8, identical in all three trees) covers only AC-LR14/17/18 and contains no event name or width figure. No change beyond the re-pin in item 1.

## Notes for PMW (non-blocking; fold in at the next touch)
- N1: say where the space between "in" and the digits lives (in `data-cd`, as #83 does, or as a trailing space in the text node).
- N3: failure-cost L128 case (iv) "Width equals the 'Refill in 0:00' reference" should become constant width per L121. Also clear the leftover "Refill in" strings in L120 and L125–L135.
- N5: decide with Econ whether the RF5 addendum fields belong on `refill_used` before HoE freezes the allowlist.
- Point 5: rename the 7 AC-body `refill{…}` / `refill` occurrences in lighter-refill (L69, L84, L86 ×2, L90, L91, L94) to `refill_used{…}`.
