# M4-A tracks: row and Balanced-farm strip copy (Art & UX) · v1.1 · 2026-10-17 (5/5 text alt added)
Source ACs: product/farm/m4a-spec.md M4A-2, M4A-12, M4A-17, M4A-19, M4A-21; product/farm/m4a-eng-addendum.md TR-2. Track names: `Hens`, `Egg value`, `Farm`.
Rules: one line per state at 360px (Nunito 14, ≤ 296px), numbers 1.2K/3.4M, timers m:ss, buttons ≥44×44px, WCAG AA.

## 1. Locked (capped) track row: TR-2 / M4A-2
Cap: Hens and Egg value levels ≤ min(F + `hens_cap_over_farm` | `egg_value_cap_over_farm`, `maxLevel`) = min(F+3, 30).
| State | Right side of row (replaces cost + Buy) | Notes |
|---|---|---|
| Capped (H or V at its farm cap) | `Needs Farm L{n}` | n = the first Farm level whose cap allows the next track level (smallest F' with F < F' ≤ farmMax and trackCap(F') > current level); fallback n = farmMax, never F+1. Source of truth: m4a-spec §19 (v1.19, D-HOP-28/32). On a normal save this equals F+1. Aria uses the same n. Lock glyph (CSS), Dust colour, row at full opacity so the text stays AA; no button, no time-to-afford hint. |
| At `maxLevel` | `MAX` | No cost, no button. |
- aria-label (capped): `Hens, level {H}, locked. Needs Farm level {n}.` (same pattern for Egg value).
- Buying Farm unlocks the row in the same tick (M4A-3); no extra toast.

## 2. Balanced-farm strip: M4A-19 / M4A-12
k = tier reached (0–5); N = next `balanced_levels` threshold; x = that tier's `balanced_mult` as % (e.g. 1.15 → 15); y = top-tier % (30).
| State | Exact string |
|---|---|
| Working toward next tier (incl. k=0) | `Balanced farm {k}/5 · next +{x}% at all ≥ {N}` |
| Tier reached (toast, "Coop upgraded!" style, ≤2.5 s, non-blocking, once per save) | `Balanced farm {k}/5: +{x}% income` |
| All done (top tier) | `Balanced farm 5/5 · +{y}%` (all segments full) |
- Weakest segment: marked with a 2px `--c-yolk-dark` outline (not colour alone).
- Text alternative: `Balanced farm {k} of 5. Weakest: {track}, level {L} of {N}.`
- Text alternative at 5/5 (top tier; no Weakest clause): `Balanced farm 5 of 5. Top tier, +{y}% income.` (e.g. +30%). Added v1.1 2026-10-17 01:23, signed off by Head of Art & UX.
- Per-track milestone toasts (M4A-12): `Hens L{n}: bigger coop · offline ×{mult}`; `Egg value L{n}: {grade} ×{mult}` (grade = Grade A / Large / Jumbo).
- Milestones already reached at migration: no toast (TR-MIG-MS).

## v1.1 (2026-10-16): track row strings
- Effect line: `{Stat} {cur} → {next}`, using the existing labels (`Eggs/s`, `Egg price`) and the 1.2K/3.4M number format.
- Milestone hint, shown only when the next milestone is 5 levels away or less, in muted 13px text: `Next at L{n}: bigger coop · offline ×{mult}` or `Next at L{n}: {grade} ×{mult}`. No hint at MAX.


## v1.2 (2026-10-19): lock label n follows m4a-spec §19 v1.19 (D-HOP-28/32), not F+1. Short name 'Value' stands; in the next-goal strip only the track-name span is truncated, and the %, milestone and /tap text are never cut (see f4-next-goal-label.md).

## 3. Farm row cap hint (v1.3, 2026-10-19 10:45; for D-PMFU-2026-10-19-10, M4.2 logic)
The hint names only the tracks whose cap the next Farm level raises above their current level. Uses NBSP between `L` and `{n}` and around `→`.
| State | Visible | Aria |
|---|---|---|
| Both benefit, same cap | `Hens & Egg value up to L{c} → L{c'}` (unchanged) | `Next Farm level raises the Hens and Egg value cap from level {c} to {c'}.` |
| Only Hens benefits | `Hens up to L{c} → L{c'}` | `Next Farm level raises the Hens cap from level {c} to {c'}.` |
| Only Egg value benefits | `Egg value up to L{c} → L{c'}` | `Next Farm level raises the Egg value cap from level {c} to {c'}.` |
| Both benefit, different caps (per-row offsets, L30+) | Two lines: `Hens up to L{h} → L{h'}` ⏎ `Egg value up to L{v} → L{v'}`; at <400 px the second line uses `Value`. Never one line joined with `·`. | Both sentences, Hens first. |
| No track benefits | The hint line is hidden; the row keeps its other lines, and the row height doesn't jump (the card shrinks only on the next re-render, never mid-tap). | No cap sentence. |
| Farm at max | As today: `… up to L{c}` with no arrow. | Unchanged. |
Example (F5/H5/V9, offset 3): `Hens up to L8 → L9`.
