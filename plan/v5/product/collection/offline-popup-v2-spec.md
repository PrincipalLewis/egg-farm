# Offline popup v2 ("Welcome back") · v0.3 · 2026-10-16 · PM, Collection
Status: **APPROVED by Head of Product and Head of Art & UX (v0.3, 2026-10-16).** Supersedes feature-spec §11 / C-AC25 copy; §11 stays the rc1 baseline.
Trigger: Player session 3, pain #2 (product/session-3-player-playtest.md §4): money not shown, cap not explained, egg count > coop with no reason, short-form numbers made totals uncheckable.

## 1. Facts the popup must reflect (code: game/src/sim/offline.ts, game.ts:38-51, ui/app.ts:208-223)
- Grant = `floor(min(away, offlineCapSeconds) × offlineRateMultiplier × eggs_per_sec(Farm L at save))`; balance.json `offlineCapSeconds 7200` (2h), `offlineRateMultiplier 0.25`, `offlineMinSeconds 60`; economy.csv `offline_eggs_per_sec`, `offline_max_eggs_2h` (e.g. F15: 4.0/s, 28,800 max).
- Eggs go to the **Basket**, which is uncapped in M1; the coop cap does not apply (offline.ts:9). Eggs > coop capacity is by design. Players are not told about the Basket limit (no "no limit" text or tag anywhere).
- **No coins are earned while away** (HoP, Q1): nothing sells offline; coins change after return when the market/workers sell from the Basket. The popup shows what the eggs are worth when sold, not coins earned.
- Away time = save time → load time; today's `fmtAway` shows "2h+" at cap and hides the real duration.

## 2. Content (top to bottom)
1. Title: **"Welcome back!"**
2. Time line: **"Away {away} · capped at {cap}"** when away ≥ cap; **"Away {away}"** otherwise. `{away}` is real elapsed time, never "2h+" (e.g. "Away 3h 12m · capped at 2h"; "Away 11m 23s"; ≥ 24h: "Away 2d 4h · capped at 2h").
3. Hero: **"+{N} eggs"** (full digits with thousands separators, e.g. "+2,732 eggs"; "+1 egg"). **Pops on open** (juice-spec big-sale style); **counts up from 0 only when reduced motion is off** (reduced motion: static number, no pop scale).
4. Sub-line: **"added to your basket"**.
5. Money line: **"Worth up to {value} when sold"**, value = N × current egg price (incl. Collection/Grader bonuses; no frenzy/streak/ad boost), e.g. "Worth up to $86,400 when sold".
6. Rate line (small): **"{rate}/min offline · 25% of your farm's rate"** (e.g. "240/min offline"). **First to drop** when space is short.
7. Cap line, only when capped, clock icon + accent colour: **"⏱ Offline limit is 2h. Check in sooner to earn more."** (`2h` = offlineCapSeconds formatted). Not capped: nothing.
8. Button: **"Collect"**, full width of the card, **min height 48 px** (close × = same grant, no flyers, as today).
- **Accessibility:** the dialog's aria text spells amounts in full, e.g. "Welcome back. Away 3 hours 12 minutes, capped at 2 hours. Plus 28,800 eggs added to your basket. Worth up to 86,400 dollars when sold. Offline limit is 2 hours." The button is "Collect 28,800 eggs".

### Number format (Q2 decided by Art & UX)
- **Popup:** eggs always full digits with separators (no K/M/B up to 999,999,999,999). Money: full digits, **whole dollars from $1,000 up**, cents only under $1,000 (e.g. "$812.40", "$8,196", "$3,703,701"). Wrap rather than abbreviate.
- **HUD (global formatter change, `fmtMoney`/`fmtCount` in ui/format.ts):** money shows **full digits below $1M**: cents only under $1,000 ("$812.40"), whole dollars from $1,000 to $999,999 ("$10,412"), **K/M/B from $1M** ("$1.2M"). **Tabular numerals**; the HUD money slot reserves the width of **"$999,999"** so it never reflows. **No 10-second full-digit window.** So popup totals under $1M can be checked against the HUD directly.

## 3. Mobile layout (min width 360 px)
```
┌───────────────────────────────┐
│  [icon]   Welcome back!       │
│  Away 3h 12m · capped at 2h   │  ← line A (time, cap)
│       +28,800 eggs            │  ← line B hero (pop; count-up if motion allowed)
│     added to your basket      │
│  Worth up to $86,400 when sold│  ← money line
│     240/min offline · 25% …   │  ← rate line (drops first)
│ ⏱ Offline limit is 2h. Check in sooner to earn more. │ ← capped only, accent
│ [            Collect            ] │ ← full width, ≥ 48 px
└───────────────────────────────┘
```
- Minimum two lines always: line A and hero. All lines wrap, centred; nothing truncated or ellipsised. Card max height 80% viewport; if exceeded, the rate line drops first.

## 4. Acceptance criteria
- **C-AC27** Given away 11m 23s at Farm L15, when the popup shows, then line A reads "Away 11m 23s" (no cap text), the hero reads "+2,732 eggs" and no cap line is shown.
- **C-AC28** Given away 3h 12m (11,520 s) at Farm L15, then line A reads "Away 3h 12m · capped at 2h", the hero reads "+28,800 eggs" (= offline_max_eggs_2h for L15) and the cap line reads "⏱ Offline limit is 2h. Check in sooner to earn more." in the accent colour with the clock icon. Never "2h+".
- **C-AC29** Given N = 1,234,567 eggs and value $3,703,701, then both are shown in full digits with separators, money in whole dollars; no "K", "M" or "B" anywhere in the popup; no "no limit" text or tag appears.
- **C-AC30** Given the popup, then the money line reads "Worth up to $X when sold" where X = N × the egg price shown on the price UI at that moment (±$1 at ≥ $1,000, ±$0.01 below), whole dollars from $1,000, cents below; no "Coins while away" line exists.
- **C-AC31** Given N exceeds coop capacity (e.g. 2,732 vs 800), then the sub-line reads "added to your basket" and after Collect the Basket rises by exactly N before any market tick (carries C-AC25(d)).
- **C-AC32** Given away exactly at cap (7,200 s), then the cap line and "· capped at 2h" show; at 7,199 s neither does.
- **C-AC33** Layout: screenshots at 360×640, 375×700 and the **1280 docked width**, capped case at N = 1,234,567: line A and hero on separate lines, no truncation, Collect full width, ≥ 48 px tall and visible without scrolling; when height is short, the rate line is the first to drop.
- **C-AC34** Given N = 1, then the hero reads "+1 egg" and the money line uses the single-egg price.
- **C-AC37** Given reduced motion off, the hero pops and counts up to N; given reduced motion on, it shows N statically with no count-up and no pop scale.
- **C-AC38** Given a screen reader, the dialog's accessible text spells amounts in full (no K/M/B, units in words) and the Collect button's name includes the egg count.
- **C-AC39** HUD: given coins $812.40 / $10,412.37 / $999,999.99 / $1,234,567, the HUD shows "$812.40" / "$10,412" / "$999,999" / "$1.23M" (current short-form rule ≥ $1M), in tabular numerals, and the money slot width does not change between $1,000 and $999,999.
- **C-AC36** Given the same save, when (a) the tab stays open but hidden for H ≥ 60 s and is then shown, and (b) the game is closed and reloaded after the same H, then the resulting state (eggs, Basket, coins, worker energy, customers) is identical within rounding, and the same welcome popup (same N, away time, cap line, worth line) shows in both. Depends on fixing the S2 hidden-tab defect (product/collection/bug-offline-overcredit.md: main.ts:58 + game.ts:105-111) via the visibility hook shared with telemetry-spec v0.6.1 (hidden ≥ `session_hidden_end_s`/`offlineMinSeconds` routes through the offline grant).
- **C-AC35** Given away < 60 s or a negative clock delta, then no popup shows (unchanged AC11).

## 5. Open questions
- ~~Q1~~ **Closed (HoP, 2026-10-16):** offline coins stay $0; the popup shows the worth line (now "Worth up to $X when sold", v0.3). No economy change.
- ~~Q2~~ **Closed (Art & UX, 2026-10-16):** HUD full digits below $1M (cents under $1,000, whole dollars $1,000+), K/M/B from $1M, tabular numerals, width reserved for "$999,999"; no 10 s window (§2 Number format).
- **S2 fix in progress:** Saves is building the visibility hook now as the S2 hidden-tab fix, verified against C-AC36.
- **Q3 (PM Workers):** add "Workers fell asleep while you were away" to the popup (pain #1)? Out of scope here; slot reserved under the money line.

## v0.2 (2026-10-16 23:40)
- HoP approved Q1: offline coins stay $0 with the worth line, now "Worth up to $X at today's prices". "(no limit)" dropped; sub-line is "added to your basket". C-AC36 added (hidden tab ≡ close-and-reload).

## v0.3 (2026-10-16 23:45): Art & UX review folded in, approved by HoP and Art & UX
- Q2 closed (HUD full digits below $1M, tabular numerals, $999,999 reserved width; popup money whole dollars from $1,000). "Coins while away" line removed. Money line "Worth up to $X when sold" (C-AC30 updated). Cap line "⏱ Offline limit is 2h. Check in sooner to earn more." No "no limit" anywhere. Rate line kept, drops first. Hero pop + count-up (motion only). Collect full width ≥ 48 px; aria amounts in full. C-AC33 adds 1280 docked. New C-AC37–39. Saves building the visibility hook (S2) against C-AC36.

## v0.3.1 (2026-10-17 02:53, PM Collection, answering UI's build questions)
- C-AC27 corrected: 11m 23s (683 s) at L15 gives +2,732 eggs. The old 11m 11s figure gives 2,684.
- Egg counts (the Basket and coop HUD) follow the same full-digit rule as money: full digits with separators under 1,000,000, K/M/B from 1M, tabular numerals, and reserved width for "999,999". This matches the popup hero. (C-AC39 extended.)
- A hide of ≥ 60 s showing the Welcome popup on return is INTENDED (C-AC36: a hidden tab gives exactly the offline result and popup).
