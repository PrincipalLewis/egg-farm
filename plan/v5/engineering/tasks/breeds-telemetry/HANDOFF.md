# HoE/v5-127-restack — #127 breeds telemetry — HANDOFF (03:50 CET)

**State:** merged forward onto #125's fix head `2b760d1c`. Full local gates are green, except K10, which is known-red and pre-existing. Waiting for #125's GO, then HoQA's bar. If #125 moves again, merge forward again (`--no-ff`, never rebase or force).

**PR:** https://github.com/PrincipalLewis/egg-farm/pull/127. Base `saves/breeds-sim-prB-traits`. The PR body was updated through the REST PATCH. Branch `gen/breeds-telemetry`, worktree `/workspace/wt-gen-breeds-tel`.
**Tip `7a7c7b2`** (tree `7cb70798`). Plain push.

**Merges:**
- `7a7c7b2` = `3ce4d6a` + `2b760d1c`. Clean, no conflicts. No #127 code or test relied on the removed tickClock default.
- `78eb147` = `04add420` + `eb92b375`. Conflicts resolved:
  - m5-fields: keeps both `breedsCalm` and `breedsTel`.
  - state.ts: both fields.
  - timers.ts: #125's Present chain, plus the `ev` sink.
  - offline.ts: #125 verbatim, plus the optional `ev` sink.
  - game.ts: #125's away_bp before the grant and its ≥60 s gate. Grant events come from the same applyOffline. `session_end = { ...presentEnd, ...breedsEnd }`.

**Auto-triggered runs (not watched):** ci 42746076495, pacing-x1-stack 42746076859, k10-breeds-offset 42746076415.

## Done
- m1: red `cd98a20` (3/3 fail), fix `e7a3654`, green 3/3. **The pageshow guard is interim. Delete it when the Architect's TEL envelope lands.**
- Wiring: present = BR-R12 coop delta; away = BR-R13 grant bonus, credited in the grant session. **broody_cents = 0:** BR-R14 isn't built.
- `v5-breeds-telemetry-traits.test.ts` (8), including flag-off identity.

## Gates @ 7a7c7b2 (`/workspace/artifacts/v5-breeds-tel-7a7c7b2/`)
- tsc 0.
- Focused: 28 files / 478 pass.
- Flag-0 goldens + k10-breeds-offset.test.ts: 5 files / 16 pass.
- test:k10: 1 fail, known-red. g1max 63.12 vs 63.10, identical on #125 `eb92b375` and `a8a1ae8a` on hosted CI.
- Full npm test: 163 files, 2390 pass / 1 skip.
- Build + check-release-build: ok.

## Left
1. HoQA bar after #125's GO.
2. Tell Saves: `breedsCalm.activeMs/lostCount` have the same bfcache double-count.
3. Optional n1.
4. K10 known-red is HoP/Balance's call, not #127's.

Note: `gh pr edit` lacks the read:org scope. Use `gh api -X PATCH repos/PrincipalLewis/egg-farm/pulls/127`.
