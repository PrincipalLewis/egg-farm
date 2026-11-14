# HANDOFF v5-ui-streak-tapcoins: **PARKED for v5.1** (2026-11-14 19:10 Asia/Saigon)
Streak meter/chips, A2 pops, tapCoins +$ pop (streak v1.3.3 b315dea1, combo-tiers v0.3 ed4ded1d). Hire 3 UI; HoE; reviewer Architect. Times Asia/Saigon.

## Status
HoE ruling: streak/tapCoins **ships OFF in v5**, moves to v5.1. PR **#150** stays **Draft** at the current tip of `v5/ui-streak-tapcoins` (code @ **4366f36**, merged forward onto rc/v5 fd0b8ce0 in 3913bf7). Not Ready, HoQA not queued. Flags streak/tapCoins = 0.

## Rulings
- HoE: app.ts = exactly 4 hunks (F-2 own commit 9763ad3, order-card price chips, isTrusted/event.repeat filter, egg.collect pitch per tier); see app-ts-hunks.md. SFX copied (aa1fa96). Synthetic collect clicks dropped while flag on: OK, Architect to confirm.
- Architect: streak-flags.ts accepted; layout numbers only; player-felt numbers from m4.tc (literals.md).
- D-CEO-20261114-06: the cool cue reads tcNum(b,'streak_cool_cue_min_tier') (#143, = 2 at fd0b8ce0); constant + TODO removed.
- D-HOE-58: worktree identity only; 6b1af0a..0dd138e (8) carry the Architect as author, not rewritten (like #128).

## F6 dependency
F6 API v1.0 = da38e3f (API.md sha256 82164ad8…), on `feat/v5-f6-rebuild` @ **017b8bc8**: **no PR**, not on rc/v5, and **conflicts with rc/v5 in app.ts** (Features to resolve). Until it lands, streak-f6-stub.ts stays and the meter can't mount in a real build. `f6-swap.diff` (task folder) refreshed 2026-11-14: applies 3-way clean (`git apply -3`).

## TODO owned by Saves (ST-AC18 8th key, HoQA QA-D-1113-STAC18-8)
(1) streak_cool_cue_min_tier in M5_TC_KEYS.streak; (2) ST-AC18 literal list 7 to 8; (3) validateBalance rejects it missing; (4) config test for tcNum(b,'streak_cool_cue_min_tier'). Not in #150.

## Open Art items
S-AC19 order-card Sell-value chip (depends on MK-24-1 width); Sell all chip placement (built as a centred row above #sellAll).

## Local gate @4366f36 (lane-run, load < 11, 18:40-19:00)
tsc 0; sync-economy OK; unit 201/201 files, 3000 pass, 1 skip; test:slow 5/5; build + check-release-build; check-globals chromium; build:qa; golden-game-browser; flag-off golden 2/2. Log: gate-4366f36.log. Hosted CI skips Drafts (ci.yml).
Trial (/tmp/h3-trial: da38e3f + f13d95a + tip streak-view.ts + swap, flags 1 there only; throwaway): visual 40/40 chromium/firefox/webkit at 360/390/1280 + RM; audio chromium/firefox PASS, WebKit not assessed (no mp3 decode). Results + shots: task folder `shots-20261114/`.

## Restart (v5.1)
1. When F6 merges into rc/v5: merge rc/v5 forward (merge, no force), `git apply -3 f6-swap.diff`, delete streak-f6-stub.ts.
2. Re-gate via gate.sh (lane-run, load < 11), then streak-browser.mjs / streak-audio.mjs per engine.
3. Fold in Saves' ST-AC18 PR and Art rulings; update PR-BODY.md; mark #150 Ready via HoE.
