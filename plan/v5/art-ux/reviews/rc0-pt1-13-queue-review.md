# rc0 review: PT1-13 (3de7d11) + customer queue vs m3-customer-queue-spec v1.1
Reviewer: Art & UX · 2026-10-16 00:40 · Sources: engineering/screenshots/pt1-13/*.png (WebKit 360/375/390 × F0/F25), engineering/screenshots/rc0-queue/*.png + queue-qa-{chromium,webkit}.json
**Verdict: PASS with 3 fixes required before QA (F1–F3), 2 minor (F4–F5).**

## PT1-13
| item | result | notes |
|---|---|---|
| No sideways overflow 360/375/390 | PASS | Nothing clipped at the right edge on any width; nav labels and HUD pills are whole. |
| Collect bar fully visible | PASS | "Collect +5 · 4 ready" / "Collect +130" are fully above the nav at all six sizes. |
| Next-goal chip fully visible | PASS | The chip ("Collection L1: +5/tap") is whole, with its icon and the "—" status. |
| 44px targets | PASS (visual) | Collect, the nav, the chips and the queue "+N" look ≥44px. Can't be measured from PNGs; JSON QA16 shows the Sell button rect at 88×44. |
| F25 queue strip | **FAIL → F1** | The "Coop upgraded! +1 customer slot" toast sits over the queue strip and covers the "Queue full" badge ("…eue full"), the 2nd–4th chips and the "+N" chip. It also shows at F25, but slots cap at F20 (queue_max 10), so the copy is wrong there. |

## Queue (spec v1.1)
| item | result | notes |
|---|---|---|
| 4 cards at 360×640 + "+N waiting" | PASS | 4 cards; the chip is a dark pill, ~44px; Sell all stays sticky. |
| 5 cards at 390×844 | NOT VERIFIED | No 390 queue screenshot was supplied. Please add `queue-f24-390-{chromium,webkit}.png`. |
| Order line format "{have}/{want} eggs · ${value}" | **FAIL (minor) → F4** | Renders "48/48 eggs· $359.04" with no space before the "·". The values are the full order value ✔, never $0.00 on cards ✔ ("0/50 eggs · $374.00"). |
| States: Need / Sell k / Sell + green outline | PASS | "Need 50" outline button; Ready has the green outline + "Sell". |
| Progress bar | PASS | Full at 48/48, empty track at 0/50. |
| Never "$0.00" in Market | **FAIL → F2** | The disabled footer reads "Sell all (0 eggs · $0.00)". |
| Farm strip 4 + "+N" opens Market | PASS | JSON QA19: chips 4, "+6", marketOpened. |
| Strip vs Market count consistency | **CHECK → F5** | In queue-f24-360 the strip shows "+5" while the Market chip shows "+6 waiting" in the same frame. That's probably the 2s coalescing on different timers. Both should use one coalesced value. |
| Anti-churn QA13–17 | PASS | 0 moves / 0 replaced, CLS 0, 0 long tasks, chip/live writes ≥2000ms apart, scroll 0px, tap rect stable; F24 frames p95 16.8ms. |
| QA18 partial leave | PASS | |
| Farm row "+1 customer slot" (QA20) | PASS | At F4/F9/F14/F19 the lead line and aria are right; it's absent at F3/F20; the order line is omitted at F19 (no range change) ✔. Single lines at 360 ✔. |
| Sell coin "+$359.04" fx | PASS (note) | The floating text overlaps the card above for ~0.7s; that's fine, it's decorative/aria-hidden. |

## Fixes
- **F1 (required):** show the slot toast only when `queue_max` actually increases (F5/10/15/20). At other levels use "Coop upgraded!". Place toasts below the queue strip (top = HUD + strip + 8px), never over it, and keep the "Queue full" badge inside the strip box (`right:8px`).
- **F2 (required):** disabled Sell all with 0 eggs reads "Sell all", or "No eggs to sell", with no amount. Never "$0.00".
- **F3 (required):** supply 390×844 queue screenshots (5 cards + "+5 waiting") so the 5-card rule can be verified.
- **F4 (minor):** the separator is " · " (space, middot, space): `${have}/${want} eggs · ${fmt(value)}`.
- **F5 (minor):** the strip "+N" and the Market "+N waiting" read from the same coalesced counter.
