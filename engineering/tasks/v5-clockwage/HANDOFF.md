# HANDOFF: Hire2/v5-clockwage

**TASK Hire2/v5-clock-wage:** clockWage sim+UI per failure-cost v0.3.24 54b994bd against refill G0 (write scope: own branch + this folder; seam via Saves + Architect).
**Owner:** Senior Engineer, Sim/TS + UI (Hire 2) · HoE · reviewer Architect · GO D-CEO-20261110-16 (stop ~10:40 CET).
**Branch:** `wip/hire2/v5-clockwage` off rc/v5 `d65391b0` · worktree `/workspace/wt-hire2-clockwage`.
**Current SHA:** `e8f42b0` (pushed) · 2026-11-10 04:41 CET. Git identity via `git -c user.*` per commit (D-HOE-58).

## Pins
failure-cost 54b994bd ✔ · hire-2-spec.md **7ffa46b9** ✔ · Architect review e432b209 (S1/S2 OK; CHANGES M1–M4, m2) · flag table 8b7c3e24 ✔ · G0-API.md rev 6 sha256 5225aab8 ✔ · SIM-API.md rev 3 sha256 38bfc0d1 ✔ (notes of record; §11 unchanged).

## Commits
- S1/S2 `c237498` (+tests `4852678`) — Architect OK. S3 `cc018be`.
- S5 per Saves review `26c10f6`: clockWageTipShown in M5Fields/M5_SAVED_FIELDS, sanitiser inside m5Load (both branches), pin test, tracks-v7 pending test (pending = tracksOff ⇒ clockWage off ⇒ tip can't be set; a key already in the v6 save is in v6Keys and survives a real write).
- B-1 toast wrap `1371880` (flag-on `.toast.cw-b1`; 2 lines 320×52 at 360/390/1280).
- M1 `5caae4b`: toast only on Working/Tired→Asleep (FallAsleepToasts), via queueToasts; tests (flip ⇒ 1, resume event ⇒ 0, same-tick MH+CH ⇒ 2 queued).
- M2/M3/M4 `d2b96d5`: asleep_time event removed (schema-test edit reverted); `tickAsleepClock` once in step() (integer ms), `asleepClockOn` (Refill: OR autoRefill there), session fields `asleepSessionMs`/`asleepPaidCents` (M5_SESSION_FIELDS; f2 pin test updated), separate gates in `asleepSessionEnd`, `resetAsleepSession` at session_end (call it at session rotation when that lands); mood asleep only; `clockWageWindow` saved key + sanitiser in m5Load, reset in collect/dismissOffline (actions.ts edit, Saves APPROVED); AC-FC12 reload test.
- Seam `e8f42b0`: every clockWageWindow read/write goes through `readWindow` / `writeWindow` in clock-wage.ts (tick, view, reset, load sanitiser). Saves dropped their PR, so the key stays on this branch; no swap planned (if one comes, it's those two lines).

## Tests
@e8f42b0 (pushed): full `npm test` 161/161 files, 2354 pass + 1 skip; goldens unchanged; tsc clean.
Evidence re-shot at e8f42b0: `evidence/` (54 PNGs, 3 engines × 360/390/1280; README, probe.log, cwshot.mjs). All 36 toasts are queued under the HUD (top 64 / HUD bottom 56), 2 lines 320×52, no clip; tip 9/9; welcome-back after a real reload (save back-dated 10 min) shows both lines from the saved clockWageWindow 9/9; 0 page errors.

## Open
- Saves: actions.ts line APPROVED; clockWageWindow key + sanitiser stay on this branch (Saves dropped their PR).
- Session rotation point not on rc/v5 → resetAsleepSession only at session_end for now.
- Refill merge (~2 h).

## Hours left
≈ 9 h used of 18–26; ≈ 10–17 h left.
