# Proposal: cut how often an unmanaged player's coop sits full at F8+ (PM, Workers) v0.1, Oct 16 2026
Source: PM Collection and Head of Product, from product/collection-telemetry-sim-reconciliation.md. A 45 s visitor finds the coop full 48–59% of the time at F8+ (median). The target is about 35% or less.

## Proposal A (Workers): the asleep Coop Hand keeps collecting slowly
- An asleep or unpaid Coop Hand keeps collecting at w2_asleep_collect_share = 0.25 of its normal rate. This matches the precedent of the asleep Grader keeping 15% of its bonus.
- An unpaid Coop Hand also skips its wage. That's already true for unpaid workers: no charge, and coins never go negative.
- The card reads "Asleep, collecting slowly", replacing the "production stopped" wording for W2 only.
- Managed play is unaffected, since managed players keep it awake. The cost is a smaller active/idle gap, which Economy must check.
- Tunable: w2_asleep_collect_share, with a range of 0.15–0.40.

## Proposal B (Collection-owned, for the case with no hand): flagged to PM Collection
- When the coop fills, overflow eggs go to the Basket at 25% value instead of being lost. The alternative is a coop cap that scales so a full coop holds about 60 s of laying at F8+.
- Proposal A can't help a player who never hired a Coop Hand, so the no-hand case needs B or the existing hire hint.

## Gates (Economy sim)
- In the visit-player sim, the F8+ median coop-full share for an unmanaged Coop Hand is ≤35%.
- The F22-24 managed/unmanaged ratio is ≥1.5, the CEO's 2x cap holds on the worst seed, and AC-W1–W7 pass.
- Report the smallest w2_asleep_collect_share that passes.

## v0.2 (Oct 16 23:35): proposal after Economy's sweep (workers-coop-asleep-share-sweep.md)
- **Proposal:** w2_asleep_collect_share = 0.20, the smallest share that keeps both the 45 s and 90 s visitors under 35% coop-full time. At F8+ the medians are 13% for the 45 s visitor (43% today) and 27% for the 90 s visitor.
- 2x holds, with the worst seed at 1.93, and AC-W1–W7 are unchanged.
- **Open item:** unmanaged idle income drops about 4% even though an asleep hand that collects should raise it. Economy will trace this before approval.
- PM Collection's cap floor doesn't help on its own, so the share is the main lever. The cap floor is optional.

## v0.3 (Oct 16 23:40): joint proposal with PM Collection
- **Cap floor:** dropped entirely, because PM Collection withdrew it and it had no effect at any size.
- **Hand present:** w2_asleep_collect_share = 0.20, with a range of 0.15–0.40. This waits on Economy tracing the 4% anomaly.
- **No hand, F7+:** no economy change. B-1 AC-B9 already removed the old Coop Hand tip, so instead of reviving it, the existing B-1 hint "⚠ Collect or hire Coop Hand" escalates when the coop has been full more than 50% of the last 5 min.
  - Escalation adds a pulse and a New dot on the Coop Hand card (the same component as the first-hire nudge).
  - It fires at most once per session and stops after 2 dismissals.
  - Tunables: nudge_coopfull_share=0.50, nudge_coopfull_window_s=300.
  - **AC-CF1:** at F7+ with no hand, once the coop has been full 151 s of the last 300 s, the pulse appears within 1 s. It doesn't appear at 149 s, and it never appears with a hand hired.

## v0.4 (Oct 16 23:40): approved by Head of Product (relayed by PM Collection)
- The cap floor is dropped.
- **w2_asleep_collect_share = 0.15**, as approved. A case for 0.20 (90 s visitor 35% → 27%) goes to Head of Product separately, after Economy traces the 4% anomaly.
- No economy change for players with no hand.
- **AC-CF1 (final):** at F7+, with no Coop Hand hired:
  - Once the coop has been full more than 50% of the last 300 s of *active play*, the "Collect or hire Coop Hand" hint escalates within 1 s, with a pulse and a New dot on the Coop Hand card. Hidden-tab and offline time are excluded from the window.
  - Pass/fail check: it fires at 151 of 300 s and does not fire at 149 of 300 s.
  - It fires at most once per session and **never while a Coop Hand is hired**, whatever state the hand is in.
  - It's measured with coop_full telemetry plus a new coop_hand_nudge_shown {farm_level, full_share} event.
- v0.4 note: the AC-CF1 300 s window is not saved and resets on reload, which is acceptable. Tunables: nudge_coopfull_share 0.50, nudge_coopfull_window_s 300, nudge_coopfull_min_farm 7.

## v0.5 (Oct 16 23:40): case for raising the share to 0.20, after Economy's trace
- **The 4% drop is the leave penalty, not the share.** Everyone is asleep after about 15 min, so the basket fills with eggs nobody sells. Each customer who times out triggers the 5% penalty, $10–13/s at F22–24. With the penalty off, the share's effect on income is 0.0%.
- **Proposal 1 (needs PM Market):** charge the leave penalty only if the player sold by hand in the last 30 s, or the Market Hand is awake. Otherwise customers time out with no penalty, since nobody is minding the shop.
- **Proposal 2:** raise the share to 0.20. That cuts coop-full time for the 45 s visitor to 13% vs 20%, at no income cost once Proposal 1 is in. Managed/unmanaged stays at 4.32, the worst seed at 1.93, and AC-W1–W7 pass.
- **No Market Hand asleep share.** Selling stays the thing that needs active management, so sleep is still felt.
- **Unsold basket on return:** up to 28k eggs wait for the returning player. That's acceptable, and it makes the return feel recoverable. Proposed **AC-CF2:** the welcome-back sheet shows the basket count, and a single Sell or Refill Market Hand action clears it.
- v0.5 refinement (agreed with PM Market): 'attended' means any player input in the last 30 s, or the Market Hand is awake, judged at the moment the customer leaves. Log customer_left {reason, penalty, attended}. This becomes MK-33a in PM Market's spec.

## v0.6 (Oct 16 23:39): approved by Head of Product
- **MK-33a:** the leave penalty applies only when the shop is attended, meaning any player input in the last 30 s or the Market Hand is awake. It's judged at the moment the customer leaves, and logged as customer_left {reason, penalty, attended}. CSV field: leave_attended_window_s=30.
- **w2_asleep_collect_share = 0.20, only if MK-33a ships in the same build.** If MK-33a slips, it stays at 0.15.
- **AC-CF3:** with no input for 31 s or more and the Market Hand Asleep, a customer who leaves charges $0 penalty and logs attended=false. With an input 29 s or less earlier, or with the Market Hand awake, the 5% penalty applies and logs attended=true.
- **CSV:** one new revision replaces the 053b2ba5ad71 baseline (0.15), and QA re-baselines TR-5 against the new hash.
