# Screenshot spec check · 2026-10-19 00:49 CEST · UI/Visual Designer
Verdict: NO NEW IN-SCOPE SHOTS. Nothing held, nothing sent.

## New since 00:20
- qa/m3-recheck/gate5-pr41/dryrun-dd52bfd/chromium/*.png (96 + 2 probe-pl1 shots), manifest.json present (96 entries, all files exist; probe-pl1-{390x844,1280x800} unlisted).
  - What it is: UI QA's Gate 5 script dry run (README: implements art-ux/reviews/m4-on-checklist.md §A) on dd52bfd, M4 off, Chromium only. Not the new M4-ON (#41) SHA, and dd52bfd Latest already PASSED (2026-10-17 14:45). So it is not a Track A or Track B review set. Not reviewed for verdict.
  - Run state: chromium exit=0, 96 shots, assertFail=0, 20 skips (tracks x16 because m4.enabled=0, explainer x4). Probes: pl1 PASS at 390/1280 (Escape doesn't buy, Enter does), g3/m1 N/A (M4 off), milestones probe ERROR (browser context closed), which is QA's to rerun.
  - Measured checks (FYI, no verdict): no doc overflow, clip or bad text. Sub-44px taps = Upgrades segmented tabs at 107/112/117x36 (the logged pre-existing Minor, unchanged). Also a 107x26 "Collection" target on 5 L10/L30 upgrades-workers shots at 360/375/390, to look at on the #41 set.
## Still waiting on
New M4-ON (#41, D-CEO-20261019-01) SHA delta set: manifest, 3 engines, phone sizes + 1280 docked, M4 UI visible (tracks + explainer), pre-M4 acdbedc farm migrated on first load, diffed vs dd52bfd. Plus the PL-1 keyboard shot (D-CEO-20261019-02) if PL-1 rides with #41.
