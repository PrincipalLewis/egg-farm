# S2-4a repro attempt on bd0dc66 (m3/rc1-pending): NOT REPRODUCED

**Result: I could not reproduce a ~$900 header drop from tapping a greyed button on bd0dc66.** QA agrees: their greyed-L12 checks pass too. This folder does not contain a repro of the $900 drop. It records what was tried, so nobody takes the S2-4b fix as proof of S2-4a.

## What the triage evidence was
`playtest/triage/2026-10-16-session2.md`, S2-4a: from the Player's hand-play notes only (no recording, telemetry export, or save). "At Farm L11 on the Farm tab, tap the greyed L12 button. The header went $2,982 -> $2,089 with no level change, then $3,173 a few seconds later." Product marked it "Code bug, **suspected** … Repro needed."
- One inconsistency: L11->L12 costs $2,714 (economy.csv), so at $2,982 the L12 button should have been **enabled**, not greyed. The Player's own timeline also logs "L12 about 02:03 ($2,714)" at about that time. So the observation is consistent with a stale UI (see S2-4b), but the exact $893 drop isn't explained by any code path I found.

## Steps tried (all on bd0dc66, Chromium, 375x700, touch)
`save.json` is the scenario state: Farm L11, Collection L9, $2,250.00, Market Hand 40%, Coop Hand 63%, Hawker 72%. It is in the `eggfarm.save` format (v5). Load it with `localStorage.setItem('eggfarm.save', <file contents>)` and reload. If more than 60 s have passed since `savedAt`, an offline grant pops up first; Collect it. You can also set the state directly in a dev/QA build with `window.eggfarm.state = {...}`.
1. Open Upgrades > Farm and let the money climb past $2,714 while you watch the header and the button every 250 ms. The header matched `state.coinsCents` on every sample, and the button turned enabled at the right moment.
2. Tap the greyed L12 button while money is below cost. `aria-disabled` is checked first (src/ui/app.ts:197), so no dispatch happens. `buy()` would reject it anyway (src/sim/actions.ts:615). Money, level, header and `eggfarm.save` didn't change.
3. Tap L12 once it's affordable. It buys at exactly $2,714, the level goes to L12 and the purchase is saved straight away. That's correct behaviour.
4. Unit sweep: 60 s of play at L11 with 3 workers. The only decreases in coins are wages (cents each). No other code path lowers coins.

## What I *did* reproduce (S2-4b, related)
On bd0dc66, if rAF stops (window covered or throttled; the Player used a DevTools device toolbar inside a 625 px window), the sim keeps running on its 1 s timer (src/main.ts:58), but the UI is drawn only inside rAF (src/main.ts:56). So the header, the open sheet, its buttons and the ETA all freeze. The repro froze at **$1,317.77**, while the state had reached $1,629.55 after 4 s. The Player saw a frozen "$1,318". A frozen UI would explain "greyed while it shows enough money" and jumps in the header when drawing resumes. It does **not** explain a drop of exactly $893 with no purchase. That part is still unexplained.

## Ask
Player, session 3: if it happens again, use Settings > Export log straight away and note the wall-clock time. Telemetry logs every `upgrade`/`worker_hire` event with `coinsBefore`, which would settle whether money was really spent.

## Two-tab repro (follow-up lead), on 16176a3 (rc0) and bd0dc66: NOT REPRODUCED
Script: Chromium, playwright. Tab A loads Farm L11 with $2,982 (workers off, so money is frozen). Tab B boots. A buys L12 for $2,714, leaving $268. Wait 7 s, which is longer than the 5 s autosave in both tabs. Read the save, then reload A.
| Setup | rc0 16176a3 | bd0dc66 |
|---|---|---|
| (a) normal profile, 2 tabs (shared storage) | B read-only (AC14d guard); save $268 / L12; A after reload $268 / L12: **no revert** | same: **no revert** |
| (b) 2 tabs in one incognito context (shared storage) | B read-only; save $268 / L12; reload $268 / L12: **no revert** | same: **no revert** |
| (c) control: 2 separate contexts (no shared storage) | each has its own save (A $268 / L12, B $2,982 / L11); no clash, as expected | run cut short by a timeout; same expected (storage isn't shared) |
The second tab detects the first through BroadcastChannel (src/save/tab-guard.ts) and never writes, so it can't revert the owner's save. Gap not covered: two tabs both pressing "Tap to start" within the same 200 ms probe window would both become owners. That's not plausible in hand play, and the guard work belongs to the D2 branch.

## Single-tab repro (Upgrades sheet open + Manage + greyed L12 taps), on 16176a3 and bd0dc66: NOT REPRODUCED
L11, $1,500, 2,000 eggs, Market Hand 41%, Coop Hand 63%, Hawker 72%, customers arriving. With the sheet open, 6 rounds of: Workers tab, tap Manage all and each Manage (plus the nav Manage-all button), switch to the Farm tab, tap the greyed L12 button 4 times, then push the workers back to 38%. Money and the header were sampled every 100 ms (about 205 samples per build).
- Largest drop in one sample, in state and header alike: **$0.23** on both builds (a single wage charge). The only money event besides wages: 1 `worker_manage_all`, which is free. No upgrade fired, the level stayed L11, and there were no page errors.
