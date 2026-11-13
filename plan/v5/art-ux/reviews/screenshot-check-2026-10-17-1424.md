# UI screenshot spec check, 2026-10-17 14:24 CEST: NO VERDICT (nothing held)

Target: final RC 90a9c84 (PR #41, M4 flag ON). Flag-only diff vs dd52bfd already confirmed at 13:50 (balance.json m4.enabled 0->1); QA's diff-vs-dd52bfd.patch and empty csv-changed.txt agree.

## Seen and rejected unreviewed (no manifest.json)
- qa/m3-recheck/m4on-pr41-90a9c84/rc0-shots-{chromium (17), firefox (3), webkit (3)}: Fx/WK only m1-deactivate at 360/390/1280. QA m4probe rerun (playwright fix + .ic grouping) restarted 14:22, still running; first-pass p3 chromium BAD 6, layout chromium BAD 18 pending rerun. acdbedc-saves.json present but no shots asserted as an acdbedc M4 save.
- qa/m3-recheck/rc-pass-90a9c84-evidence/shots-rc0-{chromium (17), firefox (3), webkit (1, still rendering)}, shots-html (2), hidden-{chromium,firefox}-dist-qa/shots (20): QA functional evidence; WebKit leg in progress at 14:25.

## Notes (QA domain, not a UI verdict)
- QA summary shows rc0 243/247 on all 3 engines and failing unit/slow subsets on 90a9c84; for HoQA to adjudicate.
- 36px mobile tabs Minor still to confirm on the manifest set.

## Still waiting on
90a9c84 3-engine manifest set with M4 UI visible, 1280 docked + 360/375/390, acdbedc M4 save loaded (ETA ~17:30 CEST). Worker-asleep display and #12 only if UI changes.
