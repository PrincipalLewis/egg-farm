# Architect restack addendum · PR #110 F5 pacing harness · `35b187c` · 2026-11-05 22:53 CET (Europe/Belgrade)

**Prior:** `engineering/reviews/f5-62598c7-architect.md` — **PASS** scoped harness/G0; **G1 DEPENDENCY-BLOCKED**; m1 old-base / m2 manifest row 33 open.  
**Requested exact:** `35b187cdd56c5428c22069675cd32f9306415602` restack onto `844f8e15…` · exact 5 harness files.  
**Live headOid / `origin/feat/v5-f5-pacing` / `refs/pull/110/head`:** `35b187cdd56c5428c22069675cd32f9306415602` — **MATCH**  
**Merge parents:** `62598c7b0b21ef04b13dbc4ad1b8b04109de37a0` + `844f8e15774daeb1c0a855cb69b1fabd2f0ab820`  
**PR baseOid:** `rc/v5` `844f8e15774daeb1c0a855cb69b1fabd2f0ab820` — **MATCH** (restack target)  
**PR:** https://github.com/PrincipalLewis/egg-farm/pull/110 (**Draft**, mergeStateStatus CLEAN)  
**Writes:** this addendum + `engineering/status.md` only. **No Ready / post / push / merge / messages / code.** No automatic carry of Ready approval.

---

## Delta verdict

| Layer | Verdict | Meaning |
|---|---|---|
| **Restack / patch identity** | **PASS** | Merge-forward onto exact `844f8e15`; harness patch byte-identical to `62598c7`; no hidden runtime/config/workflow delta. |
| **G0 (this unit)** | **PASS (scoped)** — carries | Never-tap / flags-0 foundation unchanged (identical blobs). **Not** full ship-stack G0/AC7. |
| **G1 (this unit)** | **DEPENDENCY-BLOCKED** — carries | Hooks + sampled windows status still always `DEPENDENCY-BLOCKED`; Wave A / catch/pop/calls / continuous windows still open. **Not** full-stack G1 PASS. |
| **PR / review unit 1 overall** | **PASS** (delta) | Prior PASS + Minors stand with **m1 closed** by this restack; **m2 still open**. |

**Ready recommendation:** **CONDITIONAL YES for harness merge** after **hosted gate SUCCESS** + **HoQA exact-head** — **not** clearance that manifest **row 33 F5 full-stack G0/G1** is closed. Prior Ready wording does **not** auto-approve undraft/merge at this tip.

---

## Identity / scope verification

- Commit: merge `Merge branch 'rc/v5' into feat/v5-f5-pacing` (AuthorDate 2026-11-05 22:48:45 +0100). HoE/features-110-restack merge-forward; Draft kept.
- `git range-diff 30df38c0..62598c7 844f8e15..35b187c` → `1: 62598c7 = 1: 62598c7` (identical patch).
- `git diff 844f8e15..35b187c --stat` = **exact 5 files**, +307/−4:
  - `engineering/f5-active-pacing.md`
  - `tests/bot-m5-active.slow.test.ts`
  - `tests/bot-m5-active.test.ts`
  - `tests/bot-m5-active.ts`
  - `tests/bot-m5.ts`
- Blob identity vs `62598c7` (all **same=YES**):  
  `f5-active-pacing.md` `4e3c47ab…` · `bot-m5-active.ts` `4bb03322…` · `bot-m5-active.test.ts` `a0ea2675…` · `bot-m5-active.slow.test.ts` `158464e0…` · `bot-m5.ts` `075a0f42…`
- `git diff 844f8e15..35b187c -- src/ config/ data/ .github/ package.json package-lock.json vite.config.ts vitest*.ts tsconfig.json` → **empty** (no hidden runtime/config/workflow changes in the harness delta).
- Shipping `m4.flags.*` at tip: **all 0** (read this turn).
- Artifact `artifacts/v5-f5-restack-35b187c/`: `new-head.sha` = `35b187c…`, `rcv5.sha` = `844f8e15…`, `files.txt` = same 5 paths, author `gates.tsv` tsc/vitest-f5-unit exit 0. NOTE.md: harness-only; G1 DEPENDENCY-BLOCKED; row 33 open; Draft kept.

---

## Minors (updated)

| ID | Note |
|---|---|
| **m1** | **CLOSED** by this restack — PR base and merge parent2 are live `rc/v5` `844f8e15`. |
| **m2** | Manifest row 33 / sizing F5 full-stack G0/G1 remain **OPEN**; tip is harness foundation only. |

No new Majors. No new content blockers vs prior note.

---

## Independent Architect evidence (this tip)

- WT: `/workspace/wt-review-110-35b187c` @ detached `35b187c`  
- Node **v20.19.2** · flock (`.vitest-eng.lock`) · `nice -n 10` · focused only  
- `tsc --noEmit` **exit 0** (LOCK_ACQUIRED 2026-11-05T22:51:55+01:00)  
- Vitest: `tests/bot-m5-active.test.ts` (11) + `tests/bot-m5.test.ts` (24) → **35/35 pass**, `vitest_exit:0`, wrapper 0 (~42 s)  
- Slow 900-window / full suite: **not repeated** (patch-identical to prior; author SUMS + prior note stand for G0 evidence)  
- Hosted CI (read-only): Draft → checks **SKIPPING** (gate / pacing-x1 / release-globals / k10 monitor). **Not** SUCCESS evidence.

Logs: `scratch/architect/review110-35b187c/`

---

## Remaining QA / hosted requirements (not closed)

1. Undraft only when HoE wants harness Ready path; **hosted gate SUCCESS** at exact `35b187c` (Node20 + expected X1 pattern).  
2. **HoQA exact-head** ACK at `35b187c` (Architect does not substitute).  
3. Integrate reviewed Wave A APIs (income-ref/tapCoins, golden catch, Broody pop, `fireAbility`) — no overlays — then re-run full G0/AC7/AC-SC9 and continuous G1 + hold-for-Frenzy + Economy cross-check + flags-on X1 (O-3).  
4. Manifest **row 33** stays open until that full-stack bar closes.  
5. Further `rc/v5` advancement past `844f8e15` requires another exact-head restack recheck (no auto-carry).

## Process

No Ready/approval card, PR comment, push, merge, undraft, or implementation edits performed. Prior `62598c7` PASS is **delta-carried for harness content only**; merge clearance remains HoE/HoQA.
