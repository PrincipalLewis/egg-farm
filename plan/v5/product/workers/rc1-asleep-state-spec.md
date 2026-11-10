# rc1: Asleep fail-state visibility (PM, Workers) v1.0.12, Oct 24 2026
Source: the Game Critic's rc1-pt1 review, item #3. A sleeping Coop Hand stops production while the HUD still shows positive income.

## (a) Card and nav
- An asleep or unpaid worker's card is greyed out and shows a red banner. The banner reads "Asleep, production stopped" or "Unpaid, production stopped".
- The Egg Grader's banner instead reads "Asleep, bonus down to 15%", because it keeps 15% of its bonus while asleep.
- The Refill button stays visible on the card.
- A red badge with the number of asleep or unpaid workers appears on both the Upgrades nav button and the Workers tab inside Upgrades. The bottom nav is Market, Upgrades, Refill, Farm, with no separate Workers button. The badge is hidden when the number is 0. Styling follows art-ux/rc1-upgrade-value.md v1.4, with the mock at art-ux/mocks/rc1-asleep-card-360.png.
- Pulse the badge once when it first appears, with no repeating animation.

## (b) HUD income
- HUD income/s is calculated every tick from the current worker states. It isn't a cached or averaged value.
- A worker that falls asleep or goes unpaid is removed from income/s within 1 s.
- If income/s is ≤0, show it in red with a ⚠ icon. Never show a positive number while production is stopped.
- When the worker resumes, its contribution comes back within 1 s.

## (c) Tutorial copy
- Change every player-facing "Manage" to "Refill" in the tutorial and hints (for example, "Tap Refill when a worker is tired"). Art & UX checks the final strings.

## ACs
- AC-R1: Let the Coop Hand fall asleep. Within 1 s, the card shows "Asleep, production stopped" and the badges on both Upgrades and Workers show 1.
- AC-R2: In the same state, the HUD income/s no longer includes the Coop Hand's contribution within 1 s. When it's the only source, the HUD shows ≤0 in red, never a positive number.
- AC-R3: Unpaid behaves like AC-R1 and AC-R2, with the caption "Unpaid".
- AC-R4: An asleep Egg Grader shows "Asleep, bonus down to 15%", and income/s drops to match.
- AC-R5: After a Refill or resume, the banner and badge clear and income/s comes back within 1 s. With 2 or more workers asleep, the badge shows the correct count.
- AC-R6: No player-facing "Manage" string remains. A string search of the tutorial and hints finds none.

## Addendum (HoP, Oct 16)
- HUD income/s, the worker cards and the upgrade ETA all read from one shared income source, as defined in PM Farm Upgrades' clarity spec. They show no separate or cached figures. Alignment with PM Farm Upgrades is in progress.
- Red states always keep their text and ⚠ icon, so colour is never the only signal (for colour-blind players).
- AC-R7: When a worker falls asleep, the HUD, the card and the ETA all update from the same value within 1 s.
- Source: the incomePerSec(state, balance) selector at src/econ/income.ts, defined in product/farm/rc1-upgrade-clarity-spec.md v0.3. PM Farm Upgrades confirmed it meets all four rules: it's recalculated every tick, an asleep Grader counts at 15%, values ≤0 are allowed (the ETA shows "—"), and paused workers are left out. Alignment is closed.

## Addendum 2 (Oct 16): Refill button captions and plural
- When the Refill button is disabled, it always shows the reason under the label.
  - Above T% energy (T = manage_prompt_threshold × 100, 50 today): "Rested, refill below {T}%". This replaces "Not tired yet".
  - On cooldown: "Ready in Ns".
  - When both apply, show the energy reason.
- T5 (PM Market triage, workers-ui.ts:51 and :96): the bulk button reads "Refill 1 tired worker" when N=1 and "Refill N tired workers" when N≥2. It stays hidden at N=0.
- AC-R8 (v1.0.7, value derived): let T = `manage_prompt_threshold` × 100, which is 50 on the shipping data (origin/main balance.json is 0.5, set by F1 bae4bdf). A worker above T% energy shows a disabled Refill button captioned "Rested, refill below {T}%" ("Rested, refill below 50%" today). At or below T% while on cooldown, it shows "Ready in Ns" and counts down. Tests read T from balance and never hard-code 40 or 50.
- AC-R9: With N=1 the button reads "Refill 1 tired worker", and with N=2 it reads "Refill 2 tired workers". No string reads "1 tired workers".

## v1.0.4 (2026-10-24 16:46 CEST): D-HOP-2026-10-24-14
- (a) Market Hand exception: when hired and Asleep or Unpaid, the banner reads **"Market Hand asleep: sales stopped"**, not "Asleep, production stopped" and not "sales slowed" (rc2 copy). Unpaid reads **"Market Hand unpaid: sales stopped"** (HoP D-HOP-2026-10-24-17). Other roles are unchanged.
- **AC-R1m:** let the Market Hand fall asleep. Within 1 s, the card shows "Market Hand asleep: sales stopped", the badges show 1, and the HUD rate excludes automatic sales (≤0 in red if it's the only source). AC-R3 applies to Unpaid with the confirmed string.
- See rc1-b1-coop-full-spec v1.0.4 for the surface map against the m4.2 string "auto-selling stopped".

## v1.0.5 (2026-10-24 16:52 CEST): Art §6 copy + D-HOP-2026-10-24-17
- **Copy mirrors `art-ux/rc2-workers-copy.md` §6 (amended 16:52, D-HOP-14) and D-HOP-2026-10-24-17.** Icons are SVG (moon = asleep, warning = unpaid), 14 px, no emoji; the banner never wraps. **Drop the role name only if the full string doesn't fit** (not always at 360); aria always keeps the full sentence with the role. Art checks the fit on the patch SHA.
  | State | Banner | Aria | Role-drop (only if the full string doesn't fit) |
  |---|---|---|---|
  | Market Hand Asleep | Market Hand asleep: sales stopped | Market Hand is asleep. Auto-sales have stopped. | Asleep: sales stopped (Art-confirmed) |
  | Market Hand Unpaid | Market Hand unpaid: sales stopped | Market Hand is unpaid. Auto-sales have stopped. | Unpaid: sales stopped (Art-confirmed) |
  | Hawker Asleep / Unpaid | Hawker asleep: sales slowed / Hawker unpaid: sales slowed | Hawker is asleep. Sales are slowed. / Hawker is unpaid. Sales are slowed. | unchanged |
- **Surface rule (D-HOP-17):** the banner always says "sales stopped" for the Market Hand. "Auto-selling stopped" appears **only** in the asleep toast and the welcome-back line. A Market Hand stall never uses "production stopped". This closes the v1.0.4 Unpaid question and the SS-20 banner conflict.
- AC-B11 / AC-B11u / AC-R1m: the banner text, aria and role-drop (only when the full string doesn't fit) match the table exactly; no Market Hand banner contains "slowed" or "auto-selling".
- 2026-10-24 16:53 CEST (v1.0.5 amend): Art confirmed the role-drop strings exactly ("Asleep: sales stopped" / "Unpaid: sales stopped"; aria unchanged). Drop condition = only if the full string doesn't fit.

## v1.0.6 (2026-10-24 16:56 CEST): Coop Hand rows from art-ux/rc2-workers-copy.md §6 (Art update)
| State | Banner | Aria | Role-drop (only if the full string doesn't fit) |
|---|---|---|---|
| Coop Hand Asleep | Coop Hand asleep: collecting stopped | Coop Hand is asleep. Auto-collecting has stopped. | Asleep: collecting stopped |
| Coop Hand Unpaid | Coop Hand unpaid: collecting stopped | Coop Hand is unpaid. Auto-collecting has stopped. | Unpaid: collecting stopped |
- **Why "stopped":** in M5.0 the asleep collect share is 0, and `workers.ts` `isOff` treats Unpaid the same as Asleep, so automatic collecting really is 0. Hens keep laying; only collecting stops. If the 0.15 fallback (`w2_asleep_collect_share`) ever ships, these two rows go back to "collecting slowed".
- Replaces every "collecting slowed" used for an Asleep or Unpaid Coop Hand (the earlier rc2-copy rows 84/87). "Slowed" stays for **Tired** only.
- The Coop Hand's rc1 "Asleep, production stopped" / "Unpaid, production stopped" (AC-R1, AC-R3) becomes the row above. **AC-R1c:** let the Coop Hand fall asleep; within 1 s the banner reads exactly "Coop Hand asleep: collecting stopped" with the aria above, and no Coop Hand banner contains "slowed". Unpaid is the same with its row.

## v1.0.7 (2026-10-24 18:43 CEST): D-HOP-2026-10-24-32 (a), HUD aria suffix frozen as built (PR #70 @ 30b29d3, copy-only erratum)
- **Source (read-only):** `src/ui/s2-economy-ui.ts` at 30b29d3: `headerRate = rateView(incomePerSec(s, b) * 100, { stopped: marketHandStalled(s, b) })`; `rateView` lines 27 and 30; rendered as the `aria-label` of `#rate` (`role="status"`) in `src/ui/app.ts:537`.
- **Frozen suffix:** exactly **`, sales stopped`** (comma, space, lower case, no full stop), appended to the end of the HUD rate aria-label:
  - at a rounded rate of $0.00 or less in the zero branch: `Net income ${money} per second, sales stopped`, e.g. "Net income $0.00 per second, sales stopped"
  - at a negative rate: `Net income minus ${spoken} per second, sales stopped`, e.g. "Net income minus $0.03 per second, sales stopped"
  - **never** on a positive rate (`Net income plus … per second` has no suffix).
- **When:** only while `marketHandStalled(s, b)` is true, i.e. a **hired Market Hand that isn't paused and whose mood is Asleep or Unpaid** (`isOff`, `src/econ/income.ts:43-46`). **Never for any other role.** An asleep or unpaid Coop Hand, Hawker or Grader never adds it, and a negative rate from wages alone isn't "stopped".
- The visible HUD text doesn't change. **AC-R2a:** with a hired MH Asleep (then Unpaid) and no other income, the `#rate` aria-label ends with ", sales stopped" within 1 s. With only the Coop Hand asleep, it never contains "sales stopped". With the MH working, it never does either.

## v1.0.8 (2026-10-24 18:43 CEST): D-HOP-2026-10-24-32 (b), Unpaid worker shows the resume condition, not Refill (target: next patch; else M5.0)
**Bug (30b29d3):** `manageCaption` (`src/ui/workers-ui.ts:58-60`) shows "Rested, refill below 50%" (T = `manage_prompt_threshold` × 100 = 50) on any worker above T, **including an Unpaid one**. At or below T the Refill button is enabled for an Unpaid worker, but Refill only sets energy to 100; the worker **stays Unpaid** (`actions.ts:76-78`; Manage all likewise, "Unpaid stays Unpaid, ruling 2"). Both point the player at the wrong action.

**How an Unpaid worker actually resumes (code, 30b29d3):**
- Only the Market Hand and the Coop Hand pay wages, so only they can be Unpaid. A worker goes Unpaid when its per-action wage is more than the coins on hand (`tick.ts:79-80`); while Unpaid it does nothing, pays nothing and doesn't drain (`tick.ts:18`).
- **There is no tap.** Every tick, `workerActions` (`tick.ts:58-69`) resumes Unpaid workers **automatically, one at a time, Market Hand first, then Coop Hand**, when `coins ≥ reserved + need`:
  - `need` = 1 minute of that worker's own wage = `round(wage_per_farm_per_min × Farm × unpaid_resume_wage_min × 100)` cents, with `unpaid_resume_wage_min` = 1 (MH $0.25 × Farm, CH $0.50 × Farm; at F10: $2.50 / $5.00);
  - `reserved` = the same 1-minute amount for every MH/CH already being paid (not Unpaid, energy > 0), plus every worker resumed earlier in the same check.
  - **Nothing is charged at resume.** It's a coins threshold; wages are charged afterwards per action as usual. Strict order: it stops at the first worker that can't resume.
- If coins are short, the worker simply stays Unpaid until the player earns coins (manual Sell, Collect, Hawker, Grader). Refill doesn't help.

**Rule (UI only; the sim is unchanged):**
1. While a worker is Unpaid, its Refill caption and state are **replaced** by the resume condition. The caption shows the coins it needs: **X** = `reserved + need` as computed by the tick for that worker (for the CH while the MH is also Unpaid, this includes the MH's need), formatted with the HUD money formatter. The per-worker Refill button is `aria-disabled="true"` while Unpaid (it doesn't fix Unpaid), whatever the energy.
2. **Precedence for the caption under the Refill button (corrected v1.0.12, HoP addendum 23:10 to D-HOP-2026-10-24-45):** Unpaid > "Rested, refill below T%" > "Ready in Ns" (shared cooldown) > none. Unpaid always wins, above or below T and during the cooldown; the energy reason beats the cooldown, as Addendum 2 (L38) already says. ~~Unpaid > "Ready in Ns" > "Rested, refill below T%" > none~~ (v1.0.8 wording, wrong).
3. The coins-short case is the only Unpaid case the player sees: as soon as coins reach X the tick resumes the worker (≤ 1 tick), and the caption reverts to the normal energy-based one.
4. **Manage all / nav Refill:** the visible count N and the aria "Refill N tired workers" exclude Unpaid workers, so an Unpaid worker never makes Refill look like the fix. The sim's `needManage` is unchanged (refilling an Unpaid worker's energy is harmless), so traces and saves stay byte-identical.
5. **Pause/Rest (M5.0 Pause spec, not rc1):** Paused > Unpaid. While Paused, the paused caption applies, not the Unpaid one. On Resume, a still-Unpaid worker shows this Unpaid caption. No change is needed in rc1, which has no Pause UI. The Pause spec's G3 (Unpaid laundering) and `unpaid_resume_wage_min` reserve already match this mechanic.

**Copy (Art-final, v1.0.9; supersedes the v1.0.8 proposal):**
| Surface | Visible text | Aria |
|---|---|---|
| Per-worker caption, Unpaid (one caption, no long/short fallback) | `Resumes at $X` (standard money formatter `fmtMoney`) | "{Role} is unpaid. Work resumes automatically when you have $X. Sell eggs to earn coins.", on the disabled Refill via **`aria-describedby`** (the caption element), never `aria-label`; the button's accessible name stays "Refill {Role}" (WCAG 2.5.3) |
| Nav/Manage all | unchanged; the count excludes Unpaid workers | "Refill, no tired workers" (existing) when none are left |
- The card pill already says "Unpaid", so the caption doesn't repeat it. "Pay wage" (a pay-to-resume tap) is **parked for M5.1**.

**ACs** (debug setters: set coins, energy, Unpaid, manage cooldown; T = 50):
- **AC-R10 (above T):** MH hired, F10, Unpaid, energy 70, coins $1.00 (< X = $2.50). The MH card caption reads exactly "Resumes at $2.50", **not** "Rested, refill below 50%". Refill is `aria-disabled="true"`, its accessible name is "Refill Market Hand", and its `aria-describedby` text is exactly "Market Hand is unpaid. Work resumes automatically when you have $2.50. Sell eggs to earn coins."
- **AC-R11 (at or below T):** same with energy 30 and the cooldown at 0. The caption reads "Resumes at $2.50" (not blank). Refill is `aria-disabled="true"`. A tap dispatches nothing (no `worker_manage` event).
- **AC-R12 (cooldown):** same with energy 30 and `manageCdS` 20. The caption reads "Resumes at $2.50", not "Ready in 20s".
- **AC-R13 (coins reach X):** from AC-R10, set coins to $2.50. Within 1 tick `worker_state{state:"working"}` fires, coins are unchanged by the resume, and the caption becomes "Rested, refill below 50%" (energy 70).
- **AC-R14 (order and reserve):** MH working and CH Unpaid at F10: CH X = $7.50 ($2.50 + $5.00). With MH and CH both Unpaid: MH X = $2.50, CH X = $7.50. At coins $5.00 only the MH resumes.
- **AC-R15 (Manage all):** 3 hired workers, the CH Unpaid at 30% and the MH Tired at 30%. The nav/Manage-all count is 1 and its aria "Refill 1 tired worker". The sim trace of the patch SHA under test, with the Unpaid UI rule on, is byte-identical to the same SHA with the rule's UI changes reverted, for the same inputs (baseline = the behaviour defined in this spec v1.0.10: `needManage` unchanged; no old build). (v1.0.10)

## v1.0.9 (2026-10-24 18:45 CEST): D-HOP-2026-10-24-32, Art-final Unpaid caption (HoP accepted v1.0.8; target: next patch)
- Copy is **Art-final** (table above): the caption is `Resumes at $X` with the standard money formatter. It beats "Ready in" and "Rested". The proposed "Unpaid: resumes at $X" and the short-form rule are removed.
- Aria: "{Role} is unpaid. Work resumes automatically when you have $X. Sell eggs to earn coins." via `aria-describedby` on the disabled Refill, not `aria-label` (WCAG 2.5.3).
- Manage all is unchanged from v1.0.8 (Unpaid excluded from the count; "Refill, no tired workers" when none remain).
- "Pay wage" (a pay-to-resume tap) is parked for **M5.1**.
- **AC-R16 (Art, fit):** at 360, 390 and 1280 widths, in Chromium, WebKit and Firefox, the captions "Resumes at $5.00", "Resumes at $999.9K", "Resumes at $1M" (X = 99,995,000 cents, the 999.95K roll-up boundary), "Resumes at $1.23M" and "Resumes at $9,999.99" each render (v1.0.10 adds the last three) on one line with no wrap and no ellipsis (`scrollWidth ≤ clientWidth`, one line box) in the 128 px card. Art measured 100–115 px from font metrics.

## v1.0.10 (2026-10-24 18:50 CEST): D-HOP-2026-10-24-32, HoQA trace answers (qa/m41/test-plan-patch1.md)
Grounded in game/src at origin/main 2efb445 and PR #70 30b29d3. `src/ui/format.ts` and `mood()` in `src/sim/workers.ts` are identical on both.
1. **Unpaid + Asleep (Unpaid with energy 0): Unpaid wins.** There is no `moodOf`; the function is `mood()` (`workers.ts:11-12`): `w.unpaid ? 'unpaid' : energy ≥ tired_below_pct ? 'working' : energy > 0 ? 'tired' : 'asleep'`, so `unpaid` is checked first.
   - Caption: **"Resumes at $X"**. Refill stays `aria-disabled="true"` even though energy 0 ≤ T, with the Unpaid `aria-describedby` text.
   - Card pill: the code renders **"Unpaid ⚠"** (`workers-ui.ts:107`). Banner: `kind:'unpaid'`, `icon-warning.svg`, "{Role} unpaid: …" (§6 rows). No yawn (`isYawning` excludes Unpaid).
   - The moment it resumes at energy 0, `mood()` gives `asleep`. The Asleep banner and normal Refill apply, and the resume reserve skips it (`tick.ts:62`, `energy > 0`).
   - **Flag (Art):** the pill string contains the ⚠ emoji glyph, against the Art no-emoji rule (§6). Same for "Asleep 💤". Not in this patch's scope.
2. **Money formatter = `fmtMoney`** (`format.ts:47-52`). It rounds to whole cents. Under $10,000 it shows 2 decimals with a thousands separator. From $10K it uses `fmtCount`: 1 decimal at K; 2 decimals for M and up below 10× the base, else 1; trailing zeros trimmed. A tier that rounds to 1000 rolls up. Verified outputs (esbuild run of 30b29d3 `format.ts`):
   - 500 → "$5.00"; 12,510,000 → "$125.1K"; 99,990,000 → "$999.9K"; **99,995,000 ($999.95K) → "$1M"**; 123,000,000 → "$1.23M"; 999,999 → "$9,999.99".
   - **Widths** (fontTools on the shipped `nunito-latin-400-normal.woff2`, the `.wk-cap` font 400 12px): "Resumes at $5.00" 97.6 px, "…$999.9K" 112.3, "…$1M" 90.8, **"…$1.23M" 107.9 (fits; narrower than $999.9K)**.
   - **Flag (Art):** the widest form is the under-$10K separator case, "Resumes at $9,999.99" = **122.0 px**, above Art's measured 100–115 px (still < 128). Real X is small (1 min of wages: at F30, MH $7.50 + CH $15.00 = $22.50), but AC-R16 adds it as a case.
3. **AC-R2a restated in ticks.** The sim runs at `tickHz` 10 (`balance.json:3`), so dt = 0.1 s per `step` (`tick.ts:94-98`). "Within 1 s" = **within 10 sim ticks, then the next `render()`** (`app.ts:537` sets the `#rate` aria-label). It's deterministic in a harness: step 10 ticks, render, assert.
   - **"No other income", precisely:** the HUD rate is the steady-state model `incomePerSec` (`income.ts`), not observed coins. It is `min(prodEggsPerSec, demandPerSec, collectPerSec) × price − wagesPerSec`.
   - While the MH is stalled, `demandPerSec` = 0 (`income.ts:49`), so the eggs term is 0 **whatever the Hawker, manual sales or customer purchases do**. Those never enter the rate.
   - The rate is then −(wages of a working/tired Coop Hand), or $0.00 with none. So the suffix condition (rounded ≤ $0.00) always holds while the MH is stalled.
   - The only other terms are Coop Hand wages (≤ 0) and the Grader multiplier on a zero eggs term. Golden-egg cash, tap coins and similar are not in `incomePerSec`.
   - **AC-R2a (v1.0.10):** hired MH set Asleep (then Unpaid), with or without the Hawker hired and with manual sells during the window. After 10 ticks + render, the `#rate` aria-label ends with ", sales stopped". With only the Coop Hand Asleep, or the MH Working, or the MH Paused (when Pause ships), it never contains it.
4. **AC-R15 baseline:** named as the patch SHA under test against this spec v1.0.10 (sim trace byte-identical with and without the Unpaid UI rule). No old build is used as the baseline.
5. **Changelog:** v1.0.8, v1.0.9 and v1.0.10 headings now carry D-HOP-2026-10-24-32.

## v1.0.11 (2026-10-24 22:02 CEST): HoP from HoQA Minor m-P1-1 (`qa/m41/p1-30b29d3.md`), label in name on the asleep-signal controls (target: next patch; non-blocking)
- **Source:** HoQA P1 report on 30b29d3 (FINAL 20:53), m-P1-1: axe 4.14.0 `label-content-name-mismatch` (WCAG 2.5.3) in 7/7 asleep scenes, 3 engines. Visible strings as built (QA §Area 2):
  - (a) nav `[data-nav=upgrades]`: visible badge "N" then "Upgrades"; aria "Upgrades, N workers asleep or unpaid".
  - (b) Workers tab `[data-tab=workers]`: visible "Workers N"; aria-label "Workers" (the count is never announced).
  - (c) nav Refill `.nav-manage`: visible "Refill" + "N" (no space); aria "Refill N tired workers".
- **Scope:** aria/DOM-order/copy only, allowed as a bug fix under the build hold. No sim, economy or save change; no new visible copy beyond ordering/spacing. If it can't ship in the next patch it waits for M5.0; it does not block anything.
- **AC-R17 (label in name, asleep scenes):** with ≥ 1 worker Asleep or Unpaid (MH, CH, both; each of the 7 QA asleep scenes), at 360, 390 and 1280 in Chromium, WebKit and Firefox:
  - **Upgrades nav:** the accessible name **starts with the control's visible text in DOM reading order**. Either the badge follows the label in the DOM (visible "Upgrades N", name e.g. "Upgrades N, N workers asleep or unpaid"), or the name starts "N Upgrades". The count N is in the name.
  - **Workers tab:** the accessible name starts with the visible text **including the count**, e.g. "Workers N" (optionally followed by ", N asleep or unpaid"). The count **must be announced**; a bare "Workers" fails. With the badge hidden (N = 0) the name is "Workers".
  - **Refill nav:** the accessible name starts with the visible text. The visible label and count are separated (e.g. "Refill N") so the computed visible text is a prefix of the name, e.g. "Refill N tired workers". AC-R9 plurals are unchanged ("Refill 1 tired worker", never "1 tired workers").
  - axe `label-content-name-mismatch` reports **0** on these three controls (repro: `node axe/axe-detail.mjs chromium 390 /tmp/qa-p1-30b29d3 <build-id>`), and in the axe62 `done` state.
  - **Frozen suffix unchanged:** the HUD `#rate` aria-label keeps the D-HOP-32 (a) form exactly (v1.0.7, AC-R2a): it starts with the spoken rate ("Net income …") and **", sales stopped" stays at the end, after it**. No other control gains the suffix.
  - Badge counts, visibility rules (AC-R1–R5) and the sim trace are unchanged: the sim trace is byte-identical with and without the change (goldens flag-off `f90d1678…`, M4-on `a54c9cf9…`).

## v1.0.12 (2026-10-24 23:10 CEST): HoP addendum 23:10 to D-HOP-2026-10-24-45 (HoQA C-1), wording correction
- **Caption precedence:** Addendum 2 (L38, "When both apply, show the energy reason") is **correct**. v1.0.8 rule 2 is corrected to **Unpaid > "Rested, refill below T%" > "Ready in Ns" > none** (principle: show the blocker that ends last; same as M5.1 AC-FC13). Matches AC-R8 (a worker above T% shows "Rested", regardless of cooldown).
- **Verification:** Verified by HoQA on 30b29d3: wording-only correction, no patch bug (`qa/m41/caption-precedence-30b29d3.md`; the shipped build already shows the energy reason over "Ready in", `workers-ui.ts:59-60`, tests `m41-p1-asleep-signal:163-169`). The code comment at `workers-ui.ts:58` is stale (cosmetic only), and the Unpaid caption branch is queued as P2b (AC-R10–R16).
- **Unchanged:** the "Ready in Ns" format stays as shipped in the patch line (M5.1 m:ss applies only to the M5.1 worker card, HoP addendum 23:12). Sim trace unaffected (UI-only; goldens `f90d1678…` / `a54c9cf9…`). All other v1.0.11 text, AC-R1–R17, unchanged. Previous: v1.0.11 `b1f85dca996ba272f3875bdedc1f44e80d37a365` (backup `scratch/rc1-asleep-state-spec.v1.0.11.md`).
