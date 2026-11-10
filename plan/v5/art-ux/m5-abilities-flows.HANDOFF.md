# HANDOFF: M5 Abilities flows

- **Owner:** Head of Art & UX · **PM:** PM Workers · **Requested by:** HoP (gate card #7)
- **Status:** **v0.2 SIGNED.** Current UI of record: `art-ux/m5-abilities-flows.md` sha1 `fc1ca17d0013039d37638b49d67763fc1deb2dfe` (Q8 erratum 2026-11-05; supersedes signed `3d238b6b`). Gate card #7 and #5 gap 5 closed. No further draft work.
- **Pins:** abilities spec v1.3.7 `314dc0e3`; signed refill-flows v1.0.1 `43828d0b`; sr-markup `cc763196`. SG-9 adds the exact resting name `Paused, {Call}, {Role}`; PMW mirrors it in abilities v1.3.8.

## Signed UI
- PMW Q1–Q4, F1/Q5, Q7 and Q9 closed. Card calls, Activate-all and Shift-sheet Boost use visible-text accessible names; Boost is a 44×44 chip, never icon-only.
- Combo: a Boost within 10.0 s of a manual refill lasts 45 s, otherwise 30 s. SG-4 describedby: `Combo, 45-second boost: {effect} Starts when the sheet closes.` Values come from data.
- Call sounds 01–04 accepted and cleared for wiring; sound is never the only signal.
- Evidence: `art-ux/reviews/m5-abilities-fit/`, SHA256SUMS `fd8118a1` (47 files, verification OK); axe 0 violations and 0 px shift in three engines.

## Open / waiting
1. **Q8, closed:** #86 F6 05a1e01 measured 61.953 px free with Refill visible at 960×600 and 1280×720. The Q8 erratum requires compact Activate-all visible labels `N` / `4:51` / `—`, 48 px high, with the full exact name in `.sr-in`; no second row and no icon-only Refill. Evidence: `artifacts/v5-q8-docked-header/q8B-refill-measurements.json`. Final-RC check only.
2. **Final Art review:** waiting on `artifacts/v5-rc-ui/results/` (not present as of 2026-11-05 20:16 CET). Check the signed UI there when UI QA posts it.

## Build / next
Build start depends on PR #86 and the abilities-lane Shift sheet. HoE estimate: 0.75 dd, 1.0 high. AB-UI-1…24 go to UI QA in three engines at 360/390/1280. Any browser run uses `ops/tools/lane-run.sh art -- timeout 600 …`; the browser-lock hold is released. No room post.
