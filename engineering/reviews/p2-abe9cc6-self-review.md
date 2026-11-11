# #83 self-review, delta 4eb220f..abe9cc6 (D-CEO-20261028-02) — UI eng, 2026-10-30 CET
Earlier full review: p2-4eb220f-self-review.md (m1-m6, n1-n10 still apply). Delta = 6 commits + the rc/v5 merge:
d4989fa (D-HOP-2026-10-30-02 (b), QA F2/F3), 3ecf482 (Art-c2 all Refill, QA F4), b159379 (QA F6 shots), 8be9ae7 (QA F8 nit), f883dad (docked no-jump), abe9cc6 (merge rc/v5 458f74c, clean).
No Blocker / Critical / Major.

Minor:
- m7: countdown is CSS generated content (`.nav-lbl[data-cd]::after`), not an aria-hidden span. Reason: axe 4.14 label-content-name-mismatch
  counts aria-hidden descendant text as visible; probe (scratch/ui-cooldown/axe-probe.mjs, Cr/FF/WK): "Refill" + aria-hidden "0:30" span = 1 violation,
  generated content = 0. The aria-label ("Refill, cooling down") is the name either way, so the timer is out of the name. Needs HoP/Art to accept this as
  meeting "timer kept out of the name (aria-hidden)".
- m8: docked copy changed "Ready in Ns" -> "Refill · 0:NN" (QA F2 suggested this shape). Art to confirm. Fredoka ignores tabular-nums (8be9ae7 run:
  label 64.63-69.86 px over 0:01..0:30), so the docked countdown reserves 2.65em (f883dad). Docked text contrast 4.88:1 (#5A4C42 on #CFC6BA): passes, small margin.
- m9: Art-c2 also covers the Workers-tab Refill bar (.btn.manage-all); it lost even the full-motion shake to `.btn.manage-all[aria-disabled=true]{animation:none}`
  (0,3,0, later in the file). Fixed with a (0,4,0) selector. Buy/Collect unchanged (5.1 backlog).
- m10: fmtCooldown is m:ss, so a raised manage_cooldown_s (>= 60) renders "1:15", not "0:75". Saves don't clamp manageCdS on load (pre-existing); a
  corrupt save could show a long countdown. Not changed.
Nits:
- n11: the rc0-browser S2-5 / Review #2 cooldown checks were updated to the new copy (they asserted the old "0:NN" / "Ready in Ns").
- n12: nav-compare not re-run (badge CSS unchanged since 4eb220f).
