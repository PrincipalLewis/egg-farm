# QUEUE PAUSED: #16/#4 chain (2026-10-17 08:41 CEST)
Reason: M4-A #31 delta QA (CEO via HoE, Head of QA confirmed); due 09:45.
- Paused: `bash /tmp/qa-x/chain4.sh` PID 547983 with `kill -STOP 547983` (state T).
- The in-flight child, PID 906769 (`flock ... timeout 600 ... pr16-v2-qa.mjs`, ENGINE=webkit, PORT 4680, PR #16 QA probe webkit), was NOT stopped. It finishes its lock hold (max 600 s) normally; then the chain stays frozen before its next step.
- Steps still pending: PR #16 0470045 webkit offline-clock/offline-v2/globals/rc0 (whatever is after the QA probe webkit), then PR #4 4e47d77 vitest + manage/rc0 x3.
- Resume: `kill -CONT 547983` (after the M4-A delta and the Saves rework SHA, per Head of QA).
- Check: `ps -o pid,stat,cmd -p 547983`.
