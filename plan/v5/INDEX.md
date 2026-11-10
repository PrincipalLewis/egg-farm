# plan/v5 INDEX

Map of this pack. Copies taken from the studio box `/workspace/egg-farm-studio/` on **2026-11-10 ~11:00 CET**; folder structure is kept under each top folder. Rule used: *if a fresh agent would need it to finish v5, it is included.*

| Folder | Files | Size | Contents |
|---|---|---|---|
| `./` | 8 | 0.05 MB | Plan docs: README, features, workstreams, in-flight, gates-and-schedule, rules, decisions, this INDEX. |
| `product` | 310 | 8.74 MB | Product specs, PRDs, economy (CSV + model), rulings, errata, frozen pinned revs. Per-file index: `product/INDEX.md`. |
| `analysis` | 222 | 1.55 MB | Research, Game Critic / Claude Gamer / Claude QA findings, sims and sim results, playtests. Per-file index: `analysis/INDEX.md`. |
| `engineering` | 476 | 4.05 MB | Architecture/design docs, v5 flag table, sim/UI build state, RC manifest, schedule, build plan, task folders (`engineering/tasks/<task>/` incl. HANDOFF.md, SIM-API.md, diffs), reviews, triage, hire specs (`engineering/hiring/`). |
| `art-ux` | 389 | 12.78 MB | Style direction, layout/juice/sound specs, v5 flow specs (abilities, refill, broody, combo tiers, breeds, zero-gain), v5 wireframes, final assets (`art-ux/assets/`, incl. README/LICENSES), licenses, reviews. |
| `qa` | 368 | 3.66 MB | Test plans, bar definitions, release checks, v5 QA (m5/, v5-saves/, v5-econ/), reviews/gate reports, bugs, QA decisions. Text only. |
| `ops` | 35 | 0.14 MB | Usage forecast, weekly budget, usage rules, overhead audit + review, lane tooling (`ops/tools/README.md`, `lane-run.sh`, `lane-kill.sh`, `verify-claude-verdict.sh`), briefs for the new hires, audits, ownership map. |
| `hiring` | 1 | 0.00 MB | Studio-level hiring folder (1 file). Active v5 role specs are in `engineering/hiring/` (hire-2-spec covers Hire 2 + Hire 3; lane-u-backfill-spec) and briefs in `ops/*brief*.txt`. |
| `studio` | 16 | 0.36 MB | decisions.md (standing rules + CEO decisions), org-plan.md, roster.md, status.md, role-briefs.md, ops-log.md, gaps-poll.md, and the archived-but-in-force decision files. |
| `handoffs` | 52 | 0.10 MB | Every HANDOFF.md on the box that is not already inside a copied folder, at its original relative path; box `artifacts/` handoffs are under `handoffs/box-artifacts/` because the repo .gitignore ignores `artifacts/` (52 here; 78 HANDOFF.md files exist on the box and all 78 are in this pack, here or inside their own copied folder such as `engineering/tasks/`). |
| **Total** | **1877** | **31.43 MB** | |

## What was excluded, and why

- **Not copied by folder:** every `scratch/`, `archive/` (except `archive/decisions/`, still in force → `studio/archive-decisions-in-force/`), `node_modules/`, nested git checkouts and worktrees (`wt-*`, `repo/`, `checkout/`, `clones/`), `screenshots/`, `shots/`, `mocks/`, `mockbuild/`, `listing/`, `builds/`, `logs/`, `evidence/`, `dryrun/`, `tmp*`. QA: only `bugs, handoffs, reports, engineering, hiring, m5, v5-saves, v5-econ, reviews, rc2-scripts, csr` + root files; pre-v5 milestone folders (m2/m3/m41/m4a, `wt-*`) skipped. The box `artifacts/` folder (gate outputs) is not copied; small gate outputs are on the repo `artifacts` branch (rule 19).
- **Not copied by type:** binaries other than art-ux PNG/SVG; JSON over 200 KB; anything over 1 MB.
- **Skipped files (263):** 112 × superseded frozen rev; 1 × marked SUPERSEDED; 125 × pre-v5 wireframe; 8 × bot brief/config dump, not needed for v5; 2 × external mail log / credential proposal; 15 × Claude Code setup. Product superseded revs are listed in `product/INDEX.md`; raw outputs over 1 MB in `analysis/INDEX.md`.
- **Never copied:** the Claude Code setup (`ops/claude/`), bot brief/config dumps (`ops/*.json`), the external mail log (`ops/mail-log.md`) and the read-only-bot-token proposal (`ops/proposals/readonly-bot-token.md`).
- **Secret scan** before commit: grep for `ghp_`, `github_pat_`, `xox?-`, `sk-`, `AKIA…`, private-key headers, and `token|key|password|secret = <value>`. Hits were only pattern names inside two scan/review docs (`engineering/reviews/pr68-37bd5c8.md`, `ops/public-readiness-scan.md`) and prose mentions; **no credential values found.** The repo is public, so keep it that way in follow-ups.

## Large raw outputs kept on the box (not in the repo)

31 files over ~1 MB under product/, playtest/, research/, qa/ (selected folders) and artifacts/ — listed with sizes at the bottom of `analysis/INDEX.md`.
