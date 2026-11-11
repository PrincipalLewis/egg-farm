# Release checklist (HoE). From M4.1; per D-CEO-20261019-13 and Ops (d)
1. Gates: QA PASS on a full SHA, CCR has no Blocker or Major, and Product and Art sign off on the same SHA (or a tree-identical one).
   - Review passes (D-CEO-20261028-02): CCR re-reviews only after Blocker, Critical or Major findings; other fixes get a self-review noted in the PR. Art & UX signs off from UI QA's 3-browser screenshots and manifest, and may ask for its own browser pass if a screenshot shows a problem. Claude QA and Claude Gamer run once per milestone RC plus once for any Latest release that changes gameplay or economy (not per build); Claude UX runs once per milestone. Second opinions only; green CI, the sha256/build-ID check and Saves QA are unchanged. The published-asset smoke lives only in step 5.
2. Merge with no force-push. Confirm that the main merge commit's tree equals the passed SHA's tree.
3. Build the single-file HTML from a clean checkout of the passed SHA (`npm run build:html`, check-release-build green). Confirm the build-id is `<release prefix>+<passed short SHA>`, with the prefix set for this release with no `+dirty`.
4. Pre-publish verification: post the HTML's sha256 and build-id with the merge request. Create the tag and the release as a **draft**. Saves QA checks the hash, checks the build-id against the passed SHA, and checks that the build-id's release prefix matches the release tag (for example tag m4.1-<sha> needs build-id m4.1+<passed short sha>; the release name and the build SHA may differ only when the trees are identical, and that must be stated). Only then mark it Latest (not a prerelease), with the asset `egg-farm.html`.
5. Post-publish: download the asset and re-check its sha256. Post the release URL, sha256 and build-id in Leadership and to HoQA. Saves QA runs a quick smoke test as a final reconfirmation.
6. Cleanup in the same session: close the merged PRs, delete the merged remote branches (after confirming each is an ancestor of main, and logging their SHAs), and retarget any stacked PRs first. Never delete worktrees by pattern.
7. Logs: write status.md and decisions.md entries (SHAs, tag, URL, sha256), and update m4.1-backlog.md and parked.md.

## Interim rule while GitHub Actions is down for billing (D-CEO-20261019-15, -16)
- **Intake / 17:15 handoff evidence:** the full local gate suite (tsc, vitest `--minWorkers=1 --maxWorkers=2`, test:slow, build:html + release check, check-globals, sync-economy --check), run from committed scripts at the **pushed full SHA**, counts for QA intake and the 17:15 handoff.
- **Every posted result must include:** harness sha/blob, code SHA (pushed, clean/dirty), CSV sha256, seeds, flag state (collection table on/off), and baseline CSV sha.
- **Saves QA reruns independently** on its own worktree; a number not reproduced by Saves QA cannot be used for a ruling.
- **No merge and no Latest without green CI.** Re-run CI on every pending PR once billing is restored. If billing is still down at M4.1 publish, the CEO rules then.
- Harness of record: `arch/m41-integrated` (846178a or successor SHA named by the Architect), equivalence mode option (b) per D-CEO-16.

## M4.1 additions (D-CEO-20261019-19), 10:31
- [ ] L30+ gate evidence is on the accepted harness SHA (arch/l30plus-bundle-check), with other=0 and all unlock-driven seeds passing G1-G10 from their divergence tick.
- [ ] Art & UX signs off the L30+ UI on the M4.1 build SHA (lock labels including 'Max for this farm', F27-28 goal bubble with the Farm unlock suffix "Farm L28: unlocks Hens L31"), before the 17:15 handoff. Tracked in qa/queue.md.
- [ ] QE-LATE-e (M41-6): spec v0.3 FROZEN (product/farm/frozen/qe-late-e-spec.v0.3.md, sha256 c6a37023...). On the pushed SHA: gate4 explainer 17/17 with EXP-SB-QE-LATE-e flipping, one Chromium run of qa/m3-scripts/qe-late-browser.mjs (QEL-12/13), and `rg mirrorOnFail src` showing exactly 2 hits (QEL-8).

## M4.1 re-plan (D-CEO-20261021-01, 2026-10-21)
- The L30+ items above are N/A for M4.1 and move to M4.2.
- The RC is one full SHA off main dd223f5 lineage, containing #54, #53, M41-6, M41-8, M41-9 and M41-7. Local gates run on committed scripts at that SHA, and the single-file HTML asset opens in Chrome.
- Art & UX signs off at the RC SHA. HoQA gives the verdict by 08:00 Oct 22. It goes Latest at 10:00 only if CI is green; otherwise the CEO takes it to Vadim.
8. Rollback (launch freeze, player-feedback-plan.md §5). Only for a reproduced S1 (site down, save loss or unplayable). HoE decides and tells the CEO at once.
   (a) The target is the last release that passed every gate. Use its existing `egg-farm.html` asset unchanged, with no rebuild.
   (b) Save guard: the target must read the SAVE_VERSION the current Latest writes. If it doesn't, stop and escalate to the CEO.
   (c) Mark the target release as Latest again, never with a force-push or tag moves.
   (d) Download the asset and re-check its sha256 and build-id against the target's logged values.
   (e) Saves QA loads a save from the bad build on the rolled-back build.
   (f) Log status.md and decisions.md entries (from, to, reason, sha256), then fix forward in the next-day fix batch.
   (g) Tell the CEO the moment the rollback is done, with the release URL and sha256. The CEO sends Vadim the link straight away.
   Authority (D-CEO-20261028-03): before launch, a rollback inside our GitHub releases is covered by Vadim's standing Latest policy. For the public launch, rollback authority is part of the CEO's launch-go ask to Vadim. Until Vadim gives that go, step 8 doesn't apply to the public launch, and nothing is set up ahead of it.
