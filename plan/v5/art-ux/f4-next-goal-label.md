# F4 next-goal label (M41-8). LOCKED 2026-10-19 10:10: Art & UX + HoP (D-HOP-29 amendment); amended per D-HOP-32. This file is the source of truth.
Milestone variant stands. X = floor(100 × (income/s after this one buy − income/s now) / income/s now), taken from best_roi's own value, no second calculation. If 0 < delta < 1%, show `+<1% income`. Hide ` · +X% income` only when delta is exactly 0 or income/s now is 0. AC: for a fixed state, a unit test asserts the strip's X == floor(best_roi income delta %), plus the `<1%` case.

**Templates (≤27 chars after truncation)**
- Milestone level (Hens bigger-coop level, or an Egg value grade the player can get): `★ {Track} L{n}: {milestone}`, with milestone = `bigger coop` or the grade name (Grade A / Large / Jumbo). The milestone wins over the %, because it's the more meaningful reason.
- Any other Hens or Egg value level: `★ {Track} L{n} · +{X}% income`. X is the income gain of this buy, rounded down to a whole percent. If 0 < delta < 1%, show `+<1% income`. Hide the part only when delta = 0 or income/s now = 0.
- Collection (D-HOP-32) keeps its existing template `Collection L{n}: +{Δtap}/tap`, with a leading `★ ` only when it's the best buy. It never shows `+X% income`.
- Farm unlocking a level above 30 (D-HOP-42, m4a-spec v1.21 §18): `★ Farm L{n}: unlocks {Track} L{m}`. The ★ drops at these lengths, and the row's ★ Best buy chip still marks it. If the bundle unlocks both tracks, name the first L31+ buy in the bundle, the one the planner makes next (HoP ruling 11:15, m4a-spec v1.24). The suffix is never cut. Examples: `Farm L28: unlocks Hens L31` (26), `Farm L28: unlocks Value L31` (27). Aria uses the full name: `Next goal: best buy, Farm level 28, unlocks Egg value level 31.`
- FARM unlock suffixes and the W1–W4 / Done templates stay as in m3-next-goal-spec §2.
- ★ appears only when the target is the best buy (it matches the UX-M4 row chip).

**Truncation, in order, applied only while the label is over 27 chars:**
1. Drop the `★ `.
2. Short track names: Collection→Coll., Egg value→Value. Hens and Farm stay as they are.
3. Ellipsis on the track name only.
The suffix (`· +X% income`, `+<1% income`, `: {milestone}`, `: +{Δtap}/tap`) and `L{n}` are never cut, in JS or CSS. Markup: `<span class="ng-name">{Track}</span>` carries `overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0`; the level and suffix spans are `flex:none` (`white-space:nowrap`), so CSS can only ever ellipsise the name span. Use a NBSP between `L` and `{n}`, and around `·`.

**Worst cases:** "★ Egg value L48 · +<1% income" (29) → "Egg value L48 · +<1% income" (27, fits). Worse with a two-digit X: "★ Egg value L47 · +12% income" (29) → "Egg value L47 · +12% income" (27, fits); if still over, → "Value L47 · +12% income" (23). "★ Egg value L49: Jumbo" (22) fits as is. Collection: "★ Collection L28: +1.2K/tap" (27) fits; if Δtap is longer, drop ★, then "Coll.", then ellipsis on the name.

**Aria:** "Next goal: best buy, Egg value level 49, Jumbo." and "… plus 12 percent income." Collection: "Next goal: best buy, Collection level 28, plus 1.2 thousand per tap."
