# Caption precedence on shipped Latest 30b29d3: "Rested, refill below T%" vs "Ready in Ns"

2026-10-24 23:15 CEST · HoQA · [QA-D-1024-CAPPREC]
Build: tag m4.1-p1-30b29d3, commit 30b29d3f60d7eeae5b78feb3ec5c1fcbcf9a1134, asset egg-farm.html 547,466 B, sha256 dd919d616fe0138a89c362b1db269458558a0a2c85827b3e4fc104d36b22979b (re-verified; build-id meta m4.1+30b29d3).
Question (PMW for HoP, rc1 Addendum 2 / v1.0.12 sha1 13c0a127): when a worker is both above T% (Rested) and the shared Refill cooldown is running, which caption does the shipped build show?

## Verdict: energy reason wins. Matches HoP's ruling; the rc1 v1.0.12 L90 change is wording only, no patch bug.

## Code at 30b29d3 (git show 30b29d3f:…)
- `src/ui/workers-ui.ts:59-60`:
  `export const manageCaption = (w, cdS, b) => !needsPrompt(w, b) ? \`Rested, refill below ${Math.round(b.workers.energy.manage_prompt_threshold * 100)}%\` : cdS > 0 ? \`Ready in ${Math.ceil(cdS)}s\` : '';`
  So "Rested" is checked first and returns whatever the cooldown is. "Ready in" shows only when the worker is at or below T and the cooldown is running.
- `src/ui/workers-ui.ts:22` `needsPrompt = canManageWorker`; `src/sim/workers.ts:20` `canManageWorker = !!w && w.energy <= manage_prompt_threshold * 100` (raw energy, so exactly 50.0 counts as "needs", which gives "Ready in" on cooldown, as AC-R8 says).
- `src/ui/workers-ui.ts:104-105` the card calls `manageCaption(w, Math.ceil(s.manageCdS), b)` for every hired worker.
- Shipping data `src/config/balance.json`: manage_prompt_threshold 0.5 (T = 50), manage_cooldown_s 30, drain_s_per_pct 9.
- Stale comment, cosmetic only: `workers-ui.ts:58` says "Ready in Ns during the shared cooldown, else Rested…", which is the old (wrong) L90 order. The code does the opposite. Suggest fixing the comment when the P2b Unpaid caption lands. Not a bug.
- Existing tests at 30b29d3 already pin this: `tests/m41-p1-asleep-signal.test.ts:163-169` ("energy reason wins when both": `manageCaption({energy:90},7)` returns "Rested, refill below 50%" and `{energy:10},7` returns "Ready in 7s") and `tests/m41-p1-acr8-coop-copy.test.ts:27`. Re-run in the clean 30b29d3 worktree (/workspace/wt-m41-p1): 2 files, 35/35 pass (`capprec-30b29d3/vitest.txt`).

## Empirical: shipped asset, headless Chromium 156.0.8078.47, 390×844
Evidence: `qa/m41/capprec-30b29d3/` (run.mjs, result.json, before-refill.png, after-refill-cooldown.png, after-cooldown-ended.png, asset-sha256.txt). It serves a byte copy of the published asset (sha256 verified). It is seeded with a v6 save (valid FNV sum) built on the patch-1 migration save, with coins at $10M so nobody goes Unpaid: MH 40%, CH 90%, Hawker 20%, manageCdS 0. Then a **real tap** on Market Hand's per-worker Refill in Upgrades > Workers. 0 page errors.

| Moment | Market Hand | Coop Hand | Hawker |
|---|---|---|---|
| Before Refill (no cooldown) | 40%: no caption, enabled | 90%: "Rested, refill below 50%" | 20%: no caption, enabled |
| +0.7 s after Refill (cooldown 30 s) | 100%: **"Rested, refill below 50%"** (is-cooldown, ring) | 90%: **"Rested, refill below 50%"** (is-cooldown) | 20%: "Ready in 30s" |
| +6 s | 100%: **"Rested, refill below 50%"** | 90%: **"Rested, refill below 50%"** | "Ready in 25s" |
| +33 s (cooldown over) | 97%: "Rested, refill below 50%" | 87%: "Rested, refill below 50%" | no caption, enabled |

During the cooldown both Rested workers keep the energy caption and never show "Ready in". aria-describedby points at the Rested caption, and the button is aria-disabled with is-cooldown. The control at or below T shows "Ready in Ns" and counts down.

## Reachability: common in normal play, not an edge case
- The shared cooldown starts only through a Refill (`src/sim/actions.ts:76-78` manage, `:80-86` manageAll). Each sets the refilled worker(s) to 100% and `manageCdS = 30`.
- So **right after every Refill, the refilled worker is Rested AND on cooldown**. At 9 s per % it takes about 450 s to fall back to 50%, far longer than the 30 s cooldown. Any other hired worker above 50% is in the same state too.
- Every Refill therefore hits the "both" case for all 30 s of the cooldown. Shipped behaviour there is "Rested, refill below 50%", which matches the ruling.

## Unpaid tier (outside this question, already tracked)
HoP's order starts with "Unpaid >". 30b29d3 has **no** Unpaid branch in `manageCaption`. An Unpaid worker shows the energy-based caption ("Rested…" or "Ready in Ns"), with the "Unpaid ⚠" pill and banner on the card. This is the known v1.0.10 "Resumes at $X" work (AC-R10–R16), not yet built, already queued as **P2b** for the next patch SHA. No new item.

## Conclusion
**Matches HoP ruling (wording-only rc1 change).** No patch bug and no HoE ticket. The only follow-up is optional: fix the stale comment at workers-ui.ts:58 with P2b. The P2b run on the next SHA should re-assert Unpaid > Rested > Ready in > none, including Unpaid + above T + cooldown (AC-R10/R12).
