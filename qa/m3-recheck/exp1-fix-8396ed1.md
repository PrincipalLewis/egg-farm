# EXP1 fix recheck — 8396ed1e24ef345909e0c586be839979529bb840 (FINAL)
Runtime build-id m3-rc1-pre+8396ed1. Pushed (gh/fix/m4-gate5-v115-on-capped, gh/rc/m4-t3-capped). Port 4821, /tmp/qa-fix-8396ed1, one engine at a time.
Manifest: exp1-fix-8396ed1/manifest.json, full SHA, 252 shots (84 per engine). All files present and sha256 verified.
Shot checks: the 180 exp-final shots assert panel=explainer (ext_assert_ok true); the 72 storage shots assert tab=collection.
I opened and checked a sample: chromium 360 storage blocked/reload, and webkit 1280 C3 focus (focus ring on the active Collection tab). The rest were checked by script against the manifest.
**The storage-blocked/QuotaExceededError results are superseded by HoE's #49 fast-forward (see 45eb5e3 and 246de09). The other results count.**

## Expectation (HoQ ruling 07:51)
Canonical committed-unseen save while blocked: no card for the whole session, even once storage is writable again. On the next writable load the card shows exactly once and the flag is saved.

| Check | chromium | firefox | webkit |
|---|---|---|---|
| EXP1 exp-final non-storage (50 cases: C1–C4, C5-hidden, 4 sizes incl. 1280 focus) | PASS 50/50 | PASS 50/50 | PASS 50/50 |
| C5-gate-readonly (4 sizes), re-graded: no card in session (count 0) | PASS | PASS | PASS |
| C5b (v6 in-session + canonical committed; card on next load, count 1) | PASS 2/2 | PASS 2/2 | PASS 2/2 |
| Storage-blocked, real + setItem-throw, both fixtures, 360/390, re-graded (superseded) | PASS 8/8 | PASS 8/8 | PASS 8/8 |

## Findings
- F-8396-1 (no card in-session after storage becomes writable; card on next load): **CLOSED, BY DESIGN** (HoQ 07:51; Saves confirmed it matches the spec).
- No new findings.

## Not run
- exp-blkreload (reload while still blocked) on 8396ed1: skipped per HoQ 07:53, moved to the newer SHAs.
- Broader g5 rerun: deferred until after the verdict.
