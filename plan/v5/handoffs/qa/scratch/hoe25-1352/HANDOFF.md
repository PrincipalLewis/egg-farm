TASK saves-qa/hoe25-cases-g8: apply HoE ruling D-HOE-20261030-25 and errata rev 5 to the M5 save cases doc and the G-8 telemetry probe.
Write scope: qa/v5-saves/ only (m5-save-cases-DRAFT.md, probes/telemetry/g8-schema-ts.mjs, g8-selftest.sh + .out.txt, changes-20261030/, READINESS.md, scripts/SCRIPTS.sha256) + backups in qa/scratch/hoe25-1352/.
Owner: saves-qa (Saves QA). Rule 23 restart guard applies.

## Progress
- 13:52 HANDOFF created. Source shas: decisions.md sha1 e0a359a8 (matches forwarder), sha256 ed7661e1...; errata-v5 sha1 83424120 (EXPECTED cea3d717 -> MISMATCH, investigating)
- 13:53 RESUMED (rule 23): TASK line + scope match. Nothing written before except HANDOFF. Errata: live file is rev 6 (sha1 83424120); rev 5 frozen copy telemetry-spec-errata-v5.cea3d717.md verified sha1 cea3d717 (sha256 a4ad4287...) -> source = frozen rev 5. D-HOE-25 at decisions.md L443-.
- 13:54 Backups taken: cases doc, READINESS, SCRIPTS.sha256, g8 probe/selftest/out, CHANGES.md (BACKUP.sha256 here).
- NEXT: Part A edits (cases doc), Part B probe + selftest, then sums/READINESS/diff.
- 13:56 Part A DONE: cases doc 921f28fd -> bd544862 (168 cases, 18 expected FAIL)
- 13:57 Part B probe edited (new checks G8-7f/7s/7a, G8-14..19); next: selftest fixtures
- 13:57 Part B selftest 48/48 PASS; 3f582db + e77fc5c fail closed (G8-1 schema.ts absent)
- 13:59 DONE. cases bc1ec59b808f961a27328d0bde9ce7d1b7fceb6491b56419b06e8115a84abce5; READINESS ad3d6a7b; diff 4aa81bfa; CHANGES.md c8a16401; SCRIPTS.sha256 unchanged 724346bf (-c 14/14 OK). Timestamps in docs corrected 14:xx -> 13:5x.
- Writes outside qa/: only /tmp scratch (selftest's own mktemp fixtures, removed by the script; my /tmp/hoe25_editA.py, /tmp/g8out.txt, /tmp/g8-3f582db.txt, deleted). Nothing in the repo outside qa/.
- 14:00 STEERING (parent, same TASK/scope): (1) D-HOE-20261030-28 breeds=0 cases; (2) errata of record = rev 7 fd7d5921 (rev 5 superseded, rev 8 pending HoQ ~14:15+); build G-8 rev-5 items against rev 7, note diffs; record schema.ts builds against the rev pinned when it starts.
  Verified: decisions.md now sha1 5cc13f2a / sha256 79b6e954 (D-HOE-28 L488-491); errata live = rev 7 sha1 fd7d5921 / sha256 168444c2. Backups of step-1 outputs: *.step2-1400.
- 14:01 STEP 2 DONE. cases 3f223251; probe 83caed53; selftest.sh aa620af1 (48/48 PASS); out ac9194de; READINESS 42472993; diff 889908dc; CHANGES 2e04ce4b; SCRIPTS.sha256 unchanged 724346bf (-c 14/14). /tmp scratch (g8out2) deleted; nothing written outside qa/ in the repo.
