# In-flight work: open PRs and WIP branches

Snapshot: **Tue 10 Nov 2026 ~11:00 CET** from `gh pr list -R PrincipalLewis/egg-farm --state open` and `git ls-remote origin`, plus a read-only scan of every checkout on the studio box. The studio is stopped (D-CEO-20261110-18); every lane was told to push WIP + HANDOFF.md before the stop (D-CEO-20261110-17). Times are CET (UTC+1). "Next step" comes from the PR's HANDOFF.md or the flag table; where neither says, it is marked TBD.

## Open PRs (22)

| PR | Branch → base | Head | Draft | Updated (CET) | Flag / item | What's left → next concrete step | Handoff |
|---|---|---|---|---|---|---|---|
| #134 | `gen/broody-sim` → `saves/breeds-sim-prB-traits` | `03888f96` | Draft | 11-10 03:58 | broody sim | Finish nest sim, retarget after #125 lands, bar; then yard UI | `engineering/tasks/broody-yard-ui/HANDOFF.md` |
| #133 | `saves/v5-refill-sim` → `rc/v5` | `7cbbb9b6` | Draft | 11-10 03:55 | rc2Refill/autoRefill sim | G1 (save keys + sanitiser + flag-0 identity) WIP; next: `m5-state.ts` refill fields per handoff "Next (G1)" step 3 | `engineering/tasks/v5-refill-sim/HANDOFF.md` |
| #132 | `saves/v5-worker-paused` → `saves/workers-drift-d1d2` | `d8e278f8` | Draft | 11-10 03:55 | pause `worker_paused` | WIP: emit moved into #119's `pauseWorker`; land after #119 | TBD (no dedicated HANDOFF found; see flag table pause row) |
| #131 | `ui/v5-fatigue-cue` → `ui/v5-sales-stopped` | `df124220` | Draft | 11-10 04:17 | fatigueCue UI | Swap to real #128 helpers, then Ready (HoE: Ready only after the swap) | `engineering/tasks/v5-ui-ss-fatigue/HANDOFF.md` |
| #130 | `ui/v5-sales-stopped` → `rc/v5` | `7299bfe3` | Draft | 11-10 04:11 | salesStopped UI | Same as #131 | same |
| #129 | `gen/collection-cost-port` → `rc/v5` | `e234fad1` | Ready | 11-10 03:34 | collectionCostFromCsv | QA bar, merge; unblocks Econ R04 screen | `engineering/tasks/collection-cost-port/HANDOFF.md` |
| #128 | `saves/v5-risk-helpers` → `rc/v5` | `b7a562f8` | Ready | 11-10 04:03 | salesStopped+fatigueCue sim | Architect review + Saves QA bar, merge | TBD (see `engineering/tasks/v5-ui-ss-fatigue/SIM-API.md`) |
| #127 | `gen/breeds-telemetry` → `saves/breeds-sim-prB-traits` | `7a7c7b2a` | Ready | 11-10 03:56 | breeds telemetry | Wait for #125 GO → HoQA bar; restack onto #125's final head (merge `--no-ff`, never rebase/force) | `engineering/tasks/breeds-telemetry/HANDOFF.md` |
| #125 | `saves/breeds-sim-prB-traits` → `rc/v5` | `77a3ae17` | Ready | 11-10 03:48 | breeds traits | HoQA re-bar resume (~2 h), merge first in the train | QA notes `handoffs/qa/scratch/pr125-eb92b375/HANDOFF.md` (+ other `pr125-*` folders) |
| #123 | `feat/v5-telemetry-st-ac19-20` → `rc/v5` | `74d640d4` | Ready | 11-10 00:47 | streak/tapCoins telemetry | One bar at final head; merges post-freeze, before the RC verdict (D-CEO-20261110-04); must land before TEL envelope + session-end | TBD |
| #122 | `gen/trace10` → `rc/v5` | `6490bde5` | Ready | 11-10 00:52 | BG3 trace10 harness | One bar; post-freeze merge before verdict | `engineering/tasks/trace10/HANDOFF.md` |
| #121 | `feat/v5-workers-ui-drift` → `saves/workers-drift-d1d2` | `2e48305e` | Ready | 11-10 00:19 | pause (Manage N drift) | Lands with/after #119 | TBD |
| #119 | `saves/workers-drift-d1d2` → `rc/v5` | `b65d23c6` | Ready | 11-10 01:44 | pause drift + `worker_resumed` | Done; HoQA bar after restart, after CP train, verify-smoke, rc2Refill=0 and =1 | TBD |
| #117 | `saves/f3-fieldspec-obj` → `rc/v5` | `87bd8b59` | Ready | 11-06 02:54 | telemetry F-3 | Post-freeze, in train after #100 | TBD |
| #116 | `feat/v5-abilities-ui` → `rc/v5` | `629ab76d` | Ready | 11-06 03:47 | abilities UI | Resolve `src/sim/actions.ts` conflict (~3 h) + post-freeze re-bar | TBD |
| #110 | `feat/v5-f5-pacing` → `rc/v5` | `16d91de7` | Ready | 11-05 23:49 | F5 pacing harness | **TBD** (not in the flag table's train) | TBD |
| #102 | `hoe/ac7-csv-integration-20261105` → `rc/v5` | `42c45b7e` | Ready | 11-05 20:41 | AC7 CSV gate | **TBD** (not in the flag table's train) | TBD |
| #100 | `v5-m51-bbv2` → `rc/v5` | `2e76d0c5` | Ready | 11-06 03:42 | bestBuyV2 | Merge after #127; QA 2–3 h | `engineering/tasks/bbv2/HANDOFF.md` |
| #89 | `test-infra/recorded-pid-kill` → `rc/v5` | `a32faeb3` | Ready | 10-30 09:08 | test infra | **TBD** (no current ruling) | TBD |
| #86 | `feat/v5-ui-f6-overlay` → `feat/v5-ui-attended` | `2b4abf93` | Draft | 10-29 23:31 | F6 (old) | **Superseded**: #86 is rebuilt on `feat/v5-f6-rebuild` (D-CEO-20261110-09); close when the rebuild PR opens (owner HoE) | — |
| #85 | `feat/v5-ui-attended` → `rc/v5` | `2325e2aa` | Draft | 10-30 12:57 | F6a attended | Attendance already on `rc/v5` via the slim path (`v5-ui-build-state.md`); disposition TBD | — |
| #84 | `tests/bot-m4-observe` → `rc/v5` | `32608690` | Draft | 10-29 22:47 | QA seam Q4 | **TBD** | — |

## WIP branches on origin without a PR

| Branch | Head | Owner | State → next step | Handoff |
|---|---|---|---|---|
| `feat/v5-f6-rebuild` | `017b8bc8` | Features | Phase 2 (~5 h left of 6–8); open PR, then streak/golden/Broody mount on it | `handoffs/worktrees/rev-f6-7810680/engineering/tasks/v5-f6-rebuild/HANDOFF.md` (box copy is inside an Architect review worktree; the branch also carries one) |
| `feat/v5-ui-shift-sheet` | `c85f6560` | Features | PARKED; at restart: G1 binding proof → axe 3 engines → D-HOE-60 → rev-16 → `app.ts` openers | `engineering/tasks/v5-ui-shift-sheet/HANDOFF.md` |
| `feat/v5-breeds-ui-prB` | `cdbebb5a` | Features | Draft-ready; open Draft once `origin/v5/breeds-ui-a` exists (~7 h left incl. waits) | `handoffs/worktrees/rev-prB-d66a726/engineering/tasks/v5-breeds-ui-prB/HANDOFF.md` |
| `v5/ui-streak-tapcoins` | `f13d95a8` | Hire 3 | PARKED, clean; rebase onto F6 + apply `f6-swap.diff` when F6 merges | `engineering/tasks/v5-ui-streak-tapcoins/HANDOFF.md` |
| `wip/hire2/v5-pause-ui` | `29d66915` | Hire 2 | PARKED; open Draft PR at restart with HoE's OK | `engineering/tasks/v5-pause-ui/HANDOFF.md` |
| `wip/hire2/v5-clockwage` | `e8f42b08` | Hire 2 | Sim WIP vs refill G0; merges after refill | `engineering/tasks/v5-clockwage/HANDOFF.md` |

## WIP that exists ONLY on the box (not on origin)

These are at risk if the box is lost. Do not edit another bot's worktree; see the recommendation in the PR description of this pack.

| Worktree | Branch @ head | Owner | Local-only work | Why not pushed / next step | Handoff |
|---|---|---|---|---|---|
| `/workspace/egg-farm-studio/worktrees/v5-breeds-ui-a` | `v5/breeds-ui-a` @ `8ef9b4cd` | Architect | 6 commits (28 files, +2466/−7 vs rc/v5) | Architect waits for Vadim's direct yes to push (D-CEO-20261110-06); push + open PR-A | `engineering/tasks/v5-breeds-ui-a/HANDOFF.md` |
| `…/worktrees/v5-breeds-ui-a-clamp-bind` | `v5/breeds-ui-a-clamp-bind` @ `d5742e63` | Architect | 15 commits (+2497/−7) | same; binds Saves #126 `familyClamp` | same |
| `…/worktrees/v5-tel-envelope` | `v5/tel-envelope` @ `4c440909` | Architect | 4 commits (16 files, +638/−39) | "Push/PR only on Vadim's own go"; build continues after #123 | `engineering/tasks/v5-tel-envelope/HANDOFF.md` |
| `…/worktrees/v5-vitest-teardown-fix` | `v5/vitest-teardown-fix` @ `a7333048` | Architect | 1 commit (3 files, +50/−1) | "Push and PR wait on Vadim" | `engineering/reviews/v5-vitest-teardown-cause.md` |
| `/workspace/wt-v5-p8-qa-hooks` | `feat/v5-p8-qa-hooks` @ `afbe314a` | Architect | 4 commits + 3 modified files (+67/−17) + 1 untracked test, last commit 11-05 | Disposition TBD (QA seam hooks; stacks on old #86) | `engineering/tasks/p8-qa-hooks/HANDOFF.md` |
| `/workspace/wt-v5-abilities-shift` | `feat/v5-abilities-shift` @ `1ebcd7af` | UI & rc1 Fixes `e80556fd` (unreachable, D-CEO-20261110-07) | 3 commits (+502/−14), 11-05 | Bundles exist in the box `artifacts/`; whether Features' Shift sheet supersedes it is TBD | `engineering/tasks/v5-abilities-shift/HANDOFF.md` |

Older local-only branches from Oct 16–30 (pre-re-plan, mostly rc1/m4/f1-era, plus `e80556fd`'s v5 F6/ccr-f2 work now superseded by the F6 rebuild) are counted in the PR description's inventory, not listed here.
