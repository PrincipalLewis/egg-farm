# M4.1-P1 follow-up patch: test plan (rc1-asleep v1.0.9–v1.0.11 additions)
Spec: product/workers/rc1-asleep-state-spec.md **v1.0.10, sha1 eae29f976abd647966a00a83c3c8b6137ecf844f** (wording-only re-hash of d52da22: line 44 now cites D-HOP-17, 19:0x CEST) (verified 18:5x CEST 2026-10-24; supersedes v1.0.9 dff063e). Provenance: D-HOP-2026-10-24-32 (Unpaid Refill caption bug).
Scope: **NOT in PR #70 @ 30b29d3** (built on v1.0.7, AC-R1–R9). Applies to the next patch SHA that implements v1.0.10. Queue row: qa/queue.md P1.

## v1.0.9 AC trace
| Case | AC | Steps | Expected | Engines / viewports | Auto? |
|---|---|---|---|---|---|
| TP1-R2a-1 | R2a | Hire MH; force MH Asleep, then Unpaid; variants with/without Hawker and with manual sells in window. Harness: step 10 ticks (tickHz 10), then render() | `#rate` aria-label ends ", sales stopped"; visible HUD text unchanged. "No other income" = incomePerSec formula (income.ts) | unit harness + Cr/FF/WK, 390 | Yes |
| TP1-R2a-2 | R2a | Only CH Asleep; MH Working; MH Paused (when Pause ships); step 10 ticks + render each | aria never contains "sales stopped" | Cr/FF/WK, 390 | Yes |
| TP1-R10 | R10 | MH, F10, Unpaid, energy 70, coins $1.00 | Caption exactly "Resumes at $2.50" (not "Rested…"); Refill aria-disabled=true; name "Refill Market Hand"; describedby text exact per spec | Cr/FF/WK, 390 | Yes |
| TP1-R11 | R11 | As R10, energy 30, cooldown 0; tap Refill | Caption "Resumes at $2.50"; aria-disabled; no `worker_manage` event | Cr/FF/WK, 390 | Yes |
| TP1-R12 | R12 | As R10, energy 30, manageCdS 20 | Caption "Resumes at $2.50", not "Ready in 20s" | Cr, 390 | Yes |
| TP1-R13 | R13 | From R10 set coins $2.50 | ≤1 tick `worker_state{state:"working"}`; coins unchanged; caption "Rested, refill below 50%" | Cr + unit | Yes |
| TP1-R14 | R14 | F10: MH working/CH Unpaid; both Unpaid; coins $5.00 | CH X=$7.50; MH X=$2.50, CH $7.50; at $5.00 only MH resumes | unit + Cr | Yes |
| TP1-R15 | R15 | 3 workers, CH Unpaid 30%, MH Tired 30% | Manage-all count 1, aria "Refill 1 tired worker"; sim trace of patch SHA under test byte-identical with vs without Unpaid UI changes reverted (no old build as baseline) | unit (trace diff) + Cr/FF/WK 390 | Yes |
| TP1-R16 | R16 | Force captions "Resumes at" $5.00 / $999.9K / $1M (X=99,995,000¢) / $1.23M / $9,999.99 | One line, no ellipsis, scrollWidth ≤ clientWidth, 128 px card. **Margin note:** widest is $9,999.99 = 122.0 px (fontTools, Nunito 400 12px) → only 6 px slack; any font/padding/letter-spacing change re-runs R16 | Cr/FF/WK × 360/390/1280 (45 checks) | Yes + Art screenshot review |
| TP1-U1 | v1.0.10 §1 | Worker Unpaid with energy 0 (both conditions) | Unpaid wins: caption "Resumes at $X", pill state word exactly "Unpaid" + SVG warn icon, no U+26A0 (UI-M5-1/UI-WARN gate, p2-scope item 1; QA-D-1029-V5U Q1), Unpaid banner + describedby, no yawn | Cr/FF/WK, 390 | Yes |
| TP1-U2 | v1.0.10 §1 | Unpaid, energy 0 (≤ T); tap Refill | Refill aria-disabled=true; no `worker_manage` event | Cr, 390 + unit | Yes |
| TP1-U3 | v1.0.10 §1 | From U1, set coins ≥ X; step 1 tick | Resumes → mood asleep: Asleep banner, normal Refill enabled; resume reserve skips it (energy>0 rule) | unit + Cr | Yes |
| TP1-C1 | D-HOP-17 | Hired MH Asleep, then Unpaid | Banner exactly "Market Hand asleep: sales stopped" / "Market Hand unpaid: sales stopped"; never "auto-selling" or "slowed" | Cr/FF/WK, 390 (+360 short "Unpaid: sales stopped") | Yes |
| TP1-C2 | D-HOP-17 | MH goes Asleep/Unpaid while app open (toast); and while offline, then reopen (welcome-back) | Toast and welcome-back line use "auto-selling stopped"; banner does not | Cr, 390 | Yes |

fmtMoney check @ 30b29d3 (src/ui/format.ts, input = cents): 500→$5.00, 99,990,000→$999.9K, 99,995,000→$1M, 123,000,000→$1.23M, 999,999→$9,999.99 — matches spec.

## Ambiguities — all CLOSED by v1.0.10 (d52da22), verified in spec text
1. Provenance: v1.0.8–v1.0.10 headings cite D-HOP-2026-10-24-32. CLOSED.
2. Unpaid+Asleep: Unpaid wins (mood() checks unpaid first); covered by TP1-U1..U3. CLOSED.
3. fmtMoney edges: $1M roll-up, $1.23M, $9,999.99 added to R16; outputs verified on 30b29d3. CLOSED.
4. R2a timing: 10 ticks + next render; "no other income" = incomePerSec. CLOSED.
5. R15 baseline: patch SHA under test, with/without Unpaid UI. CLOSED.
MH Unpaid banner "Market Hand unpaid: sales stopped": CONFIRMED by D-HOP-2026-10-24-17 (product/decisions.md:682), matches spec v1.0.10 §6 table. Spec line 44 still says "HoP to confirm" (stale; ask PM Workers to clean up, non-blocking).

## v1.0.11 AC trace (m-P1-1 → AC-R17; spec sha1 b1f85dca996ba272f3875bdedc1f44e80d37a365, verified 23:05 CEST 2026-10-24; queue P2a)

## v1.0.12 re-pin (23:15 CEST 2026-10-24): sha1 666e8fd54e90e054dcde2c28aa76560e50f78223. L90 is now Unpaid > Rested-below-T% > Ready in > none, which matches shipped 30b29d3 (see caption-precedence-30b29d3.md). No case changes; P2b runs check the full four-step order.
Scenes: the 7 QA asleep scenes from `qa/m41/p1-30b29d3.md` (MH, CH, both; Asleep and Unpaid). Widths 360/375/390/1280 (AC-R17 lists 360/390/1280; 375 kept from P2a). Engines Cr/FF/WK. Repro: `node axe/axe-detail.mjs <engine> <width> /tmp/qa-<sha> <build-id>`.
| Case | AC | Steps | Expected | Engines / viewports | Auto? |
|---|---|---|---|---|---|
| TP1-R17a | R17 Upgrades nav | each scene; read computed name + visible text in DOM order of `[data-nav=upgrades]` | name starts with the visible text (either "Upgrades N, N workers asleep or unpaid" or "N Upgrades…"); N in the name; axe `label-content-name-mismatch` 0 | Cr/FF/WK × 4 widths | Yes |
| TP1-R17b | R17 Workers tab | each scene + N = 0 scene; `[data-tab=workers]` | name starts with "Workers N" (count announced); bare "Workers" fails; N = 0 → name "Workers"; axe 0 | Cr/FF/WK × 4 widths | Yes |
| TP1-R17c | R17 Refill nav | each scene; `.nav-manage` with N = 1 and N = 2 | visible label and count separated ("Refill N"); name starts with visible text, e.g. "Refill 1 tired worker" / "Refill 2 tired workers"; never "1 tired workers" (AC-R9); axe 0 | Cr/FF/WK × 4 widths | Yes |
| TP1-R17d | R17 frozen suffix | MH Asleep scene; `#rate` aria-label | starts with "Net income …", ends ", sales stopped" (AC-R2a form unchanged); no other control contains ", sales stopped" | Cr/FF/WK, 390 | Yes |
| TP1-R17e | R17 no sim change | AC7 / golden harness on the patch SHA with and without the AC-R17 DOM change | sim trace byte-identical; goldens flag-off `f90d1678…`, M4-on `a54c9cf9…`; badge counts and visibility (AC-R1–R5) unchanged | unit (trace diff) + Cr | Yes |

## Next-patch filing: m-P1-1 (Minor) — added 2026-10-29 by UI QA (edb6ef85)
- **Severity / target:** Minor, non-blocking, filed to the next patch per the HoQ ruling on #70 @ 30b29d3 ("m-P1-1 aria Minor -> next patch", engineering/status.md:848; source report qa/m41/p1-30b29d3.md). The spec captured it as AC-R17 (rc1-asleep-state-spec v1.0.11 L137, now **v1.0.12 sha1 666e8fd54e90e054dcde2c28aa76560e50f78223**). Engineering scope item 2 of engineering/m4.1-p2-scope.md (= P2a).
- **Delivery vehicle:** M4.1 p2, shipped inside the v5 single RC (D-CEO-20261029-01); queue rows P2a → V5-U (qa/queue.md).
- **Verification:** TP1-R17a–e above, run once on the v5 RC SHA by `artifacts/v5-ui/harness/run-rc.sh` (p2.mjs section r17 + axe 4.14.0 `label-content-name-mismatch` explicitly enabled, Cr/FF/WK × 360/375/390/1280). Case list: artifacts/v5-ui/plan.md §P2a.
- **Status at filing:** still reproduces on main 22eac98 (harness dry-run, not evidence: 7 R17 fails, Chromium 390, artifacts/v5-ui/dryrun-22eac98/).
