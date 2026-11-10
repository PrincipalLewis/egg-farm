# Screenshot check 2026-10-17 13:50 CEST (UI/Visual Designer, routine)

Verdict: NO VERDICT (no manifest set for the final RC SHA yet). Nothing held.

## Final RC SHA (M4 flag ON)
- SHA: 90a9c8468e3c927dc232ab2e64d6858446c9edb9 (PR #41, origin/rc/m4-default-on; engineering/status.md 13:48, D-CEO-20261017-03).
- Diff vs dd52bfd (checked in game/ with git): 1 commit "rc: M4 default ON (balance.m4.enabled 0->1), flag only"; 1 file, src/config/balance.json, `"enabled": 0` -> `1` under `m4`. Nothing else. CONFIRMED flag-only. QA preflight (rc-pass-90a9c84-evidence/summary.txt) agrees; CSV changes 0.

## Sets seen
- qa/m3-recheck/m4on-pr41-90a9c84/rc0-shots-chromium/*.png (3: rc1-s2-6-qtag-9of9-375/390, m3-rc0-desktop-1280): no manifest.json, Chromium only, no Firefox/WebKit, no acdbedc save load shown. REJECTED unreviewed.
- qa/m3-recheck/rc-pass-90a9c84-evidence: logs/patch only, no shots.
- qa/m3-recheck/m4-downgrade-fixtures: save fixtures (json), no shots.
- qa/m3-recheck/rc-dd52bfd (now has p3/ and shots/ manifests): SUPERSEDED by 90a9c84 per CEO 13:45; not reviewed.

## Still waiting on
- QA final RC set on 90a9c84 with manifest.json, Chromium+Firefox+WebKit, M4 UI visible, 1280 docked + 360/375/390, acdbedc M4 save loaded (ETA ~17:30 CEST).
- Check there: Upgrades-tab / segmented buttons 36px on mobile (logged Minor, pre-existing).
- Worker-asleep display and #12 only if their PRs change UI (none new seen).
