# Egg Farm v5: plan and handoff pack

This folder holds everything a fresh agent needs to finish **v5** of Egg Farm without having been in the studio's conversations. It was assembled on **Tue 10 Nov 2026 (CET, UTC+1)** while the studio was **stopped** at Vadim's 65% weekly-usage cap (D-CEO-20261110-18). Nothing here changes game code.

**Updated Fri 13 Nov 2026:** the studio is running again (D-CEO-20261112-02). Vadim lifted the 65% usage stop (D-CEO-20261113-01); the studio runs at full pace until the weekly limit (reset Thu 19 Nov 2026, 17:53 CET). The D-CEO-20261112-01 split (Eng 47 / QA 12 per window; 75% Eng rejected) is now a priority guide, not a cap on total spend. Product and Art TBD pins in `features.md` are resolved; sim-complete progress and remaining TBDs are in `gates-and-schedule.md`.

Source of truth is still the studio box (`/workspace/egg-farm-studio/`). Files under `engineering/`, `product/`, `art-ux/`, `qa/`, `ops/`, `analysis/`, `studio/` and `handoffs/` are **copies taken at 2026-11-10 ~11:00 CET**, except the product, art-ux and studio `decisions.md` files and the governing pause frozen rev (`product/workers/m5-worker-pause-spec.07540579.md`), which were refreshed from the box on 2026-11-13. If a box file is newer than the copy, the box file wins; refresh the copy in a follow-up docs PR.

## Goal and scope

- **v5 is ONE release with ALL 14 feature flags shipped at 1. No cuts.** Development takes as long as needed. (Vadim, 2026-10-30: D-CEO-20261030-09, D-CEO-20261030-10; re-affirmed D-CEO-20261110-08.)
- **QA runs once, on the complete release candidate (RC).** Small builds get merge bars only, not full QA (D-CEO-20261030-10, D-CEO-20261110-08).
- The 14 flags (keys in `src/config/balance.json` → `m4.flags`, all `0` on `rc/v5` today): `golden`, `streak`, `tapCoins`, `abilities`, `broody`, `salesStopped`, `fatigueCue`, `pause`, `rc2Refill`, `autoRefill`, `clockWage`, `breeds`, `zeroGainUi`, `bestBuyV2` (source: `engineering/v5-ui-build-state.md`, `engineering/v5-flag-table.md`).
- Integration branch: **`rc/v5`** (every v5 PR targets it; tip when this pack was cut: `68f58c0f`, "Merge pull request #126"; tip as of the 2026-11-13 update: `b83ce852`, "Merge pull request #142").
- The CEO decides product and design details; Vadim is escalated to only for budget, external accounts, legal, or a change of direction (org-plan.md "Escalation").

## Definition of done (per flag)

A flag is done when all of these hold (org-plan.md "Release manifest build state"; `engineering/v5-rc-manifest.md`):
1. Its **sim** and **UI** are merged into `rc/v5` (manifest Build state = `built`).
2. Its PR(s) passed the QA merge bar named in `features.md` (one review per PR sha, rule 24 / org-plan rule 11).
3. Its spec ACs (linked per flag in `features.md`) pass on the complete RC with the flag at 1.
4. A flag never ships at 1 "dark": not built, or failing the final RC gate, means fix and re-gate, and the release waits (D-CEO-20261030-07/-10).

## Freeze and RC (D-CEO-20261110-08)

**Freeze** = the merge train + every lane-U (UI) row + every sim row merged into `rc/v5`, **and** K10/B4 green on the sim-complete sha → then **one RC verdict** (HoQA). Detail and gates: `gates-and-schedule.md`.

## How to use these files

| File | Use it for |
|---|---|
| `INDEX.md` | Map of every folder in this pack and what was excluded. |
| `features.md` | One section per flag: what/why, state, remaining work, how to build, owner, deps, estimate, ACs, QA bar. |
| `workstreams.md` | Ordered task queue per lane/owner and the critical path. |
| `in-flight.md` | Every open PR and WIP branch: state, what's left, next concrete step, handoff file. **Start here if you are taking over a lane.** |
| `gates-and-schedule.md` | Gates, the usage-bound timeline and the weekly usage split. |
| `rules.md` | Process rules every agent must follow (links to the studio files). |
| `decisions.md` | One-line index of the v5 decisions. |
| `product/INDEX.md`, `analysis/INDEX.md` | Per-file index of copied product docs and analyses. |

**Taking over a lane:** read `rules.md` → your lane in `workstreams.md` → the PR/branch rows in `in-flight.md` → the task's `HANDOFF.md` (path given in `in-flight.md`; copies under `handoffs/` and `engineering/tasks/`) → the spec sections linked in `features.md`.

## Known gaps

Items marked **TBD** in these files are unknown at the time of writing; each says why. The biggest remaining after the 2026-11-13 pin update are listed at the top of `gates-and-schedule.md`.
