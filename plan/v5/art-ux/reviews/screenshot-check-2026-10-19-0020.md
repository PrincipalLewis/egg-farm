# Screenshot spec check, 2026-10-19 00:20 CEST: NO NEW IN-SCOPE SHOTS, nothing held

Context: D-CEO-20261019-01 (00:09) revived M4-on (#41) as the next milestone. qa/queue.md Active #1 is still WAITING FOR INTAKE (new SHA TBD; last parked head 90a9c84). No new M4-ON SHA has a shot set yet.

## Seen, not reviewed
- qa/m3-recheck/gate4-dryrun-90a9c84/{v6load,clock-chromium/shots}/*.png (12+4): Saves QA G4 dry-run on 90a9c84, Chromium only, no manifest.json. Excluded (90a9c84 sets out of scope per routine; wait for the new SHA).
- qa/m3-recheck/pl2-qa41-dd52bfd/*.png (8): UI QA prep P1 (PL-2 repro + QA4-1 order card at 320/360) on dd52bfd, functional evidence, no manifest.json. Rejected unreviewed.
- product/critic/shots-dd52bfd, qa/claude-gamer|claude-qa/m3-rc1-pre-dd52bfd, qa/m3-recheck/player-dd52bfd, m4on-pr41-90a9c84/{p3,shots/webkit}: post-publish/90a9c84 extras from Oct 17, no manifest.json or excluded.

## Still waiting on
New M4-ON SHA delta set (manifest.json, Chromium/Firefox/WebKit at 360/375/390 + 1280 docked, M4 UI visible, pre-M4 dd52bfd farm migrated on first load), diffed vs dd52bfd. Logged Minor to confirm there: mobile Upgrades tabs 107x36.
