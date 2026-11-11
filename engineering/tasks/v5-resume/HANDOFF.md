# TASK Architect/v5-resume

Write scope: Architect-owned `game/src/sim` flags/timers, related tests/goldens, review records in `engineering/reviews/`, manifest and status records. Do not modify other departments' files.

Canonical handoff: Head of Engineering's 2026-11-05 message. No previous Architect HANDOFF.md existed. This file records that handoff and supersedes the missing saved handoff.

Resume rulings verified in studio `decisions.md`: D-CEO-20261105-01 lifts the Oct 30 stop; D-CEO-20261105-03 resumes every v5 lane. All v5 work ships together with one full QA gate.

## Order and definition of done
1. Re-review PR #99 at `c4a1a76f470e9478f9f622da0a46e62b885411a4`, against the previous Architect #97 review and current rc/v5 `518de304fbe9f4c8f3dd04b8fffe38ee7698b94f`. Run required checks; record verdict, exact SHAs and findings.
2. Review PR #100 at `d654afdaaf4fbe36f05d464ad3c6c63442db139d` against rc/v5 518de304, spec v1.0.3 `27e753d8` and D-HOE-35, using `engineering/tasks/bbv2/HANDOFF.md`. Run required checks; record verdict, exact SHAs and findings.
3. Resume the SIM-only flag-list work from local `1224804` (D-HOE-38): exclude zeroGainUi and bestBuyV2 from anyM5FlagOn, prove UI-only flips leave sim state byte-identical, finish checks and hand over a bundle.
4. Resume F1 (D-HOE-37) when its merge prerequisites are met.
5. **X1-H1 post-merge hygiene (QA request, HoE 2026-11-05 ~21:0x; recorded 21:05 UTC+1), before complete-RC handoff:** `pacing-x1-stack` row 904 is RC-only and non-failing outside `--require-ac7`; still blocking in RC mode (`--require-ac7`). Done = plain PR CI headline not red for row 904 alone + test proving RC mode still fails without AC7. Status: open. #99 merged → rc/v5 `30df38c0a0bd5d48db96d0705abccc6db197d161`; item 1 complete.

Commit as `Senior Software Architect <architect@eggfarm.studio>`. Follow rule 21 for long-running processes; max 2 retries per step. Report results to HoE; no merge without QA's verdict.
