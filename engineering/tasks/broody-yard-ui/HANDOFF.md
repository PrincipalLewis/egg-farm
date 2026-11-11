# HANDOFF: HoE/gen-broody-yard-ui + HoE/v5-broody-accrual (owner: Generalist)
Status: paper only until Thu ~18:00 CET. One PR owns the nest (sim + UI). Branch gen/broody-yard-ui off rc/v5, stacked after Breeds PR-B (Brahma/Cochin sprites for AC34 pt2).

## Pins
- Broody spec product/collection/m5-broody-hen-spec.md v1.3.3 4441a1d9 (replaces v1.3.2 f180c3ff)
- Art art-ux/m5-broody-hen-art.md v0.2 4169c17b (§3 states, §5 nest); card product/m5-gate-acs.md e485f762 #8 L179-205
- PMC checklist product/collection/broody-yard-ui-build-checklist.md 6999d1ff
- Copied assets: overlay-broody-nest.svg 7de37176, @2x png 15798919, sfx-broody-ready-01, sfx-broody-collect-01..03 (pin every sha1 in the PR body; never write art-ux/)

## Sim gap found 01:40 (rc/v5 @ fetch)
Only these exist on rc/v5: the save fields (broodyNestCents, broodyHenIdx, m5-fields clamp), brRng (sim/rng.ts), and, in #125, broodyBpEff (breeds-traits.ts). Nothing calls nestScaled accrual, tapBroody, the hen slot pick or the state machine. So the "inert accrual" is the whole Broody nest sim missing, not just a missing caller.
Sim to build:
- unlock on the first Coop Hand hire, plus the first slot pick via brRng (BRO-AC3, AC7)
- R7 accrual in nestScaled at I_ref × share × broodyBpEff, cap; ready ≥ max(1¢, tc_broody_ready_share × cap) (BRO-AC4: 12,375¢ at 150 s, ready at 75.000 s)
- menu/hidden freeze, and workers never empty the nest (BRO-AC5)
- offline rule per spec
- tapBroody pays floor(nest) and the hen moves (no streak tap, STK-AC8)
- broody_hen telemetry per spec; flag 0 → no events, saves byte-identical (BRO-AC1)
Coordinate with Saves: #125 touches breeds-traits.ts and offline.ts. Import broodyBpEff and don't edit it. Whichever lands second merges forward.

## UI
§3 layer stack and states (brooding/ready/full/frozen/collected), R12 tap/keyboard/aria plus the live region, reduced motion, coin fly/puff/popup clamp, §C slot rects, the no-feet-below-nest-top test (Brahma/Cochin), and BRO-UI1 goldens at 3 viewports × 3 browsers.

## Hours
UI 7-9 h (accepted) + sim 6-8 h = 13-17 h.

## Sim half (Generalist, 2026-11-10 04:00 CET, WIP stop per D-CEO-20261110-17)
Branch gen/broody-sim off #125 fix head 2b760d1c (base saves/breeds-sim-prB-traits). Tip 03888f96; red-first 24dd0fe. Pins: spec v1.3.3 4441a1d9; card #8 e485f762 L179-205 (card text still cites v1.3.2 f180c3ff).
Done (flag m4.flags.broody, default 0):
- src/sim/broody.ts: unlock at the first Coop Hand hire (the unlock tick accrues nothing, BH-AC2); brRng slot pick into the UI's eligible slot ids (`broodySlots`); R7 scaled accrual × broodyBpEff (read-only import), cap, sticky ready, BigInt guard past 2^53 (BR-AC14); menu freeze (focus ms only); tapBroody pays floor(nest), then the hen moves; R20a reset expired; read-only `broodyView()` {state hidden/brooding/ready/full/frozen, slot, nestCents, tappable}.
- Runtime `broodyRun` is session-only (SESSION_ONLY_KEYS; breedsCalm kept). Nest saved as broodyNestCents (sub-cent remainder session-only).
- offline.ts: +1 import (L8) and +1 line (L37) after Saves' lines, unchanged otherwise: `state = broodyKeepOffline(s, state, b);`.
- income-ref is on for tapCoins OR broody (R7 reads I_ref).
- Game: setYardProbe(fn), broodyLayoutChanged(), tapBroody(), broodyView(); session_end gets broody_cents/broody_collects (spreads only, T-AC9).
- Tests: tests/v5-broody-sim.test.ts 35 pass; four existing fixtures got broody: 0 / strip keys (f1a, f1b, income-ref, tap-coins).
Gates so far: tsc 0; focused 45 files / 833 pass; flag-0 trace (shipping, ON broody 0, m4 off broody 1) sha1-identical base vs tip, and sensitive with broody 1. NOT run: k10 (interrupted by the stop), full npm test, build. PR stays Draft.
Open questions: full needs cap > 0 (I_ss = 0 nest shows ready, B2c/BH-AC29); nest_fill_share 0 when cap 0; `layout` not emitted (UI/F6); grace not in sim; BRO-AC2/AC6 are UI; breed_broody_cents is #127; debug hooks not done.
UI next: call setYardProbe with the R4 eligible slot ids, broodyLayoutChanged on resize, read broodyView per frame.
