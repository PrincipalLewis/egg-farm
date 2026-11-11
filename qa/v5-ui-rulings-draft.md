# HoQA rulings on UI QA V5-U prep, Q1–Q14 (SENT 20:50 Oct 29; [QA-D-1029-V5U])
Draft for Head of QA · 2026-10-29 ~20:45 CET (Europe/Belgrade, UTC+1) · Source: UI QA plan `artifacts/v5-ui/plan.md` (sha1 0257d89d) L145–159 · Gate: D-CEO-20261029-01 (decisions.md L41–47, sha1 dc672cd9).
No message sent and no spec edited. This file is the only one written. Sha1 values are 8-char prefixes of `sha1sum` run 2026-10-29 ~20:40 CET.

**Inputs checked** (sha1): v5-rc-manifest 5f05f205 · engineering/decisions.md caedf6d4 · product/decisions.md 251c69cb · qa/decisions.md 6a196500 · qa/queue.md a550bc2c · m4.1-p2-scope f0524447 · m5.1-kickoff-package 46562507 · sales-stopped-spec v1.3.10 2c2c323b · test-plan-sales-stopped v0.5 16b3c663 · zero-gain UI v0.3.5 1098f14e · Art ZG v1.4 14ec8850 · rc1-asleep v1.0.12 666e8fd5 · test-plan-patch1 7aba9297 · m4.1-ui-minors 05ed7f02 · art package 2bdaf93b (frozen acfe36a7 in art-ux/scratch/m41-minors-m8m9/) · breeds-ui v0.2.7 f349f29f · failure-cost live v0.3.15 f1c6cce3 (build pin 393e69f6) · lighter-refill live v0.8.9 3b64af39 (build pin 08d12ac7) · qa/v5-saves/v5-saves-cases.md a11f6f83 · `artifacts/v5-ui/specs/SHA256SUMS`: 11/11 OK.
Code read at main 22eac98 (worktree qa/wt-v5saves-22eac98): `src/config/balance.json` has `m4.enabled`=1 and no `m4.flags`; the only `eggfarmQa*` globals are `eggfarmQaFitBanners`/`eggfarmQaRecovery` (src/ui/app.ts:737/739); `tests/bot-m4.ts` has no hook/observer.

## Summary table
| Q | Ruling (short) | Follow-up owner | Blocks RC gate? |
|---|---|---|---|
| Q1 | UI-M5-1 / UI-WARN gates: `.st` = exactly "Unpaid" + inline SVG warn icon, no U+26A0. TP1-U1's "Unpaid ⚠" describes old code and is superseded. | HoQA fixes TP1-U1 text (QA doc); optional note via HoP → PMW on rc1-asleep L121 | No |
| Q2 | No new seam. TP1-C2 runs on a save fixture (Saves QA's S-OFF method) plus the accepted `eggfarmQa.worker.set`. The test asserts the D-HOP-17 restriction; the welcome-back line text is AC-FC12's. | UI QA builds it with Saves QA's lib; no HoE ask | No (prep must be done before the RC) |
| Q3 | Accepted as an equivalent proof, with conditions: show that the sim module graph doesn't overlap p2's diff, plus import isolation, plus goldens at the **v5-p2 piece gate**. If they overlap, do a real file revert in a /tmp variant. | UI QA; HoE supplies p2 commit list | No |
| Q4 | Blocker. Ask HoE for a committed observe-only hook in `tests/bot-m4.ts` (and `tests/bot-m5.ts` for m5x-casual). FX-F27s is prep only and never PASS evidence. | HoE (Architect) | **Yes** for ZG-AC5/7/20 trace parts and the FX-F27 parts of ZG-AC11/14 (N/A only if ZG is cut) |
| Q5 | "Farm banner" = M5.0 Rule 3 (SS-12/20/23/25, a UI-lane gate). The sticky Refill bar is p2-scope item 3, a **gated** AC, not exploratory. | UI QA | No (they become gated cases) |
| Q6 | Art minors **gate** in UI QA: p2-scope item 1 + item 5, ACs in m4.1-ui-minors 05ed7f02. They also go into the Art shot set. m11 is out. | UI QA; HoE ships UI-M5-8 unit test | No |
| Q7 | Pins of record = the manifest: p2 f0524447, M5.1 package 46562507, SS v1.3.10 2c2c323b. d32b73fc/0ceb56e7 are stale CEO citations (old 8-char sha1 prefixes) and match no file. | HoQA updates the SS test-plan header pin (QA doc) | No |
| Q8 | Paths are `m4.flags.zeroGainUi` / `m4.flags.bestBuyV2`, not `m5.flags.*`. The confirm path and every flag's ship value are not recorded yet. ZG ACs run with the flag on regardless (spec run condition). | HoE/Architect: paths + ship-value column in the manifest; HoP confirms scope | **Yes** for the variants step and the as-shipped baseline/Art set until recorded; ZG ACs themselves don't wait | [CLOSED 21:10, QA-D-1029-Q8: m4 namespace paths per manifest ship-value table]
| Q9 | mh_paused uses the accepted `eggfarmQa.worker.set(id,{paused:true})` (N/A if Pause is cut and the cause is unreachable). `other` needs a build:qa force-cause seam. Injected text = UNVERIFIED, never PASS. UI QA's set is the Art set. | HoE seam; HoP → PM Market text fix on SS-17 "UI/Visual Designer shoots" | **Yes** for the `other` cells (and mh_paused if Pause ships and the setter is missing) |
| Q10 | The SS-15 Rule 2 share guard isn't UI QA's case. It's a pure-selector unit test in Saves QA's lane. UI QA only checks that the HUD chip never shows NaN/∞ text (SS-24). | Saves QA; HoE names the function | No (for V5-U) |
| Q11 | If Breeds UI lands in rc/v5, UI QA shoots it (D-CEO-20261028-02) and runs its UI ACs. If it's cut or ships flag-off, the shots are N/A and only flag-off no-regression runs. | HoE says if it's in; breeds seam on demand | Conditional |
| Q12 | Accept current stable (Chrome 156, FF 157, WK 27.2); no spec pins a version. Record exact versions/builds in the results manifest. A fail is a fail. | UI QA; Art if rects shift | No |
| Q13 | Split per each plan's own §0 role table: UI-lane rows → UI QA, Saves-lane rows → Saves QA, all on the one RC. Gaps (M5.1 workers UI, breeds UI) are assigned too. | HoQA updates queue rows V5-U/V5-S | No (but every row must run at the RC) |
| Q14 | Neither post-hoc triage nor a blind re-baseline. Pre-declare, before the run, an explicit list of p1 name assertions superseded by AC-R17 (checked by TP1-R17a–c). Any other p1 diff = regression FAIL. | UI QA | No |

## Q1: TP1-U1 "Unpaid ⚠" vs UI-M5-1 "Unpaid" + SVG
**Ruling.** UI-M5-1 + UI-WARN-1..7 gate: the unpaid `.st` text is exactly "Unpaid" with the inline SVG warn icon (aria-hidden), and it contains no U+26A0. TP1-U1 asserts that form. The "Unpaid ⚠" string in TP1-U1 is a stale description of the pre-p2 code, so assert it only as a negative (no U+26A0 present).
**Evidence.**
- m4.1-p2-scope f0524447 L7–10: item 1 puts "m5 SVG warn and moon icons on the card state word; no-emoji test UI-M5-8" in p2 scope.
- m4.1-ui-minors 05ed7f02 L203 (UI-WARN-1: `.st` exactly 'Unpaid', no U+26A0) and L297 (UI-M5-1).
- rc1-asleep v1.0.12 666e8fd5: L121 only describes the code ("the code renders 'Unpaid ⚠'"). L123 flags the glyph against Art's no-emoji rule as "not in this patch's scope" (that was p1). L30's requirement ("red states keep their text and ⚠ icon") is met by the SVG warn icon.
- test-plan-patch1 7aba9297 L17 is QA's own document.

No spec AC requires the glyph, so this downgrades nothing.
**Follow-up.** HoQA edits TP1-U1's expected pill text to "Unpaid" + SVG warn (QA-owned doc). Optional, non-blocking: HoP asks PMW to add a pointer to UI-M5-1 at rc1-asleep L121.
**Blocks gate:** No.

## Q2 (blocker claimed): TP1-C2 welcome-back with unpaid/asleep workers
**Ruling.** Not a blocker and no new seam. This is the cheap, deterministic route:
1. On the RC's `build:qa`, put MH Asleep or Unpaid with the accepted setter `eggfarmQa.worker.set(id,{energy:0,unpaid})`.
2. Let the game write its save, then cold-load that save with `savedAt` moved back ≥ 60 s (2 h). Use Saves QA's `seedLS` method from qa/v5-saves/scripts/lib.mjs (S-OFF-2h).
3. Assert:
   - the welcome-back shows;
   - after closing it, the MH banner reads exactly "Market Hand asleep/unpaid: sales stopped";
   - "auto-selling stopped" appears **only** in the asleep toast and the welcome-back sheet, never in a banner or chip (D-HOP-17 is a restriction: "only in").
   - With `m4.flags.clockWage` at its ship value: the toast text is AC-FC9's ("Market Hand fell asleep. Auto-selling stopped, wage still running."), and the welcome-back line follows AC-FC12 ("{Role} slept {t} and was paid $Y", only if Y > 0).

Don't assert "auto-selling stopped" inside the welcome-back line. No current spec puts it there.

**Evidence.**
- test-plan-patch1 L21 (TP1-C2).
- product/decisions.md L681–684: D-HOP-2026-10-24-17 ("auto-selling stopped is used only in the toast and welcome-back line").
- rc1-asleep L55.
- sales-stopped-spec L471: toast and welcome-back are not M5.0 surfaces.
- failure-cost 393e69f6 L37–38 and L89/L94 (AC-FC9 toast, AC-FC12 welcome-back line). These are delivered by manifest row 26 (clockWage), not by p2.
- Main 22eac98 has no toast or welcome-back worker line (`grep "auto-selling\|fell asleep" src` → none).
- qa/v5-saves/v5-saves-cases.md a11f6f83 L43 (S-OFF method: savedAt moved back, "sum covers state only").
- Setter accepted by HoE: sales-stopped-spec L274/L362; test-plan-sales-stopped L30.

**Follow-up.** UI QA writes the case, reusing Saves QA's lib and fixtures (tell Saves QA, no new ask). There is no HoE seam. If `worker.set` is missing on the RC, that's a general seam failure (see HoE request).
**Blocks gate:** No, but the case must be built before the RC run. If clockWage is cut, the toast/welcome-back positive parts are N/A and the banner/restriction parts still run.

## Q3: TP1-R15 / TP1-R17e "with vs without the UI change reverted"
**Ruling.** OK to skip building a revert, but only with proof that is equivalent by construction:
- (a) List the files changed by the p2 commits (P2a/P2b) and show none is in the module graph of the trace harness (`tests/bot-m4.ts` → src/sim, src/config, src/save). A revert of files outside that graph gives a byte-identical trace.
- (b) `import-isolation.txt` shows sim/save import nothing from ui/.
- (c) E-4 goldens unchanged at the **v5-p2 piece gate** (p2 vs base 22eac98, manifest row 3: "gated by unchanged goldens + Art").

Don't use f90d1678/a54c9cf9 on the combined RC as R15/R17e evidence. The M5.0 CSV 8dc90e2b, farm_cost r27–29 and the M5 sim are expected to move them, and the RC goldens are whatever HoE commits.
If (a) finds an overlap, make a real revert: in a /tmp variant, `git checkout 22eac98 -- <overlapping p2 files>`, then run the trace harness on both and compare hashes. That's cheap and needs no new build.
**Evidence.**
- rc1-asleep L108 (AC-R15: "same SHA with the rule's UI changes reverted… no old build") and L149 (AC-R17 trace clause).
- test-plan-patch1 L15/L43.
- manifest L29 (p2 flag-exempt, gated by unchanged goldens + Art).
- plan.md L46/L148 (UI QA notes a54c9cf9 only if M5 changed no sim).
- run-rc.sh L100–102 (isolation step).

The AC's property (UI change → no sim change) is fully proven, so nothing is downgraded.
**Follow-up.** HoE/UI engineer e80556fd names the p2 commit SHAs in the v5-p2 manifest row (needed for (a)).
**Blocks gate:** No.

## Q4 (blocker): ZG trace parts need the observe-only hook
**Ruling.** Confirmed blocker. The spec requires a **committed** observe-only hook in `tests/bot-m4.ts` (seller15 + cheapest, seeds 1–200, every post-action state). ZG-AC7's second run also requires `m5x-casual` via `tests/bot-m5.ts` after the port reaches parity.
FX-F27s (layout substitute) is prep only. FX-F27 is defined as the first qualifying trace state on seed 1 seller15, so ZG-AC11/14's F27 parts and the AC5/7/20 trace parts stay UNVERIFIED (not PASS) until the hook lands. QA doesn't waive them. If ZG is cut, they're N/A.
**Evidence.**
- zero-gain UI 1098f14e:
  - L266: FX-F27 definition.
  - L299–302: F11 traces, observe-only hook, m5x-casual REQUIRED, no numbers before parity.
  - L337 (AC5), L342–345 (AC7), L374–375 (AC11), L377 (AC14), L435–440 (AC20).
- `tests/bot-m4.ts` @22eac98 has no hook (grep observe/hook → none).
- qa/m5/test-plan-bb-stopgap.md 9b34ea0b L17: the same hook serves the SG traces and must leave SG-4 hashes unchanged.
- REQUIREMENTS.md 3e91d1d9 L4 (bot-m5 port, Architect).

**Follow-up.** HoE → Architect (owner of bot-m5, manifest row 2). See the seam request below.
**Blocks gate:** Yes, for those ZG parts.

## Q5: "Farm banner" and the sticky Refill bar
**Ruling.**
- "Farm banner" means the **M5.0 Rule 3 farm-screen banner** (sales-stopped spec). The p1 note only recorded that p1 had no AC for it.
- Promote EX-1 to gated cases: SS-12 (one alert per role), SS-20 M5.0 parts (exact strings), SS-23(a) (flag off → no Rule 3 banner) and SS-25 (§4.8 strings + Refill, `bannerFit`, `+N more`). All are UI-lane rows in the SS plan.
- The sticky Refill bar is **p2-scope item 3, a gated AC**: keyboard focus through the list at 360/390/1280 is never hidden under the bar (WCAG 2.4.11). Make EX-2 a gated case (Cr/FF/WK). An obscured stop is a FAIL, not UNVERIFIED. EX-3 stays as Art shots.

**Evidence.**
- sales-stopped-spec L286 (SS-12), L305 (SS-20), L314 (SS-25), L204 (flag gates Rule 3).
- test-plan-sales-stopped L20 (UI QA owns "Rules 2–4 surfaces") and L61/69/72/74.
- qa/m41/p1-30b29d3.md e8cb2bdd L92/L146 ("Farm banner / sticky Refill bar: in no AC (HoE note)", true at p1 only).
- m4.1-p2-scope L15 (item 3 + test).

**Follow-up.** UI QA.
**Blocks gate:** No (they're gated cases now).

## Q6: Do the Art minors gate in UI QA?
**Ruling.** Yes. p2-scope item 1 makes the m8, m9, m5, m6, m1 and m10 ACs in m4.1-ui-minors 05ed7f02 p2 ACs, and item 5 (refund pop doesn't cover `#rate`) is one too. p2's gate list has "HoQA / UI QA PASS" and the Art pass as separate gates.
UI QA runs the testable ACs (e.g. UI-WARN-1..7, UI-M5-1..7, UI-M9-6, m10 ≥ 4.5:1) as PASS/FAIL. Art signs from the same shots. UI-M5-8 is an engineering unit test: check that it exists and passes in the gates step. m11 is backlog, not in p2.
**Evidence.**
- m4.1-p2-scope L7–13 (item 1), L17 (item 5), L19–23 (gates).
- m4.1-next-patch-art-package 2bdaf93b vs frozen acfe36a7: the diff is only the m11 backlog row and two log lines.
- m4.1-ui-minors L297–304.

**Follow-up.** UI QA adds the minor ACs as cases. HoE/UI engineer must include the UI-M5-8 test.
**Blocks gate:** No.

## Q7: Pins of record
**Ruling.** Pin to the manifest (spec pins sha1-verified 2026-10-29):
- p2 scope `engineering/m4.1-p2-scope.md` f0524447;
- M5.1 package `product/m5.1-kickoff-package.md` 46562507 (5107f8c6 is superseded by the HoP 20:00 re-pin; only the lighter-refill row pointer changed);
- sales-stopped spec v1.3.10 2c2c323b.

d32b73fc and 0ceb56e7 are the CEO's citations. They're Oct 25 8-char sha1 prefixes of earlier file versions, not sha256, and no file on the box matches them. QA checked every *.md with sha1 and sha256: 0 hits.
The SS test plan v0.5 header still names v1.3.9 2609ba88. The v1.3.9→v1.3.10 diff is text only: L2 version, L85 242 px wording, the L291–298 SS-16 table re-layout with the same numbers, and L302. The test plan's own changelog (L183) already records "SS-G25 closed on v1.3.10, no case changes".
Also:
- The Art package of record for the build is acfe36a7 (p2-scope L7). Art signs against 2bdaf93b, which has the same p2 content plus the m11 backlog row. Freeze acfe36a7 next to the others.
- For P2a/P2b use rc1-asleep v1.0.12 666e8fd5. The queue's P2b eae29f97 is the older v1.0.10, and v1.0.12 contains its ACs.

**Evidence.**
- manifest L29, L64.
- product/decisions.md L1299–1300 (D-HOP-2026-10-29-01) and L1313 (new package sha1).
- engineering/decisions.md L213/L216 (D-HOE-20261029-02/-03).
- `diff scratch/sales-stopped-spec.v1.3.9.bak.md` (sha1 2609ba88) against the live file.

**Follow-up.** HoQA updates the test-plan-sales-stopped header pin (QA doc). Optional: the CEO's decisions.md citations could carry a pointer to D-HOP-2026-10-29-01. That's the CEO's call; flag it via HoE/HoP, don't edit.
**Blocks gate:** No.

## Q8: Zero-gain ship state and real flag paths [CLOSED 21:10, QA-D-1029-Q8: m4 namespace paths per manifest ship-value table]
**Ruling.**
- **Paths.** Use `m4.flags.zeroGainUi` and `m4.flags.bestBuyV2` in `src/config/balance.json`. Release flags were moved to the single `m4.flags.*` namespace, and the spec's `m5.flags.*` is a noted deviation. UI QA's guessed `m5.flags.zeroGainUi` is wrong. `m4.flags` doesn't exist until F3 (row 8) lands. The confirm tunable's path after the namespace move (spec: `m5.zeroGain.confirm`) is not recorded, so HoE must state it.
- **Ship values.** Recorded only for BBv2 (0, stays 0 at Latest). Row 34 says "all flags at ship values", but no ship-value table exists. The confirm tunable ships false ("OFF in M5.1").
- **Run plan.** The ZG ACs are independent of the ship value: they run with zeroGainUi on (spec run condition), AC12/19 with it off, AC10 only in the zg-confirm variant. So keep the default + zg-on/off/confirm variants. The ship value decides the "default/as-shipped" variant used by regressions and the Art set. The Art set uses that value once recorded; until then, prepare zg-on. BBv2 runs are N/A (ships off). The flag-on run is still N/A until the flag exists.

**Evidence.**
- manifest L10 (single namespace, default 0), L54 (row 28 `zeroGainUi` 0), L55 (row 29 BBv2 0, "stays 0 at Latest"), L34 (F3 creates `m4.flags.*`), L60 (row 34 "all flags at ship values").
- engineering/decisions.md L228 (D-HOE-20261029-05 flags).
- decisions.md L45 (BBv2 ships flag-off).
- zero-gain UI L146–147 (flag requires only `m4.enabled`, read at boot; confirm default false, off in M5.1), L297 (run conditions), L355 (AC10 only with confirm true).
- balance.json @22eac98: `m4.enabled`=1, no `m4.flags`.

**Follow-up.** HoE/Architect:
- confirm the exact paths;
- add a ship-value column for every `m4.flags.*` and tunable to the manifest before the RC gate.

HoP confirms the scope (which flags are on at Latest). If any piece ships off, its UI ACs run in a flag-on variant and the as-shipped check is "flag off = baseline".
**Blocks gate:** Yes, until the paths and ship values are in the manifest. It blocks the variants step and the as-shipped baseline and Art set, not ZG AC prep.

## Q9: SS-17 mh_paused / other need a seam
**Ruling.**
- **mh_paused.** Use the already-accepted `eggfarmQa.worker.set(MH,{paused:true})` (dev + build:qa only). The SS plan runs Pause cases on `paused:true` until the Pause flag exists. That drives the real chip path, so no new seam is needed if the setter honours `paused` with `m4.flags.pause` 0. If Pause is cut **and** `paused` is unreachable in the shipped build, the mh_paused cells are N/A under the cut rule, not FAIL.
- **other** ("Sales stopped · Sell all"). It has no natural trigger; SS-19 covers it only with HoE's vitest fault fixture. Request a build:qa-only `eggfarmQa.stall.force(cause)` (or equivalent) that renders through the real chip path. Without it, the injected-label run is recorded as UNVERIFIED, never PASS, and HoQA takes it to HoP as a scope question. QA does not waive it.
- **Screenshots.** UI QA's 3-browser set is the set of record (D-CEO-20261028-02). Spec SS-17's "UI/Visual Designer takes screenshots" is stale text.

**Evidence.**
- sales-stopped-spec L274 (worker.set energy/Unpaid/paused), L302 (SS-17 all 7 strings incl. mh_paused), L335 (setters under the X5 debug-hooks line), L362 (HoE BUILDABLE incl. setters, SS-19 fault fixture).
- test-plan-sales-stopped L30–31 (setters; Pause cases via `paused:true` until the flag exists), L33 (release check forbids `eggfarmQa`), L66 (SS-17).
- org-plan.md 488c37b5 L19 and art-ux/decisions.md 4241efc2 L436 (Art signs from the UI QA set).
- manifest L6 (Pause cut first).

**Follow-up.** HoE: the force-cause seam, plus confirming `worker.set` paused. HoP → PM Market: a text fix on SS-17's screenshot owner (non-blocking).
**Blocks gate:** Yes, for the `other` cells (and mh_paused if Pause ships and the setter can't set paused).

## Q10: SS-15 Rule 2 share-guard selector
**Ruling.** Not a V5-U case. The clause ("denominator ≤ 0 → share 1 if fatigueLoss > 0, else 0; never NaN/∞") is Rule 2 maths on a pure selector, which is in the **Saves QA** lane. The SS-15 regression row is Saves too. Saves QA unit-tests it on the RC: share at denominator < 0, = 0 and > 0, with fatigueLoss 0 and > 0.
UI QA keeps only the visible symptom inside SS-24: at a low-level state where wages ≥ gross with a Tired worker, the HUD chip text never contains NaN/Infinity/"−$NaN" and follows the share-1 result.
**Evidence.**
- sales-stopped-spec L148 (share guard) and L289 (SS-15 clause).
- test-plan-sales-stopped L19 (Saves QA owns "Rule 2 maths and hysteresis") and L64 (SS-15 (R) lane Saves).
- qa/decisions.md L290 (clause moved to M5.0).

**Follow-up.** HoE names the exported Rule 2 share function in the #5b PR body (see request). HoQA tells Saves QA to add the case.
**Blocks gate:** No, for V5-U. It's a V5-S case.

## Q11: Breeds UI shots
**Ruling.** Breeds UI is in M5.1 scope (package row "Breeds", 13d5255e), but its build is open: HoE 20:04 says it waits for Features and may ship flag-off or move to 5.1.
- **If Breeds UI is in rc/v5:** UI QA owns the 3-browser shots for Art (D-CEO-20261028-02) and runs breeds-ui v0.2.7 UI ACs (UI-BR-*, browser BR-ACs). Saves QA owns breeds sim/save. Write the shot list from art-ux/m5.1-breeds-ui.md v0.2.7 (f349f29f) and request breeds state setters then.
- **If it's cut or ships flag-off:** the shots are N/A and only flag-off no-regression runs. Art is told the same turn.

Don't build breeds recipes before HoE confirms it's in.
**Evidence.**
- m5.1-kickoff-package L9.
- manifest L53 (row 27, Saves takes breeds sim).
- engineering/decisions.md L231 (20:04 amendment).
- art-ux/decisions.md L436 (Art signs against breeds-ui v0.2.7).
- org-plan L19.

**Follow-up.** HoE says whether Breeds UI is in the RC. If yes, a breeds seam request follows.
**Blocks gate:** Only if Breeds UI ships.

## Q12: Browser versions
**Ruling.** Accept current stable: Chrome 156, Playwright Firefox 157 (firefox-1555), WebKit 27.2 (webkit-2370), and axe 4.14.0. No v5 spec pins an engine version. Record the exact version strings, Playwright build ids and the font check (`document.fonts.check('700 14px Fredoka')`) in the results manifest.
Any rect/fit fail (e.g. SS-16 ±1 px against rects Art measured on Chromium 155) is reported as a FAIL with the engine version. Art/the spec owner decides whether to re-measure; QA does not widen tolerances.
**Evidence.** `grep` of all 11 frozen specs: no version pin. Only m5-layout-rects-960 54a59d49 L4 records "Engine: Chromium 155" as measurement provenance. plan.md L33.
**Follow-up.** UI QA.
**Blocks gate:** No.

## Q13: Who runs the other SS cases and the other qa/m5 UI plans
**Ruling.** Each plan already splits lanes in its own §0 roles table. On the one RC, UI-lane rows go to **UI QA (V5-U)** and Saves-lane rows to **Saves QA (V5-S)**. Pause rows are N/A if Pause is cut.
| Plan (sha1) | Role table | UI QA takes |
|---|---|---|
| sales-stopped 16b3c663 | L17–21; per-row lane column L50–84 | UI or "UI / Saves" rows: SS-1–6, 8, 12, 16–18, 20, 23–26, 28–31, 33–35 (Saves takes the sim/telemetry parts of the shared rows; SS-7/9/10/11/13/14/15/19/21/22/27/32 are Saves) |
| abilities 39cce659 | L14–15 | UI row |
| bb-stopgap 9b34ea0b | L8 | SG-1/2 DOM, SG-3, SG-6, SG-11 (HoQA reviews SG-5) |
| broody-hen 54bcb8a1 | L15–16 | UI row |
| golden-egg 21ee5feb | L16–17 | UI row |
| pause-resume c7e52755 | L12–13 | UI row (N/A if cut) |
| streak-tap-coins 5fb68dc9 | L13–14 | UI row |

Gaps with no v5 lane:
- M5.1 workers UI ACs in failure-cost v0.3.15 / lighter-refill v0.8.9 (e.g. AC-FC9 toast, AC-FC12 welcome-back, captions; AC-LR14 toast, AC-LR17/18 auto-refill row + axe). Browser parts → UI QA; sim/offline parts → Saves QA / V5-E.
- Breeds UI, per Q11.

**Evidence.** The line refs in the table. qa/queue.md L23–24 (the V5-S/V5-U rows don't list these yet).
**Follow-up.** HoQA updates the queue V5-U/V5-S rows and tells Saves QA. UI QA extends plan.md with a case index per plan and raises any capacity problem at once, so HoQA can rebalance (e.g. Claude QA), not cut.
**Blocks gate:** No, but every listed AC must run on the RC SHA.

## Q14: p1 asleep name checks vs AC-R17
**Ruling.** Not a post-run triage and not a blind re-baseline. Before the RC run, commit a list in the harness: every p1 `asleep` assertion on the accessible names of nav Upgrades, the Workers tab and nav Refill (the AC-R17 controls), each mapped to the TP1-R17a–c case that replaces it.
- Those assertions are skipped in REG-2 and logged as "superseded by AC-R17".
- Every other p1 asleep assertion runs unchanged: badge counts/visibility AC-R1–R5, banners, strings and the `#rate` suffix (AC-R17 says those are unchanged).
- Any diff not on the list = regression FAIL.

**Evidence.** rc1-asleep L143–149 (AC-R17 changes names only; "Badge counts, visibility rules (AC-R1–R5) and the sim trace are unchanged"). plan.md L115 (REG-2) and L159.
**Follow-up.** UI QA.
**Blocks gate:** No.

## Other items in the plan (for the message)
- **Results folder.** HoE's 20:20 amendment names the UI gate folder `v5-rc-ui` (engineering/decisions.md L236), matching `v5-rc-saves` (QA-D-1029-V5S). Write results to `artifacts/v5-rc-ui/results/` + `SHA256SUMS`, not `artifacts/v5-ui/<sha7>/results/`. The prep tree stays in `artifacts/v5-ui/`. HoE commits the folder (if < 5 MB) to the artifacts branch after QA marks it final.
- **Harness gaps.** Fix the ZG-AC9 buy-tap path and write `zg-compare.py` before the RC. Manual cross-variant comparisons aren't gate evidence (plan.md L166/L169).
- **U1/U2 text.** AC text of record for the U1/U2 errata is failure-cost v0.3.15 f1c6cce3 / lighter-refill v0.8.9 3b64af39. The build pins stay 393e69f6/08d12ac7 (product/decisions.md L1306–1325).
- **TP1 note.** UI QA's m-P1-1 note in qa/m41/test-plan-patch1.md (a34ace59→7aba9297) is acknowledged. Keep the pre-edit copy until the verdict.

---

## READY TO SEND: HoQA → UI QA (edb6ef85-50dc-4c47-985d-413ce8fddb28), priority: true
HoQA → UI QA: rulings on V5-U Q1–Q14 (details in qa/v5-ui-rulings-draft.md).

Q1: UI-M5-1/UI-WARN gates (`.st` = "Unpaid" + SVG warn, no U+26A0). I'll fix TP1-U1.
Q2: no seam. Make MH Asleep/Unpaid via `eggfarmQa.worker.set`, then cold-load that save with savedAt −2 h (Saves QA's S-OFF/seedLS). Assert that "auto-selling stopped" appears only in the toast/welcome-back, and that the banner says "sales stopped". The toast/line text is per AC-FC9/AC-FC12 if clockWage ships.
Q3: OK without a revert if (a) p2's changed files are outside the trace harness's module graph, (b) import isolation, (c) goldens unchanged at the v5-p2 piece gate, not the RC. If there's overlap, revert those files in a /tmp variant.
Q4: blocker confirmed. I'm asking HoE for the hook. FX-F27s is prep only; the trace parts stay UNVERIFIED.
Q5: farm banner = M5.0 Rule 3. Gate SS-12/20/23a/25. The sticky Refill bar (p2 item 3) is a gated AC.
Q6: the Art minors and the refund-pop nit gate in your lane, plus shots. Check the UI-M5-8 test exists. m11 is out.
Q7: pins = manifest: p2 f0524447, package 46562507, SS v1.3.10 2c2c323b. Freeze the Art package acfe36a7 too. d32b73fc/0ceb56e7 are stale prefixes.
Q8: paths are `m4.flags.zeroGainUi`/`m4.flags.bestBuyV2`, not m5.*. I've asked HoE for the confirm path and the ship values. ZG ACs run flag-on per spec anyway. Prepare the Art set on zg-on. [CLOSED 21:10, QA-D-1029-Q8: m4 namespace paths per manifest ship-value table]
Q9: mh_paused via `worker.set({paused:true})`, N/A if Pause is cut. I'm asking HoE for a `stall.force(cause)` seam for `other`. Injected = UNVERIFIED, never PASS. Your set is the Art set.
Q10: the share guard is Saves QA's unit case. You keep "no NaN in the HUD chip" (SS-24).
Q11: shoot breeds only if HoE confirms it's in the RC.
Q12: accept current stable; record exact versions.
Q13: take the UI-lane rows of every qa/m5 plan (per each plan's §0 table) plus the M5.1 workers UI ACs (FC9/12, LR14/17/18). Saves takes the rest. Add a case index; flag capacity now.
Q14: before the run, commit an explicit "superseded by AC-R17" list. Any other p1 diff fails.
Also: results go to artifacts/v5-rc-ui/results/. Fix ZG-AC9 tap and zg-compare.py before the RC.

## READY TO SEND: HoQA → HoE (61b89361-de69-4787-8767-4bad95a7a2b4), priority: true
HoQA → HoE: V5-U needs these before the RC gate. Seams go in dev/build:qa only, and check-release must still reject `eggfarmQa`.
1. Q4: a committed observe-only hook in `tests/bot-m4.ts`. It's a read-only callback on every post-action state and every 3 s buy check, for seller15 + cheapest, seeds 1–200. Put the same hook in `tests/bot-m5.ts` for m5x-casual after parity. AC7 hashes must be byte-identical with the hook present. Serves ZG-AC5/7/20, FX-F27 (ZG-AC11/14) and the bb-stopgap SG traces. This is test code, not build:qa.
2. Q9: build:qa `eggfarmQa.stall.force(cause)` (or equivalent) that renders cause `other` (and any of the 7) through the real chip path. Also confirm the accepted `eggfarmQa.worker.set(id,{paused:true})` gives `mh_paused` with `m4.flags.pause` 0. Serves SS-17 (189 cells), SS-16 and SS-35.
3. Q8: exact balance.json paths for `m4.flags.zeroGainUi`, `m4.flags.bestBuyV2` and the zero-gain confirm tunable (spec `m5.zeroGain.confirm`). Also add a ship-value column for every flag/tunable to v5-rc-manifest row 34 before the gate. Serves ZG-AC10/12/19, the variants and the as-shipped Art set. [CLOSED 21:10, QA-D-1029-Q8: m4 namespace paths per manifest ship-value table]
4. Q10: name the exported Rule 2 share function (incl. the ≤ 0 guard) in the #5b PR body. Serves the SS-15 Rule 2 clause (Saves QA unit).
5. Q3: list the p2 commit SHAs in manifest row 3. Serves AC-R15 / AC-R17 no-sim-change.
6. Q11: tell me if Breeds UI is in rc/v5. If yes, a breeds-state setter request follows.
Q2 (offline return) needs no seam; we use a save fixture.
