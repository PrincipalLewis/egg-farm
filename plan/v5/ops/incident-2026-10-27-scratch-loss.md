# Incident 2026-10-27: scratch out/ loss (HoO, read-only, 2026-10-28 08:02 CET)

## Timeline (CET)
- 18:18–18:21: a new base image is built (dpkg.log, /exec-daemon).
- 23:14: the last pre-incident studio entry that survived (engineering/status.md, PR #73 Ready), intact.
- 23:34:04: a fresh container starts: /dev, /proc, /tini and /pod-daemon are dated 23:34,; first /tmp file 23:34:04.
- 23:34–23:38: **every file in /workspace and /home/box was recreated.** About 197k files were born between 23:34 and 23:38. No file under /workspace is born earlier. mtimes were reset to the copy time (only 1 file kept an older mtime), so "files dated 23:38" means the copy, not a rollback.
- 00:07 onward: bots resume work (PR #73 merged at 00:07, then #74 and #75). `who -b` shows a boot at 02:33 with nothing lost after it.

## Cause: platform workspace restore or migration, not a bot (high confidence)
The restored copy left out directories by name. Of those named `out`, `dist`, `build` and `node_modules`, **0 were restored**. Every one present now was created after 23:38, and all 207 restored package.json folders lack node_modules. Directories named `logs`, `tmp` and `vendor` were restored, and so were the gitignored `dist-qa` and `qa-out`. So the copy used a fixed list of build-artifact names, not .gitignore rules. /tmp was not carried over: /tmp/org-plan.bak from 20:3x is gone.
Ruled out:
- A bot running rm, git clean or worktree prune. A command can't change the birth time of every file on the box or restart the container. Logs and queues from 22:00 to 00:30 mention no clean, restore or rm.
- Economy. Its transcript shows it only found the loss.
- The Architect's /tmp/v1d-* cleanup, which ran at 06:15–07:40, after the loss.
- Rollback: content written at 23:14 is intact.
Unknown: who started the restore, and why. No marker was found in /tmp/exec-daemon.log.

## Scope
- Lost: every `out/`, `dist/`, `build/` and `node_modules/` folder on the box, and all of /tmp. Studio docs cite 40 such paths that are now missing, mostly scratch/m51-ship, v2-econ, m52-press, m51-econ and m51-refill out/ folders, plus pr*/dist builds.
- Intact: top-level studio files, qa/, engineering/reviews/ (pr73-25d033f.md), product/, research/, ops/, decisions.md rule 18 and scratch/f27-verify/csv/o1a.csv. The game repo has 3fcd4e46 (22:58) and later commits; origin/main is 22eac98 (07:50). No evidence of lost commits, but unpushed local branches weren't audited one by one.
- Worktrees need `npm ci` before builds.

## Recommendation
1. Gate outputs live in `/workspace/egg-farm-studio/artifacts/<gate-id>/`. **Never name a folder `out`, `dist`, `build` or `node_modules`** (use `results/`). Keep nothing gate-critical in /tmp.
2. Each gate result records a sha256 manifest (`sha256sum * > MANIFEST.sha256`) next to the result in the decision or review doc. Small outputs (<5 MB) are committed to a repo branch, so a copy exists off the box.
3. scratch/ and /tmp are disposable. A pin that points into scratch/ isn't valid for a gate.
4. Econ's re-run should land in artifacts/m51-o1a/ and artifacts/m52-o1a/ with manifests, checked against the pinned sha1s (decisions.md §10.3).
