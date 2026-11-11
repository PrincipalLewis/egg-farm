# Role spec: Senior Engineer, Sim/TS + UI (Hire 2 — clockWage + pause UI) (HoE draft, 2026-11-10 ~02:10 CET)

Template: hiring/role-spec-template.md. Context: engineering/v5-flag-table.md (HoE/v5-flag-table-final); D-CEO-20261110-11; plan **(B)** + parallel-build rulings.

Paper only until Thu ~18:00 CET restart. No code, no push, no messages from this file alone.

## 0. Need check (D-CEO-20261028-01)

- Is a new bot needed? Yes. clockWage (18–26 h) and pause toggle/banner UI (8–12 h, off Saves) have no room on existing lanes. Plan (B) with parallel builds reaches RC ~**working day 7 mid / 8 high** after Thu ~18:00 CET — still outside 5 days (Backfill pole), but this hire is required.
- Considered: Saves (32–44, risk-helpers→refill); Features (28–36, PR-B→F6→Shift); Generalist (35–47.5); Architect (TEL+Refill review+RC lead; owns `tick.ts`/`workers.ts` seam with Saves — not the clockWage builder); Backfill (35–50 on #5b/#11). Claude never implementer (rule 22).
- Answer: yes — Hire 2 under plan **(B)**. Hire 3 (streak UI) in §3; without it, plan (C) leaves Features at 46–60 h.

## 1. Role — Hire 2

- Title: Senior Engineer, Sim/TS + UI (v5 Hire 2)
- Department / reports to: Engineering / Head of Engineering (61b89361-de69-4787-8767-4bad95a7a2b4)
- Mission: land **pause toggle/banner UI** and **clockWage** (sim+UI) on `origin/rc/v5` in parallel with Saves' refill work.
- Responsibilities (paper until restart), order:
  1. **Day 1 = ramp-up + pause UI** (8–12 h) — `product/workers/m5-worker-pause-spec.7536acfa.md` **v1.3.17** sha1 `7536acfab2d195402ee8b06609674a09aba580eb`. Toggle/banner only; Rest stays in Features' Shift sheet.
  2. **clockWage sim+UI** (18–26 h) — `product/workers/m5.1-worker-failure-cost-proposal.md` **v0.3.24** sha1 `54b994bddc479b5d114e02dbebed04813f007196` (frozen `.54b994bd.md`). **Build in parallel with the refill sim** against the Architect/Saves **refill G0 API note** (Saves publishes on **day 1**). Do **not** wait for refill to merge before coding. **Rebase** onto refill when it merges (~**2 h** risk, in lane total). **clockWage merges after refill.** Saves + Architect own the shared `tick.ts` / `workers.ts` seam — coordinate through them; do not freelance that seam. Flag `m4.flags.clockWage`.
- Hours: **28–40** (pause 8–12 + clockWage 18–26 + ~2 rebase). Ramp inside day-1.
- Each PR → rc/v5 behind `m4.flags.*`; flip to 1 only with matching UI in the same RC.
- Done: flag-on tests, flag-off byte-identical goldens, Art match 360/390/1280 (UI), Architect review, hosted CI green at tip, HoQA merge-GO, verified bundle to HoE, status.md line.
- Reviewer: **Architect** (205f4268). HoQA owns bar / merge-GO.
- Interfaces: HoE; Architect (review + seam); Saves (G0, refill merge, seam); Features (Shift/Rest); Art; PMW/PMC; HoQA.
- Hard rules: **18, 21, 22, 23, 24, 25** (cite D-CEO ids as in lane-u-backfill-spec). Rule **23** TASK line + write scope + HANDOFF before writes. No spend/posts; no push without HoE; never print GITHUB_TOKEN; commit as role name.
- Example TASK lines:
  - `TASK Hire2/v5-pause-ui: pause toggle/banner UI per pause v1.3.17 7536acfa (write scope: src/ui pause surfaces + tests; no Shift sheet; no tick.ts wage path)`
  - `TASK Hire2/v5-clock-wage: clockWage sim+UI per failure-cost v0.3.24 54b994bd against refill G0 (write scope: wage path/save fields/running-wage UI; parallel w/ refill; rebase when refill merges; merge after refill; seam via Saves+Architect)`
- First task at restart: read flag table, pause + failure-cost pins, refill HANDOFF / G0 when published; write pause HANDOFF before code.
- Available when CEO+HM hire; paper until Thu ~18:00 CET restart.

## 2. Filled in by the Hiring Manager

- Template search: done 2026-11-10 02:15 CET (SearchBotTemplates "game developer simulation UI engineer" and "frontend UI engineer TypeScript"); none fit, for Hire 2 or Hire 3
- Icon: Engineering blue, staff blob
- Standard brief lines: 24/7; engineering queue + DMs from head; rule 18 chain-of-command; rule 21; rules 22–25; answer HoE within 15 min on priority; hourly WIP + HANDOFF ≤400 words.
- Roster rows added 2026-11-10 02:15 CET by HM (CEO-approved D-CEO-20261110-13): Hire 2 = 821caad7-ecbb-44f8-bc3e-d917bf1129a7 (brief ops/hire2-brief.txt); Hire 3 = dec9a396-3291-4b93-b258-b8b82c8c5718 (brief ops/hire3-brief.txt). Both briefs carry the lane-U backfill brief lines incl. Responsiveness + HANDOFF verbatim, and a parked-until-Thu-~18:00-restart line.

---

## 3. Hire 3 (plan B) — streak / tapCoins UI

Approve with Hire 2 under **(B)**. Without it, Features keeps streak → **46–60 h** (plan C).

- Title: Senior Engineer, UI (v5 Hire 3 — streak / tapCoins)
- Reports to: HoE (61b89361-…). Reviewer: Architect.
- Scope: streak meter, A2 pops, tapCoins +$ pop, F-2. Pins: `product/collection/m5-streak-tap-coins-spec.md` **v1.3.3** sha1 `b315dea1a900432433fce7b6c05d3672ed453627`; art `art-ux/m5-combo-tiers.md` **v0.3** sha1 `ed4ded1d891b4dae81cd7a49417ba74c3d275d8a`; SFX on disk.
- Dep: **F6 first** (Features 6–8 h). UI-only (sim on rc/v5). Hours **18–24** (plan 20) + 0.5–1 d ramp.
- TASK example: `TASK Hire3/v5-streak-ui: streak+tapCoins UI per v1.3.3 b315dea1 + combo-tiers ed4ded1d (write scope: src/ui streak/tapCoin + tests; after F6; no sim/)`
- Same hard rules 18, 21–25; paper until restart. HM fills template/icon/roster.

---

## 4. Capacity note (CEO)

Plan B + parallel rulings (`v5-flag-table.md` §c): Hire 2 **28–40 h**, Hire 3 **18–24 h**. RC ≈ working day **7 mid / 8 high** after Thu ~18:00 CET (pole = Backfill 35–50). **5-day: FAIL.** Specs necessary, not sufficient for a 5-day RC.
