
## 2026-10-16 — rc1-pt1 (2490c79) pass 1
6 confirmed: 3 Major (Grader multiplier missing from the sell popup and Sell all label; missing savedAt grants the full 2 h offline), 3 Minor (1000K/1000M rounding; ghost killed early; merged floater cut short). 2 unverified. Details: qa/claude-qa/rc1-pt1-pass1.md

## 2026-10-16 — save-durability (2959ba0) pass 2
5 bugs: 3 Major (savedAt 0/negative pays the full 2 h; a live older tab overwrites a newer save; a missing main save ignores .bak and then overwrites it), 2 Minor (Reset leaves .bak; null/string savedAt goes down the corrupt path). Newer-save refusal for LS, IDB-only and .bak-only: PASS. Browser-verified at 390px and desktop. 1 Claude call. Details: qa/claude-qa/save-durability-2959ba0.md

## 2026-10-16 — save-durability v3 (4a25d0d) pass 3
Retest: BUG-1/2/3/4 fixed; BUG-5 null fixed, string unchanged (outside the 15:15 rules). New: 2 Major (a future-savedAt stale LS copy beats and overwrites a newer IDB copy; a single tab locked out with "Game open in another tab" under localStorage quota, desktop only), 2 Minor (missing main + bad .bak gives a silent fresh farm; one stray LS write when a newer save appears in IDB only). Browser-verified at 390px and desktop. 1 Claude call (wasted: the wrapper add-dir doesn't cover /tmp/egg-claude-qa-v3). Details: qa/claude-qa/save-durability-4a25d0d.md

## 2026-10-16 — rc1-qa-bugs-v4 (7d52952)
4 bugs: 1 Major (order card line clipped with no ellipsis at 320px for B/T values, and at every width for 1000000T), 3 Minor (13K vs $12.9K rounding mismatch; no tier above T; ?marketSeed honored in release). PASS: tutorial Sell flow at 320/360/390/1280, Sell labels never clipped, release globals only eggfarmExportTelemetry even with debug params. 1 Claude call. Details: qa/claude-qa/rc1-qa-bugs-v4-7d52952.md

## 2026-10-19 — M4 B release m4b-dd223f5 (build-id m3-rc1-pre+246de09)
New: M4B-1 Major (migrated save: Egg value "Needs Farm L(F+1)" is wrong and keeps moving up), M4B-2 Cosmetic ("L30 → L30" at F27-29). Retest: QA4-4 and DD-1 FIXED; QA4-1/2/3 still broken. PASS: explainer once on pre-M4 saves and never on new saves (Chromium/Firefox/WebKit), farm L30 cap, best-payback highlight, save/reload. 1 Claude call. Details: qa/reviews/m4b/claude-qa.md
