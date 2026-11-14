# HANDOFF v5-ui-streak-tapcoins: UNPARKED 2026-11-14 18:27 (Asia/Saigon)
Streak meter/chips, A2 pops, tapCoins +$ pop (streak v1.3.3 b315dea1, combo-tiers v0.3 ed4ded1d). Hire 3 UI; HoE; reviewer Architect.
Deadline (D-CEO-20261114-06): Ready to HoQA by Sun 06:00; not GO and merged by 11:30 = ships OFF; freeze Sun 12:00.

## SHA / PR
`v5/ui-streak-tapcoins` @ **4366f36** (code), merged forward onto rc/v5 **fd0b8ce0** (3913bf7, merge, no force). PR **#150** into rc/v5, **Draft**. Flags streak/tapCoins = 0.

## Rulings
- HoE: app.ts = exactly 4 hunks (F-2 own commit 9763ad3, order-card price chips, isTrusted/event.repeat filter, egg.collect pitch per tier), re-checked after the merge (app-ts-hunks.md). SFX copied (aa1fa96). Synthetic collect clicks dropped while flag on: OK for v5, Architect to confirm.
- Architect: streak-flags.ts accepted; layout numbers only; player-felt numbers from m4.tc (literals.md).
- D-CEO-20261114-06: the cool cue READS tcNum(b,'streak_cool_cue_min_tier') (in balance.json at fd0b8ce0 = 2, #143). Constant + TODO removed.
- D-HOE-58: worktree identity only. 6b1af0a..0dd138e (8) carry the Architect as author, not rewritten (like #128).

## TODO owned by Saves (ST-AC18 8th key, HoQA QA-D-1113-STAC18-8)
(1) streak_cool_cue_min_tier in M5_TC_KEYS.streak; (2) ST-AC18 literal list 7 to 8; (3) validateBalance rejects it missing; (4) config test for tcNum(b,'streak_cool_cue_min_tier'). Not in this PR (reverted 4366f36).

## Blocked
1. **F6 v1.0 is NOT on rc/v5 fd0b8ce0** (da38e3f not an ancestor; feat/v5-f6-rebuild 017b8bc8 has no PR and conflicts with rc/v5 in app.ts). So f6-swap.diff (refreshed 2026-11-14, 3-way clean) is not applied and the stub stays: the meter can't mount in a real build. Needs HoE/Features.
2. Hosted CI skips Draft PRs (ci.yml); it runs only when marked Ready.
3. Art: S-AC19 Sell value chip (MK-24-1 width); Sell all chip placement.

## Gate @4366f36 (gate.sh via lane-run)
All green 18:40-19:00: tsc 0; sync-economy OK; unit 201/201 files, 3000 pass, 1 skip; test:slow 5/5; build + check-release-build; check-globals chromium; build:qa; golden-game-browser; flag-off golden 2/2. Log: gate-4366f36.log. Trial build (tip streak code + F6 da38e3f + swap, flags 1 in /tmp only), 19:07: visual 40/40 chromium/firefox/webkit at 360/390/1280 + RM; audio chromium/firefox PASS, WebKit not assessed (no mp3 decode). Shots: shots-20261114/.

## Restart / next
1. F6 merges: merge rc/v5 forward, `git apply -3 f6-swap.diff`, delete streak-f6-stub.ts, re-gate (gate.sh, then streak-browser.mjs / streak-audio.mjs per engine; WebKit audio not assessed, no mp3 decode).
2. Kept Draft: Ready waits on the F6 call (HoE). Once Ready, check CI at the tip.

## Hours
~3 of work left once F6 lands.
