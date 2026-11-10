# Breeds UI PR-A — AC → test trace

**Head:** `56d4d46` (update on each milestone commit)  
**Files:** `tests/v5-breeds-ui.test.ts`, `tests/helpers/breeds-on.test.ts`, `tests/v5-breeds-qa-seam.test.ts`  
**Fixture:** `tests/helpers/breeds-on.ts` (`breedsOnBalance` / `breedsOffBalance`) — balance.json stays breeds=0.

| AC / row | Test(s) | Notes |
|---|---|---|
| BRD-AC1 / BR-AC1 flag off | `flag off: no #breeds-entry` | no `#breeds-entry` |
| BR-AC3 F9 / F10 / F14 / F20 | `F9…`, `F10…`, `F14 shows 2…`, `F20: 3 unlocked…` | locked Farm N (OQ-2) |
| BR-AC3 sheet + Esc | `opens #breeds-sheet… Esc closes` | |
| BR-AC3b / UI-BR-2 | `coachSeen: glow+dot…`, `coach unseen same session…` | next-session fallback not yet covered |
| BR-AC4 / OQ-6 place | `album select → empty slot places; Remove clears` | move/settle 300s sim = existing hatch tests |
| BR-AC10 | `BR-AC10 gate copy More breeds at Farm 14` | hatchUi |
| BR-AC11 | `BR-AC11 flock complete label` | hatchUi |
| BR-AC31 / silhouette | `F20… silhouette opacity 0.55` | |
| BR-AC31a | helpers + `after free hatch press…` | |
| BR-AC31b | `unaffordable → dimmed, no lock…` | |
| BR-AC31c | `ETA 90s → note; 91s → no note…`, free/complete no note | DOM + hatchEstimate |
| BR-AC31e | `default 85 / aw 95 → note; 95 / 85 → no note` | via `breedsEstimateOverride` (= eggfarmQa hook shape) |
| BR-AC32 reveal ≤400ms / RM | `reveal card has RM class… Nice! dismisses` | no auto-remove |
| BR-AC32 settle ring | `settling ring has no infinite CSS animation` + settle label | |
| OQ-3 ceil | `OQ-3 ceil remainingMs…` + incubating Ready in 0:46 | |
| E10 empty render | `E10 unknown unlocked slot id renders empty` | |
| HoQA breeds-on isolation | `tests/helpers/breeds-on.test.ts` | |
| HoQA ?qaBreeds=1 DCE | `tests/v5-breeds-qa-seam.test.ts`; release-bundle (Ready gates) | marker `get("qaBreeds")` |
| BR-AC25 / BR-R18 offline reveal | partial: `onWelcomeClosed` + pendingReveal on open | full offline gap = sim tests |
| BR-AC33–35 sprites | vendored `<img src>` (AC33 N/A for inline) | greyscale review Art |
| BR-AC49 docked focus | phone `registerSheet('flock')`; docked skips | browser QA |
| BR-AC52 / strip / chip | **PR-B** | |
| BR-AC23b/c BB strip | **PR-B** (#100) | |
| Family "max" (E8) | **gap** | `bc_lay_cap_*` not in `BC_SPEC_DEFAULTS` yet — stop if needed |
| D1–D6 Saves drift | await rebase on rc/v5 when drift PR lands | UI adapter null-safe |

## Gaps / deferred
- UI-BR-2b next-session highlight fallback test
- BR-AC25 full welcome-back → reveal browser path
- Family clamp "max" copy (needs bc_* caps in defaults or CSV)
- Full release-bundle vite qa/prod for qaBreeds (coded; run at Ready)
