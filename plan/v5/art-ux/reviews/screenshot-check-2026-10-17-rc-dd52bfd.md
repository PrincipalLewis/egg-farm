# Screenshot check: final RC dd52bfd (M4 off, Latest), 2026-10-17 14:45 CEST
Set: qa/m3-recheck/rc-dd52bfd/shots/ (root=chromium, firefox/, webkit/) + manifest.json; report qa/m3-recheck/rc-dd52bfd.md.

**Verdict: PASS. 0 Blocker/Critical/Major.** 1 Minor (confirmed), 1 Nit, coverage notes.

## Manifest
- sha dd52bfdc1c695cfc7695b3d63ba6a7883c5fd49b (full 40), pushed=true (ls-remote main 13:00 CEST), build_label_checked=true, rev 1.
- 72 entries, 72 unique (engine,file), all files exist; PNG pixel size == entry size for all 72; docked=true exactly for the 24 1280x800 shots; bid m3-rc1-pre+dd52bfd on every entry.
- Visible label read in settings-normal shots (Read tool, e.g. firefox/settings-normal-360x800.png): "Egg Farm m3-rc1-pre+dd52bfd" = manifest. Note: the label lives in Settings, not the HUD bar (by design).

## Coverage
3 engines × {360x800, 375x800, 390x844, 1280x800 docked} × 6 states (farm, market+Sell all, Upgrades>Collection capped [PM4-P3], Upgrades>Farm, Upgrades>Workers, Settings) = 72/72. No gaps against the requested matrix.
Not in set (not gaps for this RC): worker-asleep banner (no asleep state shot; out of scope/M4 off), #5/#35 (deferred by HoE 13:44, not in dd52bfd), M4-A UI (m4.enabled=0), 1024x474/1280x720 (measured by QA layout, not shot).

## Spec check (all 12 check-sheets + full-res spot reads)
- Copy: "Collect +25 · 12 ready", "Sell all (5 eggs · $9.50)", "Sell 5/Sell 4" partial rows, "Collect per tap", "Limited by coop · Upgrade Farm →", "Need $75.5K more", Farm level stats, "Hire $40.00", unlocks lines: match specs. Numbers abbreviated ($75.6K, $246.00, $5,000.00 in HUD per existing HUD format).
- PM4-P3 Collection card (capped F3/C19 $20): disabled $75.6K button, coop-limit line with house icon + link, no overflow, consistent across engines and sizes incl. 1280 docked.
- Icons + text: coop-limit and goal lines use SVG icon + text; no emoji.
- Tokens: Hire/Sell green #3D7F33 w/ white text, Reset #B83B37 w/ white, links wood-text #8A5528; no regressions vs previous sets.
- Fit: no horizontal scroll (QA layout sw==cw at all widths, 3 engines; visually no clipped labels/ellipsis failures). Desktop docked layout correct in all engines.
- Tap targets: Collect, Sell, Sell all, Hire, Export, Reset, close ≥44.

## Findings
- **Minor (confirmed, pre-existing, post-freeze):** mobile (<960px) Upgrades segmented tab buttons are 107×36 inside the 44px track (layout log: ["Collection",107,36] etc., all 3 engines; visible in shots). Our m2-workers-layout.md specifies 44px-tall tabs, so this is below our spec, not just QA's rule. Not Major: unchanged code, 107px wide, track hit area 44. Fix (rc2): `.tabs button{min-height:40px}` with track padding 2px → or make the button fill the track (height:100%, track 44+) so the hit target is ≥44.
- **Nit:** 1280 docked Market sheet "Sell 5 / +$8.50" button text small (~11px sub-line) — pre-existing, log only.
