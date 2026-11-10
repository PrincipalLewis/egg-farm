# HANDOFF v5-ui-streak-tapcoins: **PARKED** (D-CEO-20261110-17 clean stop, 2026-11-10 04:40 CET, UTC+1)
TASK HoE/v5-ui-streak-tapcoins: streak meter/chips, A2 tier pops, tapCoins +$ pop UI (streak v1.3.3 b315dea1, combo-tiers v0.3 ed4ded1d). Owner: Senior Engineer, UI (v5 Hire 3). Reports to HoE; reviewer Architect.

## Final SHA
`v5/ui-streak-tapcoins` @ **f13d95a** (pushed, normal push; base rc/v5 d65391b). No PR. Clean tree. No lane-run processes running. Merges clean with F6 v1.0 da38e3f.

## Rulings
- HoE: app.ts in scope for 4 items only (F-2 own commit 9763ad3, order-card price chips, isTrusted/event.repeat filter, egg.collect pitch per tier): app-ts-hunks.md. Streak SFX copied, filenames kept (aa1fa96). Synthetic collect clicks dropped while the flag is on: OK for v5 (Architect to confirm at review).
- Architect: streak-flags.ts accepted; layout numbers only; player-felt numbers from m4.tc (literals.md). COOL_CUE_MIN_TIER stays one named constant with a TODO; HoE routes tc_streak_cool_cue_min_tier to Econ/HoP/QA.
- D-HOE-58: identity per worktree only. 8 earlier commits (6b1af0a..0dd138e) carry the Architect as author, not rewritten (like #128).
- Features: F6 API v1.0 @ da38e3f (API.md sha256 82164ad8…); the stub mirrors it.

## State
Full vitest @f316147: 164/164 files, 2386 pass. Trial on da38e3f + f6-swap.diff: 165/165, 2422 pass. Browser 40/40 per engine; audio chromium/firefox pass, WebKit not assessed (environment limit, no mp3 decode). Draft PR body: PR-BODY.md.

## Restart steps
1. When F6 merges into rc/v5: rebase `v5/ui-streak-tapcoins` onto it (normal push; if a rewrite is needed, ask HoE first, no force without approval).
2. Apply f6-swap.diff (streak-meter registers via the real overlay, features.ts import, v5-streak-app on the real mount); delete streak-f6-stub.ts; run tsc + the full suite (one heavy run, load < 11, via lane-run.sh), then streak-browser.mjs and streak-audio.mjs per engine.
3. Fold in rulings if they've landed: tc_streak_cool_cue_min_tier (one-line change + config test), Art's S-AC19 Sell value chip and Sell all placement.
4. Update PR-BODY.md, then the PR via HoE.
