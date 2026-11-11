# EXP1 fix recheck — 45eb5e3755aef9bc300f8b94a39653f837c49d80 (PARTIAL, stopped 08:08 per HoQ for 246de09)
Runtime build-id m3-rc1-pre+45eb5e3 (served on port 4822). Pushed (gh/fix/m4-exp1-seen-revert, gh/rc/m4-t3-capped). Diff vs 8396ed1: tracks-explainer.ts, 1 line.
Expectation: the by-design one (no card this session, card exactly once on the next writable load, flag then saved).

| Check | chromium | firefox | webkit |
|---|---|---|---|
| Storage-blocked, real QuotaExceededError + setItem-throw, both fixtures, 360/390 | PASS 8/8 | not run | not run |
| C5b | not run | not run | not run |
| exp-blkreload | not run | not run | not run |
Evidence: exp1-fix-45eb5e3/exp-blocked-chromium.jsonl, chromium/*.png (24), entries-chromium.jsonl. No manifest.json was written because the run was stopped; entries-chromium.jsonl lists the shots.
Superseded by 246de09. Everything else carries over from 8396ed1.
