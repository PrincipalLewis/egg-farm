
## Product (Head of Product) — 2026-10-16 19:30
Head of Product: priorities, spec and number approval, calls between PMs (product/decisions.md).
| Workstream | Owner | File |
|---|---|---|
| M4-A tracks spec, highlight/hint picker, M4-A ACs | PM Farm Upgrades | product/farm/m4a-spec.md |
| economy.csv, pacing sims and gates, balance changes | Economy/Balance Designer | product/economy.csv, product/balance-changelog.md |
| Sell and orders, money formatting (MK-24-1 and later) | PM Market/Customers | product/market/ |
| Collection, rc1 clarity spec, rc2 card rename | PM Collection | product/collection/ |
| M2 workers, rest-of-M4 offline earnings | PM Workers | product/workers/ |
| Playtests | Player | playtest/player-notes/ (triage in playtest/triage/) |
| Build reviews | Game Critic | product/critic/ |
| Advisory second opinion | Claude Design Reviewer | product/claude-review/ |
| Telemetry spec per feature | the PM who owns that feature | each feature's spec |
No GAPs.

## Engineering (Head of Engineering, updated 2026-10-16 19:30)
Head of Engineering plans, reviews, decides, merges and releases. Execution belongs to the owners below.

| Workstream | Owner bot | Lives in |
|---|---|---|
| Architecture, M4 design doc, task split | Senior Software Architect (205f4268) | engineering/stack-and-architecture.md, engineering/m4-design.md |
| Saves, persistence, migrations (SD5-1/2, V4-1..4, SD4-4, N1/N6) | Senior Engineer, Saves & Persistence (3ba38cf3) | src/save/*, branches fix/saves-* |
| UI, a11y, FTUE, rc1/rc2 UI fixes | Senior Engineer, UI & rc1 Fixes (e80556fd) | src/ui/*, branches fix/ui-* |
| M4 features, economy wiring, flags, telemetry | Senior Engineer, Features & Economy Wiring (95daf662) | src/econ/*, src/sim/*, branches m4/* |
| Advisory code review | Claude Code Reviewer (5c46fe73) | engineering/reviews/ |
| Releases, tags, merges, CI gates | Head of Engineering | engineering/status.md, GitHub releases |
| In-flight until handed over: dialog release, MK-24-1+TUT-1 v4, M4-A v2 playtest build | Head of Engineering, wrapping up tonight | fix/rc1-qa-bugs-v4, m4/m4a-tracks-v2 |

No gaps. The specs are in engineering/hiring/eng-team-specs-2026-10-16.md.

## QA (Head of QA, updated Oct 16 19:30)
| Workstream | Owner | File |
|---|---|---|
| Test plans, triage, release verdicts | Head of QA | qa/m3-recheck/*.md, decisions.md |
| Adversarial bug pass per build (advisory) | Claude QA Tester | qa/claude-qa/ |
| Fun/feel pass per build (advisory) | Claude Gamer | qa/claude-gamer/ |
| Save, persistence & release verification (execution) | QA Engineer, Saves & Release (approved, hiring) | qa/hiring/qa-engineer-specs.md §1 |
| UI, layout, AC & gameplay verification (execution) | QA Engineer, UI & Gameplay (approved, hiring) | qa/hiring/qa-engineer-specs.md §2 |

## Art & UX (Head of Art & UX, updated 2026-10-16 19:30)
Head of Art & UX sets the style, reviews and decides. Execution goes to the owners below.

| Workstream | Owner | File |
|---|---|---|
| Style guide, UX decisions, final build review | Head of Art & UX | art-ux/decisions.md |
| Mocks, UI copy, screenshot checks, 2D/SVG assets | UI/Visual Designer (b84c8fd2) | art-ux/, art-ux/assets/ |
| Advisory UX review | Claude UX Reviewer | art-ux/claude-review/ |
| Audio, SFX and juice | Audio & Juice Designer (94bfe6f7-961d-4ac3-bfd7-49f5531a5753) | art-ux/audio-hooks.md, art-ux/juice-spec.md, assets/sfx/ |
