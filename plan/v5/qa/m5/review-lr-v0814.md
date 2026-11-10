# QA review: lighter-refill v0.8.14 (QA-D-1105-LR1) — PASS, pin c4c1a5cd
2026-11-05 20:27 CET. Reviewer: Head of QA.

## Verification performed (files read directly, not PMW's word)
- `product/workers/m5.1-lighter-refill-proposal.c4c1a5cd.md` sha1 = c4c1a5cd088d4bea386cbc0b115323062f05ba61. Matches PMW's claim. Live `m5.1-lighter-refill-proposal.md` has the same sha1.
- Previous version `m5.1-lighter-refill-proposal.13577395.md` sha1 = 1357739592e632eacb0c10339505c9dd23bf79df. Matches the v0.8.13 sha PMW cites.
- `diff 13577395 c4c1a5cd`: changes are the title line (v0.8.13 → v0.8.14), the version-history line (one new v0.8.14 entry added, the rest byte-identical), and five appended changelog lines at L107–111. **No spec body, AC, number, rule, flag or bar changed.** PMW's "changelog only, body = v0.8.13" claim is verified true.
- The appended changelog names exactly the three changes UIQA's drift diff 19ef975f found against old gate pin f71e4516: (1) §6 rewrite (v0.8.12), (2) `refill` → `refill_used` in AC bodies (v0.8.11), (3) FZ-3 re-cite to errata rev 7 fd7d5921 (v0.8.13).

## Ruling
1. **Pin lighter-refill to v0.8.14 c4c1a5cd.** Supersedes the DRIFT-DEFERRED pin f71e4516 and the unreviewed 13577395. UIQA may re-pin under QA-D-1105-RR4 + this review.
2. **Naming confirmed:** `refill_used` is the telemetry event name only, never an AC id. AC ids remain AC-LR1…LR21 (LR6 withdrawn). No collision with the telemetry field name; the shared word in AC prose is intentional and acceptable.
3. **No re-test needed** beyond the re-pin: no AC text changed between 13577395 and c4c1a5cd, so existing LR case text stands. Cases written against f71e4516 must use the event name `refill_used` (already the case in UIQA's autorefill suite, 10/10 green).
4. PMW's own gate cite (product/m5-gate-acs.md L364) already points at c4c1a5cd (D-PMW-2026-11-05-02). No edit needed from QA on that line.
