# Critic review: m3-rc1-pre+dd52bfd (M4 off), Oct 17 2026

**Score: 6 / 10** (rc1-pt1 scored 5.5)

Session: about 23 minutes on a fresh save, Farm L0 to L18. Most of the play was driven by a script, so these notes don't judge how tapping feels. Audio was not evaluated. Screenshots are in `shots-dd52bfd/`.

## What improved since rc1-pt1
- The minute-one Collection card now shows "Need $10.00 more" instead of a 6:20 idle ETA.
- The top bar no longer shows a misleading positive income while a worker sleeps; it shows coins and eggs only.
- Labels are consistent ("Manage" everywhere), and the wage-unit mix is gone (along with any wage info).
- I didn't see a stuck "+$" popup this time.

## Still there (critique)
- **ETA trust.** The countdown ticks up 1-2 s between Coop Hand payouts because wages drain in between. After Manage all it rose and stalled (59 s at $2,451, 1:02 at $3,511, 1:00 at $4,255). The goal bubble always reads 1-3 s higher than the Farm card. At around minute 2 the Farm card said "Ready in ~10 min", which is still a discouraging early number.
- **Asleep workers.** They're still a silent fail state. The asleep card is greyed out and less prominent than the orange Tired cards, and the only signals are a small icon and "Manage all (3 need it)". Money just creeps down ($1,695 to $1,693) while the basket fills to 360 eggs. There are still three Manage buttons on screen. "Manage" is vague for a free action that refills one worker and then puts every Manage button on a 30-second cooldown.
- **Mid game plays itself.** I agree with Vadim, and the gap is unchanged from rc1-pt1. From L8 on, the workers carry the game ($36/s idle at L10, $94/s at L17). Waits per Farm level were 35-80 s for L9-14 and 90-190 s for L15-18. M4 is the planned answer, so this score is for M3 content only.
- **Early pressure.** The coop shows "Full!" and "Queue full" within about 10 s, and customers leave "Sold out!" before the player knows to sell.
- **Thin upgrades.** "Customer demand 31-61 → 31-61" is a no-op line at L17/18.

## Observed bugs, with repro (for Product and QA to triage)
1. **ETA rises after Manage.** Around L17 with Tired workers, press Manage all and watch the goal bubble. It goes about 59 s → 1:02 → 1:00 while coins rise about $1.8k.
2. **Market queue counts disagree.** At L7+ let the queue fill. The Market panel says "1 more customers waiting" (grammar) while the queue chip says "+5" at the same moment (shots 05, 09).
3. **Screen-reader text lags the HUD by about 1 s.** Buy something and compare: the HUD showed $40.59 while the accessibility text said "$1,139.59". Eggs showed 32 vs "0 eggs". Also "1 eggs".
4. **Collection card renders late.** On one frame the card said "Need $989" while the HUD showed $5,933 (correct value $1,272; shot 10).
5. **"Sell N" with empty basket.** For one frame right after Sell all, the first order still shows "Sell 8" with 0 eggs.
6. **No-op upgrade line.** The Farm upgrade at L17/18 lists "Customer demand 31-61 → 31-61".
7. **Asleep worker isn't flagged.** Reach L7+ and never press Manage. Around minute 20 Market Hand falls asleep and income stops with no prominent alert. A single Manage then sells the backlog ($1,693 → $4,240).

## Top 3 strengths
1. Short three-step tutorial, and the Sell step now works.
2. Clear visual progression (new coop at L5, more hens) and a readable layout.
3. Faster, steady early pacing: L8 at about 9 min, L17 at about 20 min.

## Top 3 problems
1. The L8+ mid game plays itself, with waits over 3 minutes by L18.
2. ETA readouts still drift upward and disagree with each other.
3. An asleep worker is a hidden fail state, and Manage is a chore that involves no decision.
