# PR-A (Breeds UI) — HoQA pre-bar fixes

**Input:** `qa/m3-recheck/breeds-pra-bd5b068a.md` (sha256 `0ad57cfe…`, verified) — 11 FAIL Major: BR-UI-02, 03, 06, 07, 13, 14, 17, 19, 21, 34, 35.
**Base head:** `bd5b068a` (tree `d767dfd4`). **Fix commits:** `fe01485` (DOM/a11y/focus) · `8abcf165` (layout CSS) · `9b616704` (album stars, trimmed %, AX names; tree `ba859431`).
**Spec:** m5.1-breeds-spec rev3.8.9 (`ea922eb8`) · Art `art-ux/m5.1-breeds-ui.md` v0.2.7 · cases `qa/m3-recheck/breeds-ui-cases-v1.md`.
**Tests:** `tests/v5-breeds-prebar-fixes.test.ts` (21 jsdom tests, red first: `scratch/logs/breeds-pra-prebar/01-red.txt`, 19/20 red at bd5b068a).
**Browser evidence:** probe `scratch/breeds-pra-prebar/probe.mjs` (Playwright-core 1.64.1 + axe-core 4.14.0), Chromium 360×640 / 390×844 / 1280×800 / 1024×474 / 1280×720, Firefox + WebKit 390×844 / 1280×800. Logs: `scratch/logs/breeds-pra-prebar/gates-<sha8>/probe-*.txt|json` + `probe/shots/`.

Flag-0 byte-identical (committed `balance.json` `m4.flags.breeds = 0`; release build check-release ok). No `app.ts`, no sim, no adapter change.

| Case | Cause | Fix | Test (jsdom) | Browser evidence (probe) |
|---|---|---|---|---|
| **BR-UI-02** entry rect | Entry `.btn` inherited `min-width:120px`/18px font; the badge dot's `::after` was inline → 104.95–121.95 wide; `margin-left` not auto | `#p-upgrades header .breeds-entry`: `margin-left:auto; min-width:0; padding:0 14px 0 12px`; Fredoka 16; dot absolute 12px barn + white keyline | (CSS) — entry markup covered by existing `v5-breeds-ui` tests | x vs Art, y = header+6, 100×44 at all sizes, 3 engines. **Absolute Art y not met docked** (see Rulings) |
| **BR-UI-03** locked slot copy | Visible text "Farm 14", sr "Slot 2 Farm 14" (no middot, read twice) | One visible `Slot n · Farm N` span; 🔒︎ glyph `aria-hidden`; div, not focusable; dashed border | `BR-UI-03 locked slot placeholder copy` | `lockedText` = "Slot 2 · Farm 14"/"Slot 3 · Farm 20" |
| **BR-UI-06** phone sheet + totals | (1) `openPanel(null)` drops `#panel-layer.open` → `.sheet` left at `translateY(100%)`, off-viewport; (2) no Active totals row; (3) focus not returned | `#panel-layer.breeds-open` gets pointer-events + scrim, sheet `transform:none`; `activeTotalsText()` row `[data-testid=breeds-totals]` between Slots and Album (settled-only, `(max)` when raw > clamped); focus return (07) | `BR-UI-06 Active totals row …` (3) + focus block | sheet rect = Art at 360/390 (0,160 360×480; 0,211 390×633); order Incubator→Slots→totals→Album; screenshots paint the sheet |
| **BR-UI-07** docked focus / Close | `#panel-layer` static → overlay sized to the viewport; `.sheet .close{display:none}` hid Close (0×0); `#p-upgrades[hidden]` (shown via `.sheet[hidden]{display:flex!important}`) made the focus guard skip the entry | Panel-layer `position:relative`, sheet inset `0 0 0 calc(-1*var(--bw))`, border-top 0; Close drops `.close` class, `.breeds-close{display:grid}`; `canFocus = docked \|\| !closest('[hidden]')`; returnFocus → `#breeds-entry` (fallback Upgrades nav) | `BR-UI-06 / BR-UI-07 focus returns …` (5) | Close rect = Art (1228,62 / 972,62) ≥44; `active=#breeds-entry` after Close and Esc at 1280×800, 1024×474, 1280×720, FF/WK 1280×800 |
| **BR-UI-13** E5 / complete subs | Gate sub always "Ready in 1:00"; complete sub "Slots still work" | `need===rare_farm` → "All Commons at 2★"; complete → "All 8 breeds at 2★ · slots still work"; complete is a non-focusable `.hatch-complete` pill | `BR-UI-13 E5 / Flock complete sub-lines` (3) | — (jsdom state cases) |
| **BR-UI-14** describedby + Farm-soon | Farm-soon note had no id, never in `aria-describedby` | `#hatch-fs` (`data-testid=breeds-farmsoon`); describedby = `hatch-sub hatch-fs` iff shown | `BR-UI-14 Hatch aria-describedby …` | `describedby` ↔ `#hatch-fs` consistent all cells |
| **BR-UI-17** filled slot | `role=group aria-label="Slot 1, Leghorn"` replaced visible text; Remove 60.89×28 | Wrapper div (no role/label); `<button class=slot-main>` with visible text as name; Remove sibling, min 44×44 | `BR-UI-17 / BR-UI-34 filled slot …` (2) | Remove ≥44×44; AX name `Leghorn +3.12% lay Present` |
| **BR-UI-19** album | Cells 306 wide docked / minH 72 <100; sprites 36; 3 star glyphs | `repeat(4,76px)` (86 docked), min-height 100, sprites 48, dashed locked; 2 stars `aria-hidden`, "n of 2 stars" via `aria-describedby=album-desc-<id>` | `BR-UI-19 / BR-UI-34 album stars …` | cells 76/86 × ≥100, sprites 48 all cells; AX `Leghorn Slot 1` |
| **BR-UI-21** reveal | Card had name + Nice! only; Esc closed the sheet and left the card | `.breeds-reveal` scrim + `.reveal-card` role=dialog aria-modal, labelledby kicker+name; kicker "New breed!" / "Star up! ★ +1", meta, stars, trait, placement; focus to Nice!, Tab trapped, Esc/scrim close the card first, focus restored | `BR-UI-21 reveal card …` (3) | copy + 320 wide rect, axe clean, Tab stays, Esc closes card but not sheet, 3 engines |
| **BR-UI-34** label-in-name | aria-label overrides; glued text ("Leghorn+3.12%"); stars inside the album name; per-frame `innerHTML` churn (stale CDP node) | Visible text = name, spaces between spans, stars in description, trimmed `traitPctTrim` (+15%); render diff (`lastBodyHtml`) skips identical markup and restores focus | `BR-UI-17 / 34`, `BR-UI-19 / 34`, focus-keep | Playwright `ariaSnapshot` (engine AX tree) names: slot, settling `Sussex +15% away · inactive Settling m:ss`, album, Hatch, entry `Flock` — 3 engines |
| **BR-UI-35** duplicate banner | `<header>` inside role=dialog `<section>` mapped to banner | `#breeds-sheet > header role="none"` | `BR-UI-35 axe …` (2) | axe 4.14.0 on `#breeds-sheet`, `#breeds-entry`: 0 violations, no label-content-name-mismatch incomplete, 3 engines |

## Needs a spec / Art ruling (not changed)
1. **Docked entry absolute y** 391 vs Art 436 (1280×800), 228 vs 273 (1024×474): the Upgrades header itself is at 385/222 in the base layout; entry is header+6 per Art §1. Not PR-A's to move.
2. **Phone Close/Esc/scrim focus** goes to the Upgrades nav button: the entry lives inside the Upgrades sheet, which is hidden once Flock is open on phone. ‹ back returns to Upgrades and focuses `#breeds-entry`. Case expects entry; ruling needed.
3. **F14–23 Legendary gate** sub-line: no Art copy → keeps "Ready in m:ss".
4. **Duplicate reveal for an already-slotted breed**: no placement copy in Art → placement line omitted.
5. **Entry padding-right 14** (Art 16) to keep the rect at 100 wide with the absolute dot.
6. `#p-flock` (Art) vs `#breeds-sheet` (code) id kept — seam/test id.
7. `presentMirror` untrimmed "+2.50%" text is PR-B-owned (PR-B test pins `traitPctExact`); adapter unchanged.
8. BR-UI-14 F28 override (1 $/s) did not surface the note in HoQA's run — test-config issue; note path covered at F10 and in jsdom.
9. Reveal card height ~364 by content; `min-height:min(371px, 100vh-40px)` added to meet Art 371.

## Seams
PR-B seams unchanged: `mountBreeds` behind the flag, leaf `breeds-ext-registry`, ext ctx, `familyClampState(family)` adapter, describedby pattern (now `hatch-sub[ hatch-fs]`). New PR-A exports only: `traitPctTrim`, `activeTotalsText`, `revealCopy`.

## Gates @ `9b616704` (tree `ba859431`), clean status — logs `scratch/logs/breeds-pra-prebar/gates-9b616704/`
tsc 0 · sync-economy --check 0 · vitest 0 (160 files / 2362 tests) · build 0 · check-release `m4.1+9b61670 ok` (no QA hooks ok) · build:html 0 · check-globals chromium/firefox/webkit PASS · build:qa 0 · probe chromium/firefox/webkit fails=0 (axe 0 violations).
Post-merge @ `4575966d` (tree `b568a351`, origin/rc/v5 `68f58c0f` merged, no conflicts): same gate set all 0 — vitest 162 files / 2392 tests, check-release `m4.1+4575966 ok`, check-globals 3 engines PASS, probe 3 engines fails=0. Logs `scratch/logs/breeds-pra-prebar/gates-4575966d/`.
