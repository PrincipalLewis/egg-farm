# QA: AC7 identity check, PR #42 head cb57f174d8e8d85c3a9a7068b99dc75348de6403 (base rc/m4-default-on @ 7fdb273)
Run 2026-10-19 02:14-02:35 CEST. Fresh worktree qa/wt-identity-cb57f17 with its own deps (npm ci). No browsers used.

## 1. Scope
- m4.enabled = 1 (src/config/balance.json). 7fdb273 is an ancestor of the head.
- The diff vs 7fdb273 is 35 files, none in src/ or data/. The new files since 528f1a7 are tests/bot.ts (the log uses `next.farmLevel`) and tests/bot-farm-log.test.ts.

## 2. Regression test
- tests/bot-farm-log.test.ts on the fix: 1/1 PASS.
- With the old line restored temporarily (`const farm = s.farmLevel + (k === 'f' ? 1 : 0)`): FAIL, "expected undefined to be 15" (L2 not recorded). Reverted afterwards, so the worktree is clean.

## 3. Suites
- Unit: 860/863 pass. The 3 reds are balance: pacing.test.ts (Farm L10 8-12 min), pacing-acw1.test.ts, p4.test.ts. The raw run reported 860/864 because it also picked up my temporary copy of Economy's m4bot/run.test.ts (it has no OUT env set). That was a QA artefact, not a repo test, and it's now removed.
- Slow: 14/14 pass.
- Goldens (engineering/golden): 4/4 pass, which is consistent with the hashes being unchanged.

## 4. Identity: tests/bot.ts + bot-m2.ts vs Economy's snapshot (hashes 20253fe6/0d622fbf/3445dfab/89116ece), ALIGN=1 M4=1, seeds 1-200, VAR_DEFAULT
| metric | no workers (60 min) | workers (2 h) |
|---|---|---|
| per-seed reach maps identical | 200/200 | 200/200 |
| L10 P95 (gate <=12 min) | 15.35 both. FAIL (1-100: 15.20) | 15.38 both. FAIL (1-100: 15.38) |
| L20 P95 (warn 1740 s) | 2153.4 s both (info) | 1762.8 s both. WARN |
| L30 | 0/200 both (median max F24; info only) | 200/200 both, median 52.91, P95 54.31 min. PASS |

## Verdict
The two bots are identical on 200/200 seeds on both paths, so the two-bot gate (±20%) PASSES and Product's identity requirement is met. Engineering's claims are confirmed. AC7 is still FAIL on L10 P95 and WARN on L20 P95; both wait on the 03:30 retune. Economy's bot must always run with ALIGN=1 M4=1.
