# src/ui/app.ts hunks: v5 streak / tapCoins (Hire 3)
Branch `v5/ui-streak-tapcoins` @ 1e50839. Base rc/v5 d65391b. HoE ruling 2026-11-10: app.ts is in scope for exactly 4 items, in small self-contained hunks. Rebase onto F6 when it merges.
Lines are **rc/v5 d65391b (old) → branch 1e50839 (new)**. 7 hunks, +13/−5 lines. `git merge-tree` against origin/feat/v5-f6-rebuild 6bca887 (API v1.0) is **clean** (no conflicts).

| # | Item | Function / region | old → new lines | Change | Commit |
|---|---|---|---|---|---|
| 1 | imports (items 2–4) | module imports | +42–43 (after L41, the last rc/v5 import) | `import { tapIgnored, collectSemi, playCollect } from './streak-tap'`, `import { syncPriceChips } from './streak-chips-dom'`, on their own lines below everything F6 adds at L1 | 82c5002, 9e732a7, 1e50839 |
| 2 | isTrusted / event.repeat filter | `mountApp` › Actions › `collect` | L212–213 → L214–218 | `let collectKeyRepeat`; `collect(e?)` returns early when `tapIgnored(b, e, collectKeyRepeat)`; a one-shot `g.on` listener reads the collect event's `credited`; `takeTapSting()` clears/reads the sting mark around `g.dispatch` (same line) | 82c5002, f316147 |
| 3 | egg.collect pitch per tier | `collect` | L218 → L223 | `sfx('collect')` → `playCollect(audio, collectSemi(g.state, b, credited))`. semi 0 / no `playFile` = exactly `audio.play('collect')`. Skipped when this tap's tier sting started (combo-tiers §1, `if (!stung)`, same line) | 82c5002, 1e50839, f316147 |
| 2b | key-repeat tracking | after `collectBtn.addEventListener('click', collect)` | +L231 (after L225) | keydown sets `collectKeyRepeat = e.repeat`; keyup clears it | 82c5002 |
| 4 | F-2 preview fix | `render` › market panel | L732 → L738–739 | `const saleCtx = g.playerSaleCtx()`; `unit` uses it | 9763ad3 (own commit) |
| 4b | F-2 | market panel | L738 → L745 | `sellAllPreview(s, b, saleCtx)` | 9763ad3 |
| 5 | price chips in order cards (+ Sell all) | market panel, after the Sell all label | +L747 (after L739) | `syncPriceChips(mRows, sellAllBtn, s, b, saleCtx)` | 9e732a7 |

Flag-off: the filter, pitch and chips are each a no-op unless m4.flags.streak / tapCoins is on (`tapIgnored` false, semi 0 → `audio.play('collect')`, `syncPriceChips` returns before any DOM read). Full suite at 9e732a7: 164/164 files green, including zg-flagoff-dom and the m4a flag-off goldens.
**No app.ts change outside these 4 items.** `src/ui/audio.ts` is untouched (F6 v1.0 owns `playFile`).

## Features' F6 off-limits regions (rc/v5 d65391b), all untouched
- **L1 imports:** F6 adds FxBudget, mountOverlay, installQaSeam and `import './features'`. Mine are on separate lines at L42–43.
- **L130–142:** the FX helper, including the L141 timer cleanup (`live[]` → shared `fx = new FxBudget()`).
- **L185:** `wireAttended`.
- **L398–399:** the ghost / +$ float. Not touched. My collect hunks are at L212–225, and I add no FX nodes in app.ts.
- **L531:** the goal sparkle.
- **After L871:** mountOverlay + the installQaSeam block.
- **L873:** the frame loop (`overlay.render(t)`).

## Spec deviations to rule on
- **R3 synthetic clicks:** with streak/tapCoins on, an untrusted click is ignored entirely, so it doesn't collect either. The spec only says "never credited". An uncredited collect needs a sim action variant (sim/ is off-limits). Flags off: unchanged.
- **Tier-up taps:** combo-tiers §1 says `sfx-streak-tier-0k` replaces that tap's collect. Not done yet: both play. It needs the meter's hysteresis decision in the collect path, which is a follow-up after the F6 rebase.
