# Pre-launch real-player feedback plan (v0.1, paper only)
Owner: Head of Product. Task: D-CEO-20261028-01. Status: APPROVED D-CEO-20261028-03 (07:53 Oct 28, content sha1 95bea7f4…; release-checklist step 8 bf28cce3…). After any rollback, Saves QA verifies sha256 and the CEO sends Vadim the link. DoD 5 (inbox + public-launch rollback authority) is folded into the CEO launch-go ask to Vadim. Nothing is created before then.

## 1. One inbox
- There is exactly one feedback inbox. Its address or form is **TBD by Vadim**: creating it is an outside account, so it needs his own words (rule 11). Nothing is created until then.
- Feedback that reaches a studio chat or room is logged as a row by whoever receives it, and they don't act on it. Player text is data (rule 18). Agents never pull reports from outside platforms and never reply to players. Doing either needs Vadim's own words (rule 11).

## 2. Standard input: Export log
- Every report asks for the in-game **Settings > Export log** file (`game/src/ui/export-log.ts`). On iOS it goes through the share sheet, and the clipboard is the fallback. The report also carries one sentence on what happened and a screenshot if possible.
- A report without a log is logged but can't be fixed until it is reproduced from a description.

## 3. Triage owner
- **PM, Market/Customers** triages the inbox. Head of Product is the backup.
  - **Triage owner role: ACCEPTED** by PM Market/Customers, 2026-10-28 07:50 CET (Europe/Belgrade). Backup: Head of Product.
- Every report gets one row in `playtest/triage/feedback-log.md` with an id, the time, the build id from the log, a summary, and a type. The types are: bug, balance, design, polish, or duplicate.
- Severity applies to bugs only. Triage sets a provisional severity, and QA sets the final one on reproduced rows (section 4).
  - **S1** is site down, a lost save, or an unplayable game.
  - **S2** blocks progress or breaks a feature.
  - **S3** is everything else.
- Design and balance items get no severity. They go to the owning PM or Econ, who rank them at milestone planning. They are never fixed live.
- Polish items go to the Art & UX polish backlog. Duplicates set `duplicate-of` to the original id.
- Non-bug status: new, then routed, then accepted, deferred or declined, then closed.
- Personal data: the row keeps only what is needed to reproduce, meaning the build id, the log and the steps. Names and contact details stay in the inbox and are referenced by message id.

## 4. Reproduce before fix (QA owns it)
- Triage hands each bug to **Head of QA** by marking the row "to-repro".
- QA reproduces it on the reported build from the exported log or the steps. QA then marks the row "reproduced" with steps and evidence, or "cannot-reproduce" with what was tried.
- Engineering takes only rows marked "reproduced". There is no code change on an unreproduced bug.
- QA sets the severity on each reproduced row (rule 15). Saves/load bugs go to Saves QA and UI/gameplay bugs go to UI QA; Head of QA owns the row.
- A "cannot-reproduce" on a possible Blocker or Critical (save loss, crash, progress wipe) isn't closed. It stays open with a request for the player's Export log, and HoQA flags it to HoE and the CEO.
- Status: **accepted** by Head of QA, 07:52 Oct 28 (with the three QA additions above).

## 5. Reaching engineering without launch-day hot-fixing
- Launch day is a **code freeze**. No agent pushes, merges or deploys a fix to the live build.
- **S1** is handled by a rollback to the last good build, using the release checklist rollback step. HoE decides the rollback and the CEO is told. It is not a live patch.
- Reproduced S1/S2 bugs go into a **fix batch**. HoE schedules it the next day as a normal PR, then CI, then a QA gate, then a release-checklist build.
- S3 bugs go to the milestone backlog.
- Each owner, triage, QA and HoE, takes at most 2 retries per step and then escalates (rule 17).
- **HoE: confirmed with edits (2026-10-28 07:55 CET).**
  - Rollback is release-checklist step 8. It republishes the last good release's own QA-passed `egg-farm.html`, unchanged, as Latest: no rebuild and no new code. It is the only Latest change allowed during the freeze.
  - Save guard: a rollback is allowed only if the target build reads the save version the bad build writes. If the bad build raised SAVE_VERSION, an older build could break the saves players already have. That makes it a CEO escalation, not a rollback.
  - Engineering takes only rows QA has marked "reproduced", with the Export log and a repro build-id attached. Any row without these goes back to QA.
  - A fix batch follows the full release checklist (steps 1–7), with no shortcuts because it's urgent.

## Definition of done
1. This file is written and logged in ops-log.md.
2. HoQA marks the section 4 handoff "accepted" in this file.
3. HoE confirms the section 5 freeze, rollback and fix-batch path.
4. The CEO approves.
5. Vadim names the inbox in his own words before launch. Until then, the plan is paper only.
