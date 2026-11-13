# M4 B reviewer findings RV-2 / RV-4 / RV-5: root causes (PM Farm Upgrades) · 2026-10-19 · D-HOP-36, queue.md RV-2/4/5
Read-only investigation. **Code read: main `dd223f5`** (tree = `246de09`, the shipped m4b build), exported to /tmp/rv-dd223f5. The M4.1 line `882b97f` differs from dd223f5 in `src/` only in `src/ui/tracks-ui.ts` and `src/ui/app.ts:497` (the M4B-1 lock label; same line count), so every file:line below holds for both. No code changed.
Repro scripts (vite-node against src, M4 on, real balance.json): `product/farm/m4b-rv/rv2.ts`, `rv5.ts`; output in `rv2-out.txt`, `rv5-out.txt`. Run: `cd <tree> && F=14 C=10 node_modules/.bin/vite-node <path>/rv2.ts`.
Sources: product/critic/review-m4b-dd223f5-2026-10-19.md (Critic 7/10), playtest/player-notes/2026-10-19-session-m4b.md (Player).

## The three income numbers in the build (shared background)
| # | What | Where | Used by |
|---|---|---|---|
| I-1 | **Rolling 60 s realized GROSS sales**: sum of `sell` event values in the last 60 s ÷ 60. Wages, purchases, offline grants are not in it; it divides by 60 even when < 60 s of history exists. | `src/ui/format.ts:40-48` (`IncomeRate`), instance `src/ui/app.ts:61`, fed only at `app.ts:382` (`case 'sell'`) | **every ETA**: bubble `app.ts:419` → `next-goal.ts:61`; Farm card "Ready in" `app.ts:470`; Hens/Egg value card "Affordable in" `app.ts:500` |
| I-2 | **Model income** `incomePerSec(s, b, opts)`: min(prod, demand, collect) × price − wages, from config. best_roi calls it with `assumeWorking: true` (all hired workers Working, collect = 1 tap/s). | `src/econ/income.ts:62` | best_roi pick / payback (`src/econ/best-buy.ts:73,116`), i.e. the bubble target and the Farm-tab highlight |
| I-3 | **Net display rate** = I-1 − wages/s | `src/ui/rates.ts:22` (`netCentsPerSec`) | only `ui.rates()` (`app.ts:700-701`), a QA/debug accessor; **no ETA reads it** |
Unused in dd223f5: `secondsToAffordSteady` (`income.ts:95`) and `EtaHold`, the UC15 monotonic-ETA guard (`income.ts:106`): defined, never called.

---

## RV-5: ETAs creep upward
### Verdict on the PM Workers / HoP lead ("M4 cards use gross income while wages drain coins; regression of B-1 rule 1")
- **Bypass: CONFIRMED.** All three ETA call sites (`app.ts:419`, `app.ts:470`, `app.ts:500`) divide by I-1, the 60 s **gross** sales rate. None subtracts wages and none reads a net selector. B-1 rule 1 (rc1-b1-coop-full-spec.md: "realized net income… 5 s window… minus wages… the shared incomePerSec selector that the HUD, cards, ETA… read") and UC16/UC18 (rc1-upgrade-clarity-spec.md) are **not met**.
- **"Regression": not quite. B-1 was never merged.** The B-1 build is commit `74512ea` (2026-10-16 20:16, `IncomeMeter` 5 s window + `incomePerSec(meter, s, b, now)` = sales − wages + `etaSeconds`). It lives only on branch `fix/rc1-b1-coop-full`: `git merge-base --is-ancestor 74512ea dd223f5` → no, and no release tag contains it (checked every tag, including rc1-pt1 and m4b-dd223f5). The M4 line was built on a main that never had it. Same for the earlier `e84c022` / `1371305` (rc1/ux-clarity "shared incomePerSec"): not ancestors of dd223f5. Note the name clash: dd223f5's `incomePerSec` (I-2) is the *model* function, not B-1's realized-net selector.
- **As the cause of the visible creep: REFUTED (wages are too small).** Measured in the sim (`rv5-out.txt`, 4 workers hired): wages are **0.1–0.2 % of gross** at F5/F8/F12 and **$0.29/s against ~$640–1,050/s gross at F23** (wages = 0.25 + 0.5 $/min × F for Market + Coop Hand). A net-of-wages ETA differs from the shown one by under 0.5 s on a 4-minute ETA. The Player's "3:53 → 2:47 over 90 s" (ETA falling at about 73 % of real time) needs a ~27 % gap between the denominator and the real coin growth. Wages can't produce that.

### Root cause (what does make it creep)
1. **The denominator lags real income by up to 60 s** (`format.ts:40-48`, window 60 000 ms at `app.ts:61`). When real income drops, the rolling sum keeps the older, higher sales for up to a minute. The ETA is recomputed every frame as (cost − coins) ÷ a rate that keeps falling, so it stalls or rises while the player waits. The common trigger in M4 B is **worker fatigue**: below 30 % energy (`tired_below_pct`) Market Hand acts every 3 s instead of 1 s and Coop Hand every 4 s instead of 2 s; asleep = 0. That matches the Player's notes ("every worker Tired", income flat, then a jump after Manage all; every ~10 min).
   - **Repro (`rv5.ts`, F23, all 4 workers at 31 % energy, so they turn Tired as the run starts; target Farm L24 $68,756):** gross rate 1,046 → 943 → 820 → 637 $/s over 60 s, and the displayed ETA goes **~56 s → ~55 s → ~57 s → ~49 s** (stalls and rises for ~30 s, then counts down at < 1 s/s until the window settles). The control run with workers Working counts down ~9.8 s per 10 s. The net-of-wages ETA column is identical to the gross one in both runs.
   - The same lag works upward after Manage all / Refill: the ETA stays too long for up to 60 s, then drops faster than the clock.
2. **Lumpy realized sales.** The rate counts sales when they happen: Sell all bursts, Hawker batches, customers arriving in clusters. A burst inflates the rate for exactly 60 s, then drops out of the window, and the ETA jumps up (the Critic's "9→10 s" upticks; worse for hand sellers who sell in batches).
3. **No monotonic guard.** `EtaHold` (UC15: no rise > 5 s between updates unless income really dropped or coins were spent) exists at `income.ts:106` but is never used.
4. Minor: `fmtTimeToAfford` uses ceil (`format.ts:32`), and the bubble text updates at 1 Hz (`app.ts:417`), so ±1 s flicker. Cosmetic.
5. Not reproduced: the Critic's "Affordable in a moment while ~$14K short". "a moment" means the computed ETA is under 10 s (`format.ts:75`). Being $14K short needs a rate above $1.4K/s, which a burst in the 60 s window (cause 2) can give right after a big Sell all. Treat it as cause 2 until QA has a repro with a coins/rate log.

### Fixes and classification
| Fix | What | Class | Effort | Notes |
|---|---|---|---|---|
| RV-5a: selector swap to net | At the 3 call sites, divide by `netCentsPerSec(income.centsPerSec(t), s, b)` (`rates.ts:22`), and show "—" when ≤ 0 (B-1 rule 3) | **A**, small (~3 call sites + a helper; ~1 h eng + 1 test) | ~1–2 h incl. tests | Restores B-1 rule 1 / UC16 compliance on the ETA path. **Does not fix the creep** (wages < 0.5 %). It only fits M4.1 if HoE and HoQA accept it as compliance, not as the RV-5 fix. |
| RV-5b: faster, honest denominator | Port B-1's 5 s realized-net `IncomeMeter` (74512ea), or use I-2 with live moods (`secondsToAffordSteady`, `income.ts:95`), so a Tired/asleep drop shows within ~1–5 s (UC18-1) | **B** (logic; changes every ETA's behaviour) → M4.2 | ~0.5–1 day incl. retests (B-1 AC-B1..B11, UC15) | 74512ea was written against rc1 and needs a rebase onto the M4 line. A 5 s window is noisier, so pair it with RV-5c. |
| RV-5c: wire `EtaHold` (UC15) | Clamp the shown ETA rise to ≤ 5 s per update unless income really dropped or coins were spent | **B** → M4.2 | ~2–4 h | Must not hide real fatigue drops (UC18 note). |
**Spec touched:** none in m4a-spec (no ETA rule there). rc1-upgrade-clarity-spec UC15/UC16/UC18 and workers/rc1-b1-coop-full-spec rules 1/3 (both already require this). m4a-spec M4A-18 only shows the ETA (`fmtAffordableIn`) on the highlighted row.

---

## RV-2: the goal bubble points at Collection when Farm is seconds away; ETA and affordability labels disagree
### Root cause
1. **Affordable-first selection (main cause).** Both pickers choose the best payback **among affordable options first**, and look at unaffordable ones only when nothing is affordable:
   - `src/ui/pick-hysteresis.ts:56` `best = bestOf(aff.length ? aff : rows)`, the shared hint and highlight picker (M4A-18 / M4A-41);
   - `src/ui/next-goal.ts:57` `pool = ready ? aff : c`.
   So any affordable option, even one with zero gain, beats a Farm level that is seconds away and has the better payback. This is the rule as specified (M4A-18 "best-payback **affordable** row"; hint over all options, HoP 16:15), so it's a best_roi/picker rule question, not a slip.
   - **Repro (`rv2.ts`, F14/C10/H17/V17, 3 workers, model income $145/s):** Farm $3,340 has a 516 s single payback and a 433 s bundle. Collection $1,099 has **gain $0.00/s** (its single-step payback is ∞; the 507 s bundle is only Collection then Farm). With Farm 13 s or 7 s away and Collection affordable, the bubble shows **"Collection L11: +5/tap | Ready!"**. Buying it moves the Farm ETA **13 s → 21 s** and **7 s → 15 s**, which matches the Critic's "13 s → 22 s". At 21 s away, with Collection unaffordable, it shows "Farm L15 | ~21 s". The best payback ignoring affordability is FARM in all three cases.
2. **Zero-gain options are still candidates.** `paybackOf` returns the **bundle** payback (`best-buy.ts:147-148`). An option with no gain of its own still gets a finite score through the look-ahead (Collection → Farm), so it stays eligible as "the affordable best".
3. **The best_roi model ignores live worker state** (`assumeWorking: true`, `best-buy.ts:73,116`; `income.ts` `workingClone`): Tired/asleep workers are scored as Working, and collection as 1 tap/s. That's why the bubble "never mentions sleeping workers" (B8). It's PM Workers' RV-3 area.
4. **Why the bubble and the cards disagree:**
   - (a) **Different targets.** The bubble follows the HINT pick over all options (Collection, workers…). The ETA is shown only on the HIGHLIGHT pick, Farm-tab rows only (`app.ts:500`, `best === ' best pending'`). In the repro the bubble says "Collection … Ready!" while the highlighted Farm row says "Ready in ~13 s", so one says Ready and the other is waiting. The "bubble ~27 s vs card ~0:21" style gaps are mostly two different targets side by side.
   - (b) **Three formats for one number.** Bubble `fmtTimeToAfford` "~21 s" (ceil, `format.ts:30-38`); Farm card "Ready in ~21 s" (same formatter); track cards `fmtAffordableIn` "Affordable in ~0:21", which collapses anything under 10 s to **"Affordable in a moment"** (`format.ts:72-77`) while the bubble still counts "~9 s".
   - (c) **Different refresh.** The bubble text updates at 1 Hz (`app.ts:417`), and Ready↔Waiting or target changes wait 2 consecutive ticks (`GoalHold(2)`, `app.ts:412`, `next-goal.ts:67`). The cards re-render every frame. So the bubble can lag the card by 1–2 s at transitions.
   - All three use the same rate I-1, so the rate itself doesn't differ. The gross-vs-net point (RV-5) applies to both equally.
### Fixes and classification
| Fix | What | Class | Effort |
|---|---|---|---|
| RV-2a: one ETA formatter | Track-card ETA uses the bubble/Farm-card formatter (`fmtTimeToAfford`, "Ready in ~X"), or all three use `fmtAffordableIn`; same <10 s rule everywhere. Art & UX picks the wording. | **A** (string/format only; `app.ts:500` + tests) | ~1 h + Art & UX copy call |
| RV-2b: no "Ready!" bubble vs waiting card contradiction | When the hint is off-tab (COLL/W*), the highlighted Farm-tab row's ETA still shows; no logic change, label only, e.g. the bubble shows the target name so it's clear they differ | **A**-ish (copy); needs Art & UX | ~1 h |
| RV-2c: wait rule | Show the best-payback option overall (affordable or not) unless an affordable one clears 0.9× of its payback; the hint then says "Farm L15 · ~13 s" instead of a worse affordable buy. The repo's own bot already does this (`tests/bot-m4.ts` `pickM4All`, "Wait rule", D-HOP-2026-10-19-02) | **B** (best_roi/picker rule; changes M4A-18/22/41 and gate M4A-40 behaviour) → M4.2 | ~0.5 day eng + re-run M4A-40 (`m4a_gate40.py`) and TR-5 |
| RV-2d: drop zero-gain candidates | An option whose single-step gain ≤ 0 is never picked while another option has gain > 0 | **B** → M4.2 | ~2–4 h + gates |
| RV-2e: live moods in scoring | best_roi scores with live worker moods (or flags asleep workers) | **B** → M4.2, with PM Workers' RV-3 | — |
**Spec touched:** m4a-spec §6 M4A-18 (switching rule, "affordable row"), M4A-41, §7 M4A-22 (selection), M4A-40 (follow-the-highlight bot); rc1-upgrade-clarity-spec UC6/UC7/UC17 (UC17 relies on Collection-first at start, so a wait rule must keep it); art-ux rc1-upgrade-value.md §3 (ETA strings). Queue RV-2: "a change to the best_roi rule waits for M4.2" → only RV-2a/b are M4.1 candidates.

---

## RV-4: "Balanced farm N/5" reads like a track count
### Where and what N means
- Strip text: `src/ui/tracks-ui.ts:28` → `Balanced farm {n}/{of} · next +{x}% at all ≥ {N}`, top tier `Balanced farm 5/5 · +{y}%`. Aria: `tracks-ui.ts:20-26` (`Balanced farm {n} of 5. Weakest: …`). Toast: `tracks-ui.ts:48` `Balanced farm {k}/5: +{x}% income`. Rendered in the **Farm tab bonus strip** (`app.ts:509`), **not the next-goal strip**, so the 27-character cap doesn't apply. The constraint is one line at 360 px (m4-tracks-copy rules: Nunito 14, ≤ 296 px). The current string is up to 41 characters, so options should stay ≤ ~40.
- **N = the Balanced tier reached (0–5)**, `balancedTier(F, H, V)` via `balancedStrip` (`src/sim/tracks.ts:40-43`): the number of thresholds 5/10/15/20/25 (economy `balanced{1..5}_level`) that **min(Farm, Hens, Egg value)** has reached. It has nothing to do with how many tracks there are (3). The Player's 1/5 with Hens 5, Egg 5, Farm 7 is tier 1 (min = 5), which is correct but reads as "1 of 5 tracks". `x` = the next tier's total bonus, not an increment.
- Copy source: art-ux/m4-tracks-copy.md §2; spec m4a-spec M4A-19 (strip), M4A-12 (toast), M4A-21 (text alternative).

### Copy options for Art & UX (drafts only; code points counted; examples are tier 1 with the next tier at L10)
| | Strip (working toward next) | k = 0 | Top tier | Toast |
|---|---|---|---|---|
| **1. Lead with the bonus (drop the counter)** | `Balance bonus +10% · all L10 → +15%` (35) | `Balance bonus · all L5 → +10%` (29) | `Balance bonus +30% (max)` (24) | `Balance bonus +15% income` (25) |
| **2. Keep the counter, call it a tier** | `Balance tier 1/5 · all L10 → +15%` (33) | `Balance tier 0/5 · all L5 → +10%` (32) | `Balance tier 5/5 · +30% (max)` (29) | `Balance tier 2/5: +15% income` (29) |
| **3. Say the rule** | `All 3 at L10 → +15% (now +10%)` (30) | `All 3 at L5 → +10%` (18) | `All 3 at L25: +30% (max)` (24) | `All 3 at L10: +15% income` (25) |
- Option 3 explains the rule best (it answers "never explained"), and options 1–2 are closest to today's layout. All fit in one line, ≤ 35 characters. The aria pattern can follow the chosen option (e.g. option 2: `Balance tier 1 of 5. All three tracks at level 10 for plus 15 percent. Weakest: Egg value, level 8.`).
- An explainer line or info tooltip ("Bonus when Hens, Egg value and Farm all reach the same level") would be new UI, not a string swap, so it's out of scope for M4.1.
### Classification
- **A: string-only**, `tracks-ui.ts:24-28, :48` plus the test expectations in `tests/m4a-tracks-ui.test.ts:10-23`. No logic, data or layout change; the strip stays one line. **Effort ~1 h eng + test update**, after Art & UX picks the copy. HoE/HoQA to confirm it fits 17:15. Spec to update when chosen: m4a-spec M4A-19/M4A-12/M4A-21 strings, m4-tracks-copy.md §2 (Art & UX owns it).

---

## Summary for HoP (D-HOP-36)
| Item | Root cause (file:line) | M4.1 candidate (A) | M4.2 (B) |
|---|---|---|---|
| RV-2 | Affordable-first pick `pick-hysteresis.ts:56` / `next-goal.ts:57` + zero-gain bundle scoring `best-buy.ts:147`; bubble and card follow different picks (`app.ts:419` vs `:500`) and use different formatters (`format.ts:30` vs `:72`) | RV-2a one ETA formatter (~1 h), RV-2b label clarity (~1 h), both with Art & UX | RV-2c wait rule, RV-2d zero-gain filter, RV-2e live moods |
| RV-4 | String `tracks-ui.ts:28/:48`; N = tier of min(F,H,V) over 5/10/15/20/25 (`tracks.ts:40-43`) | String swap (~1 h + tests) once Art & UX picks option 1/2/3 | — |
| RV-5 | 60 s rolling gross denominator lags real drops (fatigue), `format.ts:40-48`, `app.ts:61/382`; `EtaHold` unused `income.ts:106`. Gross-not-net bypass confirmed at `app.ts:419/470/500` (B-1 74512ea never merged), but wages are < 0.5 %, so that's not the cause | RV-5a net selector swap (~1–2 h): compliance only, doesn't fix the creep | RV-5b 5 s realized-net meter (port 74512ea) or the live-mood model; RV-5c wire EtaHold |
Every M4.1 item still needs HoE and HoQA to confirm it fits the 17:15 handoff (D-HOP-36).
