# Art sign-off: m5-unpaid-trickle-spec.md §5 UI copy (TASK HoP/R04-trickle-art)
Spec: product/workers/m5-unpaid-trickle-spec.md v1.0.1, sha1 f263f461d51f43c3586aa4025077c2d7993ce692 (verified). D-HOP-2026-11-14-11 / -10.
Verdict: **SIGNED WITH EDITS** (E1–E6 are binding for flag-on UI QA; the PMW edits the spec text). No Claude review (rule 22, N=0).

Accepted as written: keep the Unpaid banner and role copy; sub-line 12 px `--c-ink-2`, not danger; icon+text; max 1 update/s; both-unpaid cards show the same time; HUD income/s includes the trickle when flag on and rate > 0 (flag-on exception to rc1-asleep L32–L34); no coin-counter badge; flag off = zero new UI.

Edits:
- E1 String: `Trickle · resumes in ~m:ss` (replaces `Trickle · wages resume in 0:ss`). Matches the signed Unpaid caption verb "Resumes at $X"; shorter for the 360 fit. NBSP on both sides of `·`.
- E2 Time format per style-direction TM-1/TM-3: the time depends on the current rate, so it is an estimate that ticks: use the `Affordable in ~m:ss` exception: `~m:ss` below 1 h, `~h:mm:ss` from 1 h, ceil, never `~0:00` (last frame `~0:01`, then the state changes). `0:ss` is not a format; times over 59 s must read m:ss.
- E3 Icon: existing `assets/icon-coin.svg`, 12 px, `aria-hidden="true"`, before the text. No new asset.
- E4 aria: `{Role}: wage trickle on, resumes in about {m:ss}`. The countdown node is NOT aria-live (no per-second announcements); the accessible name updates silently.
- E5 Fit: must fit the meta column at 360×640 on one line, with the role's existing lines unchanged and no card height change vs the Unpaid state without trickle (no layout shift when the trickle starts/stops). If it does not fit, use static `Trickle on` (time only in the accessible name), per spec. UI QA shows 360 Firefox + Chromium flag-on with a 1:xx and a 1:xx:xx value.
- E6 HUD: with the trickle included, income/s uses the normal (non-danger) rate style and the standard 1.2K formatting; it must not pop/juice on each change (reduced motion: no animation at all). Flag off or k = 0: no DOM nodes for the sub-line (not just hidden), and HUD behaviour unchanged.
Signed: Head of Art & UX, 2026-11-14.
