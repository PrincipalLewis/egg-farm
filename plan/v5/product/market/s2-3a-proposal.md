# S2-3a: market looks dead after an offline break · proposal · 2026-10-16 · PM, Market/Customers

> **APPROVED (Head of Product, 2026-10-16, decisions.md):** A (1.5 s served dwell, config `served_dwell_ms`, outside the queue limit) and C (first customer arrives immediately on return) for rc1. B deferred to F1. D/E/F not taken. Final ACs: feature-spec.md MK-16 to MK-22.
Source: playtest/triage/2026-10-16-session2.md (S2-3a, Major) and playtest/player-notes/2026-10-17-session2.md. Code read: game-m3/src (m3-rc0). Engineering should confirm the cause with a debug repro (steps at the end).

## 1. Cause: two issues together, both found in the code
1. **Market Hand serves each new customer within 1 s.** `balance.json` sets market_hand `every_s: 1` (3 s when Tired). `tick.ts → workerActions` serves the queue front-first, like Sell all. With 1,300+ eggs in stock every order fills completely, so a customer lasts at most 1 s (3 s Tired). Customers arrive every `customer_interval_s` (L10–14: 3.0–6.0 s in the rc0 config). The queue is therefore empty about 70–85% of the time, and never holds more than one customer. Player notes: Market Hand was hired (40% energy). Money kept rising, which confirms sales were happening.
2. **A fully served customer vanishes with no animation.** `ui/app.ts renderQueue` deletes a chip the moment its customer leaves `state.customers`. Timeouts get a "wave leave" ghost and partial leavers a ghost too, but the `customer_served` event has no handler. A 1 s visit, often less once frames fall between serves, followed by an instant removal reads as "nobody came".

**Ruled out:**
- **No auto Sell all on return.** `collectOffline` only adds the eggs to the Basket, and selling still goes through Sell all, a card tap or Market Hand.
- **The offline freeze isn't the cause.** As specified, the queue doesn't fill while offline. The saved arrival timer then resumes, so the first arrival comes within one interval (≤ 6 s at L10+), which isn't the delay the player saw.
- **The first arrival isn't delayed.** `nextCustomerInS` is saved and resumed, not reset to `first_customer_s`.
- **Without Market Hand the queue would fill** (5 slots, 30 s patience) until the player taps. The "dead" look needs a worker to sell instantly, or the player pressing Sell all on every arrival.

Context: rc0 still runs the earlier queue (cap 5) and demand values (0.8k–1.6k), not P1q, which matches the "5 slots" in the notes. P1q halves the arrival interval to 1.5–3 s, which roughly doubles how often a customer is visible. It still leaves single customers that blink in and out.

## 2. Options
| # | Option | What it does | Size | Economy impact | Verdict |
|---|---|---|---|---|---|
| A | **Served dwell (UI only)** | On `customer_served`, the chip stays in place for `served_dwell_ms` (default 1500): a "Thanks! +$X" tag plus a leave animation, then it's removed. The dwell is purely visual: it doesn't count toward queue_max and can't be tapped. Reduced motion: a static "Thanks!" for the same time. | **≤ 0.5 day** (UI handler + CSS, reusing the `ghost()` leave path; 1 config key under `feel`) | None (sim untouched) | **Recommend for rc1** |
| B | Market Hand minimum wait | Market Hand serves only customers who have waited ≥ `market_hand_min_wait_s` (e.g. 2 s). Manual sells are unaffected. | ~0.5 day (sim + tests + sim re-run) | Small: delays income by up to 2 s; a few % fewer customers served before patience runs out (needs a sim) | Optional, **rc2 / F1**, only if A isn't enough in session 3 |
| C | Immediate first arrival on return | On load after an offline grant, set `nextCustomerInS = min(saved, 1 s)`. | ~0.1 day (code) | Negligible | Optional add-on to A; on its own it fixes only the first seconds |
| D | Pre-fill the queue on return | Spawn k customers on return. | ~0.5 day | Adds income on every return; contradicts the approved Q1 rule that the queue freezes while closed | **Reject** (needs a Head of Product numbers decision) |
| E | Cap customers served per tap | Sell all serves at most n customers. | ~0.25 day | Changes the approved Sell all rule (§2.6) and slows active players | **Reject**: doesn't fix the worker case |
| F | Slower Market Hand (`every_s` 1 → 2–3) | Data only. | 0 (config) | Worker economy change (PM Workers owns it) | Not recommended: still empty most of the time and hurts Workers pacing |

## 3. Recommendation
**A for rc1** (UI only, ≤ 0.5 day, no change to economy or spec numbers). Optionally add C if Engineering has ~0.1 day spare. Re-check in Player session 3 (triage step 4: watch the queue for 2 min after the offline break). If the market still looks dead, bring B into F1 with a sim.
With A at 1.5 s, at L10–14 (3–6 s interval) a customer is visible about 2.5 s of every interval (up to 1 s waiting plus 1.5 s dwell), versus under 1 s today. At the 3 s floor that's about 80% of the time. With P1q (1.5–3 s interval) about one served card is nearly always on screen.

## 4. Draft ACs (for feature-spec.md once approved)
- MK-16 When a customer is fully served (card Sell, Sell all or Market Hand), their card stays in its slot for `served_dwell_ms` (config, default 1500 ms, ±1 frame) showing "Thanks!" and the coins earned, then plays the leave animation and is removed.
- MK-17 A dwelling card doesn't count toward `queue_max`: an arrival during the dwell is accepted if the live queue has room (the card is then drawn as an extra slot or under "+N waiting", per the Art & UX layout), and it is never logged as lost to a full queue.
- MK-18 A dwelling card can't be tapped and is ignored by Sell all, Market Hand and the Sell all total.
- MK-19 Reduced motion: no leave animation; a static "Thanks!" card for the same `served_dwell_ms`.
- MK-20 Sim/economy: with the same seed and inputs, coins, sold eggs and customer events match the build without dwell exactly (the dwell is presentation only).
- MK-21 (playtest) With Market Hand Working and ≥ 500 eggs in stock at Farm L10–14, over 60 s a customer card (waiting or dwelling) is visible ≥ 40% of the time.
- (If C) MK-22 After an offline grant, the first customer arrives within 1 s of the welcome-back modal closing.

## 5. Repro for Engineering
Debug panel: hire Market Hand at F10+, add 1,500 eggs to the Basket, watch the queue for 60 s. Expected today: chips flash for ≤ 1 s with no served animation. Without Market Hand the queue fills (control).

## 6. Open questions
1. Art & UX: what the served card shows ("Thanks! +$X", egg-count tick) and how a dwelling card is drawn when the queue is full (extra slot vs "+N waiting").
2. PM Workers: is B acceptable as a fallback (Market Hand "greets" for 2 s)?
3. Economy/Balance (F1): supply far above demand after offline is the deeper "nothing to do" issue; this proposal fixes only readability.
