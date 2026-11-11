# HANDOFF v5-ui-ss-fatigue (2026-11-10 04:22 CET, UTC+1)
TASK HoE/v5-ui-ss-fatigue: card #5b (salesStopped chip + SS UI, SS-36 Manage) then #11 (fatigueCue HUD cue), PrincipalLewis/egg-farm vs rc/v5, LEAN to 10:30 CET.
Owner: Senior Engineer, UI (lane U backfill). Base rc/v5 = d65391b.
Status: PARKED 04:23 (D-CEO-20261110-17 stop). Drafts #130 @7299bfe, #131 @df12422 pushed, worktrees clean. Next: #128 swap, then Ready (HoE: Ready only after swap so CI runs on real API). No merge without HoQA GO. Flags stay 0.
Git identity: --worktree / -c only; nobody writes the shared .git/config (D-HOE-58).

## Branches / PRs
- #5b ui/v5-sales-stopped = 7299bfe, draft https://github.com/PrincipalLewis/egg-farm/pull/130
- #11 ui/v5-fatigue-cue = df12422, draft https://github.com/PrincipalLewis/egg-farm/pull/131 (base ui/v5-sales-stopped)

## Done
- #5b: chip, Rule 3 banner (absolute, 0 px shift), Rule 4 bubble, Art icons; D-HOP-2026-11-10-22; SIM-API rev 3; Rule 5 toasts out (HoE).
- #5b SS-17: 33/33 labels fit at 360 in 3 engines (Fredoka 700 14 px, 12 px padding). Shots: shots-5b-3engine/ (63, manifest + SHA256SUMS).
- #11: appear pop (reduced motion fade only), sub-line opens Workers sorted by costliest, popover right edge = chip right.
- #11 FC-AC9: 60/60 rows 8/7/4, 3 engines identical (fcac9/README.md). Shots: shots-11-3engine/ (78, manifest).
- Suites: #5b 327abc7 161 files 2327 pass; #11 df12422 162 files 2341 pass (EXIT 0 both).

## Left (hours)
- #5b ~1: swap stub for Saves #128 when merged (open @ b7a562f).
- #11 ~2-3: same swap; restart queue below.

## Blocked / questions
1. Features: add 'asleep_banner' and 'fatigue_bubble' to the real entry union (HoE allowlist).
2. Art sign-off: Thu ~18:00 review (budget), after restart-queue fixes.
3. HoQA: IDB1-1 (m41-7-hop-rulings) flaked once under load 19; unrelated.

## Spec sha1
SIM-API rev 3 (sha256 38bfc0d1) · sales-stopped cfff3817 · fatigue-ux ffb13c19 · m4.2 spec 7e120786 · rects-960 54a59d49 · 390-rect ea53de1c · fc-ac9 cb5ca050 · QA plan 2c717c15 · zzz d4709f93 · sweat cbc1665d · pause 97291783

Sim API: owner Saves, SIM-API.md here; UI only reads views + calls setUiGates/note*.

## Restart queue (HoAUX 04:23, logged art-ux/decisions.md)
1. HUD 360 fix (#11, then #5b if shared): settings + chip `flex-shrink:0; min-width:44px`; flexible spacer takes the ~43 px; if still overflowing, coins/basket pill padding 12->8. Re-shoot FF 360x739 + 360x640 worst-case coins/basket; settings >=44x44, rate unclipped.
2. Bubble aria (cfff3817 §4.7 L193): name = visible text, no aria-label; describedby `Tired workers earn less. Tap to manage.`
3. Push re-shoot before Art's Thu ~18:00 review (one-pass sign-off).
