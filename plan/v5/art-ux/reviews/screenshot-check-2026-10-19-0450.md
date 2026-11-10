# Screenshot check, 2026-10-19 04:50 CEST: NO NEW IN-SCOPE SHOTS, nothing held, nothing sent

## Sets with manifest.json (both already reviewed)
- wt-ui-shots/m4-gate5 (PR #46 @ 24e3674, manifest 04:43): reviewed in reviews/pr46-24e3674.md (HOLD, 1 Major EXP-b).
- qa/m3-recheck/gate5-pr44-4ccb9fd (manifest 04:11): reviewed 04:15, reviews/gate5-pr44-4ccb9fd.md (PASS).

## Seen, rejected unreviewed (no manifest.json)
- qa/m3-recheck/gate4-4ccb9fd-evidence/{clock-*, hidden-*, rc0-*, shots-html, v6load} (Gate 4 evidence, not a B set)
- qa/m3-recheck/gate5-final-prep/validate-4ccb9fd-chromium-{0413,0417,0434,profileB} (Chromium-only rehearsals)
- scratch/m4-retune/handoff-T3{c,d}/prod/critic/{shots, shots-dd52bfd} (critic shots, not QA; L30+ is now follow-up)
- README assets: scratch/m4-retune/handoff-T3{c,d}/**/docs/readme

## B SHA status (main target)
- origin rc/m4-t3-capped = 9b79c75 (04:45 CEST): interim staging, built on #44 1d10311 + #47 loader merge + its own explainer (e9e614a) + F2 (89013af) + Saves m1 (bd21da1) + refund line (ccbafea) + rc0 g5 shots script. Features ETA for final B is 05:45, built to m4a-spec v1.15 (D-HOP-2026-10-19-14, supersedes the 04:46 D-07 amendment). No QA set with manifest yet.
- Not ancestors of 9b79c75: 24e3674 / e43bc00 (PR #46), 65cbf3e (P46-M1 toast hold + Welcome-back queue + focus), aa59600 (swallowed-tap commit, now dropped by v1.15).
- Diff vs dd52bfd (src): balance.json, game.ts, save.ts, migrate-v7.ts, state.ts, app.ts, styles.css, tracks-explainer.ts (+33).
- Diff vs 24e3674 (src): formulas.ts, best-buy.ts, game.ts, save.ts, actions.ts, migrate-v7.ts, offline.ts, tracks.ts, app.ts, next-goal.ts, tracks-ui.ts (B drops L30+ fxArrow / trackMaxLevel; tracks rows show `Level L / maxLevel`).

## Code pre-read of interim 9b79c75 (not a ruling; re-check on final B shots)
- Focus: close() removes the card without returning focus to the active Upgrades tab. Same cause as P46 Major EXP-b; must be fixed in final B (expected via 65cbf3e-style focus restore).
- Toasts / Welcome back: no toast hold or Welcome-back queueing in this file; 65cbf3e not in B. Check shots for toast-over-card and card-over-Welcome-back.
- Tap rule: outside pointerdown closes and passes through (no preventDefault). v1.15 says outside taps register normally, so the checklist item "Buy tap while card is up buys nothing" is likely superseded; verify against v1.15 text in m4a-spec before ruling.
- F2: .tabs buttons min-height 44px with -4px margin-block for a 36px visual. Matches 36/44 on paper.
- Refund line copy: "We refunded +$X for your old upgrades." Verify verbatim against §11 when shots land.

Still waiting on: final B SHA on rc/m4-t3-capped (~05:30–05:45) QA set with manifest, 3 engines × 360/375/390/1280 docked, fresh / mid L10 / L30 capped / migrated acdbedc, explainer checks per m4-on-checklist.md (04:13/04:34/04:47 addenda) and the pr46-24e3674.md reshoot list.
