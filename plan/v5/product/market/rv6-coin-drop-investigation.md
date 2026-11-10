# RV-6: "Coins drop for no visible reason". Investigation (PM, Market/Customers)
2026-10-19, written 10:30 (Europe/Belgrade). Task RV-6 / D-HOP-36, due 14:00. Sources: `playtest/player-notes/2026-10-19-session-m4b.md`, `qa/reviews/m4b/shots/log.txt`, Critic note 3 (`product/critic/review-m4b-dd223f5-2026-10-19.md`).

## TL;DR
- **Build played:** release `m4b-dd223f5` (`/tmp/relchk/egg-farm.html`, sha256 `0bc5bb72…179a4c` re-verified, matches status.md). Source read at main `dd223f5` (extracted to `scratch/rv6/` with `git -C game archive dd223f5`).
- **The slow drift (09:26–09:29 coop full, and Critic's $248.02 → $247.19 at L6) is worker wages.** The Market Hand and Coop Hand are paid by time, even when there's nothing to sell or collect. **Nothing in the UI shows a wage** anywhere, so the drain is invisible. Reproduced on the real sim: idle at F5 with Market Hand only, −$1.25/min; at F6, −$1.50/min (Critic saw about $0.02/s, which matches).
- **The 10:14 drop ($1,543 → $369 in "a few seconds", right after Farm L23) is not wages and isn't any hidden sink.** At F23 wages are $17.25/min (0.29 $/s). Losing $1,174 that way would take about 65 min even in the worst case. A coin ledger over 20 × 62-minute sessions on the real sim shows that every coin change is a sale, a wage or a purchase (residual 0 cents). The largest non-purchase drop in any tick was $0.90. **Best fit: an unlogged Hens L15→16 buy ($1,842).** That's the only item affordable in that coin range, and $1,543 + about 2 s of income ($668) − $1,842 = **$369 exactly**. It has no toast and no "−$" feedback, so it reads as "no purchase". Needs one check to confirm (below).
- **Severity: S3 (Minor), not release-blocking** for M4 B (already Latest) or M4.1. No money is lost beyond the design (wages are at most 0.21% of gross sales in the sim, about 1% of the Player's observed income), and there's no data loss or crash. It hurts trust ("I'm losing money and don't know why"), and two reviewers reported it.
- **Fix (UI/copy only, freeze-compatible):** show wages where workers are (MK-60), a one-time first-wage toast (MK-61), a muted "−$X wages" tick on the coin pill only when coins fall with no sale or buy (MK-62), and a "−$X" spend pop on every purchase (MK-63, covers the 10:14 case). No economy or sim change. All values already exist in `src/ui/rates.ts`.

## 1. Every coin sink in dd223f5
`coinsCents` is lowered in exactly these places (searched with `rg "coinsCents"` over `src/`). Everything else only reads it or adds to it.

| # | Sink | Where (dd223f5) | Kind | Visible to the player? |
|---|---|---|---|---|
| 1 | Farm / Collection level | `src/sim/actions.ts:255-259` (`buy`) | one-off, on tap | coin pill drops, upgrade sparkle + level pop (`app.ts:395-399`); no "−$" text |
| 2 | Hens / Egg value level (M4-A tracks) | `actions.ts:262-266` (`buyTrack`) | one-off, on tap | same as 1; a toast only if a milestone/Balanced tier is reached |
| 3 | Hire worker | `actions.ts:290-295` | one-off, on tap | row changes to the worker card |
| 4 | Egg Grader tier | `actions.ts:296-301` | one-off, on tap | card text changes |
| 5 | **Wages: Market Hand 0.25 $/Farm level/min, Coop Hand 0.50** | `src/sim/tick.ts:71-83` (charged per action interval via `wageCharge`, `src/sim/workers.ts:47-55`; rates `src/config/balance.json:35-48`) | **continuous, by time** | **No.** No wage string in the shipped HTML (grep of `egg-farm.html`). `workers-ui.ts:53-76` shows energy/state only. Hire button is "Hire $40". `app.ts:378-401` has no case for `wage`. `ui.rates()` (net/wage per s, `app.ts:700-702`, `rates.ts:213-223`) is computed but never rendered (`main.ts:118`). |

Ruled out (checked in code):
- **Unpaid wage:** `tick.ts:79-80`. If coins < one action's wage (10 cents at F23), the worker turns Unpaid and is **not charged**. It costs output, not coins. The card shows "Unpaid ⚠" only in the Workers tab. It resumes when coins ≥ 1 min of wages (`tick.ts:58-69`).
- **Leave penalty (MK-27..MK-33a):** not in this build. `leave_penalty_share` is carried in `balance.json:387` (`m4.tc`, "unused by M4-A code") and nothing in `src/` reads it.
- **Sale variance:** sales only ever add coins (`actions.ts:245-254`). Demand/timeout variance changes the income rate, not the balance.
- **Refill / energy:** Manage and Manage all are free (`actions.ts:303-315`). There is no refill cost.
- **Tired workers:** pay the same wage per minute (interval 3 s / 4 s, wage scaled to the interval) for 1/3 to 1/2 of the output. That's a hidden cost in output, not in coins.
- **Non-sim paths:** the only other way coins can go down is the hidden-tab settle. If hidden ≥ 60 s, the provisional ≤ 60 s sim is dropped and the state reverts to the snapshot at hide (`src/game.ts:354`, C-AC36), plus loading an older save. Both come with a welcome-back modal or a reload, and the Player reported neither, so they're not this report.

## 2. Reproduction on the real game code
Harness: `scratch/rv6/rv6-harness.ts`. It imports `src/sim/*`, `src/config/balance.ts` and `src/ui/rates.ts` from dd223f5 unchanged, runs at 0.1 s ticks (game `tickHz` 10), and uses a hand-play bot (a tap every 1.5 s alternating Collect and Sell all, cheapest affordable buy, hires at the Player's levels F3/F7/F8/F18, Manage all at ≤ 25%). Run it with `cd scratch/rv6 && node_modules/.bin/vite-node rv6-harness.ts` (about 9 s). The bot earns more than the Player, so read the **wage amounts** as exact and the **shares** as a lower bound.

**Ledger check (20 seeds × 62 min):** every coin change matches sale − wage − purchase. Residual max 0 cents. The largest drop not caused by a purchase in one tick/action was 90 cents (a Coop Hand wage tick at F27).

**Wages vs income by Farm level (bot, 20 seeds):**

| Farm | Wages $/min (exact: 0.25F MH + 0.50F CH) | Gross sales $/min (bot) | Wages % of gross |
|---|---|---|---|
| F5 (MH) | 1.25 | 1,408 | 0.09% |
| F7 (MH+CH) | 5.06 | 2,413 | 0.21% (max) |
| F13 | 9.75 | 8,444 | 0.12% |
| F20 | 15.00 | 30,965 | 0.05% |
| F23 | 17.25 | 41,713 | 0.04% |

Against the **Player's own** income readings: L13, about $20/s → wages 0.16 $/s = 0.8%. L15 fatigue stretch, $20–30/s → 0.19 $/s ≈ 0.6–0.9%. L23, $310/s → 0.29 $/s = 0.09%.

**Scenario A: idle with nothing to sell (Player 09:26–09:29 "money drifts down when coop full"; Critic note 3).** 60 s, no taps, basket 0, no customers to serve:
- F5, Market Hand only: $248.02 → **$246.77** (−$1.25/min, −2.1 ¢/s).
- F6, Market Hand only: $248.02 → **$246.52** (−$1.50/min). The Critic measured "about $0.02/s" ($248.02 → $247.19), which matches.
- F13, coop *empty*, Market Hand + Coop Hand: **$9.75/min charged, 0 eggs collected**.
- The drift is real, steady and small. With income at 0 it's the only number moving, so the player notices it, and nothing explains it.

**Scenario B: the 10:14 moment.** State from the notes: F22, Hens 15, Egg value 20 (Jumbo, $12.24), Collect 15, all four workers hired, Grader tier 1, energy about 36%. (The last Manage all was ~10:05:15. At 1%/9 s that gives 24% at 10:16:40, the same as the Player's "Tired 24%".) Buy Farm L23 ($56,589) and land on $1,543:
- Player keeps tapping: coins never go below $1,543 in the next 30 s ($2,521 at +4 s, $8,665 at +30 s). Wages in 30 s: $8.25.
- Player hands-off (Market Hand only): lowest $1,542.24, then rising.
- Worst case (all Tired, nothing to sell): $1,543 → $1,534 in 30 s. **Losing $1,174 at that rate takes ~65 min.**
- **Conclusion: no sink in dd223f5 can produce $1,543 → $369 in seconds without a purchase.**

**What does fit:** the only buyable item in the range the coins could reach in "a few seconds" ($1,543 up to about $2,800) is **Hens L15→16 at $1,842**. Collection L16 is $11,529, Grader ×2 is $9,100, Egg value L21 is $14,397 and Farm L24 is $68,756. Hens L15 was the last Hens buy logged (~10:00:3x), and Hens 16 is within the F+3 cap. $1,543 + $668 (2.0–2.3 s at $293–330/s) − $1,842 = $369. The "Ready in" readings agree: (68,756 − 1,543)/229 s and (68,756 − 369)/233 s both give the same rolling income of ≈ $293.5/s, so coins really did fall by about $1.17K at constant income. It also matches the "no message" report. Hens 16 reaches no milestone, and min(F,H,V) = 16 doesn't change the Balanced tier, so there's **no toast**. The coin pill just jumps (`app.ts:515`, no "−$"). The upgrade sparkle is on the Hens row while the Player was watching the Farm card ETA. A mis-tap from the Farm button reflow (bug 3) is possible but not needed to explain it.
- **To confirm (QA / Player, 5 min):** if the 10:19 incognito tab is still open, check the Hens level (16 = unlogged buy), or run `eggfarmExportTelemetry()` and look for `upgrade {upgrade:'hens', newLevel:16, cost:184200, coinsBefore≈221100}` near 10:14:4x. If it's not confirmed, RV-6's second half stays "cannot reproduce" (needs-info), because the code has no other path.

Side note for RV-5 (PM Farm Upgrades, not mine): wages don't explain the ETA creep either. ETAs use the rolling 60 s **gross** sales (`format.ts:40-48`, `app.ts:470`) and leave out wages, but wages are ≤ 0.2% of income. "3:53 → 2:47 over 90 s" means coins grew at about 73% of the 60 s average. That fits workers turning Tired at about 10:15:40 (from the energy maths above), so real income falls below a lagging average.

## 3. Severity call (for HoQA / HoP)
**S3 – Minor. Does not block M4 B (Latest) or M4.1.** Scale used: S1 blocker (crash, data/coin loss, progression stop); S2 major (wrong economy result or misleading money UI with real cost); S3 minor (confusing, trust-eroding, no real cost); S4 cosmetic.
- Wages work as designed (m2-proposal; S2-8 exact-rate charge). Coins are never charged without a matching wage event, and the cost is economically tiny (≤ 0.21% of gross in the sim, ~1% of the Player's income).
- The real defect is **invisibility**. Wages are never shown before hiring or after, so any period with zero income shows money going down with no cause. Two independent reviewers (Player bug 2, Critic note 3) reported it, and it makes the ETA and the economy feel untrustworthy. Hence S3, not S4.
- The 10:14 drop is **S4 / needs-info** until confirmed. If it's the unlogged Hens buy, the gap is purchase feedback (no "−$"), which MK-63 covers. If it's a mis-tap, it folds into bug 3 (Farm button reflow).

## 4. Recommendation: visible explanation (UI/copy only, no economy change)
Smallest set that explains both reports, in priority order. All read existing values (`listedWageCentsPerSec`, `totalWageCentsPerSec`, `wage` sim events). No balance, sim or save change. That keeps them within the freeze rules for M4.1 **if HoP/CEO rule them in**, as with RV-4 string-only changes. They aren't on the D-CEO-20261019-11 list today, so the default is M4.2.
1. **Wage on the worker cards** (MK-60): the fact at the point of decision. Highest value, lowest risk.
2. **First-wage toast** (MK-61): one line, once per save.
3. **"−$X wages" tick on the coin pill, only when the balance is falling** (MK-62): explains exactly the moment players notice. Throttled so it never runs every second.
4. **"−$X" spend pop on every purchase** (MK-63): makes silent track buys (10:14) visible.
- Not recommended now: a permanent "net income/min" line on the HUD. It needs an income definition (rolling vs steady) that RV-5 is still deciding, and it would conflict with the ETA if they differ. Revisit with RV-5 in M4.2. A coin tick on every wage charge (every 1–2 s, a few cents) would be noise.

## 5. Draft ACs (MK-60 and up)
- **MK-60 (wage visible on worker cards).** In the Workers tab, a hired Market Hand or Coop Hand card shows "Wage $X/min" (X = `listedWageCentsPerSec` × 60 at the current Farm level, `fmtMoney`, e.g. "Wage $5.75/min" for Market Hand at F23). It updates in the same frame as a Farm level-up. Unpaid cards show "Wage $X/min · unpaid, needs $Y" (Y = `resumeNeedCents`). Before hire, the hire row reads "Hire $40 · paid $X/min" (X at the current Farm level). Hawker and Grader show no wage line. It fits at 360/375 px with no ellipsis (scrollWidth ≤ clientWidth).
- **MK-60a.** The shown X equals the wage actually charged: over 60 s of Working at a fixed Farm level, the sum of `wage` events for that worker = X × 100 cents ± 1 cent.
- **MK-61 (first-wage toast).** The first time a wage-paying worker is hired on a save, a toast shows within 1 s: "Market Hand earns $X/min, paid while working, even when there's nothing to sell." (Coop Hand: "...even when the coop is empty."). Once per worker per save (persisted flag; never after reload). It uses the existing toast host, `showToast` timing and queue, and is held while the explainer is open.
- **MK-62 (wage tick on the coin pill).** When coins went down over the last 5 s window with no sale credited and no purchase in that window (i.e. only `wage` events), the coin pill shows a muted "−$X wages" floater (X = the wage cents charged in that window). At most once per 10 s. Never while sales are crediting coins in the same window. Never for purchases. The aria-live coin text is unchanged (no extra announcements). Reduced motion: static text for 1.2 s, no float.
- **MK-62a.** The sum of the X values shown over any idle minute is within ±1 cent of the `wage` events in that minute (no invented or doubled amounts).
- **MK-63 (purchase spend pop).** Every purchase (Farm, Collection, Hens, Egg value, hire, Grader tier) shows a "−$X" pop on the coin pill in the same frame as the pill update (X = `upgrade.cost` / `worker_hire.cost` / `grader_tier.cost`, `fmtMoneyShort`). It's 650 ms, uses the existing `qpop` style in the muted spend colour, and has a reduced-motion static variant. One pop per purchase, including two buys in the same second.
- **MK-64 (no sim change).** With the same seed and inputs, coins, eggs, customer and worker events are identical with MK-60–63 on and off (presentation only, like MK-20).
- **MK-65 (telemetry for follow-up, optional).** Emit `wage_hint_shown {kind: 'toast'|'tick', worker?, cents?}` once per show, so HoQA can see how often players are in a wage-only drain.

## 6. Open items / owners
- HoQA / Player: the 5-minute Hens-level or telemetry check for 10:14 (§2 B).
- HoP: rule whether MK-60/61 (copy plus one card line) go into M4.1 or wait for M4.2. Art & UX: visuals for MK-62/63 (colour and position of the "−$" pop).
- PM Workers (RV-3): an Unpaid / Tired cue on the farm screen is theirs; MK-60's "unpaid, needs $Y" line only covers the Workers tab.

### MK-60/63 binding conditions (Head of QA, accepted by Head of Product, Oct 19 2026 10:32)
- MK-64 proof: identical AC7 trace hashes on seeds 1-200 with MK-60/63 on and off; balance.json and economy.csv unchanged.
- MK-63: the -$X pop equals the card price in the #56 format; with Manage all or rapid buys the pops must not stack or overlap at 360px.
- MK-60: shows only the wage cost "Wage $X/min" (from app.ts:700), never an income rate, so it can't contradict the RV-2 ETA.
- M4.1 entry conditions (a small PR off the integrated head by 15:00; last in the UI QA lane) are moot: Head of Engineering ruled no fit at 10:32, so under D-HOP-44 MK-60/63 move to M4.2, first in the M4.2 UI queue.

### MK-60/63 sign-off and visual spec (Oct 19 2026 10:32; for M4.2)
Sources: art-ux/copy/m41-mk60-mk63-wage-spend.md (Head of Art & UX) and Audio & Juice sign-off (juice-spec.md, audio-hooks.md).
- MK-60 hired card: "Wage $5.75/min". Unpaid card: line 1 "Wage $5.75/min", line 2 "⚠ Unpaid · needs $12.50" in Unpaid danger style. Hire row: button "Hire $40", muted caption under it "Wage $5.75/min". Never the word "paid". Wage cost only, never an income rate.
- MK-63 pop: "−$X" (U+2212), price in the #56 format, anchored under the coin pill on the right. Style: .qpop, token --c-spend: var(--c-cream), dark stroke, 14px, never red, AA on the pill background. Motion: 0-80ms opacity 0 to 1 and scale 0.9 to 1.0 ease-out; drifts down over 650ms; opacity 1 to 0 over 450-650ms; transform and opacity only. Drift distance (12px vs 16px) pending Art/Audio alignment.
- Rapid buys / Manage all (proposed by PM to satisfy Head of QA: each pop equals its card price and pops never overlap at 360): one pop per purchase, never summed; a new pop instantly replaces any pop still showing. Pending Art & UX and Audio & Juice agreement.
- Sound: none added (each purchase already plays its own sound per audio-hooks v1.3). No sound on wage hints.
- Reduced motion: no scale or drift; 100ms fade-in, hold, 150ms fade-out ending at 650ms.
- No aria announcement for each pop; aria-live coin text unchanged.
- Per-charge wage pops ("−$1.25 wages") belong to MK-62, which Head of Product already put in M4.2 (D-HOP-44).

- Update 10:33: Audio & Juice agreed: replacement (the old pop vanishes with no fade, and the new pop starts its full 650ms in the same frame), and a 16px drift. Waiting on Head of Art & UX to confirm the replacement rule.

- FINAL 10:33: Art & UX v1.1 (art-ux/copy/m41-mk60-mk63-wage-spend.md) is the source: replacement rule, 12px drift with no overshoot, no extra sound. Art and Audio each conceded the drift to the other, so Art & UX, which owns visuals, gets the final call: 12px. MK-60/63 fully signed off for M4.2.

### RV-6 resolution (Head of QA, Oct 19 2026)
The 10:14 drop is resolved and is not a bug. Hens was at L15 with no L16 buy. Telemetry (qa/reviews/m4b/shots/telemetry-1014.json) shows a Farm L23 buy at 10:14:45 (cost $56,589.00, leaving $369.51). The $1,543 reading was a misread, and Player retracted it. My Hens L16 hypothesis was wrong. Only the S3 wage drift remains (MK-60..65, parked for M4.2).
