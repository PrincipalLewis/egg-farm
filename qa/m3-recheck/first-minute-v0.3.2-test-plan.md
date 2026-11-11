# First-minute v0.3.2 — test plan rows
Doc: `product/collection/first-minute-proposal.md` v0.3.2 (2026-10-17). Author: QA UI/Layout. Traces FM-AC1–10.

## Pin and CSV status
- **Plan pin:** `economy.csv` sha256 `9980ec22410b96c1ca4025eb994b8ab131937302cac123e1f86b3847b97e974b` (`start_coop_eggs=10`; built on top of `6dca24cd…`).
- **Current `product/economy.csv`:** sha256 `6dca24cd50a6fd6f11c361e16d8b3c797fddea7fe0155c1d9e79006f99845455` — **does not match the pin**. No `start_coop_eggs` column. Pin CSV exists at `scratch/coop10/economy.f1-m4cols.csv` / Features prep; not yet promoted to `product/economy.csv`.
- **FM-AC1 / FM-AC3:** **BLOCKED** until Features' CSV PR and UI's consumer land in `feat/first-minute-v02`.

## Common setup
- Fresh save (G2): empty localStorage/IndexedDB in a new browser context, no `?debug`, build-id verified at runtime, `session_index=1`.
- Own port (not :4173), one engine at a time.
- Engines E3 = Chromium, Firefox, WebKit.
- **t0:** first frame with `build-id` set and Collect enabled.
- **Pulsing (G3):** element has the pulse class (`.pulse`, or the shipped class name) or computed `animation-name` ≠ none. Under reduced motion: `outline-width` 3 px and `animation-name` none.

## Viewport matrix (8) — from v0.3.1 addendum
| Tag | Size | Layout |
|---|---|---|
| 360 | 360×844 | mobile |
| 375 | 375×844 | mobile |
| 390 | 390×844 | mobile |
| 430 | 430×844 | mobile |
| 1280×800 | 1280×800 | mobile layout if width rule applies; include in matrix |
| 1024d | 1024×474 | **docked** (width ≥ 1024) |
| 1280d | 1280×720 | **docked** |
| 1366d | 1366×768 | **docked** |

**Docked = width ≥ 1024 px.** Widths < 1024 use the mobile layout (sheet / nav).

VP-ALL = the 8 sizes above.

## G-strict visibility (v0.3.1; used by FM-AC9 / FM-T09*)
An element is visible only when **all** hold:
1. `getBoundingClientRect()` width and height > 0
2. `offsetParent` is not null (no `display:none` ancestor)
3. computed `opacity` > 0 on it and all ancestors
4. computed `visibility` is not `hidden`
5. its rect intersects the viewport

"Not visible" = any one fails. Apply this when asserting the pointer hand appears/disappears.

## Rows

| ID | AC | Status | Setup | Steps | Expected / tolerance | Viewports | Engines |
|---|---|---|---|---|---|---|---|
| FM-T01 | AC1 | **BLOCKED** (CSV+UI consumer in `feat/first-minute-v02`) | fresh, build with START_COOP=10 / pin CSV | load; read coop at t0; tap Collect at t0+1,000 ms | coop label **10** at t0; Collect enabled and pulsing (G3); after tap coop **5±1**, `collect.eggs=5` | 390, 1280d | E3 |
| FM-T02 | AC2 | READY | fresh | bot taps at 1 s (or on the prompt); read event log | first `tap` window with `eggs>0` has `fgMs ≤ 5,000` | 390 | E3 |
| FM-T03 | AC3 | **BLOCKED** (same gate as AC1; needs pin CSV in sim) | sim, CSV `9980ec22410b…` | seller15 and cheapest, seeds 1–30 | TTFU p50 ≤ 30 s, p75 ≤ 45 s; report min (info only); **&lt; 10 s is telemetry bug flag, not a QA gate** | n/a | node |
| FM-T04 | AC4 | READY* | fresh | walk steps 1–3; capture caption `textContent` and rects | exact: `'Tap Collect to gather eggs.'` / `'A customer! Tap Sell to earn coins.'` / `'Buy your first upgrade: more eggs per tap.'` (bold OK on Collect/Sell); wrap OK; no ellipsis; `scrollWidth ≤ clientWidth`; caption fully inside viewport; pointer target: customer chip or Upgrades nav at &lt;1024 sheet-closed, Sell or Buy when docked | VP-ALL | E3 |
| FM-T05 | AC5 | READY | after first sale, coins &lt; cost | read hint; measure hit rect; tap | `'$N to go · Upgrades ›'`, N = cost−coins in game money format, updates ≤250 ms; hit ≥44×44 CSS px; tap → Upgrades tab active (&lt;1024) or target card ≥90% in panel viewport ≤600 ms (docked); target Buy exactly 1 pulse cycle (1.2 s ±0.1 s), then none | VP-ALL | E3 |
| FM-T06 | AC6 | READY | coins ≥ cost | read hint; tap | `'Ready! Tap to buy.'` ≤250 ms; same open/scroll + single pulse as T05 | 390, 1024d, 1366d | E3 |
| FM-T07 | AC7 | READY | fresh | sample Collect transform every 50 ms for 3 s; tap; keep sampling | peak scale 1.06±0.01; period 1,200±50 ms; outline/box-shadow present; stops (no pulse class/animation) ≤100 ms after first tap and does not return | 390, 1280d | E3 |
| FM-T07RM | AC7 | READY | fresh, `prefers-reduced-motion: reduce` | load; inspect Collect | `animation-name` none; identity transform; 3 px outline | 390, 1280d | E3 |
| FM-T08 | AC8 | READY | fresh | sample every 100 ms through FTUE and to 120 s; count pulsing elements | count ≤ 1 at every sample | 390, 1024d | E3 |
| FM-T09a | AC9 | READY | fresh | no input; sample pointer + pulse every 50 ms for 0–6 s; pointer judged by **G-strict** | Collect pulses at t0 (≤100 ms); pointer G-strict-visible at 3,000±150 ms; Collect pulse gone ≤50 ms after pointer appears; never both visible in 100 ms samples | 360, 390, 1280d | E3 |
| FM-T09b | AC9 | READY | fresh | tap Collect at 1,000 ms | no step-1 pointer through t0+6 s (G-strict) | 390, 1280d | E3 |
| FM-T10 | AC10 | READY | after FTUE (no step active), next-goal hint showing | wait for next-goal hint; repeat T05 and T06 for the named card | as T05/T06 for next affordable upgrade per goal logic | 390, 1366d | E3 |
| FM-A11Y1 | AC4/5/6 | READY | fresh | axe at each step; hint role=button or link with accessible name containing the text; Enter/Space activates; focus visible | 0 serious/critical axe; keyboard operable | 390, 1280d | Chromium (axe), Firefox/WebKit keyboard |
| FM-A11Y2 | AC4 | READY | fresh | caption in live region; announces on step change | `aria-live=polite` and text updates | 390 | Chromium |
| FM-RM2 | AC5/9 | READY | `prefers-reduced-motion: reduce` | trigger Buy pulse and pointer | Buy: static outline, no scale; pointer shows without motion | 390 | E3 |

\*FM-T04 READY for copy/layout once UI ships unified captions; does not depend on `start_coop_eggs`. Run on the branch that lands the consumer even if CSV is still pending, but mark evidence with build SHA.

## Dropped vs v0.2 plan
- **FM-T01C (AC1 alt C)** — removed. Alt C dropped from the proposal; 10-egg start (alt A) is approved.

## Retrace / mismatch flags (AC text vs this plan vs matrix)

| AC | Traces to v0.3.2? | Flag |
|---|---|---|
| FM-AC1 | Yes (START_COOP=10, coop 10→5±1, `collect.eggs=5`) | BLOCKED on Features CSV PR + UI consumer. Current `product/economy.csv` ≠ pin. |
| FM-AC2 | Yes (`fgMs ≤ 5,000`, bot at 1 s) | None. Runnable without start_coop if eggs arrive by other means; still prefer pin build. |
| FM-AC3 | Yes (CSV `9980ec22410b…`, p50/p75 gates; min info-only; &lt;10 s not a gate) | BLOCKED same as AC1. |
| FM-AC4 | Mostly | **Mismatch:** AC4 body lists `360×800` and omits `1280×800`; v0.3.1 matrix says phones **844 tall** and includes `1280×800` (8 sizes). Plan uses the matrix. Ask PM Collection to align AC4 enumeration with the matrix (360/375/390/430 ×844 + 1280×800 + three docked). |
| FM-AC5 | Yes | None. |
| FM-AC6 | Yes | None. |
| FM-AC7 | Yes | None. |
| FM-AC8 | Yes | None. |
| FM-AC9 | Yes (G-strict, 3,000±150, pulse≤100 ms, never both) | Definitions block still cites "G-strict visibility" without repeating the addendum; plan embeds the full definition above. |
| FM-AC10 | Yes | None. |
| Definitions | Mixed | Definitions § still says `360×800, 375, 390×844, 430…`; addendum v0.3.1 is authoritative for heights. |

## Untestable / blocked AC text (until Features + UI land)
- **FM-AC1** full text requires a build with `START_COOP=10` / pin CSV and UI reading it — cannot verify coop label 10 or the t0+1 s collect on current main CSV.
- **FM-AC3** sim pin `9980ec22410b…` is not `product/economy.csv` yet — cannot run the gated sim against the approved pin in-tree.

## Changelog
- **2026-10-17 08:42 CEST (v0.3.2):** Re-pinned to `9980ec22410b…` (`start_coop_eggs=10`). Noted current `product/economy.csv` = `6dca24cd…` (no match). Dropped FM-T01C (alt C). Viewport matrix → phones 360/375/390/430 at 844 tall, 1280×800, docked 1024×474 / 1280×720 / 1366×768 (docked ≥1024). Embedded G-strict visibility. Marked FM-T01 / FM-T03 **BLOCKED** on Features CSV PR + UI consumer in `feat/first-minute-v02`. Retraced all rows to v0.3.2 AC text; flagged AC4 viewport enumeration vs matrix mismatch.
- **2026-10-17 (v0.2 draft):** Initial rows from testability review of proposal v0.2.
