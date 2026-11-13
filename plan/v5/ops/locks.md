# Shared browser lock registry (owner: HoO)
Every process that takes a lock starts via `ops/tools/lane-run.sh` (rule 21). Only the browser command runs under `flock`, and each hold is 600 s or less with `timeout`. Changes to this file need HoO's OK and an ops-log line.

| Lock | Who may use it | Terms | Registered |
|---|---|---|---|
| `.browser-test.lock` | shared: all lanes (UI QA lane A Firefox, Saves QA, Art, Eng) | lane-run, hold ≤ 600 s | standing |
| `.browser-test-2.lock` | shared: all lanes (UI QA lane B, Saves QA) | lane-run, hold ≤ 600 s; pause while 1-min load ≥ 12 | standing |
| `.browser-test-3.lock` | **UI QA only**, lane A2 (`uiqa-a2-*`): Firefox; WebKit after wk-preflight passes | lane-run; `flock <lock> timeout 600 <browser cmd>`; one engine per hold; start only when 1-min load < 12 (< 8 when lane 1 busy); ports 5271-5279; stop only with lane-kill (success = rc 0 and GONE, TERM (group) or TERM) | 2026-10-30 13:08 HoO, per qa/decisions.md:683 |
