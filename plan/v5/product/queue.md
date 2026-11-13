# Product team queue (owner: Head of Product) — per D-CEO-20261019-13 (c)

> **ON HOLD (D-CEO-20261024-04, 2026-10-24 14:54):** M4.2 is paused until Vadim's playtest feedback. No M4.2 specs, builds or PRs start. Capture ideas here only.
Check at the start of every turn, alongside DMs from HoP. One row per task. Update your own row when its state changes.

| ID | Task | Owner | Scope (D-CEO-11) | Cap | State |
|----|------|-------|------------------|-----|-------|
| P41-1 | L30+ farm_cost relief on (b) at the Collection-buy levels; report on gates.md card; earliest farm level at which Collection 23–28 are first bought | Economy/Balance Designer | item 1 | 13:00 scratch; 18:00 on the single harness | in progress |
| P41-2 | Re-measure the top candidates on `npm run measure:l30plus` once it's published | Economy/Balance Designer | item 1 | 18:00 | waiting on harness (13:00) |
| P41-3 | CSR spec v0.2.3 → final (Art copy CSR-9, Saves/HoE review, HoQA testability) | PM, Farm Upgrades | item 3 | before M4.1 build kickoff | in review |
| P41-4 | QE-LATE-e spec: set the flag only after a confirmed write; ACs | PM, Farm Upgrades | item 2 | with M4.1 kickoff | spec v0.3 FROZEN 10:40 (HoP D-HOP-39, HoQA GO); awaiting Saves audit; 95b5a5c push via HoE pending (product/farm/qe-late-e-spec.md) |
| P41-5 | Explainer F3/F4 follow-ups in m4a-spec, with Art & UX Minors (M41-9) | PM, Farm Upgrades | item 4 | with M4.1 kickoff | done 2026-10-19: m4a-spec v1.18 §17–§20 (F3 as built, F4, M4B-1); open questions in §20; due 17:15 before the HoQA handoff (D-HOP-29) |
| P41-6 | Workers L10 margin watch: no L0–11 change without a re-run | PM, Workers | guardrail | ongoing | standing |
| P41-7 | Next-goal diff (6809f8e) review in the L30+ pack | PM, Collection | item 1 | with L30+ pack | to do |
| P41-8 | Market/customers: no M4.1 scope; idle → ask HoP | PM, Market/Customers | — | — | 00:21 CET Nov 10: rev 15 card #T re-pin recorded (D-HOP-2026-11-10-01, gate 6804a2a4). Order-chip a11y = PR #118 @fc5fe67 → Architect review + UI QA bar → HoQA closes OC-A11Y at RC. No other Market work open; idle → ask HoP |

## M4 B reviewer findings triage (HoP 10:24, D-HOP-36). Sources: critic/review-m4b-dd223f5-2026-10-19.md, playtest/player-notes/2026-10-19-session-m4b.md
| id | finding | owner | target | status |
|---|---|---|---|---|
| RV-1 | Hitting the L30 cap feels flat: no payoff, no next goal, coins pile up | HoP / Economy | M4.1 item 1 (L30+). If L30+ is cut, write an M4.2 "L30 cap" next-goal/payoff spec | in L30+ work |
| RV-2 | Goal bubble points to Collection when Farm is seconds away; ETA and affordability labels disagree | PM Farm Upgrades | Root cause by 14:00. A label-consistency bug fits M4.1 if small; a change to the best_roi rule waits for M4.2 | root cause done 10:32 (m4b-rv-rootcause.md); A label/formatter fit check with HoE/HoQA |
| RV-3 | Workers get tired or fall asleep with no warning, and income flattens without the player noticing | PM Workers | M4.2 spec (warning or state cue + telemetry). No L0–11 change in M4.1 | draft v0.1 sent 10:40 |
| RV-4 | 'Balanced farm N/5' reads like a track count and is never explained | PM Farm Upgrades + Art & UX | Copy fix proposal by 14:00. M4.1 if it's a string-only change | root cause + 3 copy drafts done 10:32; Art picks wording; fit check HoE/HoQA |
| RV-5 | ETAs creep upward | PM Farm Upgrades | Root cause by 14:00 (rolling 60 s income vs wages/fatigue) | root cause done 10:32: 60 s window lag + fatigue, not wages; fix proposed for M4.2 |
| RV-6 | Coins drop for no visible reason | PM Market | Repro + cause by 14:00 (wages? sale variance?) and a severity call to HoQA | done 10:30: product/market/rv6-coin-drop-investigation.md (wages invisible, S3, MK-60..65 UI-only); awaiting HoP/HoQA routing |
| RV-7 | Shallow tradeoffs (both tracks bought every level) | HoP / Economy | M4.2 design question, not a bug | backlog |

## M4.1 re-plan (D-CEO-20261021-01, 2026-10-21 17:25), supersedes the Oct 19 M4.1 rows
| Item | Owner | Cap | Product state |
|---|---|---|---|
| M41-11 lock label (#54) + M41-10 build-id (#53) | HoE / UI | 19:00 Oct 21 | Spec is m4a-spec v1.24 §19. On main (track max 30) only B1-6b (test balance) and B1-7..10 apply. B1-11 (per-row L30+ offsets) and the F4 Farm unlock variant (D-HOP-42, F4-20..25) move to M4.2 with L30+. |
| M41-6 QE-LATE-e | Saves | 20:00 Oct 21 | Spec frozen at v0.3 (frozen/qe-late-e-spec.v0.3.md, c6a37023…). |
| M41-8 F3/F4 + M41-9 Art Minors (QA4-1..3) | UI | 23:00 Oct 21 | m4a-spec v1.24 §17/§18, without F4-20..25. RV-4 / RV-2b (m41-rv-acs.md) only if UI has room inside the cap. |
| M41-7 CSR v0.2.3 + CSR-AC-IDB1 | Saves | 03:00 Oct 22 | **FINAL** farm/corrupt-save-recovery-spec.m41-final.md, sha 6131c290…334d. CSR-17 is out. |
| RC / QA / Latest | HoE / HoQA | 04:00 / 08:00 / 10:00 Oct 22 | Latest only once CI is green. |
| MK-60/61 | — | — | **Stay in M4.2.** The UI engineer has no room before 23:00. |
| M4.2 carry-over | HoP | — | L30+ (#45/#50/#52, a05bc74, reshape, gates.md v1.8, D-CEO-16/18/19), M41-5 #55, CSR-17 (v0.3.4 §6), MK-60..65, RV-5 B, RV-2 B, fatigue v0.2.1 (one string open). Note for the M4.2 harness: E-G1–E-G10 run from F28 for every seed, not from each seed's divergence tick (gates.md v1.8). |

- M4.2 carry-over (owner PMFU, from HoQA on 2026-10-22): change the QEL-13 AC wording from "fresh save shows the card once" to a migrating save. By design, a brand-new farm never shows the card. QE-LATE-e passed QA at 1682a0c (qa/m41/qe-late-e-1682a0c.md).
- M4.2 carry-over (HoP, 2026-10-22): CSR: a valid IDB farm can be hidden behind an unknown IDB status when there is no LS main. M4.1 starts a fresh game with the mirror null; decide how to recover it later.
- CSR M4.2: CSR-12: the KV-throws expected screen.
- M4.2 (HoQA M-1, from #62 @09cee47): the Customer order chips `.chip.arrive[aria-label="Customer"]` fail label-in-name. This is already on main and needs a name that contains the visible digit (PM Market to spec). Also, the F4-14 strip shipped with the status inside the accessible name rather than in aria-description. QA accepted that under F4-14a; align the spec wording in M4.2.

| OPS-HOP-1 | Pre-launch player-feedback plan (D-CEO-20261028-01) → product/player-feedback-plan.md | HoP | done 07:53 Oct 28, approved D-CEO-20261028-03; DoD 5 with CEO launch-go |
| OPS-HOP-2 | Rename economy gates G1–G10 → E-G1…E-G10 in product/economy/gates.md + live refs (D-CEO-20261028-02) | Econ (HoP owner) | done 07:56 Oct 28 (Econ): gates.md renamed E-G1…E-G10 + alias line; live refs renamed; pinned/frozen/decision-history untouched; ambiguities + file list in ops-log.md; 08:01 Oct 28 (Econ, HoP ruling): M5 plan §7 set renamed M5-G1…M5-G10 (G5-P → M5-G5-P) in live docs; plan frozen as m5-interaction-plan.1abbd586.md, alias line added in §7; file list in ops-log.md; 08:03 Oct 28 (Econ, HoP ruling): plan ambiguities resolved from cited sources: L463 → M5-G0/M5-G1 (G0 = plan §7 row), L545 → E-G5 (economy §6.1 lists gates.md G1–G5); plan G0 rows L514/L625 → M5-G0; plan sha256 cd6e089a → f5e54179 |
| V5-HOP-1 | v5 economy CSV PR: commit 1 M5.0 CSV 8dc90e2b, commit 2 farm_cost r27/28/29 = 160k/175k/190k only, one PR per ci-gates, CI green, URL + head SHA to HoE (D-HOP-2026-10-29-01) | Econ (HoP owner) | DONE: merged as PR #92 (head 2d15dacdb45884bf1aabce48ea20e7571fb69d66) into rc/v5 at 3f582dbfe31a9d309e6b1d0e96a4f77711b333ec, 11:03 Oct 30. Saves QA PASS, HoQA balance PASS, HoP re-prediction sign-off D-HOP-2026-10-30-08, CI green. Econ reports Vadim's own push go at 10:35; the CEO's D-CEO-20261030-02 was not treated as his go. Open follow-up: SOURCE one-line PR (D-HOP-2026-10-30-09, Econ) |
| M4.1-P1 | Yard hen pill + sprites from hensLevel (Vadim playtest bug, app.ts:544/:550) | HoE build, HoQA verify | AC: with M4 on, at any F≠H: sprites = min(hens[H], 12); pill shown only when hens[H] > 12 and shows hens[H]; a Hens buy updates both in the same tick, a Farm buy does not; M4 off keeps the legacy S.hens(F). (Amended 15:07 per Art.) Bug fix, allowed under the M4.2 hold. |
