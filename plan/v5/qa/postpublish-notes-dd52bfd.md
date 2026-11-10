
## Game Critic — dd52bfd (Oct 17, 15:07 CEST)
Source: product/critic/review-dd52bfd-2026-10-17.md, shots-dd52bfd/. Score 6/10 (was 5.5). ~23 min, L0–L18.
QA triage: no Blocker or Critical, so no escalation (D-CEO-20261017-05). Recorded for the follow-up list:
- GC-1 Major: the goal-bubble ETA goes up after Manage all (L17, Tired workers) and reads 1–3 s higher than the Farm card.
- GC-2 Minor: the Market panel says "1 more customers waiting" while the queue chip shows "+5" at L7+ (shots 05, 09). Also a grammar slip.
- GC-3 Minor (a11y): screen-reader text lags the HUD by about 1 s and says "1 eggs".
- GC-4 Minor: the Collection card renders late for one frame, showing "Need $989" (shot 10).
- GC-5 Minor: the first order shows "Sell 8" with 0 eggs for one frame after Sell all.
- GC-6 Minor: a no-op upgrade line, "Customer demand 31-61 → 31-61", at L17/18.
Critique (opinion): the mid game plays itself from L8, an asleep worker's card is too subtle, there are 3 Manage buttons, and Full/Queue full appear early.

## Player — dd52bfd (Oct 17, 15:10 CEST)
Source: qa/m3-recheck/player-dd52bfd/ (shots/, log.txt). Played by hand at 375x700 to L19. Pace: L8 at ~10 min, L18 at 23 min. Longest gap 2:52, so no dead zone.
QA triage: no Blocker or Critical, so no escalation. Recorded for the follow-up list:
- PL-1 Major: Escape activates the focused Buy button and bought Farm L19 (shot 06). Keyboard only, but an accidental purchase.
- PL-2 Major: coins briefly showed $7,064 instead of ~$13.7K after tapping the active Farm tab. Possibly S2-4a coming back. No shot, so it needs a repro.
- PL-3 Minor: Manage all is inconsistent. One run refilled one worker but put all of them on cooldown (shot 05), and Manage at 69% does nothing and says why not (shot 04).
- PL-4 Minor: stuck timers, a goal chip frozen at ~14s (02) and "Ready in ~1s" (03). Related to GC-1.
- PL-5 Minor: the upgrade tip points at a control the Market sheet covers (01).
- PL-6 Minor: triple-tapping Collection Buy bought 3 levels, with no multi-buy guard.
Confusing: no low-energy warning outside the Workers tab, the L15 toast contradicts the "Coop upgrade at L20" card, numbers switch to short form at $10K, and the Workers tab bar scrolls away with the list.

## Claude QA Tester — dd52bfd (Oct 17, 15:36 CEST)
Source: qa/claude-qa/m3-rc1-pre-dd52bfd.md and its folder. Ran headless Chrome at 320/360/390/1280 on the Latest asset; build-id confirmed.
QA triage: no Blocker or Critical, so no escalation.
- Fixed: NEW-1 and NEW-3. NEW-2 not seen, but it's timing-dependent. The 2959ba0 fixes hold.
- Still open: QA4-1 Major (order card clipped at 320 for B/T values), QA4-2 Minor ("$13K" label pays $12,960), QA4-3 Minor (no suffix above T, reads "1,500T"), QA4-4 Minor (?marketSeed works in the release build).
- New: DD-1 Minor (at exactly $1M the HUD shows "$999.9K" while the screen-reader text says "$1M").
- PASS: save/reload, offline 30 min paid once, Welcome back shown once, Sell all pays exactly, upgrades survive reload, no clipped buttons.

## Claude Gamer — dd52bfd (Oct 17, 15:40 CEST)
Source: qa/claude-gamer/m3-rc1-pre-dd52bfd.md. Build-id verified. ~26 min active at 390px plus 3 min on desktop, 0 errors.
QA triage: no Blocker or Critical, so no escalation.
- Fixed: build-id meta, the post-sale order card.
- Open, all Minor: CG-1 "No eggs to sell" shows while holding eggs and no customer is there (suggest "No customers yet"); CG-2 the spinner overlaps the "Next customer soon" text; CG-3 a full coop gives no signal while wages drain coins (related to the B-1 coop-full spec).
- Pacing: the longest gap between buys was 111 s (Farm L17) and never 3 min, but players may drift off from ~min 25. This matches Player and Critic.

## Summary — all 4 post-publish passes received
No Blocker or Critical on Latest dd52bfd. Majors for the follow-up: GC-1, PL-1, PL-2, QA4-1. The common theme is a mid/late game that plays itself.
