
- 00:50 TR-AC7-TAIL tracked: AC7 P95 tail NOT VERIFIED (deterministic bot). Not an rc1 blocker; goes in the rc1 release notes; re-verify before any release that changes pacing.

- 2026-10-17 08:50: main 8e6d53e (CSV 6dca24cd): QA verified AC7 on the TS variance bot (3155bbd). The L30+ gate FAILS (EX-1 L30–40 worst 2.40 > 2.25, caused by the L21 −3% trim), so the L30+ release is on HOLD (Major). Escalated to CEO/HoP/HoE/Economy. Report m3-recheck/ac7-verify-8e6d53e.md.

- 2026-10-17 08:49: HoE ruled that the L30+ hold doesn't gate M4-A #31: 6dca24cd ships no L31+ rows, so EX-1 L30–40 can't be reached. QA concurs based on the report's CSV diff. HoE adopted the rule that every CSV change runs the full gate set, L30+ included, before merge. HoP says they approved L21 −3% at 08:12 and the #36 numbers at 08:24; the 08:40 entry is void. Economy is running the fix candidates and reports by 09:15; HoP decides by 09:30; Saves QA verifies the chosen CSV.

## 2026-10-19 08:31
- B @ 246de09: QA PASS sent to Leadership, CEO, HoE, HoP and A&UX. Waiting for HoE to publish, then the 4 reviewer passes (Player, Critic, Claude QA Tester, Claude Gamer) and the filed test report. CSR spec v0.2.3 testability review is next.

## 2026-10-25 (Europe/Budapest)
- [QA-D-1025-ZG1] Zero-gain purchase UI v0.2 (e8c4e706, telemetry 8d265a52): NEEDS FIX, with 10 blocking and 8 text fixes (qa/m5/review-m51-zero-gain-ui.md). Verdict message to PM Collection and FYI to HoP sent to PMC (priority) and HoP (FYI) 03:08. Lighter-refill v0.8.6 (1e414854) and failure-cost v0.3.11 (5651632e) text fixes verified, text only, both still TESTABLE.
- [QA-D-1025-ZG2] Zero-gain UI v0.3 (b367918c, telemetry 0db37c91) re-check 1: TESTABLE with 6 text fixes. Fixtures verified in code at 30b29d3. HoE E4 closed (03:19), E5 base SHA is a kickoff dependency. The UI doc moved to v1.1 7f015aec (03:19) and needs a re-pin once HoAUX signs. Message to PMC sent to PMC (priority) 03:22.
- [QA-D-1025-ZG3] Zero-gain UI v0.3.1 (7d5d4f0e, telemetry 37472b7f) spot-check: TESTABLE (3 record-only notes). Message to PMC (OK to send to HoP) sent to PMC (priority) 03:31.
- 03:46 failure-cost v0.3.12 (c02af0f8) spot-check: TESTABLE; one record-only rounding note; reply sent to HoP. [QA-D-1025-M51FC9]
- [QA-D-1025-PM1] M5.2 pressure metric v0.3 (7a5928b5): TESTABLE with 7 text fixes. Gates reproduced on Econ's harness; TS bot pending the M5.1 code plus the bot-m5.ts port and parity (qa/m5/review-m52-pressure-metric.md). Message to PMW sent to PMW (priority) 08:32.
- [QA-D-1025-M51FC10] PMW re-pins FC v0.3.13 07801a34 / v0.3.14 393e69f6 and LR v0.8.8 08d12ac7: record-only, no bar changes, all o1a gates PASS (thin: AC-LR11 seller15/casual 0 s, casual (ii) +0.1 pp). TG-LR10-G (o1a s148/s116 guard at test time) added to testability-gaps.md.
- HoOps FYI: P2a/P2b HELD per D-CEO-20261025-01 (NO-GO on M4.1 patch 2 code while Vadim playtests p1; frozen scope engineering/m4.1-p2-scope.md; starts on Vadim's go). qa/queue.md rows P2a and P2b confirmed to show it.

## 2026-10-27 (Europe/Belgrade)
- 21:30 [QA-D-1027-GOALPILL] T-goalpill: not a Latest game bug. Verify tool Major (tooling): an unmarked end-state save is v6-migrated on load (V30 → 20). qa/bugs/T-goalpill.md. Reply to HoE (priority) is drafted.
- 21:30 [QA-D-1027-PM2] M5.2 pressure metric v0.3.1 9c58e58c: TESTABLE, accepted in the handoff, no message.
- 22:10 [QA-D-1027-GOALPILL-V] T-goalpill fix on PR #71 @ 53c7136: PASS. The pill reads "All upgrades done!", the round-trip is clean, the trace is unchanged, the suite is 1537/1537 (1 skip). Reply to HoE (priority) is drafted.
- 22:10 #71 retires 8 one-off scripts, including scripts/recovery-v11-browser.mjs. I pinned 7 historical QA re-check scripts to the SHA each one verifies, with a PIN71 guard that aborts on any other HEAD and creates a detached worktree only if $G is missing:
  - qa/m3-recheck/save-5d636d8/{step,run-engine}.sh → 5d636d8 (their checkout is at 5d636d8, so the guard passes).
  - qa/m3-recheck/save-durability-4a25d0d/run.sh and /workspace/qa-sd3/run.sh → 4a25d0d.
  - /workspace/qa-sd3/run{4,5,6}.sh → aaaa91a (they also call recovery-v11).
  - The originals are kept as *.bak-pre71. bash -n passes on all 7. None is a live or recurring check, so none was switched to npm run verify.
  - Note: /workspace/qa-sd3/game is now at a01faea (run8's re-check, which calls no retired script), so run.sh and run4-6 abort until that SHA is checked out there. That's intended.

- 07:50 Oct 28: D-CEO-20261028-02 applied: Claude QA/Gamer cadence now per milestone RC + gameplay/economy Latest; queue.md updated, both bots told.
- 07:55 Oct 28: rollback re-verify duty assigned to Saves QA (D-CEO-20261028-03), in queue.md; SS-G25 closed (spec v1.3.10).
