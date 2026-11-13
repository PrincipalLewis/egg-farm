# M4.1 RV-4 + RV-2b ACs (PM Farm Upgrades, 2026-10-19 v1.0)
Decisions: D-HOP-43 (HoP 10:33), HoE fit check 10:33, HoQA conditions 10:33. Copy: art-ux/copy/m41-rv2-rv4-copy.md (Head of Art & UX, 10:50). Root causes: product/farm/m4b-rv-rootcause.md. Builder: UI (e80556fd), one small DO NOT MERGE PR per item off the integrated head, with the full SHA and a change list. QA lane: UI QA (edb6ef85).
**UI priority before 17:15 (D-HOP-43):** (1) m4a-spec v1.21 D-HOP-40 + D-HOP-42 (PR #54 follow-up / M41-8), (2) RV-4, (3) RV-2b.
**Intake (final, joint HoE + HoQA, 2026-10-19 ~10:37):** every M4.1 UI PR must be pushed by **20:00 hard**, otherwise it moves to M4.2. RV-4 and RV-2b are separate small PRs off the integrated head; UI aims to push RV-4 before 15:00. HoE gives the RV-2b go/no-go at 17:00. M41-8 F4 is also capped at 20:00. (Replaces the earlier 15:00 vs 20:00 conflict; no CEO escalation.)

## RV-4: Balance strip copy (string-only; M4.1)
Values (tier levels and %) come from data; no literals. NBSP between `L` and n, and around `→` and `·`. N/5 is removed everywhere.
*The before strings come from the templates in tracks-ui.ts:20-28/:48 as cited in m4b-rv-rootcause.md. Where a state (k = 0, aria) isn't cited there, the before string is the template filled in. UI confirms it against src in the PR change list.*

| AC | Surface (src) | Before (dd223f5) | After |
|---|---|---|---|
| RV4-1 | Strip, working toward the next tier (`tracks-ui.ts:28`) | `Balanced farm {n}/5 · next +{x}% at all ≥ {N}` (e.g. `Balanced farm 1/5 · next +15% at all ≥ 10`) | `Balance +{y}% · all 3 at L{N} → +{x}%` (e.g. tier 1: `Balance +10% · all 3 at L10 → +15%`, 34) |
| RV4-2 | Strip, k = 0 | `Balanced farm 0/5 · next +{x}% at all ≥ {N}` | `Balance bonus · all 3 at L{N} → +{x}%` (`Balance bonus · all 3 at L5 → +10%`, 34) |
| RV4-3 | Strip, top tier | `Balanced farm 5/5 · +{y}%` | `Balance bonus +{y}% (max)` (`Balance bonus +30% (max)`, 24) |
| RV4-4 | Toast on tier-up (`tracks-ui.ts:48`) | `Balanced farm {k}/5: +{x}% income` | `Balance bonus now +{x}% income` (`Balance bonus now +15% income`, 29) |
| RV4-5 | Strip aria (`tracks-ui.ts:20-26`) | `Balanced farm {n} of 5. Weakest: {track}, level {L}.` | `Balance bonus: plus {y} percent income. Get Farm, Hens and Egg value all to level {N} for plus {x} percent. Weakest: {track}, level {L}.` (k = 0: drop the first sentence; top tier: `Balance bonus: plus {y} percent income, the maximum.`) |
| RV4-6 | Toast aria | n/a or same as visible | Same as visible with "percent" spelled out: `Balance bonus now plus 15 percent income` |
| RV4-7 | Layout | — | One line at 360/375/390 px in Chromium, Firefox and WebKit for the worst case `Balance +25% · all 3 at L25 → +30%` (34) and every tier; no wrap, no clipping (UI/Visual Designer measures; HoQA (3)). |
| RV4-8 | No leftovers | — | `rg "Balanced farm" src` = 0; m4a-tracks-ui.test.ts updated to the new strings; no logic, tier or % change (the bonus maths is byte-identical). |
Spec touch: M4A-19 (strip), M4A-12 (toast), M4A-21 (text alternative); art-ux/m4-tracks-copy.md §2 is superseded by this copy.

## RV-2b: Goal bubble status wording (string-only; M4.1 only if UI is ahead at the 17:00 cap check)
Per D-HOP-43, M4.1 is **the bubble label only**. The shared ETA formatter (Art RV-2a: `fmtTimeToAfford` everywhere, `fmtAffordableIn` and "Affordable in a moment" retired), the wait rule, the zero-gain filter and live moods are **M4.2**. The bubble already uses `fmtTimeToAfford` (`format.ts:30-38`), so RV-2b changes no number formatting.
| AC | Requirement |
|---|---|
| RV2-1 | Bubble target affordable: `{F4 label} · Buy now` (replaces `{label} \| Ready!`). Example: `Collection L11: +5/tap · Buy now`. The word "Ready!" never appears in the bubble. |
| RV2-2 | Bubble target not affordable: `{F4 label} · {eta}` with the existing `fmtTimeToAfford` output (e.g. `Farm L15 · ~21 s`); the separator changes from ` \| ` to NBSP·NBSP. |
| RV2-3 | The status suffix is outside the F4 label's 27-char budget and is never truncated (F4 truncation still applies to the label part only). One line at 360/375/390 px in 3 engines for the worst case: the longest F4 label (27) + ` · Buy now` and + ` · ~h h mm m`. |
| RV2-4 | Aria: `Next goal: {F4 aria target}. You can buy it now.` / `… Ready in about {n} seconds.` (minutes and hours spelled out the same way). |
| RV2-5 | No logic change: same pick, same `GoalHold(2)` and 1 Hz refresh, same ETA value; snapshot of pick sequences byte-identical on the AC7 bot run. |
| RV2-6 (regression, HoQA) | For the same goal, the bubble ETA and the highlighted Farm card's `Ready in` ETA show the same number when both target the same row; income ≤ 0 shows `—` (if today's formatter doesn't, log it for M4.2, not an RV-2b fail); a non-affordable target never reads `Buy now` or "in a moment" in the bubble. |
| RV2-7 (regression, known M4.2) | "ETA counts down with the clock" is checked as a regression case (Player saw drift on 246de09). **A failure is logged as known issue KI-RV5, not an RV-2b fail.** RV-2b does not claim to fix the drift: the cause is the 60 s gross window lagging fatigue and bursts (RV-5, M4.2). |
**HoQA (4) vs D-HOP-43:** HoQA asked that the shared formatter use the #56 number rules. D-HOP-43 moves the shared formatter to M4.2, so M4.1 has only one formatter in the bubble (unchanged), and there is no second formatter to test. The #56 rules apply when RV-2a lands in M4.2.

## M4.1 known issues
- **KI-RV5: ETA uses a 60 s gross window** (D-HOP-43). Every ETA divides by rolling 60 s gross sales (`format.ts:40-48`); wages are excluded (≤ 0.21% of income) and the window lags income drops when workers turn Tired, and after burst sales, so ETAs can creep up or lag the clock. Fix in M4.2: a 5 s realized-net window (port 74512ea) plus EtaHold (`income.ts:106`).
- **KI-AIM: 'Affordable in a moment' while ~$14K short** (Critic). Not reproduced; suspected burst sale inflating the 60 s rate. Open; UI QA captures a coins and 60 s rate log on recurrence.
