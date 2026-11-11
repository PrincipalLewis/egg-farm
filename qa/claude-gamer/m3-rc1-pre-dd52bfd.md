# Claude Gamer — release m3-rc1-pre-dd52bfd (PASS_ID m3-rc1-pre-dd52bfd)
Date: Sat Oct 17, 2026 · Build: the GitHub release asset `egg-farm.html` (PrincipalLewis/egg-farm, `gh release download`), saved in /tmp/egg-claude-gamer/dd52bfd and served on 127.0.0.1:4185 (stopped).
**Runtime build id: meta[name=build-id] = #app data-build-id = `m3-rc1-pre+dd52bfd` ✅** in every session.
Real headless Chrome play (playwright-core), no source simulation. Every session ran as `flock /workspace/egg-farm-studio/.browser-test.lock timeout 600 node /tmp/egg-claude-gamer/play5/g.mjs …`, one at a time, each holding the lock for 10 min or less, with no sleeping under the lock. 0 page errors and 0 console errors in all four sessions.

| Chunk | Viewport | Active play | Lock held (CEST) |
|---|---|---|---|
| c1 | 390×844 | 8 min; deliberately idle from 5:30 to 7:00 to test the full coop | ~14:57–15:08 |
| (offline) | | 4 min; "Welcome back! You were away 4m +486 eggs" | |
| c2 | 390×844 | 9 min | 15:09–15:21 |
| (offline) | | 4 min; "+1,015 eggs" | |
| c3 | 390×844 | 9 min | ~15:25–15:35 |
| desk | 1280×800 | 3 min (fresh save) | ~15:35–15:38 |

The save carried over between chunks through a persistent browser profile. That gives about 26 min of active play and about 34 min of game time.

**Bot limits:** the bot buys the first affordable item, sells per order card, and collects constantly. In this pass it never tapped Manage or Refill, so workers decayed in c3 (Market Hand asleep at 0%, c3-20). That is the designed fail state, not a bug.

## Felt good
- The tutorial: countdown to the first customer, then highlighted Sell, then the first upgrade at 0:14 (390) / 0:19 (desk). The Sell step advanced instantly.
- Fast early buys: gaps of 10–30 s for the first ~5 min.
- Sale feedback: the sold card now leaves the list, and a "Thanks! +$X" chip appears in the queue (c1-13). That fixes pass 3's B3.
- The welcome-back dialog (c2-02, c3-02).
- Workers visibly tire: Working → Tired → Asleep 💤, with a big green "Manage all" button. That is clear (c3-20).

## Dragged (measured buy gaps)
- c1: 10–42 s. The 111 s gap at 7:02 includes the 90 s idle test.
- c2 (game time ~13–21 min): 20–51 s, with 63 s at the end. Farm L10 at 3:03, L14 at 7:27, L13 → L14 took 96 s.
- c3 (game time ~25–34 min): 57, 80, **111 s (Farm L17)**, 56, 72, 52 s.
- No gap reached 3 min. From ~minute 25, the mostly idle 1–2 min waits between buys are where you'd start to drift.

## Bugs (with repro)
1. **"No eggs to sell" while holding eggs (still present). Medium, copy.**
   - Repro: play to ~7 min with Market Hand hired, so you have eggs in stock. Open Market when the customer queue is empty (between arrivals).
   - Expected: "No customers yet". Actual: a greyed "No eggs to sell" while the top bar shows 67 eggs (c1-24-7m19-noeggs.png).
   - The same thing happens at 0:03–0:11 before the first customer.
   - Logged 47× in c1, 81× in c2, 19× in c3 and 37× on desk (`noeggs-while-holding` in the events files).
2. **The empty-Market spinner overlaps its text. Low.** In the same state as bug 1, "Next customer soon… (2s)" renders as "custo◯◯r", with the egg/spinner icons drawn over the word (c1-24).
3. **The full coop is still silent. Low-Med, UX.**
   - Repro: after hiring Market Hand, stop collecting for ~60 s. The coop reaches 250/250 by 6:24.
   - Actual: the Collect button stays bright yellow "Collect +45" with no full-coop message; only a small "Full!" tag (c1-23-6m48-idle.png).
   - Coins slowly fall from wages ($212.65 → $211.30 over 80 s), and nothing explains the drain.
   - The goal ETA correctly shows "—" ✅.

## Prior-bug rechecks
| Prior bug | dd52bfd |
|---|---|
| Runtime meta build-id missing | **Fixed**: meta and data attribute are both m3-rc1-pre+dd52bfd |
| "No eggs to sell" while holding eggs | **Still present** (bug 1) |
| Post-sale order card stays "0/8 · Sell 8" | **Fixed**: the card is removed and a "Thanks!" chip appears (c1-13). The "0/12 eggs" counter on a new order still means delivered-so-far (cosmetic). |
| ↑ arrow over the upgrade price | **Not a bug**: a brief purchase flourish, visible at 0.1 s (c1-10) and gone by 1.5 s (c1-11) |
| Full-coop Collect messaging | **Still missing** (bug 3); the ETA "—" is fixed |
| +$/s with wages | **N/A**: there is no +$/s readout in the top bar any more; the wage drain is unexplained (bug 3) |

## Top 3 likes
1. The tutorial and first minute.
2. Sale feedback, including the fixed post-sale card.
3. Clear worker-fatigue states, plus the welcome-back reward.

## Top 3 frustrations
1. "No eggs to sell" with eggs in hand.
2. 1–2 min buy gaps from ~minute 25 (up to 111 s at Farm L17).
3. A silent full coop and an unexplained wage drain.

Claude calls: 1 (Sonnet, 44 s). Raw output is in m3-rc1-pre-dd52bfd/claude-judgement.txt. I corrected two of Claude's points: the arrow is a flourish, and the coin drain is wages. A header counter mismatch it noted came from screen-reader text lagging behind and isn't confirmed as visible.
