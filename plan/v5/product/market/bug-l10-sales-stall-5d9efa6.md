# BUG: Sales stop silently at F10+ when Market Hand falls asleep; no farm-screen signal (build 5d9efa6)
PM Market/Customers · 2026-10-24 · **Severity: S2 Major** (UX/visibility). In playtest the player read it as "the game is stuck" and said they would have quit (`product/playtest-l10-interaction-2026-10-23.md`, "When I got bored" #2–3). **Sim logic: working as designed. Defect: the approved asleep-state visibility (AC-R1–R9) is missing from the release line.**

- **Build:** PR #67 head `5d9efa6` (rc/m4.1-rc1), label `m4.1+5d9efa6`. Code read at `qa/wt-rc1-5d9efa6` (HEAD 5d9efa61). No code was changed.
- **Spec violated:** `product/workers/rc1-asleep-state-spec.md` AC-R1, R2, R5, R6 (QA PASS @8a49d35, Oct 17 10:24). It was dropped and parked on Oct 17 at 12:06 (fwd-merge `7380b86`, 3 Code Reviewer Majors, past cap; `engineering/status.md:491`). 7380b86 is not an ancestor of 5d9efa6. Follow-up spec: `product/workers/m4.2-fatigue-visibility-spec.md` v0.2 (RV-3), parked with M4.2.

## Repro
**Manual:**
1. New farm. Reach F8 and hire Market Hand, Coop Hand and Hawker.
2. Never tap the nav "Manage all" icon.
3. About 900 s after Market Hand's hire or last refill, it hits 0% energy and goes Asleep.
4. Stay on the farm screen. Money stays flat (it drifts down slightly from Coop Hand's wage), the egg counter climbs, and the customer strip shows "Full" with unfilled orders.
5. Open Market and tap Sell all. Coins jump, then stall again immediately.

**Deterministic (sim):** `qa/wt-rc1-5d9efa6$ ./node_modules/.bin/vite-node ../../scratch/l10-stall/repro.ts` at F17, seed 7:
- Market Hand asleep: 133 s, **0 sales**, coins −$18.70 (wages), basket +660.
- Sell all: +$4,321, then 0 sales for 60 s.
- Control with Market Hand awake: +$6,791 over 133 s, with the queue also at 9/9.

## Expected (rc1-asleep-state-spec)
- Within 1 s of a worker going Asleep:
  - a red banner with role and effect ("Market Hand asleep: sales stopped") and a Refill action;
  - a red count badge on the Upgrades nav button and on the Workers tab;
  - HUD income/s drops, shown red with ⚠ at ≤ 0.
- No player-facing "Manage" string remains (it's "Refill").

## Actual (5d9efa6)
- **Farm screen:**
  - No banner and no HUD rate (the HUD shows only coins and eggs; shots 02 and 04).
  - The only cue is an **unlabelled green nav icon** (Manage all, `app.ts:91`, shown when a worker is ≤ 50%: `workers-ui.ts:30-31`).
  - The Market red dot means only "customers + basket ≥ 1" (`app.ts:563`).
- **"Asleep 💤"** appears only on the card in Upgrades → Workers (`workers-ui.ts:61`).
- `productionStopped()` (`econ/income.ts:68`) has **0 callers**.
- The goal strip keeps proposing "Collection L4" during the stall.
- The goal ETA reads the rolling coin rate (`next-goal.ts:51-65`), so it shows a stale "Ready in" for up to 60 s.

## Code path (why it stalls, and why Sell all unblocks it)
- `sim/tick.ts:18`: energy drains `dt / drain_s_per_pct` (9 s per 1%), and **Asleep stays at 0 until managed**.
- `sim/tick.ts:73`: `if (isOff(m)) continue;`, so an Asleep or Unpaid Market Hand does nothing (`workers.ts:12-15`).
- `sim/tick.ts:61-69`: Unpaid auto-resumes when coins ≥ 1 min of wages. That rules out Unpaid at the observed $1,980–$2,290.
- `sim/actions.ts:57`: `sellAll` walks the queue with `sellTo` as a player sale. It doesn't touch worker energy, so the stall resumes as soon as the player stops tapping.
- **Not the cause:**
  - queue cap `tick.ts:43` (it limits arrivals; 9 customers were waiting unserved next to 1,226 eggs);
  - demand range and patience (customers time out and are replaced, and a working Market Hand would serve them);
  - MK-33a, Bulk mode and `market_hand_min_wait_s` (not in this build).

## Suggested fix (no sim or economy change)
1. **Minimum (M4.1 hotfix or M5.0):** port the rc1 asleep banner and badges (8a49d35 / 7380b86, resolving its 3 Code Reviewer Majors) and show the banner **on the farm screen** (m4.2-fatigue Rule 3). Give the nav icon a visible "Refill" label at 360/375. Wire `productionStopped()` or remove it.
2. **Better (M5.0):** the "Sales stopped" chip under the customer strip. Spec: `product/research/v2-slices/market.md` §7.3 (trigger: customers waiting + basket ≥ 1 + 0 sales for 8 s; one-tap Refill or Sell all; telemetry `sales_stall`). Add m4.2-fatigue Rules 2 and 4 (HUD fatigue chip, "Refill workers" goal).
3. **Tests:** sim-level stall fixture (above); UI: Market Hand energy 0 → banner and chip visible ≤ 1 s and hidden ≤ 1 s after Refill; a 360 px fit check.

Owner suggestion: HoE (UI engineer) for the port; PM Workers plus Art & UX for strings; HoQA re-runs AC-R1–R9.
