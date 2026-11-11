# First-minute v0.2 — testability review (doc only, no browser)
Doc: product/collection/first-minute-proposal.md v0.2 (2026-10-17). Reviewer: QA UI/Layout. Requested by Head of QA.

## CSV pin
- sha256(product/economy.csv) today = 86f0e80e359398e3… → **matches pin 86f0e80e3593**.
- History check NOT possible: /workspace/egg-farm-studio is not a git repo, and the doc's "(git )" field is empty. REWRITE: fill in the git commit for the pin (e.g. "sha256:86f0e80e3593 @ <commit>").
- Status mismatch: line 3 says "APPROVED for build by HoP", line 4 says the 10-egg start "awaits Economy modelling and HoP approval". Pick one. Suggest: "UI parts (FM-AC4–10) approved; FM-AC1–3 depend on the 10-egg start, pending Economy+HoP."

## Global gaps
- G1 Pulse vs pointer timing has no tolerance. Proposed: pointer visible at 3,000 ms ±150 ms after first interactive frame; pulse removed within 1 frame (≤ 50 ms) of the pointer appearing; t0 = first frame with `build-id` set and Collect enabled.
- G2 "Fresh save" not defined. Proposed: empty localStorage/IndexedDB in a new browser context, no `?debug`, build id verified, session_index=1.
- G3 "Pulsing" is not defined in a testable way. Proposed: element has the class `.pulse` (or whatever the class is named), or computed `animation-name` ≠ none. Reduced motion: outline-width 3px and animation-name none.
- G4 Caption identity: give the exact rendered text (no markdown **), with wrap allowed, and with no truncation/ellipsis or clipping (scrollWidth ≤ clientWidth).
- G5 TTFU < 10 s is telemetry. **FM-AC3 treats it as a gate ("min ≥ 10 s") → REWRITE.**
- G6 Viewports: ACs only list 360/390/1280. The QA matrix also covers 375/430, 1024x474, 1280x720 and 1366x768. Decide whether "docked" means ≥1024.

## Per AC (a measurable / b caption identity / c 10-egg fresh save)
| AC | a | b | c | Verdict |
|---|---|---|---|---|
| FM-AC1 | partial: "within 3 s", but how is pulsing judged? | n/a | yes, if approved; the conditional must be explicit | REWRITE |
| FM-AC2 | yes, ≤5,000 ms, bot taps at 1 s; this is a fgMs telemetry check | n/a | doesn't depend on coop size (alt C: first tap ≥3.3 s still ≤5 s) | OK (note it's verifiable in the test harness via the event log) |
| FM-AC3 | sim stats; min ≥10 s is the telemetry bug floor used as a gate | n/a | n/a | REWRITE |
| FM-AC4 | text yes; wrap/clipping not defined; "1280 (docked)" ambiguous; markdown ** in the strings | partial | n/a | REWRITE |
| FM-AC5 | mostly: "in view" and "exactly once" not defined; N format not given | n/a | n/a | REWRITE |
| FM-AC6 | same gaps as AC5 | n/a | n/a | REWRITE (inherits) |
| FM-AC7 | values given; no tolerance on scale or period; glow not measurable | n/a | n/a | REWRITE |
| FM-AC8 | yes: sampled every 100 ms, ≤1 | n/a | n/a | OK (needs the G3 definition) |
| FM-AC9 | no timing tolerance (G1) | n/a | fresh load is OK | REWRITE |
| FM-AC10 | inherits AC5/6; "outside FTUE" trigger not defined | n/a | n/a | REWRITE (minor) |

## Suggested exact wording
- **FM-AC1** "Given a fresh save (G2) on a build with START_COOP=10: at t0 the coop label reads 10, Collect is enabled and pulsing (G3). A tap at t0+1,000 ms sets coop to 5 (±1, because laying continues) and emits `collect.eggs = 5`. Not applicable under alt C; there, AC1-C applies: coop 0, Collect pulsing at t0, and it gives no eggs until floor(coop) ≥ 5 (≈3.3 s ±0.2 s)."
- **FM-AC3** "Sim (seller15 and cheapest, seeds 1–30, CSV 86f0e80e3593): TTFU p50 ≤ 30 s and p75 ≤ 45 s. Report min TTFU, informational only. < 10 s is a telemetry bug flag, not a QA gate."
- **FM-AC4** "At 360×800, 375, 390×844, 430, 1024×474, 1280×720 and 1366×768, step 1/2/3 caption textContent equals exactly 'Tap Collect to gather eggs.' / 'A customer! Tap Sell to earn coins.' / 'Buy your first upgrade: more eggs per tap.' (bold allowed on Collect and Sell). Wrapping is allowed; no ellipsis; the caption box has scrollWidth ≤ clientWidth and sits fully inside the viewport. Only the pointer target differs: customer chip or Upgrades nav at <1024 with the sheet closed, Sell or Buy when docked."
- **FM-AC5** "With coins < cost, the hint text equals '$N to go · Upgrades ›', where N = cost − coins in the game money format and updates within 250 ms of a coin change. Hit area ≥ 44×44 CSS px. Tap: at <1024, the Upgrades tab is active; when docked, the target card is ≥ 90% inside the panel viewport within 600 ms. The target Buy gets exactly 1 pulse cycle (1.2 s ±0.1 s), then none."
- **FM-AC6** "When coins ≥ cost, the hint equals 'Ready! Tap to buy.' within 250 ms; the tap behaves as in AC5."
- **FM-AC7** "Pulse: peak scale 1.06 ±0.01 (computed transform), period 1,200 ms ±50 ms, and an outline/box-shadow present. It stops (no pulse class/animation) within 100 ms of the first tap and does not return. Under prefers-reduced-motion: reduce, animation-name is none, the transform stays identity, and there is a 3 px outline."
- **FM-AC9** "From fresh load t0, Collect pulses at t0 (≤ 100 ms). No tap: the pointer hand is visible (G-strict visibility) at 3,000 ±150 ms, and the Collect pulse is gone within 50 ms of the pointer appearing. Tap at 1,000 ms: no pointer for step 1 through t0+6 s. In 100 ms samples, pulse and pointer are never both visible."
- **FM-AC10** "When no FTUE step is active and the next-goal hint shows, it meets FM-AC5/6 for the card it names (next affordable upgrade per goal logic)."

## Not run
No browser, sim or telemetry. This is a review of the doc only. CSV git history not checked (no repo).
