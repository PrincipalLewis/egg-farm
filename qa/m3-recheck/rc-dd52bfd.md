# RC pass: UI/Layout & Gameplay section @ main dd52bfdc1c695cfc7695b3d63ba6a7883c5fd49b

**Verdict: PASS. No Blocker, Critical or Major findings.** 1 Minor (pre-existing, follow-up list). 1 scope note for HoQA/HoE (see below).
- RC SHA: `git ls-remote origin refs/heads/main` = dd52bfdc1c695cfc7695b3d63ba6a7883c5fd49b (13:00 CEST), so it's pushed and main = RC SHA.
- Worktree /tmp/rc-dd52bfd (removed afterwards). Ports 4811–4814 (never 4173). Chromium ran on lane 2 (load <12); Firefox and WebKit ran one at a time on lane 1, one flock per step (each hold under 10 min).
- Runtime build-id `m3-rc1-pre+dd52bfd` was checked in every engine (qa-guard on release + QA builds, and on every probe page). The visible label "Egg Farm m3-rc1-pre+dd52bfd" shows in Settings (settings-* shots).
- Run times 13:00–13:46 CEST. Checkpoints: rc-dd52bfd/summary.txt.

## Results
| # | Check | Chromium | Firefox | WebKit | Result |
|---|---|---|---|---|---|
| 1 | tsc / sync-economy --check / build (+check-release-build) / build:qa | exit 0 | | | PASS |
| 1 | vitest (--minWorkers=1 --maxWorkers=2) | 78 files, 851/851 | | | PASS |
| 1 | test:slow | 14/14 (2 files) | | | PASS |
| 1 | runtime build-id guard (release + qa) | BUILD OK | BUILD OK | BUILD OK | PASS |
| 1 | check-globals (runtime) | 3/3, only eggfarmExportTelemetry | 3/3 | 3/3 | PASS |
| 1 | full rc0 incl. axe (PT1-6) | **249/249** | **249/249** | **249/249** | PASS |
| 2 | PM4-P3 Collection card, `[data-tab=collection].active` + "Collect per tap" card asserted, capped F3/C19 $20 + control F3/C2 $1, at 360x800/375x800/375x700/390x844 | 8/8, 0 ov | 8/8 | 8/8 | PASS |
| 3 | Farm card (`[data-tab=farm].active` + "Farm level"), same states/sizes, 0 overlaps, inside card | 8/8 | 8/8 | 8/8 | PASS |
| 3 | coop sprite renders, diff vs 462a071 baseline (360x800, 375x700, 390x844) | 0 px ×3 | 0 px ×3 | 0 px ×3 | PASS |
| 4 | core loop (collect/sell/Sell all/orders/upgrade/hire) in rc0 | PASS | PASS | PASS | PASS |
| 4 | toast (current main behaviour, rc0 toast sections) | 23 PASS | 23 | 23 | PASS (but see scope note: #5 itself isn't in the RC) |
| 4 | M4-A highlight | n/a: `balance.json m4.enabled = 0` in the RC, so `.up.best` can't be reached in the shipped build. Unit tests cover it (green). | | | N/A |
| 4 | #35 B2/B3a/B4 | not in RC (see scope note) | | | NOT IN RC |
| 4 | console errors / pageerror (all probe pages + rc0 "no page errors") | 0 | 0 | 0 | PASS |
| 5 | layout at 360/375/390/430/1280x800, 1024x474, 1280x720, 1366x768 × farm/market/3 upgrade tabs: sw<=cw, .l1 and buttons not clipped | 0 | 0 | 0 | PASS |
| 5 | taps >=44 | only the mobile segmented tabs (below) | same | same | Minor |
| 5 | Need-state order buttons 44px | none rendered in my states (orders allow partial "Sell N"); rc0 orderFit/Bug9 PASS | | | PASS via rc0 |
| 6 | Art & UX shot set 360x800/375x800/390x844 + 1280x800 docked × 6 states × 3 engines = 72 shots, manifest.json, every shot opened and checked | 24/24 | 24/24 | 24/24 | PASS |

## Findings
- **Minor (pre-existing, not holding, follow-up list):** below 960px the Upgrades segmented tab buttons (Collection/Farm/Workers) are 107–130×36 px inside the 44 px track (`.tabs{height:44px;padding:2px}` + border). layout-spec §90 asks for a 44 px *track* on mobile, and the ≥44×44 button rule (PT1-8) is desktop-only, where it passes (119×44). It's flagged because the RC tap rule is ≥44. Repro: 360x800, open Upgrades, measure `.tabs button`. This is unchanged code and not from #40.
- No other findings.

## Scope note (for HoQA/HoE, not a product defect)
`git merge-base --is-ancestor` shows **PR #5 (toast, a56b3a2) and PR #35 (rc2 minors, 3fa3781) are NOT in dd52bfd** (no toast-place.ts; "Waiting for customers" copy absent). The plan lists both for this RC, so they can't be "closed in Firefox/WebKit" by this set. The RC ships the old toast behaviour (which passes rc0's toast checks) and the old B2/B3a/B4 behaviour (Minors from Claude Gamer's playtest). If they're meant to ship, they need to merge, and then I need a new RC SHA and a delta rc0.

## PROBE STANDARD
Each probe row asserts `[data-tab=X].active` plus a visible tab-specific card (Collection: "Collect per tap"; Farm: "Farm level"; Workers: first worker row), or for nav views `#p-market` visible with `#sellAll`, or the farm view with `#collect`. Each takes its screenshot right after its own measurement. Shots run on a fresh page per shot.

## Repro
`cd <worktree@dd52bfd> && npm ci && npm run build && npm run build:qa && rc-dd52bfd/run.sh <engine> guard globals p3 rc0 layout shots` (copies rcprobe.mjs into the worktree's scripts/). Sprite diff: `python3 rc-dd52bfd/spritediff.py chromium firefox webkit` from qa/m3-recheck.

## Evidence (qa/m3-recheck/rc-dd52bfd/)
summary.txt (checkpoints), logs/ (gates, guard, globals, rc0, p3, layout, shots, spritediff, lanes), p3/ (108 crops/full/sprite shots + manifest.json), shots/ (Art & UX set: root=chromium, firefox/, webkit/, manifest.json with full SHA, pushed, build_label_checked, plus a per-shot `checked` record), check-sheets/ (the sheets used to open and inspect every shot), rc0-shots-*/, rcprobe.mjs, run.sh, sheet.py, spritediff.py.

## Not run
- The M4-A highlight in the browser (M4 is disabled in the RC config; unreachable).
- #35 and #5 fix checks (not in the RC). #37, C2 and worker-asleep are out of scope.
- The 1280 shots are docked 1280x800 only. 1024x474, 1280x720 and 1366x768 were measured (layout) but not shot.
- Saves QA's lane-1 items (save/load, offline, AC7, HTML artifact) belong to their section.

## Scope resolution (HoE, 13:44 Europe/Belgrade)
- PR #5 and PR #35 are intentionally deferred and excluded from this RC (#5 has an open CCR Major: lost milestone toast at Farm L15 with M4 on; #35 conflicts with the rc1 chain vs M4-A). The RC stays dd52bfd; no new SHA, no delta run. The scope flag is closed.
