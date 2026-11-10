# Single-tab guard (rc1, paired with the D2 save fix) — v1.0, Head of Product, 2026-10-16

**Goal:** only one browser tab writes a given save at a time, so two tabs can't overwrite each other's money (suspected cause of S2-4a). Keep it minimal, per the CEO's ruling.

## Behaviour
- When a tab starts, it claims ownership of the save by writing an owner record (tabId plus a timestamp) through BroadcastChannel "eggfarm-save", with a localStorage fallback.
- **The newest tab wins.** When a new tab claims, every older tab immediately stops ticking the sim and stops saving, then shows a modal saying "Game open in another tab" with the button "Play here".
- Tapping "Play here" in an older tab reloads it from the latest save, and that tab then claims ownership, which makes the other tab inactive.
- An inactive tab never writes to the save, including on unload or visibility change, and including D2's save after each purchase.
- Before every save write, the tab checks it is still the owner; if not, it skips the write and goes inactive.

## Tunables (balance.json -> economy.csv row `guard_*`)
- `guard_heartbeat_s` = 2: how often the owner tab refreshes its claim.
- `guard_stale_s` = 6: if the owner's heartbeat is older than this when a tab loads, that tab takes over without a notice (the old tab crashed or was closed).

## Edge cases
- If the owner tab is killed, the next tab load takes over once the claim is stale (≥6 s), or right away via BroadcastChannel if the tab sent a close message.
- Offline earnings are calculated only by the tab that takes ownership, so they are never paid twice.
- Incognito and normal windows don't share storage, so they don't interact; no guard is needed between them.
- If BroadcastChannel isn't available, fall back to polling the localStorage owner record every heartbeat.
- The modal has no close button; the only action is "Play here".

## Acceptance criteria
- **TG-1:** with tab A open, opening tab B shows the notice in A within 1 s, and A's money and save stop changing.
- **TG-2:** after 60 s of play in B, tapping "Play here" in A shows exactly B's money; nothing is lost and nothing is duplicated.
- **TG-3:** buying in B 20 times while A is inactive leaves the save with exactly B's state (two-tab test added to the D2 checks).
- **TG-4:** force-killing the owner tab, then reopening, loads without the notice once the claim is ≥6 s old.
- **TG-5:** offline earnings are paid only once when the player returns with two tabs.
- **TG-6:** a single tab behaves exactly as in rc0, with no notice and no change in performance.

## Telemetry
- `tab_guard_takeover {reason: new_tab|stale|play_here}`
- `tab_guard_blocked_write`
