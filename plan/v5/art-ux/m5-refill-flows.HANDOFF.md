# HANDOFF: M5 Refill flows (rc2Refill → autoRefill)
- **Owner:** Head of Art & UX · **PM:** PM Workers · **Asked by:** HoP (gate cards #6a/#6b/#10)
- **Status (2026-10-30 13:32 CET): SIGNED v1.0.1** sha1 `43828d0b5c7b4a9939477444a71053492cd1aeb2` (decisions.md 13:32). Errata only vs v1.0, plus a Boost-slot note (D-HOP-35; abilities v0.2 owns it).
- **Pins:** rc2-refill v1.3 2fdd84a2 (AC-RF2), failure-cost v0.3.19 4f5bbc5c.
- **Required markup (PMW mirror, Eng build):** `.lbl` + inline `.sr-in`, no aria-label, exact names. Snippet `reviews/m5-refill-axe/sr-markup.md`.
- **Evidence:** `reviews/m5-refill-axe/results-v101.json` (13:24) shows 0/0 axe and exact names in 3 engines × 360/390/1280. SHA256SUMS f883d526, -c OK.
- **Flags:** `m4.flags.rc2Refill`, `m4.flags.autoRefill`. v5 ships with all flags on (D-CEO-20261030-09/-10, rule 2).

## Definition of done
1. ~~PMW errata landed~~ 2. ~~Name rule~~ (NAME-FINAL, exact) 3. ~~Art sign~~ (13:32)
4. Sha and markup go to PMW, HoQA and HoP. RF-UI-1…20 are checked by UI QA on the final RC only (3 engines, 360/390/1024 docked/1280).

## Not in scope
Economy numbers, Refill all, auto on the card, a global auto switch (refused by PMW), Boost placement (abilities v0.2).
