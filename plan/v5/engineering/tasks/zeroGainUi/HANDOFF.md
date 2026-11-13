# zeroGainUi HANDOFF (Senior Engineer, Generalist) · 2026-10-30 15:58 CET

**Branch** gen/zero-gain-ui, pushed by HoE as v5-m51-zerogain @546de85 (PR #97 → rc/v5 65a7443). Worktree /workspace/wt-gen-zerogainui.
**Commits** af08f33 · 28956b2 · b79e1d6 · 2249636 · 53ef5b5; c92e2d5 6/n 2×2 matrix · 57bc213 7/n strip always ends in one confirm/cancel · **546de85** 8/n unaffordable ZG Buy inert (HEAD 546de85fa5f3…, pushed to #97).
**Bundle** gen-zero-gain-ui-546de85.bundle (prereq 65a7443, verified, head 546de85) + SHA256SUMS (0265043…; also lists the 53ef5b5 bundle), both in this folder.
**Spec** v0.3.7 f86de04e + errata v0.3.8 rev2 4cfe6895 (verified); UI doc v1.4 14ec8850; D-COL-2026-10-30-29.

## Built
UI-only flag m4.flags.zeroGainUi: verdict seam src/ui/zero-gain.ts, row chip/no glow, ★ filter before the pick, nav dot, upgrade.zero_gain, confirm strip (confirm=1 only; one confirm/cancel per strip; unaffordable Buy inert).

## Gates @546de85
1964 pass; slow 16; check-globals ×3; goldens f90d1678/a54c9cf9 and DOM 9c4b6439 PASS. Shared files: app.ts, telemetry.ts, styles.css.

## Decided (D-HOE-33)
No stopgap: ZG-AC3 is enforced by BBv2. FX-F27 traces: Architect after #94. a11y and screenshots: QA.

## zg-followup (TASK HoE/zg-followup, Architect review 1f8c0337)
Branch gen/zg-followup on rc/v5 0ad018d, worktree /workspace/wt-gen-zg-followup. Bundle gen-zg-followup-c4a1a76.bundle (prereq 0ad018d, verified) in SHA256SUMS.
- 787b5c1 Minor 1: zg-telemetry-annotate, a 2-event test (newest only, dirty). The oldest-first mutant Y10 fails it (checked).
- 234bfba Minor 2: the re-render keeps focus on Cancel, Buy anyway or the row Buy; nothing is auto-focused, and the guard keeps its opening time. 3 of 4 zg-followup tests fail on 0ad018d (checked). Note: zg-ui "survives a coins-tick re-render" was vacuous because the markup did not change, so the new tests force a real swap.
- c4a1a76 nits: dead return removed; AbortController with ui.dispose() (tested); glowCls(can, zg) replaces noGlow, and the m10 check accepts it.
- Gates @c4a1a76: 2025 pass / 1 skip; slow 17 pass; build, html, check-release-build 0; check-globals ×3 PASS; goldens and DOM 9c4b6439 byte-identical.

## 9/n flip HELD (D-HOE-38)
HELD-flip-zeroGainUi.diff (balance.json zeroGainUi 0→1, against 0ad018d) is not committed and is not in the bundle; it waits for the Architect's SIM-only flag-list PR. The old uncommitted copy is still in /workspace/wt-gen-zerogainui. Probe at 546de85: 12 failures. f1b comes from anyM5FlagOn; the rest are ship-0 pins plus tests needing an explicit zeroGainUi 0.

## Open
- BBv2 (gen/bbv2 d654afd) re-asserts zg-matrix, zg-ui and zg-ac13 per bestBuyV2 value (Q-E2 changes verdicts, e.g. L30u COLL).
- Card #9 seeds 21–200: QA.
