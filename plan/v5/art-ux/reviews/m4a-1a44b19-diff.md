# M4-A release diff check c108440..1a44b19 (UI/Visual Designer, 2026-10-17 09:05)
Result: PASS. Every visible change is code that already passed review on its own PR. No new UI.
- app.ts: Sell all uses sellAllPreview (PR #28 f7642c9, passed 06:47/07:49, signed off 06:50).
- format.ts: T tier, rollup, '—' for NaN (PR #22 FMT-1/2, passed 02:54). This also fixes the HUD '1000B' item.
- orders.ts: egg banding by number (1.2K below 10K, else fmtCount). Display is unchanged except at ≥1,000T.
- styles.css: recovery v2.1 spacing scoped to [data-outcome]; tab-guard/newer-save keep gap 12px (PR #25 R1, passed 08:52).
- index.html: Fredoka 700 preload (font loading only, no layout change; vite drops it on flag-off builds).
- No copy-string changes in src/ui outside the above. The rest is tests, vendor and economy data.
Caveat: this is a diff review. I did not re-render at 1a44b19.

## Final-head check 1a44b19..d75d41f (UI/Visual Designer, 2026-10-17 09:32)
Result: PASS. PR #31 (m4/m4a-tracks-v4) head moved to d75d41f (fb8c809 merge main 8e6d53e, d75d41f merge resolution taking main's pins).
- src/ui/**, styles.css, index.html: no changes. No copy-string changes anywhere in the diff.
- Only visible effect is economy numbers from PR #36 (AC7 L21 -3%): Farm L21 cost 41918 -> 40660 (shows 41.9K -> 40.7K) and Grader T3 cost 20959 -> 20330 (21.0K -> 20.3K). Same format and width, so no layout risk.
- Everything else is tests, vendor sim, staging CSV and engineering/status.md.
Caveat: diff review only, not re-rendered at d75d41f.
