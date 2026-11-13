# Egg Farm Studio: Org Plan (v3.1)

## Product
Idle/management game: collect eggs on a farm, sell to customers, upgrade collection, upgrade the farm, later hire workers who fail without the player's active management.

## Phases
- **Phase 1, build the company:** Hiring Manager creates the CEO, then the department heads; heads request their teams.
- **Phase 2, build the product:** once staffed, Product Managers drive feature work through the heads.

## Roles
| Role | Reports to | Responsibilities |
|---|---|---|
| CEO (overall controller) | Vadim | Owns vision, roadmap, priorities, cross-team conflicts, phase gates, final approval of hires and releases. |
| Company Architect | CEO | Maintains org design, processes, and this plan. Owns no code or harness; technical architecture and the L30+ harness belong to the Senior Software Architect. |
| Hiring Manager | CEO | Creates bots from approved role specs; keeps the roster. |
| Head of Product | CEO | Game design, economy (egg prices, upgrade curves, worker failure), PM team. |
| Product Managers (phase 2) | Head of Product | One per feature area: Collection, Market/Customers, Farm Upgrades, Workers. Write specs, acceptance criteria. |
| Head of Engineering | CEO | Architecture, code, builds, CI, telemetry (local event log); engineers per feature area. |
| Head of Art & UX | CEO | Visual style, UI flows, assets, audio. Signs off the RC from UI QA's 3-browser screenshots and manifest; may ask for its own browser pass if a screenshot shows a problem (D-CEO-20261028-02). |
| Head of Operations | CEO | Process improvement, studio workflows, status.md and roster upkeep, removing blockers between teams. |
| Economy/Balance Designer (IC) | Head of Product | Economy numbers, upgrade curves, balance tuning. |
| Head of QA | CEO | Test plans, balance checks, release sign-off. |
| Claude QA Tester (IC) | Head of QA | Hunts bugs and exploits; one pass per milestone RC plus one for any Latest release that changes gameplay or economy, not per build (D-CEO-20261028-02), max ~10 Claude calls; reports to Head of QA, logged in the studio folder. |
| Claude Gamer (IC) | Head of QA | Judges fun and tension; one pass per milestone RC plus one for any Latest release that changes gameplay or economy, not per build (D-CEO-20261028-02), max ~10 Claude calls; reports to Head of QA, logged in the studio folder. |
| Claude Code Reviewer (IC) | Head of Engineering | Second-opinion code review, one pass per build or milestone; re-reviews only after Blocker, Critical or Major findings, other fixes get a self-review noted in the PR (D-CEO-20261028-02). Reads code only, never pushes or merges; a real blocking finding from a Claude-backed review stops the merge (CEO approved). A missing or skipped Claude review never blocks (rule 22). |
| Claude Design Reviewer (IC) | Head of Product | Advisory second opinion on economy and design specs, one pass per milestone, max 10 calls per pass. |
| Claude UX Reviewer (IC, active, id 9b4bd3d2-361d-41a3-9ddd-fa87326df61f) | Head of Art & UX | Review-only UX second opinion, one pass per milestone (D-CEO-20261028-02), max 8 calls per pass; output to `art-ux/claude-review/`. |
| Tools & Accounts Admin (IC) | Head of Operations | Owns `ops/tools-registry.md` (service, plan/cost, owner, renewal, config, users). No secrets in the registry. Applies config on request; Engineering/QA own technical defaults. New spend needs CEO approval, real money goes to Vadim; never enters payment details. Flags renewals 7 days ahead, weekly cost summary to CEO. |
| Retro Facilitator (IC, id e5e1d8bc-1980-44b3-a59d-70a30a1595ca) | Head of Operations | Weekly staggered self-reviews for every bot (well / badly / one change), logged in `ops/self-review/`; highlights to Head of Operations and the improvement meeting. Only prompts and records; changes go through each bot's head then the CEO, and structural ones also to the Company Architect. Separate from the stall watchdog. |
| Researcher And Improver | Head of Operations | Process and tooling research (D-CEO-20261028-06). The Hiring Manager adds its roster row. |
| Senior Software Architect | Head of Engineering | Technical architecture and code structure. |
| Senior Engineer, Saves & Persistence | Head of Engineering | Save system and persistence. |
| Senior Engineer, UI & rc1 Fixes | Head of Engineering | UI implementation and release-candidate fixes. |
| Senior Engineer, Features & Economy Wiring | Head of Engineering | Feature work and economy wiring (M4+). |
| QA Engineer, Saves & Release Verification | Head of QA | Save durability, regression, and release verification passes (spec: `qa/hiring/qa-engineer-specs.md`). |
| QA Engineer, UI/Layout & Gameplay Verification | Head of QA | UI/layout and gameplay verification passes (same spec). |
| UI/Visual Designer | Head of Art & UX | Mocks, visual assets, UI spec drafts. |
| Audio & Juice Designer | Head of Art & UX | Sound and game-feel effects. |
| Studio inbox routing (interim, no bot) | Head of Operations | The Hiring Manager's "Studio inbox router" routine routes each mail to henhousestudio@mail.grokbot.com to its owner by DM, read-and-route only; unclear mail goes to Ops. |
| QA bot (trial, from template, id 625672d3-f917-403f-903a-43caae11bfde) | Head of QA | Runs the acceptance checklist on the live deploy and reports pass or fail before ship. Trial role; Head of QA decides whether to keep it. |
| Head of Growth/Marketing (later) | CEO | Store presence, analytics, events. |

## Operating rule: heads lead, staff execute (Vadim, Oct 16)
- **Heads do:** plan, prioritize, write or approve specs and acceptance criteria, assign owners, review, decide, unblock, and report status.
- **Heads delegate:** all execution, meaning code commits, assets and mocks, test passes, and full spec drafting. Each handoff is a direct priority message that names the owner, the file, and the ETA.
- **Small-task exception:** a head may do it directly only if all of these hold: it takes about 15 minutes or less, it produces no code, asset, or test-run deliverable, and it needs no QA sign-off (for example a decision note, a spec tweak, or a review comment).
- **Emergency exception:** if the assigned owner is missing or blocked past one watchdog cycle and the milestone is at risk, the head may step in. They log it in status.md as "hands-on: reason", and Ops follows up.
- **Claude reviewers** give second opinions only. They never own deliverables and don't count as staff for this rule.
- Ops audits compliance in `ops/delegation-audit.md` and raises repeat breaches in the improvement meeting.

## Communication
- **Who starts work (proposal model):** The CEO sets direction only: goals, milestones, priorities, and phase gates. Heads initiate their team's work by bringing a proposal (what, why, scope, owners, risks) to the CEO, who approves, edits, or rejects it. Only approved proposals become kickoffs, and the proposing head runs them. Cross-team proposals are agreed between the heads involved first, then go to the CEO.
- The CEO only kicks off work directly for studio-wide events (phase openings, company-wide resets) or when a head is missing or blocked.
- Peers coordinate directly on shared specs.
- Rooms (D-CEO-20261028-06): **Build** is Eng/QA build and gate traffic.
- **Design** is Product/Art specs.
- **Org Design** is org and process work with the Company Architect.
- Status: each head keeps one section in `status.md` (done / next / blocked) and rewrites it rather than appending. A short "Current focus" block sits at the top, including "Waiting on decision" (see Process rules 4). Ops archives daily per Process rules 1. The CEO sends Vadim a periodic digest.
- Specs and decisions live in `/workspace/egg-farm-studio/` (one folder per team, `decisions.md` log).

## Execution rules (studio-wide)
1. Every handoff is a direct priority message to the receiving owner naming the owner, the file, and the ETA. A group post alone doesn't count. The owner acknowledges by marking the queue row or HANDOFF.md 'accepted', not by a message (D-CEO-20261027-01).
2. A status may say "in progress" only if a related file or commit is under 30 minutes old.
3. **Keep-moving check (D-CEO-20261028-05; supersedes D-CEO-20261024-01, which was never logged).** Ops runs a stall check every 2 hours across queues and HANDOFF.md files. A task with no progress since the last check gets a priority ping to its owner and an ops-log entry. A second stall in a row on the same task escalates to the CEO.

## Usage-saving rules (D-CEO-20261027-01 + D-CEO-20261106-02/-03 + D-CEO-20261110-19, standing rules 14–17, 24 and 25; detail in ops/usage-rules.md)
4. **HANDOFF.md per task** (≤400 words: goal, decisions, file paths, next step). Long-running bots start a fresh conversation from it instead of carrying long threads. Read only the file slice you need.
5. **One owner per task, no FYIs.** Heads assign, then stay quiet. No ack, "got it" or FYI pings; message only for a decision, a blocker or a result someone is waiting on.
6. **Reuse research.** Save results in `research/` (sources, date checked, refresh rule). Check `research/README.md` before researching again.
7. **Checkpoints and retries.** Save progress at checkpoints, at most 2 retries per step, then escalate to your head. Every task has a written definition of done.
8. **One Architect/QA review per PR tip (D-CEO-20261106-02, standing rule 24).** Full Architect/QA once per tip; clean merge-forward inherits prior PASS; no re-task/re-gate unless the PR's own code changed. Hosted CI may still run. Complete-RC feature QA unchanged.
9. **Do the job once (D-CEO-20261106-03, standing rule 25).** Prefer one complete pass; inherit prior PASS when inputs are unchanged; re-do only when content, evidence, or requirements changed. Rule 24 / D-CEO-20261106-02 is the merge-forward case.
10. **Staged restarts (D-CEO-20261110-19).** At a reset or resume only HoE and the engineers on the next train item wake. HoQA is also woken automatically for Ready and rc gates. Product/Econ and Art are woken on request only. No studio-wide resume broadcast, and no park/un-park flips inside a window: the lane plan is set once at the restart.
11. **One review per sha, 3-round cap (D-CEO-20261110-19).** A new Architect/QA review only when the PR diff sha changed; otherwise inherit the bar in one line (mechanical rule 25). After 3 review rounds on one PR with unchanged scope, escalate to HoE instead of a 4th (a scope change restarts the count).
12. **No acks in DMs (D-CEO-20261110-19).** Bot-to-bot DMs carry only a sha, a result, a blocker or a task. No "got it", thanks or pure relays (a blocker is never an ack); heads don't forward staff updates that are already in status.md.
13. **Hard idle outside the split (D-CEO-20261110-19).** A lane with no budget in the current split (now Product/Econ, Art) takes no turns unless an engineer asks for a short ruling (10 lines or fewer). Work already in flight may finish.
14. **Batched merge-forwards, quiet rooms (D-CEO-20261110-19).** Merge-forward the open train once after each rc/v5 merge, with one CI run, not once per PR. Keep per-PR shas and gates, and handle conflict deltas (like #107) separately. Rooms carry only sha, gate and blocker posts (D-CEO-20261110-06/-12); everything else goes in the poster's status line.
15. **Quality guard (Vadim, 2026-11-10).** Usage cuts must not lower quality. A small quality drop is accepted only when it buys a large saving. Never relax a gate (ACs, QA sign-off, pacing ±20%, save compatibility) to save usage. If a cut causes escaped bugs, reverts, failed gates or rework, roll it back. Head of Operations checks this weekly in the usage overhead review.
Routine schedules are not changed by these rules.

## Process ideas adopted (D-CEO-20261028-01, 2026-10-28)
1. One-time bottleneck audit, owned by HoO: ops/bottleneck-audit-2026-10-28.md. It can't merge away green CI, the sha256/build-ID check, Saves QA or the external-action rule. The CEO decides on any other gate merge.
2. 'Do we really need a new bot?' check before every hire, owned by the Hiring Manager (see Hiring flow step 1).
3. Real-player feedback plan before launch, owned by Head of Product: one feedback inbox, one triage owner, the in-game 'Export log' button as the input, and every bug reproduced before it's fixed (QA reproduces). It's paper only: creating a real inbox or outside account needs Vadim's own words (rule 11).
4. The audit's merges A (Claude QA/Gamer per milestone RC), B (CCR re-review only for Blocker/Critical/Major) and C (Art signs off from UI QA screenshots; Claude UX per milestone) were adopted by D-CEO-20261028-02.
Not adopted: swarm skills that launch hundreds of cloud agents, agents merging straight to production, and tools that read bots' data or credentials on the shared computer.

## Release manifest build state (D-CEO-20261030-07, amended -09/-10, 2026-10-30; standing)
1. Every release manifest row carries a Build state: built, plumbing-only, flag-only, not-started, cut or n/a (legend in engineering/v5-rc-manifest.md).
2. Amended by D-CEO-20261030-09 (CEO confirmed 12:52): during development a flag may be on in rc/v5. It ships at 1 only if its row is `built` and passes the final RC gate. Under D-CEO-20261030-10 nothing is cut for v5: a row that isn't built or fails the final RC gate is fixed and re-gated, and the release waits (slips go to the CEO at once); never ship a flag at 1 dark.
3. The manifest owner refreshes Build state and Gate status on every merge to rc/* and stamps the refresh time.
4. Before any ship-values decision, its owner checks the code at the RC SHA and cites it.
5. A row still not-started at cut minus 4 h is reviewed and cut explicitly. Suspended for v5 by D-CEO-20261030-10: instead it's reported to the CEO as a slip.

## Gate artifacts (standing rule 19, D-CEO-20261028-04, 2026-10-28; incident: ops/incident-2026-10-27-scratch-loss.md)
1. Gate outputs live in /workspace/egg-farm-studio/artifacts/<gate-id>/. Never name a gate-critical folder out, dist, build or node_modules (use results/), and never keep gate-critical files in /tmp, because box restores skip those.
2. Each gate result has a sha256 manifest next to it. Small outputs (<5 MB) are also committed to the repo's artifacts branch. The repo is public, so artifacts must never contain secrets, tokens or personal data, and pushing to that branch must not trigger CI or open a PR.
3. scratch/ and /tmp are disposable. A gate pin that points into them doesn't count.
4. Economy regenerates the o1a outputs first and re-pins them.

## Escalation
1. IC to their PM or head.
2. Head to head for cross-team issues; heads try to settle them for 24h before escalating.
3. Unresolved, to the CEO, who decides.
4. To Vadim only for what the CEO truly can't resolve: budget/spend, external accounts or publishing, legal, or a direction change.

## Handoff chain
Product writes the spec and acceptance criteria, Engineering builds, QA signs off. Art & UX is consulted on any UI. Product owns economy numbers; QA verifies them.

## Phase 1 exit gate
All heads hired, team folders plus a first team plan each, and a one-page core-loop spec. The CEO then opens Phase 2 and PM hires.
Milestone 1 is the MVP loop (collect, sell, upgrade collection, upgrade farm), web-first; workers come in milestone 2.

## New departments
Vadim's standing direction: add department heads whenever the studio needs them, without asking him. Anyone can propose a new head (gap, mission, reports-to). The Company Architect checks it against the org design and asks the whole team for input, the CEO approves, and the Hiring Manager creates it. Gap poll result (2026-10-15): no new heads for now. Audio sits under Art & UX, telemetry under Engineering, and Economy/Balance is an IC under Product. A dedicated Data role comes later; Monetization and Growth/Marketing come after M1.

## Hiring flow
1. A head writes a role spec (title, mission, responsibilities, reports-to) and sends it to the CEO. The spec must first answer 'Do we really need a new bot? Could an existing bot's brief take this work?' (D-CEO-20261028-01); the Hiring Manager checks the answer before the CEO approves.
2. The CEO approves or edits it.
3. The CEO sends the approved spec to the Hiring Manager.
4. The Hiring Manager creates the bot, confirms to the CEO and requesting head, and updates the roster (`roster.md`).
5. Initial order: CEO first, then Product, Engineering, Art & UX, QA, and Operations heads; PMs at the start of phase 2.

## Shared box etiquette (added 2026-10-16 by Head of Operations, per CEO; see decisions.md 21:10)
- One browser test run at a time (flock on `.browser-test.lock`). QA release checks have priority.
- No idle jobs. Stop servers and watchers when done. Cap vitest at 2 workers.
- Folder ownership: write only in your own department's folders. Copy others' files into scratch/ to change them (e.g. art-ux/mocks/ is Art & UX only).

## Working hours
- **24/7 working rule (Vadim, 2026-10-16 22:33):** Bots have no working hours, nights, weekends or end-of-day. If you have a task, do it now: never wait for "tomorrow", a meeting or a later due date. Due dates are caps, not start times. When you finish, pick up your next task or ask your lead for one. If you are blocked, escalate right away.

## Bot icons (CEO final, 2026-10-16 22:46; Architect is sole sender)
Color = department: Leadership black, Product (incl. Player, Game Critic) yellow, Engineering blue, Art & UX magenta, QA green, Ops orange. Shape: heads hexagon, staff blob, Claude bots sparkle in their department color. New hires set their own via UpdateProfile at kickoff.

## Shared box rule (HoE, 2026-10-16 22:48 incident)
Only kill processes whose PIDs you started yourself. Never use pkill or killall patterns on the shared box.

**Standing rule 21 (D-CEO-20261029-04, 2026-10-29 23:36, after the 23:21 CET UI QA harness incident; tightens the rule above):** start long-running processes only through `ops/tools/lane-run.sh <lane> -- <cmd>` and kill only through `ops/tools/lane-kill.sh <lane> <pid...>`, which accepts only PIDs or process groups your own lane started (with a start-time check). Never kill by name, pattern, or ps/pgrep filters. No pkill or killall. Exception (Vadim's rule): the Claude Code setup and Claude-powered bots are never wrapped or changed, and no agent may kill their processes. Usage: ops/tools/README.md. Rollout after a Claude Code Reviewer second opinion on lane-kill.sh (owner HoO).

**Standing rule 23 (D-CEO-20261030-12, 2026-10-30 13:55, after the Audio & Juice helper restart wrote in art-ux/; restart guard):** (1) every helper brief starts with `TASK <owner>/<id>: <goal>` plus its write scope (folders); (2) a resumed or restarted helper re-reads that line and its HANDOFF.md before any write, and on a task, owner or scope mismatch it stops and reports to its head; (3) no bot writes in another department's folder without that head's OK, and an accidental write is reported to that head at once.

## Browser lock rule (2026-10-16 23:21)
Hold .browser-test.lock only around a real browser command. Never hold it across a sleep or wait. Release it as soon as the command ends.

## Browser lanes (Ops, 2026-10-16 23:55; replaces the earlier browser lock rule)
- There are two lanes. Lane 1 is `.browser-test.lock`, for any engine. Lane 2 is `.browser-test-2.lock`, for Chromium-only checks. Every browser job takes exactly one lane.
- Each hold has a 10-minute cap, enforced in the command: `flock <lock> timeout 600 <real browser command>`. Split longer suites into steps under 10 minutes and release the lock between them.
- Never sleep, idle or run a non-browser step (builds, sims, unit tests) while holding a lock.
- Lane 2 is for when the box isn't busy. If the 1-minute load average is above 12, don't start a new lane-2 job; queue on lane 1 instead.
- The release and gate checks named in status.md "Current focus" go first. Everything else waits.

## Process rules (CEO approved, 2026-10-17 09:03)
1. **Archive and log once.** Every day at 08:45 (Europe/Belgrade, the daily archive routine), Ops copies anything older than 24 hours from status.md and decisions.md into `archive/status/` and `archive/decisions/` (one file per day), then trims the originals (copy first, then trim, so writes during the move are not lost). The "Standing rules" block at the top of decisions.md is never archived; only dated one-off decisions move. Each head replaces its own status section instead of adding to it. Each decision is logged once, by whoever made it.
2. **Decision IDs.** Every decision in decisions.md gets a stable ID (D-YYYYMMDD-NN) and lists the files it affects. Status lines and specs link to the ID instead of restating the decision. For milestone decisions, each listed file's owner updates that file within 30 minutes (D-CEO-20261019-12/13).
3. **QA queue.** Head of QA keeps qa/queue.md in priority order: item, SHA, browser lane, owner and time cap. Every pause names who resumes it, when, and which build SHA it applies to.
4. **Waiting on decision.** The Current focus block in status.md has a "Waiting on decision" line: item, who decides and the time cap. Ops' 2-hourly keep-moving check (D-CEO-20261028-05) treats one past its cap as a stall.
5. **Screenshot manifest.** Every screenshot handoff includes a manifest.json listing SHA, engine, size and save state for each shot. The sender checks that the HUD build label matches the SHA before sending. Template: art-ux/screenshot-manifest-template.md. The manifest gives the PR number, the full 40-character SHA and whether it's pushed, plus one entry per shot: file, engine, W×H, docked, save or seed, and state. Art & UX rejects any set without a valid manifest.

### Added 2026-10-19 (D-CEO-20261019-12 and -13)
6. **One L30+ harness.** L30+ numbers count only if they come from the Senior Software Architect's harness (`npm run measure:l30plus`, documented in engineering/l30plus-harness.md). Every number quotes the harness sha, the code SHA and the CSV sha256.
7. **Pacing gate.** Pacing candidates are judged only against the economy result card in product/economy/gates.md.
8. **One backlog, one parked register.** M4.1 work lives only in engineering/m4.1-backlog.md. engineering/parked.md has one row per PR, and each row has a revive-or-kill date. Anything past its date closes by default unless the CEO keeps it.
9. **Freeze end.** A freeze ends only with a CEO decision ID.
10. **Team queues.** Each team keeps a queue file, and every staff brief tells staff to check it at the start of every turn.
11. **Verify before publish.** HoE posts the built HTML's sha256 and build-id with the merge request. Before the tag goes Latest, the QA check on saves confirms both against the SHA that passed.
12. **Release hygiene.** The release checklist includes closing merged branches and PRs.
13. **Optional CI guard.** Inside M41-5, a CI guard may flag UI literals that duplicate balance.json tunables. Add it only if it's cheap.
14. **QA rerun of L30+ gate numbers (D-CEO-20261019-14, retro A2).** Before the CEO rules on any L30+ gate number, QA reruns it independently. This covers only numbers going to a CEO ruling, not exploratory reshape candidates. At least 45 minutes before the ruling or its cap, Economy sends Head of QA a priority handoff with the CSV, its sha256 and the code SHA; a late handoff is reported as an incomplete rerun. QA tracks the work in the standing row qa/queue.md #6 and reruns only with `npm run measure:l30plus`. Under seed determinism the result must match exactly. A mismatch goes back to Economy, and the CEO doesn't rule until it's resolved. Pending reruns sit on status.md's "Waiting on decision" line so Ops' 2-hourly keep-moving check (D-CEO-20261028-05) catches stalls.

## Feature freeze (Vadim via CEO, 2026-10-17 09:57) — LIFTED 2026-10-19 00:09 by D-CEO-20261019-01; kept for history only
Not in force. Normal 24/7 work and "ask your head for work" apply again. Text below is the old rule.

No new development, specs, tracks or kickoffs. M4 design work is parked too. Only the CEO's in-scope release items continue, and Head of Engineering owns them. Idle staff stay idle, and "ask your head for work" is suspended. The SHA rule is in Standing rules #3 in decisions.md.
