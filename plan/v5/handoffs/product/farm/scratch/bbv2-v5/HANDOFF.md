# HANDOFF — BBv2 v5 gate-ready

TASK PMFU/D-HOP-2026-10-30-47: make BBv2 (m4.flags.bestBuyV2) gate-ready for v5, i.e. a v5 spec, the stopgap interaction rule, a gate card, and drafted outbound asks.

Owner: PM Farm Upgrades (PMFU). Helper started 2026-10-30 13:53 CET.

## Write scope (only these)
- /workspace/egg-farm-studio/product/farm/ (the spec, scratch/bbv2-v5/, frozen/)
- PMFU's own BBv2 card section inside /workspace/egg-farm-studio/product/m5-gate-acs.md — one targeted insertion (freeze to product/scratch/m5-gate-acs.<first8>.md first, diff check)
- append-only lines in product/decisions.md and product/status.md
Nothing else. No code, git, PRs, other departments' folders. Long processes only via ops/tools/lane-run.sh (rule 21). ≤2 sims studio-wide, serial, only if needed.
Restart guard (standing rule 23, org-plan.md): on restart re-read this file before any write; stop and report on task/owner/scope mismatch.

## Progress
- [x] 1 v1.0 spec — v0.3 frozen at frozen/m5.1-bestbuy-rebaseline-proposal.v0.3.f128f1e6.md; v1.0 sha1 df9dc86f0358ef8e9a1819c7755643d01da91d73 (14:0x CET; includes §6 D-HOP-48 rule)
- [x] 2 stopgap rule (D-HOP-48) in v1.0 §6; bb-stopgap v1.2.5 frozen at frozen/bb-stopgap-spec.v1.2.5.md; v1.2.6 sha1 fdc1c199f9b520fd55969aecc7a63173ba54b7dd
- [x] 3 Card #12 appended to product/m5-gate-acs.md (pre-edit 1d68e515 frozen at product/scratch/m5-gate-acs.1d68e515.md; after ce79b5b6add821f489b08bcf6ebcb21bba6c171b; diff = +39 lines, 0 removed)
- [x] 4 outbound drafts in scratch/bbv2-v5/outbound.md (not sent); numbers package scratch/bbv2-v5/bbv2-rebaseline-numbers.md (CAND-CSV-SHA: TBD)
- [x] 5 fit check (end of outbound.md): paper gate-ready by Sat 18:00 yes; numbers after Econ 18:00 CSV
- [x] log lines decisions.md (D-PMFU-2026-10-30-BB1..BB5) / status.md (5 lines). DONE; report to parent.

## Follow-up (D-HOP-2026-10-30-49, ~14:10 CET; in-card edit of Card #12 authorised by the lead)
- [x] Q-BB-H1 RESOLVED (D-HOP-49 H1): BB-AC2 = ★ on a meaningful row (positive gain or exempt), as SG-1.
- [x] Q-BB-H2 RESOLVED (D-HOP-49 H2): G4 P95 ≤180 blocks on final all-flags-on RC; L10 window / L18 sanity / L30 band report-only; -09 bars + ±10% total binding.
- [x] Q-BB-H3 RESOLVED by D-HOP-2026-10-30-50: ±10% binds on flags-off only; all-flags-on L10→L30 shift is report-only and is reported with the Sun harness.
- [x] Spec v1.0.1 sha1 5dc9596bffd274eb3eb7d7a32925eaf6b51527c9 (frozen frozen/m5.1-bestbuy-rebaseline-proposal.v1.0.1.5dc9596b.md; v1.0 df9dc86f frozen). Includes Q-E2 confirmed, Art sign 14:05, telemetry rev 9 types, HoE sizing/goldens.
- [x] Card #12 in-card edit: m5-gate-acs.md 53c0b5c2 (frozen product/scratch/m5-gate-acs.53c0b5c2.md) -> ff02c1e1; diff inside Card #12 only.
- [x] Numbers package + outbound (sent 14:03 note) updated; log lines appended.
